"use client";

// THROWAWAY READING PROTOTYPE — dossier desk, visual-line navigation and compact reading drawers.
import type { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
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
type LineMarker = { line: number; top: number };
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

function activeBranchIds(nodes: TocNode[], target: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.id === target) return node.children.length > 0 ? [...trail, node.id] : trail;
    const found = activeBranchIds(node.children, target, [...trail, node.id]);
    if (found.length > 0) return found;
  }
  return [];
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

function snapReferenceScrollerLine(scroller: HTMLElement): void {
  if (scroller.scrollTop <= 1 || scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 1) return;
  const scrollerRect = scroller.getBoundingClientRect();
  const visibleItems = Array.from(scroller.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) return false;
    const rect = child.getBoundingClientRect();
    return rect.bottom > scrollerRect.top - 36 && rect.top < scrollerRect.top + 72;
  });
  const lineRects: DOMRect[] = [];
  visibleItems.forEach((item) => {
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    for (let raw = walker.nextNode(); raw; raw = walker.nextNode()) {
      const text = raw as Text;
      if (!text.data.trim() || text.parentElement?.closest("[hidden], [aria-hidden='true']")) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      Array.from(range.getClientRects()).forEach((rect) => {
        if (rect.width > 0.5 && rect.height > 0.5 && rect.bottom > scrollerRect.top - 2 && rect.top < scrollerRect.top + 72) {
          lineRects.push(rect);
        }
      });
      range.detach();
    }
  });
  lineRects.sort((a, b) => a.top - b.top);
  const firstWholeLine = lineRects.find((rect) => rect.top >= scrollerRect.top - 0.5);
  if (!firstWholeLine) return;
  const delta = firstWholeLine.top - scrollerRect.top;
  if (Math.abs(delta) < 0.75 || delta > Math.max(30, firstWholeLine.height * 1.55)) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: reduce ? "auto" : "smooth" });
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
  const [editingLine, setEditingLine] = useState(false);
  const [editingReference, setEditingReference] = useState<ReferenceKind | null>(null);
  const [referenceDraft, setReferenceDraft] = useState("");
  const [lineMarkers, setLineMarkers] = useState<LineMarker[]>([]);
  const [lineMarkerHost, setLineMarkerHost] = useState<HTMLElement | null>(null);

  const tocRef = useRef<TocItem[]>([]);
  const bodyRef = useRef<HTMLElement | null>(null);
  const lineCentersRef = useRef<number[]>([]);
  const referenceSnapSuppressedUntilRef = useRef(new WeakMap<HTMLElement, number>());
  const lineInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const referenceLinksRef = useRef<ReferenceLink[]>([]);
  const annotationRef = useRef<ReferenceItem[]>([]);
  const sourceRef = useRef<ReferenceItem[]>([]);
  const lastNoteAnchor = useRef<HTMLAnchorElement | null>(null);
  const lastSheetTrigger = useRef<HTMLElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const directReferencePositionRef = useRef<{
    button: HTMLButtonElement;
    scrollTop: number;
    pageX: number;
    pageY: number;
  } | null>(null);

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
    setLineMarkerHost(body.parentElement);

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

    return () => {
      bodyRef.current = null;
      setLineMarkerHost(null);
    };
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
    const timers = new Map<HTMLElement, number>();
    const scheduleReferenceSnap = (event: Event) => {
      const scroller = event.target;
      if (!(scroller instanceof HTMLElement) || !scroller.matches("[data-reference-scroller]")) return;
      const current = timers.get(scroller);
      if (current) window.clearTimeout(current);
      timers.set(scroller, window.setTimeout(() => {
        timers.delete(scroller);
        if (performance.now() < (referenceSnapSuppressedUntilRef.current.get(scroller) ?? 0)) return;
        snapReferenceScrollerLine(scroller);
      }, 130));
    };
    document.addEventListener("scroll", scheduleReferenceSnap, true);
    return () => {
      document.removeEventListener("scroll", scheduleReferenceSnap, true);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

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
          setLineMarkers(centers.flatMap((top, index) => (index + 1) % 10 === 0 ? [{ line: index + 1, top }] : []));
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
    setExpandedToc(new Set(activeBranchIds(tocTree, activeId)));
  }, [activeId, tocTree]);

  useEffect(() => {
    if (!editingLine) return;
    const frame = requestAnimationFrame(() => {
      lineInputRef.current?.focus();
      lineInputRef.current?.select();
    });
    const finishEditingOutside = (event: PointerEvent) => {
      if (event.target !== lineInputRef.current) setEditingLine(false);
    };
    document.addEventListener("pointerdown", finishEditingOutside, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", finishEditingOutside, true);
    };
  }, [editingLine]);

  useEffect(() => {
    if (!editingReference) return;
    const frame = requestAnimationFrame(() => {
      referenceInputRef.current?.focus();
      referenceInputRef.current?.select();
    });
    const finishEditingOutside = (event: PointerEvent) => {
      if (event.target !== referenceInputRef.current) setEditingReference(null);
    };
    document.addEventListener("pointerdown", finishEditingOutside, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", finishEditingOutside, true);
    };
  }, [editingReference]);

  const scrollReferenceIntoView = useCallback((surface: ReferenceSurface, kind: ReferenceKind, id: string) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const scope = surface === "sheet" ? sheetRef.current : document.getElementById("reading-right-rail");
      const node = scope?.querySelector<HTMLElement>(`[data-reference-kind="${kind}"][data-reference-id="${CSS.escape(id)}"]`);
      const scroller = node?.parentElement;
      if (!node || !scroller) return;
      const disclosure = node.querySelector<HTMLElement>(":scope > button") ?? node;
      const itemRect = disclosure.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (itemRect.top < scrollerRect.top) {
        scroller.scrollTo({ top: scroller.scrollTop + itemRect.top - scrollerRect.top, behavior: reduce ? "auto" : "smooth" });
      } else if (itemRect.bottom > scrollerRect.bottom) {
        scroller.scrollTo({ top: scroller.scrollTop + itemRect.bottom - scrollerRect.bottom, behavior: reduce ? "auto" : "smooth" });
      }
    }));
  }, []);

  const selectReference = useCallback((kind: ReferenceKind, id: string, surface: ReferenceSurface = "desk", ensureVisible = true) => {
    setEditingReference(null);
    if (kind === "annotation") setActiveAnnotationId(id);
    else setActiveSourceId(id);
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
    );
    if (ensureVisible) scrollReferenceIntoView(surface, kind, id);
  }, [scrollReferenceIntoView]);

  const rememberDirectReferencePosition = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const scroller = event.currentTarget.parentElement?.parentElement;
    if (!scroller) return;
    directReferencePositionRef.current = {
      button: event.currentTarget,
      scrollTop: scroller.scrollTop,
      pageX: window.scrollX,
      pageY: window.scrollY,
    };
  }, []);

  const selectDirectReference = useCallback((
    event: ReactMouseEvent<HTMLButtonElement>,
    kind: ReferenceKind,
    id: string,
    surface: ReferenceSurface
  ) => {
    const scroller = event.currentTarget.parentElement?.parentElement;
    const remembered = directReferencePositionRef.current;
    const position = scroller && remembered?.button === event.currentTarget
      ? remembered
      : scroller
        ? { button: event.currentTarget, scrollTop: scroller.scrollTop, pageX: window.scrollX, pageY: window.scrollY }
        : null;
    directReferencePositionRef.current = null;

    if (scroller) referenceSnapSuppressedUntilRef.current.set(scroller, performance.now() + 1000);
    selectReference(kind, id, surface, false);
    if (!position) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const scope = surface === "sheet" ? sheetRef.current : document.getElementById("reading-right-rail");
      const currentItem = scope?.querySelector<HTMLElement>(`[data-reference-kind="${kind}"][data-reference-id="${CSS.escape(id)}"]`);
      const currentScroller = currentItem?.parentElement;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const started = performance.now();
      const restorePosition = () => {
        if (currentScroller) currentScroller.scrollTop = position.scrollTop;
        window.scrollTo(position.pageX, position.pageY);
      };
      const restoreDuringTransition = () => {
        restorePosition();
        if (!reduce && performance.now() - started < 320) requestAnimationFrame(restoreDuringTransition);
      };
      restoreDuringTransition();
      if (!reduce) window.setTimeout(restorePosition, 520);
    }));
  }, [selectReference]);

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
    setCurrentLine(line);
    setEditingLine(false);
    const bodyTop = body.getBoundingClientRect().top + window.scrollY;
    // Scroll positions are quantized to device pixels; a one-pixel bias keeps
    // the requested center on the inclusive side of upperBound after landing.
    const target = bodyTop + centers[line - 1] - visualAnchor() + 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
    }));
  };

  const beginLineEdit = () => {
    if (lineCount === 0) return;
    setLineDraft(String(currentLine || 1));
    setEditingLine(true);
  };

  const beginReferenceEdit = (kind: ReferenceKind, current: number) => {
    setReferenceDraft(String(current));
    setEditingReference(kind);
  };

  const jumpToReferenceNumber = (event: FormEvent<HTMLFormElement>, kind: ReferenceKind, surface: ReferenceSurface) => {
    event.preventDefault();
    const items = kind === "annotation" ? annotationRef.current : sourceRef.current;
    const requested = Number.parseInt(referenceDraft, 10);
    if (items.length === 0 || !Number.isFinite(requested)) return;
    const index = Math.max(1, Math.min(items.length, requested));
    setReferenceDraft(String(index));
    setEditingReference(null);
    selectReference(kind, items[index - 1].id, surface);
  };

  const scrollReferenceEdge = (kind: ReferenceKind, edge: "start" | "end", surface: ReferenceSurface = "desk") => {
    const scope = surface === "sheet" ? sheetRef.current : document.getElementById("reading-right-rail");
    const scroller = scope?.querySelector<HTMLElement>(`[data-reference-scroller="${kind}"]`);
    if (!scroller) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      top: edge === "start" ? 0 : scroller.scrollHeight,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const returnToPageStart = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeSheet();
    history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  };

  const viewReferenceOrigin = (kind: ReferenceKind) => {
    const id = kind === "annotation" ? activeAnnotationId : activeSourceId;
    const remembered = lastNoteAnchor.current;
    const rememberedTarget = remembered ? safeTarget(remembered.getAttribute("href") || "") : null;
    const anchor = rememberedTarget?.id === id
      ? remembered
      : referenceLinksRef.current.find((link) => link.target.id === id)?.anchor;
    if (!anchor) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const top = anchor.getBoundingClientRect().top + window.scrollY - visualAnchor() + 1;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
      if (anchor.id) history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}#${encodeURIComponent(anchor.id)}`);
      anchor.focus({ preventScroll: true });
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
          <div
            id={childrenId}
            className={styles.tocChildren}
            data-expanded={expanded ? "true" : "false"}
            aria-hidden={!expanded}
            inert={!expanded}
          >
            <div className={styles.tocChildrenInner}>
              {node.children.map((child, index) => renderTocNode(child, `${path}-${index}`, depth + 1, rootIndex))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const lineNavigator = (
    <form className={styles.lineNavigator} onSubmit={jumpToLine} aria-label="按正文视觉行跳转">
      <div className={styles.lineNumbers}>
        <span>阅读进度</span>
        <strong>
          {editingLine ? (
            <input
              ref={lineInputRef}
              className={styles.lineCurrent}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="go"
              autoComplete="off"
              value={lineDraft}
              aria-label={`输入正文行数，共 ${lineCount} 行`}
              onChange={(event) => setLineDraft(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
            />
          ) : (
            <button
              className={styles.lineCurrent}
              type="button"
              disabled={lineCount === 0}
              aria-label={lineCount === 0 ? "正文行数正在计算" : `当前第 ${currentLine} 行，点击输入行数跳转`}
              onClick={beginLineEdit}
            >
              {String(currentLine)}
            </button>
          )}
          <small> / {String(lineCount)} 行</small>
        </strong>
      </div>
      <span className={styles.lineTrack} aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
    </form>
  );

  const tocPanel = (
    <nav className={styles.tocPanel} aria-label="文章目录">
      <header><b>目录</b></header>
      <div className={`${styles.tocViewport} ${styles.styledScroller}`}>
        {tocTree.length === 0 ? <p className={styles.emptyRail}>本文没有分节标题，可按视觉行定位。</p> : tocTree.map((node, index) => renderTocNode(node, String(index), 0, index))}
      </div>
      <button className={styles.toTop} type="button" onClick={returnToPageStart}>返回篇首</button>
    </nav>
  );

  const compactCredits = (
    <section className={styles.compactCredits} aria-label="署名">
      <dl>
        {credits.length > 0 ? credits.map((credit) => (
          <div key={`${credit.role}-${credit.contributorId}`}>
            <dt>
              <span
                className={styles.creditMark}
                data-solid={credit.solid ? "true" : "false"}
                role="img"
                aria-label={credit.role === "author" ? "作者" : "译者"}
              >
                {credit.mark}
              </span>
            </dt>
            <dd><CreditLinks credits={[credit]} showMarks={false} /></dd>
          </div>
        )) : (
          <div>
            <dt><span className={styles.creditMark} data-solid="true" role="img" aria-label="作者">作</span></dt>
            <dd>{fallbackAuthor || `${site.brandCN}编辑部`}</dd>
          </div>
        )}
      </dl>
    </section>
  );

  const referenceCounter = (kind: ReferenceKind, surface: ReferenceSurface) => {
    const items = kind === "annotation" ? annotations : sources;
    const active = kind === "annotation" ? activeAnnotationId : activeSourceId;
    const current = Math.max(1, items.findIndex((item) => item.id === active) + 1);
    const heading = kind === "annotation" ? "注释" : "文献";
    return (
      <form className={styles.referenceCounter} onSubmit={(event) => jumpToReferenceNumber(event, kind, surface)} aria-label={`按序号跳转${heading}`}>
        {editingReference === kind ? (
          <input
            ref={referenceInputRef}
            className={styles.referenceCurrent}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="go"
            autoComplete="off"
            value={referenceDraft}
            aria-label={`输入${heading}序号，共 ${items.length} 条`}
            onChange={(event) => setReferenceDraft(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
          />
        ) : (
          <button className={styles.referenceCurrent} type="button" aria-label={`当前第 ${current} 条${heading}，点击输入序号跳转`} onClick={() => beginReferenceEdit(kind, current)}>
            {String(current)}
          </button>
        )}
        <small><span>/</span>{String(items.length)}</small>
      </form>
    );
  };

  const referencePane = (kind: ReferenceKind, compact = false) => {
    const items = kind === "annotation" ? annotations : sources;
    const active = kind === "annotation" ? activeAnnotationId : activeSourceId;
    const heading = kind === "annotation" ? "注释" : "文献";
    return (
      <section className={styles.referencePane} data-kind={kind} data-compact={compact ? "true" : "false"}>
        {!compact && <header><b>{heading}</b>{referenceCounter(kind, "desk")}</header>}
        <div className={styles.referenceScroller} data-reference-scroller={kind} onClick={compact ? followSheetReference : undefined}>
          {items.length === 0 ? <p className={styles.emptyRail}>本文没有{heading}。</p> : items.map((item) => {
            const selected = item.id === active;
            return (
              <article id={`reading-reference-${kind}-${item.index}`} key={item.id} className={styles.referenceItem} data-reference-kind={kind} data-reference-id={item.id} data-active={selected ? "true" : "false"}>
                <button type="button" className={styles.referenceSelect} aria-expanded={selected} aria-current={selected ? "true" : undefined} onPointerDown={rememberDirectReferencePosition} onPointerCancel={() => { directReferencePositionRef.current = null; }} onClick={(event) => selectDirectReference(event, kind, item.id, compact ? "sheet" : "desk")}><span>{item.label}</span>{!selected && <span className={styles.referencePreview} dangerouslySetInnerHTML={{ __html: item.previewHtml }} />}</button>
                <div className={styles.referenceDetailShell} data-expanded={selected ? "true" : "false"} aria-hidden={!selected} inert={!selected}>
                  <div className={styles.referenceDetail}>
                    <div className={styles.referenceDetailContent} dangerouslySetInnerHTML={{ __html: item.html }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {items.length > 0 && <footer><button type="button" onClick={() => scrollReferenceEdge(kind, "start", compact ? "sheet" : "desk")}>首条{heading}</button><button type="button" onClick={() => scrollReferenceEdge(kind, "end", compact ? "sheet" : "desk")}>末条{heading}</button><button type="button" onClick={() => viewReferenceOrigin(kind)}>原文位置</button></footer>}
      </section>
    );
  };

  const articleIdentity = (
    <section className={styles.articleIdentity}>
      <span className={styles.eyebrow}>您正在读</span>
      <b title={title}>{title}</b>
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
  const lineMarkerPortal = lineMarkerHost && lineMarkers.length > 0
    ? createPortal(
      <div className={styles.visualLineMarkers} aria-hidden="true">
        {lineMarkers.map((marker) => (
          <span
            className={styles.visualLineMarker}
            data-line={String(marker.line)}
            key={marker.line}
            style={{ top: `${marker.top}px` }}
          />
        ))}
      </div>,
      lineMarkerHost
    )
    : null;

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
      meta.setAttribute("content", next === "dark" ? "#060605" : "#e8e7e3")
    );
    localStorage.setItem("ub_theme", next);
    setDark(next === "dark");
  };

  return (
    <>
      {portalDesk}
      {lineMarkerPortal}
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
        <span className={styles.topRule} data-rail-progress={desktopDesk ? "true" : "false"} aria-hidden="true">
          <span className={styles.topProgress} style={{ width: `${pct}%` }} />
        </span>
      </header>

      {sheet && (
        <div className={styles.sheetLayer} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeSheet(); }}>
          <section ref={sheetRef} className={styles.sheet} data-sheet={sheet} role="dialog" aria-modal="true" tabIndex={-1} aria-label={sheet === "toc" ? "文章目录" : sheet === "settings" ? "阅读设置" : sheet === "annotation" ? "文章注释" : "文章文献"}>
            <div className={styles.sheetHandle} />
            <header className={styles.sheetHeader}>
              <div className={styles.sheetHeading}>
                {previousReference && (sheet === "annotation" || sheet === "source") && <button type="button" className={styles.referenceBack} onClick={returnToPreviousReference}>← 返回{previousReference.kind === "annotation" ? "注释" : "文献"} {previousReference.label}</button>}
                <div><h2>{sheet === "toc" ? "文章目录" : sheet === "settings" ? "阅读设置" : sheet === "annotation" ? "注释" : "文献"}</h2></div>
              </div>
              <div className={styles.sheetHeaderActions}>
                {(sheet === "annotation" || sheet === "source") && referenceCounter(sheet, "sheet")}
                <button ref={sheetCloseRef} type="button" onClick={closeSheet} aria-label="关闭">×</button>
              </div>
            </header>
            {sheet === "toc" ? <>
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
