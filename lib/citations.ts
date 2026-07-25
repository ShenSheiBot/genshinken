const SITE_ORIGIN = "https://un-canon.blog";
const SITE_PUBLISHER = "西方負典編譯組";

export const ZOTERO_ITEM_TYPES = [
  "blogPost",
  "book",
  "bookSection",
  "journalArticle",
  "preprint",
  "thesis",
  "interview",
] as const;

export type ZoteroItemType = (typeof ZOTERO_ITEM_TYPES)[number];

export const ZOTERO_CREATOR_TYPES = [
  "author",
  "editor",
  "translator",
  "interviewee",
  "interviewer",
] as const;

export type ZoteroCreatorType = (typeof ZOTERO_CREATOR_TYPES)[number];

export type CitationCreator =
  | {
      creatorType: ZoteroCreatorType;
      name: string;
      firstName?: never;
      lastName?: never;
    }
  | {
      creatorType: ZoteroCreatorType;
      firstName: string;
      lastName: string;
      name?: never;
    };

/**
 * The field names intentionally follow Zotero's item JSON schema. This is a
 * deliberately small subset rather than a second, site-specific bibliography
 * vocabulary.
 */
export interface CitationRecord {
  itemType: ZoteroItemType;
  citationKey: string;
  title: string;
  creators: CitationCreator[];
  abstractNote?: string;
  date?: string;
  url?: string;
  accessDate?: string;
  language?: string;
  shortTitle?: string;
  rights?: string;
  extra?: string;
  publisher?: string;
  place?: string;
  series?: string;
  seriesNumber?: string;
  volume?: string;
  edition?: string;
  numPages?: string;
  ISBN?: string;
  DOI?: string;
  ISSN?: string;
  bookTitle?: string;
  publicationTitle?: string;
  journalAbbreviation?: string;
  issue?: string;
  pages?: string;
  seriesTitle?: string;
  repository?: string;
  archiveID?: string;
  genre?: string;
  archive?: string;
  archiveLocation?: string;
  thesisType?: string;
  university?: string;
  interviewMedium?: string;
  blogTitle?: string;
  websiteType?: string;
}

export type CitationInput = Partial<CitationRecord>;
export type CitationMetadata = Record<string, string | string[]>;

const STRING_FIELDS = [
  "citationKey",
  "title",
  "abstractNote",
  "date",
  "url",
  "accessDate",
  "language",
  "shortTitle",
  "rights",
  "extra",
  "publisher",
  "place",
  "series",
  "seriesNumber",
  "volume",
  "edition",
  "numPages",
  "ISBN",
  "DOI",
  "ISSN",
  "bookTitle",
  "publicationTitle",
  "journalAbbreviation",
  "issue",
  "pages",
  "seriesTitle",
  "repository",
  "archiveID",
  "genre",
  "archive",
  "archiveLocation",
  "thesisType",
  "university",
  "interviewMedium",
  "blogTitle",
  "websiteType",
] as const satisfies readonly (keyof CitationRecord)[];

const ALLOWED_FIELDS = new Set<string>(["itemType", "creators", ...STRING_FIELDS]);
const CITATION_KEY = /^[^\s,{}]+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(source: string, detail: string): never {
  throw new Error(`${source}: ${detail}`);
}

function requiredText(value: unknown, source: string): string {
  if (typeof value !== "string" || !value.trim()) fail(source, "必须是非空字符串");
  return value.trim();
}

