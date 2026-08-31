import fs from "node:fs";
import path from "node:path";
import * as pagefind from "pagefind";

const root = process.cwd();
const nextAppRoot = path.join(root, ".next", "server", "app");
const outputPath = path.join(root, "public", "pagefind");

function htmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(directory, entry.name));
}

function searchDocuments() {
  const documents = htmlFiles(path.join(nextAppRoot, "posts")).map((file) => ({
    file,
    url: `/posts/${path.basename(file, ".html")}`,
  }));

  const booksRoot = path.join(nextAppRoot, "books");
  if (!fs.existsSync(booksRoot)) return documents;
  for (const book of fs.readdirSync(booksRoot, { withFileTypes: true })) {
    if (!book.isDirectory()) continue;
    for (const file of htmlFiles(path.join(booksRoot, book.name, "chapters"))) {
      documents.push({
        file,
        url: `/books/${book.name}/chapters/${path.basename(file, ".html")}`,
      });
    }
  }
  return documents;
}

if (!fs.existsSync(nextAppRoot)) {
  throw new Error("Search indexing requires a completed Next.js build in .next/server/app.");
}

const candidates = searchDocuments();
const indexable = candidates
  .map(({ file, url }) => ({ file, url, content: fs.readFileSync(file, "utf8") }))
  .filter(({ content }) => content.includes("data-pagefind-body"));

if (indexable.length === 0) {
  throw new Error(`Search indexing found no public reading pages among ${candidates.length} HTML candidates.`);
}

const { index, errors: createErrors = [] } = await pagefind.createIndex({
  forceLanguage: "zh",
});
if (!index || createErrors.length > 0) {
  throw new Error(`Pagefind could not create an index: ${createErrors.join("; ")}`);
}

try {
  for (const document of indexable) {
    const { errors = [] } = await index.addHTMLFile({
      url: document.url,
      content: document.content,
    });
    if (errors.length > 0) {
      throw new Error(`${document.url}: ${errors.join("; ")}`);
    }
  }

  fs.rmSync(outputPath, { recursive: true, force: true });
  const { errors = [] } = await index.writeFiles({ outputPath });
  if (errors.length > 0) {
    throw new Error(`Pagefind could not write the search bundle: ${errors.join("; ")}`);
  }
  console.log(`Search index ready from ${indexable.length} public article and chapter routes.`);
} finally {
  await index.deleteIndex();
  await pagefind.close();
}
