import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  const [fontBold, mono] = await Promise.all([
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
          backgroundColor: "#EFEDE8",
        }}
      >
        {/* Title — matches hero h1 */}
        <div
          style={{
            fontSize: 120,
            fontFamily: "Inter",
            fontWeight: 700,
            color: "#2A2826",
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          F{"\u00FC"}lkit
        </div>

        {/* Phonetic — matches hero mono line */}
        <div
          style={{
            fontSize: 28,
            fontFamily: "JetBrains Mono",
            color: "#8A8784",
            marginTop: 20,
            marginBottom: 40,
          }}
        >
          /{"\u02C8"}f{"\u00FC"}{"\u02D0"}l{"\u00B7"}k{"\u026A"}t/
        </div>

        {/* Tagline — like the first definition */}
        <div
          style={{
            fontSize: 22,
            fontFamily: "Inter",
            fontWeight: 700,
            color: "#5C5955",
            letterSpacing: "0.3px",
          }}
        >
          I'll be your bestie.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
