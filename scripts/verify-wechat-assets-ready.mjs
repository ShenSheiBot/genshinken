import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "editorial-sources", "wechat", "assets-manifest.json");
const postsDirectory = path.join(root, "source", "_posts");
const referencePattern = /attachments\/wechat\/([^\s)"']+)/gu;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.version !== 1 || typeof manifest.public !== "boolean" || !Array.isArray(manifest.assets)) {
  throw new Error("WeChat asset manifest must be version 1 with boolean public and an assets array");
}

const manifestKeys = new Set(manifest.assets.map((asset) => asset.key));
const references = new Set();
for (const name of fs.readdirSync(postsDirectory)) {
  if (!name.endsWith(".md")) continue;
  const source = fs.readFileSync(path.join(postsDirectory, name), "utf8");
  for (const match of source.matchAll(referencePattern)) references.add(`wechat/${match[1]}`);
}

const missing = [...references].filter((key) => !manifestKeys.has(key));
if (missing.length > 0) {
  throw new Error(`WeChat image references missing from the manifest:\n${missing.join("\n")}`);
}

if (!manifest.public) {
  const untracked = [...references].filter((key) => {
    const local = path.join("public", "attachments", ...key.split("/"));
    try {
      execFileSync("git", ["ls-files", "--error-unmatch", "--", local], {
        cwd: root,
        stdio: "ignore",
      });
      return false;
    } catch {
      return true;
    }
  });
  if (untracked.length > 0) {
    throw new Error(
      "WeChat assets are neither tracked locally nor promoted to R2. "
        + "Run assets:wechat:release before committing their articles:\n"
        + untracked.join("\n"),
    );
  }
  console.log(`WeChat assets ready from ${references.size} tracked local files; CDN promotion pending`);
} else {
  console.log(`WeChat assets ready from ${references.size} R2 manifest entries`);
}
