import { site } from "@/lib/site";
import FooterBuildTimestamp from "./FooterBuildTimestamp";

function formattedBuildTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  const twoDigits = (part: number) => String(part).padStart(2, "0");
  return {
    iso: date.toISOString(),
    label: `${String(date.getUTCFullYear()).padStart(4, "0")}.${twoDigits(date.getUTCMonth() + 1)}.${twoDigits(date.getUTCDate())} UTC ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}:${twoDigits(date.getUTCSeconds())}`,
  };
}

export default function Footer() {
  const buildTimestamp = formattedBuildTimestamp(process.env.NEXT_PUBLIC_BUILD_TIMESTAMP);

  return (
    <footer className="foot" data-reveal>
      <div className="foot-inner">
        <div className="foot-sign">
          <div className="foot-lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="foot-logo" src="/img/logo.webp" alt="" width={96} height={96} loading="lazy" decoding="async" />
            <b className="foot-brand">{site.brand}</b>
          </div>
          {buildTimestamp && <FooterBuildTimestamp {...buildTimestamp} />}
        </div>
      </div>
    </footer>
  );
}
