import "dotenv/config";
import assert from "node:assert/strict";
import pg from "pg";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { existsSync } from "node:fs";
import { chromium, type Browser } from "@playwright/test";
import type { ChildProcess } from "node:child_process";
const database = `asme_browser_${Date.now()}`,
  connection = new URL(process.env.DATABASE_URL!),
  admin = new pg.Client({ connectionString: connection.toString() }),
  host = "http://localhost:3200";
let server: ChildProcess | undefined,
  browser: Browser | undefined,
  disconnect: (() => Promise<void>) | undefined;
let passed = 0;
const pass = (name: string) => {
  passed++;
  console.log("PASS", name);
};
async function main() {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  connection.pathname = `/${database}`;
  process.env.DATABASE_URL = connection.toString();
  process.env.APP_URL = host;
  process.env.MAIL_MODE = "file";
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    ASME_BUILD_DIR: ".next-browser",
    SEED_SAMPLES: "true",
  };
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/schema-engine.mts"],
    { env, stdio: "pipe" },
  );
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
    { env, stdio: "pipe" },
  );
  const { db } = await import("../lib/db");
  disconnect = () => db.$disconnect();
  const { hashPassword } = await import("../lib/security");
  const password = "Private browser test password 123!";
  await db.user.create({
    data: {
      email: "organizer@example.test",
      fullName: "Test Organizer",
      role: "SUPER_ADMIN",
      verifiedAt: new Date(),
      passwordHash: await hashPassword(password),
    },
  });
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3200",
    ],
    { env, stdio: "pipe" },
  );
  let log = "";
  server.stdout?.on("data", (d) => (log += d));
  server.stderr?.on("data", (d) => (log += d));
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${host}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(750);
  }
  assert.ok(ready, log.slice(-2000));
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : chromium.executablePath()),
    headless: true,
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
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(host, { waitUntil: "networkidle" });
  await page
    .locator("nextjs-portal")
    .evaluateAll((els) =>
      els.forEach((el) => ((el as HTMLElement).style.display = "none")),
    );
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.ok(
    (await page.locator("h1").innerText()).includes("الهندسة الميكانيكية"),
  );
  await page.locator(".gear-canvas.ready").waitFor();
  assert.equal(
    await page.locator(".auto-mechanics button, .auto-mechanics input").count(),
    0,
  );
  await page
    .getByRole("link", { name: "انضم لنادي ASME", exact: true })
    .click();
  await page.locator(".membership-dynamic").waitFor();
  assert.ok(
    (await page.locator(".membership-dynamic fieldset:disabled").count()) > 0,
  );
  await page.goto(host, { waitUntil: "networkidle" });
  pass("Arabic home, automatically rendered 3D gear, direct join form preview");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.waitForFunction(() => document.documentElement.dir === "ltr");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.documentElement.dataset.theme === "dark",
  );
  pass("English LTR and dark theme persist after reload");
  await page.screenshot({
    path: ".data/browser-home-dark.png",
    fullPage: true,
  });
  await page.goto(`${host}/tools`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Unit converter" }).click();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  assert.ok((await page.getByRole("status").innerText()).includes("1,000"));
  await page.getByRole("button", { name: "Beam deflection" }).click();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  assert.ok(
    (await page.getByRole("status").innerText()).includes("0.83333333"),
  );
  pass("interactive unit and beam calculators");
  await page.goto(`${host}/auth/login`, { waitUntil: "networkidle" });
  await page
    .getByLabel("Email", { exact: true })
    .fill("organizer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter my hub" }).click();
  await page.waitForURL("**/portal");
  await page.goto(`${host}/admin`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Club settings", exact: true })
    .click();
  await page.getByText("Open applications and show the join button").click();
  await page.getByRole("button", { name: "Save registration status" }).click();
  await page.getByRole("status").waitFor();
  await page
    .locator(".bottom-dock")
    .getByRole("link", { name: "Join the club" })
    .waitFor();
  pass("admin login, real settings save, conditional membership CTA");
  await page
    .getByRole("button", { name: "Forms & surveys", exact: true })
    .click();
  await page.locator(".builder-palette").waitFor();
  await page
    .locator(".builder-palette")
    .getByRole("button", { name: "Multiple choice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Duplicate block", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Delete block", exact: true })
    .last()
    .click();
  await page
    .locator(".builder-palette")
    .getByRole("button", { name: "Video", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "YouTube or MP4 / WebM URL", exact: true })
    .fill("https://youtu.be/dQw4w9WgXcQ");
  await page
    .locator(".builder-palette")
    .getByRole("button", { name: "Image", exact: true })
    .click();
  const imageBlock = page.locator(".builder-question.editing");
  await imageBlock.getByText("Upload an image", { exact: true }).click();
  await imageBlock
    .getByPlaceholder("Example: Original work shared with the club")
    .fill("Original test fixture shared with the club");
  await imageBlock.locator('input[type="file"]').setInputFiles({
    name: "form-image.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.waitForFunction(() =>
    (
      document.querySelector(
        '.builder-question.editing input[type="url"]',
      ) as HTMLInputElement
    )?.value.startsWith("/api/files/"),
  );
  await page.screenshot({
    path: ".data/browser-form-editor.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Play YouTube video" }).waitFor();
  await page
    .getByRole("button", { name: "Save and publish", exact: true })
    .click();
  await page.locator(".builder-palette").waitFor();
  const savedForm = (
    await db.platformSetting.findUniqueOrThrow({
      where: { key: "membershipForm" },
    })
  ).value as { version: number; fields: unknown[] };
  assert.equal(savedForm.version, 2);
  assert.equal(savedForm.fields.length, 8);
  await page.getByRole("tab", { name: "Responses", exact: true }).click();
  await page
    .getByRole("button", { name: "Load / refresh responses", exact: true })
    .click();
  await page.getByText("No responses yet", { exact: true }).waitFor();
  await page.screenshot({
    path: ".data/browser-form-builder.png",
    fullPage: true,
  });
  pass(
    "form builder adds, duplicates, removes, previews media, and publishes to PostgreSQL",
  );
  await page.goto(`${host}/join`, { waitUntil: "networkidle" });
  await page.getByLabel("University ID", { exact: true }).fill("987654");
  await page.getByLabel("College", { exact: true }).fill("Engineering");
  await page.getByLabel("Major", { exact: true }).fill("Mechanical");
  await page.getByLabel("Study level", { exact: true }).fill("3");
  await page
    .getByLabel("What would you like to create with us?", { exact: true })
    .fill("I want to build mechanical projects with the club.");
  await page.locator('input[name="consent"]').check();
  await page
    .getByRole("button", { name: "Apply and make your mark", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Application received! We look forward to building with you.",
    })
    .waitFor();
  assert.ok(
    await db.membershipApplication.findFirst({
      where: { user: { email: "organizer@example.test" } },
    }),
  );
  await page.goto(`${host}/admin`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Forms & surveys", exact: true })
    .click();
  await page.getByRole("tab", { name: "Responses", exact: true }).click();
  await page
    .getByRole("button", { name: "Load / refresh responses", exact: true })
    .click();
  await page.locator(".response-card summary").click();
  await page.getByText("987654", { exact: true }).waitFor();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export displayed responses CSV",
      exact: true,
    })
    .click();
  assert.ok((await download).suggestedFilename().endsWith(".csv"));
  pass(
    "public form submission, private admin response, uploaded image and CSV download",
  );
  await page.getByRole("button", { name: "Courses", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.waitFor();
  await modal.locator('input[name="title.ar"]').fill("مقرر اختبار المتصفح");
  await modal.locator('input[name="title.en"]').fill("Browser test course");
  await modal
    .locator('textarea[name="description.ar"]')
    .fill("وصف مقرر تجريبي من اختبار المتصفح");
  await modal
    .locator('textarea[name="description.en"]')
    .fill("An editable course from browser verification");
  await modal.locator('input[name="slug"]').fill("browser-test-course");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Browser test course", { exact: true }).waitFor();
  assert.ok(
    await db.course.findUnique({ where: { slug: "browser-test-course" } }),
  );
  pass("admin structured bilingual course CRUD persists to PostgreSQL");
  await page
    .getByRole("button", { name: "Events & attendance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Attendance & reports" })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  pass("attendance dialog and Escape focus behavior");
  for (const path of [
    "/events",
    "/library",
    "/projects",
    "/competitions",
    "/about",
    "/contact",
    "/careers",
    "/media",
    "/privacy",
    "/portal",
    "/admin",
  ]) {
    await page.goto(host + path, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await page.locator("h1").waitFor();
    assert.equal(await page.locator("h1").count(), 1, path);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      path,
    );
  }
  await page.goto(`${host}/contact`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "التبديل إلى العربية", exact: true })
    .click();
  await page.waitForFunction(() => document.documentElement.dir === "rtl");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Arabic contact form has no off-screen input overflow",
  );
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await page.waitForFunction(() => document.documentElement.dir === "ltr");
  pass("public, student, and admin routes render without desktop overflow");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(host, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .locator(".top-nav")
    .getByRole("link", { name: "Events", exact: true })
    .click();
  await page.waitForURL("**/events");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: ".data/browser-events-mobile.png",
    fullPage: true,
  });
  await page.goto(`${host}/admin`, { waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("mobile navigation and dashboard, no browser runtime errors");
  console.log(`${passed} browser scenarios passed.`);
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Browser test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server?.kill("SIGTERM");
    await delay(1000);
    await disconnect?.();
    try {
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()",
        [database],
      );
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    } finally {
      await admin.end();
    }
  });
