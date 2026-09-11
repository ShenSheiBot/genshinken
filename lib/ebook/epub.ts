/**
 * EPUB3 container assembly: OPF + nav + XHTML chapters + typographic cover +
 * colophon + embedded fonts, zipped with the mimetype entry first and stored
 * per the EPUB OCF spec. The zip itself uses fflate (small, dependency-free);
 * no heavyweight ebook tooling is involved.
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";
import { escapeXmlAttribute, escapeXmlText } from "./xhtml";
import { MEDIA_LINK_LABEL, type EbookImageAsset, type FinalizedChapter } from "./html";
import type { CollectedEditionMeta } from "./collect";

export interface EpubFontAsset {
  family: string;
  fileName: string;
  data: Uint8Array;
  weight: string;
  emphasisAlias?: string;
  licenseFileName: string;
  licenseData: Uint8Array;
}

export interface BuildEpubOptions {
  meta: CollectedEditionMeta;
  chapters: FinalizedChapter[];
  images: EbookImageAsset[];
  fonts: EpubFontAsset[];
  generatedAt: Date;
  /** Override for tests; defaults to lib/ebook/styles/ebook.css. */
  css?: string;
}

/**
 * Every fixed string rendered into cover / nav / colophon templates. Kept in
 * one constant so the font-subset charset can cover template text exactly.
 */
export const EPUB_STATIC_TEXT = {
  coverKicker: "屋顶现视研连载",
  coverKickerArticle: "屋顶现视研文库",
  tocTitle: "目录",
  coverEntry: "封面",
  bodymatterEntry: "正文",
  colophonEntry: "版本说明",
  colophonRows: {
    title: "书名",
    articleTitle: "题名",
    authors: "作者",
    translators: "译者",
    proofreaders: "校对",
    included: "收录",
    includedPattern: "收录至第一二三四五六七八九十百千0123456789章·共已刊（连载中暂停更新已完结）",
    generated: "生成",
    generatedSuffix: "屋顶现视研电子书版",
    source: "来源",
    rights: "授权",
  },
  mediaLinkLabel: MEDIA_LINK_LABEL,
  publisher: "屋顶现视研",
} as const;

export function epubStaticText(): string {
  return JSON.stringify(EPUB_STATIC_TEXT);
}

function defaultCss(): string {
  return fs.readFileSync(path.join(process.cwd(), "lib", "ebook", "styles", "ebook.css"), "utf8");
}

function fontFaceCss(fonts: readonly EpubFontAsset[]): string {
  const faces: string[] = [];
  for (const font of fonts) {
    const families = [font.family, ...(font.emphasisAlias ? [font.emphasisAlias] : [])];
    for (const family of families) {
      faces.push([
        "@font-face {",
        `  font-family: "${family}";`,
        `  src: url("../fonts/${font.fileName}") format("woff2");`,
        "  font-style: normal;",
        `  font-weight: ${font.weight};`,
        "}",
      ].join("\n"));
    }
  }
  return faces.length > 0 ? `${faces.join("\n\n")}\n\n` : "";
}

