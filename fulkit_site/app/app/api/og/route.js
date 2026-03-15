import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const fontBold = await readFile(
      join(process.cwd(), "public/assets/fonts/inter-bold.ttf")
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
            fontFamily: "Inter",
          }}
        >
          <div style={{ fontSize: 120, fontWeight: 700, color: "#2A2826", letterSpacing: -3 }}>
            {"F\u00FClkit"}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#8A8784", marginTop: 20, letterSpacing: 2 }}>
            {"/ fu:l\u00B7kit /"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#5C5955", marginTop: 40 }}>
            {"I\u2019ll be your bestie."}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Inter", data: fontBold, weight: 700, style: "normal" },
        ],
      }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
