# DEPLOYMENT.md — Canlıya Alma Kontrol Listesi

Bu liste, uygulamayı gerçek bir sunucuya almadan önce yapılması gerekenleri sıralar. Müşteriden gelmesi gereken bilgiler `PROJECT_STATUS.md` içindedir.

## 0. Ön koşullar
- Node.js (Next.js 16 ile uyumlu LTS), PostgreSQL 17, S3 uyumlu depolama, SMTP sağlayıcı, alan adı + TLS (https).
- Kod: `npm ci` → `npm run lint` → `npm test` → `npm run build` yeşil olmalı.

## 1. Ortam değişkenleri (`src/server/env.ts`)

Hepsi sunucunun gizli değer deposundan verilir; `.env` repoya girmez. Şablon: `.env.example`.

| Değişken | Production notu |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | **https://** ile başlamalı (aksi hâlde uygulama açılmaz) |
| `DATABASE_URL` | Üretim Postgres bağlantısı. `DATABASE_URL_TEST` canlıda gerekmez |
| `SESSION_SECRET` | ≥ 32 karakter, rastgele, benzersiz |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Depolama erişimi (yalnızca iki kovaya yetkili anahtar) |
| `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC` | Kova adları |
| `S3_PUBLIC_BASE_URL` | Herkese açık kovanın tarayıcıdan erişilen adresi |
| `S3_FORCE_PATH_STYLE` | Sağlayıcıya göre (`true` MinIO; çoğu bulut için `false`) |
| `EMAIL_TRANSPORT` | `smtp` (`console` canlıda e-posta göndermez) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP sağlayıcı bilgileri; `SMTP_FROM` doğrulanmış alan adı adresi |
| `PAYMENT_PROVIDER` | `none` (ödeme yok) veya sözleşme sonrası `iyzico`/`paytr`. **`simulated` kullanılamaz** |
| `PAYMENT_SIMULATION_ENABLED` | `false` (true ise uygulama açılmaz) |
| `IYZICO_*`, `PAYTR_*` | Yalnızca ilgili sağlayıcı seçildiğinde |
| `DOWNLOAD_URL_TTL_SECONDS`, `DOWNLOAD_LIMIT_DEFAULT`, `RESERVATION_TTL_MINUTES` | İş kuralı varsayılanları |
| `REFUND_REVOKES_DOWNLOADS`, `DOWNLOAD_EXPIRY_DAYS` | `process.env` üzerinden okunur (doğrulanmaz) |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | Yalnızca ilk yönetici için; iş bitince silin |

Production'da `env.ts` şunları reddeder: `PAYMENT_SIMULATION_ENABLED=true`, `PAYMENT_PROVIDER=simulated`, https olmayan `APP_URL`. Hata ayrıntısı uygulama açılışında okunabilir şekilde listelenir.

## 2. PostgreSQL
1. Yönetilen Postgres 17 (veya kendi sunucu) hazırlayın; uygulama kullanıcısı yalnızca bu veritabanına yetkili olsun.
2. Eklenti izinleri: migration `pg_trgm` ve `unaccent` eklentilerini oluşturur (`CREATE EXTENSION` yetkisi gerekir; yönetilen servislerde izin verilen eklentiler arasında olduğunu doğrulayın).
3. Şemayı uygulayın: `npm run db:deploy` (= `prisma migrate deploy`). Canlıda **asla** `db:migrate`, `db:reset` çalıştırmayın (`db:reset` veriyi siler).
4. Seed: referans veri (roller/izinler, formatlar, lisanslar, makineler…) için `npm run db:seed` bir kez çalıştırılır. **Dikkat:** seed ayrıca 11 adet `isDemo` demo ürün ekler — bkz. bölüm 8.
5. Arama: `npm run search:reindex`.

## 3. S3 kovaları ve politikalar
- **İki ayrı kova:** `private` ve `public`.
- `public`: yalnızca anonim **okuma** (GET) açık; yazma/listeleme kapalı. İçerik: ürün/kategori görselleri.
- `private`: **hiçbir anonim erişim yok** (public-read, public ACL, herkese açık politika yok). Ücretli dijital dosyalar ve özel sipariş ekleri burada; erişim yalnızca uygulamanın ürettiği kısa ömürlü imzalı URL ile.
- Uygulama anahtarına yalnızca bu iki kovada okuma/yazma/silme izni verin; hesap geneli yönetici anahtarı vermeyin.
- Yapılandırma sonrası doğrulayın: private kovadaki bir nesneye imzasız URL ile erişimin `403` döndüğünü kontrol edin.
- Kovalarda sürümleme/yaşam döngüsü ve yedek politikasını sağlayıcı panelinden ayarlayın (dosyalar tek kopyadır).

