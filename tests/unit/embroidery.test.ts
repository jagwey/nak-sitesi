import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseEmbroideryBuffer } from "@/server/modules/embroidery";

const fixture = (n: string) => readFileSync(path.join(process.cwd(), "tests", "fixtures", n));

describe("embroidery parser", () => {
  it("parses the DST fixture (11 stitches, 10x20 mm, 2 colors)", async () => {
    const r = await parseEmbroideryBuffer(fixture("test-fixture.dst"), "x.dst");
    expect(r.parsed).toBe(true);
    if (r.parsed) {
      expect(r.format).toBe("DST");
      expect(r.stitchCount).toBe(11);
      expect(r.widthMm).toBeCloseTo(10, 0);
      expect(r.heightMm).toBeCloseTo(20, 0);
      expect(r.colorCount).toBe(2);
    }
  });

  it("parses the PES fixture", async () => {
    const r = await parseEmbroideryBuffer(fixture("test-fixture.pes"), "x.pes");
    expect(r.parsed).toBe(true);
  });

  it("returns parsed:false (never guesses) for garbage and unsupported extensions", async () => {
    expect(await parseEmbroideryBuffer(Buffer.from("garbage"), "x.dst")).toMatchObject({ parsed: false });
    expect(await parseEmbroideryBuffer(Buffer.from("x"), "x.exe")).toMatchObject({ parsed: false, reason: "unsupported extension" });
  });
});
