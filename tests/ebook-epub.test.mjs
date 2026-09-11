import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../lib/markdown.ts";
import { prepareChapter, finalizeChapters } from "../lib/ebook/html.ts";
import { buildEpub, readEpubEntries } from "../lib/ebook/epub.ts";
import { isLibraryArticlePost } from "../lib/ebook/collect.ts";

const decoder = new TextDecoder();

// Minimal valid 1x1 PNG.
const PNG_BYTES = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
));

const META = {
  kind: "book",
  slug: "fixture-book",
  title: "夹具之书",
  subtitle: "结构不变式测试选译",
  description: "用于验证 EPUB 结构不变式的测试书。",
  language: "zh-Hans",
  identifier: "https://labonroof.top/books/fixture-book",
  url: "https://labonroof.top/books/fixture-book",
  date: "2026-01-01",
  updatedAt: "2026-02-01",
  statusLabel: "连载中",
  authors: ["宇野常宽"],
  translators: ["人吉尔朗"],
  publisher: "屋顶现视研",
  rights: "CC BY-NC-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  publishedChapterCount: 2,
  totalChapterCount: 3,
  latestChapterNumber: "02",
};

const FONTS = [
  {
    family: "Roof Noto Serif SC",
    fileName: "roof-noto-serif-sc.woff2",
    data: new Uint8Array([0x77, 0x4f, 0x46, 0x32]),
    weight: "200 900",
    licenseFileName: "OFL-Noto-CJK.txt",
    licenseData: new Uint8Array([79, 70, 76]),
  },
  {
    family: "Roof Zhuque Fangsong",
    fileName: "roof-zhuque-fangsong.woff2",
    data: new Uint8Array([0x77, 0x4f, 0x46, 0x32]),
    weight: "400",
    emphasisAlias: "Roof Zhuque Fangsong Emphasis",
    licenseFileName: "OFL-Zhuque-Fangsong.txt",
    licenseData: new Uint8Array([79, 70, 76]),
  },
];

async function buildFixtureEpub() {
  const chapterOneMarkdown = [
    "开篇引用[^1]，数学记号 $\\Phi$ 保持可读，另见[第二章的小节](#第二章小节)。",
    "",
    "![示意图](https://assets.labonroof.top/roof-archive/demo/pic.jpg)",
    "",
    "[^1]: 这是第一章的脚注。",
  ].join("\n");
  const chapterTwoMarkdown = ["## 第二章小节", "", "第二章正文，站内链接[目录](/books/fixture-book)。"].join("\n");

  const fetchedUrls = [];
  const fetchImage = async (url) => {
    fetchedUrls.push(url);
    return { data: PNG_BYTES, mediaType: "image/png", extension: ".jpg" };
  };

  const images = new Map();
  const prepared = [];
  const inputs = [
    { id: "one", number: "01", title: "第一章", anchor: "chapter-one", html: await renderMarkdown(chapterOneMarkdown) },
    { id: "two", number: "02", title: "第二章", anchor: "chapter-two", html: await renderMarkdown(chapterTwoMarkdown) },
  ];
  for (const input of inputs) {
    prepared.push(await prepareChapter(input, META.slug, fetchImage, images));
  }
  const chapters = finalizeChapters(prepared);
  const epub = buildEpub({
    meta: META,
    chapters,
    images: [...images.values()],
    fonts: FONTS,
    generatedAt: new Date("2026-09-10T00:00:00Z"),
  });
  return { epub, chapters, fetchedUrls };
}

