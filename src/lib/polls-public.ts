import { createClient } from "@supabase/supabase-js";

export type PublicPollCard = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  vote_count_a: number;
  vote_count_b: number;
  category: string;
  mood: string;
  created_at: string;
  updated_at: string;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function fetchLivePolls(limit = 12): Promise<PublicPollCard[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data } = await supabase
    .from("polls")
    .select(
      "id, question, option_a, option_b, vote_count_a, vote_count_b, category, mood, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicPollCard[];
}

export async function fetchTrendingPolls(limit = 12): Promise<PublicPollCard[]> {
  const polls = await fetchLivePolls(Math.max(limit * 2, 24));
  return [...polls]
    .sort(
      (a, b) =>
        b.vote_count_a +
        b.vote_count_b -
        (a.vote_count_a + a.vote_count_b)
    )
    .slice(0, limit);
}

export function percentSplit(a: number, b: number) {
  const total = a + b;
  if (total <= 0) return { percentA: 0, percentB: 0, total: 0 };
  const percentA = Math.round((a / total) * 100);
  return { percentA, percentB: 100 - percentA, total };
}
