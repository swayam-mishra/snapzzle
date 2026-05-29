import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import {
  Loader2, RotateCcw, Trophy, Hand, Timer, ListOrdered,
  ArrowRight, User, Star, Wifi, WifiOff, Zap, Target, Flame,
} from 'lucide-react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sounds } from './sounds';

// --- SUPABASE (optional — set VITE_SUPABASE_* env vars to enable leaderboard) ---
const LEADERBOARD_ENABLED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let supabase: SupabaseClient | null = null;
if (LEADERBOARD_ENABLED) {
  try {
    supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }
}

// --- CONSTANTS ---
const ACCENT = '#ccff00';
const PINCH_THRESHOLD = 0.05;
const FRAME_THRESHOLD = 0.1;
const RESET_DWELL_MS = 3000;

// --- DIFFICULTY ---
type Difficulty = 'easy' | 'medium' | 'hard';
const GRID = {
  easy:   { cols: 3, rows: 3, label: 'Easy',   desc: '3 × 3' },
  medium: { cols: 4, rows: 4, label: 'Medium', desc: '4 × 4' },
  hard:   { cols: 5, rows: 5, label: 'Hard',   desc: '5 × 5' },
} satisfies Record<Difficulty, { cols: number; rows: number; label: string; desc: string }>;

// --- TYPES ---
interface Tile { id: number; origX: number; origY: number; }
interface DragInfo { index: number; x: number; y: number; }
interface BoardCoords { minX: number; maxX: number; minY: number; maxY: number; }
interface LeaderboardEntry { id?: string; name: string; time: number; difficulty: string; date: number; }
type GameState = 'SCANNING' | 'PLAYING' | 'SOLVED' | 'LEADERBOARD';

// --- UTILS ---
function captureFrame(video: HTMLVideoElement, w: number, h: number): ImageData {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.translate(w, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function generateTiles(cols: number, rows: number): Tile[] {
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

function isSolved(tiles: Tile[]): boolean {
  return tiles.every((t, i) => t.id === i);
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// --- CANVAS ---
function renderBoard(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  tiles: Tile[],
  cols: number, rows: number,
  w: number, h: number,
  drag: DragInfo | null,
  hover: number | null,
) {
  const tw = w / cols, th = h / rows;
  const sw = src.width / cols, sh = src.height / rows;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const drawTile = (t: Tile, dx: number, dy: number, dw: number, dh: number, lifted = false) => {
    ctx.save();
    if (lifted) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 14;
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    }
    ctx.drawImage(src, t.origX * sw, t.origY * sh, sw, sh, dx, dy, dw, dh);
    ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    ctx.restore();
  };

  tiles.forEach((tile, idx) => {
    const dx = (idx % cols) * tw, dy = Math.floor(idx / cols) * th;
    if (drag && drag.index === idx) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(dx, dy, tw, th);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
      ctx.strokeRect(dx + 0.5, dy + 0.5, tw - 1, th - 1);
    } else if (drag && hover === idx) {
      drawTile(tile, dx, dy, tw, th);
      ctx.fillStyle = `${ACCENT}28`; ctx.fillRect(dx, dy, tw, th);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
      ctx.strokeRect(dx + 1, dy + 1, tw - 2, th - 2);
    } else {
      drawTile(tile, dx, dy, tw, th);
    }
  });

  if (drag) {
    const dw = tw * 1.08, dh = th * 1.08;
    drawTile(tiles[drag.index], drag.x - dw / 2, drag.y - dh / 2, dw, dh, true);
  }
}

function drawBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, size = 26, lw = 3,
) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
  const corners: [number, number, number, number, number, number][] = [
    [x, y + size, x, y, x + size, y],
    [x + w - size, y, x + w, y, x + w, y + size],
    [x, y + h - size, x, y + h, x + size, y + h],
    [x + w - size, y + h, x + w, y + h, x + w, y + h - size],
  ];
  for (const [x1, y1, mx, my, x2, y2] of corners) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();
}

// --- SUB-COMPONENTS ---

const TimerDisplay: React.FC<{ time: number }> = ({ time }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-zinc-900/80 text-white px-4 py-2 rounded-full border border-white/10 shadow-xl backdrop-blur">
    <Timer className="w-4 h-4 text-[#ccff00]" />
    <span className="font-mono text-lg font-bold tracking-wider">{fmt(time)}</span>
  </div>
);

