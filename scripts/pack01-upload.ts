// Paket 01 "Geleneksel Türk Motifleri": 6 TASLAK dijital nakış ürününü yükler (idempotent).
//   npx tsx --conditions=react-server --env-file=.env scripts/pack01-upload.ts [paket-klasoru]
// Paket klasörü: VP3/, Gorseller/, qa_rapor.json içerir (varsayılan: Belgeler\...\Paket_01_Geleneksel).
// Modül servis fonksiyonlarını kullanır (ham SQL yok). Ürünler DRAFT, isDemo=false; fiyatlar YER TUTUCU
// (sahip onayı gerekir). "server-only" için --conditions=react-server gerekir.
import { readFile } from "node:fs/promises";
import path from "node:path";

const PACK_DIR = process.argv[2] ?? "C:/Users/Osman/OneDrive/Belgeler/ChatGPT/Nakış desen üretimi/Paket_01_Geleneksel";
const PLACEHOLDER_PRICE_KURUS = 14900; // 149,00 TL - YER TUTUCU, sahip onaylayacak
const DRAFT_NOTE = "[TASLAK - FİYAT SAHİP ONAYI BEKLİYOR: yer tutucu fiyat 149,00 TL. Yayından önce bu satırı silin.]";
const HOOPS: Record<string, [number, number]> = { "Pfaff 120x120": [120, 120], "Pfaff 180x130": [180, 130], "Pfaff 240x150": [240, 150], "Pfaff 260x200": [260, 200] };

interface Design { key: string; slug: string; sku: string; name: string; blurb: string; usage: string[]; }
const DESIGNS: Design[] = [
  { key: "lale", slug: "geleneksel-lale-motifi-vp3", sku: "PK01-LALE", name: "Geleneksel Lale Motifi (VP3)", blurb: "Osmanlı ve Anadolu işlemelerinin simgesi lale; kırmızı katmanlı taç, yeşil yapraklar ve altın vurgular.", usage: ["Havlu ucu", "Yastık", "Masa örtüsü köşesi", "Çanta"] },
  { key: "karanfil", slug: "geleneksel-karanfil-motifi-vp3", sku: "PK01-KARANFIL", name: "Geleneksel Karanfil Motifi (VP3)", blurb: "Yelpaze gibi açılan yedi taç yapraklı karanfil; koyu damar çizgileri ve altın çanak.", usage: ["Havlu", "Yastık kılıfı", "Önlük", "Çerçeveli pano"] },
  { key: "nar", slug: "geleneksel-nar-motifi-vp3", sku: "PK01-NAR", name: "Geleneksel Nar Motifi (VP3)", blurb: "Bolluk ve bereket simgesi nar; altın tacı, çekirdek noktaları ve iki yaprağıyla.", usage: ["Mutfak havlusu", "Sofra bezi", "Yastık", "Pano"] },
  { key: "hatayi-kose", slug: "hatayi-kose-motifi-vp3", sku: "PK01-HATAYI", name: "Hatayi Köşe Motifi (VP3)", blurb: "Lacivert dallı, turkuaz yapraklı ve altın palmetli simetrik köşe süsü.", usage: ["Masa örtüsü köşesi", "Mendil", "Şal", "Yatak örtüsü"] },
  { key: "bordur", slug: "lale-bordur-vp3", sku: "PK01-BORDUR", name: "Lale Bordür (VP3)", blurb: "Dalgalı dal üzerinde dönüşümlü laleler ve altın noktalar; yatay bordür.", usage: ["Perde kenarı", "Havlu kenarı", "Masa yolluğu", "Elbise etek ucu"] },
  { key: "monogram-cerceve", slug: "monogram-cerceve-vp3", sku: "PK01-MONOGRAM", name: "Monogram Çerçeve (VP3)", blurb: "Altın halka, yaprak dalları ve tepede lale; ortası harf için boş bırakılmış çerçeve.", usage: ["Havlu", "Bornoz", "Yastık", "Düğün hediyesi"] },
];

