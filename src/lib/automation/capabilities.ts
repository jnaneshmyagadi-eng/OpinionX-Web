/**
 * Honest capability matrix for connected write channels.
 * Update only when a real OAuth write API is connected.
 */

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
  reasons: Record<string, string>;
};

export function getCapabilityReport(): CapabilityReport {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAutomationUser = Boolean(process.env.AUTOMATION_USER_ID);
  const hasCronSecret = Boolean(process.env.CRON_SECRET);

  const pollAuto =
    hasServiceRole && hasAutomationUser && hasCronSecret
      ? "AUTO"
      : "MANUAL";

  return {
    // Grok account only exposes X Ads (promoted-only / paid). No organic post API.
    x_organic: "UNAVAILABLE",
    x_ads_only: true,
    instagram: "UNAVAILABLE",
    facebook: "UNAVAILABLE",
    linkedin: "UNAVAILABLE",
    reddit: "UNAVAILABLE",
    whatsapp: "MANUAL", // share-ready text only
    poll_auto_create: pollAuto,
    reasons: {
      x_organic:
        "Only X Ads connector is available (nullcast / promoted-only). Organic timeline posts are not authorized.",
      x_ads:
        "X Ads can spend money. Automation will never create paid ads without explicit approval.",
      instagram: "No Instagram Graph / Content Publishing API connected.",
      facebook: "No Facebook Page publishing API connected.",
      linkedin: "No LinkedIn publishing API connected.",
      reddit: "No Reddit OAuth write connection; auto-posting would risk spam bans.",
      whatsapp:
        "No WhatsApp Business API. Share-ready messages are generated for manual send.",
      poll_auto_create: hasServiceRole && hasAutomationUser && hasCronSecret
        ? "SUPABASE_SERVICE_ROLE_KEY + AUTOMATION_USER_ID + CRON_SECRET set. Server cron can insert polls as the automation profile."
        : "Missing env: " +
          [
            !hasServiceRole && "SUPABASE_SERVICE_ROLE_KEY",
            !hasAutomationUser && "AUTOMATION_USER_ID",
            !hasCronSecret && "CRON_SECRET",
          ]
            .filter(Boolean)
            .join(", ") +
          ". Poll creation stays MANUAL until these are set in Vercel.",
    },
  };
}
