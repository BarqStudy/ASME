"use client";
import Link from "next/link";
import { ArrowUpRight, Mail, CalendarDays, ShieldCheck } from "lucide-react";
import { useHub } from "../components/provider";
export function PagesUnavailable({ contact = false }: { contact?: boolean }) {
  const { t, content } = useHub();
  const email = (content.settings.club as { email?: string })?.email;
  return (
    <section className="wrap section narrow">
      <div className="page-head">
        <span className="eyebrow">ASME NU</span>
        <h1>
          {contact
            ? t("نبقى على تواصل.", "Let’s stay connected.")
            : t("نلتقي قريبًا.", "Coming soon.")}
        </h1>
        <p>
          {contact
            ? t(
                "سننشر قنوات التواصل المعتمدة للنادي هنا.",
                "The club’s approved contact channels will appear here.",
              )
            : t(
                "التصفح والمكتبة والأدوات الهندسية متاحة الآن. سنعلن عن فتح الحسابات والتسجيل بعد تفعيل خدمات النادي.",
                "Explore the site, library, and engineering tools now. Accounts and registration will be announced when club services are activated.",
              )}
        </p>
      </div>
      <div className="glass resource-card">
        <ShieldCheck size={32} className="accent" />
        <h3>{t("خصوصيتك أولًا", "Your privacy comes first")}</h3>
        <p>
          {t(
            "لا يُستقبل أو يُحفظ أي طلب عضوية أو بيانات دخول عبر هذه الصفحة حاليًا.",
            "This page currently accepts and stores no membership applications or sign-in information.",
          )}
        </p>
        <div className="hero-buttons">
          {contact && email && !email.includes("example.") ? (
            <a href={`mailto:${email}`} className="button primary">
              <Mail size={17} />
              {t("راسل النادي", "Email the club")}
            </a>
          ) : (
            <Link href="/events" className="button primary">
              <CalendarDays size={17} />
              {t("استكشف الفعاليات", "Explore events")}
            </Link>
          )}
          <Link href="/tools" className="text-button">
            {t("جرّب الأدوات الهندسية", "Try the engineering tools")}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function PagesPrivacy() {
  const { t } = useHub();
  return (
    <section className="wrap section narrow">
      <div className="page-head">
        <span className="eyebrow">YOUR DATA</span>
        <h1>{t("خصوصيتك أولًا.", "Your privacy comes first.")}</h1>
        <p>
          {t(
            "هذه النسخة مخصصة للتصفح والتعلّم.",
            "This version is for browsing and learning.",
          )}
        </p>
      </div>
      <div className="glass resource-card prose">
        <p>
          {t(
            "لا تستقبل هذه النسخة طلبات عضوية أو بيانات دخول، ولا تحفظ أرقامًا جامعية أو سجلات حضور. الحسابات وخدمات التسجيل لم تُفتح بعد.",
            "This version accepts no membership applications or sign-in information and stores no university IDs or attendance records. Accounts and registration services are not open yet.",
          )}
        </p>
        <p>
          {t(
            "تُحفظ اللغة والمظهر فقط في متصفحك لتذكر تفضيلاتك. يمكنك حذفهما من بيانات الموقع في إعدادات المتصفح.",
            "Only language and appearance preferences are stored in your browser. You can remove them through your browser’s site-data settings.",
          )}
        </p>
        <p>
          {t(
            "الروابط الخارجية تفتح مواقع مستقلة تخضع لسياساتها الخاصة. يستضيف GitHub Pages هذا الموقع وفق سياسة خصوصية GitHub.",
            "External links open independent websites governed by their own policies. GitHub Pages hosts this site under GitHub’s privacy policy.",
          )}
        </p>
        <a
          className="text-button"
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
          target="_blank"
          rel="noreferrer"
        >
          {t("سياسة خصوصية GitHub", "GitHub privacy policy")}
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
