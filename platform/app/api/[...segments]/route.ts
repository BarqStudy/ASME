import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import {
  currentUser,
  createSession,
  sessionCookie,
  consumeToken,
} from "@/lib/auth";
import {
  AppError,
  authorize,
  verified,
  checkOrigin,
  rateLimit,
  clientKey,
  hashPassword,
  checkPassword,
  publicUser,
  hashToken,
  can,
  audit,
} from "@/lib/security";
import { sendAccountMail } from "@/lib/mail";
import * as v from "@/lib/validation";
import { publicContent } from "@/lib/content";
import { registerEvent, cancelRegistration } from "@/lib/events";
import { adminGet, adminWrite } from "@/lib/admin";
import { upload, fileResponse } from "@/lib/files";
import { certificatePdf } from "@/lib/pdf";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments: string[] }> };
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function bounded(request: NextRequest, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new AppError(413, "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE");
    }
    parts.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.byteLength;
  }
  return buffer;
}
async function body(request: NextRequest) {
  const raw = new TextDecoder().decode(await bounded(request, 100000));
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, "INVALID_JSON");
  }
}

async function handler(request: NextRequest, context: Context) {
  try {
    const s = (await context.params).segments,
      route = s.join("/"),
      method = request.method,
      user = await currentUser();
    if (!["GET", "HEAD"].includes(method)) {
      checkOrigin(request);
      await rateLimit(`write:${user?.id || clientKey(request)}`, 100, 60000);
    }
    if (method === "GET") {
      if (route === "health") {
        await db.$queryRaw`SELECT 1`;
        return json({ ok: true });
      }
      if (route === "content")
        return json(
          await publicContent(request.nextUrl.searchParams.get("q") || ""),
        );
      if (route === "me")
        return json(
          user
            ? {
                user: { ...publicUser(user), email: user.email },
                profile: await db.profile.findUnique({
                  where: { userId: user.id },
                }),
              }
            : { user: null },
        );
      if (s[0] === "files" && s[1])
        return await fileResponse(
          s[1],
          user,
          request.nextUrl.searchParams.get("view") === "1",
        );
      if (s[0] === "certificate" && s[1]) {
        const cert = await db.certificate.findUnique({
          where: { code: s[1] },
          include: { registration: true },
        });
        if (
          !cert ||
          cert.revokedAt ||
          !user ||
          (cert.registration.userId !== user.id && !can(user.role, "events"))
        )
          throw new AppError(404, "NOT_FOUND");
        return await certificatePdf(cert);
      }
      if (s[0] === "verify-certificate" && s[1]) {
        const cert = await db.certificate.findUnique({ where: { code: s[1] } });
        return json(
          cert && !cert.revokedAt
            ? { valid: true, issuedAt: cert.issuedAt }
            : { valid: false },
        );
      }
      if (s[0] === "portfolio" && s[1]) {
        const profile = await db.profile.findUnique({
          where: { slug: s[1] },
          include: {
            user: {
              select: {
                fullName: true,
                disabledAt: true,
                projects: {
                  where: { publication: "PUBLISHED" },
                  select: { id: true, title: true, description: true },
                },
              },
            },
          },
        });
        if (!profile?.publicEnabled || profile.user.disabledAt)
          throw new AppError(404, "NOT_FOUND");
        return json({
          fullName: profile.user.fullName,
          bio: { ar: profile.bioAr, en: profile.bioEn },
          skills: profile.publicSkills ? profile.skills : [],
          software: profile.publicSkills ? profile.software : [],
          experience: profile.publicExperience ? profile.experience : [],
          awards: profile.publicExperience ? profile.awards : [],
          projects: profile.publicProjects ? profile.user.projects : [],
          linkedin: profile.linkedin,
          github: profile.github,
        });
      }
      if (s[0] === "leaderboard" && s[1]) {
        const competition = await db.competition.findFirst({
          where: { id: s[1], published: true, resultsPublished: true },
        });
        if (!competition) throw new AppError(404, "NOT_FOUND");
        const submissions = await db.competitionSubmission.findMany({
          where: { competitionId: s[1] },
          include: { scores: true, user: { select: { fullName: true } } },
        });
        return json(
          submissions
            .filter((x) => x.scores.length)
            .map((x) => ({
              id: x.id,
              title: x.title,
              name: x.publicName ? x.user.fullName : null,
              score:
                x.scores.reduce((a, b) => a + b.total, 0) / x.scores.length,
            }))
            .sort((a, b) => b.score - a.score),
        );
      }
      if (route === "portal") {
        const u = authorize(user);
        const [
          application,
          registrations,
          projects,
          teamApplications,
          submissions,
          saved,
          notifications,
          tasks,
        ] = await Promise.all([
          db.membershipApplication.findUnique({
            where: { userId: u.id },
            include: { committee: true },
          }),
          db.eventRegistration.findMany({
            where: { userId: u.id },
            include: {
              event: true,
              attendance: true,
              certificate: true,
              feedback: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          db.project.findMany({
            where: { ownerId: u.id },
            include: {
              applications: {
                include: { user: { select: { fullName: true } } },
              },
            },
          }),
          db.teamApplication.findMany({
            where: { userId: u.id },
            include: { project: { select: { title: true } } },
          }),
          db.competitionSubmission.findMany({
            where: { userId: u.id },
            include: {
              competition: { select: { title: true, resultsPublished: true } },
              scores: { select: { total: true, feedback: true } },
            },
          }),
          db.savedResource.findMany({
            where: { userId: u.id, resource: { published: true } },
            include: { resource: true },
          }),
          db.notification.findMany({
            where: { userId: u.id },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          db.task.findMany({
            where: { assigneeId: u.id },
            include: { committee: true },
          }),
        ]);
        return json({
          application,
          registrations,
          projects,
          teamApplications,
          submissions: submissions.map((x) => ({
            ...x,
            scores: x.competition.resultsPublished ? x.scores : [],
          })),
          saved,
          notifications,
          tasks,
        });
      }
      if (s[0] === "qr" && s[1]) {
        const u = authorize(user),
          reg = await db.eventRegistration.findFirst({
            where: { id: s[1], userId: u.id, status: "CONFIRMED" },
          });
        if (!reg) throw new AppError(404, "NOT_FOUND");
        return new Response(
          Buffer.from(
            await QRCode.toBuffer(reg.qrToken, {
              type: "png",
              width: 360,
              margin: 2,
            }),
          ),
          {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "private, no-store",
            },
          },
        );
      }
      if (s[0] === "admin") {
        const u = authorize(user);
        if (s[1] === "report") {
          authorize(u, "events");
          const eventId = request.nextUrl.searchParams.get("eventId");
          if (!eventId) throw new AppError(400, "EVENT_REQUIRED");
          const regs = await db.eventRegistration.findMany({
            where: { eventId },
            include: {
              user: { select: { fullName: true, email: true } },
              attendance: true,
              certificate: true,
              feedback: true,
            },
          });
          const cell = (value: unknown) =>
            '"' +
            String(value ?? "")
              .replace(/^[=+@-]/, "\t$&")
              .replaceAll('"', '""') +
            '"';
          const rows = [
            ["Name", "Email", "Status", "Check-in", "Certificate", "Rating"],
            ...regs.map((r) => [
              r.user.fullName,
              r.user.email,
              r.status,
              r.attendance?.checkedAt.toISOString(),
              r.certificate && !r.certificate.revokedAt ? "Issued" : "",
              r.feedback?.rating,
            ]),
          ];
          await audit(u.id, "EXPORT_REPORT", "Event", eventId);
          return new Response(
            "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n"),
            {
              headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                  'attachment; filename="event-report.csv"',
                "Cache-Control": "private, no-store",
              },
            },
          );
        }
        return json(
          await adminGet(
            s[1],
            u,
            s[2],
            Math.min(
              100000,
              Math.max(
                0,
                Number(request.nextUrl.searchParams.get("page") || 0) || 0,
              ),
            ),
          ),
        );
      }
    }
    if (method === "POST" || method === "PATCH") {
      if (route === "auth/register") {
        await rateLimit(`signup:${clientKey(request)}`, 8, 3600000);
        const data = v.signup.parse(await body(request));
        const domain = process.env.ALLOWED_EMAIL_DOMAIN;
        if (domain && data.email.split("@")[1] !== domain.toLowerCase())
          throw new AppError(400, "UNIVERSITY_EMAIL_REQUIRED");
        const existing = await db.user.findUnique({
          where: { email: data.email },
        });
        if (!existing) {
          const created = await db.user.create({
            data: {
              email: data.email,
              fullName: data.fullName,
              passwordHash: await hashPassword(data.password),
              profile: { create: {} },
            },
          });
          await sendAccountMail(created.id, created.email, "verify");
        }
        return json({ ok: true, message: "CHECK_EMAIL" }, 202);
      }
      if (route === "auth/login") {
        const data = v.login.parse(await body(request));
        await rateLimit(`login-ip:${clientKey(request)}`, 30, 900000);
        await rateLimit(`login-email:${data.email}`, 10, 900000);
        const found = await db.user.findUnique({
          where: { email: data.email },
        });
        const valid = await checkPassword(
          data.password,
          found?.passwordHash ||
            "scrypt$32768$00000000000000000000000000000000$" + "0".repeat(128),
        );
        if (!found || !valid || found.disabledAt)
          throw new AppError(401, "INVALID_CREDENTIALS");
        const session = await createSession(found.id),
          response = json({ user: publicUser(found) });
        response.cookies.set(sessionCookie, session.token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          expires: session.expiresAt,
        });
        return response;
      }
      if (route === "auth/logout") {
        const token = request.cookies.get(sessionCookie)?.value;
        if (token)
          await db.session.deleteMany({
            where: { tokenHash: hashToken(token) },
          });
        const response = json({ ok: true });
        response.cookies.set(sessionCookie, "", {
          httpOnly: true,
          path: "/",
          maxAge: 0,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        return response;
      }
      if (route === "auth/verify") {
        const data = z
          .object({ token: z.string() })
          .strict()
          .parse(await body(request));
        const userId = await consumeToken(data.token, "verify");
        await db.user.update({
          where: { id: userId },
          data: { verifiedAt: new Date() },
        });
        return json({ ok: true });
      }
      if (route === "auth/recover" || route === "auth/resend") {
        await rateLimit(`mail:${clientKey(request)}`, 6, 3600000);
        const data = z
          .object({ email: v.email })
          .strict()
          .parse(await body(request));
        const found = await db.user.findUnique({
          where: { email: data.email },
        });
        if (
          found &&
          !found.disabledAt &&
          (route.endsWith("recover") || !found.verifiedAt)
        )
          await sendAccountMail(
            found.id,
            found.email,
            route.endsWith("recover") ? "reset" : "verify",
          );
        return json({ ok: true, message: "CHECK_EMAIL" });
      }
      if (route === "auth/reset") {
        await rateLimit(`reset:${clientKey(request)}`, 10, 3600000);
        const data = z
          .object({ token: z.string(), password: v.password })
          .strict()
          .parse(await body(request));
        const userId = await consumeToken(data.token, "reset");
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { passwordHash: await hashPassword(data.password) },
          }),
          db.session.deleteMany({ where: { userId } }),
        ]);
        return json({ ok: true });
      }
      if (route === "contact") {
        await rateLimit(`contact:${clientKey(request)}`, 5, 3600000);
        const { website, ...data } = v.contactSchema.parse(await body(request));
        if (website) throw new AppError(400, "VALIDATION_ERROR");
        await db.contactMessage.create({ data });
        return json({ ok: true }, 201);
      }
      const u = verified(authorize(user));
      if (route === "profile") {
        const { fullName, slug, ...data } = v.profile.parse(
          await body(request),
        );
        const result = await db.$transaction([
          db.user.update({
            where: { id: u.id },
            data: { fullName },
            select: { id: true },
          }),
          db.profile.upsert({
            where: { userId: u.id },
            create: { userId: u.id, ...data, slug: slug || null },
            update: { ...data, slug: slug || null },
          }),
        ]);
        return json(result[1]);
      }
      if (route === "membership") {
        const setting = await db.platformSetting.findUnique({
          where: { key: "membership" },
        });
        if (!(setting?.value as { open?: boolean })?.open)
          throw new AppError(409, "MEMBERSHIP_CLOSED");
        const data = v.membership.parse(await body(request));
        if (
          data.committeeId &&
          !(await db.committee.findFirst({
            where: { id: data.committeeId, published: true },
          }))
        )
          throw new AppError(400, "INVALID_COMMITTEE");
        const prior = await db.membershipApplication.findUnique({
          where: { userId: u.id },
        });
        if (
          prior &&
          prior.status !== "NEEDS_INFO" &&
          prior.status !== "REJECTED"
        )
          throw new AppError(409, "APPLICATION_EXISTS");
        const { committeeId, ...payload } = data;
        return json(
          await db.membershipApplication.upsert({
            where: { userId: u.id },
            create: { userId: u.id, committeeId: committeeId || null, payload },
            update: {
              committeeId: committeeId || null,
              payload,
              status: "PENDING",
              reviewNote: "",
              reviewedAt: null,
              reviewedBy: null,
            },
          }),
          201,
        );
      }
      if (s[0] === "events" && s[2] === "register")
        return json(await registerEvent(s[1], u.id), 201);
      if (s[0] === "registrations" && s[2] === "cancel") {
        await cancelRegistration(s[1], u.id);
        return json({ ok: true });
      }
      if (s[0] === "registrations" && s[2] === "feedback") {
        const data = z
          .object({
            rating: z.number().int().min(1).max(5),
            comment: z.string().max(2000),
          })
          .strict()
          .parse(await body(request));
        const reg = await db.eventRegistration.findFirst({
          where: { id: s[1], userId: u.id },
          include: { attendance: true, event: true },
        });
        if (!reg?.attendance || reg.event.endsAt > new Date())
          throw new AppError(409, "ATTENDANCE_REQUIRED");
        return json(
          await db.eventFeedback.upsert({
            where: { registrationId: reg.id },
            create: { registrationId: reg.id, ...data },
            update: data,
          }),
        );
      }
      if (s[0] === "resources" && s[2] === "save") {
        const data = z
          .object({ saved: z.boolean() })
          .strict()
          .parse(await body(request));
        if (
          !(await db.resource.findFirst({
            where: { id: s[1], published: true },
          }))
        )
          throw new AppError(404, "NOT_FOUND");
        if (data.saved)
          await db.savedResource.upsert({
            where: { userId_resourceId: { userId: u.id, resourceId: s[1] } },
            create: { userId: u.id, resourceId: s[1] },
            update: {},
          });
        else
          await db.savedResource.deleteMany({
            where: { userId: u.id, resourceId: s[1] },
          });
        return json({ ok: true });
      }
      if (route === "projects") {
        const data = v.projectSchema.parse(await body(request));
        if (data.cadAssetId) {
          const asset = await db.mediaAsset.findFirst({
            where: { id: data.cadAssetId, ownerId: u.id },
          });
          if (!asset) throw new AppError(403, "FORBIDDEN");
        }
        return json(
          await db.project.create({
            data: {
              ...data,
              ownerId: u.id,
              publication: "PENDING",
              searchText: [data.title, data.description, data.body]
                .map(v.bilingualText)
                .join(" "),
            },
          }),
          201,
        );
      }
      if (s[0] === "projects" && s[2] === "apply") {
        const data = z
          .object({ message: z.string().trim().min(20).max(2000) })
          .strict()
          .parse(await body(request));
        const p = await db.project.findFirst({
          where: { id: s[1], publication: "PUBLISHED", needsTeam: true },
        });
        if (!p || p.ownerId === u.id)
          throw new AppError(409, "TEAM_UNAVAILABLE");
        return json(
          await db.teamApplication.create({
            data: { projectId: p.id, userId: u.id, ...data },
          }),
          201,
        );
      }
      if (s[0] === "team-applications" && s[1]) {
        const data = z
          .object({ status: z.enum(["APPROVED", "REJECTED"]) })
          .strict()
          .parse(await body(request));
        const app = await db.teamApplication.findUnique({
          where: { id: s[1] },
          include: { project: true },
        });
        if (!app || app.project.ownerId !== u.id)
          throw new AppError(403, "FORBIDDEN");
        return json(
          await db.$transaction(async (tx) => {
            const result = await tx.teamApplication.update({
              where: { id: app.id },
              data,
            });
            if (data.status === "APPROVED")
              await tx.projectMember.upsert({
                where: {
                  projectId_userId: {
                    projectId: app.projectId,
                    userId: app.userId,
                  },
                },
                create: { projectId: app.projectId, userId: app.userId },
                update: {},
              });
            return result;
          }),
        );
      }
      if (s[0] === "competitions" && s[2] === "submit") {
        const data = z
          .object({
            title: z.string().trim().min(3).max(200),
            description: z.string().trim().min(20).max(6000),
            link: v.secureUrl,
            assetId: z.string().optional(),
            publicName: z.boolean(),
          })
          .strict()
          .parse(await body(request));
        const comp = await db.competition.findFirst({
          where: { id: s[1], published: true },
        });
        if (!comp || comp.deadline < new Date())
          throw new AppError(409, "SUBMISSION_CLOSED");
        if (
          data.assetId &&
          !(await db.mediaAsset.findFirst({
            where: { id: data.assetId, ownerId: u.id },
          }))
        )
          throw new AppError(403, "FORBIDDEN");
        return json(
          await db.competitionSubmission.create({
            data: { ...data, competitionId: comp.id, userId: u.id },
          }),
          201,
        );
      }
      if (route === "notifications/read") {
        await db.notification.updateMany({
          where: { userId: u.id, readAt: null },
          data: { readAt: new Date() },
        });
        return json({ ok: true });
      }
      if (route === "upload") {
        if (
          Number(request.headers.get("content-length") || 0) >
          11 * 1024 * 1024
        )
          throw new AppError(413, "BODY_TOO_LARGE");
        await rateLimit(`upload:${u.id}`, 20, 3600000);
        const bytes = await bounded(request, 11 * 1024 * 1024);
        const form = await new Response(Buffer.from(bytes), {
          headers: {
            "Content-Type": request.headers.get("content-type") || "",
          },
        }).formData();
        return json(await upload(form, u), 201);
      }
      if (s[0] === "admin")
        return json(await adminWrite(s[1], s[2], s[3], await body(request), u));
    }
    throw new AppError(404, "NOT_FOUND");
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.code }, error.status);
    if (error instanceof z.ZodError)
      return json(
        {
          error: "VALIDATION_ERROR",
          issues: error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        400,
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return json({ error: "ALREADY_EXISTS" }, 409);
      if (["P2025", "P2003"].includes(error.code))
        return json({ error: "NOT_FOUND" }, 404);
    }
    console.error(
      "API failure",
      error instanceof Error ? error.name : "Unknown",
    );
    return json({ error: "SERVER_ERROR" }, 500);
  }
}
export { handler as GET, handler as POST, handler as PATCH };
