import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0d1117",
          color: "#e6edf3",
          padding: "64px",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#22c55e",
            letterSpacing: 1
          }}
        >
          CLAUDE USAGE CAP
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 70, lineHeight: 1.05, fontWeight: 700 }}>
            Stop runaway Claude API spend automatically.
          </div>
          <div style={{ fontSize: 34, color: "#9ca3af" }}>
            Per-project daily, weekly, monthly limits with instant 429 cut-off and Slack alerts.
          </div>
        </div>
        <div style={{ fontSize: 28 }}>$15 / project / month</div>
      </div>
    ),
    {
      ...size
    }
  );
}
