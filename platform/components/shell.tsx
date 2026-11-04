"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Globe,
  ArrowUpRight,
  Menu,
  X,
  Search,
  UserRound,
  Settings2,
} from "lucide-react";
import { useState } from "react";
import { useHub } from "./provider";
export function Shell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, dark, toggleTheme, me, content } = useHub(),
    path = usePathname(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const join = !!(content.settings.membership as { open?: boolean })?.open;
  const links = [
    ["/about", "النادي", "The club"],
    ["/events", "الفعاليات", "Events"],
    ["/library", "المكتبة", "Library"],
    ["/projects", "المشاريع", "Projects"],
    ["/competitions", "المسابقات", "Competitions"],
    ["/tools", "الأدوات", "Tools"],
  ];
  return (
    <>
      <a href="#main" className="skip">
        {t("تجاوز إلى المحتوى", "Skip to content")}
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="ASME NU">
          <Image
            unoptimized
            width={800}
            height={450}
            src="/brand/logo.png"
            alt="ASME Najran University"
          />
          <span>
            <strong>
              ASME <b>NU</b>
            </strong>
            <small>
              {t("نادي الهندسة الميكانيكية", "Mechanical Engineering Club")}
            </small>
          </span>
        </Link>
        <nav
          className={open ? "top-nav open" : "top-nav"}
          aria-label={t("التنقل الرئيسي", "Main navigation")}
        >
          {links.map(([url, ar, en]) => (
            <Link
              onClick={() => setOpen(false)}
              className={path.startsWith(url) ? "active" : ""}
              key={url}
              href={url}
            >
              {t(ar, en)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={setLang}
            aria-label={
              lang === "ar" ? "Switch to English" : "التبديل إلى العربية"
            }
          >
            <Globe size={17} />
            <span>{lang === "ar" ? "EN" : "ع"}</span>
          </button>
          <button
            className="icon-button"
            aria-label={t("تغيير المظهر", "Toggle theme")}
            onClick={toggleTheme}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            className="button compact secondary account-link"
            href={me ? "/portal" : "/auth/login"}
          >
            <UserRound size={16} />
            {me ? t("حسابي", "My hub") : t("دخول", "Sign in")}
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("القائمة", "Menu")}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer>
        <div className="footer-top">
          <div>
            <strong>
              ASME NU<span className="accent">.</span>
            </strong>
            <p>
              {t(
                "من الفكرة إلى الأثر الهندسي.",
                "From an idea to engineering impact.",
              )}
            </p>
            <small>
              {t(
                "نادي الهندسة الميكانيكية · جامعة نجران",
                "Mechanical Engineering Club · Najran University",
              )}
            </small>
          </div>
          <div>
            <Link href="/about">{t("عن النادي", "About")}</Link>
            <Link href="/careers">{t("الفرص المهنية", "Careers")}</Link>
            <Link href="/media">{t("المركز الإعلامي", "Media")}</Link>
            <Link href="/contact">{t("تواصل معنا", "Contact")}</Link>
            <Link href="/privacy">{t("الخصوصية", "Privacy")}</Link>
            {me &&
              [
                "SUPER_ADMIN",
                "CLUB_PRESIDENT",
                "EVENTS_MANAGER",
                "CONTENT_MANAGER",
                "COMMITTEE_LEADER",
              ].includes(me.role) && (
                <Link href="/admin">
                  <Settings2 size={14} />
                  {t("لوحة الإدارة", "Administration")}
                </Link>
              )}
          </div>
          <form action="/search" className="search-form">
            <Search size={17} />
            <input
              aria-label={t("البحث في المنصة", "Search the platform")}
              name="q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ابحث عن معرفة جديدة…", "Find something new…")}
            />
            <button aria-label={t("بحث", "Search")}>
              <ArrowUpRight size={18} />
            </button>
          </form>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ASME NU</span>
          <span>
            {t(
              "عضوية النادي الجامعي مستقلة عن عضوية ASME الدولية.",
              "Local club membership is separate from international ASME membership.",
            )}
          </span>
        </div>
      </footer>
      <nav
        className="bottom-dock glass"
        aria-label={t("الوصول السريع", "Quick navigation")}
      >
        <Link href="/" className={path === "/" ? "active" : ""}>
          {t("الرئيسية", "Home")}
        </Link>
        <Link href="/events" className={path === "/events" ? "active" : ""}>
          {t("الفعاليات", "Events")}
        </Link>
        {join && (
          <Link href="/join" className="dock-join">
            {t("انضم للنادي", "Join the club")}
            <ArrowUpRight size={15} />
          </Link>
        )}
        <Link href="/projects" className={path === "/projects" ? "active" : ""}>
          {t("المشاريع", "Projects")}
        </Link>
        <Link href="/portal" className={path === "/portal" ? "active" : ""}>
          {t("مساحتي", "My hub")}
        </Link>
      </nav>
    </>
  );
}
