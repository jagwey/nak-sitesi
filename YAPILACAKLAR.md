# YAPILACAKLAR — Nakış Sitesi

> Token/limit biterse yeni oturum buradan devam eder. Her alt görev bitince **hemen** güncellenir.
> Kural: `[x]` bitti, `[~]` devam ediyor, `[ ]` yapılacak. Ayrıntı ve dosya yolları → `PROGRESS.md`.

## Şu an çalışan
- (yok)

## Yapılanlar
- [x] Faz E — migration, E2E 8/8, güvenlik başlıkları, env doğrulama, özel talep e-postası, customer:write (lint temiz, test 100/100, build OK)
- [x] Nötr ad "Nakış Sitesi": isim/logo kaldırıldı, sahip bilgisi yer tutucu, DB/kova `nakis`, ekran görüntüleri `screenshots/rebrand/` (yerel); eski git geçmişi kullanıcı kararıyla bırakıldı
- [x] Phase 2 — premium tasarım incelemesi (lint temiz, test 10/10, build OK, 49/49 taşma yok)
- [x] Faz A — altyapı: Docker (Postgres, MinIO, Mailpit), Prisma şema + migration, seed, auth/rol, e-posta (test 20/20)
- [x] Faz B — katalog, arama, favori, depolama, dosya yükleme, nakış dosyası parse; UI veritabanına bağlı (test 68/68)
- [x] Faz C — sepet, kupon, ödeme akışı (simüle), sipariş, stok, kargo, dijital indirme; hesap sayfaları (test 68/68, build OK)

