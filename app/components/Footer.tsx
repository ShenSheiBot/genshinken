import { site } from "@/lib/site";
import FooterBuildTimestamp from "./FooterBuildTimestamp";

export default function Footer({ locale = "zh" }: { locale?: "zh" | "en" | "ja" }) {
  return (
    <footer className="foot" data-reveal>
      <div className="foot-inner">
        <div className="foot-sign">
          <div className="foot-lockup">
            <span className="foot-roof-mark" aria-hidden="true">屋</span>
            <b className="foot-brand">{locale === "en" ? "Lab on Roof" : locale === "ja" ? "屋頂現視研" : site.brand}</b>
          </div>
          <FooterBuildTimestamp locale={locale} />
        </div>
      </div>
    </footer>
  );
}
