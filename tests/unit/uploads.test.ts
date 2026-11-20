import { readFileSync } from "node:fs";
import path from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  inspectZip,
  processImageUpload,
  sniffImage,
  unsafeZipPath,
  validateEmbroideryFile,
} from "@/server/modules/uploads";

interface Entry {
  name: string;
  data: Buffer;
  deflate?: boolean;
  attrs?: number; // external attributes (unix mode in the high 16 bits)
}

/** Minimal ZIP writer so tests can craft hostile archives (names, modes) that real tools refuse to make. */
function makeZip(entries: Entry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const body = e.deflate ? deflateRawSync(e.data) : e.data;
    const crc = crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(e.deflate ? 8 : 0, 8);
    lh.writeUInt32LE(crc >>> 0, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    const local = Buffer.concat([lh, name, body]);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(0x031e, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(e.deflate ? 8 : 0, 10);
    ch.writeUInt32LE(crc >>> 0, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(((e.attrs ?? 0o100644 << 16) >>> 0) as number, 38);
    ch.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([ch, name]));
    locals.push(local);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const fixture = (n: string) => readFileSync(path.join(process.cwd(), "tests", "fixtures", n));

describe("image validation", () => {
  it("accepts a real PNG and re-encodes to webp", async () => {
    const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#b18a49" } }).png().toBuffer();
    const r = await processImageUpload(png);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kind).toBe("png");
      expect(sniffImage(r.main)).toBe("webp");
    }
  });

  it("rejects wrong magic even when the content claims to be an image", async () => {
    const fake = Buffer.from("<script>alert(1)</script>");
    const r = await processImageUpload(fake);
    expect(r).toMatchObject({ ok: false, code: "BAD_MAGIC" });
  });

  it("rejects an exe renamed to .jpg, empty and oversized files", async () => {
    expect(await processImageUpload(Buffer.from("MZ\x90\x00fake exe"))).toMatchObject({ ok: false, code: "BAD_MAGIC" });
    expect(await processImageUpload(Buffer.alloc(0))).toMatchObject({ ok: false, code: "EMPTY" });
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(await processImageUpload(png, { maxBytes: 10 })).toMatchObject({ ok: false, code: "TOO_LARGE" });
  });

  it("rejects a truncated image with valid magic", async () => {
    const r = await processImageUpload(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]));
    expect(r).toMatchObject({ ok: false, code: "BAD_IMAGE" });
  });
});

describe("embroidery file validation", () => {
  it("accepts the DST and PES fixtures by magic bytes", () => {
    expect(validateEmbroideryFile("a.dst", fixture("test-fixture.dst"))).toMatchObject({ ok: true, ext: "dst", verification: "magic" });
    expect(validateEmbroideryFile("A.PES", fixture("test-fixture.pes"))).toMatchObject({ ok: true, ext: "pes", verification: "magic" });
  });

  it("rejects wrong magic, bad extension and empty files", () => {
    expect(validateEmbroideryFile("a.vp3", fixture("test-fixture.dst"))).toMatchObject({ ok: false, code: "BAD_MAGIC" });
    expect(validateEmbroideryFile("a.exe", Buffer.from("MZ"))).toMatchObject({ ok: false, code: "BAD_EXTENSION" });
    expect(validateEmbroideryFile("a.dst", Buffer.alloc(0))).toMatchObject({ ok: false, code: "EMPTY" });
    expect(validateEmbroideryFile("a.dst", fixture("test-fixture.dst"), { maxBytes: 5 })).toMatchObject({ ok: false, code: "TOO_LARGE" });
  });

  it("flags formats without public magic as unverified rather than claiming they were checked", () => {
    expect(validateEmbroideryFile("a.exp", Buffer.from("anything"))).toMatchObject({ ok: true, verification: "unverified" });
  });
});

describe("zip inspection", () => {
  const dst = fixture("test-fixture.dst");

  it("accepts a normal archive", async () => {
    const r = await inspectZip(makeZip([{ name: "rose/rose.dst", data: dst }, { name: "readme.txt", data: Buffer.from("hi") }]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries.map((e) => e.path)).toEqual(["rose/rose.dst", "readme.txt"]);
  });

  it("rejects path traversal and absolute paths", async () => {
    for (const name of ["../evil.dst", "a/../../evil.dst", "/etc/passwd.txt", "C:/x.txt", "a\\..\\b.txt"]) {
      expect(await inspectZip(makeZip([{ name, data: dst }]))).toMatchObject({ ok: false, code: "ZIP_UNSAFE_PATH" });
    }
    expect(unsafeZipPath("ok/file.dst")).toBe(false);
  });

  it("rejects a zip bomb (tiny archive, huge ratio)", async () => {
    const bomb = makeZip([{ name: "big.txt", data: Buffer.alloc(3 * 1024 * 1024), deflate: true }]);
    expect(bomb.length).toBeLessThan(20_000);
    expect(await inspectZip(bomb)).toMatchObject({ ok: false, code: "ZIP_BOMB" });
  });

  it("rejects too many entries, executables and symlinks", async () => {
    const many = makeZip(Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.txt`, data: Buffer.from("x") })));
    expect(await inspectZip(many, { maxEntries: 5 })).toMatchObject({ ok: false, code: "ZIP_TOO_MANY_ENTRIES" });
    expect(await inspectZip(makeZip([{ name: "run.exe", data: Buffer.from("MZ") }]))).toMatchObject({ ok: false, code: "BAD_EXTENSION" });
    const link = makeZip([{ name: "link.txt", data: Buffer.from("/etc/passwd"), attrs: (0o120777 << 16) >>> 0 }]);
    expect(await inspectZip(link)).toMatchObject({ ok: false, code: "ZIP_BAD_ENTRY_TYPE" });
  });

  it("rejects non-zip data", async () => {
    expect(await inspectZip(Buffer.from("not a zip at all"))).toMatchObject({ ok: false, code: "BAD_MAGIC" });
  });
});
