"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { useArticleHeader } from "./ArticleHeader";

type Theme = "light" | "dark";
type MobileSection = { key: string; title: string; level: number };
type SectionRef = MobileSection & { el: HTMLElement; top: number; parentH2Key: string };

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.2 14.8A8.2 8.2 0 1 1 9.2 3.8a6.4 6.4 0 0 0 11 11z" />
    </svg>
  );
}

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
            title: (el.textContent || "").trim() || "Section " + (i + 1),
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
        {site.brandCN}
      </Link>

      <div className="status">
        {meta && (
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
              <span className="rc">
                {meta.credits.map((c, i) => (
                  <span key={i} className="credit">
                    <span className={"cmark " + (c.solid ? "solid" : "hollow")}>{c.mark}</span>
                    {c.name}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      <button className="toggle" onClick={toggle} aria-label="切换明暗主题" title="切换明暗主题">
        {mounted && theme === "dark" ? <MoonIcon /> : <SunIcon />}
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
