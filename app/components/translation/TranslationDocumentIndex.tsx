"use client";

import { useEffect, useState } from "react";
import type {
  TranslationDocumentIndex as DocumentIndex,
  TranslationLocale,
} from "@/lib/translations";
import styles from "./translation-edition.module.css";

const copy = {
  en: {
    label: "Article navigation",
    contents: "Contents",
    figures: "Figures & tables",
    figure: "Fig.",
    table: "Table",
    notes: "Notes",
    sources: "Sources",
  },
  ja: {
    label: "記事内ナビゲーション",
    contents: "目次",
    figures: "図表",
    figure: "図",
    table: "表",
    notes: "注",
    sources: "文献",
  },
} as const;

export default function TranslationDocumentIndex({
  locale,
  index,
}: {
  locale: TranslationLocale;
  index: DocumentIndex;
}) {
  const labels = copy[locale];
  const [activeId, setActiveId] = useState(index.headings[0]?.id ?? "");

  useEffect(() => {
    const headings = index.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (headings.length === 0) return;

    const update = () => {
      const anchor = Math.min(180, window.innerHeight * 0.24);
      let active = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= anchor) active = heading.id;
      }
      setActiveId(active);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [index.headings]);

  return (
    <nav id="translation-document-index" className={styles.documentIndex} aria-label={labels.label}>
      <section>
        <h2>{labels.contents}</h2>
        <ol>
          {index.headings.map((heading) => (
            <li data-level={heading.level} data-active={heading.id === activeId ? "true" : "false"} key={heading.id}>
              <a href={`#${heading.id}`} aria-current={heading.id === activeId ? "location" : undefined}>
                <i aria-hidden="true" />
                <span>{heading.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {index.visuals.length > 0 && (
        <details>
          <summary>{labels.figures}<b>{String(index.visuals.length).padStart(2, "0")}</b></summary>
          <ol className={styles.visualIndex}>
            {index.visuals.map((visual) => (
              <li key={visual.id}>
                <a href={`#${visual.id}`}>
                  <b>{visual.kind === "table" ? labels.table : labels.figure}{visual.index}</b>
                  <span>{visual.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      )}

      {(index.noteCount > 0 || index.sourceCount > 0) && (
        <div className={styles.referenceJumps}>
          {index.noteCount > 0 && <a href="#footnote-label">{labels.notes}<b>{index.noteCount}</b></a>}
          {index.sourceCount > 0 && <a href="#source-note-label">{labels.sources}<b>{index.sourceCount}</b></a>}
        </div>
      )}
    </nav>
  );
}
