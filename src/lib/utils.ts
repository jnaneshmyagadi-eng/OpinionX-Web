import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

export function calculatePercentages(
  countA: number,
  countB: number
): { percentA: number; percentB: number; total: number } {
  const total = countA + countB;
  if (total === 0) return { percentA: 50, percentB: 50, total: 0 };
  const percentA = Math.round((countA / total) * 100);
  return { percentA, percentB: 100 - percentA, total };
}

export function calculateVibeMatch(
  userMoods: string[],
  userCategories: string[],
  otherMoods: string[],
  otherCategories: string[]
): number {
  const moodSet = new Set(userMoods);
  const catSet = new Set(userCategories);
  let score = 0;
  let max = 0;

  otherMoods.forEach((m) => {
    max += 1;
    if (moodSet.has(m)) score += 1;
  });
  otherCategories.forEach((c) => {
    max += 1;
    if (catSet.has(c)) score += 1;
  });

  if (max === 0) return 50;
  return Math.min(99, Math.round((score / max) * 100) + 20);
}
