"use client";
import Link from "next/link";
import { useState, useEffect, useId } from "react";
import { ArrowUpRight, Send, CheckCircle2 } from "lucide-react";
import { useHub, api } from "./provider";
export function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue = "",
  hint = "",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <i> *</i>}
      </span>
      {type === "textarea" ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          {...rest}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          {...rest}
        />
      )}{" "}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Bilingual({
  name,
  label,
  large = false,
  defaultValue,
}: {
  name: string;
  label: string;
  large?: boolean;
  defaultValue?: unknown;
}) {
  const val = defaultValue as { ar?: string; en?: string } | undefined;
  return (
    <fieldset className="bilingual">
      <legend>{label}</legend>
      <Field
        name={`${name}.ar`}
        label="العربية"
        type={large ? "textarea" : "text"}
        defaultValue={val?.ar}
      />
      <Field
        name={`${name}.en`}
        label="English"
        type={large ? "textarea" : "text"}
        defaultValue={val?.en}
      />
    </fieldset>
  );
}
export const fields = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
export const bifields = (f: Record<string, string>, name: string) => ({
  ar: f[`${name}.ar`] || "",
  en: f[`${name}.en`] || "",
});
export const split = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export function Gate({ children }: { children: React.ReactNode }) {
  const { me, t } = useHub();
  if (!me)
    return (
      <div className="notice">
        <p>
          {t(
            "سجّل الدخول للوصول لهذه المساحة.",
            "Sign in to access this space.",
          )}
        </p>
        <Link className="button primary" href="/auth/login">
          {t("تسجيل الدخول", "Sign in")}
        </Link>
      </div>
    );
  if (!me.verified)
    return (
      <div className="notice">
        <p>
          {t(
            "أكّد بريدك الإلكتروني قبل إرسال الطلبات.",
            "Verify your email before submitting applications.",
          )}
        </p>
        <Link href="/auth/resend" className="text-button">
          {t("أرسل رابط التأكيد", "Send verification link")}
        </Link>
      </div>
    );
  return <>{children}</>;
}
export { MembershipForm } from "./membership";
export function ContactForm() {
  const { t, toast, error } = useHub(),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form glass form-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          f = fields(form);
        setBusy(true);
        try {
          await api("contact", f);
          form.reset();
          toast(
            t(
              "وصلت رسالتك إلى فريق النادي",
              "Your message reached the club team",
            ),
          );
        } catch (err) {
          error(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="two-cols">
        <Field name="name" label={t("الاسم", "Name")} />
        <Field
          name="email"
          type="email"
          label={t("البريد الإلكتروني", "Email")}
        />
      </div>
      <label className="field">
        <span>{t("نوع الرسالة", "Message type")}</span>
        <select name="kind">
          <option value="CONTACT">{t("استفسار", "Question")}</option>
          <option value="COLLABORATION">{t("تعاون", "Collaboration")}</option>
          <option value="SPONSORSHIP">{t("رعاية", "Sponsorship")}</option>
          <option value="SUGGESTION">{t("اقتراح", "Suggestion")}</option>
        </select>
      </label>
      <Field name="subject" label={t("الموضوع", "Subject")} minLength={3} />
      <Field
        name="message"
        label={t("رسالتك", "Your message")}
        type="textarea"
        minLength={15}
      />
      <div className="honeypot" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="button primary" disabled={busy}>
        {t(
          busy ? "جارٍ الإرسال…" : "أرسل الرسالة",
          busy ? "Sending…" : "Send message",
        )}
        <Send size={17} />
      </button>
    </form>
  );
}
export function FileUpload({
  onUploaded,
  isPublic = false,
  imagesOnly = false,
}: {
  onUploaded: (asset: { id: string; originalName: string }) => void;
  isPublic?: boolean;
  imagesOnly?: boolean;
}) {
  const { t, toast, error } = useHub(),
    [busy, setBusy] = useState(false);
  const uploadId = useId();
  return (
    <div className="upload-box">
      <label className="field">
        <span>
          {t(
            imagesOnly
              ? "صورة PNG / JPEG، حتى 10 MB"
              : "ملف PDF أو صورة PNG / JPEG، حتى 10 MB",
            imagesOnly
              ? "PNG / JPEG image, up to 10 MB"
              : "PDF or PNG / JPEG, up to 10 MB",
          )}
        </span>
        <input
          id={`upload-${uploadId}`}
          type="file"
          accept={
            imagesOnly
              ? "image/png,image/jpeg"
              : "application/pdf,image/png,image/jpeg"
          }
          disabled={busy}
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            if (
              imagesOnly &&
              !["image/png", "image/jpeg"].includes(file.type)
            ) {
              error(new Error("VALIDATION_ERROR"));
              return;
            }
            const licenseInput = document.getElementById(
              `license-${uploadId}`,
            ) as HTMLInputElement;
            const license = licenseInput?.value || "";
            if (license.length < 3) {
              error(new Error("RIGHTS_REQUIRED"));
              e.currentTarget.value = "";
              return;
            }
            const form = new FormData();
            form.set("file", file);
            form.set("license", license);
            form.set("public", String(isPublic));
            setBusy(true);
            try {
              const response = await fetch("/api/upload", {
                  method: "POST",
                  body: form,
                }),
                data = await response.json();
              if (!response.ok) throw new Error(data.error);
              onUploaded(data);
              toast(t("رُفع الملف", "File uploaded"));
            } catch (err) {
              error(err);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <label className="field">
        <span>
          {t(
            "الترخيص أو إذن الاستخدام (أدخله قبل الرفع)",
            "License or permission (enter before uploading)",
          )}
        </span>
        <input
          id={`license-${uploadId}`}
          maxLength={1000}
          placeholder={t(
            "مثال: عمل أصلي أسمح باستخدامه للنادي",
            "Example: Original work shared with the club",
          )}
        />
      </label>
      <small className="muted">
        {t(
          isPublic
            ? "الملف سيكون متاحًا للعامة."
            : "الملف خاص بك وبالإدارة المخوّلة.",
          isPublic
            ? "The file will be public."
            : "The file is private to you and authorized administrators.",
        )}
      </small>
      {busy && <span role="status">{t("جارٍ الرفع…", "Uploading…")}</span>}
    </div>
  );
}
export function ProjectForm() {
  const { t, toast, error } = useHub(),
    [busy, setBusy] = useState(false);
  return (
    <Gate>
      <form
        className="form glass form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = fields(form);
          setBusy(true);
          try {
            await api("projects", {
              title: bifields(f, "title"),
              description: bifields(f, "description"),
              body: bifields(f, "body"),
              category: f.category,
              technologies: split(f.technologies),
              skillsNeeded: split(f.skillsNeeded),
              needsTeam: f.needsTeam === "on",
              status: f.status,
              coverUrl: f.coverUrl,
              videoUrl: f.videoUrl,
            });
            toast(t("أُرسل المشروع للمراجعة", "Project submitted for review"));
            form.reset();
          } catch (err) {
            error(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Bilingual name="title" label={t("عنوان المشروع", "Project title")} />
        <Bilingual name="description" label={t("نبذة", "Overview")} large />
        <Bilingual
          name="body"
          label={t("التفاصيل والنتائج", "Details and outcomes")}
          large
        />
        <div className="two-cols">
          <Field name="category" label={t("التصنيف", "Category")} />
          <label className="field">
            <span>{t("حالة المشروع", "Project status")}</span>
            <select name="status">
              <option value="IDEA">{t("فكرة", "Idea")}</option>
              <option value="IN_PROGRESS">
                {t("قيد التطوير", "In progress")}
              </option>
              <option value="COMPLETED">{t("مكتمل", "Completed")}</option>
            </select>
          </label>
          <Field
            name="technologies"
            label={t(
              "التقنيات (مفصولة بفواصل)",
              "Technologies (comma separated)",
            )}
            required={false}
          />
          <Field
            name="skillsNeeded"
            label={t(
              "مهارات يحتاجها الفريق",
              "Skills needed (comma separated)",
            )}
            required={false}
          />
          <Field
            name="coverUrl"
            type="url"
            label={t("رابط صورة (HTTPS)", "Cover image URL (HTTPS)")}
            required={false}
          />
          <Field
            name="videoUrl"
            type="url"
            label={t("رابط فيديو (HTTPS)", "Video URL (HTTPS)")}
            required={false}
          />
        </div>
        <label className="check">
          <input type="checkbox" name="needsTeam" />
          {t("أبحث عن أعضاء للفريق", "I am looking for teammates")}
        </label>
        <button className="button primary" disabled={busy}>
          {t(
            busy ? "جارٍ الإرسال…" : "أرسل للمراجعة",
            busy ? "Submitting…" : "Submit for review",
          )}
          <ArrowUpRight size={18} />
        </button>
      </form>
    </Gate>
  );
}
export function CompetitionForm({ id }: { id: string }) {
  const { t, bi, content, error, toast } = useHub(),
    [busy, setBusy] = useState(false),
    [asset, setAsset] = useState<string>(),
    [board, setBoard] = useState<
      { id: string; title: string; name: string | null; score: number }[]
    >([]);
  const competition = content.competitions.find((c) => c.id === id);
  useEffect(() => {
    if (competition?.resultsPublished)
      void api<typeof board>(`leaderboard/${id}`).then(setBoard).catch(error);
  }, [id, competition?.resultsPublished, error]);
  if (!competition)
    return (
      <section className="wrap section">
        <p>{t("المسابقة غير موجودة", "Competition not found")}</p>
      </section>
    );
  return (
    <section className="wrap section narrow">
      <span className="eyebrow">ENGINEERING CHALLENGE</span>
      <h1>{bi(competition.title)}</h1>
      <p>{bi(competition.description)}</p>
      <div className="prose glass resource-card">
        {bi(competition.rules)}
        <hr />
        {(
          competition.criteria as { id: string; label: unknown; max: number }[]
        ).map((c) => (
          <p key={c.id}>
            {bi(c.label)} · {c.max}
          </p>
        ))}
      </div>
      {competition.resultsPublished ? (
        <div className="glass table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("المشاركة", "Entry")}</th>
                <th>{t("الدرجة", "Score")}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>
                    {r.title}
                    <small>{r.name || t("مشارك", "Participant")}</small>
                  </td>
                  <td>{r.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : new Date(competition.deadline) < new Date() ? (
        <div className="notice">
          {t(
            "أُغلق استقبال المشاركات. ستظهر النتائج بعد اعتمادها.",
            "Submissions are closed. Results will appear after approval.",
          )}
        </div>
      ) : (
        <Gate>
          <form
            className="form glass form-card"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = fields(e.currentTarget);
              setBusy(true);
              try {
                await api(`competitions/${id}/submit`, {
                  title: f.title,
                  description: f.description,
                  link: f.link,
                  assetId: asset,
                  publicName: f.publicName === "on",
                });
                toast(t("تم إرسال مشاركتك", "Entry submitted"));
              } catch (err) {
                error(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              name="title"
              label={t("عنوان المشاركة", "Entry title")}
              minLength={3}
            />
            <Field
              name="description"
              label={t("تفاصيل الحل", "Solution details")}
              type="textarea"
              minLength={20}
            />
            <Field
              name="link"
              label={t("رابط خارجي (اختياري)", "External link (optional)")}
              type="url"
              required={false}
            />
            <FileUpload onUploaded={(a) => setAsset(a.id)} />
            {asset && (
              <p className="accent">
                <CheckCircle2 size={15} />
                {t("الملف مرفق", "File attached")}
              </p>
            )}
            <label className="check">
              <input type="checkbox" name="publicName" />
              {t(
                "أوافق على عرض اسمي مع النتيجة المنشورة",
                "I consent to showing my name in published results",
              )}
            </label>
            <button className="button primary" disabled={busy}>
              {t(
                busy ? "جارٍ الإرسال…" : "إرسال المشاركة",
                busy ? "Submitting…" : "Submit entry",
              )}
            </button>
          </form>
        </Gate>
      )}
    </section>
  );
}
