# DEVİR — Codex / yeni ajan için başlangıç noktası (2026-11-20)

Bu dosyayı oku, ardından `YAPILACAKLAR.md` (yapılan/yapılacak listesi) ve `PROGRESS.md` (adım adım ayrıntı) dosyalarına bak. Bağlayıcı kurallar `AGENTS.md` içinde: logo değişmez, yalnız iki font, sabit renk paleti, uydurma format/fiyat/yasal metin yok, fiyatlar `priceKurus` (tamsayı kuruş).

## Proje
Tülay Birer nakış e-ticaret sitesi. Fiziksel ürünler, dijital nakış dosyaları (VP3/PES…) ve kişiye özel sipariş satıyor.
- **Uygulama:** Next.js (sürümü eğitim verisinden farklı, `node_modules/next/dist/docs/` oku), Tailwind, TypeScript.
- **Veri:** Prisma 7 + PostgreSQL 17 (docker, port 5433; `tulay` ve `tulay_test` veritabanları), pg_trgm/unaccent arama.
- **Dosya ve e-posta:** MinIO özel depolama, Mailpit e-posta.
- **Test:** vitest (entegrasyon), Playwright.

## Çalıştırma
```bash
docker compose up -d
npm install
npx prisma migrate deploy
npm run db:seed        # package.json'daki seed komutuna bak
npm run dev            # site
npm run lint           # tsc
npx vitest run         # 97/97 test (son doğrulama)
npm run build
```
Ortam değişkenleri: `.env.example` dosyasını `.env` olarak kopyala. Gerçek sırlar repoda yok.

## Durum
**Bitti:**
- Phase 2: premium vitrin tasarımı.
- Faz A: altyapı, auth ve e-posta.
- Faz B: katalog, arama, favoriler, depolama, yükleme.
- Faz C: sepet, kupon, simüle ödeme, sipariş, stok, kargo, indirme, hesap sayfaları.
- Faz D: admin paneli (ürün, dosya, CSV, sipariş, müşteri, kupon, CMS, ayarlar, yöneticiler, denetim), kişiye özel talep akışı.
- Dokümanlar: README, ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION, SECURITY, ADMIN_GUIDE, DEPLOYMENT, PAYMENT_INTEGRATION, PROJECT_STATUS, TEST_REPORT.

Son doğrulama: lint temiz, 97/97 test, build başarılı.

**Push anında yarım kalan iş (ajan "E"):** Push bu iş bitmeden yapıldı. Yeni oturum önce lint, test ve build çalıştırıp durumu doğrulamalı. Kalemler:
- Şema düzeltmesi ve migration `20261120120000_phase3_custom_order_fields`. Bitti.
- Duyuru çubuğu çakışma düzeltmesi. Bitti.
- Playwright E2E testleri.
- Güvenlik başlıkları (CSP/HSTS).
- Env doğrulaması ve sabit simülasyon sırrının kaldırılması.
- Özel talep için admin e-postası.
- Müşteri yetki uyumu.
- TEST_REPORT'a E2E bölümü.
- Dev veritabanındaki test yöneticilerinin silinmesi: `d1-admin@example.com`, `d2shots@example.com`, `d2shots2@example.com`.

## Yapılacaklar (öncelik sırası)
1. Ajan E kalemlerini bitir; `npm run lint`, `npx vitest run` ve `npm run build` yeşil olsun.
2. Teknik borç: import döngüleri (cart↔orders, orders↔payments, settings↔orders). Bazı route'lar `route()` yerine doğrudan `Response.json` kullanıyor.
3. Phase 2'den kalan küçük kusurlar: galerideki yakınlaştır düğmesi fotoğrafın üstünde; ürün kartındaki tür satırı mobilde kayıyor.
4. Gerçek ödeme sağlayıcısı (iyzico/PayTR) bağlanacak; müşterinin hesap bilgileri gerekli. Rehber: `PAYMENT_INTEGRATION.md`.
5. Gerçek ürünler girilecek: fotoğraf, fiyat ve yalnız gerçekten sahip olunan dosya formatları. Demo ürünler `isDemo` ile işaretli.
6. Canlıya çıkış: `DEPLOYMENT.md` adımları.

## Repoda olmayanlar
- `screenshots/` ve `test-results/`: büyük oldukları için `.gitignore`'da; yalnız yerel diskte.
- Nakış VP3 üretimi: ayrı bir klasörde (`Belgeler\ChatGPT\Nakış desen üretimi\`). Açık işler:
  - Duhanedoku logosundaki küçük "HANDMADE WITH LOVE" yazısı bozuk, papatya konturu köşeli.
  - `Referans_Stil_140mm\OKUBENI.md` yazılmadı.
  - Gerçek makinede test dikişi yapılmadı.
