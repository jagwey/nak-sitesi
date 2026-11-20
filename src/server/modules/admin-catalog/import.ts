import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { parseCsv, toCsv } from "@/lib/csv";
import { parseTlToKurus } from "@/lib/money";
import { normalizeTurkish } from "@/lib/search";
import { slugifyTr } from "@/lib/slug";
import { reindexProducts } from "../search";
import { uniqueProductSlug, type Actor } from "./products";
import { PRODUCT_TYPES } from "./schema";

export const CSV_HEADERS = ["sku", "ad", "tur", "fiyat", "karsilastirma_fiyati", "kategori", "kisa_aciklama", "aciklama", "etiketler", "formatlar", "stok", "genislik_mm", "yukseklik_mm", "dikis_sayisi", "renk_sayisi"] as const;
const MAX_ROWS = 1000;

const TYPE_ALIASES: Record<string, (typeof PRODUCT_TYPES)[number]> = {
  digital_embroidery: "DIGITAL_EMBROIDERY", "dijital nakis": "DIGITAL_EMBROIDERY", "dijital nakis deseni": "DIGITAL_EMBROIDERY",
  physical: "PHYSICAL", fiziksel: "PHYSICAL", "fiziksel urun": "PHYSICAL",
  personalized: "PERSONALIZED", "kisiye ozel": "PERSONALIZED",
  textile_print: "TEXTILE_PRINT", "tekstil baski": "TEXTILE_PRINT",
  digital_print: "DIGITAL_PRINT", "dijital baski": "DIGITAL_PRINT",
  bundle: "BUNDLE", paket: "BUNDLE",
};

export function csvTemplate(delimiter: "," | ";" = ";"): string {
  return toCsv([
    [...CSV_HEADERS],
    ["ORNEK-001", "Örnek ürün adı", "DIGITAL_EMBROIDERY", "149,90", "", "Kategori adı", "Kısa açıklama", "Uzun açıklama", "etiket1|etiket2", "PES|DST", "", "100", "100", "", ""],
  ], delimiter);
}

export interface RowIssue { row: number; column: string; message: string }
export interface PreviewRow {
  row: number; sku: string; name: string; action: "create" | "update" | "invalid";
}
export interface ImportPreview {
  delimiter: "," | ";";
  totalRows: number; createCount: number; updateCount: number; invalidCount: number;
  errors: RowIssue[]; rows: PreviewRow[];
}

interface ValidRow {
  row: number; sku: string; name: string; type: (typeof PRODUCT_TYPES)[number]; priceKurus: number; compareAtPriceKurus: number | null;
  categoryId: string | null; shortDescription: string; description: string; tagNames: string[]; formatCodes: string[];
  stock: number | null; widthMm: number | null; heightMm: number | null; stitchCount: number | null; colorCount: number | null;
  existingId: string | null;
}

interface Analysis { preview: ImportPreview; valid: ValidRow[] }

function intCell(v: string, row: number, column: string, errors: RowIssue[], min = 0, max = 5_000_000): number | null | undefined {
  const t = v.trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) { errors.push({ row, column, message: "Tam sayı olmalı." }); return undefined; }
  const n = Number(t);
  if (n < min || n > max) { errors.push({ row, column, message: `Değer ${min} ile ${max} arasında olmalı.` }); return undefined; }
  return n;
}