## Yapılacaklar
- [x] Faz D1 — admin kabuğu, panel, ürün CRUD, VP3/PES yükleme, kategori/koleksiyon/etiket, stok, CSV içe aktarma (test 97/97, build OK)
- [x] Dev DB'deki test yöneticisi `d1-admin@example.com` (yalnız yerel) — yayın öncesi silinmeli
- [x] Faz D2 — admin sipariş/müşteri/kupon/indirme kaydı, yöneticiler, denetim, ayarlar + CMS, kişiye özel talep akışı (test 97/97, build OK)
- [x] Dev DB test yöneticileri `d2shots@example.com`, `d2shots2@example.com` — silinmeli (ajan E)
- [x] Faz B+C sonrası doğrulama (ana oturum): lint temiz, test 68/68, build OK, ekran görüntüleri tasarımla uyumlu
- [x] Faz D sonrası lint + test + build + ekran görüntüsü kontrolü
- [x] Dokümanlar: README, AGENTS, ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION, BACKEND_REQUIREMENTS, SECURITY, ADMIN_GUIDE, PROJECT_STATUS, TEST_REPORT, DEPLOYMENT, PAYMENT_INTEGRATION, .env.example
- [x] Sepet, sipariş, ödeme ve ayar modüllerinin içe aktarma döngüleri giderildi
- [x] API JSON yanıtları ortak yardımcıya taşındı
- [x] Üretim Docker imajı, sağlık kontrolü, robots.txt, sitemap.xml ve dağıtım rehberi
- [x] Ücretsiz Cloudflare için Shopier bağlantılı vitrin derlemesi
- [x] Ücretsiz Cloudflare Workers vitrini yayını ve HTTPS kontrolü
- [x] Canlı vitrinde mevcut siteyle uyumlu menü, Hakkımızda, Kişiye Özel Tasarım önizlemesi, arama ve demo ürün sayfaları
- [x] Tam mağaza için üretim kurulumu ve 11 demo ürünle yerel HTTPS provası, demo checkout koruması, üyelik ve sepet doğrulaması
- [x] Chrome'da Oracle Cloud hesabına erişim ve ücretsiz sunucu formunun hazırlanması
- [x] Ücretsiz disk kotası, kullanıcı onayı ve tam mağaza için Cloudflare yönlendirme yapılandırması
- [x] Oracle Always Free `VM.Standard.E2.1.Micro` (1 GB RAM) bellek provası (~307 MiB toplam, OOM yok) ve tek komutluk dağıtım kiti (`deploy/oracle/*`, `scripts/deploy-oracle.ps1`)
- [x] Oracle sunucusunun (`92.5.103.221`, `VM.Standard.E2.1.Micro`) kurulumu, GHCR imaj yayını (`build-images.yml`), Caddy HTTPS (`92-5-103-221.sslip.io`) ve tam mağazanın `https://nakis-vitrin.nakis-sitesi.workers.dev/` adresinden canlıya alınması (`bf633ab2-2527-49b8-be9e-06a4d2f5f726`)
- [x] Canlı HTTPS üzerinden VP3 misafir sepeti, güvenli çerezler, kayıt/giriş, misafir sepetinin hesaba aktarılması, demo siparişin reddi ve test verisi temizliği
- [x] Kullanıcının mevcut canlı hesabına `SUPER_ADMIN` rolü ve denetim kaydı eklendi.
- [x] Hesabım panel bağlantısı, Moderatör rolü ve tek kullanımlık davet akışı uygulandı.
- [x] Canlı PostgreSQL için günlük yedekleme ve ayrı konteynerde geri yükleme provası
- [x] Canlıda panelden taslak ürün, WebP görsel, gerçek VP3 yükleme ve imzalı indirme doğrulandı. Geçici doğrulama verileri temizlendi.
- [ ] MinIO nesneleri için ayrı yedek ve geri yükleme provası.
- [ ] Canlı e-posta doğrulaması ve parola sıfırlama için SMTP göndereni ayarla
- [ ] Shopier’de ilk olarak yalnızca Filistin Bayrağı’nı listele, dijital teslim ZIP’ini yükle ve ürün adresini yönetim paneline ekle (mağaza sahibi).
- [ ] Yeni PNG'ler geldikten sonra referans VP3'lerin dikiş standardıyla yeni desenleri hazırla. Diğer ürünlerin satışı kapsam netleşince açılacak.
- [ ] Canlı vitrinde kişiye özel talepler için işletmenin doğrulanmış iletişim kanalı
- [x] Mağaza adı, logo, işletme sahibi ve iletişim ayarları tek kayıtta; güncellemeler vitrinde, başlıklarda ve e-postada doğrulandı
- [x] GitHub: `git init`, `.gitignore` (node_modules, .next, .env*, tsconfig.tsbuildinfo), sır kontrolü, ilk commit `main`, push → https://github.com/jagwey/nak-sitesi
- [ ] Gerçek ödeme sağlayıcısı (iyzico/PayTR) — müşterinin hesap bilgileri gerekli
- [x] Dijital nakış kataloğuna gerçek desenler, fiyatları ve doğrulanmış formatlar eklendi. Demo ürünler arşivlendi.
- [x] Canlı katalogdaki 11 demo ürün kalıcı olarak silindi. 12 gerçek desen için Shopier yükleme paketi ve ürün bağlantısı alanı hazırlandı.
- [x] Shopier bağlantısı alanı ve satın alma düğmesi olan sürüm canlıya alındı.
- [x] Ana sayfanın kategori kapakları aktif katalogdan besleniyor ve Filistin Bayrağı öne çıkarılıyor.
- [x] Yeni VP3'ler için yoğun saten, katmanlı dolgu ve dikiş önizlemesi kuralları eklendi.
- [x] Güncellenen ana sayfa canlıya alındı. Beş kategori kapağı ve Filistin Bayrağı kartı masaüstünde ve mobilde doğrulandı.
- [x] Vitrin görsel boyutları, bekleyen filtre durumu, gereksiz ön yüklemeler ve açık dosya önbelleği iyileştirildi. Shopier düğmesi fiyatla hizalandı, kampanya gösterimi satın alınabilen desen sayısına bağlandı.
- [x] Canlı mağazada küçük görselleri, tarayıcıya özel verileri önbellekten ayıran iki dakikalık anonim ana sayfa önbelleğini ve mobil açılış süresini doğrula.
- [ ] En az üç desen Shopier’de satışa açıldığında gerçek sepet indiriminin ödeme adımında uygulandığını doğrula ve öne çıkan duyuruya ekle.

## Açık küçük kusurlar (Phase 2'den)
- [x] Galeri yakınlaştırma düğmesi fotoğrafın altında ve 390/1440 px genişlikte klavyeyle çalışıyor
- [x] 390 px mobil katalogda ürün türü hizalı ve tek satır, kart yükseklikleri eşit

## Nakış dosyaları (ayrı iş, `Belgeler\ChatGPT\Nakış desen üretimi\`)
- [x] Referans stil 140 mm: `Referans_Stil_140mm\` (Duhanedoku 9.369 dikiş, Diğer logo 7.270 dikiş)
- [ ] Duhanedoku "HANDMADE WITH LOVE" küçük yazı bozuk, papatya konturu köşeli
- [ ] `Referans_Stil_140mm\OKUBENI.md`
- [ ] Gerçek makinede test dikişi (kullanıcı)

## Özgün makine nakışı koleksiyonu
- [x] 12 özgün dijital desenin VP3, PES ve DST dosyaları, ürün başına üç dikiş önizlemesi ve fiyatları canlı panele taslak olarak aktarıldı.
- [x] Sepet desen kampanyası ve fiziksel/baskı ürünleri için kişiye özel teklif akışı hazır.
- [x] Yeni mağaza sürümü Oracle'a dağıtıldı. 12 desen, 36 önizleme, VP3/PFAFF/10×10 kasnak filtresi ve sepet kampanyası canlıda doğrulandı.
- [ ] Fiziksel makinede prova dikişi yap.
