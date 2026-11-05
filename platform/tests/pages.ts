import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "@playwright/test";
const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ),
  dist = path.join(root, "dist");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};
// A plain file server: no Next server, API endpoints, database or SPA fallback.
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url || "/", "http://local").pathname,
    );
    if (!pathname.startsWith("/ASME/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    let file = path.resolve(dist, pathname.slice("/ASME/".length));
    if (file !== dist && !file.startsWith(dist + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(path.join(dist, "404.html")));
  }
});
let browser: Browser | undefined,
  checks = 0;
const pass = (name: string) => {
  checks++;
  console.log("PASS", name);
};
async function main() {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`,
    base = origin + "/ASME";
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : chromium.executablePath()),
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    errors: string[] = [],
    badResponses: string[] = [],
    apiRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.includes("/api/")) apiRequests.push(r.url());
  });
  page.on("response", (r) => {
    if (r.url().startsWith(origin) && r.status() >= 400)
      badResponses.push(`${r.status()} ${r.url()}`);
  });
  // Hold the actual application chunks to inspect the HTML before hydration.
  let releaseChunks!: () => void;
  let chunksReady = new Promise<void>((resolve) => {
    releaseChunks = resolve;
  });
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    await chunksReady;
    await route.continue();
  });
  await page.goto(base + "/", { waitUntil: "commit" });
  await page.locator(".boot-intro").waitFor({ state: "visible" });
  assert.equal(await page.locator(".boot-skeleton").isVisible(), false);
  assert.equal(await page.locator("#platform-content").isVisible(), false);
  releaseChunks();
  await page.waitForFunction(
    () => document.documentElement.dataset.boot === "ready",
  );
  await page.locator(".gear-canvas.ready").waitFor();
  assert.equal(
    await page
      .locator(".gear-signature, .gear-halo, .hero-lab .lab-footnote")
      .count(),
    0,
  );
  assert.equal(
    await page
      .locator(".auto-mechanics")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  chunksReady = new Promise<void>((resolve) => {
    releaseChunks = resolve;
  });
  await page.reload({ waitUntil: "commit" });
  await page.locator(".boot-skeleton").waitFor({ state: "visible" });
  assert.equal(await page.locator(".boot-intro").isVisible(), false);
  releaseChunks();
  await page.waitForFunction(
    () => document.documentElement.dataset.boot === "ready",
  );
  await page.unroute("**/_next/static/chunks/*.js");
  await page
    .locator(".top-nav")
    .getByRole("link", { name: "الفعاليات", exact: true })
    .click();
  await page.waitForURL("**/ASME/events/");
  assert.equal(await page.locator(".boot-screen").isVisible(), false);
  pass(
    "first visit has a gear intro; refresh has grey placeholders before JavaScript; navigation never replays the loader",
  );
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert.ok(
    (await page.locator("h1").innerText()).includes("الهندسة الميكانيكية"),
  );
  assert.ok(
    await page
      .locator(".brand img")
      .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
  );
  assert.equal(
    await page.getByRole("link", { name: "دخول", exact: true }).count(),
    0,
  );
  await page.locator(".gear-canvas.ready").waitFor();
  assert.equal(
    await page.locator(".auto-mechanics button, .auto-mechanics input").count(),
    0,
  );
  assert.equal(
    await page
      .locator(".blue-period")
      .evaluate((e) => getComputedStyle(e).color),
    "rgb(40, 121, 186)",
  );
  await page
    .getByRole("link", { name: "انضم لنادي ASME", exact: true })
    .click();
  await page.waitForURL("**/ASME/join/");
  await page
    .getByRole("heading", { name: "انضم لنادي ASME", exact: true })
    .waitFor();
  assert.ok(
    (await page.locator(".membership-dynamic fieldset:disabled").count()) > 0,
  );
  assert.equal(
    await page
      .locator(
        ".membership-dynamic button[type=submit], .membership-dynamic > button",
      )
      .isDisabled(),
    true,
  );
  await page.goto(base + "/", { waitUntil: "networkidle" });
  pass(
    "3D gear without controls, blue punctuation, join CTA opens a disabled form preview",
  );
  await page
    .locator(".top-nav")
    .getByRole("link", { name: "الفعاليات", exact: true })
    .click();
  await page.waitForURL("**/ASME/events/");
  await page.locator(".event-card").first().click();
  await page.waitForURL("**/ASME/events/cad-introduction/");
  const detail = await page.reload({ waitUntil: "networkidle" });
  assert.equal(detail?.status(), 200);
  await page.getByRole("button", { name: "التسجيل غير مفتوح" }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "التسجيل غير مفتوح" }).isDisabled(),
    true,
  );
  pass(
    "native navigation and direct event-page refresh, registration clearly unavailable",
  );
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.waitForFunction(() => document.documentElement.dir === "ltr");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.documentElement.dataset.theme === "dark",
  );
  pass("language and appearance survive a static page refresh");
  await page.goto(base + "/tools/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Unit converter" }).click();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  assert.ok((await page.getByRole("status").innerText()).includes("1,000"));
  await page.getByRole("button", { name: "Beam deflection" }).click();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  assert.ok(
    (await page.getByRole("status").innerText()).includes("0.83333333"),
  );
  pass("engineering tools run with no server");
  await page.goto(base + "/library/", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".resource-card").count(), 3);
  assert.equal(
    await page.getByRole("button", { name: "Save resource" }).count(),
    0,
  );
  await page.getByLabel("Course", { exact: true }).selectOption("cad");
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page.getByRole("textbox", { name: "Search the platform" }).fill("ASME");
  await page
    .locator(".search-form")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await page.waitForURL("**/ASME/search/?q=ASME");
  await page
    .getByRole("heading", { name: "ASME learning resources" })
    .waitFor();
  pass(
    "library filters and global search work under /ASME without API requests",
  );
  for (const route of [
    "auth/login",
    "auth/register",
    "portal",
    "admin",
    "projects/submit",
    "contact",
  ]) {
    const r = await page.goto(`${base}/${route}/`, {
      waitUntil: "networkidle",
    });
    assert.equal(r?.status(), 200, route);
    assert.equal(
      await page.locator("form:not(.search-form)").count(),
      0,
      route,
    );
    assert.equal(
      await page.locator('input[type="password"]').count(),
      0,
      route,
    );
  }
  pass("unavailable services never collect account or membership information");
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".gear-canvas.ready").waitFor();
  const before = await page.locator(".automatic-stage").screenshot();
  await page.waitForTimeout(700);
  const after = await page.locator(".automatic-stage").screenshot();
  assert.notDeepEqual(
    before,
    after,
    "gear rotates automatically without any interaction",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  pass("automatic 3D rotation changes the rendered scene");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .locator(".top-nav")
    .getByRole("link", { name: "Library", exact: true })
    .click();
  await page.waitForURL("**/ASME/library/");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mkdir(path.join(root, "platform/.data"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "platform/.data/pages-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "التبديل إلى العربية", exact: true })
    .click();
  await page.getByRole("button", { name: "تغيير المظهر", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.documentElement.lang === "ar" &&
      document.documentElement.dataset.theme === "light",
  );
  await page.screenshot({
    path: path.join(root, "platform/.data/pages-desktop.png"),
    fullPage: true,
  });
  pass("mobile navigation and desktop/mobile layout");
  // Keep animations enabled: reduced motion used to hide the smooth-scroll bug.
  const scrollPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });
  await scrollPage.addInitScript(() => {
    localStorage.setItem("asmenu-lang", "en");
    window.addEventListener("scroll", () => {
      const root = document.documentElement;
      root.dataset.scrollPeak = String(
        Math.max(Number(root.dataset.scrollPeak || 0), scrollY),
      );
    });
  });
  await scrollPage.goto(base + "/", { waitUntil: "networkidle" });
  await scrollPage.waitForFunction(
    () => document.documentElement.dataset.boot === "ready",
  );
  for (const [name, route] of [
    ["Events", "events/"],
    ["Home", ""],
  ]) {
    await scrollPage.evaluate(() => {
      document.documentElement.dataset.scrollPeak = "0";
    });
    await scrollPage
      .locator(".bottom-dock")
      .getByRole("link", { name, exact: true })
      .click();
    await scrollPage.waitForURL(base + "/" + route);
    await scrollPage.waitForTimeout(850);
    assert.ok(
      await scrollPage.evaluate(
        () =>
          scrollY <= 5 &&
          Number(document.documentElement.dataset.scrollPeak || 0) <= 5,
      ),
      `${name} navigation must never jump towards the footer`,
    );
  }
  await scrollPage.getByRole("button", { name: "Toggle theme" }).click();
  assert.ok(await scrollPage.evaluate(() => scrollY <= 5));
  await scrollPage.reload({ waitUntil: "networkidle" });
  await scrollPage.waitForFunction(
    () => document.documentElement.dataset.boot === "ready",
  );
  await scrollPage.waitForTimeout(850);
  assert.ok(
    await scrollPage.evaluate(() => scrollY <= 5),
    "refresh at the top stays at the top",
  );
  await scrollPage.evaluate(() => scrollTo({ top: 900, behavior: "instant" }));
  await scrollPage.reload({ waitUntil: "networkidle" });
  await scrollPage.waitForFunction(
    () => document.documentElement.dataset.boot === "ready",
  );
  await scrollPage.waitForTimeout(850);
  assert.ok(
    await scrollPage.evaluate(() => Math.abs(scrollY - 900) < 120),
    "refresh restores the reading position instead of jumping to the footer",
  );
  await scrollPage
    .locator(".bottom-dock")
    .getByRole("link", { name: "Events", exact: true })
    .click();
  await scrollPage.waitForURL(base + "/events/");
  await scrollPage.waitForTimeout(850);
  assert.ok(
    await scrollPage.evaluate(() => scrollY <= 5),
    "a new destination opens at the top even when leaving a scrolled page",
  );
  await scrollPage.goBack({ waitUntil: "networkidle" });
  await scrollPage.waitForURL(base + "/");
  await scrollPage.waitForTimeout(850);
  assert.ok(
    await scrollPage.evaluate(() => Math.abs(scrollY - 900) < 120),
    "browser Back preserves the reading position",
  );
  await scrollPage.close();
  pass(
    "animated navigation, ordinary buttons and refresh keep the correct scroll position",
  );
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(badResponses, []);
  assert.deepEqual(errors, []);
  pass("zero backend calls, failed local requests, or browser runtime errors");
  console.log(`${checks} GitHub Pages browser scenarios passed.`);
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
