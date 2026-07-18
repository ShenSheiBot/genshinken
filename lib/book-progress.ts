export interface BookProgressRecord {
  bookId: string;
  chapterId: string;
  sectionId: string;
  updatedAt: string;
}

export interface BookContinuation {
  record: BookProgressRecord;
  source: "bookmark" | "progress";
}

export const BOOK_PROGRESS_EVENT = "un-canon:book-progress";

const KEY_PREFIX = "un-canon.book-reading.v1";

function key(bookId: string, kind: "bookmark" | "progress"): string {
  return `${KEY_PREFIX}.${bookId}.${kind}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRecord(value: string | null, bookId: string): BookProgressRecord | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      parsed.bookId !== bookId ||
      typeof parsed.chapterId !== "string" ||
      !parsed.chapterId ||
      typeof parsed.sectionId !== "string" ||
      !parsed.sectionId ||
      typeof parsed.updatedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.updatedAt))
    ) {
      return null;
    }
    return {
      bookId,
      chapterId: parsed.chapterId,
      sectionId: parsed.sectionId,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function emit(bookId: string) {
  window.dispatchEvent(new CustomEvent(BOOK_PROGRESS_EVENT, { detail: { bookId } }));
}

export function readBookProgress(bookId: string): BookProgressRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseRecord(window.localStorage.getItem(key(bookId, "progress")), bookId);
  } catch {
    return null;
  }
}

export function readBookBookmark(bookId: string): BookProgressRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseRecord(window.localStorage.getItem(key(bookId, "bookmark")), bookId);
  } catch {
    return null;
  }
}

/** A manual bookmark always wins, even when automatic progress is newer. */
export function readBookContinuation(bookId: string): BookContinuation | null {
  const bookmark = readBookBookmark(bookId);
  if (bookmark) return { record: bookmark, source: "bookmark" };
  const progress = readBookProgress(bookId);
  return progress ? { record: progress, source: "progress" } : null;
}

export function writeBookPosition(
  position: Omit<BookProgressRecord, "updatedAt">,
  kind: "bookmark" | "progress" = "progress"
): BookProgressRecord | null {
  if (typeof window === "undefined") return null;
  const record: BookProgressRecord = { ...position, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(key(position.bookId, kind), JSON.stringify(record));
    emit(position.bookId);
    return record;
  } catch {
    return null;
  }
}

export function clearBookBookmark(bookId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(bookId, "bookmark"));
    emit(bookId);
  } catch {
    // Privacy modes can deny localStorage; there is nothing else to clear.
  }
}

export function clearBookReadingData(bookId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(bookId, "bookmark"));
    window.localStorage.removeItem(key(bookId, "progress"));
    emit(bookId);
  } catch {
    // Privacy modes can deny localStorage; there is nothing else to clear.
  }
}
