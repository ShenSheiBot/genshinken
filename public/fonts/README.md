# Webfont assets

## Site-corpus ST subsets

The primary self-hosted CJK assets are generated from three source fonts:

| Output | Required source filename | CSS family |
| --- | --- | --- |
| `roof-st-song.woff2` | `STSong.ttf` | `Roof STSong` |
| `roof-st-fangsong.woff2` | `STFangsong.ttf` | `Roof STFangsong` |
| `roof-st-kaiti.woff2` | `STKaiti.ttf` | `Roof STKaiti` |

The original TTF files are not committed. The generator downloads them from a
pinned `latex-chinese-fonts` commit into the ignored
`.local-archive/font-sources` cache and verifies the recorded SHA-256 values;
never regenerate from an unverified font with the same display name.

`scripts/build-cjk-font-subsets.py` scans text under `app/`, `lib/`, `source/`
and `public/llms.txt`, adds the Simplified/Traditional OpenCC closure, intersects
the result with the code points shared by all three source fonts, and writes the
three WOFF2 files plus `cjk-font-manifest.json`.

Normal development, checks, builds, and deployments all run the idempotent
font synchronizer automatically:

```bash
npm ci
npm run fonts:sync
```

If a real rebuild is needed, the generator automatically creates an ignored
repository-private virtual environment under `.local-archive/` and installs
the exact package set pinned in `scripts/requirements-font-subsets.txt`.
Normal development therefore does not depend on, alter, or inherit a global
Conda or system FontTools installation. The requirements digest is part of the
generated-manifest contract, so a toolchain or generator-strategy change makes
the outputs stale just like a source-font or code-point change.

`npm ci` is also required because corpus expansion calls
`scripts/convert-cjk-font-corpus.mjs`, which imports the locked `opencc-js`
dependency.

The Chinese generator writes `app/cjk-fonts.generated.css`; the Japanese
generator writes `app/translation-fonts.generated.css`. Neither generator
edits hand-maintained CSS. Cache keys, WOFF2 files, and manifests are updated
together.

`verify:fonts` checks the corpus inventory, OpenCC closure, output hashes, byte
sizes, cache keys and rare Han fallback contract.

## Japanese translation fonts

`scripts/build-translation-font-subsets.py` scans the complete Japanese
translation tree, localized translation components, and
`source/_translations/language-dispositions.json`. It builds the primary Noto
Serif/Sans JP subsets plus tiny generated SC, Latin, math and music subsets for
code points absent from the JP sources. These are controlled hosted fallbacks,
not a character whitelist: new text is covered automatically when one of the
pinned sources contains it, otherwise generation fails and reports the
unsupported code point.

The primary and fallback source files are downloaded from the pinned
`google/fonts` commit into the ignored `.local-archive/font-sources` cache.
Japanese content and localized bibliographic metadata use the same automatic
sync path:

```bash
npm run fonts:sync
```

The output manifest records the complete input-file inventory and literal
code-point set. Prose-only rewrites refresh the inventory under the shared
font-build lock without rebuilding the font binaries; only a code-point-set,
pinned-source, generator-strategy, or pinned-toolchain change rebuilds them.

## Rare Han fallbacks

`roof-rare-han-serif.woff2` and `roof-rare-han-sans.woff2` are
one-glyph Google Fonts text subsets for `U+4337`, generated from Noto Serif SC
400 and Noto Sans SC 400 respectively.

They are separate from the site-corpus ST subsets because the three ST source
fonts do not contain this code point. CSS `unicode-range` ensures these
approximately 1 KB assets are requested only on pages that use it.

Source CSS:

- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&display=swap&text=%E4%8C%B7`
- `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400&display=swap&text=%E4%8C%B7`

The Noto fonts are distributed under the SIL Open Font License 1.1; see
`OFL-Noto-CJK.txt`.
