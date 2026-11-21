// Pure Shopier catalog mapping. No I/O and no server-only import.

export const SHOPIER_NOTE_PREFIX = "nakis:";

const DIGITAL_TYPES = new Set(["DIGITAL_EMBROIDERY", "DIGITAL_PRINT", "BUNDLE"]);

export interface SyncProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  priceKurus: number;
  type: string;
  status: string;
  isDemo: boolean;
  shopierProductId: string | null;
  imageUrl: string | null;
  stock: number | null;
}

export interface ShopierProductBody {
  title: string;
  description: string;
  type: "digital" | "physical";
  customNote: string;
  shippingPayer: "sellerPays";
  price: string;
  media?: { type: "image"; url: string; placement: number }[];
  stockQuantity?: number;
}

export function kurusToShopierPrice(kurus: number): string {
  const abs = Math.abs(Math.trunc(kurus));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function shopierTitle(name: string): string {
  const cleaned = name.replace(/&/g, " ve ").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(cleaned).slice(0, 80).join("");
}

export function shopierDescription(product: Pick<SyncProduct, "shortDescription" | "description">): string {
  return [product.shortDescription, product.description].map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ").slice(0, 4000);
}

export function absoluteHttpsImage(url: string | null, appUrl: string | undefined): string | null {
  if (!url) return null;
  try {
    if (url.startsWith("/") && !appUrl) return null;
    const abs = new URL(url, appUrl || "https://example.invalid");
    if (abs.protocol !== "https:") return null;
    return abs.href;
  } catch {
    return null;
  }
}

export function buildShopierProduct(product: SyncProduct, imageUrl: string | null): ShopierProductBody | null {
  const title = shopierTitle(product.name);
  if (!title || product.priceKurus <= 0) return null;
  const digital = DIGITAL_TYPES.has(product.type);
  const body: ShopierProductBody = {
    title,
    description: shopierDescription(product),
    type: digital ? "digital" : "physical",
    customNote: `${SHOPIER_NOTE_PREFIX}${product.sku}`.slice(0, 200),
    shippingPayer: "sellerPays",
    price: kurusToShopierPrice(product.priceKurus),
  };
  if (imageUrl) body.media = [{ type: "image", url: imageUrl, placement: 1 }];
  if (digital) body.stockQuantity = 999;
  else if (product.stock !== null && product.stock >= 0) body.stockQuantity = product.stock;
  return body;
}

export function createPayload(body: ShopierProductBody): Record<string, unknown> {
  return {
    title: body.title,
    description: body.description,
    type: body.type,
    customNote: body.customNote,
    shippingPayer: body.shippingPayer,
    media: body.media,
    ...(body.stockQuantity !== undefined ? { stockQuantity: body.stockQuantity } : {}),
    priceData: { currency: "TRY", price: body.price },
  };
}

export function updatePayload(body: ShopierProductBody, includeMedia: boolean): Record<string, unknown> {
  return {
    title: body.title,
    description: body.description,
    type: body.type,
    customNote: body.customNote,
    shippingPayer: body.shippingPayer,
    ...(includeMedia && body.media ? { media: body.media } : {}),
    priceData: { price: body.price },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function shopierList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  for (const key of ["data", "products", "items", "results"]) {
    if (Array.isArray(data[key])) return data[key].filter(isRecord);
  }
  return [];
}

export function shopierIdOf(data: unknown): string | null {
  const record = isRecord(data) && isRecord(data.data) ? data.data : data;
  if (!isRecord(record)) return null;
  const id = record.id ?? record.productId;
  if (typeof id === "number" && Number.isInteger(id) && id > 0) return String(id);
  if (typeof id === "string" && /^[1-9]\d{0,19}$/.test(id)) return id;
  return null;
}

/** Canonical product URL accepted by the admin form (`https://www.shopier.com/{id}`). */
export function shopierUrlOf(data: unknown, id: string): string {
  const record = isRecord(data) && isRecord(data.data) ? data.data : data;
  if (isRecord(record)) {
    for (const key of ["url", "productUrl", "link"]) {
      const value = record[key];
      if (typeof value !== "string") continue;
      const url = URL.parse(value);
      if (!url || url.protocol !== "https:" || !["shopier.com", "www.shopier.com"].includes(url.host)) continue;
      const fromPath = url.pathname.match(/^\/(?:s\/product\/)?([1-9]\d{0,19})\/?$/)?.[1];
      const fromQuery = url.pathname === "/ShowProductNew/products.php" ? url.searchParams.get("id") : null;
      const found = fromPath ?? (fromQuery && /^[1-9]\d{0,19}$/.test(fromQuery) ? fromQuery : null);
      if (found) return `https://www.shopier.com/${found}`;
    }
  }
  return `https://www.shopier.com/${id}`;
}

export interface SyncPlan {
  product: SyncProduct;
  action: "create" | "update" | "skip";
  shopierProductId: string | null;
  reason?: string;
  body: ShopierProductBody | null;
}

export function planShopierSync(products: SyncProduct[], remoteByNote: Map<string, string>, appUrl: string | undefined): SyncPlan[] {
  return products.map((product) => {
    if (product.isDemo || product.status !== "ACTIVE") return { product, action: "skip", shopierProductId: product.shopierProductId, reason: "yayında değil", body: null };
    const image = absoluteHttpsImage(product.imageUrl, appUrl);
    const body = buildShopierProduct(product, image);
    if (!body) return { product, action: "skip", shopierProductId: product.shopierProductId, reason: "başlık veya fiyat uygun değil", body: null };
    const remoteId = product.shopierProductId || remoteByNote.get(`${SHOPIER_NOTE_PREFIX}${product.sku}`) || null;
    if (!remoteId && !image) return { product, action: "skip", shopierProductId: null, reason: "herkese açık https görsel yok", body: null };
    return { product, action: remoteId ? "update" : "create", shopierProductId: remoteId, body };
  });
}
