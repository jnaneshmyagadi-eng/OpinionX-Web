import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Public 1:1 share card for Instagram / social.
 * GET /api/og/poll?id=<pollUuid>
 * Only shows real percentages when total votes > 0.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Missing or invalid poll id", { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new Response("Config error", { status: 500 });
  }

  const supabase = createClient(url, key);
  const { data: poll } = await supabase
    .from("polls")
    .select("question, option_a, option_b, vote_count_a, vote_count_b, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!poll || poll.is_active === false) {
    return new Response("Poll not found", { status: 404 });
  }

  const a = Number(poll.vote_count_a) || 0;
  const b = Number(poll.vote_count_b) || 0;
  const total = a + b;
  const pctA = total > 0 ? Math.round((a / total) * 100) : null;
  const pctB = total > 0 ? 100 - (pctA as number) : null;

  const q =
    poll.question.length > 110
      ? poll.question.slice(0, 107) + "…"
      : poll.question;
  const optA =
    poll.option_a.length > 40
      ? poll.option_a.slice(0, 37) + "…"
      : poll.option_a;
  const optB =
    poll.option_b.length > 40
      ? poll.option_b.slice(0, 37) + "…"
      : poll.option_b;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #0a0a0b 0%, #1a1025 55%, #0f172a 100%)",
          color: "#fafafa",
          padding: 56,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -0.5,
              color: "#c084fc",
            }}
          >
            OpinionX
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#a1a1aa",
              fontWeight: 600,
            }}
          >
            #LetTheInternetDecide
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 40,
            }}
          >
            {q}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(168, 85, 247, 0.15)",
                border: "2px solid rgba(168, 85, 247, 0.45)",
                borderRadius: 20,
                padding: "22px 28px",
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
                A · {optA}
              </div>
              {pctA !== null ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#c084fc",
                  }}
                >
                  {pctA}%
                </div>
              ) : (
                <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>
                  Vote
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(59, 130, 246, 0.12)",
                border: "2px solid rgba(59, 130, 246, 0.4)",
                borderRadius: 20,
                padding: "22px 28px",
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
                B · {optB}
              </div>
              {pctB !== null ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#60a5fa",
                  }}
                >
                  {pctB}%
                </div>
              ) : (
                <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>
                  Vote
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 36,
            fontSize: 20,
            color: "#71717a",
          }}
        >
          <div style={{ display: "flex" }}>
            {total > 0
              ? `${total} real vote${total === 1 ? "" : "s"}`
              : "Cast your vote"}
          </div>
          <div style={{ display: "flex" }}>opinionx-web-jnanesh.vercel.app</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