const InstructionsPanel: React.FC<{ state: GameState }> = ({ state }) => {
  const map: Record<GameState, React.ReactNode> = {
    SCANNING: (<><p className="font-bold text-[#ccff00] mb-1.5">PHASE 1: CAPTURE</p><p>Form a frame with both hands</p><p>Pinch both to snap</p></>),
    PLAYING:  (<><p className="font-bold text-[#ccff00] mb-1.5">PHASE 2: SOLVE</p><p>Pinch &amp; drag to swap tiles</p><p className="text-white/35 mt-1.5">Hold fist to reset</p></>),
    SOLVED:      <p className="font-bold text-[#ccff00]">PUZZLE SOLVED!</p>,
    LEADERBOARD: <p className="font-bold text-[#ccff00]">TOP PLAYERS</p>,
  };
  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div className="text-[10px] text-white/65 bg-black/55 px-3 py-2.5 rounded-lg backdrop-blur border border-white/10 text-right leading-[1.7]">
        {map[state]}
      </div>
    </div>
  );
};

const SolvedOverlay: React.FC<{
  time: number; difficulty: Difficulty; playerName: string; isSubmitting: boolean;
  onNameChange: (n: string) => void; onSubmit: () => void; onPlayAgain: () => void; onMenu: () => void;
}> = ({ time, difficulty, playerName, isSubmitting, onNameChange, onSubmit, onPlayAgain, onMenu }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-md">
    <Trophy className="w-14 h-14 text-[#ccff00] mb-3" />
    <h2 className="text-3xl font-bold text-white mb-1 tracking-widest">COMPLETE</h2>
    <div className="flex items-center gap-2 mb-1">
      <Timer className="w-4 h-4 text-[#ccff00]" />
      <span className="text-2xl font-mono font-bold text-white">{fmt(time)}</span>
    </div>
    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-8">{GRID[difficulty].desc}</p>

    {LEADERBOARD_ENABLED && (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs px-6 mb-6">
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Submit to leaderboard</p>
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-1">
            <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text" placeholder="YOUR NAME" maxLength={10} value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              autoFocus
              className="w-full bg-transparent border-b-2 border-[#ccff00] text-center text-xl text-white outline-none py-2 pl-7 font-mono uppercase placeholder:text-zinc-700 focus:border-white transition-colors pointer-events-auto"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={!playerName.trim() || isSubmitting}
            className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-40 disabled:cursor-not-allowed text-black p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    )}

    <div className="flex gap-3">
      <button onClick={onPlayAgain} className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-2.5 px-6 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 pointer-events-auto shadow-lg shadow-[#ccff00]/20">
        <RotateCcw size={15} /> Play Again
      </button>
      <button onClick={onMenu} className="border border-white/20 hover:border-white/40 text-white/60 hover:text-white py-2.5 px-6 rounded-full text-sm transition-all pointer-events-auto">
        Change Difficulty
      </button>
    </div>
  </div>
);

const LeaderboardScreen: React.FC<{
  leaderboard: LeaderboardEntry[]; personalBest: number | null;
  playerName: string; isConnected: boolean; onBack: () => void;
}> = ({ leaderboard, personalBest, playerName, isConnected, onBack }) => {
  const rankColor = (i: number) =>
    i === 0 ? 'text-[#ccff00]' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md px-6 py-4 flex flex-col h-full max-h-[85vh]">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-[#ccff00]" />
            <h2 className="text-lg font-bold text-white tracking-widest uppercase">Leaderboard</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono ${isConnected ? 'bg-green-950/50 border-green-800/60 text-green-400' : 'bg-red-950/50 border-red-800/60 text-red-400'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-white/5 rounded-xl border border-white/10 mb-4 custom-scrollbar">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              {isConnected ? <p>No records yet.<br />Be the first!</p> : (
                <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#ccff00]" /><span>Connecting…</span></div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <div className="flex items-center px-4 py-2.5 bg-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest sticky top-0 backdrop-blur-md">
                <span className="w-10">Rank</span><span className="flex-1">Player</span>
                <span className="w-16 text-center">Mode</span><span className="w-14 text-right">Time</span>
              </div>
              {leaderboard.map((e, i) => (
                <div key={e.id ?? i} className={`flex items-center px-4 py-3 text-sm ${e.name === playerName ? 'bg-[#ccff00]/10' : 'hover:bg-white/5'}`}>
                  <span className={`font-mono font-bold w-10 text-xs ${rankColor(i)}`}>#{i + 1}</span>
                  <span className={`flex-1 font-bold ${e.name === playerName ? 'text-[#ccff00]' : 'text-white'}`}>{e.name}</span>
                  <span className="w-16 text-center text-[9px] text-zinc-500 uppercase">{e.difficulty ?? '—'}</span>
                  <span className="font-mono text-[#ccff00] w-14 text-right">{fmt(e.time)}</span>
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
            <span className="font-mono font-bold text-lg text-[#ccff00]">{fmt(personalBest)}</span>
          </div>
        )}

        <button onClick={onBack} className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#ccff00]/20 cursor-pointer shrink-0">
          <RotateCcw size={16} /> Back to Game
        </button>
      </div>
    </div>
  );
};

// --- GESTURE CAMERA ---
interface GestureCameraProps {
  cols: number; rows: number; difficulty: Difficulty; onMenu: () => void;
}

const GestureCamera: React.FC<GestureCameraProps> = ({ cols, rows, difficulty, onMenu }) => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [gameState, setGameState] = useState<GameState>('SCANNING');
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('lp-name') ?? '');
  const [personalBest, setPersonalBest] = useState<number | null>(() => {
    const v = localStorage.getItem('lp-best'); return v ? parseInt(v, 10) : null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('lp-lb') ?? '[]'); } catch { return []; }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlRef = useRef<HandLandmarker | null>(null);
  const duRef = useRef<DrawingUtils | null>(null);
  const rafRef = useRef<number | null>(null);

  const tilesRef = useRef<Tile[]>([]);
  const imgRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<BoardCoords | null>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ on: boolean; idx: number | null }>({ on: false, idx: null });
  const lastPinchRef = useRef(0);
  const lastFrameRef = useRef<BoardCoords | null>(null);
  const fistRef = useRef<number | null>(null);
  const releaseFramesRef = useRef(0); // consecutive non-pinch frames needed to drop

  // Leaderboard sync
  useEffect(() => {
    if (!LEADERBOARD_ENABLED || !supabase) return;
    setIsConnected(false);

    const fetchScores = async () => {
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('*')
        .order('time', { ascending: true })
        .limit(50);
      if (error) { setIsConnected(false); return; }
      setIsConnected(true);
      setLeaderboard(data as LeaderboardEntry[]);
      localStorage.setItem('lp-lb', JSON.stringify(data));
    };

    fetchScores();

    // Real-time: re-fetch whenever a new score is inserted
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, fetchScores)
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    return () => { supabase!.removeChannel(channel); };
  }, []);

  // MediaPipe
  useEffect(() => {
    FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    ).then((vision) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })
    ).then((hl) => {
      hlRef.current = hl;
      setModelLoaded(true);
    }).catch(() => setError('AI model failed to load.'));
  }, []);

  // Camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } })
      .then((stream) => {
        const v = videoRef.current!;
        v.srcObject = stream;
        v.onloadedmetadata = () => v.play().then(() => setCameraReady(true));
      })
      .catch(() => setError('Camera access denied.'));
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const t0 = Date.now();
    const id = window.setInterval(() => setTimeElapsed(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState('SCANNING');
    setTimeElapsed(0);
    setIsSubmitting(false);
    tilesRef.current = [];
    dragRef.current = { on: false, idx: null };
    boardRef.current = null;
    fistRef.current = null;
    releaseFramesRef.current = 0;
  }, []);

  const submitScore = useCallback(async () => {
    if (!playerName.trim() || isSubmitting || !supabase) return;
    setIsSubmitting(true);
    const name = playerName.trim().toUpperCase();
    localStorage.setItem('lp-name', name);
    if (personalBest === null || timeElapsed < personalBest) {
      setPersonalBest(timeElapsed);
      localStorage.setItem('lp-best', String(timeElapsed));
    }
    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert({ name, time: timeElapsed, difficulty, date: Date.now() });
      if (error) throw error;
      setGameState('LEADERBOARD');
    } catch { alert('Could not save score.'); }
    finally { setIsSubmitting(false); }
  }, [playerName, isSubmitting, personalBest, timeElapsed, difficulty]);

  // Render loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderLoop); return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      duRef.current = null;
    }
    const ctx = canvas.getContext('2d')!;
    if (!duRef.current) duRef.current = new DrawingUtils(ctx);
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);

    const results = modelLoaded && hlRef.current
      ? hlRef.current.detectForVideo(video, performance.now()) : null;

    const drawBg = () => {
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, W, H); ctx.restore();
    };

    // SCANNING / LEADERBOARD
    if (gameState === 'SCANNING' || gameState === 'LEADERBOARD') {
      drawBg();
      if (gameState === 'SCANNING' && results?.landmarks?.length === 2) {
        const [h1, h2] = results.landmarks;
        const d1 = Math.hypot(h1[8].x - h1[4].x, h1[8].y - h1[4].y);
        const d2 = Math.hypot(h2[8].x - h2[4].x, h2[8].y - h2[4].y);
        const framing = d1 > FRAME_THRESHOLD && d2 > FRAME_THRESHOLD;

        if (framing) {
          const ax = [h1[8].x, h1[4].x, h2[8].x, h2[4].x];
          const ay = [h1[8].y, h1[4].y, h2[8].y, h2[4].y];
          lastFrameRef.current = { minX: Math.min(...ax), maxX: Math.max(...ax), minY: Math.min(...ay), maxY: Math.max(...ay) };
        }

        if (d1 < PINCH_THRESHOLD && d2 < PINCH_THRESHOLD && lastFrameRef.current) {
          const now = Date.now();
          if (now - lastPinchRef.current > 1000) {
            lastPinchRef.current = now;
            const c = lastFrameRef.current;
            const sx = (1 - c.maxX) * W, sy = c.minY * H;
            const sw = (1 - c.minX) * W - sx, sh = c.maxY * H - sy;
            if (sw > 0 && sh > 0) {
              const full = captureFrame(video, W, H);
              const tmp = document.createElement('canvas');
              tmp.width = W; tmp.height = H;
              tmp.getContext('2d')!.putImageData(full, 0, 0);
              const crop = document.createElement('canvas');
              crop.width = sw * 2; crop.height = sh * 2;
              crop.getContext('2d')!.drawImage(tmp, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
              imgRef.current = crop;
              tilesRef.current = generateTiles(cols, rows);
              boardRef.current = { ...c };
              sounds.snap();
              setGameState('PLAYING');
            }
          }
        }

        if (lastFrameRef.current && framing) {
          const c = lastFrameRef.current;
          const fx = (1 - c.maxX) * W, fy = c.minY * H;
          const fw = (1 - c.minX) * W - fx, fh = c.maxY * H - fy;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(0, 0, W, fy); ctx.fillRect(0, fy + fh, W, H - fy - fh);
          ctx.fillRect(0, fy, fx, fh); ctx.fillRect(fx + fw, fy, W - fx - fw, fh);
          drawBrackets(ctx, fx, fy, fw, fh, ACCENT);
          ctx.save(); ctx.font = 'bold 11px monospace'; ctx.fillStyle = ACCENT;
          ctx.textAlign = 'left'; ctx.fillText('PINCH TO CAPTURE', fx + 2, fy - 8); ctx.restore();
        }
      }
    }

    // PLAYING / SOLVED
    else if ((gameState === 'PLAYING' || gameState === 'SOLVED') && imgRef.current && boardRef.current) {
      drawBg();
      const c = boardRef.current;
      const bx = (1 - c.maxX) * W, by = c.minY * H;
      const bw = (1 - c.minX) * W - bx, bh = c.maxY * H - by;

      let hover: number | null = null, pinching = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let hand: any = null;

      if (results?.landmarks?.length) {
        hand = results.landmarks[0];
        const ix = hand[8], tx = hand[4];
        const rawX = (1 - (ix.x + tx.x) / 2) * W;
        const rawY = ((ix.y + tx.y) / 2) * H;
        pinching = Math.hypot(ix.x - tx.x, ix.y - tx.y) < PINCH_THRESHOLD;
        const d = Math.hypot(rawX - cursorRef.current.x, rawY - cursorRef.current.y);
        const a = d > 100 ? 1 : 0.4;
        cursorRef.current.x += (rawX - cursorRef.current.x) * a;
        cursorRef.current.y += (rawY - cursorRef.current.y) * a;
      }

      const { x: cx, y: cy } = cursorRef.current;
      const rx = cx - bx, ry = cy - by;
      if (rx >= 0 && rx <= bw && ry >= 0 && ry <= bh) {
        const col = Math.floor(rx / (bw / cols));
        const row = Math.floor(ry / (bh / rows));
        if (col >= 0 && col < cols && row >= 0 && row < rows) hover = row * cols + col;
      }

      if (gameState === 'PLAYING') {
        if (pinching) {
          fistRef.current = null; // clear any partial fist hold
          releaseFramesRef.current = 0; // reset drop debounce while pinching
          if (!dragRef.current.on && hover !== null) {
            dragRef.current = { on: true, idx: hover };
            sounds.pick();
          }
        } else if (dragRef.current.on) {
          releaseFramesRef.current++;
          // require 5 consecutive non-pinch frames before registering a drop
          // prevents accidental drops from brief tracking glitches during fast movement
          if (releaseFramesRef.current >= 5) {
            const si = dragRef.current.idx;
            if (si !== null && hover !== null && si !== hover) {
              const tiles = [...tilesRef.current];
              [tiles[si], tiles[hover]] = [tiles[hover], tiles[si]];
              tilesRef.current = tiles;
              sounds.drop();
              if (isSolved(tiles)) { sounds.solve(); setGameState('SOLVED'); }
            }
            dragRef.current = { on: false, idx: null };
            releaseFramesRef.current = 0;
          }
        } else {
          releaseFramesRef.current = 0;
        }
      }

      ctx.save(); ctx.translate(bx, by);
      renderBoard(ctx, imgRef.current, tilesRef.current, cols, rows, bw, bh,
        dragRef.current.on && dragRef.current.idx !== null ? { index: dragRef.current.idx, x: rx, y: ry } : null, hover);
      const solved = gameState === 'SOLVED';
      ctx.shadowColor = solved ? ACCENT : 'transparent';
      ctx.shadowBlur = solved ? 16 : 0;
      ctx.strokeStyle = solved ? ACCENT : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = solved ? 3 : 1.5;
      ctx.strokeRect(1, 1, bw - 2, bh - 2);
      ctx.restore();

      // Cursor
      if (results?.landmarks?.length) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        if (dragRef.current.on) {
          ctx.fillStyle = ACCENT; ctx.fill();
        } else {
          ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.stroke();
          ctx.strokeStyle = `${ACCENT}70`; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 11, cy);
          ctx.moveTo(cx + 11, cy); ctx.lineTo(cx + 15, cy);
          ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 11);
          ctx.moveTo(cx, cy + 11); ctx.lineTo(cx, cy + 15);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Fist → reset (skip while pinching so tile-drag doesn't trigger it)
      if (hand && gameState === 'PLAYING' && !pinching) {
        const wrist = hand[0];
        const tips = [8, 12, 16, 20], pips = [6, 10, 14, 18];
        const fist = tips.filter((t, i) => {
          const dT = Math.hypot(hand[t].x - wrist.x, hand[t].y - wrist.y);
          const dP = Math.hypot(hand[pips[i]].x - wrist.x, hand[pips[i]].y - wrist.y);
          return dT < dP;
        }).length === 4;

        if (fist) {
          if (!fistRef.current) fistRef.current = performance.now();
          const p = Math.min((performance.now() - fistRef.current) / RESET_DWELL_MS, 1);
          const fcx = W / 2, fcy = H / 2;
          ctx.save();
          ctx.beginPath(); ctx.arc(fcx, fcy, 42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill();
          ctx.beginPath(); ctx.arc(fcx, fcy, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
          ctx.strokeStyle = ACCENT; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.stroke();
          ctx.fillStyle = 'white'; ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('RESET', fcx, fcy - 5);
          ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillText('hold fist', fcx, fcy + 9);
          ctx.restore();
          if (p >= 1) resetGame();
        } else { fistRef.current = null; }
      }
    }

    // Hand skeleton
    if (results?.landmarks && duRef.current && gameState !== 'LEADERBOARD') {
      for (const lm of results.landmarks) {
        ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
        duRef.current.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.5)', lineWidth: 2 });
        duRef.current.drawLandmarks(lm, { color: 'rgba(255,255,255,0.75)', radius: 2.5, lineWidth: 1 });
        ctx.restore();
      }
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [cameraReady, modelLoaded, gameState, cols, rows, resetGame]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [renderLoop]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {gameState === 'PLAYING' && <TimerDisplay time={timeElapsed} />}

      {gameState === 'SCANNING' && (
        <div className="absolute top-6 left-6 z-30 flex gap-2">
          <button onClick={onMenu} className="flex items-center gap-1.5 bg-zinc-900/80 text-white px-3 py-2 rounded-full border border-white/10 hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider pointer-events-auto">
            ← Difficulty
          </button>
          {LEADERBOARD_ENABLED && (
            <button onClick={() => setGameState('LEADERBOARD')} className="flex items-center gap-2 bg-zinc-900/80 text-white px-3 py-2 rounded-full border border-white/10 hover:bg-zinc-800 transition-colors cursor-pointer pointer-events-auto">
              <ListOrdered className="w-4 h-4 text-[#ccff00]" />
              <span className="text-xs font-bold uppercase tracking-wider">Scores</span>
            </button>
          )}
        </div>
      )}

      <InstructionsPanel state={gameState} />

      {gameState === 'SOLVED' && (
        <SolvedOverlay
          time={timeElapsed} difficulty={difficulty} playerName={playerName}
          isSubmitting={isSubmitting} onNameChange={setPlayerName}
          onSubmit={submitScore} onPlayAgain={resetGame} onMenu={onMenu}
        />
      )}

      {gameState === 'LEADERBOARD' && LEADERBOARD_ENABLED && (
        <LeaderboardScreen
          leaderboard={leaderboard} personalBest={personalBest}
          playerName={playerName} isConnected={isConnected} onBack={resetGame}
        />
      )}

      {gameState === 'PLAYING' && (
        <>
          <button onClick={resetGame} title="Reset" className="absolute bottom-6 left-6 z-20 bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-full border border-white/10 transition-colors pointer-events-auto cursor-pointer">
            <RotateCcw size={18} />
          </button>
          <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/35 text-[10px] pointer-events-none">
            <Hand className="w-3.5 h-3.5" /><span>Pinch to grab</span>
          </div>
        </>
      )}

      {!cameraReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-20 gap-4">
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
          <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <span className="text-red-400 text-xl font-bold">!</span>
          </div>
          <p className="font-bold text-red-400">Something went wrong</p>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      )}
    </div>
  );
};

