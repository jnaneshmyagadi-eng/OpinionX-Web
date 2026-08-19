import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "OpinionX poll";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export default async function PollOgImage({ params }: Props) {
  const { id } = await params;
  let question = "What would you choose?";
  let optionA = "Option A";
  let optionB = "Option B";
  let percentA = 0;
  let percentB = 0;
  let total = 0;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("polls")
        .select("question, option_a, option_b, vote_count_a, vote_count_b")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        question = data.question;
        optionA = data.option_a;
        optionB = data.option_b;
        total = (data.vote_count_a ?? 0) + (data.vote_count_b ?? 0);
        if (total > 0) {
          percentA = Math.round(((data.vote_count_a ?? 0) / total) * 100);
          percentB = 100 - percentA;
        }
      }
    }
  } catch {
    /* fallback text */
  }

  const qDisplay =
    question.length > 90 ? `${question.slice(0, 87).trim()}…` : question;
  const aDisplay =
    optionA.length > 28 ? `${optionA.slice(0, 25).trim()}…` : optionA;
  const bDisplay =
    optionB.length > 28 ? `${optionB.slice(0, 25).trim()}…` : optionB;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0b",
          padding: 48,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 800,
            background: "linear-gradient(90deg, #a855f7, #ec4899)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          OpinionX
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 22,
            color: "#a1a1aa",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {total > 0 ? "INDIA IS SPLIT 👀" : "LET THE INTERNET DECIDE"}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 40,
            fontWeight: 700,
            color: "#fafafa",
            lineHeight: 1.25,
            maxWidth: 1050,
          }}
        >
          {qDisplay}
        </div>
        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 24,
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 28,
              borderRadius: 20,
              background: "#18181b",
              border: "2px solid #7c3aed",
            }}
          >
            <div style={{ fontSize: 26, color: "#e4e4e7", fontWeight: 600 }}>
              {aDisplay}
            </div>
            {total > 0 && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#c4b5fd",
                }}
              >
                {percentA}%
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#71717a",
            }}
          >
            VS
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 28,
              borderRadius: 20,
              background: "#18181b",
              border: "2px solid #db2777",
            }}
          >
            <div style={{ fontSize: 26, color: "#e4e4e7", fontWeight: 600 }}>
              {bDisplay}
            </div>
            {total > 0 && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#f9a8d4",
                }}
              >
                {percentB}%
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 20,
            color: "#71717a",
          }}
        >
          {total > 0
            ? `${total.toLocaleString()} real votes · User opinions, not facts`
            : "Vote on OpinionX · User opinions, not facts"}
        </div>
      </div>
    ),
    { ...size }
  );
}
