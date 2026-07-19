"use client";

// THROWAWAY READING PROTOTYPE — dossier desk, visual-line navigation and compact reading drawers.
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Credit } from "@/lib/posts";
import { site } from "@/lib/site";
import { GLOBAL_NAV_ITEMS } from "@/lib/navigation";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./reading-prototype.module.css";

type Variant = "dossier" | "folio";
type ReaderMode = "preview" | "edition";
type ReaderSize = "small" | "medium" | "large";
type ReaderFont = "serif" | "sans";
type ReferenceKind = "annotation" | "source";
type Sheet = "toc" | "settings" | ReferenceKind | null;
type TocItem = { id: string; title: string; level: number };
type TocNode = TocItem & { children: TocNode[] };
type ReferenceItem = {
  id: string;
  label: string;
  kind: ReferenceKind;
  index: number;
  html: string;
  previewHtml: string;
};
type ReferenceLink = { anchor: HTMLAnchorElement; target: HTMLElement; kind: ReferenceKind };
type ReferenceSurface = "desk" | "sheet";
type ReferenceVisit = { kind: ReferenceKind; id: string; label: string };
type FragmentLine = { center: number; width: number };
type DeskSlots = { left: HTMLElement; right: HTMLElement | null };

const variantMeta: Record<Variant, { short: string }> = {
  dossier: { short: "案卷" },
  folio: { short: "长卷" },
};

const LINE_OWNER = "p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,figcaption,td,th,dt,dd";
const LINE_SKIP = "script,style,noscript,template,svg,[hidden],[aria-hidden='true'],.footnotes,.source-notes";

function safeTarget(href: string): HTMLElement | null {
  if (!href.startsWith("#") || href.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(href.slice(1)));
  } catch {
    return document.getElementById(href.slice(1));
  }
}

function upperBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function visualAnchor(): number {
  const viewport = window.visualViewport;
  return (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) * 0.36;
}

function buildTocTree(items: TocItem[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  items.forEach((item) => {
    const node: TocNode = { ...item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop();
    // Root H3/H4 remain roots when the source starts at an irregular level.
    const parent = stack[stack.length - 1];
    if (parent && parent.level < node.level) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  });
  return roots;
}

function ancestorIds(nodes: TocNode[], target: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.id === target) return trail;
    const found = ancestorIds(node.children, target, [...trail, node.id]);
    if (found.length > 0) return found;
  }
  return [];
}

function roleLabel(mark: string): string {
  if (mark === "作") return "作者";
  if (mark === "译") return "译者";
  return mark;
}

function lineOwners(body: HTMLElement): Array<[HTMLElement, Text[]]> {
  const grouped = new Map<HTMLElement, Text[]>();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let raw = walker.nextNode(); raw; raw = walker.nextNode()) {
    const text = raw as Text;
    if (!text.data.trim()) continue;
    const parent = text.parentElement;
    if (!parent || parent.closest(LINE_SKIP)) continue;
    const owner = parent.closest<HTMLElement>(LINE_OWNER);
    if (!owner || !body.contains(owner)) continue;
    const list = grouped.get(owner);
    if (list) list.push(text);
    else grouped.set(owner, [text]);
  }
  return Array.from(grouped.entries());
}

