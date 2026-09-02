"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "copying" | "copied" | "failed";
type CitationCopyLocale = "zh" | "en" | "ja";

const copyUi = {
  zh: {
    action: "复制 BibTeX",
    ariaLabel: "复制本页 BibTeX 引用",
    copying: "复制中…",
    copied: "已复制 ✓",
    success: "BibTeX 已复制到剪贴板",
    failure: "复制失败，请重试",
  },
  en: {
    action: "Copy",
    ariaLabel: "Copy this edition’s BibTeX citation",
    copying: "Copying…",
    copied: "Copied ✓",
    success: "BibTeX copied to the clipboard",
    failure: "Copy failed. Please try again.",
  },
  ja: {
    action: "コピー",
    ariaLabel: "この版の BibTeX 引用をコピー",
    copying: "コピー中…",
    copied: "コピー済み ✓",
    success: "BibTeX をクリップボードにコピーしました",
    failure: "コピーできませんでした。もう一度お試しください",
  },
} as const;

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
}

export default function CitationCopyButton({
  bibtex,
  className,
  label,
  locale = "zh",
}: {
  bibtex: string;
  className?: string;
  label?: string;
  locale?: CitationCopyLocale;
}) {
  const labels = copyUi[locale];
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    setStatus("copying");
    try {
      await writeClipboard(bibtex);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    resetTimer.current = window.setTimeout(() => setStatus(null), 3200);
  };

  return (
    <span className={className}>
      <button
        type="button"
        onClick={copy}
        disabled={status === "copying"}
        aria-label={labels.ariaLabel}
      >
        <span>BIB</span>
        {status === "copied" ? labels.copied : status === "copying" ? labels.copying : label ?? labels.action}
      </button>
      <span role="status" aria-live="polite" aria-atomic="true">
        {status === "copied"
          ? labels.success
          : status === "failed"
            ? labels.failure
            : ""}
      </span>
    </span>
  );
}
