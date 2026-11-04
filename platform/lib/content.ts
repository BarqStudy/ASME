import { db } from "./db";
export async function publicContent(q = "") {
  const search = q.trim().toLowerCase().slice(0, 100),
    filter = search ? { searchText: { contains: search } } : {};
  const [
    events,
    courses,
    resources,
    projects,
    competitions,
    posts,
    committees,
    settings,
    memberCount,
    attendanceCount,
    publishedProjectCount,
    eventCount,
  ] = await Promise.all([
    db.event.findMany({
      where: { published: true, ...filter },
      orderBy: { startsAt: "asc" },
      take: 100,
      include: {
        _count: {
          select: { registrations: { where: { status: "CONFIRMED" } } },
        },
      },
    }),
    db.course.findMany({ orderBy: { slug: "asc" } }),
    db.resource.findMany({
      where: { published: true, rightsConfirmed: true, ...filter },
      include: { course: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: { publication: "PUBLISHED", ...filter },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        body: true,
        category: true,
        technologies: true,
        skillsNeeded: true,
        needsTeam: true,
        status: true,
        featured: true,
        isSample: true,
        coverUrl: true,
        videoUrl: true,
      },
    }),
    db.competition.findMany({
      where: { published: true },
      take: 50,
      orderBy: { deadline: "asc" },
    }),
    db.post.findMany({
      where: { published: true, ...filter },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.committee.findMany({
      where: { published: true },
      select: { id: true, title: true, description: true },
    }),
    db.platformSetting.findMany({
      where: { key: { in: ["club", "membership", "leadership"] } },
    }),
    db.clubMember.count({ where: { active: true } }),
    db.attendanceRecord.count(),
    db.project.count({ where: { publication: "PUBLISHED", isSample: false } }),
    db.event.count({ where: { published: true, isSample: false } }),
  ]);
  return {
    stats: {
      members: memberCount,
      attendance: attendanceCount,
      projects: publishedProjectCount,
      events: eventCount,
    },
    events: events.map(({ _count, ...e }) => ({
      ...e,
      confirmed: _count.registrations,
      available: Math.max(0, e.capacity - _count.registrations),
    })),
    courses,
    resources,
    projects,
    competitions,
    posts,
    committees,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
  };
}
