# ASME — Najran University

Arabic/English club platform presented as one continuous engineering space. A single full-viewport 3D scene contains six free-moving mechanical objects around the club identity. There are no homepage sections, laboratory cards, or separate model galleries. Club information, projects, and events open on demand in accessible dialogs; the administration route remains `#/admin`.

## Development and checks

Requires Node.js 22+ and npm. Use the existing checkout; do not create a worktree unless requested.

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
npm run preview
```

Use `/ASME/`. Source files are in `app/src/`; public files are in `app/public/`. `studio-layout.js`, `studio-renderer.js`, `studio-state.js` and `studio.css` implement the continuous interface. The previous section-based public interface has been removed. Historical `#lab` links open the same space; `#about`, `#projects`, and `#events` open the corresponding content dialogs.

## Direct manipulation

Drag any visible mechanism to reposition it. Select a piece directly or from the bottom dock to open its controls. Choose Move, Drive or Inspect; drive with a drag/angle slider, rotate the piece in Inspect, toggle wireframe/exploded view, and reset. The dock can pause all motion. Keyboard users can select a piece from the dock and use arrows to move it, Shift + arrows to drive it, Home to reset, and Space to pause/play. These are illustrative kinematic models, not engineering solvers.

All six mechanisms share one viewport and one WebGL context. Rendering pauses while the page is hidden or a content dialog is open, caps pixel ratio/frame rate for mobile, honors reduced-motion preferences, and disposes listeners, geometry, materials, and the WebGL context when changing language or entering administration. Mobile and desktop have separate starting placements; manually moved objects stay within reachable bounds. WebGL failure leaves the site content controls available.

There are 17 automated tests covering PostgreSQL permissions/applications/publishing, mechanical geometry and movement/reset, placement boundaries, and invalid font handling. Browser checks exercise the actual single-canvas interface, mouse/touch dragging, keyboard operation, object controls, bilingual layout, content dialogs, and local administration. Service contract tests use mocked HTTP responses and do not establish readiness of a real backend.

## Dashboard and shared service

Open `https://barqstudy.github.io/ASME/#/admin`. It manages bilingual site copy, announcements, projects, events, images, branding/contact settings, and JSON backups/import. Without a connected service, an explicitly labelled local editor and draft preview are available. Saving a draft never publishes it automatically.

Shared publishing, protected administrator login, membership/event applications, status review, search, and CSV export require Supabase. Follow [backend/SETUP.md](backend/SETUP.md) and [backend/schema.sql](backend/schema.sql). Only public project URL and publishable/anon key belong in `app/public/config.json`. Never commit passwords or service-role keys. Tokens remain in memory. The dashboard lists the latest 1,000 applications. Admin account creation/allowlisting happens through the Supabase project dashboard/SQL editor.

## Typography and branding

Thmanyah is requested for **both Arabic and English**, but remains pending valid original font files. The uploaded `._thmanyahserifdisplay-*.otf` files are 221-byte AppleDouble metadata, not fonts. See `app/public/fonts/README.md`. The build validates actual OTF files, generates local font CSS, and retains named fallback fonts while originals are absent. It never presents a substitute as Thmanyah.

The supplied ASME logo is a transparent PNG, with the original JPG retained as reference. Legacy default JPG settings resolve to the transparent image. The new public interface uses the blue logo on a light surface; dark administration uses a white treatment.

## Publication

`npm run build` prepares fonts, creates `dist/` for GitHub Actions, and syncs root `index.html`, `assets/`, `brand/`, `fonts/`, `config.json`, and `.nojekyll` for branch-based Pages. Commit the generated publication files together with the source. Both supported publication modes serve bundled output. Retain previously published hashed assets for cached HTML.

Illustrative projects and events remain labelled as sample content, not official club announcements. No membership counts are invented. Event times use Saudi Arabia time (UTC+03:00).
