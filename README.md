# Snapzzle

An AR puzzle game controlled entirely by hand gestures. Frame anything with your webcam, snap it into a shuffled grid, then pinch and drag to solve it — no mouse or keyboard needed.

## How to play

### Phase 1 — Capture
1. Hold both hands up with thumbs and index fingers spread apart to form a frame
2. Line up the frame around whatever you want to puzzle-ify
3. **Pinch both hands simultaneously** to snap the photo and start the puzzle

### Phase 2 — Solve
| Gesture | Action |
|---|---|
| Pinch (index + thumb) | Pick up a tile |
| Drag while pinching | Move it |
| Release pinch | Drop and swap with the tile underneath |
| Hold fist for 3s | Reset the puzzle |

There are three difficulty modes — Easy (3×3), Medium (4×4), Hard (5×5) — selectable from the main menu.

> Works best in **Chrome or Edge on desktop**. Requires webcam access.

## Tech stack

- [React 18](https://react.dev) + TypeScript
- [Vite](https://vite.dev)
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) — real-time hand landmark detection
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide React](https://lucide.dev) — icons
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — optional online leaderboard
- Web Audio API — synthesized sound effects (no audio files)

## Run locally

```bash
git clone <your-repo-url>
cd VisualPuzzle
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Vercel auto-detects Vite — hit **Deploy**

That's it. The game works without any environment variables.

## Online leaderboard (optional)

The leaderboard requires a Firebase project. Without it the game runs fine — players just see their local personal best.

### Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project
2. **Build → Firestore Database** → Create database (start in test mode)
3. **Project Settings → Your apps → Add app (Web)** → copy the config
4. Copy `.env.example` to `.env` and fill in your values:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Add the same variables in **Vercel → Project Settings → Environment Variables**

### Firestore rules

In the Firebase console go to **Firestore → Rules** and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{entry} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['name', 'time', 'difficulty', 'date'])
        && request.resource.data.name is string
        && request.resource.data.time is number;
    }
  }
}
```

## Project structure

```
VisualPuzzle/
├── src/
│   ├── App.tsx        # complete game — menu, camera, puzzle, leaderboard
│   ├── sounds.ts      # Web Audio sound engine
│   ├── main.tsx       # React entry point
│   ├── index.css      # Tailwind + global styles
│   └── vite-env.d.ts  # env variable types
├── public/
├── index.html
├── .env.example       # Firebase config template
└── vite.config.ts
```

## License

MIT