## 4. SMTP
- Sağlayıcıdan SMTP bilgileri alın; alan adı için SPF/DKIM/DMARC kayıtlarını ekleyin (aksi hâlde doğrulama/sıfırlama e-postaları spama düşer).
- Canlıda `EMAIL_TRANSPORT=smtp`. Doğrulama: kayıt ol → doğrulama e-postası gelmeli; parola sıfırlama e-postası gelmeli.
- Not: yönetici bildirimi (`ADMIN_NOTIFY_EMAIL`) şu an kodda kullanılmıyor.

## 5. Zamanlanmış iş (cron)
`npm run jobs:release-reservations` her **2–5 dakikada** bir çalıştırılmalı: süresi dolan stok rezervasyonlarını serbest bırakır, ödenmemiş siparişleri iptal eder. Örnek (Linux cron): `*/5 * * * * cd /app && npm run jobs:release-reservations >> /var/log/tulay-jobs.log 2>&1`. İş `DATABASE_URL`'ye ihtiyaç duyar. Çalışmazsa stok rezerve kalır.

## 6. Yedekleme
- PostgreSQL: günlük otomatik yedek + zaman noktasına dönüş (PITR) tercih edilir; yedekten geri dönüşü **deneyin**.
- S3 `private` kova: dijital dosyaların tek kopyası burasıdır; sürümleme veya ikinci bölgeye kopya.
- `SESSION_SECRET` ve diğer sırların güvenli kopyası saklanmalı.

## 7. İlk yönetici
1. `ADMIN_BOOTSTRAP_EMAIL` ve `ADMIN_BOOTSTRAP_PASSWORD` (≥ 12 karakter) verin (veya komut argümanı).
2. `npm run admin:create` → SUPER_ADMIN oluşur/güncellenir (önce `db:seed` ile rol tablosu dolu olmalı).
3. Giriş yapıp parolayı doğrulayın, ardından bu iki değişkeni ortamdan **silin**.
4. Diğer yöneticileri panelden (Yöneticiler) davet edin; her kişiye ayrı hesap.

## 8. Demo ürünlerin kaldırılması
Seed 11 demo ürünü `isDemo=true` ile ekler (gerçek ürün/fiyat/dosya değildir). Canlıdan önce:
1. Panelden gerçek ürünleri girin (veya CSV ile toplu yükleyin).
2. Demo ürünleri arşivleyin/silin (Ürünler → demo etiketli olanlar; `isDemo` işaretlidir, "demo" etiketi vardır).
3. Hiçbir demo ürünün `ACTIVE` kalmadığını mağaza vitrininde ve arama sonuçlarında kontrol edin; sonra `npm run search:reindex`.
Ayrıca site ayarlarındaki örnek iletişim bilgileri/yasal metinler gerçek değerlerle değiştirilmelidir.

## 9. Güvenlik başlıkları
Şu an `next.config.ts` içinde güvenlik başlığı tanımlı **değildir**. Canlıdan önce uygulama içinde veya ters vekil/CDN'de ekleyin:
`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (veya `X-Frame-Options: DENY`). CSP'yi Next.js satır içi betikleri ve S3 görsel alan adı ile birlikte deneyerek ayarlayın. Ters vekil arkasındaysanız `Origin`/Host başlıklarının `APP_URL` ile uyumlu iletildiğinden emin olun (CSRF kontrolü buna dayanır).

## 10. Çalıştırma
- `npm run build` → `npm run start` (süreç yöneticisi/konteyner ile; kapanınca yeniden başlat).
- Üretimde ters vekil (TLS sonlandırma) önünde çalıştırın; sağlık kontrolü için `GET /api/categories` kullanılabilir.
- Webhook ucunu (`/api/payments/webhook/<sağlayıcı>`) sağlayıcının IP'lerine/imzasına güvenerek herkese açık bırakın (CSRF dışı, imza doğrulamalı).

## 11. Canlıya geçiş öncesi son kontrol
- [ ] `npm run lint`, `npm test`, `npm run build` yeşil
- [ ] Production env doğrulaması geçiyor (uygulama açılıyor)
- [ ] `db:deploy` uygulandı, seed (yalnızca referans veri) çalıştı, demo ürünler kaldırıldı
- [ ] Private kova herkese kapalı, imzasız erişim `403`
- [ ] SMTP e-postaları ulaşıyor (SPF/DKIM)
- [ ] Cron çalışıyor
- [ ] İlk SUPER_ADMIN oluşturuldu, bootstrap env'leri silindi
- [ ] Güvenlik başlıkları aktif
- [ ] Yasal metinler (KVKK, mesafeli satış, iade/iptal, gizlilik, çerez) avukat onaylı girildi
- [ ] Ödeme sağlayıcı kararı: `none` ile "ödeme bekleniyor" modu **veya** sandbox'ta test edilmiş canlı sağlayıcı
- [ ] Yedekleme ve geri yükleme denendi
