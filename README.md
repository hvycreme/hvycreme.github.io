# hvycreme.github.io

My personal portfolio: a single-page static site built with plain HTML, CSS, and JavaScript (no frameworks, no build step), hosted free on GitHub Pages.

**Live site:** https://hvycreme.github.io/

Design: a soft, cream "clay" interface with a clean professional layout. A cream background (`#F3EFE5`), lighter surfaces raised above it, charcoal text, sans-serif headings, raised pill buttons that sink when pressed, a recessed toggle track with a mint selected segment, and a mint focus glow for keyboard users. One leaf motif and the botanical plate carry the botanical theme.

## Project structure

```
index.html        All page content
css/style.css     All styles; design tokens (colors, fonts, spacing, motion) at the top in :root
js/main.js        Role tailoring, scroll reveals, active nav, explanation toggle
js/particles.js   Interactive particle rose in the Contact section (WebGL)
js/pollen.js      Mouse-trail particles across the page background (Canvas 2D)
images/           headshot, rose-plate.webp (particle source), placeholders for figures and plant photos, favicon
tools/            prepare_plate.py (botanical plate cut-out), prepare_headshot.py (portrait crop + color match)
files/            PDFs: put resume.pdf here
.nojekyll         Tells GitHub Pages to serve files as-is (skip its Jekyll build step)
```

## Page sections

| Section | id | Purpose |
|---|---|---|
| Introduction | `#intro` | Name, positioning statement, summer goal, three highlight links, Email / LinkedIn |
| 01 Research | `#research` | Appointments, dates, concise responsibilities |
| 02 Projects | `#work` | Each project: question/purpose, my contribution, approach (with a flow diagram), outcome/status. Anchors: `#p-music`, `#p-pipeline`, `#p-synthesis` |
| 03 Methods | `#methods` | Compact, grouped reference to methods actually used, with the lab where each was used |
| 04 Experience | `#experience` | Housing, teaching, leadership, volunteering, employment |
| 05 Education | `#education` | Degrees, certifications and training |
| 06 About | `#about` | Why medicine, personal notes, Currently growing |
| 07 Contact | `#contact` | Invitation, readable email address, Email / LinkedIn, interactive plant figure |

