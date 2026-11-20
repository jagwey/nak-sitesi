# DEPLOYMENT.md — Canlıya Alma Kontrol Listesi

Bu liste, uygulamayı gerçek bir sunucuya almadan önce yapılması gerekenleri sıralar. Müşteriden gelmesi gereken bilgiler `PROJECT_STATUS.md` içindedir.

## Ücretsiz Cloudflare vitrini

Shopier akışı için `npm run build:storefront` komutu `storefront/out` dizinine statik bir vitrin çıkarır. Canlı vitrin [Cloudflare Workers adresinde](https://nakis-vitrin.nakis-sitesi.workers.dev/) yayımlanır. Ödeme ve siparişler Shopier’de yönetilir. Yönetim paneli ve sunucu altyapısı için aşağıdaki Docker kurulumu kullanılır.

- Yayımlanacak ürünleri `storefront/catalog.json` dosyasına `name`, `description`, `image`, `priceKurus` ve `shopierUrl` alanlarıyla ekleyin. Sabit ürün adresi için `slug`, filtreler için `type` (`digital` veya `physical`), `categorySlug` ve `personalizable` kullanılabilir. `image` değeri `/products/` altında olmalı. İlgili açık görselleri `storefront/public/products/` dizinine koyun.
- `priceKurus` değerini ve Shopier bağlantısını güncel ürün kaydıyla karşılaştırın. Koleksiyon boşken etiketli demo ürünler incelemeye açılır. İlk gerçek ürün tanımlandığında canlı katalog demo ürünleri göstermez.
- Kişiye Özel Tasarım sayfası tarayıcıda monogram önizlemesi sunar. Talep alma kanalı tanımlanana kadar bu sayfa önizleme olarak çalışır.
- Cloudflare hesabına `npx wrangler@4.85.0 login` ile bağlanın. Derlemeden sonra proje kökünde `npx wrangler@4.85.0 deploy --config storefront/wrangler.jsonc` çalıştırın. Bu komut yalnızca `storefront/out` dizinini yükler. İlk yayında bağlama adımı bu sürümle doğrulandı.
- Yayımlanan adreste HTTPS’i, mobil menüyü, katalog filtrelerini, ürün galerilerini, Hakkımızda sayfasını ve monogram önizlemesini kontrol edin. Katalog doldurulduğunda Shopier düğmelerinin doğru ürünlere ulaştığını doğrulayın.

## 0. Ön koşullar
- Docker (BuildKit), PostgreSQL 17, S3 uyumlu depolama, SMTP sağlayıcı ve TLS'li alan adı.
- Kod: `npm ci` → `npm run lint` → `npm test` → `npm run build` yeşil olmalı.

### Tam siteyi sunucuda çalıştırma

`docker-compose.prod.yml`, `localhost:3000`'deki Next.js uygulamasını ve ona ait ayrı PostgreSQL 17 veritabanını çalıştırır. Geliştirme veritabanı, yerel kullanıcılar ve test yöneticileri aktarılmaz. PostgreSQL yalnızca konteyner ağında, web uygulaması sunucunun `127.0.0.1:3100` adresinde dinler. Herkese açık HTTPS adresini ters vekille bu adrese bağlayın. Statik vitrin ve tam uygulama ayrı dağıtımlardır.

1. Sunucuda `.env.example` ve bölüm 1'i kullanarak `.env.production` dosyasını hazırlayın. Üretime özel `SESSION_SECRET` ve `POSTGRES_PASSWORD` üretin. `DATABASE_URL=postgresql://nakis:<url-kodlanmış-parola>@postgres:5432/nakis` değerinde aynı parolayı kullanın. `APP_URL` ziyaretçilerin kullanacağı HTTPS adresi olmalı. Dosyanın erişimini sunucu kullanıcısıyla sınırlayın.
2. Kalıcı veritabanını başlatın ve migration işlemini uygulayın.

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml build web tools
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --wait postgres
   docker compose --env-file .env.production -f docker-compose.prod.yml run --rm tools npm run db:deploy
   ```

3. Bu mağazanın ilk yayını için, **boş veritabanında** `docker compose --env-file .env.production -f docker-compose.prod.yml run --rm tools npm run db:seed` ile 11 demo ürünü yükleyin. Bu ürünler aramada, makine/format/kasnak filtrelerinde ve sepette denenebilir. Üretimde demo ürün içeren sepet siparişe dönüşmez. Gerçek ürünle çalışan bir veritabanına tam demo seed uygulamayın.
4. `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --wait web` ile uygulamayı başlatın. SMTP ve kova ayarlarını bölümler 3–4'e göre doğrulayın. HTTPS adresinde sağlık, kayıt, giriş, e-posta doğrulama, filtreler ve sepeti kontrol edin. Aynı `workers.dev` adresi kullanılacaksa, mevcut Worker'ı yalnızca bu kontrollerden sonra doğrulanmış HTTPS yayınına bağlayın.

### Mevcut Cloudflare adresini tam mağazaya bağlama

1. Sunucuda `deploy/cloudflare/Caddyfile` dosyasını kullanın. `NAKIS_ORIGIN_HOST` geçerli TLS sertifikası olan sunucu adı, `NAKIS_PUBLIC_HOST` ziyaretçinin kullandığı Worker adı ve `NAKIS_ORIGIN_TOKEN` yalnızca Caddy ile Worker'ın bildiği rastgele bir değer olmalı. Sırrı sunucunun erişimi kısıtlı ortam dosyasında saklayın. Uygulama ve veritabanı portlarını internete açmayın. Doğrudan sunucu isteği token olmadan `404` dönmeli.
2. `npx wrangler@4.85.0 versions upload --config deploy/cloudflare/wrangler.jsonc --var NAKIS_ORIGIN:https://<sunucu-adı> --secrets-file <erişimi-kısıtlı-dosya>` ile yeni Worker sürümünü hazırlayın. Sırlar dosyası `NAKIS_ORIGIN_TOKEN` içermeli ve depo dışında olmalı. Sunucunun TLS adresi Worker'dan farklı olmalı. Yükleme mevcut yayını değiştirmez.
3. `npx wrangler@4.85.0 versions deploy <yeni-sürüm>@100% --config deploy/cloudflare/wrangler.jsonc` ile trafiği yönlendirin. Canlı adreste kayıt, oturum, filtre ve sepeti tekrar deneyin. Gerekirse `npx wrangler@4.85.0 rollback <önceki-sürüm> --config deploy/cloudflare/wrangler.jsonc` ile önceki yayına dönün.

## 1. Ortam değişkenleri (`src/server/env.ts`)

Çalışma zamanı değerlerini sunucunun gizli değer deposundan verin. `.env.example` alanları listeler. `docker run --env-file` için dosyayı repo dışında tutun ve değerleri tırnaksız `AD=değer` biçiminde yazın. Yalnızca herkese açık `S3_PUBLIC_BASE_URL` değeri derleme argümanı olarak da kullanılır.

| Değişken | Production notu |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | Mağazanın HTTPS kök adresi; CSRF, e-posta bağlantıları ve site haritası bunu kullanır |
| `DATABASE_URL` | Üretim Postgres bağlantısı. `DATABASE_URL_TEST` canlıda gerekmez |
| `SESSION_SECRET` | ≥ 32 karakter, rastgele, benzersiz |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Depolama erişimi (yalnızca iki kovaya yetkili anahtar) |
| `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC` | Kova adları |
| `S3_PUBLIC_BASE_URL` | Herkese açık kovanın HTTPS adresi; derleme ve çalışma zamanı değerleri aynı olmalı |
| `S3_FORCE_PATH_STYLE` | Sağlayıcıya göre (`true` MinIO; çoğu bulut için `false`) |
| `EMAIL_TRANSPORT` | `smtp` (`console` canlıda e-posta göndermez) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP sağlayıcı bilgileri; `SMTP_FROM` doğrulanmış alan adı adresi |
| `PAYMENT_PROVIDER` | `none` (ödeme yok) veya sözleşme sonrası `iyzico`/`paytr`. **`simulated` kullanılamaz** |
| `PAYMENT_SIMULATION_ENABLED` | `false` (true ise uygulama açılmaz) |
| `IYZICO_*`, `PAYTR_*` | Yalnızca ilgili sağlayıcı seçildiğinde |
| `DOWNLOAD_URL_TTL_SECONDS`, `DOWNLOAD_LIMIT_DEFAULT`, `RESERVATION_TTL_MINUTES` | İş kuralı varsayılanları |
| `REFUND_REVOKES_DOWNLOADS`, `DOWNLOAD_EXPIRY_DAYS` | İndirme politikasının doğrulanan varsayılanları |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | Yalnızca ilk yönetici için; iş bitince silin |

Üretim doğrulaması `PAYMENT_SIMULATION_ENABLED=true`, `PAYMENT_PROVIDER=simulated` ve HTTPS olmayan `APP_URL` değerlerini reddeder. Hatalı yapılandırmada sağlık kontrolü `503` döner.

### İmajları oluşturma

```sh
docker build --target tools -t nakis-tools .
docker build --build-arg S3_PUBLIC_BASE_URL=https://media.example.com/kovaniz -t nakis-app .
```

`tools` imajı migration, seed, yönetici ve periyodik işler için kullanılır. `nakis-app` imajı web uygulamasını ve nakış dosyası ayrıştırıcısını çalıştırır. Kök dizindeki `docker-compose.yml` yerel geliştirme servislerini başlatır.

## 2. PostgreSQL
1. Yönetilen Postgres 17 (veya kendi sunucu) hazırlayın; uygulama kullanıcısı yalnızca bu veritabanına yetkili olsun.
2. Eklenti izinleri: migration `pg_trgm` ve `unaccent` eklentilerini oluşturur (`CREATE EXTENSION` yetkisi gerekir; yönetilen servislerde izin verilen eklentiler arasında olduğunu doğrulayın).
3. Şemayı uygulayın. Aşağıdaki dağıtım komutları migration geçmişini korur ve başlangıç referans verisini oluşturur.

```sh
docker run --rm --env-file /secure/nakis.env nakis-tools npm run db:deploy
docker run --rm --env-file /secure/nakis.env nakis-tools npm run db:seed -- -- --reference-only
```

Katalog girişi tamamlanınca arama dizinini `docker run --rm --env-file /secure/nakis.env nakis-tools npm run search:reindex` ile yenileyin.

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
- `ADMIN_NOTIFY_EMAIL` verilirse yeni kişiye özel sipariş talepleri bu adrese bildirilir.

## 5. Zamanlanmış iş (cron)
Süresi dolan stok rezervasyonlarını serbest bırakmak ve ödenmemiş siparişleri iptal etmek için bu komutu her **2–5 dakikada** bir zamanlayın.

```sh
docker run --rm --env-file /secure/nakis.env nakis-tools npm run jobs:release-reservations
```

## 6. Yedekleme
- PostgreSQL: günlük otomatik yedek + zaman noktasına dönüş (PITR) tercih edilir; yedekten geri dönüşü **deneyin**.
- S3 `private` kova: dijital dosyaların tek kopyası burasıdır; sürümleme veya ikinci bölgeye kopya.
- `SESSION_SECRET` ve diğer sırların güvenli kopyası saklanmalı.

## 7. İlk yönetici
1. `ADMIN_BOOTSTRAP_EMAIL` ve `ADMIN_BOOTSTRAP_PASSWORD` (≥ 12 karakter) değerlerini ilk yönetici komutuna özel ortam dosyasına verin.
2. Referans seed tamamlandıktan sonra `docker run --rm --env-file /secure/nakis-bootstrap.env nakis-tools npm run admin:create` çalıştırın. Dosyada `DATABASE_URL` de bulunmalı.
3. Giriş yapıp parolayı doğrulayın, ardından bu iki değişkeni ortamdan **silin**.
4. Diğer yöneticileri panelden (Yöneticiler) davet edin; her kişiye ayrı hesap.

## 8. Gerçek ürünlere geçiş
Tam seed 11 demo ürünü `isDemo=true` ile ekler. Demo katalog yayını için bölüm 0'daki kurulum kullanılır. Gerçek satışa geçerken aşağıdaki kontrolleri yapın.
1. Panelden gerçek ürünleri girin (veya CSV ile toplu yükleyin).
2. Demo ürünleri arşivleyin/silin (Ürünler → demo etiketli olanlar; `isDemo` işaretlidir, "demo" etiketi vardır).
3. Hiçbir demo ürünün `ACTIVE` kalmadığını mağaza vitrininde ve arama sonuçlarında kontrol edin; sonra `npm run search:reindex`.
Site ayarları ve içerik bölümüne gerçek iletişim bilgilerini ve işletmenin sağladığı yasal metinleri girin.

## 9. Güvenlik başlıkları
`next.config.ts` üretimde CSP, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy ve çerçeve engelleme başlıklarını ekler. Ters vekilden gelen yanıtlarla birlikte bu başlıkları ve herkese açık kovadaki görselleri kontrol edin. Ters vekil, isteklerin `Origin` ve `Host` değerlerini korumalı ve güvenilen istemci IP'sinden `X-Forwarded-For` değerini oluşturmalı.

## 10. Çalıştırma
Migration ve seed sonrası web konteynerini TLS'yi sonlandıran ters vekilin arkasında başlatın. Aşağıdaki örnek ters vekilin aynı sunucuda olduğunu varsayar.

```sh
docker run -d --name nakis-web --restart unless-stopped \
  --env-file /secure/nakis.env -p 127.0.0.1:3000:3000 nakis-app
```

- `GET /api/health` PostgreSQL sorgusu başarılıysa `200 {"ok":true}`, yapılandırma veya sorgu hatasında `503 SERVICE_UNAVAILABLE` döner. Sağlık denetimi SMTP ve S3'ten bağımsızdır; bu servisleri yukarıdaki adımlarla doğrulayın.
- `/robots.txt` içinde `APP_URL` üzerinden tam `/sitemap.xml` adresini doğrulayın. Site haritasındaki ana sayfa ve yayımlanmış ürün adresleri aynı alan adını kullanmalı.
- Bir ödeme sağlayıcısı bağlandığında imza doğrulamalı webhook ucunu (`/api/payments/webhook/<sağlayıcı>`) sağlayıcının erişimine açın.

## 11. Canlıya geçiş öncesi son kontrol
- [ ] `npm run lint`, `npm test`, `npm run build` yeşil
- [ ] Docker imajı derlendi ve `/api/health`, `/robots.txt`, `/sitemap.xml` üretim adresinde doğrulandı
- [ ] `db:deploy` uygulandı ve hedeflenen katalog yüklendi. Demo yayında demo siparişi engelleniyor. Gerçek satışta demo ürünler arşivlendi.
- [ ] Private kova herkese kapalı, imzasız erişim `403`
- [ ] SMTP e-postaları ulaşıyor (SPF/DKIM)
- [ ] Cron çalışıyor
- [ ] İlk SUPER_ADMIN oluşturuldu, bootstrap env'leri silindi
- [ ] Güvenlik başlıkları aktif
- [ ] Yasal metinler (KVKK, mesafeli satış, iade/iptal, gizlilik, çerez) avukat onaylı girildi
- [ ] Ödeme sağlayıcı kararı: `none` ile "ödeme bekleniyor" modu **veya** sandbox'ta test edilmiş canlı sağlayıcı
- [ ] Yedekleme ve geri yükleme denendi
