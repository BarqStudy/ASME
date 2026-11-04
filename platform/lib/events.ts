import { db } from "./db";
import { AppError, newToken, audit, notify } from "./security";
export async function registerEvent(eventId: string, userId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${eventId} FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event || !event.published) throw new AppError(404, "NOT_FOUND");
    if (event.deadline < new Date() || event.endsAt < new Date())
      throw new AppError(409, "REGISTRATION_CLOSED");
    const existing = await tx.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing && existing.status !== "CANCELLED")
      throw new AppError(409, "ALREADY_REGISTERED");
    const count = await tx.eventRegistration.count({
      where: { eventId, status: "CONFIRMED" },
    });
    if (count >= event.capacity && !event.waitlistEnabled)
      throw new AppError(409, "EVENT_FULL");
    const status = count < event.capacity ? "CONFIRMED" : "WAITLISTED";
    return existing
      ? tx.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status,
            createdAt: new Date(),
            cancelledAt: null,
            qrToken: newToken(),
          },
        })
      : tx.eventRegistration.create({
          data: { userId, eventId, status, qrToken: newToken() },
        });
  });
}
export async function cancelRegistration(id: string, userId: string) {
  const registration = await db.eventRegistration.findUnique({
    where: { id },
    include: { event: true, attendance: true },
  });
  if (!registration || registration.userId !== userId)
    throw new AppError(404, "NOT_FOUND");
  if (registration.attendance || registration.event.startsAt < new Date())
    throw new AppError(409, "CANNOT_CANCEL");
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${registration.eventId} FOR UPDATE`;
    const current = await tx.eventRegistration.findUnique({
      where: { id },
      include: { attendance: true, event: true },
    });
    if (!current || current.status === "CANCELLED")
      throw new AppError(409, "ALREADY_CANCELLED");
    if (current.attendance || current.event.startsAt < new Date())
      throw new AppError(409, "CANNOT_CANCEL");
    await tx.eventRegistration.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (current.status === "CONFIRMED") {
      const next = await tx.eventRegistration.findFirst({
        where: { eventId: current.eventId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.eventRegistration.update({
          where: { id: next.id },
          data: { status: "CONFIRMED" },
        });
        return next.userId;
      }
    }
    return null;
  });
  if (result)
    await notify(
      result,
      { ar: "أصبح لك مقعد في الفعالية", en: "Your event place is confirmed" },
      {
        ar: "انتقلت من قائمة الانتظار إلى التسجيل المؤكد.",
        en: "You moved from the waiting list to a confirmed place.",
      },
      "/portal",
    );
}
export async function checkIn(
  eventId: string,
  qrToken: string,
  actorId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${eventId} FOR UPDATE`;
    const registration = await tx.eventRegistration.findUnique({
      where: { qrToken },
      include: { attendance: true, event: true },
    });
    if (
      !registration ||
      registration.eventId !== eventId ||
      registration.status !== "CONFIRMED"
    )
      throw new AppError(400, "INVALID_QR");
    if (registration.attendance) throw new AppError(409, "ALREADY_CHECKED_IN");
    const now = Date.now();
    if (
      now < registration.event.startsAt.getTime() - 2 * 3600000 ||
      now > registration.event.endsAt.getTime() + 24 * 3600000
    )
      throw new AppError(409, "CHECKIN_WINDOW_CLOSED");
    const attendance = await tx.attendanceRecord.create({
      data: { registrationId: registration.id, checkedById: actorId },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ATTENDANCE_CHECKIN",
        entityType: "EventRegistration",
        entityId: registration.id,
        detail: { eventId },
      },
    });
    return attendance;
  });
}
export async function issueCertificate(
  registrationId: string,
  actorId: string,
) {
  const registration = await db.eventRegistration.findUnique({
    where: { id: registrationId },
    include: { attendance: true, event: true, user: true, certificate: true },
  });
  if (
    !registration ||
    registration.status !== "CONFIRMED" ||
    !registration.attendance
  )
    throw new AppError(409, "ATTENDANCE_REQUIRED");
  if (registration.event.endsAt > new Date())
    throw new AppError(409, "EVENT_NOT_ENDED");
  if (registration.certificate) throw new AppError(409, "CERTIFICATE_EXISTS");
  const certificate = await db.certificate.create({
    data: {
      registrationId,
      issuedById: actorId,
      code: newToken().slice(0, 20),
      snapshot: {
        name: registration.user.fullName,
        event: registration.event.title,
        date: registration.event.startsAt.toISOString(),
      },
    },
  });
  await audit(actorId, "CERTIFICATE_ISSUED", "Certificate", certificate.id, {
    registrationId,
  });
  await notify(
    registration.userId,
    { ar: "شهادة مشاركتك جاهزة", en: "Your certificate is ready" },
    {
      ar: "اعتمدت إدارة الفعالية شهادتك ويمكنك تنزيلها.",
      en: "The organizer approved your participation certificate. You can download it now.",
    },
    "/portal",
  );
  return certificate;
}
