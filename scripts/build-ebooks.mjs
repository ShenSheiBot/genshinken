#!/usr/bin/env node
/**
 * Build-time ebook generation orchestrator (npm run ebooks:build).
 *
 *   node --experimental-strip-types --import ./scripts/ebook-ts-loader.mjs \
 *     scripts/build-ebooks.mjs [--if-stale] [--only <slug>]... [--skip-upload] [--local-preview]
 *
 * Renders every serialized book (published chapters only) and every library
 * article (文库) into EPUBs in the gitignored .ebook-dist/ directory, uploads
 * changed artifacts to R2 under downloads/, and records them in the committed
 * manifest consumed by the UI (source/_ebooks/manifest.json). With
 * --skip-upload the artifact is built locally and the manifest is left
 * untouched so no dead link can be shipped. With --local-preview nothing is
 * uploaded either: built EPUBs are copied into the gitignored
 * public/downloads/ directory and recorded with /downloads/… URLs in
 * .ebook-dist/manifest.local.json (the committed manifest is never touched),
 * so `EBOOK_MANIFEST_PATH=.ebook-dist/manifest.local.json npx next dev`
 * serves working download buttons.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAllBooks } from "../lib/books.ts";
import { collectBook, collectArticle, getLibraryArticlePosts } from "../lib/ebook/collect.ts";
import { prepareChapter, finalizeChapters } from "../lib/ebook/html.ts";
import { buildEpub, epubStaticText } from "../lib/ebook/epub.ts";
import { subsetEbookFonts } from "../lib/ebook/fonts.ts";
import { createCachedImageFetcher } from "../lib/ebook/images.ts";
import {
  EBOOK_GENERATOR_VERSION,
  defaultEbookManifestPath,
  isEbookEntryCurrent,
  readEbookManifest,
  writeEbookManifest,
} from "../lib/ebook/manifest.ts";
import {
  defaultEbookUploadTarget,
  ebookObjectKey,
  ebookUploadToken,
  uploadEbookObject,
} from "../lib/ebook/upload.ts";

const root = process.cwd();
const distDirectory = path.join(root, ".ebook-dist");
const localPreviewManifestPath = path.join(distDirectory, "manifest.local.json");
const localPreviewDownloadsDirectory = path.join(root, "public", "downloads");

function parseArguments(argv) {
  const options = { ifStale: false, only: [], skipUpload: false, localPreview: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--if-stale") options.ifStale = true;
    else if (argument === "--skip-upload") options.skipUpload = true;
    else if (argument === "--local-preview") options.localPreview = true;
    else if (argument === "--only") {
      const slug = argv[index + 1];
      if (!slug) throw new Error("--only requires a book or article slug");
      options.only.push(slug);
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function stripTags(xhtml) {
  return xhtml
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#(?:x([\da-f]+)|(\d+));/giu, (_match, hexadecimal, decimal) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : " ";
    })
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"');
}

/** One generator core: a book is N documents, an article is 1. */
async function buildEditionEpub(slug, meta, documents, fetchImage) {
  const images = new Map();
  const prepared = [];
  for (const document of documents) {
    prepared.push(await prepareChapter(document, slug, fetchImage, images));
  }
  const chapters = finalizeChapters(prepared);
  const charset =
    chapters.map((chapter) => stripTags(chapter.bodyXhtml)).join("") +
    JSON.stringify(meta) +
    epubStaticText();
  const fonts = subsetEbookFonts(charset, { root });
  return buildEpub({
    meta,
    chapters,
    images: [...images.values()],
    fonts,
    generatedAt: new Date(),
  });
}

async function collectBookEdition(book) {
  const collected = await collectBook(book);
  return {
    kind: "books",
    slug: book.slug,
    meta: collected.meta,
    contentRevision: collected.contentRevision,
    documents: collected.documents.map((document) => ({
      id: document.chapter.id,
      number: document.chapter.number,
      title: document.chapter.title,
      titleBreaks: document.chapter.titleBreaks,
      anchor: document.chapter.anchor,
      html: document.html,
    })),
  };
}

