# API_DOCUMENTATION.md — HTTP API (Faz 3)

Tüm uçlar `src/app/api/**/route.ts` altındadır ve `src/server/http.ts` içindeki `route()` sarmalayıcısıyla tanımlanır. Bu belge koddan türetilmiştir.

## Ortak davranış (`route()`)

- **Şema zorunluluğu:** `body`, `query`, `params` şemaları `z.strictObject` olmak zorundadır (`assertStrict`). Bilinmeyen alan → `400 VALIDATION` (mass assignment engeli).
- **Kimlik doğrulama modları:** `none` | `optional` | `user` | `{ permission }` (yönetici izni).
- **CSRF:** Güvensiz metotlarda (POST/PUT/PATCH/DELETE) `Origin` başlığı `APP_URL` origin'i ile aynı olmalı; yoksa `Sec-Fetch-Site` yedek kontrolü. Aksi → `403 CSRF`. Yalnızca webhook ucu `csrf:false`.
- **Gövde:** Varsayılan en fazla 256 KB; JSON veya `multipart/form-data` (tekrarlanan dosya alanları dizi olur). Diğer içerik türü → `415`. Büyük → `413`.
- **Hız sınırı:** IP başına, veritabanı destekli sabit pencere. Aşılırsa `429 RATE_LIMITED` + `Retry-After`.
- **Yanıt:** Her zaman `cache-control: no-store`. Hata gövdesi: `{ "error": { "code", "message", "details?" } }`. `INTERNAL` yanıtında `debug` alanı yalnızca production dışında bulunur.
- Prisma `P2002` → `409 CONFLICT`; `P2025` → `404 NOT_FOUND`.

### Hata kodları

| Kod | HTTP | Anlam |
|---|---|---|
| `VALIDATION` | 400 | Geçersiz girdi (alan bazlı `details`) |
| `UNAUTHENTICATED` | 401 | Oturum yok/geçersiz |
| `FORBIDDEN` | 403 | İzin yok |
| `CSRF` | 403 | Origin doğrulaması başarısız |
| `NOT_FOUND` | 404 | Kayıt yok (sahiplik ihlali de 404 döner) |
| `CONFLICT` | 409 | Benzersizlik/durum çakışması |
| `OUT_OF_STOCK` | 409 | Stok yetersiz |
| `PAYLOAD_TOO_LARGE` | 413 | Gövde/dosya çok büyük |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | İçerik türü desteklenmiyor |
| `RATE_LIMITED` | 429 | Hız sınırı |
| `PAYMENT_FAILED` | 402 | Ödeme başlatma/işleme hatası |
| `INTERNAL` | 500 | Beklenmeyen hata |
| `SERVICE_UNAVAILABLE` | 503 | Sağlık kontrolü sırasında yapılandırma veya veritabanı hatası |

`GET /api/health` PostgreSQL erişimi varsa `200 { "ok": true }` döner.

Yükleme doğrulayıcıları ayrıca ZIP/dosya kodları döner: `ZIP_INVALID`, `ZIP_UNSAFE_PATH`, `ZIP_TOO_MANY_ENTRIES`, `ZIP_TOO_LARGE`, `ZIP_BOMB`, `ZIP_BAD_ENTRY_TYPE`.

### Yetkiler
`product:read|write`, `order:read|write`, `customer:read`, `customorder:read|write`, `coupon:write`, `settings:read|write`, `user:read|write`, `audit:read`, `file:write`.
Roller: SUPER_ADMIN (hepsi), ADMIN (`user:write` hariç hepsi), PRODUCT_MANAGER (`product:read/write`, `file:write`), ORDER_MANAGER (`order:read/write`, `customer:read/write`, `customorder:read/write`), MODERATOR (`customorder:read/write`), CUSTOMER (yok). İzinler her istekte veritabanından okunur.

---

## 1. Kimlik doğrulama

