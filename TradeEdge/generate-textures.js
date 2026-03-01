// generate-textures.js — AI texture generation via Google Gemini (Nano Banana Pro)
// Usage: GEMINI_API_KEY=xxx node generate-textures.js
// Re-run is safe: skips already-generated textures (delete file to regenerate)

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY || API_KEY === 'your_key_here') {
  console.error('ERROR: Set GEMINI_API_KEY environment variable.');
  console.error('  Get a free key at: https://aistudio.google.com/apikey');
  console.error('  Usage: GEMINI_API_KEY=xxx node generate-textures.js');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const OUT_DIR = './textures';
const MODEL = 'gemini-3-pro-image-preview'; // Nano Banana Pro — most powerful image gen
const MAX_RETRIES = 3;
const RATE_LIMIT_MS = 12000; // free tier image gen: ~5 requests/minute

// ── Texture definitions ─────────────────────────────────────────────
const TEXTURES = [
  {
    name: 'console-surface',
    prompt: `Generate an image: Top-down view of a tactical military fighter cockpit console surface. Carbon fiber black base with subtle hexagonal weave pattern. Glowing cyan (#00d4ff) circuit traces running in angular geometric paths between touch zones. Hexagonal touch-sensitive zones with faint inner glow. Small amber and blue LED status indicators scattered along edges. Machined metal trim with brushed titanium finish. Dark, military-grade aesthetic like Star Citizen spacecraft interior. Flat lighting, no perspective distortion, seamless texture. 1024x1024 pixels.`
  },
  {
    name: 'deck-floor',
    prompt: `Generate an image: Top-down seamless tileable sci-fi fighter cockpit deck floor plate. Dark gunmetal gray (#0a0e14) diamond plate pattern with anti-slip raised texture. Angular panel seams with recessed bolts at intersections. A single thin blue LED strip running along one seam line, casting subtle cyan glow on adjacent metal. Industrial military spacecraft floor. No objects, pure flat texture. Must tile seamlessly. 512x512 pixels.`
  },
  {
    name: 'hull-wall',
    prompt: `Generate an image: Front view of an angular fighter cockpit interior wall panel. Dark titanium gray (#0a0e14) machined metal surface with sharp beveled panel edges. Exposed conduit bundles running horizontally behind semi-transparent access panels. Small amber (#ff8800) and blue (#0088cc) status LEDs recessed into panel edges. Angular geometric panel cuts, not rounded. Military spacecraft aesthetic like Star Citizen cockpit interior. Flat, seamless, tileable. 1024x512 pixels.`
  },
  {
    name: 'ceiling-panel',
    prompt: `Generate an image: Bottom-up view of a fighter cockpit canopy ceiling interior. Nearly black (#060a10) structural ribbing in angular V-patterns. Thin cyan (#00d4ff) LED accent strips running along structural ribs. A row of small circuit breaker toggles or switches recessed into one panel. Dark composite material between ribs. Military spacecraft canopy interior aesthetic. Flat texture, no perspective distortion. 1024x512 pixels.`
  },
  {
    name: 'vs-deepspace',
    prompt: `Generate an image: Dense asteroid field lit by a distant orange sun with visible god rays streaming between rocks. Various sized rocky asteroids with cratered surfaces in the mid-ground. Fine space dust particles catching the orange sunlight. Dark void background with scattered stars. Star Citizen asteroid belt mining scene aesthetic. Cinematic quality, 16:9 aspect ratio. No cockpit frame, no UI. 1024x512 pixels.`
  },
  {
    name: 'vs-warp',
    prompt: `Generate an image: Quantum travel tunnel effect — blue-white plasma energy ribbons spiraling around a central vanishing point. Electric discharge arcs crackling between the plasma ribbons. Intense speed lines radiating from center. Deep indigo-black void in the background. Bright white-blue core at the vanishing point. Star Citizen quantum drive jump aesthetic. No cockpit frame, no UI text. Cinematic quality, 16:9 ratio. 1024x512 pixels.`
  },
  {
    name: 'vs-planet',
    prompt: `Generate an image: Space station approach scene — a large rotating ring station (toroidal design with visible habitat sections) silhouetted against a massive gas giant planet with swirling amber and cream cloud bands. Small landing guide light trails (green and white dots) leading toward the station docking bay. Star-filled background. Star Citizen space station approach aesthetic. No cockpit frame, no UI. Cinematic quality, 16:9 ratio. 1024x512 pixels.`
  },
  {
    name: 'padd-screen',
    prompt: `Generate an image: Floating holographic tactical display interface. Translucent dark background with visible transparency. Cyan (#00d4ff) wireframe UI elements — bar charts, circular gauges, horizontal data readouts. Faint horizontal scan lines across the entire display. Small glowing data points and connection lines. Corner bracket markers framing the display area. Holographic projection aesthetic, not a physical screen. Flat view, no perspective. 512x512 pixels.`
  },
  {
    name: 'datapad-cover',
    prompt: `Generate an image: Floating holographic key-levels financial display in portrait orientation. Translucent dark background. Blue (#0088cc) wireframe grid overlay. Rows of price data with glowing numbers. Small sparkline charts next to data rows. Corner bracket markers at all four corners. Faint blue glow emanating from the edges. Holographic projection aesthetic, translucent and floating. Flat view, no perspective. 512x640 pixels.`
  },
  {
    name: 'space-skybox',
    prompt: `Generate an image: Hyper-realistic deep space environment panorama inspired by Hubble Space Telescope photography. Very dark void (#020610) base. A massive vibrant nebula complex dominating the left third — swirling pillars of magenta, teal, and gold gas illuminated by embedded young stars. A distant barred spiral galaxy with visible spiral arms in the upper right. Fine cosmic dust lanes with subtle brown and amber tones crossing diagonally. Thousands of stars at varying brightness and color temperatures (blue-white hot stars, warm yellow dwarfs, red giants). Faint background galaxy clusters as tiny smudges. Photorealistic astronomical quality matching James Webb Space Telescope imagery. Equirectangular projection for 3D skybox wrap. 2048x1024 pixels.`
  },
  {
    name: 'control-panel-surface',
    prompt: `Generate an image: Top-down view of a sci-fi fighter cockpit side control panel surface. Matte black carbon composite base with subtle woven fiber texture. Three recessed rectangular display cutouts (dark, powered-off screens with faint reflection). Rows of small tactile push buttons with backlit labels in cyan (#00d4ff) and amber (#ff8800). Two rotary dial knobs with metallic knurled edges. Thin LED strip channels running between button clusters, currently glowing dim cyan. Machined aluminum bezels around each display cutout. Military-grade aesthetic like F-35 cockpit meets Star Citizen. Flat texture, no perspective distortion. 1024x512 pixels.`
  },
  {
    name: 'control-panel-display',
    prompt: `Generate an image: Holographic mini-display screen for a sci-fi cockpit control panel. Dark translucent background with subtle scan lines. Cyan (#00d4ff) wireframe UI elements: a small circular radar sweep in the top-left, two horizontal bar graphs showing system power levels, a tiny line chart showing signal strength, and numeric readouts in monospace font. Thin cyan border frame with corner brackets. Faint blue glow emanating from text elements. Grid overlay at 10% opacity. Looks like a powered holographic projection, not a physical LCD. Flat view. 512x256 pixels.`
  },
  {
    name: 'space-panorama-1',
    prompt: `Generate an image: Hyper-realistic deep space nebula panorama matching James Webb Space Telescope quality. Massive emission nebula with towering pillars of creation — dense columns of gas and dust in rich browns and golds, edges lit by intense ultraviolet radiation from nearby blue-white stars. The nebula glows in layers: outer red hydrogen-alpha emission, inner teal and cyan oxygen-III emission, golden sulfur-II wisps. Background filled with thousands of point stars from blue-white to warm amber. Wispy tendrils of dark molecular cloud partially obscuring background stars. Photorealistic astronomical photography quality. Wide panoramic composition. 2048x512 pixels.`
  },
  {
    name: 'space-panorama-2',
    prompt: `Generate an image: Hyper-realistic asteroid field with a massive gas giant planet. Dozens of irregular rocky asteroids in the foreground and mid-ground — cratered, fractured surfaces lit by warm orange sunlight from the right. A colossal ringed gas giant fills the right third of the frame — Jupiter-like banded atmosphere in cream, amber, and rust-brown with a Great Red Spot analog. Thin ice crystal ring system catching sunlight. Tiny shepherd moons visible near the rings. Deep space background with pinpoint stars. Volumetric light rays filtering between the larger asteroids. Photorealistic quality matching NASA CGI renderings. 2048x512 pixels.`
  },
  {
    name: 'ict-logo-holo',
    prompt: `Generate an image: Holographic projection of an abstract yin-yang symbol reimagined as a futuristic trading emblem. The yin-yang is formed from two interlocking crescent shapes — one glowing cyan (#00d4ff) representing buy/bullish, one glowing magenta (#ff00ff) representing sell/bearish. Thin golden (#ffd700) chain-link fractal pattern radiating outward from the yin-yang center in concentric circles, like sacred geometry. The entire symbol floats against a pure black background with cyan holographic glow, subtle scan lines, and light bloom around the edges. Clean vector-like quality with luminous energy appearance. 512x512 pixels.`
  }
];

// ── Helpers ──────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateTexture(tex, index) {
  const outPath = path.join(OUT_DIR, `${tex.name}.png`);

  // Skip if already exists
  if (fs.existsSync(outPath)) {
    const stats = fs.statSync(outPath);
    if (stats.size > 1000) {
      console.log(`[${index + 1}/${TEXTURES.length}] SKIP ${tex.name} (already exists, ${(stats.size / 1024).toFixed(0)}KB)`);
      return true;
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${index + 1}/${TEXTURES.length}] Generating ${tex.name}... (attempt ${attempt})`);

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: tex.prompt,
        config: { responseModalities: ['Text', 'Image'], temperature: 1.0 }
      });

      // Extract image data from response
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error('No content parts in response');
      }

      const imagePart = candidate.content.parts.find(p => p.inlineData);
      if (!imagePart) {
        // Log text parts for debugging
        const textParts = candidate.content.parts
          .filter(p => p.text)
          .map(p => p.text)
          .join('\n');
        console.log(`  Text response: ${textParts.slice(0, 200)}`);
        throw new Error('No image data in response');
      }

      const buf = Buffer.from(imagePart.inlineData.data, 'base64');
      fs.writeFileSync(outPath, buf);
      console.log(`  OK: ${tex.name}.png (${(buf.length / 1024).toFixed(0)}KB)`);
      return true;

    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
      const backoff = isRateLimit
        ? RATE_LIMIT_MS * Math.pow(2, attempt)
        : 2000 * attempt;

      console.error(`  ERROR (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`);

      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${(backoff / 1000).toFixed(1)}s...`);
        await sleep(backoff);
      }
    }
  }

  console.error(`  FAILED: ${tex.name} after ${MAX_RETRIES} attempts`);
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('TradeEdge V3.2 — AI Texture Generator (Nano Banana Pro)');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${path.resolve(OUT_DIR)}`);
  console.log(`Textures: ${TEXTURES.length}\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < TEXTURES.length; i++) {
    const ok = await generateTexture(TEXTURES[i], i);
    if (ok) {
      success++;
    } else {
      failed++;
    }

    // Rate limit between requests (skip for last or skipped)
    if (i < TEXTURES.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\nDone: ${success} generated, ${failed} failed.`);

  if (failed > 0) {
    console.log('Re-run to retry failed textures (existing ones will be skipped).');
    process.exit(1);
  }
}

main();
