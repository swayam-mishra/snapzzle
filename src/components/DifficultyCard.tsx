import React from 'react';
import { Zap, Target, Flame } from 'lucide-react';
import { GRID } from '../constants';
import type { Difficulty } from '../types';

interface Props {
  d: Difficulty;
  selected: boolean;
  onClick: () => void;
}

const COLORS: Record<Difficulty, { bg: string; tint: string; shadow: string }> = {
  easy:   { bg: '#7830cf', tint: 'var(--clr-easy-tint)',   shadow: '#7830cf' },
  medium: { bg: '#387bc7', tint: 'var(--clr-medium-tint)', shadow: '#387bc7' },
  hard:   { bg: '#7141be', tint: 'var(--clr-hard-tint)',   shadow: '#7141be' },
};

const ICONS: Record<Difficulty, React.ElementType> = {
  easy: Zap,
  medium: Target,
  hard: Flame,
};

const DifficultyCard: React.FC<Props> = ({ d, selected, onClick }) => {
  const cfg = GRID[d];
  const { bg, tint, shadow } = COLORS[d];
  const Icon = ICONS[d];

  const cardStyle = selected
    ? { background: bg,   boxShadow: '4px 4px 0px 0px var(--clr-border)', border: '3px solid var(--clr-border)' }
    : { background: tint, boxShadow: `4px 4px 0px 0px ${shadow}`, border: `3px solid ${shadow}` };

  const textColor = selected ? '#fff' : 'var(--clr-text)';
  const dotColor  = selected ? 'rgba(255,255,255,0.3)' : `${shadow}55`;
  const iconColor = selected ? '#fff' : shadow;

  return (
    <button
      onClick={onClick}
      style={cardStyle}
      className="flex flex-col items-center gap-3 p-5 rounded-xl w-32 neo-interactive"
    >
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
      <div className="text-center">
        <p className="font-black text-sm" style={{ color: textColor }}>{cfg.label}</p>
        <p className="text-[11px] font-bold opacity-60" style={{ color: textColor }}>{cfg.desc}</p>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}>
        {Array.from({ length: cfg.cols * cfg.rows }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-sm" style={{ background: dotColor }} />
        ))}
      </div>
    </button>
  );
};

export default DifficultyCard;
