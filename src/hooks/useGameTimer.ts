import { useEffect, useState } from 'react';
import type { GameState } from '../types';

export function useGameTimer(gameState: GameState) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const t0 = Date.now();
    const id = window.setInterval(() => setTimeElapsed(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [gameState]);

  return { timeElapsed, setTimeElapsed };
}
