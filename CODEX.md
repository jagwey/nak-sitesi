# CODEX.md: Codex için görev listesi

Önce oku: `AGENTS.md` (bağlayıcı kurallar), sonra `DEVIR.md` (kurulum ve durum), sonra `YAPILACAKLAR.md`.

## Çalışma kuralları
- **Kontrol:** Her görevden sonra sırayla `npm run lint`, `npm test`, `npm run build` çalıştır. E2E değiştiyse `npm run test:e2e` de çalıştır.
- **Kayıt ve git:** Her görev bitince `PROGRESS.md`'ye bir satır ekle, `YAPILACAKLAR.md`'de maddeyi işaretle, sonra `git add -A && git commit -m "..." && git push`. Dosyaları baştan yazma.
- **Ad:** Site adı "Nakış Sitesi". Sahip, logo ve marka bilgisi yok, sonra eklenecek. Uydurma ad, logo, fiyat, adres veya yasal metin ekleme.
- **Tasarım:** Yalnız Cormorant Garamond ve Manrope fontları, `DESIGN_SYSTEM.md` paleti. Mor/mavi gradient, eyebrow rozeti ve `transition: all` kullanılmaz.
- **Fiyat:** Fiyatlar tamsayı kuruş (`priceKurus`).
- **Nakış formatları:** Ürüne gerçekten sahip olmadığı nakış formatını (VP3/PES/DST…) ekleme.
- **Sırlar:** `.env` ve sırlar asla commit edilmez.

## Görevler (sırayla)

### 1. Galeri yakınlaştır düğmesi
`src/components/product/ProductGallery.tsx`: Yakınlaştır düğmesi fotoğrafın üstüne biniyor. Fotoğrafın dışına taşı, örneğin küçük resim satırının yanına.
- **Bitti sayılır:** 390 ve 1440 genişlikte düğme görselin üstünde değil, klavyeyle erişilebilir.

### 2. Ürün kartı tür satırı mobilde kayıyor
`src/components/catalog/` içindeki ürün kartı.
- **Bitti sayılır:** 390 px genişlikte satır kaymıyor, taşma yok, kartların yüksekliği eşit.

### 3. Import döngüleri
cart↔orders, orders↔payments ve settings↔orders arasında döngü var. Ortak tipleri ve yardımcıları ayrı bir modüle al.
- **Bitti sayılır:** `npx madge --circular src` (ya da eşdeğeri) bu döngüleri göstermiyor, testler yeşil.

### 4. Route yanıt tutarlılığı
`route()` sarmalayıcısı dışında doğrudan `Response.json` dönen API route'larını bul ve `route()`'a geçir.
- **Bitti sayılır:** Hata biçimi tüm API'lerde aynı, testler yeşil.

### 5. Canlıya hazırlık (kodla yapılabilen kısmı)
`DEPLOYMENT.md`'yi kontrol et.
- **Ekle:** Üretim için `Dockerfile` ve gerekiyorsa `docker-compose.prod.yml`, sağlık kontrolü endpoint'i (`/api/health`), `robots.txt`/`sitemap.xml` kontrolü.
- **Sırlar:** Gerçek hiçbir sır yazma, sadece `.env.example`'da yer tutucu bırak.
- **Bitti sayılır:** `docker build` başarılı ve DEPLOYMENT.md adımları baştan sona tutarlı.

### 6. Marka/sahip bilgisi için tek yer
Ad, logo, iletişim ve sahip bilgisinin yalnızca admin "Ayarlar"dan ve tek bir config'ten geldiğini doğrula. Kodda sabit "Nakış Sitesi" yazısı kalmasın.
- **Bitti sayılır:** Admin'den ad değişince header, footer, title ve e-postalar güncelleniyor.

---

## Sıradaki Canlı Yayın & Sonrası Görevler (2026-11-20 Devir — Tam Mağaza Canlıda!)

> **Güncel durum:** 1–6 arası tüm görevler ve tam mağazanın canlı yayını **TAMAMLANDI**.
> - **Canlı adres:** `https://nakis-vitrin.nakis-sitesi.workers.dev/` (Worker sürümü `bf633ab2-2527-49b8-be9e-06a4d2f5f726`, rollback için eski vitrin `67eb400e-c172-48d4-b23d-1d06c8e87604`)
> - **Sunucu:** Oracle Cloud Frankfurt `nakis-sitesi` (`VM.Standard.E2.1.Micro`, `92.5.103.221`, Oracle Linux 9.8, SSH: `ssh -i ~/.ssh/nakis-oci opc@92.5.103.221`, dizin: `/opt/nakis`, origin TLS: `https://92-5-103-221.sslip.io` — tokensız `404`, tokenlı `200`)
> - **Sırlar (yerel git dışı):** `.deploy-secrets/oracle-92_5_103_221.json` (sunucuda `/opt/nakis/.env.production` ve `/opt/nakis/.env.caddy`)
> - **İmaj derleme & güncelleme:** `main`'e push yapınca `.github/workflows/build-images.yml` otomatik `ghcr.io/jagwey/nak-sitesi-{web,tools}:latest` üretir; sunucu güncellemesi `.\scripts\deploy-oracle.ps1 -ServerIp 92.5.103.221 -SshUser opc -ImageSource ghcr` ile yapılır.

