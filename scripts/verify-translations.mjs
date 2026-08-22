import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseYamlFrontMatter } from "../lib/safe-front-matter.mjs";
import {
  publicationDecisionValue,
  translationLifecycleValues,
} from "../lib/translation-contract.mjs";
import { CONTRIBUTORS } from "../lib/contributors.ts";
import {
  readBookChapterTranslationSource,
  readPostTranslationSource,
} from "../lib/translation-source.mjs";
import {
  assertChapterUsesTranslationBookManifest,
  readTranslationBookManifest,
} from "../lib/translation-book-manifest.mjs";
import { readLanguageDispositions } from "../lib/translation-language-dispositions.mjs";

const root = process.cwd();
const translationsRoot = path.join(root, "source", "_translations");
const dossierRoot = path.join(root, "editorial-sources", "translations");
const auditScript = path.join(
  root,
  "scripts",
  "audit-translation-structure.py"
);
const locales = new Set(["en", "ja"]);
const statuses = new Set(["draft", "review", "published"]);
const methods = new Set(["agent", "human"]);
const sourceRelationships = new Set(["direct", "relay", "mixed"]);
const roles = new Set(["translator", "reviewer", "proofreader", "editor"]);
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const readerFacingRelayNotices = [
  /(?:屋頂の)?中国語版(?:に基づく|からの)重訳/u,
  /(?:日本語|英語|原文).{0,24}逐字(?:引用|復元)/u,
  /\b(?:based on|translated from|relay(?:ed)? from) (?:the )?(?:Roof )?Chinese (?:edition|version)\b/iu,
];
const languageDispositions = readLanguageDispositions(translationsRoot);

function requiredText(data, field, source) {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${source}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredStableId(data, field, source) {
  const value = requiredText(data, field, source);
  if (!stableId.test(value)) throw new Error(`${source}: ${field} must be a stable lowercase ASCII id`);
  return value;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.name.endsWith(".md") ? [target] : [];
  }).sort();
}

function sourceFor(data, file) {
  const type = requiredText(data, "source_type", file);
  if (type === "post") {
    const slug = requiredStableId(data, "source_slug", file);
    return { type, slug, ...readPostTranslationSource(slug) };
  }
  if (type === "book-chapter") {
    const bookSlug = requiredStableId(data, "source_book_slug", file);
    const chapterId = requiredStableId(data, "source_chapter_id", file);
    return { type, bookSlug, chapterId, ...readBookChapterTranslationSource(bookSlug, chapterId) };
  }
  throw new Error(`${file}: source_type must be post / book-chapter`);
}

function editionRoute(data, locale, source, file, bookManifest) {
  const slug = requiredStableId(data, "slug", file);
  if (path.basename(file, ".md") !== slug) throw new Error(`${file}: slug must match its filename`);
  if (source.type === "post") return `/${locale}/posts/${slug}`;
  if (!bookManifest) throw new Error(`${file}: translated book manifest was not loaded`);
  if (source.manifest?.subtitle && !bookManifest.subtitle) {
    throw new Error(`${bookManifest.source}: subtitle is required because the source book has a subtitle`);
  }
  return `/${locale}/books/${bookManifest.slug}/chapters/${slug}`;
}

function verifyCredits(value, file) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${file}: credits must be a non-empty array`);
  let translator = false;
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${file}: credits[${index}] must be an object`);
    }
    const role = requiredText(entry, "role", `${file}: credits[${index}]`);
    if (!roles.has(role)) throw new Error(`${file}: invalid translation credit role ${role}`);
    const contributorId = requiredStableId(entry, "contributor_id", `${file}: credits[${index}]`);
    if (!CONTRIBUTORS.some((contributor) => contributor.id === contributorId)) {
      throw new Error(`${file}: credits[${index}] references unregistered contributor ${contributorId}`);
    }
    if (role === "translator") translator = true;
  });
  if (!translator) throw new Error(`${file}: credits must include a translator`);
}

function verifyNoReaderFacingRelayNotices(content, file) {
  const match = readerFacingRelayNotices.find((pattern) => pattern.test(content));
  if (match) {
    throw new Error(
      `${file}: reader-facing relay/source-recovery notice is forbidden; ` +
      "keep provenance in metadata and use verified quotation or attributed indirect discourse"
    );
  }
}

