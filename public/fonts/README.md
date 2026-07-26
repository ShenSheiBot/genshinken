# Webfont assets

## Site-corpus ST subsets

The primary self-hosted CJK assets are generated from three source fonts:

| Output | Required source filename | CSS family |
| --- | --- | --- |
| `un-canon-st-song.woff2` | `STSong.ttf` | `UN Canon STSong` |
| `un-canon-st-fangsong.woff2` | `STFangsong.ttf` | `UN Canon STFangsong` |
| `un-canon-st-kaiti.woff2` | `STKaiti.ttf` | `UN Canon STKaiti` |

The original TTF files are not committed. Their expected SHA-256 values are
recorded as `sourceSha256` in `cjk-font-manifest.json`; never regenerate from
an unverified font with the same display name.

`scripts/build-cjk-font-subsets.py` scans text under `app/`, `lib/`, `source/`
and `public/llms.txt`, adds the Simplified/Traditional OpenCC closure, intersects
the result with the code points shared by all three source fonts, and writes the
three WOFF2 files plus `cjk-font-manifest.json`.

The reproducible Python package set is pinned in
`scripts/requirements-font-subsets.txt`. The current build is verified with
Python 3.11.9; install the pinned packages before regenerating:

```bash
npm ci
python -m pip install -r scripts/requirements-font-subsets.txt
python scripts/build-cjk-font-subsets.py --source-dir <verified-source-directory>
```

`npm ci` is required because corpus expansion calls
`scripts/convert-cjk-font-corpus.mjs`, which imports the locked `opencc-js`
dependency.

The source directory must contain the exact three required filenames. On
Windows, the installed STFangsong file may be physically named
`C:\Windows\Fonts\STFANGSO.TTF`; copy it to a temporary source directory as
`STFangsong.ttf` and verify the SHA before running the script.

After generation, update the three `app/globals.css` font URL cache keys to the
first 12 characters of their new manifest SHA-256 values, then run:

```bash
npm run verify:fonts
```

`verify:fonts` checks the corpus inventory, OpenCC closure, output hashes, byte
sizes, cache keys and rare Han fallback contract.

## Rare Han fallbacks

`un-canon-rare-han-serif.woff2` and `un-canon-rare-han-sans.woff2` are
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
