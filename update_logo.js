import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  "import { Chart } from './components/Chart';",
  "import { Chart } from './components/Chart';\nimport { Logo } from './components/Logo';"
);

// We need to replace the ugly logo container logic
const logoSearch = /<div className="relative w-28 h-28 mb-3 flex flex-col justify-center items-center">[\s\S]*?<\/div>\s*<\/div>/;

const newLogo = `<Logo className="w-28 h-28 mb-3" />`;

app = app.replace(logoSearch, newLogo);

fs.writeFileSync('src/App.tsx', app);
console.log('App updated with Logo!');
