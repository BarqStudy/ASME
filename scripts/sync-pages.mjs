import { cp, mkdir, writeFile } from 'node:fs/promises';

// Keep the branch-based Pages entry usable alongside the Actions deployment.
// Retain older hashed assets so cached HTML can still load after a release.
await mkdir('assets', { recursive: true });
await cp('dist/assets', 'assets', { recursive: true });
await cp('dist/index.html', 'index.html');
await writeFile('.nojekyll', '');
