import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { Loader2, RotateCcw, Trophy, Hand, Timer, ListOrdered, ArrowRight, User, Star, Wifi, WifiOff } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE SETUP ---
// @ts-ignore
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// @ts-ignore
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONSTANTS ---
const PINCH_THRESHOLD = 0.05;
const FRAME_THRESHOLD = 0.1;
const RESET_DWELL_MS = 1500;
const ROWS = 3;
const COLS = 3;
const ACCENT = '#ccff00';

// --- TYPES ---
interface Tile {
  id: number;
  origX: number;
  origY: number;
}

interface DragInfo {
  index: number;
  x: number;
  y: number;
}

interface BoardCoords {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface LeaderboardEntry {
  id?: string;
  name: string;
  time: number;
  date: number;
}

type GameState = 'SCANNING' | 'PLAYING' | 'SOLVED' | 'LEADERBOARD';

// --- UTILS ---

function captureFrame(video: HTMLVideoElement, width: number, height: number): ImageData {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d')!;
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function generatePuzzleState(cols: number, rows: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      tiles.push({ id: y * cols + x, origX: x, origY: y });

  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

function checkWinCondition(tiles: Tile[]): boolean {
  return tiles.every((tile, i) => tile.id === i);
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// --- CANVAS RENDERING ---

function renderPuzzleGame(
  ctx: CanvasRenderingContext2D,
  imageSource: HTMLCanvasElement,
  tiles: Tile[],
  cols: number,
  rows: number,
  destWidth: number,
  destHeight: number,
  dragInfo: DragInfo | null,
  hoverIndex: number | null,
) {
  const destTileW = destWidth / cols;
  const destTileH = destHeight / rows;
  const srcTileW = imageSource.width / cols;
  const srcTileH = imageSource.height / rows;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, destWidth, destHeight);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const drawTile = (tile: Tile, dx: number, dy: number, w: number, h: number, isDragging = false) => {
    const sx = tile.origX * srcTileW;
    const sy = tile.origY * srcTileH;
    ctx.save();
    if (isDragging) {
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 14;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
    }
    ctx.drawImage(imageSource, sx, sy, srcTileW, srcTileH, dx, dy, w, h);
    ctx.strokeRect(dx + 0.5, dy + 0.5, w - 1, h - 1);
    ctx.restore();
  };

  tiles.forEach((tile, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const dx = col * destTileW;
    const dy = row * destTileH;

    if (dragInfo && dragInfo.index === idx) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(dx, dy, destTileW, destTileH);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(dx + 0.5, dy + 0.5, destTileW - 1, destTileH - 1);
    } else if (dragInfo && hoverIndex === idx) {
      drawTile(tile, dx, dy, destTileW, destTileH);
      ctx.fillStyle = `${ACCENT}2a`;
      ctx.fillRect(dx, dy, destTileW, destTileH);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx + 1, dy + 1, destTileW - 2, destTileH - 2);
    } else {
      drawTile(tile, dx, dy, destTileW, destTileH);
    }
  });

  if (dragInfo) {
    const tile = tiles[dragInfo.index];
    const dw = destTileW * 1.08;
    const dh = destTileH * 1.08;
    drawTile(tile, dragInfo.x - dw / 2, dragInfo.y - dh / 2, dw, dh, true);
  }
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string,
  size = 26,
  lineWidth = 3,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';

  const corners: [number, number, number, number, number, number][] = [
    [x, y + size, x, y, x + size, y],
    [x + w - size, y, x + w, y, x + w, y + size],
    [x, y + h - size, x, y + h, x + size, y + h],
    [x + w - size, y + h, x + w, y + h, x + w, y + h - size],
  ];

  for (const [x1, y1, mx, my, x2, y2] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

// --- SUB-COMPONENTS ---

const TimerDisplay: React.FC<{ time: number }> = ({ time }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-zinc-900/80 text-white px-4 py-2 rounded-full border border-white/10 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-4 duration-500">
    <Timer className="w-4 h-4 text-[#ccff00]" />
    <span className="font-mono text-lg font-bold tracking-wider">{formatTime(time)}</span>
  </div>
);

const InstructionsPanel: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const content = {
    SCANNING: (
      <>
        <p className="font-bold text-[#ccff00] mb-1.5">PHASE 1: CAPTURE</p>
        <p>Form a frame with both hands</p>
        <p>Pinch both to snap</p>
      </>
    ),
    PLAYING: (
      <>
        <p className="font-bold text-[#ccff00] mb-1.5">PHASE 2: SOLVE</p>
        <p>Pinch &amp; drag to swap tiles</p>
        <p className="text-white/35 mt-1.5">Hold fist to reset</p>
      </>
    ),
    SOLVED: <p className="font-bold text-[#ccff00]">PUZZLE SOLVED!</p>,
    LEADERBOARD: <p className="font-bold text-[#ccff00]">TOP PLAYERS</p>,
  };

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div className="text-[10px] text-white/65 bg-black/55 px-3 py-2.5 rounded-lg backdrop-blur border border-white/10 text-right shadow-xl leading-[1.7]">
        {content[gameState]}
      </div>
    </div>
  );
};

const SolvedOverlay: React.FC<{
  time: number;
  playerName: string;
  isSubmitting: boolean;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}> = ({ time, playerName, isSubmitting, onNameChange, onSubmit, onSkip }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
    <Trophy className="w-14 h-14 text-[#ccff00] drop-shadow-lg mb-3" />
    <h2 className="text-3xl font-bold text-white mb-1 tracking-widest">COMPLETE</h2>
    <div className="flex items-center gap-2 mb-8">
      <Timer className="w-4 h-4 text-[#ccff00]" />
      <span className="text-2xl font-mono font-bold text-white">{formatTime(time)}</span>
    </div>

    <div className="flex flex-col items-center gap-3 w-full max-w-xs px-6">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Submit to leaderboard</p>
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="YOUR NAME"
            maxLength={10}
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-transparent border-b-2 border-[#ccff00] text-center text-xl text-white outline-none py-2 pl-7 font-mono uppercase placeholder:text-zinc-700 focus:border-white transition-colors pointer-events-auto"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            autoFocus
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={!playerName.trim() || isSubmitting}
          className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-40 disabled:cursor-not-allowed text-black p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto shadow-lg shadow-[#ccff00]/20"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
        </button>
      </div>
    </div>

    <button
      onClick={onSkip}
      className="mt-10 text-zinc-600 hover:text-zinc-300 text-[10px] uppercase tracking-widest transition-colors cursor-pointer pointer-events-auto"
    >
      Skip &amp; Play Again
    </button>
  </div>
);

const LeaderboardScreen: React.FC<{
  leaderboard: LeaderboardEntry[];
  personalBest: number | null;
  playerName: string;
  isConnected: boolean;
  onBack: () => void;
}> = ({ leaderboard, personalBest, playerName, isConnected, onBack }) => {
  const rankColor = (i: number) => {
    if (i === 0) return 'text-[#ccff00]';
    if (i === 1) return 'text-zinc-300';
    if (i === 2) return 'text-amber-600';
    return 'text-zinc-600';
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md px-6 py-4 flex flex-col h-full max-h-[85vh]">

        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-[#ccff00]" />
            <h2 className="text-lg font-bold text-white tracking-widest uppercase">Leaderboard</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono ${
            isConnected ? 'bg-green-950/50 border-green-800/60 text-green-400' : 'bg-red-950/50 border-red-800/60 text-red-400'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-white/5 rounded-xl border border-white/10 mb-4 custom-scrollbar">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              {isConnected ? (
                <p>No records yet.<br />Be the first!</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ccff00]" />
                  <span>Connecting...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <div className="flex items-center px-4 py-2.5 bg-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest sticky top-0 backdrop-blur-md">
                <span className="w-10">Rank</span>
                <span className="flex-1">Player</span>
                <span className="w-14 text-right">Time</span>
              </div>
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.id ?? i}
                  className={`flex items-center px-4 py-3 text-sm transition-colors ${entry.name === playerName ? 'bg-[#ccff00]/10' : 'hover:bg-white/5'}`}
                >
                  <span className={`font-mono font-bold w-10 text-xs ${rankColor(i)}`}>#{i + 1}</span>
                  <span className={`flex-1 font-bold ${entry.name === playerName ? 'text-[#ccff00]' : 'text-white'}`}>
                    {entry.name}
                  </span>
                  <span className="font-mono text-[#ccff00] w-14 text-right">{formatTime(entry.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {personalBest !== null && (
          <div className="bg-[#ccff00]/10 rounded-xl px-4 py-3 mb-4 border border-[#ccff00]/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#ccff00]" fill="currentColor" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Your Best</span>
            </div>
            <span className="font-mono font-bold text-lg text-[#ccff00]">{formatTime(personalBest)}</span>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#ccff00]/20 cursor-pointer shrink-0"
        >
          <RotateCcw size={16} /> Back to Game
        </button>

      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const GestureCamera: React.FC = () => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [gameState, setGameState] = useState<GameState>('SCANNING');
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const cached = localStorage.getItem('live-puzzle-leaderboard-cache');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const requestRef = useRef<number | null>(null);

  const puzzleTilesRef = useRef<Tile[]>([]);
  const puzzleImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameBoardCoordsRef = useRef<BoardCoords | null>(null);

  const smoothCursorRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ isDragging: boolean; tileIndex: number | null }>({ isDragging: false, tileIndex: null });
  const lastPinchTimeRef = useRef(0);
  const lastFrameCoordsRef = useRef<BoardCoords | null>(null);
  const fistHoldStartRef = useRef<number | null>(null);

  // Auth + local prefs
  useEffect(() => {
    const initAuth = async () => {
      try {
        // @ts-ignore
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // @ts-ignore
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error('Auth failed', e); }
    };
    initAuth();

    const storedName = localStorage.getItem('live-puzzle-player-name');
    if (storedName) setPlayerName(storedName);
    const storedBest = localStorage.getItem('live-puzzle-personal-best');
    if (storedBest) setPersonalBest(parseInt(storedBest, 10));

    return onAuthStateChanged(auth, setUser);
  }, []);

  // Real-time leaderboard
  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
    setIsConnected(false);
    return onSnapshot(
      ref,
      (snap) => {
        setIsConnected(true);
        const scores: LeaderboardEntry[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeaderboardEntry));
        scores.sort((a, b) => a.time - b.time);
        const top = scores.slice(0, 50);
        setLeaderboard(top);
        localStorage.setItem('live-puzzle-leaderboard-cache', JSON.stringify(top));
      },
      (err) => { console.error('Leaderboard error', err); setIsConnected(false); },
    );
  }, [user]);

  // MediaPipe hand landmarker
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        setModelLoaded(true);
      } catch (err) {
        console.error(err);
        setError('AI model failed to load.');
      }
    };
    init();
  }, []);

