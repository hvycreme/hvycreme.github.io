/* ==========================================================================
   portrait-helix.js: mounts the Mint Drift helix behind the portrait.
   Uses the supplied renderer (vendor/mint-drift) with its approved preset
   unchanged: no settings overrides and nothing read from browser storage.
   - chrome:false / controls:false hide the prototype title, caption, panel.
   - A site-native button pauses and plays it (the API's pause()/play()).
   - Reduce motion: starts paused (a still frame); the button can still play.
   - It also rests while scrolled out of view, without changing the
     visitor's own pause choice.
   - window.portraitHelix.destroy() tears it down (used to check cleanup);
     a second run of this script never starts a second loop.
   ========================================================================== */
(() => {
  const host = document.querySelector('.portrait-helix');
  const button = document.querySelector('.helix-toggle');
  if (!host || !button || !window.MintDrift || window.portraitHelix) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = reduceMotion;
  let onScreen = true;

  const helix = window.MintDrift.mount(host, {
    chrome: false,
    controls: false,
    height: '100%',
    paused: userPaused,
  });

  function apply() {
    if (userPaused || !onScreen) helix.pause();
    else helix.play();
    button.textContent = userPaused ? 'Play animation' : 'Pause animation';
    button.classList.toggle('is-paused', userPaused);
  }

  function onClick() {
    userPaused = !userPaused;
    apply();
  }

  button.addEventListener('click', onClick);
  button.hidden = false;

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; apply(); })
    : null;
  observer?.observe(host);
  apply();

  window.portraitHelix = {
    instance: helix,
    destroy() {
      observer?.disconnect();
      button.removeEventListener('click', onClick);
      button.hidden = true;
      helix.destroy();
      delete window.portraitHelix;
    },
  };
})();
