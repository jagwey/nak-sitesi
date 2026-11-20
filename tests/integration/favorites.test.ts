import { describe, expect, it } from "vitest";
import { call, jar } from "./helpers";
import { seedCatalog } from "./catalog-fixtures";
import { POST as register } from "@/app/api/auth/register/route";
import { DELETE, GET, POST } from "@/app/api/favorites/route";
import { db } from "@/server/db";

async function signup(email: string, ip: string) {
  await call(register, "POST", "/api/auth/register", { email, password: "correct-horse-battery" }, { ip });
  return new Map(jar);
}
const as = (s: Map<string, string>) => {
  jar.clear();
  s.forEach((v, k) => jar.set(k, v));
};
const ids = async () => (await (await call(GET, "GET", "/api/favorites")).json()).productIds as string[];

describe("favorites", () => {
  it("requires auth", async () => {
    expect((await call(GET, "GET", "/api/favorites")).status).toBe(401);
  });

  it("add, list, idempotent add, remove", async () => {
    const { rose, mono } = await seedCatalog();
    await signup("a@example.com", "198.51.100.1");
    expect((await call(POST, "POST", "/api/favorites", { productId: rose.id })).status).toBe(201);
    expect((await call(POST, "POST", "/api/favorites", { productId: rose.id })).status).toBe(201);
    await call(POST, "POST", "/api/favorites", { productId: mono.id });
    expect((await ids()).sort()).toEqual([rose.id, mono.id].sort());
    expect((await call(DELETE, "DELETE", `/api/favorites?productId=${rose.id}`)).status).toBe(200);
    expect(await ids()).toEqual([mono.id]);
  });

  it("cannot favorite DRAFT or unknown products", async () => {
    const { draft } = await seedCatalog();
    await signup("a@example.com", "198.51.100.1");
    expect((await call(POST, "POST", "/api/favorites", { productId: draft.id })).status).toBe(404);
    expect((await call(POST, "POST", "/api/favorites", { productId: "nope" })).status).toBe(404);
  });

  it("IDOR: users only ever see and change their own wishlist", async () => {
    const { rose } = await seedCatalog();
    const a = await signup("a@example.com", "198.51.100.1");
    as(a);
    await call(POST, "POST", "/api/favorites", { productId: rose.id });
    const b = await signup("b@example.com", "198.51.100.2");
    as(b);
    expect(await ids()).toEqual([]);
    await call(DELETE, "DELETE", `/api/favorites?productId=${rose.id}`); // must not touch A's item
    expect(await db.wishlistItem.count()).toBe(1);
    // extra body/query keys (e.g. userId) are rejected by the strict schema
    expect((await call(POST, "POST", "/api/favorites", { productId: rose.id, userId: "x" })).status).toBe(400);
  });
});
