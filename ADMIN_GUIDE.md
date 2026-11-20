# Yönetim Paneli Kullanım Kılavuzu

Bu kılavuz mağazayı yönetecek kişiler içindir. Teknik bilgi gerekmez. Panelde bir şeyi yanlış yaparsanız çoğu işlem geri alınabilir; silme gibi geri dönüşü olmayan işlemlerde panel size önce sorar.

## 1. Giriş
1. Tarayıcıda sitenin adresinin sonuna `/admin` yazın veya normal giriş sayfasından e-posta ve parolanızla girin.
2. Yönetici hesabınız yoksa sistemi kuran kişi ilk hesabı açar; sonrasında diğer kişileri siz ekleyebilirsiniz (bölüm 14).
3. Parolanızı kimseyle paylaşmayın. Üst üste 5 yanlış denemede hesap kısa süre kilitlenir; biraz bekleyip tekrar deneyin.
4. İşiniz bitince "Çıkış" yapın. Yetkiniz olmayan bir sayfayı açarsanız "sayfa bulunamadı" görürsünüz; bu normaldir.

## 2. Panel (ana sayfa)
Giriş yapınca özet ekranı açılır: bekleyen siparişler, kişiye özel talepler ve uyarılar burada görünür. Soldaki menüde şu bölümler vardır: Panel, Ürünler, Kategoriler, Koleksiyonlar, Etiketler, Dijital Dosyalar, Stok, Toplu İşlemler, Siparişler, Müşteriler, Kuponlar, Kişiye Özel Talepler, İndirme Kayıtları, İçerik, Ayarlar, Yöneticiler, Denetim Kaydı. "Mağazaya dön" sizi siteye götürür. Hangi bölümleri gördüğünüz yetkinize bağlıdır.

## 3. Yeni desen (ürün) ekleme
1. **Ürünler** → yeni ürün ekle.
2. Adı, kısa açıklamayı, açıklamayı yazın; türü seçin (dijital desen veya fiziksel/kişiye özel ürün).
3. Kategori, koleksiyon ve etiketleri seçin.
4. Fiyatı girin (bölüm 5), fotoğrafları ekleyin (bölüm 6), dijital desense dosyayı yükleyin (bölüm 4).
5. Önce **taslak** olarak kaydedilir; müşteriler görmez. Hazır olunca yayına alın (bölüm 8).

Yalnızca gerçekten sahip olduğunuz fotoğraf, açıklama ve dosyaları kullanın.

## 4. Nakış dosyası yükleme (VP3, PES, DST ve diğerleri)
- Dijital desen ürününde "Dosyalar" bölümünden dosyayı seçip yükleyin. Kabul edilen biçimler: VP3, PES, DST, JEF, HUS, EXP, XXX, VIP, PEC, PCS, SEW, ART veya bunları içeren ZIP. Dosya en fazla 20 MB olmalı.
- Sistem dosyayı kontrol eder; bozuk veya uygunsuz dosyayı reddeder ve nedenini söyler.
- DST ve PES dosyalarında ölçü, dikiş (ilmek) sayısı ve renk sayısı dosyadan **otomatik okunur**. Elle girilen değerler "doğrulanmadı" sayılır.
- Yalnızca elinizde gerçekten bulunan formatı yükleyin. Bir görseli "nakış dosyası" gibi yeniden adlandırmayın; bu müşteriyi yanıltır.
- Dosyalar herkese açık değildir; yalnızca ödeme yapan müşteri kısa süreli güvenli bağlantıyla indirebilir. Dosyayı kendiniz de panelden açabilirsiniz (bu işlem kayda geçer).
- Dosyanın yeni sürümünü yüklerseniz eski sürüm pasif olur.

## 5. Fiyat
- Fiyatı **TL olarak** yazın (örneğin `149,90`). Sistem bunu kendisi kuruşa çevirir.
- İndirimli gösterim için "karşılaştırma fiyatı" (üstü çizili eski fiyat) girebilirsiniz; bu, satış fiyatından yüksek olmalıdır.
- Birçok ürünün fiyatını birden değiştirmek için **Toplu İşlemler**: ürünleri seçin, "sabit fiyat", "yüzde artır" veya "yüzde azalt" seçin.

