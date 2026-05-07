"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top progress bar + body cursor feedback during navigation.
 *   • Lights up the moment a same-origin link is clicked
 *   • Disappears as soon as the new route renders
 *   • Sets `cursor: wait` on the body so the entire UI signals "working"
 *
 * Why both: the bar tells you "something is loading", the cursor tells you
 * "stop clicking, I heard you". Together they prevent multi-click confusion.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // When the URL changes, the new page has rendered → hide the bar
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Listen for clicks on internal links to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Skip external, anchor, mail, tel
      if (/^(https?:|#|mailto:|tel:)/i.test(href)) return;
      if (link.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (typeof window !== "undefined") {
        const current = window.location.pathname + window.location.search;
        if (href === current) return;
      }

      setLoading(true);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Apply body-level cursor + class while loading so descendants can react
  useEffect(() => {
    if (loading) {
      document.body.classList.add("nav-loading");
    } else {
      document.body.classList.remove("nav-loading");
    }
    return () => document.body.classList.remove("nav-loading");
  }, [loading]);

  // Safety net — hide after 10s in case something hangs
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 10_000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-primary/10 print:hidden"
    >
      <div className="nav-progress-bar" />
    </div>
  );
}
