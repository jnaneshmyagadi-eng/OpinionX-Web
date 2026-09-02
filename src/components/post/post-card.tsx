"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ContentPostWithAuthor } from "@/types/content";
import { linkifyHashtags } from "@/lib/feed";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "@/components/ui/share-sheet";

type Props = {
  post: ContentPostWithAuthor;
  currentUserId?: string | null;
};

export function PostCard({ post, currentUserId }: Props) {
  const [liked, setLiked] = useState(post.user_liked ?? false);
  const [saved, setSaved] = useState(post.user_saved ?? false);
  const [likes, setLikes] = useState(post.like_count);
  const [showShare, setShowShare] = useState(false);
  const supabase = createClient();
  const author = post.profiles;

  function postUrl() {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/post/${post.id}`;
    }
    return `/post/${post.id}`;
  }

  async function toggleLike() {
    if (!currentUserId) {
      window.location.assign(`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      if (next) {
        const { error } = await supabase.from("post_likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  }

  async function toggleSave() {
    if (!currentUserId) {
      window.location.assign(`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await supabase.from("post_saves").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
      } else {
        await supabase
          .from("post_saves")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
      }
    } catch {
      setSaved(!next);
    }
  }

  const shareText = post.body
    ? `${post.body.slice(0, 120)}${post.body.length > 120 ? "…" : ""}\n\n${postUrl()}`
    : `Check this on OpinionX\n${postUrl()}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          href={`/profile/${author?.username ?? ""}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-sm font-semibold"
        >
          {author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (author?.username?.[0] ?? "?").toUpperCase()
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${author?.username ?? ""}`}
            className="truncate text-sm font-semibold text-white hover:underline"
          >
            {author?.display_name || author?.username || "User"}
          </Link>
          <p className="text-xs text-zinc-500">
            {formatRelativeTime(post.created_at)}
            {post.type === "image" ? " · Photo" : " · Post"}
          </p>
        </div>
      </div>

      {post.body && (
        <Link href={`/post/${post.id}`} className="block px-4 py-3">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-100">
            {linkifyHashtags(post.body).map((part, i) =>
              part.type === "tag" ? (
                <Link
                  key={i}
                  href={`/explore?q=${encodeURIComponent("#" + part.value)}`}
                  className="font-medium text-violet-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{part.value}
                </Link>
              ) : (
                <span key={i}>{part.value}</span>
              )
            )}
          </p>
        </Link>
      )}

      {post.type === "image" && post.image_url && (
        <Link href={`/post/${post.id}`} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt=""
            className="max-h-[28rem] w-full object-cover"
            loading="lazy"
          />
        </Link>
      )}

      {showShare && (
        <div className="px-4 pb-2">
          <ShareSheet url={postUrl()} title="OpinionX" text={shareText} />
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-zinc-800/60 px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className={cn("gap-1.5", liked && "text-pink-400")}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span className="text-xs">{likes || ""}</span>
        </Button>
        <Link href={`/post/${post.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Comments">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{post.comment_count || ""}</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSave}
          className={cn(saved && "text-orange-400")}
          aria-label={saved ? "Unsave" : "Save"}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setShowShare((s) => !s)}
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
