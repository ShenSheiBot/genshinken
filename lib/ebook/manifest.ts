/**
 * Committed ebook manifest: the only artifact that enters git. Maps book
 * slug → published download metadata. Regeneration is keyed on the book's
 * contentRevision plus the generator version, following the incremental
 * pattern of public/fonts/cjk-font-manifest.json.
 */
import fs from "node:fs";
import path from "node:path";

/** Bump to invalidate every previously generated artifact. */
export const EBOOK_GENERATOR_VERSION = 1;

export const EBOOK_MANIFEST_RELATIVE_PATH = path.join("source", "_ebooks", "manifest.json");

export interface EbookManifestEntry {
  epubUrl: string;
  sha256: string;
  bytes: number;
  contentRevision: string;
  /* Per entry, not manifest-global: a partial rebuild after a generator bump
     must not mark books it did not reach as current. */
  generator: number;
  generatedAt: string;
}

/** Manifest namespaces: serialized books and single library articles. */
export type EbookManifestKind = "books" | "articles";

export interface EbookManifest {
  version: 1;
  books: Record<string, EbookManifestEntry>;
  articles: Record<string, EbookManifestEntry>;
}

export function defaultEbookManifestPath(root: string = process.cwd()): string {
  return path.join(root, EBOOK_MANIFEST_RELATIVE_PATH);
}

export function emptyEbookManifest(): EbookManifest {
  return { version: 1, books: {}, articles: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseEntry(
  value: unknown,
  source: string,
  kind: EbookManifestKind,
  slug: string
): EbookManifestEntry {
  if (!isRecord(value)) throw new Error(`[ebook] ${source}: ${kind}.${slug} must be an object`);
  const { epubUrl, sha256, bytes, contentRevision, generator, generatedAt } = value;
  // Production manifests carry https R2 URLs; local-preview manifests carry
  // root-relative /downloads/… paths served from public/. Anything else fails.
  if (
    typeof epubUrl !== "string" ||
    !(/^https:\/\//u.test(epubUrl) || /^\/downloads\/[^/\s][^\s]*$/u.test(epubUrl))
  ) {
    throw new Error(
      `[ebook] ${source}: ${kind}.${slug}.epubUrl must be an HTTPS URL or a root-relative /downloads/ path`
    );
  }
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(sha256)) {
    throw new Error(`[ebook] ${source}: ${kind}.${slug}.sha256 must be a hex SHA-256 digest`);
  }
  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) {
    throw new Error(`[ebook] ${source}: ${kind}.${slug}.bytes must be a positive integer`);
  }
  if (typeof contentRevision !== "string" || !/^[0-9a-f]{16}$/u.test(contentRevision)) {
    throw new Error(`[ebook] ${source}: ${kind}.${slug}.contentRevision must be a 16-hex revision`);
  }
  if (typeof generator !== "number" || !Number.isInteger(generator) || generator < 1) {
    throw new Error(`[ebook] ${source}: ${kind}.${slug}.generator must be a positive integer`);
  }
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error(`[ebook] ${source}: ${kind}.${slug}.generatedAt must be an ISO timestamp`);
  }
  return { epubUrl, sha256, bytes, contentRevision, generator, generatedAt };
}

function parseNamespace(
  value: unknown,
  source: string,
  kind: EbookManifestKind
): Record<string, EbookManifestEntry> {
  // A missing namespace reads as empty (manifests written before articles
  // existed); a present namespace must be a well-formed object.
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`[ebook] ${source}: ${kind} must be an object`);
  const entries: Record<string, EbookManifestEntry> = {};
  for (const [slug, entry] of Object.entries(value)) {
    entries[slug] = parseEntry(entry, source, kind, slug);
  }
  return entries;
}

export function parseEbookManifest(value: unknown, source: string): EbookManifest {
  if (!isRecord(value)) throw new Error(`[ebook] ${source}: manifest must be a JSON object`);
  if (value.version !== 1) throw new Error(`[ebook] ${source}: version must be 1`);
  if (!isRecord(value.books)) throw new Error(`[ebook] ${source}: books must be an object`);
  return {
    version: 1,
    books: parseNamespace(value.books, source, "books"),
    articles: parseNamespace(value.articles, source, "articles"),
  };
}

/** Missing manifest files read as an empty manifest so builds bootstrap cleanly. */
export function readEbookManifest(filePath: string = defaultEbookManifestPath()): EbookManifest {
  if (!fs.existsSync(filePath)) return emptyEbookManifest();
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`[ebook] ${filePath}: invalid JSON (${detail})`);
  }
  return parseEbookManifest(parsed, path.relative(process.cwd(), filePath));
}

function sortedNamespace(
  entries: Record<string, EbookManifestEntry>
): Record<string, EbookManifestEntry> {
  return Object.fromEntries(
    Object.keys(entries)
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((slug) => [slug, entries[slug]])
  );
}

export function writeEbookManifest(
  manifest: EbookManifest,
  filePath: string = defaultEbookManifestPath()
): void {
  const sorted: EbookManifest = {
    version: 1,
    books: sortedNamespace(manifest.books),
    articles: sortedNamespace(manifest.articles),
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * An entry is current only when it was produced by the running generator
 * version from exactly the same content revision.
 */
export function isEbookEntryCurrent(
  manifest: EbookManifest,
  kind: EbookManifestKind,
  slug: string,
  contentRevision: string
): boolean {
  const entry = manifest[kind][slug];
  return Boolean(entry)
    && entry.generator === EBOOK_GENERATOR_VERSION
    && entry.contentRevision === contentRevision;
}
