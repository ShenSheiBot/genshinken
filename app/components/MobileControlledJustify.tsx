"use client";

import { useEffect } from "react";

type TextUnit = {
  node: Text;
  start: number;
  end: number;
  text: string;
  rect: DOMRect | null;
  line: number;
};

type LineGroup = {
  units: TextUnit[];
  left: number;
  right: number;
};

const MOBILE_QUERY = "(max-width: 680px)";

function segments(value: string) {
  const out: Array<{ start: number; end: number; text: string }> = [];
  let offset = 0;
  for (const text of Array.from(value)) {
    out.push({ start: offset, end: offset + text.length, text });
    offset += text.length;
  }
  return out;
}

function visibleRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0.1 && rect.height > 0.1
  );
  if (rects.length === 0) return null;
  return rects.reduce((widest, rect) => (rect.width > widest.width ? rect : widest));
}

function visualLineCenters(el: HTMLElement) {
  const style = getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
  const tolerance = Math.max(3, Math.min(16, lineHeight * 0.42));
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0.1 && rect.height > 0.1)
    .sort((a, b) => a.top - b.top);
  range.detach();

  const centers: number[] = [];
  for (const rect of rects) {
    const center = (rect.top + rect.bottom) / 2;
    const previous = centers[centers.length - 1];
    if (previous === undefined || Math.abs(center - previous) > tolerance) {
      centers.push(center);
    }
  }
  return { centers, tolerance };
}

function collectUnits(el: HTMLElement) {
  const units: TextUnit[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const node = current as Text;
    for (const part of segments(node.data)) {
      const range = document.createRange();
      range.setStart(node, part.start);
      range.setEnd(node, part.end);
      const rect = visibleRect(range);
      range.detach();
      units.push({ ...part, node, rect, line: -1 });
    }
    current = walker.nextNode();
  }

  return units;
}

function nearestLine(center: number, centers: number[], tolerance: number) {
  let index = -1;
  let distance = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const next = Math.abs(center - centers[i]);
    if (next < distance) {
      distance = next;
      index = i;
    }
  }
  return distance <= tolerance ? index : -1;
}

function lineGroups(el: HTMLElement): LineGroup[] | null {
  const { centers, tolerance } = visualLineCenters(el);
  const units = collectUnits(el);
  if (centers.length < 2 || units.length === 0) return null;

  for (const unit of units) {
    if (!unit.rect) continue;
    unit.line = nearestLine((unit.rect.top + unit.rect.bottom) / 2, centers, tolerance);
  }

  for (let i = 0; i < units.length; i++) {
    if (units[i].line >= 0) continue;
    const following = units.slice(i + 1).find((unit) => unit.line >= 0);
    const preceding = units.slice(0, i).reverse().find((unit) => unit.line >= 0);
    units[i].line = following?.line ?? preceding?.line ?? -1;
  }
  if (units.some((unit) => unit.line < 0)) return null;

  const groups: TextUnit[][] = [];
  let previousLine = units[0].line;
  let current: TextUnit[] = [];
  for (const unit of units) {
    if (unit.line < previousLine) return null;
    if (unit.line !== previousLine) {
      groups.push(current);
      current = [];
      previousLine = unit.line;
    }
    current.push(unit);
  }
  if (current.length > 0) groups.push(current);

  const out: LineGroup[] = [];
  for (const group of groups) {
    const rects = group.flatMap((unit) => (unit.rect ? [unit.rect] : []));
    if (rects.length === 0) return null;
    out.push({
      units: group,
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
    });
  }
  return out;
}

function adjustableGaps(text: string) {
  const count = Array.from(text).filter(
    (char) =>
      !/\s/u.test(char) &&
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Punctuation}]/u.test(char)
  ).length;
  return Math.max(0, count - 1);
}

function contentEdges(el: HTMLElement) {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
  return { left, right };
}

function shouldSkip(el: HTMLElement) {
  return (
    !el.textContent?.trim() ||
    el.classList.contains("article-summary-meta") ||
    Boolean(el.closest(".footnotes, .source-notes, .signature-block")) ||
    Boolean(el.querySelector("br, code, pre, img, video, iframe, svg, math"))
  );
}

