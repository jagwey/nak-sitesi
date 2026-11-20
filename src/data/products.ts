export type ProductType = "digital" | "physical";

export type EmbroideryFormat =
  | "VP3"
  | "PES"
  | "DST"
  | "JEF"
  | "HUS"
  | "EXP"
  | "XXX"
  | "VIP"
  | "PEC"
  | "PCS";

export type MachineBrand =
  | "PFAFF"
  | "Brother"
  | "Janome"
  | "Bernina"
  | "Husqvarna Viking"
  | "Tajima"
  | "Singer";

export type HoopSize =
  | "10x10 cm"
  | "13x18 cm"
  | "16x26 cm"
  | "20x20 cm"
  | "20x36 cm";

export type UsageArea =
  | "Havlu"
  | "Bebek Tekstili"
  | "Masa Örtüsü"
  | "Giyim"
  | "Çanta ve Aksesuar"
  | "Duvar Panosu"
  | "Mutfak Tekstili";

export type LicenseType = "Kişisel Kullanım" | "Küçük İşletme";

export interface ThreadColorStop {
  step: number;
  name: string;
  code: string;
  hex: string;
  stitches: number;
}

export interface EmbroideryMetadata {
  formats: EmbroideryFormat[];
  supportedMachines: MachineBrand[];
  hoopSize: HoopSize;
  widthMm: number;
  heightMm: number;
  stitchCount: number;
  colorCount: number;
  colorChanges: number;
  patternSizeCategory: "Küçük (< 10 cm)" | "Orta (10–18 cm)" | "Büyük (> 18 cm)";
  licenses: LicenseType[];
  commercialPriceDeltaKurus: number;
  threadChart: ThreadColorStop[];
  usageInstructions: string[];
  downloadTerms: string;
  isBundle?: boolean;
  bundleCount?: number;
  /** True only when every listed format has a current uploaded file. False = format list is declared metadata. */
  formatsVerified?: boolean;
}

export interface PhysicalColorOption {
  name: string;
  hex: string;
}

export interface PhysicalMetadata {
  inStock: boolean;
  stockNote: string;
  colors: PhysicalColorOption[];
  sizes: string[];
  material: string;
  productionTime: string;
  shippingEstimate: string;
  careInstructions: string[];
  personalizationPriceKurus?: number;
  surfaceType?: "linen" | "towel" | "canvas" | "muslin";
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  type: ProductType;
  categorySlug: string;
  categoryName: string;
  priceKurus: number;
  compareAtPriceKurus?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  personalizable: boolean;
  usageAreas: UsageArea[];
  tags: string[];
  images: {
    url: string;
    alt: string;
    caption: string;
  }[];
  description: string;
  highlights: string[];
  embroidery?: EmbroideryMetadata;
  physical?: PhysicalMetadata;
  /** Seeded demo record (not a real product). Set by the DB catalog service. */
  isDemo?: boolean;
}

/**
 * DEMO KATALOG VERİLERİ
 * Bu ürün listesi ön yüz tasarım onayı için hazırlanmış gerçekçi demo verileridir.
 * Gerçek işletme fiyatları, stokları ve nakış dosyaları 2. aşamada yönetim paneli
 * ve güvenli sunucu altyapısından yönetilecektir.
 */
