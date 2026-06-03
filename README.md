# fahimna-admin

Internal admin tool for correcting Fahimna's linguistic data — verb conjugations
(tashreef), noun paradigms (asma), lemma meanings (glosses), and pronoun
paradigms. Next.js (App Router) on Vercel, backed by the app's Supabase project.

## How it works

- Corrections are stored in Supabase (`ling_entries` table, source of truth).
- The editor is gated by a single shared password (`ADMIN_PASSWORD`).
- All writes go through the Supabase **service-role** key on the server.
- Corrections reach the mobile app at **build time** via a snapshot script
  (Supabase → bundled JSON) — there is no live/OTA delivery, by design.

## Local dev

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev            # http://localhost:3000
```

Reference data (lemmas, usage tables) is committed under `data/` so it works on
Vercel without access to the app repo.

## Environment variables (set these in Vercel too)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (read) |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key — server only, **secret** |
| `ADMIN_PASSWORD` | shared login password |
| `ADMIN_COOKIE_SECRET` | random string used to sign the auth cookie |
