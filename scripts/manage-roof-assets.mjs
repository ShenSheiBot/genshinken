import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.resolve(
  process.env.ARCHIVE_ASSET_DIR
    ?? process.env.ROOF_ARCHIVE_ASSET_DIR
    ?? path.join(root, "public", "attachments", "roof-archive")
);
const manifestPath = path.resolve(
  process.env.ARCHIVE_ASSET_MANIFEST ?? process.env.ROOF_ARCHIVE_ASSET_MANIFEST ??
    path.join(root, "editorial-sources", "roof-archive", "assets-manifest.json")
);
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "f301160e44a0ed1c9e6a9cd6be3690f5";
const bucketName = process.env.ARCHIVE_ASSET_R2_BUCKET
  ?? process.env.ROOF_ARCHIVE_R2_BUCKET
  ?? "roof-genshinken-archive-assets";
const publicBaseUrl = (
  process.env.ARCHIVE_ASSET_BASE_URL
    ?? process.env.ROOF_ARCHIVE_ASSET_BASE_URL
    ?? "https://assets.labonroof.top"
).replace(/\/+$/u, "");
const command = process.argv[2];
const assetKeyRoot = (process.env.ARCHIVE_ASSET_KEY_ROOT ?? "roof-archive").replace(/^\/+|\/+$/gu, "");
const keyPrefix = (
  process.env.ARCHIVE_ASSET_SELECT_PREFIX ?? process.env.ROOF_ARCHIVE_ASSET_KEY_PREFIX ?? ""
).trim();
const requiresPromotion = process.env.ARCHIVE_ASSET_REQUIRE_PROMOTION === "1";

const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function loadManifest() {
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (parsed.version !== 1 || !Array.isArray(parsed.assets)) {
    throw new Error(`Unsupported asset manifest: ${manifestPath}`);
  }
  return parsed;
}

function selectAssets(assets) {
  if (!keyPrefix) return assets;
  const selected = assets.filter((asset) => asset.key.startsWith(keyPrefix));
  if (selected.length === 0) {
    throw new Error(`No manifest assets match ROOF_ARCHIVE_ASSET_KEY_PREFIX=${keyPrefix}`);
  }
  return selected;
}

function buildManifest() {
  if (!fs.existsSync(sourceDirectory)) throw new Error(`Asset directory not found: ${sourceDirectory}`);
  const existing = fs.existsSync(manifestPath) ? loadManifest() : null;
  const localAssets = walk(sourceDirectory)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((absolute) => {
      const relative = path.relative(sourceDirectory, absolute).split(path.sep).join("/");
      const body = fs.readFileSync(absolute);
      const extension = path.extname(relative).toLowerCase();
      const contentType = mimeTypes.get(extension);
      if (!contentType) throw new Error(`Unsupported asset extension: ${relative}`);
      return {
        key: `${assetKeyRoot}/${relative}`,
        bytes: body.length,
        sha256: sha256(body),
        contentType,
      };
    });
  const localAssetsByKey = new Map(localAssets.map((asset) => [asset.key, asset]));
  const existingAssets = existing?.assets ?? [];
  const existingKeys = new Set(existingAssets.map((asset) => asset.key));
  const assets = existingAssets
    .map((asset) => localAssetsByKey.get(asset.key) ?? asset)
    .concat(localAssets.filter((asset) => !existingKeys.has(asset.key)));
  const manifest = {
    version: 1,
    bucket: bucketName,
    publicBaseUrl,
    ...(requiresPromotion ? { public: false } : {}),
    assets,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  console.log(`Wrote ${assets.length} assets (${bytes} bytes) to ${path.relative(root, manifestPath)}`);
}

function oauthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const configPath = process.env.WRANGLER_OAUTH_CONFIG;
  if (!configPath) {
    throw new Error("Set CLOUDFLARE_API_TOKEN or WRANGLER_OAUTH_CONFIG before uploading");
  }
  const config = fs.readFileSync(configPath, "utf8");
  const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/mu)?.[1];
  if (!token) throw new Error(`Wrangler OAuth token not found in ${configPath}`);
  return token;
}

function localPathFor(asset) {
  const prefix = `${assetKeyRoot}/`;
  if (!asset.key.startsWith(prefix)) throw new Error(`Unexpected R2 key: ${asset.key}`);
  return path.join(sourceDirectory, ...asset.key.slice(prefix.length).split("/"));
}

