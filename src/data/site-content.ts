export interface InfoPageContent {
  slug: string;
  title: string;
  lead: string;
  isLegalPlaceholder?: boolean;
  sections: {
    heading: string;
    body: string[];
  }[];
}

export const MACHINE_FORMAT_GUIDE: Record<
  string,
  { formats: string[]; note: string }
> = {
  PFAFF: {
    formats: ["VP3", "VIP", "PCS"],
    note: "PFAFF Creative serisi makineler için en yüksek renk ve dikiş hassasiyeti VP3 formatındadır.",
  },
  "Husqvarna Viking": {
    formats: ["VP3", "HUS", "VIP"],
    note: "Güncel Husqvarna Viking modellerinde VP3, klasik modellerde HUS formatı önerilir.",
  },
  Brother: {
    formats: ["PES", "PEC"],
    note: "Brother ve Baby Lock ev tipi nakış makineleri PES formatını doğrudan okur.",
  },
  Janome: {
    formats: ["JEF"],
    note: "Janome ve Elna modelleri için JEF formatı kasnak merkezlemesini korur.",
  },
  Bernina: {
    formats: ["EXP"],
    note: "Bernina makineler USB üzerinden EXP formatını sorunsuz şekilde işler.",
  },
  Tajima: {
    formats: ["DST"],
    note: "Endüstriyel çok kafalı makinelerde DST standart üretim formatıdır; renk sırası PDF kartından girilir.",
  },
  Singer: {
    formats: ["XXX", "DST"],
    note: "Singer Futura serisi için XXX formatı uyumludur.",
  },
};

export const EXAMPLE_SEARCHES = [
  "VP3 gül nakışı",
  "PFAFF çiçek deseni",
  "Bebek ismi",
  "Havlu kenarı nakışı",
  "10x10 nakış",
  "Dantel desenleri",
  "Kelebek nakışı",
  "Kedi figürü",
];

/**
 * Yapılandırılabilir mağaza ve yasal bilgilendirme metinleri.
 * İşletmenin resmi unvanı, vergi numarası, açık adresi ve hukuki onaylı sözleşme
 * metinleri yayın öncesi yönetim panelinden tanımlanmalıdır.
 */
export const STUDIO_SETTINGS = {
  freeShippingThresholdKurus: 150000, // 1.500,00 ₺
  standardShippingKurus: 8900, // 89,00 ₺
};

