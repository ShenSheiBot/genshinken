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

`language-dispositions.json` records deliberate outcomes for a source/language
pair that has no on-site edition:

- `external-original`: the requested language is the verified language of an
  externally published original, but the current rights decision does not publish
  an on-site copy. The localized route becomes a non-indexable source gateway with verified
  publication metadata and official reading, publisher, purchase, or library
  links.
- `not-available`: the Roof publication is already a Chinese translation between
  English and Japanese, so the site deliberately does not make a third-language
  retranslation into the other language. The localized route explains that
  editorial decision and keeps the Chinese edition reachable.

Do not register a disposition merely because a draft is unfinished. Missing,
draft, review, reviewed, and published remain edition-lifecycle facts; dispositions are
publication decisions. A source/language pair cannot have both an edition file
and a disposition.

Each real edition uses YAML front matter with these fields:

- stable `work_id`
- `source_type`: `post` or `book-chapter`
- `source_slug`, or `source_book_slug` plus `source_chapter_id`
- language-specific chapter `slug`; the parent directory's `book.json` owns the target book route and metadata
- `language`: `en` or `ja`
- `status`: `draft`, `review`, `reviewed`, or `published`
- `title`, optional source-preserving `subtitle`, and `title_breaks`
- `excerpt`
- structured `credits` with registry-backed `role`, `contributor_id`, and optional `scope` / `note`
- `translation_method`: `agent` or `human`, identifying production responsibility
- `source_relationship`: `direct`, `relay`, or `mixed`, identifying the edition chain
- `base_language`
- `published` (required only when status is `published`) and `updated`
- `rights`
- `format`: `article`, `interview`, or `qa`

`translation_method: original` is reserved for a source-language edition that
Roof already published and is republishing on its own localized route. Such an
edition preserves the archived text verbatim and may use an empty `credits`
array; it must not invent a translator. `agent` and `human` editions still
require a translator credit.

Every translated-book directory contains one `book.json` with `version: 1`,
`source_book_slug`, target-language `slug`, `language`, `title`, optional
source-preserving `subtitle`, and `excerpt`. These book-level values must not be
repeated in chapter front matter.

Only `published` editions enter the sitemap and reciprocal `hreflang` links.
Draft, review, and reviewed files remain invisible in ordinary production builds: their
localized routes render the same availability page as a missing edition. For a
local editorial preview, build and serve with `ROOF_TRANSLATION_PREVIEW=1`.
Run `npm run verify:translations` before publication.
