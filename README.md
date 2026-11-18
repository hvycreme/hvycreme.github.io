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
| Introduction | `#intro` | Name, short description, one paragraph, "Explore my research" / "Contact me", supporting facts row (education, graduation, certifications, open to / location), arched portrait |
| At a glance | `#strengths` | Four strengths employers screen for (research, technical, communication, responsibility), each a clickable card linking to its evidence on the page. Only facts already on the page belong here |
| 01 Selected Research | `#research` (old `#work` lands here) | Featured music-labeling study (`#p-music`: question → key finding → role → method), the related Python pipeline (`#p-pipeline`), and the synthesis project with the 3D molecule (`#p-synthesis`) |
| 02 Experience | `#experience` | Research appointments, then leadership, teaching & work. Each role is a sage glass bubble (title, with field/organization in small type underneath, dates, round arrow button) that opens to its details; "Expand all" opens every role |
| 03 Skills & Education | `#skills` (old `#methods` lands here), `#education` | Skills grouped by lab; degrees; certifications & training. Has its own nav link |
| 04 About | `#about` | Background, communication, plants and computers, Currently growing |
| 05 Contact | `#contact` | Invitation, email (with Copy), Email / LinkedIn, Print or save as PDF, interactive plant figure |

Experience entries that At a glance links to have ids: `#e-palomares`, `#e-wiskur`, `#e-outten`, `#e-ra`, `#e-ta`. A jumped-to entry or project glows briefly.

Main navigation: Research, Experience, Skills, About, and Contact (a pill button on wider screens, so contact is always one click away). Clicking any in-page link reveals the destination immediately instead of waiting for its fade-in.

### Print / save as PDF
The print styles (section 17 of `css/style.css`) turn the page into a clean, text-only CV: no header, animations, portrait, or plant art; every project card opens; both method explanations show; LinkedIn prints with its URL. The **Print or save as PDF** button in Contact runs it, and so does the browser's own Print command. Below 48rem the links fold into a labelled **Menu** button (`aria-expanded`; Escape closes it).

### Individual synthesis project (molecule viewer)
The Wiskur Lab entry includes an "Individual synthesis project" card. Its 3D viewer (3Dmol.js, self-hosted in `vendor/3dmol/`, BSD-3-Clause) stays switched off until a **verified** structure is added, so nothing guessed is ever shown:

```bash
pip install rdkit
python3 tools/make_molecule_assets.py --smiles "<lab-verified SMILES>" --source "e.g. confirmed by Dr. Wiskur, Oct 2026"
# or: --molfile lab-structure.sdf
```

This writes `molecules/target.sdf` (computational 3D coordinates: RDKit ETKDGv3 + MMFF94), `molecules/target-2d.svg` (static fallback), and `molecules/target.json` (formula, provenance), and adds `data-model="molecules/target.sdf"` to the card, which turns the viewer on. If any stereocenter is unassigned the script stops; pass `--allow-unassigned-stereo` only if that's correct (e.g. a racemate), and the page will say the model shows one arbitrary configuration.

