import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { CLR_ACCENT, CLR_BG, CLR_SURFACE, CLR_TEXT, GRID, neo, neoBtn } from './constants';
import { useTheme } from './hooks/useTheme';
import MenuScreen from './components/MenuScreen';
import GestureCamera from './components/GestureCamera';
import type { Difficulty } from './types';

export default function App() {
  const { theme, toggle } = useTheme();
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  if (!started) {
    return (
      <MenuScreen
        onStart={(d) => { setDifficulty(d); setStarted(true); }}
        theme={theme}
        onToggleTheme={toggle}
      />
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center" style={{ background: CLR_BG }}>

      {/* Top bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center z-10 pointer-events-none">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl ${neo}`} style={{ background: CLR_ACCENT, color: CLR_BG }}>
          <span className="font-black text-sm uppercase tracking-tight">Snapzzle</span>
          <span className="font-bold text-xs opacity-60">{GRID[difficulty].desc}</span>
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className={`absolute top-4 right-5 z-20 p-2.5 rounded-xl pointer-events-auto ${neoBtn}`}
        style={{ background: CLR_SURFACE, color: CLR_TEXT }}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Game frame */}
      <div
        className="relative w-[95vw] h-[85vh] overflow-hidden rounded-2xl"
        style={{ border: '3px solid var(--clr-border)', boxShadow: '8px 8px 0px 0px var(--clr-shadow)' }}
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