| Metot ve yol | Auth | İstek | Notlar / hız sınırı |
|---|---|---|---|
| `POST /api/auth/register` | none | `email`, `password` (min 10), `name?` | 10/saat/IP. Doğrulama e-postası gönderilir |
| `POST /api/auth/login` | none | `email`, `password` | 5/15 dk/e-posta, 30/15 dk/IP; 5 hatalı denemede hesap kilidi. `tb_session` cookie (httpOnly, sameSite=lax, production'da secure) |
| `POST /api/auth/logout` | optional | — | Oturumu siler |
| `GET /api/auth/me` | optional | — | Kullanıcı + roller + izinler veya `null` |
| `POST /api/auth/request-password-reset` | none | `email` | 3/saat/e-posta, 10/saat/IP. Hesap var olsun olmasın **aynı yanıt** |
| `POST /api/auth/reset-password` | none | `token`, `password` | 20/saat. Token tek kullanımlık |
| `POST /api/auth/verify-email` | none | `{ token }` | 30/saat/IP |
| `PUT /api/auth/verify-email` | user | — | Doğrulama e-postasını yeniden gönderir; 3/saat/kullanıcı |

## 2. Katalog (herkese açık)

| Metot ve yol | Auth | Parametreler | Notlar |
|---|---|---|---|
| `GET /api/products` | none | `q`, `tur`, `kategori`, `format`, `makine`, `kasnak`, `olcu`, `renkSayisi`, `kullanim`, `lisans`, `kisisellestirme`, `stok`, `minFiyat`, `maxFiyat`, `sirala`, `page`, `pageSize` (≤60), `facets` | 120/dk. Yalnızca `ACTIVE` ürünler |
| `GET /api/products/[slug]` | none | — | Ürün detayı; dijital dosya anahtarı **dönmez** |
| `GET /api/products/[slug]/related` | none | `limit` (≤12) | |
| `GET /api/search/suggest` | none | `q`, `limit` (≤12) | 120/dk |
| `GET /api/categories` | none | — | |
| `GET /api/collections` | none | — | |

Ürün görsellerinde `images[].url` tam boy önizlemeyi verir. Yükleme sırasında küçük önizleme üretilmişse `images[].thumbnailUrl` da döner.

Arama motoru: Postgres (ILIKE + `pg_trgm` + `unaccent`); `SearchEngine` arayüzü Meilisearch gibi bir motora geçiş noktasıdır.

## 3. Sepet ve ödeme akışı

Üç farklı gerçek nakış deseniyle %10, beş farklı desenle %20 otomatik indirim hesaplanır. Aynı desenin farklı biçimleri eşik hesabında tek desen sayılır. Kupon ve desen indirimi birlikte uygulanmaz, yüksek olan uygulanır. Sepet yanıtındaki `embroideryDiscountPercent` geçerli desen oranını gösterir. Üretimde ödeme sağlayıcısı `none` ise gerçek ürünlerde checkout `503 SERVICE_UNAVAILABLE` döndürür ve sepeti korur.

| Metot ve yol | Auth | İstek | Notlar |
|---|---|---|---|
| `GET /api/cart` | optional | — | 120/dk. Misafir sepeti tokenı cookie'dedir (yalnızca özeti DB'de) |
| `POST /api/cart/items` | optional | `productId`, `variantId?`, `format?`, `license?`, `color?`, `size?`, `quantity` (1–20), `personalization?` | 60/dk. **Fiyat alanı kabul edilmez**; fiyat katalogdan hesaplanır |
| `PATCH /api/cart/items/[id]` | optional | `{ quantity }` (0–20; 0 siler) | 60/dk |
| `DELETE /api/cart/items/[id]` | optional | — | 60/dk |
| `POST /api/cart/coupon` | optional | `{ code }` | 15/dk |
| `DELETE /api/cart/coupon` | optional | — | 15/dk |
| `POST /api/checkout` | optional | `email?`, `phone?`, `addressId?`, `shippingAddress?`, `customerNote?` | 10/10 dk. **Tek transaction:** sepet kilidi → katalogdan yeniden fiyatlama → atomik stok rezervasyonu → atomik kupon kullanımı → `Order` (PENDING_PAYMENT) + kalem snapshot'ları → `Payment` (PENDING) → sepeti boşalt. Üretimde demo ürün içeren sepet `400 VALIDATION` ile reddedilir ve sepet korunur. Hiçbir zaman PAID üretmez. `201` yanıtı: `{ order, payment: { provider, status, canSimulate, message, redirectUrl }, guestAccessToken }`. Misafir erişim tokenı **yalnızca bir kez** döner (DB'de özeti saklanır) |
| `GET /api/orders/[number]` | optional | `?guestToken=` | 30/10 dk. Sahibi (oturum) veya geçerli misafir tokenı; aksi hâlde `404` |
| `POST /api/orders/[number]/cancel` | user | — | 10/10 dk. Sahibi kendi **ödenmemiş** siparişini iptal eder; rezervasyon serbest kalır |

## 4. Ödeme

