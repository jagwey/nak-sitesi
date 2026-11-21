// Register the Shopier REST webhook for paid orders.
//   npm run shopier:webhook
// Prints the subscription id and whether a token came back. The token is never printed.
import { ShopierApi } from "../src/server/shopier/api";

const WEBHOOK_URL = "https://nakis-vitrin.nakis-sitesi.workers.dev/api/shopier/webhook";
const EVENT = "order.created";

function subscriptionView(data: unknown): { id: string | null; tokenReturned: boolean } {
  const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const nested = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as Record<string, unknown> : record;
  const id = nested.id;
  const token = nested.token ?? nested.secret;
  return {
    id: typeof id === "string" || typeof id === "number" ? String(id) : null,
    tokenReturned: typeof token === "string" && token.length > 0,
  };
}

async function main() {
  const token = process.env.SHOPIER_PAT?.trim() ?? "";
  const base = process.env.SHOPIER_API_BASE_URL?.trim() || "https://api.shopier.com/v1";
  if (!token) {
    console.error("SHOPIER_PAT tanımlı değil. Shopier hesabında Kişisel Erişim Anahtarı oluşturun.");
    process.exitCode = 1;
    return;
  }
  const api = new ShopierApi(token, base);
  const response = await api.request("POST", "/webhooks", { event: EVENT, url: WEBHOOK_URL });
  const view = subscriptionView(response.data);
  console.log(`event=${EVENT}`);
  console.log(`url=${WEBHOOK_URL}`);
  console.log(`id=${view.id ?? "(yok)"}`);
  console.log(`token döndü: ${view.tokenReturned ? "evet" : "hayır"}`);
  if (view.tokenReturned) {
    console.log("SHOPIER_WEBHOOK_SECRET olarak create yanıtındaki token değerini .env.production dosyasına yazın. Bu betik değeri yazdırmaz. Token yalnızca bu ilk yanıtta gelir.");
  } else {
    console.log("Yanıtta token yok. Abonelik daha önce oluşturulduysa token bir daha gösterilmez; yenisini kaydetmek için Shopier panelinden aboneliği silip bu betiği tekrar çalıştırın.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
