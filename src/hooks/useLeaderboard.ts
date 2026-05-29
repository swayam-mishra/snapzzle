import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot, type QuerySnapshot,
} from 'firebase/firestore';
import { db, LEADERBOARD_ENABLED } from '../lib/firebase';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('lp-lb') ?? '[]'); } catch { return []; }
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!LEADERBOARD_ENABLED || !db) return;
    setIsConnected(false);

    const q = query(
      collection(db, 'leaderboard'),
      orderBy('time', 'asc'),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot) => {
        setIsConnected(true);
        const scores = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeaderboardEntry));
        setLeaderboard(scores);
        localStorage.setItem('lp-lb', JSON.stringify(scores));
      },
      () => setIsConnected(false),
    );

    return unsub;
  }, []);

  return { leaderboard, isConnected };
}
