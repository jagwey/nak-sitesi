# ARCHITECTURE.md — Mimari (Faz 3)

## Genel bakış

Tek bir **modüler monolit**: Next.js 16 (App Router, Turbopack, React 19) hem arayüzü hem API'yi sunar. Alan mantığı `src/server/modules/*` altında modüllere ayrılır; route dosyaları ince kalır. Veritabanı PostgreSQL 17 (Prisma 7 + `@prisma/adapter-pg`), dosyalar S3 uyumlu depolamadadır (geliştirmede MinIO), e-posta SMTP (geliştirmede Mailpit).

```
Tarayıcı ──► Next.js (App Router)
              ├─ src/app/**/page.tsx     arayüz (sunucu + istemci bileşenleri)
              ├─ src/app/admin/**        yönetim paneli (requireAdminPage)
              └─ src/app/api/**/route.ts HTTP API  ──► route() ──► modül servisi ──► Prisma ──► PostgreSQL
                                                                      └──► storage (S3) · notifications (SMTP) · payments (sağlayıcı)
```

## Katmanlar ve klasörler

| Yol | Sorumluluk |
|---|---|
| `src/app/**` | Sayfalar ve `api/**/route.ts` dosyaları. Route'larda iş mantığı yoktur: şema + izin tanımlar, servisi çağırır |
| `src/components/**` | Arayüz bileşenleri (`components/admin/*` yönetim kabuğu) |
| `src/server/{env,db,errors,http,rate-limit,audit,crypto}.ts` | Ortak altyapı |
| `src/server/modules/*` | Alan modülleri (aşağıda) |
| `src/lib`, `src/data`, `src/services` | Faz 1–2'den kalan istemci tarafı yardımcıları/örnek veri |
| `prisma/` | `schema.prisma`, migration'lar, `seed.ts`, `script-client.ts` (zamanlanmış işler için, `server-only` içermeyen istemci) |
| `scripts/` | `create-admin.ts`, `release-reservations.ts`, `search-reindex.ts` (+ ekran görüntüsü yardımcıları) |
| `tests/` | `unit/`, `integration/`, `fixtures/`, `setup/` (+ `e2e/` ajan E tarafından ekleniyor) |

Not: `src/proxy.ts` / `middleware.ts` **yoktur**. İstek korumaları (CSRF, hız sınırı, kimlik doğrulama, şema) uç bazında `route()` içinde uygulanır; yönetim sayfaları `requireAdminPage` ile korunur.

## Modül haritası