export const PRODUCTS: Product[] = [
  {
    id: "tb-dig-01",
    slug: "bahce-gulu-botanik-nakis-deseni-vp3",
    name: "Bahçe Gülü Botanik Nakış Deseni",
    subtitle: "Katmanlı saten ve dolgu dikişli klasik gül ve eğrelti otu kompozisyonu.",
    type: "digital",
    categorySlug: "dijital-nakis-desenleri",
    categoryName: "Dijital Nakış Desenleri",
    priceKurus: 19500,
    isNew: true,
    isFeatured: true,
    personalizable: false,
    usageAreas: ["Masa Örtüsü", "Havlu", "Duvar Panosu", "Giyim"],
    tags: [
      "gül",
      "çiçek",
      "botanik",
      "vp3",
      "pfaff",
      "gül nakışı",
      "keten",
      "13x18",
      "yaprak",
    ],
    images: [
      {
        url: "/images/prod-rose-vp3.webp",
        alt: "Doğal Belçika keteni üzerine işlenmiş gül ve eğrelti otu makine nakışı",
        caption: "Doğal ham keten kumaş üzerindeki test dikişi görünümü (Demo konsept görseli)",
      },
      {
        url: "/images/prod-rose-vp3-macro.webp",
        alt: "Gül nakışının katmanlı saten dikiş ve iplik parlaklığı makro detayı",
        caption: "Katmanlı saten ve yaprak dikiş yoğunluğu yakın çekimi",
      },
    ],
    description:
      "Klasik botanik gravürlerden ilham alan bu makine nakışı deseni, yumuşak renk geçişleri ve dengeli dikiş yoğunluğu ile özellikle doğal keten, pamuklu kumaş ve ağır gramajlı havlularda pürüzsüz sonuç verecek biçimde dijitalleştirilmiştir. PFAFF kasnak geometrisi esas alınarak hazırlanmış, iplik kopma ve çekme riskini azaltan alt dikiş (underlay) yapısına sahiptir.",
    highlights: [
      "PFAFF VP3 başta olmak üzere 6 makine formatı tek arşivde sunulur.",
      "İplik kesme sayısını en aza indiren akıllı atlama (jump-stitch) optimizasyonu içerir.",
      "Renk sırası ve iplik tablosu ürün sayfasında listelenir.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "HUS", "EXP"],
      supportedMachines: [
        "PFAFF",
        "Brother",
        "Janome",
        "Husqvarna Viking",
        "Bernina",
        "Tajima",
      ],
      hoopSize: "13x18 cm",
      widthMm: 124,
      heightMm: 162,
      stitchCount: 19480,
      colorCount: 6,
      colorChanges: 8,
      patternSizeCategory: "Orta (10–18 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 18000,
      threadChart: [
        { step: 1, name: "Koyu Espresso Yaprak", code: "Rayon 1058", hex: "#3A2B24", stitches: 2640 },
        { step: 2, name: "Zeytin Yeşili Gövde", code: "Rayon 1170", hex: "#6F744C", stitches: 4120 },
        { step: 3, name: "Yosun Yeşili Damar", code: "Rayon 1248", hex: "#8B8F63", stitches: 3180 },
        { step: 4, name: "Kuru Gül Kurusu Gölge", code: "Rayon 1117", hex: "#9E6661", stitches: 4390 },
        { step: 5, name: "Pudra Gül Yaprağı", code: "Rayon 1309", hex: "#C89B93", stitches: 3420 },
        { step: 6, name: "Şampanya Altın Işık", code: "Rayon 1066", hex: "#C9AD7E", stitches: 1730 },
      ],
      usageInstructions: [
        "Orta gramajlı keten ve pamuklu kumaşlarda 1 kat yırtılabilir (tear-away) veya kesilebilir (cut-away) tela kullanın.",
        "Havlularda ipliklerin tüyler arasına gömülmemesi için üst yüzeye suda eriyen (water-soluble) şeffaf tela yerleştirin.",
        "Desen boyutunu makine veya yazılımda en fazla ±%10 oranında ölçeklendirmeniz önerilir.",
      ],
      downloadTerms:
        "Ödeme onayının ardından seçtiğiniz formatları içeren güvenli indirme bağlantısı hesabınızdaki Dijital İndirmelerim bölümünde açılır. Dijital içeriklerde indirme başlatıldıktan sonra yasal cayma hakkı istisnası geçerlidir.",
    },
  },
  {
    id: "tb-dig-02",
    slug: "kir-cicegi-okaliptus-celenk-deseni",
    name: "Kır Çiçeği ve Okaliptüs Çelengi",
    subtitle: "Monogram ve isim yerleştirmeye uygun orta boşluklu botanik çelenk.",
    type: "digital",
    categorySlug: "cicek-ve-botanik",
    categoryName: "Çiçek ve Botanik",
    priceKurus: 17500,
    isNew: true,
    isFeatured: true,
    personalizable: false,
    usageAreas: ["Duvar Panosu", "Masa Örtüsü", "Bebek Tekstili", "Havlu"],
    tags: [
      "çiçek",
      "çelenk",
      "okaliptüs",
      "papatya",
      "lavanta",
      "vp3",
      "pfaff",
      "13x18",
      "botanik",
    ],
    images: [
      {
        url: "/images/prod-botanical-wreath.webp",
        alt: "Ahşap kasnakta doğal keten üzerine işlenmiş kır çiçeği ve okaliptüs çelengi",
        caption: "13x18 cm kasnak ölçüsünde ham keten test işleme örneği (Demo konsept görseli)",
      },
      {
        url: "/images/prod-botanical-wreath-macro.webp",
        alt: "Okaliptüs yaprakları ve papatya çiçeklerinin dikiş detayı",
        caption: "Yaprak saten dikişleri ve düğüm detayları yakın çekimi",
      },
    ],
    description:
      "İç çemberi isteğe bağlı baş harf veya isim eklemeye uygun bırakılmış, okaliptüs yaprakları, papatya ve lavanta dallarından oluşan zarif bir çelenk desenidir. Hem duvar panosu hem de bebek odası ve çeyiz tekstilleri için idealdir.",
    highlights: [
      "Merkezinde 72 mm serbest monogram yerleştirme alanı bulunur.",
      "PFAFF VP3 ve Brother PES dahil 5 formatta hazır teslim edilir.",
      "Düşük büzülme katsayısı ile ince ketenlerde temiz yüzey sağlar.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "VIP"],
      supportedMachines: ["PFAFF", "Brother", "Janome", "Husqvarna Viking", "Tajima"],
      hoopSize: "13x18 cm",
      widthMm: 128,
      heightMm: 128,
      stitchCount: 15840,
      colorCount: 5,
      colorChanges: 7,
      patternSizeCategory: "Orta (10–18 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 15000,
      threadChart: [
        { step: 1, name: "Okaliptüs Yeşili", code: "Rayon 1370", hex: "#7E8A6B", stitches: 5410 },
        { step: 2, name: "Koyu Zeytin Dalı", code: "Rayon 1170", hex: "#5A6245", stitches: 3120 },
        { step: 3, name: "Krem Papatya", code: "Rayon 1071", hex: "#F0EAE0", stitches: 3290 },
        { step: 4, name: "Antik Altın Tohum", code: "Rayon 1069", hex: "#B18A49", stitches: 2140 },
        { step: 5, name: "Soluk Lavanta", code: "Rayon 1122", hex: "#9A8EA6", stitches: 1880 },
      ],
      usageInstructions: [
        "Orta ağırlıkta keten veya pamuk kumaşı kasnağa gergin fakat esnetmeden yerleştirin.",
        "İç boşluğa kendi makinenizin yazı tipinden isim ekleyerek kişiselleştirme yapabilirsiniz.",
      ],
      downloadTerms:
        "Satın alma sonrası ZIP arşivi içerisinde yalnızca VP3, PES, DST, JEF ve VIP dosyaları ile renk tablosu PDF belgesi sunulur.",
    },
  },
  {
    id: "tb-dig-03",
    slug: "klasik-serif-botanik-monogram-alfabesi",
    name: "Klasik Serif Botanik Monogram Alfabesi",
    subtitle: "Türkçe karakter destekli 29 harflik çiçek sarmaşıklı nakış alfabesi paketi.",
    type: "digital",
    categorySlug: "harf-ve-monogram",
    categoryName: "Harf ve Monogram",
    priceKurus: 34000,
    compareAtPriceKurus: 42000,
    isFeatured: true,
    personalizable: false,
    usageAreas: ["Havlu", "Masa Örtüsü", "Giyim", "Bebek Tekstili"],
    tags: [
      "harf",
      "monogram",
      "alfabe",
      "bebek ismi",
      "isim",
      "mendil",
      "10x10",
      "vp3",
      "pfaff",
      "paket",
    ],
    images: [
      {
        url: "/images/prod-monogram-m.webp",
        alt: "Ekru keten mendil üzerinde altın iplikle işlenmiş botanik M monogramı",
        caption: "10x10 cm kasnak uyumlu M harfi keten mendil uygulaması (Demo konsept görseli)",
      },
      {
        url: "/images/prod-monogram-m-macro.webp",
        alt: "Monogram harfinin yüksek kabartmalı saten dikiş yakın çekimi",
        caption: "Altın iplik kabartma dikiş ve yaprak kontur detayı",
      },
    ],
    description:
      "Ç, Ğ, İ, Ö, Ş ve Ü dahil eksiksiz Türk alfabesini kapsayan 29 adet baş harf deseninden oluşan dijital pakettir. Her harf hem 10x10 cm küçük kasnak hem de 13x18 cm orta kasnak için iki ayrı boyutta ayrı ayrı dijitalleştirilmiştir; yalnızca küçültme değil gerçek yoğunluk uyarlaması yapılmıştır.",
    highlights: [
      "Ç, Ğ, İ, Ö, Ş, Ü dahil 29 Türkçe harf, 2 ayrı kasnak boyutunda (toplam 58 dosya).",
      "10x10 cm kasnakta mendil, yaka ve bebek önlüğü için ideal netlik.",
      "Altın ve koyu kahverengi 2 renkli hızlı işleme akışı.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "HUS", "XXX", "PEC"],
      supportedMachines: [
        "PFAFF",
        "Brother",
        "Janome",
        "Husqvarna Viking",
        "Singer",
        "Tajima",
      ],
      hoopSize: "10x10 cm",
      widthMm: 78,
      heightMm: 86,
      stitchCount: 6420,
      colorCount: 2,
      colorChanges: 2,
      patternSizeCategory: "Küçük (< 10 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 26000,
      isBundle: true,
      bundleCount: 29,
      threadChart: [
        { step: 1, name: "Antik Altın Harf Gövdesi", code: "Rayon 1069", hex: "#B18A49", stitches: 4580 },
        { step: 2, name: "Koyu Kahve Sarmaşık Dalı", code: "Rayon 1058", hex: "#4A372C", stitches: 1840 },
      ],
      usageInstructions: [
        "İnce mendil keteninde 75/11 ince uçlu nakış iğnesi ve 40 numara rayon iplik önerilir.",
        "Metalik altın iplik kullanacaksanız makine hızını 500 dikiş/dakika seviyesine düşürün ve metalik iğne tercih edin.",
      ],
      downloadTerms:
        "29 harfin tamamı formatlara göre ayrı klasörlenmiş şekilde tek güvenli arşiv halinde indirilir.",
    },
  },
  {
    id: "tb-dig-04",
    slug: "masal-ayicik-bebek-nakis-deseni",
    name: "Masal Ayıcık Bebek Nakış Deseni",
    subtitle: "Organik müslin ve bebek battaniyeleri için yumuşak dokulu ayıcık ve yıldızlar.",
    type: "digital",
    categorySlug: "cocuk-ve-bebek",
    categoryName: "Çocuk ve Bebek",
    priceKurus: 15500,
    isNew: true,
    isFeatured: false,
    personalizable: false,
    usageAreas: ["Bebek Tekstili", "Havlu", "Giyim"],
    tags: [
      "bebek",
      "çocuk",
      "ayıcık",
      "müslin",
      "bebek battaniyesi",
      "10x10",
      "vp3",
      "pfaff",
      "bebek ismi",
    ],
    images: [
      {
        url: "/images/prod-baby-bear.webp",
        alt: "Krem organik müslin bebek battaniyesi üzerine işlenmiş ayıcık ve yıldız nakışı",
        caption: "4 katlı pamuk müslin kumaş üzerinde yumuşak yoğunluklu test dikişi (Demo konsept görseli)",
      },
      {
        url: "/images/prod-baby-bear-macro.webp",
        alt: "Ayıcık nakışının yumuşak tatami dolgu dikiş detayı",
        caption: "Hassas bebek cildine uygun düşük sertlikli dolgu dikişi yakın çekimi",
      },
    ],
    description:
      "Bebek battaniyesi, hastane çıkışı, önlük ve müslin örtüler düşünülerek yumuşak dokulu (low-density) tatami dolgu tekniğiyle tasarlanmıştır. Kumaşta sertlik yaratmaz ve altına bebek ismi eklenebilecek şekilde dengeli biçimde konumlandırılmıştır.",
    highlights: [
      "Müslin gibi gevşek dokulu kumaşlarda büzülme yapmayan özel alt dikiş.",
      "10x10 cm standart küçük kasnağa tam sığar.",
      "4 sakin pastel-doğal iplik tonu ile hızlı üretim.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "HUS"],
      supportedMachines: ["PFAFF", "Brother", "Janome", "Husqvarna Viking", "Tajima"],
      hoopSize: "10x10 cm",
      widthMm: 88,
      heightMm: 94,
      stitchCount: 11240,
      colorCount: 4,
      colorChanges: 5,
      patternSizeCategory: "Küçük (< 10 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 14000,
      threadChart: [
        { step: 1, name: "Yulaf Karamel Kürk", code: "Rayon 1144", hex: "#B99A7B", stitches: 6210 },
        { step: 2, name: "Ekru Krem Detay", code: "Rayon 1071", hex: "#EAE0D0", stitches: 2150 },
        { step: 3, name: "Kakao Kontur", code: "Rayon 1058", hex: "#5A4235", stitches: 1790 },
        { step: 4, name: "Şampanya Yıldızlar", code: "Rayon 1069", hex: "#C2A164", stitches: 1090 },
      ],
      usageInstructions: [
        "Müslin kumaşın altına yumuşak no-show mesh tela, üstüne suda eriyen film kullanın.",
        "İşleme bitiminde iç yüzeye pamuklu ütü koruyucu (cloud cover) uygulayarak bebek cildini koruyun.",
      ],
      downloadTerms:
        "VP3, PES, DST, JEF ve HUS dosyaları ile renk sırası rehberi indirilebilir.",
    },
  },
  {
    id: "tb-dig-05",
    slug: "ajurlu-dantel-havlu-kenari-fsl",
    name: "Ajurlu Dantel Havlu Kenarı (FSL)",
    subtitle: "Suda eriyen tela üzerinde tek başına işlenebilen uç uca eklenebilir dantel bordür.",
    type: "digital",
    categorySlug: "ozel-gunler",
    categoryName: "Özel Günler",
    priceKurus: 21500,
    isFeatured: true,
    personalizable: false,
    usageAreas: ["Havlu", "Masa Örtüsü", "Duvar Panosu"],
    tags: [
      "dantel",
      "fsl",
      "havlu kenarı",
      "bordür",
      "ajur",
      "çeyiz",
      "vp3",
      "pfaff",
      "13x18",
      "16x26",
    ],
    images: [
      {
        url: "/images/prod-lace-border.webp",
        alt: "Ham keten kumaş üzerine yerleştirilmiş krem rengi ajurlu makine danteli bordürü",
        caption: "Krem pamuk iplikle işlenmiş serbest ajurlu dantel kenar uygulaması (Demo konsept görseli)",
      },
      {
        url: "/images/prod-lace-border-macro.webp",
        alt: "Serbest dantel ajur ağ yapısı ve dilimli kenar dikiş detayı",
        caption: "Sıkı kilitli ağ örgüsü ve dilimli kenar yakın çekimi",
      },
    ],
    description:
      "Freestanding Lace (FSL) tekniğiyle yalnızca suda eriyen tela üzerinde işlenebilen, birbirine kesintisiz eklenebilir kenar dantelidir. Havlu uçları, keten peçete kenarları ve çeyiz runnerları için hem 13x18 cm hem 16x26 cm uzun bordür versiyonlarını içerir.",
    highlights: [
      "Tek renkli kesintisiz akış: renk değişimi gerektirmez.",
      "Yıkama sonrası formunu koruyan çift kilitli ajur kafesi.",
      "50 cm havlu eni için uç uca hizalama kılavuzu dahildir.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "HUS", "EXP", "PCS"],
      supportedMachines: [
        "PFAFF",
        "Brother",
        "Janome",
        "Bernina",
        "Husqvarna Viking",
        "Tajima",
      ],
      hoopSize: "16x26 cm",
      widthMm: 236,
      heightMm: 64,
      stitchCount: 22650,
      colorCount: 1,
      colorChanges: 1,
      patternSizeCategory: "Büyük (> 18 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 19000,
      threadChart: [
        { step: 1, name: "Doğal Fildişi Pamuk İplik", code: "Cotona 672", hex: "#EFE8DA", stitches: 22650 },
      ],
      usageInstructions: [
        "Mutlaka 2 kat kumaş dokulu suda eriyen tela (fibrous wash-away stabilizer) kullanın; ince şeffaf film FSL için uygun değildir.",
        "Masura (alt) ipliğini üst iplikle aynı renk ve kalitede sarın.",
        "İşleme sonrası ılık suda durulayıp düz bir havlu üzerinde şekillendirerek kurutun.",
      ],
      downloadTerms:
        "13x18 cm (172 mm) ve 16x26 cm (236 mm) iki uzunluk versiyonu ile Türkçe FSL uygulama rehberi dahildir.",
    },
  },
  {
    id: "tb-dig-06",
    slug: "ipek-kanat-kelebek-nakis-deseni",
    name: "İpek Kanat Kelebek Nakış Deseni",
    subtitle: "Altın, bronz ve koyu kahve tonlamalı zarif kırlangıçkuyruk kelebek.",
    type: "digital",
    categorySlug: "cicek-ve-botanik",
    categoryName: "Çiçek ve Botanik",
    priceKurus: 14500,
    isNew: true,
    isFeatured: false,
    personalizable: false,
    usageAreas: ["Giyim", "Çanta ve Aksesuar", "Duvar Panosu"],
    tags: [
      "kelebek",
      "kelebek nakışı",
      "altın",
      "10x10",
      "vp3",
      "pfaff",
      "gömlek",
      "yaka",
    ],
    images: [
      {
        url: "/images/prod-butterfly-silk.webp",
        alt: "Krem keten üzerinde altın ve koyu kahve ipliklerle işlenmiş kelebek nakışı",
        caption: "İnce keten gömlek ve aksesuarlar için 10x10 cm uyumlu test dikişi (Demo konsept görseli)",
      },
      {
        url: "/images/prod-butterfly-silk-macro.webp",
        alt: "Kelebek kanatlarındaki ipek gölgelendirme saten dikişlerinin makro görüntüsü",
        caption: "Kanat içi ipek geçiş dikişleri yakın çekimi",
      },
    ],
    description:
      "Gömlek yakaları, keten ceket cepleri, kanvas çantalar ve zarif aksesuarlar için ince gölgelendirme ile hazırlanmış kelebek motifidir. İki küçük botanik dal parçası ayrı dosya olarak da pakete eklenmiştir.",
    highlights: [
      "10x10 cm kasnağa uyumlu net ve dengeli 92 × 84 mm ölçü.",
      "4 sıcak tonla 3 boyutlu kanat derinliği.",
      "PFAFF VP3, PES, DST, JEF ve EXP formatlarında sunulur.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "EXP"],
      supportedMachines: ["PFAFF", "Brother", "Janome", "Bernina", "Tajima"],
      hoopSize: "10x10 cm",
      widthMm: 92,
      heightMm: 84,
      stitchCount: 9860,
      colorCount: 4,
      colorChanges: 5,
      patternSizeCategory: "Küçük (< 10 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 12000,
      threadChart: [
        { step: 1, name: "Krem Kanat Zemini", code: "Rayon 1071", hex: "#E9DFCF", stitches: 2610 },
        { step: 2, name: "Antik Altın Gölgelendirme", code: "Rayon 1069", hex: "#B8904C", stitches: 3180 },
        { step: 3, name: "Sıcak Bronz Damar", code: "Rayon 1158", hex: "#8B6239", stitches: 1940 },
        { step: 4, name: "Derin Espresso Çerçeve", code: "Rayon 1058", hex: "#33261F", stitches: 2130 },
      ],
      usageInstructions: [
        "Gömlek ve ince bluzlarda yapışkanlı kesilebilir (cut-away mesh) tela önerilir.",
        "Kanat damarlarının keskin çıkması için üst iplik gerginliğini standart seviyede tutun.",
      ],
      downloadTerms:
        "Kelebek ana deseni ve 2 adet tamamlayıcı küçük dal dosyası güvenli indirme alanından sunulur.",
    },
  },
  {
    id: "tb-dig-07",
    slug: "papatyali-uyuyan-kedi-nakis-deseni",
    name: "Papatyalı Uyuyan Kedi Nakış Deseni",
    subtitle: "İnce çizgi sanatı ve kır papatyalarıyla bezeli zarif kedi silueti.",
    type: "digital",
    categorySlug: "dijital-nakis-desenleri",
    categoryName: "Dijital Nakış Desenleri",
    priceKurus: 13500,
    isFeatured: false,
    personalizable: false,
    usageAreas: ["Giyim", "Çanta ve Aksesuar", "Bebek Tekstili"],
    tags: [
      "kedi",
      "kedi figürü",
      "papatya",
      "minimal",
      "10x10",
      "vp3",
      "pfaff",
      "çanta",
    ],
    images: [
      {
        url: "/images/prod-cat-chamomile.webp",
        alt: "Kum rengi ham keten üzerine koyu kahve ve altın iplikle işlenmiş uyuyan kedi figürü",
        caption: "Ham kum keteni üzerinde ince hatlı uyuyan kedi nakışı (Demo konsept görseli)",
      },
      {
        url: "/images/prod-cat-chamomile-macro.webp",
        alt: "Kedi kontur dikişleri ve krem papatya yapraklarının yakın çekimi",
        caption: "Üçlü yürütme (triple-run) çizgi ve papatya saten detayı",
      },
    ],
    description:
      "Ağır dolgu kullanmadan, yalnızca rafine çizgi kalınlıkları ve küçük papatya vurgularıyla tasarlanan uyuyan kedi motifidir. Düşük dikiş sayısı sayesinde triko, pamuklu tişört, bez çanta ve çocuk kıyafetlerinde kumaşı ağırlaştırmadan 10 dakikadan kısa sürede işlenir.",
    highlights: [
      "Yalnızca 5.420 dikiş: hafif, esnek ve hızlı üretim.",
      "10x10 cm kasnağa uyumlu 89 × 76 mm boyut.",
      "3 renk ile sade, zarif estetik.",
    ],
    embroidery: {
      formats: ["VP3", "PES", "DST", "JEF", "HUS"],
      supportedMachines: ["PFAFF", "Brother", "Janome", "Husqvarna Viking", "Tajima"],
      hoopSize: "10x10 cm",
      widthMm: 89,
      heightMm: 76,
      stitchCount: 5420,
      colorCount: 3,
      colorChanges: 3,
      patternSizeCategory: "Küçük (< 10 cm)",
      licenses: ["Kişisel Kullanım", "Küçük İşletme"],
      commercialPriceDeltaKurus: 11000,
      threadChart: [
        { step: 1, name: "Koyu Espresso Çizgi", code: "Rayon 1058", hex: "#3A2B24", stitches: 3290 },
        { step: 2, name: "Fildişi Papatya Yaprağı", code: "Rayon 1071", hex: "#F2ECE1", stitches: 1380 },
        { step: 3, name: "Altın Papatya Merkezi", code: "Rayon 1069", hex: "#B18A49", stitches: 750 },
      ],
      usageInstructions: [
        "Penye ve triko kumaşlarda top uçlu (ballpoint 75/11) iğne ve kesilebilir tela kullanın.",
        "Bez çanta ve keten yüzeylerde tek kat orta ağırlıkta yırtılabilir tela yeterlidir.",
      ],
      downloadTerms:
        "Satın alma sonrası 5 makine formatı ve renk haritası hesabınızdan hemen indirilebilir.",
    },
  },
  {
    id: "tb-phy-01",
    slug: "kisiye-ozel-monogramli-organik-banyo-havlusu",
    name: "Monogramlı Organik Pamuk Havlu Seti",
    subtitle: "Zeytin dalı çelenkli baş harf işlemeli 2 parça ağır gramajlı havlu ve keten peçete.",
    type: "physical",
    categorySlug: "kisiye-ozel-urunler",
    categoryName: "Kişiye Özel Ürünler",
    priceKurus: 118000,
    isNew: true,
    isFeatured: true,
    personalizable: true,
    usageAreas: ["Havlu"],
    tags: [
      "havlu",
      "monogram",
      "kişiye özel",
      "isimli havlu",
      "çeyiz",
      "hediye",
      "pamuk",
      "banyo",
    ],
    images: [
      {
        url: "/images/prod-monogram-towel.webp",
        alt: "Traverten taş üzerinde altın monogram ve zeytin dalı işlemeli fildişi banyo havlusu ve ham keten peçete",
        caption: "Atölye kişiselleştirme örneği: Fildişi havlu ve doğal keten el peçetesi (Demo ürün görseli)",
      },
      {
        url: "/images/prod-monogram-towel-macro.webp",
        alt: "Havlu bordürü üzerindeki altın baş harf ve yaprak nakışının yakın çekimi",
        caption: "550 gr/m² pamuk bordür üzerindeki yüksek çözünürlüklü nakış detayı",
      },
    ],
    description:
      "Yüksek emiciliğe sahip %100 uzun elyaflı organik Türk pamuğundan dokunmuş banyo havlusu ve tamamlayıcı ham keten misafir peçetesi. Tercih ettiğiniz baş harf veya kısa isim, atölyemizde seçtiğiniz iplik rengiyle bordür merkezine titizlikle işlenir ve keten kurdeleli hediye kutusunda gönderilir.",
    highlights: [
      "1 adet 70×140 cm banyo havlusu + 1 adet 50×90 cm el/yüz havlusu veya keten peçete.",
      "İsim veya baş harf nakışı fiyata dahildir; sipariş öncesi canlı önizleme yapılabilir.",
      "İç yüzeyi tahriş etmeyen yumuşak arka koruma ile bitirilir.",
    ],
    physical: {
      inStock: true,
      stockNote: "Atölye siparişine hazır",
      colors: [
        { name: "Fildişi Ekru", hex: "#F2ECE1" },
        { name: "Ham Keten Taşı", hex: "#DDD2C0" },
        { name: "Sıcak Kum", hex: "#CFC0AA" },
      ],
      sizes: ["El + Yüz Seti (2 Parça)", "Banyo + El Seti (2 Parça)", "Aile Seti (4 Parça)"],
      material: "%100 Organik Uzun Elyaflı Türk Pamuğu (550 gr/m²) ve Doğal Keten",
      productionTime: "3–5 iş günü atölye kişiselleştirme ve kontrol süresi",
      shippingEstimate: "Hazırlık sonrası 1–3 iş günü içinde sigortalı kargo teslimatı",
      careInstructions: [
        "30°C'de hassas programda, ağartıcı içermeyen deterjanla yıkayın.",
        "Nakışlı bordür alanını tersten, orta ısıda buharlı ütüleyin.",
        "İlk yıkamayı benzer açık tonlu tekstillerle yapmanız önerilir.",
      ],
      personalizationPriceKurus: 0,
      surfaceType: "towel",
    },
  },
  {
    id: "tb-phy-02",
    slug: "basak-ve-kir-cicegi-islemeli-keten-runner",
    name: "Başak İşlemeli Doğal Keten Runner",
    subtitle: "Ham Türk keteni üzerinde ton sür ton başak ve kır çiçeği kenar işlemeli masa örtüsü.",
    type: "physical",
    categorySlug: "ev-ve-yasam",
    categoryName: "Ev ve Yaşam",
    priceKurus: 145000,
    isFeatured: true,
    personalizable: true,
    usageAreas: ["Masa Örtüsü"],
    tags: [
      "runner",
      "keten",
      "masa örtüsü",
      "sofra",
      "ev ve yaşam",
      "başak",
      "çiçek",
      "doğal keten",
    ],
    images: [
      {
        url: "/images/prod-linen-runner.webp",
        alt: "Meşe masa üzerinde kır çiçeği ve başak işlemeli doğal keten masa runnerı",
        caption: "Doğal yıkanmış keten masa runnerı (Demo ürün görseli)",
      },
      {
        url: "/images/prod-linen-runner-macro.webp",
        alt: "Keten kumaş üzerindeki fildişi ve yulaf altını başak nakışı yakın çekimi",
        caption: "El dikişi görünümlü kenar kıvırma ve ton sür ton başak nakışı",
      },
    ],
    description:
      "Ön yıkamadan geçirilerek yumuşatılmış, doğal dokusunu koruyan %100 keten kumaştan üretilen masa runnerı. İki uç kenarında fildişi, yulaf altını ve koyu kakao ipliklerle işlenen ince başak motifleri sofralara abartısız bir zarafet kazandırır.",
    highlights: [
      "Geniş gönye köşe dikişleri ve ön yıkamalı çekmez keten yapı.",
      "İsteğe bağlı köşe baş harf monogramı eklenebilir.",
      "Masa uzunluğunuza uygun üç standart ölçü seçeneği.",
    ],
    physical: {
      inStock: true,
      stockNote: "Stokta mevcut · Atölyeden özenle hazırlanır",
      colors: [
        { name: "Ham Keten", hex: "#DDD3C2" },
        { name: "Krem Fildişi", hex: "#F5F0E6" },
      ],
      sizes: ["45 × 150 cm", "45 × 200 cm", "45 × 240 cm"],
      material: "%100 Doğal Yıkanmış Keten (220 gr/m²)",
      productionTime: "2–4 iş günü (kişiselleştirme eklendiğinde 4–5 iş günü)",
      shippingEstimate: "Kargo çıkışı sonrası 1–3 iş günü",
      careInstructions: [
        "30°C'de nazik yıkama yapın; kurutma makinesi kullanmayın.",
        "Hafif nemliyken tersten ütülemek doğal keten dökümünü korur.",
      ],
      personalizationPriceKurus: 16000,
      surfaceType: "linen",
    },
  },
  {
    id: "tb-phy-03",
    slug: "botanik-islemeli-ham-kanvas-atolye-cantasi",
    name: "Botanik İşlemeli Kanvas Atölye Çantası",
    subtitle: "Ağır gramajlı ham pamuk kanvas üzerinde eğrelti otu ve yaban gülü nakışı.",
    type: "physical",
    categorySlug: "kisiye-ozel-urunler",
    categoryName: "Kişiye Özel Ürünler",
    priceKurus: 94000,
    isNew: true,
    isFeatured: true,
    personalizable: true,
    usageAreas: ["Çanta ve Aksesuar"],
    tags: [
      "çanta",
      "bez çanta",
      "kanvas",
      "botanik",
      "kişiye özel",
      "hediye",
      "günlük",
    ],
    images: [
      {
        url: "/images/prod-atelier-tote.webp",
        alt: "Doğal krem kanvas üzerinde zeytin yeşili ve altın tonlarında botanik nakışlı omuz çantası",
        caption: "420 gr/m² ağır kanvas botanik işlemeli tote çanta (Demo ürün görseli)",
      },
      {
        url: "/images/prod-atelier-tote-macro.webp",
        alt: "Kanvas doku üzerindeki eğrelti otu ve gül nakışının yakın çekimi",
        caption: "Yoğun dokulu ham pamuk kanvas üzerinde kabartmalı botanik dikiş",
      },
    ],
    description:
      "Günlük kullanım, kitap ve dizüstü bilgisayar taşımaya uygun dik duruşlu 420 gr/m² ham pamuk kanvastan dikilmiş atölye çantası. Ön yüzeyindeki eğrelti otu ve yaban gülü nakışı uzun yıllar formunu koruyan yüksek dayanımlı rayon ipliklerle işlenir; iç cebi ve isteğe bağlı isim işleme seçeneği mevcuttur.",
    highlights: [
      "15 inç dizüstü bilgisayar ve A4 dosyalar için ferah iç hacim ve iç cep.",
      "Çift dikişli güçlendirilmiş omuz askıları.",
      "İsteğe bağlı arka yüz veya cep üstü isim nakışı eklenebilir.",
    ],
    physical: {
      inStock: true,
      stockNote: "Stokta mevcut",
      colors: [
        { name: "Ham Kanvas", hex: "#EBE3D5" },
        { name: "Taş Beji", hex: "#D6CBB8" },
      ],
      sizes: ["Standart (38 × 42 × 10 cm)", "Geniş Atölye (44 × 40 × 14 cm)"],
      material: "%100 Ham Pamuk Kanvas (420 gr/m²), İç Astarlı",
      productionTime: "2–3 iş günü (kişiselleştirme ile 4 iş günü)",
      shippingEstimate: "1–3 iş günü içinde teslimat",
      careInstructions: [
        "Nemli bezle lokal temizlik veya soğuk suda elde yıkama önerilir.",
        "Doğrudan güneş ışığından uzak düz yüzeyde kurutun.",
      ],
      personalizationPriceKurus: 14000,
      surfaceType: "canvas",
    },
  },
  {
    id: "tb-phy-04",
    slug: "botanik-baskili-keten-onluk-ve-mutfak-seti",
    name: "Botanik Baskılı Keten Önlük ve Bez Seti",
    subtitle: "Koyu kakao botanik tekstil baskılı ve altın dikiş vurgulu doğal keten mutfak seti.",
    type: "physical",
    categorySlug: "baski-tasarimlari",
    categoryName: "Baskı Tasarımları",
    priceKurus: 109000,
    compareAtPriceKurus: 129000,
    isFeatured: false,
    personalizable: true,
    usageAreas: ["Mutfak Tekstili", "Masa Örtüsü"],
    tags: [
      "baskı",
      "tekstil baskı",
      "önlük",
      "keten",
      "mutfak",
      "hediye",
      "botanik",
    ],
    images: [
      {
        url: "/images/prod-linen-apron.webp",
        alt: "Koyu kakao botanik tekstil baskılı keten önlük ve uyumlu kurulama bezi seti",
        caption: "Botanik tekstil baskı ve cep üstü altın nakış vurgusu (Demo ürün görseli)",
      },
      {
        url: "/images/prod-linen-apron-macro.webp",
        alt: "Doğal keten üzerindeki ince kakao mürekkep botanik baskı ve altın dikiş detayı",
        caption: "Su bazlı nefes alan tekstil baskı ve ince altın nakış detayı",
      },
    ],
    description:
      "Atölyemizde hazırlanan özgün botanik çizimlerin su bazlı, kumaşın nefes almasını koruyan pigment baskı tekniğiyle doğal ketene aktarıldığı mutfak önlüğü ve eşleşen kurulama bezi setidir. Cep kenarındaki ince altın nakış vurgusu baskı ve nakış zanaatını bir araya getirir.",
    highlights: [
      "1 adet ayarlanabilir askılı keten önlük + 1 adet 50×70 cm kurulama bezi.",
      "Yıkamaya dayanıklı su bazlı, yumuşak tutumlu tekstil baskı.",
      "Önlük göğüs veya cep kısmına isim nakışı eklenebilir.",
    ],
    physical: {
      inStock: true,
      stockNote: "Sınırlı atölye üretimi · Stokta",
      colors: [{ name: "Fildişi / Kakao Baskı", hex: "#EFEAE0" }],
      sizes: ["Standart Ayarlanabilir (Önlük + Bez)"],
      material: "%100 Doğal Keten, Su Bazlı Pigment Tekstil Baskı",
      productionTime: "2–4 iş günü",
      shippingEstimate: "1–3 iş günü içinde teslimat",
      careInstructions: [
        "30°C'de ters çevirerek yıkayın.",
        "Baskılı yüzeyi doğrudan sıcak ütüye temas ettirmeden tersten ütüleyin.",
      ],
      personalizationPriceKurus: 15000,
      surfaceType: "linen",
    },
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getSimilarProducts(product: Product, limit = 4): Product[] {
  return PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => {
      const scoreA =
        (a.categorySlug === product.categorySlug ? 3 : 0) +
        (a.type === product.type ? 2 : 0) +
        a.tags.filter((t) => product.tags.includes(t)).length;
      const scoreB =
        (b.categorySlug === product.categorySlug ? 3 : 0) +
        (b.type === product.type ? 2 : 0) +
        b.tags.filter((t) => product.tags.includes(t)).length;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export const ALL_FORMATS: EmbroideryFormat[] = [
  "VP3",
  "PES",
  "DST",
  "JEF",
  "HUS",
  "EXP",
  "XXX",
  "VIP",
  "PEC",
  "PCS",
];

export const ALL_MACHINES: MachineBrand[] = [
  "PFAFF",
  "Brother",
  "Janome",
  "Bernina",
  "Husqvarna Viking",
  "Tajima",
  "Singer",
];

export const ALL_HOOP_SIZES: HoopSize[] = [
  "10x10 cm",
  "13x18 cm",
  "16x26 cm",
  "20x20 cm",
  "20x36 cm",
];

export const ALL_USAGE_AREAS: UsageArea[] = [
  "Havlu",
  "Bebek Tekstili",
  "Masa Örtüsü",
  "Giyim",
  "Çanta ve Aksesuar",
  "Duvar Panosu",
  "Mutfak Tekstili",
];
