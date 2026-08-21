/**
 * Honest capability matrix — Buffer platforms only AUTO when channel is connected.
 */

import {
  isBufferConfigured,
  getConnectedAutoServices,
} from "@/lib/automation/buffer-client";

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
  connectedServices: string[];
};

export async function getCapabilityReport(): Promise<CapabilityReport> {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAutomationUser = Boolean(process.env.AUTOMATION_USER_ID);
  const hasBuffer = isBufferConfigured();

  const pollAuto =
    hasServiceRole && hasAutomationUser ? "AUTO" : "MANUAL";

  let connected = new Set<string>();
  let bufferErr: string | undefined;
  if (hasBuffer) {
    const listed = await getConnectedAutoServices();
    connected = listed.services;
    bufferErr = listed.error;
  }

  const statusFor = (service: string): PlatformStatus => {
    if (!hasBuffer) return "UNAVAILABLE";
    if (bufferErr) return "UNAVAILABLE";
    return connected.has(service) ? "AUTO" : "UNAVAILABLE";
  };

  return {
    x_organic: statusFor("twitter"),
    x_ads_only: true,
    instagram: statusFor("instagram"),
    facebook: statusFor("facebook"),
    linkedin: statusFor("linkedin"),
    reddit: "UNAVAILABLE",
    whatsapp: "MANUAL",
    poll_auto_create: pollAuto,
    buffer: hasBuffer && !bufferErr ? "AUTO" : "UNAVAILABLE",
    connectedServices: Array.from(connected),
    reasons: {
      buffer: hasBuffer
        ? bufferErr
          ? `Buffer token set but channel list failed: ${bufferErr}`
          : `Buffer OK. Connected: ${Array.from(connected).join(", ") || "none of X/IG/FB/LI"}`
        : "Set BUFFER_ACCESS_TOKEN in Vercel (server-only).",
      x_organic: connected.has("twitter")
        ? "X channel connected in Buffer — AUTO."
        : "X/Twitter channel not connected in Buffer.",
      x_ads: "X Ads never used (paid).",
      instagram: connected.has("instagram")
        ? "Instagram connected — posts use generated share-card image."
        : "Instagram not connected in Buffer.",
      facebook: connected.has("facebook")
        ? "Facebook channel connected in Buffer."
        : "Facebook not connected in Buffer — UNAVAILABLE until connected.",
      linkedin: connected.has("linkedin")
        ? "LinkedIn channel connected in Buffer."
        : "LinkedIn not connected in Buffer — UNAVAILABLE until connected.",
      reddit: "Kept UNAVAILABLE — no auto-spam.",
      whatsapp: "Share-ready text only.",
      poll_auto_create: hasServiceRole && hasAutomationUser
        ? "Service role + AUTOMATION_USER_ID — uses automation_create_poll RPC."
        : "Missing: " +
          [
            !hasServiceRole && "SUPABASE_SERVICE_ROLE_KEY",
            !hasAutomationUser && "AUTOMATION_USER_ID",
          ]
            .filter(Boolean)
            .join(", "),
    },
  };
}
