"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BuildTimestamp {
  iso: string;
  label: string;
}

function formattedBuildTimestamp(value: string | null): BuildTimestamp | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  const twoDigits = (part: number) => String(part).padStart(2, "0");
  return {
    iso: date.toISOString(),
    label: `${String(date.getUTCFullYear()).padStart(4, "0")}.${twoDigits(date.getUTCMonth() + 1)}.${twoDigits(date.getUTCDate())} UTC ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}:${twoDigits(date.getUTCSeconds())}`,
  };
}

export default function FooterBuildTimestamp() {
  const pathname = usePathname();
  const [timestamp, setTimestamp] = useState<BuildTimestamp | null>(null);

  useEffect(() => {
    if (pathname !== "/about") {
      setTimestamp(null);
      return;
    }
    const value = document
      .querySelector<HTMLMetaElement>('meta[name="roof-build-timestamp"]')
      ?.content ?? null;
    setTimestamp(formattedBuildTimestamp(value));
  }, [pathname]);

  if (!timestamp) return null;

  return (
    <time className="foot-build" data-build-timestamp dateTime={timestamp.iso}>
      <span>最新修改</span>
      <span>{timestamp.label}</span>
    </time>
  );
}
