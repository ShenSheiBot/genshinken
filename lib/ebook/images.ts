/**
 * Remote image acquisition for ebook packaging. Images are downloaded once
 * into an on-disk cache outside git (.local-archive/, already ignored) and
 * reused across rebuilds. A missing or failed image is a build error naming
 * the source document — never a silent skip.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FetchedImage, ImageFetcher } from "./html";

/** EPUB core media types only; anything else must fail loudly. */
const IMAGE_MEDIA_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

export function defaultImageCacheDirectory(root: string = process.cwd()): string {
  return path.join(root, ".local-archive", "ebook-image-cache");
}

function extensionForUrl(url: string, sourceLabel: string): string {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();
  if (!IMAGE_MEDIA_TYPES.has(extension)) {
    throw new Error(
      `[ebook] ${sourceLabel}: image ${url} has unsupported extension ${extension || "(none)"} — ` +
        "EPUB packaging supports gif/jpeg/png/svg/webp"
    );
  }
  return extension;
}

export function createCachedImageFetcher(
  options: {
    cacheDirectory?: string;
    fetchImpl?: typeof fetch;
  } = {}
): ImageFetcher {
  const cacheDirectory = options.cacheDirectory ?? defaultImageCacheDirectory();
  const fetchImpl = options.fetchImpl ?? fetch;

  return async (url: string, sourceLabel: string): Promise<FetchedImage> => {
    const extension = extensionForUrl(url, sourceLabel);
    const mediaType = IMAGE_MEDIA_TYPES.get(extension) as string;
    const cacheKey = createHash("sha256").update(url).digest("hex");
    const cachePath = path.join(cacheDirectory, `${cacheKey}${extension}`);
    if (fs.existsSync(cachePath)) {
      return { data: fs.readFileSync(cachePath), mediaType, extension };
    }

    let response: Response;
    try {
      response = await fetchImpl(url);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`[ebook] ${sourceLabel}: failed to download image ${url} (${detail})`);
    }
    if (!response.ok) {
      throw new Error(
        `[ebook] ${sourceLabel}: failed to download image ${url} (HTTP ${response.status})`
      );
    }
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length === 0) {
      throw new Error(`[ebook] ${sourceLabel}: image ${url} downloaded empty`);
    }
    fs.mkdirSync(cacheDirectory, { recursive: true });
    const temporary = `${cachePath}.download`;
    fs.writeFileSync(temporary, data);
    fs.renameSync(temporary, cachePath);
    return { data, mediaType, extension };
  };
}
