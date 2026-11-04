"use client";
import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  FolderKanban,
  Trophy,
  Mail,
  ListChecks,
  Settings2,
  ShieldCheck,
  ScrollText,
  Plus,
  ArrowUpRight,
  X,
  Download,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { useHub, api } from "./provider";
import { Field, Bilingual, fields, bifields, FileUpload, Gate } from "./forms";
type Row = Record<string, unknown> & { id?: string };
const asString = (v: unknown) => (typeof v === "string" ? v : "");
const array = (v: unknown) => (Array.isArray(v) ? v : []) as Row[];
const moduleList = [
  ["overview", "ملخص المنصة", "Overview", LayoutDashboard],
  ["members", "طلبات العضوية", "Membership", Users],
  ["events", "الفعاليات والحضور", "Events & attendance", CalendarDays],
  ["courses", "المقررات", "Courses", BookOpen],
  ["resources", "المكتبة", "Library", BookOpen],
  ["projects", "المشاريع", "Projects", FolderKanban],
  ["competitions", "المسابقات", "Competitions", Trophy],
  ["posts", "الأخبار والفرص", "News & careers", ScrollText],
  ["tasks", "مهام اللجان", "Committee tasks", ListChecks],
  ["committees", "اللجان", "Committees", Users],
  ["inbox", "صندوق الوارد", "Inbox", Mail],
  ["users", "المستخدمون والصلاحيات", "Users & roles", ShieldCheck],
  ["settings", "إعدادات النادي", "Club settings", Settings2],
  ["audit", "سجل العمليات", "Audit log", ScrollText],
] as const;
function visibleModules(role: string) {
  if (["SUPER_ADMIN", "CLUB_PRESIDENT"].includes(role)) return moduleList;
  if (role === "EVENTS_MANAGER")
    return moduleList.filter((x) =>
      ["overview", "events", "competitions"].includes(x[0]),
    );
  if (role === "CONTENT_MANAGER")
    return moduleList.filter((x) =>
      ["overview", "courses", "resources", "posts", "projects"].includes(x[0]),
    );
  if (role === "COMMITTEE_LEADER")
    return moduleList.filter((x) =>
      ["overview", "tasks", "committees"].includes(x[0]),
    );
  return [];
}
export function Admin() {
  const { t, bi, me, error, toast, refresh } = useHub(),
    [module, setModule] = useState("overview"),
    [page, setPage] = useState(0),
    [rows, setRows] = useState<Row[]>([]),
    [overview, setOverview] = useState<Record<string, number>>({}),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState<Row | null>(null),
    [attendance, setAttendance] = useState<string | null>(null),
    [selected, setSelected] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const modules = visibleModules(me?.role || "");
  async function load() {
    setLoading(true);
    try {
      const data = await api<Row[] | Record<string, number>>(
        `admin/${module}?page=${page}`,
      );
      if (module === "overview") setOverview(data as Record<string, number>);
      else setRows(data as Row[]);
    } catch (e) {
      error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (me && visibleModules(me.role).length)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the module fetch and its loading state together.
      void load(); /* load is tied to the selected module */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, me?.id, page]);
  async function action(route: string, data: unknown) {
    setBusy(true);
    try {
      await api(route, data);
      await load();
      await refresh();
      toast(t("تم حفظ التغيير", "Change saved"));
      return true;
    } catch (e) {
      error(e);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (me && !modules.length)
    return (
      <section className="wrap section">
        <div className="notice">
          {t(
            "هذه المساحة مخصصة لإدارة النادي.",
            "This space is for authorized club administrators.",
          )}
        </div>
      </section>
    );
  const titles = moduleList.find((x) => x[0] === module)!;
  return (
    <section className="admin-wrap">
      <Gate>
        <div className="admin-layout">
          <aside className="admin-sidebar glass">
            <div className="admin-brand">
              <Settings2 size={22} />
              <strong>{t("غرفة القيادة", "Control room")}</strong>
              <small>ASME NU</small>
            </div>
            <nav aria-label={t("لوحة الإدارة", "Admin navigation")}>
              {modules.map(([id, ar, en, Icon]) => (
                <button
                  key={id}
                  className={module === id ? "active" : ""}
                  onClick={() => {
                    setModule(id);
                    setPage(0);
                    setAttendance(null);
                    setSelected(null);
                  }}
                >
                  <Icon size={17} />
                  {t(ar, en)}
                </button>
              ))}
            </nav>
          </aside>
          <div className="admin-main">
            <div className="admin-title">
              <div>
                <span className="eyebrow">ASME NU / CONTROL ROOM</span>
                <h1>{t(titles[1], titles[2])}</h1>
              </div>
              {[
                "events",
                "courses",
                "resources",
                "posts",
                "competitions",
                "tasks",
              ].includes(module) && (
                <button
                  className="button primary compact"
                  onClick={() => setEditing({})}
                >
                  <Plus size={17} />
                  {t("إضافة", "Create")}
                </button>
              )}
              {module === "committees" &&
                ["SUPER_ADMIN", "CLUB_PRESIDENT"].includes(me?.role || "") && (
                  <button
                    className="button primary compact"
                    onClick={() => setEditing({})}
                  >
                    <Plus size={17} />
                    {t("إضافة لجنة", "Create committee")}
                  </button>
                )}
            </div>
            {loading ? (
              <div className="skeleton" />
            ) : module === "overview" ? (
              <>
                <div className="stat-grid">
                  {Object.entries(overview).map(([key, n]) => (
                    <div className="glass stat" key={key}>
                      <strong>{n}</strong>
                      <span>
                        {
                          (
                            {
                              events: t("فعاليات", "Events"),
                              members: t("أعضاء معتمدون", "Approved members"),
                              pending: t("طلبات معلقة", "Pending applications"),
                              projects: t(
                                "مشاريع للمراجعة",
                                "Projects for review",
                              ),
                              registrations: t(
                                "تسجيلات مؤكدة",
                                "Confirmed registrations",
                              ),
                              attendance: t("حضور مسجل", "Recorded attendance"),
                            } as Record<string, string>
                          )[key]
                        }
                      </span>
                    </div>
                  ))}
                </div>
                <div className="glass chart-card">
                  <h3>
                    {t("النشاط الفعلي للمنصة", "Actual platform activity")}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={[
                        {
                          name: t("التسجيلات", "Registrations"),
                          value: overview.registrations || 0,
                        },
                        {
                          name: t("الحضور", "Attendance"),
                          value: overview.attendance || 0,
                        },
                        {
                          name: t("الأعضاء", "Members"),
                          value: overview.members || 0,
                        },
                      ]}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--muted)", fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--muted)", fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#2879BA"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : module === "settings" ? (
              <Settings rows={rows} onSave={action} />
            ) : (
              <>
                <div className="glass table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("السجل", "Record")}</th>
                        <th>{t("الحالة / التفاصيل", "Status / details")}</th>
                        <th>{t("الإجراءات", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.id || i}>
                          <td>
                            <strong>
                              {row.title
                                ? bi(row.title)
                                : module === "members"
                                  ? asString((row.user as Row)?.fullName)
                                  : asString(
                                      row.fullName ||
                                        row.name ||
                                        row.action ||
                                        row.subject ||
                                        row.key,
                                    )}
                            </strong>
                            {module === "members" && (
                              <small>
                                {asString((row.user as Row)?.email)}
                              </small>
                            )}
                            {module === "users" && (
                              <small>{asString(row.email)}</small>
                            )}
                            {module === "inbox" && (
                              <small>
                                {asString(row.subject)} · {asString(row.email)}
                              </small>
                            )}
                            {module === "audit" && (
                              <small>
                                {asString(row.entityType)} ·{" "}
                                {asString(row.entityId)}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className="status">
                              {asString(
                                row.status ||
                                  row.publication ||
                                  row.role ||
                                  row.kind,
                              ) ||
                                ("published" in row
                                  ? t(
                                      row.published ? "منشور" : "مسودة",
                                      row.published ? "Published" : "Draft",
                                    )
                                  : row.resolvedAt
                                    ? t("تم الرد", "Resolved")
                                    : module === "inbox"
                                      ? t("جديد", "New")
                                      : "")}
                            </span>
                            {row.createdAt !== undefined && (
                              <small>
                                {new Date(
                                  asString(row.createdAt),
                                ).toLocaleDateString()}
                              </small>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              {[
                                "events",
                                "courses",
                                "resources",
                                "posts",
                                "competitions",
                                "tasks",
                                "committees",
                              ].includes(module) &&
                                !(
                                  module === "committees" &&
                                  me?.role === "COMMITTEE_LEADER"
                                ) && (
                                  <button
                                    className="text-button"
                                    onClick={() => setEditing(row)}
                                  >
                                    {t("تعديل", "Edit")}
                                  </button>
                                )}
                              {module === "events" && (
                                <button
                                  className="text-button accent"
                                  onClick={() => setAttendance(row.id!)}
                                >
                                  {t(
                                    "الحضور والتقارير",
                                    "Attendance & reports",
                                  )}
                                </button>
                              )}
                              {[
                                "members",
                                "projects",
                                "competitions",
                                "inbox",
                                "tasks",
                                "users",
                                "audit",
                              ].includes(module) && (
                                <button
                                  className="text-button"
                                  onClick={() => setSelected(row)}
                                >
                                  {t("فتح", "Open")}
                                  <ArrowUpRight size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && (
                    <p className="empty-table">
                      {t("لا توجد سجلات بعد", "No records yet")}
                    </p>
                  )}
                </div>
                {!["committees", "courses"].includes(module) && (
                  <div className="pagination">
                    <button
                      className="button secondary compact"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t("السابق", "Previous")}
                    </button>
                    <span>
                      {t("صفحة", "Page")} {page + 1}
                    </span>
                    <button
                      className="button secondary compact"
                      disabled={rows.length < 50}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("التالي", "Next")}
                    </button>
                  </div>
                )}
                <p className="small muted">
                  {t(
                    "تُسجّل التغييرات الإدارية في سجل العمليات.",
                    "Administrative changes are recorded in the audit log.",
                  )}
                </p>
              </>
            )}
            {attendance && (
              <Attendance
                eventId={attendance}
                onClose={() => setAttendance(null)}
              />
            )}
          </div>
        </div>
        {editing && (
          <Editor
            module={module}
            row={editing}
            onClose={() => setEditing(null)}
            onSave={async (value) => {
              if (
                await action(
                  `admin/${module}${editing.id ? "/" + editing.id : ""}`,
                  value,
                )
              )
                setEditing(null);
            }}
          />
        )}
        {selected && (
          <div className="modal-backdrop">
            <div className="modal glass wide">
              <button
                className="modal-close icon-button"
                onClick={() => setSelected(null)}
                aria-label={t("إغلاق", "Close")}
              >
                <X />
              </button>
              <h2>{t(titles[1], titles[2])}</h2>
              {module === "members" ? (
                <>
                  <p>{asString((selected.user as Row)?.fullName)}</p>
                  <dl className="data-list">
                    {Object.entries((selected.payload || {}) as Row).map(
                      ([k, val]) => (
                        <div key={k}>
                          <dt>
                            {(
                              {
                                universityId: t(
                                  "الرقم الجامعي",
                                  "University ID",
                                ),
                                college: t("الكلية", "College"),
                                major: t("التخصص", "Major"),
                                level: t("المستوى", "Level"),
                                skills: t("المهارات", "Skills"),
                                motivation: t("الدافع", "Motivation"),
                                consent: t("الموافقة", "Consent"),
                              } as Record<string, string>
                            )[k] || k}
                          </dt>
                          <dd>
                            {Array.isArray(val) ? val.join(", ") : String(val)}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                  <form
                    className="form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = fields(e.currentTarget);
                      if (await action(`admin/members/${selected.id}`, f))
                        setSelected(null);
                    }}
                  >
                    <label className="field">
                      <span>{t("القرار", "Decision")}</span>
                      <select name="status">
                        <option value="APPROVED">
                          {t("اعتماد العضوية", "Approve membership")}
                        </option>
                        <option value="NEEDS_INFO">
                          {t("طلب معلومات", "Request information")}
                        </option>
                        <option value="REJECTED">{t("رفض", "Decline")}</option>
                      </select>
                    </label>
                    <Field
                      name="reviewNote"
                      label={t(
                        "رسالة المراجعة للطالب",
                        "Review message for the student",
                      )}
                      type="textarea"
                      minLength={3}
                    />
                    <button className="button primary" disabled={busy}>
                      {t(
                        "اعتماد القرار وإشعار الطالب",
                        "Save decision & notify student",
                      )}
                    </button>
                  </form>
                </>
              ) : module === "projects" ? (
                <>
                  <h3>{bi(selected.title)}</h3>
                  <p className="prose">{bi(selected.body)}</p>
                  <form
                    className="form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = fields(e.currentTarget);
                      if (
                        await action(`admin/projects/${selected.id}`, {
                          publication: f.publication,
                          featured: f.featured === "on",
                          isSample: f.isSample === "on",
                        })
                      )
                        setSelected(null);
                    }}
                  >
                    <select
                      name="publication"
                      defaultValue={asString(selected.publication)}
                    >
                      <option value="PUBLISHED">{t("نشر", "Publish")}</option>
                      <option value="REJECTED">{t("رفض", "Reject")}</option>
                      <option value="DRAFT">{t("مسودة", "Draft")}</option>
                    </select>
                    <label className="check">
                      <input
                        type="checkbox"
                        name="featured"
                        defaultChecked={!!selected.featured}
                      />
                      {t("مميز", "Featured")}
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        name="isSample"
                        defaultChecked={!!selected.isSample}
                      />
                      {t("نموذج توضيحي", "Sample")}
                    </label>
                    <button className="button primary" disabled={busy}>
                      {t("حفظ", "Save")}
                    </button>
                  </form>
                </>
              ) : module === "inbox" ? (
                <>
                  <p>
                    {asString(selected.name)} · {asString(selected.email)}
                  </p>
                  <h3>{asString(selected.subject)}</h3>
                  <p className="prose">{asString(selected.message)}</p>
                  <a
                    className="button secondary"
                    href={`mailto:${encodeURIComponent(asString(selected.email))}`}
                  >
                    {t("الرد بالبريد", "Reply by email")}
                  </a>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await action(`admin/inbox/${selected.id}`, {
                          resolved: !selected.resolvedAt,
                        })
                      )
                        setSelected(null);
                    }}
                  >
                    {t(
                      selected.resolvedAt ? "إعادة فتح" : "تحديد كتمت معالجته",
                      selected.resolvedAt ? "Reopen" : "Mark resolved",
                    )}
                  </button>
                </>
              ) : module === "users" ? (
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = fields(e.currentTarget);
                    if (
                      await action(`admin/users/${selected.id}`, {
                        role: f.role,
                        disabled: f.disabled === "on",
                      })
                    )
                      setSelected(null);
                  }}
                >
                  <h3>{asString(selected.fullName)}</h3>
                  <p>{asString(selected.email)}</p>
                  <label className="field">
                    <span>{t("الدور", "Role")}</span>
                    <select name="role" defaultValue={asString(selected.role)}>
                      {[
                        "SUPER_ADMIN",
                        "CLUB_PRESIDENT",
                        "COMMITTEE_LEADER",
                        "EVENTS_MANAGER",
                        "CONTENT_MANAGER",
                        "CLUB_MEMBER",
                        "STUDENT",
                      ].map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="disabled"
                      defaultChecked={!!selected.disabledAt}
                    />
                    {t(
                      "إيقاف الحساب وإلغاء جلساته",
                      "Disable account and revoke sessions",
                    )}
                  </label>
                  <button
                    className="button primary"
                    disabled={busy || me?.role !== "SUPER_ADMIN"}
                  >
                    {t("حفظ الصلاحيات", "Save permissions")}
                  </button>
                  {me?.role !== "SUPER_ADMIN" && (
                    <p>
                      {t(
                        "تغيير الأدوار متاح للمشرف الأعلى فقط.",
                        "Only the super administrator can change roles.",
                      )}
                    </p>
                  )}
                </form>
              ) : module === "tasks" ? (
                <TaskDetails task={selected} onSave={action} />
              ) : module === "competitions" ? (
                <Judging competition={selected} onSave={action} />
              ) : (
                <pre className="audit-detail">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </Gate>
    </section>
  );
}
function Settings({
  rows,
  onSave,
}: {
  rows: Row[];
  onSave: (route: string, value: unknown) => Promise<boolean>;
}) {
  const { t } = useHub(),
    membership = rows.find((r) => r.key === "membership")?.value as Row,
    club = rows.find((r) => r.key === "club")?.value as Row,
    leadership = (rows.find((r) => r.key === "leadership")?.value ||
      []) as Row[],
    [leaders, setLeaders] = useState(leadership);
  return (
    <div className="settings-stack">
      <form
        className="form glass form-card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = fields(e.currentTarget);
          void onSave("admin/settings", {
            key: "membership",
            value: { open: f.open === "on", notice: bifields(f, "notice") },
          });
        }}
      >
        <h2>{t("التحكم في التسجيل", "Membership registration")}</h2>
        <label className="check">
          <input
            name="open"
            type="checkbox"
            defaultChecked={!!membership?.open}
          />
          {t(
            "فتح طلبات العضوية وإظهار زر الانضمام",
            "Open applications and show the join button",
          )}
        </label>
        <Bilingual
          name="notice"
          label={t("رسالة التسجيل", "Registration message")}
          defaultValue={membership?.notice}
        />
        <button className="button primary">
          {t("حفظ حالة التسجيل", "Save registration status")}
        </button>
      </form>
      <form
        className="form glass form-card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = fields(e.currentTarget);
          void onSave("admin/settings", {
            key: "club",
            value: {
              about: bifields(f, "about"),
              vision: bifields(f, "vision"),
              mission: bifields(f, "mission"),
              email: f.email,
              linkedin: f.linkedin,
            },
          });
        }}
      >
        <h2>{t("محتوى النادي", "Club content")}</h2>
        {["about", "vision", "mission"].map((key) => (
          <Bilingual
            key={key}
            name={key}
            label={
              key === "about"
                ? t("عن النادي", "About")
                : key === "vision"
                  ? t("الرؤية", "Vision")
                  : t("الرسالة", "Mission")
            }
            large
            defaultValue={club?.[key]}
          />
        ))}
        <Field
          name="email"
          type="email"
          label={t("بريد التواصل", "Contact email")}
          defaultValue={asString(club?.email)}
        />
        <Field
          name="linkedin"
          type="url"
          label="LinkedIn (HTTPS)"
          required={false}
          defaultValue={asString(club?.linkedin)}
        />
        <button className="button primary">
          {t("حفظ المحتوى", "Save content")}
        </button>
      </form>
      <form
        className="form glass form-card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = fields(e.currentTarget);
          void onSave("admin/settings", {
            key: "leadership",
            value: leaders.map((_, i) => ({
              name: bifields(f, `name${i}`),
              position: bifields(f, `position${i}`),
              bio: bifields(f, `bio${i}`),
              image: f[`image${i}`],
            })),
          });
        }}
      >
        <h2>{t("قيادة النادي", "Club leadership")}</h2>
        <p className="small muted">
          {t(
            "أضف أسماء حقيقية بعد اعتمادها وموافقة أصحابها.",
            "Add real names after approval and consent.",
          )}
        </p>
        {leaders.map((p, i) => (
          <fieldset className="leadership-editor" key={i}>
            <Bilingual
              name={`name${i}`}
              label={t("الاسم", "Name")}
              defaultValue={p.name}
            />
            <Bilingual
              name={`position${i}`}
              label={t("المنصب", "Position")}
              defaultValue={p.position}
            />
            <Bilingual
              name={`bio${i}`}
              label={t("نبذة", "Bio")}
              defaultValue={p.bio}
            />
            <Field
              name={`image${i}`}
              type="url"
              label={t("رابط الصورة", "Image URL")}
              required={false}
              defaultValue={asString(p.image)}
            />
            <button
              type="button"
              className="text-button danger"
              onClick={() => setLeaders((v) => v.filter((_, j) => j !== i))}
            >
              {t("إزالة", "Remove")}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => setLeaders((v) => [...v, {}])}
        >
          <Plus size={16} />
          {t("إضافة شخص", "Add person")}
        </button>
        <button className="button primary">
          {t("حفظ القيادة", "Save leadership")}
        </button>
      </form>
    </div>
  );
}
function Editor({
  module,
  row,
  onClose,
  onSave,
}: {
  module: string;
  row: Row;
  onClose: () => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const { t, content, bi, error } = useHub(),
    [busy, setBusy] = useState(false),
    [assetId, setAssetId] = useState(asString(row.assetId)),
    [criteria, setCriteria] = useState<Row[]>(
      array(row.criteria).length
        ? array(row.criteria)
        : [
            {
              id: "innovation",
              label: { ar: "الابتكار", en: "Innovation" },
              max: 100,
            },
          ],
    ),
    [users, setUsers] = useState<Row[]>([]),
    [committees, setCommittees] = useState<Row[]>([]);
  useEffect(() => {
    if (["tasks", "committees"].includes(module)) {
      void api<Row[]>("admin/committees")
        .then(setCommittees)
        .catch(() => {});
      void api<Row[]>("admin/users")
        .then(setUsers)
        .catch(() => {});
    }
  }, [module]);
  const date = (v: unknown) => {
    if (!v) return "";
    const value = new Date(asString(v));
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  function check(name: string, ar: string, en: string, defaultValue?: boolean) {
    return (
      <label className="check">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultValue ?? !!row[name]}
        />
        {t(ar, en)}
      </label>
    );
  }
  return (
    <div className="modal-backdrop">
      <div className="modal glass wide">
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label={t("إغلاق", "Close")}
        >
          <X />
        </button>
        <h2>
          {t(
            row.id ? "تعديل السجل" : "إضافة سجل",
            row.id ? "Edit entry" : "Create entry",
          )}
        </h2>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = fields(e.currentTarget);
            let data: Row = {};
            const base = {
              title: bifields(f, "title"),
              description: bifields(f, "description"),
            };
            if (module === "events")
              data = {
                ...base,
                slug: f.slug,
                body: bifields(f, "body"),
                location: bifields(f, "location"),
                category: f.category,
                startsAt: new Date(f.startsAt).toISOString(),
                endsAt: new Date(f.endsAt).toISOString(),
                deadline: new Date(f.deadline).toISOString(),
                capacity: Number(f.capacity),
                waitlistEnabled: f.waitlistEnabled === "on",
                published: f.published === "on",
                featured: f.featured === "on",
                isSample: f.isSample === "on",
                coverUrl: f.coverUrl,
              };
            else if (module === "courses") data = { ...base, slug: f.slug };
            else if (module === "resources")
              data = {
                ...base,
                courseId: f.courseId,
                type: f.type,
                externalUrl: f.externalUrl,
                assetId: assetId || undefined,
                author: f.author,
                license: f.license,
                rightsConfirmed: f.rightsConfirmed === "on",
                published: f.published === "on",
                featured: f.featured === "on",
              };
            else if (module === "posts")
              data = {
                ...base,
                body: bifields(f, "body"),
                kind: f.kind,
                coverUrl: f.coverUrl,
                externalUrl: f.externalUrl,
                published: f.published === "on",
                featured: f.featured === "on",
                isSample: f.isSample === "on",
              };
            else if (module === "competitions")
              data = {
                ...base,
                rules: bifields(f, "rules"),
                deadline: new Date(f.deadline).toISOString(),
                criteria: criteria.map((_, i) => ({
                  id: f[`criterionId${i}`],
                  label: bifields(f, `criterion${i}`),
                  max: Number(f[`max${i}`]),
                })),
                published: f.published === "on",
                isSample: f.isSample === "on",
              };
            else if (module === "tasks")
              data = {
                ...base,
                committeeId: f.committeeId,
                assigneeId: f.assigneeId || null,
                dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null,
                status: f.status,
              };
            else if (module === "committees")
              data = {
                ...base,
                leaderId: f.leaderId || null,
                published: f.published === "on",
              };
            setBusy(true);
            try {
              await onSave(data);
            } catch (err) {
              error(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Bilingual
            name="title"
            label={t("العنوان", "Title")}
            defaultValue={row.title}
          />
          <Bilingual
            name="description"
            label={t("الوصف", "Description")}
            defaultValue={row.description}
            large
          />
          {["events", "posts"].includes(module) && (
            <Bilingual
              name="body"
              label={t("المحتوى", "Body")}
              defaultValue={row.body}
              large
            />
          )}
          {["events", "courses"].includes(module) && (
            <Field
              name="slug"
              label={t("الرابط المختصر (إنجليزي)", "URL slug (English)")}
              defaultValue={asString(row.slug)}
              hint="workshop-name"
            />
          )}
          {module === "events" && (
            <>
              <Bilingual
                name="location"
                label={t("الموقع", "Location")}
                defaultValue={row.location}
              />
              <div className="two-cols">
                {[
                  ["startsAt", "بداية الفعالية", "Starts at"],
                  ["endsAt", "نهاية الفعالية", "Ends at"],
                  ["deadline", "نهاية التسجيل", "Registration deadline"],
                ].map(([key, ar, en]) => (
                  <Field
                    key={key}
                    name={key}
                    label={
                      t(ar, en) +
                      " · " +
                      t("التوقيت المحلي لجهازك", "your device time")
                    }
                    type="datetime-local"
                    defaultValue={date(row[key])}
                  />
                ))}
                <Field
                  name="capacity"
                  label={t("السعة", "Capacity")}
                  type="number"
                  defaultValue={String(row.capacity || 30)}
                />
              </div>
              <select
                name="category"
                defaultValue={asString(row.category) || "workshop"}
                aria-label={t("الفئة", "Category")}
              >
                {[
                  ["workshop", "ورشة", "Workshop"],
                  ["activity", "نشاط", "Activity"],
                  ["competition", "مسابقة", "Competition"],
                  ["visit", "زيارة", "Visit"],
                  ["talk", "لقاء", "Talk"],
                ].map(([v, ar, en]) => (
                  <option key={v} value={v}>
                    {t(ar, en)}
                  </option>
                ))}
              </select>
              {check(
                "waitlistEnabled",
                "تفعيل قائمة الانتظار",
                "Enable waiting list",
                row.id ? !!row.waitlistEnabled : true,
              )}
            </>
          )}
          {module === "resources" && (
            <>
              <label className="field">
                <span>{t("المقرر", "Course")}</span>
                <select
                  name="courseId"
                  required
                  defaultValue={asString(row.courseId)}
                >
                  <option value="">
                    {t("اختر مقررًا", "Select a course")}
                  </option>
                  {content.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {bi(c.title)}
                    </option>
                  ))}
                </select>
              </label>
              <select
                name="type"
                defaultValue={asString(row.type) || "LINK"}
                aria-label={t("نوع المرجع", "Resource type")}
              >
                <option value="LINK">{t("رابط", "Link")}</option>
                <option value="FILE">PDF</option>
              </select>
              <Field
                name="externalUrl"
                type="url"
                label={t("رابط خارجي (لنوع رابط)", "External URL (for links)")}
                required={false}
                defaultValue={asString(row.externalUrl)}
              />
              <FileUpload isPublic onUploaded={(a) => setAssetId(a.id)} />
              {assetId && (
                <span className="accent">
                  {t("ملف مرفق", "File attached")} · {assetId}
                </span>
              )}
              <Field
                name="author"
                label={t("المؤلف / المصدر", "Author / source")}
                defaultValue={asString(row.author)}
              />
              <Field
                name="license"
                label={t("الترخيص وحقوق الاستخدام", "License and usage rights")}
                defaultValue={asString(row.license)}
                minLength={3}
              />
              {check(
                "rightsConfirmed",
                "أؤكد امتلاك حق نشر المرجع",
                "I confirm publication rights",
              )}
            </>
          )}
          {module === "posts" && (
            <>
              <label className="field">
                <span>{t("نوع المحتوى", "Content type")}</span>
                <select name="kind" defaultValue={asString(row.kind) || "NEWS"}>
                  {[
                    ["NEWS", "خبر", "News"],
                    ["ANNOUNCEMENT", "إعلان", "Announcement"],
                    ["CAREER", "فرصة مهنية", "Career"],
                    ["REPORT", "تقرير", "Report"],
                  ].map(([v, ar, en]) => (
                    <option key={v} value={v}>
                      {t(ar, en)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="externalUrl"
                type="url"
                label={t("رابط المصدر", "Source URL")}
                required={false}
                defaultValue={asString(row.externalUrl)}
              />
            </>
          )}
          {["events", "posts"].includes(module) && (
            <Field
              name="coverUrl"
              label={t(
                "رابط صورة HTTPS أو ارفع صورة أدناه",
                "HTTPS cover URL or upload below",
              )}
              required={false}
              defaultValue={asString(row.coverUrl)}
            />
          )}{" "}
          {["events", "posts"].includes(module) && (
            <FileUpload
              isPublic
              onUploaded={(a) => {
                const input = document.querySelector<HTMLInputElement>(
                  '.modal input[name="coverUrl"]',
                );
                if (input) input.value = `/api/files/${a.id}`;
              }}
            />
          )}
          {module === "competitions" && (
            <>
              <Bilingual
                name="rules"
                label={t("القواعد", "Rules")}
                large
                defaultValue={row.rules}
              />
              <Field
                name="deadline"
                type="datetime-local"
                label={t(
                  "آخر موعد (التوقيت المحلي لجهازك)",
                  "Deadline (your device time)",
                )}
                defaultValue={date(row.deadline)}
              />
              <h3>{t("معايير التقييم", "Evaluation criteria")}</h3>
              {criteria.map((c, i) => (
                <fieldset key={i} className="criterion-editor">
                  <div className="two-cols">
                    <Field
                      name={`criterionId${i}`}
                      label={t("رمز إنجليزي فريد", "Unique English key")}
                      defaultValue={asString(c.id)}
                    />
                    <Field
                      name={`max${i}`}
                      type="number"
                      label={t("الدرجة القصوى", "Maximum score")}
                      defaultValue={String(c.max || 100)}
                    />
                  </div>
                  <Bilingual
                    name={`criterion${i}`}
                    label={t("اسم المعيار", "Criterion label")}
                    defaultValue={c.label}
                  />
                  <button
                    className="text-button danger"
                    type="button"
                    onClick={() =>
                      setCriteria((v) => v.filter((_, j) => j !== i))
                    }
                  >
                    {t("إزالة", "Remove")}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="button secondary compact"
                onClick={() => setCriteria((v) => [...v, {}])}
              >
                <Plus size={16} />
                {t("معيار", "Criterion")}
              </button>
            </>
          )}
          {module === "tasks" && (
            <>
              <label className="field">
                <span>{t("اللجنة", "Committee")}</span>
                <select
                  name="committeeId"
                  defaultValue={asString(row.committeeId)}
                  required
                >
                  <option value="">
                    {t("اختر اللجنة", "Select committee")}
                  </option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {bi(c.title)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="assigneeId"
                label={t(
                  "معرّف العضو المسؤول (من قائمة أعضاء اللجنة)",
                  "Assignee user ID (from committee members)",
                )}
                defaultValue={asString(row.assigneeId)}
                required={false}
              />
              <details>
                <summary>{t("أعضاء اللجان", "Committee members")}</summary>
                {committees.map((c) => (
                  <div key={c.id}>
                    <h4>{bi(c.title)}</h4>
                    {array(c.members).map((m) => (
                      <p key={m.id}>
                        {asString((m.user as Row)?.fullName)} ·{" "}
                        <code>{asString(m.userId)}</code>
                      </p>
                    ))}
                  </div>
                ))}
              </details>
              <Field
                name="dueAt"
                type="datetime-local"
                label={t("الموعد النهائي", "Due at")}
                defaultValue={date(row.dueAt)}
                required={false}
              />
              <select
                name="status"
                defaultValue={asString(row.status) || "TODO"}
                aria-label={t("الحالة", "Status")}
              >
                <option value="TODO">{t("جديدة", "To do")}</option>
                <option value="IN_PROGRESS">
                  {t("قيد التنفيذ", "In progress")}
                </option>
                <option value="DONE">{t("مكتملة", "Done")}</option>
              </select>
            </>
          )}
          {module === "committees" && (
            <label className="field">
              <span>{t("قائد اللجنة", "Committee leader")}</span>
              <select name="leaderId" defaultValue={asString(row.leaderId)}>
                <option value="">{t("لم يحدد", "Unassigned")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {asString(u.fullName)} · {asString(u.role)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {[
            "events",
            "resources",
            "posts",
            "competitions",
            "committees",
          ].includes(module) &&
            check("published", "نشر للعامة", "Publish publicly")}
          {["events", "resources", "posts"].includes(module) &&
            check("featured", "محتوى مميز", "Featured")}
          {["events", "posts", "competitions"].includes(module) &&
            check("isSample", "وسم كنموذج توضيحي", "Mark as sample")}
          <div className="row-actions">
            <button className="button primary" disabled={busy}>
              {t(busy ? "جارٍ الحفظ…" : "حفظ", busy ? "Saving…" : "Save")}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              {t("إلغاء", "Cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Attendance({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const { t, error, toast } = useHub(),
    [rows, setRows] = useState<Row[]>([]),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false);
  async function load() {
    setRows(await api<Row[]>(`admin/attendance/${eventId}`));
  }
  useEffect(() => {
    void api<Row[]>(`admin/attendance/${eventId}`).then(setRows).catch(error);
  }, [eventId, error]);
  async function checkin(value: string) {
    setBusy(true);
    try {
      await api(`admin/events/${eventId}/checkin`, { qrToken: value });
      setToken("");
      toast(t("سُجّل الحضور", "Attendance recorded"));
      await load();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal glass wide">
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label={t("إغلاق", "Close")}
        >
          <X />
        </button>
        <h2>{t("إدارة الحضور", "Attendance desk")}</h2>
        <div className="row-actions">
          <a
            href={`/api/admin/report?eventId=${eventId}`}
            className="button secondary compact"
          >
            <Download size={16} />
            {t("تصدير CSV", "Export CSV")}
          </a>
          <button
            className="button secondary compact"
            onClick={() => setCamera((v) => !v)}
          >
            <Camera size={16} />
            {t("مسح QR بالكاميرا", "Scan QR with camera")}
          </button>
        </div>
        {camera && (
          <Scanner
            onResult={(value) => {
              setCamera(false);
              void checkin(value);
            }}
          />
        )}
        <form
          className="form inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void checkin(token);
          }}
        >
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder={t("ألصق رمز الحضور", "Paste attendance token")}
            aria-label={t("رمز الحضور", "Attendance token")}
          />
          <button className="button primary" disabled={busy}>
            {t("تسجيل الحضور", "Check in")}
          </button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("الطالب", "Student")}</th>
                <th>{t("التسجيل", "Registration")}</th>
                <th>{t("الحضور", "Attendance")}</th>
                <th>{t("الشهادة", "Certificate")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{asString((r.user as Row)?.fullName)}</td>
                  <td>{asString(r.status)}</td>
                  <td>
                    {r.attendance ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      t("لم يحضر", "Not checked in")
                    )}
                  </td>
                  <td>
                    {r.certificate ? (
                      <button
                        className="text-button danger"
                        disabled={busy || !!(r.certificate as Row).revokedAt}
                        onClick={async () => {
                          try {
                            await api(`admin/events/${eventId}/revoke`, {
                              certificateId: (r.certificate as Row).id,
                            });
                            await load();
                          } catch (e) {
                            error(e);
                          }
                        }}
                      >
                        {t(
                          (r.certificate as Row).revokedAt
                            ? "أُلغي الاعتماد"
                            : "إلغاء اعتماد الشهادة",
                          (r.certificate as Row).revokedAt
                            ? "Revoked"
                            : "Revoke certificate",
                        )}
                      </button>
                    ) : (
                      <button
                        className="text-button accent"
                        disabled={!r.attendance || busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api(`admin/events/${eventId}/certificate`, {
                              registrationId: r.id,
                            });
                            await load();
                            toast(t("اعتُمدت الشهادة", "Certificate approved"));
                          } catch (e) {
                            error(e);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {t("اعتماد شهادة PDF", "Approve PDF certificate")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
type Detector = {
  detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
function Scanner({ onResult }: { onResult: (value: string) => void }) {
  const { t } = useHub(),
    video = useRef<HTMLVideoElement>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    let stream: MediaStream | undefined,
      timer: ReturnType<typeof setInterval> | undefined,
      cancelled = false;
    const DetectorClass = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;
    if (!DetectorClass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an unavailable external camera API.
      setMessage(
        t(
          "هذا المتصفح لا يدعم المسح المباشر. استخدم قارئ QR والصق الرمز.",
          "This browser does not support direct scanning. Use a QR reader and paste the token.",
        ),
      );
      return;
    }
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        const detector = new DetectorClass({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (video.current && video.current.readyState >= 2) {
            const codes = await detector.detect(video.current).catch(() => []);
            if (codes[0]) {
              clearInterval(timer);
              onResult(codes[0].rawValue);
            }
          }
        }, 500);
      })
      .catch(() =>
        setMessage(
          t(
            "تعذر فتح الكاميرا. تحقق من الإذن أو الصق الرمز يدويًا.",
            "Could not open the camera. Check permission or paste the token.",
          ),
        ),
      );
    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scanner">
      <video ref={video} playsInline muted />
      {message && <p role="status">{message}</p>}
    </div>
  );
}
function TaskDetails({
  task,
  onSave,
}: {
  task: Row;
  onSave: (route: string, value: unknown) => Promise<boolean>;
}) {
  const { t, bi } = useHub(),
    [notes, setNotes] = useState(array(task.notes));
  return (
    <>
      <h3>{bi(task.title)}</h3>
      <p>{bi(task.description)}</p>
      {notes.map((n, i) => (
        <div className="list-row" key={n.id || i}>
          <p>{asString(n.body)}</p>
          <small>{asString((n.author as Row)?.fullName)}</small>
        </div>
      ))}
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = fields(form);
          if (await onSave(`admin/tasks/${task.id}/note`, { body: f.body })) {
            setNotes((v) => [...v, { body: f.body }]);
            form.reset();
          }
        }}
      >
        <Field
          name="body"
          type="textarea"
          label={t("ملاحظة للفريق", "Team note")}
        />
        <button className="button primary">
          {t("إضافة ملاحظة", "Add note")}
        </button>
      </form>
      <h4>{t("المرفقات", "Attachments")}</h4>
      {array(task.attachments).map((a) => (
        <a
          className="text-button"
          key={a.id}
          href={`/api/files/${(a.asset as Row).id}`}
        >
          {asString((a.asset as Row).originalName)}
        </a>
      ))}
      <FileUpload
        onUploaded={(a) => {
          void onSave(`admin/tasks/${task.id}/attachment`, { assetId: a.id });
        }}
      />
    </>
  );
}
function Judging({
  competition,
  onSave,
}: {
  competition: Row;
  onSave: (route: string, value: unknown) => Promise<boolean>;
}) {
  const { t, bi } = useHub(),
    [published, setPublished] = useState(!!competition.resultsPublished);
  return (
    <>
      <h3>{bi(competition.title)}</h3>
      <button
        className="button secondary"
        onClick={async () => {
          if (
            await onSave(`admin/competitions/${competition.id}/results`, {
              resultsPublished: !published,
            })
          )
            setPublished((v) => !v);
        }}
      >
        {t(
          published ? "إخفاء النتائج" : "اعتماد ونشر النتائج",
          published ? "Hide results" : "Approve and publish results",
        )}
      </button>
      {array(competition.submissions).map((s) => (
        <form
          className="form judging-card"
          key={s.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = fields(e.currentTarget),
              criteria = Object.fromEntries(
                array(competition.criteria).map((c) => [
                  asString(c.id),
                  Number(f[asString(c.id)]),
                ]),
              );
            await onSave(`admin/competitions/${competition.id}/score`, {
              submissionId: s.id,
              criteria,
              feedback: f.feedback,
            });
          }}
        >
          <h4>{asString(s.title)}</h4>
          <small>{asString((s.user as Row)?.fullName)}</small>
          <p>{asString(s.description)}</p>
          {!!s.link && (
            <a
              className="accent"
              href={asString(s.link)}
              target="_blank"
              rel="noreferrer"
            >
              {t("رابط المشاركة", "Entry link")}
            </a>
          )}
          {!!s.assetId && (
            <a className="accent" href={`/api/files/${s.assetId}`}>
              {t("تنزيل المرفق", "Download attachment")}
            </a>
          )}
          {array(competition.criteria).map((c) => (
            <Field
              key={asString(c.id)}
              name={asString(c.id)}
              label={`${bi(c.label)} / ${c.max}`}
              type="number"
              defaultValue="0"
            />
          ))}
          <Field
            name="feedback"
            type="textarea"
            label={t("ملاحظات التقييم", "Judging feedback")}
            required={false}
          />
          <button className="button primary" disabled={published}>
            {t("حفظ درجاتي", "Save my scores")}
          </button>
        </form>
      ))}
    </>
  );
}