function linesForOwner(owner: HTMLElement, nodes: Text[], body: HTMLElement): number[] {
  const style = getComputedStyle(owner);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
  const tolerance = Math.max(3, Math.min(18, lineHeight * 0.46));
  const fragments: FragmentLine[] = [];
  const bodyViewportTop = body.getBoundingClientRect().top;
  const ranges: Range[] = [];
  const precise = owner.querySelector(`${LINE_OWNER},img,svg,iframe,video,audio,canvas,[hidden],sup,sub,rt,rp`);

  if (!precise) {
    const range = document.createRange();
    range.selectNodeContents(owner);
    ranges.push(range);
  } else {
    nodes.forEach((node) => {
      if (node.parentElement?.closest("sup,sub,rt,rp,[hidden],[aria-hidden='true']")) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      ranges.push(range);
    });
  }

  ranges.forEach((range) => {
    Array.from(range.getClientRects()).forEach((rect) => {
      if (rect.width > 0.5 && rect.height > 0.5) {
        fragments.push({
          center: rect.top + rect.height / 2 - bodyViewportTop,
          width: rect.width,
        });
      }
    });
    range.detach();
  });
  fragments.sort((a, b) => a.center - b.center);

  const lines: FragmentLine[] = [];
  fragments.forEach((fragment) => {
    const last = lines[lines.length - 1];
    if (last && Math.abs(fragment.center - last.center) <= tolerance) {
      if (fragment.width > last.width) {
        last.center = fragment.center;
        last.width = fragment.width;
      }
    } else lines.push(fragment);
  });
  return lines.map((line) => line.center);
}

function sortLineCenters(values: number[]): number[] {
  // Equal baselines in separate table cells remain separate reading units.
  return values.sort((a, b) => a - b);
}

function toRoman(value: number): string {
  const pairs: Array<[number, string]> = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let remaining = value;
  let output = "";
  pairs.forEach(([amount, glyph]) => {
    while (remaining >= amount) {
      output += glyph;
      remaining -= amount;
    }
  });
  return output;
}

function referenceItem(target: HTMLElement, kind: ReferenceKind, index: number, label: string): ReferenceItem {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll<HTMLElement>("[id]").forEach((node) => node.removeAttribute("id"));
  clone
    .querySelectorAll("a[data-footnote-backref], a.source-backref, a[href^='#user-content-fnref'], a[href^='#source-ref-']")
    .forEach((node) => node.remove());
  const preview = clone.cloneNode(true) as HTMLElement;
  preview.querySelectorAll("p").forEach((paragraph) => {
    paragraph.replaceWith(...Array.from(paragraph.childNodes));
  });
  preview.normalize();
  return { id: target.id, label, kind, index, html: clone.innerHTML, previewHtml: preview.innerHTML };
}

