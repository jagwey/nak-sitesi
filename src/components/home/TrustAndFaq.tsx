import Link from "next/link";

const TRUST = [
  { title: "Pfaff için VP3", text: "Creative serisi VP3 okur. Üründe dosya yoksa format satışa yazılmaz." },
  { title: "PES, DST ve JEF", text: "Brother, Tajima ve Janome formatları yalnızca yüklenmiş dosyada listelenir." },
  { title: "Anında indirme", text: "Dijital dosya, ödeme doğrulandıktan sonra hesaptan indirilir. Shopier satışında teslimat Shopier’dedir." },
  { title: "Kart bilgisi saklanmaz", text: "Bu sitede kart numarası tutulmaz. Ödeme, kayıtlı sağlayıcı sayfasında tamamlanır." },
];

const FAQ = [
  {
    q: "Fotoğraf veya logomu nakış dosyasına çevirebilir misiniz?",
    a: "Evet. Görselden nakışa çevirme bir teklif talebidir: fotoğrafı yüklersiniz, atölye inceler. Otomatik dosya üretilmez.",
    href: "/kisiye-ozel?hizmet=gorsel",
    label: "Görsel yükle",
  },
  {
    q: "İsteğe özel parça nasıl sipariş edilir?",
    a: "Havlu, keten veya giysi için yazı, ölçü ve adet yazılır. Üretim başlamadan fiyat teklifi gönderilir.",
    href: "/kisiye-ozel?hizmet=parca",
    label: "Parça talebi",
  },
  {
    q: "Dosyayı ne zaman indiririm?",
    a: "Site içi satışta indirme, ödeme doğrulanınca açılır. Ayrıntı dijital indirme koşullarındadır.",
    href: "/bilgi/dijital-indirme-kosullari",
    label: "İndirme koşulları",
  },
  {
    q: "İade ve iptal nasıl işler?",
    a: "Fiziksel, kişiye özel ve anında teslim edilen dijital ürünlerin çerçevesi iade sayfasında yazılıdır. Yasal metin yer tutucuysa paneldeki kayıt esas alınır.",
    href: "/bilgi/iade-ve-iptal",
    label: "İptal ve iade",
  },
];

export function TrustAndFaq() {
  return (
    <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <h2 id="sss-baslik" className="font-display text-[clamp(1.9rem,3vw,2.75rem)] font-semibold leading-tight text-ink">
          Güven ve sık sorulanlar
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((item) => (
            <li key={item.title} className="border-t border-cocoa pt-4">
              <h3 className="text-[1.125rem] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-umber">{item.text}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-12 divide-y divide-hairline border-y border-hairline">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="text-[1.125rem] font-semibold text-ink">{item.q}</dt>
              <dd className="mt-2 max-w-[68ch] text-[1.0625rem] leading-relaxed text-umber">
                {item.a}{" "}
                <Link href={item.href} prefetch={false} className="font-semibold text-cocoa underline underline-offset-4">
                  {item.label}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
