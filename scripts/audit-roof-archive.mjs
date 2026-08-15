import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rawDirectory = path.join(root, ".local-archive", "bilibili-raw", "source-archive", "articles");
const evidenceDirectory = path.join(root, "editorial-sources", "roof-archive");
const publicSourceDirectories = ["source/_posts", "source/_books", "source/_topics"]
  .map((relativePath) => path.join(root, relativePath))
  .filter((directory) => fs.existsSync(directory));

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const pathname = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(pathname));
    else files.push(pathname);
  }
  return files;
}

function relative(pathname) {
  return path.relative(root, pathname).replaceAll(path.sep, "/");
}

const evidenceFiles = walk(evidenceDirectory);
const publicFiles = publicSourceDirectories.flatMap(walk).filter((pathname) => /\.(?:md|json)$/u.test(pathname));
const publicContents = publicFiles.map((pathname) => ({ pathname, text: fs.readFileSync(pathname, "utf8") }));

const articles = fs.readdirSync(rawDirectory)
  .filter((filename) => /^cv\d+\.json$/u.test(filename))
  .map((filename) => {
    const cvId = filename.slice(0, -5);
    const rawPath = path.join(rawDirectory, filename);
    const rawBytes = fs.readFileSync(rawPath);
    const source = JSON.parse(rawBytes.toString("utf8"));
    const cvPattern = new RegExp(`(?:^|/)${cvId}(?:[^0-9]|$)`, "u");
    const snapshotCandidates = evidenceFiles.filter((pathname) => {
      const rel = relative(pathname);
      return pathname.endsWith(".json") && cvPattern.test(`/${rel}`);
    });
    const exactSnapshots = snapshotCandidates.filter((pathname) => fs.readFileSync(pathname).equals(rawBytes));
    const evidenceNotes = evidenceFiles.filter((pathname) => {
      const rel = relative(pathname);
      return cvPattern.test(`/${rel}`) && /(?:editorial-note|evidence)\.md$/u.test(pathname);
    });
    const publicReferences = publicContents
      .filter(({ text }) => new RegExp(`(?:read/|roof-archive/)${cvId}(?:/|\\b)`, "u").test(text))
      .map(({ pathname }) => relative(pathname));
    return {
      cvId,
      publishedAtUnix: source.listingMetadata?.publish_time ?? source.source?.publishedAtUnix ?? 0,
      title: source.listingMetadata?.title ?? source.source?.title ?? source.title ?? "",
      exactSnapshots: exactSnapshots.map(relative),
      nonExactSnapshots: snapshotCandidates.filter((pathname) => !exactSnapshots.includes(pathname)).map(relative),
      evidenceNotes: evidenceNotes.map(relative),
      publicReferences,
    };
  })
  .sort((left, right) => left.publishedAtUnix - right.publishedAtUnix || left.cvId.localeCompare(right.cvId));

const missingExactSnapshot = articles.filter((article) => article.exactSnapshots.length === 0);
const missingEvidence = articles.filter((article) => article.evidenceNotes.length === 0);
const evidenceOnly = articles.filter(
  (article) => article.exactSnapshots.length > 0 && article.evidenceNotes.length > 0 && article.publicReferences.length === 0,
);

const report = {
  archiveArticles: articles.length,
  exactSnapshotCoverage: articles.length - missingExactSnapshot.length,
  evidenceCoverage: articles.length - missingEvidence.length,
  publicReferenceCoverage: articles.filter((article) => article.publicReferences.length > 0).length,
  missingExactSnapshot: missingExactSnapshot.length,
  missingEvidence: missingEvidence.length,
  evidenceOnly: evidenceOnly.map(({ cvId, title, evidenceNotes }) => ({ cvId, title, evidenceNotes })),
};

if (process.argv.includes("--details")) {
  report.missingExactSnapshotDetails = missingExactSnapshot.map(({ cvId, title }) => ({ cvId, title }));
  report.missingEvidenceDetails = missingEvidence.map(({ cvId, title }) => ({ cvId, title }));
}

console.log(JSON.stringify(report, null, 2));
