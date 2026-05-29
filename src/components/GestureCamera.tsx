import React, { useRef, useState, useCallback, useEffect } from 'react';
import { HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { ListOrdered, Hand, RotateCcw, Loader2 } from 'lucide-react';
import {
  CLR_PRIMARY, CLR_ACCENT, CLR_BG, CLR_SURFACE, CLR_TEXT, CLR_TEXT_MUTED,
  CANVAS_ACCENT, CANVAS_CURSOR, CANVAS_BOARD,
  GRID, PINCH_THRESHOLD, FRAME_THRESHOLD, RESET_DWELL_MS, DROP_FRAMES,
  neo, neoBtn,
} from '../constants';
import { db, LEADERBOARD_ENABLED } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { renderBoard, drawBrackets } from '../lib/canvas';
import { captureFrame, generateTiles, isSolved } from '../utils/puzzle';
import { sounds } from '../sounds';
import { useCamera } from '../hooks/useCamera';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { useGameTimer } from '../hooks/useGameTimer';
import { useLeaderboard } from '../hooks/useLeaderboard';
import TimerDisplay from './TimerDisplay';
import InstructionsPanel from './InstructionsPanel';
import SolvedOverlay from './SolvedOverlay';
import LeaderboardScreen from './LeaderboardScreen';
import type { Tile, BoardCoords, Difficulty, GameState } from '../types';

interface Props {
  cols: number;
  rows: number;
  difficulty: Difficulty;
  onMenu: () => void;
}

const GestureCamera: React.FC<Props> = ({ cols, rows, difficulty, onMenu }) => {
  const [gameState, setGameState] = useState<GameState>('SCANNING');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('lp-name') ?? '');
  const [personalBest, setPersonalBest] = useState<number | null>(() => {
    const v = localStorage.getItem(`lp-best-${difficulty}`); return v ? parseInt(v, 10) : null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { videoRef, cameraReady, error: cameraError } = useCamera();
  const { hlRef, modelLoaded, error: modelError } = useHandLandmarker();
  const { timeElapsed, setTimeElapsed } = useGameTimer(gameState);
  const { leaderboard, isConnected } = useLeaderboard();

  const error = cameraError ?? modelError;

  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const releaseFramesRef = useRef(0);

  const resetGame = useCallback(() => {
    setGameState('SCANNING');
    setTimeElapsed(0);
    setIsSubmitting(false);
    tilesRef.current = [];
    dragRef.current = { on: false, idx: null };
    boardRef.current = null;
    fistRef.current = null;
    releaseFramesRef.current = 0;
  }, [setTimeElapsed]);

  const submitScore = useCallback(async () => {
    if (!playerName.trim() || isSubmitting || !db) return;
    setIsSubmitting(true);
    const name = playerName.trim().toUpperCase();
    localStorage.setItem('lp-name', name);
    if (personalBest === null || timeElapsed < personalBest) {
      setPersonalBest(timeElapsed);
      localStorage.setItem(`lp-best-${difficulty}`, String(timeElapsed));
    }
    try {
      await addDoc(collection(db, 'leaderboard'), {
        name, time: timeElapsed, difficulty, date: Date.now(),
      });
      setGameState('LEADERBOARD');
    } catch { alert('Could not save score.'); }
    finally { setIsSubmitting(false); }
  }, [playerName, isSubmitting, personalBest, timeElapsed, difficulty]);

  // ── RENDER LOOP ──────────────────────────────────────────────
  const renderLoop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderLoop); return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
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

    // ── SCANNING / LEADERBOARD ─────────────────────────────────
    if (gameState === 'SCANNING' || gameState === 'LEADERBOARD') {
      drawBg();
      if (gameState === 'SCANNING' && results?.landmarks?.length !== 2) {
        lastFrameRef.current = null;
      }
      if (gameState === 'SCANNING' && results?.landmarks?.length === 2) {
        const [h1, h2] = results.landmarks;
        const d1 = Math.hypot(h1[8].x - h1[4].x, h1[8].y - h1[4].y);
        const d2 = Math.hypot(h2[8].x - h2[4].x, h2[8].y - h2[4].y);
        const framing = d1 > FRAME_THRESHOLD && d2 > FRAME_THRESHOLD;

        if (framing) {
          const ax = [h1[8].x, h1[4].x, h2[8].x, h2[4].x];
          const ay = [h1[8].y, h1[4].y, h2[8].y, h2[4].y];
          lastFrameRef.current = {
            minX: Math.min(...ax), maxX: Math.max(...ax),
            minY: Math.min(...ay), maxY: Math.max(...ay),
          };
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
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(0, 0, W, fy); ctx.fillRect(0, fy + fh, W, H - fy - fh);
          ctx.fillRect(0, fy, fx, fh); ctx.fillRect(fx + fw, fy, W - fx - fw, fh);
          drawBrackets(ctx, fx, fy, fw, fh, CANVAS_ACCENT, 28, 4);
          ctx.save();
          ctx.font = 'bold 11px monospace';
          const labelW = ctx.measureText('PINCH TO CAPTURE').width + 16;
          ctx.fillStyle = CANVAS_ACCENT;
          ctx.fillRect(fx, fy - 24, labelW, 20);
          ctx.fillStyle = '#11071d';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText('PINCH TO CAPTURE', fx + 8, fy - 14);
          ctx.restore();
        }
      }
    }

    // ── PLAYING / SOLVED ───────────────────────────────────────
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
          fistRef.current = null;
          releaseFramesRef.current = 0;
          if (!dragRef.current.on && hover !== null) {
            dragRef.current = { on: true, idx: hover };
            sounds.pick();
          }
        } else if (dragRef.current.on) {
          releaseFramesRef.current++;
          if (releaseFramesRef.current >= DROP_FRAMES) {
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
        dragRef.current.on && dragRef.current.idx !== null
          ? { index: dragRef.current.idx, x: rx, y: ry } : null,
        hover,
      );
      const solved = gameState === 'SOLVED';
      ctx.shadowColor = solved ? CANVAS_CURSOR : 'transparent';
      ctx.shadowBlur = solved ? 20 : 0;
      ctx.strokeStyle = solved ? CANVAS_CURSOR : CANVAS_BOARD;
      ctx.lineWidth = solved ? 4 : 3;
      ctx.strokeRect(1, 1, bw - 2, bh - 2);
      ctx.restore();

      // Cursor
      if (results?.landmarks?.length) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        if (dragRef.current.on) {
          ctx.fillStyle = CANVAS_CURSOR; ctx.fill();
        } else {
          ctx.strokeStyle = CANVAS_CURSOR; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.strokeStyle = `${CANVAS_CURSOR}70`; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 11, cy);
          ctx.moveTo(cx + 11, cy); ctx.lineTo(cx + 15, cy);
          ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 11);
          ctx.moveTo(cx, cy + 11); ctx.lineTo(cx, cy + 15);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Fist → reset (disabled while pinching)
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
          ctx.beginPath(); ctx.arc(fcx, fcy, 44, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath();
          ctx.arc(fcx, fcy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
          ctx.strokeStyle = CANVAS_ACCENT; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
          ctx.fillStyle = 'white'; ctx.font = 'bold 13px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('RESET', fcx, fcy - 6);
          ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillText('hold fist', fcx, fcy + 10);
          ctx.restore();
          if (p >= 1) resetGame();
        } else { fistRef.current = null; }
      }
    }

    // ── HAND SKELETON ──────────────────────────────────────────
    if (results?.landmarks && duRef.current && gameState !== 'LEADERBOARD') {
      for (const lm of results.landmarks) {
        ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
        duRef.current.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.4)', lineWidth: 2 });
        duRef.current.drawLandmarks(lm, { color: 'rgba(255,255,255,0.65)', radius: 2.5, lineWidth: 1 });
        ctx.restore();
      }
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [cameraReady, modelLoaded, gameState, cols, rows, resetGame, videoRef, hlRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [renderLoop]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{ background: CLR_SURFACE }}>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {gameState === 'PLAYING' && <TimerDisplay time={timeElapsed} />}

      {/* Scanning controls */}
      {gameState === 'SCANNING' && (
        <div className="absolute top-5 left-5 z-30 flex gap-2">
          <button
            onClick={onMenu}
            className={`font-black text-xs uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 pointer-events-auto ${neoBtn}`}
            style={{ background: CLR_SURFACE, color: CLR_TEXT }}
          >
            ← Difficulty
          </button>
          {LEADERBOARD_ENABLED && (
            <button
              onClick={() => setGameState('LEADERBOARD')}
              className={`font-black text-xs uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 pointer-events-auto ${neoBtn}`}
              style={{ background: CLR_ACCENT, color: CLR_BG }}
            >
              <ListOrdered className="w-3.5 h-3.5" /> Scores
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
          <button
            onClick={resetGame}
            title="Reset"
            className={`absolute bottom-5 left-5 z-20 p-3 rounded-xl pointer-events-auto ${neoBtn}`}
            style={{ background: CLR_SURFACE, color: CLR_TEXT }}
          >
            <RotateCcw size={18} />
          </button>
          <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider pointer-events-none opacity-40" style={{ color: CLR_TEXT }}>
            <Hand className="w-3.5 h-3.5" /><span>Pinch to grab</span>
          </div>
        </>
      )}

      {/* Loading / error */}
      {!cameraReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4" style={{ background: CLR_BG }}>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: CLR_ACCENT }} />
          <p className="text-xs tracking-widest uppercase font-black opacity-50" style={{ color: CLR_TEXT }}>Starting Camera</p>
        </div>
      )}
      {cameraReady && !modelLoaded && !error && (
        <div
          className={`absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl ${neo} font-black text-[10px] uppercase tracking-widest`}
          style={{ background: CLR_ACCENT, color: CLR_BG }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading AI Model
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 p-8 text-center gap-4" style={{ background: CLR_BG }}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${neo}`} style={{ background: CLR_PRIMARY }}>
            <span className="text-white text-2xl font-black">!</span>
          </div>
          <p className="font-black text-lg" style={{ color: CLR_TEXT }}>Something went wrong</p>
          <p className="text-sm font-medium" style={{ color: CLR_TEXT_MUTED }}>{error}</p>
        </div>
      )}
    </div>
  );
};

export default GestureCamera;
