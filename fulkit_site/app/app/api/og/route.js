import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET() {
  const fontRegular = await readFile(
    join(process.cwd(), "public/assets/fonts/d-din-regular.woff2")
  );
  const fontBold = await readFile(
    join(process.cwd(), "public/assets/fonts/d-din-bold.woff2")
  );
  const mono = await readFile(
    join(process.cwd(), "public/assets/fonts/jetbrains-mono.woff2")
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
          backgroundColor: "#EFEDE8",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontFamily: "D-DIN",
            fontWeight: 700,
            color: "#2A2826",
            letterSpacing: "-3px",
            lineHeight: 1,
            marginBottom: "16px",
          }}
        >
          Fülkit
        </div>
        <div
          style={{
            fontSize: 26,
            fontFamily: "JetBrains Mono",
            color: "#8A8784",
            marginBottom: "48px",
          }}
        >
          /ˈfüːl·kɪt/
        </div>
        <div
          style={{
            fontSize: 24,
            fontFamily: "D-DIN",
            color: "#5C5955",
            letterSpacing: "0.5px",
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
        { name: "D-DIN", data: fontRegular, weight: 400, style: "normal" },
        { name: "D-DIN", data: fontBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
