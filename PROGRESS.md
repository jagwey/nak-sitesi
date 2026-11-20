# PROGRESS

## 2026-11-19 — Logo nakış dosyaları (VP3)
- [x] Duhanedoku + site logoları VP3'e dijitalize edildi (pyembroidery tabanlı kendi dijitalizer).
- Çıktı: `C:\Users\Osman\OneDrive\Belgeler\ChatGPT\Nakış desen üretimi\Profesyonel_v5\` (VP3 + önizleme PNG + OKUBENI.md + nakis_raporu.json)
- Araç: `...\Nakış desen üretimi\araç\digitize.py`, `make_logos.py`
- [ ] Gerçek makinede test dikişi (kullanıcı)

## 2026-11-19 — Ana sayfa yeniden düzen
- [x] Hero: net H1, arama formu (GET /koleksiyon?q=), 6 hızlı chip; 3 giriş yolu; tek tip 4/5 kategori grid (gerçek ürün sayıları); koleksiyon bölümünde kart-içi-kart kaldırıldı. Dosyalar: src/app/page.tsx, src/components/home/HomeClient.tsx
- Ekran görüntüleri: screenshots/wip-home/ (overflow=false, errors=0)

## 2026-11-19 — Katalog / arama UX (koleksiyon)
- [x] CatalogClient, FilterSidebar, ProductCard, SearchOverlay: catalogSync, facet sayıları, "Kasnağıma sığanlar", aktif filtre çipleri, boş durum, tam yükseklik mobil filtre paneli, öneri listesi (↑↓ Enter Esc), dijital/fiziksel satırı
- lint temiz, npm test 10/10; ekran görüntüleri: screenshots/wip-catalog/

## 2026-11-19 — PDP dijital/fiziksel ayrımı
- [x] ProductDetailClient yeniden düzenlendi: "Ne alıyorsunuz?" bloğu, "Makinem uyumlu mu?" (+Listede yok), adet stepper, kişiselleştirme sayacı (18), stok/üretim/kargo satırları ("Bilgi yakında" fallback), sepet geri bildirimi, mobil sticky bar (safe-area).
- [x] Yeni: src/components/product/ProductSpecs.tsx (dl spec + demo veri notu). Lint temiz, 1440/390/320 overflow=false errors=0.
- Ekran görüntüleri: screenshots/wip-pdp/
- [x] "PDF üretim kartı" / "doğrulanmış" / "anında" iddiaları demo veri, sepet ve kartlardan kaldırıldı.

## 2026-11-19 — Premium tasarım incelemesi (kapanış)
- [x] Servis katmanı `src/services/catalog.ts`, `BACKEND_REQUIREMENTS.md`, `DESIGN_REVIEW.md`
- [x] lint temiz, npm test 10/10, build OK, 49/49 taşma yok, etkileşim 9/9 PASS
- Ekran görüntüleri: screenshots/before, review-1, review-1b, review-2, after (+after/interactions)
- Scriptler: `scripts/shoot.mjs` (ROUTES/WIDTHS/FULL), `scripts/interact.mjs`
- [ ] Açık: galeri yakınlaştır düğmesi fotoğraf üstünde, kart tür satırı mobilde kayıyor, bazı sayfalar PRODUCTS'ı doğrudan okuyor

## 2026-11-19 — Backend Faz A (temel)
- [x] docker-compose (postgres:17 :5433 nakis+nakis_test, minio, mailpit), .env/.env.example, Prisma 7 şema + init migration (pg_trgm/unaccent GIN), seed (11 demo ürün, isDemo), `admin:create`
- [x] `src/server/*`: env, db, http `route()`, errors, rate-limit, audit, crypto; auth (argon2id, session, rbac), e-posta (Mailpit/console), account (adresler, IDOR güvenli); API: /api/auth/*, /api/me/*
- [x] vitest: 20/20 (4 unit + 16 integration; npm test eski search testi dahil), lint temiz, build OK
- [ ] Açık: ödeme/sipariş/indirme/admin API'leri sonraki faz; UI değişmedi
- [Phase B] Katalog/arama/favori/storage/upload/nakis-parse backend + UI DB'ye bağlandı (home, /koleksiyon, /urun, sitemap server component); lint temiz, 68 vitest + search.test geçti, build OK; screenshots: screenshots/phase3-catalog (after ile aynı). Dev DB için: npm run search:reindex.

- Faz C (commerce) bitti: cart/coupon/checkout/orders/inventory/payments(webhook+simulated)/shipping/downloads servis+API, store server-backed, UI /sepet /odeme /giris /kayit /sifremi-unuttum /sifre-sifirla /e-posta-dogrula /hesabim /favoriler; lint+68 test+build OK; job: `npm run jobs:release-reservations` (scripts/release-reservations.ts); screenshots: screenshots/phase3-commerce
- 2026-11-20 — Faz B+C doğrulandı (ana oturum): lint temiz, vitest 68/68, build OK; Faz D1 (admin ürün/dosya/CSV) ve D2 (sipariş/müşteri/kupon/özel talep/CMS) paralel ajanlarla başladı
- [Phase D1] alt-görev 1/N: src/lib/money.ts (parseTlToKurus, applyPercent) + src/lib/slug.ts yazıldı; sıradaki: admin-catalog servisleri, UI kit, sayfalar, API, testler
- [Phase D2] alt-görev 0: keşif bitti; sıradaki: docs/schema-requests.md, settings/cms servisi (src/server/modules/settings), admin-orders, custom-orders, sayfalar, testler. Kural: her alt-görevde buraya 1 satır eklenecek.
- [Phase D2] alt-görev 1: settings/cms servisi (src/server/modules/settings/{schema,service}.ts) + /api/admin/settings, /api/admin/content yazıldı; webhook policy (indirme limiti/süre/iade) settings "policy" anahtarından okuyor (env fallback); docs/schema-requests.md eklendi
- [Phase D1] alt-görev 2: admin-catalog/products.ts (CRUD, publish kuralları, liste, form seçenekleri) yazıldı; sıradaki: tsc doğrulama, images/files/taxonomy/inventory/import/bulk/dashboard servisleri
- [Phase D2] alt-görev 2: e-posta şablonları eklendi (custom_request_received, order_cancelled, order_refunded, admin_invite; quote_sent genişledi); webhook applyEvent export edildi (manuel ödeme için)
- [Phase D2] alt-görev 3: admin-orders servisi (src/server/modules/admin-orders) + /api/admin/orders/** (liste, detay, status, shipments, cancel, refund, manual-payment) yazıldı; UI/test sırada
- [Phase D1] alt-görev 3: admin-catalog media.ts (görsel/nakış dosyası yükleme) + taxonomy.ts (kategori/koleksiyon/etiket) yazıldı, tsc temiz
- [Phase D1] alt-görev 4: servisler tamam (inventory, bulk, import+csv, dashboard, guard); tsc temiz. Sıradaki: API route'ları, UI kit, sayfalar, testler
- [Phase D2] alt-görev 4: customers (KVKK export/anonymize), coupons, downloads, audit, admins servisleri + /api/admin/{customers,coupons,downloads,audit,admins}/** yazıldı (tsc temiz); sırada custom-orders
- [Phase D1] alt-görev 5: tüm /api/admin/{products,files,categories,collections,tags,inventory,import,bulk,dashboard,uploads} route'ları yazıldı
- [Phase D1] alt-görev 6: ChromeGate eklendi (layout.tsx'te /admin için storefront chrome gizli); bulk şeması düz strictObject'e çevrildi
- D2 not: src/server/http.ts readBody: tekrarlanan multipart FILE alanlari artik dizi (multi-upload icin); metin alanlari degismedi.
- D2 alt-gorev 5a: custom-orders servis/schema + /api/custom-orders, /api/me/custom-orders, /api/admin/custom-orders yazildi (tsc temiz); siradaki: Studio gercek submit, AccountClient sekmesi, teklif sayfasi, testler
- D2 alt-gorev 5b: CustomOrderStudio gercek multipart submit (telefon/teslim/butce/KVKK/honeypot/coklu dosya) bitti; siradaki: /hesabim Ozel taleplerim sekmesi + misafir teklif sayfasi
- D1 UI kit (src/components/admin: AdminShell, primitives, Uploader, ConfirmDialog, adminFetch; API in index.ts), /admin layout+dashboard hazır.
- D2 alt-gorev 5c: /hesabim Ozel taleplerim sekmesi (MyCustomRequests), misafir /kisiye-ozel/teklif/[token] sayfasi yazildi (tsc temiz); siradaki: custom-orders + admin-ops testleri, sonra admin sayfalari (D1 kiti artik mevcut)
- D1 ürün listesi/yeni/[id] sayfaları + ProductForm/Images/Files/List (toplu işlem çubuğu) hazır; tsc temiz.
- [D2] alt-görev 9a: tests/integration/admin-ops.test.ts (8 test: RBAC 401/403, ship vs admin yönetimi, son süper admin, geçersiz geçiş, iptal stok, iade+indirme iptali, settings javascript: reddi, KVKK anonimleştirme) yeşil.
- [D2] alt-görev 9b: tests/integration/custom-orders.test.ts (8 test: görsel yükleme, sahte görsel 415, honeypot, KVKK, misafir akışı PENDING_PAYMENT/ödenmedi, IDOR 404, 403, yanlış token) yeşil.
- [D1] alt-görev: kategoriler/koleksiyonlar/etiketler sayfaları + TaxonomyManagers.tsx hazır; tsc temiz.
- [D1] alt-görev: dosyalar/stok/toplu-islem sayfaları + OpsClients.tsx hazır; tsc temiz.
9c: admin pages (server wrappers) + Orders.tsx, shared.tsx yazildi; kalan ops bilesenleri: Customers, Coupons, Downloads, CustomOrders, Admins, Audit, Settings, Content
- [D1] alt-görev 8: tests/integration/admin-catalog.test.ts (13 test: RBAC 401/403, sayfa guard, Ürün Yöneticisi, yayın doğrulaması, sahte magic bytes, TL→kuruş, toplu % matematik, CSV önizleme/commit/all_or_nothing, audit, arama) yeşil; docs/schema-requests.md Category SEO eklendi.
9d: admin ops bilesenleri (Customers, Coupons, Downloads, CustomOrders, Admins, Audit, Settings, Content) yazildi; lint dogrulamasi siradaki
- [D1] lint/test(97)/build yeşil.
10: storefront ayar/CMS baglandi (Footer, AnnouncementBar, hero, hakkimizda, bilgi legal+iletisim); varsayilan metinler korunur
- [D1] alt-görev 9: scripts/shoot-admin.mjs + screenshots/phase3-admin (8 görsel, taşma yok, konsol hatası yok); panel rakamları Manrope'a, sihirbaz başlıkları rakamsız düzeltildi. D1 tamam.
11a: lint/test(97)/build OK
11b: screenshots/phase3-ops (admin siparisler/ozel-siparisler/ayarlar + 6 sayfa + kisiye-ozel, 390/1440): overflow yok, konsol hatasi yok. D2 bitti. Not: dev DB'de d2shots@/d2shots2@example.com test adminleri var (parola kayitli degil).
- 2026-11-20 — Faz D1+D2 doğrulandı (ana oturum): lint temiz, vitest 97/97 (13 dosya), build OK. Sıradaki: ajan E (şema düzeltme + E2E) ve DOCS paralel
- [E] alt-görev 1: migration 20261120120000_phase3_custom_order_fields (CustomOrder sütunları, Category SEO, User.anonymizedAt + co.meta/co.token veri taşıma) nakis+nakis_test'e uygulandı; custom-orders/admin kategori/anonymize gerçek sütunlara geçti; testler yeşil
- 2026-11-20 — DOCS: DATABASE_SCHEMA.md ve API_DOCUMENTATION.md yazıldı (docs ajanı)
- 2026-11-20 — DOCS: ARCHITECTURE, SECURITY, PAYMENT_INTEGRATION, DEPLOYMENT yazıldı; .env.example yorumları Türkçeleştirildi (docs ajanı)
- [E] alt-görev 2: AnnouncementBar akışa alındı (layout: bar in-flow + sticky h-0 sarmalayıcı, Header absolute); 390/1440 ekran görüntüleri screenshots/phase3-e, taşma yok, bar tekrar kapatıldı (scripts/set-announce.ts on|off)
- 2026-11-20 — DOCS: AGENTS.md (Faz 3 kuralları) güncellendi (docs ajanı)
- 2026-11-20 — DOCS: README, BACKEND_REQUIREMENTS, PROJECT_STATUS, TEST_REPORT, ADMIN_GUIDE yazıldı; tüm belge listesi tamam (docs ajanı)
- 2026-11-20 — [E] alt-görev 3-5: Playwright E2E 8 test yeşil (tests/e2e, seed tsx alt-süreçte); dev test adminleri silindi; lint temiz. Ek 7-10: güvenlik başlıkları (next.config.ts CSP/HSTS prod), env.ts doğrulama (simülasyon sırrı zorunlu, fallback yok, UPLOAD_MAX_MB uygulandı), new_custom_order admin e-postası, customer:write izni (status/resend/anonymize). vitest 14 dosya/100 test, build OK.

## 2026-11-20 — Nötr yeniden adlandırma (Nakış Sitesi)
- [x] Kişi/marka adı her yerden kaldırıldı; ad "Nakış Sitesi", slug `nakis-sitesi`, DB `nakis`/`nakis_test` (rol `nakis`), kovalar `nakis-private`/`nakis-public` (yerel altyapı taşındı, nesneler kopyalandı); Header/Footer/Admin/Hakkımızda metin wordmark; icon.tsx + opengraph-image.tsx nötr; logo/ ve public/brand/ git dışı (.gitignore, dosyalar diskte)
- [x] AGENTS.md §2 ve DESIGN_SYSTEM.md logo kuralı güncellendi; lint, test 100/100, build, e2e 8/8 yeşil; ekran görüntüleri screenshots/rebrand/
- 2026-11-20 — Nötr ad 'Nakış Sitesi' doğrulandı (ana oturum): grep boş, lint/test 100/100/e2e 8/8/build OK; eski commit geçmişi kullanıcı kararıyla olduğu gibi bırakıldı (sitede ad yok).

## 2026-11-20 — CODEX.md görevleri
- [x] Galeri yakınlaştırma düğmesi görselin altına taşındı. 390/1440 px konum ve klavye testi 2/2, önceki E2E testleri 8/8, lint/test 100/100/build başarılı.
- [x] Mobil katalogda 390 px genişlikte kartlar eşit yükseklikte, ürün türü tek satırda ve taşma yok. Lint/test 100/100/build ve E2E 11/11 başarılı.
- [x] Sepet, sipariş, ödeme ve ayarlardaki çapraz bağımlılıklar ortak varsayılanlar ve sipariş kilidiyle ayrıldı. TypeScript içe aktarma grafiği 260 kaynak dosyada ve 20 sunucu modülünde 0 döngü gösterdi. Lint/test 100/100/build başarılı.
- [x] API JSON yanıtları ortak serileştirmeye taşındı. Özel sipariş testinde başarı/hata başlıkları ve hata gövdesi doğrulandı. Lint/test 100/100/build başarılı.
- [x] Üretim Docker imajı, sağlık kontrolü, robots.txt, site haritası ve dağıtım rehberi tamamlandı. Temiz PostgreSQL'de migration, demo ürünsüz seed, yönetici, arama ve stok işi doğrulandı. Konteyner sağlık 200/503, SEO uçları, görsel optimizasyonu ve Python kontrolleri geçti. Lint/test 102/102/build başarılı.
- [x] Mağaza adı, logo, işletme sahibi ve iletişim tek Ayarlar kaydına bağlandı. Üst ve alt bilgi, sayfa başlıkları ve e-posta gönderen adı aynı ayarı okuyor. Lint, test 103/103, build, E2E 12/12 ve son üretim imajı kontrolleri başarılı.

## 2026-11-20 — Shopier vitrini
- [x] Mevcut ana sayfa görseli ve tasarım sistemiyle Cloudflare Pages için bağımsız vitrin derlemesi. Demo ürünler dosyalara alınmadı. Shopier bağlantısı, görsel yolu ve kuruş fiyatı derlemede doğrulanıyor. Lint, test 110/110, ana uygulama ve vitrin derlemeleri başarılı. Yerel Pages önizlemesi 390/1440 px, görseller, font, gezinti ve güvenlik başlıkları kontrol edildi.
- [x] Ücretsiz vitrin `https://nakis-vitrin.nakis-sitesi.workers.dev/` adresinde yayımlandı (`b26ae693-85a4-47ee-a093-95f7b161ed3a`). `pages.dev` adresi yerel bağlantıdan açılmadığı için Cloudflare Workers Static Assets kullanıldı. Canlı HTTPS yanıtı, 390/1440 px tarayıcı görünümü, görseller, yazı tipi, bağlantılar ve `/admin` için 404 doğrulandı.
- [x] Vitrin ana sitenin menüsü, kategorileri, Hakkımızda sayfası ve monogram önizlemesiyle genişletildi. Arama, filtreler, 11 etiketli demo ürün ve ürün galerileri eklendi. Gerçek katalog girildiğinde demo ürünler kalkar. Lint, test 113/113, ana uygulama ve vitrin derlemeleri başarılı. Cloudflare sürümü `67eb400e-c172-48d4-b23d-1d06c8e87604`. Canlı HTTPS adresinde 320, 390 ve 1440 piksel genişliklerde menü, filtreler, galeri, Hakkımızda ve monogram önizlemesi doğrulandı.

## 2026-11-20 — Tam mağazanın yayın hazırlığı
- [x] Yerel mağazanın aynı kaynak kodu için üretim Compose kurulumu ve demo checkout koruması hazır. Lint, Vitest 114/114, Playwright 12/12, Next.js ve Docker derlemeleri başarılı. Yerel üretim provasında HTTPS, temiz PostgreSQL kurulumu, 11 demo ürün, VP3/PFAFF filtreleri, sepet, üyelik, Mailpit üzerinden doğrulama, giriş ve demo siparişin reddi doğrulandı.
- [x] Chrome'da Oracle Cloud oturumu doğrulandı. Frankfurt'ta ayrı ağda Always Free uyumlu Ubuntu 24.04 Arm sunucusu için form hazırlandı.
- [x] Frankfurt'ta 200 GB ücretsiz disk kotasının 153 GB'ı kullanılabilir. Yeni sunucuya SSH ve HTTPS erişimi kullanıcı tarafından onaylandı.
- [x] Tam mağaza için Cloudflare yönlendirmesi ve Caddy yapılandırması hazır. İmzalanmış oturum çerezleri, yönlendirmeler ve istemci IP başlıkları için testler eklendi. Lint, 120/120 test, Worker prova derlemesi ve Caddy yapılandırma kontrolü geçti.
- [x] Oracle Always Free `VM.Standard.E2.1.Micro` (1 GB RAM, AMD x86_64) uyumluluğu yerel Docker bellek sınırlarıyla doğrulandı (Postgres ~78 MiB, Next.js ~217 MiB, Caddy ~12 MiB; toplam ~307 MiB, OOM yok; tokensız 404, tokenlı 200). `deploy/oracle/docker-compose.micro.yml`, `deploy/oracle/setup-vm.sh` ve tek komutluk `scripts/deploy-oracle.ps1` eklendi; `.gitignore` ve `DEPLOYMENT.md` güncellendi. Lint, 120/120 test ve build yeşil.
- [x] Oracle Cloud Frankfurt `nakis-sitesi` (`VM.Standard.E2.1.Micro`, `92.5.103.221`, Oracle Linux 9.8, VCN `nakis-vcn` TCP 22/80/443 açık) sunucusu kuruldu (2 GB ek swap, Docker CE, `firewalld`, 3 dk rezervasyon cron). `.github/workflows/build-images.yml` ile `ghcr.io/jagwey/nak-sitesi-{web,tools}:latest` derlenip sunucuya çekildi; PostgreSQL 17 + Prisma migration + 11 demo ürün seed + `search:reindex` + Next.js + Caddy TLS (`https://92-5-103-221.sslip.io`, tokensız `404` / tokenlı `200`) doğrulandı. Cloudflare Worker sürümü `bf633ab2-2527-49b8-be9e-06a4d2f5f726` %100 trafikle `https://nakis-vitrin.nakis-sitesi.workers.dev/` adresine bağlandı. Canlı HTTPS doğrulaması: `/api/health` 200, `/robots.txt` + `/sitemap.xml` 200, `/admin` 307→`/giris?next=/admin`, HSTS/CSP/XFO/CSRF 403, Chrome 1440/390 px 0 kırık görsel, 0 taşma, 0 konsol hatası; canlı VM belleği ~314 MiB (Caddy 17 MiB, Web 240 MiB, Postgres 58 MiB; 348 MiB RAM + 2.29 GB swap boş).
- [x] Canlı mağazada VP3 misafir sepeti ve `Secure`/`HttpOnly` çerezleri, kayıt ve ayrı giriş, misafir sepetinin hesaba aktarılması ve demo siparişin reddi doğrulandı. Test hesabı, sepet ve bildirim kayıtları temizlendi; katalogda 11 demo ürün duruyor. Canlı Chrome ana sayfası tam mağaza menüsü ve görselleriyle kontrol edildi.
- [x] Oracle sunucusunda günlük PostgreSQL yedeklemesi ve 14 günlük saklama kuruldu. İlk arşiv root erişimiyle kaydedildi, ayrı ve ağ bağlantısı olmayan PostgreSQL konteynerine geri yüklendi ve 11 demo ürün doğrulandı.

## 2026-11-20 — Canlı mağaza yönetimi
- [x] Mevcut mağaza hesabına Süper Yönetici rolü atandı, işlem denetim kaydına yazıldı ve eski oturumlar kapatıldı.
- [x] Hesabım ekranına yetkili kullanıcılar için Yönetim Paneli bağlantısı eklendi. Moderatör rolü yalnızca kişiye özel talepleri yönetir. SMTP kapalıysa davet bağlantısı Süper Yöneticiye gösterilir. Lint ve 121/121 test başarılı.
- [x] Oracle VM'nin kalıcı diskinde erişime kapalı nakış dosyaları ve herkese açık görseller için ayrı MinIO kovaları kuruldu. Uygulama anahtarı yalnız nesne işlemlerine yetkili.
- [x] `d041b34` üretim imajı Oracle'da yayımlandı. Geçici Ürün Yöneticisi ile panel, taslak ürün, WebP görsel yükleme, gerçek VP3 yükleme ve otomatik metadata okuma doğrulandı. Özel dosya imzasız 403 döndürdü. İmzalı indirme yüklenen baytlarla birebir eşleşti. Geçici hesap ve taslak temizlendi, 11 demo ürün duruyor. 390 px Chromium'da Hesabım bağlantısı ve davet formu doğrulandı.

## 2026-11-20 — Özgün makine nakışı koleksiyonu
- [x] 12 desen için 36 gerçek VP3, PES ve DST dosyası, 36 dikiş önizlemesi ve teslim arşivi hazırlandı. Her dosya yeniden okunarak dikişleri ve 100 × 100 mm kasnağa sığdığı kontrol edildi. Ürünler gerçek dosyaları ve 155–200 TL fiyatlarıyla canlı yönetim paneline taslak aktarıldı.
- [x] 3 farklı desene %10, 5 farklı desene %20 sepet indirimi eklendi. İndirim fiziksel ürünlere ve demolara uygulanmaz. Fiziksel ve baskı alışverişi için kişiye özel teklif akışı eklendi. Ödeme sağlayıcısı kapalıyken sipariş oluşturulmaz. Lint, 122/122 test ve üretim derlemesi başarılı.
