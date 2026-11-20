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
const routerVaryHeaders = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch"];
const homepagePrivateHeaders = ["cookie", "origin", "next-url", ...routerVaryHeaders];

function edgeCacheKind(request: Request, url: URL) {
  if (request.method !== "GET" || url.search || passThroughHeaders.some((header) => request.headers.has(header))) {
    return undefined;
  }
  if (nextAssetPath.test(url.pathname) || (publicMediaPath.test(url.pathname) && !request.headers.has("origin"))) {
    return "asset";
  }
  if (url.pathname === "/" && request.headers.get("accept")?.includes("text/html") &&
      !homepagePrivateHeaders.some((header) => request.headers.has(header))) {
    return "home";
  }
  return undefined;
}

function varyHeaders(response: Response): string[] {
  return response.headers.get("vary")?.toLowerCase().split(",").map((value) => value.trim()) ?? [];
}

function isAnonymousHome(response: Response): boolean {
  return response.status === 200 && !response.headers.has("set-cookie") &&
    response.headers.get("x-nakis-edge-cache") === "anonymous-home" &&
    response.headers.get("content-type")?.startsWith("text/html") === true &&
    varyHeaders(response).every((value) => value === "accept-encoding" || routerVaryHeaders.includes(value));
}

function isPublicImmutable(response: Response, allowOriginVary: boolean): boolean {
  const directives = response.headers.get("cache-control")?.toLowerCase().split(",").map((value) => value.trim()) ?? [];
  return response.status === 200 && !response.headers.has("set-cookie") &&
    varyHeaders(response).every((value) => value === "accept-encoding" || (allowOriginVary && value === "origin")) &&
    directives.includes("public") &&
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
    const cacheKind = edgeCacheKind(request, publicUrl);
    const edgeCache = cacheKind ? (caches as CacheStorage & { default: Cache }).default : undefined;
    const cacheKey = cacheKind === "home" ? new URL("/?edge-public-home=v1", publicUrl).href : publicUrl.href;
    if (edgeCache) {
      const hit = await edgeCache.match(cacheKey).catch(() => undefined);
      if (hit) {
        const result = new Response(hit.body, hit);
        if (cacheKind === "home") {
          result.headers.set("cache-control", "private, no-store");
          result.headers.set("x-nakis-edge-cache", "HIT");
        } else {
          result.headers.set("x-nakis-asset-cache", "HIT");
        }
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

    if (edgeCache && (cacheKind === "home"
      ? isAnonymousHome(response)
      : isPublicImmutable(response, publicMediaPath.test(publicUrl.pathname)))) {
      const copy = response.clone();
      const cacheable = new Response(copy.body, copy);
      cacheable.headers.set("cache-control", cacheKind === "home"
        ? "public, max-age=120"
        : `${response.headers.get("cache-control")}, s-maxage=86400`);
      ctx.waitUntil(edgeCache.put(cacheKey, cacheable).catch(() => undefined));
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
