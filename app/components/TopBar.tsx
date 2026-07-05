"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { useArticleHeader } from "./ArticleHeader";

type Theme = "light" | "dark";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.2 14.8A8.2 8.2 0 1 1 9.2 3.8a6.4 6.4 0 0 0 11 11z" />
    </svg>
  );
}

export default function TopBar() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const ah = useArticleHeader();
  const meta = ah?.meta ?? null;
  const revealed = !!(meta && ah?.revealed);

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
    <header className="topbar" data-revealed={revealed ? "true" : "false"}>
      <Link href="/" className="brand">
        <span className="blot" />
        {site.brandCN}
      </Link>

      <div className="status">
        {meta && (
          <div className="art-running" aria-hidden="true">
            <span className="rt">{meta.title}</span>
            {meta.credits.length > 0 && (
              <span className="rc">
                {meta.credits.map((c, i) => (
                  <span key={i} className="credit">
                    <span className={"cmark " + (c.solid ? "solid" : "hollow")}>{c.mark}</span>
                    {c.name}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      <button className="toggle" onClick={toggle} aria-label="切换明暗主题" title="切换明暗主题">
        {mounted && theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>
    </header>
  );
}
