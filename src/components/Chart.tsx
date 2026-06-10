import React, { useMemo } from 'react';
import { Candle } from '../types';

interface ChartProps {
  data: Candle[];
  entryPrice?: number | null;
  className?: string;
}

export const Chart: React.FC<ChartProps> = ({ data, entryPrice, className = '' }) => {
  // We keep up to last 40 candles for display
  const maxCandles = 40;
  const gridColumns = 50; // Total grid columns, leaving space on the right
  const displayData = data.slice(-maxCandles);
  
  const minPrice = useMemo(() => {
    if (displayData.length === 0) return 0;
    const lowest = Math.min(...displayData.map((d) => d.low));
    return entryPrice ? Math.min(lowest, entryPrice) : lowest;
  }, [displayData, entryPrice]);

  const maxPrice = useMemo(() => {
    if (displayData.length === 0) return 100;
    const highest = Math.max(...displayData.map((d) => d.high));
    return entryPrice ? Math.max(highest, entryPrice) : highest;
  }, [displayData, entryPrice]);

  const priceRange = Math.max(maxPrice - minPrice, 4); // Minimum range
  const paddedMin = minPrice - priceRange * 0.1;
  const paddedMax = maxPrice + priceRange * 0.1;
  const finalRange = paddedMax - paddedMin;

  const getPriceY = (price: number) => {
    return 100 - ((price - paddedMin) / finalRange) * 100; // SVG Y coordinates go down
  };

  const candleWidth = 100 / gridColumns;

  return (
    <div className={`relative w-full h-full bg-[#09090b] overflow-hidden flex ${className}`}>
      <div className="flex-1 relative w-full h-full">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-full border-t border-white"></div>
          ))}
        </div>
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-full border-l border-white"></div>
          ))}
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {displayData.map((c, i) => {
            const isUp = c.close >= c.open;
            // Align candles from left to right
            const offset = 0;
            const x = (i + offset) * candleWidth + candleWidth * 0.1;
            const cw = candleWidth * 0.8;
            
            const yOpen = getPriceY(c.open);
            const yClose = getPriceY(c.close);
            const yHigh = getPriceY(c.high);
            const yLow = getPriceY(c.low);
            
            // TradingView colors
            const color = isUp ? '#089981' : '#f23645'; 

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x + cw / 2}
                  y1={yHigh}
                  x2={x + cw / 2}
                  y2={yLow}
                  stroke={color}
                  strokeWidth={0.3}
                />
                {/* Body */}
                {Math.abs(yOpen - yClose) < 0.2 ? (
                  // Doji
                  <line x1={x} y1={yOpen} x2={x + cw} y2={yOpen} stroke={color} strokeWidth={0.5} />
                ) : (
                  <rect
                    x={x}
                    y={Math.min(yOpen, yClose)}
                    width={cw}
                    height={Math.max(Math.abs(yOpen - yClose), 0.2)}
                    fill={color}
                  />
                )}
              </g>
            );
          })}

          {/* Entry Line (Full margin, 5 dashed lines simulated) */}
          {entryPrice && (
            <g>
              {[...Array(5)].map((_, i) => {
                const y = getPriceY(entryPrice) + (i - 2) * 0.3; // Offset slightly to simulate multiple entries
                return (
                  <line
                    key={`entry-${i}`}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#d4d4d8"
                    strokeWidth="0.3"
                    strokeDasharray="1,1"
                    opacity={0.8}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
      
      {/* Y-Axis scale on the right */}
      <div className="w-14 bg-[#09090b] border-l border-zinc-800 flex flex-col justify-between py-0 text-[10px] text-[#787b86] font-mono items-end pr-1 relative">
         <span className="mt-[-6px]">{paddedMax.toFixed(1)}</span>
         <span className="mt-[-6px]">{(paddedMin + (finalRange * 0.8)).toFixed(1)}</span>
         <span className="mt-[-6px]">{(paddedMin + (finalRange * 0.6)).toFixed(1)}</span>
         <span className="mt-[-6px]">{(paddedMin + (finalRange * 0.4)).toFixed(1)}</span>
         <span className="mt-[-6px]">{(paddedMin + (finalRange * 0.2)).toFixed(1)}</span>
         <span className="mb-[-6px]">{paddedMin.toFixed(1)}</span>

         {displayData.length > 0 && (
           <div 
             className="absolute right-0 flex items-center justify-end pr-1 w-full text-[10px] sm:text-xs font-mono font-bold text-white shadow-lg pointer-events-none transition-all duration-75"
             style={{ 
               top: `${getPriceY(displayData[displayData.length - 1].close)}%`,
               transform: 'translateY(-50%)',
               backgroundColor: displayData[displayData.length - 1].close >= displayData[displayData.length - 1].open ? '#089981' : '#f23645'
             }}
           >
             {displayData[displayData.length - 1].close.toFixed(2)}
           </div>
         )}
      </div>
    </div>
  );
};
