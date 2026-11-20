import "server-only";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { fileExtension, EMBROIDERY_EXTENSIONS } from "../uploads/validators";

export interface ParsedThread {
  hex: string | null;
  description: string | null;
  catalogNumber: string | null;
}

export interface ParsedEmbroidery {
  parsed: true;
  format: string;
  stitchCount: number;
  colorChanges: number;
  colorCount: number;
  widthMm: number;
  heightMm: number;
  threads: ParsedThread[];
}

/** Parsing failed: the admin must enter metadata manually. Nothing is ever guessed. */
export interface ParseFailure {
  parsed: false;
  reason: string;
}

export type ParseResult = ParsedEmbroidery | ParseFailure;

const outputSchema = z.union([
  z.object({
    format: z.string(),
    stitchCount: z.number().int().nonnegative(),
    colorChanges: z.number().int().nonnegative(),
    colorCount: z.number().int().nonnegative(),
    widthMm: z.number().nonnegative(),
    heightMm: z.number().nonnegative(),
    threads: z.array(
      z.object({
        hex: z.string().nullable(),
        description: z.string().nullable(),
        catalogNumber: z.string().nullable(),
      })
    ),
  }),
  z.object({ error: z.string() }),
]);

const SCRIPT = path.join(process.cwd(), "tools", "embroidery", "parse.py");
export const PARSE_TIMEOUT_MS = 10_000;

function runPython(file: string): Promise<{ stdout: string } | { error: string }> {
  const bin = process.env.PYTHON_BIN || "python";
  return new Promise((resolve) => {
    // execFile with an argument array: no shell, the path is never interpreted.
    execFile(
      bin,
      [SCRIPT, file],
      { timeout: PARSE_TIMEOUT_MS, maxBuffer: 1024 * 1024, windowsHide: true, shell: false },
      (err, stdout) => {
        if (err) {
          const killed = (err as { killed?: boolean }).killed;
          return resolve({ error: killed ? "timeout" : "python failed" });
        }
        resolve({ stdout });
      }
    );
  });
}

/**
 * Parse an embroidery file held in memory (written to a private temp dir with a random name,
 * extension taken from the allowlist, removed afterwards). Returns `{parsed:false}` on any problem.
 */
export async function parseEmbroideryBuffer(buf: Buffer, originalName: string): Promise<ParseResult> {
  const ext = fileExtension(originalName);
  if (!(EMBROIDERY_EXTENSIONS as readonly string[]).includes(ext)) return { parsed: false, reason: "unsupported extension" };
  let dir: string | undefined;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "tb-emb-"));
    const file = path.join(dir, `${randomUUID()}.${ext}`);
    await writeFile(file, buf, { mode: 0o600 });
    return await parseEmbroideryFile(file);
  } catch {
    return { parsed: false, reason: "io error" };
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Parse a file on disk (caller guarantees the path is server-generated). */
export async function parseEmbroideryFile(file: string): Promise<ParseResult> {
  const r = await runPython(file);
  if ("error" in r) return { parsed: false, reason: r.error };
  let json: unknown;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    return { parsed: false, reason: "invalid parser output" };
  }
  const out = outputSchema.safeParse(json);
  if (!out.success) return { parsed: false, reason: "invalid parser output" };
  if ("error" in out.data) return { parsed: false, reason: out.data.error };
  if (out.data.stitchCount < 2 || (out.data.widthMm === 0 && out.data.heightMm === 0)) return { parsed: false, reason: "no usable stitch data" };
  return { parsed: true, ...out.data, format: out.data.format.toUpperCase() };
}
