import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../../env";

export type BucketKind = "private" | "public";

export interface PutObjectInput {
  bucket: BucketKind;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface SignedDownloadInput {
  /** Key in the PRIVATE bucket. */
  key: string;
  ttlSeconds: number;
  /** Suggested filename for the browser (Content-Disposition: attachment). */
  filename: string;
}

export interface HeadResult {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
}

export interface StorageAdapter {
  putObject(input: PutObjectInput): Promise<void>;
  getSignedDownloadUrl(input: SignedDownloadInput): Promise<string>;
  deleteObject(input: { bucket: BucketKind; key: string }): Promise<void>;
  headObject(input: { bucket: BucketKind; key: string }): Promise<HeadResult>;
  /** Public URL for an object in the PUBLIC bucket. */
  publicUrl(key: string): string;
}

const SAFE_EXT = /^[a-z0-9]{1,8}$/;

/**
 * Random object key. Never derived from user-supplied file names:
 * only a sanitized extension is carried over. Optional `prefix` must be a fixed literal path (e.g. "products").
 */
export function newObjectKey(ext?: string, prefix?: string): string {
  const e = (ext ?? "").replace(/^\./, "").toLowerCase();
  const suffix = SAFE_EXT.test(e) ? `.${e}` : "";
  const p = prefix ? `${prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "")}/` : "";
  return `${p}${randomUUID()}${suffix}`;
}

/** Make a Content-Disposition-safe filename (no CR/LF/quotes/path separators). */
export function safeDownloadName(name: string): string {
  const cleaned = name.replace(/[\r\n"\/]+/g, "_").replace(/[^\x20-\x7EÀ-ɏĞğİıŞş]/g, "_").trim();
  return (cleaned || "download").slice(0, 120);
}

class S3Storage implements StorageAdapter {
  private client: S3Client;
  private signer: S3Client;

  constructor() {
    const e = getEnv();
    const cfg = {
      region: e.S3_REGION,
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: e.S3_ACCESS_KEY, secretAccessKey: e.S3_SECRET_KEY },
      // AWS SDK v3 adds optional CRC32 checksums which MinIO/other S3 clones may not require.
      requestChecksumCalculation: "WHEN_REQUIRED" as const,
      responseChecksumValidation: "WHEN_REQUIRED" as const,
    };
    this.client = new S3Client(cfg);
    this.signer = this.client;
  }

  private bucket(kind: BucketKind): string {
    const e = getEnv();
    return kind === "private" ? e.S3_BUCKET_PRIVATE : e.S3_BUCKET_PUBLIC;
  }

  async putObject({ bucket, key, body, contentType }: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket(bucket),
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        ...(bucket === "public" ? { CacheControl: "public, max-age=31536000, immutable" } : {}),
      })
    );
  }

  async getSignedDownloadUrl({ key, ttlSeconds, filename }: SignedDownloadInput): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket("private"),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeDownloadName(filename)}"`,
      ResponseContentType: "application/octet-stream",
    });
    return getSignedUrl(this.signer, cmd, { expiresIn: ttlSeconds });
  }

  async deleteObject({ bucket, key }: { bucket: BucketKind; key: string }): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket(bucket), Key: key }));
  }

  async headObject({ bucket, key }: { bucket: BucketKind; key: string }): Promise<HeadResult> {
    try {
      const r = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket(bucket), Key: key }));
      return { exists: true, sizeBytes: r.ContentLength, contentType: r.ContentType };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (err as { name?: string }).name === "NotFound") return { exists: false };
      throw err;
    }
  }

  publicUrl(key: string): string {
    const base = getEnv().S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}

let instance: StorageAdapter | undefined;
let override: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (override) return override;
  return (instance ??= new S3Storage());
}

/** Test seam: swap the adapter (pass undefined to restore). */
export function __setStorageForTests(adapter: StorageAdapter | undefined) {
  override = adapter;
}
