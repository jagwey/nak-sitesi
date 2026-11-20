import { ImageResponse } from "next/og";

export const alt = "Nakış Sitesi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          fontSize: 96,
          fontFamily: "serif",
        }}
      >
        Nakış Sitesi
      </div>
    ),
    size,
  );
}
