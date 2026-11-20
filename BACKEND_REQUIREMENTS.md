# BACKEND_REQUIREMENTS.md — Gereksinimler ve Gerçekleşme Durumu

Durum işaretleri: **[x]** uygulandı ve testli, **[~]** kısmen, **[ ]** yapılmadı. Ayrıntı: `ARCHITECTURE.md`, `API_DOCUMENTATION.md`, `DATABASE_SCHEMA.md`.

## 1. İlkeler
- [x] Para birimi TRY, tüm tutarlar tamsayı kuruş; sipariş kalemleri ürün/fiyat anlık görüntüsü (snapshot) taşır.
- [x] Dijital dosyalar private kovada; ödeme doğrulanınca kısa ömürlü imzalı URL; kalıcı herkese açık URL yok.
- [x] Format yalnızca gerçekten yüklenen dosyadan (uzantı + yapı doğrulama) kaydedilir.
- [x] Teknik veriler (ilmek, ölçü, renk) DST/PES dosyasından okunur (`embroidery` parser); elle girilenler doğrulanmamış sayılır.
- [~] KVKK: dışa aktarma ve anonimleştirme var; aydınlatma/açık rıza metinleri müşteriden gelecek. Kart verisi sistemde tutulmaz.

## 2. Veri modelleri
- [x] Kullanıcı, rol/izin, oturum, adres, favori, sepet, sipariş, ödeme, webhook olayı, hak (entitlement), indirme kaydı, kupon, stok/rezervasyon, ürün/varyant/format/dosya/görsel, kategori/koleksiyon/etiket, kişiye özel talep (+ek, mesaj, teklif), site ayarları, denetim kaydı, hız sınırı.
- [x] Kişiye özel talep alanları gerçek sütunlarda (migration `20261120120000_phase3_custom_order_fields`).
- [~] `custom-orders/service.ts` içinde eski SiteSettings geçici çözümü kod tarafında hâlâ görünüyor olabilir (E ajanı temizliyor).

## 3. API
- [x] Kimlik (kayıt, giriş, çıkış, e-posta doğrulama, parola sıfırlama), katalog, arama, favori, adres, sepet, kupon, checkout, sipariş, indirme, kişiye özel talep, ayarlar.
- [x] Yönetim: ürün/kategori/koleksiyon/etiket, dosya ve görsel yükleme, stok, CSV içe aktarma, sipariş/kargo/iptal/iade/manuel ödeme, müşteri, kupon, indirme kaydı, yönetici, denetim, ayar/CMS, kişiye özel teklif.
- [x] Tüm uçlar `route()` ile: strict şema, CSRF, hız sınırı, izin kontrolü, tek hata biçimi.

## 4. Ödeme
- [x] Sağlayıcı arayüzü, imzalı webhook, idempotensi, tutar eşleşmesi, iade, manuel ödeme, simülasyon (yalnızca geliştirme).
- [ ] Gerçek iyzico/PayTR: yalnızca iskelet (StubProvider). Sözleşme ve anahtarlar gerekir. Bkz. `PAYMENT_INTEGRATION.md`.

## 5. Yasal içerik
- [~] Yönetim panelinde düzenlenir; metinler müşteri/avukattan gelecek, uydurulmaz.

## 6. Operasyon
- [x] Stok rezervasyonu ve süresi dolanları serbest bırakan iş (`jobs:release-reservations`).
- [x] E-posta şablonları (doğrulama, sıfırlama, sipariş, indirme, teklif); `EMAIL_TRANSPORT=console|smtp`.
- [ ] `new_custom_order` yönetici bildirimi gönderilmiyor; `ADMIN_NOTIFY_EMAIL` kullanılmıyor.
- [ ] Güvenlik başlıkları (CSP, HSTS vb.), 2FA, virüs taraması, admin uçlarında ayrı hız sınırı (bkz. `SECURITY.md`).
- [ ] E2E testleri (ajan E ekliyor).
