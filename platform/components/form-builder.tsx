"use client";
import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  ListChecks,
  Download,
  Save,
  GripVertical,
} from "lucide-react";
import { useHub, api } from "./provider";
import { FileUpload } from "./forms";
import { FormQuestions, FormMedia } from "./form-blocks";
import {
  getMembershipForm,
  membershipFormSchema,
  formFieldTypes,
  fieldNames,
  isChoice,
  isContent,
  type FormField,
  type MembershipFormDefinition,
} from "@/lib/form-schema";
import type { Bi } from "@/lib/types";
type Row = Record<string, unknown>;
const emptyBi = () => ({ ar: "", en: "" });
const uid = () => crypto.randomUUID();
function BiEditor({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: Bi;
  onChange: (v: Bi) => void;
  large?: boolean;
}) {
  return (
    <fieldset className="bilingual">
      <legend>{label}</legend>
      {(["ar", "en"] as const).map((lang) => (
        <label className="field" key={lang}>
          <span>{lang === "ar" ? "العربية" : "English"}</span>
          {large ? (
            <textarea
              dir={lang === "ar" ? "rtl" : "ltr"}
              maxLength={2000}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
          ) : (
            <input
              dir={lang === "ar" ? "rtl" : "ltr"}
              maxLength={300}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
export function FormBuilder({
  rows,
  onSave,
}: {
  rows: Row[];
  onSave: (route: string, value: unknown) => Promise<boolean>;
}) {
  const { t, bi } = useHub();
  const [definition, setDefinition] = useState(() =>
    getMembershipForm(rows.find((r) => r.key === "membershipForm")?.value),
  );
  const [open, setOpen] = useState(
    () =>
      !!(rows.find((r) => r.key === "membership")?.value as { open?: boolean })
        ?.open,
  );
  const [tab, setTab] = useState("questions"),
    [active, setActive] = useState(definition.fields[0]?.id),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const update = (id: string, patch: Partial<FormField>) =>
    setDefinition((d) => ({
      ...d,
      fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  const add = (type: FormField["type"] = "text") => {
    if (definition.fields.length >= 60) return;
    const id = uid();
    const options = isChoice(type)
      ? [1, 2].map((n) => ({
          id: uid(),
          label: { ar: `خيار ${n}`, en: `Option ${n}` },
          imageUrl: "",
        }))
      : [];
    setDefinition((d) => ({
      ...d,
      fields: [
        ...d.fields,
        {
          id,
          type,
          label: { ar: fieldNames[type][0], en: fieldNames[type][1] },
          description: emptyBi(),
          required: false,
          options,
          mediaUrl: "",
        },
      ],
    }));
    setActive(id);
  };
  const move = (index: number, delta: number) =>
    setDefinition((d) => {
      const fields = [...d.fields];
      [fields[index], fields[index + delta]] = [
        fields[index + delta],
        fields[index],
      ];
      return { ...d, fields };
    });
  return (
    <div className="form-builder">
      <div className="builder-top glass">
        <div>
          <span className="eyebrow">ASME / FORM STUDIO</span>
          <h2>{t("صمّم أول خطوة لهم.", "Design their first step.")}</h2>
          <p className="muted small">
            {t(
              "نموذج الانضمام · احفظ التعديلات لنشرها · جميع الأسئلة تدعم اللغتين",
              "Membership form · Save to publish · Every question supports both languages",
            )}
          </p>
        </div>
        <button
          type="button"
          className="button primary compact"
          disabled={busy}
          onClick={async () => {
            const result = membershipFormSchema.safeParse(definition);
            if (!result.success) {
              const first = result.error.issues[0];
              const index =
                first.path[0] === "fields" ? Number(first.path[1]) : -1;
              if (index >= 0) setActive(definition.fields[index]?.id);
              setTab("questions");
              setIssue(
                t(
                  "راجع العناوين باللغتين، وأضف خيارين على الأقل لأسئلة الاختيار ورابطًا صالحًا للصور والفيديو.",
                  "Check bilingual titles, at least two options for choice questions, and valid image/video URLs.",
                ),
              );
              return;
            }
            if (
              new TextEncoder().encode(JSON.stringify({ definition, open }))
                .byteLength > 95000
            ) {
              setIssue(
                t(
                  "النموذج كبير جدًا. اختصر النصوص أو قلّل الأسئلة والخيارات.",
                  "This form is too large. Shorten text or reduce questions and options.",
                ),
              );
              return;
            }
            setBusy(true);
            setIssue("");
            await onSave("admin/forms", { definition: result.data, open });
            setBusy(false);
          }}
        >
          <Save size={17} />
          {t(
            busy ? "جارٍ الحفظ…" : "حفظ ونشر النموذج",
            busy ? "Saving…" : "Save and publish",
          )}
        </button>
      </div>
      <div className="builder-navigation">
        <div
          className="tabs"
          role="tablist"
          aria-label={t("محرر النموذج", "Form editor")}
        >
          {[
            ["questions", "الأسئلة", "Questions"],
            ["preview", "المعاينة", "Preview"],
            ["responses", "الردود", "Responses"],
          ].map(([id, ar, en]) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={tab === id ? "active" : ""}
            >
              {id === "preview" ? <Eye size={16} /> : <ListChecks size={16} />}
              {t(ar, en)}
            </button>
          ))}
        </div>
        <label className="check registration-toggle">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
          />
          {t("استقبال طلبات الانضمام", "Accept membership applications")}
        </label>
      </div>
      {issue && (
        <p className="form-error" role="alert">
          {issue}
        </p>
      )}
      <div
        role="tabpanel"
        aria-label={t(
          tab === "preview"
            ? "معاينة النموذج"
            : tab === "responses"
              ? "ردود النموذج"
              : "أسئلة النموذج",
          tab === "preview"
            ? "Form preview"
            : tab === "responses"
              ? "Form responses"
              : "Form questions",
        )}
      >
        {tab === "responses" ? (
          <FormResponses />
        ) : tab === "preview" ? (
          <div className="builder-preview">
            <div className="form-intro glass">
              <span className="eyebrow">
                {t(
                  "معاينة · لن تُرسل أي إجابات",
                  "PREVIEW · No answers will be submitted",
                )}
              </span>
              <h2>{bi(definition.title)}</h2>
              <p>{bi(definition.description)}</p>
            </div>
            <FormQuestions
              key={JSON.stringify(definition)}
              definition={definition}
            />
          </div>
        ) : (
          <div className="builder-workspace">
            <div className="builder-questions">
              <div className="question-block builder-header">
                <BiEditor
                  label={t("عنوان النموذج", "Form title")}
                  value={definition.title}
                  onChange={(title) => setDefinition((d) => ({ ...d, title }))}
                />
                <BiEditor
                  label={t("وصف النموذج", "Form description")}
                  value={definition.description}
                  onChange={(description) =>
                    setDefinition((d) => ({ ...d, description }))
                  }
                  large
                />
                <BiEditor
                  label={t("رسالة نجاح الإرسال", "Submission confirmation")}
                  value={definition.confirmation}
                  onChange={(confirmation) =>
                    setDefinition((d) => ({ ...d, confirmation }))
                  }
                />
              </div>
              {definition.fields.map((field, index) => (
                <section
                  key={field.id}
                  className={`question-block builder-question ${active === field.id ? "editing" : ""}`}
                >
                  <div className="builder-question-heading">
                    <button
                      type="button"
                      className="question-select"
                      aria-expanded={active === field.id}
                      onClick={() =>
                        setActive(active === field.id ? "" : field.id)
                      }
                    >
                      <GripVertical size={16} />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>
                        {bi(field.label) ||
                          t("سؤال بلا عنوان", "Untitled question")}
                      </strong>
                    </button>
                    <small className="tag">
                      {t(fieldNames[field.type][0], fieldNames[field.type][1])}
                    </small>
                  </div>
                  {active === field.id && (
                    <>
                      <label className="field">
                        <span>{t("نوع البلوك", "Block type")}</span>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const type = e.target.value as FormField["type"];
                            update(field.id, {
                              type,
                              required: isContent(type)
                                ? false
                                : field.required,
                              options: isChoice(type)
                                ? field.options.length
                                  ? field.options
                                  : [1, 2].map((n) => ({
                                      id: uid(),
                                      label: {
                                        ar: `خيار ${n}`,
                                        en: `Option ${n}`,
                                      },
                                      imageUrl: "",
                                    }))
                                : [],
                              mediaUrl: "",
                            });
                          }}
                        >
                          {formFieldTypes.map((type) => (
                            <option key={type} value={type}>
                              {t(fieldNames[type][0], fieldNames[type][1])}
                            </option>
                          ))}
                        </select>
                      </label>
                      <BiEditor
                        label={t("العنوان", "Title")}
                        value={field.label}
                        onChange={(label) => update(field.id, { label })}
                      />
                      <BiEditor
                        label={t("الوصف (اختياري)", "Description (optional)")}
                        value={field.description}
                        onChange={(description) =>
                          update(field.id, { description })
                        }
                        large
                      />
                      {field.type !== "section" && (
                        <label className="field">
                          <span>
                            {t(
                              field.type === "video"
                                ? "رابط فيديو YouTube أو MP4 / WebM"
                                : "رابط صورة HTTPS (اختياري للسؤال)",
                              field.type === "video"
                                ? "YouTube or MP4 / WebM URL"
                                : "HTTPS image URL (optional for questions)",
                            )}
                          </span>
                          <input
                            type="url"
                            dir="ltr"
                            value={field.mediaUrl}
                            placeholder="https://…"
                            onChange={(e) =>
                              update(field.id, { mediaUrl: e.target.value })
                            }
                          />
                        </label>
                      )}
                      {field.type !== "video" && field.type !== "section" && (
                        <details className="media-upload">
                          <summary>
                            {t("رفع صورة من جهازك", "Upload an image")}
                          </summary>
                          <FileUpload
                            isPublic
                            imagesOnly
                            onUploaded={(asset) =>
                              update(field.id, {
                                mediaUrl: `/api/files/${asset.id}`,
                              })
                            }
                          />
                        </details>
                      )}
                      {field.mediaUrl && (
                        <FormMedia
                          key={field.mediaUrl}
                          url={field.mediaUrl}
                          caption={bi(field.label)}
                          video={field.type === "video"}
                        />
                      )}
                      {isChoice(field.type) && (
                        <div className="option-editors">
                          {field.options.map((option, optionIndex) => (
                            <div className="option-editor" key={option.id}>
                              <span className="eyebrow">
                                {t("خيار", "OPTION")} {optionIndex + 1}
                              </span>
                              <BiEditor
                                label={t("نص الخيار", "Option label")}
                                value={option.label}
                                onChange={(label) =>
                                  update(field.id, {
                                    options: field.options.map((o) =>
                                      o.id === option.id ? { ...o, label } : o,
                                    ),
                                  })
                                }
                              />
                              <label className="field">
                                <span>
                                  {t(
                                    "رابط صورة للخيار (اختياري)",
                                    "Option image URL (optional)",
                                  )}
                                </span>
                                <input
                                  type="url"
                                  dir="ltr"
                                  value={option.imageUrl}
                                  onChange={(e) =>
                                    update(field.id, {
                                      options: field.options.map((o) =>
                                        o.id === option.id
                                          ? { ...o, imageUrl: e.target.value }
                                          : o,
                                      ),
                                    })
                                  }
                                />
                              </label>
                              <details className="media-upload">
                                <summary>
                                  {t("رفع صورة للخيار", "Upload option image")}
                                </summary>
                                <FileUpload
                                  isPublic
                                  imagesOnly
                                  onUploaded={(asset) =>
                                    update(field.id, {
                                      options: field.options.map((o) =>
                                        o.id === option.id
                                          ? {
                                              ...o,
                                              imageUrl: `/api/files/${asset.id}`,
                                            }
                                          : o,
                                      ),
                                    })
                                  }
                                />
                              </details>
                              <button
                                type="button"
                                className="text-button danger"
                                onClick={() =>
                                  update(field.id, {
                                    options: field.options.filter(
                                      (o) => o.id !== option.id,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={14} />
                                {t("حذف الخيار", "Remove option")}
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={field.options.length >= 30}
                            onClick={() =>
                              update(field.id, {
                                options: [
                                  ...field.options,
                                  { id: uid(), label: emptyBi(), imageUrl: "" },
                                ],
                              })
                            }
                          >
                            <Plus size={15} />
                            {t("إضافة خيار", "Add option")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <div className="question-actions">
                    {!isContent(field.type) && (
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            update(field.id, { required: e.target.checked })
                          }
                        />
                        {t("إلزامي", "Required")}
                      </label>
                    )}
                    <div className="question-tools">
                      {[
                        {
                          label: t("تحريك لأعلى", "Move up"),
                          Icon: ArrowUp,
                          disabled: index === 0,
                          run: () => move(index, -1),
                        },
                        {
                          label: t("تحريك لأسفل", "Move down"),
                          Icon: ArrowDown,
                          disabled: index === definition.fields.length - 1,
                          run: () => move(index, 1),
                        },
                        {
                          label: t("نسخ البلوك", "Duplicate block"),
                          Icon: Copy,
                          disabled: definition.fields.length >= 60,
                          run: () => {
                            const id = uid();
                            setDefinition((d) => ({
                              ...d,
                              fields: [
                                ...d.fields.slice(0, index + 1),
                                { ...structuredClone(field), id },
                                ...d.fields.slice(index + 1),
                              ],
                            }));
                            setActive(id);
                          },
                        },
                        {
                          label: t("حذف البلوك", "Delete block"),
                          Icon: Trash2,
                          disabled: definition.fields.length === 1,
                          run: () =>
                            setDefinition((d) => ({
                              ...d,
                              fields: d.fields.filter((f) => f.id !== field.id),
                            })),
                        },
                      ].map(({ label, Icon, disabled, run }) => (
                        <button
                          type="button"
                          className="icon-button"
                          key={label}
                          aria-label={label}
                          disabled={disabled}
                          onClick={run}
                        >
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
            <aside className="builder-palette glass">
              <span className="eyebrow">
                {t("أضف إلى النموذج", "ADD TO YOUR FORM")}
              </span>
              {formFieldTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  disabled={definition.fields.length >= 60}
                  onClick={() => add(type)}
                >
                  <Plus size={15} />
                  {t(fieldNames[type][0], fieldNames[type][1])}
                </button>
              ))}
              <small className="muted">
                {definition.fields.length} / 60 {t("بلوك", "blocks")}
              </small>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApplicationAnswers({ payload }: { payload: Row }) {
  const { bi } = useHub();
  const snapshot = payload.formSnapshot as MembershipFormDefinition | undefined;
  const answers = payload.answers as Row | undefined;
  if (!snapshot || !answers)
    return (
      <dl className="data-list">
        {Object.entries(payload).map(([k, val]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{Array.isArray(val) ? val.join(", ") : String(val)}</dd>
          </div>
        ))}
      </dl>
    );
  return (
    <dl className="data-list">
      {snapshot.fields
        .filter((f) => !isContent(f.type))
        .map((field) => {
          const answer = answers[field.id];
          const render = (value: unknown) =>
            typeof value === "boolean"
              ? value
                ? "✓"
                : "—"
              : bi(field.options.find((o) => o.id === value)?.label) ||
                String(value ?? "—");
          return (
            <div key={field.id}>
              <dt>{bi(field.label)}</dt>
              <dd>
                {Array.isArray(answer)
                  ? answer.map(render).join("، ")
                  : render(answer)}
              </dd>
            </div>
          );
        })}
    </dl>
  );
}
function FormResponses() {
  const { t, bi, error } = useHub();
  const [rows, setRows] = useState<Row[] | null>(null),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false);
  const load = async (next: number) => {
    setBusy(true);
    try {
      setRows(await api<Row[]>(`admin/members?page=${next}`));
      setPage(next);
    } catch (err) {
      error(err);
    } finally {
      setBusy(false);
    }
  };
  function exportCsv() {
    const cell = (value: unknown) => {
      let v = String(value ?? "");
      if (/^[\s]*[=+@-]/.test(v)) v = "'" + v;
      return '"' + v.replaceAll('"', '""') + '"';
    };
    const data = [
      ["Name", "Email", "Status", "Submitted", "Question", "Answer"],
    ];
    for (const row of rows || []) {
      const payload = row.payload as Row,
        user = row.user as Row;
      const snapshot = payload.formSnapshot as
        | MembershipFormDefinition
        | undefined;
      const answers = (payload.answers || payload) as Row;
      for (const [key, raw] of Object.entries(answers)) {
        const field = snapshot?.fields.find((f) => f.id === key);
        const render = (v: unknown) =>
          bi(field?.options.find((o) => o.id === v)?.label) || String(v);
        data.push([
          String(user.fullName),
          String(user.email),
          String(row.status),
          String(row.createdAt),
          field ? bi(field.label) : key,
          Array.isArray(raw) ? raw.map(render).join("; ") : render(raw),
        ]);
      }
    }
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + data.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `asme-responses-page-${page + 1}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="responses-panel">
      <div className="builder-navigation">
        <button
          type="button"
          className="button secondary compact"
          disabled={busy}
          onClick={() => void load(page)}
        >
          {t(
            busy ? "جارٍ التحميل…" : "تحميل الردود / تحديث",
            busy ? "Loading…" : "Load / refresh responses",
          )}
        </button>
        <button
          type="button"
          className="button secondary compact"
          disabled={!rows?.length}
          onClick={exportCsv}
        >
          <Download size={16} />
          {t("تصدير الردود المعروضة CSV", "Export displayed responses CSV")}
        </button>
      </div>
      {rows?.length === 0 && (
        <p className="notice">{t("لم تصل ردود بعد", "No responses yet")}</p>
      )}
      {rows?.map((row) => (
        <details className="question-block response-card" key={String(row.id)}>
          <summary>
            <strong>{String((row.user as Row).fullName)}</strong>
            <span>{String(row.status)}</span>
            <time>{new Date(String(row.createdAt)).toLocaleDateString()}</time>
          </summary>
          <ApplicationAnswers payload={row.payload as Row} />
        </details>
      ))}
      {rows && (
        <div className="pagination">
          <button
            type="button"
            className="button secondary compact"
            disabled={busy || page === 0}
            onClick={() => void load(page - 1)}
          >
            {t("السابق", "Previous")}
          </button>
          <span>{page + 1}</span>
          <button
            type="button"
            className="button secondary compact"
            disabled={busy || rows.length < 50}
            onClick={() => void load(page + 1)}
          >
            {t("التالي", "Next")}
          </button>
        </div>
      )}
    </div>
  );
}