type Meta = { width_mm: number; height_mm: number; stitches: number; colors: number; color_changes: number; hoops: string[]; threads: [string, string][] };

async function main() {
  const { db } = await import("../src/server/db");
  const { createProduct, updateProduct } = await import("../src/server/modules/admin-catalog/products");
  const { addProductImage, uploadEmbroideryFile } = await import("../src/server/modules/admin-catalog/media");
  const { createCategory, createCollection, setCollectionProducts } = await import("../src/server/modules/admin-catalog/taxonomy");

  const qa = JSON.parse(await readFile(path.join(PACK_DIR, "qa_rapor.json"), "utf8")) as Record<string, Meta>;
  const admin = await db.user.findFirst({ where: { roles: { some: { role: { code: "SUPER_ADMIN" } } } }, select: { id: true } });
  if (!admin) throw new Error("SUPER_ADMIN yok: önce `npm run admin:create`.");
  const actor = { id: admin.id, ip: null };

  // Pfaff kasnakları (servis yok; HoopSize satırı seed gibi doğrudan upsert).
  const hoopId = new Map<string, string>();
  for (const [label, [w, h]] of Object.entries(HOOPS)) {
    const label2 = `${label} mm`;
    hoopId.set(label, (await db.hoopSize.upsert({ where: { label: label2 }, update: {}, create: { label: label2, widthMm: w, heightMm: h } })).id);
  }
  const license = await db.license.findUnique({ where: { code: "PERSONAL" }, select: { id: true } });

  const category = (await db.category.findUnique({ where: { slug: "geleneksel-turk-motifleri" } }))
    ?? (await createCategory({ slug: "geleneksel-turk-motifleri", name: "Geleneksel Türk Motifleri", description: "Lale, karanfil, nar ve hatayi gibi geleneksel Türk işleme motiflerinden dijital nakış desenleri.", image: null, imageAlt: null, featuredType: "digital", parentId: null, sort: 50, active: false }, actor));
  const collection = (await db.collection.findUnique({ where: { slug: "geleneksel-turk-motifleri-paketi" } }))
    ?? (await createCollection({ slug: "geleneksel-turk-motifleri-paketi", title: "Geleneksel Türk Motifleri Paketi", subtitle: "6 motif, her biri iki ölçüde", image: null, imageAlt: null, sort: 50, active: false }, actor));

  const ids: string[] = [];
  for (const d of DESIGNS) {
    const S = qa[`${d.key}_S`], L = qa[`${d.key}_L`];
    const hoopsFor = (m: Meta) => m.hoops.map((h) => h.split(" (")[0]);
    const smallestHoop = (m: Meta) => hoopsFor(m)[0];
    const sizeLine = (tag: string, m: Meta) => `${tag}: ${m.width_mm.toFixed(0)} x ${m.height_mm.toFixed(0)} mm, ${m.stitches.toLocaleString("tr-TR")} dikiş, en küçük uygun Pfaff kasnağı ${smallestHoop(m)} mm`;
    const description = [
      DRAFT_NOTE, "", d.blurb, "",
      "Pfaff için VP3 formatında, sıkı ve katmanlı dikişle hazırlanmış özgün tasarım. Bir ürün altında iki ölçü gelir:",
      `- ${sizeLine("Küçük", S)}`, `- ${sizeLine("Büyük", L)}`, "",
      `İplik sırası: ${L.threads.map(([n]) => n).join(", ")} (${L.colors} renk).`, "",
      "Önizleme görselleri dikiş dosyasından üretilmiş bilgisayar simülasyonudur. Fiziksel kumaş provası henüz yapılmamıştır; kumaş, tela ve iplik türüne göre sıklık/çekme ayarı gerekebilir.",
    ].join("\n");
    let product = await db.product.findUnique({ where: { sku: d.sku }, select: { id: true } });
    if (!product) {
      const created = await createProduct({
        name: d.name, slug: d.slug, sku: d.sku, type: "DIGITAL_EMBROIDERY", shortDescription: d.blurb, description, highlights: ["Pfaff VP3 formatı", "İki ölçü: küçük ve büyük", "Sıkı, katmanlı saten ve dolgu"],
        usageAreas: d.usage, priceKurus: PLACEHOLDER_PRICE_KURUS, compareAtPriceKurus: null, shopierUrl: null, seoTitle: null, seoDescription: null,
        personalizable: false, isNew: true, isFeatured: false, categoryId: category.id, collectionIds: [collection.id], tagIds: [], licenseIds: license ? [license.id] : [], formatCodes: ["VP3"],
        variants: [], options: [], physicalInfo: null,
        embroidery: {
          designWidthMm: Math.round(L.width_mm), designHeightMm: Math.round(L.height_mm), stitchCount: L.stitches, colorCount: L.colors, colorChanges: L.color_changes,
          hoopSizeId: hoopId.get(smallestHoop(L)) ?? null, technique: "Sıkı saten ve katmanlı dolgu", fabricRecommendations: "Orta ağırlıkta pamuk, keten veya havlu kumaşı; uygun tela ile. Fiziksel prova yapılmamıştır.",
          downloadTerms: null, usageInstructions: ["Pfaff makinelerde VP3 dosyasını doğrudan açın.", "Küçük veya büyük ölçüyü kasnağınıza göre seçin."],
        },
      }, actor);
      product = { id: created.id };
      console.log("oluşturuldu", d.sku);
    } else {
      // Yeniden çalıştırma: açıklama ve nakış üst verisi güncel dikiş değerleriyle yenilenir (DRAFT/fiyat korunur).
      await db.product.update({ where: { sku: d.sku }, data: { description, shortDescription: d.blurb } });
      await db.embroideryMetadata.updateMany({
        where: { productId: product.id },
        data: { designWidthMm: Math.round(L.width_mm), designHeightMm: Math.round(L.height_mm), stitchCount: L.stitches, colorCount: L.colors, colorChanges: L.color_changes, hoopSizeId: hoopId.get(smallestHoop(L)) ?? null },
      });
      console.log("güncellendi", d.sku);
    }
    ids.push(product.id);

    for (const tag of ["S", "L"] as const) {
      const buf = await readFile(path.join(PACK_DIR, "VP3", `${d.key}_${tag}.vp3`));
      const r = await uploadEmbroideryFile(product.id, new File([buf], `${d.slug.replace("-vp3", "")}-${tag === "S" ? "kucuk" : "buyuk"}.vp3`), actor, tag === "S" ? "Küçük ölçü" : "Büyük ölçü");
      console.log(" vp3", tag, r.duplicate ? "zaten yüklü" : `v${r.version}`);
    }
    // Eski sürüm görselleri (aynı alt) silinip yenisi eklenir; böylece çift kayıt oluşmaz.
    const { deleteProductImage } = await import("../src/server/modules/admin-catalog/media");
    const old = await db.productImage.findMany({ where: { productId: product.id }, select: { id: true, alt: true } });
    const wanted = new Set<string>([`${d.name}: dikiş dosyasından üretilmiş iplik görünümlü önizleme`, `${d.name}: kumaş üzerinde dikiş simülasyonu`]);
    const have = new Set<string>();
    for (const o of old) if (wanted.has(o.alt)) await deleteProductImage(product.id, o.id, actor); else have.add(o.alt);
    const imgs: [string, string][] = [
      [`${d.key}_L_normal.png`, `${d.name}: dikiş dosyasından üretilmiş iplik görünümlü önizleme`],
      [`${d.key}_L_kumas.png`, `${d.name}: kumaş üzerinde dikiş simülasyonu`],
    ];
    for (const [file, alt] of imgs) {
      if (have.has(alt)) continue;
      await addProductImage(product.id, new File([await readFile(path.join(PACK_DIR, "Gorseller", file))], file, { type: "image/png" }), alt, actor);
      console.log(" görsel", file);
    }
  }
  await setCollectionProducts(collection.id, ids, actor);
  void updateProduct; // yayınlama bilinçli olarak yapılmaz (DRAFT kalır)
  console.log("bitti: 6 ürün DRAFT");
  await db.$disconnect();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
