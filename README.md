# Snapzzle

Point your webcam at anything. Frame it with your hands. Snap it into a puzzle and solve it — no mouse, no keyboard, just your fingers.

![Snapzzle](https://img.shields.io/badge/built_with-MediaPipe-ccff00?style=flat-square&labelColor=111) ![React](https://img.shields.io/badge/React-18-ccff00?style=flat-square&labelColor=111) ![Vite](https://img.shields.io/badge/Vite-6-ccff00?style=flat-square&labelColor=111)

---

## How it works

### Step 1 — Frame it
Hold both hands up and spread your thumbs and index fingers apart to form a rectangle around whatever you want to puzzle-ify. Your coffee mug, your face, your desk — anything works.

### Step 2 — Snap it
Pinch both hands at the same time. The game captures whatever's inside your frame and shuffles it into a grid.

### Step 3 — Solve it
Use a pinch gesture to pick up tiles and drop them to swap positions. Restore the original image to win.

| Gesture | What it does |
|---|---|
| Pinch (index + thumb) | Pick up a tile |
| Drag while pinched | Move it |
| Open hand | Drop and swap |
| Hold fist for 3s | Reset the puzzle |

### Difficulty
Pick how hard you want it before the game starts:
- **Easy** — 3×3 (9 tiles)
- **Medium** — 4×4 (16 tiles)
- **Hard** — 5×5 (25 tiles)

---

## Play it

**Live:** [your-deployment-url.vercel.app](#) ← update this after deploying

**Run locally:**
```bash
npm install
npm run dev
```
Then open [localhost:5173](http://localhost:5173).

> Works best in **Chrome or Edge on desktop**. You'll need to allow webcam access when prompted.

---

## Leaderboard

Scores are stored online so you can compete with others. To enable it, you'll need a free [Supabase](https://supabase.com) account.

Once you have one:

1. Create a new project on Supabase
2. Open the **SQL Editor** and run this to set up the scores table:

```sql
create table leaderboard (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  time integer not null,
  difficulty text not null,
  date bigint not null,
  created_at timestamptz default now()
);

alter table leaderboard enable row level security;
create policy "public read"   on leaderboard for select using (true);
create policy "public insert" on leaderboard for insert with check (true);
```

3. Go to **Settings → API** and copy your Project URL and anon key
4. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The leaderboard will appear automatically once these are set. Without them the game still works fully — players just won't see global scores.

---

## Deploy

Push to GitHub, then import the repo on [Vercel](https://vercel.com). It auto-detects everything and deploys in under a minute. Add your Supabase env vars under **Project Settings → Environment Variables** if you want the leaderboard live too.

---

## Built with

- [MediaPipe](https://ai.google.dev/edge/mediapipe) — hand tracking AI
- [React](https://react.dev) + [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — leaderboard
- Web Audio API — sound effects

---

## License

MIT
