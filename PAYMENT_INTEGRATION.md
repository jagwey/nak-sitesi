# PAYMENT_INTEGRATION.md — Ödeme Entegrasyonu

Durum: Varsayılan sağlayıcı `none`'dır: sipariş oluşur, ödeme beklenir, checkout hiçbir şeyi otomatik "ödendi" yapmaz. `shopier`, tahsilatı Shopier mağaza sayfasına bırakır. iyzico ve PayTR için yalnızca iskelet (StubProvider) vardır ve çağrılırsa "yapılandırılmadı" hatası verir.

## Temel kurallar

1. **Sipariş otomatik ödenmiş sayılmaz.** Checkout yalnızca `PENDING_PAYMENT` sipariş ve `PENDING` ödeme kaydı üretir.
2. Checkout siparişi `PAID` yapmaz. `PAID` yalnızca doğrulanmış `payment.succeeded` olayı, imzası doğrulanmış Shopier OSB bildirimi veya yetkili yöneticinin kayıtlı manuel ödemesiyle oluşur.
3. Kart numarası/CVV/son kullanma tarihi **hiçbir yerde alınmaz, loglanmaz, saklanmaz.** Ödeme sağlayıcının barındırdığı sayfada/formda gerçekleşir. `Payment.raw` yalnızca asgari sağlayıcı yanıtını tutar.
4. Fiyat istemciden alınmaz; tutar sunucuda katalogdan hesaplanır (`totalKurus`, tamsayı kuruş).
5. Simülasyon yalnızca production dışında ve açıkça açıldığında çalışır.

## Arayüz (`src/server/modules/payments/provider.ts`)

```ts
interface PaymentProvider {
  readonly name: string;
  initiate(input: { paymentId; orderNumber; amountKurus; currency; email }):
    Promise<{ status: "awaiting_payment" | "redirect"; redirectUrl?; providerPaymentId?; message }>;
  verifyWebhook(signature: string | null, rawBody: string): boolean;   // HAM gövde üzerinde, sabit zamanlı karşılaştırma
  parseEvent(rawBody: string): { eventId; type: "payment.succeeded" | "payment.failed" | "refund.succeeded"; paymentId; amountKurus };
  refund(input: { paymentId; providerPaymentId; amountKurus }): Promise<{ ok: boolean; providerRefundId? }>;
}
```

`getPaymentProvider(name = env.PAYMENT_PROVIDER)` ilgili uygulamayı döndürür.

| Sağlayıcı | Davranış |
|---|---|
| `none` | `initiate` → `awaiting_payment`; `verifyWebhook` her zaman `false` (hiçbir şey doğrulanamaz → hiçbir şey ödenmiş olmaz); `refund` → `ok:true` (hiç para toplanmadı) |
| `simulated` | HMAC imzalı sahte olaylar. Yalnızca `isPaymentSimulationAllowed()` doğruysa: `NODE_ENV != production` **ve** `PAYMENT_SIMULATION_ENABLED=true` **ve** `PAYMENT_PROVIDER=simulated` |
| `shopier` | Satın alma düğmesi ürünün `shopierUrl` adresine, o yoksa `SHOPIER_STORE_URL` (Jagnakis mağazası) adresine gider. Yerel checkout kapalıdır. `initiate` PAID üretmez. OSB ayrı uçtan işlenir |
| `iyzico`, `paytr` | `StubProvider`: tüm yöntemler "ödeme altyapısı henüz yapılandırılmadı" (`PAYMENT_FAILED`) fırlatır |

## Webhook akışı (`POST /api/payments/webhook/[provider]`)

1. İstek `csrf:false` (sağlayıcı sunucusu çağırır), 300/dk hız sınırı, ham gövde < 100.000 karakter.
2. `[provider]` yolu `PAYMENT_PROVIDER` ile eşleşmiyorsa reddedilir.
3. İmza (`x-signature`) **ham gövde** üzerinden doğrulanır. Geçersizse olay hiç işlenmez.
4. `WebhookEvent`'e `(provider, eventId)` ile `ON CONFLICT DO NOTHING` eklenir. Zaten varsa olay tekrar işlenmez (idempotent; sağlayıcı aynı olayı yeniden gönderebilir).
5. `applyEvent` **tek transaction** içinde: `Payment` ve `Order` satırları `FOR UPDATE` ile kilitlenir; **tutar eşleşmesi** kontrol edilir (uyuşmazlık reddedilir).
6. `payment.succeeded`: sipariş `PAID`, rezervasyonlar tüketilir (stok düşer), her dijital kalem için `DownloadEntitlement` oluşturulur (`remaining = policy.downloadLimit`, süre `policy.downloadExpiryDays`), teslimat durumları güncellenir; e-postalar commit sonrası gönderilir.
7. `payment.failed`: ödeme `FAILED`, sipariş ödenmemiş kalır.
8. İptal edilmiş siparişe gelen başarılı ödeme: kaydedilir, **teslim edilmez**, `payment.after_cancel` denetim kaydı yazılır; yönetici elle iade etmelidir.

