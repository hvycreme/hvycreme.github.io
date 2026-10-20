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
   3. Navigation: phone menu + active link
   Phones: the four links sit behind a "Menu" button (a disclosure:
   aria-expanded says open/closed, aria-controls names the list). Escape or
   choosing a link closes it, and focus returns to the button on Escape.
   Active link: rootMargin '-50% 0px -50% 0px' shrinks the observed area to a
   line across the middle of the screen; the section crossing it is active.
   A section can borrow a link with data-nav (Skills & Education -> Experience).
   A second observer on the footer handles the very bottom of the page.
   -------------------------------------------------------------------------- */
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.nav-list a');
const trackedSections = document.querySelectorAll('main > section[id]');
const lastSectionId = trackedSections[trackedSections.length - 1].id;
let centerId = null;
let atBottom = false;

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  header.classList.toggle('menu-open', open);
}

menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && header.classList.contains('menu-open')) {
    setMenu(false);
    menuButton.focus();
  }
});
navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));
// Close when focus or a tap leaves the header
document.addEventListener('click', (event) => {
  if (!header.contains(event.target)) setMenu(false);
});
header.addEventListener('focusout', (event) => {
  if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
});

function setActiveLink(id) {
  const section = id && document.getElementById(id);
  const target = section ? section.dataset.nav || id : null;
  navLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === `#${target}`;
    link.classList.toggle('is-active', isMatch);
    if (isMatch) link.setAttribute('aria-current', 'location'); // "you are here" for screen readers
    else link.removeAttribute('aria-current');
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
   3b. Project cards: closed squares that open to full width
   Each card has a "Details" button (aria-expanded / aria-controls) and a
   body that JS hides. Without JS every body stays open. Links to a card or
   to anything inside it (#p-music, Experience links) open it first, so the
   browser's jump lands on visible content.
   -------------------------------------------------------------------------- */
const projectCards = document.querySelectorAll('.project-card');

function setCard(card, open) {
  const button = card.querySelector('.project-toggle');
  const body = card.querySelector('.project-body');
  button.setAttribute('aria-expanded', String(open));
  body.hidden = !open;
  card.classList.toggle('is-open', open);
}

projectCards.forEach((card) => {
  setCard(card, false);
  card.querySelector('.project-toggle').addEventListener('click', () => {
    const open = !card.classList.contains('is-open');
    setCard(card, open);
    // An opened card moves to its own full-width row: bring it into view
    if (open) {
      requestAnimationFrame(() => card.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      }));
    }
  });
});

function cardFor(id) {
  const target = id && document.getElementById(id);
  return target ? target.closest('.project-card') : null;
}

// In-page links: open the card synchronously, before the default jump
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const card = cardFor(link.getAttribute('href').slice(1));
  if (card && !card.classList.contains('is-open')) setCard(card, true);
});

// Arriving with a hash (or typing one): open, then scroll to the target
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const card = cardFor(id);
  if (!card) return;
  if (!card.classList.contains('is-open')) setCard(card, true);
  requestAnimationFrame(() => document.getElementById(id).scrollIntoView({ block: 'start' }));
}
openFromHash();
window.addEventListener('hashchange', openFromHash);

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

/* --------------------------------------------------------------------------
   5. Copy email: success feedback
   The button appears only where the Clipboard API works (it needs https,
   which GitHub Pages provides). It confirms with a check for 2 seconds, and
   a hidden role="status" line announces "Email address copied" to screen
   readers, since a label change alone isn't always read aloud.
   -------------------------------------------------------------------------- */
document.querySelectorAll('.copy-email').forEach((button) => {
  if (!navigator.clipboard || !window.isSecureContext) return;
  const status = button.parentElement.querySelector('.copy-status');
  let timer = null;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
    } catch (e) {
      return; // permission refused: the mailto link still works
    }
    button.classList.add('is-done');
    button.textContent = 'Copied';
    if (status) status.textContent = 'Email address copied';
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove('is-done');
      button.textContent = 'Copy';
      if (status) status.textContent = '';
    }, 2000);
  });
});
