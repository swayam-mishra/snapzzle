import React from 'react';
import { Timer } from 'lucide-react';
import { CLR_ACCENT, CLR_BG, neo } from '../constants';
import { fmt } from '../utils/puzzle';

interface Props { time: number; }

const TimerDisplay: React.FC<Props> = ({ time }) => (
  <div
    className={`absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-xl ${neo} font-mono font-black`}
    style={{ background: CLR_ACCENT, color: CLR_BG }}
  >
    <Timer className="w-4 h-4" />
    <span className="text-lg tracking-wider">{fmt(time)}</span>
  </div>
);

export default TimerDisplay;
