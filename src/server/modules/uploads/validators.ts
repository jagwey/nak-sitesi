import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import yauzl from "yauzl";
import { getEnv } from "../../env";

/** Typed validation outcome. Validators never throw for bad user input. */
export type Validated<T> = ({ ok: true } & T) | { ok: false; code: UploadErrorCode; message: string };

export type UploadErrorCode =
  | "EMPTY"
  | "TOO_LARGE"
  | "BAD_TYPE"
  | "BAD_MAGIC"
  | "BAD_IMAGE"
  | "BAD_EXTENSION"
  | "ZIP_INVALID"
  | "ZIP_UNSAFE_PATH"
  | "ZIP_TOO_MANY_ENTRIES"
  | "ZIP_TOO_LARGE"
  | "ZIP_BOMB"
  | "ZIP_BAD_ENTRY_TYPE";

const fail = (code: UploadErrorCode, message: string): { ok: false; code: UploadErrorCode; message: string } => ({
  ok: false,
  code,
  message,
});

export const sha256Hex = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

// ───────────────────────── Images ─────────────────────────

/** UPLOAD_MAX_MB is a global ceiling on top of the per-type limits (env unavailable => no extra cap). */
export function uploadCapBytes(): number {
  try {
    return Math.floor(getEnv().UPLOAD_MAX_MB * 1024 * 1024);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_MAX_PIXELS = 40_000_000; // decompression-bomb guard
export type ImageKind = "jpeg" | "png" | "webp";

export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

export interface ProcessedImage {
  kind: ImageKind;
  main: Buffer; // webp, metadata stripped, max 2000px
  thumb: Buffer; // webp, 400px wide
  width: number;
  height: number;
}

/**
 * Validate by magic bytes (client MIME is never consulted), then re-encode with sharp:
 * output is webp without EXIF/ICC/XMP; rotation is applied from EXIF before it is dropped.
 */
export async function processImageUpload(
  buf: Buffer,
  opts: { maxBytes?: number } = {}
): Promise<Validated<ProcessedImage>> {
  const max = opts.maxBytes ?? Math.min(IMAGE_MAX_BYTES, uploadCapBytes());
  if (buf.length === 0) return fail("EMPTY", "Dosya boş.");
  if (buf.length > max) return fail("TOO_LARGE", `Görsel en fazla ${Math.round(max / 1024 / 1024)} MB olabilir.`);
  const kind = sniffImage(buf);
  if (!kind) return fail("BAD_MAGIC", "Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
  try {
    const base = () => sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "error" }).rotate();
    const meta = await sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS }).metadata();
    if (!meta.width || !meta.height) return fail("BAD_IMAGE", "Görsel okunamadı.");
    const main = await base()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    return { ok: true, kind, main: main.data, thumb, width: main.info.width, height: main.info.height };
  } catch {
    return fail("BAD_IMAGE", "Görsel bozuk veya desteklenmeyen bir biçimde.");
  }
}

// ───────────────────────── Embroidery files ─────────────────────────

export const EMBROIDERY_EXTENSIONS = ["vp3", "pes", "dst", "jef", "hus", "exp", "xxx", "vip", "pec", "pcs", "sew", "art"] as const;
export type EmbroideryExt = (typeof EMBROIDERY_EXTENSIONS)[number];
const EXT_SET = new Set<string>(EMBROIDERY_EXTENSIONS);

export const EMBROIDERY_MAX_BYTES = 20 * 1024 * 1024;

export type Verification = "magic" | "structure" | "unverified";

export function fileExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i + 1).toLowerCase();
}

function checkHeader(ext: EmbroideryExt, buf: Buffer): Verification | null {
  const ascii = (n: number, off = 0) => buf.toString("latin1", off, off + n);
  switch (ext) {
    case "pes":
      return ascii(4) === "#PES" ? "magic" : null;
    case "pec":
      return ascii(8) === "#PEC0001" || ascii(3) === "LA:" ? "magic" : null;
    case "vp3":
      return ascii(5) === "%vsm%" ? "magic" : null;
    case "dst":
      return ascii(3) === "LA:" ? "magic" : null;
    case "jef": {
      // JEF: int32 LE offset of the stitch block; must lie inside the file and past the fixed header.
      if (buf.length < 0x74) return null;
      const off = buf.readInt32LE(0);
      return off >= 0x74 && off <= buf.length ? "structure" : null;
    }
    case "exp":
    case "xxx":
    case "hus":
    case "vip":
    case "pcs":
    case "sew":
    case "art":
      // No reliable public magic bytes: accepted by extension + size only, flagged as unverified.
      return "unverified";
  }
}

export interface EmbroideryFileCheck {
  ext: EmbroideryExt;
  sizeBytes: number;
  sha256: string;
  verification: Verification;
}

export function validateEmbroideryFile(name: string, buf: Buffer, opts: { maxBytes?: number } = {}): Validated<EmbroideryFileCheck> {
  const max = opts.maxBytes ?? Math.min(EMBROIDERY_MAX_BYTES, uploadCapBytes());
  const ext = fileExtension(name);
  if (!EXT_SET.has(ext)) return fail("BAD_EXTENSION", "Desteklenmeyen nakış dosyası uzantısı.");
  if (buf.length === 0) return fail("EMPTY", "Dosya boş.");
  if (buf.length > max) return fail("TOO_LARGE", `Dosya en fazla ${Math.round(max / 1024 / 1024)} MB olabilir.`);
  const verification = checkHeader(ext as EmbroideryExt, buf);
  if (!verification) return fail("BAD_MAGIC", `Dosya içeriği .${ext} biçimiyle uyuşmuyor.`);
  return { ok: true, ext: ext as EmbroideryExt, sizeBytes: buf.length, sha256: sha256Hex(buf), verification };
}

