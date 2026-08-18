"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, validateImageFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { CATEGORIES, MOODS, MOOD_META } from "@/types/database";
import { Loader2, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Auth gate is middleware only.
 * This page assumes the user already passed /create protection.
 * On publish we still resolve user id from the shared cookie session.
 */
function CreatePollForm() {
  const searchParams = useSearchParams();
  const prefillQ = searchParams.get("q") ?? "";
  const prefillA = searchParams.get("a") ?? "";
  const prefillB = searchParams.get("b") ?? "";

  const [question, setQuestion] = useState(prefillQ);
  const [optionA, setOptionA] = useState(prefillA);
  const [optionB, setOptionB] = useState(prefillB);
  const [category, setCategory] = useState("general");
  const [mood, setMood] = useState("curious");
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputA = useRef<HTMLInputElement>(null);
  const inputB = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function onPick(side: "a" | "b", file: File | undefined) {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    if (side === "a") {
      setFileA(file);
      setPreviewA(url);
    } else {
      setFileB(file);
      setPreviewB(url);
    }
  }

  function clearImage(side: "a" | "b") {
    if (side === "a") {
      setFileA(null);
      if (previewA) URL.revokeObjectURL(previewA);
      setPreviewA(null);
    } else {
      setFileB(null);
      if (previewB) URL.revokeObjectURL(previewB);
      setPreviewB(null);
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (question.trim().length < 5) {
      setError("Question must be at least 5 characters");
      return;
    }
    if (!optionA.trim() || !optionB.trim()) {
      setError("Both option titles are required");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        // Session missing despite middleware — force re-auth once
        window.location.assign("/login?redirect=/create");
        return;
      }

      let image_a_url: string | null = null;
      let image_b_url: string | null = null;
      if (fileA) image_a_url = await uploadImage(fileA, "poll-images", user.id);
      if (fileB) image_b_url = await uploadImage(fileB, "poll-images", user.id);

      const { data, error: insertErr } = await supabase
        .from("polls")
        .insert({
          creator_id: user.id,
          question: question.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          image_a_url,
          image_b_url,
          category,
          mood,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      router.push(`/poll/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-white">Create a poll</h1>

      <form onSubmit={handlePublish} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Which outfit is better?"
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            required
          />
          <p className="mt-1 text-right text-xs text-zinc-600">
            {question.length}/300
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Images (optional but recommended)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["a", "b"] as const).map((side) => {
              const preview = side === "a" ? previewA : previewB;
              const ref = side === "a" ? inputA : inputB;
              return (
                <div key={side} className="space-y-2">
                  <div
                    className={cn(
                      "relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/80",
                      preview && "border-solid border-zinc-600"
                    )}
                  >
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={`Option ${side.toUpperCase()}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => clearImage(side)}
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        className="flex flex-col items-center gap-2 p-4 text-zinc-500"
                      >
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-xs">
                          Image {side.toUpperCase()}
                        </span>
                      </button>
                    )}
                    <input
                      ref={ref}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => onPick(side, e.target.files?.[0])}
                    />
                  </div>
                  <input
                    value={side === "a" ? optionA : optionB}
                    onChange={(e) =>
                      side === "a"
                        ? setOptionA(e.target.value)
                        : setOptionB(e.target.value)
                    }
                    maxLength={100}
                    placeholder={`Option ${side.toUpperCase()} title`}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs font-bold text-zinc-600">VS</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                  category === c
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Mood</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  mood === m
                    ? "bg-pink-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {MOOD_META[m].emoji} {MOOD_META[m].label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Publish poll"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function CreatePollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <CreatePollForm />
    </Suspense>
  );
}
