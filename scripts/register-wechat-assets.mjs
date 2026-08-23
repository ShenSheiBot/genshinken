#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function sourceImages(imageManifest) {
  return [imageManifest?.cover, ...(imageManifest?.body ?? imageManifest?.images ?? [])]
    .filter(Boolean);
}

export function registerWechatAssets({ manifest, sourceDirectory, markdown }) {
  if (manifest.version !== 1 || manifest.public !== true || !Array.isArray(manifest.assets)) {
    throw new Error("WeChat asset manifest must be a published version 1 asset contract");
  }

  const sourceId = path.basename(sourceDirectory).replace(/^\d+-/u, "");
  const imagesPath = path.join(sourceDirectory, "images.json");
  if (!fs.existsSync(imagesPath)) throw new Error(`images.json not found: ${imagesPath}`);
  const images = sourceImages(JSON.parse(fs.readFileSync(imagesPath, "utf8")));
  const byBasename = new Map(images.flatMap((image) => (
    image.file ? [[path.basename(image.file), image]] : []
  )));
  const expectedPrefix = `attachments/wechat/${sourceId}/`;
  const references = new Set();
  const referencePattern = /attachments\/wechat\/([^\s)"']+)/gu;
  for (const match of markdown.matchAll(referencePattern)) {
    const relative = match[1].split(/[?#]/u, 1)[0];
    const fullReference = `attachments/wechat/${relative}`;
    if (!fullReference.startsWith(expectedPrefix)) {
      throw new Error(`Final Markdown references another WeChat source: ${fullReference}`);
    }
    references.add(relative.slice(sourceId.length + 1));
  }

  const existing = new Map(manifest.assets.map((asset) => [asset.key, asset]));
  const additions = [];
  for (const relative of references) {
    if (relative.includes("/") || path.basename(relative) !== relative) {
      throw new Error(`Unexpected WeChat image path: ${relative}`);
    }
    const image = byBasename.get(relative);
    if (!image?.downloaded || !Number.isInteger(image.bytes) || !image.sha256) {
      throw new Error(`Final image is absent from the downloaded source inventory: ${relative}`);
    }
    const contentType = mimeTypes.get(path.extname(relative).toLowerCase());
    if (!contentType) throw new Error(`Unsupported WeChat image extension: ${relative}`);
    const candidate = {
      key: `wechat/${sourceId}/${relative}`,
      bytes: image.bytes,
      sha256: image.sha256,
      contentType,
    };
    const current = existing.get(candidate.key);
    if (current) {
      if (JSON.stringify(current) !== JSON.stringify(candidate)) {
        throw new Error(`Published asset metadata differs from the source inventory: ${candidate.key}`);
      }
      continue;
    }
    additions.push(candidate);
  }

  const assets = [...manifest.assets, ...additions]
    .sort((left, right) => left.key.localeCompare(right.key, "en"));
  return { manifest: { ...manifest, assets }, additions };
}

function main() {
  const [sourceDirectoryArg, markdownPathArg] = process.argv.slice(2);
  if (!sourceDirectoryArg || !markdownPathArg) {
    throw new Error("usage: register-wechat-assets.mjs SOURCE_DIR FINAL_MARKDOWN");
  }
  const root = process.cwd();
  const sourceDirectory = path.resolve(sourceDirectoryArg);
  const markdownPath = path.resolve(markdownPathArg);
  const manifestPath = path.join(root, "editorial-sources", "wechat", "assets-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const result = registerWechatAssets({ manifest, sourceDirectory, markdown });
  if (result.additions.length > 0) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(result.manifest, null, 2)}\n`);
  }
  process.stdout.write(`Registered ${result.additions.length} new image asset(s); ${
    result.manifest.assets.length
  } total public assets.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
