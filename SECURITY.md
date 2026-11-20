# SECURITY.md — Güvenlik Modeli (Faz 3)

Bu belge kodda **gerçekten uygulanan** korumaları ve bilinen eksikleri listeler. Test referansları `TEST_REPORT.md` içindedir.

## Tehdit → önlem tablosu

| Tehdit | Önlem | Nerede |
|---|---|---|
| Parola kırma / sızıntı | argon2id (`@node-rs/argon2`); en az 10 karakter (yönetici 12). Parola düz saklanmaz/loglanmaz | `auth/password.ts` |
| Kaba kuvvet giriş denemesi | 5 hatalı denemede hesap kilidi (`lockedUntil`); giriş limiti 5/15 dk/e-posta ve 30/15 dk/IP; hata mesajı genel (hangi alanın yanlış olduğu söylenmez) | `auth/service.ts`, `route()` |
| Hesap numaralandırma | Parola sıfırlama isteği hesap var olsun olmasın **aynı yanıtı** verir; limit 3/saat/e-posta + 10/saat/IP | `auth` |
| Oturum çalma/yeniden kullanma | Opak 32 bayt token; DB'de yalnızca sha256; cookie `httpOnly`, `sameSite=lax`, production'da `secure`; 30 gün kayar süre; çıkış ve parola sıfırlama oturumları sunucuda siler | `auth/session.ts` |
| Yetki yükseltme | Rol/izinler **her istekte** DB'den okunur. Pasif kullanıcı reddedilir. Süper Yönetici panelden ADMIN, PRODUCT_MANAGER, ORDER_MANAGER veya MODERATOR atayabilir. Davet bağlantısı tek kullanımlık ve bir saatliktir. | `auth/rbac.ts`, `admin-orders/admins.ts` |
| Admin alanının keşfi | Yetkisiz kullanıcıya admin sayfaları `404`; anonim `/giris?next=/admin`'e yönlenir | `requireAdminPage` |
| CSRF | Güvensiz metotlarda `Origin` = `APP_URL` origin'i zorunlu; yedek `Sec-Fetch-Site`; yalnızca imzalı webhook `csrf:false` | `http.ts` |
| Hız sınırı / kötüye kullanım | IP başına DB destekli sabit pencere (`RateLimit`, atomik upsert; anahtar `ad + sha256(kimlik)`); uç bazında limitler (bkz. `API_DOCUMENTATION.md`) | `rate-limit.ts` |
| Mass assignment | Tüm `body/query/params` `z.strictObject`; `route()` strict olmayan şemayı reddeder (`assertStrict`); bilinmeyen alan `400` | `http.ts` |
| Fiyat/tutar manipülasyonu | Sepet ve checkout **fiyat alanı kabul etmez**; fiyat her seferinde katalogdan yeniden hesaplanır; tutarlar tamsayı kuruş; webhook'ta tutar eşleşmesi zorunlu | `cart/pricing.ts`, `orders/checkout.ts`, `payments/webhook.ts` |
| IDOR | Sipariş/adres/indirme/özel talep uçları sahiplik denetler; başkasının kaydı `404` döner (varlık sızdırılmaz); misafir siparişi yalnızca geçerli `guestToken` ile | servisler, testler |
| Aşırı satış / yarış durumu | Atomik koşullu stok rezervasyonu + DB CHECK (`reserved <= onHand`); atomik kupon sayacı; checkout tek transaction | `inventory/stock.ts` |
| Ödeme sahteciliği | Webhook imzası ham gövde üzerinde sabit zamanlı; `(provider, eventId)` benzersizliği; kilitli transaction; tutar eşleşmesi; sipariş **yalnızca** `payment.succeeded` ile PAID olur | `payments/webhook.ts` |
| Simülasyonun canlıya sızması | `isPaymentSimulationAllowed()` tek kaynak; `NODE_ENV=production` iken env doğrulaması `PAYMENT_SIMULATION_ENABLED=true`, `PAYMENT_PROVIDER=simulated` ve https olmayan `APP_URL`'yi **reddeder**; simülasyon ucu kapalıysa `404` | `env.ts`, `provider.ts` |
| Ücretli dosyanın yetkisiz indirilmesi | Dijital dosyalar **private** kovada; kalıcı URL yok. İndirme: oturum + hak (ödenmiş, iptal/iade edilmemiş, süresi dolmamış, `remaining > 0`) → atomik kredi düşümü → 300 sn imzalı URL (`attachment`). `DownloadLog` (IP özeti) | `downloads/service.ts`, `storage` |
| Admin dosya erişimi | 120 sn imzalı URL, her erişim denetim kaydı | `admin/files/[id]` |
| Zararlı yükleme (dosya) | Uzantı beyaz listesi (vp3, pes, dst, jef, hus, exp, xxx, vip, pec, pcs, sew, art; ZIP); en fazla 20 MB; sihirli bayt/yapı doğrulama; dosya adı temizleme; nesne anahtarları sunucuda üretilir | `uploads/validators.ts` |
| Zararlı yükleme (görsel) | En fazla 8 MB, 40 MP piksel sınırı, içerik koklama (jpeg/png/webp), **webp'ye yeniden kodlama** (en fazla 2000 px, metadata silinir) | `uploads/validators.ts` |
| ZIP bombası / path traversal | Arşiv ≤ 50 MB, ≤ 200 girdi, toplam açılmış ≤ 200 MB, girdi başına ≤ 50 MB, sıkıştırma oranı ≤ 100; güvenli olmayan yol (`..`, mutlak, sembolik bağ) reddedilir; iç uzantı beyaz listesi. Kodlar: `ZIP_INVALID`, `ZIP_UNSAFE_PATH`, `ZIP_TOO_MANY_ENTRIES`, `ZIP_TOO_LARGE`, `ZIP_BOMB`, `ZIP_BAD_ENTRY_TYPE` | `uploads/validators.ts` |
| Bot/spam (özel talep) | Bal küpü alanı `website`; KVKK `consent` zorunlu; IP limiti; en fazla 5 görsel, 45 MB | `custom-orders` |
| Açık yönlendirme / zararlı bağlantı | Ayarlarda bağlantılar yalnızca yol veya `https`; `javascript:`/`data:` reddedilir; WhatsApp yalnızca `wa.me` | `settings/schema.ts` |
| Gizli bilgilerin sızması | Sırlar yalnızca env'de; `.env` git'e girmez; `.env.example` boş/örnek değerler. Misafir tokenı, teklif tokenı, doğrulama/sıfırlama tokenı DB'de yalnızca sha256. Tokenlar e-posta bildirim kaydında ham saklanmaz | `crypto.ts`, testler |
| Log/PII | Denetim `diff` içinde sır benzeri anahtarlar `[REDACTED]`; IP'ler HMAC ile özetlenir (`SESSION_SECRET` anahtarlı); `Payment.raw` kart verisi içermez; `INTERNAL` hata ayrıntısı production'da istemciye verilmez | `audit.ts` |
| KVKK: erişim/silme | Müşteri verisi dışa aktarma (`/api/admin/customers/[id]/export`); **anonimleştirme** (`anonymize`, SUPER_ADMIN/ADMIN, `confirm:true`): kişisel veri silinir, sipariş tutarları/kayıtları korunur (`User.anonymizedAt`) | `admin-orders/customers.ts` |
| İzlenebilirlik | Her yönetici değişikliği `AuditLog` (aktör, eylem, varlık, redakte diff, IP özeti); `audit:read` ile sorgulanır | `audit.ts` |
| Manuel ödeme kötüye kullanımı | Yalnızca SUPER_ADMIN/ORDER_MANAGER; referans zorunlu; denetim kaydı | `admin-orders/manual.ts` |

