import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  logId: string | null;
};

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Detect accidental anon key (does not bypass RLS)
  if (key.startsWith("eyJ") && key.length < 200) {
    // still try — JWT length varies
  }
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
    .limit(150);
  const n = normalizeQuestion(question);
  return (data ?? []).some((p) => normalizeQuestion(p.question) === n);
}

async function createPollAsAutomation(
  suggestion: SuggestedDebate
): Promise<{ id: string } | { error: string }> {
  const supabase = adminClient();
  const userId = process.env.AUTOMATION_USER_ID;
  if (!supabase || !userId) {
    return { error: "Missing SUPABASE_SERVICE_ROLE_KEY or AUTOMATION_USER_ID" };
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

  const category =
    suggestion.hub === "ai"
      ? "tech"
      : suggestion.hub === "money"
        ? "career"
        : "general";

  // Prefer SECURITY DEFINER RPC (bypasses client RLS safely; EXECUTE only service_role)
  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "automation_create_poll",
    {
      p_creator_id: userId,
      p_question: suggestion.question.trim(),
      p_option_a: suggestion.optionA.trim().slice(0, 100),
      p_option_b: suggestion.optionB.trim().slice(0, 100),
      p_category: category,
      p_mood: "curious",
    }
  );

  if (!rpcError && rpcId) {
    return { id: rpcId as string };
  }

  // Fallback direct insert with service role (should bypass RLS if key is correct)
  const { data, error } = await supabase
    .from("polls")
    .insert({
      creator_id: userId,
      question: suggestion.question.trim(),
      option_a: suggestion.optionA.trim().slice(0, 100),
      option_b: suggestion.optionB.trim().slice(0, 100),
      category,
      mood: "curious",
      is_active: true,
      vote_count_a: 0,
      vote_count_b: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        rpcError?.message ||
        error?.message ||
        "Insert failed — verify SUPABASE_SERVICE_ROLE_KEY is the service_role secret, not anon",
    };
  }
  return { id: data.id as string };
}

async function logRun(payload: {
  status: string;
  topic?: string | null;
  poll_id?: string | null;
  poll_url?: string | null;
  poll_created?: boolean;
  poll_skipped_reason?: string | null;
  platforms?: Record<string, string>;
  distribution?: unknown;
  buffer_results?: unknown;
  headline_count?: number;
  notes?: string;
  error?: string | null;
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = adminClient();
  if (!supabase) {
    return {
      id: null,
      error: "SUPABASE_SERVICE_ROLE_KEY missing — cannot persist automation_runs",
    };
  }

  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "automation_log_run",
    {
      p_status: payload.status,
      p_topic: payload.topic ?? null,
      p_poll_id: payload.poll_id ?? null,
      p_poll_url: payload.poll_url ?? null,
      p_poll_created: payload.poll_created ?? false,
      p_poll_skipped_reason: payload.poll_skipped_reason ?? null,
      p_platforms: payload.platforms ?? {},
      p_distribution: payload.distribution ?? [],
      p_buffer_results: payload.buffer_results ?? [],
      p_headline_count: payload.headline_count ?? 0,
      p_notes: payload.notes ?? null,
      p_error: payload.error ?? null,
    }
  );

  if (!rpcError && rpcId) {
    return { id: rpcId as string, error: null };
  }

  const { data, error } = await supabase
    .from("automation_runs")
    .insert({
      status: payload.status,
      topic: payload.topic ?? null,
      poll_id: payload.poll_id ?? null,
      poll_url: payload.poll_url ?? null,
      poll_created: payload.poll_created ?? false,
      poll_skipped_reason: payload.poll_skipped_reason ?? null,
      platforms: payload.platforms ?? {},
      distribution: payload.distribution ?? [],
      buffer_results: payload.buffer_results ?? [],
      headline_count: payload.headline_count ?? 0,
      notes: payload.notes ?? null,
      error: payload.error ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      id: null,
      error:
        rpcError?.message ||
        error?.message ||
        "automation_runs insert failed",
    };
  }
  return { id: data.id as string, error: null };
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

async function fetchPollRow(pollId: string): Promise<{
  question: string;
  option_a: string;
  option_b: string;
  vote_count_a: number;
  vote_count_b: number;
} | null> {
  const supabase = adminClient();
  const client =
    supabase ||
    (() => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return null;
      return createClient(url, key);
    })();
  if (!client) return null;
  const { data } = await client
    .from("polls")
    .select("question, option_a, option_b, vote_count_a, vote_count_b")
    .eq("id", pollId)
    .maybeSingle();
  return data;
}

