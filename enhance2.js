import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { search: /from-white via-\[\#d4d4d8\] to-\[\#71717a\]/g, replace: 'from-white via-zinc-300 to-zinc-500' },
  { search: /bg-\[\#0a0a0a\]/g, replace: 'bg-zinc-900/50 backdrop-blur-md' },
  { search: /border-neutral-800/g, replace: 'border-zinc-800' },
  { search: /neutral-500/g, replace: 'zinc-500' },
  { search: /neutral-400/g, replace: 'zinc-400' },
  { search: /neutral-300/g, replace: 'zinc-300' },
  { search: /neutral-950/g, replace: 'zinc-950' },
  // specific enhancements
  { search: /shadow-\[inset_0_0_20px_rgba\(212,212,216,0.2\)\]/g, replace: 'shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' },
  { search: /bg-gradient-to-r from-\[\#d4d4d8\] to-\[\#71717a\] hover:from-\[\#e4e4e7\] hover:to-\[\#d4d4d8\]/g, replace: 'bg-gradient-to-r from-zinc-200 to-zinc-400 hover:from-white hover:to-zinc-300' },
  { search: /bg-\[\#d4d4d8\] hover:bg-\[\#71717a\]/g, replace: 'bg-zinc-200 hover:bg-white text-zinc-900' },
  { search: /text-\[\#d4d4d8\]/g, replace: 'text-zinc-200' },
  { search: /border-\[\#d4d4d8\]/g, replace: 'border-zinc-400' },
  { search: /drop-shadow-\[0_0_10px_rgba\(212,212,216,0.8\)\]/g, replace: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' },
  // Chart background
  { search: /bg-\[\#131722\]/g, replace: 'bg-[#09090b]' } // super sleek dark chart background
];

for (const rep of replacements) {
  app = app.replace(rep.search, rep.replace);
}

fs.writeFileSync('src/App.tsx', app);

let chart = fs.readFileSync('src/components/Chart.tsx', 'utf8');
for (const rep of replacements) {
  chart = chart.replace(rep.search, rep.replace);
}
fs.writeFileSync('src/components/Chart.tsx', chart);

console.log('UI enhanced 2!');