function verifyDossier(edition) {
  const dossierFile = path.join(dossierRoot, `${edition.workId}-translation-dossier.md`);
  if (!fs.existsSync(dossierFile)) throw new Error(`${edition.file}: missing translation dossier ${dossierFile}`);
  const dossier = parseYamlFrontMatter(fs.readFileSync(dossierFile, "utf8"));
  if (requiredText(dossier.data, "work_id", dossierFile) !== edition.workId) {
    throw new Error(`${dossierFile}: work_id differs from target edition`);
  }
  if (dossier.data.translation_group && dossier.data.translation_group !== edition.workId) {
    throw new Error(`${dossierFile}: translation_group must match runtime work_id`);
  }
  const targets = dossier.data.targets;
  if (!Array.isArray(targets)) throw new Error(`${dossierFile}: targets must be an array`);
  const relativeTarget = path.relative(root, edition.file).split(path.sep).join("/");
  const target = targets.find((entry) => entry?.language === edition.locale);
  if (!target || target.path !== relativeTarget || target.route !== edition.route || target.status !== edition.status) {
    throw new Error(`${dossierFile}: ${edition.locale} target must match path, route, and status`);
  }
  const sources = dossier.data.sources;
  if (!Array.isArray(sources) || !sources.some((entry) => entry?.revision === edition.revision)) {
    throw new Error(`${dossierFile}: sources must record the target source_revision`);
  }
  const reviews = dossier.data.reviews;
  for (const field of ["fidelity", "fluency", "whole_work", "rendered"]) {
    if (!reviews || typeof reviews !== "object" || typeof reviews[field] !== "string" || !reviews[field].trim()) {
      throw new Error(`${dossierFile}: reviews.${field} must record review evidence`);
    }
    if (edition.status === "published" && /\b(?:pending|awaiting|not completed)\b|(?:待|未)(?:完成|审|驗|验)/iu.test(reviews[field])) {
      throw new Error(`${dossierFile}: published editions cannot retain pending reviews.${field}`);
    }
  }
  publicationDecisionValue(dossier.data.publication, edition.status, dossierFile);
}

function auditStructure(source, edition, tempDirectory) {
  const manifestPath = path.join(
    dossierRoot,
    `${edition.workId}-${edition.locale}-audit.json`
  );
  const sourcePath = source.type === "post"
    ? source.file
    : path.join(tempDirectory, `${edition.workId}-${edition.locale}-source.md`);
  if (source.type === "book-chapter") fs.writeFileSync(sourcePath, `${source.markdown}\n`);
  const auditArguments = fs.existsSync(manifestPath)
    ? [auditScript, "--manifest", manifestPath, "--json"]
    : [
        auditScript,
        sourcePath,
        edition.file,
        "--target-language",
        edition.locale,
        "--json",
      ];
  const result = spawnSync("python3", auditArguments, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.status !== 0) {
    throw new Error(`${edition.file}: protected-structure audit failed\n${result.stdout}${result.stderr}`);
  }
  const report = JSON.parse(result.stdout);
  if (report.failures?.length) {
    throw new Error(`${edition.file}: protected-structure audit reported failures\n${result.stdout}`);
  }
  return report.warnings ?? [];
}

const editions = [];
for (const file of [...locales].flatMap((locale) => walk(path.join(translationsRoot, locale)))) {
  const relative = path.relative(translationsRoot, file).split(path.sep);
  const locale = relative[0];
  if (!locales.has(locale)) throw new Error(`${file}: first directory must be en / ja`);
  const parsed = parseYamlFrontMatter(fs.readFileSync(file, "utf8"));
  const data = parsed.data;
  verifyNoReaderFacingRelayNotices(parsed.content, file);
  const status = requiredText(data, "status", file);
  if (!statuses.has(status)) throw new Error(`${file}: invalid status ${status}`);
  const method = requiredText(data, "translation_method", file);
  if (!methods.has(method)) throw new Error(`${file}: invalid translation_method ${method}`);
  const sourceRelationship = requiredText(data, "source_relationship", file);
  if (!sourceRelationships.has(sourceRelationship)) {
    throw new Error(`${file}: invalid source_relationship ${sourceRelationship}`);
  }
  if (requiredText(data, "language", file) !== locale) throw new Error(`${file}: language must match locale directory`);
  const source = sourceFor(data, file);
  if (source.type === "book-chapter") assertChapterUsesTranslationBookManifest(data, file);
  const bookManifest = source.type === "book-chapter"
    ? readTranslationBookManifest(path.dirname(file), { locale, sourceBookSlug: source.bookSlug })
    : null;
  const lifecycle = translationLifecycleValues(data, status, file);
  const revision = lifecycle.sourceRevision;
  const scope = requiredText(data, "source_revision_scope", file);
  if (scope !== source.revisionScope) throw new Error(`${file}: source_revision_scope must be ${source.revisionScope}`);
  if (status !== "draft" && revision !== source.revision) {
    throw new Error(`${file}: source_revision is stale; expected ${source.revision}`);
  }
  requiredText(data, "title", file);
  if (source.type === "post" && source.metadata?.subtitle) requiredText(data, "subtitle", file);
  requiredText(data, "excerpt", file);
  requiredText(data, "base_language", file);
  verifyCredits(data.credits, file);
  if (status === "published" && !data.credits.some((credit) => credit?.role === "reviewer")) {
    throw new Error(`${file}: published editions require a reviewer credit`);
  }
  const workId = requiredStableId(data, "work_id", file);
  editions.push({
    file,
    locale,
    status,
    workId,
    route: editionRoute(data, locale, source, file, bookManifest),
    revision,
    source,
    bookManifest,
  });
}

