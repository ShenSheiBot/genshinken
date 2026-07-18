"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BOOK_PROGRESS_EVENT,
  clearBookBookmark,
  clearBookReadingData,
  readBookBookmark,
  readBookContinuation,
  readBookProgress,
  writeBookPosition,
  type BookContinuation,
} from "@/lib/book-progress";
import styles from "./books.module.css";

export interface ProgressChapter {
  id: string;
  title: string;
  anchor: string;
}

interface BookLocalProgressProps {
  bookId: string;
  documentBaseHref: string;
  start: {
    chapterId: string;
    sectionId: string;
    href: string;
  };
  latest: {
    chapterId: string;
    sectionId: string;
    href: string;
    title: string;
  };
  chapters: ProgressChapter[];
  validSectionIds: string[];
}

function documentHref(baseHref: string, sectionId: string): string {
  return `${baseHref}#${encodeURIComponent(sectionId)}`;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BookLocalProgress({
  bookId,
  documentBaseHref,
  start,
  latest,
  chapters,
  validSectionIds,
}: BookLocalProgressProps) {
  const [continuation, setContinuation] = useState<BookContinuation | null>(null);
  const chapterById = useMemo(
    () => new Map(chapters.map((chapter) => [chapter.id, chapter])),
    [chapters]
  );
  const validSections = useMemo(() => new Set(validSectionIds), [validSectionIds]);

  const refresh = useCallback(() => {
    const stored = readBookContinuation(bookId);
    const chapter = stored ? chapterById.get(stored.record.chapterId) : null;
    if (!stored || !chapter) {
      setContinuation(null);
      return;
    }
    setContinuation(validSections.has(stored.record.sectionId) ? stored : {
      ...stored,
      record: { ...stored.record, sectionId: chapter.anchor },
    });
  }, [bookId, chapterById, validSections]);

  useEffect(() => {
    refresh();
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: string }>).detail;
      if (!detail?.bookId || detail.bookId === bookId) refresh();
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(BOOK_PROGRESS_EVENT, handleProgress);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(BOOK_PROGRESS_EVENT, handleProgress);
    };
  }, [bookId, refresh]);

  const continueChapter = continuation
    ? chapterById.get(continuation.record.chapterId) ?? null
    : null;

  return (
    <section className={styles.readingActions} aria-labelledby="book-reading-actions">
      <header>
        <div>
          <span>阅读入口</span>
          <h2 id="book-reading-actions">选择从哪里开始</h2>
        </div>
        <p>页面不会根据记录自动跳转。</p>
      </header>

      <div className={styles.actionGrid}>
        <Link
          href={start.href}
          className={styles.primaryAction}
          onClick={() => writeBookPosition({ bookId, chapterId: start.chapterId, sectionId: start.sectionId })}
        >
          <span>01</span>
          <strong>从头阅读</strong>
          <small>从封面与前言开始</small>
          <b aria-hidden="true">↗</b>
        </Link>

        <Link
          href={latest.href}
          className={styles.primaryAction}
          onClick={() => writeBookPosition({ bookId, chapterId: latest.chapterId, sectionId: latest.sectionId })}
        >
          <span>02</span>
          <strong>阅读最新更新</strong>
          <small>{latest.title}</small>
          <b aria-hidden="true">↗</b>
        </Link>

        {continuation && continueChapter ? (
          <Link
            href={documentHref(documentBaseHref, continuation.record.sectionId)}
            className={`${styles.primaryAction} ${styles.continueAction}`}
          >
            <span>03</span>
            <strong>继续本机记录</strong>
            <small>
              {continuation.source === "bookmark" ? "手动书签" : "阅读位置"} · {continueChapter.title}
            </small>
            <b aria-hidden="true">↗</b>
          </Link>
        ) : (
          <div className={`${styles.primaryAction} ${styles.disabledAction}`} aria-disabled="true">
            <span>03</span>
            <strong>继续本机记录</strong>
            <small>此设备尚无阅读记录</small>
            <b aria-hidden="true">—</b>
          </div>
        )}
      </div>

      <footer className={styles.localNotice}>
        <p>
          记录只保存在此设备、此浏览器中，不会跨设备同步。手动设置的书签始终优先于自动阅读位置。
          {continuation && ` 当前记录更新于 ${displayDate(continuation.record.updatedAt)}。`}
        </p>
        {continuation && (
          <button type="button" onClick={() => clearBookReadingData(bookId)}>
            清除本机记录
          </button>
        )}
      </footer>
    </section>
  );
}

