import React, { useState } from 'react';
import { ArrowRight, Sun, Moon } from 'lucide-react';
import { CLR_PRIMARY, CLR_ACCENT, CLR_BG, CLR_SURFACE, CLR_TEXT, CLR_TEXT_MUTED, neoBtn, neo } from '../constants';
import { sounds } from '../sounds';
import DifficultyCard from './DifficultyCard';
import type { Difficulty } from '../types';
import type { Theme } from '../hooks/useTheme';

interface Props {
  onStart: (d: Difficulty) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const MenuScreen: React.FC<Props> = ({ onStart, theme, onToggleTheme }) => {
  const [selected, setSelected] = useState<Difficulty>('easy');

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center relative" style={{ background: CLR_BG }}>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`absolute top-5 right-5 p-2.5 rounded-xl ${neoBtn}`}
        style={{ background: CLR_SURFACE, color: CLR_TEXT }}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">

        {/* Logo */}
        <div className="text-center">
          <div
            className={`inline-block px-6 py-3 rounded-2xl mb-4 ${neo}`}
            style={{ background: CLR_ACCENT, boxShadow: '5px 5px 0px 0px var(--clr-border)', color: CLR_BG }}
          >
            <h1 className="text-5xl font-black uppercase tracking-tight">Snapzzle</h1>
          </div>
          <p className="font-bold" style={{ color: CLR_TEXT_MUTED, fontSize: '12px', letterSpacing: '0.05em' }}>
            Frame it · Snap it · Solve it
          </p>
        </div>

        {/* Difficulty picker */}
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: CLR_TEXT_MUTED }}>
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
          className={`w-full font-black py-4 rounded-lg flex items-center justify-center gap-2 text-lg uppercase tracking-wide pointer-events-auto ${neoBtn}`}
          style={{ background: CLR_PRIMARY, color: '#fff' }}
        >
          Start Game <ArrowRight size={20} />
        </button>

        <p className="font-bold text-center leading-6" style={{ fontSize: '11px', color: CLR_TEXT_MUTED }}>
          Needs webcam + hand tracking<br />
          <span style={{ opacity: 0.5 }}>Best on Chrome / Edge desktop</span>
        </p>

      </div>
    </div>
  );
};

export default MenuScreen;
