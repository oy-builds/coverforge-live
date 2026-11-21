# CoverForge — GTA-style Cover Art Maker

CoverForge turns your own photos and a caption into a multi-panel,
GTA-style cover poster and exports it as a shareable PNG. It is a static
web app: no build step, no server-side code, no network requests. Photos
are read on your own machine and never uploaded anywhere.

## Run it

Serve the `app/` folder with any static file server and open it in a
desktop browser, for example:

```sh
cd app && python3 -m http.server 8080
# then open http://localhost:8080
```

## What it does

- **Five-panel collage** in the classic cover grid: one tall hero panel
  plus four smaller panels, rearranged automatically for wide posters.
- **Your photos or built-in scenes.** Each panel can hold one of five
  original illustrated scene presets — Neon Beach Sunset, Palm Boulevard,
  Swamp Airboat, Downtown Night and Marina Dawn, all painted procedurally
  on canvas — or a photo from your machine. One photo can fill a single
  panel or every panel at once.
- **Per-panel framing.** Click a panel (on the poster or in the panel
  strip) and frame it with zoom and left/right / up/down shift sliders.
- **Editable cover text.** Game title in stacked bold lettering, a
  tagline band, and an optional circular "VI" badge.
- **Three style presets** — Neon Vice, Sunset Coast and Midnight —
  re-grade the whole poster: panel frames, lettering, badge and tint.
- **Full-size PNG export** at the three common post sizes:
  1080×1080, 1080×1350 and 1920×1080.

## Handing it in

`main.ts` is the entry's hand-in program (Node 22, standard library
only). It copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` there with the vendored make.fun library in
`vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program is deterministic: the same tree always produces the same
dossier bytes. Run the smoke tests with:

```sh
node smoke.test.mjs
```

## Layout

- `app/` — the web app (`index.html`, `app.js`, `styles.css`)
- `screenshots/` — the cover and editor screenshots the entry is judged by
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged
- `main.ts` — the hand-in program
- `smoke.test.mjs` — smoke tests for structure, limits and determinism

All artwork in the app and the screenshots is original; the scene
presets are drawn in code and the "photo" panels in the screenshots use
procedurally painted portraits, not pictures of real people.

## License

MIT — see `LICENSE`.