## İade akışı

`POST /api/admin/orders/[id]/refund` (`order:write`) → `refundOrder`: `provider.refund(...)` çağrılır, ardından `applyRefund` siparişi/ödemeyi `REFUNDED` yapar ve `policy.refundRevokesDownloads` açıksa indirme haklarını iptal eder. `refund.succeeded` webhook olayı da aynı yolu kullanır. Manuel (havale/EFT) ödemelerin iadesi bankadan elle yapılır; panel yalnızca kaydı günceller.

## Manuel ödeme kaydı

Banka havalesi/EFT için: `POST /api/admin/orders/[id]/manual-payment` `{ reference }` (5–200 karakter). Yalnızca SUPER_ADMIN veya ORDER_MANAGER; denetim kaydı yazılır. Bu, sağlayıcı olmadan siparişi `PAID` yapabilen **tek** yönetici yoludur ve bilinçli, kayıtlı bir insan eylemidir.

Üretimde `PAYMENT_PROVIDER=none` iken müşteri ödeme akışı kapalıdır. Katalog, sepet ve kişiye özel teklif talepleri açık kalır.

## Geliştirme simülasyonu

`POST /api/dev/payments/simulate` `{ orderNumber, outcome: "success" | "failure", guestToken? }` — simülasyon kapalıysa `404`. Gerçek webhook yolundan (imzalı olay → `processWebhook`) geçer; böylece test ve geliştirme gerçek akışı kullanır. Simülasyon imza sırrı `PAYMENT_SIMULATION_SECRET`'tır (boşsa kodda sabit bir geliştirme sırrı kullanılır; yalnızca simülasyon izinliyken geçerlidir).

Production'da `src/server/env.ts` şunları **reddeder** (uygulama açılmaz): `PAYMENT_SIMULATION_ENABLED=true`, `PAYMENT_PROVIDER=simulated`, `https` olmayan `APP_URL`.

## iyzico / PayTR ekleme adımları

Müşterinin (işletmenin) sağlaması gerekenler:

- Sağlayıcıyla **imzalı üye işyeri sözleşmesi** ve onaylı hesap (vergi levhası, şirket/şahıs bilgileri, IBAN).
- Test (sandbox) ve canlı **anahtarlar**:
  - iyzico: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (sandbox: `https://sandbox-api.iyzipay.com`; canlı: `https://api.iyzipay.com`)
  - PayTR: `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`
- Sağlayıcı panelinde **bildirim (callback/webhook) URL'si**: `https://<alan-adı>/api/payments/webhook/<iyzico|paytr>`.
- Hukuki metinlerin (mesafeli satış, iade/iptal, KVKK) avukat tarafından onaylanmış olması.

Geliştirici adımları:

1. `payments/provider.ts` içindeki ilgili `StubProvider`'ı gerçek uygulamayla değiştir: `initiate` (ödeme formu/oturumu başlat, `redirectUrl` döndür), `verifyWebhook` (sağlayıcının imza/hash şeması, ham gövde, sabit zamanlı karşılaştırma), `parseEvent` (sağlayıcı olayını `payment.succeeded|failed|refund.succeeded`'a ve **kendi** `Payment.id`'mize eşle; `eventId` sağlayıcıya özgü benzersiz olmalı), `refund`.
2. `Payment.id`'yi sağlayıcıya müşteri referansı olarak ver; olayda geri al.
3. Gizli anahtarları yalnızca env'e koy (kodda/log'da yok). `.env.example` şablonunda boş bırakılmıştır.
4. Sandbox ile uçtan uca dene: başarılı, başarısız, tekrar gönderilen olay, tutar uyuşmazlığı, iptal sonrası ödeme.
5. Tests: `tests/integration/commerce.test.ts` webhook/idempotency senaryolarının örnek çatısını içerir.
6. Canlıya geçişte `PAYMENT_PROVIDER=iyzico|paytr` yap; `PAYMENT_SIMULATION_ENABLED=false` kalmalı.

## Test ve canlı ayrımı

Shopier’e bağlı dijital nakış ürünleri kendi ürün sayfasından Shopier’e yönlenir. `PAYMENT_PROVIDER=none` iken düğme yalnızca ürüne kayıtlı `shopierUrl` varsa görünür. `PAYMENT_PROVIDER=shopier` iken adresi olmayan ürünler mağaza adresine (`https://www.shopier.com/Jagnakis`) gider ve yerel sepet ödemesi açılmaz.

## Shopier

Mağaza: `https://www.shopier.com/Jagnakis`.

