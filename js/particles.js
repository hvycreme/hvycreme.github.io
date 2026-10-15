/* ==========================================================================
   particles.js: botanical plates as interactive particles in the Contact
   section. A switch above the figure morphs the same ~24,000 particles
   between a rose, a hyacinth, and a lady's slipper orchid.

   Same technique as Codrops' "Interactive Particles with Three.js"
   (Bruno Imbrizi, 2019), written in plain WebGL so the site stays
   dependency-free (~6 KB instead of ~150 KB for Three.js):

     Tutorial step                    Here
     ---------------------------------------------------------------------
     Read image pixels -> particles   buildParticles(): one dot per sampled
                                      pixel that's opaque enough
     InstancedBufferGeometry          one gl.POINTS draw call for all dots
     Vertex shader + noise drift      VERTEX_SHADER: valueNoise() drift
     Touch texture (mouse trail)      uTrail[]: a short list of fading
                                      pointer positions; dots near them
                                      are pushed away
     Intro animation                  uIntro: dots fly in from a scatter
   ========================================================================== */
(() => {
  // Each plant: its cut-out image (see tools/prepare_plate.py) and the
  // caption/credit shown under the figure when it's selected.
  const PLANTS = [
    {
      id: 'rose',
      image: 'images/rose-plate.webp',
      name: '<em>Rosa × centifolia</em>, the cabbage rose',
      credit: 'After Pierre-Joseph Redouté, <cite>Les Roses</cite> (1817–1824). Public domain.',
    },
    {
      id: 'hyacinth',
      image: 'images/hyacinth-plate.webp',
      name: '<em>Hyacinthus orientalis</em>, the hyacinth (blue variety)',
      credit: 'After Pierre-Joseph Redouté, <cite>Les Liliacées</cite> (1802–1816). Public domain. Via Old Book Illustrations.',
    },
    {
      id: 'orchid',
      image: 'images/orchid-plate.webp',
      name: '<em>Cypripedium calceolus</em>, the lady’s slipper orchid',
      credit: 'After Pierre-Joseph Redouté, <cite>Les Liliacées</cite> (1802–1816). Public domain. Via <a href="https://www.oldbookillustrations.com/illustrations/cypripedium-calceolus/" target="_blank" rel="noopener">Old Book Illustrations<span class="sr-only"> (opens in a new tab)</span></a>.',
    },
  ];

  const CONFIG = {
    count: 24000,         // particles (every plant uses the same number, so they can morph)
    frame: [450, 604],    // shared frame every plant is fitted into (the rose's shape)
    minAlpha: 0.6,        // skip pixels more transparent than this
    pointSize: 1.8,       // dot diameter in CSS pixels
    opacity: 0.85,        // overall strength of the effect
    inkMix: 0.3,          // 0 = original colors, 1 = all forest-green ink
    ink: [0x2f / 255, 0x5d / 255, 0x3a / 255],
    drift: 2.2,           // how far dots wander (plate pixels)
    // "Alive" self-motion, inspired by the fizzing particle skin of the
    // emotions in Inside Out. Set any to 0 to turn that layer off.
    fizz: 0.7,            // fast tiny jitter per dot (plate pixels)
    twinkle: 0.4,         // how much each dot brightens/dims (0..1)
    breathe: 0.008,       // whole-flower swell (fraction of its size)
    sway: 0.012,          // whole-flower sway around the stem base (radians)
    pushRadius: 55,       // pointer/finger influence radius (CSS px)
    pushStrength: 22,     // how far dots get pushed (CSS px)
    introSeconds: 2.2,
    morphSeconds: 2.2,    // how long one plant takes to become the next
    autoSeconds: 20,      // advance to the next plant on its own after this long (0 = off)
    arc: 26,              // how far particles swing sideways mid-morph (frame units)
    fill: 0.94,           // how much of its box the plant fills (1 = edge to edge)
  };
  const TRAIL_LENGTH = 24; // must match the array size in the shader

  const box = document.querySelector('.contact-art');  // sized by CSS
  const canvas = box && box.querySelector('.particles');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return; // no WebGL: the page simply has no particle effect

  /* ---------- Shaders (GLSL: the C-like language GPUs run) ---------------- */
  const VERTEX_SHADER = `
    attribute vec2 aPosA;    // home position in the current plant (frame units)
    attribute vec3 aColA;    // color in the current plant
    attribute vec2 aPosB;    // home position in the next plant
    attribute vec3 aColB;
    attribute vec2 aRand;    // two random numbers per dot, 0..1

    uniform vec2 uRes;       // canvas size (device px)
    uniform vec2 uOffset;    // where the plate's top-left corner is drawn
    uniform float uScale;    // device px per plate pixel
    uniform float uPixelRatio;
    uniform float uTime;
    uniform float uIntro;    // 0 -> 1 during the fly-in
    uniform float uMorph;    // 0 -> 1 while one plant becomes the next
    uniform float uArc;
    uniform float uPointSize;
    uniform float uDrift;
    uniform float uFizz;
    uniform float uTwinkle;
    uniform float uBreathe;
    uniform float uSway;
    uniform vec2 uPivot;     // bottom of the stem (device px): sway/breathe origin
    uniform float uPushRadius;
    uniform float uPushStrength;
    uniform vec3 uTrail[${TRAIL_LENGTH}];  // xy = pointer position (device px), z = strength

    varying vec3 vColor;
    varying float vAlpha;

    // Smooth random field: random values on a grid, blended between corners
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float valueNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    void main() {
      // 0. Morph: blend each dot from its spot (and color) in the current
      //    plant to its spot in the next. Each dot leaves at a slightly
      //    different moment (aRand.x) and swings along a gentle arc, so the
      //    particles visibly rearrange instead of cross-fading.
      float mk = clamp(uMorph * 1.6 - aRand.x * 0.6, 0.0, 1.0);
      float me = mk * mk * (3.0 - 2.0 * mk);            // ease in and out
      vec2 travel = aPosB - aPosA;
      vec2 side = normalize(vec2(-travel.y, travel.x) + vec2(0.0001));
      vec2 aBase = mix(aPosA, aPosB, me)
                 + side * sin(3.14159 * me) * (aRand.y - 0.5) * 2.0 * uArc;
      vec3 aColor = mix(aColA, aColB, me);

      vec2 p = uOffset + aBase * uScale;

      // 1. Drift: each dot wanders slowly around its home position
      float t = uTime * 0.25;
      vec2 n = vec2(valueNoise(aBase * 0.03 + vec2(t, aRand.x * 9.0)),
                    valueNoise(aBase * 0.03 + vec2(aRand.y * 9.0, -t))) - 0.5;
      p += n * 2.0 * uDrift * uScale;

      // 1b. Fizz: a fast, tiny circular jitter at each dot's own speed and
      //     phase, so the surface shimmers while the shape holds still.
      p += vec2(sin(uTime * (4.0 + aRand.x * 5.0) + aRand.y * 60.0),
                cos(uTime * (3.0 + aRand.y * 5.0) + aRand.x * 60.0)) * uFizz * uScale;

      // 1c. Breathing: the whole flower swells slightly and sways around the
      //     base of the stem, slowly, like a plant in still air.
      float swell = 1.0 + uBreathe * sin(uTime * 0.9);
      float tilt = uSway * sin(uTime * 0.55);
      vec2 rel = (p - uPivot) * swell;
      p = uPivot + vec2(rel.x * cos(tilt) - rel.y * sin(tilt),
                        rel.x * sin(tilt) + rel.y * cos(tilt));

      // Twinkle: each dot pulses brighter/bigger on its own slow rhythm
      float tw = 0.5 + 0.5 * sin(uTime * (1.2 + aRand.x * 2.5) + aRand.y * 6.2832);

      // 2. Pointer trail: push dots away from recent pointer positions
      float touched = 0.0;
      for (int i = 0; i < ${TRAIL_LENGTH}; i++) {
        vec2 d = p - uTrail[i].xy;
        float dist = length(d);
        float f = uTrail[i].z * smoothstep(uPushRadius, 0.0, dist);
        p += (d / max(dist, 0.001)) * f * uPushStrength * (0.6 + aRand.x * 0.8);
        touched = max(touched, f);
      }

      // 3. Intro: start scattered, ease home. Each dot has a slightly
      //    different start time (aRand.y) so the rose assembles gradually.
      float k = clamp(uIntro * 1.5 - aRand.y * 0.5, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - k, 3.0);  // ease-out cubic
      float angle = aRand.x * 6.2832;
      p += vec2(cos(angle), sin(angle)) * (60.0 + aRand.y * 160.0) * uPixelRatio * (1.0 - e);

      // Device pixels -> clip space (-1..1, y up)
      vec2 clip = (p / uRes) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = uPointSize * (0.7 + aRand.y * 0.6) * (1.0 + touched * 0.8)
                   * (1.0 + uTwinkle * 0.5 * (tw - 0.5));

      // Brightest moment of a twinkle catches a little warm light
      vColor = mix(aColor, vec3(1.0, 0.97, 0.88), uTwinkle * 0.35 * tw * tw);
      vAlpha = e * (1.0 - uTwinkle * 0.5 + uTwinkle * 0.5 * tw);
    }`;

  const FRAGMENT_SHADER = `
    precision mediump float;
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      // gl.POINTS draws squares; keep only a soft-edged circle
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.25, d) * vAlpha * uOpacity;
      gl_FragColor = vec4(vColor * a, a);  // premultiplied alpha
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const u = {};
  ['uRes', 'uOffset', 'uScale', 'uPixelRatio', 'uTime', 'uIntro', 'uMorph', 'uArc', 'uPointSize', 'uDrift',
   'uFizz', 'uTwinkle', 'uBreathe', 'uSway', 'uPivot',
   'uPushRadius', 'uPushStrength', 'uTrail', 'uOpacity'].forEach((name) => {
    u[name] = gl.getUniformLocation(program, name);
  });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- Images -> particles ---------------------------------------- */
  // Every plant becomes exactly CONFIG.count dots, fitted into the same frame.
  // Dot i in one plant is paired with dot i in every other plant; sorting each
  // plant's dots top-to-bottom before pairing means dots travel short,
  // sensible paths (top of the rose -> top of the hyacinth, and so on).
  const [frameW, frameH] = CONFIG.frame;
  const N = CONFIG.count;
  const posBuffers = [];
  const colBuffers = [];

  function samplePlant(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data; // [r,g,b,a, r,g,b,a, ...]

    // Fit this plant into the shared frame ("contain"), centered
    const s = Math.min(frameW / w, frameH / h);
    const ox = (frameW - w * s) / 2;
    const oy = (frameH - h * s) / 2;

    // Every opaque enough pixel is a candidate
    const opaque = [];
    for (let i = 3; i < px.length; i += 4) if (px[i] / 255 >= CONFIG.minAlpha) opaque.push((i - 3) / 4);

    // Pick N of them at random (repeats allowed if the plant is small), place
    // each somewhere inside its pixel, and give it a sort key.
    const dots = [];
    for (let k = 0; k < N; k++) {
      const idx = opaque[Math.floor(Math.random() * opaque.length)];
      const x = (idx % w) + Math.random();
      const y = Math.floor(idx / w) + Math.random();
      const fx = ox + x * s;
      const fy = oy + y * s;
      const j = idx * 4;
      const col = [0, 1, 2].map((ch) => (px[j + ch] / 255) * (1 - CONFIG.inkMix) + CONFIG.ink[ch] * CONFIG.inkMix);
      dots.push({ fx, fy, col, key: fy + Math.random() * 25 }); // a little jitter mixes the paths
    }
    dots.sort((a, b) => a.key - b.key);

    const pos = new Float32Array(N * 2);
    const colr = new Float32Array(N * 3);
    dots.forEach((d, i) => {
      pos[i * 2] = d.fx;
      pos[i * 2 + 1] = d.fy;
      colr.set(d.col, i * 3);
    });
    return { pos, colr };
  }

  function upload(data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  }

  function point(name, buffer, size) {
    const loc = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  // Point the A attributes at plant `a` and the B attributes at plant `b`
  function bindPlants(a, b) {
    point('aPosA', posBuffers[a], 2);
    point('aColA', colBuffers[a], 3);
    point('aPosB', posBuffers[b], 2);
    point('aColB', colBuffers[b], 3);
  }

  function buildParticles(images) {
    images.forEach((img) => {
      const { pos, colr } = samplePlant(img);
      posBuffers.push(upload(pos));
      colBuffers.push(upload(colr));
    });
    const rand = new Float32Array(N * 2).map(() => Math.random());
    point('aRand', upload(rand), 2);
    bindPlants(0, 0);
    canvas.dataset.particles = N; // handy for debugging
  }

  /* ---------- Layout: size the canvas, fit the rose inside it ------------- */
  let dpr = 1;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // "contain" fit: as large as possible without cropping, centered
    const s = Math.min(rect.width / frameW, rect.height / frameH) * CONFIG.fill;
    const offsetX = (rect.width - frameW * s) / 2;
    const offsetY = (rect.height - frameH * s) / 2;

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uOffset, offsetX * dpr, offsetY * dpr);
    gl.uniform1f(u.uScale, s * dpr);
    gl.uniform1f(u.uPixelRatio, dpr);
    gl.uniform1f(u.uPointSize, CONFIG.pointSize * dpr);
    gl.uniform1f(u.uDrift, reduceMotion ? 0 : CONFIG.drift);
    // Reduce motion: no self-motion at all, just a still image of dots
    gl.uniform1f(u.uFizz, reduceMotion ? 0 : CONFIG.fizz);
    gl.uniform1f(u.uTwinkle, reduceMotion ? 0 : CONFIG.twinkle);
    gl.uniform1f(u.uBreathe, reduceMotion ? 0 : CONFIG.breathe);
    gl.uniform1f(u.uSway, reduceMotion ? 0 : CONFIG.sway);
    gl.uniform2f(u.uPivot, (offsetX + (frameW * s) / 2) * dpr, (offsetY + frameH * s) * dpr);
    gl.uniform1f(u.uArc, reduceMotion ? 0 : CONFIG.arc);
    gl.uniform1f(u.uPushRadius, CONFIG.pushRadius * dpr);
    gl.uniform1f(u.uPushStrength, CONFIG.pushStrength * dpr);
    gl.uniform1f(u.uOpacity, CONFIG.opacity);
  }

  /* ---------- Pointer trail ---------------------------------------------- */
  // A ring buffer of recent pointer positions. Each frame every point's
  // strength fades, so the disturbance trails behind the cursor and heals.
  const trail = new Float32Array(TRAIL_LENGTH * 3);
  let trailIndex = 0;
  let lastX = -1e4;
  let lastY = -1e4;

  // Works for mouse, pen, and touch alike (Pointer Events). A tap
  // (pointerdown) disturbs the spot under the finger; dragging leaves a trail.
  function onPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * dpr;
    const y = (event.clientY - rect.top) * dpr;
    if (event.type === 'pointermove' && Math.hypot(x - lastX, y - lastY) < 6 * dpr) return;
    lastX = x;
    lastY = y;
    trail.set([x, y, 1], trailIndex * 3);
    trailIndex = (trailIndex + 1) % TRAIL_LENGTH;
    wake();
  }

  /* ---------- Morph state ------------------------------------------------ */
  let current = 0;        // plant shown now
  let target = 0;         // plant being morphed toward
  let morphStart = null;  // timestamp when the current morph began
  let queued = null;      // a choice made mid-morph waits its turn
  let autoTimer = 0;      // seconds the current plant has been on screen
  let holdAuto = false;   // true while the mouse is over the figure or focus is in it

  function morphTo(index) {
    if (index === target && morphStart === null) return;
    if (morphStart !== null) { queued = index; return; }
    if (index === current) return;
    target = index;
    if (reduceMotion) {             // no animation: swap instantly
      current = target;
      bindPlants(current, current);
      gl.uniform1f(u.uMorph, 0);
      drawStill();
      return;
    }
    bindPlants(current, target);
    morphStart = performance.now();
    wake();
  }

  function stepMorph(now) {
    if (morphStart === null) return;
    const t = (now - morphStart) / 1000 / CONFIG.morphSeconds;
    if (t < 1) { gl.uniform1f(u.uMorph, t); return; }
    current = target;               // arrived: next plant becomes "current"
    bindPlants(current, current);
    gl.uniform1f(u.uMorph, 0);
    morphStart = null;
    if (queued !== null) { const q = queued; queued = null; morphTo(q); }
  }

  /* ---------- Render loop ------------------------------------------------ */
  let start = 0;
  let last = 0;
  let running = false;
  let visible = false;

  function frame(now) {
    if (!start) start = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const elapsed = (now - start) / 1000;

    const fade = Math.pow(0.04, dt); // strength x0.04 per second
    for (let i = 2; i < trail.length; i += 3) trail[i] *= fade;

    gl.uniform1f(u.uTime, elapsed);
    gl.uniform1f(u.uIntro, Math.min(elapsed / CONFIG.introSeconds, 1));
    stepMorph(now);

    // Auto-advance: count only on-screen, unhovered, between-morph time.
    // This loop only runs while the figure is visible, so time spent
    // scrolled away doesn't count and nobody misses a morph.
    if (CONFIG.autoSeconds && switcher && !holdAuto && morphStart === null) {
      autoTimer += dt;
      if (autoTimer >= CONFIG.autoSeconds) {
        select((target + 1) % PLANTS.length, { auto: true });
      }
    }
    gl.uniform3fv(u.uTrail, trail);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);

    if (running && visible) requestAnimationFrame(frame);
    else running = false;
  }

  function wake() {
    if (running || !visible || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function drawStill() {
    gl.uniform1f(u.uTime, 0);
    gl.uniform1f(u.uIntro, 1);
    gl.uniform3fv(u.uTrail, trail);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  /* ---------- Plant switch + caption ---------------------------------------- */
  const switcher = document.querySelector('.plant-switch');
  const captionName = document.querySelector('.figure-plant');
  const captionCredit = document.querySelector('.figure-credit');

  function select(index, { focus = false, auto = false } = {}) {
    autoTimer = 0;  // a manual choice gets a full interval before the next auto change
    // Screen readers announce plants people choose, but not the automatic
    // changes (otherwise they'd hear a new caption every 20 seconds).
    captionName.closest('figcaption').setAttribute('aria-live', auto ? 'off' : 'polite');
    const buttons = switcher.querySelectorAll('button');
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    if (focus) buttons[index].focus();
    captionName.innerHTML = PLANTS[index].name;
    captionCredit.innerHTML = PLANTS[index].credit;
    morphTo(index);
  }

  function setUpSwitch() {
    const buttons = [...switcher.querySelectorAll('button')];
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => select(i));
      // Arrow keys / Home / End move between plants, like the project toggle
      btn.addEventListener('keydown', (event) => {
        const last = buttons.length - 1;
        const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, { focus: true });
      });
    });
    switcher.hidden = false;        // only shown once the particles actually work

    // Hold the auto-advance while someone is looking closely or using the switch
    const figure = switcher.closest('figure');
    figure.addEventListener('pointerenter', () => { holdAuto = true; });
    figure.addEventListener('pointerleave', () => { holdAuto = false; });
    figure.addEventListener('focusin', () => { holdAuto = true; });
    figure.addEventListener('focusout', () => { holdAuto = false; });
  }

  /* ---------- Start: only when the Contact section gets close ----------- */
  // Nothing (not even the images) loads until the visitor scrolls near
  // Contact, and the fly-in starts when the plant is actually on screen.
  function init() {
    const images = PLANTS.map((plant) => {
      const img = new Image();
      img.src = plant.image;
      return img;
    });
    Promise.all(images.map((img) => img.decode())).then(() => {
      buildParticles(images);
      layout();
      canvas.classList.add('is-ready');
      if (switcher) setUpSwitch();

      if (reduceMotion) {
        drawStill();                      // a still image: no intro, drift, or interaction
        new ResizeObserver(() => { layout(); drawStill(); }).observe(box);
        return;
      }

      new ResizeObserver(layout).observe(box);
      box.addEventListener('pointermove', onPointer);
      box.addEventListener('pointerdown', onPointer);

      // Animate only while visible; the first time it appears, play the fly-in
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();  // the first frame that runs sets the fly-in's start time
      }, { threshold: 0.15 }).observe(box);
    }).catch(() => {});
  }

  const nearby = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    nearby.disconnect();
    init();
  }, { rootMargin: '400px 0px' });
  nearby.observe(box);
})();
