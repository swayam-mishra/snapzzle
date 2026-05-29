# Snapzzle

Point your webcam at anything. Frame it with your hands. Snap it into a puzzle and solve it — no mouse, no keyboard, just your fingers.

![Snapzzle](https://img.shields.io/badge/built_with-MediaPipe-7830cf?style=flat-square&labelColor=11071d) ![React](https://img.shields.io/badge/React-18-7830cf?style=flat-square&labelColor=11071d) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-7830cf?style=flat-square&labelColor=11071d)

---

## Play it

**Live:** [snapzzleplay.web.app](https://snapzzleplay.web.app)

> Works best in **Chrome or Edge on desktop**. You'll need to allow webcam access when prompted.

---

## How it works

### Step 1 — Frame it
Hold both hands up and spread your thumbs and index fingers apart to form a rectangle around anything — your face, a book, your desk. The game shows a preview of what it will capture.

### Step 2 — Snap it
Pinch both hands at the same time. The game captures whatever's inside your frame and shuffles it into a grid.

### Step 3 — Solve it
Pinch to pick up tiles, drag to move them, and release to swap. Restore the original image to win.

| Gesture | What it does |
|---|---|
| Spread both hands apart | Frame the puzzle area |
| Pinch both hands | Snap and start |
| Pinch one hand | Pick up a tile |
| Drag while pinched | Move it |
| Release | Drop and swap |
| Hold fist for 3s | Reset the puzzle |

### Difficulty
Pick before the game starts:
- **Easy** — 3×3 (9 tiles)
- **Medium** — 4×4 (16 tiles)
- **Hard** — 5×5 (25 tiles)

### Leaderboard
After solving, enter your name to submit your time to the global leaderboard. Compete with anyone who's played.

---

## Run locally

```bash
git clone https://github.com/swayam-mishra/snapzzle.git
cd snapzzle
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). The game works fully offline — the leaderboard just won't sync without Firebase keys.

---

## Built with

- [MediaPipe](https://ai.google.dev/edge/mediapipe) — real-time hand tracking AI
- [React 18](https://react.dev) + [Vite](https://vite.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) + Plus Jakarta Sans
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — real-time leaderboard
- [Firebase Hosting](https://firebase.google.com/docs/hosting) — deployment
- Web Audio API — synthesized sound effects

---

## License

[CC BY-NC 4.0](LICENSE) — free to use and learn from, no commercial use.
