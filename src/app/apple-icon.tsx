import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 90,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ₽
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.8)",
            fontSize: 22,
            fontWeight: 600,
            marginTop: 8,
            letterSpacing: "0.5px",
          }}
        >
          MoneyFlow
        </div>
      </div>
    ),
    { ...size },
  );
}
