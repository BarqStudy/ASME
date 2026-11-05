import assert from "node:assert/strict";
import test from "node:test";
import { renderEnvironment } from "../scripts/render-runtime.mjs";

test("Render uses its assigned public URL and retains private server settings", () => {
  const env = renderEnvironment({
    RENDER_EXTERNAL_URL: "https://asme-example.onrender.com/",
    DATABASE_URL: "postgresql://local-test-only",
    UPLOAD_DIR: "/var/data/uploads",
    PORT: "10000",
  });
  assert.equal(env.APP_URL, "https://asme-example.onrender.com");
  assert.equal(env.UPLOAD_DIR, "/var/data/uploads");
  assert.equal(env.PORT, "10000");
  assert.equal(env.DATABASE_URL, "postgresql://local-test-only");
  assert.equal(env.HOSTNAME, "0.0.0.0");
  assert.equal(env.NODE_ENV, "production");
});

test("a custom domain overrides the default address for origin checks and email links", () => {
  assert.equal(
    renderEnvironment({
      APP_URL: "https://club.example.org",
      RENDER_EXTERNAL_URL: "https://asme-example.onrender.com",
    }).APP_URL,
    "https://club.example.org",
  );
});

test("an incorrect public URL or a Pages-only configuration cannot silently start", () => {
  for (const APP_URL of [
    undefined,
    "not a url",
    "http://club.example.org",
    "https://club.example.org/ASME",
    "https://user:password@club.example.org",
    "https://club.example.org/?q=x",
    "https://club.example.org/#join",
  ]) {
    assert.throws(() => renderEnvironment({ APP_URL }));
  }
  assert.throws(() =>
    renderEnvironment({
      APP_URL: "https://club.example.org",
      NEXT_PUBLIC_SITE_MODE: "pages",
    }),
  );
  assert.throws(() =>
    renderEnvironment({
      APP_URL: "https://club.example.org",
      NEXT_PUBLIC_SITE_BASE_PATH: "/ASME",
    }),
  );
});
