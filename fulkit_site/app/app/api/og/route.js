import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const [fontBold, interRegular] = await Promise.all([
      readFile(join(process.cwd(), "public/assets/fonts/d-din-bold.otf")),
      readFile(join(process.cwd(), "public/assets/fonts/inter-regular.ttf")),
    ]);

    // Square-dot umlaut — proportions from fulkit.svg
    const dw = Math.round(120 * 0.14);
    const dh = Math.round(120 * 0.15);
    const dg = Math.round(120 * 0.17);
    const dt = Math.round(120 * 0.02);
    const dl = Math.round(120 * 0.54);

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
            fontFamily: "D-DIN",
          }}
        >
          <div style={{ position: "relative", display: "flex" }}>
            <span style={{ fontSize: 120, fontWeight: 700, color: "#2A2826", letterSpacing: -3, lineHeight: 1 }}>
              {"Fulkit"}
            </span>
            <div style={{ position: "absolute", top: dt, left: dl, display: "flex", gap: dg }}>
              <div style={{ width: dw, height: dh, background: "#2A2826" }} />
              <div style={{ width: dw, height: dh, background: "#2A2826" }} />
            </div>
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
          { name: "D-DIN", data: fontBold, weight: 700, style: "normal" },
          { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        ],
      }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
