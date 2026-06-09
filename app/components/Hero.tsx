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

        <div className="bp-ghost">{site.ghost}</div>
        <div className="bp-wedge" />
        <div className="bp-wedge thin" />

        <h1 className="hero-title">
          {site.heroTitleA}
          <br />
          <span className="dots">.</span>
          {site.heroTitleB}
        </h1>

        <p className="hero-sub">{site.description}</p>

        <div className="hero-meta">
          <span>NO. {issue || "—"}</span>
          <span className="d" />
          <span>{count} ENTRIES</span>
          <span className="d" />
          <span>{site.license}</span>
        </div>

        <div className="bp-rot">unfinished</div>
        <div className="bp-leader one">
          <span className="dot" />
          <span className="ln" />
          <span className="lb">mission</span>
          <span className="arr">►</span>
        </div>
        <div className="bp-leader two">
          <span className="lb">// vision</span>
          <span className="ln" />
          <span className="dot" />
        </div>
      </div>
    </section>
  );
}