// ───────────────────────── ZIP ─────────────────────────

export interface ZipLimits {
  maxBytes: number; // compressed archive size
  maxEntries: number;
  maxTotalUncompressed: number;
  maxEntryUncompressed: number;
  maxRatio: number; // per-entry and overall uncompressed/compressed
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxBytes: 50 * 1024 * 1024,
  maxEntries: 200,
  maxTotalUncompressed: 200 * 1024 * 1024,
  maxEntryUncompressed: 50 * 1024 * 1024,
  maxRatio: 100,
};

export interface ZipEntryInfo {
  path: string;
  ext: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface ZipInspection {
  entries: ZipEntryInfo[];
  totalUncompressed: number;
  sha256: string;
}

/** Entries allowed inside an uploaded archive (embroidery files + harmless docs/previews). */
export const ZIP_INNER_EXTENSIONS = new Set<string>([...EMBROIDERY_EXTENSIONS, "pdf", "txt", "png", "jpg", "jpeg", "webp"]);

export function unsafeZipPath(p: string): boolean {
  if (!p || p.length > 255) return true;
  if (p.includes("\\")) return true; // backslash separators (Windows-style traversal)
  if (p.includes("\0")) return true;
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return true; // absolute / drive
  return p.split("/").some((seg) => seg === ".." || seg === ".");
}

/** yauzl itself refuses traversal/absolute names while parsing; surface that as the specific code. */
function zipError(err: Error | null | undefined) {
  return /relative path|absolute path|invalid characters in fileName/i.test(err?.message ?? "")
    ? fail("ZIP_UNSAFE_PATH", "ZIP içinde güvensiz dosya yolu var.")
    : fail("ZIP_INVALID", "ZIP dosyası okunamadı.");
}

/**
 * Inspect a ZIP held in memory WITHOUT extracting anything: decisions use central-directory
 * sizes (yauzl validates them against the actual stream when entries are read; we never read them).
 */
export function inspectZip(buf: Buffer, limits: Partial<ZipLimits> = {}): Promise<Validated<ZipInspection>> {
  const L = { ...DEFAULT_ZIP_LIMITS, maxBytes: Math.min(DEFAULT_ZIP_LIMITS.maxBytes, uploadCapBytes()), ...limits };
  return new Promise((resolve) => {
    if (buf.length === 0) return resolve(fail("EMPTY", "Dosya boş."));
    if (buf.length > L.maxBytes) return resolve(fail("TOO_LARGE", "ZIP dosyası çok büyük."));
    if (buf.length < 4 || buf.readUInt32LE(0) !== 0x04034b50) {
      return resolve(fail("BAD_MAGIC", "Geçerli bir ZIP dosyası değil."));
    }
    yauzl.fromBuffer(buf, { lazyEntries: true, strictFileNames: false, decodeStrings: true }, (err, zip) => {
      if (err || !zip) return resolve(zipError(err));
      const entries: ZipEntryInfo[] = [];
      let total = 0;
      let done = false;
      const finish = (r: Validated<ZipInspection>) => {
        if (done) return;
        done = true;
        try {
          zip.close();
        } catch {
          /* ignore */
        }
        resolve(r);
      };
      if (zip.entryCount > L.maxEntries) return finish(fail("ZIP_TOO_MANY_ENTRIES", "ZIP içinde çok fazla dosya var."));
      zip.on("error", (e) => finish(zipError(e)));
      zip.on("end", () => {
        const ratio = buf.length > 0 ? total / buf.length : 0;
        if (total > 0 && ratio > L.maxRatio) return finish(fail("ZIP_BOMB", "ZIP sıkıştırma oranı güvenli sınırın üzerinde."));
        finish({ ok: true, entries, totalUncompressed: total, sha256: sha256Hex(buf) });
      });
      zip.on("entry", (e: yauzl.Entry) => {
        const name = e.fileName;
        if (unsafeZipPath(name)) return finish(fail("ZIP_UNSAFE_PATH", "ZIP içinde güvensiz dosya yolu var."));
        const isDir = name.endsWith("/");
        // Symlinks / special files: unix mode in the high 16 bits of external attributes.
        const mode = (e.externalFileAttributes >>> 16) & 0xffff;
        const fmt = mode & 0o170000;
        if (!isDir && fmt !== 0 && fmt !== 0o100000) return finish(fail("ZIP_BAD_ENTRY_TYPE", "ZIP içinde desteklenmeyen girdi türü var."));
        if (e.generalPurposeBitFlag & 0x1) return finish(fail("ZIP_INVALID", "Şifreli ZIP desteklenmiyor."));
        if (!isDir) {
          const ext = fileExtension(name);
          if (!ZIP_INNER_EXTENSIONS.has(ext)) return finish(fail("BAD_EXTENSION", `ZIP içinde izin verilmeyen dosya türü: .${ext || "?"}`));
          if (e.uncompressedSize > L.maxEntryUncompressed) return finish(fail("ZIP_TOO_LARGE", "ZIP içindeki bir dosya çok büyük."));
          if (e.compressedSize > 0 && e.uncompressedSize / e.compressedSize > L.maxRatio && e.uncompressedSize > 1024 * 1024) {
            return finish(fail("ZIP_BOMB", "ZIP sıkıştırma oranı güvenli sınırın üzerinde."));
          }
          total += e.uncompressedSize;
          if (total > L.maxTotalUncompressed) return finish(fail("ZIP_TOO_LARGE", "ZIP açıldığında çok büyük."));
          entries.push({ path: name, ext, compressedSize: e.compressedSize, uncompressedSize: e.uncompressedSize });
        }
        zip.readEntry();
      });
      zip.readEntry();
    });
  });
}
