import React from 'react';
import { ListOrdered, Wifi, WifiOff, Loader2, Star, RotateCcw } from 'lucide-react';
import { CLR_YELLOW, CLR_RED, CLR_BLUE, BG_DEEP, neo, neoBtn } from '../constants';
import { fmt } from '../utils/puzzle';
import type { LeaderboardEntry } from '../types';

interface Props {
  leaderboard: LeaderboardEntry[];
  personalBest: number | null;
  playerName: string;
  isConnected: boolean;
  onBack: () => void;
}

const LeaderboardScreen: React.FC<Props> = ({
  leaderboard, personalBest, playerName, isConnected, onBack,
}) => {
  const rowStyle = (i: number, name: string) => {
    if (name === playerName) return { background: CLR_YELLOW, color: '#000' };
    if (i === 0) return { background: CLR_YELLOW, color: '#000' };
    if (i === 1) return { background: CLR_BLUE,   color: '#fff' };
    if (i === 2) return { background: CLR_RED,    color: '#fff' };
    return { background: '#fff', color: '#000' };
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{ background: `${BG_DEEP}f5` }}>
      <div className="w-full max-w-md px-5 py-4 flex flex-col h-full max-h-[88vh]">

        {/* Header */}
        <div className={`flex items-center justify-between mb-4 bg-white rounded-xl px-4 py-3 shrink-0 ${neo}`}>
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-5 h-5" style={{ color: CLR_RED }} />
            <h2 className="text-lg font-black text-black uppercase tracking-tight">Leaderboard</h2>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-[2px] border-black text-[10px] font-black uppercase`}
            style={{ background: isConnected ? CLR_YELLOW : '#fff', color: '#000', opacity: isConnected ? 1 : 0.4 }}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 min-h-0 overflow-y-auto rounded-xl mb-4 custom-scrollbar bg-white ${neo}`}>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-black/40 text-sm font-bold">
              {isConnected ? (
                <p>No records yet.<br />Be the first!</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: CLR_RED }} />
                  <span>Connecting…</span>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y-[2px] divide-black">
              <div className="flex items-center px-4 py-2 bg-black text-[9px] font-black uppercase tracking-widest sticky top-0" style={{ color: CLR_YELLOW }}>
                <span className="w-10">Rank</span>
                <span className="flex-1">Player</span>
                <span className="w-14 text-center">Mode</span>
                <span className="w-14 text-right">Time</span>
              </div>
              {leaderboard.map((e, i) => (
                <div
                  key={e.id ?? i}
                  className="flex items-center px-4 py-3 text-sm border-b-[2px] border-black last:border-b-0 font-bold"
                  style={rowStyle(i, e.name)}
                >
                  <span className="font-black w-10 text-xs font-mono">#{i + 1}</span>
                  <span className="flex-1 font-black">{e.name}</span>
                  <span className="w-14 text-center text-[9px] uppercase opacity-60">{e.difficulty ?? '—'}</span>
                  <span className="font-black font-mono w-14 text-right">{fmt(e.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal best */}
        {personalBest !== null && (
          <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between shrink-0 ${neo}`} style={{ background: CLR_YELLOW }}>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-black" fill="currentColor" />
              <span className="text-xs font-black text-black uppercase tracking-wider">Your Best</span>
            </div>
            <span className="font-black font-mono text-xl text-black">{fmt(personalBest)}</span>
          </div>
        )}

        <button
          onClick={onBack}
          className={`w-full text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shrink-0 ${neoBtn}`}
          style={{ background: CLR_RED }}
        >
          <RotateCcw size={16} /> Back to Game
        </button>

      </div>
    </div>
  );
};

export default LeaderboardScreen;
