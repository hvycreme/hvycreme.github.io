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

// Jumping to a section (nav, "See the study", a shared #link) shows it, and
// everything above it, at once, so the visitor never lands on a blank,
// still-fading area or sees sections pop in behind the scroll.
function revealThrough(id) {
  const target = id && document.getElementById(id);
  if (!target) return;
  for (const el of revealEls) {
    const containsTarget = el.contains(target);
    // Stop at the first section that starts after the target
    if (!containsTarget && el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING) break;
    el.classList.add('is-visible');
    if (containsTarget) break;
  }
}
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (link) revealThrough(link.getAttribute('href').slice(1));
});
if (location.hash) revealThrough(decodeURIComponent(location.hash.slice(1)));

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
  card.querySelector('.project-toggle').addEventListener('click', (event) => {
    // With js/study-sheet.js the card opens as a floating panel instead
    if (window.studySheet) {
      window.studySheet.toggle(card, event);
      return;
    }
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

/* --------------------------------------------------------------------------
   3c. Experience bubbles
   Each role's button (aria-expanded / aria-controls) opens its details; the
   CSS animates the height. Several can be open at once. "Expand all" opens
   or closes every role, and follows along when roles are toggled one by one.
   -------------------------------------------------------------------------- */
const entries = document.querySelectorAll('.entry');
const expandAll = document.querySelector('.expand-all');

function setEntry(entry, open) {
  entry.querySelector('.entry-toggle').setAttribute('aria-expanded', String(open));
  entry.classList.toggle('is-open', open);
}

function syncExpandAll() {
  if (!expandAll) return;
  const allOpen = [...entries].every((e) => e.classList.contains('is-open'));
  expandAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
  expandAll.setAttribute('aria-pressed', String(allOpen));
}

entries.forEach((entry) => {
  entry.querySelector('.entry-toggle').addEventListener('click', () => {
    setEntry(entry, !entry.classList.contains('is-open'));
    syncExpandAll();
  });
});

if (expandAll) {
  expandAll.hidden = false;
  expandAll.addEventListener('click', () => {
    const open = expandAll.getAttribute('aria-pressed') !== 'true';
    entries.forEach((entry) => setEntry(entry, open));
    syncExpandAll();
  });
}

// A link to a card or a role (or anything inside one) opens it first
function cardFor(id) {
  const target = id && document.getElementById(id);
  return target ? target.closest('.project-card, .entry') : null;
}

function openHolder(holder, targetId) {
  if (holder.classList.contains('is-open')) return;
  if (holder.classList.contains('entry')) {
    setEntry(holder, true);
    syncExpandAll();
  } else if (window.studySheet) {
    window.studySheet.open(holder, null, targetId);
  } else {
    setCard(holder, true);
  }
}

// In-page links: open synchronously, before the default jump
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  const holder = cardFor(id);
  if (!holder) return;
  // A study opens as a floating panel: no jump down the page
  if (window.studySheet && holder.classList.contains('project-card')) event.preventDefault();
  openHolder(holder, id);
});

// Arriving with a hash (or typing one): open, then scroll to the target
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const holder = cardFor(id);
  if (!holder) return;
  openHolder(holder, id);
  if (window.studySheet && holder.classList.contains('project-card')) return;
  requestAnimationFrame(() => document.getElementById(id).scrollIntoView({ block: 'start' }));
}
// After every deferred script has run, so study-sheet.js is ready
document.addEventListener('DOMContentLoaded', openFromHash);
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

/* --------------------------------------------------------------------------
   6. Print or save as PDF
   The print styles (css/style.css, section 17) turn the page into a clean,
   text-only CV with every project open. The button only appears with JS,
   since it needs window.print().
   -------------------------------------------------------------------------- */
document.querySelectorAll('.print-page').forEach((button) => {
  button.hidden = false;
  button.addEventListener('click', () => window.print());
});
// Printing from the browser menu should show every section too
window.addEventListener('beforeprint', () => {
  revealEls.forEach((el) => el.classList.add('is-visible'));
});

/* --------------------------------------------------------------------------
   7. Glass interactions (css/style.css, section 18)
   -------------------------------------------------------------------------- */

// 7a. Segmented controls: one glass thumb glides to the pressed option.
// Watches aria-pressed, so it also follows the plant switch in particles.js.
document.querySelectorAll('.explain-toggle').forEach((group) => {
  function place(animate) {
    const pressed = group.querySelector('button[aria-pressed="true"]');
    if (!pressed || !pressed.offsetWidth) return;
    group.classList.toggle('no-anim', !animate);
    group.style.setProperty('--thumb-x', `${pressed.offsetLeft - 3}px`);
    group.style.setProperty('--thumb-w', `${pressed.offsetWidth}px`);
    group.classList.add('has-thumb');
  }
  new MutationObserver(() => place(true)).observe(group, {
    subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'],
  });
  // Sizes change when a card opens, the plant switch appears, or fonts load
  if ('ResizeObserver' in window) new ResizeObserver(() => place(false)).observe(group);
  place(false);
});

// 7b. Desktop nav: a frosted pill slides behind the active link
const navList = document.querySelector('.nav-list');
if (navList) {
  const indicator = document.createElement('li'); // a list may only hold <li>
  indicator.className = 'nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  navList.prepend(indicator);
  navList.classList.add('has-indicator');

  const placeIndicator = () => {
    const active = navList.querySelector('a.is-active:not(.nav-cta)');
    if (!active) {
      navList.style.setProperty('--ind-o', '0');
      return;
    }
    const listBox = navList.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    navList.style.setProperty('--ind-x', `${box.left - listBox.left}px`);
    navList.style.setProperty('--ind-w', `${box.width}px`);
    navList.style.setProperty('--ind-o', '1');
  };
  // The active class is set by section 3; follow its changes
  new MutationObserver(placeIndicator).observe(navList, {
    subtree: true, attributes: true, attributeFilter: ['class'],
  });
  window.addEventListener('resize', placeIndicator);
}

// 7c. Reading progress and the floating back-to-top button.
// One passive scroll listener, batched to one update per frame.
const progressBar = document.querySelector('.scroll-progress');
const floatTop = document.querySelector('.float-top');
let scrollQueued = false;

function onScrollFrame() {
  scrollQueued = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  if (progressBar) progressBar.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
  if (floatTop) {
    // Shown after ~1.5 screens, hidden again near the footer's own button
    const nearEnd = max - y < 200;
    floatTop.classList.toggle('is-shown', y > window.innerHeight * 1.5 && !nearEnd);
  }
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(onScrollFrame);
  }
}, { passive: true });
onScrollFrame();

// 7d. Pointer sheen on glass cards (mouse and trackpad only)
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.strength, .project-card, .entry, .skill-groups > div').forEach((card) => {
  card.classList.add('sheen');
  card.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || prefersReducedMotion.matches) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  });
});

// 7e. Staggered entrances: number the cards in each group
document.querySelectorAll('.strength-grid, .project-grid, .entries, .skill-groups, .edu-list, .cert-list, .growing-list')
  .forEach((group) => {
    group.classList.add('stagger');
    [...group.children].forEach((child, i) => child.style.setProperty('--i', Math.min(i, 8)));
  });
