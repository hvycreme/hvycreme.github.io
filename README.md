# hvycreme.github.io

My personal portfolio: a single-page static site built with plain HTML, CSS, and JavaScript (no frameworks, no build step), hosted free on GitHub Pages.

**Live site:** https://hvycreme.github.io/

## Project structure

```
index.html        All page content (one <section> per topic)
css/style.css     All styles; design tokens (colors, fonts, spacing, motion) at the top in :root
js/main.js        Scroll reveals, active nav, intro gate + music, click sounds
images/           Photos, favicon (placeholder.svg is a stand-in portrait)
files/            PDFs, e.g. resume.pdf
audio/            background.mp3 (ambient loop for the intro gate)
.nojekyll         Tells GitHub Pages to serve files as-is (skip its Jekyll build step)
```

## Editing content

Everything you'll want to change is in `index.html`. Search for these placeholders:

| What | Where |
|---|---|
| Your name | `<title>`, `og:title`, `.logo` ("YN"), `.hero-title`, gate `#gate-title`, footer |
| Tagline | `.hero-tagline` and `og:description` |
| About text + photo | `<section id="about">` |
| Projects | `<section id="projects">`: copy/paste an `<article class="card">` per project |
| Experience / Leadership | `<section id="experience">` / `<section id="leadership">` |
| Email, LinkedIn | `<section id="contact">` |

**Remove a section** (e.g. Leadership): delete its `<section>` *and* its `<li>` in the nav, then renumber the others.

### Résumé
Save your PDF as **`files/resume.pdf`** (exact name). The Contact link already points there.

### Photo
1. Crop it square, resize to **640×640 px** (2× the 320 px display size, sharp on Retina screens).
2. Compress it at [squoosh.app](https://squoosh.app): choose **WebP**, quality ~75. Aim for **under 100 KB**.
3. Save as `images/portrait.webp` and change the `<img src>` in the About section. Update the `alt` text to describe the photo.

### Music
Replace `audio/background.mp3` with any MP3 you have the rights to use (keep it under ~1 MB: 96 kbps is plenty for background music). Volume is `MUSIC_VOLUME` near the top of the Step 7 block in `js/main.js`.

To **remove the intro gate entirely**: delete the `<div class="intro-gate">…</div>` block in `index.html`. Everything else adapts automatically.

## Customizing the look

All in the `:root` block at the top of `css/style.css`:

- `--color-accent`: the single accent color
- `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-border`: the palette
- `--font-sans`, `--font-mono`: fonts
- `--dur-fast`, `--dur-slow`, `--ease`: animation speed and feel (keep durations 0.3–0.9 s)

When changing colors, check text contrast is at least **4.5:1** with a tool like [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).

## Previewing locally

Opening `index.html` by double-clicking mostly works, but a local server matches GitHub Pages more closely:

```bash
cd hvycreme.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying (GitHub Pages)

GitHub Pages is already enabled. Every push to `main` republishes automatically within about a minute.

For reference, to set it up from scratch:

1. Push the code to a **public** repo named `<username>.github.io` (any other name works too, but the site then lives at `<username>.github.io/<repo-name>/`).
2. On GitHub: **Settings → Pages**.
3. Under **Build and deployment**, Source: **Deploy from a branch**; Branch: **main**, folder **/ (root)** → **Save**.
4. Wait 1–2 minutes, then visit `https://<username>.github.io/`.

Check deploy status under the repo's **Actions** tab ("pages build and deployment": green ✓ = live).

### Editing without a terminal
On github.com, open any file → click the **pencil icon** → edit → **Commit changes**. The site updates a minute later. To upload a photo or PDF: open the folder → **Add file → Upload files**.

### "I pushed but nothing changed"
GitHub Pages lets browsers cache files for up to 10 minutes. Force a fresh copy:
- **Safari (Mac):** Option + Cmd + R
- **Chrome / Firefox (Mac):** Cmd + Shift + R
- **iPhone:** close the tab and reopen, or add `?v=2` to the URL

## Accessibility & performance notes

- Real `<a>` / `<button>` elements throughout; skip link; visible keyboard focus.
- All animations respect the OS **Reduce motion** setting (`prefers-reduced-motion`).
- Animations only touch `transform` and `opacity`; scroll effects use `IntersectionObserver`, never scroll events.
- Background audio only starts from a click, fades in, and can be turned off anytime with the header toggle.
- First load is ~11 KB gzipped (HTML + CSS + JS). The music is only downloaded if the visitor chooses sound.
