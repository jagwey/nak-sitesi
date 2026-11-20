import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "../../deploy/cloudflare/proxy";

const storefront = "https://store.example";
const thumbnail = "/images/products/12345678-1234-1234-1234-123456789abc-t.webp";
const asset = "/_next/static/chunks/abc.123.js";
const env = { NAKIS_ORIGIN: "https://origin.example", NAKIS_ORIGIN_TOKEN: "test-token" };

function setup() {
  const match = vi.fn<Cache["match"]>().mockResolvedValue(undefined);
  const put = vi.fn<Cache["put"]>().mockResolvedValue(undefined);
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response("ok", { headers: { "cache-control": "public, max-age=31536000, immutable" } }),
  );
  vi.stubGlobal("caches", { default: { match, put } });
  vi.stubGlobal("fetch", fetch);
  const ctx = { waitUntil: vi.fn() };
  return { match, put, fetch, ctx };
}

afterEach(() => vi.unstubAllGlobals());

describe("storefront edge caching", () => {
  it.each([thumbnail, asset])("caches only public immutable assets (%s)", async (path) => {
    const { match, put, fetch, ctx } = setup();
    const request = new Request(storefront + path, { headers: { cookie: "session=test" } });
    expect((await proxy.fetch(request, env, ctx)).status).toBe(200);
    expect(match).toHaveBeenCalledWith(request.url);
    expect(put.mock.calls[0][1].headers.get("cache-control")).toContain("s-maxage=86400");
    expect(new Headers(fetch.mock.calls[0][1]?.headers).has("cookie")).toBe(false);
  });

  it("serves a repeat request without contacting the origin", async () => {
    const { match, fetch, ctx } = setup();
    match.mockResolvedValue(new Response("cached"));
    const result = await proxy.fetch(new Request(storefront + asset), env, ctx);
    expect(result.headers.get("x-nakis-asset-cache")).toBe("HIT");
    expect(await result.text()).toBe("cached");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caches a public image with the storage server's Vary header for a request without Origin", async () => {
    const { put, fetch, ctx } = setup();
    fetch.mockResolvedValue(new Response("image", {
      headers: { "cache-control": "public, max-age=31536000, immutable", vary: "Origin, Accept-Encoding" },
    }));
    await proxy.fetch(new Request(storefront + thumbnail), env, ctx);
    expect(put).toHaveBeenCalledOnce();
  });

  it.each([
    ["/hesabim", {}],
    ["/api/cart", {}],
    ["/nakis-private/embroidery/file.vp3?signature=private", {}],
    [thumbnail + "?v=1", {}],
    [thumbnail, { headers: { range: "bytes=0-99" } }],
    [thumbnail, { headers: { origin: "https://other.example" } }],
    [asset, { headers: { authorization: "Bearer test" } }],
  ] as const)("passes through %s", async (path, init) => {
    const { match, put, fetch, ctx } = setup();
    await proxy.fetch(new Request(storefront + path, init), env, ctx);
    expect(fetch).toHaveBeenCalledOnce();
    expect(match).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it.each([
    { "cache-control": "private, no-store" },
    { "cache-control": "public, immutable", "set-cookie": "session=test" },
    { "cache-control": "public, immutable", "vary": "Accept" },
  ] as Record<string, string>[])("does not write responses that may vary by visitor", async (headers) => {
    const { put, fetch, ctx } = setup();
    fetch.mockResolvedValue(new Response("uncached", { headers: new Headers(Object.entries(headers)) }));
    await proxy.fetch(new Request(storefront + asset), env, ctx);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("anonymous homepage edge caching", () => {
  const key = storefront + "/?edge-public-home=v1";
  const htmlRequest = { accept: "text/html,application/xhtml+xml" };
  const homeHeaders = {
    "cache-control": "private, no-store",
    "content-type": "text/html; charset=utf-8",
    "x-nakis-edge-cache": "anonymous-home",
    vary: "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
  };

  it("stores opted-in anonymous HTML for two minutes and keeps the browser response private", async () => {
    const { fetch, put, ctx } = setup();
    fetch.mockResolvedValue(new Response("home", { headers: homeHeaders }));
    const request = new Request(storefront, { headers: htmlRequest });
    const result = await proxy.fetch(request, env, ctx);
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0][0]).toBe(key);
    expect(put.mock.calls[0][1].headers.get("cache-control")).toBe("public, max-age=120");
    expect(result.headers.get("cache-control")).toBe("private, no-store");
  });

  it("serves cached public HTML without contacting the origin or sending a public browser cache directive", async () => {
    const { fetch, match, ctx } = setup();
    match.mockResolvedValue(new Response("cached home", { headers: homeHeaders }));
    const result = await proxy.fetch(new Request(storefront, { headers: htmlRequest }), env, ctx);
    expect(match).toHaveBeenCalledWith(key);
    expect(result.headers.get("x-nakis-edge-cache")).toBe("HIT");
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(await result.text()).toBe("cached home");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["/", { cookie: "session=user" }],
    ["/", { authorization: "Bearer user" }],
    ["/", { rsc: "1" }],
    ["/", { "next-router-state-tree": "state" }],
    ["/", { "next-url": "/koleksiyon" }],
    ["/", { "cache-control": "no-cache" }],
    ["/", { accept: "*/*" }],
    ["/?_rsc=abc", {}],
    ["/?q=search", {}],
    ["/koleksiyon", {}],
  ] as const)("passes through personalized, dynamic or non-HTML requests (%s, %j)", async (path, headers) => {
    const { match, put, fetch, ctx } = setup();
    fetch.mockResolvedValue(new Response("home", { headers: homeHeaders }));
    await proxy.fetch(new Request(storefront + path, { headers: { ...htmlRequest, ...headers } }), env, ctx);
    expect(fetch).toHaveBeenCalledOnce();
    expect(match).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("caches anonymous HTML even when the origin omits the Caddy opt-in header", async () => {
    const { fetch, put, ctx } = setup();
    const { "x-nakis-edge-cache": _drop, ...withoutOptIn } = homeHeaders;
    fetch.mockResolvedValue(new Response("home", { headers: withoutOptIn }));
    await proxy.fetch(new Request(storefront, { headers: htmlRequest }), env, ctx);
    expect(put).toHaveBeenCalledOnce();
  });

  it.each([
    { "x-nakis-edge-cache": "private-home" },
    { "set-cookie": "session=user" },
    { vary: "Cookie" },
    { "content-type": "text/x-component" },
  ] as Record<string, string>[])("skips personalized or non-HTML replies (%j)", async (headers) => {
    const { fetch, put, ctx } = setup();
    fetch.mockResolvedValue(new Response("home", { headers: { ...homeHeaders, ...headers } }));
    await proxy.fetch(new Request(storefront, { headers: htmlRequest }), env, ctx);
    expect(put).not.toHaveBeenCalled();
  });
});

const publicHost = "https://nakis-vitrin.example";
const proxyContext = { waitUntil: vi.fn() };



describe("full store proxy", () => {
  it("preserves the browser session and forwards the request only to the configured origin", async () => {
    const response = new Response("{\"ok\":true}", { headers: { "set-cookie": "session=new; Secure; HttpOnly" } });
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal("fetch", upstream);
    const request = new Request(`${publicHost}//other.example/api/auth/login?mode=test`, {
      method: "POST",
      body: "{}",
      headers: {
        cookie: "cart=guest",
        origin: publicHost,
        "cf-connecting-ip": "192.0.2.5",
        "x-forwarded-for": "192.0.2.6",
        "nakis-origin-token": "client-supplied",
        "nakis-client-ip": "192.0.2.7",
      },
    });

    expect(await proxy.fetch(request, env, proxyContext)).toBe(response);
    expect(upstream).toHaveBeenCalledTimes(1);
    const [forwarded, options] = upstream.mock.calls[0] as [Request, RequestInit];
    expect(forwarded.url).toBe(`${env.NAKIS_ORIGIN}//other.example/api/auth/login?mode=test`);
    expect(forwarded.method).toBe("POST");
    expect(await forwarded.text()).toBe("{}");
    const headers = new Headers(options.headers);
    expect(headers.get("cookie")).toBe("cart=guest");
    expect(headers.get("origin")).toBe(publicHost);
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("nakis-client-ip")).toBe("192.0.2.5");
    expect(headers.get("nakis-origin-token")).toBe(env.NAKIS_ORIGIN_TOKEN);
    expect(options).toMatchObject({ redirect: "manual", cache: "no-store" });
  });

  it.each([
    ["https://origin.example/hesabim?tab=adres#icerik", `${publicHost}/hesabim?tab=adres#icerik`],
    ["//origin.example/hesabim", `${publicHost}/hesabim`],
    ["/hesabim", "/hesabim"],
    ["https://shopier.example/urun", "https://shopier.example/urun"],
  ])("returns %s with its intended destination and cookies", async (location, expected) => {
    const headers = new Headers({ location });
    headers.append("set-cookie", "session=new; Secure; HttpOnly");
    headers.append("set-cookie", "cart=; Max-Age=0; Secure");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 303, headers })));

    const result = await proxy.fetch(new Request(publicHost), env, proxyContext);
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe(expected);
    expect(result.headers.getSetCookie()).toEqual(headers.getSetCookie());
  });

  it("fails closed if the origin is unavailable or unsafe to use", async () => {
    const upstream = vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch", upstream);
    const request = new Request(publicHost);

    for (const invalidOrigin of [publicHost, "http://origin.example", "https://origin.example/path"]) {
      expect((await proxy.fetch(request, { ...env, NAKIS_ORIGIN: invalidOrigin }, proxyContext)).status).toBe(503);
    }
    expect((await proxy.fetch(request, { ...env, NAKIS_ORIGIN_TOKEN: "" }, proxyContext)).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    const result = await proxy.fetch(request, env, proxyContext);
    expect(result.status).toBe(502);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
});
