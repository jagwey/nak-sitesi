# AGENTS.md — Tülay Birer E-Ticaret Platformu Geliştirme Rehberi

Bu dosya, projeyi devralacak geliştirici veya yapay zekâ ajanları için bağlayıcı mimari ve tasarım kurallarını özetler.

> **İlk iş (Codex dahil her yeni ajan):** `DEVIR.md`'yi oku. Kurulum, doğrulama ve sıradaki işler orada, açık iş listesi `YAPILACAKLAR.md`'de.
> **Anlık git kuralı:** Her alt görev bitince sırasıyla `PROGRESS.md` ve `YAPILACAKLAR.md` güncellenir, `git add -A && git commit` yapılır, ardından `git push`. Uzak depo: https://github.com/jagwey/nak-sitesi (`main`). Sırlar (`.env`) asla commit edilmez.

## 1. Proje Durumu ve Aşama Kuralı
- **Aktif Aşama**: Aşama 3 (backend + yönetim paneli) **onaylandı ve uygulandı**. Ön yüz tasarımı (Aşama 1–2) onaylıdır; ön yüz görünümünü onaysız değiştirmeyin.
- Gerçek ödeme sağlayıcısı entegrasyonu, canlı veri ve canlıya alma müşteriden gelecek bilgilere bağlıdır (bkz. `PROJECT_STATUS.md`); bunları uydurmayın.
- Güncel ilerleme ve eksikler için `PROJECT_STATUS.md`, `PROGRESS.md` ve `YAPILACAKLAR.md` dosyalarını okuyun.
- **Canlı güncelleme kuralı:** Bir iş/alt görev bitince `PROGRESS.md`'yi hemen güncelleyin (dosyayı baştan yazmayın, yalnızca ilgili satırı ekleyin/düzeltin); açık işleri `YAPILACAKLAR.md`'de güncel tutun. Faz 3 belgeleri koddan türetilir: kod değişince ilgili belge de güncellenir.

## 2. Marka ve Logo Kuralı (Değiştirilemez)
- Orijinal logo `logo/WhatsApp Image 2026-11-19 at 21.35.42.jpeg` dosyasında saklanır; asla silinmez veya değiştirilmez.
- Şeffaf sürümler `public/brand/tulay-birer-logo.png` (tam logo) ve `public/brand/tulay-birer-monogram.png` (TB + makas simgesi) dosyalarındadır. Logoyu yeniden çizmeyin, oranlarını bozmayın, yeni logo uydurmayın.

## 3. Tasarım Sistemi Kuralları (`DESIGN_SYSTEM.md`)
- Yalnızca iki font ailesi kullanılır: `Cormorant Garamond` (başlıklar) ve `Manrope` (gövde ve arayüz; sayısal değerlerde `tabular-nums`).
- Renk paleti: `#FAF8F3`, `#EDE4D6`, `#B18A49` (seçici vurgu; metin için WCAG AA uyumlu `#85632B`), `#4A372C`, `#242320`, `#2B211B`, `#FFFFFF`.
- Anti-AI-slop: Mor/mavi gradient, başlık üstü eyebrow rozetleri, fotoğraf üstü dekoratif etiketler, kart içi kart kutular, sahte satış/yorum sayıları ve `transition: all` yasaktır.

## 4. Veri ve Güvenlik Kuralları
- Gerçek ürün fotoğrafları, fiyatlar, adres/telefon ve yasal metinler uydurulmaz; eksik alanlar yapılandırılabilir olarak işaretlenir.
- Bir dijital ürüne gerçekten sahip olmadığı nakış formatı (VP3, PES, DST vb.) eklenmez; görseller yeniden adlandırılarak nakış dosyası gibi sunulmaz.
- Fiyatlar her zaman tamsayı **kuruş** (`priceKurus`) olarak tutulur.

