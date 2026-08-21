import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getCapabilityReport } from "@/lib/automation/capabilities";
import { buildDailyBrief } from "@/lib/daily-engine";
import { isBufferConfigured } from "@/lib/automation/buffer-client";
import { DistributionList } from "@/components/discovery/distribution-list";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Automation dashboard",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/automation") },
};

type BufferResultRow = {
  service?: string;
  channelName?: string;
  success?: boolean;
  mode?: string;
  updateId?: string;
  error?: string;
  api?: string;
  mediaUrl?: string;
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
  buffer_results: BufferResultRow[] | null;
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
      "id, created_at, status, topic, poll_id, poll_url, poll_created, poll_skipped_reason, platforms, buffer_results, headline_count, notes, error"
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
  const caps = await getCapabilityReport();
  const [runs, brief] = await Promise.all([
    fetchLatestRuns(),
    buildDailyBrief(),
  ]);
  const last = runs[0] ?? null;
  const bufferOn = isBufferConfigured();

  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      3,
      30,
      0
    )
  );
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  const bufferResults = Array.isArray(last?.buffer_results)
    ? last!.buffer_results
    : [];

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
          AUTO only when Buffer confirms a channel is connected and returns an
          update ID. Facebook / LinkedIn stay UNAVAILABLE until connected in
          Buffer.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-white">Platform matrix</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          Connected now:{" "}
          {caps.connectedServices.length
            ? caps.connectedServices.join(", ")
            : "none"}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {(
            [
              ["Buffer", caps.buffer, caps.reasons.buffer],
              ["X via Buffer", caps.x_organic, caps.reasons.x_organic],
              ["Instagram via Buffer", caps.instagram, caps.reasons.instagram],
              ["Facebook via Buffer", caps.facebook, caps.reasons.facebook],
              ["LinkedIn via Buffer", caps.linkedin, caps.reasons.linkedin],
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
        <h2 className="text-sm font-semibold text-white">Publish status</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          BUFFER_ACCESS_TOKEN: {bufferOn ? "set (server)" : "NOT SET"}
        </p>
        {bufferResults.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No Buffer results on the latest run.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bufferResults.map((r, i) => (
              <li
                key={`${r.service}-${i}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase text-zinc-200">
                    {r.service || "buffer"}
                    {r.channelName ? ` · ${r.channelName}` : ""}
                  </span>
                  <span
                    className={
                      r.success && r.mode === "queue"
                        ? "text-emerald-400"
                        : r.mode === "skipped"
                          ? "text-amber-300"
                          : "text-red-400"
                    }
                  >
                    {r.mode?.toUpperCase() || (r.success ? "OK" : "FAIL")}
                  </span>
                </div>
                {r.updateId && (
                  <p className="mt-1 text-zinc-500">Update ID: {r.updateId}</p>
                )}
                {r.mediaUrl && (
                  <p className="mt-1 break-all text-zinc-600">
                    Media: {r.mediaUrl}
                  </p>
                )}
                {r.api && <p className="text-zinc-600">API: {r.api}</p>}
                {r.error && (
                  <p className="mt-1 text-red-400/90">{r.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
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
                    className="break-all text-purple-400 underline"
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
            {last.notes && <div className="text-zinc-600">{last.notes}</div>}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            No runs logged yet.
          </p>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">
          Next estimated cron: {next.toISOString()} (09:00 IST)
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-white">
          Manual publish pack (fallback)
        </h2>
        <DistributionList items={brief.distribution} />
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">
        <h2 className="font-semibold text-zinc-300">Env checklist</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            <code>SUPABASE_SERVICE_ROLE_KEY</code> — must be service_role secret
            (not anon)
          </li>
          <li>
            <code>AUTOMATION_USER_ID</code> — real profile UUID
          </li>
          <li>
            <code>BUFFER_ACCESS_TOKEN</code>
          </li>
          <li>
            <code>BUFFER_ORGANIZATION_ID</code> — optional
          </li>
          <li>
            <code>CRON_SECRET</code>
          </li>
        </ul>
        <p className="mt-2">
          Connect Facebook / LinkedIn inside Buffer to enable those channels.
        </p>
      </section>
    </div>
  );
}
