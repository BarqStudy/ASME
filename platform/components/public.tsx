"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion, animate, useInView } from "motion/react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  Workflow,
  Lightbulb,
  Target,
  Compass,
  GraduationCap,
  Search,
  ExternalLink,
  FileText,
  Trophy,
  Briefcase,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useHub, api } from "./provider";
import { Mechanics } from "./mechanics";
import dynamic from "next/dynamic";
const Tools = dynamic(() => import("./tools").then((m) => m.Tools));
import {
  ContactForm,
  MembershipForm,
  ProjectForm,
  CompetitionForm,
} from "./forms";
const Account = dynamic(() => import("./account").then((m) => m.Account));
const PortalView = dynamic(() => import("./portal").then((m) => m.PortalView));
const Admin = dynamic(() => import("./admin").then((m) => m.Admin));
import { isPages, assetPath } from "@/lib/site-mode";
import { PagesUnavailable, PagesPrivacy } from "@/publication/unavailable";
import type { Content } from "@/lib/types";
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0.94, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
export function Empty({ text }: { text?: string }) {
  const { t } = useHub();
  return (
    <div className="empty glass">
      <Box size={32} />
      <h3>
        {text || t("مساحة تنتظر فكرتك التالية", "Space for your next idea")}
      </h3>
      <p>
        {t(
          "سيظهر المحتوى هنا بعد اعتماده ونشره من إدارة النادي.",
          "Content will appear here when approved and published by the club.",
        )}
      </p>
    </div>
  );
}
export function Head({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <span className="eyebrow">
        <span className="dot" />
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}
function EventCard({ event }: { event: Content["events"][number] }) {
  const { t, bi, lang } = useHub();
  return (
    <Link className="event-card glass" href={`/events/${event.slug}`}>
      <div className="event-art">
        {event.coverUrl ? (
          <Image
            unoptimized
            width={800}
            height={450}
            src={assetPath(event.coverUrl)}
            alt=""
            loading="lazy"
          />
        ) : (
          <>
            <Workflow size={78} strokeWidth={0.8} />
            <span className="art-ring" />
            <span className="art-coordinate">
              ASME NU / ENGINEERING IN ACTION
            </span>
          </>
        )}
        <span className="pill category">
          {
            (
              {
                workshop: t("ورشة", "Workshop"),
                activity: t("نشاط", "Activity"),
                competition: t("مسابقة", "Competition"),
                visit: t("زيارة", "Visit"),
                talk: t("لقاء", "Talk"),
              } as Record<string, string>
            )[event.category]
          }
        </span>
        {event.isSample && (
          <span className="sample-badge">{t("نموذج توضيحي", "Sample")}</span>
        )}
      </div>
      <div className="card-body">
        <div className="meta">
          <CalendarDays size={14} />
          {new Date(event.startsAt).toLocaleDateString(
            lang === "ar" ? "ar-SA" : "en-GB",
            { day: "numeric", month: "long", calendar: "gregory" },
          )}
          <span>·</span>
          <MapPin size={14} />
          {bi(event.location)}
        </div>
        <h3>{bi(event.title)}</h3>
        <p>{bi(event.description)}</p>
        <div className="card-bottom">
          <span>
            <Users size={14} />
            {t(
              `${event.available} مقعد متاح`,
              `${event.available} places available`,
            )}
          </span>
          <span className="circle-arrow">
            <ArrowUpRight size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}
function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null),
    visible = useInView(ref, { once: true }),
    reduced = useReducedMotion(),
    [current, setCurrent] = useState(0);
  useEffect(() => {
    if (visible) {
      const controls = animate(0, value, {
        duration: reduced ? 0 : 0.8,
        onUpdate: (v) => setCurrent(Math.round(v)),
      });
      return () => controls.stop();
    }
  }, [visible, value, reduced]);
  return <span ref={ref}>{current}</span>;
}
function Home() {
  const { t, bi, content } = useHub();
  const club = content.settings.club as
      | { vision?: unknown; mission?: unknown }
      | undefined,
    join = (content.settings.membership as { open?: boolean })?.open;
  return (
    <>
      <section className="hero wrap">
        <Reveal className="hero-copy">
          <div className="hero-label">
            <span className="dot" />
            {t(
              "جامعة نجران · كلية الهندسة",
              "NAJRAN UNIVERSITY · COLLEGE OF ENGINEERING",
            )}
          </div>
          <h1>
            {t("نصنع مستقبل", "Engineering")}
            <br />
            <span>{t("الهندسة الميكانيكية", "what’s next")}</span>
            <i className="blue-period">.</i>
          </h1>
          <p>
            {t(
              "مجتمع هندسي يجمع الإبداع والمعرفة والتطبيق، لتمكين مهندسي المستقبل في جامعة نجران.",
              "An engineering community connecting creativity, knowledge, and practice to empower the next generation at Najran University.",
            )}
          </p>
          <div className="hero-buttons">
            <Link className="button primary" href="/join">
              {t("انضم لنادي ASME", "Join the ASME club")}
              <ArrowUpRight size={19} />
            </Link>
            <Link className="text-button" href="/about">
              {t("تعرّف على النادي", "Meet the club")}
              <ArrowDownLeft size={17} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="fine-line" />
            {t(
              "معرفة تُلهم. تجربة تُطوّر. أثر يستمر.",
              "Learn with curiosity. Build with purpose.",
            )}
          </div>
        </Reveal>
        <Reveal className="hero-lab">
          <Mechanics />
          <div className="lab-footnote">
            <span>DESIGNED TO MOVE</span>
            <span>ME / NU — 001</span>
          </div>
        </Reveal>
      </section>
      {Object.values(content.stats).some((n) => n > 0) && (
        <section className="wrap public-stats">
          <span className="eyebrow">
            {t("أثر النادي بالأرقام الفعلية", "REAL CLUB ACTIVITY")}
          </span>
          <div className="stat-grid">
            {[
              [content.stats.members, t("أعضاء النادي", "Club members")],
              [content.stats.events, t("فعاليات منشورة", "Published events")],
              [content.stats.projects, t("مشاريع معتمدة", "Approved projects")],
              [
                content.stats.attendance,
                t("مشاركات حضورية", "Event attendances"),
              ],
            ].map(([n, label]) => (
              <div className="stat glass" key={label}>
                <strong>
                  <Counter value={Number(n)} />
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="marquee-band" aria-hidden="true">
        <span>DESIGN</span>
        <i>✳︎</i>
        <span>BUILD</span>
        <i>✳︎</i>
        <span>INNOVATE</span>
        <i>✳︎</i>
        <span>ENGINEER</span>
        <i>✳︎</i>
        <span>DESIGN</span>
        <i>✳︎</i>
        <span>BUILD</span>
      </div>
      <section className="wrap section">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">
              01 / {t("ما يجمعنا", "OUR PURPOSE")}
            </span>
            <h2>
              {t("الفكرة تبدأ هنا.", "A place to begin.")}
              <br />
              <span className="muted">
                {t("والأثر يصنعه الجميع.", "The impact is ours to build.")}
              </span>
            </h2>
          </div>
          <p>
            {t(
              "نفتح مساحة للفضول، ونحوّل المعرفة النظرية إلى خبرات هندسية تُلمس.",
              "We make room for curiosity, turning classroom knowledge into hands-on engineering experiences.",
            )}
          </p>
        </Reveal>
        <div className="purpose-grid">
          <Reveal className="purpose-card glass vision">
            <div className="card-kicker">
              <span>01</span>
              <Compass />
            </div>
            <h3>{t("رؤيتنا", "Our vision")}</h3>
            <p>
              {bi(club?.vision) ||
                t(
                  "مجتمع طلابي رائد يسهم في تشكيل مستقبل الهندسة الميكانيكية بالمعرفة والابتكار.",
                  "A leading student community shaping the future of mechanical engineering through knowledge and innovation.",
                )}
            </p>
            <div className="orbit-decoration">
              <span />
              <span />
              <span />
            </div>
          </Reveal>
          <Reveal className="purpose-card glass mission">
            <div className="card-kicker">
              <span>02</span>
              <Target />
            </div>
            <h3>{t("رسالتنا", "Our mission")}</h3>
            <p>
              {bi(club?.mission) ||
                t(
                  "تمكين طلاب الهندسة بالتعلم التطبيقي والتعاون والأنشطة الميكانيكية، وبناء جسور بين الجامعة والممارسة المهنية.",
                  "Empower engineering students through practical learning, collaboration, and mechanical activities that connect university study to professional practice.",
                )}
            </p>
            <span className="mission-cross">+</span>
          </Reveal>
        </div>
      </section>
      <section className="wrap section">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">
              02 / {t("تعلّم بالممارسة", "LEARNING IN MOTION")}
            </span>
            <h2>
              {t("تجارب تستحق حضورك", "Experiences worth showing up for")}
            </h2>
          </div>
          <Link className="text-button" href="/events">
            {t("جميع الفعاليات", "All events")}
            <ArrowUpRight size={18} />
          </Link>
        </Reveal>
        <div className="cards-grid">
          {content.events.slice(0, 3).map((e) => (
            <Reveal key={e.id}>
              <EventCard event={e} />
            </Reveal>
          ))}
        </div>
        {!content.events.length && <Empty />}
      </section>
      <section className="wrap section">
        <Reveal className="library-feature glass">
          <div>
            <span className="eyebrow">
              03 / {t("معرفة في متناولك", "KNOWLEDGE, WITHIN REACH")}
            </span>
            <h2>{t("مساحة لأفكار أكبر.", "Make room for bigger ideas.")}</h2>
            <p>
              {t(
                "مكتبة هندسية، مشاريع طلابية، وأدوات تساعدك على الانتقال من التساؤل إلى الحل.",
                "An engineering library, student projects, and practical tools to take you from a question to a solution.",
              )}
            </p>
            <div className="hero-buttons">
              <Link href="/library" className="button primary">
                {t("افتح المكتبة", "Open the library")}
                <BookOpen size={17} />
              </Link>
              <Link href="/tools" className="text-button">
                {t("جرّب الأدوات", "Try the tools")}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="book-visual" aria-hidden="true">
            <div className="book-spine">
              MECHANICAL
              <br />
              ENGINEERING<span>ASME NU</span>
            </div>
            <div className="book-sheet" />
            <div className="book-card">
              <Lightbulb size={30} />
              <span>
                IDEAS INTO
                <br />
                POSSIBILITIES.
              </span>
            </div>
          </div>
        </Reveal>
      </section>
      {content.projects.some((p) => p.featured) && (
        <section className="wrap section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STUDENT WORK</span>
              <h2>{t("نبني، لنتعلّم.", "We build to learn.")}</h2>
            </div>
            <Link href="/projects" className="text-button">
              {t("استكشف المشاريع", "Explore projects")}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="cards-grid">
            {content.projects
              .filter((p) => p.featured)
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  className="resource-card glass"
                  href="/projects"
                >
                  <Box size={35} />
                  <h3>{bi(p.title)}</h3>
                  <p>{bi(p.description)}</p>
                </Link>
              ))}
          </div>
        </section>
      )}
      {content.posts.some((p) => p.kind === "ANNOUNCEMENT") && (
        <section className="wrap section">
          <div className="section-heading">
            <h2>{t("آخر إعلانات النادي", "Latest club announcements")}</h2>
            <Link href="/media" className="text-button">
              {t("المركز الإعلامي", "Media center")}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="cards-grid">
            {content.posts
              .filter((p) => p.kind === "ANNOUNCEMENT")
              .slice(0, 3)
              .map((p) => (
                <Link href="/media" className="resource-card glass" key={p.id}>
                  <FileText className="accent" size={30} />
                  <h3>{bi(p.title)}</h3>
                  <p>{bi(p.description)}</p>
                </Link>
              ))}
          </div>
        </section>
      )}
      <section className="wrap section join-banner">
        <Reveal>
          <span className="eyebrow">
            {t("المستقبل يحتاج فكرتك", "THE FUTURE NEEDS YOUR IDEAS")}
          </span>
          <h2>
            {t("مكانك بيننا.", "There’s a place for you.")}
            <br />
            <span className="muted">
              {t("وأثرك يبدأ بخطوة.", "Your impact starts here.")}
            </span>
          </h2>
          <Link
            className="button primary"
            href={isPages ? "/projects" : join ? "/join" : "/auth/register"}
          >
            {isPages
              ? t("استكشف مساحة المشاريع", "Explore student projects")
              : t(
                  join ? "قدّم طلب العضوية" : "أنشئ حسابك",
                  join ? "Apply for membership" : "Create your account",
                )}
            <ArrowUpRight size={18} />
          </Link>
          <p className="small muted">
            {t(
              "العضوية الجامعية لا تمنح عضوية ASME الدولية تلقائيًا.",
              "Club membership does not automatically grant international ASME membership.",
            )}
          </p>
        </Reveal>
      </section>
    </>
  );
}
function Events({ slug }: { slug?: string }) {
  const router = useRouter();
  const { content, t, bi, lang, me, toast, error } = useHub(),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [month, setMonth] = useState(""),
    [calendar, setCalendar] = useState(false),
    [busy, setBusy] = useState(false);
  const event = slug ? content.events.find((e) => e.slug === slug) : null;
  async function register() {
    if (!me) {
      router.push("/auth/login");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ status: string }>(
        `events/${event!.id}/register`,
        {},
      );
      toast(
        result.status === "CONFIRMED"
          ? t(
              "تم حجز مقعدك. تجد رمز الحضور في مساحتك.",
              "Your place is confirmed. Your QR is in My hub.",
            )
          : t("أُضيف اسمك لقائمة الانتظار", "You joined the waiting list"),
      );
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  if (slug) {
    if (!event)
      return (
        <div className="wrap section">
          <Empty text={t("الفعالية غير موجودة", "Event not found")} />
        </div>
      );
    return (
      <div className="wrap section">
        <Link href="/events" className="text-button">
          {lang === "ar" ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}{" "}
          {t("كل الفعاليات", "All events")}
        </Link>
        <div className="detail-layout">
          <article>
            <Head
              eyebrow={t("تجربة هندسية", "ENGINEERING EXPERIENCE")}
              title={bi(event.title)}
              description={bi(event.description)}
            />
            {event.isSample && (
              <div className="notice">
                {t(
                  "هذه فعالية توضيحية وليست إعلانًا عن موعد رسمي.",
                  "This is a sample event, not an official announcement.",
                )}
              </div>
            )}
            <div className="prose">{bi(event.body)}</div>
          </article>
          <aside className="glass detail-aside">
            <CalendarDays />
            <h3>
              {new Date(event.startsAt).toLocaleDateString(
                lang === "ar" ? "ar-SA" : "en-GB",
                { dateStyle: "long", calendar: "gregory" },
              )}
            </h3>
            <p>
              <Clock3 size={17} />
              {new Date(event.startsAt).toLocaleTimeString(
                lang === "ar" ? "ar-SA" : "en-GB",
                { timeStyle: "short", timeZone: "Asia/Riyadh" },
              )}{" "}
              · {t("توقيت الرياض", "Riyadh time")}
            </p>
            <p>
              <MapPin size={17} />
              {bi(event.location)}
            </p>
            <p>
              <Users size={17} />
              {t(
                `${event.available} من ${event.capacity} مقعد متاح`,
                `${event.available} of ${event.capacity} seats available`,
              )}
            </p>
            <small className="muted">
              {t("إغلاق التسجيل: ", "Registration closes: ")}
              {new Date(event.deadline).toLocaleString(
                lang === "ar" ? "ar-SA" : "en-GB",
                { calendar: "gregory" },
              )}
            </small>
            <button
              className="button primary full"
              onClick={register}
              disabled={
                isPages || busy || new Date(event.deadline) < new Date()
              }
            >
              {isPages
                ? t("التسجيل غير مفتوح", "Registration is not open")
                : busy
                  ? t("جارٍ التسجيل…", "Registering…")
                  : event.available
                    ? t("احجز مقعدك", "Reserve your place")
                    : event.waitlistEnabled
                      ? t("انضم لقائمة الانتظار", "Join waiting list")
                      : t("اكتملت المقاعد", "Fully booked")}
            </button>
            <p className="small muted">
              {isPages
                ? t(
                    "سيُعلن رابط التسجيل عند اعتماد الفعالية وفتحها.",
                    "A registration link will be announced when this event is approved and opened.",
                  )
                : t(
                    "رمز الحضور يظهر في مساحتك بعد تأكيد التسجيل.",
                    "Your attendance QR appears in My hub after confirmation.",
                  )}
            </p>
          </aside>
        </div>
      </div>
    );
  }
  const filtered = content.events.filter(
    (e) =>
      (filter === "all" || e.category === filter) &&
      (!month || e.startsAt.startsWith(month)) &&
      (bi(e.title) + " " + bi(e.description))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="wrap section">
      <Head
        eyebrow="EXPERIENCES / 01"
        title={t("نلتقي لنتعلّم.", "Come curious. Leave inspired.")}
        description={t(
          "ورش، زيارات، لقاءات ومسابقات تضع المعرفة في حركة.",
          "Workshops, visits, talks, and competitions that put knowledge in motion.",
        )}
      />
      <div className="filters glass">
        <div className="input-icon">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ابحث عن فعالية", "Search events")}
            aria-label={t("بحث الفعاليات", "Search events")}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={t("نوع الفعالية", "Event category")}
        >
          {[
            ["all", "جميع الأنواع", "All categories"],
            ["workshop", "ورش", "Workshops"],
            ["visit", "زيارات", "Visits"],
            ["talk", "لقاءات", "Talks"],
            ["competition", "مسابقات", "Competitions"],
            ["activity", "أنشطة", "Activities"],
          ].map(([value, ar, en]) => (
            <option key={value} value={value}>
              {t(ar, en)}
            </option>
          ))}
        </select>
        <input
          type="month"
          aria-label={t("الشهر", "Month")}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button
          className="button secondary compact"
          onClick={() => setCalendar((v) => !v)}
        >
          <CalendarDays size={16} />
          {t(
            calendar ? "البطاقات" : "التقويم",
            calendar ? "Cards" : "Calendar",
          )}
        </button>
      </div>
      {calendar ? (
        <div className="calendar-list glass">
          {filtered.map((e) => (
            <Link href={`/events/${e.slug}`} key={e.id}>
              <time>
                {new Date(e.startsAt).toLocaleDateString(
                  lang === "ar" ? "ar-SA" : "en-GB",
                  { day: "numeric", month: "short", calendar: "gregory" },
                )}
              </time>
              <strong>{bi(e.title)}</strong>
              <span>{bi(e.location)}</span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map((e) => (
            <EventCard event={e} key={e.id} />
          ))}
        </div>
      )}
      {!filtered.length && (
        <Empty
          text={t("لا توجد فعاليات تطابق بحثك", "No events match your search")}
        />
      )}
    </section>
  );
}
function Library() {
  const router = useRouter();
  const { content, t, bi, me, toast, error } = useHub(),
    [course, setCourse] = useState("all"),
    [q, setQ] = useState(""),
    [type, setType] = useState("all");
  const list = content.resources.filter(
    (r) =>
      (course === "all" || r.courseId === course) &&
      (type === "all" || r.type === type) &&
      (bi(r.title) + " " + bi(r.description))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <section className="wrap section">
      <Head
        eyebrow="KNOWLEDGE / 02"
        title={t("معرفة تبني عليها.", "Knowledge to build on.")}
        description={t(
          "مراجع وروابط وملفات مرخّصة، منظّمة حسب مقررات الهندسة.",
          "Licensed resources, useful links, and files organized by engineering course.",
        )}
      />
      <div className="filters glass">
        <div className="input-icon">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("ابحث في المكتبة", "Search the library")}
            aria-label={t("بحث المراجع", "Search resources")}
          />
        </div>
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          aria-label={t("المقرر", "Course")}
        >
          <option value="all">{t("جميع المقررات", "All courses")}</option>
          {content.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {bi(c.title)}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label={t("نوع المرجع", "Resource type")}
        >
          <option value="all">{t("جميع الأنواع", "All types")}</option>
          <option value="FILE">PDF</option>
          <option value="LINK">{t("روابط", "Links")}</option>
        </select>
      </div>
      <div className="cards-grid">
        {list.map((r) => (
          <div className="resource-card glass" key={r.id}>
            <div className="resource-icon">
              <BookOpen size={25} />
              <span>{r.type === "FILE" ? "PDF" : "LINK"}</span>
            </div>
            <small className="accent">{bi(r.course.title)}</small>
            <h3>{bi(r.title)}</h3>
            <p>{bi(r.description)}</p>
            <div className="rights">
              <ShieldCheck size={14} />
              {r.author} · {r.license}
            </div>
            <div className="card-bottom">
              <a
                className="text-button"
                href={
                  r.type === "FILE" ? `/api/files/${r.assetId}` : r.externalUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                {t(
                  r.type === "FILE" ? "تنزيل الملف" : "فتح المرجع",
                  r.type === "FILE" ? "Download" : "Open resource",
                )}
                <ExternalLink size={16} />
              </a>
              {!isPages && (
                <button
                  className="icon-button"
                  aria-label={t("حفظ المرجع", "Save resource")}
                  onClick={async () => {
                    if (!me) {
                      router.push("/auth/login");
                      return;
                    }
                    try {
                      await api(`resources/${r.id}/save`, { saved: true });
                      toast(
                        t("حُفظ المرجع في مساحتك", "Resource saved to My hub"),
                      );
                    } catch (e) {
                      error(e);
                    }
                  }}
                >
                  <Bookmark size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!list.length && <Empty />}
    </section>
  );
}
function Projects() {
  const router = useRouter();
  const { content, t, bi, me, toast, error } = useHub(),
    [team, setTeam] = useState(false),
    [category, setCategory] = useState("all"),
    [message, setMessage] = useState(""),
    [applyId, setApplyId] = useState("");
  const list = content.projects.filter(
    (p) =>
      (!team || p.needsTeam) && (category === "all" || p.category === category),
  );
  return (
    <section className="wrap section">
      <Head
        eyebrow="BUILT BY STUDENTS / 03"
        title={t("أفكار تخرج إلى الواقع.", "Ideas, made real.")}
        description={t(
          "اعرض مشروعك، شارك خبرتك، وابحث عن فريق يكمل فكرتك.",
          "Show your project, share your experience, and find a team to build with.",
        )}
      >
        {!isPages && (
          <Link href="/projects/submit" className="button primary">
            {t("شارك مشروعك", "Submit your project")}
            <ArrowUpRight size={18} />
          </Link>
        )}
      </Head>
      <div className="filters glass">
        <label className="check">
          <input
            type="checkbox"
            checked={team}
            onChange={(e) => setTeam(e.target.checked)}
          />
          {t("تبحث عن فريق", "Looking for teammates")}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t("التخصص", "Category")}
        >
          <option value="all">{t("كل التخصصات", "All categories")}</option>
          {[...new Set(content.projects.map((p) => p.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="cards-grid">
        {list.map((p) => (
          <article className="project-card glass" key={p.id}>
            <div className="project-art">
              {p.coverUrl ? (
                <Image
                  unoptimized
                  width={800}
                  height={450}
                  src={assetPath(p.coverUrl)}
                  alt=""
                />
              ) : (
                <Box size={86} strokeWidth={0.8} />
              )}
              <span>{p.category}</span>
              {p.isSample && (
                <small className="sample-badge">
                  {t("نموذج توضيحي", "Sample")}
                </small>
              )}
            </div>
            <div className="card-body">
              <small className="accent">
                {
                  (
                    {
                      IDEA: t("فكرة", "Idea"),
                      IN_PROGRESS: t("قيد التطوير", "In progress"),
                      COMPLETED: t("مكتمل", "Completed"),
                    } as Record<string, string>
                  )[p.status]
                }
              </small>
              <h3>{bi(p.title)}</h3>
              <p>{bi(p.description)}</p>
              <details>
                <summary>{t("تفاصيل المشروع", "Project details")}</summary>
                <p className="prose">{bi(p.body)}</p>
                {p.videoUrl && (
                  <a href={p.videoUrl} target="_blank" rel="noreferrer">
                    {t("مشاهدة الفيديو", "Watch video")}
                  </a>
                )}
              </details>
              <div className="tags">
                {p.technologies.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
              {!isPages && p.needsTeam && (
                <button
                  className="button secondary full"
                  onClick={() => {
                    if (!me) {
                      router.push("/auth/login");
                      return;
                    }
                    setApplyId(p.id);
                  }}
                >
                  <Users size={16} />
                  {t("انضم لفريق المشروع", "Apply to join the team")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!list.length && <Empty />}
      {applyId && (
        <div className="modal-backdrop">
          <form
            className="modal glass form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`projects/${applyId}/apply`, { message });
                toast(
                  t("أُرسل طلبك لصاحب المشروع", "Your application was sent"),
                );
                setApplyId("");
              } catch (err) {
                error(err);
              }
            }}
          >
            <h2>
              {t("ماذا تضيف للفريق؟", "What will you bring to the team?")}
            </h2>
            <textarea
              required
              minLength={20}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label={t("رسالة الانضمام", "Application message")}
            />
            <button className="button primary">
              {t("أرسل الطلب", "Send application")}
            </button>
            <button
              type="button"
              className="button secondary"
              data-close-dialog
              onClick={() => setApplyId("")}
            >
              {t("إلغاء", "Cancel")}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
function Competitions() {
  const { content, t, bi, lang } = useHub();
  return (
    <section className="wrap section">
      <Head
        eyebrow="CHALLENGE YOURSELF / 04"
        title={t("التحدي يصنع الفرق.", "Take on the challenge.")}
        description={t(
          "مسابقات هندسية بمعايير واضحة ومساحة للأفكار الجريئة.",
          "Engineering challenges with clear criteria and space for bold ideas.",
        )}
      />
      <div className="cards-grid">
        {content.competitions.map((c) => (
          <article key={c.id} className="resource-card glass">
            <Trophy className="accent" size={36} />
            {c.isSample && (
              <span className="pill">{t("نموذج توضيحي", "Sample")}</span>
            )}
            <h3>{bi(c.title)}</h3>
            <p>{bi(c.description)}</p>
            <p>
              <CalendarDays size={16} />
              {new Date(c.deadline).toLocaleDateString(
                lang === "ar" ? "ar-SA" : "en-GB",
                { calendar: "gregory" },
              )}
            </p>
            <details>
              <summary>
                {t("القواعد ومعايير التقييم", "Rules and evaluation criteria")}
              </summary>
              <p className="prose">{bi(c.rules)}</p>
              {(
                c.criteria as { id: string; label: unknown; max: number }[]
              ).map((x) => (
                <p key={x.id}>
                  {bi(x.label)} · {x.max}
                </p>
              ))}
            </details>
            <Link
              href={`/competitions/${c.id}`}
              className="button primary full"
            >
              {t(
                c.resultsPublished ? "عرض النتائج" : "تفاصيل ومشاركة",
                c.resultsPublished ? "View results" : "Details & entry",
              )}
              <ArrowUpRight size={18} />
            </Link>
          </article>
        ))}
      </div>
      {!content.competitions.length && <Empty />}
    </section>
  );
}
function About() {
  const { content, t, bi } = useHub(),
    club = content.settings.club as { about?: unknown } | undefined,
    leadership = (content.settings.leadership || []) as {
      name: unknown;
      position: unknown;
      bio: unknown;
      image: string;
    }[];
  return (
    <section className="wrap section">
      <Head
        eyebrow="OUR COMMUNITY"
        title={t("هندسة تجمعنا.", "Connected by engineering.")}
        description={t(
          "نادي ASME بجامعة نجران، مساحة طلابية للمعرفة والتطبيق والتعاون.",
          "The ASME student club at Najran University: a space for knowledge, practice, and collaboration.",
        )}
      />
      <div className="about-intro glass">
        <GraduationCap size={45} />
        <p className="prose">
          {bi(club?.about) ||
            t(
              "يستقبل النادي طلاب كلية الهندسة المهتمين بالهندسة الميكانيكية، ويقدّم أنشطة وورشًا ومشاريع ومسابقات تربط الدراسة بالممارسة.",
              "The club welcomes College of Engineering students interested in mechanical engineering through activities, workshops, projects, and competitions connecting study with practice.",
            )}
        </p>
      </div>
      <div className="section-heading">
        <h2>{t("اللجان", "Our committees")}</h2>
      </div>
      <div className="cards-grid">
        {content.committees.map((c, i) => (
          <article className="resource-card glass" key={c.id}>
            <span className="eyebrow">0{i + 1}</span>
            <h3>{bi(c.title)}</h3>
            <p>{bi(c.description)}</p>
          </article>
        ))}
      </div>
      <div className="section-heading">
        <h2>{t("قيادة النادي", "Club leadership")}</h2>
      </div>
      {leadership.length ? (
        <div className="cards-grid">
          {leadership.map((p, i) => (
            <article className="resource-card glass" key={i}>
              {p.image && (
                <Image
                  unoptimized
                  width={800}
                  height={450}
                  className="avatar"
                  src={assetPath(p.image)}
                  alt=""
                />
              )}
              <h3>{bi(p.name)}</h3>
              <span className="accent">{bi(p.position)}</span>
              <p>{bi(p.bio)}</p>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          text={t(
            "ستُعلن أسماء قيادة النادي بعد اعتمادها",
            "Club leadership will be announced after approval",
          )}
        />
      )}
      <div className="notice">
        {t(
          "عضوية النادي الجامعي مستقلة عن عضوية ASME الدولية. للاطلاع على العضوية الدولية، زر الموقع الرسمي للمنظمة.",
          "University club membership is separate from international ASME membership. Visit the official organization website for international membership.",
        )}{" "}
        <a
          href="https://www.asme.org/membership"
          target="_blank"
          rel="noreferrer"
        >
          ASME.org <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
}
function Posts({ kind }: { kind: "CAREER" | "NEWS" }) {
  const { content, t, bi } = useHub(),
    posts = content.posts.filter((p) =>
      kind === "CAREER" ? p.kind === "CAREER" : p.kind !== "CAREER",
    );
  return (
    <section className="wrap section">
      <Head
        eyebrow={kind === "CAREER" ? "YOUR NEXT STEP" : "THE CLUB JOURNAL"}
        title={
          kind === "CAREER"
            ? t("خطوتك المهنية التالية.", "Your next professional step.")
            : t("من قلب النادي.", "From inside the club.")
        }
        description={
          kind === "CAREER"
            ? t(
                "فرص تدريب وتوظيف وتطوير مهني ينشرها فريق النادي.",
                "Training, career, and professional development opportunities shared by the club.",
              )
            : t(
                "الأخبار والإعلانات والتقارير، في مكان واحد.",
                "News, announcements, and reports in one place.",
              )
        }
      />
      <div className="cards-grid">
        {posts.map((p) => (
          <article className="resource-card glass" key={p.id}>
            {p.coverUrl && (
              <Image
                unoptimized
                width={800}
                height={450}
                className="post-cover"
                src={assetPath(p.coverUrl)}
                alt=""
                loading="lazy"
              />
            )}
            {kind === "CAREER" ? (
              <Briefcase size={28} />
            ) : (
              <FileText size={28} />
            )}
            <h3>{bi(p.title)}</h3>
            <p>{bi(p.description)}</p>
            {p.isSample && (
              <span className="pill">{t("نموذج توضيحي", "Sample")}</span>
            )}
            <details>
              <summary>{t("اقرأ المزيد", "Read more")}</summary>
              <p className="prose">{bi(p.body)}</p>
            </details>
            {p.externalUrl && (
              <a
                href={p.externalUrl}
                rel="noreferrer"
                target="_blank"
                className="text-button"
              >
                {t("الرابط الأصلي", "Original source")}
                <ExternalLink size={15} />
              </a>
            )}
          </article>
        ))}
      </div>
      {!posts.length && <Empty />}
    </section>
  );
}
function SearchPage() {
  const { t, bi } = useHub(),
    [q, setQ] = useState(""),
    [data, setData] = useState<Content | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read the URL query after mounting.
    setQ(query);
    void api<Content>(`content?q=${encodeURIComponent(query)}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="wrap section">
      <Head
        eyebrow="SEARCH"
        title={t("اكتشف شيئًا جديدًا.", "Discover something new.")}
        description={q}
      />
      {loading ? (
        <div className="skeleton" />
      ) : (
        <div className="search-results">
          {data?.events.map((e) => (
            <Link
              className="glass search-result"
              href={`/events/${e.slug}`}
              key={e.id}
            >
              <CalendarDays />
              <div>
                <h3>{bi(e.title)}</h3>
                <p>{bi(e.description)}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
          {data?.resources.map((r) => (
            <Link className="glass search-result" href="/library" key={r.id}>
              <BookOpen />
              <div>
                <h3>{bi(r.title)}</h3>
                <p>{bi(r.description)}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
          {data?.projects.map((r) => (
            <Link className="glass search-result" href="/projects" key={r.id}>
              <Box />
              <div>
                <h3>{bi(r.title)}</h3>
                <p>{bi(r.description)}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
          {data?.posts.map((r) => (
            <Link
              className="glass search-result"
              href={r.kind === "CAREER" ? "/careers" : "/media"}
              key={r.id}
            >
              <FileText />
              <div>
                <h3>{bi(r.title)}</h3>
                <p>{bi(r.description)}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
          {data &&
            ![data.events, data.resources, data.projects, data.posts].some(
              (a) => a.length,
            ) && <Empty text={t("لا توجد نتائج", "No results found")} />}
        </div>
      )}
    </section>
  );
}
function Portfolio({ slug }: { slug: string }) {
  const { t, bi } = useHub(),
    [data, setData] = useState<{
      fullName: string;
      bio: unknown;
      skills: string[];
      software: string[];
      experience: string[];
      awards: string[];
      projects: { id: string; title: unknown; description: unknown }[];
      linkedin: string;
      github: string;
    } | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    void api<typeof data>(`portfolio/${slug}`)
      .then(setData)
      .catch(() => setFailed(true));
  }, [slug]);
  return (
    <section className="wrap section">
      {data ? (
        <>
          <Head
            eyebrow="STUDENT PORTFOLIO"
            title={data.fullName}
            description={bi(data.bio)}
          />
          <div className="tags">
            {[...data.skills, ...data.software].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <div className="prose">
            {[...data.experience, ...data.awards].map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
          <div className="cards-grid">
            {data.projects.map((p) => (
              <div className="resource-card glass" key={p.id}>
                <h3>{bi(p.title)}</h3>
                <p>{bi(p.description)}</p>
              </div>
            ))}
          </div>
          <div className="hero-buttons">
            {data.linkedin && (
              <a
                className="button secondary"
                href={data.linkedin}
                rel="noreferrer"
                target="_blank"
              >
                LinkedIn <ExternalLink size={16} />
              </a>
            )}
            {data.github && (
              <a
                className="button secondary"
                href={data.github}
                rel="noreferrer"
                target="_blank"
              >
                GitHub <ExternalLink size={16} />
              </a>
            )}
          </div>
        </>
      ) : failed ? (
        <Empty
          text={t("الملف غير متاح للعامة", "This portfolio is not public")}
        />
      ) : (
        <div className="skeleton" />
      )}
    </section>
  );
}
function Verify({ code }: { code: string }) {
  const { t } = useHub(),
    [valid, setValid] = useState<boolean | null>(null);
  useEffect(() => {
    void api<{ valid: boolean }>(`verify-certificate/${code}`)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false));
  }, [code]);
  return (
    <section className="wrap section">
      <Head
        eyebrow="CERTIFICATE VERIFICATION"
        title={t("التحقق من الشهادة", "Certificate verification")}
        description={
          valid === null
            ? t("جارٍ التحقق…", "Checking…")
            : valid
              ? t(
                  "الشهادة سارية ومعتمدة من منظّم الفعالية.",
                  "This certificate is valid and approved by the organizer.",
                )
              : t(
                  "الشهادة غير موجودة أو أُلغي اعتمادها.",
                  "The certificate was not found or has been revoked.",
                )
        }
      />
    </section>
  );
}
export function PublicPage({ path }: { path: string[] }) {
  const { t } = useHub();
  if (isPages && path[0] === "privacy") return <PagesPrivacy />;
  if (
    isPages &&
    (path[0] === "contact" ||
      ["auth", "portal", "admin", "u", "verify"].includes(path[0]) ||
      (path[0] === "projects" && path[1] === "submit"))
  )
    return <PagesUnavailable contact={path[0] === "contact"} />;
  if (!path.length) return <Home />;
  if (path[0] === "auth") return <Account mode={path[1] || "login"} />;
  if (path[0] === "portal") return <PortalView />;
  if (path[0] === "admin") return <Admin />;
  if (path[0] === "join")
    return (
      <section className="wrap section narrow">
        <Head
          eyebrow="JOIN THE COMMUNITY"
          title={t("أثرك يبدأ من هنا.", "Your impact starts here.")}
          description={t(
            "قدّم طلب عضوية نادي الهندسة الميكانيكية بجامعة نجران.",
            "Apply for membership in the mechanical engineering club at Najran University.",
          )}
        />
        <MembershipForm />
      </section>
    );
  if (path[0] === "events") return <Events slug={path[1]} />;
  if (path[0] === "library") return <Library />;
  if (path[0] === "projects")
    return path[1] === "submit" ? (
      <section className="wrap section narrow">
        <Head
          eyebrow="SHARE YOUR WORK"
          title={t("مشروعك، خطوتك التالية.", "Your project. Your next step.")}
          description={t(
            "تُراجع المشاريع قبل نشرها.",
            "Projects are reviewed before publication.",
          )}
        />
        <ProjectForm />
      </section>
    ) : (
      <Projects />
    );
  if (path[0] === "competitions")
    return path[1] ? <CompetitionForm id={path[1]} /> : <Competitions />;
  if (path[0] === "about") return <About />;
  if (path[0] === "tools") return <Tools />;
  if (path[0] === "careers" || path[0] === "media")
    return <Posts kind={path[0] === "careers" ? "CAREER" : "NEWS"} />;
  if (path[0] === "contact")
    return (
      <section className="wrap section narrow">
        <Head
          eyebrow="LET’S CONNECT"
          title={t("نسمع فكرتك.", "Let’s hear your idea.")}
          description={t(
            "للاستفسارات والتعاون والرعاية والمقترحات.",
            "For questions, collaboration, sponsorships, and suggestions.",
          )}
        />
        <ContactForm />
      </section>
    );
  if (path[0] === "search") return <SearchPage />;
  if (path[0] === "u") return <Portfolio slug={path[1]} />;
  if (path[0] === "verify") return <Verify code={path[1]} />;
  return (
    <section className="wrap section narrow">
      <Head
        eyebrow="YOUR DATA"
        title={t("خصوصيتك أولًا.", "Your privacy comes first.")}
        description={t(
          "نجمع البيانات اللازمة لإدارة النادي والأنشطة فقط.",
          "We collect information needed to operate the club and its activities.",
        )}
      />
      <div className="prose glass resource-card">
        <p>
          {t(
            "بريدك ورقمك الجامعي وطلباتك ونتائجك الخاصة لا تظهر للعامة. ملفك التعريفي العام مغلق افتراضيًا، وتختار أنت المجالات التي ترغب بعرضها.",
            "Your email, university ID, applications, and private results are not public. Public portfolios are disabled by default, and you choose which sections to share.",
          )}
        </p>
        <p>
          {t(
            "يستخدم الموقع ملف جلسة ضروريًا وآمنًا، ويحفظ اللغة والمظهر في متصفحك. يمكن للإدارة المخوّلة الوصول إلى بيانات التسجيل والحضور لأغراض تنظيم الأنشطة.",
            "The site uses an essential session cookie and saves language and appearance in your browser. Authorized organizers can access registration and attendance information to run activities.",
          )}
        </p>
        <p>
          {t(
            "لطلب تصحيح بياناتك أو حذف حسابك، تواصل مع الإدارة عبر النموذج. تطبّق الجامعة متطلبات الاحتفاظ النظامية عند اعتماد التشغيل.",
            "To correct information or request account deletion, contact the club through the form. Institutional retention requirements must be finalized before production operation.",
          )}
        </p>
        <Link href="/contact" className="text-button">
          {t("طلب متعلق بالخصوصية", "Privacy request")}
          <Mail size={16} />
        </Link>
      </div>
    </section>
  );
}
