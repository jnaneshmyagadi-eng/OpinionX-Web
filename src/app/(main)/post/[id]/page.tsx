import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post/post-card";
import { absoluteUrl } from "@/lib/seo";
import type { ContentPostWithAuthor } from "@/types/content";
import { PostComments } from "@/components/post/post-comments";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_posts")
    .select("body, type")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  const title =
    data?.body?.slice(0, 60) ||
    (data?.type === "image" ? "Image on OpinionX" : "Post on OpinionX");
  return {
    title,
    description: data?.body?.slice(0, 140) || "Shared on OpinionX",
    alternates: { canonical: absoluteUrl(`/post/${id}`) },
    openGraph: {
      title,
      url: absoluteUrl(`/post/${id}`),
      type: "article",
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase
    .from("content_posts")
    .select(
      `*, profiles:user_id (id, username, display_name, avatar_url)`
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) notFound();

  let post = {
    ...row,
    profiles: row.profiles,
  } as ContentPostWithAuthor;

  if (user) {
    const [{ data: like }, { data: save }] = await Promise.all([
      supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("post_saves")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    post = {
      ...post,
      user_liked: !!like,
      user_saved: !!save,
    };
  }

  return (
    <div className="space-y-4 px-3 py-4">
      <Link href="/" className="text-xs text-zinc-500 hover:text-violet-400">
        ← Feed
      </Link>
      <PostCard post={post} currentUserId={user?.id ?? null} />
      <PostComments postId={id} currentUserId={user?.id ?? null} />
    </div>
  );
}
