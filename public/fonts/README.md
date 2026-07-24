# Webfont assets

`un-canon-rare-han-serif.woff2` and `un-canon-rare-han-sans.woff2`
are one-glyph Google Fonts text subsets for `U+4337`, generated from
Noto Serif SC 400 and Noto Sans SC 400 respectively.

They are separate from the site-corpus ST subsets because the three ST
source fonts do not contain this code point. CSS `unicode-range` ensures
these approximately 1 KB assets are requested only on pages that use it.

Source CSS:

- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&display=swap&text=%E4%8C%B7`
- `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400&display=swap&text=%E4%8C%B7`

The Noto fonts are distributed under the SIL Open Font License 1.1; see
`OFL-Noto-CJK.txt`.
