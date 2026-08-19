/**
 * Daily Trending → Poll → Result → Share engine.
 * - Facts come only from public RSS (attributed).
 * - Opinions come only from real OpinionX polls (real vote counts).
 * - Suggested debates never invent votes or publish polls automatically.
 */

import { fetchTrends, type TrendItem, type TrendCategory } from "@/lib/trends";
import {
  fetchLivePolls,
  type PublicPollCard,
  percentSplit,
} from "@/lib/polls-public";
import { SITE_URL } from "@/lib/seo";

export type MatchedDebate = {
  kind: "live_poll";
  poll: PublicPollCard;
  relatedHeadlines: TrendItem[];
  score: number;
};

export type SuggestedDebate = {
  kind: "suggested";
  question: string;
  optionA: string;
  optionB: string;
  hub: TrendCategory | "people";
  basedOnTitle: string;
  sourceUrl: string;
  sourceName: string;
  createPath: string;
};

export type DistributionItem = {
  platform: "x" | "instagram" | "whatsapp";
  title: string;
  body: string;
  url: string;
};

export type DailyBrief = {
  dateKey: string;
  fetchedAt: string;
  headlines: {
    world: TrendItem[];
    india: TrendItem[];
    money: TrendItem[];
    ai: TrendItem[];
  };
  liveDebates: MatchedDebate[];
  suggestions: SuggestedDebate[];
  topPolls: PublicPollCard[];
  distribution: DistributionItem[];
  errors: string[];
};

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function overlapScore(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const w of ta) if (tb.has(w)) hit++;
  return hit / Math.min(ta.size, tb.size);
}

/** Map a headline to a safe, generic A/B debate prompt (not a claim of fact). */
function suggestFromHeadline(
  item: TrendItem,
  hub: TrendCategory
): SuggestedDebate | null {
  const t = item.title.toLowerCase();

  // Skip crime/death-heavy items — not appropriate for casual voting
  if (
    /\b(dead|death|killed|murder|suicide|rape|assault|jailed|charged)\b/i.test(
      item.title
    )
  ) {
    return null;
  }

  let question = "";
  let optionA = "Yes / Agree";
  let optionB = "No / Disagree";

  if (/ai|chatgpt|openai|robot|tech|app|phone|iphone|android|google|meta/i.test(t)) {
    question = "Should AI tools replace more everyday human work?";
    optionA = "Yes — speed wins";
    optionB = "No — humans stay in control";
  } else if (/job|career|salary|wage|layoff|office|remote|work/i.test(t)) {
    question = "High-paying stressful job or peaceful lower-stress life?";
    optionA = "₹1 Cr-style ambition";
    optionB = "Peaceful life first";
  } else if (/india|delhi|mumbai|bangalore|bengaluru|modi|election/i.test(t)) {
    question = "Is India heading in the right direction this year?";
    optionA = "Yes — optimistic";
    optionB = "Not yet";
  } else if (/economy|market|stock|inflation|bank|rupee|dollar|crypto/i.test(t)) {
    question = "Would you invest more in stocks/crypto this year or stay cash-safe?";
    optionA = "Invest more";
    optionB = "Stay defensive";
  } else if (/climate|heat|flood|pollution|environment/i.test(t)) {
    question = "Should cities prioritise climate action over short-term growth?";
    optionA = "Climate first";
    optionB = "Growth first";
  } else if (/movie|film|cricket|sport|football|ipl|netflix/i.test(t)) {
    question = "Are you following this story more for entertainment or for news?";
    optionA = "Entertainment";
    optionB = "Serious news";
  } else {
    // Generic: "does this matter to you"
    question = `Does this headline matter to your daily life?`;
    optionA = "Yes — it affects me";
    optionB = "Not really";
  }

  // Keep question short
  if (question.length > 120) question = question.slice(0, 117) + "…";

  const params = new URLSearchParams({
    q: question,
    a: optionA,
    b: optionB,
  });

  return {
    kind: "suggested",
    question,
    optionA,
    optionB,
    hub,
    basedOnTitle: item.title,
    sourceUrl: item.url,
    sourceName: item.source,
    createPath: `/create?${params.toString()}`,
  };
}

function matchPollsToHeadlines(
  polls: PublicPollCard[],
  headlines: TrendItem[]
): MatchedDebate[] {
  const out: MatchedDebate[] = [];

  for (const poll of polls) {
    const pollText = `${poll.question} ${poll.option_a} ${poll.option_b} ${poll.category}`;
    const related: TrendItem[] = [];
    let best = 0;
    for (const h of headlines) {
      const s = overlapScore(pollText, `${h.title} ${h.summary}`);
      if (s >= 0.15) {
        related.push(h);
        best = Math.max(best, s);
      }
    }
    const votes = poll.vote_count_a + poll.vote_count_b;
    const score = best * 10 + votes + (related.length > 0 ? 5 : 0);
    out.push({ kind: "live_poll", poll, relatedHeadlines: related.slice(0, 2), score });
  }

  return out.sort((a, b) => b.score - a.score);
}

