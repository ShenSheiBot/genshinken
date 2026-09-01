# Webfont assets

## Chinese reading fonts

The Chinese site self-hosts three open-licensed, corpus-subsetted roles:

| Output | Required source filename | CSS family |
| --- | --- | --- |
| `roof-noto-serif-sc.woff2` | `NotoSerifSC.ttf` | `Roof Noto Serif SC` |
| `roof-noto-sans-sc.woff2` | `NotoSansSC.ttf` | `Roof Noto Sans SC` |
| `roof-wenkai.woff2` | `LXGWWenKaiGB-Regular.ttf` | `Roof WenKai` |

The original TTF files are not committed. The generator downloads them from a
pinned Google Fonts or LXGW WenKai GB commit into the ignored
`.local-archive/font-sources` cache and verifies the recorded SHA-256 values;
never regenerate from an unverified font with the same display name.

`scripts/build-cjk-font-subsets.py` scans text under `app/`, `lib/`, `source/`
and `public/llms.txt`, adds the Simplified/Traditional OpenCC closure, intersects
the result with each source font's coverage, and writes the three WOFF2 files
plus `cjk-font-manifest.json`. Noto Serif/Sans SC form the reader's paired body
faces. `Roof WenKai` is the renamed, subsetted LXGW WenKai GB face used for
Chinese emphasis, epigraphs, signatures, quotations, and editorial notes. Its
italic CSS face deliberately reuses upright WenKai glyphs, so Chinese emphasis
does not acquire a synthetic slant while Latin fallbacks remain truly italic.

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

`verify:fonts` checks the corpus inventory, OpenCC closure, source pins, output
hashes, byte sizes, cache keys, reader-mode separation, and emphasis contract.

The Noto fonts and LXGW WenKai GB are distributed under the SIL Open Font
License 1.1. See `OFL-Noto-CJK.txt` and `OFL-LXGW-WenKai.txt`. The webfont name
`Roof WenKai` intentionally avoids LXGW WenKai GB's reserved font names.

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
