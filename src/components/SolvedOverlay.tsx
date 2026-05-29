import React from 'react';
import { Trophy, Timer, User, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { CLR_PRIMARY, CLR_ACCENT, CLR_BG, CLR_SURFACE, CLR_TEXT, CLR_TEXT_MUTED, GRID, neo, neoBtn } from '../constants';
import { LEADERBOARD_ENABLED } from '../lib/firebase';
import { fmt } from '../utils/puzzle';
import type { Difficulty } from '../types';

interface Props {
  time: number;
  difficulty: Difficulty;
  playerName: string;
  isSubmitting: boolean;
  onNameChange: (n: string) => void;
  onSubmit: () => void;
  onPlayAgain: () => void;
  onMenu: () => void;
}

const SolvedOverlay: React.FC<Props> = ({
  time, difficulty, playerName, isSubmitting,
  onNameChange, onSubmit, onPlayAgain, onMenu,
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{ background: `color-mix(in srgb, var(--clr-bg) 94%, transparent)`, backdropFilter: 'blur(4px)' }}>
    <Trophy className="w-16 h-16 mb-4" strokeWidth={1.5} style={{ color: CLR_ACCENT }} />
    <h2 className="text-5xl font-black uppercase tracking-tight mb-3" style={{ color: CLR_TEXT }}>Complete!</h2>

    <div className={`flex items-center gap-3 px-6 py-3 rounded-xl ${neo} mb-2`} style={{ background: CLR_ACCENT, color: CLR_BG }}>
      <Timer className="w-5 h-5" />
      <span className="text-3xl font-black font-mono tracking-wider">{fmt(time)}</span>
    </div>
    <p className="text-xs uppercase tracking-widest font-bold mb-8" style={{ color: CLR_TEXT_MUTED }}>
      {GRID[difficulty].desc}
    </p>

    {LEADERBOARD_ENABLED && (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs px-6 mb-6">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: CLR_TEXT_MUTED }}>
          Submit to leaderboard
        </p>
        <div className={`relative w-full rounded-xl ${neo}`} style={{ background: CLR_SURFACE }}>
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" style={{ color: CLR_TEXT }} />
          <input
            type="text"
            placeholder="YOUR NAME"
            maxLength={10}
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            autoFocus
            className="w-full bg-transparent text-center text-lg outline-none py-3 pl-8 pr-3 font-black uppercase placeholder:opacity-20 pointer-events-auto"
            style={{ color: CLR_TEXT }}
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={!playerName.trim() || isSubmitting}
          className={`w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 pointer-events-auto disabled:opacity-40 disabled:cursor-not-allowed ${neoBtn}`}
          style={{ background: CLR_PRIMARY, color: '#fff' }}
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><ArrowRight size={18} /> Submit</>}
        </button>
      </div>
    )}

    <div className="flex gap-3">
      <button
        onClick={onPlayAgain}
        className={`font-black py-3 px-6 rounded-xl flex items-center gap-2 pointer-events-auto ${neoBtn}`}
        style={{ background: CLR_PRIMARY, color: '#fff' }}
      >
        <RotateCcw size={16} /> Play Again
      </button>
      <button
        onClick={onMenu}
        className={`font-bold py-3 px-6 rounded-xl flex items-center gap-2 pointer-events-auto ${neoBtn}`}
        style={{ background: CLR_SURFACE, color: CLR_TEXT }}
      >
        Change Mode
      </button>
    </div>
  </div>
);

export default SolvedOverlay;
