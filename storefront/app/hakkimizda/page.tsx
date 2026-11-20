import type { Metadata } from "next";
import { AboutWorkshop } from "@/components/about/AboutWorkshop";
import { storefrontCatalog } from "../../catalog";

export const metadata: Metadata = {
  title: "Hakkımızda ve Atölye",
  description: "Makine nakışı desenleri, işlemeli tekstiller ve kişiye özel tasarım üzerine.",
};

export default function AboutPage() {
  return <AboutWorkshop storeName={storefrontCatalog.storeName} storefront />;
}