| Metot ve yol | Auth | Notlar |
|---|---|---|
| `POST /api/payments/webhook/[provider]` | none, `csrf:false` | 300/dk. Başlık `x-signature`; imza **ham gövde** üzerinden doğrulanır (ham gövde < 100.000 karakter). `provider` yolu `PAYMENT_PROVIDER` env'i ile eşleşmeli. Olay `WebhookEvent (provider, eventId)` benzersizliği ile idempotent işlenir. `payment.succeeded` siparişi PAID yapan **tek** yoldur. Tutar uyuşmazlığı reddedilir. İptal edilmiş siparişe gelen ödeme kaydedilir, teslim edilmez, `payment.after_cancel` denetim kaydı yazılır ve manuel iade gerekir |
| `POST /api/dev/payments/simulate` | none | 30/dk. Gövde: `orderNumber`, `outcome` (`success`\|`failure`), `guestToken?`. **Simülasyon kapalıysa `404`** (`NODE_ENV!=production` + `PAYMENT_SIMULATION_ENABLED=true` + `PAYMENT_PROVIDER=simulated` gerekir) |

## 5. İndirme

| Metot ve yol | Auth | Notlar |
|---|---|---|
| `POST /api/downloads/[entitlementId]/link` | user | İmzalı, `attachment` olarak işaretli kısa ömürlü URL (`DOWNLOAD_URL_TTL_SECONDS`, varsayılan 300 sn). Reddedilir: ödenmemiş/iptal sipariş, `REFUNDED` veya iptal edilmiş hak, süresi dolmuş hak, `remaining <= 0`. Kredi atomik düşer; imzalama başarısızsa iade edilir. `DownloadLog` yazılır (IP özeti) |

## 6. Hesabım (`/api/me/*`, `user`)

| Metot ve yol | İstek / not |
|---|---|
| `GET /api/me/profile`, `PATCH /api/me/profile` | `name`, `phone` |
| `GET /api/me/addresses`, `POST /api/me/addresses` | Adres alanları (`fullName`, `phone`, `line1`, `city`, `district`, …) |
| `GET/PATCH/DELETE /api/me/addresses/[id]` | Yalnızca sahibi (başkasının kaydı 404) |
| `GET /api/me/orders`, `GET /api/me/orders/[number]` | Kendi siparişleri |
| `GET /api/me/downloads` | İndirme hakları. Aynı formatta ek boyu bulunan ürünlerde her dosya ayrı bir hak olarak görünür. `fileName` ve isteğe bağlı `downloadLabel` döner. |
| `GET /api/me/custom-orders`, `GET /api/me/custom-orders/[id]` | Kendi özel talepleri |
| `POST /api/me/custom-orders/[id]` | `{ decision: "ACCEPT" \| "REJECT" }` — teklifi kabul/ret |
| `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites?productId=` | Favori listesi |
| `GET /api/me/favorite-products` | `ids`; 90/dk |

## 7. Kişiye özel talep (herkese açık)

| Metot ve yol | Auth | İstek | Notlar |
|---|---|---|---|
| `POST /api/custom-orders` | optional | `multipart/form-data`, en fazla 45 MB: `name`, `email`, `phone?`, `productType` (3 Türkçe seçenekten biri), `text`, `size?`, `threadColor?`, `machineModel?`, `format?`, `notes?`, `initials?`, `deadline` (`YYYY-MM-DD`)`?`, `budgetTl?`, `consent` (KVKK onayı **zorunlu**), `website` (bal küpü: dolu olursa sessizce reddedilir), `files` (en fazla 5 görsel) | Dosyalar private bucket'a yazılır |
| `GET /api/custom-orders/quote/[token]` | none | — | Misafir teklif bağlantısı; token DB'de yalnızca özet olarak saklanır |
| `POST /api/custom-orders/quote/[token]` | none | `{ decision: "ACCEPT" \| "REJECT" }` | Süresi geçmiş teklif (`quoteValidUntil`) kabul edilmez |

---

## 8. Yönetim API'si (`/api/admin/*`)

Tüm ucların izni aşağıda belirtilmiştir. Her **değiştiren** admin işlemi `AuditLog` yazar. Admin uçlarının çoğunda ayrı bir hız sınırı yoktur; genel `route()` korumaları (CSRF, strict şema, gövde sınırı) geçerlidir.

