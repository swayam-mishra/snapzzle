export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'SCANNING' | 'PLAYING' | 'SOLVED' | 'LEADERBOARD';

export interface Tile {
  id: number;
  origX: number;
  origY: number;
}

export interface DragInfo {
  index: number;
  x: number;
  y: number;
}

export interface BoardCoords {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LeaderboardEntry {
  id?: string;
  name: string;
  time: number;
  difficulty: string;
  date: number;
}