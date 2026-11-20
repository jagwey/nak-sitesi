import type { Metadata } from "next";
import { AboutWorkshop } from "@/components/about/AboutWorkshop";
import { getSiteSettings } from "@/server/modules/settings/service";

export const metadata: Metadata = {
  title: "Hakkımızda ve Atölye",
  description: "Atölyenin üretim disiplini, dijital desen kalitesi ve doğal tekstil yaklaşımı.",
};

export default async function HakkimizdaPage() {
  const { storeName, logoUrl, ownerName, aboutText } = await getSiteSettings();
  return <AboutWorkshop {...{ storeName, logoUrl, ownerName, aboutText }} />;
}
