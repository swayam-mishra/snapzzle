import React from 'react';
import { Trophy, Timer, User, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { CLR_YELLOW, CLR_RED, BG_DEEP, GRID, neo, neoBtn } from '../constants';
import { LEADERBOARD_ENABLED } from '../lib/supabase';
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
  <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{ background: `${BG_DEEP}f0` }}>
    <Trophy className="w-16 h-16 text-[#ffea00] mb-4" strokeWidth={1.5} />
    <h2 className="text-5xl font-black text-white uppercase tracking-tight mb-3">Complete!</h2>

    <div className={`flex items-center gap-3 text-black px-6 py-3 rounded-xl ${neo} mb-2`} style={{ background: CLR_YELLOW }}>
      <Timer className="w-5 h-5" />
      <span className="text-3xl font-black font-mono tracking-wider">{fmt(time)}</span>
    </div>
    <p className="text-[#527cad] text-xs uppercase tracking-widest font-bold mb-8">{GRID[difficulty].desc}</p>

    {LEADERBOARD_ENABLED && (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs px-6 mb-6">
        <p className="text-[#527cad] text-[10px] uppercase tracking-widest font-bold">Submit to leaderboard</p>
        <div className={`flex items-center gap-0 w-full bg-white rounded-xl overflow-hidden ${neo}`}>
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30" />
            <input
              type="text"
              placeholder="YOUR NAME"
              maxLength={10}
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              autoFocus
              className="w-full bg-transparent text-black text-center text-lg outline-none py-3 pl-8 pr-3 font-black uppercase placeholder:text-black/20 pointer-events-auto"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={!playerName.trim() || isSubmitting}
            className="text-white p-3 transition-colors pointer-events-auto border-l-[3px] border-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: CLR_RED }}
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    )}

    <div className="flex gap-3">
      <button
        onClick={onPlayAgain}
        className={`text-white font-black py-3 px-6 rounded-xl flex items-center gap-2 pointer-events-auto ${neoBtn}`}
        style={{ background: CLR_RED }}
      >
        <RotateCcw size={16} /> Play Again
      </button>
      <button
        onClick={onMenu}
        className={`bg-white text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 pointer-events-auto ${neoBtn}`}
      >
        Change Mode
      </button>
    </div>
  </div>
);

export default SolvedOverlay;
