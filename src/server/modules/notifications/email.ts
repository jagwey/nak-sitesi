import "server-only";
import nodemailer from "nodemailer";
import { db } from "../../db";
import { getEnv } from "../../env";
import { templates, type TemplateData, type TemplateName } from "./templates";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Provider-agnostic sender. Add SES/Resend/etc. by implementing this interface. */
export interface EmailSender {
  send(msg: EmailMessage): Promise<void>;
}

class SmtpSender implements EmailSender {
  private transport = (() => {
    const e = getEnv();
    return nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_PORT === 465,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
    });
  })();
  async send(msg: EmailMessage) {
    await this.transport.sendMail({ from: getEnv().SMTP_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
  }
}

/** Logs subject/recipient only (bodies contain one-time links, so they are never logged). */
class ConsoleSender implements EmailSender {
  async send(msg: EmailMessage) {
    console.info(`[email:console] to=${msg.to} subject="${msg.subject}"`);
  }
}

let sender: EmailSender | undefined;
export function getEmailSender(): EmailSender {
  sender ??= getEnv().EMAIL_TRANSPORT === "smtp" ? new SmtpSender() : new ConsoleSender();
  return sender;
}
/** Test hook: swap the transport (e.g. capture outbox). */
export function setEmailSender(s: EmailSender | undefined) {
  sender = s;
}

export interface SendEmailOptions {
  userId?: string | null;
  /** Non-secret metadata stored on the Notification row (never put tokens/URLs here). */
  logPayload?: Record<string, unknown>;
}

/**
 * Render a template, send it, and record a Notification row (SENT/FAILED).
 * Never throws: mail outages must not break the business transaction. Returns success.
 */
export async function sendEmail<K extends TemplateName>(
  type: K,
  to: string,
  data: TemplateData[K],
  opts: SendEmailOptions = {}
): Promise<boolean> {
  const rendered = templates[type](data);
  const n = await db.notification.create({
    data: { userId: opts.userId ?? null, type, channel: "EMAIL", toAddress: to, payload: (opts.logPayload ?? {}) as object, status: "PENDING" },
  });
  try {
    await getEmailSender().send({ to, ...rendered });
    await db.notification.update({ where: { id: n.id }, data: { status: "SENT", sentAt: new Date() } });
    return true;
  } catch (err) {
    await db.notification.update({
      where: { id: n.id },
      data: { status: "FAILED", error: (err instanceof Error ? err.message : String(err)).slice(0, 300) },
    });
    console.error(`[email] ${type} to ${to} failed`);
    return false;
  }
}

/** Absolute URL helper for links in e-mails. */
export const appUrl = (path: string) => new URL(path, getEnv().APP_URL).toString();
