import React from 'react';
import { neo } from '../constants';
import type { GameState } from '../types';

interface Props { state: GameState; }

const InstructionsPanel: React.FC<Props> = ({ state }) => {
  const map: Record<GameState, React.ReactNode> = {
    SCANNING: (
      <>
        <p className="font-black text-[#ff0033] mb-1.5 uppercase tracking-wide">Phase 1: Capture</p>
        <p>Form a frame with both hands</p>
        <p>Pinch both to snap</p>
      </>
    ),
    PLAYING: (
      <>
        <p className="font-black text-[#ff0033] mb-1.5 uppercase tracking-wide">Phase 2: Solve</p>
        <p>Pinch &amp; drag to swap tiles</p>
        <p className="text-black/40 mt-1.5">Hold fist to reset</p>
      </>
    ),
    SOLVED:      <p className="font-black text-[#ff0033] uppercase">Puzzle Solved!</p>,
    LEADERBOARD: <p className="font-black text-[#ff0033] uppercase">Top Players</p>,
  };

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div className={`text-[10px] text-black/70 bg-white px-3 py-2.5 rounded-xl ${neo} text-right leading-[1.8] font-medium`}>
        {map[state]}
      </div>
    </div>
  );
};

export default InstructionsPanel;
