# Tülay Birer — Proje Durumu

## Genel durum
- **Aşama 1–2 (ön yüz, tasarım incelemesi):** tamamlandı, müşteri onaylı vitrin.
- **Aşama 3 (backend + yönetim paneli):** uygulandı. Faz A (altyapı, auth), B (katalog, arama, depolama), C (sepet, ödeme akışı, sipariş, indirme), D1 (admin ürün/dosya/stok/CSV), D2 (admin sipariş/müşteri/kupon/ayar/CMS/özel talep) bitti.
- Son doğrulama: lint temiz, Vitest 97/97 (13 dosya), build OK. E2E (Playwright) ekleniyor.
- **Canlıya hazır değil:** gerçek ödeme, gerçek ürün/dosya, yasal metinler ve altyapı bilgileri bekleniyor.

## Tamamlananlar
- Docker (Postgres 17, MinIO, Mailpit), Prisma şema + migration, seed.
- Kayıt/giriş/e-posta doğrulama/parola sıfırlama, roller ve izinler (RBAC), oturumlar.
- Katalog, Postgres trigram arama, favoriler, adresler, sepet (misafir birleştirme), kupon, checkout, stok rezervasyonu.
- Ödeme sağlayıcı arayüzü, imzalı idempotent webhook, manuel ödeme, iade; simülasyon (yalnızca geliştirme).
- Güvenli dijital indirme (imzalı URL, hak sayacı), dosya yükleme doğrulamaları (ZIP sınırları, görsel webp).
- Türkçe yönetim paneli: ürünler, kategoriler, koleksiyonlar, etiketler, dosyalar, stok, CSV, siparişler, müşteriler, kuponlar, kişiye özel talepler ve teklifler, içerik/ayarlar, yöneticiler, denetim kaydı.
- Belgeler: README, ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION, SECURITY, DEPLOYMENT, PAYMENT_INTEGRATION, BACKEND_REQUIREMENTS, TEST_REPORT, ADMIN_GUIDE.

## Yapılmayanlar / bilinen eksikler
- Gerçek iyzico/PayTR bağlantısı (iskelet var).
- Güvenlik başlıkları, 2FA, virüs taraması (`SECURITY.md` bilinen eksikler).
- Yeni özel talep için yönetici e-postası gönderilmiyor.
- E2E testleri tamamlanmadı (ajan E).
- Geliştirme veritabanındaki test yönetici hesapları canlıdan önce silinmeli (yalnızca yerel).
- GitHub'a ilk yükleme (git deposu henüz yok).

## Müşteriden beklenenler (engelleyiciler)
1. **Ödeme sağlayıcısı:** iyzico veya PayTR sözleşmesi, sandbox ve canlı anahtarlar.
2. **Gerçek ürünler:** fotoğraflar, fiyatlar, stok; yalnızca gerçekten sahip olunan nakış dosyaları (VP3, PES, DST vb.). Demo ürünler (`isDemo`) kaldırılacak.
3. **Yasal metinler:** KVKK aydınlatma/açık rıza, mesafeli satış sözleşmesi, ön bilgilendirme, iade/iptal, gizlilik, çerez; avukat onaylı.
4. **İşletme bilgileri:** unvan, adres, telefon, vergi/MERSİS, WhatsApp numarası.
5. **Alan adı ve barındırma:** domain, sunucu, TLS.
6. **SMTP sağlayıcı:** gönderen adres ve SPF/DKIM kayıtları.
