import { useState } from 'react';
import { CLR_YELLOW, BG_DEEP, GRID, neo } from './constants';
import MenuScreen from './components/MenuScreen';
import GestureCamera from './components/GestureCamera';
import type { Difficulty } from './types';

export default function App() {
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  if (!started) {
    return <MenuScreen onStart={(d) => { setDifficulty(d); setStarted(true); }} />;
  }

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center"
      style={{ background: BG_DEEP, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.35); }
      `}</style>

      {/* Top bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10 pointer-events-none">
        <div className={`inline-flex items-center gap-2 text-black px-4 py-1.5 rounded-xl ${neo}`} style={{ background: CLR_YELLOW }}>
          <span className="font-black text-sm uppercase tracking-tight">Snapzzle</span>
          <span className="font-bold text-xs opacity-60">{GRID[difficulty].desc}</span>
        </div>
      </div>

      {/* Game frame */}
      <div
        className="relative w-[95vw] h-[85vh] overflow-hidden rounded-2xl"
        style={{ border: '3px solid #000', boxShadow: '8px 8px 0px 0px #000000' }}
      >
        <GestureCamera
          cols={GRID[difficulty].cols}
          rows={GRID[difficulty].rows}
          difficulty={difficulty}
          onMenu={() => setStarted(false)}
        />
      </div>
    </div>
  );
}
