import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic OG image for typing-run share cards.
 *
 * Query params (all optional):
 *   wpm      – words per minute  (number)
 *   accuracy – accuracy percent  (number, without %)
 *   duration – test duration in seconds (15 | 30 | 60)
 *   lang     – typing language label (e.g. "English", "Tetun")
 *
 * Usage:
 *   /api/og?wpm=98&accuracy=97&duration=30&lang=English
 *
 * Falls back to the generic brand card when no params are supplied.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const wpm = searchParams.get("wpm");
  const accuracy = searchParams.get("accuracy");
  const duration = searchParams.get("duration");
  const lang = searchParams.get("lang") ?? "English";

  const isRunCard = wpm !== null;

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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: isRunCard ? "40px" : "0",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
            }}
          >
            ⌨
          </div>
          <span style={{ fontSize: "32px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>
            Lenuk Type
          </span>
        </div>

        {isRunCard ? (
          <>
            {/* WPM hero */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                marginBottom: "32px",
              }}
            >
              <span style={{ fontSize: "120px", fontWeight: 800, color: "#a5b4fc", lineHeight: 1 }}>
                {wpm}
              </span>
              <span style={{ fontSize: "24px", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.1em" }}>
                WPM
              </span>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "32px" }}>
              {accuracy && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px 32px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ fontSize: "40px", fontWeight: 700, color: "#f1f5f9" }}>
                    {accuracy}%
                  </span>
                  <span style={{ fontSize: "14px", color: "#64748b", letterSpacing: "0.1em", marginTop: "4px" }}>
                    ACCURACY
                  </span>
                </div>
              )}
              {duration && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px 32px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ fontSize: "40px", fontWeight: 700, color: "#f1f5f9" }}>
                    {duration}s
                  </span>
                  <span style={{ fontSize: "14px", color: "#64748b", letterSpacing: "0.1em", marginTop: "4px" }}>
                    DURATION
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "16px",
                  padding: "20px 32px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ fontSize: "40px", fontWeight: 700, color: "#f1f5f9" }}>
                  {lang}
                </span>
                <span style={{ fontSize: "14px", color: "#64748b", letterSpacing: "0.1em", marginTop: "4px" }}>
                  LANGUAGE
                </span>
              </div>
            </div>

            <p style={{ fontSize: "16px", color: "#475569", marginTop: "40px" }}>
              lenuktype.fun · Free typing test for Timor-Leste
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: "28px", color: "#94a3b8", marginTop: "24px", maxWidth: "700px", textAlign: "center" }}>
              Free typing test in Tetun & English — built for Timor-Leste
            </p>
            <p style={{ fontSize: "18px", color: "#475569", marginTop: "16px" }}>
              lenuktype.fun
            </p>
          </>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
