import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getCapabilityReport } from "@/lib/automation/capabilities";
import { buildDailyBrief } from "@/lib/daily-engine";
import { DistributionList } from "@/components/discovery/distribution-list";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Automation dashboard",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/automation") },
};

type RunRow = {
  id: string;
  created_at: string;
  status: string;
  topic: string | null;
  poll_id: string | null;
  poll_url: string | null;
  poll_created: boolean;
  poll_skipped_reason: string | null;
  platforms: Record<string, string> | null;
  headline_count: number | null;
  notes: string | null;
  error: string | null;
};

async function fetchLatestRuns(): Promise<RunRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase
    .from("automation_runs")
    .select(
      "id, created_at, status, topic, poll_id, poll_url, poll_created, poll_skipped_reason, platforms, headline_count, notes, error"
    )
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as RunRow[];
}

function StatusPill({ value }: { value: string }) {
  const color =
    value === "AUTO"
      ? "bg-emerald-600/20 text-emerald-400"
      : value === "MANUAL"
        ? "bg-amber-600/20 text-amber-300"
        : "bg-zinc-700 text-zinc-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>
      {value}
    </span>
  );
}

export default async function AutomationDashboardPage() {
  const caps = getCapabilityReport();
  const [runs, brief] = await Promise.all([
    fetchLatestRuns(),
    buildDailyBrief(),
  ]);
  const last = runs[0] ?? null;

  // Next cron estimate: every 6h from :00 UTC
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(Math.ceil(now.getUTCHours() / 6) * 6);
  if (next <= now) next.setUTCHours(next.getUTCHours() + 6);

  return (
    <div className="px-3 py-4">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Internal · noindex
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">
          Daily growth automation
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Honest status only. Nothing is marked AUTO unless a real write API or
          secured server path is available.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-white">Platform matrix</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(
            [
              ["X (organic)", caps.x_organic, caps.reasons.x_organic],
              ["Instagram", caps.instagram, caps.reasons.instagram],
              ["Facebook", caps.facebook, caps.reasons.facebook],
              ["LinkedIn", caps.linkedin, caps.reasons.linkedin],
              ["Reddit", caps.reddit, caps.reasons.reddit],
              ["WhatsApp", caps.whatsapp, caps.reasons.whatsapp],
              [
                "Poll auto-create",
                caps.poll_auto_create,
                caps.reasons.poll_auto_create,
              ],
            ] as const
          ).map(([label, status, reason]) => (
            <li key={label} className="border-b border-zinc-800/80 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">{label}</span>
                <StatusPill value={status} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-600">{reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-white">Latest run</h2>
        {last ? (
          <dl className="mt-3 space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between gap-2">
              <dt>Status</dt>
              <dd className="text-zinc-200">{last.status}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>When</dt>
              <dd className="text-zinc-200">
                {new Date(last.created_at).toISOString()}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Topic</dt>
              <dd className="max-w-[60%] text-right text-zinc-200">
                {last.topic || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Poll created</dt>
              <dd className="text-zinc-200">
                {last.poll_created ? "YES" : "NO"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Poll URL</dt>
              <dd className="max-w-[60%] text-right">
                {last.poll_url ? (
                  <a
                    href={last.poll_url}
                    className="text-purple-400 underline break-all"
                  >
                    {last.poll_url}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {last.poll_skipped_reason && (
              <div>
                <dt className="text-zinc-500">Skip reason</dt>
                <dd className="mt-1 text-amber-400/90">
                  {last.poll_skipped_reason}
                </dd>
              </div>
            )}
            {last.error && (
              <div className="text-red-400">Error: {last.error}</div>
            )}
            {last.notes && (
              <div className="text-zinc-600">{last.notes}</div>
            )}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            No runs logged yet. Cron has not fired, or{" "}
            <code className="text-zinc-400">SUPABASE_SERVICE_ROLE_KEY</code> is
            not set so logs cannot be written.
          </p>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">
          Next estimated cron (UTC every 6h): {next.toISOString()}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-white">Live metrics (real only)</h2>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>
            Headlines in brief:{" "}
            {brief.headlines.india.length +
              brief.headlines.world.length +
              brief.headlines.money.length +
              brief.headlines.ai.length}
          </li>
          <li>Active polls in brief: {brief.topPolls.length}</li>
          <li>
            Real votes on top polls:{" "}
            {brief.topPolls.reduce(
              (n, p) => n + p.vote_count_a + p.vote_count_b,
              0
            )}
          </li>
          <li>
            Clicks / visitors / signups: require Vercel Analytics + Supabase —
            not invented here.
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/today" className="text-purple-400 hover:underline">
            /today
          </Link>
          <Link href="/people" className="text-purple-400 hover:underline">
            /people
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-white">
          Manual publish pack (always available)
        </h2>
        <DistributionList items={brief.distribution} />
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">
        <h2 className="font-semibold text-zinc-300">Enable full auto poll create</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            In Vercel → Project → Settings → Environment Variables, add:
            <ul className="mt-1 list-disc pl-4">
              <li>
                <code>CRON_SECRET</code> — random long string
              </li>
              <li>
                <code>SUPABASE_SERVICE_ROLE_KEY</code> — from Supabase settings
                (server only, never NEXT_PUBLIC)
              </li>
              <li>
                <code>AUTOMATION_USER_ID</code> — your real profile UUID (polls
                must have a valid creator_id)
              </li>
            </ul>
          </li>
          <li>Redeploy.</li>
          <li>
            Cron hits <code>/api/cron/daily-growth</code> every 6 hours.
          </li>
        </ol>
        <p className="mt-2">
          Social channels stay MANUAL until you connect official write OAuth
          (organic X is not available with X Ads alone).
        </p>
      </section>
    </div>
  );
}