### Adding the résumé
There is no résumé file yet, so no download button is shown. To add it: save the PDF as `files/resume.pdf`, then in `index.html` uncomment the two `Download résumé` links (one in the intro's `.hero-actions`, one in Contact).

## Unverified content
Anything not yet confirmed (dates, titles, duties, certifications, skill levels, photos) is tracked in **`TODO.private.md`** at the project root. That file is git-ignored (`.gitignore`), so it is never committed or published by GitHub Pages. Do not put unverified details on the page; add them only after they are confirmed.

## Tailoring for each application

Send a different link with each application. The page re-orders itself so the most relevant evidence comes first:

| Link | Use for | Effect |
|---|---|---|
| `https://hvycreme.github.io/` | General | Default order: leads with clinical-research-relevant work |
| `https://hvycreme.github.io/?for=crc` | Clinical research coordinator | Research and Experience reordered: research, data, and documentation first |
| `https://hvycreme.github.io/?for=ert` | Emergency room tech | Research and Experience reordered: clinical training, service, and certifications first |

The order is set in `index.html` by numbers on each experience entry and skill group:

```html
<li data-crc="1" data-ert="3">   <!-- 1st for CRC links, 3rd for ERT links -->
```

## Common edits

**Résumé:** save your PDF as **`files/resume.pdf`** (exact name). Résumé links are removed from the site until this file exists; once it does, restore the résumé links in the header, hero, and contact section.

**Add an experience entry:** copy one whole `<li>…</li>` inside `<ol class="timeline">`, then give it `data-crc` / `data-ert` numbers.

**Project figures:** export your chart as PNG or SVG into `images/`, change the `<img src>`, and write `alt` text that states what the chart *shows* (the trend, not just "a chart").

**Plant photo:**
1. Crop to 4:5 portrait and resize to **800×1000 px** (2× its display size, sharp on Retina screens).
2. Compress at [squoosh.app](https://squoosh.app): **WebP**, quality ~75. Aim for **under 150 KB**.
3. Save as `images/my-plant.webp`, update the `<img src>` in the About section, and describe the photo in `alt`.

**Headshot:** `images/headshot-800.webp` / `headshot-480.webp`, made from the original photo by `tools/prepare_headshot.py` (crops to 4:5, color-matches the wall to the site's cream, strips metadata such as GPS location). For a new photo: `python3 tools/prepare_headshot.py photo.jpg` (adjust `CROP` in the script so your face sits in the upper middle).

**Particle rose (Contact section):** `js/particles.js` turns `images/rose-plate.webp` into ~24,000 WebGL particles that drift and move away from a mouse or finger (the technique from Codrops' *Interactive Particles with Three.js*, written in plain WebGL, no library). Adjust it in the `CONFIG` object at the top of the file:
- `opacity`: strength; `inkMix`: 0 = the rose's own colors, 1 = all forest green
- `step`: sample every Nth pixel (higher = fewer, sparser particles)
- `pushRadius` / `pushStrength`: how a pointer or finger disturbs the particles
- `fill`: how much of its box the rose fills
- `fizz`, `twinkle`, `breathe`, `sway`: the rose's self-motion (shimmering dots, twinkling, a slow swell and sway), inspired by the particle skin of the emotions in *Inside Out*; set any to 0 to turn that layer off
Nothing loads until a visitor scrolls near Contact; the fly-in plays when it comes into view; it pauses offscreen and shows a still image for visitors with Reduce motion on. Without WebGL the box is simply empty.

**Mouse trail ("pollen"):** `js/pollen.js` releases a few small yellow and mustard dots wherever the mouse moves; they drift up and fade in about a second. It only runs while dots are visible, is mouse/trackpad only (not touch), and is off for Reduce motion. Tune it with `MAX_PARTICLES`, `SPACING`, `COLORS`, and the `globalAlpha` line in `frame()`.

**Plant morph:** a switch above the Contact figure (Rose · Hyacinth · Orchid) morphs the same 24,000 particles between three plates. Each plant is fitted into one shared frame, and dots are paired by position so they travel short paths while changing color. Plants, captions, and credits are the `PLANTS` list at the top of `js/particles.js`; to add one, cut it out with `tools/prepare_plate.py`, add an entry there, and add a button to `.plant-switch` in `index.html`. `morphSeconds` and `arc` tune the transition. `autoSeconds` (default 20) advances to the next plant on its own; the count only runs while the figure is on screen, pauses while the mouse is over it or focus is in the switch, restarts after a manual pick, and is off for Reduce motion. Set it to 0 to turn auto-advance off.

**Rose source image:** P.-J. Redouté, *Rosa centifolia*, from *Les Roses* (1817–1824). The artwork is in the public domain; the specific scan's source is not recorded yet; track it in `TODO.private.md` and add a source link to the credit (or swap in a scan with a documented source, e.g. from the Biodiversity Heritage Library) before publishing. To process a new scan: `pip install pillow numpy scipy`, then `python3 tools/prepare_plate.py my-scan.jpg images/rose-plate.webp`.

## Customizing the look

All in the `:root` block at the top of `css/style.css`:

- `--color-bg`: the cream page background (`#F3EFE5`); `--color-surface`: lighter raised surfaces (cards, pill buttons) above it
- `--color-text`, `--color-muted`, `--color-border`: text and edges; keep borders soft so surfaces read as clay, not outlines
- `--color-accent` (mint, used for the selected toggle segment and the focus glow) and `--color-terracotta` (use sparingly)
- Buttons: raised pill shape by default, sinking into a pressed state on `:active`; the toggle is a recessed track with a mint selected segment
- Focus: a mint glow ring on `:focus-visible`; keep it visible on every interactive element
- `--font-sans` (headings and body) and `--font-mono`: fonts; headings are sans-serif
- `--space-section`: breathing room between sections
- `--dur-fast`, `--dur-slow`, `--ease`: animation speed and feel (keep durations 0.3–0.9 s)

When changing colors, check text contrast is at least **4.5:1** with [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).

## Previewing locally

```bash
cd hvycreme.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying (GitHub Pages)

GitHub Pages is already enabled: every push to `main` republishes within about a minute.

To set it up from scratch:

1. Push the code to a **public** repo named `<username>.github.io`.
2. On GitHub: **Settings → Pages**.
3. Under **Build and deployment**, Source: **Deploy from a branch**; Branch: **main**, folder **/ (root)** → **Save**.
4. Wait 1–2 minutes, then visit `https://<username>.github.io/`.

Deploy status is under the repo's **Actions** tab ("pages build and deployment": green ✓ = live).

### Editing without a terminal
On github.com, open any file → **pencil icon** → edit → **Commit changes**. To upload a photo or PDF: open the folder → **Add file → Upload files**.

### "I pushed but nothing changed"
GitHub Pages lets browsers cache files for up to 10 minutes. Force a fresh copy:
- **Safari (Mac):** Option + Cmd + R
- **Chrome / Firefox (Mac):** Cmd + Shift + R
- **iPhone:** close the tab and reopen, or add `?v=2` to the URL

## Accessibility & performance notes

- Real `<a>`, `<button>`, and `<details>` elements throughout; skip link; visible keyboard focus.
- All text meets WCAG AA contrast (4.5:1 or better).
- All animations respect the OS **Reduce motion** setting (`prefers-reduced-motion`).
- Animations only touch `transform` and `opacity`; scroll effects use `IntersectionObserver`, never scroll events.
- Works without JavaScript: every section is visible and both project explanations show.
- The particle rose is decorative (hidden from screen readers), loads only near the Contact section, and works with mouse and touch.
