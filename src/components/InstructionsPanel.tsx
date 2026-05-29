import React from 'react';
import { CLR_SURFACE, CLR_TEXT, CLR_PRIMARY, neo } from '../constants';
import type { GameState } from '../types';

interface Props { state: GameState; }

const InstructionsPanel: React.FC<Props> = ({ state }) => {
  const map: Record<GameState, React.ReactNode> = {
    SCANNING: (
      <>
        <p className="font-black mb-1.5 uppercase tracking-wide" style={{ color: CLR_PRIMARY }}>Phase 1: Capture</p>
        <p>Form a frame with both hands</p>
        <p>Pinch both to snap</p>
      </>
    ),
    PLAYING: (
      <>
        <p className="font-black mb-1.5 uppercase tracking-wide" style={{ color: CLR_PRIMARY }}>Phase 2: Solve</p>
        <p>Pinch &amp; drag to swap tiles</p>
        <p className="mt-1.5 opacity-40">Hold fist to reset</p>
      </>
    ),
    SOLVED:      <p className="font-black uppercase" style={{ color: CLR_PRIMARY }}>Puzzle Solved!</p>,
    LEADERBOARD: <p className="font-black uppercase" style={{ color: CLR_PRIMARY }}>Top Players</p>,
  };

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div
        className={`text-[10px] px-3 py-2.5 rounded-xl ${neo} text-right leading-[1.8] font-medium`}
        style={{ background: CLR_SURFACE, color: CLR_TEXT }}
      >
        {map[state]}
      </div>
    </div>
  );
};

export default InstructionsPanel;
