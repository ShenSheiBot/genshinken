---
work_id: disaster-apocalypse-video-series
translation_group: disaster-apocalypse-video-series
publication:
  decision: local-preview
targets:
  - language: en
    path: source/_translations/en/posts/understanding-disaster-video-series.md
    route: /en/posts/understanding-disaster-video-series
    status: review
  - language: ja
    path: source/_translations/ja/posts/understanding-disaster-video-series.md
    route: /ja/posts/understanding-disaster-video-series
    status: review
sources:
  - id: roof-zh
    language: zh-Hans
    path: source/_posts/disaster-apocalypse-video-series.md
    revision: sha256:dccbb058e0efc78e4661df7b019b231cec44c1efbc98a28799020f0f4bc5ff51
    file_sha256: sha256:0247bdd133738934240dc958aa6620dedc6baed2bf2da6b2729084be9b096657
    title: 灾难启示录||合集
    author: pause and select
    roof_translator: 群青七号楼
    coverage: "Complete Roof post: one evaluative paragraph, three credit/thanks paragraphs, one contributor-name line, and a four-item linked video directory. No video transcript is reproduced."
    rights_evidence: No per-post licence is printed in front matter; repository delivery standards state the site default as CC BY-NC-SA 4.0 unless a distinct licence is present.
    publication_decision: Owner requested this batch to be committed as review editions; no publish/push/deploy authorization was given.
  - id: pause-select-youtube
    language: en
    url: https://www.youtube.com/@PauseandSelect
    accessed: 2026-08-19
    author: Pause and Select
    coverage: Official metadata for the four source videos; only exact video titles and work identity are used as translation bases, not transcripts.
segments:
  - id: roof-editorial-prose
    role: roof-original-body
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:dccbb058e0efc78e4661df7b019b231cec44c1efbc98a28799020f0f4bc5ff51
    source_locator: Markdown body lines 21-29, from “总的来说” through the contributor-name line.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Target body from the opening paragraph through the contributor-name line.
  - id: roof-video-directory-shell
    role: editor-note
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:dccbb058e0efc78e4661df7b019b231cec44c1efbc98a28799020f0f4bc5ff51
    source_locator: Markdown body lines 31-34.
    roof_presence: complete
    coverage: Item order, Bilibili URLs, and displayed durations.
    relationship: compilation
    target_anchor: Four-item ordered list.
  - id: original-video-titles
    role: quotation
    source_language: en
    base_edition: pause-select-youtube
    source_revision: URL-and-metadata verification recorded below
    source_locator: Four official YouTube video metadata records.
    roof_presence: translated titles only
    coverage: Exact English source titles; no transcript content.
    relationship: direct
    target_anchor: Link text of the four ordered-list items; English restores the official titles, Japanese translates from those titles while restoring established Japanese work names.
assets: []
reviews:
  fidelity: self-review completed; see evidence below
  fluency: self-review completed; see evidence below
  whole_work: self-review completed; see evidence below
  rendered: translator-side local preview completed; see rendered acceptance evidence below
---

## Source classification and verification dossier

Classification: mixed compilation. The public Markdown is not a Chinese transcript of the four videos. Its prose, acknowledgements, contributor list, Bilibili links, ordering, and displayed translated-video durations are Roof Chinese editorial apparatus and therefore route directly from the Chinese canonical. The four link titles identify translated versions of an English-language video series; English therefore restores the verified official source titles rather than back-translating the Chinese titles. Japanese routes those four title strings from the verified English metadata. No source-video transcript is used because none is reproduced by the Roof article.

Access date for all web checks: 2026-08-19.