## 6. Fotoğraf ekleme ve sıralama
- "Görseller" bölümünden fotoğraf yükleyin (JPEG, PNG veya WebP; en fazla 8 MB). Sistem fotoğrafı optimize edip küçültür.
- Her fotoğraf için kısa bir açıklama (alt metin) yazın.
- Sıralamayı değiştirerek **ilk fotoğrafı kapak** yapın. Yayına almak için en az bir fotoğraf gerekir.

## 7. Kategori, koleksiyon ve etiket
- **Kategoriler:** ürünlerin ana sınıfı (örneğin çiçek desenleri). Ad, sıra ve isteğe bağlı arama motoru başlığı/açıklaması girilir.
- **Koleksiyonlar:** seçilmiş ürün grupları (örneğin yeni gelenler). Ürünleri koleksiyona ekleyip sırasını belirleyebilirsiniz.
- **Etiketler:** ürünleri süzmeye yarayan kısa anahtar sözcükler.
- İçinde ürün olan bir kategoriyi silmeden önce ürünleri başka kategoriye taşıyın.

## 8. Yayına alma şartları
Bir ürün yayına alınırken sistem şunları arar; biri eksikse hangisinin eksik olduğunu yazar:
- Fiyat sıfırdan büyük olmalı.
- En az bir fotoğraf olmalı.
- Dijital desende en az bir geçerli ve aktif dosya olmalı.
Ürünü **yayından kaldırabilir** (taslağa alma) veya **arşivleyebilirsiniz**. Sipariş geçmişi olan ürünler silinmez, arşivlenir; eski siparişler değişmez.

Not: "demo" etiketli ürünler örnek ürünlerdir; mağaza canlıya çıkmadan önce kaldırılır.

## 9. Stok
- **Stok** sayfasında fiziksel ürünlerin eldeki ve rezerve (sepette/ödeme bekleyen) adetleri görünür.
- Adet girip kaydedin; stok eksiye düşmez. Sipariş verilen adetler ödeme bekleyen süre boyunca (varsayılan 30 dakika) ayrılır; ödeme gelmezse otomatik serbest kalır.
- Dijital desenlerde stok sınırı yoktur.

## 10. CSV ile toplu yükleme
1. **Toplu İşlemler** → "Şablon indir" ile örnek CSV dosyasını alın ve Excel'de doldurun.
2. Sütunlar: sku, ad, tur, fiyat, karsilastirma_fiyati, kategori, kisa_aciklama, aciklama, etiketler, formatlar, stok, genislik_mm, yukseklik_mm, dikis_sayisi, renk_sayisi. Fiyat TL olarak yazılır.
3. Dosyayı yükleyip **önizleme** yapın; hatalı satırlar nedenleriyle listelenir.
4. Düzeltin ve "içe aktar" deyin. Bir seferde en fazla 1000 satır alınır. İçe aktarılan ürünler **taslak** gelir; fotoğraf/dosya ekleyip yayına almanız gerekir.

## 11. Siparişler
**Siparişler** sayfasında numara, durum veya müşteriye göre arama yapın. Bir siparişi açınca kalemleri, ödeme durumunu, adresi ve geçmişi görürsünüz.

- **Ödeme bekleniyor:** müşteri henüz ödemedi. Bu sipariş için indirme verilmez.
- **Ödendi:** yalnızca ödeme sağlayıcısından onay gelince veya sizin manuel ödeme kaydınızla olur.
- **Kargolama (fiziksel ürün):** "Kargoya verildi" deyip kargo firması ve takip numarasını yazın; müşteriye bildirilir.
- **İptal:** henüz teslim edilmemiş siparişi iptal edebilirsiniz. Ayrılan stok geri döner ve işlem kayda geçer.
- **İade:** ödenmiş siparişi iade ettiğinizde dijital indirme hakları kapanır (sistem ayarına bağlı). Gerçek para iadesini ödeme sağlayıcısının panelinden de yapmanız gerekebilir.
- **Manuel ödeme kaydı (havale/EFT):** müşteri banka havalesi yaptıysa, parayı hesabınızda gördükten sonra siparişten "manuel ödeme" ekleyin. **Dekont/referans numarası zorunludur.** Bu işlemi yalnızca Süper Yönetici ve Sipariş Yöneticisi yapabilir; kayda geçer. Para gelmeden işaretlemeyin.
- Sipariş durumları yalnızca mantıklı sırayla değişir (örneğin iptal edilmiş sipariş kargoya verilemez).