const editionKeys = new Set();
const routeKeys = new Set();
const workSources = new Map();
const sourceWorks = new Map();
const translatedBooks = new Map();
const translatedBookRoutes = new Map();
for (const edition of editions) {
  const editionKey = `${edition.locale}:${edition.workId}`;
  if (editionKeys.has(editionKey)) throw new Error(`duplicate translation edition ${editionKey}`);
  editionKeys.add(editionKey);
  const routeKey = `${edition.locale}:${edition.route}`;
  if (routeKeys.has(routeKey)) throw new Error(`duplicate translation route ${routeKey}`);
  routeKeys.add(routeKey);
  const sourceIdentity = edition.source.type === "post"
    ? `post:${edition.source.slug}`
    : `book:${edition.source.bookSlug}:${edition.source.chapterId}`;
  if (workSources.has(edition.workId) && workSources.get(edition.workId) !== sourceIdentity) {
    throw new Error(`translation work ${edition.workId} maps to multiple sources`);
  }
  workSources.set(edition.workId, sourceIdentity);
  if (sourceWorks.has(sourceIdentity) && sourceWorks.get(sourceIdentity) !== edition.workId) {
    throw new Error(`translation source ${sourceIdentity} maps to multiple works`);
  }
  sourceWorks.set(sourceIdentity, edition.workId);
  if (edition.source.type === "book-chapter") {
    const manifest = edition.bookManifest;
    if (!manifest) throw new Error(`${edition.file}: translated book manifest was not loaded`);
    const sourceBookKey = `${edition.locale}:${edition.source.bookSlug}`;
    const bookIdentity = JSON.stringify({
      slug: manifest.slug,
      title: manifest.title,
      subtitle: manifest.subtitle,
      excerpt: manifest.excerpt,
    });
    if (translatedBooks.has(sourceBookKey) && translatedBooks.get(sourceBookKey) !== bookIdentity) {
      throw new Error(`translated book ${sourceBookKey} has inconsistent route or metadata`);
    }
    translatedBooks.set(sourceBookKey, bookIdentity);
    const targetBookKey = `${edition.locale}:${manifest.slug}`;
    if (translatedBookRoutes.has(targetBookKey) && translatedBookRoutes.get(targetBookKey) !== edition.source.bookSlug) {
      throw new Error(`translated book route ${targetBookKey} maps to multiple source books`);
    }
    translatedBookRoutes.set(targetBookKey, edition.source.bookSlug);
  }
  verifyDossier(edition);
}

for (const disposition of languageDispositions) {
  const source = disposition.sourceRef.type === "post"
    ? { type: "post", slug: disposition.sourceRef.slug, ...readPostTranslationSource(disposition.sourceRef.slug) }
    : {
        type: "book-chapter",
        bookSlug: disposition.sourceRef.bookSlug,
        chapterId: disposition.sourceRef.chapterId,
        ...readBookChapterTranslationSource(disposition.sourceRef.bookSlug, disposition.sourceRef.chapterId),
      };
  const sourceIdentity = source.type === "post"
    ? `post:${source.slug}`
    : `book:${source.bookSlug}:${source.chapterId}`;
  if (sourceIdentity !== disposition.sourceKey) {
    throw new Error(`${disposition.source}: source identity does not resolve to ${disposition.sourceKey}`);
  }
  if (editions.some((edition) => {
    const editionSource = edition.source.type === "post"
      ? `post:${edition.source.slug}`
      : `book:${edition.source.bookSlug}:${edition.source.chapterId}`;
    return edition.locale === disposition.locale && editionSource === disposition.sourceKey;
  })) {
    throw new Error(`${disposition.source}: an on-site edition conflicts with the ${disposition.state} disposition`);
  }
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "roof-translation-audit-"));
const warnings = [];
try {
  for (const edition of editions) {
    for (const warning of auditStructure(edition.source, edition, temporary)) {
      warnings.push(`${path.relative(root, edition.file)}: ${JSON.stringify(warning)}`);
    }
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

warnings.forEach((warning) => console.warn(`Translation structure review: ${warning}`));
console.log(`Translation contract passed: ${editions.length} editions; ${languageDispositions.length} language dispositions; ${warnings.length} inspected structure warnings.`);
