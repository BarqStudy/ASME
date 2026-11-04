# Shared administration with Supabase

GitHub Pages serves the website; Supabase supplies authenticated administration, public content, membership applications, event registrations, and image storage. The website works without Supabase, but only local draft editing/preview is then available. There is no default administrator password and no simulated public sign-in.

1. Create a Supabase project. Run `backend/schema.sql` in its SQL editor. This creates the content/application tables, row-level access policies, revision-aware publishing RPC, validated application RPC, and a public image bucket with administrator-only uploads.
2. In Authentication → Users, create the club administrator with a secure password using the Supabase dashboard. Disable public account sign-up in Authentication settings. Add the account UUID to the administrator allowlist through the SQL editor:

   ```sql
   insert into public.admin_users(user_id) values ('THE-AUTH-USER-UUID')
   on conflict do nothing;
   ```

   Add or revoke other administrators through this same allowlist. The web client cannot promote itself or create administrators. To revoke an administrator, remove their row; subsequent writes and member reads are denied even if their login session has not expired.

3. In Authentication → URL Configuration, set Site URL to `https://barqstudy.github.io/ASME/` and add that exact URL to Redirect URLs for password recovery. Configure your email provider in Supabase for reliable recovery emails.
4. Put only the public project URL and publishable key into `app/public/config.json`:

   ```json
   {
     "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
     "supabasePublishableKey": "YOUR-PUBLIC-PUBLISHABLE-KEY"
   }
   ```

   A legacy public `anon` key also works. These are intentionally public client configuration. Never put a `service_role` key, database password, administrator password, or secret key in the site or repository.
5. Run `npm run build` and commit the source, generated root `index.html`, `assets/`, `brand/`, `config.json`, and `.nojekyll` files. Existing GitHub Actions deploys `dist/`; branch-based Pages can serve the generated root files.
6. Open `https://barqstudy.github.io/ASME/#/admin`. Sign in, edit both language versions, and publish. Initial content remains the bundled version until the first publish. Saving drafts alone never publishes. Drafts stay in browser localStorage; auth tokens remain in memory and are discarded on reload. Password recovery also keeps its token in memory and removes it from the address bar.
7. Verify in separate browsers that published content is shared, an anonymous application arrives in the administrator table, event registrations require an open published non-example event, images load, unauthorized accounts cannot open the dashboard, and an administrator can change application statuses. Local tests do not replace these live project checks.

The dashboard manages bilingual site copy, announcement, project creation/editing/deletion and visibility, event dates/locations and registration, logo/contact links, member application review, event registration review, search, CSV export, JSON content backup/import, image uploads, and publish conflict detection. Publishing uses optimistic revision checks so concurrent administrators cannot silently overwrite each other. CSV exports protect spreadsheet formula prefixes. Event times use Saudi Arabia time (UTC+03:00) in both languages.

Application rows contain private names and email addresses; anonymous reads and non-administrator reads are denied at the database level. Public signup can call only the validating application function. Image uploads accept JPEG/PNG/WebP up to 3 MB. The local demonstration caps images at 700 KB to fit browser draft storage; it receives no member applications. The review list currently shows the latest 1,000 applications. Keep an operational retention policy and regular backups appropriate to the club.

If service calls fail, the site shows a notice and falls back to bundled content. It never reports an application or publish as successful after a failed service response. A missing service binding blocks real multi-device administration, even if local editing tests pass.
