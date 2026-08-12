# OpinionX

Social A/B opinion platform — create two-choice polls, vote, match vibes, and chat.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Supabase (Auth, PostgreSQL, Storage, Realtime)
- Framer Motion, Lucide, class-variance-authority

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` from Supabase **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** (seed script). Never expose it in client code or `NEXT_PUBLIC_*`.

### Database

In Supabase **SQL Editor**, run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage.sql`

### Auth

- Authentication → Providers → **Email** enabled
- Optional: Google OAuth
- URL Configuration → Site URL: `http://localhost:3000` (local) and your Vercel URL (prod)
- Redirect URLs: include `https://YOUR_VERCEL_DOMAIN/**`

### Run

```bash
npm run dev
```

### Production build (local)

```bash
npm run build
npm start
```

### Optional seed

```bash
npm run seed
# Demo: alice@opinionx.demo / demo1234
```

## Vercel deployment

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → Import project.
3. Framework: Next.js (auto-detected).
4. Environment variables (same as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional; only needed for admin/seed)
5. Deploy.
6. Add the production domain to Supabase Auth URL Configuration + redirect allow list.

## Project layout

```
src/
  app/(auth)/login, signup
  app/(main)/          # shell: TopBar + BottomNav
    page.tsx           # Home feed
    create, explore, chat, profile, notifications
    poll/[id], chat/[id]
  components/layout, poll, ui
  lib/supabase         # browser + server clients (anon key only)
  middleware.ts        # auth redirects
supabase/migrations/
scripts/seed.ts
```

## Security

- RLS on all tables
- One vote per user per poll (`UNIQUE(poll_id, user_id)`)
- Conversation access via `is_conversation_member()` (SECURITY DEFINER, no recursive RLS)
- Service role key never imported in `src/`
- Middleware protects `/create`, `/chat`, `/notifications`, `/profile`

## License

MIT
