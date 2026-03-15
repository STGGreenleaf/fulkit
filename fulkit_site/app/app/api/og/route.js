import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// SVG aspect ratio from fulkit.svg viewBox (888.78 / 257.63)
const SVG_RATIO = 888.78 / 257.63;

export async function GET() {
  try {
    const [fontBold, interRegular, svgRaw] = await Promise.all([
      readFile(join(process.cwd(), "public/assets/fonts/d-din-bold.otf")),
      readFile(join(process.cwd(), "public/assets/fonts/inter-regular.ttf")),
      readFile(join(process.cwd(), "public/assets/brand/fulkit.svg"), "utf-8"),
    ]);

    const svgDark = svgRaw.replace(/#2b2725/gi, "#2A2826");
    const darkUri = `data:image/svg+xml;base64,${Buffer.from(svgDark).toString("base64")}`;
    const markH = 120;
    const markW = Math.round(markH * SVG_RATIO);

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
          <img src={darkUri} width={markW} height={markH} style={{ display: "block" }} />
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
