import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConverterBuilder } from "opencc-js/core";
import * as cn2t from "opencc-js/preset/cn2t";
import * as t2cn from "opencc-js/preset/t2cn";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const globalsPath = path.join(root, "app", "globals.css");
const readerPath = path.join(
  root,
  "app",
  "components",
  "reading-edition",
  "reading-edition.module.css"
);
const translationPath = path.join(
  root,
  "app",
  "components",
  "translation",
  "translation-edition.module.css"
);
const manifestPath = path.join(root, "public", "fonts", "cjk-font-manifest.json");
const cjkFontCssPath = path.join(root, "app", "cjk-fonts.generated.css");
const translationFontCssPath = path.join(root, "app", "translation-fonts.generated.css");
const translationFontManifestPath = path.join(root, "public", "fonts", "translation-font-manifest.json");
const fontRequirementsPath = path.join(root, "scripts", "requirements-font-subsets.txt");
const fontToolchainDigest = crypto
  .createHash("sha256")
  .update(fs.readFileSync(fontRequirementsPath))
  .digest("hex");

const expectedFonts = [
  {
    family: "Roof Noto Serif SC",
    file: "roof-noto-serif-sc.woff2",
    source: "NotoSerifSC.ttf",
    sourceSha256: "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
    variable: "--f-cjk-serif",
    weight: "200 900",
  },
  {
    family: "Roof Noto Sans SC",
    file: "roof-noto-sans-sc.woff2",
    source: "NotoSansSC.ttf",
    sourceSha256: "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da",
    variable: "--f-cjk-sans",
    weight: "100 900",
  },
  {
    family: "Roof WenKai",
    file: "roof-wenkai.woff2",
    source: "LXGWWenKaiGB-Regular.ttf",
    sourceSha256: "295568c131648062107543aa159c97dd49564be791136c2abf74cad83eba3f7f",
    variable: "--f-cjk-kaiti",
    weight: "400",
    emphasisAlias: "Roof WenKai Emphasis",
  },
];

const japaneseFonts = [
  {
    family: "Roof Noto Serif JP",
    file: "roof-noto-serif-jp.woff2",
    source: "NotoSerifJP.ttf",
    sourceSha256: "2fd527ba12b6a44ec30d796d633360da0aeba6c5d4af1304ce12bb4dc15a7dfc",
    variable: "--font-roof-noto-serif-jp",
    weight: "200 900",
  },
  {
    family: "Roof Noto Sans JP",
    file: "roof-noto-sans-jp.woff2",
    source: "NotoSansJP.ttf",
    sourceSha256: "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f",
    variable: "--font-roof-noto-sans-jp",
    weight: "100 900",
  },
];

