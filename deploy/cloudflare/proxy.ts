interface Env {
  NAKIS_ORIGIN: string;
  NAKIS_ORIGIN_TOKEN: string;
}

function unavailable(status: number) {
  return new Response("Mağazaya şu anda ulaşılamıyor.", {
    status,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