## 5. Backend Kuralları (Faz 3, bağlayıcı)
Ayrıntı: `ARCHITECTURE.md`, `SECURITY.md`, `PAYMENT_INTEGRATION.md`.
- **Modül sınırları:** İş mantığı `src/server/modules/<modül>/` altındadır. Route dosyaları ince kalır (şema + izin + servis çağrısı). Bir modül başka modülün tablolarına doğrudan yazmaz; onun servis fonksiyonunu çağırır. Yeni bağımlılık döngüsü oluşturmayın.
- **`route()` + `z.strictObject`:** Her API ucu `src/server/http.ts` içindeki `route()` ile yazılır; `body/query/params` şemaları `z.strictObject` olmalıdır (bilinmeyen alan reddedilir, mass assignment engellenir). `route()` dışında uç yazmayın; CSRF, hız sınırı, kimlik doğrulama orada uygulanır. `csrf:false` yalnızca imzalı webhook içindir.
- **Kuruş:** Tüm tutarlar tamsayı kuruş (`...Kurus`). Float/TL değeri DB'ye yazılmaz; TL↔kuruş dönüşümü yalnızca arayüz/CSV sınırında yapılır. Fiyatı istemciden kabul etmeyin; sunucu katalogdan hesaplar.
- **Asla otomatik ödendi yok:** Checkout hiçbir zaman `PAID` üretmez. Sipariş yalnızca doğrulanmış `payment.succeeded` webhook olayıyla (veya yetkili yöneticinin kayıtlı manuel ödemesiyle) `PAID` olur. Webhook imzası ham gövde üzerinden, idempotent (`provider,eventId`) ve tutar eşleşmesiyle işlenir.
- **Simülasyon yalnızca production dışında:** Ödeme simülasyonu `isPaymentSimulationAllowed()` ile korunur; `NODE_ENV=production` iken env doğrulaması simülasyonu reddeder. Bu korumayı gevşetmeyin.
- **Ücretli dosyalar private kovada:** Dijital nakış dosyaları ve özel sipariş ekleri `private` kovada tutulur; asla herkese açık yapılmaz, kalıcı URL verilmez. Erişim yalnızca hak kontrolünden geçen kısa ömürlü imzalı URL ile. Yalnızca ürün görselleri `public` kovadadır.
- **Admin işlemleri denetlenir:** Her değiştiren yönetici işlemi `writeAudit` ile `AuditLog`'a yazılır (gizli alanlar redakte edilir). İzinler her istekte DB'den okunur; yeni admin ucu için uygun `permission` verin.
- **Gizli değerler:** Token'lar (oturum, misafir, teklif, doğrulama) DB'de yalnızca sha256 özeti olarak saklanır. Sırlar kodda/logda/repoda bulunmaz; yeni env değişkeni `src/server/env.ts` ve `.env.example`'a (Türkçe yorumla) eklenir.
- **Şema değişikliği:** `prisma/schema.prisma` + yeni migration (canlıda `npm run db:deploy`). `DATABASE_SCHEMA.md`'yi güncelleyin. SiteSettings içine geçici meta/yan tablo hileleri yazmayın; gerçek sütun kullanın.
- **Testler:** Davranış değiştiren her iş test içerir (`tests/unit`, `tests/integration`; E2E `tests/e2e`). `npm run lint` ve `npm test` yeşil olmadan iş bitmiş sayılmaz.
- **Dürüst durum:** Demo ürünler `isDemo` ile işaretlidir; gerçek ödeme sağlayıcısı ve gerçek nakış dosyaları yoktur. Bunlar varmış gibi sunulmaz.

## 6. Komutlar
- Geliştirme sunucusu: `npm run dev`
- Tip kontrolü: `npm run lint`
- Birim + entegrasyon testleri: `npm test` (E2E: `npm run test:e2e`)
- Üretim derlemesi: `npm run build`
- Altyapı ve veri: `npm run db:up`, `npm run db:deploy`/`db:migrate`, `npm run db:seed`, `npm run search:reindex`, `npm run admin:create`, `npm run jobs:release-reservations`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
