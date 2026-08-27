// Renders PWA app icons (PNG) from an inline SVG using sharp.
// Run with: node scripts/gen-icons.mjs
//
// The mark is a single five-pointed star on the night-blue gradient — our own
// identity, not the competition's. No ball, no ring of stars, no official
// wordmark; see CHAMPIONS_MIGRATION.md §6.1 before changing it.

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

/** Five-pointed star path centred on (cx, cy). */
function star(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const ao = ((-90 + i * 72) * Math.PI) / 180;
    const ai = ((-90 + 36 + i * 72) * Math.PI) / 180;
    pts.push([cx + outer * Math.cos(ao), cy + outer * Math.sin(ao)]);
    pts.push([cx + inner * Math.cos(ai), cy + inner * Math.sin(ai)]);
  }
  return (
    "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + " Z"
  );
}

// Maskable icons get cropped to a circle on Android, so the star stays well
// inside the safe zone and the label sits close to it rather than at the edge.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a2f8f"/>
      <stop offset="1" stop-color="#060b26"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.2" r="0.6">
      <stop offset="0" stop-color="#3b6bf0" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3b6bf0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bg)"/>
  <rect width="512" height="512" rx="104" fill="url(#glow)"/>
  <path d="${star(256, 228, 122, 49)}" fill="#f4c430"/>
  <text x="256" y="424" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="800" fill="#eef2ff" letter-spacing="2">26/27</text>
</svg>`;

const buf = Buffer.from(svg);

const targets = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 512, name: "maskable-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32, name: "favicon-32.png" },
];

for (const tgt of targets) {
  await sharp(buf)
    .resize(tgt.size, tgt.size)
    .png()
    .toFile(join(outDir, tgt.name));
  console.log(`Wrote public/icons/${tgt.name} (${tgt.size}px)`);
}
