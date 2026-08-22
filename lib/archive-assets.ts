export const ROOF_ARCHIVE_ASSET_BASE_URL = "https://assets.labonroof.top";

const ASSET_PREFIXES = new Map([
  ["attachments/roof-archive/", "roof-archive/"],
  ["attachments/wechat/", "wechat/"],
]);

function normalizedPath(source: string): string {
  return source.trim().split(/[?#]/u, 1)[0].replace(/^\.?\//u, "");
}

export function archiveAssetKey(source: string): string | undefined {
  const pathname = normalizedPath(source);
  for (const [localPrefix, remotePrefix] of ASSET_PREFIXES) {
    if (pathname.startsWith(localPrefix)) {
      return `${remotePrefix}${pathname.slice(localPrefix.length)}`;
    }
  }
  return undefined;
}

export function roofArchiveAssetKey(source: string): string | undefined {
  const key = archiveAssetKey(source);
  return key?.startsWith("roof-archive/") ? key : undefined;
}

export function rewriteArchiveAssetUrl(source: string): string {
  const key = archiveAssetKey(source);
  if (!key) return source;
  const suffix = source.trim().slice(source.trim().split(/[?#]/u, 1)[0].length);
  return `${ROOF_ARCHIVE_ASSET_BASE_URL}/${key}${suffix}`;
}

export const rewriteRoofArchiveAssetUrl = rewriteArchiveAssetUrl;
