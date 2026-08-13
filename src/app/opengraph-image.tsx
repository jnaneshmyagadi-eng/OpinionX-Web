import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OpinionX — Everyone Has an Opinion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(90deg, #a855f7, #ec4899, #f97316)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          OpinionX
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: "#a1a1aa",
            fontWeight: 500,
          }}
        >
          Everyone Has an Opinion
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 22,
            color: "#71717a",
            maxWidth: 720,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Social voting · Two-choice polls · Discover similar opinions
        </div>
      </div>
    ),
    { ...size }
  );
}
