import type { Profile, PollWithCreator } from "@/types/database";

export type ContentPostType = "text" | "image";

export type ContentPost = {
  id: string;
  user_id: string;
  type: ContentPostType;
  body: string;
  image_url: string | null;
  category: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ContentPostWithAuthor = ContentPost & {
  profiles: Profile | null;
  user_liked?: boolean;
  user_saved?: boolean;
};

export type FeedItem =
  | {
      kind: "poll";
      id: string;
      createdAt: string;
      score: number;
      poll: PollWithCreator;
    }
  | {
      kind: "post";
      id: string;
      createdAt: string;
      score: number;
      post: ContentPostWithAuthor;
    };

export const POST_MAX_CHARS = 2000;
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