async function collectArticleEdition(post) {
  const collected = await collectArticle(post);
  return {
    kind: "articles",
    slug: post.slug,
    meta: collected.meta,
    contentRevision: collected.contentRevision,
    documents: [collected.document],
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const books = getAllBooks();
  const articles = await getLibraryArticlePosts();

  let selectedBooks = books;
  let selectedArticles = articles;
  if (options.only.length > 0) {
    const requested = new Set(options.only);
    selectedBooks = books.filter((book) => requested.has(book.slug));
    selectedArticles = articles.filter((post) => requested.has(post.slug));
    const found = new Set([
      ...selectedBooks.map((book) => book.slug),
      ...selectedArticles.map((post) => post.slug),
    ]);
    const missing = options.only.filter((slug) => !found.has(slug));
    if (missing.length > 0) {
      throw new Error(`no book or library article with slug ${missing.join(", ")}`);
    }
  }

  // Local preview keeps its own manifest so the committed production
  // manifest (https R2 URLs) is never touched by preview builds.
  const manifestPath = options.localPreview
    ? localPreviewManifestPath
    : defaultEbookManifestPath(root);
  const manifest = readEbookManifest(manifestPath);
  const fetchImage = createCachedImageFetcher();
  const target = defaultEbookUploadTarget();
  fs.mkdirSync(distDirectory, { recursive: true });
  if (options.localPreview) fs.mkdirSync(localPreviewDownloadsDirectory, { recursive: true });

  const editions = [
    ...selectedBooks.map((book) => () => collectBookEdition(book)),
    ...selectedArticles.map((post) => () => collectArticleEdition(post)),
  ];

  let built = 0;
  let skipped = 0;
  for (const collectEdition of editions) {
    const edition = await collectEdition();
    if (
      options.ifStale &&
      isEbookEntryCurrent(manifest, edition.kind, edition.slug, edition.contentRevision)
    ) {
      console.log(`skip ${edition.slug} (revision ${edition.contentRevision} is current)`);
      skipped += 1;
      continue;
    }

    const epub = await buildEditionEpub(edition.slug, edition.meta, edition.documents, fetchImage);
    const sha256 = createHash("sha256").update(epub).digest("hex");
    const key = ebookObjectKey(target, edition.slug, edition.contentRevision);
    const fileName = path.basename(key);
    const outputPath = path.join(distDirectory, fileName);
    fs.writeFileSync(outputPath, epub);
    console.log(
      `built ${path.relative(root, outputPath)} (${epub.length.toLocaleString("en")} bytes, ` +
        `revision ${edition.contentRevision})`
    );
    built += 1;

    const entry = {
      sha256,
      bytes: epub.length,
      contentRevision: edition.contentRevision,
      generator: EBOOK_GENERATOR_VERSION,
      generatedAt: new Date().toISOString(),
    };

    if (options.localPreview) {
      fs.copyFileSync(outputPath, path.join(localPreviewDownloadsDirectory, fileName));
      manifest[edition.kind][edition.slug] = { epubUrl: `/downloads/${fileName}`, ...entry };
      writeEbookManifest(manifest, manifestPath);
      console.log(`  --local-preview: copied to public/downloads/${fileName}`);
      continue;
    }

    if (options.skipUpload) {
      console.log(`  --skip-upload: not uploading and not updating ${path.relative(root, manifestPath)}`);
      continue;
    }

    const { url } = await uploadEbookObject({
      target,
      key,
      body: epub,
      token: ebookUploadToken(),
    });
    manifest[edition.kind][edition.slug] = { epubUrl: url, ...entry };
    writeEbookManifest(manifest, manifestPath);
    console.log(`  uploaded ${url}`);
  }

  const selectedCount = selectedBooks.length + selectedArticles.length;
  console.log(`done: ${built} built, ${skipped} skipped, ${selectedCount} selected`);
  if (options.localPreview) {
    console.log(`local preview manifest: ${path.relative(root, manifestPath)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
