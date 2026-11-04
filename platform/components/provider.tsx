"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { isPages } from "@/lib/site-mode";
import { useModalAccessibility } from "./use-modal";
import type { Content, Lang, Me, Profile } from "@/lib/types";
export async function api<T = Record<string, unknown>>(
  route: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  if (isPages) {
    if (data !== undefined) throw new Error("STATIC_UNAVAILABLE");
    if (route === "me") return { user: null, profile: null } as T;
    if (route.split("?")[0] === "content") {
      const content = (await import("../publication/content.json"))
        .default as unknown as Content;
      const q = (
        new URL(route, "https://asme.invalid").searchParams.get("q") || ""
      )
        .trim()
        .toLowerCase();
      if (!q) return content as T;
      const matches = (item: { title: unknown; description: unknown }) =>
        [
          translated(item.title, "ar"),
          translated(item.title, "en"),
          translated(item.description, "ar"),
          translated(item.description, "en"),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return {
        ...content,
        events: content.events.filter(matches),
        resources: content.resources.filter(matches),
        projects: content.projects.filter(matches),
        posts: content.posts.filter(matches),
        competitions: content.competitions.filter(matches),
      } as T;
    }
    throw new Error("STATIC_UNAVAILABLE");
  }
  const response = await fetch(
    `/api/${route}`,
    data === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "SERVER_ERROR");
  return result;
}
export function translated(value: unknown, lang: Lang) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object")
    return String((value as Record<string, unknown>)[lang] || "");
  return "";
}
const errors: Record<string, [string, string]> = {
  STATIC_UNAVAILABLE: [
    "هذه الخدمة لم تُفتح بعد. يمكنك تصفح المحتوى والأدوات الآن.",
    "This service is not open yet. Explore content and tools for now.",
  ],
  AUTH_REQUIRED: ["سجّل الدخول أولاً", "Sign in first"],
  VERIFY_EMAIL: ["أكّد بريدك الإلكتروني أولاً", "Verify your email first"],
  FORBIDDEN: ["لا تملك صلاحية هذا الإجراء", "You do not have permission"],
  INVALID_CREDENTIALS: [
    "البريد أو كلمة المرور غير صحيحة",
    "Incorrect email or password",
  ],
  VALIDATION_ERROR: [
    "تحقق من الحقول والتواريخ المطلوبة",
    "Check the required fields and dates",
  ],
  MEMBERSHIP_CLOSED: [
    "التسجيل في العضوية مغلق حاليًا",
    "Membership applications are closed",
  ],
  CHECK_EMAIL: [
    "راجع بريدك الإلكتروني للمتابعة",
    "Check your email to continue",
  ],
  ALREADY_REGISTERED: ["أنت مسجل بالفعل", "You are already registered"],
  EVENT_FULL: ["اكتملت المقاعد", "This event is full"],
  REGISTRATION_CLOSED: ["انتهى التسجيل", "Registration has closed"],
  APPLICATION_EXISTS: [
    "لديك طلب عضوية قائم",
    "You already have an application",
  ],
  ALREADY_EXISTS: ["هذا السجل موجود بالفعل", "This entry already exists"],
  RATE_LIMITED: [
    "محاولات كثيرة. حاول لاحقًا",
    "Too many attempts. Try again later",
  ],
  MAIL_NOT_CONFIGURED: [
    "خدمة البريد غير مهيأة. تواصل مع الإدارة",
    "Email is not configured. Contact the administrator",
  ],
  INVALID_TOKEN: [
    "الرابط غير صالح أو انتهت مدته",
    "The link is invalid or expired",
  ],
  ALREADY_CHECKED_IN: ["تم تسجيل الحضور مسبقًا", "Attendance already recorded"],
  ATTENDANCE_REQUIRED: [
    "يلزم حضور الفعالية أولاً",
    "Event attendance is required",
  ],
  EVENT_NOT_ENDED: ["لم تنتهِ الفعالية بعد", "The event has not ended"],
  RIGHTS_REQUIRED: ["أدخل ترخيص الملف وحقوقه", "Enter the file license"],
  FILE_SIZE: ["حجم الملف يجب ألا يتجاوز 10 MB", "File must be at most 10 MB"],
  PDF_PNG_JPEG_ONLY: [
    "المسموح PDF أو PNG أو JPEG",
    "Only PDF, PNG or JPEG is allowed",
  ],
};
type Context = {
  lang: Lang;
  t: (ar: string, en: string) => string;
  bi: (v: unknown) => string;
  setLang: () => void;
  dark: boolean;
  toggleTheme: () => void;
  content: Content;
  me: Me | null;
  profile: Profile | null;
  refresh: () => Promise<void>;
  toast: (message: string, error?: boolean) => void;
  error: (e: unknown) => void;
};
const C = createContext<Context | null>(null);
export const useHub = () => useContext(C)!;
export function Provider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: Content;
}) {
  useModalAccessibility();
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [lang, setLanguage] = useState<Lang>("ar"),
    [dark, setDark] = useState(false),
    [content, setContent] = useState(initial),
    [me, setMe] = useState<Me | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [notice, setNotice] = useState<{ message: string; error: boolean } | null>(
      null,
    );
  const toast = useCallback(
    (message: string, error = false) => setNotice({ message, error }),
    [],
  );
  useEffect(() => {
    const l = localStorage.getItem("asmenu-lang") === "en" ? "en" : "ar";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the browser preference after server rendering.
    setLanguage(l);
    setDark(localStorage.getItem("asmenu-theme") === "dark");
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    if (!preferencesReady) return;
    localStorage.setItem("asmenu-lang", lang);
    localStorage.setItem("asmenu-theme", dark ? "dark" : "light");
  }, [lang, dark, preferencesReady]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const refresh = useCallback(async () => {
    const [data, account] = await Promise.all([
      api<Content>("content"),
      api<{ user: Me | null; profile: Profile | null }>("me"),
    ]);
    setContent(data);
    setMe(account.user);
    setProfile(account.profile);
  }, []);
  useEffect(() => {
    void api<{ user: Me | null; profile: Profile | null }>("me")
      .then((a) => {
        setMe(a.user);
        setProfile(a.profile);
      })
      .catch(() => {});
  }, []);
  const t = useCallback(
    (ar: string, en: string) => (lang === "ar" ? ar : en),
    [lang],
  );
  const reportError = useCallback(
    (e: unknown) => {
      const key = e instanceof Error ? e.message : "SERVER_ERROR";
      toast(
        errors[key]?.[lang === "ar" ? 0 : 1] ||
          t(
            "تعذر إتمام العملية. حاول مجددًا.",
            "The request could not be completed. Try again.",
          ),
        true,
      );
    },
    [lang, t, toast],
  );
  return (
    <C.Provider
      value={{
        lang,
        t,
        bi: (v) => translated(v, lang),
        setLang: () => setLanguage((v) => (v === "ar" ? "en" : "ar")),
        dark,
        toggleTheme: () => setDark((v) => !v),
        content,
        me,
        profile,
        refresh,
        toast,
        error: reportError,
      }}
    >
      {children}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`toast ${notice.error ? "error" : ""}`}
        >
          {notice.message}
          <button
            aria-label={t("إغلاق", "Close")}
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
    </C.Provider>
  );
}
