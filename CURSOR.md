# Nakış Sitesi — Cursor için devir notu

Güncelleme tarihi 21 Kasım 2026.

- Canlı mağaza Cloudflare Worker üzerinden Oracle VM'deki Caddy ve Docker ile çalışan Next.js uygulamasına ulaşır. [Nakış Sitesi](https://nakis-vitrin.nakis-sitesi.workers.dev/)
- Kod `jagwey/nak-sitesi` deposunun `main` dalında. İşe başlamadan önce `AGENTS.md` ve `DEVIR.md` dosyalarını oku. [GitHub](https://github.com/jagwey/nak-sitesi)
- Canlı uygulama sürümü `e33cc99`. İki boylu bayraklar `d43f924` ile yayına geçmişti. Canlı katalogda demo olmayan 14 ürün yer alıyor. Eski Mini ürünler arşivde ve önceki bağlantıları güncel ürün sayfalarına yönleniyor.

## Mağaza

Next.js, TypeScript ve Tailwind. Ürün, hesap ve sipariş verileri Prisma üzerinden PostgreSQL'de tutulur. Ürün önizlemeleri açık MinIO kovasında, ücretli makine nakışı dosyaları özel MinIO kovasında saklanır. Kullanıcı verisini, ücretli dosyaları ve ortam sırlarını GitHub'a ekleme.

Mağazada üyelik, makine ve kasnak filtreleri, favoriler, sepet, yönetim paneli (`/admin`) ve kişiye özel teklif akışı var. Doğrudan ödeme kapalı. Üç bayrak ürününün Shopier bağlantısı henüz eklenmedi. İlk satış için Filistin Bayrağı'nın Shopier ürün adresini mağaza sahibi ekleyecek.

## Bayraklar

- Türk Bayrağı ve Doğu Türkistan Bayrağı ana sayfada Filistin Bayrağı ile aynı bölümde. Her yeni bayrak 185 TL'lik tek ürün. Ürün kartında ve açıklamasında Standart (84 × 56 mm) ve Mini (60 × 40 mm) boylarının tek satın alıma dahil olduğu yazıyor. Her ürünün iki boyu gösteren altı önizlemesi var.
- Boy başına VP3, PES ve DST var. Satış ZIP'i her iki boyda da üç formatı içerir. Yerel dosyaların konumu `Downloads/Nakış Sitesi - Bayrak Desenleri/Satis-paketleri`. Dikiş dosyaları dijital olarak yeniden açılıp doğrulandı. Kumaşta prova bekliyor.
- Site içi doğrulanmış ödeme sonrası müşteriye seçtiği formattaki iki boy için ayrı, kısa ömürlü indirme bağlantıları açılır. Yönetim panelinde aynı formattaki ikinci boyun dosya etiketi `Mini` olur. İlgili şema değişikliği `20261120220000_digital_file_download_label` migration'ında.
- `d43f924` için tip kontrolü, 159 Vitest testi, üretim derlemesi ve Docker imajı derlemesi başarılı. Oracle'da veritabanı güncellemesi uygulandı. İmzalı VP3 erişimi ve eski Mini adreslerinin yönlendirmeleri canlıda doğrulandı. Vitrin ve ürün geçişleri 390 ve 1440 pikselde kontrol edildi.

## Devam

Yerel kurulum ve çalıştırma için [DEVIR.md](DEVIR.md), yayın ve yedekleme için [DEPLOYMENT.md](DEPLOYMENT.md), ödeme sınırları için [PAYMENT_INTEGRATION.md](PAYMENT_INTEGRATION.md) dosyasına bak. Yerelde `npm run db:up` ve `npm run db:deploy` sonrasında `npm run dev` ile mağaza 3000 numaralı bağlantı noktasında açılır. İş bitince `npm run lint` ve `npm test` çalıştır. [PROGRESS.md](PROGRESS.md) ile [YAPILACAKLAR.md](YAPILACAKLAR.md) dosyalarını güncelle, commit oluştur ve `main` dalına gönder.
