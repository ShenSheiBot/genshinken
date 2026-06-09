import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";

// 构建期检测 logo 是否存在：放进 public/img/logo.png 即自动出现，缺失时只显示署名
const hasLogo = fs.existsSync(path.join(process.cwd(), "public", "img", "logo.png"));

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-sign">
          <div className="meta">
            <b>{site.brand}</b>
            <br />
            {site.license}
          </div>
          {hasLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="foot-logo" src="/img/logo.png" alt={site.brandEN} />
          )}
        </div>
      </div>
    </footer>
  );
}
