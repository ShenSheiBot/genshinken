/**
 * R2 upload for generated ebooks, following the authentication and object
 * PUT pattern of scripts/manage-roof-assets.mjs / register-wechat-assets.mjs.
 * Artifacts land under downloads/ on the same public origin
 * (assets.labonroof.top); keys are content-addressed so responses can be
 * cached immutably and the committed manifest never points at stale bytes.
 */
import fs from "node:fs";

export interface EbookUploadTarget {
  accountId: string;
  bucket: string;
  publicBaseUrl: string;
  keyPrefix: string;
}

export const EPUB_CONTENT_TYPE = "application/epub+zip";

export function defaultEbookUploadTarget(env: NodeJS.ProcessEnv = process.env): EbookUploadTarget {
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID ?? "f301160e44a0ed1c9e6a9cd6be3690f5",
    bucket: env.EBOOK_ASSET_R2_BUCKET ?? "roof-genshinken-archive-assets",
    publicBaseUrl: (env.EBOOK_ASSET_BASE_URL ?? "https://assets.labonroof.top").replace(/\/+$/u, ""),
    keyPrefix: (env.EBOOK_ASSET_KEY_PREFIX ?? "downloads").replace(/^\/+|\/+$/gu, ""),
  };
}

export function ebookObjectKey(target: EbookUploadTarget, slug: string, contentRevision: string): string {
  return `${target.keyPrefix}/${slug}-${contentRevision}.epub`;
}

export function ebookPublicUrl(target: EbookUploadTarget, key: string): string {
  return `${target.publicBaseUrl}/${key}`;
}

export function ebookUploadToken(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CLOUDFLARE_API_TOKEN) return env.CLOUDFLARE_API_TOKEN;
  const configPath = env.WRANGLER_OAUTH_CONFIG;
  if (!configPath) {
    throw new Error("[ebook] set CLOUDFLARE_API_TOKEN or WRANGLER_OAUTH_CONFIG before uploading");
  }
  const config = fs.readFileSync(configPath, "utf8");
  const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/mu)?.[1];
  if (!token) throw new Error(`[ebook] Wrangler OAuth token not found in ${configPath}`);
  return token;
}

export async function uploadEbookObject({
  target,
  key,
  body,
  token,
  fetchImpl = fetch,
  attempts = 6,
}: {
  target: EbookUploadTarget;
  key: string;
  body: Uint8Array;
  token: string;
  fetchImpl?: typeof fetch;
  attempts?: number;
}): Promise<{ url: string }> {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${target.accountId}` +
    `/r2/buckets/${target.bucket}/objects/${encodedKey}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(body.length),
          "Content-Type": EPUB_CONTENT_TYPE,
        },
        // Uint8Array<ArrayBufferLike> vs BodyInit: Node accepts any Uint8Array.
        body: body as unknown as BodyInit,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`HTTP ${response.status} ${detail}`);
      }
      return { url: ebookPublicUrl(target, key) };
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(30_000, 700 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(
    `[ebook] upload failed for ${key}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