// --- MENU ---
const DifficultyCard: React.FC<{ d: Difficulty; selected: boolean; onClick: () => void }> = ({ d, selected, onClick }) => {
  const cfg = GRID[d];
  const Icon = d === 'easy' ? Zap : d === 'medium' ? Target : Flame;
  const accent = d === 'easy' ? '#ccff00' : d === 'medium' ? '#fb923c' : '#f87171';
  const borderClass = selected
    ? d === 'easy' ? 'border-[#ccff00] bg-[#ccff00]/10'
      : d === 'medium' ? 'border-orange-400 bg-orange-400/10'
      : 'border-red-400 bg-red-400/10'
    : 'border-white/10 hover:border-white/20';

  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer pointer-events-auto w-28 ${borderClass}`}>
      <Icon className="w-5 h-5" style={{ color: selected ? accent : '#71717a' }} />
      <div className="text-center">
        <p className="text-white font-bold text-sm">{cfg.label}</p>
        <p className="text-zinc-500 text-xs">{cfg.desc}</p>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}>
        {Array.from({ length: cfg.cols * cfg.rows }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-sm" style={{ background: selected ? `${accent}99` : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>
    </button>
  );
};

const MenuScreen: React.FC<{ onStart: (d: Difficulty) => void }> = ({ onStart }) => {
  const [selected, setSelected] = useState<Difficulty>('easy');
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-widest text-[#ccff00] uppercase mb-2">Snapzzle</h1>
          <p className="text-zinc-500 text-xs tracking-wide">Frame it to Snap &middot; Pinch &amp; Drag to Solve</p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Select Difficulty</p>
          <div className="flex gap-3 justify-center">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <DifficultyCard key={d} d={d} selected={selected === d} onClick={() => setSelected(d)} />
            ))}
          </div>
        </div>

        <button
          onClick={() => { sounds.initialize(); onStart(selected); }}
          className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-4 rounded-full flex items-center justify-center gap-2 text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#ccff00]/20 cursor-pointer pointer-events-auto"
        >
          Start Game <ArrowRight size={20} />
        </button>

        <p className="text-zinc-700 text-[10px] text-center leading-5">
          Needs webcam + hand tracking (MediaPipe)<br />
          Best on Chrome / Edge desktop
        </p>
      </div>
    </div>
  );
};

// --- APP ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  if (!started) return <MenuScreen onStart={(d) => { setDifficulty(d); setStarted(true); }} />;

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
      <div className="absolute top-4 left-0 right-0 text-center z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-widest text-[#ccff00] uppercase">Snapzzle</h1>
        <p className="text-zinc-600 text-xs mt-1">{GRID[difficulty].desc}</p>
      </div>
      <div className="relative w-[95vw] h-[85vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <GestureCamera cols={GRID[difficulty].cols} rows={GRID[difficulty].rows} difficulty={difficulty} onMenu={() => setStarted(false)} />
      </div>
    </div>
  );
}