## 12. Kişiye özel talepler ve teklif
1. **Kişiye Özel Talepler**'de müşterinin formdan gönderdiği istekleri, referans görselleri ve notları görürsünüz.
2. Talebi inceleyip müşteriye **teklif** hazırlayın: tutar (TL), tahmini süre ve açıklama.
3. Teklif müşteriye e-postayla gider; müşteri kabul veya reddeder. Kabul edilen teklif siparişe dönüşür; iş bitince durumu ilerletin.
4. Şu an yeni talep geldiğinde otomatik e-posta bildirimi gelmeyebilir; paneli düzenli kontrol edin.

## 13. Kuponlar
- **Kuponlar** → yeni kupon: kod, tür (yüzde veya sabit TL), tutar/oran, geçerlilik tarihleri, toplam kullanım sınırı ve asgari sepet tutarı.
- Kupon kodunu pasif yaparak kullanımı durdurabilirsiniz. Kullanım sınırı dolunca kupon çalışmaz; aynı anda çok kişi kullansa bile sınır aşılmaz.

## 14. Ayarlar ve içerik
- **Ayarlar:** site adı, iletişim e-postası/telefonu/adresi, WhatsApp numarası, kargo ücreti ve ücretsiz kargo sınırı, indirme politikası (hak sayısı vb.). Bilgileri yalnızca gerçek değerlerle doldurun.
- **İçerik:** duyuru çubuğu (sitenin üstündeki kısa mesaj) ve yasal metinler: KVKK, mesafeli satış sözleşmesi, iade/iptal, gizlilik, çerez. Yasal metinleri **avukat onayıyla** girin; sistem metin uydurmaz.
- Bağlantılar yalnızca site içi yol veya `https://` ile başlayan adres olabilir; WhatsApp bağlantısı `wa.me` olmalıdır.

## 15. Yönetici hesapları
- **Yöneticiler** sayfasında yeni kişi ekleyebilir, rolünü değiştirebilir veya hesabı pasif yapabilirsiniz. Her kişiye ayrı hesap açın; parola paylaşmayın.
- Roller: **Süper Yönetici** (her şey), **Yönetici**, **Ürün Yöneticisi** (ürün ve katalog), **Sipariş Yöneticisi** (sipariş, kargo, müşteri).
- Son Süper Yönetici silinemez veya pasifleştirilemez.
- **Denetim Kaydı:** kimin ne zaman neyi değiştirdiğini gösterir. Silinemez.
- **Müşteriler:** müşteri verisini dışa aktarabilir veya KVKK talebi üzerine **anonimleştirebilirsiniz**: kişisel bilgiler silinir, sipariş tutarları muhasebe için korunur. Bu işlem geri alınamaz; panel onay ister.

## 16. Sık sorulanlar
**Ürünü yayına alamıyorum.** Hata mesajındaki eksiği tamamlayın (fiyat, fotoğraf, dosya).

**Müşteri ödedim diyor ama sipariş "ödeme bekleniyor".** Gerçek ödeme sistemi bağlıysa bir dakika bekleyin ve sayfayı yenileyin. Havale ise bölüm 11'deki manuel ödeme kaydını kullanın.

**Müşteri indirme bağlantısını açamıyor.** Siparişin "ödendi" olduğunu, iptal/iade edilmediğini ve indirme hakkının bitmediğini kontrol edin. Gerekirse İndirme Kayıtları'ndan geçmişe bakın.

**Yanlış fiyat girdim.** Ürünü açıp düzeltin. Eski siparişler sipariş anındaki fiyatı korur.

**Parolamı unuttum.** Giriş sayfasındaki "parolamı unuttum" bağlantısını kullanın.

**Yanlışlıkla bir şeyi sildim/değiştirdim.** Denetim Kaydı'ndan ne olduğunu görün; teknik destek gerekiyorsa o kaydı gösterin.

**Sitede "demo" ürünler görünüyor.** Bunlar örnek ürünlerdir; canlıdan önce kaldırılır.

**Müşteri ödeme yaparken kart bilgisi bende mi kalıyor?** Hayır. Kart bilgisi sistemde tutulmaz.
