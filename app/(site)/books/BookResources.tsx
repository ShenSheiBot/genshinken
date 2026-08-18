"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./books.module.css";

type CitationKind = "original" | "translation";
type CopyStatus = "copying" | "copied" | "failed";

interface CopyState {
  kind: CitationKind;
  status: CopyStatus;
}

interface BookResourcesProps {
  originalBibtex?: string;
  translationBibtex?: string;
  pdfUrl?: string;
  epubUrl?: string;
}

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

function feedbackLabel(status: CopyStatus): string {
  if (status === "copying") return "正在复制…";
  if (status === "copied") return "已复制";
  return "复制失败，请重试。";
}

function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export default function BookResources({
  originalBibtex,
  translationBibtex,
  pdfUrl,
  epubUrl,
}: BookResourcesProps) {
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const resetTimer = useRef<number | null>(null);
  const hasAnything = Boolean(originalBibtex || translationBibtex || pdfUrl || epubUrl);

  useEffect(() => () => {
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
  }, []);

  if (!hasAnything) return null;

  const copyBibtex = async (kind: CitationKind, bibtex: string) => {
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    setCopyState({ kind, status: "copying" });
    try {
      await writeClipboard(bibtex);
      setCopyState({ kind, status: "copied" });
    } catch {
      setCopyState({ kind, status: "failed" });
    }
    resetTimer.current = window.setTimeout(() => setCopyState(null), 3200);
  };

  const citations: Array<{ kind: CitationKind; label: string; bibtex: string }> = [];
  if (originalBibtex) citations.push({ kind: "original", label: "原书 BibTeX", bibtex: originalBibtex });
  if (translationBibtex) {
    citations.push({ kind: "translation", label: "译本 BibTeX", bibtex: translationBibtex });
  }

  const files = [
    { format: "PDF", href: pdfUrl },
    { format: "EPUB", href: epubUrl },
  ].filter((file): file is { format: string; href: string } => Boolean(file.href));

  return (
    <section className={styles.resources} aria-labelledby="book-resources-heading">
      <header className={styles.resourceHeading}>
        <h2 id="book-resources-heading">引用与文件</h2>
      </header>

      {citations.length > 0 && (
        <div className={styles.citationGrid}>
          {citations.map(({ kind, label, bibtex }) => {
            const activeStatus = copyState?.kind === kind ? copyState.status : null;
            return (
              <article className={styles.citationCard} key={kind} data-citation={kind}>
                <header>
                  <span>{kind === "original" ? "原书" : "译本"}</span>
                  <h3>{label}</h3>
                </header>

                <div className={styles.copyAction}>
                  <button
                    type="button"
                    onClick={() => copyBibtex(kind, bibtex)}
                    aria-label={`复制${label}`}
                    disabled={activeStatus === "copying"}
                  >
                    <span>BIB</span>
                    {activeStatus === "copied" ? "已复制 ✓" : "复制"}
                  </button>
                  {activeStatus && (
                    <span className={styles.copyFeedback} role="status" aria-live="polite" aria-atomic="true">
                      {feedbackLabel(activeStatus)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <div className={styles.fileShelf}>
          <span>文件</span>
          <div className={styles.fileActions}>
            {files.map(({ format, href }) => {
              const external = isExternalUrl(href);
              return (
                <a
                  key={format}
                  href={href}
                  download={!external}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  aria-label={`下载 ${format} 文件`}
                >
                  <span>{format}</span>
                  下载 →
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
