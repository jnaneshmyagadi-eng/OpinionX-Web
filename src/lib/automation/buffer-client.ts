/**
 * Server-only Buffer client.
 * Supports:
 * 1) Modern GraphQL API — https://api.buffer.com (Bearer API key)
 * 2) Legacy REST API — https://api.bufferapp.com/1 (access_token)
 *
 * Never import this from client components.
 */

export type BufferChannel = {
  id: string;
  service: string; // twitter | instagram | facebook | linkedin | ...
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

function mapService(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("twitter") || s === "x") return "twitter";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("facebook")) return "facebook";
  if (s.includes("linkedin")) return "linkedin";
  return s;
}

/** Platform-specific safe copy. No fabricated stats. */
export function buildBufferContent(opts: {
  question: string;
  optionA: string;
  optionB: string;
  pollUrl: string;
}): BufferContentPack {
  const q =
    opts.question.length > 160
      ? opts.question.slice(0, 157) + "…"
      : opts.question;
  const shortUrl = opts.pollUrl;

  const twitter = [
    `India, what would YOU choose?`,
    ``,
    q,
    ``,
    `A) ${opts.optionA}`,
    `B) ${opts.optionB}`,
    ``,
    `Vote → ${shortUrl}`,
    `#LetTheInternetDecide`,
  ].join("\n");

  const instagram = [
    `Quick vote 👀`,
    ``,
    q,
    ``,
    `${opts.optionA} vs ${opts.optionB}`,
    ``,
    `Tap the link in bio / story link to vote on OpinionX.`,
    ``,
    `#OpinionX #LetTheInternetDecide #IndiaDebates`,
    shortUrl,
  ].join("\n");

  const facebook = [
    `Open discussion:`,
    q,
    ``,
    `Option A: ${opts.optionA}`,
    `Option B: ${opts.optionB}`,
    ``,
    `Curious what this community thinks — vote here (real authenticated votes only):`,
    shortUrl,
  ].join("\n");

  const linkedin = [
    `A career / life trade-off worth discussing:`,
    ``,
    q,
    ``,
    `A — ${opts.optionA}`,
    `B — ${opts.optionB}`,
    ``,
    `Would love thoughtful takes. Cast a vote (no bots):`,
    shortUrl,
  ].join("\n");

  // X hard limit ~280; trim if needed
  const twitterTrimmed =
    twitter.length > 275 ? `${q}\n\nA) ${opts.optionA}\nB) ${opts.optionB}\n${shortUrl}` : twitter;

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

/** Services we auto-publish via Buffer */
const AUTO_SERVICES = new Set(["twitter", "instagram", "facebook", "linkedin"]);

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

  // Discover org if not set
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
  const channels = (res.data?.channels as
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
  channelId: string,
  text: string
): Promise<{ id?: string; error?: string }> {
  // Escape for GraphQL string
  const safe = text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const mutation = `mutation {
    createPost(input: {
      text: "${safe}"
      channelId: "${channelId}"
      schedulingType: automatic
      mode: addToQueue
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
    throw new Error(`Buffer REST profiles HTTP ${res.status}: ${body.slice(0, 200)}`);
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
  link?: string
): Promise<{ id?: string; error?: string }> {
  const body = new URLSearchParams();
  body.set("access_token", accessToken);
  body.set("text", text);
  body.append("profile_ids[]", profileId);
  if (link) {
    body.set("media[link]", link);
  }
  // Add to queue (default). now=true would share immediately.

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
    code?: number;
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

  // Prefer GraphQL (current Buffer API keys)
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

/**
 * Publish/queue one post per supported Buffer channel.
 * Skips reddit/whatsapp and unknown services.
 * Dedup: caller should pass alreadyPublishedKeys = "service:pollId"
 */
export async function publishPollToBuffer(opts: {
  pollId: string;
  question: string;
  optionA: string;
  optionB: string;
  pollUrl: string;
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

  const pack = buildBufferContent({
    question: opts.question,
    optionA: opts.optionA,
    optionB: opts.optionB,
    pollUrl: opts.pollUrl,
  });

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

    try {
      if (listed.api === "graphql") {
        const created = await createPostGraphQL(accessToken, ch.id, text);
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
          });
        }
      } else {
        const created = await createUpdateRest(
          accessToken,
          ch.id,
          text,
          opts.pollUrl
        );
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
