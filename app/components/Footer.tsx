import { site } from "@/lib/site";
import FooterBuildTimestamp from "./FooterBuildTimestamp";

export default function Footer() {
  return (
    <footer className="foot" data-reveal>
      <div className="foot-inner">
        <div className="foot-sign">
          <div className="foot-lockup">
            <span className="foot-roof-mark" aria-hidden="true">屋</span>
            <b className="foot-brand">{site.brand}</b>
          </div>
          <FooterBuildTimestamp />
        </div>
      </div>
    </footer>
  );
}