| Query / check | Candidate URL | Candidate version and anchors | Match / exclusion reason |
| --- | --- | --- | --- |
| `site:youtube.com pause and select death note apocalypse` | https://www.youtube.com/watch?v=kvvUiXc6m7U | Official title: `Understanding Disaster, Part 1: Death Note and the Cyclical Apocalypse`; channel `Pause and Select`; duration `PT9M17S`; published `2016-05-23T20:59:20-07:00` | Matches Roof Part 1 topic and displayed 09:17 duration; official channel metadata, so title is accepted. |
| `Understanding Disaster Part 1 Death Note Pause and Select` | https://www.youtube.com/watch?v=kvvUiXc6m7U | Same official Part 1 record; oEmbed author URL resolves to `https://www.youtube.com/@PauseandSelect` | Confirms the exact title after broader search surfaced the series. |
| `Understanding Disaster Pause and Select` | https://www.youtube.com/watch?v=L5XeDQ6sb2g | Official title: `Understanding Disaster, Part 2: Akira and the Postmodern Apocalypse`; channel `Pause and Select`; duration `PT17M26S`; published `2016-06-07T07:37:08-07:00` | Topic and series position match Roof Part 2. Roof Bilibili translation displays 17:32, six seconds longer; retain Roof duration because it describes the linked translated upload. |
| `Understanding Disaster Pause and Select` | https://www.youtube.com/watch?v=dCKZQphDyLY | Official title: `Understanding Disaster, Part 3: Evangelion and the World Apocalypse`; channel `Pause and Select`; duration `PT25M13S`; published `2016-08-08T19:43:14-07:00` | Topic and series position match Roof Part 3. Roof Bilibili translation displays 25:16, three seconds longer; retain Roof duration for the linked translated upload. |
| `Understanding Disaster Pause and Select` | https://www.youtube.com/watch?v=npLVlJTH_mk | Official title: `Understanding Disaster, Part 4: Yokohama Kaidashi Kikou and the Harmonious Apocalypse`; channel `Pause and Select`; duration `PT19M53S`; published `2016-12-18T15:07:28-08:00` | Topic, series position, and 19:53 duration match Roof Part 4; official channel metadata, so title is accepted. |
| Roof Chinese canonical | source/_posts/disaster-apocalypse-video-series.md | Opening anchor: `总的来说，虽然也有偏差和憨憨的地方`; closing anchor: `灾难启示录Part 4：横滨购物纪行` + Bilibili URL + `（19:53）` | Complete repository canonical defines the public article boundary. |
| Search-result snippets / title-only mirrors | not retained as bases | Discovery-only results | Excluded because snippets and mirrors do not establish author, edition, or exact work identity. |

The official-video checks intentionally verify metadata rather than transcript openings/closings: the Roof article contains no transcript passage to align. The usable original-language coverage is exactly the four title strings. For the public article itself, the first and last Roof anchors above establish complete coverage.

## Discourse map

- Objective: recommend the four-part series as a comparatively strong entry point into Japanese animation criticism and otaku-culture research while acknowledging imperfections.
- Sequence: overall evaluation; thanks to the original creator and translation permission; thanks to the volunteer translation community; contributor acknowledgement; four-part viewing directory.
- Major turn: argumentative evaluation gives way to community credit and then to an operational list of links.
- Recurring wording: series, translation, criticism/research, thanks.
- Ending function: no argumentative conclusion; the directory is the practical endpoint.

## Voice card

- Genre and register: short community/editorial introduction with an evaluative, colloquial opening and straightforward acknowledgements.
- Sentence rhythm: one long, accumulative opening sentence followed by short credit paragraphs.
- First-person / reader address: collective editorial judgment is implied by `目前已知`; no explicit first person.
- Technical density: low to moderate; three adjacent fields of criticism/research are intentionally piled up.
- Humor / roughness: `憨憨` is deliberately casual; the target versions retain mild comic roughness rather than elevating it into formal criticism.
- Target treatment: English stays compact and editorial; Japanese uses plain contemporary prose rather than forcing a uniformly formal academic register.

## Glossary