### 7. Canlı uçtan uca sepet, üyelik ve demo checkout doğrulaması — tamamlandı
`https://nakis-vitrin.nakis-sitesi.workers.dev/` üzerinde gerçek tarayıcı / API testiyle şunları doğrula ve test kayıtlarını temizle:
- `/api/cart/items` (`{ productId, quantity, format: "VP3", license: "PERSONAL" }`) ile misafir sepet çerezinin (`Secure; HttpOnly`) Cloudflare Worker üzerinden korunduğunu ve `/api/cart` yanıtında ürünün geldiğini doğrula.
- Demo ürünle `/api/checkout` isteğinin üretimde reddedildiğini doğrula.
- Kayıt + giriş oturum çerezinin canlıda çalıştığını doğrula. `EMAIL_TRANSPORT=console` yalnızca alıcıyı ve konuyu kaydeder. Doğrulama ve parola sıfırlama bağlantılarının teslimi için görev 10 gerekli.
- Test kullanıcı ve sepet kayıtlarını temizle.

### 8. İlk canlı `SUPER_ADMIN` hesabını oluşturma
Kullanıcının vereceği e-posta ile sunucuda tek seferlik `npm run admin:create` çalıştır (`ADMIN_BOOTSTRAP_EMAIL` ve `ADMIN_BOOTSTRAP_PASSWORD` ile geçici env dosyasından, iş bitince bootstrap env’lerini hemen sil) ve `/admin` girişini doğrula.

### 9. Canlı S3 nesne depolama bağlantısı (`private` + `public` kova)
Şu an sunucuda `/opt/nakis/.env.production` içinde `S3_ENDPOINT=https://s3.invalid` yer tutucusu var (demo görselleri `public/images/` içinden sunuluyor; gerçek ürün görseli veya ücretli VP3/PES dosyası yüklemek için gerçek S3 gerekli).
- Oracle Object Storage (Always Free 20 GB, Frankfurt S3 uyumlu) veya Cloudflare R2 (ücretsiz 10 GB) üzerinde `nakis-private` (tamamen kapalı, imzasız erişim `403`) ve `nakis-public` (yalnız GET açık) kovalarını oluştur.
- `.env.production` içindeki `S3_*` değişkenlerini güncelle, `S3_PUBLIC_BASE_URL` ile yeni `web` imajını derleyip yayımla, `private` kovaya imzasız erişimin `403` döndüğünü doğrula.

### 10. Canlı SMTP göndereni bağlama
Şu an `EMAIL_TRANSPORT=console`. Kullanıcıdan SMTP sağlayıcı bilgisi (ör. Brevo / Resend / Mailgun / alan adı SMTP) gelince `/opt/nakis/.env.production` içinde `EMAIL_TRANSPORT=smtp` ve `SMTP_*` alanlarını ayarla; SPF/DKIM ve canlı e-posta doğrulama + parola sıfırlama teslimini test et.

### 11. Yedekleme ve geri dönüş testi — tamamlandı
Oracle sunucusunda günlük PostgreSQL yedeklemesi kuruldu. İlk arşiv ağ bağlantısı olmayan ayrı bir PostgreSQL konteynerinde geri yüklendi ve 11 demo ürün doğrulandı. Kurulum ve saklama ayrıntıları `DEPLOYMENT.md` bölüm 6’da.

### 12. (İsteğe bağlı) Özel alan adı bağlantısı
Kullanıcı özel alan adı alınca `APP_URL`, Caddy `NAKIS_PUBLIC_HOST` / doğrudan alan adı TLS ve Cloudflare yönlendirmesini yeni alana taşı.

### 13. Ayrı iş: Nakış VP3 dosyaları (`Belgeler\ChatGPT\Nakış desen üretimi\`)
- Duhanedoku logosundaki küçük `"HANDMADE WITH LOVE"` yazısı ve köşeli papatya konturu düzeltilecek.
- `Referans_Stil_140mm\OKUBENI.md` yazılacak.

## Codex YAPMAZ (kullanıcı bilgisi gerekli)
- Gerçek ödeme sağlayıcısı (iyzico/PayTR): satıcı hesabı gelince `PAYMENT_INTEGRATION.md`'ye göre yapılır.
- Gerçek ürün, fiyat, fotoğraf ve nakış dosyaları: kullanıcı admin panelinden yükler.
- Yasal metinler (KVKK, mesafeli satış, iade): kullanıcı veya avukat sağlar.
- Hosting, alan adı, SMTP hesabı: kullanıcı seçer.
- Logo ve sahip bilgisi: kullanıcı sonra ekler.
