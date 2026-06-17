"use client";

import { useEffect, useState } from "react";

type Mark = { n: number; top: number };

type Line = { center: number; width: number };

/**
 * 阅读里程碑：每十行一个灰色小数字，贴正文版心左右两侧（桌面 / 移动一致）。
 * 用 Range.getClientRects 量算「实际渲染行」的中心 Y——里程碑对齐到对应行的中心线，
 * 不受标题/段距/引文影响；注释（.footnotes）区不计行、不标里程碑。
 * 纯装饰（aria-hidden），resize 与字体加载后重算。
 */
export default function ReadingRail() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [leftPx, setLeftPx] = useState(2);
  const [rightPx, setRightPx] = useState(2);

  useEffect(() => {
    const body = document.querySelector(".art-body") as HTMLElement | null;
    const article = document.querySelector(".article") as HTMLElement | null;
    if (!body || !article) return;

    let raf = 0;
    let alive = true;

    const readableBlocks = () =>
      Array.from(body.querySelectorAll<HTMLElement>("p, li, h1, h2, h3, h4, h5, h6, figcaption"))
        .filter((el) => {
          if (el.closest(".footnotes")) return false;
          // Markdown can emit <li><p>...</p></li>; count the paragraph lines, not the
          // wrapping list item again.
          if (el.tagName === "LI" && el.querySelector("p, ul, ol, blockquote")) return false;
          return true;
        });

    const linesOf = (el: HTMLElement): Line[] => {
      const cs = getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (!lh || Number.isNaN(lh)) lh = (parseFloat(cs.fontSize) || 16) * 1.5;
      const tolerance = Math.max(3, Math.min(18, lh * 0.45));

      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects())
        .filter((r) => r.width > 1 && r.height > 1)
        .sort((a, b) => a.top - b.top);
      range.detach();

      const lines: Line[] = [];
      for (const r of rects) {
        const center = (r.top + r.bottom) / 2;
        const last = lines[lines.length - 1];
        if (last && Math.abs(center - last.center) <= tolerance) {
          // Same visual line: inline links/superscripts may create extra rects.
          // The widest rect is the body text run and gives the most stable center.
          if (r.width > last.width) {
            last.center = center;
            last.width = r.width;
          }
        } else {
          lines.push({ center, width: r.width });
        }
      }
      return lines;
    };

    const compute = () => {
      if (!alive) return;
      const articleRect = article.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const centers = readableBlocks()
        .flatMap(linesOf)
        .map((line) => line.center - articleRect.top)
        .sort((a, b) => a - b);

      const out: Mark[] = [];
      for (let i = 9; i < centers.length; i += 10) {
        out.push({ n: i + 1, top: Number(centers[i].toFixed(2)) });
      }

      setLeftPx(Math.max(2, Math.round(bodyRect.left - articleRect.left + 2)));
      setRightPx(Math.max(2, Math.round(articleRect.right - bodyRect.right + 2)));
      setMarks(out);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(compute);
      });
    };

    schedule();
    const ro = new ResizeObserver(compute);
    ro.observe(body);
    ro.observe(article);
    window.addEventListener("resize", schedule);
    body.addEventListener("animationend", schedule);
    body.addEventListener("animationcancel", schedule);
    body.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", schedule, { once: true });
    });
    // 字体异步加载后行位置会变，加载完再算一次
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      body.removeEventListener("animationend", schedule);
      body.removeEventListener("animationcancel", schedule);
    };
  }, []);

  if (marks.length === 0) return null;
  return (
    <div className="read-rail" aria-hidden="true">
      {marks.map((m) => (
        <span key={"l" + m.n} className="rmark" style={{ top: m.top, left: leftPx }}>
          {m.n}
        </span>
      ))}
      {marks.map((m) => (
        <span key={"r" + m.n} className="rmark" style={{ top: m.top, right: rightPx }}>
          {m.n}
        </span>
      ))}
    </div>
  );
}
