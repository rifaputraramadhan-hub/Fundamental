import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  // Intro background
  { search: /bg-\[#050505\] text-\[#f4f4f5\]/g, replace: 'bg-zinc-950 text-zinc-200' },
  // Game background
  { search: /bg-neutral-950/g, replace: 'bg-[#030303] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]' },
  // Game container
  { search: /bg-\[#050505\]/g, replace: 'bg-zinc-950/80 backdrop-blur-xl border-zinc-800' },
  // Result screen bg
  { search: /bg-\[#111\]/g, replace: 'bg-zinc-900/90 backdrop-blur-xl border-zinc-700/50' },
  // Intro card
  { search: /bg-black\/60 backdrop-blur-xl border border-\[#d4d4d8\]\/30/g, replace: 'bg-zinc-900/60 backdrop-blur-2xl border border-zinc-700/50' },
  // Button texts
  { search: /text-black font-extrabold/g, replace: 'text-zinc-900 font-extrabold flex items-center justify-center' }
];

for (const rep of replacements) {
  app = app.replace(rep.search, rep.replace);
}

fs.writeFileSync('src/App.tsx', app);
console.log('UI enhanced!');