### Yönetici hesapları, denetim, panel
| Yol | İzin | Not |
|---|---|---|
| `GET /api/admin/admins` | `user:read` | Yönetici listesi |
| `POST /api/admin/admins` | `user:write` + SUPER_ADMIN | `{ email, name?, role }`; ADMIN, PRODUCT_MANAGER, ORDER_MANAGER veya MODERATOR. E-posta teslim edilemezse yanıta bir saatlik `inviteUrl` eklenir. Yanıt önbelleğe alınmaz. |
| `PATCH /api/admin/admins/[id]` | `user:write` | `{ role?, status? (ACTIVE\|DISABLED) }` |
| `GET /api/admin/audit` | `audit:read` | `action`, `entity`, `actor`, `from`, `to` (YYYY-MM-DD), `page`, `pageSize` (≤100) |
| `GET /api/admin/dashboard` | herhangi bir admin izni | Özet sayılar |

### Ürünler
| Yol | İzin | Not |
|---|---|---|
| `GET /api/admin/products` | `product:read` | Liste/filtre |
| `POST /api/admin/products` | `product:write` | Yeni ürün **DRAFT** başlar |
| `GET/PATCH /api/admin/products/[id]` | read / write | |
| `DELETE /api/admin/products/[id]?mode=archive\|hard` | `product:write` | Siparişi olan ürün sert silinemez; arşivlenir |
| `GET/POST /api/admin/products/[id]/files` | `file:write` | Özel depoya nakış dosyası yükler. POST multipart `file` ve isteğe bağlı `downloadLabel` (en fazla 40 karakter) kabul eder. Aynı format ve adla farklı içerik yüklenirse yeni sürüm oluşturulur. En fazla 21 MB istek. |
| `POST /api/admin/products/[id]/images` | `product:write` | `file` + `alt` (≥3 karakter); 10 MB; webp'ye dönüştürülür |
| `PUT /api/admin/products/[id]/images` | `product:write` | `{ ids }` — sıralama; ilk görsel kapak |
| `PATCH/DELETE /api/admin/products/[id]/images/[imageId]` | `product:write` | alt metni / silme |

Yayına alma (`ACTIVE`) koşulları: fiyat > 0, en az 1 görsel, dijital desen için en az bir güncel ve aktif dosya; sağlanmazsa `400 VALIDATION` ve eksiklerin listesi.

Gerçek dijital nakış ürünlerinde `shopierUrl` isteğe bağlıdır. HTTPS Shopier ürün adresi sayısal ürün kimliğiyle standart biçime dönüştürülür. `PATCH` ile `null` gönderilerek bağlantı kaldırılır. Bağlantısı olan ürün yerel sepete eklenemez.

### Taksonomi, toplu işlem, içe aktarma
| Yol | İzin | Not |
|---|---|---|
| `GET /api/admin/categories`; `POST`; `PUT/DELETE /[id]` | read / `product:write` | Alanlar: `name`, `description`, `image`, `imageAlt`, `seoTitle`, `seoDescription`, `featuredType` (`digital`\|`physical`\|`all`), `sort`, `active`, `parentId`, `slug` |
| `GET/POST /api/admin/collections`; `GET/PUT/DELETE /[id]`; `PUT /[id]/products` | read / `product:write` | `PUT .../products` gövdesi `{ productIds }`, dizi sırası görüntüleme sırasıdır |
| `GET/POST /api/admin/tags`; `PUT/DELETE /[id]` | read / `product:write` | |
| `POST /api/admin/bulk` | `product:write` | `action` ∈ price, category, publish, unpublish, archive; `productIds` (1–200); price için `mode` (set, increase_percent, decrease_percent), `amountKurus`/`percent`, `roundToLira`; category için `categoryId` |
| `GET /api/admin/import/template` (şablon) | `product:write` | CSV şablonu indirir |
| `POST /api/admin/import/preview`, `POST /api/admin/import/commit` | `product:write` | `{ csv, mode? (all_or_nothing\|valid_only) }`, 2,2 MB. Başlıklar: `sku, ad, tur, fiyat, karsilastirma_fiyati, kategori, kisa_aciklama, aciklama, etiketler, formatlar, stok, genislik_mm, yukseklik_mm, dikis_sayisi, renk_sayisi`; en fazla 1000 satır; ayraç `;` veya `,`; fiyat TL → kuruş; içe aktarılan ürünler DRAFT |
| `GET /api/admin/inventory` | `product:read` | `q`, `low=1`, `page`, `pageSize` |
| `PUT /api/admin/inventory` | `product:write` | `productId` veya `variantId`, `onHand`, `lowStockThreshold?`, `reason` (≥3 karakter) |
| `GET /api/admin/files`, `GET /api/admin/files/[id]`, `DELETE /api/admin/files/[id]` | `file:write` | `GET /[id]` 120 sn'lik imzalı URL üretir ve denetim kaydı yazar |
| `POST /api/admin/uploads` | `file:write` | `kind` ∈ category, collection; görsel yükleme (10 MB) |

