import { describe, expect, it } from "vitest";
import { call, jar } from "./helpers";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as listAddr, POST as createAddr } from "@/app/api/me/addresses/route";
import { GET as getAddr, PATCH as patchAddr, DELETE as delAddr } from "@/app/api/me/addresses/[id]/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/me/profile/route";

const addr = { fullName: "Ayşe Demo", phone: "+90 555 000 00 00", line1: "Örnek Mah. 1", city: "İstanbul", district: "Kadıköy" };

async function signup(email: string, ip: string) {
  await call(register, "POST", "/api/auth/register", { email, password: "correct-horse-battery" }, { ip });
  return new Map(jar);
}
const as = (session: Map<string, string>) => {
  jar.clear();
  session.forEach((v, k) => jar.set(k, v));
};

describe("addresses + profile", () => {
  it("requires auth", async () => {
    expect((await call(listAddr, "GET", "/api/me/addresses")).status).toBe(401);
  });

  it("CRUD for owner; only one default shipping address", async () => {
    await signup("a@example.com", "198.51.100.1");
    const a = (await (await call(createAddr, "POST", "/api/me/addresses", { ...addr, isDefaultShipping: true })).json()).address;
    const b = (await (await call(createAddr, "POST", "/api/me/addresses", { ...addr, line1: "İkinci Cad. 2", isDefaultShipping: true })).json()).address;
    const list = (await (await call(listAddr, "GET", "/api/me/addresses")).json()).addresses;
    expect(list.filter((x: { isDefaultShipping: boolean }) => x.isDefaultShipping).map((x: { id: string }) => x.id)).toEqual([b.id]);
    const upd = await call(patchAddr, "PATCH", `/api/me/addresses/${a.id}`, { city: "Ankara" }, { params: { id: a.id } });
    expect((await upd.json()).address.city).toBe("Ankara");
    expect((await call(delAddr, "DELETE", `/api/me/addresses/${a.id}`, undefined, { params: { id: a.id } })).status).toBe(200);
    expect((await call(getAddr, "GET", `/api/me/addresses/${a.id}`, undefined, { params: { id: a.id } })).status).toBe(404);
  });

  it("IDOR: user B cannot read, update or delete user A address", async () => {
    const sa = await signup("a@example.com", "198.51.100.1");
    as(sa);
    const a = (await (await call(createAddr, "POST", "/api/me/addresses", addr)).json()).address;
    await signup("b@example.com", "198.51.100.2");
    const p = { params: { id: a.id } };
    expect((await call(getAddr, "GET", "/x", undefined, p)).status).toBe(404);
    expect((await call(patchAddr, "PATCH", "/x", { city: "Hacked" }, p)).status).toBe(404);
    expect((await call(delAddr, "DELETE", "/x", undefined, p)).status).toBe(404);
    expect((await (await call(listAddr, "GET", "/api/me/addresses")).json()).addresses).toHaveLength(0);
    as(sa);
    const still = (await (await call(getAddr, "GET", "/x", undefined, p)).json()).address;
    expect(still.city).toBe("İstanbul");
  });

  it("rejects unknown fields (mass assignment)", async () => {
    await signup("a@example.com", "198.51.100.1");
    expect((await call(createAddr, "POST", "/api/me/addresses", { ...addr, userId: "someone-else" })).status).toBe(400);
  });

  it("profile get/patch", async () => {
    await signup("a@example.com", "198.51.100.1");
    const r = await call(patchProfile, "PATCH", "/api/me/profile", { name: "Yeni Ad", phone: "+90 532 111 22 33" });
    expect((await r.json()).user.name).toBe("Yeni Ad");
    expect((await (await call(getProfile, "GET", "/api/me/profile")).json()).user.phone).toBe("+90 532 111 22 33");
    expect((await call(patchProfile, "PATCH", "/api/me/profile", { email: "x@y.co" })).status).toBe(400);
  });
});
