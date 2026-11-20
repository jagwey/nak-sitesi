const jar = (globalThis as unknown as { __cookieJar: Map<string, string> }).__cookieJar;
import { setEmailSender, type EmailMessage } from "@/server/modules/notifications/email";

export const sent: EmailMessage[] = [];
setEmailSender({ async send(m) { sent.push(m); } });

export const ORIGIN = "http://localhost:3000";

export function call(
  handler: (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>,
  method: string,
  path: string,
  body?: unknown,
  opts: { ip?: string; params?: Record<string, string>; headers?: Record<string, string> } = {}
) {
  const req = new Request(ORIGIN + path, {
    method,
    headers: {
      origin: ORIGIN,
      "x-forwarded-for": opts.ip ?? "203.0.113.1",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...opts.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handler(req, opts.params ? { params: Promise.resolve(opts.params) } : undefined);
}

export const lastToken = (to: string) => {
  const m = [...sent].reverse().find((x) => x.to === to);
  const t = m?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  if (!t) throw new Error("no token mail for " + to);
  return t;
};

export const sessionCookie = () => jar.get("tb_session");
export { jar };
