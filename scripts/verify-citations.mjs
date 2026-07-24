import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bookCitationDefaults,
  citationToBibtex,
  citationToMetadata,
  mergeCitation,
  parseCitationInput,
} from "../lib/citations.ts";

const author = { creatorType: "author", firstName: "Ada", lastName: "Lovelace" };
const base = {
  itemType: "blogPost",
  citationKey: "lovelace2026notes",
  title: "Notes & Methods",
  creators: [author],
  date: "2026-07-24",
  url: "https://un-canon.blog/posts/notes",
  language: "en",
};

const cases = [
  {
    citation: { ...base, itemType: "blogPost", blogTitle: "西方負典的博客" },
    entry: "@misc{",
    zoteroType: "blogPost",
  },
  {
    citation: { ...base, itemType: "book", ISBN: "978-1-4028-9462-6" },
    entry: "@book{",
    zoteroType: "book",
  },
  {
    citation: {
      ...base,
      itemType: "bookSection",
      bookTitle: "Collected Metadata Studies",
      pages: "25-40",
    },
    entry: "@incollection{",
    zoteroType: "bookSection",
  },
  {
    citation: {
      ...base,
      itemType: "journalArticle",
      publicationTitle: "Journal of Exact Metadata",
      volume: "12",
      issue: "3",
      pages: "10-19",
    },
    entry: "@article{",
    zoteroType: "journalArticle",
  },
  {
    citation: {
      ...base,
      itemType: "preprint",
      repository: "arXiv",
      archiveID: "2607.01234",
      genre: "Preprint",
    },
    entry: "@misc{",
    zoteroType: "preprint",
  },
  {
    citation: {
      ...base,
      itemType: "thesis",
      thesisType: "Master thesis",
      university: "University of London",
    },
    entry: "@mastersthesis{",
    zoteroType: "thesis",
  },
  {
    citation: {
      ...base,
      itemType: "interview",
      creators: [
        { creatorType: "interviewee", name: "受访者" },
        { creatorType: "interviewer", name: "采访者" },
      ],
      interviewMedium: "Recorded interview",
    },
    entry: "@misc{",
    zoteroType: "interview",
  },
];

for (const { citation, entry, zoteroType } of cases) {
  const normalized = mergeCitation(citation, undefined, `fixture:${zoteroType}`);
  const bibtex = citationToBibtex(normalized);
  const metadata = citationToMetadata(normalized);
  assert.ok(bibtex.startsWith(entry), `${zoteroType} must use Zotero's classic BibTeX mapping`);
  assert.equal(metadata["z:itemType"], zoteroType, `${zoteroType} must round-trip via Embedded Metadata`);
  assert.match(bibtex, /title = \{Notes \\& Methods\}/);
  assert.match(bibtex, /year = \{2026\}/);
  assert.match(bibtex, /month = \{jul\}/);
}

const bookSectionBibtex = citationToBibtex(cases[2].citation);
assert.match(bookSectionBibtex, /booktitle = \{Collected Metadata Studies\}/);
assert.match(bookSectionBibtex, /pages = \{25--40\}/);

const journalBibtex = citationToBibtex(cases[3].citation);
assert.match(journalBibtex, /journal = \{Journal of Exact Metadata\}/);
assert.match(journalBibtex, /pages = \{10--19\}/);
assert.equal(
  citationToMetadata(cases[3].citation).citation_journal_title,
  "Journal of Exact Metadata"
);

const preprintBibtex = citationToBibtex(cases[4].citation);
assert.match(preprintBibtex, /eprinttype = \{arxiv\}/);
assert.match(preprintBibtex, /eprint = \{2607\.01234\}/);

const interviewBibtex = citationToBibtex(cases[6].citation);
assert.match(interviewBibtex, /author = \{\{受访者\}\}/);
assert.match(interviewBibtex, /collaborator = \{\{采访者\}\}/);

assert.throws(
  () => parseCitationInput({ itemType: "book", madeUpField: "no" }, "fixture"),
  /不受支持的 Zotero 字段/
);

const bookManifests = fs.readdirSync(path.join(process.cwd(), "source", "_books"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "source", "_books", file), "utf8")
  ));

for (const book of bookManifests) {
  const translationCitation = mergeCitation(
    bookCitationDefaults({
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      creators: [
        ...book.authors.map((name) => ({ creatorType: "author", name })),
        ...book.translators.map((name) => ({ creatorType: "translator", name })),
      ],
      date: book.publishedAt,
      abstractNote: book.description,
    }),
    parseCitationInput(book.citations.translation, `${book.slug}:translation`),
    `${book.slug}:translation`
  );
  assert.equal(translationCitation.itemType, "book");
  assert.equal(
    translationCitation.url,
    `https://un-canon.blog/books/${book.slug}`,
    `${book.slug} must cite its /books/ URL`
  );
  const bibtex = citationToBibtex(translationCitation);
  assert.ok(bibtex.startsWith("@book{"), `${book.slug} translation must export as @book`);
  assert.match(bibtex, new RegExp(`url = \\{https://un-canon\\.blog/books/${book.slug}\\}`));
}

console.log(`引用校验通过：${cases.length} 种 Zotero 类型，${bookManifests.length} 本连载。`);
