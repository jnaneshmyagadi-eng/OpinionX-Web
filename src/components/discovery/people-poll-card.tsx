import Link from "next/link";
import type { PublicPollCard } from "@/lib/polls-public";
import { percentSplit } from "@/lib/polls-public";

export function PeoplePollCard({ poll }: { poll: PublicPollCard }) {
  const { percentA, percentB, total } = percentSplit(
    poll.vote_count_a,
    poll.vote_count_b
  );

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <Link href={`/poll/${poll.id}`}>
        <h3 className="text-sm font-semibold leading-snug text-white">
          {poll.question}
        </h3>
      </Link>
      <p className="mt-1 text-xs text-zinc-500">
        {poll.option_a} vs {poll.option_b}
      </p>

      {total > 0 ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">{poll.option_a}</span>
            <span className="font-semibold text-purple-300">{percentA}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
              style={{ width: `${percentA}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">{poll.option_b}</span>
            <span className="font-semibold text-pink-300">{percentB}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
              style={{ width: `${percentB}%` }}
            />
          </div>
          <p className="pt-1 text-center text-[11px] text-zinc-600">
            {total.toLocaleString()} real votes
          </p>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-zinc-500">
          No votes yet — be the first
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Link
          href={`/poll/${poll.id}`}
          className="flex-1 rounded-full bg-purple-600 py-2 text-center text-xs font-semibold text-white"
        >
          Vote
        </Link>
        <Link
          href={`/poll/${poll.id}`}
          className="flex-1 rounded-full border border-zinc-600 py-2 text-center text-xs font-semibold text-zinc-200"
        >
          Share
        </Link>
      </div>
    </article>
  );
}
