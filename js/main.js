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
