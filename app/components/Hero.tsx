import { site } from "@/lib/site";

/* 英雄区 / 技术蓝图 masthead — 纯装饰 + 站点简介 */
export default function Hero({ count, issue }: { count: number; issue: string }) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="bp-ticks">
          <span>3.0x</span>
          <span>2.7x</span>
          <span>1.2x</span>
          <span>0.5x</span>
          <span>0x</span>
        </div>

        <div className="bp-ghost">{site.brandCN}</div>
        <div className="bp-wedge" />
        <div className="bp-wedge thin" />

        <h1 className="hero-title">
          {site.brandCN}
        </h1>

        <p className="hero-sub">{site.description}</p>

        <div className="hero-meta">
          <span>期号 {issue || "—"}</span>
          <span className="d" />
          <span>{count} 篇</span>
        </div>

        <div className="bp-rot">未完成</div>
        <div className="bp-leader one">
          <span className="dot" />
          <span className="ln" />
          <span className="lb">使命</span>
          <span className="arr">►</span>
        </div>
        <div className="bp-leader two">
          <span className="lb">{"// 愿景"}</span>
          <span className="ln" />
          <span className="dot" />
        </div>
      </div>
    </section>
  );
}
