import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "editorial-sources", "wechat", "assets-manifest.json");
const postsDirectory = path.join(root, "source", "_posts");
const referencePattern = /attachments\/(wechat(?:-(?:audio|video))?)\/([^\s)"']+)/gu;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.version !== 1 || manifest.public !== true || !Array.isArray(manifest.assets)) {
  throw new Error("WeChat asset manifest must be a published version 1 asset contract");
}

const manifestKeys = new Set(manifest.assets.map((asset) => asset.key));
const references = new Set();
for (const name of fs.readdirSync(postsDirectory)) {
  if (!name.endsWith(".md")) continue;
  const source = fs.readFileSync(path.join(postsDirectory, name), "utf8");
  for (const match of source.matchAll(referencePattern)) {
    references.add(`${match[1]}/${match[2]}`);
    if (match[1] === "wechat-video") {
      const poster = match[2].replace(/\/original-(\d+x\d+)\.mp4$/u, "/poster-$1.jpg");
      if (poster !== match[2]) references.add(`wechat-video/${poster}`);
    }
  }
}

const missing = [...references].filter((key) => !manifestKeys.has(key));
if (missing.length > 0) {
  throw new Error(`WeChat asset references missing from the manifest:\n${missing.join("\n")}`);
}

console.log(`WeChat assets ready from ${references.size} published R2 manifest entries`);
