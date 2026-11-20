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
- [ ] Bilinen teknik borç: modül import döngüleri (cart↔orders, orders↔payments, settings↔orders); bazı route'lar route() dışı Response.json
- [x] GitHub: `git init`, `.gitignore` (node_modules, .next, .env*, tsconfig.tsbuildinfo), sır kontrolü, ilk commit `main`, push → https://github.com/jagwey/nak-sitesi
- [ ] Gerçek ödeme sağlayıcısı (iyzico/PayTR) — müşterinin hesap bilgileri gerekli
- [ ] Gerçek ürünler: fotoğraf, fiyat, yalnız gerçekten var olan formatlar (demo ürünler `isDemo`)

## Açık küçük kusurlar (Phase 2'den)
- [x] Galeri yakınlaştırma düğmesi fotoğrafın altında ve 390/1440 px genişlikte klavyeyle çalışıyor
- [ ] Ürün kartı tür satırı mobilde kayıyor

## Nakış dosyaları (ayrı iş, `Belgeler\ChatGPT\Nakış desen üretimi\`)
- [x] Referans stil 140 mm: `Referans_Stil_140mm\` (Duhanedoku 9.369 dikiş, Diğer logo 7.270 dikiş)
- [ ] Duhanedoku "HANDMADE WITH LOVE" küçük yazı bozuk, papatya konturu köşeli
- [ ] `Referans_Stil_140mm\OKUBENI.md`
- [ ] Gerçek makinede test dikişi (kullanıcı)
