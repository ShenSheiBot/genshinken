"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { GLOBAL_NAV_ITEMS } from "@/lib/navigation";
import { useArticleHeader } from "./ArticleHeader";
import CreditLinks from "./CreditLinks";

type Theme = "light" | "dark";
type MobileSection = { key: string; title: string; level: number };
type SectionRef = MobileSection & { el: HTMLElement; top: number; parentH2Key: string };

function ChevronIcon() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TopBar() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [activeHeadingKey, setActiveHeadingKey] = useState("");
  const [activeH2Key, setActiveH2Key] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<SectionRef[]>([]);
  const ah = useArticleHeader();
  const meta = ah?.meta ?? null;
  const revealed = !!(meta && ah?.revealed);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.style.colorScheme = next;
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute("content", next === "dark" ? "#131311" : "#e8e7e3");
      });
      try {
        localStorage.setItem("ub_theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (!meta) {
      sectionRefs.current = [];
      setSections([]);
      setActiveHeadingKey("");
      setActiveH2Key("");
      setSectionMenuOpen(false);
      return;
    }

    const body = document.querySelector(".art-body") as HTMLElement | null;
    if (!body) return;

    let raf = 0;
    let scrollRaf = 0;
    let alive = true;

    const syncActive = () => {
      if (!alive) return;
      const cursor = window.scrollY + Math.min(window.innerHeight * 0.36, 260);
      let activeHeading = "";
      let activeH2 = "";
      for (const item of sectionRefs.current) {
        if (item.top <= cursor) {
          activeHeading = item.key;
          if (item.level === 2) activeH2 = item.key;
          else activeH2 = item.parentH2Key;
        }
        else break;
      }
      setActiveHeadingKey(activeHeading);
      setActiveH2Key(activeH2);
    };

    const collectSections = () => {
      if (!alive) return;
      let parentH2Key = "";
      const next = Array.from(body.querySelectorAll<HTMLElement>("h2, h3, h4"))
        .filter((el) => !el.closest(".footnotes") && !el.closest(".source-notes"))
        .map((el, i) => {
          const level = Number(el.tagName[1]);
          if (!el.id) el.id = "section-" + (i + 1);
          if (level === 2) parentH2Key = el.id;
          return {
            key: el.id,
            title: (el.textContent || "").trim() || "章节 " + (i + 1),
            level,
            el,
            top: el.getBoundingClientRect().top + window.scrollY,
            parentH2Key,
          };
        });

      sectionRefs.current = next;
      setSections(next.map(({ key, title, level }) => ({ key, title, level })));
      syncActive();
    };

    const scheduleCollect = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(collectSections);
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(syncActive);
    };

    scheduleCollect();
    const ro = new ResizeObserver(scheduleCollect);
    ro.observe(body);
    ro.observe(document.documentElement);
    window.addEventListener("resize", scheduleCollect);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(scheduleCollect).catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      ro.disconnect();
      window.removeEventListener("resize", scheduleCollect);
      window.removeEventListener("scroll", onScroll);
    };
  }, [meta]);

  useEffect(() => {
    if (!sectionMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && headerRef.current?.contains(target)) return;
      setSectionMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSectionMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sectionMenuOpen]);

  useEffect(() => {
    if (!revealed) setSectionMenuOpen(false);
  }, [revealed]);

  const activeSectionTitle = useMemo(() => {
    return sections.find((item) => item.key === activeH2Key)?.title || meta?.title || "";
  }, [activeH2Key, meta?.title, sections]);

  const jumpToSection = (key: string) => {
    const item = sectionRefs.current.find((section) => section.key === key);
    if (!item) return;
    setSectionMenuOpen(false);
    const top = item.el.getBoundingClientRect().top + window.scrollY - 82;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <header className="topbar" data-revealed={revealed ? "true" : "false"} ref={headerRef}>
      <Link href="/" className="brand">
        <span className="blot" />
        <span className="brandName">{site.brandCN}</span>
      </Link>

      <div className="status">
        {!revealed ? (
          <nav className="global-section-nav" aria-label="全站导航">
            {GLOBAL_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="global-section-link">
                <strong>{item.label}</strong>
              </Link>
            ))}
          </nav>
        ) : meta ? (
          <div className="art-running">
            <span className="rt">{meta.title}</span>
            <div className="mobile-section-nav">
              <button
                type="button"
                className="mobile-section-trigger"
                aria-expanded={sectionMenuOpen}
                aria-controls="mobile-section-menu"
                disabled={sections.length === 0}
                onClick={() => setSectionMenuOpen((open) => !open)}
              >
                <span className="label">{activeSectionTitle}</span>
                <ChevronIcon />
              </button>
            </div>
            {meta.credits.length > 0 && (
              <CreditLinks className="rc" credits={meta.credits} />
            )}
          </div>
        ) : null}
      </div>

      <button className="toggle" onClick={toggle} aria-label="切换明暗主题" title="切换明暗主题">
        {mounted && theme === "dark" ? "☾" : "☼"}
      </button>

      {meta && sections.length > 0 && (
        <nav
          id="mobile-section-menu"
          className="mobile-section-menu"
          data-open={sectionMenuOpen ? "true" : "false"}
          aria-label="文章目录"
        >
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="mobile-section-item"
              data-level={section.level}
              data-active={section.key === activeHeadingKey ? "true" : "false"}
              data-current-h2={section.key === activeH2Key ? "true" : "false"}
              aria-current={section.key === activeHeadingKey ? "true" : undefined}
              onClick={() => jumpToSection(section.key)}
            >
              <span className="mark" aria-hidden="true" />
              <span className="title">{section.title}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
