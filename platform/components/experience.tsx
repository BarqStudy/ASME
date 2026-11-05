"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function BootScreen() {
  return (
    <div
      className="boot-screen"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل المنصة / Loading platform"
    >
      <div className="boot-intro" aria-hidden="true">
        <svg className="boot-gear" viewBox="0 0 100 100" fill="none">
          <path
            d="m43 7 14 0 2 10 7 3 9-5 10 10-5 9 3 7 10 2v14l-10 2-3 7 5 9-10 10-9-5-7 3-2 10H43l-2-10-7-3-9 5-10-10 5-9-3-7-10-2V43l10-2 3-7-5-9 10-10 9 5 7-3Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle
            cx="50"
            cy="50"
            r="17"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="50"
            r="29"
            stroke="currentColor"
            strokeOpacity=".25"
          />
        </svg>
        <strong>
          ASME <span>NU</span>
        </strong>
        <p className="boot-ar">نجهّز لك مساحة الإبداع</p>
        <p className="boot-en">Making room for your next idea</p>
      </div>
      <div className="boot-skeleton" aria-hidden="true">
        <div className="skeleton-header">
          <i />
          <div>
            <i />
            <i />
            <i />
          </div>
          <i />
        </div>
        <div className="skeleton-hero">
          <div>
            <i className="sk-label" />
            <i className="sk-title" />
            <i className="sk-title short" />
            <i />
            <i className="short" />
            <i className="sk-button" />
          </div>
          <div className="sk-art" />
        </div>
        <div className="skeleton-cards">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

export function Experience() {
  const path = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let onGear: () => void;
    const gear = document.querySelector(".gear-canvas");
    const inView = gear && gear.getBoundingClientRect().top < innerHeight;
    const gearReady =
      !inView || root.dataset.gearReady === "true"
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            onGear = resolve;
            window.addEventListener("asme:gear-ready", onGear, { once: true });
            timer = setTimeout(resolve, 2200); // WebGL failure never blocks the site.
          });
    const fontsReady = Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    const entrance = new Promise((resolve) =>
      setTimeout(resolve, root.dataset.boot === "intro" ? 600 : 0),
    );
    void Promise.all([gearReady, fontsReady, entrance]).then(() => {
      if (disposed) return;
      root.dataset.boot = "ready";
      try {
        sessionStorage.setItem("asme:entered", "1");
      } catch {
        /* Private browsing still supports refresh detection. */
      }
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("asme:gear-ready", onGear);
    };
  }, []);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-seen", "true");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    if (!reduced.matches)
      document
        .querySelectorAll(
          ".page-head, .event-card, .resource-card, .project-card, .form-block, .footer-top",
        )
        .forEach((el) => {
          el.setAttribute("data-reveal", "true");
          observer.observe(el);
        });
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = document.documentElement.scrollHeight - innerHeight;
        document.documentElement.style.setProperty(
          "--page-progress",
          String(height > 0 ? scrollY / height : 0),
        );
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [path]);
  return <div className="reading-progress" aria-hidden="true" />;
}
