"use client";
import { useEffect } from "react";
/** Apply keyboard focus behavior to dialogs rendered by the feature modules. */
export function useModalAccessibility() {
  useEffect(() => {
    let active: HTMLElement | null = null,
      previous: HTMLElement | null = null;
    const focusable = (node: HTMLElement) =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter((el) => el.offsetParent !== null);
    const sync = () => {
      const next = document.querySelector<HTMLElement>(".modal");
      if (next === active) return;
      if (!next) {
        previous?.focus();
        previous = null;
        active = null;
        document.body.style.overflow = "";
        return;
      }
      previous = document.activeElement as HTMLElement;
      active = next;
      active.setAttribute("role", "dialog");
      active.setAttribute("aria-modal", "true");
      active.tabIndex = -1;
      const title = active.querySelector("h2,h3");
      if (title) {
        title.id = "active-dialog-title";
        active.setAttribute("aria-labelledby", title.id);
      }
      document.body.style.overflow = "hidden";
      (focusable(active)[0] || active).focus();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === "Escape") {
        active
          .querySelector<HTMLButtonElement>(".modal-close,[data-close-dialog]")
          ?.click();
        event.preventDefault();
      }
      if (event.key === "Tab") {
        const nodes = focusable(active),
          first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          event.preventDefault();
          active.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === active)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", keyboard);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = "";
    };
  }, []);
}
