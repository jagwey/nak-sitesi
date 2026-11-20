# Nakış Sitesi — Proje Durumu

## Genel durum
- **Aşama 1–2 (ön yüz, tasarım incelemesi):** tamamlandı, müşteri onaylı vitrin.
- **Aşama 3 (backend + yönetim paneli):** uygulandı. Faz A (altyapı, auth), B (katalog, arama, depolama), C (sepet, ödeme akışı, sipariş, indirme), D1 (admin ürün/dosya/stok/CSV), D2 (admin sipariş/müşteri/kupon/ayar/CMS/özel talep) bitti.
- Son doğrulama: lint temiz, Vitest 103/103 (15 dosya), Playwright 12/12, build ve Docker dağıtım provası başarılı.
- **Tam e-ticaret uygulaması:** canlıya alınması için gerçek ödeme, gerçek ürün/dosya, yasal metinler ve altyapı bilgileri bekleniyor.

## Tamamlananlar
- Shopier için bağımsız statik vitrin (`npm run build:storefront`) [ücretsiz Cloudflare adresinde](https://nakis-vitrin.nakis-sitesi.workers.dev/) yayında. Mevcut siteyle uyumlu menü, Hakkımızda, canlı monogram önizlemesi, arama/filtreleme ve 11 etiketli demo ürün var. Satın alma düğmeleri gerçek ürünleri ve Shopier bağlantılarını bekliyor. Monogram önizlemesi tarayıcıda çalışır, sipariş talebi alma kanalı henüz tanımlı değil.
- Docker (Postgres 17, MinIO, Mailpit), Prisma şema + migration, seed.
- Canlı kullanım için Docker imajı, PostgreSQL sağlık kontrolü, robots.txt, site haritası ve demo ürünsüz referans seed. Kurulum adımları `DEPLOYMENT.md` dosyasında.
- Kayıt/giriş/e-posta doğrulama/parola sıfırlama, roller ve izinler (RBAC), oturumlar.
- Katalog, Postgres trigram arama, favoriler, adresler, sepet (misafir birleştirme), kupon, checkout, stok rezervasyonu.
- Ödeme sağlayıcı arayüzü, imzalı idempotent webhook, manuel ödeme, iade; simülasyon (yalnızca geliştirme).
- Güvenli dijital indirme (imzalı URL, hak sayacı), dosya yükleme doğrulamaları (ZIP sınırları, görsel webp).
- Türkçe yönetim paneli: ürünler, kategoriler, koleksiyonlar, etiketler, dosyalar, stok, CSV, siparişler, müşteriler, kuponlar, kişiye özel talepler ve teklifler, içerik/ayarlar, yöneticiler, denetim kaydı.
- Mağaza adı, logo, işletme sahibi ve iletişim bilgileri Ayarlar panelinden yönetiliyor. Vitrin, sayfa başlıkları ve e-postalar aynı mağaza adını kullanıyor.
- Belgeler: README, ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION, SECURITY, DEPLOYMENT, PAYMENT_INTEGRATION, BACKEND_REQUIREMENTS, TEST_REPORT, ADMIN_GUIDE.

## Yapılmayanlar / bilinen eksikler
- Gerçek iyzico/PayTR bağlantısı (iskelet var).
- 2FA ve virüs taraması (`SECURITY.md` bilinen eksikler).
- Geliştirme veritabanındaki test yönetici hesapları canlıdan önce silinmeli (yalnızca yerel).

## Müşteriden beklenenler (engelleyiciler)
1. **Ödeme sağlayıcısı:** iyzico veya PayTR sözleşmesi, sandbox ve canlı anahtarlar.
2. **Gerçek ürünler:** fotoğraflar, fiyatlar, stok; yalnızca gerçekten sahip olunan nakış dosyaları (VP3, PES, DST vb.). Demo ürünler (`isDemo`) kaldırılacak.
3. **Yasal metinler:** KVKK aydınlatma/açık rıza, mesafeli satış sözleşmesi, ön bilgilendirme, iade/iptal, gizlilik, çerez; avukat onaylı.
4. **İşletme bilgileri:** unvan, adres, telefon, vergi/MERSİS, WhatsApp numarası.
5. **Alan adı ve barındırma:** domain, sunucu, TLS.
6. **SMTP sağlayıcı:** gönderen adres ve SPF/DKIM kayıtları.
