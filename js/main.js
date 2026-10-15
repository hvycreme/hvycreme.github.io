/* ==========================================================================
   main.js
   Loaded with `defer`, so the whole HTML document exists when this runs.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Step 4: Scroll reveals
   IntersectionObserver asks the browser to tell us when an element crosses
   into the viewport. Unlike a "scroll" event listener (which fires dozens of
   times per second), the callback only runs when visibility actually changes.
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
    {
      // Shrink the viewport's bottom edge by 10%, so a section reveals once
      // it's a little way onscreen rather than the instant its top pixel peeks in.
      rootMargin: '0px 0px -10% 0px',
      // 0 = fire as soon as any part is visible. (A ratio like 0.3 would never
      // fire for a section taller than ~3 screens, since 30% can't fit at once.)
      threshold: 0,
    }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  // Very old browser: just show everything.
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* --------------------------------------------------------------------------
   Step 5: Active nav highlighting
   rootMargin '-50% 0px -50% 0px' shrinks the observed area to a zero-height
   line across the middle of the screen. A section "intersects" only while
   it's crossing that line, so exactly one section is active at a time.
   -------------------------------------------------------------------------- */
const nav = document.querySelector('.site-header nav');
const navLinks = document.querySelectorAll('.nav-list a');
// Every section with an id; includes the hero, so nothing is active at the top
const trackedSections = document.querySelectorAll('main > section[id]');

function setActiveLink(id) {
  navLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', isMatch);
    // aria-current tells screen readers which link is "where you are"
    if (isMatch) {
      link.setAttribute('aria-current', 'location');
      scrollNavToLink(link);
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// On phones the nav is a sideways-scrolling strip: keep the active link in view.
// We scroll only the nav itself (not the page) so it can't fight the page scroll.
function scrollNavToLink(link) {
  if (nav.scrollWidth <= nav.clientWidth) return; // everything fits: nothing to do
  const navBox = nav.getBoundingClientRect();
  const linkBox = link.getBoundingClientRect();
  const linkCenter = linkBox.left - navBox.left + nav.scrollLeft + linkBox.width / 2;
  nav.scrollTo({ left: linkCenter - nav.clientWidth / 2, behavior: 'smooth' });
}

// Two inputs decide the active link:
//   centerId  - the section crossing the middle line of the screen
//   atBottom  - whether the footer is fully visible (the page can't scroll further)
// On tall screens the last section is too short to ever reach the middle,
// so at the very bottom we force the last section active instead.
let centerId = null;
let atBottom = false;
const lastSectionId = trackedSections[trackedSections.length - 1].id;

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

  // threshold: 1 = fire when 100% of the footer is visible (or stops being so)
  const bottomObserver = new IntersectionObserver(
    ([entry]) => {
      atBottom = entry.isIntersecting;
      updateActiveLink();
    },
    { threshold: 1 }
  );
  bottomObserver.observe(document.querySelector('.site-footer'));
}

/* --------------------------------------------------------------------------
   Step 7: Intro gate + background music
   Browsers block audio until the visitor interacts with the page (so sites
   can't blast sound at you). The gate's button click is that interaction.

   Music runs through the Web Audio API (an AudioContext) instead of just
   setting audio.volume, because iPhone Safari ignores audio.volume. A
   GainNode is a volume knob that works everywhere, and can fade smoothly.
   -------------------------------------------------------------------------- */
const root = document.documentElement;
const gate = document.getElementById('intro-gate');
const soundToggle = document.getElementById('sound-toggle');
const MUSIC_SRC = 'audio/background.mp3';
const MUSIC_VOLUME = 0.25; // 0 = silent, 1 = full

let audioCtx = null;   // created on first click (it must start inside a user gesture)
let music = null;      // <audio> element, created only if the visitor wants sound
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
    // Created here (not at page load) so the MP3 is only downloaded if wanted
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    musicGain = ctx.createGain();
    ctx.createMediaElementSource(music).connect(musicGain).connect(ctx.destination);
  }
  // Fade in over 2 s from silence
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(0.0001, now);
  musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, now + 2);
  // play() returns a Promise; it rejects if blocked or the file is missing
  music.play().catch(() => setSound(false));
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

// While the gate is up, everything behind it is "inert": not clickable,
// not focusable, hidden from screen readers. Tab stays inside the gate.
const pageParts = document.querySelectorAll('.site-header, main, .site-footer');

function closeGate(withSound) {
  try { sessionStorage.setItem('entered', '1'); } catch (e) {}
  if (withSound) {
    setSound(true);
    startMusic();
  }
  pageParts.forEach((el) => (el.inert = false));
  gate.classList.add('is-leaving');
  root.classList.remove('gate-open'); // unlocks scroll + starts the hero animation

  // Hand keyboard/screen-reader focus to the page's main heading, so the
  // next Tab continues from the top of the content instead of getting lost.
  document.querySelector('.hero-title').focus({ preventScroll: true });

  // Remove the gate from the page once its fade finishes. The timeout is a
  // safety net in case transitionend never fires (e.g. the tab is hidden).
  const removeGate = () => gate.remove();
  gate.addEventListener('transitionend', removeGate, { once: true });
  setTimeout(removeGate, 1200);
}

if (root.classList.contains('gate-open')) {
  pageParts.forEach((el) => (el.inert = true));
  document.getElementById('gate-enter').addEventListener('click', () => closeGate(true));
  document.getElementById('gate-skip').addEventListener('click', () => closeGate(false));
  document.getElementById('gate-enter').focus();
} else {
  gate.remove(); // returning visitor this session: no gate
}
