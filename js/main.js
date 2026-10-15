/* ==========================================================================
   main.js
   Loaded with `defer`, so the whole HTML document exists when this runs.
   ========================================================================== */

// matchMedia lets JS read the same media queries CSS uses.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* --------------------------------------------------------------------------
   1. Role tailoring: ?for=crc or ?for=ert
   Send https://hvycreme.github.io/?for=crc with a clinical research
   coordinator application and ?for=ert with an emergency room tech one.
   Lists marked data-sortable get re-ordered by each item's data-crc /
   data-ert number, and the matching "Seeking..." line in the intro shows.
   We move the actual DOM nodes (instead of CSS `order`) so the reading
   order for screen readers and keyboard Tab matches what's on screen.
   -------------------------------------------------------------------------- */
const ROLES = ['crc', 'ert'];
const role = new URLSearchParams(window.location.search).get('for');

if (ROLES.includes(role)) {
  document.querySelectorAll('[data-sortable]').forEach((list) => {
    const items = [...list.children];
    items.sort((a, b) => Number(a.dataset[role]) - Number(b.dataset[role]));
    items.forEach((item) => list.append(item)); // append() moves an existing node to the end
  });

  document.querySelectorAll('.hero-seeking [data-for]').forEach((line) => {
    line.hidden = line.dataset.for !== role;
  });
}

/* --------------------------------------------------------------------------
   2. Scroll reveals
   IntersectionObserver tells us when an element crosses into the viewport.
   Unlike a "scroll" listener (dozens of calls per second), the callback only
   runs when visibility actually changes.
   -------------------------------------------------------------------------- */
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // reveal once, then stop watching
      });
    },
    // Reveal once a section is a little way onscreen. threshold 0 (not e.g.
    // 0.3) so very tall sections still trigger on small phone screens.
    { rootMargin: '0px 0px -10% 0px', threshold: 0 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* --------------------------------------------------------------------------
   3. Active nav highlighting
   rootMargin '-50% 0px -50% 0px' shrinks the observed area to a line across
   the middle of the screen; the section crossing it is the active one.
   A second observer on the footer handles the very bottom of the page,
   where the last (short) section can never reach the middle.
   -------------------------------------------------------------------------- */
const nav = document.querySelector('.site-header nav');
const navLinks = document.querySelectorAll('.nav-list a');
const trackedSections = document.querySelectorAll('main > section[id]');
const lastSectionId = trackedSections[trackedSections.length - 1].id;
let centerId = null;
let atBottom = false;

function setActiveLink(id) {
  navLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', isMatch);
    if (isMatch) {
      link.setAttribute('aria-current', 'location'); // "you are here" for screen readers
      scrollNavToLink(link);
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// On phones the nav is a sideways-scrolling strip: keep the active link in view.
function scrollNavToLink(link) {
  if (nav.scrollWidth <= nav.clientWidth) return;
  const navBox = nav.getBoundingClientRect();
  const linkBox = link.getBoundingClientRect();
  const linkCenter = linkBox.left - navBox.left + nav.scrollLeft + linkBox.width / 2;
  nav.scrollTo({
    left: linkCenter - nav.clientWidth / 2,
    behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
  });
}

function updateActiveLink() {
  setActiveLink(atBottom ? lastSectionId : centerId);
}

if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) centerId = entry.target.id;
      });
      updateActiveLink();
    },
    { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
  );
  trackedSections.forEach((section) => navObserver.observe(section));

  const bottomObserver = new IntersectionObserver(
    ([entry]) => {
      atBottom = entry.isIntersecting;
      updateActiveLink();
    },
    { threshold: 1 } // fires when 100% of the footer is visible
  );
  bottomObserver.observe(document.querySelector('.site-footer'));
}

/* --------------------------------------------------------------------------
   4. "Plain language / Scientific detail" toggle
   Each project has two buttons and two panels. The `hidden` attribute
   removes a panel from view AND from screen readers; aria-pressed tells
   assistive tech which button is currently on.
   -------------------------------------------------------------------------- */
document.querySelectorAll('.project').forEach((project) => {
  const buttons = project.querySelectorAll('.explain-toggle button');
  const panels = project.querySelectorAll('.explain-panel');

  function show(name) {
    buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.show === name)));
    panels.forEach((panel) => (panel.hidden = panel.dataset.panel !== name));
  }

  buttons.forEach((btn) => btn.addEventListener('click', () => show(btn.dataset.show)));
  show('plain'); // start in plain language (without JS, both panels stay visible)
});

/* --------------------------------------------------------------------------
   5. Optional ambient music (header toggle)
   Browsers only allow audio to start from a user gesture; clicking the
   toggle is that gesture. Music runs through the Web Audio API because
   iPhone Safari ignores audio.volume, while a GainNode works everywhere
   and can fade smoothly. The MP3 is only downloaded if someone turns it on.
   -------------------------------------------------------------------------- */
const soundToggle = document.getElementById('sound-toggle');
const MUSIC_SRC = 'audio/background.mp3';
const MUSIC_VOLUME = 0.25; // 0 = silent, 1 = full

let audioCtx = null;
let music = null;
let musicGain = null;
let soundOn = false;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function startMusic() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (!music) {
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    musicGain = ctx.createGain();
    ctx.createMediaElementSource(music).connect(musicGain).connect(ctx.destination);
  }
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(0.0001, now);
  musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, now + 2); // 2 s fade-in
  music.play().catch(() => setSound(false)); // rejects if blocked or file missing
}

function stopMusic() {
  if (!music) return;
  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(0, now + 0.4);
  setTimeout(() => { if (!soundOn) music.pause(); }, 450);
}

function setSound(on) {
  soundOn = on;
  soundToggle.setAttribute('aria-pressed', String(on));
}

soundToggle.addEventListener('click', () => {
  setSound(!soundOn);
  if (soundOn) startMusic();
  else stopMusic();
});

/* --------------------------------------------------------------------------
   6. Subtle UI click sounds (only while sound is on)
   Each click builds a brand-new oscillator + gain node for a ~0.1 s blip.
   Web Audio nodes are single-use and cheap, so one per event is the
   intended pattern, and rapid clicks overlap instead of cutting off.
   -------------------------------------------------------------------------- */
function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);                      // exponential ramps can't start at 0
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.005);  // 5 ms attack avoids a pop
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.13); // nodes are garbage-collected after they stop
}

// Event delegation: one listener handles clicks on every link, button, and summary
document.addEventListener('click', (event) => {
  if (soundOn && event.target.closest('a, button, summary')) playClickSound();
});

/* --------------------------------------------------------------------------
   7. Botanical plate: hovering a name in the key highlights its marker
   (and vice versa). Both carry the same data-part number, so one listener
   on the whole figure can match them up.
   -------------------------------------------------------------------------- */
const plate = document.querySelector('.plate');

if (plate) {
  const highlight = (part) => {
    plate.querySelectorAll('[data-part]').forEach((el) => {
      el.classList.toggle('is-highlighted', el.dataset.part === part);
    });
  };
  plate.addEventListener('pointerover', (event) => {
    const target = event.target.closest('[data-part]');
    highlight(target ? target.dataset.part : null);
  });
  plate.addEventListener('pointerleave', () => highlight(null));
}
