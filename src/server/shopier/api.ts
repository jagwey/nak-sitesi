// Minimal Shopier REST client for the sync script. PAT is never logged.
import { shopierList } from "./catalog";

const DEFAULT_BASE = "https://api.shopier.com/v1";

export class ShopierApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ShopierApiError";
  }
}

export interface ShopierPage {
  data: unknown;
  totalPages?: number;
}

function loopback(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export class ShopierApi {
  private readonly baseUrl: string;
  constructor(private readonly token: string, baseUrl = DEFAULT_BASE) {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback(url.hostname))) {
      throw new ShopierApiError("SHOPIER_API_BASE_URL https olmalıdır.");
    }
    if (!token || !/^[\x21-\x7E]+$/.test(token)) throw new ShopierApiError("SHOPIER_PAT tanımlı değil veya geçersiz karakter içeriyor.");
    this.baseUrl = url.toString().replace(/\/+$/, "");
  }

  private redact(message: string): string {
    return message.split(this.token).join("[gizlendi]");
  }

  async request(method: "GET" | "POST" | "PUT", path: string, body?: unknown, query?: Record<string, string>): Promise<ShopierPage> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.token}`,
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
      text = await response.text();
    } catch (err) {
      throw new ShopierApiError(this.redact(`Shopier API'ye ulaşılamadı: ${err instanceof Error ? err.message : "bağlantı hatası"}`));
    }
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text.slice(0, 500);
      }
    }
    if (!response.ok) {
      const detail = typeof data === "string" ? data : JSON.stringify(data).slice(0, 500);
      throw new ShopierApiError(this.redact(`Shopier API hatası (${response.status}). ${detail}`), response.status);
    }
    const total = Number(response.headers.get("Shopier-Pagination-Total-Pages"));
    return { data, totalPages: Number.isFinite(total) ? total : undefined };
  }

  async listProducts(): Promise<Record<string, unknown>[]> {
    const all: Record<string, unknown>[] = [];
    for (let page = 1; page <= 40; page += 1) {
      const res = await this.request("GET", "/products", undefined, { page: String(page), limit: "50" });
      const batch = shopierList(res.data);
      all.push(...batch);
      if (batch.length < 50 || (res.totalPages !== undefined && page >= res.totalPages)) break;
    }
    return all;
  }
}
