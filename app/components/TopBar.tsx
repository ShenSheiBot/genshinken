"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

type Theme = "light" | "dark";

export default function TopBar() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("ub_theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="blot" />
        {site.brand}
      </Link>
      <div className="status" />
      <button className="toggle" onClick={toggle} aria-label="切换明暗主题">
        <span className={"tk" + (mounted && theme === "dark" ? " on" : "")} />
        {mounted ? (theme === "light" ? "暗色 / DARK" : "亮色 / LIGHT") : "主题 / THEME"}
      </button>
    </header>
  );
}
