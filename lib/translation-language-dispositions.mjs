import fs from "node:fs";
import path from "node:path";

export const LANGUAGE_DISPOSITIONS_MANIFEST = "language-dispositions.json";

const LOCALES = new Set(["en", "ja"]);
const SOURCE_TYPES = new Set(["post", "book-chapter"]);
const STATES = new Set(["external-original", "not-available"]);
const NOT_AVAILABLE_REASONS = new Set(["cross-language-translation"]);
const FORMATS = new Set(["web", "book", "journal"]);
const LINK_KINDS = new Set(["read", "publisher", "purchase", "library"]);
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function requiredText(data, field, source) {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${source}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalText(data, field) {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function stableId(data, field, source) {
  const value = requiredText(data, field, source);
  if (!STABLE_ID.test(value)) {
    throw new Error(`${source}: ${field} must use lowercase ASCII words separated by hyphens`);
  }
  return value;
}

function sourceReference(data, source) {
  const type = requiredText(data, "source_type", source);
  if (!SOURCE_TYPES.has(type)) throw new Error(`${source}: source_type must be post / book-chapter`);
  if (type === "post") return { type, slug: stableId(data, "source_slug", source) };
  return {
    type,
    bookSlug: stableId(data, "source_book_slug", source),
    chapterId: stableId(data, "source_chapter_id", source),
  };
}

function sourceKey(ref) {
  return ref.type === "post" ? `post:${ref.slug}` : `book:${ref.bookSlug}:${ref.chapterId}`;
}

function externalUrl(data, field, source) {
  const value = requiredText(data, field, source);
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${source}: ${field} must be an absolute HTTP(S) URL`, { cause: error });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${source}: ${field} must be an absolute HTTP(S) URL`);
  }
  return url.toString();
}

function externalOriginal(entry, shared, source) {
  const format = requiredText(entry, "format", source);
  if (!FORMATS.has(format)) throw new Error(`${source}: format must be web / book / journal`);
  if (!Array.isArray(entry.links) || entry.links.length === 0) {
    throw new Error(`${source}: links must be a non-empty array`);
  }
  const links = entry.links.map((link, index) => {
    const linkSource = `${source}: links[${index}]`;
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw new Error(`${linkSource} must be an object`);
    }
    const kind = requiredText(link, "kind", linkSource);
    if (!LINK_KINDS.has(kind)) {
      throw new Error(`${linkSource}: kind must be read / publisher / purchase / library`);
    }
    return { kind, url: externalUrl(link, "url", linkSource) };
  });
  return {
    ...shared,
    state: "external-original",
    format,
    title: requiredText(entry, "title", source),
    creator: requiredText(entry, "creator", source),
    publication: requiredText(entry, "publication", source),
    published: optionalText(entry, "published"),
    identifier: optionalText(entry, "identifier"),
    coverage: optionalText(entry, "coverage"),
    links,
  };
}

function notAvailable(entry, shared, source) {
  const reason = requiredText(entry, "reason", source);
  if (!NOT_AVAILABLE_REASONS.has(reason)) {
    throw new Error(`${source}: reason must be cross-language-translation`);
  }
  const originalLanguage = requiredText(entry, "original_language", source);
  if (!LOCALES.has(originalLanguage) || originalLanguage === shared.locale) {
    throw new Error(`${source}: original_language must be the other target language`);
  }
  return {
    ...shared,
    state: "not-available",
    reason,
    originalLanguage,
  };
}

export function readLanguageDispositions(root) {
  const source = path.join(root, LANGUAGE_DISPOSITIONS_MANIFEST);
  if (!fs.existsSync(source)) return [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(source, "utf8"));
  } catch (error) {
    throw new Error(`${source}: invalid JSON`, { cause: error });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${source}: manifest must be a JSON object`);
  }
  if (data.version !== 1) throw new Error(`${source}: version must be 1`);
  if (!Array.isArray(data.items)) throw new Error(`${source}: items must be an array`);

  const keys = new Set();
  return data.items.map((entry, index) => {
    const itemSource = `${source}: items[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${itemSource} must be an object`);
    }
    const locale = requiredText(entry, "locale", itemSource);
    if (!LOCALES.has(locale)) throw new Error(`${itemSource}: locale must be en / ja`);
    const ref = sourceReference(entry, itemSource);
    const key = `${locale}:${sourceKey(ref)}`;
    if (keys.has(key)) throw new Error(`${source}: duplicate language disposition ${key}`);
    keys.add(key);
    const state = requiredText(entry, "state", itemSource);
    if (!STATES.has(state)) {
      throw new Error(`${itemSource}: state must be external-original / not-available`);
    }
    const shared = {
      source: itemSource,
      sourceRef: ref,
      sourceKey: sourceKey(ref),
      locale,
    };
    return state === "external-original"
      ? externalOriginal(entry, shared, itemSource)
      : notAvailable(entry, shared, itemSource);
  });
}

export function translationAvailabilityState(status, previewEnabled, dispositionState = "") {
  if (status && dispositionState) {
    throw new Error("a language cannot have both an on-site edition and a language disposition");
  }
  if (status === "published") return "available";
  if ((status === "draft" || status === "review") && previewEnabled) return "preview";
  if (dispositionState === "external-original" || dispositionState === "not-available") {
    return dispositionState;
  }
  return "missing";
}
