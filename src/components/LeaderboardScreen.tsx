import React, { useState } from 'react';
import { ListOrdered, Wifi, WifiOff, Loader2, Star, RotateCcw } from 'lucide-react';
import { CLR_PRIMARY, CLR_SECONDARY, CLR_ACCENT, CLR_BG, CLR_SURFACE, CLR_TEXT, CLR_TEXT_MUTED, neo, neoBtn } from '../constants';
import { fmt } from '../utils/puzzle';
import type { Difficulty, LeaderboardEntry } from '../types';

interface Props {
  leaderboard: LeaderboardEntry[];
  personalBest: number | null;
  playerName: string;
  isConnected: boolean;
  onBack: () => void;
}

const RANK_COLORS = [CLR_ACCENT, CLR_SECONDARY, CLR_PRIMARY];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const LeaderboardScreen: React.FC<Props> = ({
  leaderboard, personalBest, playerName, isConnected, onBack,
}) => {
  const [filter, setFilter] = useState<Difficulty>('easy');
  const normalizedPlayer = playerName.trim().toUpperCase();
  const filtered = leaderboard.filter((e) => e.difficulty === filter);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{ background: `color-mix(in srgb, var(--clr-bg) 97%, transparent)`, backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md px-5 py-4 flex flex-col h-full max-h-[88vh]">

        {/* Header */}
        <div className={`flex items-center justify-between mb-4 rounded-xl px-4 py-3 shrink-0 ${neo}`} style={{ background: CLR_SURFACE }}>
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-5 h-5" style={{ color: CLR_PRIMARY }} />
            <h2 className="text-lg font-black uppercase tracking-tight" style={{ color: CLR_TEXT }}>Leaderboard</h2>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-[2px] text-[10px] font-black uppercase`}
            style={{
              background: isConnected ? CLR_ACCENT : CLR_SURFACE,
              color: isConnected ? CLR_BG : CLR_TEXT_MUTED,
              borderColor: 'var(--clr-border)',
            }}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Difficulty tabs */}
        <div className={`flex mb-3 rounded-xl overflow-hidden shrink-0 ${neo}`} style={{ background: CLR_SURFACE }}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
              style={{
                background: filter === d ? CLR_ACCENT : 'transparent',
                color: filter === d ? CLR_BG : CLR_TEXT_MUTED,
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* List */}
        <div className={`flex-1 min-h-0 overflow-y-auto rounded-xl mb-4 custom-scrollbar ${neo}`} style={{ background: CLR_SURFACE }}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold opacity-40" style={{ color: CLR_TEXT }}>
              {isConnected ? (
                <p>No {filter} records yet.<br />Be the first!</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: CLR_PRIMARY }} />
                  <span>Connecting…</span>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y-[2px]" style={{ borderColor: 'var(--clr-border)' }}>
              <div
                className="flex items-center px-4 py-2 text-[9px] font-black uppercase tracking-widest sticky top-0"
                style={{ background: 'var(--clr-border)', color: CLR_ACCENT }}
              >
                <span className="w-10">Rank</span>
                <span className="flex-1">Player</span>
                <span className="w-14 text-right">Time</span>
              </div>
              {filtered.map((e, i) => {
                const isPlayer = normalizedPlayer && e.name === normalizedPlayer;
                const rankBg = i < 3 ? RANK_COLORS[i] : undefined;
                return (
                  <div
                    key={e.id ?? i}
                    className="flex items-center px-4 py-3 text-sm font-bold border-b-[2px] last:border-b-0"
                    style={{
                      background: isPlayer ? CLR_ACCENT : rankBg ?? CLR_SURFACE,
                      color: (isPlayer || rankBg) ? CLR_BG : CLR_TEXT,
                      borderColor: 'var(--clr-border)',
                    }}
                  >
                    <span className="font-black w-10 text-xs font-mono">#{i + 1}</span>
                    <span className="flex-1 font-black">{e.name}</span>
                    <span className="font-black font-mono w-14 text-right">{fmt(e.time)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal best */}
        {personalBest !== null && (
          <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between shrink-0 ${neo}`} style={{ background: CLR_ACCENT, color: CLR_BG }}>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" fill="currentColor" />
              <span className="text-xs font-black uppercase tracking-wider">Your Best</span>
            </div>
            <span className="font-black font-mono text-xl">{fmt(personalBest)}</span>
          </div>
        )}

        <button
          onClick={onBack}
          className={`w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 shrink-0 ${neoBtn}`}
          style={{ background: CLR_PRIMARY, color: '#fff' }}
        >
          <RotateCcw size={16} /> Back to Game
        </button>

      </div>
    </div>
  );
};

export default LeaderboardScreen;
