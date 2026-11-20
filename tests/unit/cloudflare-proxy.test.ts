import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../deploy/cloudflare/proxy";

const publicHost = "https://nakis-vitrin.example";
const env = { NAKIS_ORIGIN: "https://origin.example", NAKIS_ORIGIN_TOKEN: "unit-test-token" };

afterEach(() => vi.unstubAllGlobals());

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

    expect(await worker.fetch(request, env)).toBe(response);
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

    const result = await worker.fetch(new Request(publicHost), env);
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe(expected);
    expect(result.headers.getSetCookie()).toEqual(headers.getSetCookie());
  });

  it("fails closed if the origin is unavailable or unsafe to use", async () => {
    const upstream = vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch", upstream);
    const request = new Request(publicHost);

    for (const invalidOrigin of [publicHost, "http://origin.example", "https://origin.example/path"]) {
      expect((await worker.fetch(request, { ...env, NAKIS_ORIGIN: invalidOrigin })).status).toBe(503);
    }
    expect((await worker.fetch(request, { ...env, NAKIS_ORIGIN_TOKEN: "" })).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    const result = await worker.fetch(request, env);
    expect(result.status).toBe(502);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
});
