import { parse } from "parse5";

const MAX_HTML_BYTES = 512 * 1024;
const MAX_ICON_BYTES = 256 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 8_000;
const LINK_PREVIEW_USER_AGENT = "RoofLinkPreview/1.0 (+https://labonroof.top)";

type HtmlAttribute = { name: string; value: string };
type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  value?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
};

type IconCandidate = {
  href: string;
  rel: string[];
  sizes: string;
  type: string;
};

export type ExternalLinkPreview = {
  url: string;
  hostname: string;
  siteName: string;
  title: string;
  iconUrl: string;
};

export type ExternalLinkIcon = {
  bytes: Uint8Array;
  contentType: "image/gif" | "image/jpeg" | "image/png" | "image/webp" | "image/x-icon";
};

const SITE_NAME_FALLBACKS = new Map<string, string>([
  ["zhihu.com", "知乎"],
  ["www.zhihu.com", "知乎"],
  ["zhuanlan.zhihu.com", "知乎专栏"],
]);

function attribute(node: HtmlNode, name: string): string {
  return node.attrs?.find((item) => item.name.toLowerCase() === name)?.value?.trim() ?? "";
}

function textContent(node: HtmlNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.childNodes ?? []).map(textContent).join("");
}

function cleanText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function boundedText(value: string, limit: number): string {
  return Array.from(cleanText(value)).slice(0, limit).join("");
}

function walk(node: HtmlNode, visitNode: (node: HtmlNode) => void): void {
  visitNode(node);
  for (const child of node.childNodes ?? []) walk(child, visitNode);
}

function metaValue(nodes: HtmlNode[], key: string): string {
  const normalizedKey = key.toLowerCase();
  for (const node of nodes) {
    if (node.tagName !== "meta") continue;
    const name = (attribute(node, "property") || attribute(node, "name")).toLowerCase();
    if (name === normalizedKey) return cleanText(attribute(node, "content"));
  }
  return "";
}

function iconSizeScore(sizes: string): number {
  if (/\bany\b/iu.test(sizes)) return 320;
  const dimensions = [...sizes.matchAll(/(\d+)x(\d+)/giu)]
    .map((match) => Math.min(Number(match[1]), Number(match[2])))
    .filter(Number.isFinite);
  if (dimensions.length === 0) return 0;
  const best = Math.max(...dimensions);
  if (best >= 64 && best <= 256) return 260;
  if (best > 256) return 220;
  if (best >= 32) return 180;
  return best;
}

function iconScore(candidate: IconCandidate): number {
  const isOrdinaryIcon = candidate.rel.includes("icon");
  const isAppleIcon = candidate.rel.includes("apple-touch-icon")
    || candidate.rel.includes("apple-touch-icon-precomposed");
  return (isOrdinaryIcon ? 1_000 : isAppleIcon ? 600 : 0)
    + iconSizeScore(candidate.sizes)
    + (candidate.href.startsWith("https://") ? 20 : 0);
}

function isSupportedIconCandidate(candidate: IconCandidate): boolean {
  const type = candidate.type.toLowerCase();
  if (type === "image/svg+xml" || /\.svg(?:$|[?#])/iu.test(candidate.href)) return false;
  return !type || [
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ].includes(type);
}

function resolvedIconUrl(candidate: IconCandidate, pageUrl: URL): string {
  try {
    const icon = new URL(candidate.href, pageUrl);
    if (icon.protocol !== "http:" && icon.protocol !== "https:") return "";
    return icon.href;
  } catch {
    return "";
  }
}

function conciseSiteName(value: string, hostname: string): string {
  const first = cleanText(value).split(/\s+(?:[-–—|｜])\s+/u)[0]?.trim();
  return boundedText(first || hostname.replace(/^www\./iu, ""), 36);
}

function fallbackSiteName(hostname: string): string {
  return SITE_NAME_FALLBACKS.get(hostname.toLowerCase()) || hostname.replace(/^www\./iu, "");
}

export function fallbackExternalLinkPreview(value: string): ExternalLinkPreview | null {
  if (!isPreviewablePublicUrl(value)) return null;
  const url = new URL(value);
  const hostname = url.hostname.replace(/^www\./iu, "");
  return {
    url: url.href,
    hostname,
    siteName: fallbackSiteName(url.hostname),
    title: "",
    iconUrl: new URL("/favicon.ico", url).href,
  };
}

export function parseExternalLinkPreview(html: string, pageUrl: URL): ExternalLinkPreview {
  const document = parse(html) as unknown as HtmlNode;
  const nodes: HtmlNode[] = [];
  walk(document, (node) => nodes.push(node));

  const titleElement = nodes.find((node) => node.tagName === "title");
  const title = metaValue(nodes, "og:title")
    || metaValue(nodes, "twitter:title")
    || cleanText(titleElement ? textContent(titleElement) : "");
  const rawSiteName = metaValue(nodes, "og:site_name")
    || metaValue(nodes, "application-name");
  const hostname = pageUrl.hostname.replace(/^www\./iu, "");
  const declaredBase = nodes.find((node) => node.tagName === "base" && attribute(node, "href"));
  let iconBase = pageUrl;
  if (declaredBase) {
    try {
      const candidateBase = new URL(attribute(declaredBase, "href"), pageUrl);
      if (candidateBase.protocol === "http:" || candidateBase.protocol === "https:") {
        iconBase = candidateBase;
      }
    } catch {
      // An invalid <base> must not discard otherwise valid page-relative icons.
    }
  }

  const icons: IconCandidate[] = [];
  for (const node of nodes) {
    if (node.tagName !== "link") continue;
    const rel = attribute(node, "rel").toLowerCase().split(/\s+/u).filter(Boolean);
    if (!rel.includes("icon")
      && !rel.includes("apple-touch-icon")
      && !rel.includes("apple-touch-icon-precomposed")) continue;
    const href = attribute(node, "href");
    if (!href) continue;
    icons.push({
      href,
      rel,
      sizes: attribute(node, "sizes"),
      type: attribute(node, "type"),
    });
  }
  const iconUrl = icons
    .filter(isSupportedIconCandidate)
    .map((candidate) => ({ candidate, url: resolvedIconUrl(candidate, iconBase) }))
    .filter((item) => item.url)
    .sort((left, right) => iconScore(right.candidate) - iconScore(left.candidate))[0]?.url
    || new URL("/favicon.ico", pageUrl).href;

  return {
    url: pageUrl.href,
    hostname,
    siteName: conciseSiteName(rawSiteName, fallbackSiteName(pageUrl.hostname)),
    title: boundedText(title, 240),
    iconUrl,
  };
}

function isIpv4Literal(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname);
}

export function isPreviewablePublicUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (!hostname || hostname === "localhost" || !hostname.includes(".")) return false;
  if (isIpv4Literal(hostname) || hostname.includes(":")) return false;
  if (/\.(?:local|localhost|internal|home|lan|test|invalid|example)$/u.test(hostname)) return false;
  return true;
}

async function fetchPublicResource(
  value: string,
  accept: string,
  resourceName: "icon" | "link"
): Promise<{ response: Response; url: URL }> {
  if (!isPreviewablePublicUrl(value)) throw new Error(`unsupported ${resourceName} target`);
  let current = new URL(value);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: accept,
        "User-Agent": LINK_PREVIEW_USER_AGENT,
      },
    });
    if (response.status < 300 || response.status >= 400) return { response, url: current };

    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) {
      throw new Error(`${resourceName} redirect limit reached`);
    }
    const next = new URL(location, current);
    if (!isPreviewablePublicUrl(next.href)) throw new Error(`unsafe ${resourceName} redirect target`);
    await response.body?.cancel();
    current = next;
  }
  throw new Error(`${resourceName} redirect limit reached`);
}

