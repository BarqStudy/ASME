# ASME — Najran University

Arabic RTL engineering club website with an interactive Three.js mechanical assembly, responsive project filters, event dialogs, and a local-only membership interest form.

## Development

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev -- --port 5173
```

## Production build

```sh
npm run build
npm run preview
```

Projects, statistics, and events are illustrative design content, pending club approval. Membership interest is stored only in browser localStorage; no data is transmitted to the club. No backend or credentials are required. The Arabic font uses Google Fonts, with local system font fallbacks. All 3D geometry is generated locally.

## GitHub Pages

Source files live in `app/`. Run `npm run build` after changes. It builds `dist/` for GitHub Actions and refreshes the root `index.html` and `assets/` for branch-based GitHub Pages. Commit those generated publication files together with source changes. Keep `.nojekyll` to serve the static output directly. This supports both Pages publication modes without serving unbundled source modules. Older hashed assets are retained for cached HTML.
