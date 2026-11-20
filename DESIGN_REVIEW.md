# DESIGN_REVIEW.md — Aşama 2 Premium Tasarım İncelemesi (2026-11-19)

Kapsam: yalnızca ön yüz. Backend, gerçek ödeme ve yayın yok. Tüm ürün, fiyat ve görseller **demo veridir**.

## 1. Başlangıç denetiminde bulunan sorunlar (`screenshots/before/`)
| Alan | Sorun |
|---|---|
| Ana sayfa | Hero ilk bakışta *ne satıldığını* söylemiyordu; ana sayfada arama yoktu; kategoriye hızlı erişim için çok kaydırma gerekiyordu. |
| Ana sayfa | Koleksiyon vitrininde kenarlıklı kutu içinde kart (kart içi kart). |
| Metin dürüstlüğü | Demo veride "doğrulanmış format", "anında indirme", "PDF üretim kartı ile teslim" gibi karşılığı olmayan iddialar. |
| Arama | Filtre seçeneklerinde sonuç sayısı yok, aktif filtreler görünmüyor, boş durum öneri vermiyor, kasnak filtresi "tam eşleşme" gibi çalışıyordu. |
| Arama | `src/lib/search.ts` içinde regex sınırları (`\b`) bozuk backspace baytı olarak kaydedilmişti; kelime sınırlı niyet ayrıştırma çalışmıyordu. |
| Arama tipografisi | Cormorant'ta "0 sonuç" ifadesindeki rakam "o" harfi gibi okunuyordu. |
| PDP | Dijital ve fiziksel ürünün ne teslim ettiği ayrışmıyordu; galeri okları ve bazı kontroller 44px altıydı. |
| Veri katmanı | Bileşenler `PRODUCTS` dizisini doğrudan okuyordu; backend'e geçiş noktası yoktu. |

## 2. Yapılan iyileştirmeler
**Ana sayfa** — H1 "Nakış makinesi desenleri ve el işi tekstiller"; alt metinde mevcut formatlar; GET arama formu (`/koleksiyon?q=`); 6 hızlı arama çipi (VP3, PFAFF, 10×10 kasnak, bebek, havlu, paket); dijital / fiziksel / kişiye özel üç giriş yolu; gerçek ürün sayılı tek tip kategori ızgarası; kart-içi-kart kaldırıldı; sekmeler 44px.

**Arama ve filtre** — Facet sayıları (0 olan seçenek soluk), "Kasnağıma sığanlar" (döndürme dahil sığma mantığı), aktif filtre çipleri + "Tümünü temizle", öneri içeren boş durum, mobil tam yükseklik filtre paneli (Esc, odak tuzağı, kaydırma kilidi, "Sonuçları göster (N)"), etiketli sıralama, Türkçe tırnaklı başlık ("“x” için sonuç yok"). Arama çekmecesi: gruplu öneriler (kategori / ürün), ↑↓ Enter Esc ile combobox.

**PDP** — Dijital: "Ne alıyorsunuz?" bloğu, format radyo çipleri, "Makinem uyumlu mu?" yardımcısı (yalnızca ürünün gerçekten sahip olduğu formatlarla kesişim; uydurma uyumluluk yok), indirme altyapısının henüz aktif olmadığını açıkça söyleyen satır. Fiziksel: stok / hazırlık / teslimat `dl` listesi, eksik veride "Bilgi yakında", renk ve ölçü seçimi, adet stepper, kişiselleştirme sayacı (n/18). Mobil sabit satın alma çubuğu (safe-area). "Örnek veri" notu.

**Dürüst metin** — "doğrulanmış", "anında" ve "PDF üretim kartı" iddiaları sepet, sepet çekmecesi, ürün kartı ve demo veriden kaldırıldı ("Dijital dosya · indirilir"). Yasal metindeki "anında ifa" hukuki terim olduğu için korundu.

**Veri katmanı** — `src/services/catalog.ts`: tipli, async `listProducts / getProduct / getRelatedProducts / getSuggestions / getFacetCounts` + `catalogSync`; `IS_DEMO_DATA = true`. Sözleşme `BACKEND_REQUIREMENTS.md`'de.

## 3. Test sonuçları
| Kontrol | Sonuç |
|---|---|
| `npm run lint` (tsc --noEmit) | Temiz |
| `npm test` (arama senaryoları: VP3 çiçek, PFAFF, 10×10 kasnak, kişiye özel bebek, fiziksel havlu, dijital paket, boş sonuç…) | 10/10 PASS |
| `npm run build` | Başarılı (statik + SSG sayfalar) |
| Taşma/konsol hatası, 7 rota × 7 genişlik (320–1920) | 49/49 `overflow=false`, `errors=0` (`screenshots/after/report.json`) |
| Etkileşim duman testi (`scripts/interact.mjs`) | 9/9 PASS: hero arama → katalog, kasnak çipi, arama önerileri, dijital sepete ekle, sepette ürün+format, mobil menü, PDP dokunma hedefleri ≥44px, masaüstü/mobil konsol temiz |

Görsel inceleme döngüleri: `screenshots/review-1` (viewport, 70 kombinasyon), `review-1b` (mobil hero, fiziksel PDP), `review-2` (etkileşimler), `after/` (son durum + `after/interactions`).

## 4. Kalan açıklar
- Tüm görseller, fiyatlar ve teknik veriler demo; gerçek ürün verisi ve fotoğraflar müşteriden gelmeli.
- PDP galerisindeki "Dikişi yakınlaştır" düğmesi fotoğraf üzerinde duruyor (işlevsel kontrol, dekoratif etiket değil); ileride galerinin altına taşınabilir.
- Ürün kartındaki tür satırı 2 sütunlu mobil ızgarada iki satıra kayabiliyor.
- Favoriler, hesabım, sepet, sitemap ve ana sayfanın bir kısmı hâlâ `PRODUCTS`'ı doğrudan içe aktarıyor; servis katmanına taşınmalı.
- Backend, ödeme, indirme altyapısı ve yasal metinler yok (bkz. `BACKEND_REQUIREMENTS.md`, `PROJECT_STATUS.md`).
- Tam sayfa ekran görüntülerinde sabit başlık sayfa ortasında görünür; bu bir çekim artefaktıdır.
