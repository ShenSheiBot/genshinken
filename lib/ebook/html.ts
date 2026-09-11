/**
 * Post-process rendered chapter HTML (produced exclusively by lib/markdown.ts)
 * into EPUB3 XHTML bodies:
 *  - download + inline remote images, rewriting URLs to packaged paths;
 *  - KaTeX output → embedded MathML (readers cannot rely on KaTeX HTML+CSS);
 *  - GFM footnotes → epub:type noteref/footnote/backlink round-trip;
 *  - root-relative site links → absolute URLs; cross-chapter fragment links
 *    → chapter-file targets; unresolvable fragments unwrap to plain text;
 *  - media embeds (audio/video/music figures) degrade to source links.
 */
import { createHash } from "node:crypto";
import {
  escapeXmlText,
  findElements,
  getAttribute,
  hasClass,
  isElement,
  parseHtmlFragment,
  removeAttribute,
  removeChild,
  replaceChild,
  serializeXhtml,
  setAttribute,
  textContent,
  walkElements,
  type XhtmlElement,
  type XhtmlFragment,
  type XhtmlNode,
} from "./xhtml";

export const SITE_ORIGIN = "https://labonroof.top";

export interface FetchedImage {
  data: Uint8Array;
  mediaType: string;
  extension: string;
}

export type ImageFetcher = (url: string, sourceLabel: string) => Promise<FetchedImage>;

export interface EbookImageAsset {
  fileName: string;
  url: string;
  data: Uint8Array;
  mediaType: string;
}

export interface ChapterInput {
  id: string;
  number: string;
  title: string;
  titleBreaks?: string[];
  anchor: string;
  html: string;
}

export interface PreparedChapter {
  id: string;
  number: string;
  title: string;
  fileName: string;
  fragment: XhtmlFragment;
  headerXhtml: string;
  ids: Set<string>;
  hasMath: boolean;
}

export interface FinalizedChapter {
  id: string;
  number: string;
  title: string;
  fileName: string;
  bodyXhtml: string;
  hasMath: boolean;
}

export function chapterFileName(chapterId: string): string {
  return `chapter-${chapterId}.xhtml`;
}

export function imageFileNameFor(url: string, extension: string): string {
  return `${createHash("sha256").update(url).digest("hex").slice(0, 16)}${extension}`;
}

const MATH_ML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
const DROPPED_IMAGE_ATTRIBUTES = ["loading", "decoding", "srcset", "sizes", "fetchpriority"];
const FORBIDDEN_EMBED_TAGS = new Set(["iframe", "video", "audio", "script", "embed", "object"]);
const MEDIA_FIGURE_CLASSES = ["article-video", "article-audio", "article-music"];
export const MEDIA_LINK_LABEL = "在线收看 / 收听";

function firstElementChild(node: XhtmlNode, tagName?: string): XhtmlElement | undefined {
  if (!("childNodes" in node)) return undefined;
  for (const child of node.childNodes as XhtmlNode[]) {
    if (isElement(child) && (!tagName || child.tagName === tagName)) return child;
  }
  return undefined;
}

function replaceKatexWithMathml(fragment: XhtmlFragment, sourceLabel: string): boolean {
  let hasMath = false;
  const roots = findElements(
    fragment,
    (element) => hasClass(element, "katex-display") || hasClass(element, "katex")
  );
  const outermost = roots.filter((element) =>
    !roots.some((other) => other !== element && findElements(other, (inner) => inner === element).length > 0)
  );
  for (const root of outermost) {
    const display = hasClass(root, "katex-display");
    const mathmlWrapper = findElements(root, (element) => hasClass(element, "katex-mathml"))[0]
      ?? (hasClass(root, "katex-mathml") ? root : undefined);
    const math = mathmlWrapper ? firstElementChild(mathmlWrapper, "math") : undefined;
    if (!math) {
      throw new Error(
        `[ebook] ${sourceLabel}: math export not yet supported — KaTeX output has no embeddable MathML`
      );
    }
    if (!getAttribute(math, "xmlns")) setAttribute(math, "xmlns", MATH_ML_NAMESPACE);
    if (display) setAttribute(math, "display", "block");
    const parent = root.parentNode as XhtmlNode | undefined;
    if (!parent) throw new Error(`[ebook] ${sourceLabel}: detached math markup`);
    removeChild(math.parentNode as XhtmlNode, math);
    replaceChild(parent, root, math);
    hasMath = true;
  }
  return hasMath;
}

/**
 * Archived assets sometimes carry a lying file extension (e.g. PNG bytes
 * served as .jpg). epubcheck rejects media-type mismatches, so the packaged
 * media type and extension come from the magic bytes whenever they are
 * recognizable; SVG (no signature) falls back to the URL-derived type.
 */
