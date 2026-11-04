# ASME — Najran University

An Arabic/English RTL/LTR club platform using the supplied ASME Najran student-section logo and ASME blue. Includes a locally generated interactive Three.js assembly, responsive projects and events, and a bilingual content-management dashboard.

## Development

Requires Node.js 22+ and npm. Use the existing checkout; do not create a worktree unless requested.

```sh
npm ci
npm run dev -- --port 5173
```

The app is mounted at `/ASME/`. Source code lives in `app/src/`. Public files live in `app/public/`. The default logo is a transparent PNG cutout; the original supplied JPG is retained as a source reference. Legacy default JPG settings resolve to the transparent logo too.

## Validation and production

```sh
npm test
npm run build
npm run preview
```

The six PostgreSQL tests use PGlite to exercise real SQL and row-level permissions with stand-in Supabase auth/storage schemas: public/private access, publishing and revision conflicts, invalid documents, application validation/deduplication, event registration, image-upload permissions, and administrator revocation. They do not establish readiness of a real Supabase project. Browser validation covers Arabic/English switching and persistence, WebGL controls, project filters, dialogs, content/project/event editing, draft preview isolation, mobile navigation, and overflow. Service-contract browser tests use mocked HTTP responses, not a connected production backend.

Three.js and the administration module load separately. Rendering stops while the scene is offscreen or the page is hidden, caps pixel ratio and frame rate, honors reduced-motion preferences, provides pause/reset controls, and disposes rendering resources on navigation.

## Dashboard and shared service

Open `https://barqstudy.github.io/ASME/#/admin` (or `#/admin` on your local instance). It supports bilingual site copy, announcements, projects, events, images, branding/contact settings, JSON backups/import, and local draft previews. With Supabase connected, authorized administrators can publish shared changes, review membership/event applications, change their statuses, search, and export CSV. Registration and shared administration remain disabled until the service is configured; no default login is supplied. Without a connection, an explicitly labelled local editor is available. Drafts are stored on that device; they never publish automatically.

See [backend/SETUP.md](backend/SETUP.md) for the exact setup and [backend/schema.sql](backend/schema.sql) for the database and security policies. Only a public project URL and publishable/anon key belong in `app/public/config.json`. Never commit passwords, service-role keys, or other secrets. Admin login tokens stay in memory. The dashboard lists the latest 1,000 applications. Account creation and administrator allowlisting are performed in the Supabase project dashboard/SQL editor.

## GitHub Pages

`npm run build` creates `dist/` for GitHub Actions and refreshes root `index.html`, `assets/`, `brand/`, `config.json`, and `.nojekyll` for branch-based Pages. Commit these generated publication files with source changes. Both publication modes serve bundled assets, preventing the previous blank-page conflict. Retain previously published hashed assets for cached HTML.

Projects and events marked “Illustrative concept” are sample content, not official announcements. Administration can replace/hide those entries. No member counts are invented. Event dates use Saudi Arabia time (UTC+03:00). The interface fonts use Google Fonts with system fallbacks; no external 3D assets are required.
