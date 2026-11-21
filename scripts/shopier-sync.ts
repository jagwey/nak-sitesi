// Create or update Shopier products from the local catalog.
//   npm run shopier:sync           dry-run (no writes)
//   npm run shopier:sync -- --apply
// Imports no server-only modules.
import { createScriptClient } from "../prisma/script-client";
import { ShopierApi, ShopierApiError } from "../src/server/shopier/api";
import { SHOPIER_NOTE_PREFIX, createPayload, planShopierSync, shopierIdOf, shopierUrlOf, updatePayload, type SyncProduct } from "../src/server/shopier/catalog";

const DIGITAL = new Set(["DIGITAL_EMBROIDERY", "DIGITAL_PRINT", "BUNDLE"]);

async function main() {
  const apply = process.argv.includes("--apply");
  const token = process.env.SHOPIER_PAT?.trim() ?? "";
  const base = process.env.SHOPIER_API_BASE_URL?.trim() || "https://api.shopier.com/v1";
  const appUrl = process.env.APP_URL?.trim() || undefined;
  if (!token) {
    console.error("SHOPIER_PAT tanımlı değil. Shopier hesabında Kişisel Erişim Anahtarı oluşturun.");
    process.exitCode = 1;
    return;
  }
  const api = new ShopierApi(token, base);
  const db = createScriptClient();
  try {
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", isDemo: false },
      orderBy: { sku: "asc" },
      include: { images: { orderBy: { sort: "asc" }, take: 1 }, inventory: { select: { onHand: true } } },
    });
    const products: SyncProduct[] = rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      shortDescription: row.shortDescription,
      priceKurus: row.priceKurus,
      type: row.type,
      status: row.status,
      isDemo: row.isDemo,
      shopierProductId: row.shopierProductId,
      imageUrl: row.images[0]?.url ?? null,
      stock: row.inventory?.onHand ?? null,
    }));
    const remoteByNote = new Map<string, string>();
    try {
      const remote = await api.listProducts();
      for (const item of remote) {
        const note = typeof item.customNote === "string" ? item.customNote : "";
        const id = shopierIdOf(item);
        if (note.startsWith(SHOPIER_NOTE_PREFIX) && id) remoteByNote.set(note, id);
      }
    } catch (err) {
      if (err instanceof ShopierApiError && err.status === 403) {
        console.error("Ürün listesi 403 döndü. Yalnızca kayıtlı Shopier numarası olan ürünler güncellenir; yeniler oluşturulur.");
      } else {
        throw err;
      }
    }
    const plans = planShopierSync(products, remoteByNote, appUrl);
    let failed = 0;
    for (const plan of plans) {
      const label = `${plan.product.sku} ${plan.product.name}`;
      if (plan.action === "skip" || !plan.body) {
        console.log(`[atla] ${label} — ${plan.reason ?? "atlandı"}`);
        continue;
      }
      const kind = DIGITAL.has(plan.product.type) ? "dijital" : "fiziksel";
      if (!apply) {
        console.log(`[dry-run] ${label} → ${plan.action === "create" ? "oluştur" : "güncelle"} ${plan.body.price} TRY ${kind}${plan.shopierProductId ? ` id=${plan.shopierProductId}` : ""}`);
        continue;
      }
      try {
        const response = plan.action === "create"
          ? await api.request("POST", "/products", createPayload(plan.body))
          : await api.request("PUT", `/products/${encodeURIComponent(plan.shopierProductId!)}`, updatePayload(plan.body, !!plan.body.media));
        const id = shopierIdOf(response.data) ?? plan.shopierProductId;
        if (!id) throw new ShopierApiError("Shopier ürün numarası dönmedi.");
        const url = shopierUrlOf(response.data, id);
        await db.product.update({
          where: { id: plan.product.id },
          data: {
            shopierProductId: id,
            ...(plan.product.type === "DIGITAL_EMBROIDERY" ? { shopierUrl: url } : {}),
          },
        });
        console.log(`[uygula] ${label} → ${plan.action === "create" ? "oluşturuldu" : "güncellendi"} id=${id} ${plan.product.type === "DIGITAL_EMBROIDERY" ? url : "(ürün no kaydedildi)"}`);
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : "bilinmeyen hata";
        console.error(`[hata] ${label} — ${message}`);
      }
    }
    if (!apply) console.log("Yazmak için: npm run shopier:sync -- --apply");
    if (failed) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
