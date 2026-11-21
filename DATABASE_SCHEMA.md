# DATABASE_SCHEMA.md — Veritabanı Şeması (Faz 3)

Kaynak: `prisma/schema.prisma` (Prisma 7, PostgreSQL 17, `@prisma/adapter-pg`). Bu belge şemadan türetilmiştir; şema değişirse burası da güncellenir.
Migration'lar: `20261119201127_init` (ana şema + CHECK kısıtları + `pg_trgm`/`unaccent`) ve `20261120120000_phase3_custom_order_fields` (özel sipariş sütunları, `Category.seoTitle/seoDescription`, `User.anonymizedAt`).

## Genel kurallar

- **Para = tamsayı kuruş.** Tüm tutarlar `Int` ve adı `...Kurus`'tur (`priceKurus`, `totalKurus`, `value` (FIXED kupon) vb.). Float kullanılmaz. TL ↔ kuruş dönüşümü yalnızca UI/CSV sınırında yapılır.
- Birincil anahtarlar `cuid()` (String). Çoğu tabloda `createdAt` (+ `updatedAt`).
- Gizli değerler (oturum, e-posta doğrulama, misafir erişim, teklif bağlantısı) **düz saklanmaz**; yalnızca sha256 özeti saklanır.
- Sipariş geçmişi **anlık görüntü (snapshot)** ile tutulur: katalog değişse de eski sipariş yeniden yazılmaz.
- Silme davranışı: sipariş kalemlerinde `productId` `onDelete: SetNull`; `DigitalFile`/hak (entitlement) ilişkileri `Restrict` (dosya, hak varken fiziksel silinemez).

## Veritabanı seviyesi kısıtlar (migration'da elle eklenenler)

| Kısıt | Anlamı |
|---|---|
| `Inventory_onHand_nonneg` | `onHand >= 0` |
| `Inventory_reserved_nonneg` | `reserved >= 0` |
| `Inventory_reserved_lte_onHand` | `reserved <= onHand` (aşırı satış engeli, uygulama hatası olsa bile) |
| `Inventory_one_target` | Satırın tam olarak biri dolu: `productId` XOR `variantId` |
| `Product_price_nonneg` | `priceKurus >= 0` |
| `CartItem_quantity_pos` | `quantity > 0` |
| `OrderItem_quantity_pos` | `quantity > 0` |
| `Coupon_value_pos` | `value > 0` |
| Eklentiler | `pg_trgm`, `unaccent` |
| `Product_searchText_trgm_idx` | `Product.searchText` üzerinde `gin_trgm_ops` GIN indeksi (arama) |

## Alan grupları

### 1. Kimlik ve yetki
| Model | Önemli alanlar / kısıtlar |
|---|---|
| `User` | `email` unique (küçük harf saklanır), `passwordHash` (argon2id), `status` (ACTIVE/DISABLED), `emailVerifiedAt`, `failedLoginCount`, `lockedUntil` (5 hatalı girişte kilit), `lastLoginAt`, `anonymizedAt` (KVKK anonimleştirme) |
| `Role` | `code` unique: SUPER_ADMIN, ADMIN, PRODUCT_MANAGER, ORDER_MANAGER, MODERATOR, CUSTOMER |
| `Permission` | `code` unique (`product:write` vb.) |
| `RolePermission`, `UserRole` | Birleşik PK; role/permission silinirse Cascade |
| `Session` | `tokenHash` unique (cookie token'ının sha256'sı), `expiresAt`, `lastUsedAt`, `ipHash`, `userAgent` |
| `VerificationToken` | `purpose` (EMAIL_VERIFY / PASSWORD_RESET), `tokenHash` unique, `expiresAt`, `usedAt` (tek kullanımlık) |
| `Address` | Kullanıcıya bağlı teslimat/fatura adresleri, `isDefaultShipping/Billing` |

### 2. Katalog
| Model | Önemli alanlar / kısıtlar |
|---|---|
| `Category` | `slug` unique, `parentId` (ağaç), `seoTitle`, `seoDescription`, `sort`, `active` |
| `Collection` / `ProductCollection` | Koleksiyon ve ürün sıralı üyelik (`@@index([collectionId, sort])`) |
| `Tag` / `ProductTag` | Etiketler |
| `Product` | `slug` unique, `sku` unique, `type` (DIGITAL_EMBROIDERY, PHYSICAL, PERSONALIZED, TEXTILE_PRINT, DIGITAL_PRINT, BUNDLE), `status` (DRAFT/ACTIVE/ARCHIVED; yeni ürün DRAFT), `priceKurus`, `compareAtPriceKurus?`, `shopierUrl?` (gerçek dijital nakış deseninin HTTPS ürün adresi), `shopierProductId?` unique (Shopier REST ürün numarası; OSB eşlemesi), `isDemo` (seed demo verisi işareti), `personalizable`, `physicalInfo` (Json), `searchText` (Türkçe katlanmış arama metni), `publishedAt` |
| `ProductVariant` | `sku` unique, `options` (Json), `priceKurus?` (varsa ürün fiyatını ezer) |
| `ProductImage` | `storageKey` (public bucket anahtarı; statik `/images/*` için null), `url`, `alt`, `sort` (0 = kapak) |
| `ProductOption` | Kişiselleştirme alanları; `@@unique([productId, key])`, `priceDeltaKurus` |
| `BundleItem` | Paket içeriği; `@@unique([bundleId, itemId])` |

