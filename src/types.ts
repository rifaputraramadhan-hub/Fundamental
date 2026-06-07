export type GameMode = 'easy' | 'normal' | 'hard';

export type GameState = 
  | 'intro'
  | 'countdown' // 10s thinking time
  | 'waiting_entry' // 5s after clicking buy/sell
  | 'waiting_news' // 5s showing entry lines before news hits
  | 'drama' // Chart goes crazy
  | 'result' // Show profits/loss
  | 'gameover'
  | 'win';

export type UserAction = 'buy' | 'sell' | 'none';

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface NewsEvent {
  id: string;
  name: string; // e.g., NFP, CPI
  time: string; // e.g., 19:30 or 02:00
  explanation: string;
  previous: string;
  forecast: string;
  actualUp: string; // The value if it's better than expected (USD Strong)
  actualDown: string; // The value if it's worse than expected (USD Weak)
  explanationUp: string;
  explanationDown: string;
}
