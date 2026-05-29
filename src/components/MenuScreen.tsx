import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CLR_RED, CLR_YELLOW, BG_DEEP, neoBtn } from '../constants';
import { sounds } from '../sounds';
import DifficultyCard from './DifficultyCard';
import type { Difficulty } from '../types';

interface Props {
  onStart: (d: Difficulty) => void;
}

const MenuScreen: React.FC<Props> = ({ onStart }) => {
  const [selected, setSelected] = useState<Difficulty>('easy');

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center"
      style={{ background: BG_DEEP, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800;900&display=swap');
      `}</style>

      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">

        {/* Logo */}
        <div className="text-center">
          <div
            className="inline-block px-6 py-3 rounded-2xl mb-4"
            style={{ background: CLR_YELLOW, border: '3px solid #000', boxShadow: '5px 5px 0px 0px rgba(255,255,255,0.25)' }}
          >
            <h1 className="text-5xl font-black text-black uppercase tracking-tight">Snapzzle</h1>
          </div>
          <p className="font-bold" style={{ color: '#527cad', fontSize: '12px', letterSpacing: '0.05em' }}>
            Frame it · Snap it · Solve it
          </p>
        </div>

        {/* Difficulty picker */}
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#527cad' }}>
            Select Difficulty
          </p>
          <div className="flex gap-3 justify-center">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <DifficultyCard key={d} d={d} selected={selected === d} onClick={() => setSelected(d)} />
            ))}
          </div>
        </div>

        {/* Start */}
        <button
          onClick={() => { sounds.initialize(); onStart(selected); }}
          className={`w-full text-white font-black py-4 rounded-lg flex items-center justify-center gap-2 text-lg uppercase tracking-wide pointer-events-auto ${neoBtn}`}
          style={{ background: CLR_RED }}
        >
          Start Game <ArrowRight size={20} />
        </button>

        <p className="font-bold text-center leading-6" style={{ fontSize: '11px' }}>
          <span style={{ color: '#314b68' }}>Needs webcam + hand tracking</span><br />
          <span style={{ color: '#213245' }}>Best on Chrome / Edge desktop</span>
        </p>

      </div>
    </div>
  );
};

export default MenuScreen;