Ortam: `SHOPIER_OSB_USERNAME`, `SHOPIER_OSB_KEY` (`PAYMENT_PROVIDER=shopier` iken zorunlu), `SHOPIER_PAT` (sync ve webhook kaydı), `SHOPIER_WEBHOOK_SECRET`, `SHOPIER_STORE_URL`, `SHOPIER_API_BASE_URL`. Hepsi `.env.production` içinden `docker-compose.prod.yml` `env_file` ile web ve tools konteynerine geçer.

OSB geri çağırma adresi: `https://<APP_URL>/api/shopier/osb`. Shopier bu özelliği legacy sayar ve panel denemesi mevcut sipariş ister. Gövde `res` + `hash`. Doğrulama: `HMAC-SHA256` hex, mesaj `res + SHOPIER_OSB_USERNAME`, anahtar `SHOPIER_OSB_KEY`.

REST webhook (tercih edilen): `POST /api/shopier/webhook`. İmza başlığı `Shopier-Signature`, ham gövde üzerinde HMAC-SHA256, anahtar `SHOPIER_WEBHOOK_SECRET` (abonelik oluşturma yanıtındaki `token`; yalnızca ilk yanıtta gelir). Olay başlığı `Shopier-Event`. `order.created`, `order.paid` ve `order.fulfilled` aynı idempotent teslimatı kullanır (`WebhookEvent` anahtarı Shopier sipariş numarasıdır; OSB ile çakışmaz). Kayıt: `npm run shopier:webhook` (`POST /v1/webhooks`, `event=order.created`, URL `https://nakis-vitrin.nakis-sitesi.workers.dev/api/shopier/webhook`). Shopier olay listesinde `order.paid` yoktur; ödenen sipariş `order.created` ile gelir.

Geçerli TRY bildirimi `Product.shopierProductId` ile ürünü bulur, siparişi ve ödemeyi PAID kaydeder, dijital dosyalar için indirme hakkı açar ve mevcut `payment_completed` / `downloads_ready` e-postalarını gönderir. Aynı `orderid` ikinci kez e-posta göndermez. Ürün numarası katalogda yoksa yanıt `retry` olur (kayıt yazılmaz, Shopier yeniden deneyebilir). Başarılı işlem gövdesi düz metin `success` döner. Checkout hâlâ PAID üretmez.

Katalog eşitleme: `npm run shopier:sync` (dry-run) ve `npm run shopier:sync -- --apply`. `POST/PUT https://api.shopier.com/v1/products`, `Authorization: Bearer SHOPIER_PAT`. Gönderilen alanlar: `title`, `description`, `type` (`digital`|`physical`), `media[{type:image,url,placement}]`, `priceData` (`currency: TRY`, `price` `"249.90"`), `shippingPayer: sellerPays`, `customNote: nakis:<sku>`. Dijital nakışta `shopierUrl` ve her üründe `shopierProductId` geri yazılır.

### Belirsizlikler

- developer.shopier.com ürün sayfası şema gövdesini düz metin olarak vermiyor. İstek gövdesi, 15 Kasım 2026’da canlı API’ye karşı denenmiş `shopier-mcp` alanlarına dayanır. Bazı hesaplarda `POST /products` çalışırken `GET/PUT /products` 403 döner; sync bu durumda listeyi atlar, bilinen numarayı güncellemeyi dener, hata satırını basar.
- OSB, Shopier yardımında legacy olarak geçer ve webhook önerilir. Parametre tablosu yardım sayfasında yok; imza formülü yayımlanmış PHP örneği ve açık kaynak doğrulayıcılarla aynıdır (`hash_hmac('sha256', res.username, key)`).
- KDV gönderilmez (Shopier varsayılanı). Dijital üründe stok, API’de sınırsız alan görülmediği için oluşturmada `999` yazılır. Güncellemede stok gönderilmez.
- Çok kalemli OSB tutarı, katalog fiyatlarının oranında tamsayı kuruşa bölünür; ödenen toplam Shopier’in bildirdiği tutardır.

| Ortam | `PAYMENT_PROVIDER` | Simülasyon | Not |
|---|---|---|---|
| Yerel geliştirme | `none` veya `simulated` | `PAYMENT_SIMULATION_ENABLED=true` yalnızca `simulated` ile | Sahte ödeme |
| Staging | sağlayıcının **sandbox** anahtarları | kapalı | `IYZICO_BASE_URL` sandbox |
| Production | `shopier`, `iyzico` veya `paytr` (canlı anahtarlar) | **kapalı (zorunlu)** | `shopier` için OSB anahtarları ve `https` zorunlu |

## Güvenlik kontrol listesi
- Webhook imzası ham gövde üzerinden, sabit zamanlı.
- `(provider, eventId)` benzersizliği ile idempotency.
- Tutar uyuşmazlığı reddi; durum güncellemesi kilitli transaction içinde.
- Kart verisi yok; `Payment.raw` asgari.
- Simülasyon production'da env doğrulamasıyla engellenir.
