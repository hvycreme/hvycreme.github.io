/* ==========================================================================
   particles.js: the rose plate as interactive particles behind the intro.

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
  const CONFIG = {
    image: 'images/rose-plate.webp',
    step: 2,              // sample every Nth pixel (bigger = fewer, sparser dots)
    minAlpha: 0.6,        // skip pixels more transparent than this
    pointSize: 2.1,       // dot diameter in CSS pixels
    opacity: 0.55,        // overall strength of the effect: keep it a background
    inkMix: 0.3,          // 0 = original colors, 1 = all forest-green ink
    ink: [0x2f / 255, 0x5d / 255, 0x3a / 255],
    drift: 2.2,           // how far dots wander (plate pixels)
    pushRadius: 70,       // cursor influence radius (CSS px)
    pushStrength: 28,     // how far dots get pushed (CSS px)
    introSeconds: 2.2,
    // Where the rose sits, relative to the portrait: its height as a multiple
    // of the portrait's height, and where the plate's center lands (0..1 of
    // the portrait box; values outside 0..1 move it beyond the photo).
    placement: { scale: 1.6, x: 0.8, y: 0.42 },
  };
  const TRAIL_LENGTH = 24; // must match the array size in the shader

  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.portrait');
  const canvas = document.querySelector('.hero-particles');
  if (!hero || !portrait || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return; // no WebGL: the page simply has no particle effect

  /* ---------- Shaders (GLSL: the C-like language GPUs run) ---------------- */
  const VERTEX_SHADER = `
    attribute vec2 aBase;    // the dot's home position, in plate pixels
    attribute vec3 aColor;
    attribute vec2 aRand;    // two random numbers per dot, 0..1

    uniform vec2 uRes;       // canvas size (device px)
    uniform vec2 uOffset;    // where the plate's top-left corner is drawn
    uniform float uScale;    // device px per plate pixel
    uniform float uPixelRatio;
    uniform float uTime;
    uniform float uIntro;    // 0 -> 1 during the fly-in
    uniform float uPointSize;
    uniform float uDrift;
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
      vec2 p = uOffset + aBase * uScale;

      // 1. Drift: each dot wanders slowly around its home position
      float t = uTime * 0.25;
      vec2 n = vec2(valueNoise(aBase * 0.03 + vec2(t, aRand.x * 9.0)),
                    valueNoise(aBase * 0.03 + vec2(aRand.y * 9.0, -t))) - 0.5;
      p += n * 2.0 * uDrift * uScale;

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
      p += vec2(cos(angle), sin(angle)) * (120.0 + aRand.y * 260.0) * uPixelRatio * (1.0 - e);

      // Device pixels -> clip space (-1..1, y up)
      vec2 clip = (p / uRes) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = uPointSize * (0.7 + aRand.y * 0.6) * (1.0 + touched * 0.8);

      vColor = aColor;
      vAlpha = e;
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
  ['uRes', 'uOffset', 'uScale', 'uPixelRatio', 'uTime', 'uIntro', 'uPointSize', 'uDrift',
   'uPushRadius', 'uPushStrength', 'uTrail', 'uOpacity'].forEach((name) => {
    u[name] = gl.getUniformLocation(program, name);
  });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- Image -> particles ----------------------------------------- */
  let count = 0;
  let plateW = 0;
  let plateH = 0;

  function buildParticles(img) {
    plateW = img.naturalWidth;
    plateH = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = plateW;
    c.height = plateH;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, plateW, plateH).data; // [r,g,b,a, r,g,b,a, ...]

    const base = [];
    const color = [];
    const rand = [];
    for (let y = 0; y < plateH; y += CONFIG.step) {
      for (let x = 0; x < plateW; x += CONFIG.step) {
        const i = (y * plateW + x) * 4;
        if (px[i + 3] / 255 < CONFIG.minAlpha) continue;
        base.push(x + Math.random() * CONFIG.step, y + Math.random() * CONFIG.step);
        for (let ch = 0; ch < 3; ch++) {
          const original = px[i + ch] / 255;
          color.push(original * (1 - CONFIG.inkMix) + CONFIG.ink[ch] * CONFIG.inkMix);
        }
        rand.push(Math.random(), Math.random());
      }
    }
    count = base.length / 2;

    // Each attribute lives in its own GPU buffer
    const attribute = (name, data, size) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attribute('aBase', base, 2);
    attribute('aColor', color, 3);
    attribute('aRand', rand, 2);
    canvas.dataset.particles = count; // handy for debugging
  }

  /* ---------- Layout: size the canvas, place the rose -------------------- */
  let dpr = 1;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Portrait box, relative to the canvas
    const pBox = portrait.getBoundingClientRect();
    const { scale, x, y } = CONFIG.placement;
    const plateCssH = pBox.height * scale;
    const s = plateCssH / plateH;                 // CSS px per plate px
    const centerX = pBox.left - box.left + pBox.width * x;
    const centerY = pBox.top - box.top + pBox.height * y;

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uOffset, (centerX - (plateW * s) / 2) * dpr, (centerY - plateCssH / 2) * dpr);
    gl.uniform1f(u.uScale, s * dpr);
    gl.uniform1f(u.uPixelRatio, dpr);
    gl.uniform1f(u.uPointSize, CONFIG.pointSize * dpr);
    gl.uniform1f(u.uDrift, reduceMotion ? 0 : CONFIG.drift);
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

  function onPointerMove(event) {
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) * dpr;
    const y = (event.clientY - box.top) * dpr;
    if (Math.hypot(x - lastX, y - lastY) < 6 * dpr) return; // skip tiny moves
    lastX = x;
    lastY = y;
    trail.set([x, y, 1], trailIndex * 3);
    trailIndex = (trailIndex + 1) % TRAIL_LENGTH;
    wake();
  }

  /* ---------- Render loop ------------------------------------------------ */
  let start = 0;
  let last = 0;
  let running = false;
  let visible = true;

  function frame(now) {
    if (!start) start = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const elapsed = (now - start) / 1000;

    const fade = Math.pow(0.04, dt); // strength x0.04 per second
    for (let i = 2; i < trail.length; i += 3) trail[i] *= fade;

    gl.uniform1f(u.uTime, elapsed);
    gl.uniform1f(u.uIntro, Math.min(elapsed / CONFIG.introSeconds, 1));
    gl.uniform3fv(u.uTrail, trail);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);

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
    gl.drawArrays(gl.POINTS, 0, count);
  }

  /* ---------- Start (after the page has loaded, so it never delays it) --- */
  function init() {
    const img = new Image();
    img.src = CONFIG.image;
    img.decode().then(() => {
      buildParticles(img);
      layout();
      canvas.classList.add('is-ready');

      if (reduceMotion) {
        drawStill();                      // a still image: no intro, drift, or interaction
        new ResizeObserver(() => { layout(); drawStill(); }).observe(hero);
        return;
      }

      new ResizeObserver(layout).observe(hero);
      hero.addEventListener('pointermove', onPointerMove);

      // Only animate while the intro is on screen (no work when scrolled away)
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
      }).observe(hero);
    }).catch(() => {});
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
