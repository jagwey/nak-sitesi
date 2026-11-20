# Nakış Sitesi — Cursor için devir notu

Güncelleme tarihi 20 Kasım 2026.

- Canlı mağaza Cloudflare Worker üzerinden Oracle VM'deki Caddy ve Docker ile çalışan Next.js uygulamasına ulaşır. [Nakış Sitesi](https://nakis-vitrin.nakis-sitesi.workers.dev/)
- Kod `jagwey/nak-sitesi` deposunun `main` dalında. İşe başlamadan önce `AGENTS.md` ve `DEVIR.md` dosyalarını oku. [GitHub](https://github.com/jagwey/nak-sitesi)
- `52cb6ad` sürümünde Türk Bayrağı ve Doğu Türkistan Bayrağı'nın iki boyu ayrı ayrı yayına alındı. İki boyu birleştiren `d43f924` GitHub'a gönderildi, dağıtım ve katalog geçişi sürüyor.

## Mağaza

Next.js, TypeScript ve Tailwind. Ürün, hesap ve sipariş verileri Prisma üzerinden PostgreSQL'de tutulur. Ürün önizlemeleri açık MinIO kovasında, ücretli makine nakışı dosyaları özel MinIO kovasında saklanır. Kullanıcı verisini, ücretli dosyaları ve ortam sırlarını GitHub'a ekleme.

Mağazada üyelik, makine ve kasnak filtreleri, favoriler, sepet, yönetim paneli (`/admin`) ve kişiye özel teklif akışı var. Doğrudan ödeme sağlayıcısı kapalı. Shopier düğmesi, geçerli ürün adresi yönetim panelinde kaydedildiğinde açılır. İlk Shopier satışı için Filistin Bayrağı'nın gerçek bağlantısını mağaza sahibi ekleyecek.

## Bayraklar

- Türk Bayrağı ve Doğu Türkistan Bayrağı için hedef katalog kaydı, bayrak başına 185 TL'lik tek ürün. Ürün açıklamasında Standart (84 × 56 mm) ve Mini (60 × 40 mm) boylarının tek satın alıma dahil olduğu yazıyor.
- Boy başına VP3, PES ve DST var. Satış ZIP'i her iki boyda da üç formatı içerir. Yerel dosyaların konumu `Downloads/Nakış Sitesi - Bayrak Desenleri/Satis-paketleri`. Dikiş dosyaları dijital olarak yeniden açılıp doğrulandı. Kumaşta prova bekliyor.
- Site içi doğrulanmış ödeme sonrası müşteriye seçtiği formattaki iki boy için ayrı, kısa ömürlü indirme bağlantıları açılır. Yönetim panelinde aynı formattaki ikinci boyun dosya etiketi `Mini` olur. İlgili şema değişikliği `20261120220000_digital_file_download_label` migration'ında.
- `d43f924` için tip kontrolü, 159 Vitest testi, üretim derlemesi ve GitHub Docker imajı derlemesi başarılı. Dağıtım doğrulamasında iki ana ürün, eski Mini adreslerinin yönlendirmeleri ve dosya erişimi kontrol edilecek.

## Devam

Yerel kurulum ve çalıştırma için [DEVIR.md](DEVIR.md), yayın ve yedekleme için [DEPLOYMENT.md](DEPLOYMENT.md), ödeme sınırları için [PAYMENT_INTEGRATION.md](PAYMENT_INTEGRATION.md) dosyasına bak. Yerelde `npm run db:up` ve `npm run db:deploy` sonrasında `npm run dev` ile mağaza 3000 numaralı bağlantı noktasında açılır. İş bitince `npm run lint` ve `npm test` çalıştır. [PROGRESS.md](PROGRESS.md) ile [YAPILACAKLAR.md](YAPILACAKLAR.md) dosyalarını güncelle, commit oluştur ve `main` dalına gönder.
