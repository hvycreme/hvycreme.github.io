# hvycreme.github.io

My personal portfolio: a single-page static site built with plain HTML, CSS, and JavaScript (no frameworks, no build step), hosted free on GitHub Pages.

**Live site:** https://hvycreme.github.io/

Design: a botanical field notebook with a clean professional layout. Warm cream paper, charcoal text, forest-green accents with small touches of terracotta, Fraunces serif headings, ruled section headings, and one leaf motif.

## Project structure

```
index.html        All page content
css/style.css     All styles; design tokens (colors, fonts, spacing, motion) at the top in :root
js/main.js        Role tailoring, scroll reveals, active nav, explanation toggle
js/particles.js   Interactive particle rose in the Contact section (WebGL)
js/pollen.js      Mouse-trail particles across the page background (Canvas 2D)
fonts/            Fraunces (self-hosted, SIL Open Font License)
images/           headshot, rose-plate.webp (particle source), placeholders for figures and plant photos, favicon
tools/            prepare_plate.py (botanical plate cut-out), prepare_headshot.py (portrait crop + color match)
files/            PDFs: put resume.pdf here
.nojekyll         Tells GitHub Pages to serve files as-is (skip its Jekyll build step)
```

## Page sections

| Section | id | What goes there |
|---|---|---|
| Introduction | `#intro` | Name, majors, three-sentence introduction, résumé + contact buttons, headshot |
| 01 Experience | `#experience` | Compact timeline: dates, role, organization, what you did |
| 02 Selected work | `#work` | Projects: summary and result always visible; Plain language / Scientific detail toggle for the explanation |
| 03 Skills & certifications | `#skills` | Four groups: clinical, research & lab, data & computing, communication |
| 04 About me | `#about` | Why medicine, two "unfurling leaf" notes, a plant photo, and **Currently growing** |
| 05 Contact | `#contact` | Email, résumé download, LinkedIn, and the interactive particle rose |

### Draft placeholders
Everything still waiting for real information is in **[square brackets]** with `class="draft"`, which shows a dashed terracotta highlight on the page. Search `index.html` for `class="draft"` to find them all; when you replace one, delete the brackets and the class. Nothing should be published while any remain.

## Tailoring for each application

Send a different link with each application. The page re-orders itself so the most relevant evidence comes first:

| Link | Use for | Effect |
|---|---|---|
| `https://hvycreme.github.io/` | General | Default order |
| `https://hvycreme.github.io/?for=crc` | Clinical research coordinator | Research, data, and documentation first |
| `https://hvycreme.github.io/?for=ert` | Emergency room tech | Clinical training, service, and certifications first |

The order is set in `index.html` by numbers on each experience entry and skill group:

```html
<li data-crc="1" data-ert="3">   <!-- 1st for CRC links, 3rd for ERT links -->
```

## Common edits

**Résumé:** save your PDF as **`files/resume.pdf`** (exact name). Both résumé buttons point there.

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
Nothing loads until a visitor scrolls near Contact; the fly-in plays when it comes into view; it pauses offscreen and shows a still image for visitors with Reduce motion on. Without WebGL the box is simply empty.

**Mouse trail ("pollen"):** `js/pollen.js` releases a few small yellow and mustard dots wherever the mouse moves; they drift up and fade in about a second. It only runs while dots are visible, is mouse/trackpad only (not touch), and is off for Reduce motion. Tune it with `MAX_PARTICLES`, `SPACING`, `COLORS`, and the `globalAlpha` line in `frame()`.

**Rose source image:** P.-J. Redouté, *Rosa centifolia*, from *Les Roses* (1817–1824). The artwork is in the public domain; the specific scan's source is not recorded, so note where it came from (or swap in a scan with a documented source, e.g. from the Biodiversity Heritage Library) before publishing. To process a new scan: `pip install pillow numpy scipy`, then `python3 tools/prepare_plate.py my-scan.jpg images/rose-plate.webp`.

## Customizing the look

All in the `:root` block at the top of `css/style.css`:

- `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-border`: the palette
- `--color-accent` (forest green) and `--color-terracotta` (use sparingly)
- `--font-serif`, `--font-sans`, `--font-mono`: fonts
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