async function retry(operation, label, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(30_000, 700 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function runPool(items, worker, { concurrency, startIntervalMs = 0 }) {
  let next = 0;
  let completed = 0;
  let nextStart = Date.now();
  let startLock = Promise.resolve();

  async function pace() {
    let release;
    const previous = startLock;
    startLock = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    const wait = Math.max(0, nextStart - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nextStart = Date.now() + startIntervalMs;
    release();
  }

  async function lane() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      if (startIntervalMs > 0) await pace();
      await worker(items[index], index);
      completed += 1;
      if (completed % 50 === 0 || completed === items.length) {
        console.log(`${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => lane()));
}

async function upload() {
  const token = oauthToken();
  const { assets: manifestAssets } = loadManifest();
  const allAssets = selectAssets(manifestAssets);
  const start = Number.parseInt(
    process.env.ARCHIVE_ASSET_UPLOAD_START ?? process.env.ROOF_ARCHIVE_UPLOAD_START ?? "0",
    10,
  );
  const assets = allAssets.slice(Number.isFinite(start) && start > 0 ? start : 0);
  const concurrency = Number.parseInt(
    process.env.ARCHIVE_ASSET_UPLOAD_CONCURRENCY
      ?? process.env.ROOF_ARCHIVE_UPLOAD_CONCURRENCY
      ?? "20",
    10,
  );
  const startIntervalMs = Number.parseInt(
    process.env.ARCHIVE_ASSET_UPLOAD_INTERVAL_MS
      ?? process.env.ROOF_ARCHIVE_UPLOAD_INTERVAL_MS
      ?? "280",
    10,
  );
  await runPool(
    assets,
    async (asset) => {
      const file = localPathFor(asset);
      const body = fs.readFileSync(file);
      if (body.length !== asset.bytes || sha256(body) !== asset.sha256) {
        throw new Error(`Local asset differs from manifest: ${file}`);
      }
      const encodedKey = asset.key.split("/").map(encodeURIComponent).join("/");
      await retry(async () => {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodedKey}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Length": String(body.length),
              "Content-Type": asset.contentType,
            },
            body,
          }
        );
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 300);
          throw new Error(`HTTP ${response.status} ${detail}`);
        }
      }, `Upload failed for ${asset.key}`);
    },
    { concurrency, startIntervalMs }
  );
}

async function verify() {
  const { assets: manifestAssets } = loadManifest();
  const allAssets = selectAssets(manifestAssets);
  const start = Number.parseInt(
    process.env.ARCHIVE_ASSET_VERIFY_START ?? process.env.ROOF_ARCHIVE_VERIFY_START ?? "0",
    10,
  );
  const limit = Number.parseInt(
    process.env.ARCHIVE_ASSET_VERIFY_LIMIT
      ?? process.env.ROOF_ARCHIVE_VERIFY_LIMIT
      ?? String(allAssets.length),
    10,
  );
  const assets = allAssets.slice(Number.isFinite(start) && start > 0 ? start : 0, start + limit);
  await runPool(
    assets,
    async (asset) => {
      await retry(async () => {
        const response = await fetch(`${publicBaseUrl}/${asset.key}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = Buffer.from(await response.arrayBuffer());
        if (body.length !== asset.bytes) {
          throw new Error(`expected ${asset.bytes} bytes, received ${body.length}`);
        }
        const digest = sha256(body);
        if (digest !== asset.sha256) throw new Error(`expected SHA-256 ${asset.sha256}, received ${digest}`);
        const contentType = response.headers.get("content-type")?.split(";", 1)[0];
        if (contentType !== asset.contentType) {
          throw new Error(`expected Content-Type ${asset.contentType}, received ${contentType ?? "missing"}`);
        }
      }, `Verification failed for ${asset.key}`);
    },
    { concurrency: 16 }
  );
}

async function release() {
  if (!requiresPromotion) {
    throw new Error("release is only available for an asset collection that requires promotion");
  }
  if (keyPrefix) {
    throw new Error("release requires the complete manifest; remove the asset selection prefix");
  }
  await upload();
  await verify();
  const manifest = loadManifest();
  manifest.public = true;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Promoted ${manifest.assets.length} verified assets for public CDN rewriting`);
}

if (command === "build") buildManifest();
else if (command === "upload") await upload();
else if (command === "verify") await verify();
else if (command === "release") await release();
else {
  console.error("Usage: node scripts/manage-roof-assets.mjs <build|upload|verify|release>");
  process.exitCode = 1;
}
