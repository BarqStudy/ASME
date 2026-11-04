"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  UserRound,
  CalendarDays,
  Bookmark,
  Bell,
  FolderKanban,
  GraduationCap,
  LogOut,
  QrCode,
  Download,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { useHub, api } from "./provider";
import { Gate, Field, fields, split } from "./forms";
import { Empty } from "./public";
import type { Portal, Profile } from "@/lib/types";
export function PortalView() {
  const router = useRouter();
  const { t, bi, me, profile, refresh, error, toast } = useHub(),
    [tab, setTab] = useState("overview"),
    [data, setData] = useState<Portal | null>(null),
    [qr, setQr] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  async function reload() {
    setData(await api<Portal>("portal"));
  }
  useEffect(() => {
    if (me)
      void api<Portal>("portal")
        .then(setData)
        .catch(() => {});
  }, [me]);
  async function action(route: string, body: unknown = {}) {
    setBusy(true);
    try {
      await api(route, body);
      await reload();
      toast(t("تم حفظ التغيير", "Change saved"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    ["overview", "نظرة عامة", "Overview", GraduationCap],
    ["profile", "ملفي الشخصي", "Profile", UserRound],
    ["events", "فعالياتي", "My events", CalendarDays],
    ["projects", "مشاريعي وفريقي", "Projects & team", FolderKanban],
    ["saved", "المراجع المحفوظة", "Saved resources", Bookmark],
    ["notifications", "الإشعارات", "Notifications", Bell],
  ] as const;
  return (
    <section className="wrap section">
      <Gate>
        <div className="page-head portal-head">
          <div>
            <span className="eyebrow">YOUR PERSONAL ENGINEERING HUB</span>
            <h1>
              {t("أهلًا، ", "Hello, ")}
              {me?.fullName.split(" ")[0]}
              <span className="accent">.</span>
            </h1>
            <p>
              {t(
                "كل خطواتك الهندسية، في مساحة واحدة.",
                "All your engineering steps, in one space.",
              )}
            </p>
          </div>
          <button
            className="button secondary compact"
            onClick={async () => {
              await api("auth/logout", {});
              await refresh();
              router.push("/");
            }}
          >
            <LogOut size={16} />
            {t("خروج", "Sign out")}
          </button>
        </div>
        <div className="portal-layout">
          <nav
            className="portal-nav glass"
            aria-label={t("مساحة الطالب", "Student hub")}
          >
            {tabs.map(([id, ar, en, Icon]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                <Icon size={18} />
                {t(ar, en)}
              </button>
            ))}
          </nav>
          <div className="portal-content">
            {!data ? (
              <div className="skeleton" />
            ) : tab === "overview" ? (
              <>
                <div className="stat-grid">
                  {[
                    [
                      data.registrations.filter((r) => r.status === "CONFIRMED")
                        .length,
                      t("فعاليات مؤكدة", "Confirmed events"),
                    ],
                    [
                      data.registrations.filter((r) => r.attendance).length,
                      t("مرات حضور", "Events attended"),
                    ],
                    [data.projects.length, t("مشروعات", "Projects")],
                    [data.saved.length, t("مراجع محفوظة", "Saved resources")],
                  ].map(([n, label]) => (
                    <div className="glass stat" key={label}>
                      <strong>{n}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="glass resource-card">
                  <ShieldCheck className="accent" />
                  <h2>{t("عضوية النادي", "Club membership")}</h2>
                  <p>
                    <span
                      className={`status ${data.application?.status === "APPROVED" ? "success" : ""}`}
                    >
                      {data.application
                        ? (
                            {
                              PENDING: t("قيد المراجعة", "Under review"),
                              APPROVED: t("عضو معتمد", "Approved member"),
                              REJECTED: t(
                                "لم يُعتمد الطلب",
                                "Application declined",
                              ),
                              NEEDS_INFO: t(
                                "مطلوب معلومات إضافية",
                                "More information needed",
                              ),
                            } as Record<string, string>
                          )[data.application.status]
                        : t("لم تقدم طلبًا بعد", "No application yet")}
                    </span>
                  </p>
                  {data.application?.reviewNote && (
                    <p>{data.application.reviewNote}</p>
                  )}
                  {(!data.application ||
                    ["REJECTED", "NEEDS_INFO"].includes(
                      data.application.status,
                    )) && (
                    <Link className="button primary" href="/join">
                      {t("طلب العضوية", "Apply for membership")}
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                  <p className="small muted">
                    {t(
                      "عضوية النادي الجامعي مستقلة عن عضوية ASME الدولية.",
                      "University club membership is separate from international ASME membership.",
                    )}
                  </p>
                </div>
                {data.tasks.length > 0 && (
                  <div className="glass resource-card">
                    <h3>{t("مهامي", "My tasks")}</h3>
                    {data.tasks.map((task) => (
                      <div className="list-row" key={task.id}>
                        <div>
                          <strong>{bi(task.title)}</strong>
                          <p>{bi(task.description)}</p>
                        </div>
                        <span className="status">{task.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {data.submissions.length > 0 && (
                  <div className="glass resource-card">
                    <h3>
                      {t("مشاركاتي في المسابقات", "My competition entries")}
                    </h3>
                    {data.submissions.map((s) => (
                      <div key={s.id} className="list-row">
                        <div>
                          <strong>{s.title}</strong>
                          <p>{bi(s.competition.title)}</p>
                          {s.scores.map((score, i) => (
                            <p key={i}>
                              {score.total} · {score.feedback}
                            </p>
                          ))}
                        </div>
                        <CheckCircle2 size={18} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : tab === "profile" ? (
              <ProfileForm initial={profile} />
            ) : tab === "events" ? (
              <>
                {data.registrations.length ? (
                  data.registrations.map((r) => (
                    <article
                      className="glass resource-card registration-card"
                      key={r.id}
                    >
                      <div>
                        <span
                          className={`status ${r.status === "CONFIRMED" ? "success" : ""}`}
                        >
                          {
                            (
                              {
                                CONFIRMED: t("مؤكد", "Confirmed"),
                                WAITLISTED: t("قائمة انتظار", "Waiting list"),
                                CANCELLED: t("ملغي", "Cancelled"),
                              } as Record<string, string>
                            )[r.status]
                          }
                        </span>
                        <h3>{bi(r.event.title)}</h3>
                        <p>
                          {new Date(r.event.startsAt).toLocaleString()} ·{" "}
                          {bi(r.event.location)}
                        </p>
                        {r.attendance && (
                          <p className="accent">
                            <CheckCircle2 size={15} />
                            {t("سُجّل حضورك", "Attendance recorded")}
                          </p>
                        )}
                      </div>
                      <div className="row-actions">
                        {r.status === "CONFIRMED" && (
                          <button
                            className="button secondary compact"
                            onClick={() => setQr(r.id)}
                          >
                            <QrCode size={16} />
                            {t("رمز الحضور", "Attendance QR")}
                          </button>
                        )}
                        {r.certificate && !r.certificate.revokedAt && (
                          <a
                            className="button primary compact"
                            href={`/api/certificate/${r.certificate.code}`}
                          >
                            <Download size={16} />
                            {t("الشهادة", "Certificate")}
                          </a>
                        )}
                        {r.status !== "CANCELLED" &&
                          !r.attendance &&
                          new Date(r.event.startsAt) > new Date() && (
                            <button
                              disabled={busy}
                              className="text-button danger"
                              onClick={() =>
                                void action(`registrations/${r.id}/cancel`)
                              }
                            >
                              {t("إلغاء التسجيل", "Cancel registration")}
                            </button>
                          )}
                      </div>
                      {r.attendance &&
                        new Date(r.event.endsAt) < new Date() && (
                          <form
                            className="feedback-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = fields(e.currentTarget);
                              void action(`registrations/${r.id}/feedback`, {
                                rating: Number(f.rating),
                                comment: f.comment,
                              });
                            }}
                          >
                            <label>
                              {t("تقييم التجربة", "Rate the experience")}
                              <select
                                name="rating"
                                defaultValue={r.feedback?.rating || 5}
                              >
                                {[5, 4, 3, 2, 1].map((v) => (
                                  <option value={v} key={v}>
                                    {v} / 5
                                  </option>
                                ))}
                              </select>
                            </label>
                            <input
                              name="comment"
                              maxLength={2000}
                              defaultValue={r.feedback?.comment}
                              placeholder={t(
                                "ملاحظتك (اختياري)",
                                "Your feedback (optional)",
                              )}
                              aria-label={t("الملاحظات", "Feedback")}
                            />
                            <button
                              className="button secondary compact"
                              disabled={busy}
                            >
                              {t("حفظ", "Save")}
                            </button>
                          </form>
                        )}
                    </article>
                  ))
                ) : (
                  <Empty
                    text={t(
                      "لم تسجل في فعالية بعد",
                      "No event registrations yet",
                    )}
                  />
                )}
              </>
            ) : tab === "projects" ? (
              <>
                <Link href="/projects/submit" className="button primary">
                  {t("أضف مشروعًا", "Submit a project")}
                  <ArrowUpRight size={17} />
                </Link>
                {data.projects.map((p) => (
                  <div className="glass resource-card" key={p.id}>
                    <span className="status">{p.publication}</span>
                    <h3>{bi(p.title)}</h3>
                    <p>{bi(p.description)}</p>
                    {p.applications.map((a) => (
                      <div className="list-row" key={a.id}>
                        <div>
                          <strong>{a.user.fullName}</strong>
                          <p>{a.message}</p>
                          <span className="status">{a.status}</span>
                        </div>
                        <div className="row-actions">
                          <button
                            disabled={busy}
                            className="button secondary compact"
                            onClick={() =>
                              void action(`team-applications/${a.id}`, {
                                status: "APPROVED",
                              })
                            }
                          >
                            {t("قبول", "Accept")}
                          </button>
                          <button
                            disabled={busy}
                            className="text-button danger"
                            onClick={() =>
                              void action(`team-applications/${a.id}`, {
                                status: "REJECTED",
                              })
                            }
                          >
                            {t("رفض", "Decline")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {data.teamApplications.map((a) => (
                  <div className="glass list-row resource-card" key={a.id}>
                    <strong>{bi(a.project.title)}</strong>
                    <span className="status">{a.status}</span>
                  </div>
                ))}
              </>
            ) : tab === "saved" ? (
              <>
                {data.saved.length ? (
                  data.saved.map((s) => (
                    <div className="glass list-row resource-card" key={s.id}>
                      <div>
                        <h3>{bi(s.resource.title)}</h3>
                        <a
                          href={
                            s.resource.type === "FILE"
                              ? `/api/files/${s.resource.assetId}`
                              : s.resource.externalUrl
                          }
                          rel="noreferrer"
                          target="_blank"
                          className="accent"
                        >
                          {t("فتح المرجع", "Open resource")}
                        </a>
                      </div>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          void action(`resources/${s.resource.id}/save`, {
                            saved: false,
                          })
                        }
                      >
                        {t("إزالة", "Remove")}
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty />
                )}
              </>
            ) : (
              <>
                <button
                  className="button secondary compact"
                  disabled={busy}
                  onClick={() => void action("notifications/read")}
                >
                  {t("تحديد الكل كمقروء", "Mark all as read")}
                </button>
                {data.notifications.length ? (
                  data.notifications.map((n) => (
                    <Link
                      className={`glass notification resource-card ${n.readAt ? "" : "unread"}`}
                      key={n.id}
                      href={n.link}
                    >
                      <Bell size={18} />
                      <div>
                        <h3>{bi(n.title)}</h3>
                        <p>{bi(n.body)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <Empty
                    text={t("لا توجد إشعارات بعد", "No notifications yet")}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {qr && (
          <div className="modal-backdrop" onClick={() => setQr(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("رمز الحضور الخاص", "Private attendance QR")}
              className="modal glass qr-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="icon-button modal-close"
                aria-label={t("إغلاق", "Close")}
                onClick={() => setQr(null)}
              >
                <X />
              </button>
              <h3>
                {t(
                  "اعرض الرمز لمنظّم الفعالية",
                  "Show this code to the organizer",
                )}
              </h3>
              <Image
                unoptimized
                width={800}
                height={450}
                src={`/api/qr/${qr}`}
                alt={t("رمز الحضور الخاص بك", "Your private attendance QR")}
              />
              <p className="small muted">
                {t(
                  "هذا الرمز خاص بك. لا تشاركه علنًا.",
                  "This code is private. Do not share it publicly.",
                )}
              </p>
            </div>
          </div>
        )}
      </Gate>
    </section>
  );
}
function ProfileForm({ initial }: { initial: Profile | null }) {
  const { t, me, refresh, toast, error } = useHub(),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form glass form-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = fields(e.currentTarget);
        setBusy(true);
        try {
          await api("profile", {
            ...f,
            skills: split(f.skills),
            software: split(f.software),
            experience: split(f.experience),
            awards: split(f.awards),
            publicEnabled: f.publicEnabled === "on",
            publicSkills: f.publicSkills === "on",
            publicProjects: f.publicProjects === "on",
            publicExperience: f.publicExperience === "on",
          });
          await refresh();
          toast(t("حُفظ ملفك", "Profile saved"));
        } catch (err) {
          error(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{t("ملفك الشخصي", "Your profile")}</h2>
      <Field
        label={t("الاسم الكامل", "Full name")}
        name="fullName"
        defaultValue={me?.fullName}
      />
      <div className="two-cols">
        {[
          ["universityId", "الرقم الجامعي", "University ID"],
          ["college", "الكلية", "College"],
          ["major", "التخصص", "Major"],
          ["level", "المستوى", "Study level"],
        ].map(([key, ar, en]) => (
          <Field
            key={key}
            name={key}
            label={t(ar, en)}
            required={false}
            defaultValue={String(initial?.[key as keyof Profile] || "")}
          />
        ))}
      </div>
      <Field
        name="bioAr"
        label="نبذة بالعربية"
        type="textarea"
        required={false}
        defaultValue={initial?.bioAr}
      />
      <Field
        name="bioEn"
        label="English bio"
        type="textarea"
        required={false}
        defaultValue={initial?.bioEn}
      />
      <div className="two-cols">
        {[
          ["skills", "المهارات", "Skills"],
          ["software", "البرامج", "Software"],
          ["experience", "الخبرات", "Experience"],
          ["awards", "الجوائز", "Awards"],
        ].map(([key, ar, en]) => (
          <Field
            key={key}
            name={key}
            label={t(ar, en)}
            hint={t("افصل العناصر بفاصلة ,", "Separate entries with commas")}
            required={false}
            defaultValue={(
              initial?.[key as keyof Profile] as string[] | undefined
            )?.join(", ")}
          />
        ))}
        <Field
          name="linkedin"
          label="LinkedIn (HTTPS)"
          required={false}
          type="url"
          defaultValue={initial?.linkedin}
        />
        <Field
          name="github"
          label="GitHub (HTTPS)"
          required={false}
          type="url"
          defaultValue={initial?.github}
        />
      </div>
      <hr />
      <h3>
        {t("ملفك العام — باختيارك", "Your public portfolio — your choice")}
      </h3>
      <p className="small muted">
        {t(
          "البريد والرقم الجامعي لا يُنشران. يتحكم كل خيار بالمعلومات المعروضة.",
          "Email and university ID are never published. Each option controls what visitors can see.",
        )}
      </p>
      <Field
        name="slug"
        label={t(
          "اسم رابط الملف (حروف إنجليزية وأرقام وشرطات)",
          "Portfolio URL name (English letters, numbers, hyphens)",
        )}
        defaultValue={initial?.slug || ""}
        required={false}
        hint="/u/your-name"
      />
      {[
        ["publicEnabled", "نشر الملف للعامة", "Publish my portfolio"],
        ["publicSkills", "عرض المهارات والبرامج", "Show skills and software"],
        ["publicProjects", "عرض المشاريع المعتمدة", "Show approved projects"],
        [
          "publicExperience",
          "عرض الخبرات والجوائز",
          "Show experience and awards",
        ],
      ].map(([key, ar, en]) => (
        <label className="check" key={key}>
          <input
            type="checkbox"
            name={key}
            defaultChecked={!!initial?.[key as keyof Profile]}
          />
          {t(ar, en)}
        </label>
      ))}
      {initial?.publicEnabled && initial.slug && (
        <Link href={`/u/${initial.slug}`} className="text-button">
          {t("عرض ملفي العام", "View my public portfolio")}
          <ArrowUpRight size={16} />
        </Link>
      )}
      <button className="button primary" disabled={busy}>
        {t(
          busy ? "جارٍ الحفظ…" : "حفظ الملف",
          busy ? "Saving…" : "Save profile",
        )}
      </button>
    </form>
  );
}
