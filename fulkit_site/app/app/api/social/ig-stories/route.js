import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

// 1080 × 1920 — Instagram Stories
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
          justifyContent: "center",
          backgroundColor: "#EFEDE8",
          padding: "100px 80px",
          position: "relative",
        }}
      >
        {/* Manifesto — left-aligned, stacked, heavy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontFamily: "D-DIN",
              fontWeight: 700,
              color: "#2A2826",
              lineHeight: 1.15,
              letterSpacing: "-2px",
            }}
          >
            Your second
          </div>
          <div
            style={{
              fontSize: 72,
              fontFamily: "D-DIN",
              fontWeight: 700,
              color: "#2A2826",
              lineHeight: 1.15,
              letterSpacing: "-2px",
            }}
          >
            brain that
          </div>
          <div
            style={{
              fontSize: 72,
              fontFamily: "D-DIN",
              fontWeight: 700,
              color: "#2A2826",
              lineHeight: 1.15,
              letterSpacing: "-2px",
            }}
          >
            talks back.
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "60px",
            height: "3px",
            backgroundColor: "#2A2826",
            marginTop: "48px",
            marginBottom: "32px",
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#5C5955",
            lineHeight: 1.5,
          }}
        >
          Notes, voice, and an AI that
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#5C5955",
            lineHeight: 1.5,
          }}
        >
          remembers everything you've saved.
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#5C5955",
            lineHeight: 1.5,
            marginTop: "8px",
          }}
        >
          $15/mo.
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "100px",
            left: "80px",
            fontSize: 22,
            fontFamily: "D-DIN",
            fontWeight: 400,
            color: "#8A8784",
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
      height: 1920,
      fonts: [
        { name: "D-DIN", data: fontRegular, weight: 400, style: "normal" },
        { name: "D-DIN", data: fontBold, weight: 700, style: "normal" },
      ],
    }
  );
}
