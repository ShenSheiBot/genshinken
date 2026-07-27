"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { site } from "@/lib/site";
import { GLOBAL_NAV_ITEMS, isReadingRoute } from "@/lib/navigation";
import { useArticleHeader } from "./ArticleHeader";
import CreditLinks from "./CreditLinks";
import { toggleTheme, useTheme } from "./useTheme";

type MobileSection = { key: string; title: string; level: number };
type SectionRef = MobileSection & { el: HTMLElement; top: number; parentH2Key: string };

const BACKGROUND_PROTOTYPE_ENABLED = process.env.NODE_ENV !== "production";
const BACKGROUND_VARIANTS = [
  { key: "prism", short: "A", label: "\u5149\u8c31\u6821\u51c6\u573a" },
  { key: "orbital", short: "B", label: "\u8f68\u9053\u4fe1\u53f7\u53f0" },
] as const;
const BACKGROUND_PROTOTYPE_STYLES = `
/* Local-only art-direction prototype. The data attribute is applied by the
   development switcher, so production surfaces retain their exact backgrounds. */
html[data-background-prototype] body {
  background-color: transparent;
  background-image: none;
}
html[data-background-prototype] .app {
  z-index: 1;
  background: transparent;
}
html[data-background-prototype] main#main:not(.reading-edition-page) {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--bg) 78%, transparent),
    color-mix(in srgb, var(--bg) 89%, transparent) 22%,
    color-mix(in srgb, var(--bg) 89%, transparent) 78%,
    color-mix(in srgb, var(--bg) 78%, transparent)
  ) !important;
}
html[data-background-prototype] main#main[data-reveal-zone="home"] {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--bg) 54%, transparent),
    color-mix(in srgb, var(--bg) 72%, transparent) 22%,
    color-mix(in srgb, var(--bg) 72%, transparent) 78%,
    color-mix(in srgb, var(--bg) 54%, transparent)
  ) !important;
}
html[data-background-prototype] main#main.reading-edition-page {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--bg) 84%, transparent),
    color-mix(in srgb, var(--bg) 97%, transparent) 29%,
    color-mix(in srgb, var(--bg) 97%, transparent) 71%,
    color-mix(in srgb, var(--bg) 84%, transparent)
  ) !important;
}
html[data-background-prototype] .foot {
  background: color-mix(in srgb, var(--bg) 84%, transparent);
}

@media (max-width: 760px) {
  html[data-background-prototype] main#main:not(.reading-edition-page),
  html[data-background-prototype] main#main.reading-edition-page {
    background: color-mix(in srgb, var(--bg) 91%, transparent) !important;
  }
}

@media (forced-colors: active), print {
  html[data-background-prototype] main#main,
  html[data-background-prototype] .foot {
    background: var(--bg) !important;
  }
}

.background-prototype-stage {
  --prototype-olive: #a7ad2c;
  --prototype-red: #d83a25;
  --prototype-cyan: #338fab;
  --prototype-yellow: #f2bd22;
  --prototype-line: color-mix(in srgb, var(--ink) 58%, transparent);
  --prototype-faint: color-mix(in srgb, var(--ink) 9%, transparent);
  position: fixed;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background-color: var(--bg);
  transition: background-color 240ms ease;
}
.background-prototype-stage > span {
  position: absolute;
  display: block;
  pointer-events: none;
}

.background-prototype-stage.prism {
  background-image:
    linear-gradient(90deg, transparent 0 calc(100% - 1px), var(--prototype-faint) calc(100% - 1px)),
    linear-gradient(0deg, transparent 0 calc(100% - 1px), var(--prototype-faint) calc(100% - 1px));
  background-size: var(--grid-step) var(--grid-step);
}
.background-prototype-stage.prism .background-prototype-field {
  top: 16vh;
  right: -8%;
  width: min(39vw, 560px);
  height: min(21vh, 188px);
  min-height: 132px;
  background: color-mix(in srgb, var(--prototype-olive) 36%, transparent);
  clip-path: polygon(11% 0, 100% 0, 100% 100%, 0 100%);
}
.background-prototype-stage.prism .background-prototype-axis-primary,
.background-prototype-stage.prism .background-prototype-axis-secondary {
  left: -9vw;
  width: min(92vw, 1340px);
  height: 1px;
  background: var(--prototype-line);
  transform: rotate(28deg);
  transform-origin: left center;
}
.background-prototype-stage.prism .background-prototype-axis-primary { top: 10vh; }
.background-prototype-stage.prism .background-prototype-axis-secondary { top: calc(10vh + 23px); opacity: 0.55; }
.background-prototype-stage.prism .background-prototype-spectrum {
  top: 28vh;
  left: clamp(250px, 39vw, 600px);
  width: clamp(170px, 18vw, 270px);
  height: 10px;
  background: linear-gradient(
    90deg,
    var(--prototype-cyan) 0 34%,
    var(--prototype-yellow) 34% 66%,
    var(--prototype-red) 66% 100%
  );
  transform: rotate(28deg) skewX(-17deg);
  transform-origin: left center;
}
.background-prototype-stage.prism .background-prototype-orbit-primary {
  top: 42vh;
  left: max(-310px, -22vw);
  width: clamp(520px, 57vw, 860px);
  aspect-ratio: 1;
  border: 1px solid var(--prototype-line);
  border-radius: 50%;
}
.background-prototype-stage.prism .background-prototype-orbit-primary::before,
.background-prototype-stage.prism .background-prototype-orbit-primary::after {
  position: absolute;
  content: "";
  border-radius: 50%;
}
.background-prototype-stage.prism .background-prototype-orbit-primary::before {
  inset: 15%;
  border: 1px solid color-mix(in srgb, var(--ink) 34%, transparent);
}
.background-prototype-stage.prism .background-prototype-orbit-primary::after {
  top: 31%;
  right: 2.5%;
  width: 18px;
  aspect-ratio: 1;
  background: var(--ink);
  box-shadow: 0 0 0 8px var(--bg);
}
.background-prototype-stage.prism .background-prototype-orbit-secondary {
  top: 68vh;
  left: 12%;
  width: 46vw;
  height: 1px;
  background: color-mix(in srgb, var(--ink) 40%, transparent);
  transform: rotate(-43deg);
  transform-origin: left center;
}
.background-prototype-stage.prism .background-prototype-tick-rail {
  top: 54vh;
  right: 40px;
  width: 96px;
  height: 27vh;
  min-height: 180px;
  border-right: 1px solid var(--prototype-line);
  background: repeating-linear-gradient(
    0deg,
    transparent 0 31px,
    color-mix(in srgb, var(--ink) 48%, transparent) 31px 32px
  );
  opacity: 0.72;
}
.background-prototype-stage.prism .background-prototype-signal {
  right: -14px;
  bottom: 0;
  width: 46px;
  height: 17vh;
  min-height: 112px;
  background: var(--prototype-olive);
  opacity: 0.82;
}

.background-prototype-stage.orbital {
  background-image:
    linear-gradient(90deg, transparent 0 72%, color-mix(in srgb, var(--ink) 14%, transparent) 72% 100%),
    linear-gradient(0deg, transparent 0 calc(100% - 1px), color-mix(in srgb, var(--ink) 8%, transparent) calc(100% - 1px));
  background-size: 100% 100%, 100% 118px;
}
.background-prototype-stage.orbital .background-prototype-field {
  top: 10vh;
  right: -9vw;
  width: min(58vw, 820px);
  height: 43vh;
  min-height: 310px;
  opacity: 0.44;
  background: var(--prototype-olive);
  clip-path: polygon(42% 0, 100% 0, 100% 100%, 0 100%);
}
.background-prototype-stage.orbital .background-prototype-orbit-primary {
  top: 8vh;
  right: clamp(-460px, -24vw, -250px);
  width: clamp(680px, 68vw, 1040px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle,
    transparent 0 69px,
    color-mix(in srgb, var(--ink) 29%, transparent) 69px 71px,
    transparent 71px 118px
  );
}
.background-prototype-stage.orbital .background-prototype-orbit-primary::before,
.background-prototype-stage.orbital .background-prototype-orbit-primary::after {
  position: absolute;
  content: "";
  border-radius: 50%;
}
.background-prototype-stage.orbital .background-prototype-orbit-primary::before {
  inset: 23%;
  border: 2px solid color-mix(in srgb, var(--prototype-olive) 76%, transparent);
}
.background-prototype-stage.orbital .background-prototype-orbit-primary::after {
  top: 13.5%;
  left: 31%;
  width: 24px;
  aspect-ratio: 1;
  background: var(--bg);
  border: 1px solid var(--ink);
  box-shadow: 0 0 0 5px var(--prototype-olive);
}
.background-prototype-stage.orbital .background-prototype-orbit-secondary {
  top: 40vh;
  right: -4vw;
  width: min(58vw, 780px);
  height: 1px;
  background: color-mix(in srgb, var(--ink) 52%, transparent);
  transform: rotate(-42deg);
  transform-origin: right center;
}
.background-prototype-stage.orbital .background-prototype-axis-primary,
.background-prototype-stage.orbital .background-prototype-axis-secondary {
  left: 0;
  width: 100%;
  height: 1px;
  background: color-mix(in srgb, var(--ink) 46%, transparent);
}
.background-prototype-stage.orbital .background-prototype-axis-primary { top: 57vh; }
.background-prototype-stage.orbital .background-prototype-axis-secondary { top: calc(57vh + 13px); opacity: 0.45; }
.background-prototype-stage.orbital .background-prototype-tick-rail {
  top: calc(57vh - 27px);
  left: 0;
  width: 68%;
  height: 54px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 79px,
    color-mix(in srgb, var(--ink) 46%, transparent) 79px 80px
  );
  border-top: 1px solid var(--prototype-line);
  border-bottom: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
}
.background-prototype-stage.orbital .background-prototype-spectrum {
  top: 8vh;
  left: 40px;
  width: 130px;
  height: 8px;
  background: linear-gradient(
    90deg,
    var(--prototype-cyan) 0 31%,
    var(--prototype-yellow) 31% 62%,
    var(--prototype-red) 62% 100%
  );
}
.background-prototype-stage.orbital .background-prototype-signal {
  bottom: 0;
  left: -3vw;
  width: min(43vw, 620px);
  height: 24vh;
  min-height: 170px;
  background: color-mix(in srgb, var(--ink) 91%, transparent);
  clip-path: polygon(0 0, 86% 0, 100% 37%, 83% 100%, 0 100%);
}

.background-prototype-switcher {
  position: fixed;
  z-index: 120;
  bottom: max(18px, env(safe-area-inset-bottom));
  left: 50%;
  display: grid;
  grid-template-columns: auto 38px minmax(154px, auto) 38px;
  align-items: center;
  min-height: 44px;
  overflow: hidden;
  color: #f4efd9;
  background: #141412;
  border: 1px solid rgb(244 239 217 / 36%);
  box-shadow: 0 10px 35px rgb(0 0 0 / 24%);
  font-family: var(--f-mono);
  transform: translateX(-50%);
}
.background-prototype-label {
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #141412;
  background: #a7ad2c;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.background-prototype-switcher button {
  align-self: stretch;
  color: inherit;
  font-size: 18px;
  transition: color 120ms ease, background 120ms ease;
}
.background-prototype-switcher button:hover,
.background-prototype-switcher button:focus-visible {
  color: #141412;
  background: #f4efd9;
  outline: none;
}
.background-prototype-switcher output {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 9px;
  padding: 0 13px;
  font-size: var(--text-caption);
  white-space: nowrap;
}
.background-prototype-switcher output b {
  color: #f2bd22;
  font-size: 13px;
}
.background-prototype-switcher output span { font-weight: 700; }
.app:has([role="dialog"][aria-modal="true"]) > .background-prototype-switcher {
  display: none;
}

html[data-theme="dark"] .background-prototype-stage {
  --prototype-olive: #bbc447;
  --prototype-red: #ef513b;
  --prototype-cyan: #54acc4;
  --prototype-yellow: #f7c943;
}

@media (prefers-reduced-motion: no-preference) {
  .background-prototype-stage.prism .background-prototype-orbit-primary::after {
    animation: calibration-pulse 18s ease-in-out infinite;
  }
  .background-prototype-stage.orbital .background-prototype-orbit-primary {
    animation: orbit-drift 160s linear infinite;
  }
}
@keyframes calibration-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.22); }
}
@keyframes orbit-drift { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .background-prototype-stage { position: absolute; }
  .background-prototype-stage.prism { background-size: 120px 120px; }
  .background-prototype-stage.prism .background-prototype-field {
    top: 14vh;
    right: -34%;
    width: 94vw;
    height: 16vh;
    min-height: 122px;
  }
  .background-prototype-stage.prism .background-prototype-axis-primary,
  .background-prototype-stage.prism .background-prototype-axis-secondary {
    left: -42vw;
    width: 140vw;
    transform: rotate(39deg);
  }
  .background-prototype-stage.prism .background-prototype-axis-primary { top: 9vh; }
  .background-prototype-stage.prism .background-prototype-axis-secondary { top: calc(9vh + 15px); }
  .background-prototype-stage.prism .background-prototype-spectrum {
    top: 23vh;
    left: 47vw;
    width: 150px;
    transform: rotate(39deg) skewX(-12deg);
  }
  .background-prototype-stage.prism .background-prototype-orbit-primary {
    top: 48vh;
    left: -58vw;
    width: 104vw;
  }
  .background-prototype-stage.prism .background-prototype-orbit-secondary,
  .background-prototype-stage.prism .background-prototype-tick-rail,
  .background-prototype-stage.prism .background-prototype-signal { display: none; }
  .background-prototype-stage.orbital .background-prototype-field {
    top: 11vh;
    right: -70vw;
    width: 138vw;
    height: 35vh;
  }
  .background-prototype-stage.orbital .background-prototype-orbit-primary {
    top: 17vh;
    right: -58vw;
    width: 116vw;
  }
  .background-prototype-stage.orbital .background-prototype-orbit-secondary,
  .background-prototype-stage.orbital .background-prototype-tick-rail { display: none; }
  .background-prototype-stage.orbital .background-prototype-spectrum {
    top: 7vh;
    left: 20px;
    width: 96px;
  }
  .background-prototype-stage.orbital .background-prototype-signal {
    left: -48vw;
    width: 118vw;
    height: 19vh;
    min-height: 150px;
    opacity: 0.84;
  }
  .background-prototype-switcher {
    grid-template-columns: 36px minmax(152px, auto) 36px;
    bottom: max(10px, env(safe-area-inset-bottom));
  }
  .background-prototype-label { display: none; }
}

@media (forced-colors: active), print {
  .background-prototype-stage,
  .background-prototype-switcher { display: none; }
}

`;
type BackgroundVariantKey = (typeof BACKGROUND_VARIANTS)[number]["key"];