const ARTICLE_META = {
  kind: "article",
  slug: "fixture-article",
  title: "夹具文章",
  subtitle: "单篇结构测试",
  description: "用于验证文库单篇 EPUB 结构不变式的测试文章。",
  language: "zh-Hans",
  identifier: "https://labonroof.top/posts/fixture-article",
  url: "https://labonroof.top/posts/fixture-article",
  date: "2026-03-01",
  updatedAt: "2026-03-15",
  authors: ["东浩纪"],
  translators: ["人吉尔朗"],
  proofreaders: ["宇野常宽"],
  publisher: "屋顶现视研",
  rights: "CC BY-NC-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

async function buildFixtureArticleEpub() {
  const markdown = [
    "## 第一节",
    "",
    "正文含脚注[^1]，站内链接[文库](/library)。",
    "",
    "[^1]: 单篇文章的脚注。",
  ].join("\n");
  const images = new Map();
  const prepared = [
    await prepareChapter(
      {
        id: "article",
        number: "042",
        title: ARTICLE_META.title,
        anchor: "article-title",
        html: await renderMarkdown(markdown),
      },
      ARTICLE_META.slug,
      async () => {
        throw new Error("article fixture must not fetch images");
      },
      images
    ),
  ];
  const chapters = finalizeChapters(prepared);
  const epub = buildEpub({
    meta: ARTICLE_META,
    chapters,
    images: [...images.values()],
    fonts: FONTS,
    generatedAt: new Date("2026-09-10T00:00:00Z"),
  });
  return { epub, chapters };
}

const fixture = await buildFixtureEpub();
const entries = readEpubEntries(fixture.epub);
const entryText = (name) => {
  const bytes = entries.get(name);
  assert.ok(bytes, `EPUB must contain ${name}`);
  return decoder.decode(bytes);
};

const articleFixture = await buildFixtureArticleEpub();
const articleEntries = readEpubEntries(articleFixture.epub);
const articleEntryText = (name) => {
  const bytes = articleEntries.get(name);
  assert.ok(bytes, `article EPUB must contain ${name}`);
  return decoder.decode(bytes);
};

test("the mimetype entry is first and stored uncompressed", () => {
  const bytes = fixture.epub;
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], "must start with a zip local header");
  const compressionMethod = bytes[8] | (bytes[9] << 8);
  assert.equal(compressionMethod, 0, "the first entry must be stored, not deflated");
  const nameLength = bytes[26] | (bytes[27] << 8);
  const name = decoder.decode(bytes.slice(30, 30 + nameLength));
  assert.equal(name, "mimetype");
  assert.equal(entryText("mimetype"), "application/epub+zip");
});

test("OPF manifest ids resolve and every declared href exists in the zip", () => {
  const container = entryText("META-INF/container.xml");
  assert.match(container, /full-path="OEBPS\/package\.opf"/u);
  const opf = entryText("OEBPS/package.opf");

  const items = [...opf.matchAll(/<item id="([^"]+)" href="([^"]+)"[^>]*\/>/gu)];
  assert.ok(items.length > 0, "OPF must declare manifest items");
  const ids = new Set();
  for (const [, id, href] of items) {
    assert.ok(!ids.has(id), `duplicate manifest id ${id}`);
    ids.add(id);
    assert.ok(entries.has(`OEBPS/${href}`), `manifest href ${href} must exist in the zip`);
  }
  for (const [, idref] of opf.matchAll(/<itemref idref="([^"]+)"/gu)) {
    assert.ok(ids.has(idref), `spine idref ${idref} must resolve to a manifest item`);
  }
  assert.match(opf, /<dc:identifier id="pub-id">https:\/\/labonroof\.top\/books\/fixture-book<\/dc:identifier>/u);
  assert.match(opf, /scheme="marc:relators">aut<\/meta>/u);
  assert.match(opf, /scheme="marc:relators">trl<\/meta>/u);
  assert.match(opf, /<dc:language>zh-Hans<\/dc:language>/u);
  assert.match(opf, /<meta property="dcterms:modified">2026-09-10T00:00:00Z<\/meta>/u);
  assert.match(opf, /properties="mathml"/u, "math chapters must declare the mathml property");

  const declaredHrefs = new Set(items.map(([, , href]) => `OEBPS/${href}`));
  for (const name of entries.keys()) {
    if (name === "mimetype" || name.startsWith("META-INF/") || name === "OEBPS/package.opf") continue;
    assert.ok(declaredHrefs.has(name), `zip entry ${name} must be declared in the OPF manifest`);
  }
});

