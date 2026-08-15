export const ROOF_ARCHIVE_ASSET_BASE_URL = "https://assets.labonroof.top";

const LOCAL_PREFIX = "attachments/roof-archive/";

export function roofArchiveAssetKey(source: string): string | undefined {
  const pathname = source.trim().split(/[?#]/u, 1)[0].replace(/^\.?\//u, "");
  if (!pathname.startsWith(LOCAL_PREFIX)) return undefined;
  return `roof-archive/${pathname.slice(LOCAL_PREFIX.length)}`;
}

export function rewriteRoofArchiveAssetUrl(source: string): string {
  const key = roofArchiveAssetKey(source);
  if (!key) return source;
  const suffix = source.trim().slice(source.trim().split(/[?#]/u, 1)[0].length);
  return `${ROOF_ARCHIVE_ASSET_BASE_URL}/${key}${suffix}`;
}
