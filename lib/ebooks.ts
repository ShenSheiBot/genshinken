/**
 * App-facing accessor for the committed ebook download manifest. The UI must
 * consume ONLY this manifest — zero runtime coupling to ebook generation —
 * and must never surface links for slugs the manifest does not contain.
 *
 * EBOOK_MANIFEST_PATH overrides the manifest location for local preview
 * (e.g. `.ebook-dist/manifest.local.json` written by
 * `scripts/build-ebooks.mjs --local-preview`).
 */
import path from "node:path";
import {
  defaultEbookManifestPath,
  readEbookManifest,
  type EbookManifestEntry,
} from "./ebook/manifest";

export interface EbookDownloads {
  epubUrl: string;
}

export type BookEbookDownloads = EbookDownloads;

export function resolveEbookManifestPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.EBOOK_MANIFEST_PATH;
  if (override) return path.resolve(process.cwd(), override);
  return defaultEbookManifestPath();
}

export function getBookEbookDownloads(
  slug: string,
  manifestPath: string = resolveEbookManifestPath()
): EbookDownloads | null {
  const entry: EbookManifestEntry | undefined = readEbookManifest(manifestPath).books[slug];
  if (!entry) return null;
  return { epubUrl: entry.epubUrl };
}

export function getArticleEbookDownloads(
  slug: string,
  manifestPath: string = resolveEbookManifestPath()
): EbookDownloads | null {
  const entry: EbookManifestEntry | undefined = readEbookManifest(manifestPath).articles[slug];
  if (!entry) return null;
  return { epubUrl: entry.epubUrl };
}
