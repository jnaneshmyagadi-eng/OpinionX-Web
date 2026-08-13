export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://opinionx-web-jnanesh.vercel.app";

export const SITE_NAME = "OpinionX";
export const SITE_TAGLINE = "Everyone Has an Opinion";

export const SITE_DESCRIPTION =
  "OpinionX is a social voting platform where you choose between two options, vote, see what people think, create polls, and discover people with similar opinions.";

export const SITE_KEYWORDS = [
  "OpinionX",
  "Opinion X",
  "social voting",
  "polls",
  "vote",
  "two-choice polls",
  "A/B polls",
  "OpinionX India",
  "OpinionX voting",
  "OpinionX polls",
];

export function absoluteUrl(path: string = "/") {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}