function sniffImageType(data: Uint8Array): { mediaType: string; extension: string } | null {
  const startsWith = (bytes: readonly number[], offset = 0) =>
    bytes.every((byte, index) => data[offset + index] === byte);
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return { mediaType: "image/png", extension: ".png" };
  if (startsWith([0xff, 0xd8, 0xff])) return { mediaType: "image/jpeg", extension: ".jpg" };
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return { mediaType: "image/gif", extension: ".gif" };
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mediaType: "image/webp", extension: ".webp" };
  }
  return null;
}

async function inlineImages(
  fragment: XhtmlFragment,
  sourceLabel: string,
  fetchImage: ImageFetcher,
  images: Map<string, EbookImageAsset>
): Promise<void> {
  const imageElements = findElements(fragment, (element) => element.tagName === "img");
  for (const image of imageElements) {
    const src = getAttribute(image, "src");
    if (!src) throw new Error(`[ebook] ${sourceLabel}: <img> without src`);
    const absolute = src.startsWith("/") ? `${SITE_ORIGIN}${src}` : src;
    if (!/^https?:\/\//u.test(absolute)) {
      throw new Error(`[ebook] ${sourceLabel}: unsupported image URL ${src}`);
    }
    let asset = images.get(absolute);
    if (!asset) {
      const fetched = await fetchImage(absolute, sourceLabel);
      const sniffed = sniffImageType(fetched.data);
      asset = {
        fileName: imageFileNameFor(absolute, sniffed?.extension ?? fetched.extension),
        url: absolute,
        data: fetched.data,
        mediaType: sniffed?.mediaType ?? fetched.mediaType,
      };
      images.set(absolute, asset);
    }
    setAttribute(image, "src", `../images/${asset.fileName}`);
    for (const attribute of DROPPED_IMAGE_ATTRIBUTES) removeAttribute(image, attribute);
  }
}

/**
 * XHTML restricts <figure> to (figcaption?, flow*) or (flow*, figcaption?).
 * Site markup (e.g. article-profile cards) may place the caption between
 * flow children; demote such captions to <p> — attributes and classes stay,
 * so the ebook stylesheet keeps addressing them — instead of reordering
 * content.
 */
function normalizeFigureCaptions(fragment: XhtmlFragment): void {
  const figures = findElements(fragment, (element) => element.tagName === "figure");
  for (const figure of figures) {
    const children = (figure.childNodes as XhtmlNode[]).filter(isElement);
    const captions = children.filter((child) => child.tagName === "figcaption");
    for (const caption of captions) {
      const keep =
        captions.length === 1 &&
        (children[0] === caption || children[children.length - 1] === caption);
      if (!keep) {
        caption.tagName = "p";
        caption.nodeName = "p";
      }
    }
  }
}

