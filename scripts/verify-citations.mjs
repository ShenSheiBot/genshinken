import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bookCitationDefaults,
  citationToBibtex,
  citationToMetadata,
  mergeCitation,
  pageCitationDefaults,
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
  rights: "CC0 1.0 Universal",
};

const cases = [
  {
    citation: { ...base, itemType: "blogPost", blogTitle: "西方負典的博客" },
    entry: "@misc{",
    zoteroType: "blogPost",
  },
  {
    citation: { ...base, itemType: "book", volume: "2", ISBN: "978-1-4028-9462-6" },
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
      series: "Methods Series",
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
  assert.match(bibtex, /publisher = \{西方負典編譯組\}/);
  assert.doesNotMatch(bibtex, /copyright\s*=/);
}

const blogBibtex = citationToBibtex(mergeCitation(cases[0].citation, undefined, "fixture:blogPost"));
assert.match(blogBibtex, /type = \{blogpost\}/);
assert.doesNotMatch(blogBibtex, /type = \{(?:博客|Blog post)\}/);

const translatedCitation = {
  ...base,
  itemType: "journalArticle",
  publicationTitle: "Journal of Exact Metadata",
  creators: [
    author,
    { creatorType: "editor", name: "Margaret Hamilton" },
    { creatorType: "translator", name: "Grace Hopper" },
  ],
};
const translatedMetadata = citationToMetadata(translatedCitation);
assert.deepEqual(
  translatedMetadata["dc:creator"],
  ["Ada Lovelace"],
  "translated items must carry authors through RDF creator metadata"
);
assert.deepEqual(
  translatedMetadata["z:translators"],
  ["Grace Hopper"],
  "translated items must carry translators through RDF creator metadata"
);
assert.deepEqual(
  translatedMetadata["so:editor"],
  ["Margaret Hamilton"],
  "translated items must carry editors through Zotero's supported RDF editor predicate"
);
assert.ok(
  !Object.hasOwn(translatedMetadata, "citation_author")
    && !Object.hasOwn(translatedMetadata, "citation_editor"),
  "translated items must not mix Highwire creators with RDF creators because Zotero replaces the latter"
);
assert.match(
  citationToBibtex(translatedCitation),
  /translator = \{\{Grace Hopper\}\}/,
  "the Zotero metadata fix must not remove translators from BibTeX"
);
assert.deepEqual(
  citationToMetadata(base).citation_author,
  ["Ada Lovelace"],
  "author-only items may retain broadly compatible Highwire creator metadata"
);

const translatedThesis = mergeCitation(
  {
    ...cases[5].citation,
    creators: [
      author,
      { creatorType: "translator", firstName: "Grace", lastName: "Hopper" },
    ],
    extra: "Translation published: 2026-07-25",
  },
  undefined,
  "fixture:translated-thesis"
);
const translatedThesisMetadata = citationToMetadata(translatedThesis);
assert.deepEqual(
  translatedThesisMetadata.citation_author,
  ["Ada Lovelace"],
  "thesis authors must remain native Zotero creators"
);
assert.ok(
  !Object.hasOwn(translatedThesisMetadata, "z:translators"),
  "thesis metadata must not claim Zotero supports a native translator creator"
);
assert.equal(
  translatedThesisMetadata["z:extra"],
  "Translator: Hopper || Grace\nTranslation published: 2026-07-25",
  "thesis translators must survive through Zotero's CSL creator syntax in Extra"
);
assert.match(
  citationToBibtex(translatedThesis),
  /translator = \{Hopper, Grace\}/,
  "the Zotero fallback must not remove the direct BibTeX translator field"
);
assert.throws(
  () =>
    mergeCitation(
      {
        ...base,
        creators: [{ creatorType: "interviewee", name: "不兼容角色" }],
      },
      undefined,
      "fixture:invalid-blog-creator"
    ),
  /blogPost 不支持 creatorType: interviewee/,
  "invalid Zotero creator roles must fail the content gate instead of being dropped"
);

const hantMediaCitation = pageCitationDefaults({
  slug: "media-fixture",
  section: "multimedia",
  script: "hant",
  title: "媒體測試",
  creators: [{ creatorType: "author", name: "測試作者" }],
  date: "2026-07-25",
});
assert.equal(hantMediaCitation.url, "https://un-canon.blog/media/media-fixture");
assert.equal(hantMediaCitation.language, "zh-Hant");
assert.equal(citationToMetadata(hantMediaCitation).citation_language, "zh-Hant");

const hansPostCitation = pageCitationDefaults({
  slug: "post-fixture",
  section: "essay",
  script: "hans",
  title: "文章测试",
  creators: [{ creatorType: "author", name: "测试作者" }],
  date: "2026-07-25",
});
assert.equal(hansPostCitation.url, "https://un-canon.blog/posts/post-fixture");
assert.equal(hansPostCitation.language, "zh-Hans");
assert.equal(
  bookCitationDefaults({
    slug: "book-fixture",
    script: "hant",
    title: "書籍測試",
    creators: [{ creatorType: "author", name: "測試作者" }],
    date: "2026-07-25",
  }).language,
  "zh-Hant",
  "book citation defaults must accept a future script field while remaining Hans by default"
);

const bookSectionBibtex = citationToBibtex(cases[2].citation);
assert.match(bookSectionBibtex, /booktitle = \{Collected Metadata Studies\}/);
assert.match(bookSectionBibtex, /pages = \{25--40\}/);
assert.match(
  citationToBibtex(cases[1].citation),
  /volume = \{2\}/,
  "book volume must not be accepted and then dropped by the BibTeX serializer"
);

const journalBibtex = citationToBibtex(cases[3].citation);
assert.match(journalBibtex, /journal = \{Journal of Exact Metadata\}/);
assert.match(journalBibtex, /series = \{Methods Series\}/);
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
for (const [itemType, field, value] of [
  ["blogPost", "university", "Example University"],
  ["preprint", "pages", "1-10"],
  ["thesis", "volume", "4"],
]) {
  assert.throws(
    () =>
      mergeCitation(
        {
          ...base,
          itemType,
          ...(itemType === "preprint" ? { repository: "arXiv" } : {}),
          ...(itemType === "thesis"
            ? { thesisType: "PhD thesis", university: "Example University" }
            : {}),
          [field]: value,
        },
        undefined,
        `fixture:invalid-${itemType}-${field}`
      ),
    new RegExp(`${itemType} 不支持 Zotero 字段：${field}`),
    `${itemType}.${field} must fail instead of being silently dropped`
  );
}

const bookManifests = fs.readdirSync(path.join(process.cwd(), "source", "_books"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "source", "_books", file), "utf8")
  ));

