"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "copying" | "copied" | "failed";

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
  label = "复制 BibTeX",
}: {
  bibtex: string;
  className?: string;
  label?: string;
}) {
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
        aria-label="复制本页 BibTeX 引用"
      >
        <span>BIB</span>
        {status === "copied" ? "已复制 ✓" : status === "copying" ? "复制中…" : label}
      </button>
      <span role="status" aria-live="polite" aria-atomic="true">
        {status === "failed" ? "复制失败，请重试" : ""}
      </span>
    </span>
  );
}
