import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  READING_PROGRESS_ENABLED_KEY,
  fingerprintReadingText,
  nativeScrollRestorationHasPriority,
  readReadingProgress,
  readReadingProgressEnabled,
  readingProgressKey,
  remoteReadingProgressSupersedesPending,
  removeAllReadingProgress,
  removeReadingProgress,
  writeReadingProgress,
  writeReadingProgressEnabled,
} from "../app/components/reading-edition/reading-progress.ts";

class MemoryStorage {
  #values = new Map();

  get length() {
    return this.#values.size;
  }

  key(index) {
    return Array.from(this.#values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.#values.get(String(key)) ?? null;
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }

  removeItem(key) {
    this.#values.delete(String(key));
  }
}

function installStorage(storage = new MemoryStorage()) {
  globalThis.window = { localStorage: storage };
  return storage;
}

function recordFor(slug, overrides = {}) {
  return {
    schema: 1,
    resource: `post:${slug}`,
    revision: "0123456789abcdef",
    savedAt: 1_721_800_000_000,
    status: "reading",
    anchor: {
      fingerprint: "aaaaaaaaaaaaaaaa",
      previousFingerprint: null,
      nextFingerprint: "bbbbbbbbbbbbbbbb",
      headingId: "section-one",
      blockIndex: 4,
      blockLineProgress: 0.5,
      sectionProgress: 0.25,
      bodyProgress: 0.4,
      line: 20,
      lineCount: 50,
    },
    furthestProgress: 0.4,
    ...overrides,
  };
}

assert.equal(
  fingerprintReadingText("  A\u200b   Ａ\n", "P"),
  fingerprintReadingText("A A", "p"),
  "fingerprints must normalize Unicode, invisible characters, whitespace, and tag casing"
);
assert.notEqual(
  fingerprintReadingText("same text", "p"),
  fingerprintReadingText("same text", "li"),
  "different semantic tags must not share a fingerprint"
);
assert.match(fingerprintReadingText("正文", "p"), /^[0-9a-f]{16}$/u);
assert.equal(nativeScrollRestorationHasPriority("back_forward"), true);
assert.equal(nativeScrollRestorationHasPriority("reload"), true);
assert.equal(nativeScrollRestorationHasPriority("navigate"), false);
assert.equal(nativeScrollRestorationHasPriority(undefined), false);

const slug = "serial/chapter-one";
let storage = installStorage();
assert.equal(readReadingProgressEnabled(), true, "tracking must be enabled when no preference exists");
assert.equal(writeReadingProgressEnabled(false), true);
assert.equal(storage.getItem(READING_PROGRESS_ENABLED_KEY), "false");
assert.equal(readReadingProgressEnabled(), false);
assert.equal(writeReadingProgressEnabled(true), true);
assert.equal(readReadingProgressEnabled(), true);

const validRecord = recordFor(slug);
assert.equal(
  remoteReadingProgressSupersedesPending(
    recordFor(slug, { savedAt: validRecord.savedAt + 1 }),
    validRecord
  ),
  true,
  "a newer remote record must supersede a pending local write"
);
assert.equal(
  remoteReadingProgressSupersedesPending(validRecord, validRecord),
  true,
  "an equal remote timestamp must deterministically supersede a pending local write"
);
assert.equal(
  remoteReadingProgressSupersedesPending(
    recordFor(slug, { savedAt: validRecord.savedAt - 1 }),
    validRecord
  ),
  false,
  "an older remote record must not discard a newer pending local write"
);
assert.equal(
  remoteReadingProgressSupersedesPending(validRecord, null),
  true,
  "a remote record must be accepted when no local write is pending"
);
assert.equal(writeReadingProgress(slug, validRecord), true);
assert.deepEqual(readReadingProgress(slug), validRecord);
assert.equal(readingProgressKey(slug), "ub_reading:v1:post:serial%2Fchapter-one");

storage.setItem(readingProgressKey(slug), "{not-json");
assert.equal(readReadingProgress(slug), null, "corrupt JSON must be ignored");
storage.setItem(readingProgressKey(slug), JSON.stringify(recordFor(slug, { schema: 2 })));
assert.equal(readReadingProgress(slug), null, "unknown record schemas must be ignored");
storage.setItem(readingProgressKey(slug), JSON.stringify(recordFor(slug, {
  anchor: { ...validRecord.anchor, bodyProgress: 1.5 },
})));
assert.equal(readReadingProgress(slug), null, "out-of-range ratios must be rejected");
storage.setItem(readingProgressKey(slug), JSON.stringify(recordFor("another-post")));
assert.equal(readReadingProgress(slug), null, "a record must match its storage resource");

storage = installStorage();
writeReadingProgress("one", recordFor("one"));
writeReadingProgress("two", recordFor("two"));
storage.setItem("unrelated", "keep-me");
assert.equal(removeReadingProgress("one"), true);
assert.equal(readReadingProgress("one"), null);
assert.equal(removeAllReadingProgress(), 1);
assert.equal(readReadingProgress("two"), null);
assert.equal(storage.getItem("unrelated"), "keep-me", "clear-all must preserve unrelated local data");

installStorage({
  get length() { throw new Error("blocked"); },
  key() { throw new Error("blocked"); },
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
});
assert.equal(readReadingProgressEnabled(), true, "blocked storage must retain the default-enabled behavior");
assert.equal(readReadingProgress(slug), null);
assert.equal(writeReadingProgress(slug, validRecord), false);
assert.equal(writeReadingProgressEnabled(false), false);
assert.equal(removeReadingProgress(slug), false);
assert.equal(removeAllReadingProgress(), null);

const hookSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "components",
    "reading-edition",
    "useReadingProgress.ts"
  ),
  "utf8"
);
assert.match(
  hookSource,
  /if \(!enabled\) \{[\s\S]*?clearSaveTimer\(\);[\s\S]*?latestRecordRef\.current = null;[\s\S]*?userInteractedRef\.current = false;/u,
  "cross-tab disable must discard pending writes and their interaction state"
);
assert.match(
  hookSource,
  /else if \(event\.key === readingProgressKey\(slug\)\)[\s\S]*?if \(!record\) \{[\s\S]*?clearSaveTimer\(\);[\s\S]*?latestRecordRef\.current = null;[\s\S]*?clearBoundary\(\);/u,
  "cross-tab record removal must not be resurrected by a pending local save"
);
assert.match(
  hookSource,
  /else if \(remoteReadingProgressSupersedesPending\(record, latestRecordRef\.current\)\) \{[\s\S]*?clearSaveTimer\(\);[\s\S]*?latestRecordRef\.current = null;[\s\S]*?userInteractedRef\.current = false;/u,
  "a non-empty cross-tab update must cancel an older pending local save"
);
assert.match(
  hookSource,
  /if \(persisted && remoteReadingProgressSupersedesPending\(persisted, record\)\)/u,
  "flush must use the same newer-or-equal arbitration as the storage event"
);
assert.match(
  hookSource,
  /Math\.max\(Date\.now\(\), \(previousRecord\?\.savedAt \?\? 0\) \+ 1\)/u,
  "same-tab records must receive monotonically increasing timestamps"
);

const chromeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "components",
    "reading-edition",
    "ReadingEditionChrome.tsx"
  ),
  "utf8"
);
const progressSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "components",
    "reading-edition",
    "reading-progress.ts"
  ),
  "utf8"
);
assert.match(
  progressSource,
  /document\.documentElement\.clientHeight \|\| window\.innerHeight/u,
  "the shared reading anchor must use the stable layout viewport"
);
assert.match(
  chromeSource,
  /readingViewportAnchor as visualAnchor/u,
  "the Chinese reader must consume the shared reading anchor"
);
const translationReferencesSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "components",
    "translation",
    "TranslationReferences.tsx"
  ),
  "utf8"
);
assert.match(
  translationReferencesSource,
  /scrollElementToReadingAnchor/u,
  "translated endnotes must consume the shared reading anchor"
);
assert.doesNotMatch(
  chromeSource,
  /visualViewport\?\.addEventListener\("(?:resize|scroll)", schedule\)/u,
  "Android browser-chrome animation must not drive reader-header state"
);

const chromeStyles = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "components",
    "reading-edition",
    "reading-edition.module.css"
  ),
  "utf8"
);
assert.match(
  chromeStyles,
  /\.runningHeader\s*\{[\s\S]*?transform:\s*translateZ\(0\);[\s\S]*?backface-visibility:\s*hidden;/u,
  "the fixed reading header must remain on a stable compositor layer"
);

delete globalThis.window;
console.log("reading progress verification passed");
