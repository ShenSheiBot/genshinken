"use client";

import { useEffect, useState } from "react";

type Mark = { n: number; top: number };

/**
 * 阅读里程碑：在正文右侧留白处，每十行（以正文基准行高为单位）标一个灰色小数字。
 * 纯装饰（aria-hidden），构建后由 JS 量算行高与正文高度定位，resize 时重算。
 * 窄屏（无右侧留白）由 CSS 隐去，详见 .read-rail 的媒体查询。
 */
export default function ReadingRail() {
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    const body = document.querySelector(".art-body") as HTMLElement | null;
    if (!body) return;

    const compute = () => {
      const lh = parseFloat(getComputedStyle(body).lineHeight);
      if (!lh || Number.isNaN(lh)) {
        setMarks([]);
        return;
      }
      const per = lh * 10; // 每十行的像素高度
      const bodyTop = body.offsetTop; // 相对 .article（定位祖先）
      const count = Math.floor(body.offsetHeight / per);
      const out: Mark[] = [];
      for (let i = 1; i <= count; i++) out.push({ n: i * 10, top: Math.round(bodyTop + i * per) });
      setMarks(out);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  if (marks.length === 0) return null;
  return (
    <div className="read-rail" aria-hidden="true">
      {marks.map((m) => (
        <span key={m.n} className="rmark" style={{ top: m.top }}>
          {m.n}
        </span>
      ))}
    </div>
  );
}
