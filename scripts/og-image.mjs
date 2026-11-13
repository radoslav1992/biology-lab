// Renders public/og-image.png (1200×630), the picture shown when a page is shared: `npm run og-image`.
// Playwright is not a project dependency. The script uses an installed copy (`npx playwright install chromium`
// or a preinstalled one); set PLAYWRIGHT_MODULE / CHROMIUM_PATH to point at a specific install.
import fs from 'node:fs';
import { createRequire } from 'node:module';

// What the card says. Keep the three tools real: they are named on the picture.
const card = {
  "name": "Biology Lab",
  "host": "thebiologylab.org",
  "headline": "Free biology <em>virtual labs</em> and calculators",
  "tools": [
    "Punnett Squares",
    "3D Cell Model",
    "DNA to Protein"
  ],
  "bg": "#123e2e",
  "panel": "#0d3023",
  "text": "#f4faef",
  "muted": "#b9cfc0",
  "accent": "#d0ed9a",
  "ring": "rgba(208,237,154,.35)",
  "font": "'Manrope',system-ui,sans-serif",
  "fontQuery": "Manrope:wght@800"
};

const require = createRequire(import.meta.url);
const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean);
let chromium;
for (const name of candidates) { try { ({ chromium } = require(name)); break; } catch {} }
if (!chromium) throw new Error('Playwright not found. Install it (npx playwright install chromium) or set PLAYWRIGHT_MODULE.');
const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const icon = fs.readFileSync(new URL('../public/favicon.svg', import.meta.url)).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${card.fontQuery}&family=DM+Sans:wght@500;700&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:${card.bg};color:${card.text};font-family:'DM Sans',system-ui,sans-serif;display:grid;grid-template-columns:1fr 400px;overflow:hidden}
  .left{padding:60px 20px 56px 64px;display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:16px;font:700 32px ${card.font}}
  .brand img{border-radius:14px;box-shadow:0 0 0 2px ${card.ring}}
  h1{font:700 62px/1.07 ${card.font};letter-spacing:-.015em;max-width:680px}
  h1 em{font-style:normal;color:${card.accent}}
  .tools{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
  .tools span{padding:9px 18px;border-radius:999px;border:2px solid ${card.ring};font-size:23px;font-weight:500}
  .foot{display:flex;gap:18px;align-items:center;font-size:23px;font-weight:500;color:${card.muted}}
  .foot b{color:${card.accent};font-weight:700}
  .right{display:flex;align-items:center;justify-content:center;background:${card.panel}}
  .right img{width:280px;height:280px;border-radius:64px;box-shadow:0 0 0 3px ${card.ring},0 30px 70px rgba(0,0,0,.35)}
</style></head><body>
<div class="left">
  <div class="brand"><img src="data:image/svg+xml;base64,${icon}" width="60" height="60">${card.name}</div>
  <div><h1>${card.headline}</h1><div class="tools">${card.tools.map(tool => `<span>${tool}</span>`).join('')}</div></div>
  <div class="foot"><b>${card.host}</b><span>Free · No sign-up · Printable worksheets</span></div>
</div>
<div class="right"><img src="data:image/svg+xml;base64,${icon}"></div>
</body></html>`;

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' }).catch(() => page.setContent(html));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });
await browser.close();
console.log('Wrote public/og-image.png (1200×630).');