test("nav covers every chapter plus cover and colophon", () => {
  const nav = entryText("OEBPS/nav.xhtml");
  assert.match(nav, /<a href="text\/cover\.xhtml">/u);
  for (const chapter of fixture.chapters) {
    assert.ok(nav.includes(`text/${chapter.fileName}`), `nav must link ${chapter.fileName}`);
    assert.ok(nav.includes(chapter.title), `nav must show the title of ${chapter.id}`);
  }
  assert.match(nav, /<a href="text\/colophon\.xhtml">/u);
  assert.match(nav, /epub:type="landmarks"/u);
});

test("images are downloaded, packaged, and referenced relatively", () => {
  assert.deepEqual(fixture.fetchedUrls, ["https://assets.labonroof.top/roof-archive/demo/pic.jpg"]);
  const chapterOne = entryText("OEBPS/text/chapter-one.xhtml");
  const src = chapterOne.match(/<img src="\.\.\/images\/([^"]+)"/u);
  assert.ok(src, "chapter images must point at packaged relative paths");
  assert.ok(entries.has(`OEBPS/images/${src[1]}`), "the packaged image file must exist");
  assert.ok(!chapterOne.includes("assets.labonroof.top/roof-archive"), "no remote image URLs may remain");
  // The fixture URL claims .jpg but ships PNG bytes: the packaged file and
  // declared media type must follow the magic bytes, not the lying extension.
  assert.ok(src[1].endsWith(".png"), "the packaged extension must come from the image bytes");
  const opf = entryText("OEBPS/package.opf");
  assert.ok(
    opf.includes(`href="images/${src[1]}" media-type="image/png"`),
    "the OPF media type must match the sniffed image bytes"
  );
});

test("embedded fonts and license texts are packaged and referenced by the CSS", () => {
  const css = entryText("OEBPS/styles/ebook.css");
  for (const font of FONTS) {
    assert.ok(css.includes(`url("../fonts/${font.fileName}")`), `CSS must reference ${font.fileName}`);
    assert.ok(entries.has(`OEBPS/fonts/${font.fileName}`), `font ${font.fileName} must exist in the zip`);
    assert.ok(entries.has(`OEBPS/fonts/${font.licenseFileName}`), "font license text must be packaged");
  }
  assert.match(css, /"Roof Zhuque Fangsong Emphasis"/u, "the emphasis alias face must be declared");
});

test("footnote references and notes link to each other and back", () => {
  const chapterOne = entryText("OEBPS/text/chapter-one.xhtml");
  const reference = chapterOne.match(
    /<a href="#([^"]+)" id="([^"]+)"[^>]*epub:type="noteref"[^>]*>/u
  );
  assert.ok(reference, "footnote references must carry epub:type noteref");
  const [, noteId, referenceId] = reference;
  assert.ok(
    new RegExp(`<li[^>]*id="${noteId}"[^>]*epub:type="footnote"`, "u").test(chapterOne),
    "the referenced note must exist with epub:type footnote"
  );
  assert.ok(
    new RegExp(`<a href="#${referenceId}"[^>]*epub:type="backlink"`, "u").test(chapterOne),
    "the note must link back to its reference"
  );
});

test("math renders as embedded MathML with no KaTeX presentation markup", () => {
  const chapterOne = entryText("OEBPS/text/chapter-one.xhtml");
  assert.match(chapterOne, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/u);
  assert.ok(!chapterOne.includes("katex"), "KaTeX HTML output must not survive into the EPUB");
});

test("cross-chapter fragment links resolve to chapter files and site links absolutize", () => {
  const chapterOne = entryText("OEBPS/text/chapter-one.xhtml");
  assert.ok(
    chapterOne.includes('href="chapter-two.xhtml#'),
    "links into another chapter must target that chapter file"
  );
  const chapterTwo = entryText("OEBPS/text/chapter-two.xhtml");
  assert.ok(
    chapterTwo.includes('href="https://labonroof.top/books/fixture-book"'),
    "root-relative site links must become absolute URLs"
  );
});

