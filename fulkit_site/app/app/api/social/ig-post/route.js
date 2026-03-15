import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// 1080 × 1350 — Instagram Post
export async function GET() {
  const [fontRegular, fontBold, mono] = await Promise.all([
    readFile(join(process.cwd(), "public/assets/fonts/inter-regular.ttf")),
    readFile(join(process.cwd(), "public/assets/fonts/inter-bold.ttf")),
    readFile(join(process.cwd(), "public/assets/fonts/jetbrains-mono-regular.ttf")),
  ]);

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
          position: "relative",
        }}
      >
        {/* Dictionary entry — dark inverse of hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 88,
              fontFamily: "Inter",
              fontWeight: 700,
              color: "#EFEDE8",
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            F{"\u00FC"}lkit
          </div>

          {/* Phonetic */}
          <div
            style={{
              fontSize: 22,
              fontFamily: "JetBrains Mono",
              color: "#5C5955",
              marginTop: 16,
              marginBottom: 60,
            }}
          >
            /{"\u02C8"}f{"\u00FC"}{"\u02D0"}l{"\u00B7"}k{"\u026A"}t/
          </div>

          {/* Price — the punchline */}
          <div
            style={{
              fontSize: 160,
              fontFamily: "Inter",
              fontWeight: 700,
              color: "#EFEDE8",
              letterSpacing: "-6px",
              lineHeight: 1,
            }}
          >
            $15
          </div>
          <div
            style={{
              fontSize: 36,
              fontFamily: "Inter",
              fontWeight: 400,
              color: "#5C5955",
              letterSpacing: "3px",
              marginTop: 4,
              marginBottom: 80,
            }}
          >
            /month
          </div>

          {/* The sell */}
          <div
            style={{
              fontSize: 28,
              fontFamily: "Inter",
              fontWeight: 400,
              color: "#8A8784",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            An AI with a memory.
          </div>
          <div
            style={{
              fontSize: 28,
              fontFamily: "Inter",
              fontWeight: 400,
              color: "#8A8784",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Your notes. Your voice. Your bestie.
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            bottom: 70,
            fontSize: 18,
            fontFamily: "JetBrains Mono",
            color: "#5C5955",
            letterSpacing: "4px",
          }}
        >
          FULKIT.APP
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
