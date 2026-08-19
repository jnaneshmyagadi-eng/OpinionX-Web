import { createClient } from "@supabase/supabase-js";
import { buildDailyBrief, type SuggestedDebate } from "@/lib/daily-engine";
import { getCapabilityReport } from "@/lib/automation/capabilities";
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

async function alreadyExists(
  question: string
): Promise<boolean> {
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

  // Validate lengths
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
      category: suggestion.hub === "ai" ? "tech" : suggestion.hub === "money" ? "career" : "general",
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

export async function runDailyGrowthPipeline(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const caps = getCapabilityReport();
  const notes: string[] = [];
  const platforms: PipelineResult["platforms"] = {
    x: caps.x_organic === "AUTO" ? "AUTO" : "MANUAL",
    instagram: caps.instagram,
    facebook: caps.facebook,
    linkedin: caps.linkedin,
    reddit: caps.reddit,
    whatsapp: caps.whatsapp,
  };

  // Never auto-spend on X Ads
  if (caps.x_ads_only) {
    platforms.x = "MANUAL";
    notes.push("X organic unavailable; X Ads not used (would spend money).");
  }

  try {
    const brief = await buildDailyBrief();
    const headlineCount =
      brief.headlines.india.length +
      brief.headlines.world.length +
      brief.headlines.money.length +
      brief.headlines.ai.length;

    // Prefer strongest existing live poll; else first safe suggestion
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

    // Auto-create only when configured AND no strong existing poll with votes
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

    // Always attach /today distribution pack (share-ready)
    const distribution = brief.distribution.map((d) => ({
      platform: d.platform,
      title: d.title,
      body: d.body,
      url: d.url,
    }));

    // Social publish: none connected for organic AUTO
    notes.push(
      "Social publish: all MANUAL/UNAVAILABLE — copy pack stored for founder."
    );

    // Persist run log if service role available
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
      headlineCount: 0,
      notes,
      error,
    };
  }
}
