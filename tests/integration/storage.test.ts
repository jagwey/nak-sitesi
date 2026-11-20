import net from "node:net";
import { describe, expect, it } from "vitest";
import { getStorage, newObjectKey } from "@/server/modules/storage";

function reachable(endpoint: string): Promise<boolean> {
  const u = new URL(endpoint);
  return new Promise((resolve) => {
    const s = net.connect({ host: u.hostname, port: Number(u.port || 80), timeout: 1500 });
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
    s.once("timeout", () => (s.destroy(), resolve(false)));
  });
}

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const up = await reachable(endpoint);
if (!up) console.warn(`[storage.test] MinIO unreachable at ${endpoint}: storage round-trip SKIPPED`);

describe.skipIf(!up)("storage round-trip (MinIO)", () => {
  it("put, head, signed download, delete on the private bucket", async () => {
    const st = getStorage();
    const key = newObjectKey("txt", "tests");
    const body = Buffer.from("merhaba nakış");
    await st.putObject({ bucket: "private", key, body, contentType: "text/plain" });
    const head = await st.headObject({ bucket: "private", key });
    expect(head).toMatchObject({ exists: true, sizeBytes: body.length });
    const url = await st.getSignedDownloadUrl({ key, ttlSeconds: 60, filename: "desen.txt" });
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(body)).toBe(true);
    expect(res.headers.get("content-disposition")).toContain("desen.txt");
    await st.deleteObject({ bucket: "private", key });
    expect((await st.headObject({ bucket: "private", key })).exists).toBe(false);
  });

  it("public bucket objects get a public URL", async () => {
    const st = getStorage();
    const key = newObjectKey("txt", "tests");
    await st.putObject({ bucket: "public", key, body: Buffer.from("x"), contentType: "text/plain" });
    expect((await fetch(st.publicUrl(key))).status).toBe(200);
    await st.deleteObject({ bucket: "public", key });
  });
});
