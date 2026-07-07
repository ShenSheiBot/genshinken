"use client";

import { useEffect, useRef, useState } from "react";

type Glyph = "solid" | "ring" | "core" | "sq";

type TocItem = {
  key: string;
  title: string;
  tag: string; // 悬停签里的级别标注：H1…H4 / 注 / 文
  glyph: Glyph;
  frac: number; // 在文中的位置（0..1，与阅读进度同一坐标系）
  top: number; // 标尺内像素位（重叠碰撞调整后）
  el: HTMLElement;
};

/**
 * 目录进度栏（文章页左缘，方案「标尺」）：
 * 细发丝线全程 + 已读段 accent 变实；点位=标题在文中的真实位置映射到栏高，
 * 与进度共用同一坐标系——线扫过点即该节已读。
 * ● / ○ / 芯点 依次对应该篇实际出现的前三级标题（最多三级）；■ = 注释 / 文献区。
 * 悬停出标题签（纯 CSS），点击跳转。窄屏由 CSS 退化为顶栏下细进度条。
 * 栏顶（百分比）在页首与正文首行对齐，随下滑跟随正文上移，
 * 至顶栏下 90px 处停驻转为固定（类 sticky 停驻）。
 * 颜色全部走主题令牌，明暗主题自适应；resize / 字体 / 图片加载后重算。
 */
export default function TocRail() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [p, setP] = useState(0);
  const [act, setAct] = useState(-1);
  const scaleRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const geom = useRef({ start: 0, span: 1 });
  const fracsRef = useRef<number[]>([]);

  useEffect(() => {
    const body = document.querySelector(".art-body") as HTMLElement | null;
    if (!body) return;

    let raf = 0;
    let scrollRaf = 0;
    let alive = true;

    const frac = (y: number) =>
      Math.max(0, Math.min(1, (y - geom.current.start) / geom.current.span));

    // 阅读线：视口上沿下 42% 处；滚到页底时视为读完（含注释 / 文献）
    const readFrac = () => {
      const bottomed =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      return bottomed ? 1 : frac(window.scrollY + window.innerHeight * 0.42);
    };

    const applyScroll = () => {
      if (!alive) return;
      // 停驻：栏顶跟随正文首行，最高停在顶栏下 90px
      if (navRef.current && anchorRef.current) {
        const t = Math.max(90, anchorRef.current.getBoundingClientRect().top);
        navRef.current.style.top = t + "px";
      }
      const q = readFrac();
      setP(q);
      let a = -1;
      fracsRef.current.forEach((f, i) => {
        if (q >= f - 1e-4) a = i;
      });
      setAct(a);
    };

    const compute = () => {
      if (!alive) return;
      const sy = window.scrollY;
      // 量程：正文首行 → 完 / FIN 行
      anchorRef.current = (body.firstElementChild as HTMLElement | null) || body;
      const startY = anchorRef.current.getBoundingClientRect().top + sy;
      const endEl =
        (document.querySelector(".art-after .art-end") as HTMLElement | null) ||
        body;
      const end = endEl.getBoundingClientRect().bottom + sy;
      geom.current = { start: startY, span: Math.max(1, end - startY) };

      const hs = Array.from(
        body.querySelectorAll<HTMLElement>("h1, h2, h3, h4")
      ).filter(
        (el) => !el.closest(".footnotes") && !el.closest(".source-notes")
      );
      // 级别自适应：取该篇实际出现的前三级（如 h2/h3，或 h1/h2/h3）
      const levels = Array.from(
        new Set(hs.map((el) => Number(el.tagName[1])))
      ).sort((a, b) => a - b);
      const glyphs: Glyph[] = ["solid", "ring", "core"];

      const out: TocItem[] = [];
      for (const el of hs) {
        const rank = levels.indexOf(Number(el.tagName[1]));
        if (rank < 0 || rank > 2) continue;
        out.push({
          key: el.id || "h" + out.length,
          title: (el.textContent || "").trim(),
          tag: el.tagName,
          glyph: glyphs[rank],
          frac: frac(el.getBoundingClientRect().top + sy),
          top: 0,
          el,
        });
      }
      // 注释 / 文献：文章要件，默认同 H2 实心圆点，同样计入进度
      for (const sel of [".footnotes", ".source-notes"]) {
        const sec = body.querySelector<HTMLElement>(sel);
        if (!sec) continue;
        const fallback = sel === ".footnotes" ? "注释" : "文献";
        out.push({
          key: sel.slice(1),
          title: (sec.querySelector("h2")?.textContent || fallback).trim(),
          tag: sel === ".footnotes" ? "注" : "文",
          glyph: "solid",
          frac: frac(sec.getBoundingClientRect().top + sy),
          top: 0,
          el: sec,
        });
      }
      out.sort((a, b) => a.frac - b.frac);

      // 比例映射到标尺高；密集处保持最小 15px 间距，超出末端再整体回收
      const h = scaleRef.current?.clientHeight ?? 0;
      for (let i = 0; i < out.length; i++) {
        out[i].top = out[i].frac * h;
        if (i > 0 && out[i].top < out[i - 1].top + 15)
          out[i].top = out[i - 1].top + 15;
      }
      const over = out.length ? out[out.length - 1].top - h : 0;
      if (over > 0) {
        for (let i = 0; i < out.length; i++)
          out[i].top = Math.max(
            0,
            out[i].top - (over * i) / Math.max(1, out.length - 1)
          );
      }

      fracsRef.current = out.map((o) => o.frac);
      setItems(out);
      applyScroll();
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(compute);
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(applyScroll);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(body);
    ro.observe(document.documentElement);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, { passive: true });
    body.addEventListener("animationend", schedule);
    body.addEventListener("animationcancel", schedule);
    body.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", schedule, { once: true });
    });
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll);
      body.removeEventListener("animationend", schedule);
      body.removeEventListener("animationcancel", schedule);
    };
  }, []);

  const jump = (it: TocItem) => {
    const y = it.el.getBoundingClientRect().top + window.scrollY - 84;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
  };

  const pct = String(Math.round(p * 100)).padStart(3, "0");

  return (
    <>
      <nav className="toc-rail" aria-label="章节导航" ref={navRef}>
        <div className="toc-pct" aria-hidden="true">
          {pct}%
        </div>
        <div className="toc-scale" ref={scaleRef}>
          <span className="toc-track" aria-hidden="true">
            <span className="toc-fill" style={{ height: p * 100 + "%" }} />
          </span>
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              className="toc-dot"
              style={{ top: it.top }}
              data-state={i === act ? "active" : p > it.frac ? "passed" : "idle"}
              aria-label={it.title}
              aria-current={i === act ? "true" : undefined}
              onClick={() => jump(it)}
            >
              <span className="g" data-glyph={it.glyph} aria-hidden="true" />
              <span className="toc-tip" aria-hidden="true">
                <span className="k">{it.tag}</span>
                <span className="t">{it.title}</span>
              </span>
            </button>
          ))}
        </div>
      </nav>
      <div className="toc-progress-top" style={{ width: p * 100 + "%" }} aria-hidden="true" />
    </>
  );
}