### Adding the résumé
There is no résumé file yet, so no download button is shown. To add it: save the PDF as `files/resume.pdf`, then in `index.html` uncomment the two `Download résumé` links (one in the intro's `.hero-actions`, one in Contact).

## Unverified content
Anything not yet confirmed (dates, titles, duties, certifications, skill levels, photos) is tracked in **`TODO.private.md`** at the project root. That file is git-ignored (`.gitignore`), so it is never committed or published by GitHub Pages. Do not put unverified details on the page; add them only after they are confirmed.

## Tailoring for each application

Send a different link with each application. The page re-orders itself so the most relevant evidence comes first:

| Link | Use for | Effect |
|---|---|---|
| `https://hvycreme.github.io/` | General (any employer) | Default order |
| `https://hvycreme.github.io/?for=crc` | Clinical research coordinator | Experience lists reordered: research, data, and documentation first |
| `https://hvycreme.github.io/?for=ert` | Emergency room tech | Experience lists reordered: resident support and service roles first |

The order is set in `index.html` by numbers on each experience entry and skill group:

```html
<li data-crc="1" data-ert="3">   <!-- 1st for CRC links, 3rd for ERT links -->
```

## Common edits

**Résumé:** save your PDF as **`files/resume.pdf`** (exact name). Résumé links are removed from the site until this file exists; once it does, restore the résumé links in the header, hero, and contact section.

**Add an experience entry:** copy one whole `<li class="entry">…</li>` inside an `<ol class="entries">`, give it a new `id` (and change the `aria-controls` / body `id` to match, e.g. `e-new` / `e-new-body`), then give it `data-crc` / `data-ert` numbers. Leave out the `<span class="entry-date">` if there is no date. The glass colors are the `--sage-*` tokens at the top of section 9 in `css/style.css`; keep small text at 4.5:1 or better against `--sage-top`.

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

## Glass system

Every section uses one glass material (section 18 of `css/style.css`) in three tints, with the same bevelled rim, outer groove, inner shading, and soft lift:

| Tint | Token | Used for | Text that passes 4.5:1 on it |
|---|---|---|---|
| Frost | `--fill-frost`, `--fill-frost-strong` | Content panels: facts strip, At a glance, project cards, skill groups, email pill, secondary buttons | Every site color (`--color-text`, `--color-muted`, `--color-accent`, `--color-rust`) |
| Sage | `--fill-sage` | Compact items: role bubbles, skill chips, degrees, certificates, Currently growing, status badges, selected toggle | Only the sage inks: `--sage-ink`, `--sage-sub`, `--sage-date` |
| Forest | (in `.button-primary`) | Main actions: Explore my research, Email me, the active Contact pill | White |

Shared pieces: `--rim` (bright bevel), `--groove` (thin outer line), `--glass-shadow` / `--glass-shadow-sm` (shading and lift), `--glass-shadow-pressed` (the sunk look while a button is pressed), `--etch` (an engraved divider line). To put something new in glass: `border: 2px solid transparent; background: var(--fill-frost), var(--rim); box-shadow: var(--glass-shadow);`.

### Interaction details
- **Buttons** rise slightly on hover and sink into their groove while pressed.
- **Toggles** (Plain language / Scientific detail; Rose / Hyacinth / Orchid): a single glass thumb glides to the chosen option.
- **Navigation:** a frosted pill slides behind the active section's link; a thin sage line under the header shows reading progress.
- **Back to top:** a round glass button floats in after about a screen and a half of scrolling, and steps aside near the footer.
- **Cards** lift on hover, and a soft light follows the cursor across them (mouse and trackpad only).
- **Entrances:** cards in a group rise one after another as their section scrolls in.
- All motion is off for visitors with Reduce motion turned on; print flattens the glass into plain outlined boxes.

## Customizing the look

All in the `:root` block at the top of `css/style.css`:

- `--color-bg` (cream page, `#F3EFE5`) and `--color-surface` (the few panels: featured study, molecule panel; also the 3D viewer background)
- `--color-text`, `--color-muted`, `--color-line`, `--color-line-strong`: ink and hairlines. Structure comes from hairlines and space, not shadows
- `--color-accent` (forest green: links and primary actions), `--color-rust` (metadata only), `--color-mint` (selected states)
- `--font-display` (serif headings), `--font-sans` (body text), `--font-mono` (only the IUPAC name)
- `--measure`: reading width for long text; `--space-section`: room between sections
- `--dur-control`, `--dur-slow`, `--ease`: control feedback and fade timing

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

### Version tags on CSS and JS (cache busting)
Every stylesheet and script link in `index.html` ends in `?v=…` (e.g. `css/style.css?v=20261118a`). Browsers, iOS Safari especially, keep using a saved copy of a file for a while, so a visitor could get the new HTML with an old stylesheet and see a broken page. **Whenever you change any file in `css/`, `js/`, or `vendor/`, change the `?v=` value on all those links** (e.g. to today's date plus a letter). A new value is a new URL, so every browser fetches the fresh file.

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

## Portrait helix (Mint Drift)
`vendor/mint-drift/` holds the supplied renderer (`mint-drift.js`, `mint-drift.css`, `preset.json`), unmodified, with the approved preset baked in. `js/portrait-helix.js` mounts it behind the portrait with `chrome:false, controls:false`, wires the site's **Pause animation** button to `pause()`/`play()`, starts paused for Reduce motion, rests while off screen, and exposes `window.portraitHelix.destroy()`. The lean is a CSS `rotate(-24deg)` on `.portrait-helix`; the soft edge is a radial mask over the approved paper color (`#f4f8ef`), so neither the renderer nor its colors were changed.
