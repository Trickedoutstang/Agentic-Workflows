// generate-bridge.js — Generate futuristic spaceship bridge / captain's chair images
// Usage: GEMINI_API_KEY=xxx node generate-bridge.js

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set GEMINI_API_KEY environment variable.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const OUT_DIR = './bridge-concepts';
const MODEL = 'gemini-3-pro-image-preview'; // Nano Banana Pro — most powerful image gen
const RATE_LIMIT_MS = 12000;
const MAX_RETRIES = 3;

const IMAGES = [
  {
    name: 'bridge-wide-cinematic',
    prompt: `Generate an image: Ultra-wide cinematic view of a futuristic spaceship bridge interior. Captain's chair centered on a raised platform. Massive wraparound viewport showing deep space with stars and a distant nebula. Holographic displays floating in mid-air with cyan and blue data readouts. Dark ambient lighting with glowing accent strips along the floor and ceiling. Sleek curved console stations flanking the captain's chair. Moody volumetric lighting with subtle fog. Think Mass Effect Normandy meets Star Trek meets Blade Runner. Photorealistic, 16:9 cinematic aspect ratio. 1024x576 pixels.`
  },
  {
    name: 'captains-chair-closeup',
    prompt: `Generate an image: Close-up view of a futuristic spaceship captain's command chair. Sleek black leather and brushed titanium construction. Built-in holographic arm displays on both armrests showing ship status data in glowing cyan. Subtle blue LED accent lighting along the chair edges. The chair sits on a slightly elevated circular platform with embedded floor lighting. Dark moody bridge environment visible in the background with glowing console stations. High-tech, luxurious, commanding presence. Photorealistic cinematic quality. 1024x1024 pixels.`
  },
  {
    name: 'bridge-from-chair-pov',
    prompt: `Generate an image: First-person POV from the captain's chair of a futuristic spaceship bridge. Looking forward at a massive panoramic viewport showing stars and deep space. Multiple holographic displays floating at eye level showing navigation data, ship systems, and tactical readouts in glowing cyan and blue. Crew stations visible on both sides with their own displays. The chair's armrests visible at the bottom of frame with built-in touch panels. Dark interior with dramatic lighting from the viewport and holographic displays. Cinematic, immersive, like sitting in the command seat. 1024x576 pixels.`
  },
  {
    name: 'bridge-dark-tactical',
    prompt: `Generate an image: Dark tactical mode spaceship bridge interior. All lighting switched to deep red and amber alert colors. Captain's chair in center with red holographic displays. Large tactical display showing a 3D star map hologram projected in the center of the bridge. Crew stations with red-tinted screens. Viewport showing an approaching hostile fleet as distant points of light. Tense, dramatic atmosphere with volumetric red lighting and shadows. Military sci-fi aesthetic like The Expanse or Battlestar Galactica. Photorealistic. 1024x576 pixels.`
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generate(img, index) {
  const outPath = path.join(OUT_DIR, `${img.name}.png`);

  if (fs.existsSync(outPath)) {
    const stats = fs.statSync(outPath);
    if (stats.size > 1000) {
      console.log(`[${index + 1}/${IMAGES.length}] SKIP ${img.name} (exists)`);
      return true;
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${index + 1}/${IMAGES.length}] Generating ${img.name}... (attempt ${attempt})`);

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: img.prompt,
        config: { responseModalities: ['Text', 'Image'], temperature: 1.0 }
      });

      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) throw new Error('No content parts');

      const imagePart = candidate.content.parts.find(p => p.inlineData);
      if (!imagePart) throw new Error('No image data in response');

      const buf = Buffer.from(imagePart.inlineData.data, 'base64');
      fs.writeFileSync(outPath, buf);
      console.log(`  OK: ${img.name}.png (${(buf.length / 1024).toFixed(0)}KB)`);
      return true;

    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
      const backoff = isRateLimit ? RATE_LIMIT_MS * Math.pow(2, attempt) : 2000 * attempt;
      console.error(`  ERROR (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${(backoff / 1000).toFixed(1)}s...`);
        await sleep(backoff);
      }
    }
  }

  console.error(`  FAILED: ${img.name}`);
  return false;
}

async function main() {
  console.log('Spaceship Bridge Concept Generator');
  console.log(`Generating ${IMAGES.length} images...\n`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let success = 0;
  for (let i = 0; i < IMAGES.length; i++) {
    if (await generate(IMAGES[i], i)) success++;
    if (i < IMAGES.length - 1) await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nDone: ${success}/${IMAGES.length} generated.`);
  console.log(`Output: ${path.resolve(OUT_DIR)}`);
}

main();
