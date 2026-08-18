import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const archiveDir = path.join(root, ".local-archive", "wechat-full", "articles");
const preservationPath = path.join(root, "editorial-sources", "wechat", "preservation-manifest.json");
const mappingsPath = path.join(root, "editorial-sources", "wechat", "internal-link-canonical-map.json");
const outputPath = path.join(root, "editorial-sources", "wechat", "source-identity-index.json");

if (process.argv[2] !== "build") {
  console.error("Usage: node scripts/manage-wechat-source-identities.mjs build");
  process.exit(1);
}

if (!fs.existsSync(archiveDir)) {
  console.error(`Local WeChat archive not found: ${archiveDir}`);
  process.exit(1);
}

const preservation = JSON.parse(fs.readFileSync(preservationPath, "utf8"));
const mappings = JSON.parse(fs.readFileSync(mappingsPath, "utf8"));
const sourceIds = [
  ...new Set([
    ...(preservation.articles ?? []).flatMap((article) => article.sourceIds ?? [article.sourceId]),
    ...mappings.flatMap((entry) => entry.sourceIds ?? []),
  ]),
].sort();
const archiveDirectories = fs.readdirSync(archiveDir);
const sources = {};

for (const sourceId of sourceIds) {
  const directory = archiveDirectories.find((name) => name.endsWith(`-${sourceId}`));
  const metadataPath = directory ? path.join(archiveDir, directory, "metadata.json") : null;
  if (!metadataPath || !fs.existsSync(metadataPath)) {
    console.error(`Missing archived metadata for imported WeChat source: ${sourceId}`);
    process.exit(1);
  }
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  sources[sourceId] = {
    biz: metadata.biz ? String(metadata.biz) : null,
    mid: metadata.mid ? String(metadata.mid) : null,
    idx: metadata.idx ? String(metadata.idx) : null,
    sn: metadata.sn ? String(metadata.sn) : null,
  };
}

fs.writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, sources }, null, 2)}\n`);
console.log(`Wrote ${sourceIds.length} imported WeChat source identities to ${outputPath}`);
