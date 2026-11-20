# PAYMENT_INTEGRATION.md — Ödeme Entegrasyonu

Durum: **Gerçek bir ödeme sağlayıcısı bağlı değildir.** Varsayılan sağlayıcı `none`'dır: sipariş oluşur, ödeme beklenir, hiçbir şey otomatik "ödendi" olmaz. iyzico ve PayTR için yalnızca iskelet (StubProvider) vardır ve çağrılırsa "yapılandırılmadı" hatası verir.

## Temel kurallar

1. **Sipariş otomatik ödenmiş sayılmaz.** Checkout yalnızca `PENDING_PAYMENT` sipariş ve `PENDING` ödeme kaydı üretir.
2. Siparişi `PAID` yapan **tek yol** doğrulanmış `payment.succeeded` webhook olayıdır (ya da yetkili yöneticinin kayıtlı manuel ödeme girişi).
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

| Ortam | `PAYMENT_PROVIDER` | Simülasyon | Not |
|---|---|---|---|
| Yerel geliştirme | `none` veya `simulated` | `PAYMENT_SIMULATION_ENABLED=true` yalnızca `simulated` ile | Sahte ödeme |
| Staging | sağlayıcının **sandbox** anahtarları | kapalı | `IYZICO_BASE_URL` sandbox |
| Production | `iyzico` / `paytr` (canlı anahtarlar) | **kapalı (zorunlu)** | `https` zorunlu |

## Güvenlik kontrol listesi
- Webhook imzası ham gövde üzerinden, sabit zamanlı.
- `(provider, eventId)` benzersizliği ile idempotency.
- Tutar uyuşmazlığı reddi; durum güncellemesi kilitli transaction içinde.
- Kart verisi yok; `Payment.raw` asgari.
- Simülasyon production'da env doğrulamasıyla engellenir.
