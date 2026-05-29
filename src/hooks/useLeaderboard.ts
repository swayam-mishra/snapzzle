import { useEffect, useState } from 'react';
import { supabase, LEADERBOARD_ENABLED } from '../lib/supabase';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('lp-lb') ?? '[]'); } catch { return []; }
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!LEADERBOARD_ENABLED || !supabase) return;
    setIsConnected(false);

    const fetchScores = async () => {
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('*')
        .order('time', { ascending: true })
        .limit(50);
      if (error) { setIsConnected(false); return; }
      setIsConnected(true);
      setLeaderboard(data as LeaderboardEntry[]);
      localStorage.setItem('lp-lb', JSON.stringify(data));
    };

    fetchScores();

    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, fetchScores)
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    return () => { supabase!.removeChannel(channel); };
  }, []);

  return { leaderboard, isConnected };
}
