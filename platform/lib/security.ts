import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Role, User, Prisma } from "@prisma/client";
import { db } from "./db";
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export const roles = [
  "SUPER_ADMIN",
  "CLUB_PRESIDENT",
  "COMMITTEE_LEADER",
  "EVENTS_MANAGER",
  "CONTENT_MANAGER",
  "CLUB_MEMBER",
  "STUDENT",
] as const;
export type Capability =
  | "members"
  | "events"
  | "content"
  | "projects"
  | "competitions"
  | "tasks"
  | "inbox"
  | "roles"
  | "audit"
  | "settings";
const permissions: Record<Role, readonly Capability[]> = {
  SUPER_ADMIN: [
    "members",
    "events",
    "content",
    "projects",
    "competitions",
    "tasks",
    "inbox",
    "roles",
    "audit",
    "settings",
  ],
  CLUB_PRESIDENT: [
    "members",
    "events",
    "content",
    "projects",
    "competitions",
    "tasks",
    "inbox",
    "roles",
    "audit",
    "settings",
  ],
  COMMITTEE_LEADER: ["tasks"],
  EVENTS_MANAGER: ["events", "competitions"],
  CONTENT_MANAGER: ["content", "projects"],
  CLUB_MEMBER: [],
  STUDENT: [],
};
export const can = (role: Role, cap: Capability) =>
  permissions[role].includes(cap);
export function authorize(user: User | null, cap?: Capability): User {
  if (!user || user.disabledAt) throw new AppError(401, "AUTH_REQUIRED");
  if (cap && !can(user.role, cap)) throw new AppError(403, "FORBIDDEN");
  return user;
}
export function verified(user: User) {
  if (!user.verifiedAt) throw new AppError(403, "VERIFY_EMAIL");
  return user;
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
async function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function checkPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (
    parts.length !== 4 ||
    parts[0] !== "scrypt" ||
    parts[1] !== "32768" ||
    !/^[a-f0-9]{32}$/.test(parts[2]) ||
    !/^[a-f0-9]{128}$/.test(parts[3])
  )
    return false;
  return timingSafeEqual(
    await derive(password, parts[2]),
    Buffer.from(parts[3], "hex"),
  );
}
export const publicUser = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  role: u.role,
  verified: !!u.verifiedAt,
});
export function checkOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL || "http://localhost:3000")
    .origin;
  if (request.headers.get("origin") !== expected)
    throw new AppError(403, "ORIGIN_REJECTED");
}
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const end = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateBucket" ("key","count","resetsAt") VALUES (${hashToken(key)},1,${end}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateBucket"."resetsAt"<NOW() THEN 1 ELSE "RateBucket"."count"+1 END,"resetsAt"=CASE WHEN "RateBucket"."resetsAt"<NOW() THEN ${end} ELSE "RateBucket"."resetsAt" END RETURNING "count"`;
  if (rows[0].count > limit) throw new AppError(429, "RATE_LIMITED");
}
export function clientKey(request: Request) {
  return process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
    : "direct";
}
export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  detail: Prisma.InputJsonValue = {},
) {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, detail },
  });
}
export async function notify(
  userId: string,
  title: { ar: string; en: string },
  body: { ar: string; en: string },
  link = "/portal",
) {
  await db.notification.create({ data: { userId, title, body, link } });
}
