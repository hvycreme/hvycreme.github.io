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
   data-ert number, so the most relevant evidence comes first.
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
  // Back at the intro (no active section): return the phone nav strip to its start
  if (!id && nav.scrollLeft > 0) nav.scrollTo({ left: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
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

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => show(btn.dataset.show));

    // Arrow keys / Home / End move focus within the group and select the
    // newly focused button. Enter and Space work natively on <button>.
    btn.addEventListener('keydown', (event) => {
      const group = Array.from(btn.closest('.explain-toggle').querySelectorAll('button'));
      let target = null;
      if (event.key === 'ArrowRight') target = (index + 1) % group.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + group.length) % group.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = group.length - 1;
      if (target === null) return;

      event.preventDefault();
      group[target].focus();
      show(group[target].dataset.show);
    });
  });
  show('plain'); // start in plain language (without JS, both panels stay visible)
});