export async function runDailyGrowthPipeline(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const caps = await getCapabilityReport();
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

  notes.push(
    `Connected Buffer services: ${caps.connectedServices.join(", ") || "none"}`
  );
  if (caps.x_ads_only) {
    notes.push("X Ads path disabled (no paid spend).");
  }

  let bufferResults: BufferPublishResult[] = [];
  let logId: string | null = null;

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
    let voteA = topExisting?.vote_count_a ?? 0;
    let voteB = topExisting?.vote_count_b ?? 0;

    const existingVotes = voteA + voteB;

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
          voteA = 0;
          voteB = 0;
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

    if (pollId) {
      const row = await fetchPollRow(pollId);
      if (row) {
        topic = row.question;
        optionA = row.option_a;
        optionB = row.option_b;
        voteA = Number(row.vote_count_a) || 0;
        voteB = Number(row.vote_count_b) || 0;
      }
    }

    const distribution = brief.distribution.map((d) => ({
      platform: d.platform,
      title: d.title,
      body: d.body,
      url: d.url,
    }));

    // Reset publish statuses to UNAVAILABLE unless Buffer confirms
    platforms.x = caps.x_organic;
    platforms.instagram = caps.instagram;
    platforms.facebook = caps.facebook;
    platforms.linkedin = caps.linkedin;

    if (pollId && pollUrl && isBufferConfigured()) {
      try {
        const already = await loadPublishedKeys(pollId);
        bufferResults = await publishPollToBuffer({
          pollId,
          question: topic,
          optionA,
          optionB,
          pollUrl,
          voteCountA: voteA,
          voteCountB: voteB,
          alreadyPublishedKeys: already,
        });
        const okCount = bufferResults.filter(
          (r) => r.success && r.mode === "queue"
        ).length;
        const errCount = bufferResults.filter((r) => r.mode === "error").length;
        notes.push(
          `Buffer: ${okCount} queued, ${errCount} errors, ${bufferResults.length} channel attempts`
        );

        // Only mark AUTO when Buffer returned an update ID
        platforms.x = "UNAVAILABLE";
        platforms.instagram = "UNAVAILABLE";
        platforms.facebook = "UNAVAILABLE";
        platforms.linkedin = "UNAVAILABLE";
        for (const r of bufferResults) {
          if (!(r.success && r.mode === "queue" && r.updateId)) continue;
          if (r.service === "twitter") platforms.x = "AUTO";
          if (r.service === "instagram") platforms.instagram = "AUTO";
          if (r.service === "facebook") platforms.facebook = "AUTO";
          if (r.service === "linkedin") platforms.linkedin = "AUTO";
        }
        // Keep connected-but-failed as MANUAL for founder awareness
        for (const r of bufferResults) {
          if (r.mode === "error") {
            if (r.service === "twitter" && platforms.x !== "AUTO")
              platforms.x = "MANUAL";
            if (r.service === "instagram" && platforms.instagram !== "AUTO")
              platforms.instagram = "MANUAL";
            if (r.service === "facebook" && platforms.facebook !== "AUTO")
              platforms.facebook = "MANUAL";
            if (r.service === "linkedin" && platforms.linkedin !== "AUTO")
              platforms.linkedin = "MANUAL";
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

    const logged = await logRun({
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
      error: null,
    });
    logId = logged.id;
    if (logged.error) {
      notes.push(`Log persist failed: ${logged.error}`);
    } else if (logId) {
      notes.push(`Logged automation_runs id=${logId}`);
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
      logId,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Pipeline failed";
    const logged = await logRun({
      status: "error",
      error,
      buffer_results: bufferResults,
      notes: notes.join(" | "),
    });
    logId = logged.id;
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
      logId,
    };
  }
}
