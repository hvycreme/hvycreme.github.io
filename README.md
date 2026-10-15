# hvycreme.github.io

My personal portfolio: a single-page static site built with plain HTML, CSS, and JavaScript (no frameworks, no build step), hosted free on GitHub Pages.

**Live site:** https://hvycreme.github.io/

Design: a cream-colored botanical-science aesthetic. Warm cream paper, charcoal text, forest-green accents with small touches of terracotta, Fraunces serif headings, and one leaf motif carried through the page.

## Project structure

```
index.html        All page content
css/style.css     All styles; design tokens (colors, fonts, spacing, motion) at the top in :root
js/main.js        Role tailoring, scroll reveals, active nav, explanation toggle, optional sound
fonts/            Fraunces (self-hosted, SIL Open Font License)
images/           rose-plate.webp (hero plate), placeholders for figures and plant photos, favicon
tools/            prepare_plate.py (botanical plate cut-out), prepare_headshot.py (portrait crop + color match)
files/            PDFs: put resume.pdf here
audio/            background.mp3 (optional ambient loop, off by default)
.nojekyll         Tells GitHub Pages to serve files as-is (skip its Jekyll build step)
```

## Page sections

| Section | id | What goes there |
|---|---|---|
| Introduction | `#intro` | Name, majors, interests, the summer roles you're seeking, "What I bring", résumé + contact buttons |
| 01 Relevant experience | `#experience` | Research, employment, volunteering, leadership: responsibilities + concrete contributions |
| 02 Selected work | `#work` | Two projects, each with an always-visible **Key finding** and a Plain language / Scientific detail toggle |
| 03 Skills & certifications | `#skills` | Only what you hold, with an honest level (Proficient / Working / Familiar) |
| 04 About me | `#about` | Why medicine, two "unfurling leaf" notes, a plant photo, and three **Currently growing** cards |
| 05 Contact | `#contact` | Email, résumé download, LinkedIn |

Everything in **[square brackets]** is a placeholder to replace.

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

The "Seeking…" line in the intro also has one version per role (`<span data-for="crc">` etc.).

## Common edits

**Résumé:** save your PDF as **`files/resume.pdf`** (exact name). Both résumé buttons point there.

**Add an experience entry:** copy one whole `<li>…</li>` inside `<ol class="timeline">`, then give it `data-crc` / `data-ert` numbers.

**Project figures:** export your chart as PNG or SVG into `images/`, change the `<img src>`, and write `alt` text that states what the chart *shows* (the trend, not just "a chart").

**Plant photo:**
1. Crop to 4:5 portrait and resize to **800×1000 px** (2× its display size, sharp on Retina screens).
2. Compress at [squoosh.app](https://squoosh.app): **WebP**, quality ~75. Aim for **under 150 KB**.
3. Save as `images/my-plant.webp`, update the `<img src>` in the About section, and describe the photo in `alt`.

**Headshot:** `images/headshot-800.webp` / `headshot-480.webp`, made from the original photo by `tools/prepare_headshot.py` (crops to 4:5, color-matches the wall to the site's cream, strips metadata such as GPS location). For a new photo: `python3 tools/prepare_headshot.py photo.jpg` (adjust `CROP` in the script so your face sits in the upper middle).

**Hero plate (currently hidden):** to show it again, remove `hidden` from `<figure class="hero-figure plate" hidden>` in `index.html` (and re-enable the commented-out preload in `<head>`). While hidden, its image isn't downloaded at all.

**Hero plate:** P.-J. Redouté's *Rosa centifolia* (1817–24, public domain), cut out of its white paper by `tools/prepare_plate.py`. The numbered markers are an inline `<svg>` in `index.html`; the names are in the `<ol class="plate-key">` right below it.
- *Move a marker:* each `<g class="plate-marker">` has a feature point (`x1,y1`, where the dashed line starts) and a badge position (the circle's `cx,cy`), in the image's own 450×604 pixel coordinates.
- *Use a sharper scan or a different plate:* `pip install pillow numpy scipy`, then `python3 tools/prepare_plate.py my-scan.jpg images/rose-plate.webp`, and adjust the marker coordinates and the `viewBox`/`width`/`height` to the new image size (the script prints it).

**Music:** off by default; visitors turn it on with the speaker button in the header. Replace `audio/background.mp3` with any MP3 you have the rights to use (under ~1 MB). To remove sound entirely, delete the `<button class="sound-toggle">` in `index.html`.

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
- Sound is off by default; the music file is only downloaded if a visitor turns it on.
