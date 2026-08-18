import fs from "node:fs";
import path from "node:path";
import { parseYamlFrontMatter } from "./safe-front-matter.mjs";
import { renderMarkdown } from "./markdown";
import {
  hashRenderedContent,
  readMinutes,
  type ContentFormat,
  type Credit,
  type Post,
} from "./posts";
import {
  bookChapterHref,
  getBookBySlug,
  getBookChapter,
  getBookChapterCitation,
  getBookChapterCredits,
  getBookChapterDocument,
  isPublishedBookChapter,
  type Book,
  type PublishedBookChapter,
} from "./books";
import { CONTRIBUTORS } from "./contributors";
import { hanScriptLanguageTag, type HanScript } from "./han-script";
import type { CitationRecord } from "./citations";
import { translationEditionIsVisible, translationLifecycleValues } from "./translation-contract.mjs";
import { getPostBySlug } from "./posts";
import { site } from "./site";
import {
  readBookChapterTranslationSource,
  readPostTranslationSource,
} from "./translation-source.mjs";

export const TRANSLATION_LOCALES = ["en", "ja"] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
export const TRANSLATION_STATUSES = ["draft", "review", "published"] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];
export const TRANSLATION_CREDIT_ROLES = ["translator", "reviewer", "proofreader", "editor"] as const;
export type TranslationCreditRole = (typeof TRANSLATION_CREDIT_ROLES)[number];
export type SourceRevisionScope = "translation-payload" | "chapter-translation-payload";

export type TranslationSourceRef =
  | { type: "post"; slug: string }
  | { type: "book-chapter"; bookSlug: string; chapterId: string };

export type TranslationCredit = {
  role: TranslationCreditRole;
  contributorId: string;
  name: string;
  entityType: "person" | "organization";
  scope: string;
  note: string;
};

export type TranslationSource = {
  ref: TranslationSourceRef;
  key: string;
  title: string;
  subtitle: string;
  script: HanScript;
  language: "zh-Hans" | "zh-Hant";
  section: Post["section"];
  sectionNo: string;
  displayDateISO: string;
  format: ContentFormat;
  credits: Credit[];
  citation: CitationRecord;
  href: string;
  markdown: string;
  revision: string;
  revisionScope: SourceRevisionScope;
  post?: Post;
  book?: Book;
  chapter?: PublishedBookChapter;
};

export type TranslationEdition = {
  workId: string;
  sourceRef: TranslationSourceRef;
  sourceKey: string;
  locale: TranslationLocale;
  language: TranslationLocale;
  status: TranslationStatus;
  slug: string;
  bookSlug: string;
  bookTitle: string;
  bookSubtitle: string;
  bookExcerpt: string;
  href: string;
  title: string;
  subtitle: string;
  titleBreaks: string[];
  excerpt: string;
  credits: TranslationCredit[];
  translationMethod: "agent" | "human";
  sourceRelationship: "direct" | "relay" | "mixed";
  baseLanguage: string;
  sourceRevision: string;
  sourceRevisionScope: SourceRevisionScope;
  publishedISO: string;
  updatedISO: string;
  rights: string;
  markdown: string;
  html: string;
  contentRevision: string;
  readMin: number;
  format: ContentFormat;
  documentIndex: TranslationDocumentIndex;
  sourcePath: string;
};

export type TranslationIndexHeading = { id: string; title: string; level: number };
export type TranslationIndexVisual = {
  id: string;
  label: string;
  kind: "figure" | "table";
  index: number;
};
export type TranslationDocumentIndex = {
  headings: TranslationIndexHeading[];
  visuals: TranslationIndexVisual[];
  noteCount: number;
  sourceCount: number;
};

export type EditionLinkState = "available" | "preview" | "missing";
export type EditionLanguageLink = {
  language: "zh-Hans" | "zh-Hant" | TranslationLocale;
  label: string;
  href: string;
  state: EditionLinkState;
};

const TRANSLATIONS_ROOT = path.join(process.cwd(), "source", "_translations");
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&", apos: "'", gt: ">", hellip: "…", laquo: "«", ldquo: "“",
  lsquo: "‘", lt: "<", mdash: "—", nbsp: " ", ndash: "–", quot: '"',
  raquo: "»", rdquo: "”", rsquo: "’",
};

