// Generates the PolitiDex social / QR share card as a self-contained SVG.
//
// The card carries the standing brand tagline — "PolitiDex | Bound by Truth" —
// alongside a scannable QR code that points at the live site. Regenerate with:
//
//   node scripts/generate-qr-card.mjs
//
// Output: assets/politidex-qr-card.svg
//
// The QR matrix is produced with `uqr` so the code stays functional; everything
// else (frame, wordmark, tagline, colors) is drawn here so the card matches the
// site's crimson / navy / gold palette.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

// `uqr` ships from the global build dependency cache; resolve it from there if
// it is not installed locally.
const require = createRequire(import.meta.url);
let encode;
try {
  ({ encode } = require('uqr'));
} catch {
  ({ encode } = require('/opt/buildhome/node-deps/node_modules/uqr/dist/index.cjs'));
}

const TARGET_URL = 'https://politidex.fyi';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'politidex-qr-card.svg');

// ── QR matrix ──────────────────────────────────────────────────────────────
const qr = encode(TARGET_URL);
const N = qr.size;

// QR geometry within the card (right-hand white panel).
const QR_PANEL = 300;          // white rounded panel size
const QR_PANEL_X = 1200 - 60 - QR_PANEL; // right margin 60
const QR_PANEL_Y = (630 - QR_PANEL) / 2;
const QUIET = 16;              // quiet zone inside the panel
const MOD = (QR_PANEL - QUIET * 2) / N;

let modules = '';
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    if (qr.data[r][c]) {
      const x = (QR_PANEL_X + QUIET + c * MOD).toFixed(2);
      const y = (QR_PANEL_Y + QUIET + r * MOD).toFixed(2);
      const s = (MOD + 0.4).toFixed(2); // tiny overlap to avoid hairline gaps
      modules += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0a0f1e"/>`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PolitiDex — Bound by Truth. Scan the QR code or visit politidex.fyi">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1526"/>
      <stop offset="0.5" stop-color="#0a0f1e"/>
      <stop offset="1" stop-color="#05080f"/>
    </linearGradient>
    <linearGradient id="tagline" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f5c842"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#60a5fa"/>
    </linearGradient>
    <linearGradient id="topbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c0152a"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.5" r="0.7">
      <stop offset="0" stop-color="#c0152a" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#c0152a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="8" fill="url(#topbar)"/>

  <!-- Subtle star accents -->
  <text x="92" y="120" font-size="34" fill="#f5c842" opacity="0.18">★</text>
  <text x="640" y="540" font-size="26" fill="#60a5fa" opacity="0.16">★</text>
  <text x="500" y="96" font-size="20" fill="#ffffff" opacity="0.12">★</text>

  <!-- Logo badge -->
  <rect x="80" y="150" width="96" height="96" rx="22" fill="#c0152a" stroke="#f5c842" stroke-opacity="0.6" stroke-width="2"/>
  <text x="128" y="214" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="44" fill="#ffffff" letter-spacing="2">PX</text>

  <!-- Wordmark -->
  <text x="200" y="216" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="66" letter-spacing="3">
    <tspan fill="#ffffff">POLITI</tspan><tspan fill="#ef4444">DEX</tspan>
  </text>

  <!-- Tagline -->
  <text x="84" y="320" font-family="Arial, sans-serif" font-weight="800" font-size="60" letter-spacing="6" fill="url(#tagline)">BOUND BY TRUTH</text>

  <!-- Supporting line -->
  <text x="86" y="372" font-family="Arial, sans-serif" font-weight="600" font-size="26" letter-spacing="2" fill="#9fb4d4">No spin. No sides. Just the record.</text>

  <!-- Call to action -->
  <text x="86" y="468" font-family="Arial, sans-serif" font-weight="700" font-size="24" letter-spacing="3" fill="#f5c842">SCAN TO EXPLORE  ·  POLITIDEX.FYI</text>
  <text x="86" y="506" font-family="Arial, sans-serif" font-weight="500" font-size="20" fill="#7e93b4">A free, nonpartisan scorecard for everyone on your ballot.</text>

  <!-- QR panel -->
  <rect x="${QR_PANEL_X - 6}" y="${QR_PANEL_Y - 6}" width="${QR_PANEL + 12}" height="${QR_PANEL + 12}" rx="26" fill="#c0152a"/>
  <rect x="${QR_PANEL_X}" y="${QR_PANEL_Y}" width="${QR_PANEL}" height="${QR_PANEL}" rx="20" fill="#ffffff"/>
  ${modules}
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`Wrote ${OUT} (QR size ${N}x${N}, target ${TARGET_URL})`);