export function BookBookmarkButton({
  bookId,
  chapterId,
  sectionId,
}: {
  bookId: string;
  chapterId: string;
  sectionId: string;
}) {
  const [active, setActive] = useState(false);

  const refresh = useCallback(() => {
    const bookmark = readBookBookmark(bookId);
    setActive(Boolean(bookmark && bookmark.chapterId === chapterId && bookmark.sectionId === sectionId));
  }, [bookId, chapterId, sectionId]);

  useEffect(() => {
    refresh();
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: string }>).detail;
      if (!detail?.bookId || detail.bookId === bookId) refresh();
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(BOOK_PROGRESS_EVENT, handleProgress);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(BOOK_PROGRESS_EVENT, handleProgress);
    };
  }, [bookId, refresh]);

  return (
    <button
      type="button"
      className={styles.bookmarkButton}
      aria-pressed={active}
      onClick={() => {
        if (active) clearBookBookmark(bookId);
        else writeBookPosition({ bookId, chapterId, sectionId }, "bookmark");
      }}
    >
      {active ? "已设为本机书签" : "设为继续位置"}
    </button>
  );
}

export function BookChapterLink({
  bookId,
  chapterId,
  sectionId,
  href,
  className,
  children,
}: {
  bookId: string;
  chapterId: string;
  sectionId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => writeBookPosition({ bookId, chapterId, sectionId })}
    >
      {children}
    </Link>
  );
}

/**
 * Mount once on a book's existing /posts document. It records the nearest
 * rendered h2/h3 without ever navigating or overriding a manual bookmark.
 */
export function BookProgressTracker({
  bookId,
  startChapterId,
  startSectionId,
  chapters,
}: {
  bookId: string;
  startChapterId: string;
  startSectionId: string;
  chapters: ProgressChapter[];
}) {
  const lastPosition = useRef("");

  useEffect(() => {
    const article = document.querySelector<HTMLElement>(".art-body");
    if (!article) return;

    const chapterByAnchor = new Map(chapters.map((chapter) => [chapter.anchor, chapter.id]));
    let activeChapterId = startChapterId;
    const headings = Array.from(article.querySelectorAll<HTMLElement>("h2[id], h3[id]"))
      .map((element) => {
        activeChapterId = chapterByAnchor.get(element.id) ?? activeChapterId;
        return { element, chapterId: activeChapterId, sectionId: element.id };
      });
    const sectionOrder = new Map<string, number>([[startSectionId, 0]]);
    headings.forEach((heading, index) => sectionOrder.set(heading.sectionId, index + 1));

    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.3;
      let position = {
        chapterId: startChapterId,
        sectionId: startSectionId,
      };
      for (const heading of headings) {
        if (heading.element.getBoundingClientRect().top > readingLine) break;
        position = { chapterId: heading.chapterId, sectionId: heading.sectionId };
      }

      const positionKey = `${position.chapterId}:${position.sectionId}`;
      if (positionKey === lastPosition.current) return;
      const stored = readBookProgress(bookId);
      const storedOrder = stored ? sectionOrder.get(stored.sectionId) : undefined;
      const nextOrder = sectionOrder.get(position.sectionId) ?? 0;
      if (storedOrder != null && storedOrder >= nextOrder) {
        lastPosition.current = positionKey;
        return;
      }
      lastPosition.current = positionKey;
      writeBookPosition({ bookId, ...position });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("hashchange", schedule);
    schedule();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, [bookId, chapters, startChapterId, startSectionId]);

  return null;
}
