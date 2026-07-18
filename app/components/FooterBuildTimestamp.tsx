"use client";

import { usePathname } from "next/navigation";

interface FooterBuildTimestampProps {
  iso: string;
  label: string;
}

export default function FooterBuildTimestamp({ iso, label }: FooterBuildTimestampProps) {
  const pathname = usePathname();
  if (pathname !== "/about") return null;

  return (
    <time className="foot-build" data-build-timestamp dateTime={iso}>
      <span>最新修改</span>
      <span>{label}</span>
    </time>
  );
}
