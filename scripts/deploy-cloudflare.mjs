import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
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

function run(binary, args) {
  const result = spawnSync(path.join(root, "node_modules", ".bin", binary), args, {
    cwd: root,
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Building Cloudflare ${target} artifact (ROOF_TRANSLATION_PREVIEW=${environment.ROOF_TRANSLATION_PREVIEW})`);
run("opennextjs-cloudflare", ["build"]);

if (!buildOnly) {
  const deployArgs = ["deploy", "--env", target];
  if (dryRun) deployArgs.push("--dry-run");
  console.log(`${dryRun ? "Rendering" : "Deploying"} Cloudflare ${target} target`);
  run("wrangler", deployArgs);
}
