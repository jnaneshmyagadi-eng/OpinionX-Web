/**
 * Server-only Buffer client (GraphQL primary, REST fallback).
 * Never import from client components.
 */

import { SITE_URL } from "@/lib/seo";

export type BufferChannel = {
  id: string;
  service: string;
  name: string;
  username?: string;
};

export type BufferPublishResult = {
  service: string;
  channelId: string;
  channelName: string;
  success: boolean;
  updateId?: string;
  mode: "queue" | "skipped" | "error";
  error?: string;
  textPreview?: string;
  api: "graphql" | "rest";
  mediaUrl?: string;
};

export type BufferContentPack = {
  twitter: string;
  instagram: string;
  facebook: string;
  linkedin: string;
};

const GRAPHQL_URL = "https://api.buffer.com";
const REST_BASE = "https://api.bufferapp.com/1";

function token(): string | null {
  const t = process.env.BUFFER_ACCESS_TOKEN?.trim();
  return t || null;
}

export function isBufferConfigured(): boolean {
  return Boolean(token());
}

export function mapService(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("twitter") || s === "x") return "twitter";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("facebook")) return "facebook";
  if (s.includes("linkedin")) return "linkedin";
  return s;
}

/** Services we may auto-publish when channel is connected */
const AUTO_SERVICES = new Set(["twitter", "instagram", "facebook", "linkedin"]);

export function shareCardImageUrl(pollId: string): string {
  return `${SITE_URL}/api/og/poll?id=${encodeURIComponent(pollId)}`;
}

export function buildBufferContent(opts: {
  question: string;
  optionA: string;
  optionB: string;
  pollUrl: string;
  pctA?: number | null;
  pctB?: number | null;
  totalVotes?: number;
}): BufferContentPack {
  const q =
    opts.question.length > 160
      ? opts.question.slice(0, 157) + "…"
      : opts.question;
  const shortUrl = opts.pollUrl;
  const hasVotes = (opts.totalVotes ?? 0) > 0 && opts.pctA != null;

  const resultLine = hasVotes
    ? `Live: ${opts.pctA}% ${opts.optionA} vs ${opts.pctB}% ${opts.optionB} (${opts.totalVotes} real votes)`
    : null;

  const twitter = [
    `India, what would YOU choose?`,
    ``,
    q,
    ``,
    `A) ${opts.optionA}`,
    `B) ${opts.optionB}`,
    resultLine ? `` : null,
    resultLine,
    ``,
    `Vote → ${shortUrl}`,
    `#LetTheInternetDecide`,
  ]
    .filter((x) => x !== null)
    .join("\n");

  const instagram = [
    `Quick vote 👀`,
    ``,
    q,
    ``,
    `${opts.optionA} vs ${opts.optionB}`,
    resultLine,
    ``,
    `Link in bio / vote on OpinionX`,
    shortUrl,
    ``,
    `#OpinionX #LetTheInternetDecide #IndiaDebates`,
  ]
    .filter((x) => x !== null && x !== undefined)
    .join("\n");

  const facebook = [
    `Open discussion:`,
    q,
    ``,
    `Option A: ${opts.optionA}`,
    `Option B: ${opts.optionB}`,
    resultLine,
    ``,
    `Real authenticated votes only:`,
    shortUrl,
  ]
    .filter((x) => x !== null && x !== undefined)
    .join("\n");

  const linkedin = [
    `A trade-off worth discussing:`,
    ``,
    q,
    ``,
    `A — ${opts.optionA}`,
    `B — ${opts.optionB}`,
    resultLine,
    ``,
    `Cast a vote (no bots):`,
    shortUrl,
  ]
    .filter((x) => x !== null && x !== undefined)
    .join("\n");

  const twitterTrimmed =
    twitter.length > 275
      ? `${q}\n\nA) ${opts.optionA}\nB) ${opts.optionB}\n${shortUrl}`
      : twitter;

  return {
    twitter: twitterTrimmed.slice(0, 280),
    instagram: instagram.slice(0, 2100),
    facebook: facebook.slice(0, 5000),
    linkedin: linkedin.slice(0, 2800),
  };
}

function textForService(pack: BufferContentPack, service: string): string {
  switch (mapService(service)) {
    case "twitter":
      return pack.twitter;
    case "instagram":
      return pack.instagram;
    case "facebook":
      return pack.facebook;
    case "linkedin":
      return pack.linkedin;
    default:
      return pack.facebook;
  }
}

async function graphqlRequest(
  accessToken: string,
  query: string
): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Buffer GraphQL HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as {
    data?: Record<string, unknown>;
    errors?: { message: string }[];
  };
}

