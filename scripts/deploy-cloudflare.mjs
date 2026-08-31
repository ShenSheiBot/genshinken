import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cloudflareBuildIdentity } from "./cloudflare-build-identity.mjs";

const sourceRoot = process.cwd();
const target = process.argv[2];
const action = process.argv[3];
const actionValue = process.argv.slice(4).find((value) => !value.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
const wranglerAdapter = process.env.ROOF_WRANGLER_BIN?.trim();

const allowedActions = {
  preview: new Set(["build", "upload", "promote"]),
  production: new Set(["build", "deploy"]),
};

if (!allowedActions[target]?.has(action)) {
  console.error("Usage: node scripts/deploy-cloudflare.mjs preview <build|upload|promote VERSION_ID> [--dry-run]");
  console.error("   or: node scripts/deploy-cloudflare.mjs production <build|deploy> [--dry-run]");
  process.exit(1);
}

if (action === "promote" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(actionValue ?? "")) {
  console.error("Preview promotion requires the exact Worker Version ID returned by cf:upload:preview.");
  process.exit(1);
}

const environment = {};
for (const key of ["HOME", "PATH", "TMPDIR", "LANG", "LC_ALL", "NO_COLOR", "CI"]) {
  if (process.env[key]) environment[key] = process.env[key];
}
environment.NEXT_TELEMETRY_DISABLED = "1";
environment.ROOF_TRANSLATION_PREVIEW = target === "preview" ? "1" : "0";
environment.ROOF_BUILD_TIMESTAMP = process.env.ROOF_BUILD_TIMESTAMP || new Date().toISOString();

function run(command, args, cwd, { localBinary = false, capture = false } = {}) {
  const executable = localBinary ? path.join(cwd, "node_modules", ".bin", command) : command;
  const result = spawnSync(executable, args, {
    cwd,
    env: environment,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `\n${result.stderr || result.stdout || ""}` : "";
    throw new Error(`${command} exited with status ${result.status}${detail}`);
  }
  return capture ? result.stdout : undefined;
}

function activateWranglerAdapter(root) {
  if (!wranglerAdapter) return () => {};
  if (!path.isAbsolute(wranglerAdapter)) {
    throw new Error("ROOF_WRANGLER_BIN must be an absolute executable path.");
  }
  fs.accessSync(wranglerAdapter, fs.constants.X_OK);

  const localWrangler = path.join(root, "node_modules", ".bin", "wrangler");
  const current = fs.lstatSync(localWrangler);
  if (!current.isSymbolicLink()) {
    throw new Error(`Cannot attach the Wrangler adapter: ${localWrangler} is not a symlink.`);
  }

  const originalTarget = fs.readlinkSync(localWrangler);
  if (path.resolve(path.dirname(localWrangler), originalTarget) === wranglerAdapter) {
    return () => {};
  }

  fs.unlinkSync(localWrangler);
  fs.symlinkSync(wranglerAdapter, localWrangler);
  return () => {
    fs.rmSync(localWrangler, { force: true });
    fs.symlinkSync(originalTarget, localWrangler);
  };
}

function assertTrackedWorktreeClean() {
  const status = run("git", ["status", "--porcelain", "--untracked-files=no"], sourceRoot, { capture: true });
  if (status.trim()) {
    throw new Error("Refusing to deploy with tracked worktree changes. Commit them before deployment.");
  }
}

function syncFonts(root) {
  run("npm", ["run", "fonts:sync"], root);
}

function prepareCleanBuildRoot() {
  // Keep the staged tree beside the source tree. Next.js output tracing follows
  // the shared node_modules symlink and requires both paths to share a writable root.
  const stageRoot = fs.mkdtempSync(path.join(path.dirname(sourceRoot), `.roof-cloudflare-${target}-`));
  try {
    run("git", ["worktree", "add", "--detach", stageRoot, "HEAD"], sourceRoot);
    // OpenNext resolves symlinks while tracing native modules such as sharp.
    // A copy-on-write clone keeps dependencies inside the staged path without
    // duplicating their physical data on filesystems that support reflinks.
    fs.cpSync(path.join(sourceRoot, "node_modules"), path.join(stageRoot, "node_modules"), {
      recursive: true,
      mode: fs.constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    });
    return stageRoot;
  } catch (error) {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    throw error;
  }
}

function removeCleanBuildRoot(stageRoot) {
  run("git", ["worktree", "remove", "--force", stageRoot], sourceRoot);
  fs.rmSync(stageRoot, { recursive: true, force: true });
}

function pruneR2BackedAssets(buildRoot) {
  const publicAssetRoot = path.join(buildRoot, ".open-next", "assets");
  const assetRoot = path.join(publicAssetRoot, "attachments");
  const prefixes = ["roof-archive", "wechat"];
  for (const prefix of prefixes) {
    fs.rmSync(path.join(assetRoot, prefix), { recursive: true, force: true });
  }
  const leaked = prefixes.filter((prefix) => fs.existsSync(path.join(assetRoot, prefix)));
  if (leaked.length) {
    throw new Error(`R2-backed assets remained in the Worker artifact: ${leaked.join(", ")}`);
  }
  fs.rmSync(path.join(publicAssetRoot, ".DS_Store"), { force: true });
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function normalizeWebpackRuntime(buildRoot) {
  const chunksRoot = path.join(buildRoot, ".open-next", "assets", "_next", "static", "chunks");
  const runtimeFiles = fs.readdirSync(chunksRoot).filter((name) => /^webpack-[0-9a-f]+\.js$/u.test(name));
  if (runtimeFiles.length !== 1) {
    throw new Error(`Expected one webpack runtime chunk, found ${runtimeFiles.length}.`);
  }

  const oldName = runtimeFiles[0];
  const oldPath = path.join(chunksRoot, oldName);
  const source = fs.readFileSync(oldPath, "utf8");
  let normalizedObject = false;
  const normalized = source.replace(/var e=\{((?:\d+:0,?)+)\};r\.f\.j=/u, (match, entries) => {
    const sorted = entries
      .split(",")
      .filter(Boolean)
      .sort((left, right) => Number(left.split(":", 1)[0]) - Number(right.split(":", 1)[0]));
    normalizedObject = true;
    return `var e={${sorted.join(",")}};r.f.j=`;
  });
  if (!normalizedObject) {
    throw new Error("Webpack runtime chunk registry no longer matches the expected Next.js output.");
  }

  const digest = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  const newName = `webpack-${digest}.js`;
  const newPath = path.join(chunksRoot, newName);
  fs.writeFileSync(newPath, normalized);
  if (newPath !== oldPath) fs.rmSync(oldPath);

  if (newName !== oldName) {
    const oldBytes = Buffer.from(oldName);
    for (const file of walkFiles(path.join(buildRoot, ".open-next", "cache"))) {
      const bytes = fs.readFileSync(file);
      if (!bytes.includes(oldBytes)) continue;
      fs.writeFileSync(file, Buffer.from(bytes.toString("utf8").replaceAll(oldName, newName)));
    }
  }
}

function build(buildRoot, { reuseNextCache = false } = {}) {
  if (!reuseNextCache) {
    fs.rmSync(path.join(buildRoot, ".next"), { recursive: true, force: true });
  }
  fs.rmSync(path.join(buildRoot, ".open-next"), { recursive: true, force: true });
  const buildId = cloudflareBuildIdentity(buildRoot, target, environment);
  environment.ROOF_BUILD_ID = buildId;
  console.log(`Building Cloudflare ${target} artifact (ROOF_TRANSLATION_PREVIEW=${environment.ROOF_TRANSLATION_PREVIEW})`);
  run("opennextjs-cloudflare", ["build"], buildRoot, { localBinary: true });
  normalizeWebpackRuntime(buildRoot);
  pruneR2BackedAssets(buildRoot);
}

let buildRoot = sourceRoot;
let staged = false;
let restoreWranglerAdapter = () => {};

try {
  restoreWranglerAdapter = activateWranglerAdapter(sourceRoot);
  if (action === "promote") {
    const promoteArgs = ["versions", "deploy", `${actionValue}@100`, "--env", "preview", "--yes"];
    if (dryRun) promoteArgs.push("--dry-run");
    console.log(`${dryRun ? "Rendering" : "Promoting"} previously inspected preview version ${actionValue}`);
    run("wrangler", promoteArgs, sourceRoot, { localBinary: true });
  } else if (target === "preview") {
    // A candidate preview deliberately includes the current uncommitted working
    // tree. It cannot change a fixed domain, and keeping .next/cache makes
    // feedback iterations materially faster.
    build(sourceRoot, { reuseNextCache: true });
    if (action === "upload") {
      console.log("Uploading an undeployed preview version; fixed domains will remain unchanged");
      run("opennextjs-cloudflare", ["upload", "--env", "preview"], sourceRoot, { localBinary: true });
    }
  } else {
    if (action === "deploy") {
      // Production remains tied to a clean Git commit.
      syncFonts(sourceRoot);
      assertTrackedWorktreeClean();
      buildRoot = prepareCleanBuildRoot();
      staged = true;
    }
    build(buildRoot);
    if (action === "deploy") {
      const deployArgs = ["deploy", "--env", "production"];
      if (dryRun) deployArgs.push("--dry-run");
      const commit = run("git", ["rev-parse", "--short", "HEAD"], buildRoot, { capture: true }).trim();
      console.log(`${dryRun ? "Rendering" : "Deploying"} Cloudflare production target from clean commit ${commit}`);
      run("wrangler", deployArgs, buildRoot, { localBinary: true });
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (staged) {
    try {
      removeCleanBuildRoot(buildRoot);
    } catch (error) {
      console.error(`Failed to remove temporary build worktree ${buildRoot}:`, error);
      process.exitCode = 1;
    }
  }
  try {
    restoreWranglerAdapter();
  } catch (error) {
    console.error("Failed to restore the repository Wrangler executable:", error);
    process.exitCode = 1;
  }
}