async function readHtmlPrefix(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length <= MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = MAX_HTML_BYTES - length;
    chunks.push(value.byteLength <= remaining ? value : value.subarray(0, remaining));
    length += Math.min(value.byteLength, remaining);
    if (value.byteLength > remaining || length === MAX_HTML_BYTES) {
      await reader.cancel();
      break;
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const charset = response.headers.get("content-type")?.match(/charset=([^;\s]+)/iu)?.[1]
    ?.replace(/["']/gu, "") || "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export async function fetchExternalLinkPreview(value: string): Promise<ExternalLinkPreview> {
  const { response, url } = await fetchPublicResource(
    value,
    "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    "link"
  );
  if (!response.ok) throw new Error(`upstream returned ${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType && !contentType.includes("text/html")
    && !contentType.includes("application/xhtml+xml")) {
    throw new Error("upstream is not HTML");
  }
  return parseExternalLinkPreview(await readHtmlPrefix(response), url);
}

function sniffIconContentType(bytes: Uint8Array): ExternalLinkIcon["contentType"] | "" {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6) {
    const signature = new TextDecoder("ascii").decode(bytes.subarray(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = new TextDecoder("ascii").decode(bytes.subarray(0, 4));
    const webp = new TextDecoder("ascii").decode(bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  if (bytes.length >= 4
    && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "image/x-icon";
  }
  return "";
}

async function fetchIconBytes(value: string): Promise<ExternalLinkIcon> {
  const { response } = await fetchPublicResource(
    value,
    "image/webp,image/png,image/jpeg,image/gif,image/x-icon,*/*;q=0.1",
    "icon"
  );
  if (!response.ok || !response.body) throw new Error(`icon upstream returned ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_ICON_BYTES) throw new Error("icon is too large");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    if (!chunk) continue;
    if (length + chunk.byteLength > MAX_ICON_BYTES) {
      await reader.cancel();
      throw new Error("icon is too large");
    }
    chunks.push(chunk);
    length += chunk.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const contentType = sniffIconContentType(bytes);
  if (!contentType) throw new Error("unsupported icon format");
  return { bytes, contentType };
}

export async function fetchExternalLinkIcon(pageValue: string): Promise<ExternalLinkIcon> {
  const fallbackPreview = fallbackExternalLinkPreview(pageValue);
  if (!fallbackPreview) throw new Error("unsupported link target");

  // The conventional origin favicon is cheap and often remains public even when
  // the page itself is protected by an anti-bot challenge (for example Zhihu).
  // Try it before paying for, or depending on, an HTML metadata request.
  try {
    return await fetchIconBytes(fallbackPreview.iconUrl);
  } catch (fallbackError) {
    try {
      const preview = await fetchExternalLinkPreview(pageValue);
      if (preview.iconUrl !== fallbackPreview.iconUrl) {
        return await fetchIconBytes(preview.iconUrl);
      }
    } catch {
      // Preserve the direct favicon failure below; metadata is only a recovery path.
    }
    throw fallbackError;
  }
}
