// embed-textures.js — Convert generated PNGs to WebP base64 JS constants
// Usage: node embed-textures.js
// Output: textures/embedded-textures.js (copy contents into tradeedge-ict.html)

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const IN_DIR = './textures';
const OUT_FILE = path.join(IN_DIR, 'embedded-textures.js');

const TEXTURES = [
  { name: 'console-surface', maxW: 1024, maxH: 1024, quality: 80 },
  { name: 'deck-floor',      maxW: 512,  maxH: 512,  quality: 80 },
  { name: 'hull-wall',       maxW: 1024, maxH: 512,  quality: 75 },
  { name: 'ceiling-panel',   maxW: 1024, maxH: 512,  quality: 75 },
  { name: 'vs-deepspace',    maxW: 1024, maxH: 512,  quality: 85 },
  { name: 'vs-warp',         maxW: 1024, maxH: 512,  quality: 85 },
  { name: 'vs-planet',       maxW: 1024, maxH: 512,  quality: 85 },
  { name: 'padd-screen',     maxW: 512,  maxH: 512,  quality: 75 },
  { name: 'datapad-cover',   maxW: 512,  maxH: 640,  quality: 75 },
  { name: 'space-skybox',         maxW: 2048, maxH: 1024, quality: 70 },
  { name: 'control-panel-surface', maxW: 1024, maxH: 512,  quality: 80 },
  { name: 'control-panel-display', maxW: 512,  maxH: 256,  quality: 75 },
  { name: 'space-panorama-1',     maxW: 2048, maxH: 512,  quality: 85 },
  { name: 'space-panorama-2',     maxW: 2048, maxH: 512,  quality: 85 },
  { name: 'ict-logo-holo',        maxW: 512,  maxH: 512,  quality: 80 },
];

async function main() {
  console.log('TradeEdge V2.4 — Texture Embedder (PNG → WebP → base64)\n');

  let output = '';
  output += '// ═══════════ AI TEXTURES (Gemini Nano Banana Pro) ═══════════\n';
  output += '// Re-generate: GEMINI_API_KEY=xxx node generate-textures.js && node embed-textures.js\n';
  output += '// Then copy this file to js/cockpit/tex-data.js\n\n';

  let totalBytes = 0;
  let processed = 0;
  let missing = 0;

  for (const tex of TEXTURES) {
    const inPath = path.join(IN_DIR, `${tex.name}.png`);

    if (!fs.existsSync(inPath)) {
      console.log(`  SKIP ${tex.name} — PNG not found (run generate-textures.js first)`);
      const varName = tex.name.replace(/-/g, '_').toUpperCase();
      output += `var _TEX_${varName} = ''; // not generated\n`;
      missing++;
      continue;
    }

    const webpBuf = await sharp(inPath)
      .resize(tex.maxW, tex.maxH, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: tex.quality })
      .toBuffer();

    const b64 = webpBuf.toString('base64');
    const varName = tex.name.replace(/-/g, '_').toUpperCase();
    const sizeKB = (b64.length / 1024).toFixed(0);

    output += `var _TEX_${varName} = 'data:image/webp;base64,${b64}';\n`;
    totalBytes += b64.length;
    processed++;

    console.log(`  ${tex.name}: ${sizeKB}KB base64 (webp q${tex.quality})`);
  }

  fs.writeFileSync(OUT_FILE, output);

  const totalKB = (totalBytes / 1024).toFixed(0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

  console.log(`\nTotal: ${totalKB}KB (${totalMB}MB) across ${processed} textures`);
  if (missing > 0) {
    console.log(`Missing: ${missing} textures (run generate-textures.js first)`);
  }
  if (totalBytes > 1024 * 1024) {
    console.log(`WARNING: Total exceeds 1MB budget — consider reducing quality or dimensions`);
  }
  console.log(`Output: ${path.resolve(OUT_FILE)}`);
}

main();
