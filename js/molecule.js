/* ==========================================================================
   molecule.js: interactive 3D model for the personal synthesis project.

   Uses 3Dmol.js (vendor/3dmol, BSD-3-Clause), an established molecular
   viewer. Nothing is shown unless a VERIFIED structure exists:
     molecules/target.sdf     3D coordinates (from tools/make_molecule_assets.py)
     molecules/target-2d.svg  static 2D fallback
     molecules/target.json    formula + provenance for the details panel
   The card only looks for them when it has data-model="molecules/target.sdf"
   (tools/make_molecule_assets.py adds that attribute when it writes the
   files). Without it, nothing is requested and the card is a single column.

   Behaviour:
   - Ball-and-stick, conventional (Jmol/CPK) element colors.
   - Gentle automatic rotation; Pause/Resume and Reset view buttons.
   - Drag to rotate. The mouse wheel and vertical swipes scroll the PAGE
     (they are kept away from the viewer so it never traps scrolling).
   - Rotation stops while the model is offscreen, and never starts on its
     own for visitors with Reduce motion turned on.
   - No WebGL, or the library fails to load: the static 2D drawing shows.
   ========================================================================== */
(() => {
  const card = document.querySelector('.mol-project');
  if (!card) return;
  const figure = card.querySelector('.mol-figure');
  const stage = card.querySelector('.mol-stage');
  const viewerEl = card.querySelector('.mol-viewer');
  const fallback = card.querySelector('.mol-fallback');
  const pauseBtn = card.querySelector('.mol-pause');
  const resetBtn = card.querySelector('.mol-reset');
  const caption = card.querySelector('.mol-caption');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPIN_SPEED = 0.35;  // gentle

  let viewer = null;
  let initialView = null;
  let paused = reduceMotion;   // Reduce motion: start still
  let onScreen = false;

  function updateSpin() {
    if (!viewer) return;
    viewer.spin(!paused && onScreen ? 'y' : false, SPIN_SPEED);
    pauseBtn.textContent = paused ? 'Resume rotation' : 'Pause rotation';
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
  }

  // 3D unavailable: show the static drawing (if it exists) instead
  function showFallback() {
    viewerEl.hidden = true;
    card.querySelector('.mol-controls').hidden = true;
    fallback.addEventListener('error', () => { figure.hidden = true; card.classList.remove('has-model'); });
    fallback.src = fallback.dataset.src;   // only fetched when actually needed
    fallback.hidden = false;
    caption.textContent = 'Target structure · 2D drawing';
  }

  // Keep page scrolling free: wheel events and mostly-vertical swipes are
  // stopped in the capture phase, before 3Dmol's own handlers see them, but
  // are NOT prevented, so the browser still scrolls the page.
  function protectScrolling() {
    stage.addEventListener('wheel', (e) => e.stopPropagation(), { capture: true });
    let startX = 0;
    let startY = 0;
    let vertical = null;
    stage.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      vertical = null;
    }, { capture: true, passive: true });
    stage.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) return;
      if (vertical === null) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx + dy < 6) return;
        vertical = dy > dx;   // decide once per gesture
      }
      if (vertical) e.stopPropagation();
    }, { capture: true, passive: true });
  }

  function fillDetails(meta) {
    if (!meta) return;
    const set = (key, text) => {
      const dd = card.querySelector(`[data-mol="${key}"]`);
      if (!dd || !text) return;
      dd.textContent = text;
      dd.closest('.mol-meta').hidden = false;
    };
    set('formula', meta.formula);
    // Chemical formula with proper subscripts (C13H14... -> C₁₃H₁₄...)
    const f = card.querySelector('[data-mol="formula"]');
    if (f && meta.formula) f.innerHTML = meta.formula.replace(/(\d+)/g, '<sub>$1</sub>');
    let model = meta.computational === false
      ? `3D coordinates from: ${meta.coordinates}. Structure source: ${meta.source}.`
      : `Atom positions were generated computationally (${meta.coordinates || 'force-field geometry'}) from the verified structure. Structure source: ${meta.source}.`;
    if (meta.unassigned_stereocenters > 0) {
      model += ' The stereocenter is not assigned, so the model shows one arbitrary configuration.';
    }
    set('model', model);
    if (meta.computational === false) {
      caption.textContent = 'Target structure · 3D model';
    }
  }

  async function init() {
    // Only proceed if a verified structure has been added (see header comment)
    const modelUrl = card.dataset.model;
    if (!modelUrl) return;
    let sdf;
    try {
      const res = await fetch(modelUrl, { cache: 'no-cache' });
      if (!res.ok) return;
      sdf = await res.text();
    } catch (e) {
      return;
    }
    let meta = null;
    try {
      const res = await fetch(modelUrl.replace(/\.sdf$/, '.json'), { cache: 'no-cache' });
      if (res.ok) meta = await res.json();
    } catch (e) { /* details stay as they are */ }

    figure.hidden = false;
    card.classList.add('has-model');
    fillDetails(meta);

    if (!hasWebGL()) { showFallback(); return; }
    stage.classList.add('is-loading');   // skeleton until the model is drawn
    try {
      await loadScript('vendor/3dmol/3Dmol-min.js');
    } catch (e) {
      stage.classList.remove('is-loading');
      showFallback();
      return;
    }

    protectScrolling();
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#FAF7F0';
    viewer = window.$3Dmol.createViewer(viewerEl, { backgroundColor: bg, antialias: true });
    viewer.addModel(sdf, 'sdf');
    // Ball-and-stick with conventional element colors (C grey, O red, N blue, S yellow, H white)
    viewer.setStyle({}, {
      stick: { radius: 0.14, colorscheme: 'Jmol' },
      sphere: { scale: 0.27, colorscheme: 'Jmol' },
    });
    viewer.zoomTo();
    viewer.zoom(0.95);
    viewer.render();
    initialView = viewer.getView();
    stage.classList.remove('is-loading');

    pauseBtn.addEventListener('click', () => { paused = !paused; updateSpin(); });
    resetBtn.addEventListener('click', () => {
      viewer.setView(initialView);
      viewer.render();
    });

    // Pause while offscreen
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      updateSpin();
    }, { threshold: 0.1 }).observe(figure);

    // Keep the canvas sized to its box
    new ResizeObserver(() => { viewer.resize(); viewer.render(); }).observe(viewerEl);
    updateSpin();
  }

  // Load nothing until the visitor gets near the project
  const nearby = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    nearby.disconnect();
    init();
  }, { rootMargin: '400px 0px' });
  nearby.observe(card);
})();