| Modül | İş |
|---|---|
| `auth` | Kayıt, giriş, oturum (`session.ts`), argon2id (`password.ts`), RBAC (`rbac.ts`), parola sıfırlama, e-posta doğrulama |
| `account` | Profil, adresler |
| `catalog` | Herkese açık ürün listeleme/detay/ilgili ürün (DTO'lar hassas alan sızdırmaz) |
| `search` | `SearchEngine` arayüzü (`search`, `suggest`), Postgres uygulaması, `buildSearchText`, `reindex` |
| `cart` | Sepet, fiyatlama (`pricing.ts`), toplamlar/kargo ücreti (`totals.ts`) |
| `coupons` | Kupon doğrulama ve atomik kullanım |
| `inventory` | Atomik stok rezervasyonu/tüketimi/serbest bırakma, süresi dolan rezervasyon |
| `orders` | Checkout (tek transaction), yaşam döngüsü (`lifecycle.ts`), sipariş numaraları, politika/yapılandırma (`config.ts`) |
| `payments` | `PaymentProvider` arayüzü, sağlayıcılar, webhook işleme (`webhook.ts`), iade |
| `shipping` | `ShippingProvider` arayüzü + elle kargo (`manual`), gönderi kayıtları |
| `downloads` | Hak (entitlement) kontrolü, imzalı bağlantı üretimi, indirme günlüğü |
| `storage` | S3 adaptörü: `private` ve `public` kovalar, imzalı URL, anahtar üretimi |
| `uploads` | Dosya doğrulama (görsel, nakış dosyası, ZIP) |
| `embroidery` | Nakış dosyası ayrıştırma (ölçü, dikiş, renk) |
| `favorites` | Favoriler |
| `custom-orders` | Kişiye özel talepler, teklif akışı |
| `notifications` | E-posta şablonları ve gönderim (`smtp` veya `console`) |
| `settings` | `SiteSettings` okuma/yazma: site, kargo, politika, yasal metinler |
| `admin-catalog` | Ürün, kategori, koleksiyon, etiket, stok, toplu işlem, CSV içe aktarma, medya, panel özeti |
| `admin-orders` | Admin sipariş işlemleri, müşteriler (dışa aktarma/anonimleştirme), indirme hakları, yönetici hesapları, denetim, manuel ödeme |

### Bağımlılıklar (koddaki göreli import'lardan)

```
admin-catalog  -> auth, inventory
admin-orders   -> auth, notifications, orders, payments, settings, shipping
auth           -> notifications
cart           -> coupons, inventory, orders
catalog        -> search
custom-orders  -> notifications, orders, payments, uploads
embroidery     -> uploads
orders         -> cart, coupons, inventory, notifications, payments
payments       -> inventory, notifications, orders, settings
settings       -> orders
shipping       -> cart, notifications, payments
(account, coupons, downloads, favorites, inventory, notifications, search, storage, uploads: dış modül bağımlılığı yok)
```

Kural: modüller birbirinin **servis fonksiyonlarını** çağırır, birbirinin Prisma tablolarına doğrudan yazmaz (stok/kupon/ödeme yazımı kendi modülünden geçer). `cart ↔ orders`, `orders ↔ payments` ve `settings ↔ orders` arasında karşılıklı import vardır (bkz. bilinen farklar); yeni modül eklerken döngü oluşturmayın.

## İstek akışı

1. İstek Next.js'e gelir ve `src/app/api/.../route.ts` dosyasındaki metoda gider.
2. `route({ auth, body, query, params, rateLimit?, maxBodyBytes?, csrf? }, handler)`:
   1. Hız sınırı (IP başına, DB destekli sabit pencere) → `429`.
   2. CSRF (güvensiz metotlarda `Origin` = `APP_URL` origin'i) → `403 CSRF`.
   3. Gövde okuma (JSON / multipart, boyut sınırı) → `413/415`.
   4. `z.strictObject` şemalarıyla doğrulama → `400 VALIDATION`.
   5. Kimlik: cookie `tb_session` → `Session.tokenHash` sorgusu → kullanıcı + izinler (her istekte DB'den) → `401/403`.
3. Handler servis fonksiyonunu çağırır; servis Prisma ile (gerekirse `$transaction`) çalışır.
4. Yanıt `cache-control: no-store` ile döner; `AppError` → `{ error: { code, message, details? } }`.
5. Yönetici değişiklikleri `writeAudit` ile `AuditLog`'a yazılır.

## Kimlik doğrulama ve oturum

- Cookie `tb_session`: opak 32 baytlık rastgele token; `httpOnly`, `sameSite=lax`, production'da `secure`.
- DB'de yalnızca sha256 özeti (`Session.tokenHash`) saklanır; çalınan veritabanı ile oturum üretilemez.
- Süre: 30 gün, kayar pencere (en fazla saatte bir yenilenir). Pasif (`DISABLED`) kullanıcılar reddedilir.
- Parola: argon2id (`@node-rs/argon2`); en az 10 karakter (yönetici için 12).
- Roller/izinler `Role`/`Permission` tablolarından, **her istekte** okunur; rol değişimi anında geçerlidir.
- Yönetim sayfaları: yetkisiz kullanıcıya `404` (admin alanı duyurulmaz), anonim kullanıcı `/giris?next=/admin`'e yönlenir.

## Depolama

| Kova | İçerik | Erişim |
|---|---|---|
| `public` (`S3_BUCKET_PUBLIC`) | Ürün/kategori/koleksiyon görselleri (webp) | Herkese açık okuma (`S3_PUBLIC_BASE_URL`) |
| `private` (`S3_BUCKET_PRIVATE`) | Ücretli dijital dosyalar, özel sipariş ekleri | **Asla herkese açık değil**; yalnızca kısa ömürlü imzalı URL (`ResponseContentDisposition: attachment`) |

Nesne anahtarları `newObjectKey` ile üretilir; indirme adı `safeDownloadName` ile temizlenir. Testlerde `__setStorageForTests` ile sahte depolama enjekte edilir.

## Arama

`SearchEngine` arayüzü (`search`, `suggest`) tek geçiş noktasıdır. Geçerli uygulama Postgres'tir: `Product.searchText` (Türkçe katlanmış metin) üzerinde `ILIKE` + `pg_trgm` GIN indeksi + `unaccent`. Meilisearch gibi bir motora geçmek için aynı arayüzü uygulayan yeni bir sınıf yeterlidir. İçerik değişince `npm run search:reindex` ile `searchText` yeniden üretilir.

## Ödeme ve kargo sağlayıcıları

- `PaymentProvider`: `initiate`, `verifyWebhook`, `parseEvent`, `refund`. Sağlayıcılar: `none` (varsayılan; ödeme toplanamaz, `awaiting_payment`), `simulated` (yalnızca geliştirme/test), `iyzico` ve `paytr` (henüz **StubProvider**: "yapılandırılmadı" hatası). Ayrıntı: `PAYMENT_INTEGRATION.md`.
- `ShippingProvider`: `quote()` (+ opsiyonel `createLabel`). Geçerli uygulama `manual`: kargo ücreti ayarlardan, takip numarasını yönetici elle girer.

## Zamanlanmış işler

`npm run jobs:release-reservations` → `expireReservations`: süresi dolan `ACTIVE` rezervasyonları `EXPIRED` yapar ve ödenmemiş siparişleri iptal eder. Birkaç dakikada bir cron ile çalıştırılır. `prisma/script-client.ts` kullanır ve `server-only` modül içe aktarmaz. Ayrıntı: `DEPLOYMENT.md`.

## Bilinen mimari farklar
- `src/proxy.ts`/`middleware.ts` yok; `next.config.ts` içinde güvenlik başlıkları (CSP, X-Frame-Options vb.) tanımlı değil (bkz. `SECURITY.md`).
- `REFUND_REVOKES_DOWNLOADS`, `DOWNLOAD_EXPIRY_DAYS`, `PAYMENT_SIMULATION_SECRET` `process.env` üzerinden okunur, `env.ts` doğrulamasından geçmez; çalışma zamanı politikası `SiteSettings.policy` içindedir, env yalnızca varsayılandır.
