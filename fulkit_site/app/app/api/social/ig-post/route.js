import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

// 1080 × 1350 — Instagram Post
export async function GET() {
  const fontRegular = await readFile(
    join(process.cwd(), "public/assets/fonts/d-din-regular.woff2")
  );
  const fontBold = await readFile(
    join(process.cwd(), "public/assets/fonts/d-din-bold.woff2")
  );

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
          backgroundColor: "#2A2826",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Price — the punchline */}
        <div
          style={{
            fontSize: 180,
            fontFamily: "D-DIN",
            fontWeight: 700,
            color: "#EFEDE8",
            letterSpacing: "-5px",
            lineHeight: 1,
            marginBottom: "8px",
          }}
        >
          $15
        </div>
        <div
          style={{
            fontSize: 48,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#8A8784",
            letterSpacing: "2px",
            marginBottom: "80px",
          }}
        >
          /month
        </div>

        {/* The sell */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontFamily: "D-DIN",
              fontWeight: 400,
              color: "#B0ADA8",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            An AI with a memory.
          </div>
          <div
            style={{
              fontSize: 32,
              fontFamily: "D-DIN",
              fontWeight: 400,
              color: "#B0ADA8",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Your notes. Your voice. Your bestie.
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            fontSize: 22,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#5C5955",
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          fulkit.app
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "D-DIN", data: fontRegular, weight: 400, style: "normal" },
        { name: "D-DIN", data: fontBold, weight: 700, style: "normal" },
      ],
    }
  );
}