### Siparişler ve müşteriler
| Yol | İzin | Not |
|---|---|---|
| `GET /api/admin/orders`, `GET /api/admin/orders/[id]` | `order:read` | |
| `POST /api/admin/orders/[id]/status` | `order:write` | `status` ∈ PROCESSING, IN_PRODUCTION, SHIPPED, COMPLETED |
| `POST /api/admin/orders/[id]/cancel` | `order:write` | |
| `POST /api/admin/orders/[id]/refund` | `order:write` | Sağlayıcı iadesi + `REFUNDED`; politika gereği indirme hakları iptal edilir |
| `POST /api/admin/orders/[id]/manual-payment` | `order:write` + rol SUPER_ADMIN veya ORDER_MANAGER | `{ reference }` (5–200 karakter); havale/EFT gibi elle onay, denetim kaydı |
| `POST /api/admin/orders/[id]/shipments` | `order:write` | `carrier?`, `trackingNumber?`, `estimatedPrepDays?`, `markShipped` |
| `POST /api/admin/orders/[id]/shipments/[sid]` | `order:write` | `status` ∈ PREPARING, SHIPPED, DELIVERED, RETURNED |
| `GET /api/admin/downloads` | `order:read` | İndirme kayıtları/hakları |
| `POST /api/admin/downloads/[id]/reset` | `order:write` | Hakkı sıfırlar |
| `POST /api/admin/downloads/[id]/revoke` | `order:write` | `{ reason }` (3–200) |
| `GET /api/admin/customers`, `GET /api/admin/customers/[id]` | `customer:read` | |
| `GET /api/admin/customers/[id]/export` | `customer:read` | KVKK veri dışa aktarımı |
| `POST /api/admin/customers/[id]/anonymize` | `customer:read` yetkisi + rol SUPER_ADMIN veya ADMIN | `{ confirm: true }`; geri alınamaz |
| `POST /api/admin/customers/[id]/status`, `.../resend-verification` | `order:write` | Hesabı etkin/pasif yapma, doğrulama e-postası |

### Özel talepler, kuponlar, içerik, ayarlar
| Yol | İzin | Not |
|---|---|---|
| `GET /api/admin/custom-orders`, `GET /api/admin/custom-orders/[id]` | `customorder:read` | |
| `POST /api/admin/custom-orders/[id]/quote` | `customorder:write` | `priceKurus` (100–100.000.000), `prepDays` (1–365), `validUntil` (tarih), `note`; müşteriye `quote_sent` e-postası |
| `POST /api/admin/custom-orders/[id]/status` | `customorder:write` | `status` ∈ REVIEWING, REJECTED, CANCELLED |
| `GET/POST /api/admin/coupons`; `PATCH/DELETE /[id]` | `coupon:write` | Gövde: `code` (3–40), `type` (PERCENT\|FIXED), `value` (PERCENT 1–100; FIXED kuruş), `minSubtotalKurus`, `usageLimit?`, `perCustomerLimit?`, `startsAt?`, `endsAt?`, `active`, `productIds?`, `categoryIds?`. `DELETE` kuponu pasifleştirir |
| `GET /api/admin/content` | `settings:read` | Yasal metinler |
| `PUT /api/admin/content` | `settings:write` | `{ key, body }`; `key` ∈ kvkk, mesafeli-satis, iade-iptal, gizlilik, cerez; en fazla 40.000 karakter |
| `GET /api/admin/settings` | `settings:read` | |
| `PUT /api/admin/settings` | `settings:write` | `{ site?, shipping?, policy? }`; `site` mağaza adı, işletme sahibi, logo adresi, iletişim ve vitrin alanlarını içerir. Logo `/images/` veya yapılandırılmış herkese açık görsel kovasından gelir. |

---

## Örnek hata yanıtı

```json
{ "error": { "code": "VALIDATION", "message": "Geçersiz istek.", "details": { "fieldErrors": { "quantity": ["..."] } } } }
```

## Notlar ve bilinen farklar
- JSON yanıtlarını `route()` serileştirir. Özel durum kodları ve başlıklar için işleyici `json()` yardımcısını kullanır. CSV çıktısı kendi içerik türünü korur.
- Admin müşteri durumu ve doğrulama yeniden gönderme uçları `order:write` ister; müşteri sayfası `customer:read` ile görüntülenir.
- Yetki hata mesajları Türkçedir.
