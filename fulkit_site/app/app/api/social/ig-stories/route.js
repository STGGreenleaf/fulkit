import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// 1080 × 1920 — Instagram Stories
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
            justifyContent: "center",
            backgroundColor: "#EFEDE8",
            fontFamily: "Inter",
            padding: "120px 80px",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 80, fontWeight: 700, color: "#2A2826", letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>
            {"F\u00FClkit"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 400, color: "#8A8784", letterSpacing: 2, marginBottom: 48 }}>
            {"/ fu:l\u00B7kit /"}
          </div>

          <div style={{ fontSize: 18, fontWeight: 400, color: "#8A8784", fontStyle: "italic", marginBottom: 32 }}>
            {"noun."}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 64 }}>
            <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: "#5C5955", lineHeight: 1.4 }}>
              <span style={{ color: "#B0ADA8", fontSize: 20, minWidth: 28 }}>{"1."}</span>
              {"Your second brain that talks back."}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: "#5C5955", lineHeight: 1.4 }}>
              <span style={{ color: "#B0ADA8", fontSize: 20, minWidth: 28 }}>{"2."}</span>
              {"A feeling \u2014 a tool designed to feel right."}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: "#5C5955", lineHeight: 1.4 }}>
              <span style={{ color: "#B0ADA8", fontSize: 20, minWidth: 28 }}>{"3."}</span>
              {"The last app you\u2019ll ever need."}
            </div>
          </div>

          <div style={{ width: 60, height: 3, backgroundColor: "#2A2826", marginBottom: 32 }} />

          <div style={{ fontSize: 48, fontWeight: 700, color: "#2A2826", letterSpacing: -1, lineHeight: 1 }}>
            {"$15/mo"}
          </div>

          <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: "#8A8784", letterSpacing: 5 }}>
            {"FULKIT.APP"}
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
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
