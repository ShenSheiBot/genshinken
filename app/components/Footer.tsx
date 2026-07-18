import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";

// 构建期检测 logo 是否存在：放进 public/img/logo.png 即自动出现，缺失时只显示署名
const hasLogo = fs.existsSync(path.join(process.cwd(), "public", "img", "logo.png"));

function formattedBuildTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  const twoDigits = (part: number) => String(part).padStart(2, "0");
  return {
    iso: date.toISOString(),
    label: `${String(date.getUTCFullYear()).padStart(4, "0")}.${twoDigits(date.getUTCMonth() + 1)}.${twoDigits(date.getUTCDate())} UCT ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}:${twoDigits(date.getUTCSeconds())}`,
  };
}

export default function Footer() {
  const buildTimestamp = formattedBuildTimestamp(process.env.NEXT_PUBLIC_BUILD_TIMESTAMP);

  return (
    <footer className="foot" data-reveal>
      <div className="foot-inner">
        <div className="foot-links">
          <span className="k">关注</span>
          <span className="v">
            {site.social.map((s, i) => (
              <span key={s.href}>
                {i > 0 && <span className="dash">—</span>}
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </span>
            ))}
          </span>
          <span className="k">联系</span>
          <span className="v">
            <a href={`mailto:${site.infoEmail}`}>{site.infoEmail}</a>
          </span>
          <span className="k">投稿</span>
          <span className="v">
            <a href={`mailto:${site.editorEmail}`}>{site.editorEmail}</a>
          </span>
        </div>

        <div className="foot-sign">
          <div className="foot-sign-main">
            <div className="meta">
              <b>{site.brand}</b>
              <br />
              {site.license}
            </div>
            {hasLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="foot-logo" src="/img/logo.png" alt="" />
            )}
          </div>
          {buildTimestamp && (
            <time className="foot-build" data-build-timestamp dateTime={buildTimestamp.iso}>
              <span>最新修改</span>
              <span>{buildTimestamp.label}</span>
            </time>
          )}
        </div>
      </div>
    </footer>
  );
}
