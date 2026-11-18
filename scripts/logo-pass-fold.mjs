// logo-pass-fold.mjs — folds the logo pass (sw v579) back out of a document.
//
// The logo pass retired the hero's BETA tag and swapped the drawn PX tiles and
// the text POLITIDEX wordmarks on the front page and the person file for the
// official logo images, and pointed the favicon, the touch icon and the default
// share image at the new PDX mark. It touched no other byte of either document.
// A suite that pins "this pass did not change index.html / person.html" against
// HEAD folds these edits back with foldLogoPass() first, so it keeps pinning
// every other byte. Each pair is [what the document says now, what it said].
export const LOGO_PASS_EDITS = [
  [
    "  <meta property=\"og:image\" content=\"https://politidex.fyi/assets/og-image.png\" />",
    "  <meta property=\"og:image\" content=\"https://politidex.fyi/.netlify/images?url=%2Fassets%2Fog-default.svg&fm=png&w=1200&h=630&fit=cover\" />"
  ],
  [
    "  <meta name=\"twitter:image\" content=\"https://politidex.fyi/assets/og-image.png\" />",
    "  <meta name=\"twitter:image\" content=\"https://politidex.fyi/.netlify/images?url=%2Fassets%2Fog-default.svg&fm=png&w=1200&h=630&fit=cover\" />"
  ],
  [
    "  <link rel=\"icon\" href=\"/favicon.ico\" sizes=\"any\" /><link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/assets/favicon-32.png\" /><link rel=\"icon\" type=\"image/png\" sizes=\"192x192\" href=\"/assets/pdx-mark-192.png\" />",
    "  <link rel=\"icon\" type=\"image/svg+xml\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%23c0152a'/><text y='46' x='5' font-size='42' font-family='Arial Black,sans-serif' font-weight='900' fill='white' letter-spacing='-2'>PX</text></svg>\" />"
  ],
  [
    "  <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/assets/apple-touch-icon.png\" />",
    "  <link rel=\"apple-touch-icon\" href=\"/assets/icon.svg\" />"
  ],
  [
    "          <div class=\"pdx-brand-mark w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-110\"><img src=\"/assets/pdx-mark-header.png\" alt=\"\" width=\"32\" height=\"32\" decoding=\"async\" /></div>\n          <span class=\"pdx-brand-wordmark\"><img src=\"/assets/politidex-wordmark-360.png\" alt=\"PolitiDex — Bound by Truth\" width=\"360\" height=\"197\" decoding=\"async\" /></span>",
    "          <div class=\"w-8 h-8 rounded-lg bg-crimson-600 flex items-center justify-center text-sm shadow-lg shadow-crimson-600/20 transition-transform duration-200 group-hover:scale-110\">🏠</div>\n          <span class=\"font-display text-xl tracking-wider text-white\">POLITI<span class=\"text-crimson-400\">DEX</span></span>"
  ],
  [
    "      <div class=\"w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-gold-400/60 shadow-[0_20px_50px_rgba(192,21,42,0.4),0_0_35px_rgba(245,200,66,0.2)] flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:border-gold-400\">\n        <!-- The compact PDX mark — the official badge. The site is out of beta. -->\n        <img src=\"/assets/pdx-mark-512.png\" alt=\"PDX\" width=\"512\" height=\"512\" decoding=\"async\" style=\"display:block;width:100%;height:100%;object-fit:cover;\" />",
    "      <div class=\"w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto rounded-2xl bg-gradient-to-br from-crimson-600 via-navy-800 to-blue-900 border-2 border-gold-400/60 shadow-[0_20px_50px_rgba(192,21,42,0.4),0_0_35px_rgba(245,200,66,0.2)] flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-105 hover:border-gold-400\">\n        <span class=\"font-display text-2xl sm:text-4xl md:text-5xl tracking-widest leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]\">PX</span>\n        <span class=\"font-condensed text-[8px] sm:text-[10px] md:text-xs tracking-widest text-gold-300 uppercase font-bold\">BETA</span>"
  ],
  [
    "    <!-- Brand lockup — the official PolitiDex wordmark, which carries the standing\n         tagline \"Bound by Truth\" inside the mark. Kept compact and prominent so it\n         reads as the brand signature under the badge, with the headline below. -->",
    "    <!-- Brand lockup — wordmark + tagline. The standing PolitiDex tagline:\n         \"Bound by Truth.\" Kept compact and prominent so it reads as the brand\n         signature directly under the badge, with the marketing headline below. -->"
  ],
  [
    "      <img class=\"hero-brand-logo\"\n           src=\"/assets/politidex-wordmark.png\"\n           alt=\"PolitiDex — Bound by Truth\"\n           width=\"720\" height=\"393\"\n           decoding=\"async\"\n           fetchpriority=\"high\" />",
    "      <div class=\"font-display text-2xl sm:text-4xl md:text-5xl tracking-[0.18em] text-white leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]\">POLITI<span class=\"text-crimson-400\">DEX</span></div>\n      <div class=\"mt-2 md:mt-3 flex items-center justify-center gap-3\" aria-hidden=\"true\">\n        <span class=\"h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-gold-400/70\"></span>\n        <span class=\"font-condensed text-sm sm:text-base md:text-lg tracking-[0.3em] uppercase font-700\" style=\"background:linear-gradient(90deg,#f5c842,#ffffff,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;\">Bound by Truth</span>\n        <span class=\"h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-blue-400/70\"></span>\n      </div>"
  ],
  [
    "            <img src=\"/assets/politidex-wordmark.png\" alt=\"PolitiDex — Bound by Truth\" width=\"720\" height=\"393\" loading=\"lazy\" decoding=\"async\" style=\"height:5.5rem;width:auto;max-width:100%;\" />\n            <sup class=\"font-display\" style=\"font-size:0.75rem;opacity:0.7;align-self:flex-start;\">™</sup>",
    "            <div class=\"w-10 h-10 rounded-lg bg-crimson-600 flex items-center justify-center font-display text-sm shadow-lg\" style=\"box-shadow:0 4px 16px rgba(192,21,42,0.3);\">PX</div>\n            <span class=\"font-display text-2xl tracking-wider\">POLITI<span class=\"text-crimson-400\">DEX</span><sup style=\"font-size:0.45em;vertical-align:super;opacity:0.7;\">™</sup></span>"
  ],
  [
    "    <a href=\"/\" class=\"pdx-person-wordmark\" aria-label=\"PolitiDex home\"><picture style=\"display:block;line-height:0\"><source media=\"(max-width: 639px)\" srcset=\"/assets/pdx-mark-header.png\" width=\"32\" height=\"32\" /><img src=\"/assets/politidex-wordmark-360.png\" alt=\"PolitiDex — Bound by Truth\" width=\"360\" height=\"197\" decoding=\"async\" style=\"display:block;height:2rem;width:auto;max-width:none\" /></picture></a>",
    "    <a href=\"/\" class=\"pdx-person-wordmark\" aria-label=\"PolitiDex home\">POLITI<span>DEX</span></a>"
  ]
];

export function foldLogoPass(text) {
  if (text == null) return text;
  let t = String(text);
  for (const [now, was] of LOGO_PASS_EDITS) t = t.split(now).join(was);
  return t;
}
