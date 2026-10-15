/* ==========================================================================
   pollen.js: a light particle trail that follows the mouse across the page.

   Each mouse movement releases a few tiny dots ("pollen") that drift
   upward and fade within about a second. Nothing is drawn while the mouse
   is still, and the animation loop stops completely once every dot has
   faded, so an idle page costs nothing.

   Plain Canvas 2D (no WebGL needed for at most ~160 dots). Mouse and pen
   only: on touch screens a finger drag means "scroll", so a trail there
   would just be noise. Off entirely for visitors with Reduce motion on.
   ========================================================================== */
(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector('.pollen');
  if (!canvas || !finePointer || reduceMotion) return;

  const ctx = canvas.getContext('2d');
  const MAX_PARTICLES = 160;
  const SPACING = 10;  // px the mouse must move before releasing more pollen
  // Mostly forest green, with an occasional terracotta grain (r, g, b)
  const COLORS = ['47,93,58', '47,93,58', '47,93,58', '82,122,88', '154,77,51'];

  let particles = [];
  let running = false;
  let last = 0;
  let lastX = null;
  let lastY = null;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels from here on
  }

  function release(x, y, dx, dy) {
    const count = Math.min(4, 2 + Math.floor(Math.hypot(dx, dy) / 30));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        // Inherit a little of the mouse's motion, plus a random nudge
        vx: dx * 0.015 + (Math.random() - 0.5) * 0.35,
        vy: dy * 0.015 + (Math.random() - 0.5) * 0.35 - 0.12,
        r: 1 + Math.random() * 1.8,
        age: 0,
        life: 800 + Math.random() * 700,   // ms
        wobble: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
  }

  function frame(now) {
    const dt = Math.min(now - last, 50); // ms; capped so a stalled tab doesn't jump
    last = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      p.age += dt;
      p.vy -= 0.00025 * dt;                       // gentle lift, like seeds on air
      p.vx *= 0.985;                              // and a little drag
      p.x += p.vx * dt * 0.06 + Math.sin(p.wobble + p.age * 0.004) * 0.15;
      p.y += p.vy * dt * 0.06;
      const t = p.age / p.life;                   // 0 at birth, 1 at death
      ctx.globalAlpha = 0.7 * (1 - t) * Math.min(1, t * 6); // quick fade in, slow fade out
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    particles = particles.filter((p) => p.age < p.life);

    if (particles.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;                             // all faded: stop until the mouse moves again
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const { clientX: x, clientY: y } = event;
    if (lastX === null) { lastX = x; lastY = y; return; }
    const dx = x - lastX;
    const dy = y - lastY;
    if (Math.hypot(dx, dy) < SPACING) return;
    lastX = x;
    lastY = y;
    release(x, y, dx, dy);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();
})();
