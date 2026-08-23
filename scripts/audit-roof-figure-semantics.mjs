import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rawDirectory = path.join(root, ".local-archive", "bilibili-raw", "source-archive", "articles");
const postsDirectory = path.join(root, "source", "_posts");
const SOURCE_PROSE_MARKER = "<!--source-centered-prose-->";

if (!fs.existsSync(rawDirectory)) {
  console.error(`roof figure audit requires the local source archive: ${path.relative(root, rawDirectory)}`);
  process.exit(2);
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<[^>]*>/gu, "")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;|&#34;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalize(value) {
  return decodeHtml(value)
    .replace(/^\[(?:图题|图注|人物|人物简介)\]\s*/u, "")
    .replace(/^>\s*/u, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[*_`]/gu, "")
    .replace(/[：:]/gu, ":")
    .replace(/[，,]/gu, ",")
    .replace(/[。．.]$/u, "")
    .replace(/[（）()【】\[\]「」『』《》“”‘’'"\s]/gu, "")
    .trim();
}

function previousSignificant(lines, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (lines[cursor].trim()) return cursor;
  }
  return -1;
}

function nextSignificant(lines, index) {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor].trim()) return cursor;
  }
  return -1;
}

function isImage(line) {
  return /^!\[[^\]]*\]\([^\n]+\)\s*$/u.test(line.trim());
}

function isClassified(lines, index) {
  const line = lines[index].trim();
  if (/^(?:\[(?:图题|图注|人物|人物简介)\]|>|#{1,6}\s)/u.test(line)) return true;
  const previous = previousSignificant(lines, index);
  return previous >= 0 && lines[previous].trim() === SOURCE_PROSE_MARKER;
}

function centeredGrayBlocks(html) {
  const blocks = [];
  const paragraph = /<p\b([^>]*)>([\s\S]*?)<\/p>/giu;
  let match;
  while ((match = paragraph.exec(html))) {
    if (!/text-align\s*:\s*center/iu.test(match[1])) continue;
    if (!/(?:#999999|rgb\(\s*153\s*,\s*153\s*,\s*153\s*\))/iu.test(match[2])) continue;
    const text = decodeHtml(match[2]);
    if (text && text.length <= 260) blocks.push(text);
  }
  return blocks;
}

const posts = fs.readdirSync(postsDirectory)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const pathname = path.join(postsDirectory, name);
    return { pathname, lines: fs.readFileSync(pathname, "utf8").split(/\r?\n/u) };
  });
const postsByCv = new Map();
for (const post of posts) {
  const text = post.lines.join("\n");
  for (const match of text.matchAll(/attachments\/roof-archive\/cv(\d+)\//gu)) {
    const entries = postsByCv.get(match[1]) ?? [];
    if (!entries.includes(post)) entries.push(post);
    postsByCv.set(match[1], entries);
  }
}

let sourceBlocks = 0;
let publicMatches = 0;
const failures = [];
for (const [cvId, mappedPosts] of postsByCv) {
  const rawPath = path.join(rawDirectory, `cv${cvId}.json`);
  if (!fs.existsSync(rawPath)) continue;
  const source = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  for (const sourceText of centeredGrayBlocks(source?.content?.renderedHtml ?? "")) {
    sourceBlocks += 1;
    for (const post of mappedPosts) {
      for (let index = 0; index < post.lines.length; index += 1) {
        if (normalize(post.lines[index]) !== normalize(sourceText)) continue;
        publicMatches += 1;
        if (isClassified(post.lines, index)) continue;
        const previous = previousSignificant(post.lines, index);
        const next = nextSignificant(post.lines, index);
        if (!(previous >= 0 && isImage(post.lines[previous])) && !(next >= 0 && isImage(post.lines[next]))) continue;
        failures.push({
          file: path.relative(root, post.pathname).replaceAll(path.sep, "/"),
          line: index + 1,
          cvId: `cv${cvId}`,
          text: post.lines[index].trim(),
        });
      }
    }
  }
}

const uniqueFailures = [...new Map(failures.map((failure) => [
  `${failure.file}:${failure.line}`,
  failure,
])).values()];
console.log(JSON.stringify({
  mappedSources: postsByCv.size,
  centeredGraySourceBlocks: sourceBlocks,
  exactPublicMatches: publicMatches,
  unclassifiedImageNeighbors: uniqueFailures.length,
}, null, 2));

if (uniqueFailures.length > 0) {
  for (const failure of uniqueFailures) {
    console.error(`${failure.file}:${failure.line}: ${failure.cvId} centered-gray image neighbor remains plain: ${failure.text}`);
  }
  process.exitCode = 1;
}
