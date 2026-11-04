// Prisma Client generation uses the schema WASM bundled in the integrity-checked
// npm package. Prisma 7 also eagerly resolves an unused native migration binary.
// Provide Node's existing executable path for that resolution only. This script
// never runs migrations; db:migrate uses the official WASM schema engine.
// No checksums or TLS verification are disabled.
import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "generate", "--no-hints"],
  {
    stdio: "inherit",
    env: { ...process.env, PRISMA_SCHEMA_ENGINE_BINARY: process.execPath },
  },
);
process.exit(result.status ?? 1);