export async function analyzeCsv(text: string): Promise<Analysis> {
  let parsed;
  try { parsed = parseCsv(text); } catch (e) { throw new AppError("VALIDATION", e instanceof Error ? e.message : "CSV okunamadı."); }
  const [head, ...data] = parsed.rows;
  if (!head) throw new AppError("VALIDATION", "Dosya boş.");
  const header = head.map((h) => h.trim().toLowerCase());
  const missing = ["sku", "ad", "tur", "fiyat"].filter((h) => !header.includes(h));
  if (missing.length) throw new AppError("VALIDATION", `Eksik sütun: ${missing.join(", ")}. Şablonu indirip kullanın.`);
  const unknown = header.filter((h) => !(CSV_HEADERS as readonly string[]).includes(h));
  if (unknown.length) throw new AppError("VALIDATION", `Tanınmayan sütun: ${unknown.join(", ")}.`);
  if (data.length === 0) throw new AppError("VALIDATION", "Dosyada ürün satırı yok.");
  if (data.length > MAX_ROWS) throw new AppError("VALIDATION", `En fazla ${MAX_ROWS} satır içe aktarılabilir.`);

  const [cats, formats, existing] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.fileFormat.findMany({ select: { code: true } }),
    db.product.findMany({ select: { id: true, sku: true, type: true } }),
  ]);
  const catByKey = new Map<string, string>();
  for (const c of cats) { catByKey.set(normalizeTurkish(c.name), c.id); catByKey.set(c.slug, c.id); }
  const formatSet = new Set(formats.map((f) => f.code));
  const skuMap = new Map(existing.map((p) => [p.sku.toLowerCase(), p]));

  const errors: RowIssue[] = [];
  const rows: PreviewRow[] = [];
  const valid: ValidRow[] = [];
  const seen = new Map<string, number>();

  data.forEach((cells, idx) => {
    const row = idx + 2; // 1 = header
    const get = (h: string) => (cells[header.indexOf(h)] ?? "").trim();
    const before = errors.length;
    const sku = get("sku");
    const name = get("ad");
    if (!sku) errors.push({ row, column: "sku", message: "SKU zorunlu." });
    else if (sku.length > 60) errors.push({ row, column: "sku", message: "SKU en fazla 60 karakter olabilir." });
    else if (seen.has(sku.toLowerCase())) errors.push({ row, column: "sku", message: `Bu SKU ${seen.get(sku.toLowerCase())}. satırda da var.` });
    else seen.set(sku.toLowerCase(), row);
    if (name.length < 2 || name.length > 160) errors.push({ row, column: "ad", message: "Ad 2-160 karakter olmalı." });
    const typeRaw = get("tur");
    const type = (PRODUCT_TYPES as readonly string[]).includes(typeRaw.toUpperCase()) ? (typeRaw.toUpperCase() as (typeof PRODUCT_TYPES)[number]) : TYPE_ALIASES[normalizeTurkish(typeRaw)];
    if (!type) errors.push({ row, column: "tur", message: `Geçersiz tür. Geçerli değerler: ${PRODUCT_TYPES.join(", ")}.` });
    const price = parseTlToKurus(get("fiyat"));
    if (price === null || price <= 0) errors.push({ row, column: "fiyat", message: "Geçerli bir TL tutarı girin (örn. 149,90)." });
    let compare: number | null = null;
    if (get("karsilastirma_fiyati")) {
      compare = parseTlToKurus(get("karsilastirma_fiyati"));
      if (compare === null) errors.push({ row, column: "karsilastirma_fiyati", message: "Geçerli bir TL tutarı girin." });
      else if (price !== null && compare <= price) errors.push({ row, column: "karsilastirma_fiyati", message: "Karşılaştırma fiyatı satış fiyatından yüksek olmalı." });
    }
    let categoryId: string | null = null;
    if (get("kategori")) {
      categoryId = catByKey.get(normalizeTurkish(get("kategori"))) ?? catByKey.get(get("kategori")) ?? null;
      if (!categoryId) errors.push({ row, column: "kategori", message: `"${get("kategori")}" adlı kategori yok.` });
    }
    const tagNames = get("etiketler") ? [...new Set(get("etiketler").split("|").map((t) => t.trim()).filter(Boolean))] : [];
    if (tagNames.some((t) => t.length > 60)) errors.push({ row, column: "etiketler", message: "Etiket en fazla 60 karakter olabilir." });
    const formatCodes = get("formatlar") ? [...new Set(get("formatlar").split("|").map((t) => t.trim().toUpperCase()).filter(Boolean))] : [];
    for (const f of formatCodes) if (!formatSet.has(f)) errors.push({ row, column: "formatlar", message: `Bilinmeyen biçim: ${f}.` });
    if (formatCodes.length && type && type !== "DIGITAL_EMBROIDERY") errors.push({ row, column: "formatlar", message: "Biçim yalnızca dijital nakış ürünlerinde kullanılır." });
    if (get("kisa_aciklama").length > 300) errors.push({ row, column: "kisa_aciklama", message: "En fazla 300 karakter." });
    if (get("aciklama").length > 8000) errors.push({ row, column: "aciklama", message: "En fazla 8000 karakter." });
    const stock = intCell(get("stok"), row, "stok", errors, 0, 1_000_000);
    if (stock !== null && stock !== undefined && type && !["PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT"].includes(type)) errors.push({ row, column: "stok", message: "Stok yalnızca fiziksel ürünlerde kullanılır." });
    const w = intCell(get("genislik_mm"), row, "genislik_mm", errors, 1, 5000);
    const h = intCell(get("yukseklik_mm"), row, "yukseklik_mm", errors, 1, 5000);
    const st = intCell(get("dikis_sayisi"), row, "dikis_sayisi", errors, 1, 5_000_000);
    const cc = intCell(get("renk_sayisi"), row, "renk_sayisi", errors, 1, 200);
    const hasEmb = [w, h, st, cc].some((x) => x !== null && x !== undefined);
    if (hasEmb && type && type !== "DIGITAL_EMBROIDERY") errors.push({ row, column: "genislik_mm", message: "Nakış ölçüleri yalnızca dijital nakış ürünlerinde kullanılır." });

    const ex = sku ? skuMap.get(sku.toLowerCase()) : undefined;
    if (ex && type && ex.type !== type) errors.push({ row, column: "tur", message: `Mevcut ürünün türü (${ex.type}) değiştirilemez.` });

    if (errors.length > before || !type || price === null || stock === undefined || w === undefined || h === undefined || st === undefined || cc === undefined) {
      rows.push({ row, sku, name, action: "invalid" });
      return;
    }
    rows.push({ row, sku, name, action: ex ? "update" : "create" });
    valid.push({
      row, sku, name, type, priceKurus: price, compareAtPriceKurus: compare, categoryId, shortDescription: get("kisa_aciklama"), description: get("aciklama"),
      tagNames, formatCodes, stock, widthMm: w, heightMm: h, stitchCount: st, colorCount: cc, existingId: ex?.id ?? null,
    });
  });

  const preview: ImportPreview = {
    delimiter: parsed.delimiter, totalRows: data.length,
    createCount: rows.filter((r) => r.action === "create").length, updateCount: rows.filter((r) => r.action === "update").length,
    invalidCount: rows.filter((r) => r.action === "invalid").length, errors: errors.slice(0, 500), rows: rows.slice(0, 200),
  };
  return { preview, valid };
}

