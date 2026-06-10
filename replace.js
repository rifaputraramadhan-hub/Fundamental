import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { search: /#D4AF37/g, replace: '#d4d4d8' },
  { search: /#B8860B/gi, replace: '#71717a' },
  { search: /#FFF8DC/g, replace: '#ffffff' },
  { search: /#F3E5AB/g, replace: '#f4f4f5' },
  { search: /#E5C158/g, replace: '#e4e4e7' },
  { search: /rgba\(212,175,55,/g, replace: 'rgba(212,212,216,' }
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

console.log('Colors replaced!');
