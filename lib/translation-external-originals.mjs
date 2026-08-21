import fs from "node:fs";
import path from "node:path";

export const EXTERNAL_ORIGINALS_MANIFEST = "external-originals.json";

const LOCALES = new Set(["en", "ja"]);
const SOURCE_TYPES = new Set(["post", "book-chapter"]);
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

export function readExternalOriginals(root) {
  const source = path.join(root, EXTERNAL_ORIGINALS_MANIFEST);
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
    if (keys.has(key)) throw new Error(`${source}: duplicate external original ${key}`);
    keys.add(key);
    const format = requiredText(entry, "format", itemSource);
    if (!FORMATS.has(format)) throw new Error(`${itemSource}: format must be web / book / journal`);
    if (!Array.isArray(entry.links) || entry.links.length === 0) {
      throw new Error(`${itemSource}: links must be a non-empty array`);
    }
    const links = entry.links.map((link, linkIndex) => {
      const linkSource = `${itemSource}: links[${linkIndex}]`;
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
      source: itemSource,
      sourceRef: ref,
      sourceKey: sourceKey(ref),
      locale,
      format,
      title: requiredText(entry, "title", itemSource),
      creator: requiredText(entry, "creator", itemSource),
      publication: requiredText(entry, "publication", itemSource),
      published: optionalText(entry, "published"),
      identifier: optionalText(entry, "identifier"),
      coverage: optionalText(entry, "coverage"),
      links,
    };
  });
}
