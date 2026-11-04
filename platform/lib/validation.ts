import { z } from "zod";
export const bi = (limit = 5000, empty = false) =>
  z
    .object({
      ar: empty ? z.string().max(limit) : z.string().trim().min(1).max(limit),
      en: empty ? z.string().max(limit) : z.string().trim().min(1).max(limit),
    })
    .strict();
export const email = z.email().trim().toLowerCase().max(254);
export const password = z.string().min(12).max(128);
export const secureUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      v.startsWith("/api/files/") ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "HTTPS URL required",
  );
export const signup = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email,
    password,
    consent: z.literal(true),
  })
  .strict();
export const login = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const profile = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    universityId: z.string().max(40),
    college: z.string().max(150),
    major: z.string().max(150),
    level: z.string().max(80),
    bioAr: z.string().max(3000),
    bioEn: z.string().max(3000),
    skills: z.array(z.string().max(80)).max(30),
    software: z.array(z.string().max(80)).max(30),
    experience: z.array(z.string().max(300)).max(20),
    awards: z.array(z.string().max(300)).max(20),
    linkedin: secureUrl,
    github: secureUrl,
    slug: z
      .string()
      .regex(/^[a-z0-9-]{3,60}$/)
      .or(z.literal("")),
    publicEnabled: z.boolean(),
    publicSkills: z.boolean(),
    publicProjects: z.boolean(),
    publicExperience: z.boolean(),
  })
  .strict();
export const membership = z
  .object({
    universityId: z.string().trim().min(3).max(40),
    college: z.string().trim().min(2).max(150),
    major: z.string().trim().min(2).max(150),
    level: z.string().trim().min(1).max(80),
    committeeId: z.string().max(100).optional(),
    skills: z.array(z.string().max(80)).max(30),
    motivation: z.string().trim().min(20).max(5000),
    consent: z.literal(true),
  })
  .strict();
export const eventSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,100}$/),
    title: bi(300),
    description: bi(2000),
    body: bi(20000),
    location: bi(300),
    category: z.enum(["workshop", "activity", "competition", "visit", "talk"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    deadline: z.coerce.date(),
    capacity: z.number().int().min(1).max(10000),
    waitlistEnabled: z.boolean(),
    published: z.boolean(),
    featured: z.boolean(),
    isSample: z.boolean(),
    coverUrl: secureUrl,
  })
  .strict()
  .refine(
    (e) => e.endsAt > e.startsAt && e.deadline <= e.startsAt,
    "Invalid event dates",
  );
export const projectSchema = z
  .object({
    title: bi(300),
    description: bi(2000),
    body: bi(12000),
    category: z.string().trim().min(1).max(100),
    technologies: z.array(z.string().max(80)).max(20),
    skillsNeeded: z.array(z.string().max(80)).max(20),
    needsTeam: z.boolean(),
    status: z.enum(["IDEA", "IN_PROGRESS", "COMPLETED"]),
    coverUrl: secureUrl,
    videoUrl: secureUrl,
    cadAssetId: z.string().max(100).optional(),
  })
  .strict();
export const resourceSchema = z
  .object({
    courseId: z.string().min(1),
    title: bi(300),
    description: bi(3000),
    type: z.enum(["FILE", "LINK"]),
    externalUrl: secureUrl,
    assetId: z.string().optional(),
    author: z.string().max(200),
    license: z.string().trim().min(3).max(1000),
    rightsConfirmed: z.literal(true),
    published: z.boolean(),
    featured: z.boolean(),
  })
  .strict()
  .refine(
    (v) => (v.type === "FILE" ? !!v.assetId : !!v.externalUrl),
    "Resource target required",
  );
export const postSchema = z
  .object({
    kind: z.enum(["NEWS", "ANNOUNCEMENT", "CAREER", "REPORT"]),
    title: bi(300),
    description: bi(2000),
    body: bi(20000),
    coverUrl: secureUrl,
    externalUrl: secureUrl,
    published: z.boolean(),
    featured: z.boolean(),
    isSample: z.boolean(),
  })
  .strict();
export const competitionSchema = z
  .object({
    title: bi(300),
    description: bi(3000),
    rules: bi(12000),
    criteria: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
            label: bi(150),
            max: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    deadline: z.coerce.date(),
    published: z.boolean(),
    isSample: z.boolean(),
  })
  .strict()
  .refine(
    (v) => new Set(v.criteria.map((c) => c.id)).size === v.criteria.length,
    "Duplicate criteria",
  );
export const contactSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    kind: z.enum(["CONTACT", "COLLABORATION", "SPONSORSHIP", "SUGGESTION"]),
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(15).max(6000),
    website: z.literal(""),
  })
  .strict();
export const committeeSchema = z
  .object({
    title: bi(200),
    description: bi(3000),
    leaderId: z.string().nullable(),
    published: z.boolean(),
  })
  .strict();
export const taskSchema = z
  .object({
    committeeId: z.string().min(1),
    assigneeId: z.string().nullable(),
    title: bi(200),
    description: bi(5000),
    dueAt: z.coerce.date().nullable(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  })
  .strict();
export const bilingualText = (value: unknown) => {
  const data = bi(30000, true).parse(value);
  return `${data.ar} ${data.en}`.toLowerCase();
};