test("cover and colophon reproduce the typographic composition and serial state", () => {
  const cover = entryText("OEBPS/text/cover.xhtml");
  assert.match(cover, /class="ebook-cover-kicker">屋顶现视研连载</u);
  assert.match(cover, /class="ebook-cover-title">夹具之书</u);
  assert.match(cover, /class="ebook-cover-footer">/u);
  const colophon = entryText("OEBPS/text/colophon.xhtml");
  assert.match(colophon, /收录至第 02 章 · 共 2 章已刊（连载中）/u);
  assert.match(colophon, /2026-09-10/u);
  assert.match(colophon, /https:\/\/labonroof\.top\/books\/fixture-book/u);
  assert.match(colophon, /CC BY-NC-SA 4\.0/u);
});

test("the colophon no longer carries the font note while OFL files stay packaged", () => {
  for (const [label, colophon] of [
    ["book", entryText("OEBPS/text/colophon.xhtml")],
    ["article", articleEntryText("OEBPS/text/colophon.xhtml")],
  ]) {
    assert.ok(!colophon.includes("字体"), `${label} colophon must not carry the fonts row`);
    assert.ok(
      !colophon.includes("内嵌思源宋体"),
      `${label} colophon must not carry the subset font note`
    );
  }
  for (const [label, entryMap] of [["book", entries], ["article", articleEntries]]) {
    for (const font of FONTS) {
      assert.ok(
        entryMap.has(`OEBPS/fonts/${font.licenseFileName}`),
        `${label} EPUB must still package the OFL license text ${font.licenseFileName}`
      );
    }
  }
});

test("article OPF resolves like a one-document book with proofreader credits", () => {
  const opf = articleEntryText("OEBPS/package.opf");
  const items = [...opf.matchAll(/<item id="([^"]+)" href="([^"]+)"[^>]*\/>/gu)];
  const ids = new Set();
  for (const [, id, href] of items) {
    assert.ok(!ids.has(id), `duplicate manifest id ${id}`);
    ids.add(id);
    assert.ok(articleEntries.has(`OEBPS/${href}`), `manifest href ${href} must exist in the zip`);
  }
  for (const [, idref] of opf.matchAll(/<itemref idref="([^"]+)"/gu)) {
    assert.ok(ids.has(idref), `spine idref ${idref} must resolve to a manifest item`);
  }
  assert.match(opf, /<dc:identifier id="pub-id">https:\/\/labonroof\.top\/posts\/fixture-article<\/dc:identifier>/u);
  assert.match(opf, /scheme="marc:relators">aut<\/meta>/u);
  assert.match(opf, /scheme="marc:relators">trl<\/meta>/u);
  assert.match(opf, /scheme="marc:relators">pfr<\/meta>/u, "proofreaders must join as MARC pfr contributors");
});

test("article cover uses the 文库 kicker and a footer without a chapter counter", () => {
  const cover = articleEntryText("OEBPS/text/cover.xhtml");
  assert.match(cover, /class="ebook-cover-kicker">屋顶现视研文库</u);
  assert.match(cover, /class="ebook-cover-title">夹具文章</u);
  const footer = cover.match(/class="ebook-cover-footer">([^<]+)</u);
  assert.ok(footer, "the article cover must keep the mono footer line");
  assert.ok(footer[1].includes("labonroof.top"), "the footer must keep the site domain");
  assert.ok(!footer[1].includes("/"), "the article footer must not carry the chapter counter");
});

