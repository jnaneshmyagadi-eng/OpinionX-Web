import type { Poll, Profile } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Time-decayed engagement score for trending. */
export function trendingScore(poll: {
  vote_count_a: number;
  vote_count_b: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  created_at: string;
}): number {
  const votes = poll.vote_count_a + poll.vote_count_b;
  const engagement =
    votes + poll.like_count * 2 + poll.comment_count * 3 + poll.save_count * 2;
  const ageHours =
    (Date.now() - new Date(poll.created_at).getTime()) / (1000 * 60 * 60);
  const decay = Math.pow(0.5, ageHours / 36);
  return engagement * decay;
}

export function sortByTrending<T extends Poll>(polls: T[]): T[] {
  return [...polls].sort((a, b) => trendingScore(b) - trendingScore(a));
}

export type CategoryOpinion = {
  category: string;
  votesA: number;
  votesB: number;
  total: number;
  percentA: number;
  percentB: number;
};

export function buildOpinionGraph(
  rows: { choice: "a" | "b"; category: string }[]
): {
  categories: CategoryOpinion[];
  totalVotes: number;
  topCategories: string[];
} {
  const map = new Map<string, { a: number; b: number }>();
  for (const r of rows) {
    const cur = map.get(r.category) ?? { a: 0, b: 0 };
    if (r.choice === "a") cur.a += 1;
    else cur.b += 1;
    map.set(r.category, cur);
  }
  const categories: CategoryOpinion[] = [];
  for (const [category, counts] of map) {
    const total = counts.a + counts.b;
    const percentA = total ? Math.round((counts.a / total) * 100) : 50;
    categories.push({
      category,
      votesA: counts.a,
      votesB: counts.b,
      total,
      percentA,
      percentB: 100 - percentA,
    });
  }
  categories.sort((a, b) => b.total - a.total);
  return {
    categories,
    totalVotes: rows.length,
    topCategories: categories.slice(0, 5).map((c) => c.category),
  };
}

export type SimilarUser = Profile & {
  agreementPercent: number;
  sharedVotes: number;
};

export function rankPeopleLikeYou(
  myVotes: Map<string, "a" | "b">,
  others: { user_id: string; poll_id: string; choice: "a" | "b" }[],
  profiles: Profile[]
): SimilarUser[] {
  if (myVotes.size === 0) return [];

  const byUser = new Map<string, { agree: number; shared: number }>();
  for (const v of others) {
    const mine = myVotes.get(v.poll_id);
    if (!mine) continue;
    const cur = byUser.get(v.user_id) ?? { agree: 0, shared: 0 };
    cur.shared += 1;
    if (mine === v.choice) cur.agree += 1;
    byUser.set(v.user_id, cur);
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const ranked: SimilarUser[] = [];
  for (const [uid, stats] of byUser) {
    if (stats.shared < 1) continue;
    const profile = profileMap.get(uid);
    if (!profile) continue;
    ranked.push({
      ...profile,
      sharedVotes: stats.shared,
      agreementPercent: Math.round((stats.agree / stats.shared) * 100),
    });
  }
  return ranked
    .filter((u) => u.sharedVotes >= 1)
    .sort(
      (a, b) =>
        b.agreementPercent - a.agreementPercent ||
        b.sharedVotes - a.sharedVotes
    );
}

/** Rule-based comment summary — no external AI, no invented reasons. */
export function summarizeComments(
  comments: { content: string }[],
  optionA: string,
  optionB: string,
  voteCountA: number,
  voteCountB: number
): string {
  if (comments.length < 3) {
    return "Not enough responses yet to generate a summary.";
  }

  const total = voteCountA + voteCountB;
  const lean =
    total === 0
      ? "Voters are still deciding"
      : voteCountA === voteCountB
        ? `Votes are split between ${optionA} and ${optionB}`
        : voteCountA > voteCountB
          ? `Most voters chose ${optionA}`
          : `Most voters chose ${optionB}`;

  const texts = comments.map((c) => c.content.toLowerCase());
  const keywords = [
    "better",
    "value",
    "price",
    "battery",
    "camera",
    "design",
    "quality",
    "fun",
    "easy",
    "cheap",
    "expensive",
    "look",
    "feel",
    "fast",
    "slow",
  ];
  const found = keywords.filter((k) => texts.some((t) => t.includes(k)));
  const themes =
    found.length > 0
      ? ` People often mention: ${found.slice(0, 4).join(", ")}.`
      : "";

  return `${lean} (${voteCountA} vs ${voteCountB}). Based on ${comments.length} comments.${themes}`;
}

export async function startOrOpenChat(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
): Promise<string | null> {
  if (currentUserId === otherUserId) return null;

  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  const myConvIds = (myMemberships ?? []).map(
    (m: { conversation_id: string }) => m.conversation_id
  );
  if (myConvIds.length) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvIds);
    if (shared?.[0]?.conversation_id) {
      return shared[0].conversation_id as string;
    }
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (convErr || !conv) return null;

  await supabase.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: currentUserId },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);

  return conv.id as string;
}
