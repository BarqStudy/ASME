import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, convert, tools } from "../lib/calculators";
import { hashPassword, checkPassword, can, hashToken } from "../lib/security";
import { secureUrl, eventSchema, membership } from "../lib/validation";
const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
test("seven required tools with physically consistent results", () => {
  assert.equal(tools.length, 7);
  close(calculate("stress", { force: 1000, area: 100 }).result, 10);
  close(calculate("strain", { extension: 1, length: 1000 }).result, 0.001);
  close(calculate("torque", { force: 100, radius: 0.5 }).result, 50);
  close(calculate("power", { torque: 10, rpm: 1500 }).result, 500 * Math.PI);
  close(
    calculate("expansion", { coefficient: 12e-6, length: 1, delta: 50 }).result,
    0.0006,
  );
  close(
    calculate("beam", { force: 1000, length: 2, modulus: 200, inertia: 1e6 })
      .result,
    5 / 6,
  );
  close(
    calculate(
      "beam",
      { force: 1000, length: 2, modulus: 200, inertia: 1e6 },
      "cantilever",
    ).result,
    40 / 3,
  );
});
test("SI, imperial, and affine temperature conversions round trip", () => {
  close(convert(1, "length", "in", "mm"), 25.4);
  close(convert(1, "force", "lbf", "N"), 4.4482216152605);
  close(convert(1, "pressure", "MPa", "Pa"), 1e6);
  close(convert(1, "power", "hp", "W"), 745.6998715822702);
  close(convert(32, "temperature", "F", "C"), 0);
  close(convert(100, "temperature", "C", "F"), 212);
  close(convert(273.15, "temperature", "K", "C"), 0);
  close(convert(convert(17, "length", "ft", "m"), "length", "m", "ft"), 17);
});
test("invalid physical domains, nonfinite input, and unknown cases reject", () => {
  assert.throws(() => calculate("stress", { force: 1, area: 0 }));
  assert.throws(() =>
    calculate("beam", { force: 1, length: 2, modulus: -1, inertia: 10 }),
  );
  assert.throws(() =>
    calculate(
      "beam",
      { force: 1, length: 2, modulus: 1, inertia: 10 },
      "unknown",
    ),
  );
  assert.throws(() => calculate("power", { torque: NaN, rpm: 1 }));
  assert.throws(() => convert(-1, "temperature", "K", "C"));
  assert.throws(() => convert(1, "length", "kg", "m"));
});
test("salted password hashes verify without plaintext storage", async () => {
  const first = await hashPassword("Long local test password!");
  const second = await hashPassword("Long local test password!");
  assert.notEqual(first, second);
  assert.equal(await checkPassword("Long local test password!", first), true);
  assert.equal(await checkPassword("Wrong password", first), false);
  assert.equal(await checkPassword("x", "malformed"), false);
  assert.equal(hashToken("secret").length, 64);
});
test("role permissions are least privilege", () => {
  assert.equal(can("STUDENT", "events"), false);
  assert.equal(can("CLUB_MEMBER", "members"), false);
  assert.equal(can("COMMITTEE_LEADER", "roles"), false);
  assert.equal(can("EVENTS_MANAGER", "events"), true);
  assert.equal(can("EVENTS_MANAGER", "members"), false);
  assert.equal(can("CONTENT_MANAGER", "projects"), true);
  assert.equal(can("SUPER_ADMIN", "roles"), true);
});
test("URLs reject script, credentials, and insecure external sources", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
    "//example.com",
    "data:text/html,test",
  ])
    assert.equal(secureUrl.safeParse(url).success, false);
  assert.equal(
    secureUrl.safeParse("https://example.com/learning").success,
    true,
  );
  assert.equal(secureUrl.safeParse("/api/files/opaque").success, true);
});
test("schemas reject impossible dates and incomplete membership consent", () => {
  const bi = { ar: "عنوان", en: "Title" };
  assert.equal(
    eventSchema.safeParse({
      slug: "sample",
      title: bi,
      description: bi,
      body: bi,
      location: bi,
      category: "workshop",
      startsAt: "2026-11-10",
      endsAt: "2026-11-09",
      deadline: "2026-11-08",
      capacity: 10,
      waitlistEnabled: true,
      published: false,
      featured: false,
      isSample: true,
      coverUrl: "",
    }).success,
    false,
  );
  assert.equal(
    membership.safeParse({
      universityId: "123",
      college: "Engineering",
      major: "Mechanical",
      level: "2",
      skills: [],
      motivation: "A long enough motivation text",
      consent: false,
    }).success,
    false,
  );
});

// Dynamic membership fields are enforced on the server as well as in the UI.
import {
  defaultMembershipForm,
  membershipFormSchema,
  validateFormAnswers,
  videoSource,
  type FormField,
} from "../lib/form-schema";
const choiceField: FormField = {
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
      imageUrl: "https://example.com/cad.png",
    },
    { id: "robotics", label: { ar: "روبوت", en: "Robotics" }, imageUrl: "" },
  ],
};
test("form schemas reject duplicate identifiers, missing choices, and unsafe media", () => {
  const base = structuredClone(defaultMembershipForm);
  assert.equal(membershipFormSchema.safeParse(base).success, true);
  assert.equal(
    membershipFormSchema.safeParse({
      ...base,
      fields: [...base.fields, base.fields[0]],
    }).success,
    false,
  );
  assert.equal(
    membershipFormSchema.safeParse({
      ...base,
      fields: [{ ...choiceField, options: [] }],
    }).success,
    false,
  );
  assert.equal(
    membershipFormSchema.safeParse({
      ...base,
      fields: [{ ...choiceField, mediaUrl: "javascript:alert(1)" }],
    }).success,
    false,
  );
  assert.equal(
    membershipFormSchema.safeParse({
      ...base,
      fields: [
        { ...choiceField, type: "video", mediaUrl: "https://evil.test/embed" },
      ],
    }).success,
    false,
  );
});
test("required answers, choice membership, typed values, and unknown fields cannot be bypassed", () => {
  const form = { ...defaultMembershipForm, fields: [choiceField] };
  assert.deepEqual(validateFormAnswers(form, { interests: ["cad"] }), {
    interests: ["cad"],
  });
  for (const answers of [
    {},
    { interests: [] },
    { interests: ["fake"] },
    { interests: ["cad", "cad"] },
    { interests: "cad" },
    { interests: ["cad"], invented: "x" },
  ])
    assert.throws(() => validateFormAnswers(form, answers));
  for (const [type, value] of [
    ["email", "wrong"],
    ["number", "Infinity"],
    ["date", "2026-02-31"],
    ["checkbox", "true"],
  ] as const)
    assert.throws(() =>
      validateFormAnswers(
        { ...form, fields: [{ ...choiceField, type }] },
        { interests: value },
      ),
    );
  assert.deepEqual(
    validateFormAnswers(
      {
        ...form,
        fields: [{ ...choiceField, type: "section", required: false }],
      },
      {},
    ),
    {},
  );
});
test("video embeds allow only known YouTube IDs or direct HTTPS video files", () => {
  assert.deepEqual(videoSource("https://youtu.be/dQw4w9WgXcQ"), {
    type: "youtube",
    url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  });
  assert.equal(
    videoSource("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
    null,
  );
  assert.equal(videoSource("https://example.com/clip.mp4")?.type, "file");
  assert.equal(videoSource("javascript:alert(1)"), null);
});
