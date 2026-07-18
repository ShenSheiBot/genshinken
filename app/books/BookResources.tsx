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
  if (status === "copied") return "已复制到剪贴板";
  return "复制失败，请重试";
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

  const citations = [
    {
      kind: "original" as const,
      label: "原书 BibTeX",
      detail: "原文版本",
      bibtex: originalBibtex,
    },
    {
      kind: "translation" as const,
      label: "译本 BibTeX",
      detail: "本站中文译本",
      bibtex: translationBibtex,
    },
  ];
  const files = [
    { format: "PDF", href: pdfUrl },
    { format: "EPUB", href: epubUrl },
  ].filter((file): file is { format: string; href: string } => Boolean(file.href));

  return (
    <section className={styles.resources} aria-labelledby="book-resources-heading">
      <header className={styles.resourceHeading}>
        <div>
          <span>引用与下载</span>
          <h2 id="book-resources-heading">书目资料</h2>
        </div>
        <p>只显示编辑部已经核验并实际提供的记录与文件。</p>
      </header>

      <div className={styles.citationGrid}>
        {citations.map(({ kind, label, detail, bibtex }, index) => {
          const activeStatus = copyState?.kind === kind ? copyState.status : null;
          const feedbackId = `book-resource-feedback-${kind}`;
          return (
            <article className={styles.citationCard} key={kind} data-citation={kind}>
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{label}</h3>
                  <p>{detail}</p>
                </div>
              </header>

              {bibtex ? (
                <div className={styles.copyAction}>
                  <button
                    type="button"
                    onClick={() => copyBibtex(kind, bibtex)}
                    aria-describedby={feedbackId}
                    disabled={activeStatus === "copying"}
                  >
                    <span>BIB</span>
                    {activeStatus === "copied" ? "已复制 ✓" : "复制 BibTeX"}
                  </button>
                  <span
                    id={feedbackId}
                    className={styles.copyFeedback}
                    aria-live="polite"
                  >
                    {activeStatus ? feedbackLabel(activeStatus) : "复制完整书目记录"}
                  </span>
                </div>
              ) : (
                <p className={styles.resourceUnavailable}>书目信息尚待核验。</p>
              )}
            </article>
          );
        })}
      </div>

      {files.length > 0 && (
        <div className={styles.fileShelf}>
          <div>
            <span>文件</span>
            <p>可下载版本</p>
          </div>
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
                  下载 ↘
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
