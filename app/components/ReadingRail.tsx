"use client";

import { useEffect, useState } from "react";

type Mark = { n: number; top: number };

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

    const compute = () => {
      const articleTop = article.getBoundingClientRect().top;
      // 逐块按「内容高度 ÷ 行高」数实际行数（每个行盒恰为一倍行高），定位每行中心 Y。
      // 不用 getClientRects——它按内联盒（脚注上标 / 链接 / 强调）拆分，同一视觉行会被算成多段。
      const centers: number[] = [];
      const blocks = body.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, figcaption");
      blocks.forEach((el) => {
        if ((el as HTMLElement).closest(".footnotes")) return; // 注释部分不要里程碑
        const cs = getComputedStyle(el as HTMLElement);
        let lh = parseFloat(cs.lineHeight);
        if (!lh || Number.isNaN(lh)) lh = (parseFloat(cs.fontSize) || 16) * 1.85;
        const rect = (el as HTMLElement).getBoundingClientRect();
        const padTop = parseFloat(cs.paddingTop) || 0;
        const padBottom = parseFloat(cs.paddingBottom) || 0;
        const top0 = rect.top - articleTop + padTop; // 文本区顶（相对 .article）
        const lines = Math.max(1, Math.round((rect.height - padTop - padBottom) / lh));
        for (let k = 0; k < lines; k++) centers.push(top0 + (k + 0.5) * lh); // 第 k 行中心
      });

      const out: Mark[] = [];
      for (let i = 9; i < centers.length; i += 10) out.push({ n: i + 1, top: Math.round(centers[i]) });

      const boxLeft = body.offsetLeft;
      const boxRight = article.offsetWidth - (body.offsetLeft + body.offsetWidth);
      setLeftPx(Math.max(2, boxLeft + 2));
      setRightPx(Math.max(2, boxRight + 2));
      setMarks(out);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(body);
    // 字体异步加载后行位置会变，加载完再算一次
    if (document.fonts?.ready) document.fonts.ready.then(compute).catch(() => {});
    return () => ro.disconnect();
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