function renderedText(html: string): string {
  return html
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#(?:x([\da-f]+)|(\d+));/giu, (_entity, hexadecimal: string, decimal: string) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : " ";
    })
    .replace(/&([a-z]+);/giu, (entity, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/\s+/gu, " ")
    .trim();
}

function renderedSection(html: string, className: string): string {
  return html.match(new RegExp(
    `<section\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/section>`,
    "iu"
  ))?.[0] ?? "";
}

function countListItems(html: string): number {
  return (html.match(/<li\b/giu) ?? []).length;
}

function indexRenderedTranslation(html: string): { html: string; documentIndex: TranslationDocumentIndex } {
  const visuals: TranslationIndexVisual[] = [];
  let figure = 0;
  let table = 0;
  let indexedHtml = html.replace(
    /<figure\b[^>]*class="[^"]*\barticle-table\b[^"]*"[^>]*>[\s\S]*?<\/figure>|<img\b[^>]*>/giu,
    (element) => {
      const kind: TranslationIndexVisual["kind"] = /^<figure\b/iu.test(element) ? "table" : "figure";
      const index = kind === "table" ? ++table : ++figure;
      const existingId = /\bid=["']([^"']+)["']/iu.exec(element)?.[1];
      const id = existingId || `translation-${kind}-${index}`;
      const label = kind === "table"
        ? renderedText(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/iu.exec(element)?.[1] ?? "")
        : renderedText(/\balt=["']([^"']*)["']/iu.exec(element)?.[1] ?? "");
      visuals.push({ id, label, kind, index });
      return existingId ? element : element.replace(/^<([a-z]+)/iu, `<$1 id="${id}"`);
    }
  );
  indexedHtml = indexedHtml.replace(
    /(<section\b[^>]*class="[^"]*\bsource-notes\b[^"]*"[^>]*>\s*<h2)(?!\b[^>]*\bid=)/iu,
    '$1 id="source-note-label"'
  );
  const footnotes = renderedSection(indexedHtml, "footnotes");
  const sourceNotes = renderedSection(indexedHtml, "source-notes");
  const main = indexedHtml.replace(footnotes, "").replace(sourceNotes, "");
  const headings = [...main.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/giu)].flatMap((match) => {
    const id = /\bid=["']([^"']+)["']/iu.exec(match[2])?.[1];
    const title = renderedText(match[3]);
    return id && title ? [{ id, title, level: Number(match[1]) }] : [];
  });
  return {
    html: indexedHtml,
    documentIndex: { headings, visuals, noteCount: countListItems(footnotes), sourceCount: countListItems(sourceNotes) },
  };
}

function isTranslationLocale(value: unknown): value is TranslationLocale {
  return TRANSLATION_LOCALES.includes(value as TranslationLocale);
}

function sourceKey(ref: TranslationSourceRef): string {
  return ref.type === "post" ? `post:${ref.slug}` : `book:${ref.bookSlug}:${ref.chapterId}`;
}

export function translationHref(edition: Pick<TranslationEdition, "locale" | "slug" | "bookSlug" | "sourceRef">): string {
  return edition.sourceRef.type === "post"
    ? `/${edition.locale}/posts/${encodeURIComponent(edition.slug)}`
    : `/${edition.locale}/books/${encodeURIComponent(edition.bookSlug)}/chapters/${encodeURIComponent(edition.slug)}`;
}

export function translationPlaceholderHref(locale: TranslationLocale, source: TranslationSource): string {
  return source.ref.type === "post"
    ? `/${locale}/posts/${encodeURIComponent(source.ref.slug)}`
    : `/${locale}/books/${encodeURIComponent(source.ref.bookSlug)}/chapters/${encodeURIComponent(source.ref.chapterId)}`;
}

export function translationPreviewEnabled(): boolean {
  return process.env.ROOF_TRANSLATION_PREVIEW === "1";
}

