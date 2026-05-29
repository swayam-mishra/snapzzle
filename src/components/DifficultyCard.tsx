import React from 'react';
import { Zap, Target, Flame } from 'lucide-react';
import { CLR_YELLOW, CLR_RED, CLR_BLUE, GRID, neoHover, neoActive } from '../constants';
import type { Difficulty } from '../types';

interface Props {
  d: Difficulty;
  selected: boolean;
  onClick: () => void;
}

const COLORS: Record<Difficulty, { bg: string; tint: string; shadow: string; text: string }> = {
  easy:   { bg: CLR_YELLOW, tint: '#fffde5', shadow: CLR_YELLOW, text: '#000' },
  medium: { bg: CLR_BLUE,   tint: '#e5edff', shadow: CLR_BLUE,   text: '#fff' },
  hard:   { bg: CLR_RED,    tint: '#ffe5eb', shadow: CLR_RED,    text: '#fff' },
};

const ICONS: Record<Difficulty, React.ElementType> = {
  easy: Zap,
  medium: Target,
  hard: Flame,
};

const DifficultyCard: React.FC<Props> = ({ d, selected, onClick }) => {
  const cfg = GRID[d];
  const { bg, tint, shadow, text } = COLORS[d];
  const Icon = ICONS[d];

  const cardStyle = selected
    ? { background: bg,   boxShadow: '4px 4px 0px 0px #000', border: '3px solid #000' }
    : { background: tint, boxShadow: `4px 4px 0px 0px ${shadow}`, border: `3px solid ${shadow}` };

  const dotBg = selected
    ? (bg === CLR_YELLOW ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)')
    : `${shadow}55`;

  return (
    <button
      onClick={onClick}
      style={cardStyle}
      className={`flex flex-col items-center gap-3 p-5 rounded-xl w-32 ${neoHover} ${neoActive} transition-all duration-75 cursor-pointer pointer-events-auto`}
    >
      <Icon className="w-5 h-5" style={{ color: selected ? text : shadow }} />
      <div className="text-center">
        <p className="font-black text-sm" style={{ color: selected ? text : '#000' }}>{cfg.label}</p>
        <p className="text-[11px] font-bold opacity-60" style={{ color: selected ? text : '#000' }}>{cfg.desc}</p>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}>
        {Array.from({ length: cfg.cols * cfg.rows }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-sm" style={{ background: dotBg }} />
        ))}
      </div>
    </button>
  );
};

export default DifficultyCard;
