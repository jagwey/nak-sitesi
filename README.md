# Nakış Sitesi — Nakış E-Ticaret Platformu

Dijital nakış desenleri ve el yapımı/kişiye özel ürünler satan e-ticaret sitesi ve yönetim paneli. Vitrin, sepet/ödeme akışı, hesabım, kişiye özel sipariş talepleri ve günlük işin yönetildiği admin paneli aynı projede çalışır.

## Teknoloji

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Prisma 7 + PostgreSQL 17 · zod 4 · argon2id · S3 uyumlu depolama (MinIO) · nodemailer (Mailpit) · sharp · Vitest + Playwright.

## Hızlı başlangıç

Gereksinimler: Node.js, Docker.

```bash
npm install
cp .env.example .env            # değerleri doldurun (SESSION_SECRET, parolalar...)
npm run db:up                   # Postgres + MinIO + Mailpit (docker compose)
npm run db:migrate              # migration'ları uygula (geliştirme)
npm run db:seed                 # roller/izinler, formatlar, lisanslar + demo ürünler
npm run search:reindex          # arama metnini üret
npm run admin:create            # ilk SUPER_ADMIN (ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD)
npm run dev                     # http://localhost:3000
```

Yardımcı adresler: Mailpit http://localhost:8025 · MinIO konsol http://localhost:9001. Yönetim paneli: `/admin` (giriş sonrası).

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (Turbopack) |
| `npm run build` / `npm run start` | Üretim derlemesi / çalıştırma |
| `npm run lint` | Tip kontrolü (`tsc --noEmit`) |
| `npm test` | Arama betik testi + tüm Vitest (birim + entegrasyon; test veritabanı gerekir) |
| `npm run test:unit` / `test:integration` | Vitest alt kümeleri |
| `npm run test:e2e` | Playwright E2E (`tests/e2e`; ajan E tarafından ekleniyor) |
| `npm run db:up` | `docker compose up -d` |
| `npm run db:migrate` | `prisma migrate dev` (yalnızca geliştirme) |
| `npm run db:deploy` | `prisma migrate deploy` (canlı) |
| `npm run db:seed` | Referans veri + demo ürünler |
| `npm run db:reset` | Veritabanını **siler** ve yeniden kurar (yalnızca geliştirme) |
| `npm run admin:create` | SUPER_ADMIN oluştur/güncelle |
| `npm run search:reindex` | Ürün arama metnini yeniden üret |
| `npm run jobs:release-reservations` | Süresi dolan stok rezervasyonlarını serbest bırak (cron) |

## Klasör haritası

```
src/app/            sayfalar (Türkçe yollar: urun, sepet, odeme, hesabim, kisiye-ozel, giris, kayit, ...)
src/app/admin/      yönetim paneli sayfaları
src/app/api/        HTTP API (route() ile)
src/components/     arayüz bileşenleri (components/admin: panel kabuğu)
src/server/         altyapı (env, db, http, rate-limit, audit, errors, crypto)
src/server/modules/ alan modülleri (auth, catalog, cart, orders, payments, downloads, storage, ...)
prisma/             schema.prisma, migrations, seed.ts, script-client.ts
scripts/            admin:create, rezervasyon işi, arama yeniden dizinleme
tests/              unit, integration, fixtures, setup (+ e2e)
public/brand/       (git dışı) ileride eklenecek logo dosyaları
logo/               (git dışı) yerel orijinal logo (silinmez/değiştirilmez)
docker/             Postgres ilk kurulum betiği
```

## Belgeler

| Belge | İçerik |
|---|---|
| `ADMIN_GUIDE.md` | Mağaza yönetimi için panel kullanım kılavuzu (teknik olmayan) |
| `ARCHITECTURE.md` | Mimari, modül haritası, istek akışı |
| `DATABASE_SCHEMA.md` | Veritabanı modelleri ve kısıtlar |
| `API_DOCUMENTATION.md` | Tüm API uçları |
| `SECURITY.md` | Tehdit/önlem tablosu ve bilinen eksikler |
| `PAYMENT_INTEGRATION.md` | Ödeme sağlayıcı arayüzü ve iyzico/PayTR ekleme |
| `DEPLOYMENT.md` | Canlıya alma kontrol listesi |
| `BACKEND_REQUIREMENTS.md` | Gereksinimler ve gerçekleşme durumu |
| `TEST_REPORT.md` | Test sonuçları |
| `PROJECT_STATUS.md` | Güncel durum, eksikler, müşteriden beklenenler |
| `AGENTS.md` | Geliştirici/ajan kuralları (marka, tasarım, veri, backend) |
| `DESIGN_SYSTEM.md`, `DESIGN_REVIEW.md` | Tasarım sistemi ve inceleme |
| `PROGRESS.md`, `YAPILACAKLAR.md` | İlerleme günlüğü ve açık işler |

## Dürüst durum

- **Demo ürünler:** Katalogdaki ürünler `isDemo` işaretli örnek veridir; gerçek ürün, fiyat veya stok değildir. Canlıdan önce kaldırılmalıdır.
- **Gerçek ödeme yok:** Varsayılan sağlayıcı `none`'dır; sipariş "ödeme bekleniyor" kalır. iyzico/PayTR henüz bağlı değildir (sözleşme/anahtarlar gerekir). Simülasyon yalnızca geliştirmede çalışır.
- **Gerçek nakış dosyası yok:** Yüklenmiş gerçek VP3/PES/DST dosyası yoktur; sahip olunmayan format sunulmaz. Dosyalar panelden yüklenir.
- **Yasal metinler, iletişim bilgileri, alan adı, SMTP:** Müşteriden gelmeyi bekliyor (bkz. `PROJECT_STATUS.md`).
- **Güvenlik başlıkları** henüz tanımlı değil (bkz. `SECURITY.md`).
