import { z } from "zod";

const text = (max: number) =>
  z
    .object({ ar: z.string().trim().max(max), en: z.string().trim().max(max) })
    .strict();
const label = text(300).refine(
  (v) => !!v.ar && !!v.en,
  "Provide both languages",
);
export const mediaUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (/^\/api\/files\/[a-zA-Z0-9_-]+$/.test(value)) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a secure HTTPS media URL");
export const formFieldTypes = [
  "text",
  "textarea",
  "email",
  "number",
  "date",
  "radio",
  "multiselect",
  "select",
  "checkbox",
  "section",
  "image",
  "video",
] as const;
export const fieldNames = {
  text: ["إجابة قصيرة", "Short answer"],
  textarea: ["فقرة", "Paragraph"],
  email: ["بريد إلكتروني", "Email"],
  number: ["رقم", "Number"],
  date: ["تاريخ", "Date"],
  radio: ["اختيار من متعدد", "Multiple choice"],
  multiselect: ["مربعات اختيار", "Checkboxes"],
  select: ["قائمة منسدلة", "Dropdown"],
  checkbox: ["موافقة", "Agreement"],
  section: ["عنوان وقسم", "Section"],
  image: ["صورة", "Image"],
  video: ["فيديو", "Video"],
} as const;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const formFieldSchema = z
  .object({
    id: identifier,
    type: z.enum(formFieldTypes),
    label,
    description: text(2000),
    required: z.boolean(),
    mediaUrl,
    options: z
      .array(z.object({ id: identifier, label, imageUrl: mediaUrl }).strict())
      .max(30),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (isChoice(field.type) && field.options.length < 2)
      ctx.addIssue({ code: "custom", message: "Add at least two options" });
    if (new Set(field.options.map((o) => o.id)).size !== field.options.length)
      ctx.addIssue({ code: "custom", message: "Duplicate option IDs" });
    if ((field.type === "image" || field.type === "video") && !field.mediaUrl)
      ctx.addIssue({ code: "custom", message: "Add a media URL" });
    if (
      field.type === "video" &&
      field.mediaUrl &&
      !videoSource(field.mediaUrl)
    )
      ctx.addIssue({
        code: "custom",
        message: "Use YouTube or an HTTPS MP4/WebM video",
      });
  });
export const membershipFormSchema = z
  .object({
    version: z.number().int().min(1),
    title: label,
    description: text(3000),
    confirmation: label,
    fields: z.array(formFieldSchema).min(1).max(60),
  })
  .strict()
  .superRefine((form, ctx) => {
    if (new Set(form.fields.map((f) => f.id)).size !== form.fields.length)
      ctx.addIssue({ code: "custom", message: "Duplicate field IDs" });
    if (!form.fields.some((f) => !isContent(f.type)))
      ctx.addIssue({ code: "custom", message: "Add a question" });
  });
export type MembershipFormDefinition = z.infer<typeof membershipFormSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormAnswer = string | string[] | boolean;
export function isContent(type: string) {
  return ["section", "image", "video"].includes(type);
}
export function isChoice(type: string) {
  return ["radio", "multiselect", "select"].includes(type);
}
export function videoSource(
  value: string,
): { type: "youtube" | "file"; url: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (/\.(mp4|webm)$/i.test(url.pathname))
      return { type: "file", url: url.href };
    let id: string | null = null;
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : /^\/(embed|shorts)\//.test(url.pathname)
            ? url.pathname.split("/")[2]
            : null;
    } else if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    return id && /^[\w-]{11}$/.test(id)
      ? { type: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  } catch {
    return null;
  }
}
const bi = (ar: string, en: string) => ({ ar, en });
export const defaultMembershipForm: MembershipFormDefinition = {
  version: 1,
  title: bi("انضم لنادي ASME", "Join the ASME club"),
  description: bi(
    "فضولك يصنع الفرق. شاركنا شغفك بالهندسة ولنصنع التجربة معًا.",
    "Your curiosity makes a difference. Share your passion for engineering and build the experience with us.",
  ),
  confirmation: bi(
    "وصل طلبك! نتطلع لصناعة الأثر معك.",
    "Application received! We look forward to building with you.",
  ),
  fields: [
    ["universityId", "الرقم الجامعي", "University ID", "text"],
    ["college", "الكلية", "College", "text"],
    ["major", "التخصص", "Major", "text"],
    ["level", "المستوى الدراسي", "Study level", "text"],
    [
      "motivation",
      "ما الذي تتطلع لصناعته معنا؟",
      "What would you like to create with us?",
      "textarea",
    ],
  ].map(([id, ar, en, type]) => ({
    id,
    label: bi(ar, en),
    type: type as "text" | "textarea",
    description: bi("", ""),
    required: true,
    mediaUrl: "",
    options: [],
  })),
};
export function getMembershipForm(value: unknown): MembershipFormDefinition {
  const result = membershipFormSchema.safeParse(value);
  return result.success ? result.data : structuredClone(defaultMembershipForm);
}
export function validateFormAnswers(
  form: MembershipFormDefinition,
  raw: unknown,
): Record<string, FormAnswer> {
  const input = z
    .record(
      identifier,
      z.union([
        z.string().max(5000),
        z.array(z.string().max(80)).max(30),
        z.boolean(),
      ]),
    )
    .parse(raw);
  const answerFields = form.fields.filter((f) => !isContent(f.type));
  if (Object.keys(input).some((key) => !answerFields.some((f) => f.id === key)))
    throw new Error("Unknown field");
  const answers: Record<string, FormAnswer> = {};
  for (const field of answerFields) {
    const value = input[field.id];
    const empty =
      value === undefined ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && !value.length);
    if (empty) {
      if (field.required) throw new Error(`Required: ${field.id}`);
      continue;
    }
    if (field.type === "checkbox") {
      if (value !== true) throw new Error("Invalid agreement");
    } else if (field.type === "multiselect") {
      if (
        !Array.isArray(value) ||
        new Set(value).size !== value.length ||
        value.some((v) => !field.options.some((o) => o.id === v))
      )
        throw new Error("Invalid choices");
    } else {
      if (typeof value !== "string") throw new Error("Expected text");
      if (
        !value.trim() ||
        value.length > (field.type === "textarea" ? 5000 : 500)
      )
        throw new Error("Invalid text");
      if (isChoice(field.type) && !field.options.some((o) => o.id === value))
        throw new Error("Invalid option");
      if (field.type === "email" && !z.email().safeParse(value).success)
        throw new Error("Invalid email");
      if (
        field.type === "number" &&
        (!value.trim() || !Number.isFinite(Number(value)))
      )
        throw new Error("Invalid number");
      if (
        field.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw new Error("Invalid date");
    }
    answers[field.id] = value!;
  }
  return answers;
}
export function readFormAnswers(
  form: MembershipFormDefinition,
  element: HTMLFormElement,
) {
  const data = new FormData(element),
    answers: Record<string, FormAnswer> = {};
  for (const f of form.fields.filter((f) => !isContent(f.type))) {
    const name = `answer-${f.id}`;
    answers[f.id] =
      f.type === "multiselect"
        ? data.getAll(name).map(String)
        : f.type === "checkbox"
          ? data.has(name)
          : String(data.get(name) || "").trim();
  }
  return validateFormAnswers(form, answers);
}
