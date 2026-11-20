# Nakış Sitesi — Proje Durumu

## Genel durum
- **Aşama 1–2 (ön yüz, tasarım incelemesi):** tamamlandı, müşteri onaylı vitrin.
- **Aşama 3 (backend + yönetim paneli):** uygulandı. Faz A (altyapı, auth), B (katalog, arama, depolama), C (sepet, ödeme akışı, sipariş, indirme), D1 (admin ürün/dosya/stok/CSV), D2 (admin sipariş/müşteri/kupon/ayar/CMS/özel talep) bitti.
- Son doğrulama: lint temiz, Vitest 114/114, Playwright 12/12, build ve yerel HTTPS üzerinde Docker dağıtım provası başarılı.
- **Tam e-ticaret uygulaması:** Oracle Cloud Always Free (`VM.Standard.E2.1.Micro`, `92.5.103.221`, Oracle Linux 9.8) üzerinde PostgreSQL 17 + Next.js 16 + Caddy TLS (`92-5-103-221.sslip.io`, tokensız 404) ile yayına alındı ve [mevcut Cloudflare adresine](https://nakis-vitrin.nakis-sitesi.workers.dev/) (`bf633ab2-2527-49b8-be9e-06a4d2f5f726`) bağlandı. 11 demo ürün yayında ve mevcut mağaza hesabına Süper Yönetici yetkisi verildi. Gerçek satış için SMTP, ödeme sağlayıcısı, gerçek ürünler ve yasal metinler gerekiyor.

## Tamamlananlar
- Tam Next.js + PostgreSQL mağazası [ücretsiz Cloudflare adresinde](https://nakis-vitrin.nakis-sitesi.workers.dev/) canlı yayında (Worker sürümü `bf633ab2-2527-49b8-be9e-06a4d2f5f726`, geri dönüş için önceki statik vitrin sürümü `67eb400e-c172-48d4-b23d-1d06c8e87604`). GHCR imaj derlemesi `.github/workflows/build-images.yml` ve tek komutluk sunucu dağıtımı `scripts/deploy-oracle.ps1` ile otomatik.
- Docker (Postgres 17, MinIO, Mailpit), Prisma şema + migration, seed.
- Canlı kullanım için üretim Compose dosyası, Docker imajı, PostgreSQL sağlık kontrolü, robots.txt, site haritası ve demo ürünsüz referans seed. Demo yayın seçeneğinde test ürünleri listelenir ve sepete eklenebilir, üretimde siparişe dönüşmez. Kurulum adımları `DEPLOYMENT.md` dosyasında.
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