  // Camera
  useEffect(() => {
    const start = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().then(() => setCameraReady(true));
      } catch {
        setError('Camera access denied.');
      }
    };
    start();
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const startTime = Date.now();
    const interval = window.setInterval(() => setTimeElapsed(Date.now() - startTime), 100);
    return () => clearInterval(interval);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState('SCANNING');
    setTimeElapsed(0);
    setIsSubmitting(false);
    puzzleTilesRef.current = [];
    dragRef.current = { isDragging: false, tileIndex: null };
    gameBoardCoordsRef.current = null;
    fistHoldStartRef.current = null;
  }, []);

  const submitScore = useCallback(async () => {
    if (!playerName.trim() || !user || isSubmitting) return;
    setIsSubmitting(true);
    const name = playerName.trim().toUpperCase();
    localStorage.setItem('live-puzzle-player-name', name);

    if (personalBest === null || timeElapsed < personalBest) {
      setPersonalBest(timeElapsed);
      localStorage.setItem('live-puzzle-personal-best', String(timeElapsed));
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'), {
        name, time: timeElapsed, date: Date.now(),
      });
      setGameState('LEADERBOARD');
    } catch (e) {
      console.error('Score save error', e);
      alert('Could not save score. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }, [playerName, user, isSubmitting, personalBest, timeElapsed]);

  // Main render loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady || video.readyState < 2) {
      requestRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      drawingUtilsRef.current = null; // reset after resize
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Lazy-init DrawingUtils once per canvas (not per frame)
    if (!drawingUtilsRef.current) {
      drawingUtilsRef.current = new DrawingUtils(ctx);
    }

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const results = modelLoaded && handLandmarkerRef.current
      ? handLandmarkerRef.current.detectForVideo(video, performance.now())
      : null;

    const drawBackground = () => {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    };

    // ── SCANNING / LEADERBOARD ──────────────────────────────────
    if (gameState === 'SCANNING' || gameState === 'LEADERBOARD') {
      drawBackground();

      if (gameState === 'SCANNING' && results?.landmarks?.length === 2) {
        const [h1, h2] = results.landmarks;
        const d1 = Math.hypot(h1[8].x - h1[4].x, h1[8].y - h1[4].y);
        const d2 = Math.hypot(h2[8].x - h2[4].x, h2[8].y - h2[4].y);
        const isFraming = d1 > FRAME_THRESHOLD && d2 > FRAME_THRESHOLD;

        if (isFraming) {
          const allX = [h1[8].x, h1[4].x, h2[8].x, h2[4].x];
          const allY = [h1[8].y, h1[4].y, h2[8].y, h2[4].y];
          lastFrameCoordsRef.current = {
            minX: Math.min(...allX), maxX: Math.max(...allX),
            minY: Math.min(...allY), maxY: Math.max(...allY),
          };
        }

        const isPinching = d1 < PINCH_THRESHOLD && d2 < PINCH_THRESHOLD;
        if (isPinching && lastFrameCoordsRef.current) {
          const now = Date.now();
          if (now - lastPinchTimeRef.current > 1000) {
            lastPinchTimeRef.current = now;
            const c = lastFrameCoordsRef.current;
            const sx = (1 - c.maxX) * width;
            const sy = c.minY * height;
            const sw = (1 - c.minX) * width - sx;
            const sh = c.maxY * height - sy;

            if (sw > 0 && sh > 0) {
              const fullFrame = captureFrame(video, width, height);
              const tempC = document.createElement('canvas');
              tempC.width = width; tempC.height = height;
              tempC.getContext('2d')?.putImageData(fullFrame, 0, 0);

              const crop = document.createElement('canvas');
              crop.width = sw * 2; crop.height = sh * 2;
              crop.getContext('2d')?.drawImage(tempC, sx, sy, sw, sh, 0, 0, crop.width, crop.height);

              puzzleImageCanvasRef.current = crop;
              puzzleTilesRef.current = generatePuzzleState(COLS, ROWS);
              gameBoardCoordsRef.current = { ...c };
              setGameState('PLAYING');
            }
          }
        }

        // Frame overlay with corner brackets + background dim
        if (lastFrameCoordsRef.current && isFraming) {
          const c = lastFrameCoordsRef.current;
          const fx = (1 - c.maxX) * width;
          const fy = c.minY * height;
          const fw = (1 - c.minX) * width - fx;
          const fh = c.maxY * height - fy;

          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(0, 0, width, fy);
          ctx.fillRect(0, fy + fh, width, height - fy - fh);
          ctx.fillRect(0, fy, fx, fh);
          ctx.fillRect(fx + fw, fy, width - fx - fw, fh);

          drawCornerBrackets(ctx, fx, fy, fw, fh, ACCENT, 28, 3);

          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = ACCENT;
          ctx.textAlign = 'left';
          ctx.fillText('PINCH TO CAPTURE', fx + 2, fy - 8);
          ctx.restore();
        }
      }
    }

    // ── PLAYING / SOLVED ────────────────────────────────────────
    else if (
      (gameState === 'PLAYING' || gameState === 'SOLVED') &&
      puzzleImageCanvasRef.current &&
      gameBoardCoordsRef.current
    ) {
      drawBackground();

      const c = gameBoardCoordsRef.current;
      const boardSX = (1 - c.maxX) * width;
      const boardSY = c.minY * height;
      const boardW = (1 - c.minX) * width - boardSX;
      const boardH = c.maxY * height - boardSY;

      let hoverIndex: number | null = null;
      let isPinching = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let interactingHand: any = null;

      if (results?.landmarks?.length) {
        const hand = results.landmarks[0];
        interactingHand = hand;
        const indexTip = hand[8];
        const thumbTip = hand[4];

        const rawX = (1 - (indexTip.x + thumbTip.x) / 2) * width;
        const rawY = ((indexTip.y + thumbTip.y) / 2) * height;
        isPinching = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y) < PINCH_THRESHOLD;

        const moveD = Math.hypot(rawX - smoothCursorRef.current.x, rawY - smoothCursorRef.current.y);
        const alpha = moveD > 100 ? 1 : 0.4;
        smoothCursorRef.current.x += (rawX - smoothCursorRef.current.x) * alpha;
        smoothCursorRef.current.y += (rawY - smoothCursorRef.current.y) * alpha;
      }

      const { x: cursorX, y: cursorY } = smoothCursorRef.current;
      const relX = cursorX - boardSX;
      const relY = cursorY - boardSY;

      if (relX >= 0 && relX <= boardW && relY >= 0 && relY <= boardH) {
        const col = Math.floor(relX / (boardW / COLS));
        const row = Math.floor(relY / (boardH / ROWS));
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS)
          hoverIndex = row * COLS + col;
      }

      if (gameState === 'PLAYING') {
        if (isPinching) {
          if (!dragRef.current.isDragging && hoverIndex !== null)
            dragRef.current = { isDragging: true, tileIndex: hoverIndex };
        } else if (dragRef.current.isDragging) {
          const startIdx = dragRef.current.tileIndex;
          if (startIdx !== null && hoverIndex !== null && startIdx !== hoverIndex) {
            const tiles = [...puzzleTilesRef.current];
            [tiles[startIdx], tiles[hoverIndex]] = [tiles[hoverIndex], tiles[startIdx]];
            puzzleTilesRef.current = tiles;
            if (checkWinCondition(tiles)) setGameState('SOLVED');
          }
          dragRef.current = { isDragging: false, tileIndex: null };
        }
      }

      // Render puzzle board
      ctx.save();
      ctx.translate(boardSX, boardSY);
      renderPuzzleGame(
        ctx,
        puzzleImageCanvasRef.current,
        puzzleTilesRef.current,
        COLS, ROWS, boardW, boardH,
        dragRef.current.isDragging && dragRef.current.tileIndex !== null
          ? { index: dragRef.current.tileIndex, x: relX, y: relY }
          : null,
        hoverIndex,
      );

      // Board border — glow when solved
      ctx.shadowColor = gameState === 'SOLVED' ? ACCENT : 'transparent';
      ctx.shadowBlur = gameState === 'SOLVED' ? 16 : 0;
      ctx.strokeStyle = gameState === 'SOLVED' ? ACCENT : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = gameState === 'SOLVED' ? 3 : 1.5;
      ctx.strokeRect(1, 1, boardW - 2, boardH - 2);
      ctx.restore();

      // Cursor: ring + crosshair when open, filled dot when dragging
      if (results?.landmarks?.length) {
        ctx.save();
        if (dragRef.current.isDragging) {
          ctx.beginPath();
          ctx.arc(cursorX, cursorY, 9, 0, Math.PI * 2);
          ctx.fillStyle = ACCENT;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(cursorX, cursorY, 9, 0, Math.PI * 2);
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.strokeStyle = `${ACCENT}70`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cursorX - 15, cursorY); ctx.lineTo(cursorX - 11, cursorY);
          ctx.moveTo(cursorX + 11, cursorY); ctx.lineTo(cursorX + 15, cursorY);
          ctx.moveTo(cursorX, cursorY - 15); ctx.lineTo(cursorX, cursorY - 11);
          ctx.moveTo(cursorX, cursorY + 11); ctx.lineTo(cursorX, cursorY + 15);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Fist → reset with dwell arc
      if (interactingHand && gameState === 'PLAYING') {
        const wrist = interactingHand[0];
        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        const closed = tips.filter((t, i) => {
          const dTip = Math.hypot(interactingHand[t].x - wrist.x, interactingHand[t].y - wrist.y);
          const dPip = Math.hypot(interactingHand[pips[i]].x - wrist.x, interactingHand[pips[i]].y - wrist.y);
          return dTip < dPip;
        });
        const isFist = closed.length === 4;

        if (isFist) {
          if (!fistHoldStartRef.current) fistHoldStartRef.current = performance.now();
          const progress = Math.min((performance.now() - fistHoldStartRef.current) / RESET_DWELL_MS, 1);
          const cx = width / 2, cy = height / 2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, 42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('RESET', cx, cy - 5);
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillText('hold fist', cx, cy + 9);
          ctx.restore();

          if (progress >= 1) resetGame();
        } else {
          fistHoldStartRef.current = null;
        }
      }
    }

    // ── HAND SKELETON ───────────────────────────────────────────
    if (results?.landmarks && drawingUtilsRef.current && gameState !== 'LEADERBOARD') {
      for (const landmarks of results.landmarks) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        drawingUtilsRef.current.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: 'rgba(255,255,255,0.5)',
          lineWidth: 2,
        });
        drawingUtilsRef.current.drawLandmarks(landmarks, {
          color: 'rgba(255,255,255,0.75)',
          radius: 2.5,
          lineWidth: 1,
        });
        ctx.restore();
      }
    }

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [cameraReady, modelLoaded, gameState, resetGame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [renderLoop]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {gameState === 'PLAYING' && <TimerDisplay time={timeElapsed} />}

      {gameState === 'SCANNING' && (
        <button
          onClick={() => setGameState('LEADERBOARD')}
          className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-zinc-900/80 text-white px-4 py-2 rounded-full border border-white/10 hover:bg-zinc-800 transition-colors cursor-pointer pointer-events-auto"
        >
          <ListOrdered className="w-4 h-4 text-[#ccff00]" />
          <span className="text-xs font-bold uppercase tracking-wider">Leaderboard</span>
        </button>
      )}

      <InstructionsPanel gameState={gameState} />

      {gameState === 'SOLVED' && (
        <SolvedOverlay
          time={timeElapsed}
          playerName={playerName}
          isSubmitting={isSubmitting}
          onNameChange={setPlayerName}
          onSubmit={submitScore}
          onSkip={resetGame}
        />
      )}

      {gameState === 'LEADERBOARD' && (
        <LeaderboardScreen
          leaderboard={leaderboard}
          personalBest={personalBest}
          playerName={playerName}
          isConnected={isConnected}
          onBack={resetGame}
        />
      )}

      {gameState === 'PLAYING' && (
        <button
          onClick={resetGame}
          className="absolute bottom-6 left-6 z-20 bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-full border border-white/10 transition-colors pointer-events-auto cursor-pointer"
          title="Reset Game"
        >
          <RotateCcw size={18} />
        </button>
      )}

      {gameState === 'PLAYING' && (
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/35 text-[10px] pointer-events-none">
          <Hand className="w-3.5 h-3.5" />
          <span>Index + Thumb to pinch</span>
        </div>
      )}

      {/* Loading / error states */}
      {!cameraReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white z-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#ccff00]" />
          <p className="text-xs tracking-widest uppercase text-zinc-400">Starting Camera</p>
        </div>
      )}
      {cameraReady && !modelLoaded && !error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-[#ccff00]/30">
          <Loader2 className="w-3 h-3 animate-spin text-[#ccff00]" />
          <span className="text-[10px] uppercase tracking-widest text-[#ccff00]">Loading AI Model</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-30 p-8 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-1">
            <span className="text-red-400 text-xl font-bold">!</span>
          </div>
          <p className="font-bold text-red-400">Something went wrong</p>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      )}
    </div>
  );
};

// --- APP WRAPPER ---

export default function App() {
  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 relative"
      style={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      <div className="absolute top-4 left-0 right-0 text-center z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-widest text-[#ccff00] uppercase drop-shadow-md">
          Live Puzzle
        </h1>
        <p className="text-zinc-600 text-xs mt-1 tracking-wide">
          Frame it to Snap &middot; Pinch &amp; Drag to Swap
        </p>
      </div>

      <div className="relative w-[95vw] h-[85vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <GestureCamera />
      </div>
    </div>
  );
}
