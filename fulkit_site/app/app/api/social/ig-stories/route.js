import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// 1080 × 1920 — Instagram Stories
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
          justifyContent: "center",
          backgroundColor: "#EFEDE8",
          padding: "120px 80px",
          position: "relative",
        }}
      >
        {/* Hero echo — same dictionary format */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 80,
              fontFamily: "Inter",
              fontWeight: 700,
              color: "#2A2826",
              letterSpacing: "-3px",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            F{"\u00FC"}lkit
          </div>

          {/* Phonetic */}
          <div
            style={{
              fontSize: 22,
              fontFamily: "JetBrains Mono",
              color: "#8A8784",
              marginBottom: 48,
            }}
          >
            /{"\u02C8"}f{"\u00FC"}{"\u02D0"}l{"\u00B7"}k{"\u026A"}t/
          </div>

          {/* Noun */}
          <div
            style={{
              fontSize: 20,
              fontFamily: "Inter",
              fontWeight: 400,
              color: "#8A8784",
              fontStyle: "italic",
              marginBottom: 32,
            }}
          >
            noun.
          </div>

          {/* Definitions — stacked like hero */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginBottom: 64,
            }}
          >
            {[
              "Your second brain that talks back.",
              "A feeling \u2014 a tool designed to feel right.",
              "The last app you\u2019ll ever need.",
            ].map((def, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: 28,
                  fontFamily: "Inter",
                  fontWeight: 400,
                  color: "#5C5955",
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    color: "#B0ADA8",
                    fontSize: 22,
                    minWidth: 28,
                  }}
                >
                  {i + 1}.
                </span>
                {def}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 60,
              height: 3,
              backgroundColor: "#2A2826",
              marginBottom: 32,
            }}
          />

          {/* Price */}
          <div
            style={{
              fontSize: 48,
              fontFamily: "Inter",
              fontWeight: 700,
              color: "#2A2826",
              letterSpacing: "-1px",
              lineHeight: 1,
            }}
          >
            $15/mo
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 80,
            fontSize: 18,
            fontFamily: "JetBrains Mono",
            color: "#8A8784",
            letterSpacing: "4px",
          }}
        >
          FULKIT.APP
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