function backgroundVariantFromValue(value: string | null): BackgroundVariantKey | null {
  return BACKGROUND_VARIANTS.some((variant) => variant.key === value)
    ? (value as BackgroundVariantKey)
    : null;
}

function isBackgroundEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
}

function BackgroundPrototype() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const requestedVariant = backgroundVariantFromValue(searchParams.get("variant"));
  const [variant, setVariant] = useState<BackgroundVariantKey>(requestedVariant ?? "prism");

  useLayoutEffect(() => {
    if (requestedVariant) {
      if (requestedVariant !== variant) setVariant(requestedVariant);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("variant", variant);
    window.history.replaceState(window.history.state, "", url);
  }, [pathname, requestedVariant, search, variant]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.backgroundPrototype = variant;
    return () => {
      if (root.dataset.backgroundPrototype === variant) {
        delete root.dataset.backgroundPrototype;
      }
    };
  }, [variant]);

  const selectVariant = useCallback((nextVariant: BackgroundVariantKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextVariant);
    window.history.replaceState(window.history.state, "", url);
    setVariant(nextVariant);
  }, []);

  const cycleVariant = useCallback((direction: -1 | 1) => {
    const currentIndex = BACKGROUND_VARIANTS.findIndex((item) => item.key === variant);
    const nextIndex = (currentIndex + direction + BACKGROUND_VARIANTS.length) % BACKGROUND_VARIANTS.length;
    selectVariant(BACKGROUND_VARIANTS[nextIndex].key);
  }, [selectVariant, variant]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || isBackgroundEditableTarget(event.target)
      ) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycleVariant(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        cycleVariant(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycleVariant]);

  const current = BACKGROUND_VARIANTS.find((item) => item.key === variant)
    ?? BACKGROUND_VARIANTS[0];

  return (
    <>
      <style>{BACKGROUND_PROTOTYPE_STYLES}</style>
      <div
        className={`background-prototype-stage ${variant}`}
        aria-hidden="true"
        data-site-background={variant}
      >
        <span className="background-prototype-field" />
        <span className="background-prototype-orbit-primary" />
        <span className="background-prototype-orbit-secondary" />
        <span className="background-prototype-axis-primary" />
        <span className="background-prototype-axis-secondary" />
        <span className="background-prototype-spectrum" />
        <span className="background-prototype-signal" />
        <span className="background-prototype-tick-rail" />
      </div>

      <nav
        className="background-prototype-switcher"
        aria-label={"\u5168\u7ad9\u80cc\u666f\u65b9\u6848\u5207\u6362\uff08\u672c\u5730\u539f\u578b\uff09"}
      >
        <span className="background-prototype-label">{"\u80cc\u666f\u539f\u578b"}</span>
        <button
          type="button"
          onClick={() => cycleVariant(-1)}
          aria-label={"\u4e0a\u4e00\u4e2a\u80cc\u666f\u65b9\u6848"}
        >
          {"\u2190"}
        </button>
        <output aria-live="polite">
          <b>{current.short}</b>
          <span>{current.label}</span>
        </output>
        <button
          type="button"
          onClick={() => cycleVariant(1)}
          aria-label={"\u4e0b\u4e00\u4e2a\u80cc\u666f\u65b9\u6848"}
        >
          {"\u2192"}
        </button>
      </nav>
    </>
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
  const pathname = usePathname();
  const theme = useTheme();
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [activeHeadingKey, setActiveHeadingKey] = useState("");
  const [activeH2Key, setActiveH2Key] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<SectionRef[]>([]);
  const previousPathnameRef = useRef<string | null>(null);
  const ah = useArticleHeader();
  const meta = ah?.meta ?? null;
  const revealed = !!(meta && ah?.revealed);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousPathname = previousPathnameRef.current;

    delete root.dataset.readingChromeEntry;
    if (
      previousPathname !== null
      && !isReadingRoute(previousPathname)
      && isReadingRoute(pathname)
    ) {
      root.dataset.readingChromeEntry = "route";
    }
    previousPathnameRef.current = pathname;

    return () => {
      delete root.dataset.readingChromeEntry;
    };
  }, [pathname]);

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
    <>
      {BACKGROUND_PROTOTYPE_ENABLED && (
        <Suspense fallback={null}>
          <BackgroundPrototype />
        </Suspense>
      )}

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

      <button className="toggle" onClick={toggleTheme} aria-label="切换明暗主题" title="切换明暗主题">
        {theme === "dark" ? "☾" : "☼"}
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

    </>
  );
}
