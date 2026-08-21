# Optional language editions

The Chinese files in `source/_posts/` remain the canonical source editions.
Independent translations are optional additions stored by language:

```text
source/_translations/
  en/posts/<english-slug>.md
  en/books/<english-book-slug>/book.json
  en/books/<english-book-slug>/<english-chapter-slug>.md
  ja/posts/<japanese-slug>.md
  ja/books/<japanese-book-slug>/book.json
  ja/books/<japanese-book-slug>/<japanese-chapter-slug>.md
```

Do not create empty Markdown files for untranslated works. The localized route
renders its own non-indexable availability page when the corresponding file is
absent.

When the requested language is the verified language of an externally published
original, record it in `external-originals.json` instead of fabricating a
back-translation. The localized route then becomes a non-indexable source gateway
with verified publication metadata and official reading, publisher, purchase, or
library links. An on-site edition always takes precedence over that gateway.

Each real edition uses YAML front matter with these fields:

- stable `work_id`
- `source_type`: `post` or `book-chapter`
- `source_slug`, or `source_book_slug` plus `source_chapter_id`
- language-specific chapter `slug`; the parent directory's `book.json` owns the target book route and metadata
- `language`: `en` or `ja`
- `status`: `draft`, `review`, or `published`
- `title`, optional source-preserving `subtitle`, and `title_breaks`
- `excerpt`
- structured `credits` with registry-backed `role`, `contributor_id`, and optional `scope` / `note`
- `translation_method`: `agent` or `human`, identifying production responsibility
- `source_relationship`: `direct`, `relay`, or `mixed`, identifying the edition chain
- `base_language`
- `source_revision`: `sha256:<digest>`; required for review and publication
- `source_revision_scope`: `translation-payload` for posts or `chapter-translation-payload` for extracted chapters. Both payloads protect translatable title/subtitle/summary text, source credits, rights and citation provenance, and the complete Markdown body without invalidating editions for unrelated tags or display dates.
- `published` (required only when status is `published`) and `updated`
- `rights`
- `format`: `article`, `interview`, or `qa`

Every translated-book directory contains one `book.json` with `version: 1`,
`source_book_slug`, target-language `slug`, `language`, `title`, optional
source-preserving `subtitle`, and `excerpt`. These book-level values must not be
repeated in chapter front matter.

Only `published` editions enter the sitemap and reciprocal `hreflang` links.
Draft and review files remain invisible in ordinary production builds: their
localized routes render the same availability page as a missing edition. For a
local editorial preview, build and serve with `ROOF_TRANSLATION_PREVIEW=1`.
Run `npm run verify:translations` before publication.