export default function ReadingPrototypeChrome({
  title,
  slug,
  variant,
  credits,
  fallbackAuthor,
  mode = "preview",
}: {
  title: string;
  slug: string;
  variant: Variant;
  credits: Credit[];
  fallbackAuthor: string;
  /** The public edition keeps the reader chrome but removes preview controls. */
  mode?: ReaderMode;
}) {
  const isEdition = mode === "edition";
  const router = useRouter();
  const pathname = usePathname();
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [expandedToc, setExpandedToc] = useState<Set<string>>(() => new Set());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [readerSize, setReaderSize] = useState<ReaderSize>("medium");
  const [readerFont, setReaderFont] = useState<ReaderFont>("serif");
  const [dark, setDark] = useState(false);
  const [desktopDesk, setDesktopDesk] = useState(false);
  const [slots, setSlots] = useState<DeskSlots | null>(null);
  const [annotations, setAnnotations] = useState<ReferenceItem[]>([]);
  const [sources, setSources] = useState<ReferenceItem[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState("");
  const [activeSourceId, setActiveSourceId] = useState("");
  const [referenceTrail, setReferenceTrail] = useState<ReferenceVisit[]>([]);
  const [lineCount, setLineCount] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [lineDraft, setLineDraft] = useState("");

  const tocRef = useRef<TocItem[]>([]);
  const bodyRef = useRef<HTMLElement | null>(null);
  const lineCentersRef = useRef<number[]>([]);
  const referenceLinksRef = useRef<ReferenceLink[]>([]);
  const annotationRef = useRef<ReferenceItem[]>([]);
  const sourceRef = useRef<ReferenceItem[]>([]);
  const lastNoteAnchor = useRef<HTMLAnchorElement | null>(null);
  const lastSheetTrigger = useRef<HTMLElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);

  const tocTree = useMemo(() => buildTocTree(toc), [toc]);
  const currentSection = useMemo(
    () => toc.find((item) => item.id === activeId)?.title || "导读",
    [activeId, toc]
  );
  const progress = lineCount > 0 ? currentLine / lineCount : 0;
  const pct = Math.round(progress * 100);
  const sheetOpen = sheet !== null;
  const previousReference = referenceTrail.at(-1);

  const setVariant = useCallback((next: Variant) => {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const savedSize = localStorage.getItem("ub_reader_size");
    const size: ReaderSize = savedSize === "small" || savedSize === "large" ? savedSize : "medium";
    const savedFont = localStorage.getItem("ub_reader_font");
    const font: ReaderFont = savedFont === "sans" ? "sans" : "serif";
    setReaderSize(size);
    setReaderFont(font);
    document.documentElement.dataset.readerSize = size;
    document.documentElement.dataset.readerFont = font;
    setDark(document.documentElement.dataset.theme === "dark");
    return () => {
      delete document.documentElement.dataset.readerSize;
      delete document.documentElement.dataset.readerFont;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      const next = media.matches && variant === "dossier";
      setDesktopDesk(next);
      if (next) setSheet(null);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [variant]);

  useEffect(() => {
    const left = document.getElementById("reading-left-rail");
    const right = document.getElementById("reading-right-rail");
    setSlots(left ? { left, right } : null);
  }, [variant]);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".reading-prototype-body");
    if (!body) return;
    bodyRef.current = body;

    const headings = Array.from(body.querySelectorAll<HTMLElement>("h1, h2, h3, h4")).map((heading, index) => {
      if (!heading.id) heading.id = `reading-section-${index + 1}`;
      return { id: heading.id, title: (heading.textContent || `第 ${index + 1} 节`).trim(), level: Number(heading.tagName.slice(1)) };
    });
    tocRef.current = headings;
    setToc(headings);

    const links: ReferenceLink[] = [];
    const labels = new Map<string, string>();
    body.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      const target = safeTarget(anchor.getAttribute("href") || "");
      if (!target?.closest(".footnotes, .source-notes")) return;
      const kind: ReferenceKind = target.closest(".source-notes") ? "source" : "annotation";
      links.push({ anchor, target, kind });
      if (!labels.has(target.id)) labels.set(target.id, (anchor.textContent || "").trim());
    });
    referenceLinksRef.current = links;

    const annotationItems = Array.from(document.querySelectorAll<HTMLElement>(".reading-prototype-appendix .footnotes li")).map((target, index) => {
      if (!target.id) target.id = `reading-annotation-${index + 1}`;
      return referenceItem(target, "annotation", index, labels.get(target.id) || String(index + 1));
    });
    const sourceItems = Array.from(document.querySelectorAll<HTMLElement>(".reading-prototype-appendix .source-notes li")).map((target, index) => {
      if (!target.id) target.id = `reading-source-${index + 1}`;
      return referenceItem(target, "source", index, labels.get(target.id) || toRoman(index + 1));
    });
    annotationRef.current = annotationItems;
    sourceRef.current = sourceItems;
    setAnnotations(annotationItems);
    setSources(sourceItems);
    setActiveAnnotationId((current) => current || annotationItems[0]?.id || "");
    setActiveSourceId((current) => current || sourceItems[0]?.id || "");

    return () => { bodyRef.current = null; };
  }, [variant]);

  const syncReadingPosition = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const cursor = window.scrollY + visualAnchor();
    const bodyTop = body.getBoundingClientRect().top + window.scrollY;
    const centers = lineCentersRef.current;
    const line = centers.length ? Math.min(centers.length, upperBound(centers, cursor - bodyTop)) : 0;
    setCurrentLine((current) => current === line ? current : line);

    let headingId = "";
    for (const item of tocRef.current) {
      const element = document.getElementById(item.id);
      if (element && element.getBoundingClientRect().top <= visualAnchor()) headingId = item.id;
    }
    setActiveId((current) => current === headingId ? current : headingId);
  }, []);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncReadingPosition);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [syncReadingPosition]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let generation = 0;
    let frame = 0;
    let debounce = 0;
    const measure = () => {
      const token = ++generation;
      const owners = lineOwners(body);
      const values: number[] = [];
      let index = 0;
      const pump = () => {
        if (token !== generation) return;
        const deadline = performance.now() + 8;
        do {
          const owner = owners[index++];
          if (owner) values.push(...linesForOwner(owner[0], owner[1], body));
        } while (index < owners.length && performance.now() < deadline);
        if (index < owners.length) frame = requestAnimationFrame(pump);
        else {
          const centers = sortLineCenters(values);
          lineCentersRef.current = centers;
          setLineCount(centers.length);
          syncReadingPosition();
        }
      };
      frame = requestAnimationFrame(pump);
    };
    const schedule = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(measure, 110);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(body);
    const images = Array.from(body.querySelectorAll("img"));
    images.forEach((image) => image.addEventListener("load", schedule));
    document.fonts?.addEventListener("loadingdone", schedule);
    measure();
    return () => {
      generation += 1;
      cancelAnimationFrame(frame);
      window.clearTimeout(debounce);
      resize.disconnect();
      images.forEach((image) => image.removeEventListener("load", schedule));
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [readerFont, readerSize, syncReadingPosition, variant]);

  useEffect(() => {
    const ancestors = ancestorIds(tocTree, activeId);
    if (ancestors.length === 0) return;
    setExpandedToc((current) => {
      const next = new Set(current);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [activeId, tocTree]);

  const scrollReferenceIntoView = useCallback((surface: ReferenceSurface, kind: ReferenceKind, id: string) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const scope = surface === "sheet" ? sheetRef.current : document.getElementById("reading-right-rail");
      const node = scope?.querySelector<HTMLElement>(`[data-reference-kind="${kind}"][data-reference-id="${CSS.escape(id)}"]`);
      const scroller = node?.parentElement;
      if (!node || !scroller) return;
      const itemRect = node.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      if (itemRect.top < scrollerRect.top) scroller.scrollTop += itemRect.top - scrollerRect.top;
      else if (itemRect.bottom > scrollerRect.bottom) scroller.scrollTop += itemRect.bottom - scrollerRect.bottom;
    }));
  }, []);

  const selectReference = useCallback((kind: ReferenceKind, id: string, surface: ReferenceSurface = "desk") => {
    if (kind === "annotation") setActiveAnnotationId(id);
    else setActiveSourceId(id);
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
    );
    scrollReferenceIntoView(surface, kind, id);
  }, [scrollReferenceIntoView]);

  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const link = referenceLinksRef.current.find((item) => item.target.id === hash);
    if (!link) return;
    selectReference(link.kind, hash, desktopDesk ? "desk" : "sheet");
    if (!desktopDesk) {
      setReferenceTrail([]);
      setSheet(link.kind);
    }
  }, [annotations, desktopDesk, selectReference, sources]);

  const activateReference = useCallback((anchor: HTMLAnchorElement, target: HTMLElement) => {
    const kind: ReferenceKind = target.closest(".source-notes") ? "source" : "annotation";
    lastNoteAnchor.current = anchor;
    setReferenceTrail([]);
    selectReference(kind, target.id, desktopDesk ? "desk" : "sheet");
    if (!desktopDesk) setSheet(kind);
  }, [desktopDesk, selectReference]);

  useEffect(() => {
    const flow = document.querySelector<HTMLElement>(".reading-prototype-flow");
    if (!flow) return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || !flow.contains(anchor)) return;
      const target = safeTarget(anchor.getAttribute("href") || "");
      if (!target?.closest(".footnotes, .source-notes")) return;
      event.preventDefault();
      activateReference(anchor, target);
    };
    flow.addEventListener("click", onClick);
    return () => flow.removeEventListener("click", onClick);
  }, [activateReference]);

  const followSheetReference = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const target = safeTarget(anchor.getAttribute("href") || "");
    if (!target?.closest(".footnotes, .source-notes")) return;

    event.preventDefault();
    event.stopPropagation();
    const nextKind: ReferenceKind = target.closest(".source-notes") ? "source" : "annotation";
    const currentKind = sheet === "source" ? "source" : "annotation";
    const currentId = currentKind === "annotation" ? activeAnnotationId : activeSourceId;
    const currentItems = currentKind === "annotation" ? annotationRef.current : sourceRef.current;
    const currentLabel = currentItems.find((item) => item.id === currentId)?.label || currentId;
    setReferenceTrail((trail) => [...trail, { kind: currentKind, id: currentId, label: currentLabel }]);
    setSheet(nextKind);
    selectReference(nextKind, target.id, "sheet");
  }, [activeAnnotationId, activeSourceId, selectReference, sheet]);

  const returnToPreviousReference = useCallback(() => {
    const previous = referenceTrail.at(-1);
    if (!previous) return;
    setReferenceTrail((trail) => trail.slice(0, -1));
    setSheet(previous.kind);
    selectReference(previous.kind, previous.id, "sheet");
  }, [referenceTrail, selectReference]);

  const closeSheet = useCallback(() => {
    const hadSheet = sheet !== null;
    const wasReference = sheet === "annotation" || sheet === "source";
    setSheet(null);
    if (wasReference) {
      setReferenceTrail([]);
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
    }
    if (hadSheet) {
      requestAnimationFrame(() => (lastNoteAnchor.current || lastSheetTrigger.current)?.focus());
    }
  }, [sheet]);

  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => sheetCloseRef.current?.focus());
    return () => { document.body.style.overflow = previous; };
  }, [sheetOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sheet) {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key === "Tab" && sheet) {
        const dialog = sheetRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )).filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !dialog.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (isEdition || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, a, button, summary, [contenteditable='true']")) return;
      event.preventDefault();
      setVariant(variant === "dossier" ? "folio" : "dossier");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSheet, isEdition, setVariant, sheet, variant]);

  const openSheet = (next: Exclude<Sheet, null>, trigger?: HTMLElement) => {
    if (trigger) lastSheetTrigger.current = trigger;
    if (next !== "annotation" && next !== "source") lastNoteAnchor.current = null;
    setReferenceTrail([]);
    setSheet(next);
  };

  const jumpToHeading = (id: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }));
  };

  const jumpToLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = bodyRef.current;
    const centers = lineCentersRef.current;
    const requested = Number.parseInt(lineDraft, 10);
    if (!body || centers.length === 0 || !Number.isFinite(requested)) return;
    const line = Math.max(1, Math.min(centers.length, requested));
    setLineDraft(String(line));
    const bodyTop = body.getBoundingClientRect().top + window.scrollY;
    const target = bodyTop + centers[line - 1] - visualAnchor();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
    }));
  };

  const stepReference = (kind: ReferenceKind, delta: number, surface: ReferenceSurface = "desk") => {
    const items = kind === "annotation" ? annotationRef.current : sourceRef.current;
    const active = kind === "annotation" ? activeAnnotationId : activeSourceId;
    if (items.length === 0) return;
    const index = Math.max(0, items.findIndex((item) => item.id === active));
    const next = items[(index + delta + items.length) % items.length];
    selectReference(kind, next.id, surface);
  };

  const viewReferenceAtEnd = (kind: ReferenceKind) => {
    const id = kind === "annotation" ? activeAnnotationId : activeSourceId;
    const target = document.getElementById(id);
    const details = target?.closest("details");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (details) details.open = true;
    closeSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }));
  };

  const toggleToc = (id: string) => {
    setExpandedToc((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTocNode = (node: TocNode, path: string, depth: number, rootIndex: number) => {
    const hasChildren = node.children.length > 0;
    const expanded = expandedToc.has(node.id);
    const childrenId = `toc-children-${path}`;
    return (
      <div className={styles.tocBranch} key={node.id} data-depth={depth}>
        <div className={styles.tocRow} data-active={node.id === activeId ? "true" : "false"}>
          {hasChildren ? (
            <button type="button" className={styles.tocDisclosure} aria-label={`${expanded ? "折叠" : "展开"}${node.title}的下级标题`} aria-expanded={expanded} aria-controls={childrenId} onClick={() => toggleToc(node.id)}>
              {expanded ? "−" : "+"}
            </button>
          ) : <span className={styles.tocDisclosurePlaceholder} />}
          <button type="button" className={styles.tocJump} aria-current={node.id === activeId ? "location" : undefined} onClick={() => jumpToHeading(node.id)}>
            <span>{depth === 0 ? String(rootIndex + 1).padStart(2, "0") : "↳"}</span>
            <b>{node.title}</b>
          </button>
        </div>
        {hasChildren && (
          <div id={childrenId} className={styles.tocChildren} hidden={!expanded}>
            {node.children.map((child, index) => renderTocNode(child, `${path}-${index}`, depth + 1, rootIndex))}
          </div>
        )}
      </div>
    );
  };

  const lineNavigator = (
    <form className={styles.lineNavigator} onSubmit={jumpToLine} aria-label="按正文视觉行跳转">
      <div className={styles.lineNumbers}>
        <span>本版阅读进度</span>
        <strong>{currentLine.toLocaleString("zh-CN")}<small> / {lineCount.toLocaleString("zh-CN")} 行</small></strong>
      </div>
      <span className={styles.lineTrack} aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
      <div className={styles.lineJump}>
        <label><span>跳至</span><input type="text" inputMode="numeric" pattern="[0-9]*" value={lineDraft} placeholder={currentLine ? String(currentLine) : "行数"} aria-label={`跳转到正文行，共 ${lineCount} 行`} onChange={(event) => setLineDraft(event.target.value.replace(/\D/g, ""))} disabled={lineCount === 0} /><span>行</span></label>
        <button type="submit" disabled={lineCount === 0 || lineDraft.length === 0} aria-label="跳转到输入行">→</button>
      </div>
      <small>当前字号、字族与视口下的视觉行</small>
    </form>
  );

  const tocPanel = (
    <nav className={styles.tocPanel} aria-label="文章目录">
      <header><b>目录</b></header>
      <div className={`${styles.tocViewport} ${styles.styledScroller}`}>
        {tocTree.length === 0 ? <p className={styles.emptyRail}>本文没有分节标题，可按视觉行定位。</p> : tocTree.map((node, index) => renderTocNode(node, String(index), 0, index))}
      </div>
      <a className={styles.toTop} href="#reading-cover">↑ 返回篇首</a>
    </nav>
  );

  const compactCredits = (
    <section className={styles.compactCredits}>
      <span className={styles.eyebrow}>署名</span>
      <dl>
        {credits.length > 0 ? credits.map((credit) => (
          <div key={`${credit.role}-${credit.contributorId}`}>
            <dt>{roleLabel(credit.mark)}</dt>
            <dd><CreditLinks credits={[credit]} showMarks={false} /></dd>
          </div>
        )) : (
          <div><dt>作者</dt><dd>{fallbackAuthor || `${site.brandCN}编辑部`}</dd></div>
        )}
      </dl>
    </section>
  );

  const referencePane = (kind: ReferenceKind, compact = false) => {
    const items = kind === "annotation" ? annotations : sources;
    const active = kind === "annotation" ? activeAnnotationId : activeSourceId;
    const heading = kind === "annotation" ? "注释" : "文献";
    return (
      <section className={styles.referencePane} data-kind={kind} data-compact={compact ? "true" : "false"}>
        {!compact && <header><b>{heading}</b><strong>{items.length.toLocaleString("zh-CN")}</strong></header>}
        <div className={`${styles.referenceScroller} ${styles.styledScroller}`} onClick={compact ? followSheetReference : undefined}>
          {items.length === 0 ? <p className={styles.emptyRail}>本文没有{heading}。</p> : items.map((item) => {
            const selected = item.id === active;
            return (
              <article id={`reading-reference-${kind}-${item.index}`} key={item.id} className={styles.referenceItem} data-reference-kind={kind} data-reference-id={item.id} data-active={selected ? "true" : "false"}>
                <button type="button" className={styles.referenceSelect} aria-expanded={selected} aria-current={selected ? "true" : undefined} onClick={() => selectReference(kind, item.id, compact ? "sheet" : "desk")}><span>{item.label}</span>{!selected && <span className={styles.referencePreview} dangerouslySetInnerHTML={{ __html: item.previewHtml }} />}</button>
                {selected && <div className={styles.referenceDetail} dangerouslySetInnerHTML={{ __html: item.html }} />}
              </article>
            );
          })}
        </div>
        {items.length > 0 && <footer><button type="button" onClick={() => stepReference(kind, -1, compact ? "sheet" : "desk")}>← 上一条</button><button type="button" onClick={() => viewReferenceAtEnd(kind)}>查看文末</button><button type="button" onClick={() => stepReference(kind, 1, compact ? "sheet" : "desk")}>下一条 →</button></footer>}
      </section>
    );
  };

  const articleIdentity = (
    <section className={styles.articleIdentity} aria-live="polite">
      <span className={styles.eyebrow}>当前阅读</span>
      <b title={title}>{title}</b>
      <span className={styles.currentSectionLabel}>当前章节</span>
      <p>{currentSection}</p>
    </section>
  );
  const leftDesk = <div className={styles.leftDeskRail}>{articleIdentity}{compactCredits}{lineNavigator}{tocPanel}</div>;
  const referencePaneCount = Number(annotations.length > 0) + Number(sources.length > 0);
  const rightDesk = referencePaneCount > 0 ? (
    <div className={styles.referenceRail} data-count={referencePaneCount}>
      {annotations.length > 0 && referencePane("annotation")}
      {sources.length > 0 && referencePane("source")}
    </div>
  ) : null;
  const portalDesk = desktopDesk && slots ? (
    <>
      {createPortal(leftDesk, slots.left)}
      {rightDesk && slots.right && createPortal(rightDesk, slots.right)}
    </>
  ) : null;

  const updateSize = (size: ReaderSize) => {
    setReaderSize(size);
    document.documentElement.dataset.readerSize = size;
    localStorage.setItem("ub_reader_size", size);
  };
  const updateFont = (font: ReaderFont) => {
    setReaderFont(font);
    document.documentElement.dataset.readerFont = font;
    localStorage.setItem("ub_reader_font", font);
  };
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.dataset.theme = next;
    // 与 TopBar 权威切换 / 首屏 bootstrap 保持一致：同步原生 color-scheme 与 theme-color，
    // 否则阅读页（生产主模板）切深色后滚动条/表单控件仍按 light 渲染、移动端地址栏色不变。
    root.style.colorScheme = next;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) =>
      meta.setAttribute("content", next === "dark" ? "#131311" : "#e8e7e3")
    );
    localStorage.setItem("ub_theme", next);
    setDark(next === "dark");
  };

  return (
    <>
      {portalDesk}
      <header className={styles.runningHeader}>
        <Link href={isEdition ? "/" : "/prototype/poster"} className={styles.runningBrand} aria-label={`返回${site.brandCN}首页`}><i /><span className={styles.runningBrandName}>{site.brandCN}</span></Link>
        <nav className={styles.runningSections} aria-label="全站导航">
          {GLOBAL_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.runningSectionLink}>
              <b>{item.label}</b>
            </Link>
          ))}
        </nav>
        <button className={styles.mobileSectionButton} type="button" onClick={(event) => openSheet("toc", event.currentTarget)} aria-label={`文章目录：${currentSection}`} aria-haspopup="dialog" aria-expanded={sheet === "toc"}><span>{currentSection}</span><b>⌄</b></button>
        <div className={styles.runningTools}>
          <button className={styles.compactTocButton} type="button" onClick={(event) => openSheet("toc", event.currentTarget)} aria-haspopup="dialog" aria-expanded={sheet === "toc"}>目录</button>
          <button type="button" onClick={(event) => openSheet("settings", event.currentTarget)} aria-label="阅读设置">字</button>
          <button className={styles.themeButton} type="button" onClick={toggleTheme} aria-label="切换明暗主题">{dark ? "☾" : "☼"}</button>
        </div>
        <span className={styles.topRule} aria-hidden="true">
          <span className={styles.topProgress} style={{ width: `${pct}%` }} />
        </span>
      </header>

      {sheet && (
        <div className={styles.sheetLayer} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeSheet(); }}>
          <section ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" tabIndex={-1} aria-label={sheet === "toc" ? "文章目录" : sheet === "settings" ? "阅读设置" : sheet === "annotation" ? "文章注释" : "文章文献"}>
            <div className={styles.sheetHandle} />
            <header className={styles.sheetHeader}>
              <div className={styles.sheetHeading}>
                {previousReference && (sheet === "annotation" || sheet === "source") && <button type="button" className={styles.referenceBack} onClick={returnToPreviousReference}>← 返回{previousReference.kind === "annotation" ? "注释" : "文献"} {previousReference.label}</button>}
                <div><h2>{sheet === "toc" ? "文章目录" : sheet === "settings" ? "阅读设置" : sheet === "annotation" ? "注释" : "文献"}</h2></div>
              </div>
              <div className={styles.sheetHeaderActions}>
                {(sheet === "annotation" || sheet === "source") && <strong>{(sheet === "annotation" ? annotations : sources).length.toLocaleString("zh-CN")}</strong>}
                <button ref={sheetCloseRef} type="button" onClick={closeSheet} aria-label="关闭">×</button>
              </div>
            </header>
            {sheet === "toc" ? <>
              <nav className={styles.sheetSiteNav} aria-label="全站导航">
                {GLOBAL_NAV_ITEMS.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
              </nav>
              {lineNavigator}
              {tocPanel}
            </> : sheet === "annotation" ? referencePane("annotation", true) : sheet === "source" ? referencePane("source", true) : (
              <>
                <section className={styles.settingGroup}>
                  <span>字族</span>
                  <div className={styles.fontChooser}>
                    <button type="button" data-active={readerFont === "serif"} onClick={() => updateFont("serif")}><b className={styles.serifSample}>字</b><span>衬线</span></button>
                    <button type="button" data-active={readerFont === "sans"} onClick={() => updateFont("sans")}><b className={styles.sansSample}>字</b><span>无衬线</span></button>
                  </div>
                </section>
                <section className={styles.settingGroup}><span>字号</span><div className={styles.sizeChooser}>{(["small", "medium", "large"] as const).map((size, index) => <button key={size} type="button" data-active={size === readerSize} onClick={() => updateSize(size)}><b style={{ fontSize: `${15 + index * 4}px` }}>字</b><span>{["小", "中", "大"][index]}</span></button>)}</div></section>
                <button className={styles.themeChoice} type="button" onClick={toggleTheme}><span>{dark ? "☾" : "☼"}</span><b>{dark ? "切换到浅色" : "切换到深色"}</b><i>→</i></button>
              </>
            )}
          </section>
        </div>
      )}

      {!isEdition && <aside className={styles.prototypeSwitcher} aria-label="正文原型切换器"><span>原型</span><Link href={`/posts/${encodeURIComponent(slug)}`}>现有正文</Link>{(Object.keys(variantMeta) as Variant[]).map((key, index) => <button key={key} type="button" data-active={key === variant} onClick={() => setVariant(key)}>{String(index + 1).padStart(2, "0")} {variantMeta[key].short}</button>)}</aside>}
    </>
  );
}
