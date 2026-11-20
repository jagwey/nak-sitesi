# TEST_REPORT.md — Test Raporu

Tarih: 2026-11-20. Son Codex görevlerinden sonra çalıştırılan kontroller.

## Özet
| Kontrol | Sonuç |
|---|---|
| `npm run lint` (Next.js tür üretimi ve tsc --noEmit) | Temiz |
| `npm test` — Vitest | **103/103 geçti, 15 dosya** |
| `tests/search.test.ts` | `npm test` içinde 10/10 geçti |
| `npm run build` | Başarılı |
| E2E (Playwright) | 12/12 geçti, 8 dosya (`npm run test:e2e`, Chromium, dev sunucu) |
| Docker üretim imajı | Yerel kurulum, sağlık 200/503, robots.txt, site haritası, paylaşım görseli, görsel optimizasyonu ve Python doğrulandı |

Entegrasyon testleri gerçek Postgres (`DATABASE_URL_TEST`) ve MinIO üzerinde çalışır; `tests/setup/` veritabanını hazırlar.

## Dosya bazında sayılar
| Dosya | Test |
|---|---|
| unit/embroidery | 3 |
| unit/env | 3 |
| unit/http | 4 |
| unit/uploads | 12 |
| integration/addresses | 5 |
| integration/admin-catalog | 13 |
| integration/admin-ops | 9 |
| integration/auth | 11 |
| integration/catalog | 8 |
| integration/commerce | 13 |
| integration/custom-orders | 8 |
| integration/deployment | 2 |
| integration/favorites | 4 |
| integration/search | 6 |
| integration/storage | 2 |

Fixture: `tests/fixtures/test-fixture.dst`, `test-fixture.pes`.

## Senaryo eşlemesi
| Senaryo | Test dosyası |
|---|---|
| Kayıt, e-posta doğrulama (tek kullanımlık), giriş, kilit, çıkış, parola sıfırlama | integration/auth |
| Yalnızca token özetlerinin saklanması | integration/auth |
| Yetki: müşteri FORBIDDEN, anonim UNAUTHENTICATED, verilen izin geçerli | integration/auth |
| CSRF (yabancı Origin), bilinmeyen alan reddi | integration/auth, unit/http |
| Fiyatın sunucuda hesaplanması, istemci fiyatı reddi | integration/commerce |
| Kupon hesabı ve eşzamanlı kupon limiti | integration/commerce |
| Misafir sepeti girişte birleşir | integration/commerce |
| Checkout: PENDING_PAYMENT, snapshot; ödenmemiş siparişte indirme yok | integration/commerce |
| Webhook: imza, idempotensi (aynı olay iki kez), başarısız olay, sahte imza | integration/commerce |
| Simülasyon kapalıyken webhook/simulate reddi | integration/commerce |
| Hak oluşumu, IDOR, imzalı URL atomik kredi düşümü | integration/commerce |
| Son stok birimi eşzamanlılığı, aşırı satış yok | integration/commerce |
| Süresi dolan rezervasyon, ödenmemiş siparişi iptal | integration/commerce |
| Admin API 401/403, ORDER_MANAGER sınırları, son SUPER_ADMIN korunur | integration/admin-ops |
| Geçersiz durum geçişi, iptalde stok iadesi + denetim, iade indirmeleri kapatır | integration/admin-ops |
| Ayar bağlantısı `javascript:` reddi, anonimleştirmede tutarlar korunur | integration/admin-ops |
| Mağaza ayarları, eski kayıtlar, logo adresi doğrulaması, e-posta gönderen adı ve şablonu | integration/admin-ops |
| Mağaza ayarının mobil vitrinde ve ürün başlığında güncellenmesi | e2e/08-brand-settings |
| Yakınlaştırmanın 390 ve 1440 px'te klavyeyle çalışması ve mobil katalog kartları | e2e/07-gallery, e2e/05-mobile |
| Admin ürün CRUD, yayın şartları, dosya/görsel yükleme, CSV | integration/admin-catalog |
| Dosya doğrulama, ZIP bombası/yol, görsel yeniden kodlama | unit/uploads |
| DST/PES ayrıştırma | unit/embroidery |
| Katalog listeleme/filtre, arama | integration/catalog, integration/search |
| Adres, favori | integration/addresses, integration/favorites |
| Kişiye özel talep (bal küpü, rıza, ek, teklif) | integration/custom-orders |
| Depolama private/public kova | integration/storage |

## Çalıştırma
```bash
npm run db:up && npm run db:migrate   # test DB için DATABASE_URL_TEST tanımlı olmalı
npm run lint
npm test
```

## Açık / kapsam dışı
- Gerçek ödeme sağlayıcısı testleri yok (sağlayıcı bağlı değil).
- Yük ve güvenlik (penetrasyon) testi yapılmadı; AV taraması yok.
