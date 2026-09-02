import type { PollWithCreator } from "@/types/database";
import type { ContentPostWithAuthor, FeedItem } from "@/types/content";

function ageHours(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, (Date.now() - t) / 3_600_000);
}

/** Engagement + freshness heuristic (no ML). */
export function scorePoll(p: PollWithCreator): number {
  const votes = p.vote_count_a + p.vote_count_b;
  const eng = votes * 2 + p.like_count * 1.5 + p.comment_count * 2 + p.save_count;
  const hours = ageHours(p.created_at);
  const decay = 1 / (1 + hours / 18);
  const boost = hours < 6 ? 8 : hours < 24 ? 3 : 0;
  return eng * decay + boost;
}

export function scorePost(p: ContentPostWithAuthor): number {
  const eng =
    p.like_count * 1.5 + p.comment_count * 2 + p.save_count + (p.type === "image" ? 1 : 0);
  const hours = ageHours(p.created_at);
  const decay = 1 / (1 + hours / 18);
  const boost = hours < 6 ? 8 : hours < 24 ? 3 : 0;
  return eng * decay + boost;
}

export function mergeFeed(
  polls: PollWithCreator[],
  posts: ContentPostWithAuthor[],
  mode: "for_you" | "trending" | "new" | "following"
): FeedItem[] {
  const pollItems: FeedItem[] = polls.map((poll) => ({
    kind: "poll",
    id: `poll:${poll.id}`,
    createdAt: poll.created_at,
    score: scorePoll(poll),
    poll,
  }));
  const postItems: FeedItem[] = posts.map((post) => ({
    kind: "post",
    id: `post:${post.id}`,
    createdAt: post.created_at,
    score: scorePost(post),
    post,
  }));
  const all = [...pollItems, ...postItems];
  if (mode === "new" || mode === "following") {
    return all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return all.sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Light hashtag linkify for captions */
export function linkifyHashtags(text: string): { type: "text" | "tag"; value: string }[] {
  const parts: { type: "text" | "tag"; value: string }[] = [];
  const re = /#([\w\u0900-\u097F]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    parts.push({ type: "tag", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", value: text });
  return parts;
}
