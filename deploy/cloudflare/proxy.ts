interface Env {
  NAKIS_ORIGIN: string;
  NAKIS_ORIGIN_TOKEN: string;
}

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

const publicMediaPath = /^\/images\/(?:products|categories|collections)\/[a-f0-9-]{36}(?:-t)?\.webp$/;
const nextAssetPath = /^\/_next\/static\/(?:chunks|media)\/[a-zA-Z0-9_.~-]+\.(?:js|css|woff2|webp)$/;
const passThroughHeaders = ["authorization", "range", "if-none-match", "if-modified-since", "if-match", "if-unmodified-since", "cache-control", "pragma"];

function edgeCacheFor(request: Request, url: URL) {
  if (request.method !== "GET" || url.search || passThroughHeaders.some((header) => request.headers.has(header))) {
    return undefined;
  }
  if (!publicMediaPath.test(url.pathname) && !nextAssetPath.test(url.pathname)) return undefined;
  return (caches as CacheStorage & { default: Cache }).default;
}

function isPublicImmutable(response: Response): boolean {
  const directives = response.headers.get("cache-control")?.toLowerCase().split(",").map((value) => value.trim()) ?? [];
  const vary = response.headers.get("vary")?.toLowerCase().trim();
  return response.status === 200 && !response.headers.has("set-cookie") &&
    (!vary || vary === "accept-encoding") && directives.includes("public") &&
    directives.includes("immutable") && !directives.some((value) => /^(?:private|no-cache|no-store)(?:=|$)/.test(value));
}

function unavailable(status: number) {
  return new Response("Mağazaya şu anda ulaşılamıyor.", {
    status,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const publicUrl = new URL(request.url);
    const origin = URL.parse(env.NAKIS_ORIGIN);
    if (!origin || origin.protocol !== "https:" || origin.host === publicUrl.host ||
        origin.username || origin.password || origin.pathname !== "/" ||
        origin.search || origin.hash || !env.NAKIS_ORIGIN_TOKEN) {
      return unavailable(503);
    }

    const target = new URL(origin);
    target.pathname = publicUrl.pathname;
    target.search = publicUrl.search;

    const headers = new Headers(request.headers);
    const edgeCache = edgeCacheFor(request, publicUrl);
    if (edgeCache) {
      const hit = await edgeCache.match(publicUrl.href).catch(() => undefined);
      if (hit) {
        const result = new Response(hit.body, hit);
        result.headers.set("x-nakis-asset-cache", "HIT");
        return result;
      }
      headers.delete("cookie");
    }
    for (const header of ["host", "forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "x-real-ip"]) {
      headers.delete(header);
    }
    headers.set("nakis-client-ip", request.headers.get("cf-connecting-ip") ?? "unknown");
    headers.set("nakis-origin-token", env.NAKIS_ORIGIN_TOKEN);

    const upstream = new Request(target, request);
    let response: Response;
    try {
      response = await fetch(upstream, { headers, redirect: "manual", cache: "no-store" });
    } catch {
      return unavailable(502);
    }

    if (edgeCache && isPublicImmutable(response)) {
      const copy = response.clone();
      const cacheable = new Response(copy.body, copy);
      cacheable.headers.set("cache-control", `${response.headers.get("cache-control")}, s-maxage=86400`);
      ctx.waitUntil(edgeCache.put(publicUrl.href, cacheable).catch(() => undefined));
    }

    const location = response.headers.get("location");
    const redirect = location && response.status >= 300 && response.status < 400 &&
      URL.parse(location.startsWith("//") ? `https:${location}` : location);
    if (redirect && redirect.origin === origin.origin) {
      const rewritten = new URL(publicUrl.origin);
      rewritten.pathname = redirect.pathname;
      rewritten.search = redirect.search;
      rewritten.hash = redirect.hash;
      const result = new Response(response.body, response);
      result.headers.set("location", rewritten.href);
      return result;
    }
    return response;
  },
};