Yayına alma kuralı (uygulama katmanı, `publishIssues`): fiyat > 0, en az 1 görsel; `DIGITAL_EMBROIDERY` için ayrıca en az bir güncel (`isCurrent`) ve `ACTIVE` dijital dosya.

### 3. Nakış alanı
| Model | Önemli alanlar |
|---|---|
| `FileFormat` | `code` unique (VP3, PES, DST, JEF, HUS, EXP, XXX, VIP, PEC, PCS, SEW, ART), `extension` |
| `ProductFormat` | Ürün ↔ format (birleşik PK) |
| `MachineBrand`, `MachineModel`, `MachineModelFormat`, `HoopSize`, `MachineModelHoop` | Makine uyumluluğu: marka → model; model ↔ format (`preferred`); model ↔ kasnak |
| `EmbroideryMetadata` | Ürün başına 1 (`productId` unique): ölçü (mm), `stitchCount`, `colorCount`, `colorChanges`, `threadColors` (Json), `metadataSource` (PARSED/MANUAL), `verified` |
| `DigitalFile` | `storageKey` unique (**private** bucket), `originalName`, `downloadLabel` (ana dosyada boş, ör. ek boy için Mini), `sizeBytes`, `sha256`, `version`, `isCurrent`, `status` (ACTIVE/REPLACED/DELETED), `parsedMeta`. Sürüm `(productId, formatId, downloadLabel)` kapsamında ilerler. İndeksler: `(productId, formatId, isCurrent)`, `(productId, formatId, downloadLabel)`, `sha256` |
| `License`, `ProductLicense` | Lisans (PERSONAL, SMALL_BUSINESS), `priceDeltaKurus` (ürün bazında ezilebilir) |

### 4. Stok
| Model | Notlar |
|---|---|
| `Inventory` | `productId` unique **veya** `variantId` unique (CHECK ile tam biri); `onHand`, `reserved`, `lowStockThreshold` |
| `InventoryReservation` | `status` (ACTIVE/CONSUMED/RELEASED/EXPIRED), `expiresAt`; `cartId`/`orderId`. İndeks `(status, expiresAt)` — süresi dolan rezervasyon işi bu indeksi kullanır |

Stok rezervasyonu checkout içinde **atomik koşullu güncelleme** ile yapılır (`reserved + n <= onHand`); ödeme onayında rezervasyon `CONSUMED` olur ve `onHand` düşer; süre dolarsa `jobs:release-reservations` `EXPIRED` yapar ve ödenmemiş siparişi iptal eder.

### 5. Sepet ve favoriler
`Cart` (`userId` unique veya `guestTokenHash` unique, `couponCode`), `CartItem` (`quantity > 0` CHECK; `variantId`, `formatId`, `licenseId`, `personalization`), `Wishlist` (kullanıcı başına 1), `WishlistItem` (birleşik PK).
Sınırlar (uygulama): satır başına en fazla 20 adet, sepette en fazla 50 satır, kişiselleştirme metni en fazla 60 karakter.

### 6. Sipariş ve ödeme
| Model | Önemli alanlar / kısıtlar |
|---|---|
| `Order` | `number` unique (ör. `TB-2026-000123`), `userId?` (misafir için null), `email`, `status` (PENDING_PAYMENT, PAID, PROCESSING, IN_PRODUCTION, SHIPPED, COMPLETED, CANCELLED, REFUNDED), `paymentStatus` (UNPAID, PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED), `digitalFulfillmentStatus`, `physicalFulfillmentStatus`, `subtotalKurus`, `discountKurus`, `shippingKurus`, `taxKurus`, `totalKurus`, `couponCode` (snapshot), `shippingAddress`/`billingAddress` (Json snapshot), `guestAccessTokenHash` unique, `placedAt`, `paidAt`, `cancelledAt`. İndeksler: `(userId, createdAt)`, `email`, `(status, createdAt)`, `paymentStatus` |
| `OrderItem` | Snapshot: `productName`, `sku`, `variantName`, `format`, `license`, `unitPriceKurus`, `quantity` (CHECK > 0), `lineTotalKurus`, `personalization`, `kind` (DIGITAL/PHYSICAL), `fulfillmentStatus` |
| `Payment` | `provider` (none/simulated/iyzico/paytr), `providerPaymentId` unique, `idempotencyKey` unique, `amountKurus`, `status`, `raw` (en az sağlayıcı yanıtı; **kart verisi asla**), `failureReason`, `paidAt` |
| `WebhookEvent` | `@@unique([provider, eventId])` — aynı olay iki kez işlenmez; `payloadHash`, `processedAt`, `error` |
| `Shipment` | `carrier`, `trackingNumber`, `status` (PENDING, PREPARING, SHIPPED, DELIVERED, RETURNED), `shippingFeeKurus`, `estimatedPrepDays`, `address` (Json), `shippedAt`, `deliveredAt` |