export async function previewImport(text: string): Promise<ImportPreview> {
  return (await analyzeCsv(text)).preview;
}

export interface ImportResult { created: number; updated: number; skipped: number; errorCsv: string | null; createdSkus: string[] }

export async function commitImport(text: string, mode: "all_or_nothing" | "valid_only", actor: Actor): Promise<ImportResult> {
  const { preview, valid } = await analyzeCsv(text);
  if (mode === "all_or_nothing" && preview.invalidCount > 0) {
    throw new AppError("VALIDATION", `${preview.invalidCount} satırda hata var; hiçbir şey içe aktarılmadı.`, { details: preview.errors.map((e) => ({ path: `satır ${e.row} / ${e.column}`, message: e.message })).slice(0, 50) });
  }
  const errorCsv = preview.errors.length
    ? toCsv([["satir", "sutun", "hata"], ...preview.errors.map((e) => [e.row, e.column, e.message])])
    : null;
  if (valid.length === 0) throw new AppError("VALIDATION", "İçe aktarılacak geçerli satır yok.");

  const touched: string[] = [];
  const createdSkus: string[] = [];
  let created = 0, updated = 0;
  await db.$transaction(async (tx) => {
    for (const r of valid) {
      const tagIds: string[] = [];
      for (const name of r.tagNames) {
        const slug = slugifyTr(name) || "etiket";
        const t = (await tx.tag.findUnique({ where: { slug } })) ?? (await tx.tag.create({ data: { name, slug } }));
        tagIds.push(t.id);
      }
      const base = {
        name: r.name, priceKurus: r.priceKurus, compareAtPriceKurus: r.compareAtPriceKurus, categoryId: r.categoryId,
        shortDescription: r.shortDescription, description: r.description,
      };
      let id = r.existingId;
      if (id) {
        await tx.product.update({ where: { id }, data: base });
        updated++;
      } else {
        const slug = await uniqueProductSlug(tx, slugifyTr(r.name));
        const p = await tx.product.create({ data: { ...base, slug, sku: r.sku, type: r.type, status: "DRAFT", searchText: "" } });
        id = p.id;
        created++;
        createdSkus.push(r.sku);
      }
      touched.push(id);
      if (r.tagNames.length) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId: id!, tagId })), skipDuplicates: true });
      }
      if (r.formatCodes.length) {
        const fs = await tx.fileFormat.findMany({ where: { code: { in: r.formatCodes } } });
        await tx.productFormat.createMany({ data: fs.map((f) => ({ productId: id!, formatId: f.id })), skipDuplicates: true });
      }
      if (r.stock !== null) {
        const inv = await tx.inventory.findFirst({ where: { productId: id } });
        if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { onHand: r.stock } });
        else await tx.inventory.create({ data: { productId: id, onHand: r.stock } });
      } else if (!r.existingId && ["PHYSICAL", "PERSONALIZED", "TEXTILE_PRINT"].includes(r.type)) {
        await tx.inventory.create({ data: { productId: id, onHand: 0 } });
      }
      if ([r.widthMm, r.heightMm, r.stitchCount, r.colorCount].some((x) => x !== null)) {
        const data = {
          ...(r.widthMm !== null ? { designWidthMm: r.widthMm } : {}), ...(r.heightMm !== null ? { designHeightMm: r.heightMm } : {}),
          ...(r.stitchCount !== null ? { stitchCount: r.stitchCount } : {}), ...(r.colorCount !== null ? { colorCount: r.colorCount } : {}),
        };
        await tx.embroideryMetadata.upsert({ where: { productId: id }, create: { productId: id, ...data, metadataSource: "MANUAL" }, update: { ...data, metadataSource: "MANUAL" } });
      }
    }
    await writeAudit({ actorUserId: actor.id, action: "product.import", entity: "Product", diff: { mode, created, updated, skipped: preview.invalidCount }, ip: actor.ip }, tx);
  }, { timeout: 60000 });
  await reindexProducts(db, touched);
  return { created, updated, skipped: preview.invalidCount, errorCsv, createdSkus };
}
