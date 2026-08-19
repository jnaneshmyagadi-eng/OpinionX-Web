import { NextRequest, NextResponse } from "next/server";
import { runDailyGrowthPipeline } from "@/lib/automation/run-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");

  // Vercel Cron sends x-vercel-cron: 1
  if (vercelCron === "1") return true;

  if (secret && auth === `Bearer ${secret}`) return true;

  // Local/dev convenience only when explicitly allowed
  if (process.env.NODE_ENV === "development" && !secret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyGrowthPipeline();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
