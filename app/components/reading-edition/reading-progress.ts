export const READING_PROGRESS_PREFIX = "ub_reading:v1:post:";
export const READING_PROGRESS_ENABLED_KEY = "ub_reading:enabled";

export type ReadingProgressStatus = "reading" | "completed";

export type ReadingProgressAnchor = {
  fingerprint: string;
  previousFingerprint: string | null;
  nextFingerprint: string | null;
  headingId: string | null;
  blockIndex: number;
  blockLineProgress: number;
  sectionProgress: number;
  bodyProgress: number;
  line: number;
  lineCount: number;
};

export type ReadingProgressRecord = {
  schema: 1;
  resource: `post:${string}`;
  revision: string;
  savedAt: number;
  status: ReadingProgressStatus;
  anchor: ReadingProgressAnchor;
  furthestProgress: number;
  completedAt?: number;
  endFingerprint?: string;
};

const FINGERPRINT_SKIP = "script,style,noscript,template,svg,[hidden],[aria-hidden='true'],sup,sub,rt,rp,.footnotes,.source-notes,[data-reading-update-boundary-host]";

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ratio(value: unknown): value is number {
  return finiteNumber(value) && value >= 0 && value <= 1;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isReadingProgressRecord(value: unknown, slug: string): value is ReadingProgressRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ReadingProgressRecord>;
  const anchor = record.anchor as Partial<ReadingProgressAnchor> | undefined;
  return record.schema === 1
    && record.resource === `post:${slug}`
    && typeof record.revision === "string"
    && finiteNumber(record.savedAt)
    && (record.status === "reading" || record.status === "completed")
    && !!anchor
    && typeof anchor.fingerprint === "string"
    && nullableString(anchor.previousFingerprint)
    && nullableString(anchor.nextFingerprint)
    && nullableString(anchor.headingId)
    && finiteNumber(anchor.blockIndex)
    && anchor.blockIndex >= 0
    && ratio(anchor.blockLineProgress)
    && ratio(anchor.sectionProgress)
    && ratio(anchor.bodyProgress)
    && finiteNumber(anchor.line)
    && anchor.line >= 1
    && finiteNumber(anchor.lineCount)
    && anchor.lineCount >= 1
    && ratio(record.furthestProgress)
    && (record.completedAt === undefined || finiteNumber(record.completedAt))
    && (record.endFingerprint === undefined || typeof record.endFingerprint === "string");
}

export function readingProgressKey(slug: string): string {
  return `${READING_PROGRESS_PREFIX}${encodeURIComponent(slug)}`;
}

export function nativeScrollRestorationHasPriority(type: string | undefined): boolean {
  return type === "back_forward" || type === "reload";
}

export function readReadingProgress(slug: string): ReadingProgressRecord | null {
  try {
    const raw = window.localStorage.getItem(readingProgressKey(slug));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isReadingProgressRecord(parsed, slug) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeReadingProgress(slug: string, record: ReadingProgressRecord): boolean {
  try {
    window.localStorage.setItem(readingProgressKey(slug), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function removeReadingProgress(slug: string): boolean {
  try {
    window.localStorage.removeItem(readingProgressKey(slug));
    return true;
  } catch {
    return false;
  }
}

export function removeAllReadingProgress(): number | null {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(READING_PROGRESS_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    return keys.length;
  } catch {
    return null;
  }
}

export function readReadingProgressEnabled(): boolean {
  try {
    return window.localStorage.getItem(READING_PROGRESS_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeReadingProgressEnabled(enabled: boolean): boolean {
  try {
    window.localStorage.setItem(READING_PROGRESS_ENABLED_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

function normalizedReadingText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A DOM-independent entry point used by tests and non-browser migrations. */
export function fingerprintReadingText(text: string, tagName: string): string {
  const normalized = normalizedReadingText(text);
  const source = `${tagName.toLowerCase()}:${normalized.length}:${normalized}`;

  // Two independently seeded 32-bit FNV-style accumulators keep the helper
  // synchronous while making collisions sufficiently unlikely for one post.
  let high = 0x811c9dc5;
  let low = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    high = Math.imul(high ^ code, 0x01000193);
    low = Math.imul(low ^ code, 0x85ebca6b);
  }
  return `${(high >>> 0).toString(16).padStart(8, "0")}${(low >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Generate a stable, synchronous fingerprint for a semantic reading block.
 * The normalized source text is never persisted; only this 64-bit digest is.
 */
export function fingerprintReadingNodes(nodes: Text[], tagName: string): string {
  const text = nodes
    .filter((node) => !node.parentElement?.closest(FINGERPRINT_SKIP))
    .map((node) => node.data)
    .join(" ");
  return fingerprintReadingText(text, tagName);
}