| source | zh | en | ja | status | scope | evidence and notes |
| --- | --- | --- | --- | --- | --- | --- |
| 灾难启示录 | 灾难启示录 | Understanding Disaster | 災害を理解する | accepted | series | English restored from official Pause and Select video titles; Japanese translates the verified series title. |
| 御宅文化研究 | 御宅文化研究 | otaku culture studies | オタク文化研究 | accepted | work | Kept distinct from the adjacent `宅文化批评`. |
| 宅文化批评 | 宅文化批评 | otaku culture criticism | オタク文化批評 | accepted | work | Preserves the source's deliberate three-part field list. |
| 群青七号楼 | 群青七号楼 | Building 7 Ultramarine (群青七号楼) | 群青七号楼 | accepted | organization | No independently verified official English/Japanese self-name was found or needed; English supplies a transparent rendering plus the source name, Japanese preserves the name. |
| 打轴 | 打轴 | timing | タイミング調整 | accepted | subtitle workflow | Refers to subtitle timing, not generic scheduling. |

## Serial memory

- The article is a one-page collection index for a four-video series; no continuing book memory is required.
- The four verified official English titles are accepted only for this series and should be reused if these exact videos recur.

## Self-review evidence

### English fidelity pass

- Checked all five prose/credit blocks and all four list items against the Roof canonical. No paragraph, name, link, duration, responsibility role, or list item was omitted or reordered.
- High-risk fact: the displayed Bilibili durations remain `09:17 / 17:32 / 25:16 / 19:53` even though the official source videos are `09:17 / 17:26 / 25:13 / 19:53`. No change was made because the Roof list links to translated Bilibili uploads, so its displayed durations belong to those linked versions.
- High-risk source routing: the four English link titles are exact official YouTube titles, not reverse translations from Chinese.

### English source-free fluency pass

- Rechecked the opening against `偏差和憨憨的地方`: `some inaccuracies and a few goofy moments` was revised to `some missteps and goofy moments`, avoiding an unnecessarily strong factual-error claim while keeping the deliberately casual roughness.
- Rechecked the three evaluation criteria: `historical span of what it introduces` was revised to `historical range it covers`, and `breadth of ideas in its interpretation and narration` to `breadth of thought in its interpretation and exposition`; the sentence remains cumulative rather than splitting the source's single judgement into stronger independent claims.
- The four Bilibili duration strings now have normal English spacing after the link while retaining the exact Roof values.
- Contributor line before used Chinese commas and full-width sentence punctuation in otherwise English prose; after it uses English commas and a period while preserving every contributor string exactly.
- Video durations before used Chinese full-width parentheses; after they use English parentheses, with all numbers unchanged.

### Japanese fidelity pass

- Checked all five prose/credit blocks and four list items against the Roof canonical. `PART 2`, nearly six months, all contributor strings, all URLs, and all displayed durations are present.
- The official Japanese work forms `『DEATH NOTE』`, `『AKIRA』`, `『新世紀エヴァンゲリオン』`, and `『ヨコハマ買い出し紀行』` are used in titles rather than mechanically transliterating Chinese forms.

### Japanese source-free fluency pass

- Rechecked the opening as continuous Japanese prose. `アニメ映像の編集動画という形式のもの` was further revised to `アニメの映像を編集するという形式の動画`, and `比較的すぐれた入門` to `比較的よくできた入門`, removing stacked nominalization and stiff evaluative diction without strengthening `比较好的`.
- `紹介される歴史の射程` was revised to `扱う歴史の射程`, which more directly carries `其介绍的历史长度` without the passive translationese.
- Credit sentence before: `本シリーズを論じ`; after: `本シリーズを制作し`.
- Reason: the article is thanking the source creator for making the video series; `論じ` misleadingly suggested only discussing it.
- Contributor separators before used Chinese commas; after they use Japanese `、`, with contributor strings otherwise unchanged.

### Whole-work consistency pass

- `Understanding Disaster` is consistent across English title, excerpt, and all four official English list titles; Japanese uses `災害を理解する` for the collection/individual title framing and retains `Understanding Disaster` once in the excerpt to identify the verified source series.
- `Pause and Select` capitalization follows the official channel metadata in both targets.
- `群青七号楼` is treated consistently as a named translation community; the English explanatory rendering appears only where identification benefits from it.
- No images, footnotes, block quotations, bibliography, or captions occur in the source, so none can be missing from either target.

## Rendered acceptance evidence

