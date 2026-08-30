import fs from "node:fs";
import path from "node:path";
import { parseYamlFrontMatter } from "../lib/safe-front-matter.mjs";

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const booksDirectory = path.join(process.cwd(), "source", "_books");
const aliasFile = path.join(process.cwd(), "editorial-sources", "tag-aliases.json");
const taxonomy = JSON.parse(fs.readFileSync(aliasFile, "utf8"));
const aliases = taxonomy.aliases ?? {};
const canonicalTags = new Set(taxonomy.canonicalTags ?? []);

function toList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value).split(/[,，]/u).map((item) => item.trim()).filter(Boolean);
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/[\s·・丨|:：—–－_\-《》〈〉“”'"（）()]/gu, "");
}

const files = fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md")).sort();
const uses = new Map();
const postBySlug = new Map();
let standalonePosts = 0;

function addUse(tag, entry) {
  if (!uses.has(tag)) uses.set(tag, []);
  if (!uses.get(tag).includes(entry)) uses.get(tag).push(entry);
}

for (const file of files) {
  const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
  const { data } = parseYamlFrontMatter(raw);
  const slug = String(data.slug ?? "").trim();
  postBySlug.set(slug, data);
  if (data.book_document === true) continue;
  standalonePosts += 1;
  for (const tag of toList(data.tags)) addUse(tag, `post:${slug || file}`);
}

const bookFiles = fs.existsSync(booksDirectory)
  ? fs.readdirSync(booksDirectory).filter((file) => file.endsWith(".json")).sort()
  : [];
for (const file of bookFiles) {
  const book = JSON.parse(fs.readFileSync(path.join(booksDirectory, file), "utf8"));
  const fallbackTags = toList(postBySlug.get(book.documentSlug)?.tags);
  const bookTags = new Set();
  const visitChapters = (chapters) => {
    for (const chapter of Array.isArray(chapters) ? chapters : []) {
      if ((chapter.status ?? "published") === "published") {
        const chapterTags = toList(chapter.tags);
        for (const tag of chapterTags.length > 0 ? chapterTags : fallbackTags) bookTags.add(tag);
      }
      visitChapters(chapter.children);
    }
  };
  visitChapters(book.chapters);
  for (const tag of bookTags) addUse(tag, `book:${book.slug}`);
}

const collisions = new Map();
for (const tag of uses.keys()) {
  const key = normalize(tag);
  if (!collisions.has(key)) collisions.set(key, []);
  collisions.get(key).push(tag);
}

const report = {
  publicEntries: standalonePosts + bookFiles.length,
  standalonePosts,
  books: bookFiles.length,
  uniqueTags: uses.size,
  canonicalTags: canonicalTags.size,
  singletons: [...uses.values()].filter((filesForTag) => filesForTag.length === 1).length,
  unregisteredTags: [...uses.keys()]
    .filter((tag) => canonicalTags.size > 0 && !canonicalTags.has(tag))
    .map((tag) => ({ tag, files: uses.get(tag) })),
  unusedCanonicalTags: [...canonicalTags].filter((tag) => !uses.has(tag)),
  invalidAliasTargets: Object.entries(aliases)
    .filter(([, canonical]) => canonicalTags.size > 0 && !canonicalTags.has(canonical))
    .map(([alias, canonical]) => ({ alias, canonical })),
  approvedAliasesInUse: Object.entries(aliases)
    .filter(([alias]) => uses.has(alias))
    .map(([alias, canonical]) => ({ alias, canonical, files: uses.get(alias) })),
  normalizedCollisions: [...collisions.values()]
    .filter((tags) => tags.length > 1)
    .map((tags) => tags.map((tag) => ({ tag, files: uses.get(tag) }))),
};

console.log(JSON.stringify(report, null, 2));

if (
  report.unregisteredTags.length > 0
  || report.approvedAliasesInUse.length > 0
  || report.normalizedCollisions.length > 0
  || report.invalidAliasTargets.length > 0
) {
  process.exitCode = 1;
}