test("article colophon drops the 收录 row and keeps title/credits/license lines", () => {
  const colophon = articleEntryText("OEBPS/text/colophon.xhtml");
  assert.ok(!colophon.includes("收录至第"), "articles have no serial inclusion state");
  assert.match(colophon, /<dt>题名<\/dt><dd>夹具文章（单篇结构测试）<\/dd>/u);
  assert.match(colophon, /<dt>作者<\/dt><dd>东浩纪<\/dd>/u);
  assert.match(colophon, /<dt>译者<\/dt><dd>人吉尔朗<\/dd>/u);
  assert.match(colophon, /<dt>校对<\/dt><dd>宇野常宽<\/dd>/u);
  assert.match(colophon, /2026-09-10/u);
  assert.match(colophon, /https:\/\/labonroof\.top\/posts\/fixture-article/u);
  assert.match(
    colophon,
    /CC BY-NC-SA 4\.0（https:\/\/creativecommons\.org\/licenses\/by-nc-sa\/4\.0\/）/u,
    "the citation rights must become the colophon license line"
  );
});

test("article nav covers the single document plus cover and colophon", () => {
  const nav = articleEntryText("OEBPS/nav.xhtml");
  assert.match(nav, /<a href="text\/cover\.xhtml">/u);
  assert.ok(nav.includes("text/chapter-article.xhtml"), "nav must link the article document");
  assert.ok(nav.includes(ARTICLE_META.title), "nav must show the article title");
  assert.match(nav, /<a href="text\/colophon\.xhtml">/u);
});

test("article footnotes round-trip inside the single document", () => {
  const body = articleEntryText("OEBPS/text/chapter-article.xhtml");
  const reference = body.match(/<a href="#([^"]+)" id="([^"]+)"[^>]*epub:type="noteref"[^>]*>/u);
  assert.ok(reference, "article footnote references must carry epub:type noteref");
  const [, noteId, referenceId] = reference;
  assert.ok(
    new RegExp(`<li[^>]*id="${noteId}"[^>]*epub:type="footnote"`, "u").test(body),
    "the referenced note must exist with epub:type footnote"
  );
  assert.ok(
    new RegExp(`<a href="#${referenceId}"[^>]*epub:type="backlink"`, "u").test(body),
    "the note must link back to its reference"
  );
  assert.ok(
    body.includes('href="https://labonroof.top/library"'),
    "root-relative site links must become absolute URLs"
  );
});

test("mid-figure captions are demoted to <p> so the XHTML content model holds", async () => {
  const html =
    '<figure class="article-profile"><img src="https://assets.labonroof.top/roof-archive/demo/avatar.png" />' +
    '<figcaption class="article-profile-name">宫酒姬</figcaption>' +
    '<div class="article-profile-copy"><p>简介文字。</p></div></figure>' +
    '<figure><img src="https://assets.labonroof.top/roof-archive/demo/pic2.png" />' +
    "<figcaption>合规的尾部图注</figcaption></figure>";
  const images = new Map();
  const prepared = await prepareChapter(
    { id: "captions", number: "01", title: "图注", anchor: "captions", html },
    "fixture-captions",
    async () => ({ data: PNG_BYTES, mediaType: "image/png", extension: ".png" }),
    images
  );
  const [chapter] = finalizeChapters([prepared]);
  assert.match(
    chapter.bodyXhtml,
    /<p class="article-profile-name">宫酒姬<\/p>/u,
    "a caption between flow children must become a <p> with its class intact"
  );
  assert.match(
    chapter.bodyXhtml,
    /<figcaption>合规的尾部图注<\/figcaption>/u,
    "a trailing caption is already valid and must stay a figcaption"
  );
});

test("the article collection admits library posts and excludes book documents", () => {
  const article = { draft: false, bookDocument: false, section: "translation" };
  assert.equal(isLibraryArticlePost(article), true);
  assert.equal(
    isLibraryArticlePost({ ...article, bookDocument: true }),
    false,
    "book build sources must never become standalone article EPUBs"
  );
  assert.equal(isLibraryArticlePost({ ...article, draft: true }), false, "drafts are not published");
  assert.equal(
    isLibraryArticlePost({ ...article, section: "multimedia" }),
    false,
    "multimedia entries live under /media, not the article reader"
  );
});
