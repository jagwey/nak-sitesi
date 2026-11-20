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

## Codex YAPMAZ (kullanıcı bilgisi gerekli)
- Gerçek ödeme sağlayıcısı (iyzico/PayTR): satıcı hesabı gelince `PAYMENT_INTEGRATION.md`'ye göre yapılır.
- Gerçek ürün, fiyat, fotoğraf ve nakış dosyaları: kullanıcı admin panelinden yükler.
- Yasal metinler (KVKK, mesafeli satış, iade): kullanıcı veya avukat sağlar.
- Hosting, alan adı, SMTP hesabı: kullanıcı seçer.
- Logo ve sahip bilgisi: kullanıcı sonra ekler.
