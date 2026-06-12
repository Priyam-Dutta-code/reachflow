/** Designed OG/Twitter card — generated at build, no external assets. */
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "ReachFlow — find the right inboxes. Send emails that get answered.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#FAFAF7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#0E6F5C",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#121915" }}>ReachFlow</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#121915", lineHeight: 1.05 }}>
            Find the right inboxes.
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#0E6F5C", lineHeight: 1.05 }}>
            Send emails that get answered.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #E6E4DD",
            paddingTop: 28,
            color: "#6B7672",
            fontSize: 28,
          }}
        >
          <div>Lead discovery · AI drafting · compliant campaigns</div>
          <div style={{ color: "#0E6F5C" }}>Five workflows, one workspace</div>
        </div>
      </div>
    ),
    size
  );
}
