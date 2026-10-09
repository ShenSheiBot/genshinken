# Translated title layout

English and Japanese titles need both editorial review and rendered verification.
A valid `title_breaks` array proves neither readability nor that its lines fit.
Keep title wording unchanged. Use semantic breaks where they improve the title;
leave natural wrapping when an imposed break would divide a name, phrase, or
punctuation-linked clause awkwardly. Explicit lines may wrap on smaller screens. Translated book landing titles use
the same optional `title_breaks` array in their existing `book.json`; the segments
must reconstruct the unchanged book title.

## Rendered check

Build and serve the candidate with the same translation visibility settings used
for publication. Set `PLAYWRIGHT_BASE_URL` to that server, then run:

```sh
npm run verify:translation-title-layout
```

The command checks every visible translated article, chapter, and book landing
page at phone, tablet, and desktop widths after its fonts load. It fails for
missing or mismatched titles, failed navigation, or text extending beyond its
heading or viewport. Marked hanging punctuation may use its actual optical
margin outside the heading, but never outside the viewport. Match the source checkout to the served build; do not test
new source metadata against an older server and call that acceptance.

`TITLE_LAYOUT_REPORT` selects the JSON output path. The report includes actual
rendered lines so reviewers can inspect awkward breaks separately from geometry.
`TITLE_LAYOUT_SCREENSHOTS` optionally captures each heading at each width.
`TITLE_LAYOUT_PATH` restricts debugging to one exact route; such a run is not
full publication acceptance. The command reports selected and total route counts.

For preview coverage, enable `ROOF_TRANSLATION_PREVIEW=1` both when building and
when running the check. For public-only coverage, use the production visibility
settings on both sides. Do not change publication status to satisfy a layout test.

This check does not grade prose or semantic line breaks. Inspect the rendered
lines and headings as editorial work, especially long subtitles, quoted works,
proper names, and very short final lines. A zero-overflow report alone does not
mean that title editing is complete.
