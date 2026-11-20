import "server-only";
import { z, ZodError } from "zod";
import { getEnv } from "./env";
import { AppError, STATUS_BY_CODE, isAppError, type ErrorCode } from "./errors";
import { enforceRateLimit } from "./rate-limit";
import { getOptionalUser, requireUser, requirePermission, type AuthUser } from "./modules/auth/rbac";

z.config(z.locales.tr());

type AnyStrict = z.ZodObject<any, any>;

export type AuthMode = "none" | "optional" | "user" | { permission: string };

export interface RateLimitOpt {
  name: string;
  limit: number;
  windowSec: number;
}

export interface RouteOptions<B extends AnyStrict | undefined, Q extends AnyStrict | undefined, P extends AnyStrict | undefined> {
  body?: B;
  query?: Q;
  params?: P;
  auth?: AuthMode;
  /** Per-IP fixed-window limit. */
  rateLimit?: RateLimitOpt;
  /** Disable CSRF origin check (webhooks only). */
  csrf?: false;
  /** Max body bytes (default 256 KB). */
  maxBodyBytes?: number;
}

export interface Ctx<B, Q, P> {
  req: Request;
  body: B;
  query: Q;
  params: P;
  user: AuthUser | null;
  ip: string;
}

type Infer<S> = S extends z.ZodType ? z.infer<S> : undefined;

export const DEFAULT_MAX_BODY = 256 * 1024;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function json(data: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function assertStrict(schema: AnyStrict | undefined, label: string) {
  if (!schema) return;
  // zod 4: strictObject => catchall is `never`
  const def = (schema as unknown as { _zod: { def: { catchall?: { _zod: { def: { type: string } } } } } })._zod.def;
  if (def.catchall?._zod.def.type !== "never") {
    throw new Error(`route(): ${label} schema must be z.strictObject (blocks mass assignment)`);
  }
}

function checkCsrf(req: Request) {
  if (!UNSAFE.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (origin) {
    if (origin !== new URL(getEnv().APP_URL).origin) throw new AppError("CSRF");
    return;
  }
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AppError("CSRF");
}

async function readBody(req: Request, max: number): Promise<unknown> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > max) throw new AppError("PAYLOAD_TOO_LARGE");
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE");
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const o: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      // Repeated FILE fields (multi-upload) collect into an array; repeated text fields keep last-wins.
      if (typeof v !== "string" && k in o) o[k] = [...(Array.isArray(o[k]) ? (o[k] as unknown[]) : [o[k]]), v];
      else o[k] = v;
    });
    return o;
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw) > max) throw new AppError("PAYLOAD_TOO_LARGE");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("VALIDATION", "Geçersiz JSON gövdesi.");
  }
}

function zodIssues(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

function parse<S extends AnyStrict>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new AppError("VALIDATION", undefined, { details: zodIssues(r.error) });
  }
  return r.data;
}

export function errorResponse(err: unknown): Response {
  let e: AppError;
  if (isAppError(err)) e = err;
  else if (err instanceof ZodError) e = new AppError("VALIDATION", undefined, { details: zodIssues(err) });
  else if (typeof err === "object" && err && "code" in err && (err as { code: unknown }).code === "P2002") e = new AppError("CONFLICT");
  else if (typeof err === "object" && err && "code" in err && (err as { code: unknown }).code === "P2025") e = new AppError("NOT_FOUND");
  else {
    console.error("[route] unhandled error", err instanceof Error ? err.message : err);
    e = new AppError("INTERNAL");
  }
  const status = STATUS_BY_CODE[e.code as ErrorCode];
  const body: { error: Record<string, unknown> } = { error: { code: e.code, message: e.message } };
  if (e.details !== undefined) body.error.details = e.details;
  if ((process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") && e.code === "INTERNAL" && err instanceof Error) {
    body.error.debug = err.message;
  }
  const headers: Record<string, string> = {};
  if (e.code === "RATE_LIMITED" && e.retryAfterSec) headers["retry-after"] = String(e.retryAfterSec);
  return json(body, { status, headers });
}

type RouteCtx = { params?: Promise<Record<string, string>> | Record<string, string> };

export function route<
  B extends AnyStrict | undefined = undefined,
  Q extends AnyStrict | undefined = undefined,
  P extends AnyStrict | undefined = undefined,
>(opts: RouteOptions<B, Q, P>, handler: (ctx: Ctx<Infer<B>, Infer<Q>, Infer<P>>) => Promise<unknown> | unknown) {
  assertStrict(opts.body, "body");
  assertStrict(opts.query, "query");
  assertStrict(opts.params, "params");
  const auth = opts.auth ?? "none";

  return async (req: Request, rc?: RouteCtx): Promise<Response> => {
    try {
      const ip = getClientIp(req);
      if (opts.csrf !== false) checkCsrf(req);
      if (opts.rateLimit) await enforceRateLimit({ ...opts.rateLimit, id: ip });

      let user: AuthUser | null = null;
      if (auth === "optional") user = await getOptionalUser();
      else if (auth === "user") user = await requireUser();
      else if (typeof auth === "object") user = await requirePermission(auth.permission);

      let body: unknown = undefined;
      if (opts.body) body = parse(opts.body, await readBody(req, opts.maxBodyBytes ?? DEFAULT_MAX_BODY));
      let query: unknown = undefined;
      if (opts.query) {
        const o: Record<string, string> = {};
        new URL(req.url).searchParams.forEach((v, k) => (o[k] = v));
        query = parse(opts.query, o);
      }
      let params: unknown = undefined;
      if (opts.params) params = parse(opts.params, await rc?.params);

      const out = await handler({ req, body, query, params, user, ip } as Ctx<Infer<B>, Infer<Q>, Infer<P>>);
      if (out instanceof Response) return out;
      return json(out ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