/**
 * Mobile CJK justification with a hard per-gap cap. The browser first chooses
 * natural line breaks; only lines whose required expansion stays below the
 * cap are justified. Complex inline markup is cloned with Range per line.
 */
export default function MobileControlledJustify() {
  useEffect(() => {
    const body = document.querySelector(".art-body") as HTMLElement | null;
    if (!body) return;

    const originals = new WeakMap<HTMLElement, string>();
    const managed = new Set<HTMLElement>();
    const visible = new Set<HTMLElement>();
    const media = window.matchMedia(MOBILE_QUERY);
    let raf = 0;
    let width = body.getBoundingClientRect().width;

    const candidates = () =>
      Array.from(body.querySelectorAll<HTMLElement>("p")).filter((el) => !shouldSkip(el));

    const restore = (el: HTMLElement) => {
      const original = originals.get(el);
      if (original === undefined) return;
      el.innerHTML = original;
      el.removeAttribute("data-controlled-justify");
      el.classList.remove("controlled-justify-measure");
    };

    const restoreAll = () => {
      for (const el of managed) restore(el);
      managed.clear();
    };

    const transform = (el: HTMLElement, maxGap: number) => {
      if (!originals.has(el)) originals.set(el, el.innerHTML);
      managed.add(el);
      restore(el);
      el.classList.add("controlled-justify-measure");

      const groups = lineGroups(el);
      if (!groups) {
        el.classList.remove("controlled-justify-measure");
        return;
      }

      const { left: contentLeft, right: contentRight } = contentEdges(el);
      const lines = document.createDocumentFragment();

      groups.forEach((group, index) => {
        const first = group.units[0];
        const last = group.units[group.units.length - 1];
        const range = document.createRange();
        range.setStart(first.node, first.start);
        range.setEnd(last.node, last.end);

        const line = document.createElement("span");
        line.className = "controlled-justify-line";
        line.append(range.cloneContents());
        range.detach();

        const indent = index === 0 ? Math.max(0, group.left - contentLeft) : 0;
        if (indent > 1) line.style.paddingInlineStart = `${indent.toFixed(2)}px`;

        const remaining = Math.max(0, contentRight - group.right);
        const gaps = adjustableGaps(group.units.map((unit) => unit.text).join(""));
        const isLast = index === groups.length - 1;
        if (!isLast && gaps > 0 && remaining / gaps <= maxGap) {
          line.dataset.justify = "true";
        }
        lines.append(line);
      });

      el.replaceChildren(lines);
      el.classList.remove("controlled-justify-measure");
      el.dataset.controlledJustify = "true";
    };

    const applyVisible = (force = false) => {
      if (!media.matches) {
        restoreAll();
        return;
      }

      const nextWidth = body.getBoundingClientRect().width;
      if (force || Math.abs(nextWidth - width) >= 0.5) {
        restoreAll();
        width = nextWidth;
      }

      const maxGap = parseFloat(getComputedStyle(body).getPropertyValue("--mobile-justify-max-gap")) || 0.3;
      let changed = false;
      for (const el of visible) {
        if (managed.has(el)) continue;
        try {
          transform(el, maxGap);
          changed = true;
        } catch {
          restore(el);
        }
      }
      if (changed) window.dispatchEvent(new Event("resize"));
    };

    const schedule = (force = false) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => applyVisible(force));
      });
    };

    const onMediaChange = () => schedule(true);
    const resizeObserver = new ResizeObserver(() => schedule());
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(el);
          else visible.delete(el);
        }
        schedule();
      },
      { rootMargin: "180% 0px" }
    );
    for (const el of candidates()) intersectionObserver.observe(el);
    resizeObserver.observe(body);
    media.addEventListener("change", onMediaChange);
    schedule(true);
    document.fonts?.ready.then(() => schedule(true)).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      media.removeEventListener("change", onMediaChange);
      restoreAll();
    };
  }, []);

  return null;
}
