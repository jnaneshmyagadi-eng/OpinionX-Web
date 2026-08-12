/**
 * Seed demo data for OpinionX.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Run: npx tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [k, ...v] = line.split("=");
      if (k && v.length) process.env[k.trim()] = v.join("=").trim();
    });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { email: "alice@opinionx.demo", password: "demo1234", username: "alice", display_name: "Alice" },
  { email: "bob@opinionx.demo", password: "demo1234", username: "bob", display_name: "Bob" },
  { email: "carol@opinionx.demo", password: "demo1234", username: "carol", display_name: "Carol" },
];

const DEMO_POLLS = [
  {
    question: "Pineapple on pizza?",
    option_a: "Yes, absolute legend",
    option_b: "Never, culinary crime",
    category: "food",
    mood: "spicy",
  },
  {
    question: "Remote work or office?",
    option_a: "Fully remote forever",
    option_b: "Office for the vibes",
    category: "career",
    mood: "thoughtful",
  },
  {
    question: "Morning person or night owl?",
    option_a: "5AM club",
    option_b: "Midnight oil burner",
    category: "lifestyle",
    mood: "chill",
  },
  {
    question: "iOS or Android?",
    option_a: "iPhone all the way",
    option_b: "Android freedom",
    category: "tech",
    mood: "bold",
  },
  {
    question: "Cats or dogs?",
    option_a: "Team cat",
    option_b: "Team dog",
    category: "lifestyle",
    mood: "fun",
  },
];

async function main() {
  console.log("Seeding OpinionX…");

  const userIds: string[] = [];

  for (const u of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        username: u.username,
        display_name: u.display_name,
      },
    });
    if (error && !error.message.includes("already")) {
      console.error(error);
      continue;
    }
    const id = data.user?.id;
    if (id) {
      userIds.push(id);
      await supabase.from("profiles").upsert({
        id,
        username: u.username,
        display_name: u.display_name,
        bio: `Demo user ${u.display_name}`,
        moods: ["curious", "fun", "chill"],
        categories_interest: ["lifestyle", "food", "tech"],
      });
      console.log(`User: ${u.username}`);
    }
  }

  if (userIds.length === 0) {
    console.log("No users created (maybe already exist). Fetching existing…");
    const { data } = await supabase.from("profiles").select("id").limit(3);
    userIds.push(...(data ?? []).map((p) => p.id));
  }

  for (let i = 0; i < DEMO_POLLS.length; i++) {
    const p = DEMO_POLLS[i];
    const creator = userIds[i % userIds.length];
    const { data, error } = await supabase
      .from("polls")
      .insert({
        creator_id: creator,
        ...p,
      })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      continue;
    }
    console.log(`Poll: ${p.question}`);

    // Add some votes
    for (const uid of userIds) {
      if (uid === creator) continue;
      await supabase.from("votes").insert({
        poll_id: data.id,
        user_id: uid,
        choice: Math.random() > 0.5 ? "a" : "b",
      });
    }
  }

  console.log("Done! Demo credentials: alice@opinionx.demo / demo1234");
}

main().catch(console.error);
