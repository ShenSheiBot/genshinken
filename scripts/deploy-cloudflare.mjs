import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sourceRoot = process.cwd();
const target = process.argv[2];
const buildOnly = process.argv.includes("--build-only");
const dryRun = process.argv.includes("--dry-run");

if (!new Set(["preview", "production"]).has(target)) {
  console.error("Usage: node scripts/deploy-cloudflare.mjs <preview|production> [--build-only|--dry-run]");
  process.exit(1);
}

const environment = {};
for (const key of ["HOME", "PATH", "TMPDIR", "LANG", "LC_ALL", "NO_COLOR", "CI"]) {
  if (process.env[key]) environment[key] = process.env[key];
}
environment.NEXT_TELEMETRY_DISABLED = "1";
environment.ROOF_TRANSLATION_PREVIEW = target === "preview" ? "1" : "0";

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
  const assetRoot = path.join(buildRoot, ".open-next", "assets", "attachments");
  const prefixes = ["roof-archive", "wechat"];
  for (const prefix of prefixes) {
    fs.rmSync(path.join(assetRoot, prefix), { recursive: true, force: true });
  }
  const leaked = prefixes.filter((prefix) => fs.existsSync(path.join(assetRoot, prefix)));
  if (leaked.length) {
    throw new Error(`R2-backed assets remained in the Worker artifact: ${leaked.join(", ")}`);
  }
}

function build(buildRoot) {
  fs.rmSync(path.join(buildRoot, ".next"), { recursive: true, force: true });
  fs.rmSync(path.join(buildRoot, ".open-next"), { recursive: true, force: true });
  console.log(`Building Cloudflare ${target} artifact (ROOF_TRANSLATION_PREVIEW=${environment.ROOF_TRANSLATION_PREVIEW})`);
  run("opennextjs-cloudflare", ["build"], buildRoot, { localBinary: true });
  pruneR2BackedAssets(buildRoot);
}

let buildRoot = sourceRoot;
let staged = false;

try {
  if (!buildOnly) {
    // Reconcile deterministic font assets before enforcing the clean-commit
    // deployment boundary. Normal check/build commands do the same, so this is
    // a no-op unless an editor skipped them after changing the Japanese corpus.
    syncFonts(sourceRoot);
    assertTrackedWorktreeClean();
    buildRoot = prepareCleanBuildRoot();
    staged = true;
  }

  build(buildRoot);

  if (!buildOnly) {
    const deployArgs = ["deploy", "--env", target];
    if (dryRun) deployArgs.push("--dry-run");
    const commit = run("git", ["rev-parse", "--short", "HEAD"], buildRoot, { capture: true }).trim();
    console.log(`${dryRun ? "Rendering" : "Deploying"} Cloudflare ${target} target from clean commit ${commit}`);
    run("wrangler", deployArgs, buildRoot, { localBinary: true });
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
}