export const INFO_PAGES: Record<string, InfoPageContent> = {
  "kargo-ve-teslimat": {
    slug: "kargo-ve-teslimat",
    title: "Kargo ve Teslimat",
    lead: "Fiziksel tekstil ürünleri ile dijital nakış dosyaları ihtiyaçlarına uygun ayrı teslimat süreçleriyle ulaştırılır.",
    sections: [
      {
        heading: "Dijital nakış dosyalarının teslimatı",
        body: [
          "Dijital nakış desenleri fiziksel gönderim gerektirmez; kargo ücreti yansıtılmaz ve teslimat adresi sorulmaz.",
          "Ödeme işlemi onaylandığında satın aldığınız formatlara ait güvenli indirme bağlantıları Hesabım > Dijital İndirmelerim alanında erişime açılır.",
        ],
      },
      {
        heading: "Fiziksel tekstil ve kişiselleştirilmiş ürünler",
        body: [
          "Stokta bulunan işlemeli tekstil ürünleri 2 ila 4 iş günü içinde kalite kontrolden geçirilerek hazırlanır.",
          "İsim, monogram veya özel ölçüyle kişiselleştirilen parçalar atölye yoğunluğuna bağlı olarak ortalama 3 ila 5 iş günü içinde kargoya teslim edilir.",
          "Anlaşmalı kargo firması ve güncel gönderim ücretleri yayına geçiş öncesinde yönetim panelinden tanımlanacaktır.",
        ],
      },
    ],
  },
  "dijital-indirme-kosullari": {
    slug: "dijital-indirme-kosullari",
    title: "Dijital Ürün İndirme ve Lisans Koşulları",
    lead: "Satın alınan makine nakışı dosyalarının kullanım kapsamı, format doğrulaması ve telif hakları.",
    sections: [
      {
        heading: "Makine ve kasnak uyumluluğu",
        body: [
          "Her dijital ürün sayfasında yalnızca o ürüne gerçekten ait olan dosya formatları ve test edilmiş kasnak ölçüleri listelenir.",
          "Sipariş öncesinde kendi nakış makinenizin desteklediği formatı ve maksimum kasnak ölçüsünü ürün detayındaki uyumluluk yardımcısıyla kontrol etmeniz önerilir.",
        ],
      },
      {
        heading: "Kişisel ve küçük işletme lisansları",
        body: [
          "Kişisel Kullanım lisansı, deseni kendi kişisel projelerinizde ve hediyelik ürünlerinizde işlemenize olanak tanır.",
          "Küçük İşletme lisansı, deseni kendi atölyenizde işlediğiniz sınırlı sayıda fiziksel ürünün satışında kullanmanıza izin verir.",
          "Hiçbir lisans türünde dijital nakış dosyasının kendisi paylaşılamaz, yeniden satılamaz veya başka bir formatta dağıtılamaz.",
        ],
      },
    ],
  },
  "iade-ve-iptal": {
    slug: "iade-ve-iptal",
    title: "İptal ve İade Koşulları",
    lead: "Fiziksel ürünler, kişiye özel üretim parçalar ve anında teslim edilen dijital içerikler için şeffaf iade çerçevesi.",
    isLegalPlaceholder: true,
    sections: [
      {
        heading: "Standart fiziksel ürünler",
        body: [
          "Kişiselleştirme uygulanmamış, kullanılmamış, yıkanmamış ve orijinal ambalajı bozulmamış fiziksel ürünlerde 6502 sayılı Tüketicinin Korunması Hakkında Kanun çerçevesinde teslimattan itibaren 14 gün içinde cayma hakkı kullanılabilir.",
        ],
      },
      {
        heading: "Kişiye özel ve dijital ürünler",
        body: [
          "Tüketicinin talebi doğrultusunda isim, monogram veya özel ölçü ile kişiselleştirilen ürünlerde üretim başladıktan sonra iade kabul edilememektedir.",
          "Elektronik ortamda anında ifa edilen dijital nakış dosyalarında indirme onayı verildikten sonra cayma hakkı istisnası uygulanır. Dosyada teknik bir hata bulunması halinde atölyemiz ücretsiz düzeltme ve teknik destek sağlar.",
        ],
      },
    ],
  },
  "mesafeli-satis-sozlesmesi": {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi",
    lead: "Bu sayfa işletmenin resmi ticari bilgileri ve hukuk danışmanı onayıyla yayına alınacak yapılandırılabilir sözleşme şablonudur.",
    isLegalPlaceholder: true,
    sections: [
      {
        heading: "Satıcı bilgileri (Yapılandırılabilir alan)",
        body: [
          "Ticari Unvan, MERSİS/Vergi Numarası, açık tebligat adresi ve resmi iletişim kanalları yönetim panelindeki Yasal Metinler bölümünden eklenecektir.",
        ],
      },
      {
        heading: "Sözleşme kapsamı",
        body: [
          "6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca fiziksel tekstil teslimatları ile elektronik ortamda anında ifa edilen dijital nakış dosyalarına ilişkin ön bilgilendirme ve onay akışı ödeme aşamasında dinamik olarak oluşturulacaktır.",
        ],
      },
    ],
  },
  "gizlilik-ve-kvkk": {
    slug: "gizlilik-ve-kvkk",
    title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    lead: "Kişisel verilerin 6698 sayılı KVKK kapsamında işlenmesi, saklanması ve çerez tercihlerine ilişkin yapılandırılabilir bilgilendirme alanı.",
    isLegalPlaceholder: true,
    sections: [
      {
        heading: "Veri sorumlusu ve şeffaflık",
        body: [
          "Bu metin ön yüz tasarım ve bilgi mimarisi incelemesi için yapılandırılabilir taslak olarak hazırlanmıştır. Canlı yayına geçmeden önce işletmenin resmi veri sorumlusu bilgileri ve hukuki onaylı KVKK metni ile güncellenecektir.",
        ],
      },
      {
        heading: "Ödeme ve dosya güvenliği ilkesi",
        body: [
          "Kart bilgileri hiçbir aşamada uygulama veritabanında saklanmaz; ödeme işlemleri lisanslı ödeme kuruluşu altyapısı üzerinden yürütülür.",
        ],
      },
    ],
  },
  "kullanim-kosullari": {
    slug: "kullanim-kosullari",
    title: "Kullanım Koşulları",
    lead: "Çevrimiçi mağazanın kullanımına ve fikri mülkiyet haklarına ilişkin genel esaslar.",
    isLegalPlaceholder: true,
    sections: [
      {
        heading: "Fikri mülkiyet ve marka hakları",
        body: [
          "Site logosu, özgün nakış desenleri, dijital dosyalar ve görsel içerikler marka sahibine aittir; izinsiz çoğaltılamaz ve ticari amaçla dağıtılamaz.",
        ],
      },
    ],
  },
  iletisim: {
    slug: "iletisim",
    title: "İletişim ve Atölye Desteği",
    lead: "Makine uyumluluğu, toplu kurumsal nakış projeleri ve kişiye özel siparişleriniz için bizimle iletişime geçebilirsiniz.",
    sections: [
      {
        heading: "Atölye iletişim bilgileri",
        body: [
          "E-posta: Yayın öncesi yönetim panelinden tanımlanacaktır.",
          "Telefon / WhatsApp: Yayın öncesi işletme sahibinin resmi hattı tanımlanacaktır.",
          "Adres: Resmi atölye adresi ve ziyaret saatleri yönetim panelinden güncellenecektir.",
        ],
      },
      {
        heading: "Kişiye özel tasarım ve kurumsal talepler",
        body: [
          "İsim, monogram, logo nakışı veya özel ölçü dijital desen taleplerinizi doğrudan Kişiye Özel Tasarım sayfamız üzerinden referans görsel ekleyerek iletebilirsiniz.",
        ],
      },
    ],
  },
};