function degradeMediaFigures(fragment: XhtmlFragment, sourceLabel: string): void {
  const figures = findElements(
    fragment,
    (element) =>
      element.tagName === "figure" &&
      MEDIA_FIGURE_CLASSES.some((className) => hasClass(element, className))
  );
  for (const figure of figures) {
    const sourceUrl =
      findElements(figure, (element) => Boolean(getAttribute(element, "src")))
        .map((element) => getAttribute(element, "src"))
        .find((value) => value && /^https?:\/\//u.test(value))
      ?? findElements(figure, (element) => element.tagName === "a")
        .map((element) => getAttribute(element, "href"))
        .find((value) => value && /^https?:\/\//u.test(value));
    if (!sourceUrl) {
      throw new Error(`[ebook] ${sourceLabel}: media figure without a recoverable source URL`);
    }
    const caption = findElements(figure, (element) => element.tagName === "figcaption")[0];
    const captionText = caption ? textContent(caption).trim() : "";
    const replacementHtml =
      `<p class="ebook-media-link">${captionText ? `${escapeXmlText(captionText)} — ` : ""}` +
      `<a href="${sourceUrl}">${MEDIA_LINK_LABEL}</a></p>`;
    const replacement = parseHtmlFragment(replacementHtml).childNodes[0] as XhtmlNode;
    replaceChild(figure.parentNode as XhtmlNode, figure, replacement);
  }
}

function rejectRemainingEmbeds(fragment: XhtmlFragment, sourceLabel: string): void {
  walkElements(fragment, (element) => {
    if (FORBIDDEN_EMBED_TAGS.has(element.tagName)) {
      throw new Error(
        `[ebook] ${sourceLabel}: <${element.tagName}> embeds are not supported in EPUB output`
      );
    }
  });
}

function annotateFootnotes(fragment: XhtmlFragment): void {
  for (const reference of findElements(
    fragment,
    (element) => element.tagName === "a" && getAttribute(element, "data-footnote-ref") != null
  )) {
    setAttribute(reference, "epub:type", "noteref");
    setAttribute(reference, "role", "doc-noteref");
  }
  for (const section of findElements(
    fragment,
    (element) => element.tagName === "section" && hasClass(element, "footnotes")
  )) {
    setAttribute(section, "epub:type", "footnotes");
    setAttribute(section, "role", "doc-endnotes");
    for (const item of findElements(
      section,
      (element) => element.tagName === "li" && Boolean(getAttribute(element, "id"))
    )) {
      setAttribute(item, "epub:type", "footnote");
    }
  }
  for (const backlink of findElements(
    fragment,
    (element) => element.tagName === "a" && getAttribute(element, "data-footnote-backref") != null
  )) {
    setAttribute(backlink, "epub:type", "backlink");
    setAttribute(backlink, "role", "doc-backlink");
  }
}

function collectIds(fragment: XhtmlFragment, ids: Set<string>): void {
  walkElements(fragment, (element) => {
    const id = getAttribute(element, "id");
    if (id) ids.add(id);
  });
}

function chapterHeaderXhtml(chapter: ChapterInput): string {
  const titleSegments = chapter.titleBreaks?.length
    ? chapter.titleBreaks.map((segment) => escapeXmlText(segment)).join("<br />")
    : escapeXmlText(chapter.title);
  return (
    '<header class="ebook-chapter-header">' +
    `<p class="ebook-chapter-number">${escapeXmlText(chapter.number)}</p>` +
    `<h1 class="ebook-chapter-title" id="${escapeXmlText(chapter.anchor)}">${titleSegments}</h1>` +
    "</header>"
  );
}

export async function prepareChapter(
  chapter: ChapterInput,
  bookSlug: string,
  fetchImage: ImageFetcher,
  images: Map<string, EbookImageAsset>
): Promise<PreparedChapter> {
  const sourceLabel = `${bookSlug}/${chapter.id}`;
  const fragment = parseHtmlFragment(chapter.html);
  const hasMath = replaceKatexWithMathml(fragment, sourceLabel);
  degradeMediaFigures(fragment, sourceLabel);
  normalizeFigureCaptions(fragment);
  rejectRemainingEmbeds(fragment, sourceLabel);
  await inlineImages(fragment, sourceLabel, fetchImage, images);
  annotateFootnotes(fragment);

  const ids = new Set<string>([chapter.anchor]);
  collectIds(fragment, ids);
  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    fileName: chapterFileName(chapter.id),
    fragment,
    headerXhtml: chapterHeaderXhtml(chapter),
    ids,
    hasMath,
  };
}

/** Resolve fragment links across chapter files, then serialize each body. */
export function finalizeChapters(chapters: readonly PreparedChapter[]): FinalizedChapter[] {
  const owners = new Map<string, PreparedChapter>();
  for (const chapter of chapters) {
    for (const id of chapter.ids) {
      if (!owners.has(id)) owners.set(id, chapter);
    }
  }

  return chapters.map((chapter) => {
    const anchors = findElements(chapter.fragment, (element) => element.tagName === "a");
    for (const anchor of anchors) {
      const href = getAttribute(anchor, "href");
      if (!href) continue;
      if (href.startsWith("/")) {
        setAttribute(anchor, "href", `${SITE_ORIGIN}${href}`);
        continue;
      }
      if (!href.startsWith("#")) continue;
      const id = decodeURIComponent(href.slice(1));
      const owner = owners.get(id);
      if (!owner) {
        // Target was not exported (e.g. a forthcoming chapter): unwrap to text.
        const parent = anchor.parentNode as XhtmlNode | undefined;
        if (!parent || !("childNodes" in parent)) continue;
        const children = parent.childNodes as XhtmlNode[];
        const index = children.indexOf(anchor);
        if (index >= 0) children.splice(index, 1, ...(anchor.childNodes as XhtmlNode[]));
        continue;
      }
      if (owner !== chapter) {
        setAttribute(anchor, "href", `${owner.fileName}#${encodeURIComponent(id)}`);
      }
    }
    const bodyXhtml = chapter.headerXhtml +
      chapter.fragment.childNodes.map((child) => serializeXhtml(child as XhtmlNode)).join("");
    return {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      fileName: chapter.fileName,
      bodyXhtml,
      hasMath: chapter.hasMath,
    };
  });
}
