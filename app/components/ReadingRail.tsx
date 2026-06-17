"use client";

import { useEffect, useState } from "react";

type Mark = { n: number; top: number };

/**
 * 阅读里程碑：每十行（以正文基准行高为单位）一个灰色小数字，
 * 贴在正文版心的左右两侧内边距沟槽里——桌面与移动端一致（不再依赖宽留白）。
 * 纯装饰（aria-hidden），构建后量算行高/版心盒子定位，resize 时重算。
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
      // .art-body 本身 line-height 计算值是 "normal"，须从子段落量行高；再以字号×1.85 兜底
      const probe = (body.querySelector("p") as HTMLElement | null) ?? body;
      let lh = parseFloat(getComputedStyle(probe).lineHeight);
      if (!lh || Number.isNaN(lh)) {
        const fs = parseFloat(getComputedStyle(probe).fontSize) || 16;
        lh = fs * 1.85;
      }
      const per = lh * 10; // 每十行的像素高度
      const bodyTop = body.offsetTop; // 相对 .article（定位祖先）
      const count = Math.floor(body.offsetHeight / per);
      const out: Mark[] = [];
      for (let i = 1; i <= count; i++) out.push({ n: i * 10, top: Math.round(bodyTop + i * per) });

      // 落在正文盒子左右内缘 +2px（即版心两侧的内边距沟槽，桌面 40px / 移动 20px）
      const boxLeft = body.offsetLeft;
      const boxRight = article.offsetWidth - (body.offsetLeft + body.offsetWidth);
      setLeftPx(Math.max(2, boxLeft + 2));
      setRightPx(Math.max(2, boxRight + 2));
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
