# Implementation record

## Delivered source and behavior

The new application lives in `platform/`. The existing Vite/GitHub Pages application remains an independent working deployment. Next.js 16.4.5, React 19.3.1, TypeScript, Tailwind 4, Motion, Lucide, PostgreSQL 18 and Prisma 7.10.1 are installed with a lockfile. Prisma's matching official WASM schema engine is pinned for this restricted environment.

| Area | Implemented behavior |
|---|---|
| Design | ASME navy/blue glass surfaces; supplied transparent logo; self-hosted Cairo/Inter; responsive desktop/tablet/mobile; light/dark; RTL/LTR persistence; motion preference; draggable dimensional SVG mechanisms with pause/reset and a keyboard slider |
| Public content | Home, vision/mission, about, editable committees/leadership, event list/details/calendar agenda, library/course filters, moderated projects, competitions, careers, news/reports, contact and privacy pages; search over published content; actual aggregate activity counts |
| Authentication | Opaque hashed server sessions; scrypt passwords; one-use expiring verification/reset tokens; private development mailbox; configurable SMTP; sign-out and password-reset session revocation; university domain restriction when supplied |
| Membership | Conditional join button controlled by an admin setting; authenticated verified application; committee choice, skills, motivation and consent; pending/approved/rejected/needs-info review; resubmission; student-visible status and notifications; local club identity distinct from ASME international membership |
| Events | Admin bilingual creation/editing; deadline/capacity/waitlist; transactional row locking for concurrent reservations; duplicate prevention; cancellation and promotion; unique private QR; organizer check-in with duplicate/time-window guards; feedback after attendance; authorized PDF issuance/revocation; CSV reports |
| Certificates | Snapshot of participant/event, Unicode Cairo names and event text, random code and verification QR; owner/organizer download access; public verification reports validity without exposing the recipient's private profile |
| Library | Course/resource admin forms; rights confirmation and license required; HTTPS links or uploaded PDF; private/public file permissions; saved resources; type/course/text filters |
| Projects | Verified student submission; pending moderation; public published gallery; technologies, status, team needs and video link; team applications; owner acceptance and project membership |
| Competitions | Editable bilingual rules/criteria; deadline-bound submission with private attachment and name consent; validated scores; self-judging prevention; unpublished results remain private; organizer publication and consent-respecting leaderboard |
| Portal | Profile, membership status, own event QR/attendance/certificates/feedback, projects/team applications, competition results, saved resources, notifications, assigned tasks and opt-in public portfolio |
| Admin | Actual-count overview and Recharts; membership review; events/check-in/certificates/reports; courses/resources/posts; projects; competition judging; committee tasks/notes/attachments; inbox; settings; role controls; audit log; server-paginated primary lists |
| Permissions | Super administrator, president, committee leader, events manager, content manager, member, student; unauthenticated visitors; capability checks at server/DB operation boundaries; committee leader scope; last-super-admin protection |
| Tools | Unit conversion including affine temperatures, stress, strain, torque, mechanical power, linear thermal expansion, and two standard beam cases; units, formulas, validation, support diagram and limitations |
| Files/security | Bounded body streams, 10 MB files, PNG/JPEG/PDF signature checks, opaque storage names outside public tree, origin checks, DB rate limits, strict schemas, privacy-preserving selects, audit records and private env files |
| Delivery | Standard SQL migration + constraints; non-destructive seed; secure bootstrap; Docker multi-stage image, Compose, managed CA build override; CI; setup/deployment documentation |

### Important paths

- `app/api/[...segments]/route.ts`: HTTP dispatch, authentication and student workflows.
- `lib/security.ts`, `lib/auth.ts`, `lib/validation.ts`: session/capability checks and validation.
- `lib/admin.ts`, `lib/events.ts`, `lib/files.ts`, `lib/pdf.ts`: administrative and transactional operations.
- `components/public.tsx`, `forms.tsx`, `portal.tsx`, `admin.tsx`: functional user interfaces.
- `lib/calculators.ts`: tested formulas and conversions.
- `prisma/schema.prisma`, `prisma/migrations/`: normalized models, indexes, unique keys, FKs and SQL checks.
- `scripts/bootstrap.ts`, `scripts/schema-engine.mts`, `scripts/cloud-setup.sh`: secure setup helpers.
- `tests/`: unit, database/HTTP integration and Chromium tests.

## Verification commands

```bash
npm ci
npm run db:generate
npm run db:migrate
SEED_SAMPLES=true npm run db:seed
npm run bootstrap
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:browser
npm run build
```

Tests use temporary isolated databases; no production credentials are included. The final verification result is recorded below after completion.

<a id="remaining"></a>
## Remaining scope and operational limits

This is a working vertical slice with the major database workflows implemented. It is **not** a claim that the entire master specification is production-complete.

- Production hosting, DNS/HTTPS, a real SMTP delivery test, the approved university email domain and institutional retention policy are not supplied. No production service or domain migration was created.
- The existing static site's configurable Google Forms-style membership builder has not been ported to Next.js. The new membership form implements the specified fields; arbitrary form blocks/options/conditional logic remain additional work.
- Mechanisms are interactive dimensional SVG/CSS illustrations, not a CAD engine or a full WebGL assembly editor. CAD model upload/preview and live turbine/robot models remain additional work.
- Advanced media galleries, event photo collections, video gallery management, achievements/sponsors, formal club history, objectives/FAQ editors and dedicated career learning paths are not complete. News/career/report articles, cover images, bilingual leadership and committees are editable now. Unprovided names, awards and endorsements are not invented.
- Library course filtering works; dedicated course-detail URLs and an embedded PDF viewer are not provided. PDFs download through the permission-checked endpoint; an authorized `?view=1` response is available for a future viewer.
- Public portfolios support chosen skills, software, published projects, experience, awards and links. Public certificate sharing is not implemented; certificate downloads remain private.
- Public lists/search are bounded to 100 entries per content type (50 competitions); advanced public server pagination/full-text indexing is still needed at larger scale. The calendar is an agenda view, not a month-grid scheduler.
- Core labels/forms are bilingual. Technical role/state identifiers and audit event names may still appear in some administrative tables. A complete editorial localization and WCAG AA audit across all dialogs/tables remains necessary.
- Touch layouts, focus trapping, Escape, reduced motion and browser runtime checks are covered; real-device camera scanning and cross-browser assistive technology testing are still pending. Camera scanning depends on browser BarcodeDetector support and offers manual input fallback.
- There is no S3 adapter, antivirus/CDR pipeline, image re-encoding, async mail queue, malware scanning, archival/delete-account automation, distributed session cleanup, formal backup scheduling or production monitoring integration. Local persistent disk and synchronous SMTP are the current adapters.
- Administrative CRUD uses create/edit/publish/review paths. Destructive record deletion is intentionally not exposed; data retention and deletion policy must be settled before building those flows.
- The SQL migration and server capability boundaries were tested against an actual PostgreSQL database; this is not an independent penetration test or a claim of database RLS isolation for direct SQL credentials. Only the trusted server should hold DB credentials.

## Deployment next step

Supply a Node/Docker host with a persistent PostgreSQL database and disk, HTTPS domain and SMTP settings. Apply migrations, seed basic content, bootstrap the administrator, replace sample events with approved content, run the documented checks, and then point the approved public domain to the server. GitHub Pages remains suitable for the independent legacy static application.
