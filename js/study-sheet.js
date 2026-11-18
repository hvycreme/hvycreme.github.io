/* ==========================================================================
   study-sheet.js — research cards open as a floating glass panel
   Pressing "Details" lifts the card out of the grid: a glass blob grows from
   the card's spot into a centred panel, wobbling like a liquid as it settles
   (a damped spring drives the size; each corner wobbles out of step and the
   wobble dies away). The page behind blurs and dims. The details fade in once
   the shape has nearly settled, so text never stretches.

   The card itself (not a copy) moves into the panel, so its buttons, the
   explanation toggle, and the 3D molecule keep working; a faint placeholder
   holds its place in the grid, and the card returns there on close.

   Close: the Close / × buttons, Escape, a tap outside, or a downward swipe at
   the top of the panel (phones). While open, the page behind is inert and Tab
   stays inside the panel; focus returns to the card's button afterwards.
   Reduce motion: a quick fade instead of the blob. No JS: cards simply show
   all their details in place (css/style.css), as before.
   Loaded after main.js, which calls window.studySheet.
   ========================================================================== */
(() => {
  const cards = document.querySelectorAll('.project-card');
  if (!cards.length || typeof setCard !== 'function') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- The layer: scrim, blob, and the panel itself ----
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="sheet-scrim"></div>
    <div class="sheet-blob" aria-hidden="true"><span class="sheet-ripple"></span></div>
    <div class="sheet" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="sheet-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>`;
  document.body.append(layer);

  const scrim = layer.querySelector('.sheet-scrim');
  const blob = layer.querySelector('.sheet-blob');
  const ripple = layer.querySelector('.sheet-ripple');
  const sheet = layer.querySelector('.sheet');
  const closeButton = layer.querySelector('.sheet-close');
  const outside = ['.site-header', 'main', '.site-footer', '.float-top']
    .map((s) => document.querySelector(s)).filter(Boolean);

  let current = null;      // the card in the panel
  let placeholder = null;  // what holds its place in the grid
  let busy = false;        // an open/close animation is running

  const OPEN_MS = 760;
  const CLOSE_MS = 560;

  // ---- Geometry helpers ----
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  function placeBlob(r, radius = '28px') {
    Object.assign(blob.style, {
      left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: radius,
    });
  }

  // Damped spring from 0 to 1 (zeta < 1 overshoots a little, then settles)
  function spring(t, zeta, omega) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
  }

  // Keyframes for the blob: position and size follow the spring; the eight
  // corner radii swell and shrink out of step, fading as the shape settles.
  function blobFrames(from, to, { ms, zeta, omega, wobble }) {
    const frames = [];
    const steps = 40;
    const phases = [0, 1.7, 3.1, 4.6, 0.9, 2.4, 3.9, 5.3];
    for (let i = 0; i <= steps; i += 1) {
      const f = i / steps;
      const p = i === steps ? 1 : spring((f * ms) / 1000, zeta, omega);
      const lerp = (a, b) => a + (b - a) * p;
      const w = lerp(from.w, to.w);
      const h = lerp(from.h, to.h);
      const decay = (1 - f) ** 1.6;
      const limit = Math.min(w, h) / 2;
      const radii = phases.map((phase) => {
        const swell = wobble * decay * Math.min(w, h) * (0.5 + 0.5 * Math.sin(f * Math.PI * 3.2 + phase));
        return `${Math.min(28 + swell, limit).toFixed(1)}px`;
      });
      frames.push({
        offset: f,
        left: `${lerp(from.x, to.x)}px`,
        top: `${lerp(from.y, to.y)}px`,
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: `${radii.slice(0, 4).join(' ')} / ${radii.slice(4).join(' ')}`,
      });
    }
    return frames;
  }

  function playRipple(point, blobRect) {
    if (!point) return;
    ripple.style.left = `${point.x - blobRect.x}px`;
    ripple.style.top = `${point.y - blobRect.y}px`;
    ripple.animate(
      [{ transform: 'scale(0)', opacity: 0.9 }, { transform: 'scale(36)', opacity: 0 }],
      { duration: OPEN_MS * 1.1, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }

  function setOutsideInert(on) {
    outside.forEach((el) => { el.inert = on; });
    document.documentElement.classList.toggle('sheet-open', on);
  }

  // ---- Open ----
  function open(card, point, targetId) {
    if (busy || current === card) return;
    if (current) close({ instant: true });
    busy = true;
    current = card;

    const from = rectOf(card);

    // A faint placeholder keeps the grid from shifting
    placeholder = document.createElement('div');
    placeholder.className = 'project-placeholder';
    placeholder.style.minHeight = `${from.h}px`;
    placeholder.style.animation = 'none';
    card.before(placeholder);

    sheet.append(card);
    card.classList.add('in-sheet');
    setCard(card, true);
    sheet.setAttribute('aria-labelledby', card.getAttribute('aria-labelledby') || '');
    sheet.classList.add('is-hidden');
    sheet.scrollTop = 0;
    layer.hidden = false;
    setOutsideInert(true);

    const to = rectOf(sheet);
    const finish = () => {
      placeBlob(to);
      sheet.classList.remove('is-hidden');
      busy = false;
      closeButton.focus({ preventScroll: true });
      if (targetId && targetId !== card.id) {
        const target = document.getElementById(targetId);
        if (target && sheet.contains(target)) target.scrollIntoView({ block: 'start' });
      }
    };

    requestAnimationFrame(() => layer.classList.add('is-active'));

    if (reduceMotion.matches) {
      placeBlob(to);
      finish();
      return;
    }

    placeBlob(from);
    playRipple(point, from);
    const anim = blob.animate(
      blobFrames(from, to, { ms: OPEN_MS, zeta: 0.55, omega: 14, wobble: 0.32 }),
      { duration: OPEN_MS, easing: 'linear', fill: 'forwards' },
    );
    // Details fade in as the shape settles
    setTimeout(() => sheet.classList.remove('is-hidden'), OPEN_MS * 0.55);
    anim.onfinish = () => { placeBlob(to); anim.cancel(); finish(); };
  }

  // ---- Close ----
  function close({ instant = false } = {}) {
    if (!current || (busy && !instant)) return;
    busy = true;
    const card = current;

    const restore = () => {
      placeholder.replaceWith(card);
      card.style.animation = 'none';       // don't replay its entrance
      card.classList.remove('in-sheet');
      setCard(card, false);
      placeholder = null;
      current = null;
      layer.hidden = true;
      layer.classList.remove('is-active');
      sheet.classList.remove('is-hidden');
      sheet.style.translate = '';
      blob.style.translate = '';
      setOutsideInert(false);
      busy = false;
      if (!instant) card.querySelector('.project-toggle').focus({ preventScroll: true });
    };

    if (instant || reduceMotion.matches) {
      restore();
      return;
    }

    const from = rectOf(sheet);
    const to = rectOf(placeholder);
    sheet.classList.add('is-hidden');
    layer.classList.remove('is-active');
    placeBlob(from);
    blob.style.translate = '';
    sheet.style.translate = '';
    const anim = blob.animate(
      blobFrames(from, to, { ms: CLOSE_MS, zeta: 0.7, omega: 15, wobble: 0.2 }),
      { duration: CLOSE_MS, easing: 'linear', fill: 'forwards' },
    );
    anim.onfinish = () => { anim.cancel(); restore(); };
  }

  // ---- Wiring ----
  closeButton.addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());

  document.addEventListener('keydown', (event) => {
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    // Keep Tab inside the panel
    if (event.key === 'Tab') {
      const focusable = [...sheet.querySelectorAll('a[href], button, summary, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // The panel and blob follow window size changes
  window.addEventListener('resize', () => {
    if (current && !busy) placeBlob(rectOf(sheet));
  });

  // Phones: pull down from the top of the panel to close
  let startY = null;
  sheet.addEventListener('touchstart', (event) => {
    startY = sheet.scrollTop <= 0 && !busy ? event.touches[0].clientY : null;
  }, { passive: true });
  sheet.addEventListener('touchmove', (event) => {
    if (startY === null) return;
    const dy = Math.max(0, event.touches[0].clientY - startY);
    sheet.style.translate = `0 ${dy * 0.5}px`;
    blob.style.translate = `0 ${dy * 0.5}px`;
  }, { passive: true });
  sheet.addEventListener('touchend', (event) => {
    if (startY === null) return;
    const dy = event.changedTouches[0].clientY - startY;
    startY = null;
    if (dy > 110) {
      close();
    } else {
      sheet.style.translate = '';
      blob.style.translate = '';
    }
  });

  // Printing shows every card in place, fully open (print styles)
  window.addEventListener('beforeprint', () => close({ instant: true }));

  // ---- Public API used by main.js ----
  window.studySheet = {
    open,
    close,
    toggle(card, event) {
      if (current === card) close();
      else open(card, event && event.clientX ? { x: event.clientX, y: event.clientY } : null);
    },
    get current() { return current; },
  };
})();
