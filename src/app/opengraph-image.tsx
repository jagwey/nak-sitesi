import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/server/modules/settings/service";

export const alt = "Mağaza paylaşım görseli";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpengraphImage() {
  const { storeName } = await getSiteSettings();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F3",
          color: "#4A372C",
          padding: 80,
          textAlign: "center",
          fontSize: storeName.length > 24 ? 64 : 96,
          fontFamily: "serif",
        }}
      >
        {storeName}
      </div>
    ),
    size,
  );
}
