import { describe, expect, it } from "vitest";
import { z } from "zod";
import { route } from "@/server/http";
import { AppError } from "@/server/errors";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("route()", () => {
  it("refuses non-strict schemas at definition time", () => {
    expect(() => route({ body: z.object({ a: z.string() }) as never }, () => ({}))).toThrow(/strictObject/);
  });

  it("validates body", async () => {
    const h = route({ body: z.strictObject({ a: z.string() }) }, ({ body }) => ({ got: body.a }));
    const res = await h(post({ a: 1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION");
    expect(await (await h(post({ a: "ok" }))).json()).toEqual({ got: "ok" });
  });

  it("maps AppError and hides unknown errors", async () => {
    const h1 = route({}, () => {
      throw new AppError("NOT_FOUND");
    });
    expect((await h1(post({}))).status).toBe(404);
    const h2 = route({}, () => {
      throw new Error("secret db detail");
    });
    const r = await h2(post({}));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("stack");
  });

  it("rejects wrong content-type and oversize bodies", async () => {
    const h = route({ body: z.strictObject({ a: z.string() }), maxBodyBytes: 20 }, () => ({}));
    const bad = new Request("http://localhost:3000/x", { method: "POST", headers: { "content-type": "text/plain" }, body: "a" });
    expect((await h(bad)).status).toBe(415);
    expect((await h(post({ a: "x".repeat(100) }))).status).toBe(413);
  });
});