## Gizli değerlerin yönetimi
- `SESSION_SECRET` ≥ 32 karakter, rastgele; production'da benzersiz. Değişirse IP özetleri değişir (oturumlar DB tokenlarına dayanır).
- S3, SMTP, ödeme sağlayıcı anahtarları yalnızca ortam değişkeni olarak verilir.
- `ADMIN_BOOTSTRAP_PASSWORD` yalnızca ilk yönetici için; kullanımdan sonra ortamdan silin.

## Bilinen eksikler ve riskler (dürüst liste)

1. **Güvenlik başlıkları yok:** `next.config.ts` CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, HSTS tanımlamıyor. Canlıdan önce eklenmeli (veya ters vekil/CDN'de uygulanmalı).
2. **`src/proxy.ts`/`middleware.ts` yok:** korumalar uç bazında; yeni bir uç `route()` kullanılmadan eklenirse korumasız kalır. Kural: her API ucu `route()` ile yazılır.
3. **Gerçek ödeme sağlayıcısı yok:** webhook imza şeması iyzico/PayTR için henüz uygulanmadı (StubProvider).
4. **Env doğrulama boşluğu:** `REFUND_REVOKES_DOWNLOADS`, `DOWNLOAD_EXPIRY_DAYS`, `PAYMENT_SIMULATION_SECRET` `process.env`'den doğrulamasız okunur. Simülasyon sırrı boşsa kodda sabit bir geliştirme sırrı devreye girer (yalnızca simülasyon izinliyken kullanılır, production'da engelli).
5. **Admin uçlarında ayrı hız sınırı yok** (oturum + izin + CSRF korur). Ele geçirilmiş bir yönetici hesabı için ek sınır yok.
6. **İki aşamalı doğrulama (2FA) yok** — yönetici hesapları için önerilir.
7. **Virüs taraması yok:** yüklenen dosyalar yapısal olarak doğrulanır ama AV taramasından geçmez (nakış dosyaları ikili biçimdir).
8. **Misafir tokenı e-posta ile taşınır:** e-postanın ele geçirilmesi misafir sipariş erişimini açar (token yalnızca sipariş görüntüleme/teklif kararı verir).
9. **Yedekleme/DR** uygulama dışıdır (bkz. `DEPLOYMENT.md`).
10. **Yasal metinler** avukat onayı beklemektedir; KVKK aydınlatma/açık rıza metinleri yönetim panelinden girilir.
