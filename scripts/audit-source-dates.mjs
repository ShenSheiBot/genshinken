/**
 * Read-only audit of publication dates against locally available raw source metadata.
 * This is intentionally a warning audit: duplicate, revised, merged, and cross-platform
 * editions require editorial judgement and must not be auto-rewritten by a gate.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const archive = path.join(root, ".local-archive");
const wxRoot = path.join(archive, "wechat-full", "articles");
const biliRoots = [
  path.join(archive, "bilibili-raw", "source-archive", "articles"),
  path.join(root, "editorial-sources", "roof-archive"),
];
const shanghai = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});
const dayFromUnix = (value) => shanghai.format(new Date(Number(value) * 1000));
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
const wx = new Map();
if (fs.existsSync(wxRoot)) {
  for (const dir of fs.readdirSync(wxRoot)) {
    const metadataPath = path.join(wxRoot, dir, "metadata.json");
    if (!fs.existsSync(metadataPath)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      const id = String(m.source_url ?? m.sourceUrl ?? "").match(/\/s\/([\w-]+)/)?.[1];
      if (!id) continue;
      const raw = m.create_timestamp ? dayFromUnix(m.create_timestamp) : String(m.create_time ?? m.publishedAt ?? "").slice(0, 10);
      if (raw) wx.set(id, { date: raw, source: `wechat:${id}` });
    } catch { /* an unreadable optional archive entry is not a product failure */ }
  }
}
const bili = new Map();
for (const dir of biliRoots) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!/^cv\d+\.json$/.test(name)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      const ts = m.listingMetadata?.publish_time ?? m.source?.publishedAtUnix;
      if (ts) bili.set(name.slice(0, -5), { date: dayFromUnix(ts), source: `bilibili:${name.slice(0, -5)}` });
    } catch { /* same as above */ }
  }
}
const postsRoot = path.join(root, "source", "_posts");
// Source dispositions are the exact source-to-canonical mapping used by the editor;
// unlike a broad note-text search, they do not treat a cross-link as ownership.
const dispositionPath = path.join(root, "editorial-sources", "wechat", "source-dispositions.json");
const dispositionSources = new Map();
if (fs.existsSync(dispositionPath)) {
  try {
    for (const item of JSON.parse(fs.readFileSync(dispositionPath, "utf8"))) {
      if (item.canonicalPost && item.sourceId) {
        const slug = path.basename(item.canonicalPost, ".md");
        (dispositionSources.get(slug) ?? dispositionSources.set(slug, new Set()).get(slug)).add(item.sourceId.replace(/^\d+-/, ""));
      }
    }
  } catch { /* optional historical disposition file */ }
}
const noteSources = new Map();
const noteEvidence = new Map();
const noteRoot = path.join(root, "editorial-sources", "wechat");
if (fs.existsSync(noteRoot)) {
  for (const name of fs.readdirSync(noteRoot).filter((x) => x.endsWith("-editorial-note.md"))) {
    const text = fs.readFileSync(path.join(noteRoot, name), "utf8");
    const id = text.match(/source ID[：:]\s*`?([\w-]+)/i)?.[1];
    const slug = text.match(/公开路由[：:]\s*`?\/posts\/([^`\s]+)/)?.[1];
    if (id && slug) { (noteSources.get(slug) ?? noteSources.set(slug, new Set()).get(slug)).add(id); noteEvidence.set(`${slug}:${id}`, text); }
  }
}
const findings = [];
for (const name of fs.readdirSync(postsRoot).filter((x) => x.endsWith(".md"))) {
  const file = path.join(postsRoot, name);
  const raw = fs.readFileSync(file, "utf8");
  const { data } = matter(raw);
  const current = dateOnly(data.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) continue;
  const front = raw.slice(0, raw.indexOf("\n---", 4) + 4);
  const ids = new Set([
    ...[...front.matchAll(/mp\.weixin\.qq\.com\/s\/([\w-]+)/g)].map((m) => m[1]),
    ...[...front.matchAll(/\bcv\d+\b/g)].map((m) => m[0]),
    ...(dispositionSources.get(name.slice(0, -3)) ?? []),
    ...(noteSources.get(name.slice(0, -3)) ?? []),
  ]);
  for (const id of ids) {
    const source = wx.get(id) ?? bili.get(id);
    if (!source || source.date === current) continue;
    const evidence = noteEvidence.get(`${name.slice(0, -3)}:${id}`) ?? "";
    // An editorial note may deliberately choose the historical listing/public date
    // over a later archive create_time or platform listing timestamp. That is a
    // resolved editorial discrepancy, not a mechanical failure.
    if (/微信发布日期|公开日|公开日期|页面公开日|原始.*公开日期/.test(evidence)) continue;
    findings.push({ file: path.relative(root, file), current, source: source.source, sourceDate: source.date });
  }
}
if (!wx.size && !bili.size) {
  console.log("source-date audit: skipped (local raw source archives are not mounted)");
  process.exit(0);
}
if (!findings.length) {
  console.log(`source-date audit: pass (${wx.size} WeChat, ${bili.size} Bilibili raw sources checked)`);
  process.exit(0);
}
console.warn(`source-date audit: ${findings.length} warning(s); duplicate/revision/merge cases require editorial review`);
for (const f of findings) console.warn(`- ${f.file}: ${f.current} != ${f.sourceDate} (${f.source})`);
process.exit(0);
