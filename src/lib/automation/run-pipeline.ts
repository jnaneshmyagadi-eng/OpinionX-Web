import { createClient } from "@supabase/supabase-js";
import { buildDailyBrief, type SuggestedDebate } from "@/lib/daily-engine";
import { getCapabilityReport } from "@/lib/automation/capabilities";
import {
  isBufferConfigured,
  publishPollToBuffer,
  type BufferPublishResult,
} from "@/lib/automation/buffer-client";
import { SITE_URL } from "@/lib/seo";

export type PipelineResult = {
  ok: boolean;
  ranAt: string;
  topic: string | null;
  pollId: string | null;
  pollUrl: string | null;
  pollCreated: boolean;
  pollSkippedReason: string | null;
  platforms: Record<string, "AUTO" | "MANUAL" | "UNAVAILABLE" | "SKIPPED">;
  distribution: { platform: string; title: string; body: string; url: string }[];
  bufferResults: BufferPublishResult[];
  headlineCount: number;
  notes: string[];
  error: string | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeQuestion(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

async function alreadyExists(question: string): Promise<boolean> {
  const supabase = adminClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("polls")
    .select("id, question")
    .eq("is_active", true)
    .limit(100);
  const n = normalizeQuestion(question);
  return (data ?? []).some((p) => normalizeQuestion(p.question) === n);
}

async function createPollAsAutomation(
  suggestion: SuggestedDebate
): Promise<{ id: string } | { error: string }> {
  const supabase = adminClient();
  const userId = process.env.AUTOMATION_USER_ID;
  if (!supabase || !userId) {
    return { error: "Missing service role or AUTOMATION_USER_ID" };
  }

  if (await alreadyExists(suggestion.question)) {
    return { error: "Duplicate question — skipped" };
  }

  if (suggestion.question.length < 8 || suggestion.question.length > 300) {
    return { error: "Invalid question length" };
  }
  if (!suggestion.optionA.trim() || !suggestion.optionB.trim()) {
    return { error: "Missing options" };
  }

  const { data, error } = await supabase
    .from("polls")
    .insert({
      creator_id: userId,
      question: suggestion.question.trim(),
      option_a: suggestion.optionA.trim().slice(0, 100),
      option_b: suggestion.optionB.trim().slice(0, 100),
      category:
        suggestion.hub === "ai"
          ? "tech"
          : suggestion.hub === "money"
            ? "career"
            : "general",
      mood: "curious",
      is_active: true,
      vote_count_a: 0,
      vote_count_b: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message || "Insert failed" };
  }
  return { id: data.id as string };
}

async function loadPublishedKeys(pollId: string): Promise<Set<string>> {
  const keys = new Set<string>();
  const supabase = adminClient();
  if (!supabase) return keys;
  const { data } = await supabase
    .from("automation_runs")
    .select("buffer_results, poll_id")
    .eq("poll_id", pollId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const results = row.buffer_results as BufferPublishResult[] | null;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      if (r.success && r.mode === "queue" && r.service) {
        keys.add(`${r.service}:${pollId}`);
      }
    }
  }
  return keys;
}

async function fetchPollOptions(pollId: string): Promise<{
  question: string;
  option_a: string;
  option_b: string;
} | null> {
  const supabase = adminClient();
  if (!supabase) {
    // public anon fallback
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const client = createClient(url, key);
    const { data } = await client
      .from("polls")
      .select("question, option_a, option_b")
      .eq("id", pollId)
      .maybeSingle();
    return data;
  }
  const { data } = await supabase
    .from("polls")
    .select("question, option_a, option_b")
    .eq("id", pollId)
    .maybeSingle();
  return data;
}

export async function runDailyGrowthPipeline(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const caps = getCapabilityReport();
  const notes: string[] = [];
  const platforms: PipelineResult["platforms"] = {
    x: caps.x_organic,
    instagram: caps.instagram,
    facebook: caps.facebook,
    linkedin: caps.linkedin,
    reddit: caps.reddit,
    whatsapp: caps.whatsapp,
    buffer: caps.buffer,
  };

  if (caps.x_ads_only) {
    notes.push("X Ads path disabled (no paid spend).");
  }

  let bufferResults: BufferPublishResult[] = [];

  try {
    const brief = await buildDailyBrief();
    const headlineCount =
      brief.headlines.india.length +
      brief.headlines.world.length +
      brief.headlines.money.length +
      brief.headlines.ai.length;

    const topExisting = brief.topPolls[0] ?? null;
    const suggestion = brief.suggestions[0] ?? null;

    let pollId: string | null = topExisting?.id ?? null;
    let pollUrl: string | null = pollId
      ? `${SITE_URL}/poll/${pollId}`
      : null;
    let pollCreated = false;
    let pollSkippedReason: string | null = null;
    let topic =
      topExisting?.question ?? suggestion?.question ?? "Daily brief ready";
    let optionA = topExisting?.option_a ?? suggestion?.optionA ?? "Option A";
    let optionB = topExisting?.option_b ?? suggestion?.optionB ?? "Option B";

    const existingVotes = topExisting
      ? topExisting.vote_count_a + topExisting.vote_count_b
      : 0;

    if (caps.poll_auto_create === "AUTO" && suggestion) {
      if (existingVotes >= 5) {
        pollSkippedReason =
          "Existing poll already has real votes — promoting it instead of creating a new one";
        notes.push(pollSkippedReason);
      } else {
        const created = await createPollAsAutomation(suggestion);
        if ("id" in created) {
          pollId = created.id;
          pollUrl = `${SITE_URL}/poll/${created.id}`;
          pollCreated = true;
          topic = suggestion.question;
          optionA = suggestion.optionA;
          optionB = suggestion.optionB;
          notes.push(`Auto-created poll ${created.id}`);
        } else {
          pollSkippedReason = created.error;
          notes.push(`Poll create skipped: ${created.error}`);
          if (!pollUrl && topExisting) {
            pollUrl = `${SITE_URL}/poll/${topExisting.id}`;
            pollId = topExisting.id;
          }
        }
      }
    } else if (caps.poll_auto_create !== "AUTO") {
      pollSkippedReason = caps.reasons.poll_auto_create;
      notes.push("Poll auto-create disabled — env incomplete");
    }

    // Refresh options from DB if we only have id
    if (pollId) {
      const row = await fetchPollOptions(pollId);
      if (row) {
        topic = row.question;
        optionA = row.option_a;
        optionB = row.option_b;
      }
    }

    const distribution = brief.distribution.map((d) => ({
      platform: d.platform,
      title: d.title,
      body: d.body,
      url: d.url,
    }));

    // Buffer publish (non-fatal)
    if (pollId && pollUrl && isBufferConfigured()) {
      try {
        const already = await loadPublishedKeys(pollId);
        bufferResults = await publishPollToBuffer({
          pollId,
          question: topic,
          optionA,
          optionB,
          pollUrl,
          alreadyPublishedKeys: already,
        });
        const okCount = bufferResults.filter(
          (r) => r.success && r.mode === "queue"
        ).length;
        const errCount = bufferResults.filter((r) => r.mode === "error").length;
        notes.push(
          `Buffer: ${okCount} queued, ${errCount} errors, ${bufferResults.length} channel attempts`
        );
        // Mark platforms based on results
        for (const r of bufferResults) {
          if (r.service === "twitter" && r.success && r.mode === "queue") {
            platforms.x = "AUTO";
          }
          if (r.service === "instagram" && r.success && r.mode === "queue") {
            platforms.instagram = "AUTO";
          }
          if (r.service === "facebook" && r.success && r.mode === "queue") {
            platforms.facebook = "AUTO";
          }
          if (r.service === "linkedin" && r.success && r.mode === "queue") {
            platforms.linkedin = "AUTO";
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        notes.push(`Buffer publish failed (non-fatal): ${msg}`);
        bufferResults = [
          {
            service: "buffer",
            channelId: "",
            channelName: "",
            success: false,
            mode: "error",
            error: msg,
            api: "rest",
          },
        ];
      }
    } else if (!isBufferConfigured()) {
      notes.push(
        "Buffer not configured — manual post pack available on /automation and /today"
      );
    } else {
      notes.push("No poll URL available — skipped Buffer publish");
    }

    const admin = adminClient();
    if (admin) {
      await admin.from("automation_runs").insert({
        status: "ok",
        topic,
        poll_id: pollId,
        poll_url: pollUrl,
        poll_created: pollCreated,
        poll_skipped_reason: pollSkippedReason,
        platforms,
        distribution,
        buffer_results: bufferResults,
        headline_count: headlineCount,
        notes: notes.join(" | "),
      });
    }

    return {
      ok: true,
      ranAt,
      topic,
      pollId,
      pollUrl,
      pollCreated,
      pollSkippedReason,
      platforms,
      distribution,
      bufferResults,
      headlineCount,
      notes,
      error: null,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Pipeline failed";
    const admin = adminClient();
    if (admin) {
      await admin.from("automation_runs").insert({
        status: "error",
        error,
        buffer_results: bufferResults,
        notes: notes.join(" | "),
      });
    }
    return {
      ok: false,
      ranAt,
      topic: null,
      pollId: null,
      pollUrl: null,
      pollCreated: false,
      pollSkippedReason: null,
      platforms,
      distribution: [],
      bufferResults,
      headlineCount: 0,
      notes,
      error,
    };
  }
}
