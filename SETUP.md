# Get DOSED live

This app uses **Supabase** (accounts + database) and **Vercel** (public website).

## 1. Create a Supabase project

Your project ref is already set: **`johnnauxuuocbousapfy`**  
URL: `https://johnnauxuuocbousapfy.supabase.co`

1. Open **Project Settings → API**
2. Copy the **anon public** key (long `eyJ...` string)
3. Paste it into `.env.local` as `VITE_SUPABASE_ANON_KEY=...`

## 2. Run the database schema

In the Supabase dashboard:

1. Open **SQL Editor** → **New query**
2. Open the file `supabase/RUN_IN_DASHBOARD.sql` in Cursor, **copy everything**, paste into Supabase
3. Click **Run** — you should see “Success”

If it failed before, use this fixed file (safe to run again). Do not paste from chat — open the file so nothing gets cut off.

Optional but recommended for easier testing:

1. **Authentication → Providers → Email**
2. Turn **off** “Confirm email” while you build (turn it back on for production)

## 3. Local env keys

In the project root:

```bash
copy .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart the dev server (`npm run dev`).

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [https://vercel.com](https://vercel.com) → **Import** the repo.
3. Add the same env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You’ll get a public URL like `https://your-app.vercel.app`.

Or from the CLI (after `npm i -g vercel` and login):

```bash
npx vercel --prod
```

## 5. Auth redirect (optional)

In Supabase → **Authentication → URL configuration**:

- Site URL: your Vercel URL
- Redirect URLs: `https://your-app.vercel.app/**`

## Guest mode

Without Supabase keys (or via “Continue without account”), the app still works on that device with local storage only. Cloud sync requires a real account.
