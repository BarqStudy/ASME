import "dotenv/config";
import assert from "node:assert/strict";
import pg from "pg";
import { defaultMembershipForm } from "../lib/form-schema";
import { spawn, execFileSync } from "node:child_process";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { ChildProcess } from "node:child_process";
const baseUrl = new URL(process.env.DATABASE_URL!),
  database = `asme_test_${Date.now()}`,
  admin = new pg.Client({ connectionString: baseUrl.toString() });
let server: ChildProcess | undefined;
let cleanup: (() => Promise<void>) | undefined;
let count = 0;
const host = "http://localhost:3100",
  origin = { Origin: host };
async function request(
  route: string,
  data?: unknown,
  cookie = "",
  expected = 200,
) {
  const response = await fetch(
    `${host}/api/${route}`,
    data === undefined
      ? { headers: { cookie } }
      : {
          method: "POST",
          headers: { ...origin, "Content-Type": "application/json", cookie },
          body: JSON.stringify(data),
        },
  );
  let result: Record<string, unknown> = {};
  if (response.headers.get("content-type")?.includes("json"))
    result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${route}: ${JSON.stringify(result)}`,
  );
  return { response, data: result };
}
function pass(name: string) {
  count++;
  console.log(`PASS ${name}`);
}
async function main() {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  baseUrl.pathname = `/${database}`;
  process.env.DATABASE_URL = baseUrl.toString();
  process.env.APP_URL = host;
  process.env.MAIL_MODE = "file";
  process.env.MAIL_DIR = `.data/test-mail-${database}`;
  await mkdir(process.env.MAIL_DIR, { recursive: true });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    ASME_BUILD_DIR: ".next-integration",
  };
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/schema-engine.mts"],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const { db } = await import("../lib/db");
  cleanup = () => db.$disconnect();
  const { hashPassword } = await import("../lib/security");
  const secret = "Integration test password 123!";
  const root = await db.user.create({
    data: {
      email: "root@example.test",
      fullName: "Test Organizer",
      passwordHash: await hashPassword(secret),
      role: "SUPER_ADMIN",
      verifiedAt: new Date(),
    },
  });
  await db.platformSetting.create({
    data: {
      key: "membership",
      value: { open: true, notice: { ar: "مفتوح", en: "Open" } },
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
      "3100",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  server!.stderr?.on("data", (d) => (log += String(d)));
  server!.stdout?.on("data", (d) => {
    log += String(d);
  });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${host}/api/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(750);
  }
  if (!ready) throw new Error(`Server startup failed: ${log.slice(-3000)}`);
  const login = async (email: string) => {
    const r = await request("auth/login", { email, password: secret });
    const header = r.response.headers.get("set-cookie")!;
    assert.ok(header.includes("HttpOnly"));
    assert.ok(header.includes("SameSite=lax"));
    return header.split(";")[0];
  };
  const rootCookie = await login(root.email);
  await request(
    "auth/register",
    {
      fullName: "طالب تجريبي",
      email: "student@example.test",
      password: secret,
      consent: true,
    },
    "",
    202,
  );
  let files = await readdir(process.env.MAIL_DIR!);
  const mail = JSON.parse(
    await readFile(`${process.env.MAIL_DIR}/${files[0]}`, "utf8"),
  );
  const token = new URL(mail.url).searchParams.get("token");
  await request("auth/verify", { token });
  await request("auth/verify", { token }, "", 400);
  const studentCookie = await login("student@example.test");
  const student = await db.user.findUniqueOrThrow({
    where: { email: "student@example.test" },
  });
  assert.notEqual(student.passwordHash, secret);
  pass(
    "account signup, private mail, one-time verification, hashed password, secure cookie",
  );
  const forged = await fetch(`${host}/api/membership`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: studentCookie,
      Origin: "https://evil.example",
    },
    body: "{}",
  });
  assert.equal(forged.status, 403);
  await request("admin/users", undefined, studentCookie, 403);
  await request("admin/events", { role: "SUPER_ADMIN" }, studentCookie, 403);
  pass("CSRF and server role authorization");
  const app = await request(
    "membership",
    {
      universityId: "SECRET-12345",
      college: "Engineering",
      major: "Mechanical Engineering",
      level: "3",
      skills: ["CAD"],
      motivation: "I would like to build mechanical engineering projects.",
      consent: true,
    },
    studentCookie,
    201,
  );
  await request(
    `admin/members/${app.data.id}`,
    { status: "NEEDS_INFO", reviewNote: "Please clarify your experience." },
    rootCookie,
  );
  await request(
    "membership",
    {
      universityId: "SECRET-12345",
      college: "Engineering",
      major: "Mechanical Engineering",
      level: "3",
      skills: ["CAD"],
      motivation:
        "I have completed an introductory CAD project and want to contribute.",
      consent: true,
    },
    studentCookie,
    201,
  );
  await request(
    `admin/members/${app.data.id}`,
    { status: "APPROVED", reviewNote: "Welcome to the club." },
    rootCookie,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: student.id } })).role,
    "CLUB_MEMBER",
  );
  assert.equal(
    (await request("portal", undefined, studentCookie)).data.application !==
      null,
    true,
  );
  pass(
    "membership review, needs information, resubmission, approval and student status",
  );
  const p = await db.profile.findUniqueOrThrow({
    where: { userId: student.id },
  });
  await request(
    "profile",
    {
      fullName: student.fullName,
      universityId: "SECRET-12345",
      college: "Engineering",
      major: "Mechanical",
      level: "3",
      bioAr: "نبذة عامة",
      bioEn: "Public bio",
      skills: ["CAD"],
      software: [],
      experience: [],
      awards: [],
      linkedin: "",
      github: "",
      slug: "test-portfolio",
      publicEnabled: false,
      publicSkills: true,
      publicProjects: false,
      publicExperience: false,
    },
    studentCookie,
  );
  await request("portfolio/test-portfolio", undefined, "", 404);
  await db.profile.update({
    where: { id: p.id },
    data: { publicEnabled: true },
  });
  const publicProfile = await request("portfolio/test-portfolio");
  assert.ok(!JSON.stringify(publicProfile.data).includes("SECRET-12345"));
  assert.ok(!JSON.stringify(publicProfile.data).includes(student.email));
  pass("opt-in portfolio and no public university ID or email");
  const now = Date.now(),
    bi = { ar: "ورشة تجريبية", en: "Test workshop" },
    event = await request(
      "admin/events",
      {
        slug: "integration-workshop",
        title: bi,
        description: bi,
        body: bi,
        location: bi,
        category: "workshop",
        startsAt: new Date(now + 3600000),
        endsAt: new Date(now + 7200000),
        deadline: new Date(now + 1800000),
        capacity: 1,
        waitlistEnabled: true,
        published: true,
        featured: false,
        isSample: true,
        coverUrl: "",
      },
      rootCookie,
    );
  const second = await db.user.create({
      data: {
        email: "second@example.test",
        fullName: "Second student",
        passwordHash: await hashPassword(secret),
        verifiedAt: new Date(),
      },
    }),
    secondCookie = await login(second.email);
  const concurrent = await Promise.all([
    request(`events/${event.data.id}/register`, {}, studentCookie, 201),
    request(`events/${event.data.id}/register`, {}, secondCookie, 201),
  ]);
  assert.deepEqual(concurrent.map((r) => r.data.status).sort(), [
    "CONFIRMED",
    "WAITLISTED",
  ]);
  await request(`events/${event.data.id}/register`, {}, studentCookie, 409);
  const confirmed = concurrent.find((r) => r.data.status === "CONFIRMED")!,
    confirmedCookie =
      concurrent[0] === confirmed ? studentCookie : secondCookie;
  await request(
    `registrations/${confirmed.data.id}/cancel`,
    {},
    confirmedCookie,
  );
  assert.equal(
    await db.eventRegistration.count({
      where: { eventId: String(event.data.id), status: "CONFIRMED" },
    }),
    1,
  );
  const promoted = await db.eventRegistration.findFirstOrThrow({
    where: { eventId: String(event.data.id), status: "CONFIRMED" },
  });
  pass(
    "concurrent capacity enforcement, waiting list, duplicate registration and promotion",
  );
  await request(
    `admin/events/${event.data.id}/checkin`,
    { qrToken: promoted.qrToken },
    rootCookie,
  );
  await request(
    `admin/events/${event.data.id}/checkin`,
    { qrToken: promoted.qrToken },
    rootCookie,
    409,
  );
  await request(
    `admin/events/${event.data.id}/certificate`,
    { registrationId: promoted.id },
    studentCookie,
    403,
  );
  await request(
    `admin/events/${event.data.id}/certificate`,
    { registrationId: promoted.id },
    rootCookie,
    409,
  );
  await db.event.update({
    where: { id: String(event.data.id) },
    data: {
      startsAt: new Date(now - 7200000),
      endsAt: new Date(now - 3600000),
      deadline: new Date(now - 10800000),
    },
  });
  const cert = await request(
    `admin/events/${event.data.id}/certificate`,
    { registrationId: promoted.id },
    rootCookie,
  );
  const certResponse = await fetch(
    `${host}/api/certificate/${cert.data.code}`,
    {
      headers: {
        cookie: promoted.userId === student.id ? studentCookie : secondCookie,
      },
    },
  );
  assert.equal(certResponse.status, 200);
  assert.equal(certResponse.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await certResponse.arrayBuffer());
  assert.ok(bytes.subarray(0, 5).toString() === "%PDF-");
  assert.ok(bytes.length > 5000);
  await fetch(`${host}/api/certificate/${cert.data.code}`).then((r) =>
    assert.equal(r.status, 404),
  );
  await request(`verify-certificate/${cert.data.code}`);
  await request(
    `admin/events/${event.data.id}/revoke`,
    { certificateId: cert.data.id },
    rootCookie,
  );
  assert.equal(
    (await request(`verify-certificate/${cert.data.code}`)).data.valid,
    false,
  );
  pass(
    "deduplicated QR check-in, authorized approval, Unicode PDF download, revocation",
  );
  const course = await request(
    "admin/courses",
    { slug: "test-course", title: bi, description: bi },
    rootCookie,
  );
  await request(
    "admin/resources",
    {
      courseId: course.data.id,
      title: bi,
      description: bi,
      type: "LINK",
      externalUrl: "https://www.asme.org",
      author: "ASME",
      license: "External official link",
      rightsConfirmed: true,
      published: true,
      featured: false,
    },
    rootCookie,
  );
  const content = await request("content");
  assert.ok(!JSON.stringify(content.data).includes(student.email));
  assert.ok(!JSON.stringify(content.data).includes("passwordHash"));
  pass("real content CRUD and public response privacy");
  const project = await request(
    "projects",
    {
      title: bi,
      description: bi,
      body: bi,
      category: "CAD",
      technologies: ["CAD"],
      skillsNeeded: ["CAD"],
      needsTeam: true,
      status: "IDEA",
      coverUrl: "",
      videoUrl: "",
    },
    studentCookie,
    201,
  );
  assert.equal(project.data.publication, "PENDING");
  await request(
    `admin/projects/${project.data.id}`,
    { publication: "PUBLISHED", featured: false, isSample: true },
    rootCookie,
  );
  await request(
    `projects/${project.data.id}/apply`,
    { message: "I can support the CAD work for this project." },
    secondCookie,
    201,
  );
  pass("student project moderation and team application");
  const uploadForm = new FormData();
  uploadForm.set(
    "file",
    new Blob(["<html>bad</html>"], { type: "image/png" }),
    "fake.png",
  );
  uploadForm.set("license", "Original test work");
  const invalidUpload = await fetch(`${host}/api/upload`, {
    method: "POST",
    headers: { ...origin, cookie: studentCookie },
    body: uploadForm,
  });
  assert.equal(invalidUpload.status, 400);
  const pdfForm = new FormData();
  pdfForm.set(
    "file",
    new Blob([bytes], { type: "application/pdf" }),
    "certificate.pdf",
  );
  pdfForm.set("license", "Original test output");
  const validUpload = await fetch(`${host}/api/upload`, {
    method: "POST",
    headers: { ...origin, cookie: studentCookie },
    body: pdfForm,
  });
  assert.equal(validUpload.status, 201);
  const asset = await validUpload.json();
  await request(`files/${asset.id}`, undefined, secondCookie, 404);
  const ownerFile = await fetch(`${host}/api/files/${asset.id}`, {
    headers: { cookie: studentCookie },
  });
  assert.equal(ownerFile.status, 200);
  pass("upload magic bytes and private asset access");
  await request(
    "contact",
    {
      name: "Test visitor",
      email: "visitor@example.test",
      kind: "COLLABORATION",
      subject: "A collaboration proposal",
      message: "We would like to explore a student collaboration.",
      website: "",
    },
    "",
    201,
  );
  assert.equal(
    (await request("admin/inbox", undefined, rootCookie)).response.status,
    200,
  );
  const report = await fetch(
    `${host}/api/admin/report?eventId=${event.data.id}`,
    { headers: { cookie: rootCookie } },
  );
  assert.equal(report.status, 200);
  assert.ok((await report.text()).includes("Name"));
  pass("contact inbox and authorized CSV reporting");
  const leader = await db.user.create({
    data: {
      email: "leader@example.test",
      fullName: "Committee leader",
      role: "COMMITTEE_LEADER",
      verifiedAt: new Date(),
      passwordHash: await hashPassword(secret),
    },
  });
  const leaderCookie = await login(leader.email);
  const committee = await db.committee.create({
    data: { title: bi, description: bi, leaderId: leader.id },
  });
  const otherCommittee = await db.committee.create({
    data: { title: bi, description: bi },
  });
  await db.committeeMembership.create({
    data: { committeeId: committee.id, userId: student.id },
  });
  const task = await request(
    "admin/tasks",
    {
      committeeId: committee.id,
      assigneeId: student.id,
      title: bi,
      description: bi,
      dueAt: null,
      status: "TODO",
    },
    leaderCookie,
  );
  await request(
    "admin/tasks",
    {
      committeeId: otherCommittee.id,
      assigneeId: null,
      title: bi,
      description: bi,
      dueAt: null,
      status: "TODO",
    },
    leaderCookie,
    403,
  );
  await request(
    `admin/tasks/${task.data.id}/note`,
    { body: "A private team note" },
    leaderCookie,
  );
  const assigned = (await request("portal", undefined, studentCookie)).data
    .tasks as unknown[];
  assert.equal(assigned.length, 1);
  pass("committee-scoped task creation, assignment and private notes");
  const comp = await request(
    "admin/competitions",
    {
      title: bi,
      description: bi,
      rules: bi,
      criteria: [{ id: "design", label: bi, max: 100 }],
      deadline: new Date(Date.now() + 3600000),
      published: true,
      isSample: true,
    },
    rootCookie,
  );
  const entry = await request(
    `competitions/${comp.data.id}/submit`,
    {
      title: "Test entry",
      description: "A detailed mechanical design competition solution.",
      link: "https://example.com",
      publicName: false,
    },
    studentCookie,
    201,
  );
  await request(
    `admin/competitions/${comp.data.id}/score`,
    {
      submissionId: entry.data.id,
      criteria: { design: 80 },
      feedback: "Clear design.",
    },
    rootCookie,
    409,
  );
  await db.competition.update({
    where: { id: String(comp.data.id) },
    data: { deadline: new Date(Date.now() - 1000) },
  });
  await request(
    `admin/competitions/${comp.data.id}/score`,
    { submissionId: entry.data.id, criteria: { design: 101 }, feedback: "" },
    rootCookie,
    400,
  );
  await request(
    `admin/competitions/${comp.data.id}/score`,
    {
      submissionId: entry.data.id,
      criteria: { design: 80 },
      feedback: "Clear design.",
    },
    rootCookie,
  );
  await request(`leaderboard/${comp.data.id}`, undefined, "", 404);
  await request(
    `admin/competitions/${comp.data.id}/results`,
    { resultsPublished: true },
    rootCookie,
  );
  const board = await fetch(`${host}/api/leaderboard/${comp.data.id}`).then(
    (r) => r.json(),
  );
  assert.equal(board[0].score, 80);
  assert.equal(board[0].name, null);
  pass(
    "competition deadline, validated criteria, judging, approved results and opt-in leaderboard identity",
  );
  await request(
    `admin/users/${root.id}`,
    { role: "STUDENT", disabled: false },
    rootCookie,
    409,
  );
  await request(
    "auth/register",
    {
      fullName: "Role injection",
      email: "inject@example.test",
      password: secret,
      consent: true,
      role: "SUPER_ADMIN",
    },
    "",
    400,
  );
  const large = await fetch(`${host}/api/contact`, {
    method: "POST",
    headers: { ...origin, "Content-Type": "application/json" },
    body: "a".repeat(100001),
  });
  assert.equal(large.status, 413);
  pass(
    "last super administrator guard, rejected role injection and bounded request bodies",
  );
  const customForm = structuredClone(defaultMembershipForm);
  customForm.fields.push({
    id: "interests",
    type: "multiselect",
    label: { ar: "اهتماماتك", en: "Interests" },
    description: { ar: "", en: "" },
    required: true,
    mediaUrl: "",
    options: [
      {
        id: "cad",
        label: { ar: "تصميم", en: "CAD" },
        imageUrl: "https://example.test/cad.png",
      },
      { id: "robotics", label: { ar: "روبوت", en: "Robotics" }, imageUrl: "" },
    ],
  });
  await request(
    "admin/forms",
    { definition: customForm, open: true },
    studentCookie,
    403,
  );
  await request(
    "admin/forms",
    { definition: customForm, open: true },
    rootCookie,
  );
  await request(
    "admin/forms",
    { definition: customForm, open: true },
    rootCookie,
    409,
  );
  customForm.version = 2;
  await request(
    "membership",
    {
      universityId: "123",
      college: "Engineering",
      major: "Mechanical",
      level: "3",
      motivation: "A sufficiently long reason to join",
      skills: [],
      consent: true,
    },
    studentCookie,
    409,
  );
  await db.membershipApplication.update({
    where: { userId: student.id },
    data: { status: "NEEDS_INFO" },
  });
  const customPayload = {
    formVersion: 2,
    answers: {
      universityId: "SECRET-12345",
      college: "Engineering",
      major: "Mechanical",
      level: "3",
      motivation: "I want to build with the club",
      interests: ["cad"],
    },
    consent: true,
  };
  await request(
    "membership",
    { ...customPayload, formVersion: 1 },
    studentCookie,
    409,
  );
  await request(
    "membership",
    { ...customPayload, answers: { ...customPayload.answers, interests: [] } },
    studentCookie,
    400,
  );
  await request(
    "membership",
    {
      ...customPayload,
      answers: { ...customPayload.answers, interests: ["invented"] },
    },
    studentCookie,
    400,
  );
  await request("membership", customPayload, studentCookie, 201);
  const received = (
    await db.membershipApplication.findUniqueOrThrow({
      where: { userId: student.id },
    })
  ).payload as {
    answers: { interests: string[] };
    formSnapshot: typeof customForm;
  };
  assert.deepEqual(received.answers.interests, ["cad"]);
  assert.equal(received.formSnapshot.version, 2);
  customForm.fields.pop();
  await request(
    "admin/forms",
    { definition: customForm, open: false },
    rootCookie,
  );
  assert.equal(
    (
      (
        await db.membershipApplication.findUniqueOrThrow({
          where: { userId: student.id },
        })
      ).payload as typeof received
    ).formSnapshot.fields.at(-1)?.id,
    "interests",
  );
  await request("membership", customPayload, studentCookie, 409);
  const publicData = (await request("content")).data;
  assert.equal(JSON.stringify(publicData).includes("SECRET-12345"), false);
  assert.equal(JSON.stringify(publicData).includes('"membershipForm"'), true);
  await request("admin/forms", undefined, "", 401);
  pass(
    "custom forms enforce permissions, versions, required choices, registration status, and immutable private response snapshots",
  );
  await request("auth/recover", { email: student.email });
  files = await readdir(process.env.MAIL_DIR!);
  const resetMails = await Promise.all(
    files.map(async (f) =>
      JSON.parse(await readFile(`${process.env.MAIL_DIR}/${f}`, "utf8")),
    ),
  );
  const resetMail = resetMails.find((m) => m.purpose === "reset");
  await request("auth/reset", {
    token: new URL(resetMail.url).searchParams.get("token"),
    password: "A replacement test password 123!",
  });
  assert.equal((await request("me", undefined, studentCookie)).data.user, null);
  pass("password recovery invalidates existing sessions");
  console.log(`${count} integration scenarios passed.`);
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Integration failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    server?.kill("SIGTERM");
    await delay(1000);
    await cleanup?.();
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
