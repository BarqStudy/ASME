# ASME — Najran University

A bilingual student club platform for the College of Engineering, with a mechanical engineering focus. The homepage begins with six directly manipulable mechanical models, followed by animated vision and mission blocks. A fixed bottom menu links the homepage, event articles, projects, and club information. A highlighted Join item appears only while published club registration is open.

## Development

Requires Node.js 22+ and npm. Use the existing checkout; do not create a worktree unless requested.

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
npm run preview
```

Use `/ASME/`. Source files live in `app/src/`; public assets in `app/public/`. `club-pages.js` and `club.css` provide the home, vision/mission, articles, and navigation. `studio-renderer.js` and `mechanisms.js` provide the single-canvas 3D hero. Rendering pauses offscreen, while hidden, or during dialogs; reduced motion, touch, mouse and keyboard are supported. Vertical touch scrolling remains available over the hero.

## Pages

- `#`: mechanical hero, club vision/mission and activity pathways.
- `#vision`: scrolls to the club purpose blocks.
- `#/events`: student activities, workshops, competitions, visits and talks, shown as articles with category filters.
- `#/events/<id>`: an article with body, cover, location and event registration when available.
- `#/join`: dynamic membership form if registration is open, otherwise a closed-state page.
- `#/admin`: content, articles, form builder, applications, image uploads, contact settings, JSON backup/import and publishing.

Illustrative activities are explicitly labelled and are not official club announcements. No invented member counts or event dates are used. Event times use Saudi Arabia time (UTC+03:00).

## Registration and forms

The dashboard supports nine question types, required/optional flags, bilingual labels/help/options, ordering, deletion of non-identity questions, and interactive preview. Name and email remain required identity fields. Saving a draft never publishes automatically. Publish the open/closed state to show/hide the highlighted Join menu. Public pages refresh content every 30 seconds and when the tab becomes visible.

Real shared registration requires Supabase: follow [backend/SETUP.md](backend/SETUP.md), [backend/schema.sql](backend/schema.sql), and the Arabic [registration guide](backend/REGISTRATION.md). Only a public project URL and publishable/anon key belong in `app/public/config.json`. Never commit passwords or service-role keys. The current instance has no project connection; local previews send and store no applicant answers.

The database validates active form version, open state, required answers, choice IDs, field types, identity and consent. Each submission stores an immutable question/option snapshot. Administrators can review answers, change status and export CSV. Public/private access is enforced by row-level policies. The old event RPC cannot bypass closed membership registration. Existing projects must re-run the current schema; publication does not apply production SQL. Admin accounts are allowlisted through Supabase, with no default password. Auth tokens remain in memory.

## Validation

21 automated tests cover mechanical geometry/reset, placement boundaries, font validation, content upgrade compatibility, database policies, publication conflicts, dynamic form answers, closed/stale submissions, schema reapplication and private response snapshots. Browser checks exercise form building and preview, conditional registration, actual 30-second menu refresh, answer review/export, form-change preservation, article editing, bilingual pages, real touch manipulation and vertical scrolling. Service-contract browser checks use mocked HTTP responses; they do not prove a live backend connection.

## Fonts and publication

Thmanyah is requested for both languages and remains pending valid original OTF files. The supplied `._thmanyahserifdisplay-*.otf` uploads are 221-byte AppleDouble metadata, not fonts. See `app/public/fonts/README.md`. The build validates fonts and retains explicitly named fallbacks while originals are absent. The ASME mark uses a transparent PNG.

`npm run build` creates `dist/` for Actions and syncs root `index.html`, `assets/`, `brand/`, `fonts/`, `config.json`, and `.nojekyll` for branch-based Pages. Commit source and generated files together; retain previously published hashed assets for cached HTML. Neither GitHub Pages publication nor environment draft saving configures Supabase or runs production database migrations.
