import "dotenv/config";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

if (!process.env.DATABASE_URL)
  throw new Error(
    "Configure the local/CI PostgreSQL database before this smoke test.",
  );
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["scripts/start-render.mjs"], {
  env: {
    ...process.env,
    APP_URL: "",
    RENDER_EXTERNAL_URL: origin,
    PORT: String(port),
  },
  stdio: "inherit",
});
const exited = new Promise((resolve) => child.once("exit", resolve));
try {
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok && (await response.json()).ok === true) {
        healthy = true;
        break;
      }
    } catch {
      /* Wait for the production server to listen. */
    }
    await delay(250);
  }
  assert.ok(healthy, "the standalone server must start and reach PostgreSQL");
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  const css = html.match(/href="([^\"]*\/_next\/static\/[^\"]+\.css[^\"]*)"/);
  assert.ok(css, "production HTML references its browser CSS");
  for (const asset of [
    css[1],
    "/brand/logo.png",
    "/fonts/thmanyahserifdisplay-Regular.woff2",
  ]) {
    assert.equal(
      (await fetch(new URL(asset.replaceAll("&amp;", "&"), origin))).status,
      200,
      `production asset: ${asset}`,
    );
  }
  const login = await fetch(`${origin}/auth/login`);
  assert.equal(login.status, 200);
  assert.match(
    await login.text(),
    /type="password"/,
    "the full account form is enabled outside Pages mode",
  );
  console.log(
    "PASS Render startup, assigned origin, database health, assets and full sign-in form",
  );
} finally {
  child.kill("SIGTERM");
  await Promise.race([exited, delay(5000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}