Yetki mantığı: `Order.status = PAID` **yalnızca** doğrulanmış `payment.succeeded` olayı (veya yetkili yöneticinin kayıtlı manuel ödeme girişi) ile olur; checkout hiçbir zaman PAID üretmez.

### 7. İndirme hakları
| Model | Notlar |
|---|---|
| `DownloadEntitlement` | Ödeme onayında `OrderItem` başına oluşur. `remaining` (başlangıç = `policy.downloadLimit`), `expiresAt` (`policy.downloadExpiryDays`), `revokedAt`, `revokeReason`, `digitalFileId` (`Restrict`). İndeks `userId`, `orderItemId`, `digitalFileId` |
| `DownloadLog` | Her bağlantı üretimi: `ipHash`, `userAgent`. İndeks `(entitlementId, createdAt)` |

İndirme izni şu durumlarda **verilmez**: sipariş ödenmemiş/iptal, iade (`REFUNDED`) veya hak iptal edilmiş (`revokedAt`), süre dolmuş, `remaining <= 0`. Kredi, koşullu atomik `UPDATE` ile düşülür; imzalı URL üretimi başarısız olursa kredi iade edilir.

### 8. Kupon
`Coupon` (`code` unique, büyük harf; `type` PERCENT/FIXED; `value` PERCENT için 1–100, FIXED için kuruş; `minSubtotalKurus`, `usageLimit`, `perCustomerLimit`, `usedCount`, `startsAt`, `endsAt`, `active`), `CouponProduct`, `CouponCategory` (kapsam), `CouponRedemption` (`orderId` unique → sipariş başına tek kullanım; indeks `(couponId, email)`, `(couponId, userId)`). Kullanım sayacı checkout içinde atomik artar.

### 9. Kişiye özel siparişler
| Model | Notlar |
|---|---|
| `CustomOrder` | `status` (NEW, REVIEWING, QUOTED, ACCEPTED, REJECTED, CANCELLED, CONVERTED), müşteri alanları (`text`, `threadColor`, `size`, `machineModel`, `format`, `notes`, `initials`), gerçek sütunlar: `productType`, `deadline` (ISO `YYYY-MM-DD` metni), `budgetKurus`, `prepDays`, `quoteValidUntil` (ISO tarih, o gün dahil), `consentAt` (KVKK onayı), `accessTokenHash` unique + `accessTokenExpiresAt` (misafir teklif bağlantısı; yalnızca özet saklanır). Teklif: `quoteKurus`, `quoteNote`, `quotedAt`. `orderId` unique (kabul sonrası siparişe dönüşüm) |
| `CustomOrderAttachment` | `storageKey` unique (**private** bucket), `mimeType`, `sizeBytes` |
| `CustomOrderMessage` | `authorType` (CUSTOMER/ADMIN), `body` |

### 10. Platform
| Model | Notlar |
|---|---|
| `SiteSettings` | `key` unique, `value` Json (uygulama katmanında Zod ile doğrulanır). `site` mağaza adı, logo adresi, işletme sahibi, iletişim ve vitrin alanlarını, `studio` kargo ücretlerini, `policy` indirme politikasını, `legal` yasal metinleri saklar. |
| `AuditLog` | `actorUserId`, `action` (ör. `product.update`), `entity`, `entityId`, `diff` (gizli alanlar `[REDACTED]`), `ipHash` (HMAC). İndeksler: `(entity, entityId)`, `(actorUserId, createdAt)`, `createdAt` |
| `Notification` | E-posta kuyruğu/kaydı: `type`, `toAddress`, `payload`, `status` (PENDING/SENT/FAILED), `error`, `sentAt` |
| `RateLimit` | `key` unique (`ad + sha256(kimlik)[0..32]`), `count`, `windowStart`; atomik upsert ile sabit pencere |

## Ayarlardaki politika varsayılanları
- `shipping`: `standardShippingKurus` (varsayılan 8900), `freeShippingThresholdKurus` (varsayılan 150000).
- `policy`: `downloadLimit` (env `DOWNLOAD_LIMIT_DEFAULT`, 5), `downloadExpiryDays`, `refundRevokesDownloads`.
- Bunlar örnek/yedek değerlerdir; gerçek değerler yönetim panelinden girilir.

## Notlar
- `docs/schema-requests.md` eski bir şema isteği notudur ve güncel değildir (özel sipariş meta verileri artık gerçek sütunlardadır).
- Şema değiştirirken: `npm run db:migrate` (geliştirme), üretimde `npm run db:deploy`.
