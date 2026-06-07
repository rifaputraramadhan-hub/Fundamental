import React, { useState, useEffect, useRef } from 'react';
import { GameMode, GameState, UserAction, Candle, NewsEvent } from './types';
import { getRandomEvent } from './data';
import { Chart } from './components/Chart';
import { sysAudio } from './utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, CheckCircle, XCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const INITIAL_BALANCE = 1000;
const PROFIT_PER_WIN = 3000;
const CUT_LOSS = 1000;
const WIN_TARGET = 10;
const STARTING_PRICE = 2000.00;

export default function App() {
  const [screen, setScreen] = useState<'intro' | 'game' | 'gameover' | 'win'>('intro');
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState<GameMode>('normal');
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [winCount, setWinCount] = useState(0);
  const [history, setHistory] = useState({ played: 0, wins: 0, tradesWon: 0, totalTrades: 0 });
  const [marketSentiment, setMarketSentiment] = useState(50);

  // Game active state
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentNews, setCurrentNews] = useState<NewsEvent | null>(null);
  const [usedNewsIds, setUsedNewsIds] = useState<string[]>([]);
  const [userAction, setUserAction] = useState<UserAction>('none');
  const [countdown, setCountdown] = useState(10);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);

  // Chart data
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(STARTING_PRICE);
  const chartRef = useRef<NodeJS.Timeout | null>(null);

  // Helpers
  const isHard = mode === 'hard';

  // Make a small random change
  const generateWiggle = (price: number, volatility = 1.0) => {
    return price + (Math.random() - 0.5) * volatility;
  };

  const initChart = () => {
    let p = Math.floor(Math.random() * 500) + 2000;
    const initialCandles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      const open = p;
      const close = generateWiggle(p, 5);
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      initialCandles.push({ open, high, low, close });
      p = close;
    }
    setChartData(initialCandles);
    setCurrentPrice(p);
  };

  const startGame = () => {
    sysAudio.init();
    sysAudio.playClick();
    sysAudio.startBGM(); // Start music when game begins
    setBalance(INITIAL_BALANCE);
    setWinCount(0);
    setUsedNewsIds([]);
    setMarketSentiment(50);
    setScreen('game');
    startNextRound(INITIAL_BALANCE, 0, []);
  };

  const startNextRound = (currentBal: number, currentWins: number, currentUsedIds: string[]) => {
    initChart();
    const nextEvent = getRandomEvent(mode, currentUsedIds);
    setCurrentNews(nextEvent);
    setUsedNewsIds([...currentUsedIds, nextEvent.id]);
    setUserAction('none');
    setEntryPrice(null);
    setGameState('countdown');
    setCountdown(10);
  };

  // Main Game Loop Timer
  useEffect(() => {
    if (screen !== 'game') return;

    if (gameState === 'countdown') {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    if (gameState === 'missed') {
      const timer = setTimeout(() => {
        startNextRound(balance, winCount, usedNewsIds);
      }, 800);
      return () => clearTimeout(timer);
    }

    if (gameState === 'waiting_entry') {
      const timer = setTimeout(() => {
        setGameState('waiting_news');
        // Record entry point exactly where chart is
        setEntryPrice(currentPrice);
        sysAudio.playTick();
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'waiting_news') {
      const timer = setTimeout(() => {
        setGameState('drama');
        sysAudio.playDrama();
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'drama') {
      // Data strength logic: 50% chance of Strong USD or Weak USD
      const usdStrength = Math.random() > 0.5 ? 'strong' : 'weak'; 
      // If USD is strong, XAU chart drops (down). If USD is weak, XAU chart rises (up).
      const chartDirection = usdStrength === 'strong' ? 'down' : 'up'; 
      
      let dramaTicks = 0;
      const maxDramaTicks = 20; // 2 seconds of fast movement
      
      const dramaInterval = setInterval(() => {
        dramaTicks++;
        setCurrentPrice((prev) => {
          // Drama Manipulation logic
          let modifier = 0;
          const isCorrectPrediction = (chartDirection === 'up' && userAction === 'buy') || 
                                      (chartDirection === 'down' && userAction === 'sell');
                                      
          if (dramaTicks < 5 && !isCorrectPrediction) {
            // Fake direction first (manipulation) ONLY if prediction is wrong
            modifier = chartDirection === 'down' ? 5 : -5;
          } else {
            // Real fast movement
            modifier = chartDirection === 'down' ? -15 : 15;
          }
          const move = generateWiggle(prev + modifier, 3);
          
          setChartData((data) => {
            const last = data[data.length - 1];
            // Stretch the current candle massively
            return [
              ...data.slice(0, -1),
              {
                ...last,
                high: Math.max(last.high, move),
                low: Math.min(last.low, move),
                close: move
              }
            ];
          });
          
          return move;
        });

        if (dramaTicks >= maxDramaTicks) {
          clearInterval(dramaInterval);
          resolveTrade(usdStrength);
        }
      }, 100);

      return () => clearInterval(dramaInterval);
    }

  }, [gameState, screen]);

  // Normal Chart Movement effect - fast updates for organic feel
  useEffect(() => {
    if (screen !== 'game' || gameState === 'drama') return;

    const moveTimer = setInterval(() => {
      setCurrentPrice((prev) => {
        const nextP = generateWiggle(prev, 1.5);
        setChartData((data) => {
          const isNewCandle = data.length % 8 === 0; // Create visually spaced candles
          const last = data[data.length - 1];
          if (!isNewCandle) {
             return [
                ...data.slice(0, -1),
                {
                   ...last,
                   high: Math.max(last.high, nextP),
                   low: Math.min(last.low, nextP),
                   close: nextP
                }
             ];
          } else {
             return [
               ...data,
               { open: prev, high: Math.max(prev, nextP), low: Math.min(prev, nextP), close: nextP }
             ];
          }
        });
        return nextP;
      });
    }, 500);

    return () => clearInterval(moveTimer);
  }, [screen, gameState]);

  // Handle countdown ticks and zeroes
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown <= 0) {
        handleMissedTrade();
      } else if (countdown <= 3) {
        sysAudio.playTick();
      }
    }
  }, [countdown, gameState]);

  const handleAction = (action: UserAction) => {
    if (gameState !== 'countdown') return;
    sysAudio.playClick();
    setUserAction(action);
    setGameState('waiting_entry');
  };

  const handleMissedTrade = () => {
    sysAudio.playLose();
    setGameState('missed');
  };

  const resolveTrade = (usdStrength: 'strong' | 'weak') => {
    // Action Buy XAU => expects Weak USD (chart goes UP).
    // Action Sell XAU => expects Strong USD (chart goes DOWN).
    const isWin = (usdStrength === 'weak' && userAction === 'buy') || 
                  (usdStrength === 'strong' && userAction === 'sell');

    let newBalance = balance;
    let newWins = winCount;
    let isMC = false;

    // Update sentiment meter
    setMarketSentiment(prev => {
      const change = usdStrength === 'weak' ? 20 : -20;
      return Math.max(0, Math.min(100, prev + change));
    });

    if (isWin) {
      sysAudio.playWin();
      newBalance += PROFIT_PER_WIN;
      newWins += 1;
      setHistory(h => ({ ...h, tradesWon: h.tradesWon + 1, totalTrades: h.totalTrades + 1 }));
    } else {
      sysAudio.playLose();
      setHistory(h => ({ ...h, totalTrades: h.totalTrades + 1 }));
      if (winCount === 0 || mode === 'hard') {
        newBalance = 0;
        isMC = true;
      } else {
        newBalance -= CUT_LOSS;
        if (newBalance <= 0) {
          isMC = true;
        }
      }
    }

    // Attach outcome details to current news object
    if (currentNews) {
       setCurrentNews({
         ...currentNews,
         actualUp: usdStrength === 'strong' ? currentNews.actualUp : '', 
         actualDown: usdStrength === 'weak' ? currentNews.actualDown : '',
         explanationUp: usdStrength === 'strong' ? currentNews.explanationUp : '',
         explanationDown: usdStrength === 'weak' ? currentNews.explanationDown : '',
       } as NewsEvent);
    }

    setBalance(newBalance);
    setWinCount(newWins);
    setGameState('result');
    
    // Auto continue after showing result, only if game is still going
    setTimeout(() => {
      if (newWins < WIN_TARGET && !isMC && newBalance > 0) {
        startNextRound(newBalance, newWins, usedNewsIds);
      }
    }, 6000);

    setTimeout(() => {
      if (newWins >= WIN_TARGET) {
        setHistory(h => ({ ...h, played: h.played + 1, wins: h.wins + 1 }));
        setScreen('win');
        sysAudio.stopBGM();
      } else if (isMC || newBalance <= 0) {
        setHistory(h => ({ ...h, played: h.played + 1 }));
        setScreen('gameover');
        sysAudio.stopBGM();
      }
    }, 1500);
  };

  // --- RENDERS ---

  if (screen === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#F3E5AB] relative overflow-hidden font-sans">
        {/* Animated grid background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen">
          <motion.div 
            animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="w-full h-full"
            style={{ 
              backgroundImage: 'linear-gradient(rgba(212,175,55,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.15) 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }}
          />
        </div>
        
        {/* Radar/Pulse effect in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#D4AF37]/5 rounded-full animate-[spin_60s_linear_infinite] pointer-events-none">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent blur-3xl opacity-30 transform origin-right"></div>
        </div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 w-full max-w-sm p-8 bg-black/60 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.1)] relative overflow-hidden"
        >
          {/* Subtle glow behind title */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#D4AF37] blur-[100px] opacity-20 pointer-events-none rounded-full"></div>

          <h1 className="text-4xl font-extrabold text-center mb-1 bg-gradient-to-b from-[#FFF8DC] via-[#D4AF37] to-[#B8860B] text-transparent bg-clip-text drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)]">
            CIRCLE TRADER
          </h1>
          <h2 className="text-center mb-8 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-transparent bg-clip-text font-bold tracking-[0.4em] uppercase text-xs opacity-90 relative">
            F U N D A M E N T A L
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
          </h2>

          {history.totalTrades > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-8 grid grid-cols-2 gap-3 bg-gradient-to-b from-white/[0.05] to-transparent border border-[#D4AF37]/20 rounded-2xl p-4 text-center w-full"
            >
              <div className="relative">
                <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/20 to-transparent"></div>
                <div className="text-[9px] text-[#D4AF37]/60 font-mono uppercase tracking-widest mb-1">Win Rate</div>
                <div className="text-[#D4AF37] font-bold font-mono text-2xl drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">{Math.round((history.tradesWon / history.totalTrades) * 100)}%</div>
              </div>
              <div>
                <div className="text-[9px] text-[#D4AF37]/60 font-mono uppercase tracking-widest mb-1">Games Won</div>
                <div className="text-white font-bold font-mono text-xl">{history.wins} <span className="text-[10px] text-gray-500 font-normal">/ {history.played}</span></div>
              </div>
            </motion.div>
          )}

          <div className="mb-6 relative">
            <label className="block text-[10px] text-[#D4AF37]/70 mb-2 font-mono uppercase tracking-widest ml-1">Trader Designation</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-[#D4AF37]/50 font-mono text-sm">&gt;_</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="ENTER ID..."
                className="w-full bg-black/40 border border-[#D4AF37]/20 rounded-xl pl-10 pr-4 py-3.5 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]/70 focus:bg-[#D4AF37]/5 transition-all placeholder:text-neutral-700 uppercase"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] text-[#D4AF37]/70 mb-3 font-mono uppercase tracking-widest ml-1">Market Conditions</label>
            <div className="flex flex-col gap-2 font-mono text-sm relative z-10 w-full">
              <button 
                onClick={() => { setMode('easy'); sysAudio.playClick(); }}
                className={`py-3 px-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${mode === 'easy' ? 'bg-[#D4AF37]/10 text-white border-[#D4AF37] shadow-[inset_0_0_20px_rgba(212,175,55,0.2)]' : 'border-neutral-800 text-neutral-400 bg-black/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5'}`}>
                <span className={`font-bold tracking-wider ${mode !== 'easy' && 'group-hover:text-[#D4AF37]'}`}>EASY</span> <span className={`text-[10px] ${mode === 'easy' ? 'text-[#D4AF37] font-bold tracking-widest' : 'opacity-50'}`}>NFP, CPI, GDP</span>
              </button>
              <button 
                onClick={() => { setMode('normal'); sysAudio.playClick(); }}
                className={`py-3 px-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${mode === 'normal' ? 'bg-[#D4AF37]/10 text-white border-[#D4AF37] shadow-[inset_0_0_20px_rgba(212,175,55,0.2)]' : 'border-neutral-800 text-neutral-400 bg-black/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5'}`}>
                <span className={`font-bold tracking-wider ${mode !== 'normal' && 'group-hover:text-[#D4AF37]'}`}>NORMAL</span> <span className={`text-[10px] ${mode === 'normal' ? 'text-[#D4AF37] font-bold tracking-widest' : 'opacity-50'}`}>PPI, Sales, FOMC</span>
              </button>
              <button 
                onClick={() => { setMode('hard'); sysAudio.playClick(); }}
                className={`py-3 px-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${mode === 'hard' ? 'bg-[#D4AF37]/10 text-white border-[#D4AF37] shadow-[inset_0_0_20px_rgba(212,175,55,0.2)]' : 'border-neutral-800 text-neutral-400 bg-black/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5'}`}>
                <span className={`font-bold tracking-wider ${mode !== 'hard' && 'group-hover:text-[#D4AF37]'}`}>HARD</span> <span className={`text-[10px] ${mode === 'hard' ? 'text-[#D4AF37] font-bold tracking-widest' : 'opacity-50'}`}>Blind Prev</span>
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: playerName.trim() ? 1.02 : 1 }}
            whileTap={{ scale: playerName.trim() ? 0.98 : 1 }}
            onClick={startGame}
            disabled={!playerName.trim()}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#E5C158] hover:to-[#D4AF37] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed text-black font-extrabold py-4 rounded-xl uppercase tracking-[0.25em] transition-all cursor-pointer shadow-[0_0_30px_rgba(212,175,55,0.3)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Access Terminal
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (screen === 'gameover' || screen === 'win') {
    const isWin = screen === 'win';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FFF8DC] relative overflow-hidden font-sans">
        {/* Animated background lines */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-screen">
          <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="z-10 w-full max-w-sm p-8 bg-[#0a0a0a]/90 backdrop-blur-xl border border-neutral-800 shadow-2xl rounded-3xl text-center relative overflow-hidden"
        >
          {isWin && (
             <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-transparent to-transparent pointer-events-none mix-blend-lighten"></div>
          )}
          {!isWin && (
             <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-transparent pointer-events-none mix-blend-lighten"></div>
          )}
          
          <div className={`relative w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-black shadow-inner border border-neutral-800 ${isWin ? 'shadow-[0_0_40px_rgba(34,197,94,0.3)]' : 'shadow-[0_0_40px_rgba(220,38,38,0.3)]'}`}>
            {isWin ? (
               <Trophy className="w-12 h-12 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
            ) : (
               <XCircle className="w-12 h-12 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            )}
          </div>
          
          <h2 className={`text-4xl font-extrabold mb-2 tracking-tight ${isWin ? 'text-green-400' : 'text-red-500'}`}>
            {isWin ? 'VICTORY' : 'LIQUIDATED'}
          </h2>
          <p className="text-gray-400 mb-8 text-sm px-4">
            {isWin 
              ? `Outstanding performance, Commander ${playerName}. You hit the threshold.` 
              : `Margin Call triggered, ${playerName}. Your equity rests at $0.`}
          </p>

          <div className="flex justify-between w-full mb-8 bg-white/[0.02] p-5 rounded-2xl border border-white/[0.05]">
            <div className="text-left flex flex-col justify-center">
              <p className="text-neutral-500 text-[10px] font-mono tracking-widest uppercase mb-1">Final Auth</p>
              <p className={`text-2xl font-bold font-mono tracking-tight ${isWin ? 'text-green-400' : 'text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]'}`}>
                ${balance.toLocaleString()}
              </p>
            </div>
            <div className="w-px bg-white/[0.05] mx-4"></div>
            <div className="text-right flex flex-col justify-center">
              <p className="text-neutral-500 text-[10px] font-mono tracking-widest uppercase mb-1">Target</p>
              <p className="text-2xl font-bold text-[#D4AF37] font-mono tracking-tight">{winCount} <span className="text-lg text-neutral-500">/ 10</span></p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { sysAudio.playClick(); setScreen('intro'); }}
            className={`cursor-pointer w-full relative group overflow-hidden font-bold py-4 rounded-xl uppercase tracking-widest text-sm transition-all shadow-xl ${isWin ? 'bg-[#D4AF37] text-black hover:bg-white' : 'bg-red-600/10 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white'}`}
          >
            {isWin ? 'New Deployment' : 'Restart Terminal'}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // GAME UI (Mobile layout split)
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center font-sans overflow-hidden">
      <div className="w-full h-screen max-w-md bg-[#050505] flex flex-col relative border-x border-[#D4AF37]/5 overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.03)]">
        
        {/* Subtle background ambient light */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#D4AF37]/5 to-transparent pointer-events-none"></div>

        {/* --- TOP HALF: CHART & STATS --- */}
        <div className="h-[43%] flex flex-col relative z-10">
          {/* Header Stats */}
          <div className="absolute top-0 w-full z-20 flex flex-col p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
            <div className="flex justify-between items-start w-full">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { sysAudio.playClick(); sysAudio.stopBGM(); setScreen('intro'); }}
                    className="text-neutral-500 hover:text-[#D4AF37] hover:bg-white/5 transition-colors pointer-events-auto cursor-pointer p-1.5 -ml-1.5 rounded-lg"
                    title="Back to Menu"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <span className="text-white font-extrabold text-lg font-mono tracking-tight drop-shadow-md">XAU/USD</span>
                </div>
                <div className="flex items-center mt-1 ml-8 gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                  <span className="text-[#D4AF37]/80 font-mono text-[9px] tracking-widest uppercase font-bold">WINS: {winCount}/10</span>
                </div>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-neutral-500 font-mono text-[9px] tracking-widest uppercase font-bold mb-1">EQUITY</span>
                <span className="text-green-400 font-bold font-mono text-xl tracking-tight leading-none drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">${balance.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Sentiment Meter */}
            <div className="mt-3 w-full flex flex-col items-center">
               <div className="flex justify-between w-48 px-1 mb-1 opacity-80">
                 <span className="text-[8px] text-red-500 font-mono font-bold uppercase tracking-widest">Bearish</span>
                 <span className="text-[8px] font-mono text-neutral-500 font-bold uppercase tracking-widest">Sentiment</span>
                 <span className="text-[8px] text-green-500 font-mono font-bold uppercase tracking-widest">Bullish</span>
               </div>
               <div className="w-48 h-1.5 bg-black/60 rounded-full relative shadow-inner overflow-hidden border border-neutral-800">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/50 via-neutral-600/30 to-green-600/50 mix-blend-overlay"></div>
                  <motion.div 
                     className="absolute top-0 bottom-0 w-2.5 bg-white shadow-[0_0_8px_rgb(255,255,255)] rounded" 
                     animate={{ left: `calc(${marketSentiment}% - 5px)` }} 
                     transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  />
               </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 bg-black/40 overflow-hidden relative pt-20 pb-1 z-10 border-b border-[#D4AF37]/10 inset-shadow-sm shadow-2xl">
             <Chart data={chartData} entryPrice={entryPrice} />

             {/* Overlays */}
             <AnimatePresence>
               {gameState === 'waiting_entry' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none z-20"
                  >
                    <span className="bg-[#050505]/95 backdrop-blur-md text-[#D4AF37] font-mono text-[10px] tracking-widest px-4 py-2 rounded-full border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] uppercase font-bold flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping"></div> Placing Limit Order...
                    </span>
                  </motion.div>
               )}
               {gameState === 'waiting_news' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none z-20"
                  >
                    <span className="bg-[#050505]/95 backdrop-blur-md text-white font-mono text-[10px] tracking-widest px-5 py-3 rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] uppercase font-bold text-center flex flex-col items-center gap-2">
                       <span className="text-[#D4AF37] text-xs">ENTRY EXECUTED</span> 
                       AWAITING NEWS DATA...
                    </span>
                  </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>

        {/* --- BOTTOM HALF: FUNDAMENTAL DATA & CONTROLS --- */}
        <div className="h-[57%] flex flex-col p-4 overflow-y-auto z-10 relative">
          
          <div className="flex justify-between items-center mb-2">
             <div className="flex flex-col">
               <span className="text-[9px] text-[#D4AF37]/50 font-mono tracking-widest uppercase mb-0.5 font-bold">Upcoming Event</span>
               <h2 className="text-white font-extrabold text-lg tracking-tight">{currentNews?.name}</h2>
             </div>
             <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-[#D4AF37]/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
               {currentNews?.time}
             </span>
          </div>

          <div className="text-sm text-neutral-300 font-medium mb-3 flex-1 overflow-y-auto bg-gradient-to-br from-white/5 to-transparent p-3.5 rounded-xl border border-white/5 shadow-inner leading-relaxed">
             {currentNews?.explanation}
          </div>

          {/* Data grid */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center font-mono">
             <div className="bg-[#0a0a0a] p-2 rounded-xl border border-neutral-800 shadow-md">
               <div className="text-neutral-500 text-[9px] uppercase tracking-widest mb-1 font-bold">PREVIOUS</div>
               <div className="text-white font-bold text-sm tracking-tight">{isHard ? '???' : currentNews?.previous}</div>
             </div>
             <div className="bg-gradient-to-b from-[#D4AF37]/10 to-[#0a0a0a] p-2 rounded-xl border border-[#D4AF37]/20 shadow-md relative overflow-hidden">
               <div className="absolute inset-0 bg-[#D4AF37]/5 pointer-events-none"></div>
               <div className="text-[#D4AF37]/80 text-[9px] uppercase tracking-widest mb-1 font-bold relative z-10">FORECAST</div>
               <div className="text-[#D4AF37] font-extrabold text-sm tracking-tight drop-shadow-[0_0_5px_rgba(212,175,55,0.5)] relative z-10">{currentNews?.forecast}</div>
             </div>
             <div className="bg-[#0a0a0a] p-2 rounded-xl border border-neutral-800 shadow-md relative overflow-hidden">
               <div className="text-neutral-500 text-[9px] uppercase tracking-widest mb-1 font-bold">ACTUAL</div>
               {gameState === 'result' ? (
                  <motion.div 
                    initial={{ scale: 1.5, opacity: 0, rotateX: 90 }} 
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }} 
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={`font-extrabold text-sm tracking-tight shadow-sm text-white`}
                  >
                     {currentNews?.actualUp || currentNews?.actualDown}
                  </motion.div>
               ) : (
                  <div className="text-neutral-600 font-bold tracking-widest text-sm">- - -</div>
               )}
             </div>
          </div>

          {/* Action Area */}
          <div className="mt-auto h-[64px] shrink-0 mb-1 relative">
            <AnimatePresence mode="wait">
              {gameState === 'countdown' && (
                 <motion.div 
                   key="countdown-ui"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
                   transition={{ duration: 0.3 }}
                   className="absolute inset-0 flex justify-between items-center gap-3"
                 >
                   <button 
                     onClick={() => handleAction('sell')}
                     className="cursor-pointer flex-1 group relative overflow-hidden bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 h-full rounded-2xl flex items-center justify-center font-bold text-white text-sm tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all transform active:scale-95 border border-red-500/50">
                     <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                     <span className="relative flex items-center gap-1.5 font-mono"><TrendingDown className="w-4 h-4 opacity-80" /> SELL</span>
                   </button>
                   
                   <div className="w-[64px] h-[64px] rounded-full bg-[#050505] border-2 border-[#D4AF37] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)] relative group">
                     {/* Circular progress track visual */}
                     <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="transparent" stroke="#D4AF37" strokeWidth="3" strokeDasharray="289" strokeDashoffset={289 - (289 * countdown) / 10} className="transition-all duration-1000 ease-linear opacity-50"></circle>
                     </svg>
                     <span className="text-[#D4AF37] font-mono text-xl font-bold drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">{countdown}</span>
                   </div>

                   <button 
                     onClick={() => handleAction('buy')}
                     className="cursor-pointer flex-1 group relative overflow-hidden bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 h-full rounded-2xl flex items-center justify-center font-bold text-white text-sm tracking-wider shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all transform active:scale-95 border border-green-500/50">
                     <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                     <span className="relative flex items-center gap-1.5 font-mono"><TrendingUp className="w-4 h-4 opacity-80" /> BUY</span>
                   </button>
                 </motion.div>
              )}

              {(gameState === 'waiting_entry' || gameState === 'waiting_news' || gameState === 'drama' || gameState === 'missed') && (
                 <motion.div 
                   key="waiting-ui"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.1 }}
                   transition={{ duration: 0.3 }}
                   className="absolute inset-0 flex justify-center items-center bg-[#0a0a0a] rounded-2xl border border-neutral-800 shadow-inner"
                 >
                   <p className="text-[#D4AF37]/80 font-mono tracking-widest uppercase text-xs animate-pulse flex items-center font-bold">
                     {gameState === 'drama' ? (
                       <><DollarSign className="w-4 h-4 mr-2 text-[#D4AF37]" /> Injecting Volatility...</>
                     ) : gameState === 'missed' ? (
                       <><XCircle className="w-4 h-4 mr-2 text-neutral-500" /> Timeout - Skipping...</>
                     ) : (
                       <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Position Locked & Active</>
                     )}
                   </p>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- RESULT OVERLAY --- */}
        <AnimatePresence>
          {gameState === 'result' && currentNews && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-end p-4 pb-8"
            >
               <motion.div 
                 initial={{ y: 50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="w-full bg-[#111] border border-[#333] rounded-2xl p-6 shadow-2xl"
               >
                 <div className="mb-6 text-center">
                   <h3 className="text-xs font-bold font-mono text-gray-500 tracking-widest mb-1">MARKET ACTUAL</h3>
                   <div className="text-white font-mono text-4xl font-bold">
                     {currentNews.actualUp || currentNews.actualDown}
                   </div>
                 </div>
                 
                 <div className="text-sm text-gray-300 bg-[#0A0A0A] p-4 rounded-lg border border-[#222] mb-6 flex items-start gap-3">
                   <div className="shrink-0 mt-0.5">
                     {((currentNews.actualUp && userAction === 'sell') || (!currentNews.actualUp && userAction === 'buy')) 
                       ? <CheckCircle className="w-5 h-5 text-green-500" />
                       : <XCircle className="w-5 h-5 text-red-500" />
                     }
                   </div>
                   <p className="leading-relaxed">
                     {currentNews.explanationUp || currentNews.explanationDown}
                   </p>
                 </div>

                 <div className="bg-black px-4 py-3 rounded-xl border border-neutral-800 mb-6 flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-xs">P/L (Profit/Loss)</span>
                    <span className={`text-xl font-bold font-mono ${
                      (currentNews.actualUp && userAction === 'sell') || (!currentNews.actualUp && userAction === 'buy') 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {(currentNews.actualUp && userAction === 'sell') || (!currentNews.actualUp && userAction === 'buy') 
                        ? `+$${PROFIT_PER_WIN.toLocaleString()}`
                        : `-$${(winCount === 0 || mode === 'hard') ? balance.toLocaleString() : CUT_LOSS.toLocaleString()}`
                      }
                    </span>
                 </div>

                 <button 
                   onClick={() => { sysAudio.playClick(); startNextRound(balance, winCount, usedNewsIds); }}
                   className="cursor-pointer w-full bg-[#D4AF37] hover:bg-[#B8860B] transition-colors text-black font-bold py-4 rounded-xl uppercase tracking-wider shadow-[0_4px_14px_rgba(212,175,55,0.4)]"
                 >
                   Continue Next
                 </button>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
