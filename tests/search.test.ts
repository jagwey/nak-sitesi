// Run: node tests/search.test.ts  — scenario checks for the catalog search engine.
import { PRODUCTS } from "../src/data/products.ts";
import { DEFAULT_FILTERS, filterAndSortProducts, parseQueryIntent } from "../src/lib/search.ts";

type Case = { q: string; extra?: Record<string, unknown>; expect: (slugs: string[]) => boolean; why: string };
const cases: Case[] = [
  { q: "VP3 çiçek deseni", expect: (s) => s[0]?.includes("gul") || s[0]?.includes("cicegi"), why: "çiçek/gül VP3 desenleri önde" },
  { q: "PFAFF uyumlu", expect: (s) => s.length >= 5 && s.every((x) => PRODUCTS.find((p) => p.slug === x)?.embroidery?.supportedMachines.includes("PFAFF")), why: "yalnız PFAFF destekli dijital desenler" },
  { q: "10x10 kasnağa sığan", expect: (s) => s.length >= 3 && s.every((x) => { const e = PRODUCTS.find((p) => p.slug === x)?.embroidery; return !!e && e.widthMm <= 100 && e.heightMm <= 100; }), why: "≤100×100 mm desenler" },
  { q: "kişiye özel bebek nakışı", expect: (s) => s.length >= 1, why: "kişiselleştirilebilir/harf + bebek" },
  { q: "fiziksel havlu", expect: (s) => s.length >= 1 && s.every((x) => PRODUCTS.find((p) => p.slug === x)?.type === "physical"), why: "yalnız fiziksel havlu" },
  { q: "dijital tasarım paketi", expect: (s) => s[0] === "klasik-serif-botanik-monogram-alfabesi", why: "paket ilk sırada" },
  { q: "paff cicek", expect: (s) => s.length >= 1, why: "yazım hatası toleransı" },
  { q: "ISIM", expect: (s) => s.length >= 1, why: "büyük İ/I katlama" },
  { q: "zzzqx", expect: (s) => s.length === 0, why: "boş sonuç" },
  { q: "", extra: { kasnak: "10x10 cm" }, expect: (s) => s.length === 4, why: "kasnak filtresi = sığanlar" },
];
let fail = 0;
for (const c of cases) {
  const slugs = filterAndSortProducts(PRODUCTS, { ...DEFAULT_FILTERS, q: c.q, ...(c.extra as object) }).map((p) => p.slug);
  const ok = c.expect(slugs);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  "${c.q}" (${c.why}) → ${slugs.length}: ${slugs.slice(0, 4).join(", ")}`);
}
console.log("intent:", JSON.stringify(parseQueryIntent("13 x 18 kasnağa uygun kişiye özel dijital")));
process.exit(fail ? 1 : 0);
