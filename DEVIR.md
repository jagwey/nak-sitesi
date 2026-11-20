# DEVİR — Codex / yeni ajan için başlangıç noktası (2026-11-20)

Bu dosyayı oku, ardından `YAPILACAKLAR.md` (yapılan/yapılacak listesi) ve `PROGRESS.md` (adım adım ayrıntı) dosyalarına bak. Bağlayıcı kurallar `AGENTS.md` içinde: logo değişmez, yalnız iki font, sabit renk paleti, uydurma format/fiyat/yasal metin yok, fiyatlar `priceKurus` (tamsayı kuruş).

## Proje
Nakış Sitesi nakış e-ticaret sitesi. Fiziksel ürünler, dijital nakış dosyaları (VP3/PES…) ve kişiye özel sipariş satıyor.
- **Uygulama:** Next.js (sürümü eğitim verisinden farklı, `node_modules/next/dist/docs/` oku), Tailwind, TypeScript.
- **Veri:** Prisma 7 + PostgreSQL 17 (docker, port 5433; `nakis` ve `nakis_test` veritabanları), pg_trgm/unaccent arama.
- **Dosya ve e-posta:** MinIO özel depolama, Mailpit e-posta.
- **Test:** vitest (entegrasyon), Playwright.

## Kurulum (sıfırdan, Windows)
Gerekenler: Node 20+, Docker Desktop, Git.
```bash
git clone https://github.com/jagwey/nak-sitesi.git && cd nak-sitesi
cp .env.example .env
npm install
npm run db:up
npm run db:deploy
npm run db:seed
npm run admin:create
npm run search:reindex
npm run dev
```
- **`npm install`:** `postinstall` adımında `prisma generate` kendiliğinden çalışır.
- **`npm run db:up`:** Postgres (5433), MinIO (9000) ve Mailpit (1025 ve 8025) servislerini docker ile açar.
- **`npm run db:seed`:** demo ürünleri yükler (`isDemo`).
- **`npm run admin:create`:** ilk yönetici hesabını oluşturur. Parolayı kullanıcı kendisi girer.
- **`npm run dev`:** siteyi http://localhost:3000, yönetim panelini /admin adresinde açar.

`.env` doldurma: docker-compose.yml'deki yerel geliştirme değerleri `.env`'e yazılır.
- `DATABASE_URL`, `DATABASE_URL_TEST`: kullanıcı `nakis`, parola compose dosyasındaki `POSTGRES_PASSWORD`, port 5433, veritabanları `nakis` ve `nakis_test`.
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`: compose dosyasındaki `MINIO_ROOT_USER` ve `MINIO_ROOT_PASSWORD`.
- `SESSION_SECRET`: en az 32 karakterlik rastgele bir değer.
- `PAYMENT_PROVIDER=none`. Yerel testte `PAYMENT_SIMULATION_ENABLED=true` ve `PAYMENT_SIMULATION_SECRET` (rastgele bir değer) gerekir.

Canlı ortamın sırları repoya asla girmez.

## Doğrulama (her iş sonunda)
```bash
npm run lint
npm test
npm run build
```
- `npm test`: arama testi ve Vitest birlikte çalışır. Son Vitest sonucu 103/103.
- E2E testleri için `npm run test:e2e`; önce `npm run dev` açık olmalı.
- Bunlardan biri kırmızıyken commit atılabilir, ama commit mesajında "WIP: kırmızı" yazmalı.

## Anlık git kuralı (zorunlu)
Her alt görev bitince şu üç adım yapılır:
1. `PROGRESS.md`'ye bir satır ekle ve `YAPILACAKLAR.md`'de ilgili maddeyi işaretle.
2. `git add -A && git commit -m "<kısa açıklama>"`
3. `git push`

Bir oturumun hakkı veya tokeni her an bitebilir. Push edilmemiş iş kaybolmuş sayılır.

## Durum
**Bitti:**
- Phase 2: premium vitrin tasarımı.
- Faz A: altyapı, auth ve e-posta.
- Faz B: katalog, arama, favoriler, depolama, yükleme.
- Faz C: sepet, kupon, simüle ödeme, sipariş, stok, kargo, indirme, hesap sayfaları.
- Faz D: admin paneli (ürün, dosya, CSV, sipariş, müşteri, kupon, CMS, ayarlar, yöneticiler, denetim), kişiye özel talep akışı.
- Dokümanlar: README, ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION, SECURITY, ADMIN_GUIDE, DEPLOYMENT, PAYMENT_INTEGRATION, PROJECT_STATUS, TEST_REPORT.

Son doğrulama (2026-11-20): lint temiz, Vitest 103/103 (15 dosya), Playwright 12/12, build ve üretim Docker imajı başarılı. Güncel senaryolar `TEST_REPORT.md` dosyasında.

**Mağaza kimliği:** Admin → Ayarlar'daki mağaza adı üst bilgi, alt bilgi, sayfa başlığı ve e-postaları günceller. Varsayılan ad "Nakış Sitesi". Logo ve işletme sahibi alanları müşterinin bilgilerini bekliyor. Yerel DB `nakis`/`nakis_test`, kovalar `nakis-private`/`nakis-public`. `logo/` ve `public/brand/` diskte duruyor ve git dışı.

## Yapılacaklar (öncelik sırası)
1. ~~Ajan E kalemleri~~ bitti.
2. Modül içe aktarma döngüleri giderildi. API JSON yanıtları `route()` ve ortak `json()` yardımcısından geçer.
3. Phase 2 galeri yakınlaştırma ve mobil ürün kartı düzeltmeleri tamamlandı.
4. Gerçek ödeme sağlayıcısı (iyzico/PayTR) bağlanacak; müşterinin hesap bilgileri gerekli. Rehber: `PAYMENT_INTEGRATION.md`.
5. Gerçek ürünler girilecek: fotoğraf, fiyat ve yalnız gerçekten sahip olunan dosya formatları. Demo ürünler `isDemo` ile işaretli.
6. Üretim Docker imajı ve sağlık/SEO uçları yerelde doğrulandı. Canlı kurulum için `DEPLOYMENT.md` adımları.

## Repoda olmayanlar
- `screenshots/` ve `test-results/`: büyük oldukları için `.gitignore`'da; yalnız yerel diskte.
- Nakış VP3 üretimi: ayrı bir klasörde (`Belgeler\ChatGPT\Nakış desen üretimi\`). Açık işler:
  - Duhanedoku logosundaki küçük "HANDMADE WITH LOVE" yazısı bozuk, papatya konturu köşeli.
  - `Referans_Stil_140mm\OKUBENI.md` yazılmadı.
  - Gerçek makinede test dikişi yapılmadı.
