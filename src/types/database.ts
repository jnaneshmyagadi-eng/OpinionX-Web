export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          moods: string[] | null;
          categories_interest: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          moods?: string[] | null;
          categories_interest?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          moods?: string[] | null;
          categories_interest?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      polls: {
        Row: {
          id: string;
          creator_id: string;
          question: string;
          option_a: string;
          option_b: string;
          image_a_url: string | null;
          image_b_url: string | null;
          category: string;
          mood: string;
          vote_count_a: number;
          vote_count_b: number;
          like_count: number;
          comment_count: number;
          save_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          question: string;
          option_a: string;
          option_b: string;
          image_a_url?: string | null;
          image_b_url?: string | null;
          category?: string;
          mood?: string;
          vote_count_a?: number;
          vote_count_b?: number;
          like_count?: number;
          comment_count?: number;
          save_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          question?: string;
          option_a?: string;
          option_b?: string;
          image_a_url?: string | null;
          image_b_url?: string | null;
          category?: string;
          mood?: string;
          vote_count_a?: number;
          vote_count_b?: number;
          like_count?: number;
          comment_count?: number;
          save_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          choice: "a" | "b";
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          choice: "a" | "b";
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string;
          choice?: "a" | "b";
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      saves: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: "like" | "comment" | "follow" | "vibe_match" | "vote";
          poll_id: string | null;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: "like" | "comment" | "follow" | "vibe_match" | "vote";
          poll_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: "like" | "comment" | "follow" | "vibe_match" | "vote";
          poll_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Poll = Database["public"]["Tables"]["polls"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Save = Database["public"]["Tables"]["saves"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationMember =
  Database["public"]["Tables"]["conversation_members"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

export type PollWithCreator = Poll & {
  profiles: Profile | null;
  user_vote?: "a" | "b" | null;
  user_liked?: boolean;
  user_saved?: boolean;
};

export type CommentWithAuthor = Comment & {
  profiles: Profile | null;
};

export const CATEGORIES = [
  "general",
  "lifestyle",
  "tech",
  "entertainment",
  "food",
  "relationships",
  "career",
  "sports",
  "fashion",
  "travel",
  "gaming",
  "movies",
  "music",
] as const;

/** Mood keys stored in DB (lowercase). */
export const MOODS = [
  "trending",
  "funny",
  "love",
  "chill",
  "curious",
  "debate",
  "emotional",
  "creative",
  "fashion",
  "food",
  "sports",
  "gaming",
  "tech",
  "movies",
  "music",
  "ideas",
  "world",
  "india",
] as const;

export const MOOD_META: Record<
  (typeof MOODS)[number],
  { label: string; emoji: string }
> = {
  trending: { label: "Trending", emoji: "🔥" },
  funny: { label: "Funny", emoji: "😂" },
  love: { label: "Love", emoji: "❤️" },
  chill: { label: "Chill", emoji: "😎" },
  curious: { label: "Curious", emoji: "🤔" },
  debate: { label: "Debate", emoji: "😡" },
  emotional: { label: "Emotional", emoji: "🥹" },
  creative: { label: "Creative", emoji: "🎨" },
  fashion: { label: "Fashion", emoji: "👗" },
  food: { label: "Food", emoji: "🍔" },
  sports: { label: "Sports", emoji: "🏏" },
  gaming: { label: "Gaming", emoji: "🎮" },
  tech: { label: "Tech", emoji: "📱" },
  movies: { label: "Movies", emoji: "🎬" },
  music: { label: "Music", emoji: "🎵" },
  ideas: { label: "Ideas", emoji: "💡" },
  world: { label: "World", emoji: "🌍" },
  india: { label: "India", emoji: "🇮🇳" },
};

export type Category = (typeof CATEGORIES)[number];
export type Mood = (typeof MOODS)[number];