function xhtmlDocument({
  title,
  language,
  bodyClass,
  bodyXhtml,
  cssHref,
}: {
  title: string;
  language: string;
  bodyClass?: string;
  bodyXhtml: string;
  cssHref: string;
}): string {
  const bodyAttributes = bodyClass ? ` class="${escapeXmlAttribute(bodyClass)}"` : "";
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!DOCTYPE html>",
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"` +
      ` xml:lang="${escapeXmlAttribute(language)}" lang="${escapeXmlAttribute(language)}">`,
    "<head>",
    `<title>${escapeXmlText(title)}</title>`,
    `<link rel="stylesheet" type="text/css" href="${escapeXmlAttribute(cssHref)}" />`,
    "</head>",
    `<body${bodyAttributes}>`,
    bodyXhtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function coverBody(meta: CollectedEditionMeta): string {
  const labels = EPUB_STATIC_TEXT;
  const kicker = meta.kind === "article" ? labels.coverKickerArticle : labels.coverKicker;
  const subtitle = meta.subtitle
    ? `<p class="ebook-cover-subtitle">${escapeXmlText(meta.subtitle)}</p>`
    : "";
  // Books carry the serial chapter counter; articles keep only the mono
  // date + domain line (there is no chapter state to report).
  const footer = meta.kind === "book"
    ? `${meta.statusLabel} · ${String(meta.publishedChapterCount).padStart(2, "0")}` +
      ` / ${String(meta.totalChapterCount).padStart(2, "0")} · labonroof.top`
    : `${meta.date} · labonroof.top`;
  return (
    '<section class="ebook-cover" epub:type="cover">' +
    `<span class="ebook-cover-kicker">${escapeXmlText(kicker)}</span>` +
    `<strong class="ebook-cover-title">${escapeXmlText(meta.title)}</strong>` +
    subtitle +
    `<small class="ebook-cover-footer">${escapeXmlText(footer)}</small>` +
    "</section>"
  );
}

function colophonBody(meta: CollectedEditionMeta, generatedAt: Date): string {
  const labels = EPUB_STATIC_TEXT.colophonRows;
  const generatedDate = generatedAt.toISOString().slice(0, 10);
  const rows: Array<[string, string]> = [
    [
      meta.kind === "article" ? labels.articleTitle : labels.title,
      meta.subtitle ? `${meta.title}（${meta.subtitle}）` : meta.title,
    ],
    ...(meta.authors.length > 0 ? [[labels.authors, meta.authors.join(" · ")] as [string, string]] : []),
    ...(meta.translators.length > 0
      ? [[labels.translators, meta.translators.join(" · ")] as [string, string]]
      : []),
    ...(meta.kind === "article" && meta.proofreaders.length > 0
      ? [[labels.proofreaders, meta.proofreaders.join(" · ")] as [string, string]]
      : []),
    // Serial inclusion state only exists for books; articles are complete.
    ...(meta.kind === "book"
      ? [[
          labels.included,
          `收录至第 ${meta.latestChapterNumber} 章 · 共 ${meta.publishedChapterCount} 章已刊（${meta.statusLabel}）`,
        ] as [string, string]]
      : []),
    [labels.generated, `${generatedDate} · ${labels.generatedSuffix}`],
    [labels.source, meta.url],
    ...(meta.rights
      ? [[labels.rights, meta.licenseUrl ? `${meta.rights}（${meta.licenseUrl}）` : meta.rights] as [
          string,
          string,
        ]]
      : []),
  ];
  return (
    '<section class="ebook-colophon" epub:type="colophon" role="doc-colophon">' +
    `<h1>${escapeXmlText(EPUB_STATIC_TEXT.colophonEntry)}</h1>` +
    "<dl>" +
    rows
      .map(([term, detail]) => `<dt>${escapeXmlText(term)}</dt><dd>${escapeXmlText(detail)}</dd>`)
      .join("") +
    "</dl>" +
    "</section>"
  );
}

function navDocument(meta: CollectedEditionMeta, chapters: readonly FinalizedChapter[]): string {
  const labels = EPUB_STATIC_TEXT;
  const tocEntries = [
    `<li><a href="text/cover.xhtml">${escapeXmlText(labels.coverEntry)}</a></li>`,
    ...chapters.map(
      (chapter) =>
        `<li><a href="text/${escapeXmlAttribute(chapter.fileName)}">` +
        `${escapeXmlText(`${chapter.number} ${chapter.title}`)}</a></li>`
    ),
    `<li><a href="text/colophon.xhtml">${escapeXmlText(labels.colophonEntry)}</a></li>`,
  ].join("");
  const firstChapter = chapters[0];
  const landmarks = [
    `<li><a epub:type="cover" href="text/cover.xhtml">${escapeXmlText(labels.coverEntry)}</a></li>`,
    `<li><a epub:type="toc" href="nav.xhtml">${escapeXmlText(labels.tocTitle)}</a></li>`,
    ...(firstChapter
      ? [
          `<li><a epub:type="bodymatter" href="text/${escapeXmlAttribute(firstChapter.fileName)}">` +
            `${escapeXmlText(labels.bodymatterEntry)}</a></li>`,
        ]
      : []),
    `<li><a epub:type="colophon" href="text/colophon.xhtml">${escapeXmlText(labels.colophonEntry)}</a></li>`,
  ].join("");
  const body =
    `<nav epub:type="toc" id="toc"><h1>${escapeXmlText(labels.tocTitle)}</h1><ol>${tocEntries}</ol></nav>` +
    `<nav epub:type="landmarks" hidden="hidden"><ol>${landmarks}</ol></nav>`;
  return xhtmlDocument({
    title: labels.tocTitle,
    language: meta.language,
    bodyXhtml: body,
    cssHref: "styles/ebook.css",
  });
}

function isoSeconds(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

function packageDocument(options: BuildEpubOptions): string {
  const { meta, chapters, images, fonts, generatedAt } = options;
  const metadata: string[] = [
    `<dc:identifier id="pub-id">${escapeXmlText(meta.identifier)}</dc:identifier>`,
    `<dc:title>${escapeXmlText(meta.subtitle ? `${meta.title}（${meta.subtitle}）` : meta.title)}</dc:title>`,
    `<dc:language>${escapeXmlText(meta.language)}</dc:language>`,
  ];
  meta.authors.forEach((author, index) => {
    metadata.push(
      `<dc:creator id="creator-${index + 1}">${escapeXmlText(author)}</dc:creator>`,
      `<meta refines="#creator-${index + 1}" property="role" scheme="marc:relators">aut</meta>`
    );
  });
  const contributors: Array<{ name: string; role: string }> = [
    ...meta.translators.map((name) => ({ name, role: "trl" })),
    ...(meta.kind === "article" ? meta.proofreaders.map((name) => ({ name, role: "pfr" })) : []),
  ];
  contributors.forEach((contributor, index) => {
    metadata.push(
      `<dc:contributor id="contributor-${index + 1}">${escapeXmlText(contributor.name)}</dc:contributor>`,
      `<meta refines="#contributor-${index + 1}" property="role" scheme="marc:relators">${contributor.role}</meta>`
    );
  });
  metadata.push(
    `<dc:publisher>${escapeXmlText(meta.publisher)}</dc:publisher>`,
    `<dc:date>${escapeXmlText(meta.date)}</dc:date>`,
    `<dc:description>${escapeXmlText(meta.description)}</dc:description>`
  );
  if (meta.rights) metadata.push(`<dc:rights>${escapeXmlText(meta.rights)}</dc:rights>`);
  metadata.push(`<meta property="dcterms:modified">${isoSeconds(generatedAt)}</meta>`);

  const manifestItems: string[] = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />',
    '<item id="css" href="styles/ebook.css" media-type="text/css" />',
    '<item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml" />',
    '<item id="colophon" href="text/colophon.xhtml" media-type="application/xhtml+xml" />',
  ];
  chapters.forEach((chapter, index) => {
    const properties = chapter.hasMath ? ' properties="mathml"' : "";
    manifestItems.push(
      `<item id="chapter-${index + 1}" href="text/${escapeXmlAttribute(chapter.fileName)}"` +
        ` media-type="application/xhtml+xml"${properties} />`
    );
  });
  images.forEach((image, index) => {
    manifestItems.push(
      `<item id="img-${index + 1}" href="images/${escapeXmlAttribute(image.fileName)}"` +
        ` media-type="${escapeXmlAttribute(image.mediaType)}" />`
    );
  });
  const licenseFiles = new Map<string, EpubFontAsset>();
  fonts.forEach((font, index) => {
    manifestItems.push(
      `<item id="font-${index + 1}" href="fonts/${escapeXmlAttribute(font.fileName)}"` +
        ' media-type="font/woff2" />'
    );
    if (!licenseFiles.has(font.licenseFileName)) licenseFiles.set(font.licenseFileName, font);
  });
  [...licenseFiles.keys()].forEach((licenseFileName, index) => {
    manifestItems.push(
      `<item id="license-${index + 1}" href="fonts/${escapeXmlAttribute(licenseFileName)}"` +
        ' media-type="text/plain" />'
    );
  });

  const spineItems = [
    '<itemref idref="cover-page" />',
    '<itemref idref="nav" />',
    ...chapters.map((_, index) => `<itemref idref="chapter-${index + 1}" />`),
    '<itemref idref="colophon" />',
  ];

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"' +
      ` xml:lang="${escapeXmlAttribute(meta.language)}">`,
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
    ...metadata,
    "</metadata>",
    "<manifest>",
    ...manifestItems,
    "</manifest>",
    "<spine>",
    ...spineItems,
    "</spine>",
    "</package>",
  ].join("\n");
}

