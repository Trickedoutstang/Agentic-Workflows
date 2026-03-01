// TradeEdge — Guided Tour

function startTour() {
  tourStep = 0;
  document.getElementById('tour-overlay').style.display = 'block';
  showTourStep();
}

function showTourStep() {
  const step = TOUR_STEPS[tourStep];
  const overlay = document.getElementById('tour-overlay');
  const tooltip = document.getElementById('tour-tooltip');
  const highlight = document.getElementById('tour-highlight');

  document.getElementById('tour-step-label').textContent = `STEP ${tourStep + 1} OF ${TOUR_STEPS.length}`;
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-desc').textContent = step.desc;
  document.getElementById('tour-next-btn').textContent = tourStep === TOUR_STEPS.length - 1 ? 'Finish ✓' : 'Next →';

  // Dots
  document.getElementById('tour-dots').innerHTML = TOUR_STEPS.map((_, i) =>
    `<div class="tour-dot ${i === tourStep ? 'on' : ''}"></div>`
  ).join('');

  // Highlight target element
  const target = document.querySelector(step.target);
  if (target && target.offsetParent !== null) {
    const rect = target.getBoundingClientRect();
    const pad = 8;
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';
    tooltip.style.transform = 'none';

    // Position tooltip
    if (step.pos === 'right') {
      var tLeft = rect.right + 20;
      if(tLeft + 320 > window.innerWidth) tLeft = Math.max(10, rect.left - 320);
      if(tLeft + 320 > window.innerWidth) tLeft = 10;
      tooltip.style.left = tLeft + 'px';
      tooltip.style.top = Math.max(10, rect.top) + 'px';
    } else if (step.pos === 'bottom') {
      tooltip.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 320)) + 'px';
      tooltip.style.top = (rect.bottom + 16) + 'px';
    }
  } else {
    // Center if target not found or hidden
    highlight.style.left = '0'; highlight.style.top = '0';
    highlight.style.width = '0'; highlight.style.height = '0';
    tooltip.style.left = '50%'; tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%,-50%)';
  }
}

function tourNext() {
  tourStep++;
  if (tourStep >= TOUR_STEPS.length) { endTour(); return; }
  showTourStep();
}

function endTour() {
  document.getElementById('tour-overlay').style.display = 'none';
  tourStep = 0;
}

// ═══════════ AI TEXTURES (Gemini Nano Banana) ═══════════
// Re-generate: GEMINI_API_KEY=xxx node generate-textures.js && node embed-textures.js
// Then paste embedded-textures.js content here to replace empty strings

// Load AI image into an existing THREE.js texture (async, replaces canvas)
