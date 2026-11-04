import { z } from "zod";
import { db } from "./db";
import { AppError, authorize, audit, notify, can, roles } from "./security";
import * as v from "./validation";
import { checkIn, issueCertificate } from "./events";
import type { User, Prisma } from "@prisma/client";
export async function adminGet(
  module: string,
  user: User,
  id?: string,
  page = 0,
) {
  const skip = Math.floor(Math.max(0, page)) * 50;
  if (module === "overview") {
    if (
      !["members", "events", "content", "tasks"].some((c) =>
        can(user.role, c as "members"),
      )
    )
      throw new AppError(403, "FORBIDDEN");
    const [events, members, pending, projects, registrations, attendance] =
      await Promise.all([
        db.event.count(),
        db.clubMember.count({ where: { active: true } }),
        db.membershipApplication.count({ where: { status: "PENDING" } }),
        db.project.count({ where: { publication: "PENDING" } }),
        db.eventRegistration.count({ where: { status: "CONFIRMED" } }),
        db.attendanceRecord.count(),
      ]);
    return { events, members, pending, projects, registrations, attendance };
  }
  switch (module) {
    case "members":
      authorize(user, "members");
      return db.membershipApplication.findMany({
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          committee: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip,
      });
    case "events":
      authorize(user, "events");
      return db.event.findMany({
        orderBy: { startsAt: "desc" },
        take: 50,
        skip,
      });
    case "attendance":
      authorize(user, "events");
      if (!id) throw new AppError(400, "EVENT_REQUIRED");
      return db.eventRegistration.findMany({
        where: { eventId: id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          attendance: true,
          certificate: true,
          feedback: true,
        },
        orderBy: { createdAt: "asc" },
      });
    case "courses":
      authorize(user, "content");
      return db.course.findMany();
    case "resources":
      authorize(user, "content");
      return db.resource.findMany({
        include: { course: true },
        take: 50,
        skip,
      });
    case "posts":
      authorize(user, "content");
      return db.post.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        skip,
      });
    case "projects":
      authorize(user, "projects");
      return db.project.findMany({
        include: {
          owner: { select: { id: true, fullName: true } },
          applications: {
            include: { user: { select: { id: true, fullName: true } } },
          },
        },
        take: 50,
        skip,
      });
    case "competitions":
      authorize(user, "competitions");
      return db.competition.findMany({
        include: {
          submissions: {
            include: {
              user: { select: { id: true, fullName: true } },
              scores: true,
            },
          },
        },
        take: 50,
        skip,
      });
    case "inbox":
      authorize(user, "inbox");
      return db.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        skip,
      });
    case "users":
      authorize(user, "roles");
      return db.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          disabledAt: true,
          verifiedAt: true,
        },
        take: 50,
        skip,
      });
    case "audit":
      authorize(user, "audit");
      return db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        skip,
        include: { actor: { select: { fullName: true } } },
      });
    case "settings":
      authorize(user, "settings");
      return db.platformSetting.findMany();
    case "committees":
      authorize(user, "tasks");
      return db.committee.findMany({
        where: user.role === "COMMITTEE_LEADER" ? { leaderId: user.id } : {},
        include: {
          members: {
            include: { user: { select: { id: true, fullName: true } } },
          },
        },
      });
    case "tasks":
      authorize(user, "tasks");
      return db.task.findMany({
        where:
          user.role === "COMMITTEE_LEADER"
            ? { committee: { leaderId: user.id } }
            : {},
        include: {
          committee: true,
          assignee: { select: { id: true, fullName: true } },
          notes: { include: { author: { select: { fullName: true } } } },
          attachments: {
            include: { asset: { select: { id: true, originalName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip,
      });
    default:
      throw new AppError(404, "NOT_FOUND");
  }
}
async function taskScope(user: User, committeeId: string) {
  if (
    user.role === "COMMITTEE_LEADER" &&
    !(await db.committee.findFirst({
      where: { id: committeeId, leaderId: user.id },
    }))
  )
    throw new AppError(403, "FORBIDDEN");
}
export async function adminWrite(
  module: string,
  id: string | undefined,
  action: string | undefined,
  raw: unknown,
  user: User,
) {
  let result: unknown;
  switch (module) {
    case "members": {
      authorize(user, "members");
      if (!id) throw new AppError(400, "ID_REQUIRED");
      const data = z
        .object({
          status: z.enum(["APPROVED", "REJECTED", "NEEDS_INFO"]),
          reviewNote: z.string().trim().min(3).max(3000),
        })
        .strict()
        .parse(raw);
      result = await db.$transaction(async (tx) => {
        const app = await tx.membershipApplication.update({
          where: { id },
          data: { ...data, reviewedBy: user.id, reviewedAt: new Date() },
        });
        await tx.clubMember.upsert({
          where: { userId: app.userId },
          create: { userId: app.userId, active: data.status === "APPROVED" },
          update: { active: data.status === "APPROVED" },
        });
        const target = await tx.user.findUniqueOrThrow({
          where: { id: app.userId },
        });
        if (data.status === "APPROVED") {
          if (target.role === "STUDENT")
            await tx.user.update({
              where: { id: target.id },
              data: { role: "CLUB_MEMBER" },
            });
          if (app.committeeId)
            await tx.committeeMembership.upsert({
              where: {
                committeeId_userId: {
                  committeeId: app.committeeId,
                  userId: target.id,
                },
              },
              create: { committeeId: app.committeeId, userId: target.id },
              update: {},
            });
        } else {
          if (target.role === "CLUB_MEMBER")
            await tx.user.update({
              where: { id: target.id },
              data: { role: "STUDENT" },
            });
          await tx.committeeMembership.deleteMany({
            where: { userId: target.id },
          });
        }
        return app;
      });
      const app = result as { userId: string };
      await notify(
        app.userId,
        { ar: "تحديث طلب العضوية", en: "Membership application updated" },
        { ar: data.reviewNote, en: data.reviewNote },
      );
      break;
    }
    case "events": {
      authorize(user, "events");
      if (action === "checkin") {
        const data = z
          .object({ qrToken: z.string().min(20).max(200) })
          .strict()
          .parse(raw);
        return checkIn(id!, data.qrToken, user.id);
      }
      if (action === "certificate") {
        const data = z
          .object({ registrationId: z.string() })
          .strict()
          .parse(raw);
        return issueCertificate(data.registrationId, user.id);
      }
      if (action === "revoke") {
        const data = z
          .object({ certificateId: z.string() })
          .strict()
          .parse(raw);
        const cert = await db.certificate.findUnique({
          where: { id: data.certificateId },
          include: { registration: true },
        });
        if (!cert || cert.registration.eventId !== id)
          throw new AppError(404, "NOT_FOUND");
        result = await db.certificate.update({
          where: { id: cert.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
      const data = v.eventSchema.parse(raw);
      const searchText = [
        data.title,
        data.description,
        data.body,
        data.location,
      ]
        .map(v.bilingualText)
        .join(" ");
      result = await db.$transaction(async (tx) => {
        if (id) {
          await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${id} FOR UPDATE`;
          const registered = await tx.eventRegistration.count({
            where: { eventId: id, status: "CONFIRMED" },
          });
          if (data.capacity < registered)
            throw new AppError(409, "CAPACITY_BELOW_REGISTRATIONS");
          return tx.event.update({
            where: { id },
            data: { ...data, searchText },
          });
        }
        return tx.event.create({ data: { ...data, searchText } });
      });
      break;
    }
    case "courses": {
      authorize(user, "content");
      const data = z
        .object({
          slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
          title: v.bi(300),
          description: v.bi(3000),
        })
        .strict()
        .parse(raw);
      result = id
        ? await db.course.update({ where: { id }, data })
        : await db.course.create({ data });
      break;
    }
    case "resources": {
      authorize(user, "content");
      const data = v.resourceSchema.parse(raw);
      if (data.assetId) {
        const asset = await db.mediaAsset.findUnique({
          where: { id: data.assetId },
        });
        if (!asset?.public) throw new AppError(400, "PUBLIC_ASSET_REQUIRED");
      }
      const searchText = [data.title, data.description]
        .map(v.bilingualText)
        .join(" ");
      result = id
        ? await db.resource.update({
            where: { id },
            data: { ...data, searchText },
          })
        : await db.resource.create({ data: { ...data, searchText } });
      break;
    }
    case "posts": {
      authorize(user, "content");
      const data = v.postSchema.parse(raw),
        searchText = [data.title, data.description, data.body]
          .map(v.bilingualText)
          .join(" ");
      result = id
        ? await db.post.update({ where: { id }, data: { ...data, searchText } })
        : await db.post.create({ data: { ...data, searchText } });
      break;
    }
    case "projects": {
      authorize(user, "projects");
      if (!id) throw new AppError(400, "ID_REQUIRED");
      const data = z
        .object({
          publication: z.enum(["PUBLISHED", "REJECTED", "DRAFT"]),
          featured: z.boolean(),
          isSample: z.boolean(),
        })
        .strict()
        .parse(raw);
      result = await db.project.update({ where: { id }, data });
      await notify(
        (result as { ownerId: string }).ownerId,
        { ar: "تحديث مشروعك", en: "Project status updated" },
        { ar: data.publication, en: data.publication },
      );
      break;
    }
    case "competitions": {
      authorize(user, "competitions");
      if (action === "results") {
        const data = z
          .object({ resultsPublished: z.boolean() })
          .strict()
          .parse(raw);
        const comp = await db.competition.findUniqueOrThrow({ where: { id } });
        if (comp.deadline > new Date())
          throw new AppError(409, "DEADLINE_NOT_REACHED");
        result = await db.competition.update({ where: { id }, data });
        break;
      }
      if (action === "score") {
        const data = z
          .object({
            submissionId: z.string(),
            criteria: z.record(z.string(), z.number().int().min(0)),
            feedback: z.string().max(3000),
          })
          .strict()
          .parse(raw);
        const submission = await db.competitionSubmission.findUnique({
          where: { id: data.submissionId },
          include: { competition: true },
        });
        if (!submission || submission.competitionId !== id)
          throw new AppError(404, "NOT_FOUND");
        if (submission.userId === user.id)
          throw new AppError(403, "CANNOT_JUDGE_SELF");
        if (
          submission.competition.deadline > new Date() ||
          submission.competition.resultsPublished
        )
          throw new AppError(409, "SCORING_CLOSED");
        const criteria = submission.competition.criteria as {
          id: string;
          max: number;
        }[];
        if (
          Object.keys(data.criteria).length !== criteria.length ||
          criteria.some(
            (c) =>
              data.criteria[c.id] === undefined || data.criteria[c.id] > c.max,
          )
        )
          throw new AppError(400, "INVALID_SCORES");
        const total = criteria.reduce((s, c) => s + data.criteria[c.id], 0);
        result = await db.competitionScore.upsert({
          where: {
            submissionId_judgeId: {
              submissionId: data.submissionId,
              judgeId: user.id,
            },
          },
          create: { ...data, judgeId: user.id, total },
          update: { criteria: data.criteria, total, feedback: data.feedback },
        });
        break;
      }
      const data = v.competitionSchema.parse(raw);
      result = id
        ? await db.competition.update({ where: { id }, data })
        : await db.competition.create({ data });
      break;
    }
    case "inbox": {
      authorize(user, "inbox");
      const data = z.object({ resolved: z.boolean() }).strict().parse(raw);
      result = await db.contactMessage.update({
        where: { id },
        data: { resolvedAt: data.resolved ? new Date() : null },
      });
      break;
    }
    case "users": {
      authorize(user, "roles");
      if (user.role !== "SUPER_ADMIN")
        throw new AppError(403, "SUPER_ADMIN_REQUIRED");
      const data = z
        .object({ role: z.enum(roles), disabled: z.boolean() })
        .strict()
        .parse(raw);
      result = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "role"='SUPER_ADMIN' FOR UPDATE`;
        const target = await tx.user.findUniqueOrThrow({ where: { id } });
        if (target.id === user.id && data.disabled)
          throw new AppError(409, "CANNOT_DISABLE_SELF");
        if (
          target.role === "SUPER_ADMIN" &&
          (data.role !== "SUPER_ADMIN" || data.disabled) &&
          (await tx.user.count({
            where: { role: "SUPER_ADMIN", disabledAt: null },
          })) <= 1
        )
          throw new AppError(409, "LAST_SUPER_ADMIN");
        await tx.session.deleteMany({ where: { userId: target.id } });
        return tx.user.update({
          where: { id },
          data: {
            role: data.role,
            disabledAt: data.disabled ? new Date() : null,
          },
          select: { id: true, role: true, disabledAt: true },
        });
      });
      break;
    }
    case "committees": {
      authorize(user, "settings");
      const data = v.committeeSchema.parse(raw);
      result = id
        ? await db.committee.update({ where: { id }, data })
        : await db.committee.create({ data });
      break;
    }
    case "tasks": {
      authorize(user, "tasks");
      if (action === "note" || action === "attachment") {
        const task = await db.task.findUniqueOrThrow({ where: { id } });
        await taskScope(user, task.committeeId);
        if (action === "note") {
          const data = z
            .object({ body: z.string().trim().min(1).max(3000) })
            .strict()
            .parse(raw);
          result = await db.taskNote.create({
            data: { taskId: task.id, authorId: user.id, ...data },
          });
        } else {
          const data = z.object({ assetId: z.string() }).strict().parse(raw);
          const asset = await db.mediaAsset.findUnique({
            where: { id: data.assetId },
          });
          if (!asset || asset.ownerId !== user.id)
            throw new AppError(403, "FORBIDDEN");
          result = await db.taskAttachment.create({
            data: { taskId: task.id, ...data },
          });
        }
        break;
      }
      const data = v.taskSchema.parse(raw);
      await taskScope(user, data.committeeId);
      if (id) {
        const prior = await db.task.findUniqueOrThrow({ where: { id } });
        await taskScope(user, prior.committeeId);
      }
      if (
        data.assigneeId &&
        !(await db.committeeMembership.findUnique({
          where: {
            committeeId_userId: {
              committeeId: data.committeeId,
              userId: data.assigneeId,
            },
          },
        }))
      )
        throw new AppError(400, "ASSIGNEE_NOT_IN_COMMITTEE");
      result = id
        ? await db.task.update({ where: { id }, data })
        : await db.task.create({ data });
      break;
    }
    case "settings": {
      authorize(user, "settings");
      const data = z
        .object({
          key: z.enum(["club", "membership", "leadership"]),
          value: z.unknown(),
        })
        .strict()
        .parse(raw);
      let value: Prisma.InputJsonValue;
      if (data.key === "membership")
        value = z
          .object({ open: z.boolean(), notice: v.bi(1500, true) })
          .strict()
          .parse(data.value);
      else if (data.key === "club")
        value = z
          .object({
            vision: v.bi(5000),
            mission: v.bi(5000),
            about: v.bi(10000),
            email: v.email,
            linkedin: v.secureUrl,
          })
          .strict()
          .parse(data.value);
      else
        value = z
          .array(
            z.object({
              name: v.bi(150),
              position: v.bi(150),
              bio: v.bi(3000, true),
              image: v.secureUrl,
            }),
          )
          .max(30)
          .parse(data.value);
      result = await db.platformSetting.upsert({
        where: { key: data.key },
        create: { key: data.key, value },
        update: { value },
      });
      break;
    }
    default:
      throw new AppError(404, "NOT_FOUND");
  }
  await audit(
    user.id,
    "ADMIN_UPDATE",
    module,
    id || (result as { id?: string })?.id || module,
  );
  return result;
}
