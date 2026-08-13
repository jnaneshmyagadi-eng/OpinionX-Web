import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = {
    title: "Poll on OpinionX",
    description:
      "Vote on this two-choice poll on OpinionX — the social voting platform.",
    alternates: { canonical: absoluteUrl(`/poll/${id}`) },
    robots: { index: true, follow: true },
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return fallback;

    const supabase = createClient(url, key);
    const { data: poll } = await supabase
      .from("polls")
      .select(
        "id, question, option_a, option_b, image_a_url, image_b_url, is_active, vote_count_a, vote_count_b"
      )
      .eq("id", id)
      .maybeSingle();

    if (!poll || poll.is_active === false) {
      return {
        ...fallback,
        title: "Poll not found",
        robots: { index: false, follow: false },
      };
    }

    const votes = (poll.vote_count_a ?? 0) + (poll.vote_count_b ?? 0);
    const description = `Vote on OpinionX: ${poll.option_a} vs ${poll.option_b}. ${votes} vote${votes === 1 ? "" : "s"} so far. Join the social voting conversation.`;

    const images = [poll.image_a_url, poll.image_b_url].filter(
      Boolean
    ) as string[];

    return {
      title: poll.question.slice(0, 60),
      description: description.slice(0, 160),
      alternates: {
        canonical: absoluteUrl(`/poll/${poll.id}`),
      },
      openGraph: {
        title: `${poll.question} | ${SITE_NAME}`,
        description,
        url: absoluteUrl(`/poll/${poll.id}`),
        type: "article",
        images: images.length
          ? images.map((src) => ({ url: src }))
          : undefined,
      },
      twitter: {
        card: images.length ? "summary_large_image" : "summary",
        title: poll.question,
        description,
        images: images.length ? images : undefined,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return fallback;
  }
}

export default function PollLayout({ children }: Props) {
  return children;
}
