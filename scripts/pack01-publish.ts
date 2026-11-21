// Paket 01 yayınlama: sahip onayından sonra 6 PK01 ürününü ACTIVE yapar, açıklamadaki TASLAK satırını siler,
// kategori ve koleksiyonu etkinleştirir. Servis fonksiyonları kullanılır (writeAudit + yayın kontrolleri çalışır).
// Çalıştırma: npx tsx --conditions=react-server --env-file=.env scripts/pack01-publish.ts
const SKUS = ["PK01-LALE", "PK01-KARANFIL", "PK01-NAR", "PK01-HATAYI", "PK01-BORDUR", "PK01-MONOGRAM"];

async function main() {
  const { db } = await import("../src/server/db");
  const { updateProduct } = await import("../src/server/modules/admin-catalog/products");
  const { updateCategory, updateCollection } = await import("../src/server/modules/admin-catalog/taxonomy");

  const admin = await db.user.findFirst({ where: { roles: { some: { role: { code: "SUPER_ADMIN" } } } }, select: { id: true } });
  if (!admin) throw new Error("SUPER_ADMIN yok: önce `npm run admin:create`.");
  const actor = { id: admin.id, ip: null };

  for (const sku of SKUS) {
    const p = await db.product.findUnique({ where: { sku }, select: { id: true, status: true, description: true } });
    if (!p) throw new Error(`${sku} yok: önce pack01-upload.ts`);
    const description = p.description.replace(/^\[TASLAK[^\n]*\]\n\n?/, "");
    await updateProduct(p.id, { status: "ACTIVE", description }, actor);
    console.log("yayında", sku);
  }

  const cat = await db.category.findUniqueOrThrow({ where: { slug: "geleneksel-turk-motifleri" } });
  await updateCategory(cat.id, { name: cat.name, description: cat.description, image: cat.image, imageAlt: cat.imageAlt, featuredType: cat.featuredType as "digital" | "physical" | "all" | null, parentId: cat.parentId, sort: cat.sort, active: true }, actor);
  const col = await db.collection.findUniqueOrThrow({ where: { slug: "geleneksel-turk-motifleri-paketi" } });
  await updateCollection(col.id, { title: col.title, subtitle: col.subtitle, image: col.image, imageAlt: col.imageAlt, sort: col.sort, active: true }, actor);
  console.log("kategori ve koleksiyon etkin");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
