/* ==========================================================================
   particles.js: the rose plate as interactive particles in the Contact section.

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
    fill: 0.94,           // how much of its box the rose fills (1 = edge to edge)
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
  ['uRes', 'uOffset', 'uScale', 'uPixelRatio', 'uTime', 'uIntro', 'uPointSize', 'uDrift',
   'uFizz', 'uTwinkle', 'uBreathe', 'uSway', 'uPivot',
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

  /* ---------- Layout: size the canvas, fit the rose inside it ------------- */
  let dpr = 1;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // "contain" fit: as large as possible without cropping, centered
    const s = Math.min(rect.width / plateW, rect.height / plateH) * CONFIG.fill;
    const offsetX = (rect.width - plateW * s) / 2;
    const offsetY = (rect.height - plateH * s) / 2;

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
    gl.uniform2f(u.uPivot, (offsetX + (plateW * s) / 2) * dpr, (offsetY + plateH * s) * dpr);
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

  /* ---------- Start: only when the Contact section gets close ----------- */
  // Nothing (not even the image) loads until the visitor scrolls near
  // Contact, and the fly-in starts when the rose is actually on screen.
  function init() {
    const img = new Image();
    img.src = CONFIG.image;
    img.decode().then(() => {
      buildParticles(img);
      layout();
      canvas.classList.add('is-ready');

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