const CONTAINER_XML = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
  "<rootfiles>",
  '<rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml" />',
  "</rootfiles>",
  "</container>",
].join("\n");

export function buildEpub(options: BuildEpubOptions): Uint8Array {
  const { meta, chapters, images, fonts, generatedAt } = options;
  const encoder = new TextEncoder();
  const css = fontFaceCss(fonts) + (options.css ?? defaultCss());

  const files: Record<string, [Uint8Array, { level: 0 | 6; mtime: Date }]> = {};
  const mtime = generatedAt;
  const add = (name: string, data: Uint8Array | string, level: 0 | 6 = 6) => {
    if (files[name]) throw new Error(`[ebook] duplicate zip entry ${name}`);
    files[name] = [typeof data === "string" ? encoder.encode(data) : data, { level, mtime }];
  };

  add("mimetype", "application/epub+zip", 0);
  add("META-INF/container.xml", CONTAINER_XML);
  add("OEBPS/package.opf", packageDocument(options));
  add("OEBPS/nav.xhtml", navDocument(meta, chapters));
  add("OEBPS/styles/ebook.css", css);
  add(
    "OEBPS/text/cover.xhtml",
    xhtmlDocument({
      title: meta.title,
      language: meta.language,
      bodyClass: "ebook-cover-page",
      bodyXhtml: coverBody(meta),
      cssHref: "../styles/ebook.css",
    })
  );
  for (const chapter of chapters) {
    add(
      `OEBPS/text/${chapter.fileName}`,
      xhtmlDocument({
        title: `${chapter.number} ${chapter.title}`,
        language: meta.language,
        bodyXhtml: chapter.bodyXhtml,
        cssHref: "../styles/ebook.css",
      })
    );
  }
  add(
    "OEBPS/text/colophon.xhtml",
    xhtmlDocument({
      title: EPUB_STATIC_TEXT.colophonEntry,
      language: meta.language,
      bodyXhtml: colophonBody(meta, generatedAt),
      cssHref: "../styles/ebook.css",
    })
  );
  for (const image of images) add(`OEBPS/images/${image.fileName}`, image.data);
  const seenLicenses = new Set<string>();
  for (const font of fonts) {
    add(`OEBPS/fonts/${font.fileName}`, font.data);
    if (!seenLicenses.has(font.licenseFileName)) {
      seenLicenses.add(font.licenseFileName);
      add(`OEBPS/fonts/${font.licenseFileName}`, font.licenseData);
    }
  }

  return zipSync(files);
}

/** Test/validation helper: read back every entry of a generated EPUB. */
export function readEpubEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const entries = unzipSync(bytes);
  return new Map(Object.entries(entries));
}