async function listChannelsGraphQL(
  accessToken: string
): Promise<BufferChannel[]> {
  const orgId = process.env.BUFFER_ORGANIZATION_ID?.trim();
  let organizationId = orgId;
  if (!organizationId) {
    const orgQuery = `query {
      account {
        organizations { id name }
      }
    }`;
    try {
      const orgRes = await graphqlRequest(accessToken, orgQuery);
      const account = orgRes.data?.account as
        | { organizations?: { id: string }[] }
        | undefined;
      organizationId = account?.organizations?.[0]?.id;
    } catch {
      // fall through
    }
  }

  if (!organizationId) {
    throw new Error(
      "Buffer GraphQL needs BUFFER_ORGANIZATION_ID (or account.organizations in token scope)"
    );
  }

  const q = `query {
    channels(input: { organizationId: "${organizationId}" }) {
      id
      name
      service
    }
  }`;
  const res = await graphqlRequest(accessToken, q);
  if (res.errors?.length) {
    throw new Error(res.errors.map((e) => e.message).join("; "));
  }
  const channels =
    (res.data?.channels as
      | { id: string; name: string; service: string }[]
      | undefined) ?? [];
  return channels.map((c) => ({
    id: c.id,
    name: c.name,
    service: mapService(c.service),
  }));
}

async function createPostGraphQL(
  accessToken: string,
  opts: {
    channelId: string;
    text: string;
    service: string;
    imageUrl?: string;
  }
): Promise<{ id?: string; error?: string }> {
  const safe = opts.text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const service = mapService(opts.service);
  const needsImage = service === "instagram";
  const imageUrl = opts.imageUrl;

  if (needsImage && !imageUrl) {
    return { error: "Instagram requires a public image URL" };
  }

  let assetsBlock = "";
  if (imageUrl) {
    const safeUrl = imageUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    assetsBlock = `
      assets: [
        {
          image: {
            url: "${safeUrl}"
          }
        }
      ]`;
  }

  // Instagram requires type metadata
  let metadataBlock = "";
  if (service === "instagram") {
    metadataBlock = `
      metadata: { instagram: { type: post, shouldShareToFeed: true } }`;
  }

  const mutation = `mutation {
    createPost(input: {
      text: "${safe}"
      channelId: "${opts.channelId}"
      schedulingType: automatic
      mode: addToQueue${assetsBlock}${metadataBlock}
    }) {
      ... on PostActionSuccess {
        post { id text status }
      }
      ... on MutationError {
        message
      }
    }
  }`;

  const res = await graphqlRequest(accessToken, mutation);
  if (res.errors?.length) {
    return { error: res.errors.map((e) => e.message).join("; ") };
  }
  const createPost = res.data?.createPost as
    | { post?: { id: string }; message?: string }
    | undefined;
  if (createPost?.post?.id) return { id: createPost.post.id };
  if (createPost?.message) return { error: createPost.message };
  return { error: "Unknown Buffer GraphQL createPost response" };
}

async function listProfilesRest(accessToken: string): Promise<BufferChannel[]> {
  const url = `${REST_BASE}/profiles.json?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Buffer REST profiles HTTP ${res.status}: ${body.slice(0, 200)}`
    );
  }
  const data = (await res.json()) as {
    id: string;
    service: string;
    service_username?: string;
    formatted_username?: string;
  }[];
  if (!Array.isArray(data)) {
    throw new Error("Buffer REST profiles: unexpected response");
  }
  return data.map((p) => ({
    id: p.id,
    service: mapService(p.service),
    name: p.formatted_username || p.service_username || p.service,
    username: p.service_username,
  }));
}