const textExtensions = new Set([".css", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"]);
const corpusRoots = ["app", "lib", "source"];
const localeFontOwnedRoots = [
  "app/[locale]/",
  "app/components/translation/",
  "app/translation-fonts.generated.css",
  "source/_translations/",
];
const alwaysInclude = "思源宋体黑体文楷衬线无衬线，。；：？！“”‘’（）《》〈〉【】——……·";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

function walkTextFiles(directory) {
  if (fs.statSync(directory).isFile()) return [directory];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkTextFiles(absolute));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function isCjkTextCodePoint(codePoint) {
  return (
    codePoint === 0x00b7 ||
    codePoint === 0x00d7 ||
    codePoint === 0x00f7 ||
    (codePoint >= 0x2010 && codePoint <= 0x203b) ||
    (codePoint >= 0x2e80 && codePoint <= 0x312f) ||
    (codePoint >= 0x31a0 && codePoint <= 0x31ef) ||
    (codePoint >= 0x3400 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe4f) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef)
  );
}

function propertyValue(css, property) {
  const match = new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+);`).exec(css);
  assert.ok(match, `missing ${property}`);
  return match[1].trim();
}

const globalsCss = readUtf8(globalsPath);
const cjkFontCss = readUtf8(cjkFontCssPath);
const readerCss = readUtf8(readerPath);
const translationCss = readUtf8(translationPath);
const translationFontCss = readUtf8(translationFontCssPath);
assert.ok(fs.existsSync(manifestPath), "missing generated CJK font manifest; run scripts/build-cjk-font-subsets.py");
const manifest = JSON.parse(readUtf8(manifestPath));
assert.ok(fs.existsSync(translationFontManifestPath), "missing generated Japanese translation font manifest");
const translationFontManifest = JSON.parse(readUtf8(translationFontManifestPath));
assert.equal(manifest.version, 6, "unsupported CJK font manifest version");
assert.equal(
  manifest.strategy,
  "chinese-site-corpus-opencc-closure-variable-pair-and-upright-wenkai-emphasis",
  "Chinese fonts must cover the rendered corpus and its OpenCC conversion closure"
);
assert.equal(
  manifest.toolchainSha256,
  fontToolchainDigest,
  "CJK font outputs were not built with the pinned repository-private toolchain"
);
assert.deepEqual(
  manifest.upstreamCommits,
  {
    "google/fonts": "e1118da94a8cb00cf6d06cdac9ef13eb1e5c6ab7",
    "lxgw/LxgwWenKaiGB": "7e280c0880f6171d8e969b5c4bd3451f6094cce7",
  },
  "Chinese font source commits changed without review"
);
assert.equal(manifest.conversion, "opencc-js:cn2t+t2cn");
assert.ok(manifest.targetCodePointCount >= 2_500, "hosted Chinese subsets are unexpectedly small");
assert.deepEqual(
  manifest.unsupportedBodyCodePointRanges,
  ["U+202C", "U+FAFF"],
  "Chinese body roles plus WenKai fallback must cover every visible site-corpus character"
);

const faceBlocks = [...`${globalsCss}\n${cjkFontCss}`.matchAll(/@font-face\s*{[\s\S]*?}/g)].map((match) => match[0]);
const hashes = new Set();

for (const expected of expectedFonts) {
  const face = faceBlocks.find((block) =>
    new RegExp(`font-family\\s*:\\s*["']${escapeRegExp(expected.family)}["']\\s*;`).test(block)
    && /font-style\s*:\s*normal\s*;/.test(block)
  );
  assert.ok(face, `missing self-hosted @font-face for ${expected.family}`);
  assert.match(
    face,
    new RegExp(`url\\(["']?/fonts/${escapeRegExp(expected.file)}\\?v=[0-9a-f]{12}["']?\\)`),
    `${expected.file} must use a content-derived cache key`
  );
  assert.match(face, /format\(["']woff2["']\)/);
  assert.match(face, /font-style\s*:\s*normal\s*;/);
  assert.match(face, new RegExp(`font-weight\\s*:\\s*${expected.weight.replace(" ", "\\s+")}\\s*;`));
  assert.match(face, /font-display\s*:\s*swap\s*;/);

  const variable = propertyValue(globalsCss, expected.variable);
  assert.match(variable, new RegExp(`^["']${escapeRegExp(expected.family)}["']`), `${expected.variable} must prefer its hosted face`);

  const assetPath = path.join(root, "public", "fonts", expected.file);
  assert.ok(fs.existsSync(assetPath), `missing ${expected.file}`);
  const bytes = fs.readFileSync(assetPath);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${expected.file} is not WOFF2`);
  assert.ok(bytes.length >= 100_000, `${expected.file} is implausibly small`);
  assert.ok(bytes.length <= 3_500_000, `${expected.file} exceeds the 3.5 MB mobile budget`);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.ok(!hashes.has(digest), `${expected.file} duplicates another hosted font`);
  hashes.add(digest);

  const record = manifest.fonts?.[expected.family];
  assert.ok(record, `manifest is missing ${expected.family}`);
  assert.equal(record.file, expected.file);
  assert.equal(record.source, expected.source);
  assert.equal(record.sourceSha256, expected.sourceSha256);
  assert.equal(record.weight, expected.weight);
  assert.equal(record.bytes, bytes.length);
  assert.ok(record.codePointCount >= 2_500, `${expected.family} coverage is unexpectedly small`);
  assert.equal(record.sha256, digest);
  if (expected.emphasisAlias) {
    assert.ok(
      record.codePointCount >= manifest.siteCodePointCount + 500,
      "Roof WenKai must include the common Latin repertoire used by upright Chinese emphasis"
    );
    assert.equal(
      propertyValue(face, "unicode-range"),
      "U+00B7,U+00D7,U+00F7,U+2010-203B,U+2E80-312F,U+31A0-31EF,U+3400-9FFF,U+F900-FAFF,U+FE10-FE4F,U+FF00-FFEF",
      "the ordinary WenKai family must not capture Latin text outside emphasis"
    );
    const emphasisFace = faceBlocks.find((block) =>
      new RegExp(`font-family\\s*:\\s*["']${escapeRegExp(expected.emphasisAlias)}["']\\s*;`).test(block)
    );
    assert.ok(emphasisFace, "missing the Latin-capable WenKai emphasis alias");
    assert.doesNotMatch(emphasisFace, /unicode-range\s*:/u);
    assert.match(
      emphasisFace,
      new RegExp(`url\\(["']?/fonts/${escapeRegExp(expected.file)}\\?v=${digest.slice(0, 12)}["']?\\)`),
      "the WenKai emphasis alias must reuse the same cached font asset"
    );
  }
  assert.match(
    face,
    new RegExp(
      `url\\(["']?/fonts/${escapeRegExp(expected.file)}\\?v=${digest.slice(0, 12)}["']?\\)`
    ),
    `${expected.file} cache key must match its current SHA-256 digest`
  );

}

// 根 layout 只预载中文正文衬线体；URL 与缓存键来自生成清单。
const layoutSource = readUtf8(path.join(root, "app", "(site)", "layout.tsx"));
const foundationSource = readUtf8(path.join(root, "app", "document-foundation.ts"));
assert.match(
  layoutSource,
  /rel="preload"\s+as="font"\s+type="font\/woff2"\s+href=\{chineseSerifHref\}\s+crossOrigin="anonymous"/u,
  "app/(site)/layout.tsx must preload the Chinese serif body face"
);
assert.match(
  foundationSource,
  /cjkFontManifest\.fonts\["Roof Noto Serif SC"\]/u,
  "the Chinese serif preload must derive from cjk-font-manifest.json"
);
assert.match(
  foundationSource,
  /sha256\.slice\(0,\s*12\)/u,
  "the Chinese serif preload href must reuse the manifest cache key"
);

const serifRule = /:global\(html\[data-reader-font="serif"\]\) \.root\s*{([\s\S]*?)}/.exec(readerCss)?.[1];
const sansRule = /:global\(html\[data-reader-font="sans"\]\) \.root\s*{([\s\S]*?)}/.exec(readerCss)?.[1];
assert.ok(serifRule, "missing serif reader rule");
assert.ok(sansRule, "missing sans reader rule");
assert.equal(propertyValue(serifRule, "--reader-body-family"), "var(--f-cjk-serif)");
assert.equal(propertyValue(serifRule, "--reader-quote-family"), "var(--f-cjk-kaiti)");
assert.equal(propertyValue(sansRule, "--reader-body-family"), "var(--f-cjk-sans)");
assert.equal(propertyValue(sansRule, "--reader-quote-family"), "var(--f-cjk-sans)");
assert.notEqual(propertyValue(serifRule, "--reader-body-family"), propertyValue(sansRule, "--reader-body-family"));
assert.equal(propertyValue(readerCss, "--reader-emphasis-family"), "var(--f-emphasis-serif)");
assert.equal(
  [...readerCss.matchAll(/--reader-emphasis-family\s*:/gu)].length,
  1,
  "reading editions must inherit the single global emphasis stack"
);
assert.match(readerCss, /\.body :global\(p\)\s*{[\s\S]*?font-family\s*:\s*var\(--reader-body-family\)\s*;/);
assert.match(readerCss, /\.serifSample\s*{\s*font-family\s*:\s*var\(--f-cjk-serif\)\s*;/);
assert.match(
  readerCss,
  /\.sansSample\s*{\s*font-family\s*:\s*var\(--f-cjk-sans\)\s*;/
);
assert.match(readerCss, /\.body :global\(em\)\s*\{[\s\S]*?font-family\s*:\s*var\(--reader-emphasis-family\)\s*;[\s\S]*?font-style\s*:\s*normal\s*;[\s\S]*?font-synthesis\s*:\s*none\s*;/u);
assert.match(readerCss, /\.root \.body :global\(em \.latin-run\)[\s\S]*?font-family\s*:\s*inherit\s*;[\s\S]*?font-style\s*:\s*inherit\s*;/u);
assert.match(globalsCss, /\.art-body p\s*\{[\s\S]*?font-family\s*:\s*var\(--reader-body-family,\s*var\(--f-cjk-serif\)\)\s*;/u);
assert.match(globalsCss, /html:is\(\[lang="zh"\],\s*\[lang="zh-Hans"\],\s*\[lang="zh-Hant"\]\) \.art-body em/u);
assert.match(globalsCss, /html:is\(\[lang="zh"\],\s*\[lang="zh-Hans"\],\s*\[lang="zh-Hant"\]\) \.art-body em\s*\{[\s\S]*?font-style\s*:\s*normal\s*;/u);
assert.match(globalsCss, /html:is\(\[lang="zh"\],\s*\[lang="zh-Hans"\],\s*\[lang="zh-Hant"\]\) \.art-body em \.latin-run\s*\{[\s\S]*?font-family\s*:\s*inherit\s*;/u);
assert.match(globalsCss, /\.art-body em\s*\{\s*font-style\s*:\s*italic\s*;\s*\}/u, "non-Chinese editions must retain italic emphasis");
assert.doesNotMatch(`${globalsCss}\n${readerCss}\n${translationCss}\n${foundationSource}`, /Roof ST|STSong|STFangsong|STKaiti|STZhongsong|Roof Rare Han/u);

const japaneseEditionRule = /\.page:lang\(ja\)\s*\{([\s\S]*?)\}/u.exec(translationCss)?.[1];
assert.ok(japaneseEditionRule, "missing Japanese translation-edition font rule");
assert.match(
  propertyValue(japaneseEditionRule, "--translation-serif"),
  /^var\(--font-roof-translation-serif-stack\)$/u,
  "Japanese editions must use the generated hosted serif stack"
);
assert.match(
  propertyValue(japaneseEditionRule, "--translation-sans"),
  /^var\(--font-roof-translation-sans-stack\)$/u,
  "Japanese editions must use the generated hosted sans stack"
);
assert.match(
  translationCss,
  /\.page:lang\(ja\) \.body :global\(\.art-body p\)[\s\S]*?font-family\s*:\s*var\(--translation-serif\)\s*;/u,
  "Japanese body paragraphs must explicitly consume the hosted Japanese face"
);
assert.doesNotMatch(foundationSource, /Noto_(?:Serif|Sans)_JP/u, "Japanese fonts must not use next/font's full shard set");
assert.match(
  translationCss,
  /\.page:lang\(en\) \.body :global\(\.art-body blockquote\)[\s\S]*?font-family\s*:\s*var\(--font-eb-garamond\)/u,
  "English block quotations must consume the Latin quotation face"
);
assert.equal(translationFontManifest.version, 3, "unsupported Japanese translation font manifest version");
assert.equal(
  translationFontManifest.strategy,
  "japanese-translation-corpus-variable-fonts-with-generated-script-and-symbol-fallbacks",
  "Japanese fonts must be generated from the localized corpus and generated fallback set"
);
assert.equal(
  translationFontManifest.toolchainSha256,
  fontToolchainDigest,
  "Japanese font outputs were not built with the pinned repository-private toolchain"
);
for (const stack of ["serif", "sans"]) {
  const record = translationFontManifest.stacks?.[stack];
  assert.ok(record, `Japanese font manifest is missing the ${stack} stack`);
  assert.match(record.variable, /^--font-roof-translation-(?:serif|sans)-stack$/u);
  assert.ok(record.families.length >= 2, `${stack} stack must include a generated fallback`);
  assert.equal(propertyValue(translationFontCss, record.variable), record.families.map((family) => `"${family}"`).join(", "));
}
assert.equal(
  translationFontManifest.upstreamCommit,
  "e1118da94a8cb00cf6d06cdac9ef13eb1e5c6ab7",
  "Japanese font source commit changed without review"
);
assert.ok(translationFontManifest.subsetCodePointCount >= 1_000, "Japanese font corpus is unexpectedly small");
assert.deepEqual(translationFontManifest.uncoveredCodePointRanges, [], "the live Japanese corpus contains an uncovered code point");

const translationFaceBlocks = [...translationFontCss.matchAll(/@font-face\s*{[\s\S]*?}/g)].map((match) => match[0]);
let japaneseFontBytes = 0;
for (const expected of japaneseFonts) {
  const record = translationFontManifest.fonts?.[expected.family];
  assert.ok(record, `Japanese font manifest is missing ${expected.family}`);
  assert.equal(record.file, expected.file);
  assert.equal(record.source, expected.source);
  assert.equal(record.sourceSha256, expected.sourceSha256);
  assert.equal(record.weight, expected.weight);
  assert.equal(record.codePointCount, translationFontManifest.subsetCodePointCount);
  assert.match(record.sourceUrl, new RegExp(`${translationFontManifest.upstreamCommit}/`));
  const assetPath = path.join(root, "public", "fonts", expected.file);
  assert.ok(fs.existsSync(assetPath), `missing ${expected.file}`);
  const bytes = fs.readFileSync(assetPath);
  japaneseFontBytes += bytes.length;
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${expected.file} is not WOFF2`);
  assert.ok(bytes.length >= 100_000, `${expected.file} is implausibly small`);
  assert.ok(bytes.length <= 1_300_000, `${expected.file} exceeds its 1.3 MB corpus-subset budget`);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(record.bytes, bytes.length);
  assert.equal(record.sha256, digest);
  const face = translationFaceBlocks.find((block) => (
    new RegExp(`font-family\\s*:\\s*["']${escapeRegExp(expected.family)}["']\\s*;`).test(block)
  ));
  assert.ok(face, `missing generated @font-face for ${expected.family}`);
  assert.match(
    face,
    new RegExp(`url\\(["']?/fonts/${escapeRegExp(expected.file)}\\?v=${digest.slice(0, 12)}["']?\\)`),
    `${expected.file} cache key must match its digest`
  );
  assert.match(face, new RegExp(`font-weight\\s*:\\s*${expected.weight.replace(" ", "\\s+")}\\s*;`));
  assert.match(face, /font-display\s*:\s*swap\s*;/u);
  assert.equal(propertyValue(translationFontCss, expected.variable), `"${expected.family}"`);
}
assert.ok(japaneseFontBytes <= 2_200_000, "Japanese serif + sans payload exceeds the 2.2 MB translation payload budget");

const japaneseFallbackRecords = Object.values(translationFontManifest.fonts ?? {})
  .filter((record) => typeof record === "object" && record.kind?.startsWith("fallback-"));
assert.ok(japaneseFallbackRecords.length > 0, "Japanese font manifest has no generated fallback records");
for (const record of japaneseFallbackRecords) {
  assert.equal(typeof record.family, "string");
  assert.equal(typeof record.file, "string");
  assert.equal(typeof record.variable, "string");
  assert.ok(record.codePointCount >= 0, `${record.family} must record generated coverage`);
  assert.ok(record.unicodeRange || record.codePointCount === 0, `${record.family} must expose generated unicode coverage`);
  const assetPath = path.join(root, "public", "fonts", record.file);
  assert.ok(fs.existsSync(assetPath), `missing ${record.file}`);
  const bytes = fs.readFileSync(assetPath);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${record.file} is not WOFF2`);
  assert.ok(bytes.length >= 500, `${record.file} is implausibly small`);
  assert.ok(bytes.length <= 100_000, `${record.file} exceeds its generated fallback budget`);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(record.bytes, bytes.length);
  assert.equal(record.sha256, digest);
  const face = translationFaceBlocks.find((block) => (
    new RegExp(`font-family\\s*:\\s*["']${escapeRegExp(record.family)}["']\\s*;`).test(block)
  ));
  assert.ok(face, `missing generated @font-face for ${record.family}`);
  assert.match(face, new RegExp(`url\\(["']?/fonts/${escapeRegExp(record.file)}\\?v=${digest.slice(0, 12)}["']?\\)`));
  assert.match(face, /unicode-range\s*:/u, `${record.file} must use generated coverage, not a hand whitelist`);
  assert.equal(propertyValue(translationFontCss, record.variable), `"${record.family}"`);
}

const translationCorpusRoots = [
  "source/_translations/ja",
  "source/_translations/language-dispositions.json",
  "app/[locale]",
  "app/components/translation",
];
const translationCorpusFiles = translationCorpusRoots
  .flatMap((directory) => walkTextFiles(path.join(root, directory)))
  .filter((file) => textExtensions.has(path.extname(file)))
  .sort();
const translationCorpusRelative = translationCorpusFiles.map((file) => (
  path.relative(root, file).split(path.sep).join("/")
));
assert.deepEqual(
  translationFontManifest.corpusFiles,
  translationCorpusRelative,
  "Japanese font corpus inventory is stale; run python3 scripts/build-translation-font-subsets.py"
);
const translationCorpusDigest = crypto.createHash("sha256");
const translationTargetCodePoints = new Set();
for (const file of translationCorpusFiles) {
  const relative = Buffer.from(path.relative(root, file).split(path.sep).join("/"), "utf8");
  const payload = fs.readFileSync(file);
  const relativeLength = Buffer.alloc(4);
  relativeLength.writeUInt32BE(relative.length);
  const payloadLength = Buffer.alloc(8);
  payloadLength.writeBigUInt64BE(BigInt(payload.length));
  translationCorpusDigest.update(relativeLength).update(relative).update(payloadLength).update(payload);
  for (const character of payload.toString("utf8")) {
    if (!/\s/u.test(character)) translationTargetCodePoints.add(character.codePointAt(0));
  }
}
assert.equal(translationFontManifest.corpusFileCount, translationCorpusFiles.length);
assert.equal(
  translationFontManifest.corpusSha256,
  translationCorpusDigest.digest("hex"),
  "Japanese translation corpus changed; regenerate its hosted font subsets"
);
assert.equal(
  translationFontManifest.targetCodePointCount,
  translationTargetCodePoints.size,
  "Japanese target-code-point inventory is stale"
);
const translationTargetCodePointDigest = crypto
  .createHash("sha256")
  .update([...translationTargetCodePoints]
    .sort((left, right) => left - right)
    .map((codePoint) => codePoint.toString(16).toUpperCase())
    .join(","))
  .digest("hex");
assert.equal(
  translationFontManifest.targetCodePointSha256,
  translationTargetCodePointDigest,
  "Japanese target-code-point coverage is stale"
);
assert.match(
  foundationSource,
  /translationFontManifest\.fonts\["Roof Noto Serif JP"\]/u,
  "the Japanese preload must derive from translation-font-manifest.json"
);
const localeLayoutSource = readUtf8(path.join(root, "app", "[locale]", "layout.tsx"));
assert.match(
  localeLayoutSource,
  /locale === "ja"[\s\S]*?rel="preload"[\s\S]*?href=\{japaneseSerifHref\}/u,
  "Japanese localized routes must preload the corpus serif face"
);
const translationBookCss = readUtf8(path.join(root, "app", "[locale]", "books", "[book]", "translation-book.module.css"));
assert.match(
  translationBookCss,
  /\.page:lang\(ja\)\s*\{[^}]*font-family\s*:\s*var\(--font-roof-translation-serif-stack\)/u,
  "Japanese translation-book pages must consume the complete hosted serif stack"
);
assert.doesNotMatch(
  translationBookCss,
  /font-family\s*:[^;]*var\(--font-roof-noto-(?:serif|sans)-jp\)/u,
  "Japanese translation-book consumers must not bypass generated fallback stacks"
);

const corpusFiles = corpusRoots
  .flatMap((directory) => walkTextFiles(path.join(root, directory)))
  .filter((file) => {
    const relative = path.relative(root, file).split(path.sep).join("/");
    return !localeFontOwnedRoots.some((prefix) => relative.startsWith(prefix));
  });
const publicText = path.join(root, "public", "llms.txt");
if (fs.existsSync(publicText)) corpusFiles.push(publicText);
assert.equal(
  manifest.corpusFileCount,
  corpusFiles.length,
  "the CJK corpus file inventory is stale; regenerate the subsets"
);
const sourceText = [alwaysInclude, ...corpusFiles.map(readUtf8)].join("\n");
const sourceCodePoints = new Set();
for (const character of sourceText) {
  const codePoint = character.codePointAt(0);
  if (isCjkTextCodePoint(codePoint)) sourceCodePoints.add(codePoint);
}
const simplifiedToTraditional = ConverterBuilder(cn2t)({ from: "cn", to: "t" });
const traditionalToSimplified = ConverterBuilder(t2cn)({ from: "t", to: "cn" });
const convertedText =
  simplifiedToTraditional(sourceText) + "\n" + traditionalToSimplified(sourceText);
const siteCodePoints = new Set(sourceCodePoints);
for (const character of convertedText) {
  const codePoint = character.codePointAt(0);
  if (isCjkTextCodePoint(codePoint)) siteCodePoints.add(codePoint);
}
const codePointDigest = (codePoints) =>
  crypto
    .createHash("sha256")
    .update(
      [...codePoints]
        .sort((left, right) => left - right)
        .map((codePoint) => codePoint.toString(16).toUpperCase())
        .join(",")
    )
    .digest("hex");
assert.equal(
  manifest.sourceCodePointCount,
  sourceCodePoints.size,
  "the source corpus fingerprint is stale"
);
assert.equal(
  manifest.sourceCodePointSha256,
  codePointDigest(sourceCodePoints),
  "the source corpus fingerprint is stale"
);
const siteCodePointPayload = [...siteCodePoints]
  .sort((left, right) => left - right)
  .map((codePoint) => codePoint.toString(16).toUpperCase())
  .join(",");
const siteCodePointDigest = crypto.createHash("sha256").update(siteCodePointPayload).digest("hex");
assert.equal(manifest.siteCodePointCount, siteCodePoints.size, "hosted CJK subsets are stale; regenerate them");
assert.equal(manifest.siteCodePointSha256, siteCodePointDigest, "hosted CJK subsets are stale; regenerate them");
assert.ok(
  siteCodePoints.size > sourceCodePoints.size,
  "OpenCC closure must contribute code points beyond the raw corpus"
);
for (const character of "軟頭髮後臺幹頁網絡閱讀記錄開啓專題連") {
  assert.ok(
    siteCodePoints.has(character.codePointAt(0)),
    `OpenCC conversion output ${character} must be included in the font corpus`
  );
}

console.log(
  `hosted font contract passed (${manifest.targetCodePointCount} OpenCC-closed Chinese points, `
  + `${translationFontManifest.subsetCodePointCount} Japanese corpus points in ${japaneseFontBytes.toLocaleString()} bytes, `
  + `${expectedFonts.length} Chinese roles)`
);