function buildDistribution(
  topPolls: PublicPollCard[],
  indiaHeadlines: TrendItem[],
  suggestions: SuggestedDebate[]
): DistributionItem[] {
  const items: DistributionItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Lead with strongest live poll
  const lead = topPolls[0];
  if (lead) {
    const { percentA, percentB, total } = percentSplit(
      lead.vote_count_a,
      lead.vote_count_b
    );
    const pollUrl = `${SITE_URL}/poll/${lead.id}`;
    const splitLine =
      total > 0
        ? `India is split: ${percentA}% chose ${lead.option_a} vs ${percentB}% ${lead.option_b} (${total} real votes).`
        : `No votes yet — be the first to decide.`;

    items.push({
      platform: "x",
      title: "X — lead poll",
      body: `India, what would YOU choose?\n\n${lead.question}\n\nA) ${lead.option_a}\nB) ${lead.option_b}\n\n${splitLine}\n\n#LetTheInternetDecide\n${pollUrl}`,
      url: pollUrl,
    });

    items.push({
      platform: "whatsapp",
      title: "WhatsApp — lead poll",
      body: `Quick vote 👀\n\n${lead.question}\n\n${lead.option_a} vs ${lead.option_b}\n\n${splitLine}\n\nOpen: ${pollUrl}`,
      url: pollUrl,
    });

    items.push({
      platform: "instagram",
      title: "IG Reel/Story concept",
      body: `Hook text on screen:\n"${lead.question}"\n\nShow A vs B.\n${total > 0 ? `Reveal ${percentA}% vs ${percentB}% (real votes only).` : "Ask followers to vote in bio/link."}\n\nCTA: Link in bio → OpinionX\n${pollUrl}`,
      url: pollUrl,
    });
  }

  const indiaTitle = indiaHeadlines[0]?.title;
  if (indiaTitle) {
    items.push({
      platform: "x",
      title: "X — India talking about",
      body: `What is India talking about today (${today})?\n\nHeadline (external source): ${indiaTitle}\n\nThen decide what YOU think → live polls:\n${SITE_URL}/india\n\nNews = what happened.\nOpinionX = what people think.\n\n#LetTheInternetDecide`,
      url: `${SITE_URL}/india`,
    });
  }

  items.push({
    platform: "x",
    title: "X — Today hub",
    body: `Daily brief is live.\n\nWhat happened (sourced headlines)\n+\nWhat people are deciding (real votes)\n\n${SITE_URL}/today\n\n#LetTheInternetDecide`,
    url: `${SITE_URL}/today`,
  });

  if (suggestions[0]) {
    const s = suggestions[0];
    items.push({
      platform: "whatsapp",
      title: "WhatsApp — open a new debate",
      body: `Topic in the news: ${s.basedOnTitle}\n\nDebate idea:\n${s.question}\n${s.optionA} vs ${s.optionB}\n\nPublish on OpinionX (login required):\n${SITE_URL}${s.createPath}`,
      url: `${SITE_URL}${s.createPath}`,
    });
  }

  return items;
}

export async function buildDailyBrief(): Promise<DailyBrief> {
  const fetchedAt = new Date().toISOString();
  const dateKey = fetchedAt.slice(0, 10);
  const errors: string[] = [];

  const [world, india, money, ai, polls] = await Promise.all([
    fetchTrends("world", 8),
    fetchTrends("india", 8),
    fetchTrends("money", 6),
    fetchTrends("ai", 6),
    fetchLivePolls(40),
  ]);

  for (const [name, res] of [
    ["world", world],
    ["india", india],
    ["money", money],
    ["ai", ai],
  ] as const) {
    if (res.error) errors.push(`${name}: ${res.error}`);
  }

  const allHeadlines = [
    ...india.items,
    ...world.items,
    ...money.items,
    ...ai.items,
  ];

  const matched = matchPollsToHeadlines(polls, allHeadlines);
  const topPolls = [...polls].sort(
    (a, b) =>
      b.vote_count_a +
      b.vote_count_b -
      (a.vote_count_a + a.vote_count_b)
  );

  // Prefer live debates with votes; then any active polls
  const liveDebates = matched.filter(
    (m) => m.poll.vote_count_a + m.poll.vote_count_b > 0 || m.relatedHeadlines.length > 0
  );
  if (liveDebates.length < 4) {
    for (const m of matched) {
      if (!liveDebates.find((x) => x.poll.id === m.poll.id)) {
        liveDebates.push(m);
      }
      if (liveDebates.length >= 8) break;
    }
  }

  const suggestions: SuggestedDebate[] = [];
  const seenQ = new Set<string>();
  const hubs: { cat: TrendCategory; items: TrendItem[] }[] = [
    { cat: "india", items: india.items },
    { cat: "world", items: world.items },
    { cat: "money", items: money.items },
    { cat: "ai", items: ai.items },
  ];
  for (const { cat, items } of hubs) {
    for (const item of items) {
      if (suggestions.length >= 8) break;
      const s = suggestFromHeadline(item, cat);
      if (!s) continue;
      if (seenQ.has(s.question)) continue;
      seenQ.add(s.question);
      suggestions.push(s);
    }
  }

  const distribution = buildDistribution(
    topPolls,
    india.items,
    suggestions
  );

  return {
    dateKey,
    fetchedAt,
    headlines: {
      world: world.items,
      india: india.items,
      money: money.items,
      ai: ai.items,
    },
    liveDebates: liveDebates.slice(0, 10),
    suggestions: suggestions.slice(0, 8),
    topPolls: topPolls.slice(0, 8),
    distribution,
    errors,
  };
}
