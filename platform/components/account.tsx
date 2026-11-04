"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, ShieldCheck, Mail } from "lucide-react";
import { api, useHub } from "./provider";
const schema = z.object({
  fullName: z.string(),
  email: z.string(),
  password: z.string(),
  consent: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function Account({ mode }: { mode: string }) {
  const router = useRouter();
  const { t, error, refresh } = useHub(),
    [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", consent: false },
  });
  const titles: Record<string, [string, string]> = {
    login: ["مرحبًا بعودتك.", "Welcome back."],
    register: ["لنبدأ حكايتك الهندسية.", "Start your engineering story."],
    recover: ["استعادة كلمة المرور", "Recover your password"],
    reset: ["كلمة مرور جديدة", "A fresh start."],
    verify: ["تأكيد البريد الإلكتروني", "Verify your email"],
    resend: ["إعادة إرسال رابط التأكيد", "Resend verification email"],
  };
  const submit = handleSubmit(async (data) => {
    try {
      const token = new URLSearchParams(location.search).get("token") || "";
      if (mode === "login") {
        await api("auth/login", { email: data.email, password: data.password });
        await refresh();
        router.push("/portal");
      } else if (mode === "register") {
        await api("auth/register", data);
        setDone(true);
      } else if (mode === "reset") {
        await api("auth/reset", { token, password: data.password });
        setDone(true);
      } else if (mode === "verify") {
        await api("auth/verify", { token });
        await refresh();
        setDone(true);
      } else {
        await api(`auth/${mode}`, { email: data.email });
        setDone(true);
      }
    } catch (e) {
      error(e);
    }
  });
  return (
    <section className="wrap section account-layout">
      <div className="account-story">
        <span className="eyebrow">
          <span className="dot" />
          YOUR ENGINEERING HUB
        </span>
        <h1>
          {t("خطوة صغيرة.", "One small step.")}
          <br />
          <span className="accent">
            {t("احتمالات لا تنتهي.", "Infinite possibilities.")}
          </span>
        </h1>
        <p>
          {t(
            "مساحتك للتعلّم، والمشاركة، وبناء شيء يستحق.",
            "Your space to learn, contribute, and build something that matters.",
          )}
        </p>
        <div className="account-seal">
          <ShieldCheck size={25} />
          <span>
            {t(
              "بياناتك الخاصة تبقى خاصة.",
              "Your private information stays private.",
            )}
          </span>
        </div>
      </div>
      <div className="glass form-card account-card">
        <span className="eyebrow">ASME NU</span>
        <h2>{t(...(titles[mode] || titles.login))}</h2>
        {done ? (
          <div role="status" className="notice">
            <Mail size={28} />
            <p>
              {["register", "recover", "resend"].includes(mode)
                ? t(
                    "راجع بريدك الإلكتروني للمتابعة. إذا كان الحساب مؤهلًا، سيصلك الرابط.",
                    "Check your email to continue. An eligible account will receive a link.",
                  )
                : t(
                    "تمت العملية بنجاح. يمكنك تسجيل الدخول الآن.",
                    "All done. You can sign in now.",
                  )}
            </p>
            <Link className="button primary" href="/auth/login">
              {t("تسجيل الدخول", "Sign in")}
            </Link>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            {mode === "register" && (
              <label className="field">
                <span>{t("الاسم الكامل", "Full name")}</span>
                <input
                  {...register("fullName")}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
            )}
            {!["verify", "reset"].includes(mode) && (
              <label className="field">
                <span>{t("البريد الإلكتروني", "Email")}</span>
                <input
                  {...register("email")}
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  dir="ltr"
                />
              </label>
            )}
            {["register", "login", "reset"].includes(mode) && (
              <label className="field">
                <span>{t("كلمة المرور", "Password")}</span>
                <input
                  {...register("password")}
                  type="password"
                  required
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                {mode !== "login" && (
                  <small>
                    {t(
                      "12 حرفًا على الأقل. استخدم كلمة فريدة.",
                      "At least 12 characters. Use a unique password.",
                    )}
                  </small>
                )}
              </label>
            )}
            {mode === "register" && (
              <label className="check">
                <input {...register("consent")} type="checkbox" required />
                <span>
                  {t("أوافق على", "I agree to the")}{" "}
                  <Link href="/privacy">
                    {t("سياسة الخصوصية", "privacy policy")}
                  </Link>
                </span>
              </label>
            )}
            <button className="button primary full" disabled={isSubmitting}>
              {isSubmitting
                ? t("جارٍ المتابعة…", "Working…")
                : mode === "login"
                  ? t("دخول إلى مساحتي", "Enter my hub")
                  : mode === "verify"
                    ? t("تأكيد البريد", "Verify email")
                    : mode === "register"
                      ? t("أنشئ حسابي", "Create my account")
                      : t("متابعة", "Continue")}
              <ArrowUpRight size={18} />
            </button>
            {mode === "login" && (
              <>
                <Link href="/auth/recover" className="small muted">
                  {t("نسيت كلمة المرور؟", "Forgot your password?")}
                </Link>
                <p className="small">
                  {t("أول زيارة لك؟", "New here?")}{" "}
                  <Link href="/auth/register" className="accent">
                    {t("أنشئ حسابك", "Create an account")}
                  </Link>
                </p>
              </>
            )}
            {mode === "register" && (
              <p className="small muted">
                {t(
                  "إنشاء الحساب لا يعني اعتماد عضوية النادي.",
                  "Creating an account does not approve club membership.",
                )}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
