import fs from "node:fs";
import path from "node:path";

export const TRANSLATION_BOOK_MANIFEST = "book.json";

const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const LOCALES = new Set(["en", "ja"]);
const LEGACY_CHAPTER_FIELDS = ["book_slug", "book_title", "book_subtitle", "book_excerpt"];

function requiredText(data, field, source) {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${source}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function stableId(data, field, source) {
  const value = requiredText(data, field, source);
  if (!STABLE_ID.test(value)) {
    throw new Error(`${source}: ${field} must use lowercase ASCII words separated by hyphens`);
  }
  return value;
}

export function readTranslationBookManifest(directory, expected = {}) {
  const source = path.join(directory, TRANSLATION_BOOK_MANIFEST);
  if (!fs.existsSync(source)) throw new Error(`${directory}: missing ${TRANSLATION_BOOK_MANIFEST}`);

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

  const locale = requiredText(data, "language", source);
  if (!LOCALES.has(locale)) throw new Error(`${source}: language must be en / ja`);
  if (expected.locale && locale !== expected.locale) {
    throw new Error(`${source}: language must match locale directory ${expected.locale}`);
  }

  const slug = stableId(data, "slug", source);
  if (path.basename(directory) !== slug) {
    throw new Error(`${source}: slug must match its translation directory`);
  }
  const sourceBookSlug = stableId(data, "source_book_slug", source);
  if (expected.sourceBookSlug && sourceBookSlug !== expected.sourceBookSlug) {
    throw new Error(`${source}: source_book_slug must match chapter source ${expected.sourceBookSlug}`);
  }

  return {
    version: 1,
    source,
    sourceBookSlug,
    slug,
    language: locale,
    title: requiredText(data, "title", source),
    subtitle: typeof data.subtitle === "string" ? data.subtitle.trim() : "",
    excerpt: requiredText(data, "excerpt", source),
  };
}

export function assertChapterUsesTranslationBookManifest(data, source) {
  const duplicate = LEGACY_CHAPTER_FIELDS.find((field) => Object.hasOwn(data, field));
  if (duplicate) {
    throw new Error(`${source}: ${duplicate} belongs in ${TRANSLATION_BOOK_MANIFEST}, not chapter front matter`);
  }
}