for (const book of bookManifests) {
  const translationCitation = mergeCitation(
    bookCitationDefaults({
      slug: book.slug,
      script: book.script,
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
    translationCitation.language,
    book.citations.translation.language ?? (book.script === "hant" ? "zh-Hant" : "zh-Hans"),
    `${book.slug} translation language must follow its explicit metadata or manifest script`
  );
  assert.equal(
    translationCitation.url,
    `https://un-canon.blog/books/${book.slug}`,
    `${book.slug} must cite its /books/ URL`
  );
  const bibtex = citationToBibtex(translationCitation);
  assert.ok(bibtex.startsWith("@book{"), `${book.slug} translation must export as @book`);
  assert.match(bibtex, new RegExp(`url = \\{https://un-canon\\.blog/books/${book.slug}\\}`));
  const expectedPublisher = book.citations.translation.publisher ?? "西方負典編譯組";
  assert.ok(
    bibtex.includes(`publisher = {${expectedPublisher}}`),
    `${book.slug} translation must preserve its explicit publisher`
  );
  if (book.slug === "capital-untamed") {
    assert.ok(bibtex.startsWith("@book{__2026,"));
    assert.ok(bibtex.includes("author = {罗伯逊, 夏洛特}"));
    assert.ok(bibtex.includes("translator = {{王揆}}"));
    assert.ok(bibtex.includes("title = {不驯的资本：十九世纪法兰西的金融政治}"));
    assert.ok(bibtex.includes("shorttitle = {不驯的资本}"));
    assert.ok(bibtex.includes("month = {aug}"));
    assert.ok(bibtex.includes("year = {2026}"));
    assert.ok(bibtex.includes("edition = {1}"));
    assert.ok(bibtex.includes("language = {zh}"));
  }
  assert.doesNotMatch(bibtex, /series = \{西方負典文库\}/);
  assert.doesNotMatch(bibtex, /copyright\s*=/);
  assert.doesNotMatch(bibtex, /note = \{Status: serializing\}/);
}

const mediaRoute = path.join(
  process.cwd(),
  "app",
  "media",
  "[slug]",
  "cite.bib",
  "route.ts"
);
const legacyPostRoute = path.join(
  process.cwd(),
  "app",
  "posts",
  "[slug]",
  "cite.bib",
  "route.ts"
);
const mediaPage = path.join(process.cwd(), "app", "media", "[slug]", "page.tsx");
assert.ok(fs.existsSync(mediaRoute), "canonical /media/[slug]/cite.bib route must exist");
assert.match(
  fs.readFileSync(mediaRoute, "utf8"),
  /post\.section !== "multimedia"[\s\S]*citationToBibtex\(post\.citation\)/,
  "the media BibTeX route must reject non-media records and export the canonical citation"
);
assert.match(
  fs.readFileSync(legacyPostRoute, "utf8"),
  /post\.section === "multimedia"[\s\S]*status: 308[\s\S]*Location: `\$\{postPath\(post\)\}\/cite\.bib`/,
  "legacy /posts/<media>/cite.bib requests must permanently redirect to /media/"
);
const mediaPageSource = fs.readFileSync(mediaPage, "utf8");
assert.match(mediaPageSource, /citationToMetadata\(post\.citation\)/);
assert.match(
  mediaPageSource,
  /types:\s*\{\s*"application\/x-bibtex": `\$\{canonical\}\/cite\.bib`\s*\}/
);
assert.match(
  mediaPageSource,
  /<CitationCopyButton[\s\S]*download=\{`\$\{mediaPost\.slug\}\.bib`\}/
);

console.log(`引用校验通过：${cases.length} 种 Zotero 类型，${bookManifests.length} 本连载。`);