async function createUpdateRest(
  accessToken: string,
  profileId: string,
  text: string,
  media?: { link?: string; photo?: string }
): Promise<{ id?: string; error?: string }> {
  const body = new URLSearchParams();
  body.set("access_token", accessToken);
  body.set("text", text);
  body.append("profile_ids[]", profileId);
  if (media?.link) body.set("media[link]", media.link);
  if (media?.photo) body.set("media[photo]", media.photo);

  const res = await fetch(`${REST_BASE}/updates/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    updates?: { id: string }[];
    message?: string;
    error?: string;
  };

  if (!res.ok || json.success === false) {
    return {
      error:
        json.message ||
        json.error ||
        `Buffer REST create HTTP ${res.status}`,
    };
  }
  const id = json.updates?.[0]?.id;
  return id ? { id } : { error: "Buffer REST create: no update id" };
}

export async function listBufferChannels(): Promise<{
  channels: BufferChannel[];
  api: "graphql" | "rest";
  error?: string;
}> {
  const accessToken = token();
  if (!accessToken) {
    return { channels: [], api: "rest", error: "BUFFER_ACCESS_TOKEN not set" };
  }

  try {
    const channels = await listChannelsGraphQL(accessToken);
    return { channels, api: "graphql" };
  } catch (gqlErr) {
    try {
      const channels = await listProfilesRest(accessToken);
      return { channels, api: "rest" };
    } catch (restErr) {
      const g = gqlErr instanceof Error ? gqlErr.message : String(gqlErr);
      const r = restErr instanceof Error ? restErr.message : String(restErr);
      return {
        channels: [],
        api: "rest",
        error: `GraphQL: ${g} | REST: ${r}`,
      };
    }
  }
}

/** Connected services among twitter/instagram/facebook/linkedin */
export async function getConnectedAutoServices(): Promise<{
  services: Set<string>;
  error?: string;
}> {
  if (!isBufferConfigured()) {
    return { services: new Set(), error: "BUFFER_ACCESS_TOKEN not set" };
  }
  const listed = await listBufferChannels();
  if (listed.error) return { services: new Set(), error: listed.error };
  const services = new Set<
    string
  >();
  for (const ch of listed.channels) {
    const s = mapService(ch.service);
    if (AUTO_SERVICES.has(s)) services.add(s);
  }
  return { services };
}

export async function publishPollToBuffer(opts: {
  pollId: string;
  question: string;
  optionA: string;
  optionB: string;
  pollUrl: string;
  voteCountA?: number;
  voteCountB?: number;
  alreadyPublishedKeys: Set<string>;
}): Promise<BufferPublishResult[]> {
  const accessToken = token();
  if (!accessToken) {
    return [
      {
        service: "buffer",
        channelId: "",
        channelName: "",
        success: false,
        mode: "error",
        error: "BUFFER_ACCESS_TOKEN not set",
        api: "rest",
      },
    ];
  }

  const listed = await listBufferChannels();
  if (listed.error || listed.channels.length === 0) {
    return [
      {
        service: "buffer",
        channelId: "",
        channelName: "",
        success: false,
        mode: "error",
        error: listed.error || "No Buffer channels connected",
        api: listed.api,
      },
    ];
  }

  const a = opts.voteCountA ?? 0;
  const b = opts.voteCountB ?? 0;
  const total = a + b;
  const pctA = total > 0 ? Math.round((a / total) * 100) : null;
  const pctB = total > 0 && pctA !== null ? 100 - pctA : null;

  const pack = buildBufferContent({
    question: opts.question,
    optionA: opts.optionA,
    optionB: opts.optionB,
    pollUrl: opts.pollUrl,
    pctA,
    pctB,
    totalVotes: total,
  });

  const mediaUrl = shareCardImageUrl(opts.pollId);
  const results: BufferPublishResult[] = [];

  for (const ch of listed.channels) {
    const service = mapService(ch.service);
    if (!AUTO_SERVICES.has(service)) {
      results.push({
        service,
        channelId: ch.id,
        channelName: ch.name,
        success: false,
        mode: "skipped",
        error: `Service ${service} not in auto-publish set`,
        api: listed.api,
      });
      continue;
    }

    const dedupeKey = `${service}:${opts.pollId}`;
    if (opts.alreadyPublishedKeys.has(dedupeKey)) {
      results.push({
        service,
        channelId: ch.id,
        channelName: ch.name,
        success: true,
        mode: "skipped",
        error: "Already published for this poll+platform (dedup)",
        api: listed.api,
      });
      continue;
    }

    const text = textForService(pack, service);
    // Instagram always needs image; FB/LI can attach share card too
    const attachImage =
      service === "instagram" || service === "facebook" || service === "linkedin";

    try {
      if (listed.api === "graphql") {
        const created = await createPostGraphQL(accessToken, {
          channelId: ch.id,
          text,
          service,
          imageUrl: attachImage ? mediaUrl : undefined,
        });
        if (created.id) {
          results.push({
            service,
            channelId: ch.id,
            channelName: ch.name,
            success: true,
            updateId: created.id,
            mode: "queue",
            textPreview: text.slice(0, 80),
            api: "graphql",
            mediaUrl: attachImage ? mediaUrl : undefined,
          });
        } else {
          results.push({
            service,
            channelId: ch.id,
            channelName: ch.name,
            success: false,
            mode: "error",
            error: created.error || "create failed",
            api: "graphql",
            mediaUrl: attachImage ? mediaUrl : undefined,
          });
        }
      } else {
        const created = await createUpdateRest(accessToken, ch.id, text, {
          link: opts.pollUrl,
          photo: attachImage ? mediaUrl : undefined,
        });
        if (created.id) {
          results.push({
            service,
            channelId: ch.id,
            channelName: ch.name,
            success: true,
            updateId: created.id,
            mode: "queue",
            textPreview: text.slice(0, 80),
            api: "rest",
            mediaUrl: attachImage ? mediaUrl : undefined,
          });
        } else {
          results.push({
            service,
            channelId: ch.id,
            channelName: ch.name,
            success: false,
            mode: "error",
            error: created.error || "create failed",
            api: "rest",
            mediaUrl: attachImage ? mediaUrl : undefined,
          });
        }
      }
    } catch (e) {
      results.push({
        service,
        channelId: ch.id,
        channelName: ch.name,
        success: false,
        mode: "error",
        error: e instanceof Error ? e.message : String(e),
        api: listed.api,
      });
    }
  }

  return results;
}
