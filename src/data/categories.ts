export interface CategoryItem {
  slug: string;
  name: string;
  shortDescription: string;
  image: string;
  imageAlt: string;
  subcategories: string[];
  featuredType?: "digital" | "physical" | "all";
}

export interface CuratedCollection {
  slug: string;
  title: string;
  subtitle: string;
  filterQuery: string;
  image: string;
  imageAlt: string;
}

export const CATEGORIES: CategoryItem[] = [
  {
    slug: "dijital-nakis-desenleri",
    name: "Dijital Nakış Desenleri",
    shortDescription: "PFAFF VP3 ve farklı makine formatlarında dijital nakış dosyaları.",
    image: "/images/prod-rose-vp3.webp",
    imageAlt: "Doğal keten üzerine işlenmiş botanik gül makine nakışı deseni",
    subcategories: [
      "VP3 PFAFF Desenleri",
      "Botanik ve Çiçek Dosyaları",
      "FSL Dantel ve Ajur",
      "10x10 cm Mini Desenler",
    ],
    featuredType: "digital",
  },
  {
    slug: "cicek-ve-botanik",
    name: "Çiçek ve Botanik",
    shortDescription: "Gül, kır çiçeği, okaliptüs çelengi ve ince yaprak motifleri.",
    image: "/images/prod-botanical-wreath.webp",
    imageAlt: "Kasnakta keten kumaş üzerine işlenmiş kır çiçeği ve okaliptüs çelengi",
    subcategories: [
      "Bahçe Gülleri",
      "Kır Çiçeği Çelenkleri",
      "Kelebek ve Doğa",
      "Zeytin Dalı Motifleri",
    ],
    featuredType: "all",
  },
  {
    slug: "harf-ve-monogram",
    name: "Harf ve Monogram",
    shortDescription: "Klasik serif alfabeler, botanik baş harfler ve aile monogramları.",
    image: "/images/prod-monogram-m.webp",
    imageAlt: "Ekru keten mendil üzerinde altın iplikli M harfi monogram nakışı",
    subcategories: [
      "Botanik Alfabe Setleri",
      "Çelenkli Monogramlar",
      "Mendil Baş Harfleri",
      "İsim Nakışı Tasarımları",
    ],
    featuredType: "all",
  },
  {
    slug: "cocuk-ve-bebek",
    name: "Çocuk ve Bebek",
    shortDescription: "Organik müslin ve bebek tekstili için yumuşak, zarif figürler.",
    image: "/images/prod-baby-bear.webp",
    imageAlt: "Krem organik müslin bebek battaniyesi üzerinde sevimli ayıcık makine nakışı",
    subcategories: [
      "Bebek Battaniyesi Desenleri",
      "İsimli Bebek Önlükleri",
      "Masal Figürleri",
      "Hastane Çıkışı Motifleri",
    ],
    featuredType: "all",
  },
  {
    slug: "ev-ve-yasam",
    name: "Ev ve Yaşam",
    shortDescription: "Doğal keten runner, masa örtüsü, havlu kenarı ve ev tekstili.",
    image: "/images/prod-linen-runner.webp",
    imageAlt: "Meşe masa üzerinde kır çiçeği işlemeli doğal Türk keteni runner",
    subcategories: [
      "Keten Masa Runnerları",
      "İşlemeli Banyo Havluları",
      "Havlu Kenarı ve Dantel",
      "Kırlent ve Peçete Setleri",
    ],
    featuredType: "all",
  },
  {
    slug: "ozel-gunler",
    name: "Özel Günler",
    shortDescription: "Çeyiz, nişan, nikâh mendili ve hatıra keseleri için ince dantel ve motifler.",
    image: "/images/prod-lace-border.webp",
    imageAlt: "Doğal keten üzerine serilmiş krem rengi ajurlu dantel kenar nakışı",
    subcategories: [
      "FSL Dantel Kenarları",
      "Çeyiz Seti Motifleri",
      "Hatıra Mendilleri",
      "Hediye Keseleri",
    ],
    featuredType: "all",
  },
  {
    slug: "kisiye-ozel-urunler",
    name: "Kişiye Özel Ürünler",
    shortDescription: "İsim, monogram veya kurum logonuzla atölyede hazırlanan ürünler.",
    image: "/images/prod-monogram-towel.webp",
    imageAlt: "Traverten taş üzerinde altın monogram işlemeli krem pamuk banyo havlusu",
    subcategories: [
      "İsimli Havlu Setleri",
      "Monogramlı Keten Çantalar",
      "Özel Logo Nakışı",
      "Kişiye Özel Desen Dijitalleştirme",
    ],
    featuredType: "physical",
  },
  {
    slug: "baski-tasarimlari",
    name: "Baskı Tasarımları",
    shortDescription: "Doğal keten önlük ve mutfak tekstillerinde botanik tekstil baskıları.",
    image: "/images/prod-linen-apron.webp",
    imageAlt: "Koyu kakao rengi botanik baskılı doğal keten mutfak önlüğü ve kurulama bezi",
    subcategories: [
      "Baskılı Keten Önlükler",
      "Mutfak Kurulama Bezleri",
      "Botanik Bez Çantalar",
      "Kombine Baskı ve Nakış",
    ],
    featuredType: "physical",
  },
];

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    slug: "pfaff-vp3-seckisi",
    title: "PFAFF VP3 Atölye Seçkisi",
    subtitle: "Doğrudan PFAFF kasnaklarına göre kalibre edilmiş botanik ve dantel dosyaları.",
    filterQuery: "tur=dijital&format=VP3&makine=PFAFF",
    image: "/images/prod-botanical-wreath.webp",
    imageAlt: "PFAFF VP3 uyumlu botanik çelenk nakış deseni",
  },
  {
    slug: "keten-ve-sofra",
    title: "Doğal Keten Sofra",
    subtitle: "Ham Türk keteni üzerinde ton sür ton başak, gül ve kır çiçeği işlemeleri.",
    filterQuery: "kategori=ev-ve-yasam",
    image: "/images/prod-linen-runner.webp",
    imageAlt: "Doğal keten masa runnerı",
  },
  {
    slug: "hediye-monogram",
    title: "Zarif Monogram Hediyeler",
    subtitle: "İsim ve baş harf işlemeleriyle kalıcı hediyelik tekstil parçaları.",
    filterQuery: "kisisellestirme=true",
    image: "/images/prod-monogram-towel.webp",
    imageAlt: "Altın iplik monogram işlemeli havlu seti",
  },
];