function requiredText(data: Record<string, unknown>, key: string, source: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${source}: ${key} must be a non-empty string`);
  return value.trim();
}

function optionalText(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

function stableId(data: Record<string, unknown>, key: string, source: string): string {
  const value = requiredText(data, key, source);
  if (!STABLE_ID.test(value)) throw new Error(`${source}: ${key} must use lowercase ASCII words separated by hyphens`);
  return value;
}

function titleBreaks(value: unknown, title: string, source: string, locale: TranslationLocale): string[] {
  if (value == null) return [title];
  if (!Array.isArray(value)) throw new Error(`${source}: title_breaks must be a YAML array`);
  const segments = value.map((entry) => String(entry).trim()).filter(Boolean);
  const reconstructed = segments.join(locale === "en" ? " " : "");
  if (segments.length === 0 || reconstructed !== title) {
    throw new Error(`${source}: title_breaks must concatenate exactly to title`);
  }
  return segments;
}

function parseSourceRef(data: Record<string, unknown>, source: string): TranslationSourceRef {
  const type = requiredText(data, "source_type", source);
  if (type === "post") return { type, slug: stableId(data, "source_slug", source) };
  if (type === "book-chapter") {
    return {
      type,
      bookSlug: stableId(data, "source_book_slug", source),
      chapterId: stableId(data, "source_chapter_id", source),
    };
  }
  throw new Error(`${source}: source_type must be post / book-chapter`);
}

function localizedContributorName(
  contributorId: string,
  fallback: string,
  locale: TranslationLocale
): string {
  if (contributorId === "roof-genshiken" && locale === "en") return "Lab on Roof";
  return fallback;
}

function parseCredits(value: unknown, source: string, locale: TranslationLocale): TranslationCredit[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${source}: credits must be a non-empty YAML array`);
  const credits = value.map((entry, index): TranslationCredit => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${source}: credits[${index}] must be an object`);
    }
    const record = entry as Record<string, unknown>;
    const role = requiredText(record, "role", `${source}: credits[${index}]`);
    if (!TRANSLATION_CREDIT_ROLES.includes(role as TranslationCreditRole)) {
      throw new Error(`${source}: credits[${index}].role must be ${TRANSLATION_CREDIT_ROLES.join(" / ")}`);
    }
    const contributorId = stableId(record, "contributor_id", `${source}: credits[${index}]`);
    const contributor = CONTRIBUTORS.find((candidate) => candidate.id === contributorId);
    if (!contributor) throw new Error(`${source}: credits[${index}] references unregistered contributor ${contributorId}`);
    return {
      role: role as TranslationCreditRole,
      contributorId,
      name: localizedContributorName(contributorId, contributor.displayName, locale),
      entityType: "entityType" in contributor ? contributor.entityType : "person",
      scope: optionalText(record, "scope"),
      note: optionalText(record, "note"),
    };
  });
  if (!credits.some((credit) => credit.role === "translator")) {
    throw new Error(`${source}: credits must include at least one translator`);
  }
  return credits;
}

export async function resolveTranslationSource(ref: TranslationSourceRef): Promise<TranslationSource | null> {
  if (ref.type === "post") {
    const post = await getPostBySlug(ref.slug);
    if (!post || post.bookDocument) return null;
    const sourceFile = readPostTranslationSource(post.slug);
    return {
      ref,
      key: sourceKey(ref),
      title: post.title,
      subtitle: post.subtitle,
      script: post.script,
      language: hanScriptLanguageTag(post.script),
      section: post.section,
      sectionNo: post.sectionNo,
      displayDateISO: post.displayDateISO,
      format: post.format,
      credits: post.credits,
      citation: post.citation,
      href: `/posts/${encodeURIComponent(post.slug)}`,
      markdown: post.markdown,
      revision: sourceFile.revision,
      revisionScope: "translation-payload",
      post,
    };
  }

  const book = getBookBySlug(ref.bookSlug);
  if (!book) return null;
  const chapter = getBookChapter(book, ref.chapterId);
  if (!chapter || !isPublishedBookChapter(chapter)) return null;
  const document = await getBookChapterDocument(book, chapter.id);
  if (!document) return null;
  const sourceFile = readBookChapterTranslationSource(book.slug, chapter.id);
  return {
    ref,
    key: sourceKey(ref),
    title: chapter.title,
    subtitle: "",
    script: book.script,
    language: hanScriptLanguageTag(book.script),
    section: document.section,
    sectionNo: document.sectionNo,
    displayDateISO: chapter.publishedAt,
    format: chapter.format,
    credits: getBookChapterCredits(book, chapter),
    citation: getBookChapterCitation(book, chapter),
    href: bookChapterHref(book, chapter),
    markdown: document.markdown,
    revision: sourceFile.revision,
    revisionScope: "chapter-translation-payload",
    book,
    chapter,
  };
}

export function translationCitation(source: TranslationSource, edition: TranslationEdition): CitationRecord {
  const languageSuffix = edition.locale === "en" ? "En" : "Ja";
  const targetCreators = edition.credits.flatMap((credit) => {
    if (credit.role !== "translator" && credit.role !== "editor") return [];
    return [{ creatorType: credit.role, name: credit.name } as const];
  });
  const citation: CitationRecord = {
    ...source.citation,
    citationKey: `${source.citation.citationKey}${languageSuffix}`,
    title: edition.title,
    abstractNote: edition.excerpt,
    date: edition.publishedISO || edition.updatedISO || source.displayDateISO,
    url: `${site.url}${edition.href}`,
    language: edition.locale,
    blogTitle: edition.locale === "en" ? "Lab on Roof" : "屋頂現視研",
    rights: edition.rights || source.citation.rights,
    creators: [...source.citation.creators, ...targetCreators],
    extra: [
      source.citation.extra,
      `Translation of ${site.url}${source.href}`,
      `Translation method: ${edition.translationMethod}; source relationship: ${edition.sourceRelationship}; base language: ${edition.baseLanguage}`,
      `Edition credits: ${edition.credits.map((credit) => (
        `${credit.role}: ${credit.name}${credit.scope ? ` (${credit.scope})` : ""}`
      )).join("; ")}`,
    ].filter(Boolean).join("\n"),
  };
  if (source.ref.type === "book-chapter") citation.bookTitle = edition.bookTitle;
  return citation;
}

function translationFiles(locale: TranslationLocale): string[] {
  const localeRoot = path.join(TRANSLATIONS_ROOT, locale);
  const posts = path.join(localeRoot, "posts");
  const books = path.join(localeRoot, "books");
  const files = fs.existsSync(posts)
    ? fs.readdirSync(posts).filter((file) => file.endsWith(".md")).map((file) => path.join(posts, file))
    : [];
  if (fs.existsSync(books)) {
    for (const book of fs.readdirSync(books).sort()) {
      const directory = path.join(books, book);
      if (!fs.statSync(directory).isDirectory()) continue;
      files.push(...fs.readdirSync(directory)
        .filter((file) => file.endsWith(".md"))
        .map((file) => path.join(directory, file)));
    }
  }
  return files.sort();
}

async function loadLocale(locale: TranslationLocale): Promise<TranslationEdition[]> {
  return Promise.all(translationFiles(locale).map(async (sourcePath) => {
    const parsed = parseYamlFrontMatter(fs.readFileSync(sourcePath, "utf8"));
    const data = parsed.data as Record<string, unknown>;
    const sourceRef = parseSourceRef(data, sourcePath);
    const resolvedSource = await resolveTranslationSource(sourceRef);
    if (!resolvedSource) throw new Error(`${sourcePath}: source ${sourceKey(sourceRef)} does not exist`);

    const language = requiredText(data, "language", sourcePath);
    if (!isTranslationLocale(language) || language !== locale) {
      throw new Error(`${sourcePath}: language must match directory locale ${locale}`);
    }
    const status = requiredText(data, "status", sourcePath);
    if (!TRANSLATION_STATUSES.includes(status as TranslationStatus)) {
      throw new Error(`${sourcePath}: status must be ${TRANSLATION_STATUSES.join(" / ")}`);
    }
    const method = requiredText(data, "translation_method", sourcePath);
    if (method !== "agent" && method !== "human") {
      throw new Error(`${sourcePath}: translation_method must be agent / human`);
    }
    const sourceRelationship = requiredText(data, "source_relationship", sourcePath);
    if (sourceRelationship !== "direct" && sourceRelationship !== "relay" && sourceRelationship !== "mixed") {
      throw new Error(`${sourcePath}: source_relationship must be direct / relay / mixed`);
    }

    const slug = stableId(data, "slug", sourcePath);
    const filenameSlug = path.basename(sourcePath, ".md");
    if (slug !== filenameSlug) throw new Error(`${sourcePath}: slug must match filename ${filenameSlug}`);
    const bookSlug = sourceRef.type === "book-chapter" ? stableId(data, "book_slug", sourcePath) : "";
    const bookTitle = sourceRef.type === "book-chapter" ? requiredText(data, "book_title", sourcePath) : "";
    const bookSubtitle = sourceRef.type === "book-chapter" ? optionalText(data, "book_subtitle") : "";
    const bookExcerpt = sourceRef.type === "book-chapter" ? requiredText(data, "book_excerpt", sourcePath) : "";
    if (sourceRef.type === "book-chapter" && resolvedSource.book?.subtitle && !bookSubtitle) {
      throw new Error(`${sourcePath}: book_subtitle is required because the source book has a subtitle`);
    }
    if (sourceRef.type === "book-chapter" && path.basename(path.dirname(sourcePath)) !== bookSlug) {
      throw new Error(`${sourcePath}: book_slug must match its translation directory`);
    }

    const lifecycle = translationLifecycleValues(data, status, sourcePath);
    const revisionScope = requiredText(data, "source_revision_scope", sourcePath) as SourceRevisionScope;
    if (revisionScope !== resolvedSource.revisionScope) {
      throw new Error(`${sourcePath}: source_revision_scope must be ${resolvedSource.revisionScope}`);
    }
    if (status !== "draft" && lifecycle.sourceRevision !== resolvedSource.revision) {
      throw new Error(`${sourcePath}: source_revision is stale; expected ${resolvedSource.revision}`);
    }

    const title = requiredText(data, "title", sourcePath);
    const subtitle = optionalText(data, "subtitle");
    if (resolvedSource.subtitle && !subtitle) {
      throw new Error(`${sourcePath}: subtitle is required because the source edition has a subtitle`);
    }
    const credits = parseCredits(data.credits, sourcePath, locale);
    if (status === "published" && !credits.some((credit) => credit.role === "reviewer")) {
      throw new Error(`${sourcePath}: published editions require a reviewer credit`);
    }
    const format = optionalText(data, "format") || resolvedSource.format;
    if (format !== resolvedSource.format) {
      throw new Error(`${sourcePath}: format must preserve source format ${resolvedSource.format}`);
    }
    const rendered = indexRenderedTranslation(
      await renderMarkdown(parsed.content, { format, language: locale })
    );
    const edition: TranslationEdition = {
      workId: stableId(data, "work_id", sourcePath),
      sourceRef,
      sourceKey: resolvedSource.key,
      locale,
      language: locale,
      status: status as TranslationStatus,
      slug,
      bookSlug,
      bookTitle,
      bookSubtitle,
      bookExcerpt,
      href: "",
      title,
      subtitle,
      titleBreaks: titleBreaks(data.title_breaks, title, sourcePath, locale),
      excerpt: requiredText(data, "excerpt", sourcePath),
      credits,
      translationMethod: method,
      sourceRelationship,
      baseLanguage: requiredText(data, "base_language", sourcePath),
      sourceRevision: lifecycle.sourceRevision,
      sourceRevisionScope: revisionScope,
      publishedISO: lifecycle.publishedISO,
      updatedISO: lifecycle.updatedISO,
      rights: optionalText(data, "rights"),
      markdown: parsed.content,
      html: rendered.html,
      contentRevision: hashRenderedContent(rendered.html),
      readMin: readMinutes(rendered.html),
      format: format as ContentFormat,
      documentIndex: rendered.documentIndex,
      sourcePath,
    };
    edition.href = translationHref(edition);
    return edition;
  }));
}

let cache: Promise<TranslationEdition[]> | null = null;

export function getAllTranslationEditions(): Promise<TranslationEdition[]> {
  if (!cache) {
    cache = Promise.all(TRANSLATION_LOCALES.map(loadLocale)).then((groups) => {
      const editions = groups.flat();
      const editionKeys = new Set<string>();
      const routeKeys = new Set<string>();
      const workSources = new Map<string, string>();
      const sourceWorks = new Map<string, string>();
      const translatedBooks = new Map<string, string>();
      const translatedBookRoutes = new Map<string, string>();
      for (const edition of editions) {
        const editionKey = `${edition.locale}:${edition.workId}`;
        if (editionKeys.has(editionKey)) throw new Error(`duplicate translation edition ${editionKey}`);
        editionKeys.add(editionKey);
        const routeKey = `${edition.locale}:${edition.href}`;
        if (routeKeys.has(routeKey)) throw new Error(`duplicate translation route ${routeKey}`);
        routeKeys.add(routeKey);
        const priorSource = workSources.get(edition.workId);
        if (priorSource && priorSource !== edition.sourceKey) {
          throw new Error(`translation work ${edition.workId} maps to multiple sources`);
        }
        workSources.set(edition.workId, edition.sourceKey);
        const priorWork = sourceWorks.get(edition.sourceKey);
        if (priorWork && priorWork !== edition.workId) {
          throw new Error(`translation source ${edition.sourceKey} maps to multiple works`);
        }
        sourceWorks.set(edition.sourceKey, edition.workId);
        if (edition.sourceRef.type === "book-chapter") {
          const sourceBookKey = `${edition.locale}:${edition.sourceRef.bookSlug}`;
          const bookIdentity = JSON.stringify({
            slug: edition.bookSlug,
            title: edition.bookTitle,
            subtitle: edition.bookSubtitle,
            excerpt: edition.bookExcerpt,
          });
          const priorBookIdentity = translatedBooks.get(sourceBookKey);
          if (priorBookIdentity && priorBookIdentity !== bookIdentity) {
            throw new Error(`translated book ${sourceBookKey} has inconsistent route or metadata`);
          }
          translatedBooks.set(sourceBookKey, bookIdentity);
          const targetBookKey = `${edition.locale}:${edition.bookSlug}`;
          const priorSourceBook = translatedBookRoutes.get(targetBookKey);
          if (priorSourceBook && priorSourceBook !== edition.sourceRef.bookSlug) {
            throw new Error(`translated book route ${targetBookKey} maps to multiple source books`);
          }
          translatedBookRoutes.set(targetBookKey, edition.sourceRef.bookSlug);
        }
      }
      return editions;
    });
  }
  return cache;
}

export async function getTranslationEdition(
  locale: TranslationLocale,
  source: TranslationSource
): Promise<TranslationEdition | null> {
  const editions = await getAllTranslationEditions();
  const workId = editions.find((edition) => edition.sourceKey === source.key)?.workId;
  if (!workId) return null;
  return editions.find((edition) => edition.locale === locale && edition.workId === workId) ?? null;
}

export async function getTranslationEditionByRoute(
  locale: TranslationLocale,
  route: { type: "post"; slug: string } | { type: "book-chapter"; bookSlug: string; chapterSlug: string }
): Promise<TranslationEdition | null> {
  return (await getAllTranslationEditions()).find((edition) => {
    if (edition.locale !== locale || edition.sourceRef.type !== route.type) return false;
    return route.type === "post"
      ? edition.slug === route.slug
      : edition.bookSlug === route.bookSlug && edition.slug === route.chapterSlug;
  }) ?? null;
}

export async function getVisibleTranslationEdition(
  locale: TranslationLocale,
  source: TranslationSource
): Promise<TranslationEdition | null> {
  const edition = await getTranslationEdition(locale, source);
  if (!edition) return null;
  return translationEditionIsVisible(edition.status, translationPreviewEnabled()) ? edition : null;
}

export async function getPublishedTranslationEditions(source?: TranslationSource): Promise<TranslationEdition[]> {
  const editions = await getAllTranslationEditions();
  const workId = source
    ? editions.find((edition) => edition.sourceKey === source.key)?.workId
    : undefined;
  return editions.filter(
    (edition) => edition.status === "published" && (!source || edition.workId === workId)
  );
}

export async function getEditionLanguageLinks(source: TranslationSource): Promise<EditionLanguageLink[]> {
  const translations = await getAllTranslationEditions();
  const workId = translations.find((edition) => edition.sourceKey === source.key)?.workId;
  const byLocale = new Map(
    translations.filter((edition) => workId && edition.workId === workId).map((edition) => [edition.locale, edition])
  );
  return [
    { language: source.language, label: "中", href: source.href, state: "available" },
    ...TRANSLATION_LOCALES.map((locale): EditionLanguageLink => {
      const edition = byLocale.get(locale);
      const previewEnabled = translationPreviewEnabled();
      const visible = Boolean(edition && translationEditionIsVisible(edition.status, previewEnabled));
      const preview = Boolean(visible && edition?.status !== "published");
      return {
        language: locale,
        label: locale === "en" ? "EN" : "日",
        href: visible && edition ? edition.href : translationPlaceholderHref(locale, source),
        state: edition?.status === "published" ? "available" : preview ? "preview" : "missing",
      };
    }),
  ];
}
