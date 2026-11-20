# Tülay Birer — Tasarım Sistemi (DESIGN_SYSTEM.md)

## 1. Marka Karakteri ve Tasarım Felsefesi
**Tülay Birer** çevrimiçi mağazası; *quiet luxury*, *editorial commerce*, *artisan craftsmanship* ve modern Avrupa butik tekstil estetiğini birleştirir.

- Tasarım, yapay zekâ şablonlarından (neon degrade, her yerde glassmorphism, kart içi kart kutular, başlık üstü gereksiz rozetler, sahte satış/yorum rozetleri) bilinçli olarak arındırılmıştır.
- Tüm hiyerarşi **doğal ışıkla çekilmiş nakış fotoğrafçılığı**, **mimari serif tipografi**, **ince `1px` çizgiler** ve **sıcak ham keten tonları** üzerine kuruludur.

## 2. Logo Kullanımı
Orijinal logo dosyası `logo/WhatsApp Image 2026-11-19 at 21.35.42.jpeg` hiç değiştirilmeden korunur.

- **Ana Şeffaf Logo**: `public/brand/tulay-birer-logo.png` (Masaüstü header, footer, hakkımızda sayfası) — orijinal oranlar, altın TB monogramı, makas figürü, *Tülay Birer* imzası ve alt süsleme korunmuştur.
- **TB Monogram Simgesi**: `public/brand/tulay-birer-monogram.png` — küçük boyutlarda yüksek okunabilirlik için orijinal logonun üst TB + makas bölümü bozulmadan çıkarılmıştır (mobil header ve uygulama simgesi).
- **Favicon**: `src/app/icon.png` (512×512 `#FAF8F3` zemin üzerinde ortalanmış TB monogramı).

## 3. Renk Paleti ve WCAG AA Kontrast Dengesi
| Token | Değer | Kullanım |
| --- | --- | --- |
| `--bg-primary` | `#FAF8F3` | Ana sayfa zemini (sıcak fildişi / ham keten) |
| `--bg-secondary` | `#EDE4D6` | İkincil bölüm zeminleri ve görsel altlıkları |
| `--bg-surface` | `#FFFFFF` | Öne çıkan ürün bilgi kartları, çekmece altlıkları, form alanları |
| `--bg-deep` | `#2B211B` | Koyu espresso kontrast alanları ve footer |
| `--text-primary` | `#242320` | Ana metin (kontrast `#FAF8F3` üzerinde > 14:1) |
| `--text-secondary` | `#5A5047` | Yardımcı açıklama metinleri (> 7:1) |
| `--text-muted` | `#6E6359` | İkincil etiketler (> 5.3:1) |
| `--brand-brown` | `#4A372C` | Ana CTA düğmeleri, aktif seçimler (> 10.5:1 beyaz metinle) |
| `--brand-gold` | `#B18A49` | Seçici vurgu (ince çizgiler, aktif sekme alt çizgisi, monogram) |
| `--brand-gold-text` | `#85632B` | Açık zeminde altın metin vurgusu (WCAG AA uyumlu > 5:1) |
| `--border-subtle` | `#E2D8C8` | `1px` ince ayırıcı çizgiler |

## 4. Tipografi (En Fazla 2 Font Ailesi)
- **Başlık ve Editoryal Serif**: `Cormorant Garamond` (`latin` + `latin-ext` Türkçe tam destek) — sıkı harf aralığı (`-0.02em`), mimari vurgu.
- **Gövde ve Arayüz Sans**: `Manrope` (`latin` + `latin-ext` Türkçe tam destek) — fiyat, dikiş sayısı ve kasnak ölçülerinde `font-variant-numeric: tabular-nums`.
- **Boyut Disiplini**: Hero `<h1>` ve marka logosu dışında gövdede düzenli 3 aşamalı hiyerarşi (bölüm başlığı, `1rem` gövde, `0.875rem` arayüz metni). Üst alanda `< 13px` metin kullanılmaz.

## 5. Etkileşim ve Hareket İlkeleri
- Yalnızca işlevsel geçişler (`transform`, `opacity`, `color`, `background-color`, `border-color`) açıkça tanımlanır; `transition: all` kullanılmaz.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (`180ms–240ms`, fotoğraf hover `500ms`).
- `@media (prefers-reduced-motion: reduce)` tam desteklenir.
- Scroll hijacking, ağır 3D sahneler ve açılış engelleyici animasyonlar yoktur.
- Dokunma hedefleri en az `44×44px`; filtre ve format seçimleri hap çip (`aria-pressed` / `role="radio"`), seçili durum `#4A372C` dolgu.
- Sayılar ve boş sonuç Manrope ile yazılır (Cormorant'ta "0" harf gibi okunur); boş durumda her zaman öneri sunulur.
- Ürün teslimatı metni dürüst kalır: dijitalde "Dijital dosya · indirilir", fiziksel üründe stok/hazırlık/teslimat; veri yoksa "Bilgi yakında".
