# TEST_REPORT.md — Test Raporu

Tarih: 2026-11-20. Sonuçlar ana oturumun son doğrulamasından alınmıştır (bu belge testleri yeniden çalıştırmadı).

## Özet
| Kontrol | Sonuç |
|---|---|
| `npm run lint` (tsc --noEmit) | Temiz |
| `npm test` — Vitest | **97/97 geçti, 13 dosya, ~27,8 sn** |
| `tests/search.test.ts` (eski betik testi) | `npm test` içinde çalışır |
| `npm run build` | Başarılı |
| E2E (Playwright) | E2E: ajan E tarafından ekleniyor (`test:e2e` şu an yer tutucu) |

Entegrasyon testleri gerçek Postgres (`DATABASE_URL_TEST`) ve MinIO üzerinde çalışır; `tests/setup/` veritabanını hazırlar.

## Dosya bazında sayılar
| Dosya | Test |
|---|---|
| unit/embroidery | 3 |
| unit/http | 4 |
| unit/uploads | 12 |
| integration/addresses | 5 |
| integration/admin-catalog | 13 |
| integration/admin-ops | 8 |
| integration/auth | 11 |
| integration/catalog | 8 |
| integration/commerce | 13 |
| integration/custom-orders | 8 |
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
- E2E: ajan E tarafından ekleniyor.
- Gerçek ödeme sağlayıcısı testleri yok (sağlayıcı bağlı değil).
- Yük ve güvenlik (penetrasyon) testi yapılmadı; AV taraması yok.
