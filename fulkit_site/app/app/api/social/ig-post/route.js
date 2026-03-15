import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// 1080 × 1350 — Instagram Post
export async function GET() {
  try {
    const [fontRegular, fontBold] = await Promise.all([
      readFile(join(process.cwd(), "public/assets/fonts/inter-regular.ttf")),
      readFile(join(process.cwd(), "public/assets/fonts/inter-bold.ttf")),
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
            fontFamily: "Inter",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 700, color: "#EFEDE8", letterSpacing: -3, lineHeight: 1 }}>
            {"F\u00FClkit"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 400, color: "#5C5955", marginTop: 14, letterSpacing: 2, marginBottom: 80 }}>
            {"/ fu:l\u00B7kit /"}
          </div>

          <div style={{ fontSize: 140, fontWeight: 700, color: "#EFEDE8", letterSpacing: -5, lineHeight: 1 }}>
            {"$15"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 400, color: "#5C5955", letterSpacing: 3, marginTop: 4, marginBottom: 80 }}>
            {"/month"}
          </div>

          <div style={{ fontSize: 26, fontWeight: 400, color: "#8A8784", textAlign: "center", lineHeight: 1.5 }}>
            {"An AI with a memory."}
          </div>
          <div style={{ fontSize: 26, fontWeight: 400, color: "#8A8784", textAlign: "center", lineHeight: 1.5 }}>
            {"Your notes. Your voice. Your bestie."}
          </div>

          <div style={{ position: "absolute", bottom: 70, fontSize: 16, fontWeight: 400, color: "#5C5955", letterSpacing: 5 }}>
            {"FULKIT.APP"}
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
        fonts: [
          { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
          { name: "Inter", data: fontBold, weight: 700, style: "normal" },
        ],
      }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