Local preview command: `ROOF_TRANSLATION_PREVIEW=1 npm run dev -- -p 3101`. The review editions were opened in Chromium as real locale routes rather than inspected only as Markdown.

- English route: `/en/posts/understanding-disaster-video-series`. Checked at `1440×900` and `390×844`; HTTP 200, `html lang="en"`, localized title/excerpt/body/credits, four Bilibili links, and reciprocal visible language navigation to Chinese and Japanese were present. The source has no images or footnotes, and the rendered page likewise has none. All four Bilibili links retained their exact URLs and rendered with `target="_blank" rel="noopener noreferrer"`. No horizontal overflow was measured (`1430 ≤ 1440` desktop; `380 ≤ 390` mobile), and the full-page screenshots were visually inspected for clipping, broken list wrapping, or typography defects; none were found.
- Japanese route: `/ja/posts/understanding-disaster-video-series`. Checked at `1440×900` and `390×844`; HTTP 200, `html lang="ja"`, localized title/excerpt/body/credits, all four list items, and reciprocal visible language navigation were present. No source images or footnotes exist and none were synthesized. No horizontal overflow was measured (`1430 ≤ 1440` desktop; `380 ≤ 390` mobile), and full-page screenshots showed no clipped text, broken list layout, or target-language typography defect.
- Language-switch interaction was exercised in Chromium: English → Japanese reached the Japanese route with `html lang="ja"`; Japanese → English returned to the English route with `html lang="en"`.
- The preview canonical for each edition was self-routed to the same locale path on the configured site origin. Because both editions remain `status: review`, this is editorial preview evidence, not publication approval.

Translator-side bilingual comparison, source-free reread, and rendered visual inspection are complete. However, the final repository font contract is red for the Japanese translation corpus, and the generated font assets required to resolve it are outside this batch's allowed diff. Therefore this work is **not recorded as 首译完成** in this batch. It **尚未经过独立终审**.

## Structural audit note

The audit manifests use the complete Roof canonical as the protected structural shell because order, paragraphs, links, and displayed durations all belong to the Roof compilation. Semantic source routing for the four link-title strings is recorded separately above and is not overridden by that mechanical comparison.

## Commands and gate evidence

- `python3 scripts/audit-translation-structure.py --manifest editorial-sources/translations/disaster-apocalypse-video-series-en-audit.json`: 0 failures, 1 inspected numeric-token warning.
- `python3 scripts/audit-translation-structure.py --manifest editorial-sources/translations/disaster-apocalypse-video-series-ja-audit.json`: 0 failures, 1 inspected numeric-token warning.
- Numeric warnings are expected source-routing effects: the official English/Japanese list titles explicitly print `Part 1` through `Part 4`, while the Roof Chinese title strings do not carry the same Arabic-token distribution; English also translates `群青七号楼` as `Building 7 Ultramarine`. All four source durations remain identical in the target lists.
- `npm run verify:translations`: passed on the final tree; 10 review editions checked, with 6 known/inspected structure warnings site-wide, including the two warnings above.
- `npm run validate:content`: passed (`337` posts, `443` contributors, `35` books, `8` topics, `0` non-blocking warnings).
- `npm run verify:typography`: passed, including the corpus render scan.
- `npm run verify:citations`: passed.
- `npm run verify:internal-links`: passed.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed on the final tree; production build generated all static pages successfully.
- `git diff --check`: passed.
- `npm run verify:fonts`: **blocked**. The committed Japanese font corpus inventory does not include this Japanese target (or the other Japanese targets in this batch); the verifier reports `Japanese font corpus inventory is stale; run python scripts/build-translation-font-subsets.py`. Regenerating `public/fonts/*` and `app/translation-fonts.generated.css` would violate the user-imposed diff scope, so no generated font asset was changed.
- The umbrella `npm run check` is additionally unable to complete in this worktree because the ignored `.local-archive/wechat-full/articles` fixture is absent; `npm run audit:roof-archive` and `npm run verify:preservation` are likewise blocked by absent baseline/local evidence. These environment/baseline failures were not papered over.
- No independent final translation review has been performed; both editions remain `review`.
