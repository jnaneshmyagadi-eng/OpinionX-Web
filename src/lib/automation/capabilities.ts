/**
 * Honest capability matrix for connected write channels.
 */

import { isBufferConfigured } from "@/lib/automation/buffer-client";

export type PlatformStatus = "AUTO" | "MANUAL" | "UNAVAILABLE";

export type CapabilityReport = {
  x_organic: PlatformStatus;
  x_ads_only: boolean;
  instagram: PlatformStatus;
  facebook: PlatformStatus;
  linkedin: PlatformStatus;
  reddit: PlatformStatus;
  whatsapp: PlatformStatus;
  poll_auto_create: PlatformStatus;
  buffer: PlatformStatus;
  reasons: Record<string, string>;
};

export function getCapabilityReport(): CapabilityReport {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAutomationUser = Boolean(process.env.AUTOMATION_USER_ID);
  const hasCronSecret = Boolean(process.env.CRON_SECRET);
  const hasBuffer = isBufferConfigured();

  const pollAuto =
    hasServiceRole && hasAutomationUser && hasCronSecret
      ? "AUTO"
      : "MANUAL";

  // When Buffer token is set, X/IG/FB/LI can be AUTO via Buffer channels
  // (actual publish depends on which channels are connected in Buffer account).
  const viaBuffer: PlatformStatus = hasBuffer ? "AUTO" : "UNAVAILABLE";

  return {
    x_organic: viaBuffer,
    x_ads_only: true, // still never use X Ads spend path
    instagram: viaBuffer,
    facebook: viaBuffer,
    linkedin: viaBuffer,
    reddit: "UNAVAILABLE",
    whatsapp: "MANUAL",
    poll_auto_create: pollAuto,
    buffer: hasBuffer ? "AUTO" : "UNAVAILABLE",
    reasons: {
      buffer: hasBuffer
        ? "BUFFER_ACCESS_TOKEN set. Server will queue posts to connected Buffer channels (X/IG/FB/LI)."
        : "Set BUFFER_ACCESS_TOKEN in Vercel (server-only) to enable Buffer publishing.",
      x_organic: hasBuffer
        ? "Via Buffer (not X Ads). Posts queue to your Buffer Twitter/X channel if connected."
        : "No Buffer token. Direct X organic API not connected; X Ads not used.",
      x_ads:
        "X Ads can spend money. Automation never creates paid ads.",
      instagram: hasBuffer
        ? "Via Buffer Instagram channel if connected in your Buffer account."
        : "No Buffer token / no Instagram publishing API.",
      facebook: hasBuffer
        ? "Via Buffer Facebook channel if connected."
        : "No Buffer token / no Facebook Page API.",
      linkedin: hasBuffer
        ? "Via Buffer LinkedIn channel if connected."
        : "No Buffer token / no LinkedIn API.",
      reddit: "Kept MANUAL — no auto-spam to subreddits.",
      whatsapp:
        "Share-ready text only. No WhatsApp Business API.",
      poll_auto_create: hasServiceRole && hasAutomationUser && hasCronSecret
        ? "Service role + AUTOMATION_USER_ID + CRON_SECRET configured."
        : "Missing env: " +
          [
            !hasServiceRole && "SUPABASE_SERVICE_ROLE_KEY",
            !hasAutomationUser && "AUTOMATION_USER_ID",
            !hasCronSecret && "CRON_SECRET",
          ]
            .filter(Boolean)
            .join(", "),
    },
  };
}