function parseCreator(value: unknown, source: string): CitationCreator {
  if (!isRecord(value)) fail(source, "必须是 Zotero creator 对象");
  const allowed = new Set(["creatorType", "name", "firstName", "lastName"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(source, `含不受支持的 Zotero creator 字段 ${key}`);
  }

  const creatorType = requiredText(value.creatorType, `${source}.creatorType`);
  if (!ZOTERO_CREATOR_TYPES.includes(creatorType as ZoteroCreatorType)) {
    fail(source, `creatorType 必须是 ${ZOTERO_CREATOR_TYPES.join(" / ")}`);
  }

  if (value.name != null) {
    if (value.firstName != null || value.lastName != null) {
      fail(source, "单字段 name 不能与 firstName / lastName 同时使用");
    }
    return {
      creatorType: creatorType as ZoteroCreatorType,
      name: requiredText(value.name, `${source}.name`),
    };
  }

  return {
    creatorType: creatorType as ZoteroCreatorType,
    firstName: typeof value.firstName === "string" ? value.firstName.trim() : "",
    lastName: requiredText(value.lastName, `${source}.lastName`),
  };
}

/**
 * Parse a citation block and reject unknown field names. Rejecting typos here
 * prevents apparently valid but silently discarded Zotero metadata.
 */
export function parseCitationInput(value: unknown, source: string): CitationInput {
  if (!isRecord(value)) fail(source, "必须是对象");
  for (const key of Object.keys(value)) {
    if (!ALLOWED_FIELDS.has(key)) fail(source, `含不受支持的 Zotero 字段 ${key}`);
  }

  const parsed: CitationInput = {};
  if (value.itemType != null) {
    const itemType = requiredText(value.itemType, `${source}.itemType`);
    if (!ZOTERO_ITEM_TYPES.includes(itemType as ZoteroItemType)) {
      fail(source, `itemType 必须是 ${ZOTERO_ITEM_TYPES.join(" / ")}`);
    }
    parsed.itemType = itemType as ZoteroItemType;
  }

  if (value.creators != null) {
    if (!Array.isArray(value.creators)) fail(`${source}.creators`, "必须是数组");
    parsed.creators = value.creators.map((creator, index) =>
      parseCreator(creator, `${source}.creators[${index}]`)
    );
  }

  for (const field of STRING_FIELDS) {
    const candidate = value[field];
    if (candidate == null) continue;
    parsed[field] = requiredText(candidate, `${source}.${field}`) as never;
  }

  if (parsed.citationKey && !CITATION_KEY.test(parsed.citationKey)) {
    fail(`${source}.citationKey`, "不能含空白、逗号或花括号");
  }
  if (parsed.url) {
    let url: URL;
    try {
      url = new URL(parsed.url);
    } catch {
      fail(`${source}.url`, "必须是绝对 HTTP(S) URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      fail(`${source}.url`, "必须是绝对 HTTP(S) URL");
    }
  }

  return parsed;
}

export function mergeCitation(
  defaults: CitationRecord,
  overrides: CitationInput | undefined,
  source: string
): CitationRecord {
  const citation = {
    ...defaults,
    ...overrides,
    creators: overrides?.creators ?? defaults.creators,
  };
  if (citation.itemType !== "blogPost") {
    delete citation.blogTitle;
    delete citation.websiteType;
  }
  if (citation.url?.startsWith(`${SITE_ORIGIN}/`)) {
    citation.publisher = SITE_PUBLISHER;
  }
  if (!citation.citationKey || !CITATION_KEY.test(citation.citationKey)) {
    fail(`${source}.citationKey`, "缺失或格式无效");
  }
  if (!citation.title.trim()) fail(`${source}.title`, "不能为空");
  validateCitationSemantics(citation, source);
  return citation;
}

export function validateCitationSemantics(citation: CitationRecord, source: string): void {
  if (citation.itemType === "journalArticle" && !citation.publicationTitle) {
    fail(source, "journalArticle 必须填写 publicationTitle");
  }
  if (citation.itemType === "bookSection" && !citation.bookTitle) {
    fail(source, "bookSection 必须填写 bookTitle");
  }
  if (citation.itemType === "preprint" && !citation.repository) {
    fail(source, "preprint 必须填写 repository");
  }
  if (citation.itemType === "thesis") {
    if (!citation.thesisType) fail(source, "thesis 必须填写 thesisType");
    if (!citation.university) fail(source, "thesis 必须填写 university");
  }
  if (citation.itemType === "interview") {
    if (!citation.interviewMedium) fail(source, "interview 必须填写 interviewMedium");
    if (!citation.creators.some((creator) => creator.creatorType === "interviewee")) {
      fail(source, "interview 至少需要一位 creatorType: interviewee");
    }
  }
}

export function citationKeyForSlug(slug: string, date: string): string {
  const year = /^\d{4}/u.exec(date)?.[0] ?? "undated";
  return `un_canon_${slug.replaceAll("-", "_")}_${year}`;
}

export function fullCitationTitle(title: string, subtitle?: string): string {
  return subtitle?.trim() ? `${title}：${subtitle.trim()}` : title;
}

export function pageCitationDefaults(input: {
  slug: string;
  title: string;
  subtitle?: string;
  creators: CitationCreator[];
  date: string;
  abstractNote?: string;
  rights?: string;
}): CitationRecord {
  return {
    itemType: "blogPost",
    citationKey: citationKeyForSlug(input.slug, input.date),
    title: fullCitationTitle(input.title, input.subtitle),
    creators: input.creators,
    date: input.date,
    url: `${SITE_ORIGIN}/posts/${encodeURIComponent(input.slug)}`,
    language: "zh-Hans",
    ...(input.abstractNote ? { abstractNote: input.abstractNote } : {}),
    ...(input.rights ? { rights: input.rights } : {}),
    publisher: SITE_PUBLISHER,
    blogTitle: "西方負典的博客",
    websiteType: "博客",
  };
}

export function bookCitationDefaults(input: {
  slug: string;
  title: string;
  subtitle?: string;
  creators: CitationCreator[];
  date: string;
  abstractNote?: string;
}): CitationRecord {
  return {
    itemType: "book",
    citationKey: citationKeyForSlug(`${input.slug}_zh`, input.date),
    title: fullCitationTitle(input.title, input.subtitle),
    creators: input.creators,
    date: input.date,
    url: `${SITE_ORIGIN}/books/${encodeURIComponent(input.slug)}`,
    language: "zh-Hans",
    ...(input.abstractNote ? { abstractNote: input.abstractNote } : {}),
    publisher: SITE_PUBLISHER,
  };
}

function creatorName(creator: CitationCreator): string {
  if (typeof creator.name === "string") return creator.name;
  return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
}

function bibtexEscape(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replace(/([#$%&_])/g, "\\$1")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

function bibtexCreator(creator: CitationCreator): string {
  if (typeof creator.name === "string") return `{${bibtexEscape(creator.name)}}`;
  const lastName = bibtexEscape(creator.lastName);
  const firstName = bibtexEscape(creator.firstName);
  return firstName ? `${lastName}, ${firstName}` : lastName;
}

function creatorField(
  citation: CitationRecord,
  creatorTypes: readonly ZoteroCreatorType[]
): string | undefined {
  const creators = citation.creators.filter((creator) => creatorTypes.includes(creator.creatorType));
  return creators.length ? creators.map(bibtexCreator).join(" and ") : undefined;
}

function isMastersThesis(value: string | undefined): boolean {
  return Boolean(value && new RegExp(
    String.raw`\b(?:ma|m\.a\.|master|masters|msc|m\.sc\.)\b|\u7855士`,
    "iu"
  ).test(value));
}

function bibtexEntryType(citation: CitationRecord): string {
  if (citation.itemType === "book") return "book";
  if (citation.itemType === "bookSection") return "incollection";
  if (citation.itemType === "journalArticle") return "article";
  if (citation.itemType === "thesis") {
    return isMastersThesis(citation.thesisType) ? "mastersthesis" : "phdthesis";
  }
  // Zotero's classic BibTeX exporter falls back to @misc for blogPost,
  // preprint and interview. Their exact Zotero type is carried by page meta.
  return "misc";
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

export function citationToBibtex(citation: CitationRecord): string {
  const fields: Array<{ name: string; value: string; raw?: boolean }> = [];
  const add = (name: string, value: string | undefined, raw = false) => {
    if (value?.trim()) fields.push({ name, value: value.trim(), raw });
  };

  const primaryCreators = citation.itemType === "interview"
    ? creatorField(citation, ["interviewee"])
    : creatorField(citation, ["author"]);
  add("author", primaryCreators, true);
  add("editor", creatorField(citation, ["editor"]), true);
  add("translator", creatorField(citation, ["translator"]), true);
  if (citation.itemType === "interview") {
    add("collaborator", creatorField(citation, ["interviewer"]), true);
  }
  add("title", citation.title);
  add("shorttitle", citation.shortTitle);

  const isoDate = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/u.exec(citation.date ?? "");
  if (isoDate) {
    add("year", isoDate[1]);
    const month = Number(isoDate[2]);
    if (month >= 1 && month <= 12) add("month", MONTHS[month - 1], true);
  } else {
    add("year", citation.date);
  }

  if (citation.itemType === "journalArticle") {
    add("journal", citation.publicationTitle);
    add("volume", citation.volume);
    add("number", citation.issue);
    add("pages", citation.pages?.replace(/[-\u2012-\u2015\u2053]+/gu, "--"));
  } else {
    add("series", citation.series);
    add("number", citation.seriesNumber);
  }
  if (citation.itemType === "bookSection") {
    add("booktitle", citation.bookTitle);
    add("pages", citation.pages?.replace(/[-\u2012-\u2015\u2053]+/gu, "--"));
  }

  add("edition", citation.edition);
  add("publisher", citation.publisher);
  add("address", citation.place);
  if (citation.itemType === "thesis") add("school", citation.university);

  if (citation.itemType === "preprint") {
    add("type", citation.genre || "Preprint");
    if (/arxiv/iu.test(citation.repository ?? "") && citation.archiveID) {
      add("eprinttype", "arxiv");
      add("eprint", citation.archiveID);
    }
  } else if (citation.itemType === "thesis") {
    add("type", citation.thesisType);
  } else if (citation.itemType === "interview") {
    add("type", citation.interviewMedium);
  } else if (citation.itemType === "blogPost") {
    add("type", "blogpost");
  }

  add("isbn", citation.ISBN);
  add("issn", citation.ISSN);
  add("doi", citation.DOI, true);
  add("url", citation.url, true);
  add("urldate", citation.accessDate, true);
  add("abstract", citation.abstractNote);
  add("language", citation.language);
  add("note", citation.extra);

  const body = fields
    .map(({ name, value, raw }) => `  ${name} = {${raw ? value : bibtexEscape(value)}}`)
    .join(",\n");
  return `@${bibtexEntryType(citation)}{${citation.citationKey},\n${body}\n}`;
}

function addMetadata(
  metadata: CitationMetadata,
  name: string,
  value: string | string[] | undefined
): void {
  if (Array.isArray(value)) {
    const values = value.map((item) => item.trim()).filter(Boolean);
    if (values.length) metadata[name] = values;
    return;
  }
  if (value?.trim()) metadata[name] = value.trim();
}

function rdfType(itemType: ZoteroItemType): string {
  if (itemType === "book") return "http://schema.org/Book";
  if (itemType === "bookSection") return "http://schema.org/Chapter";
  if (itemType === "journalArticle") return "http://schema.org/ScholarlyArticle";
  if (itemType === "thesis") return "http://schema.org/Thesis";
  if (itemType === "interview") return "http://schema.org/Interview";
  if (itemType === "preprint") return "http://www.zotero.org/namespaces/export#preprint";
  return "http://schema.org/BlogPosting";
}

export function citationToMetadata(citation: CitationRecord): CitationMetadata {
  const metadata: CitationMetadata = {
    "z:itemType": citation.itemType,
    "z:citationKey": citation.citationKey,
    "rdf:type": rdfType(citation.itemType),
    "dc:title": citation.title,
    citation_title: citation.title,
  };

  addMetadata(metadata, "citation_date", citation.date);
  addMetadata(metadata, "dc:date", citation.date);
  addMetadata(metadata, "citation_public_url", citation.url);
  addMetadata(metadata, "citation_language", citation.language);
  addMetadata(metadata, "dc:language", citation.language);
  addMetadata(metadata, "citation_abstract", citation.abstractNote);
  addMetadata(metadata, "dcterms:abstract", citation.abstractNote);
  addMetadata(metadata, "citation_publisher", citation.publisher);
  addMetadata(metadata, "dc:publisher", citation.publisher);
  addMetadata(metadata, "dc:rights", citation.rights);
  addMetadata(metadata, "citation_doi", citation.DOI);
  addMetadata(metadata, "citation_isbn", citation.ISBN);
  addMetadata(metadata, "citation_issn", citation.ISSN);
  addMetadata(metadata, "citation_volume", citation.volume);
  addMetadata(metadata, "citation_issue", citation.issue);
  addMetadata(metadata, "citation_series_title", citation.seriesTitle || citation.series);
  addMetadata(metadata, "z:shortTitle", citation.shortTitle);
  addMetadata(metadata, "z:place", citation.place);
  addMetadata(metadata, "z:seriesNumber", citation.seriesNumber);
  addMetadata(metadata, "z:edition", citation.edition);
  addMetadata(metadata, "z:numPages", citation.numPages);
  addMetadata(metadata, "z:extra", citation.extra);
  addMetadata(metadata, "z:archive", citation.archive);
  addMetadata(metadata, "z:archiveLocation", citation.archiveLocation);

  const authors = citation.creators
    .filter((creator) => creator.creatorType === "author")
    .map(creatorName);
  const translators = citation.creators
    .filter((creator) => creator.creatorType === "translator")
    .map(creatorName);
  const editors = citation.creators
    .filter((creator) => creator.creatorType === "editor")
    .map(creatorName);
  addMetadata(metadata, "citation_author", authors);
  addMetadata(metadata, "citation_editor", editors);
  addMetadata(metadata, "z:translators", translators);
  addMetadata(metadata, "z:editors", editors);

  if (citation.itemType === "journalArticle") {
    addMetadata(metadata, "citation_journal_title", citation.publicationTitle);
    addMetadata(metadata, "citation_journal_abbrev", citation.journalAbbreviation);
    const pageMatch = /^(.+?)(?:[-\u2012-\u2015\u2053]+(.+))?$/u.exec(citation.pages ?? "");
    addMetadata(metadata, "citation_firstpage", pageMatch?.[1]);
    addMetadata(metadata, "citation_lastpage", pageMatch?.[2]);
  }
  if (citation.itemType === "bookSection") {
    addMetadata(metadata, "citation_book_title", citation.bookTitle);
    const pageMatch = /^(.+?)(?:[-\u2012-\u2015\u2053]+(.+))?$/u.exec(citation.pages ?? "");
    addMetadata(metadata, "citation_firstpage", pageMatch?.[1]);
    addMetadata(metadata, "citation_lastpage", pageMatch?.[2]);
  }
  if (citation.itemType === "preprint") {
    addMetadata(metadata, "z:repository", citation.repository);
    addMetadata(metadata, "z:archiveID", citation.archiveID);
    addMetadata(metadata, "z:genre", citation.genre);
  }
  if (citation.itemType === "thesis") {
    addMetadata(metadata, "citation_dissertation_institution", citation.university);
    addMetadata(metadata, "z:thesisType", citation.thesisType);
  }
  if (citation.itemType === "interview") {
    addMetadata(
      metadata,
      "z:interviewees",
      citation.creators
        .filter((creator) => creator.creatorType === "interviewee")
        .map(creatorName)
    );
    addMetadata(
      metadata,
      "z:interviewers",
      citation.creators
        .filter((creator) => creator.creatorType === "interviewer")
        .map(creatorName)
    );
    addMetadata(metadata, "z:interviewMedium", citation.interviewMedium);
  }
  if (citation.itemType === "blogPost") {
    addMetadata(metadata, "z:blogTitle", citation.blogTitle);
    addMetadata(metadata, "z:websiteType", citation.websiteType);
  }

  return metadata;
}

export function citationToJsonLd(citation: CitationRecord): Record<string, unknown> {
  const schemaType: Record<ZoteroItemType, string> = {
    blogPost: "BlogPosting",
    book: "Book",
    bookSection: "Chapter",
    journalArticle: "ScholarlyArticle",
    preprint: "ScholarlyArticle",
    thesis: "Thesis",
    interview: "Interview",
  };
  const people = (types: readonly ZoteroCreatorType[]) =>
    citation.creators
      .filter((creator) => types.includes(creator.creatorType))
      .map((creator) => ({ "@type": "Person", name: creatorName(creator) }));
  const authors = citation.itemType === "interview"
    ? people(["interviewee"])
    : people(["author"]);
  const translators = people(["translator"]);
  const editors = people(["editor"]);

  return {
    "@context": "https://schema.org",
    "@type": schemaType[citation.itemType],
    ...(citation.itemType === "book" ? { name: citation.title } : { headline: citation.title }),
    url: citation.url,
    mainEntityOfPage: citation.url,
    inLanguage: citation.language,
    datePublished: citation.date,
    description: citation.abstractNote,
    ...(authors.length ? { author: authors } : {}),
    ...(translators.length ? { translator: translators } : {}),
    ...(editors.length ? { editor: editors } : {}),
    ...(citation.publisher
      ? { publisher: { "@type": "Organization", name: citation.publisher } }
      : {}),
    ...(citation.DOI ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: citation.DOI } } : {}),
    ...(citation.ISBN ? { isbn: citation.ISBN } : {}),
    ...(citation.rights ? { copyrightNotice: citation.rights } : {}),
    ...(citation.itemType === "preprint" ? { creativeWorkStatus: "Preprint" } : {}),
    ...(citation.itemType === "journalArticle" && citation.publicationTitle
      ? {
          isPartOf: {
            "@type": "Periodical",
            name: citation.publicationTitle,
            ...(citation.ISSN ? { issn: citation.ISSN } : {}),
          },
          ...(citation.volume ? { volumeNumber: citation.volume } : {}),
          ...(citation.issue ? { issueNumber: citation.issue } : {}),
          ...(citation.pages ? { pagination: citation.pages } : {}),
        }
      : {}),
    ...(citation.itemType === "bookSection" && citation.bookTitle
      ? {
          isPartOf: {
            "@type": "Book",
            name: citation.bookTitle,
            ...(citation.ISBN ? { isbn: citation.ISBN } : {}),
          },
          ...(citation.pages ? { pagination: citation.pages } : {}),
        }
      : {}),
  };
}

export function citationTypeLabel(itemType: ZoteroItemType): string {
  const labels: Record<ZoteroItemType, string> = {
    blogPost: "博客文章",
    book: "书籍",
    bookSection: "书籍章节",
    journalArticle: "期刊论文",
    preprint: "预印本",
    thesis: "学位论文",
    interview: "访谈",
  };
  return labels[itemType];
}
