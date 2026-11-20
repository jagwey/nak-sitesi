# Schema istekleri (D2)

**ÇÖZÜLDÜ (Faz E):** CustomOrder alanları, Category SEO ve User.anonymizedAt migration `20261120120000_phase3_custom_order_fields` ile gerçek sütunlara taşındı; `co.meta:*` / `co.token:*` SiteSettings satırları aynı migration içinde sütunlara aktarılıp silindi. Aşağıdaki "geçici çözüm" metinleri tarihsel kayıttır. Politika ayarları (`policy`) kasıtlı olarak SiteSettings'te kalır.

## CustomOrder — ÇÖZÜLDÜ
Eksik alanlar: productType, deadline, budgetKurus, prepDays, quoteValidUntil, consentAt, accessTokenHash/expiresAt (misafir için).
Geçici çözüm: `SiteSettings` key `co.meta:<customOrderId>` (productType, deadline, budgetKurus, prepDays, validUntil, consentAt) ve `co.token:<sha256(token)>` ({customOrderId, expiresAt}). Token düz metin olarak saklanmaz.
İstenen kalıcı çözüm: CustomOrder üzerinde yukarıdaki sütunlar + `accessTokenHash`, `accessTokenExpiresAt`.

## Müşteri (KVKK) — ÇÖZÜLDÜ (User.anonymizedAt)
`User.anonymizedAt` alanı yok; anonimleştirme e-posta/ad/telefonu `deleted-<id>@anon.invalid` biçimine çevirir ve status DISABLED yapar.

## Ayarlar
Politikalar (iade indirmeyi iptal eder, indirme limiti/süresi) `SiteSettings` key `policy` içinde; env değerleri varsayılan kalır.

# Schema istekleri (D1, katalog yönetimi)

## Category SEO — ÇÖZÜLDÜ (Category.seoTitle/seoDescription; admin formunda alanlar var)
Kategori yönetiminde SEO başlığı/açıklaması istenir ancak `Category` modelinde `seoTitle` / `seoDescription` sütunları yok. Admin kategori formu bu alanları şimdilik göstermez (formda bilgi notu var).
İstenen kalıcı çözüm: `Category.seoTitle String?`, `Category.seoDescription String?`.
