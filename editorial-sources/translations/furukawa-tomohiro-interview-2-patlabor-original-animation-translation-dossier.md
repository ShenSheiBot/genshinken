---
work_id: furukawa-tomohiro-interview-2-patlabor-original-animation
translation_group: furukawa-tomohiro-interview-2-patlabor-original-animation
publication:
  decision: local-preview
targets:
  - language: en
    path: source/_translations/en/posts/furukawa-tomohiro-interview-2-patlabor-original-animation.md
    route: /en/posts/furukawa-tomohiro-interview-2-patlabor-original-animation
    status: review
  - language: ja
    path: source/_translations/ja/posts/furukawa-tomohiro-interview-2-patlabor-original-animation.md
    route: /ja/posts/furukawa-tomohiro-interview-2-patlabor-original-animation
    status: review
sources:
  - id: roof-zh
    language: zh-Hans
    path: source/_posts/furukawa-tomohiro-interview-2-patlabor-original-animation.md
    revision: sha256:49d870bb1b53b518bbd54cd4d5acd06c7f452c827e5d265eda696744b01cea32
    byte_revision: sha256:caaa67076c54997e677746d7aa266d96ea8bf0a02ddc9e094f89fc992c853b79
    title: “进行原创动画企划时，首先应该考虑『如何设计才能让观众享受动画的乐趣』”
    author: Febri / 前田久 / 古川知宏; Chinese translation by Солнце; proofread by 栗子
    coverage: Complete Roof publication boundary containing the source link, one local image, one section heading, eight interviewer prompts, eight Furukawa answers with one Roof paragraph split inside an original answer, and local series navigation.
    rights_evidence: Roof responsibilities are preserved in canonical metadata; no reuse right in the Febri original is inferred.
    publication_decision: Owner requested local-preview English/Japanese editions for this batch.
  - id: febri-ja
    language: ja
    path: editorial-sources/translations/furukawa-tomohiro-interview-2-patlabor-original-animation-source-ja.md
    revision: sha256:3bf99ca7346e5f7dfe05eaf5c8d303289f0ce603d4cf6870d49af43706604df8
    title: 古川知宏② 押井守の「演出論」を学んだ『機動警察パトレイバー the Movie』
    author: 取材・文／前田 久; interviewee 古川知宏
    venue: Febri TALK
    edition: Current official web article; article:published_time 2021-11-17T03:00:34+00:00
    url: https://febri.jp/febri_talk/furukawa_tomohiro_2/
    accessed: 2026-08-19
    coverage: Exact Roof-aligned Japanese heading and interview Q&A. Febri's four-line pull quote, KATARIBE profile, tags, rankings, and site furniture lie outside the Roof boundary and are not imported.
    rights_evidence: No open reuse licence established. Used as a verified original-language base for local-preview restoration/translation only.
    publication_decision: local-preview verification and drafting only
segments:
  - id: roof-opening
    role: source-apparatus
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:49d870bb1b53b518bbd54cd4d5acd06c7f452c827e5d265eda696744b01cea32
    source_locator: Source-link blockquote and local image before the interview heading.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Opening source link and localized image alt.
  - id: febri-interview-body
    role: original-body
    source_language: ja
    base_edition: febri-ja
    source_revision: sha256:3bf99ca7346e5f7dfe05eaf5c8d303289f0ce603d4cf6870d49af43706604df8
    source_locator: "Heading `## 初めて触れたキャラクター論と「お仕事もの」アニメ` through final Furukawa answer ending `ですが「楽しんで見てもらえるか」は別だと学びました。`"
    roof_presence: complete translated coverage
    coverage: "heading plus all Q&A turns; one Febri paragraph is split at the exact Roof sentence boundary after `作画でやるか。`"
    relationship: direct
    target_anchor: Interview heading through final Furukawa answer.
  - id: roof-series-nav
    role: editorial-apparatus
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:49d870bb1b53b518bbd54cd4d5acd06c7f452c827e5d265eda696744b01cea32
    source_locator: Final `同系列：` navigation line.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Final localized series navigation.
assets:
  - id: febri-talk-furukawa-2
    source: attachments/roof-archive/cv14222448/febri-talk-furukawa-2.jpg
    source_locator: Canonical Roof local attachment.
    rights_evidence: Existing retained Roof archive asset; no new asset introduced.
    publication_decision: local-preview
reviews:
  fidelity: "C-01 reacceptance: all 18 Roof-aligned heading/Q&A blocks were compared directly against the verified Febri Japanese snapshot. The Japanese interview body remains byte-exact to the snapshot (3,269 characters), while Roof-only opening/nav were rechecked against the Chinese canonical."
  fluency: "C-01 reacceptance: the final English target was reopened and read source-free after the last fidelity edits; Japanese was read as an original-language restoration without smoothing Febri speech. No known target-text defect remains."
  whole_work: "Both editions preserve the heading, speaker sequence, Roof paragraph split, local image, source link, terminology, and series-navigation destinations. Japanese translation responsibility is explicitly limited to Roof-specific apparatus rather than the restored Febri body."
  rendered: "Final isolated local preview: EN and JA candidate routes returned HTTP 200. Desktop 1440x1000 and mobile 390x844 were checked with no horizontal overflow; the retained image loaded at 720x417; the source link and both series links were present; no source footnotes are expected or rendered; no process-note markers were found; Chinese/EN/JA navigation was visible and EN→JA was clicked successfully. After a clean preview restart, the JA page rendered the bounded credit `翻訳: 甚谁Bot · Roof独自の要約・導入・画像代替テキスト・シリーズナビ`."
---

## Research log

- Query: `site:febri.jp/febri_talk/furukawa_tomohiro_2 古川知宏② 機動警察 パトレイバー オリジナルアニメ`. Match: official Febri article at the URL already printed in Roof citation metadata.
- Query: `site:febri.jp/febri_talk/furukawa_tomohiro_2 "オリジナルアニメ" "古川知宏"`. Match: same official article; excluded duplicate discovery routes.
- Direct official-page fetch on 2026-08-19 confirmed HTML title, `article:published_time`, description, and `取材・文／前田 久` credit.
- Paragraph verification: every one of the 18 Roof-aligned Japanese heading/Q&A blocks in the internal source snapshot matches an exact substring of the current official Febri page after markup/whitespace normalization. Zero unmatched blocks.
- Opening anchor: `初めて触れたキャラクター論と「お仕事もの」アニメ`.
- Closing anchor: final Furukawa sentence `ですが「楽しんで見てもらえるか」は別だと学びました。`.
- Coverage exclusion: the live page inserts a four-line pull quote between the material-selection discussion and `――耳が痛いです。`; Roof did not publish that callout, so targets do not silently add it. KATARIBE profile, tags, ranking, share/site furniture are also excluded.
- Candidate rejection: search/tag/index pages confirm identity but are discovery records, not paragraph bases; the official article itself is the base.

## Discourse map

- Objective: trace how Oshii Mamoru's directing theory, especially control of information and choice of expressive material, shaped Furukawa's understanding of original-animation direction.
- Movement: childhood/young-adult discovery of *Patlabor* and Oshii; later rereading Oshii's theory through hands-on directing; convergence with Ikuhara Kunihiko's practice; material choice as auteurial authorship; *Patlabor: The Movie* as a lesson in character construction and workplace drama; role-based dramaturgy; original-animation planning as designing how the audience will enjoy the work.
- Major turns: admiration for a singular auteur becomes a general production principle; “theme” is subordinated to practical selection of dialogue/music/CG/background/animation; character can be constructed without being pictured; workplace role becomes a dramatic device; directing expands upstream into producing and project design.
- Ending function: Furukawa distinguishes delivering an impressive-looking original animation from designing one that audiences can actually enjoy.

## Voice cards

### 前田 久 / interviewer

- Short, responsive prompts; often confirms or lightly teases rather than introducing long arguments.
- Register is conversational-professional; preserve compact reactions such as `それはスゴい。` and `耳が痛いです。`.
- English: concise, spoken interview English, no explanatory padding.
- Japanese: restore exact Febri prompt wording inside the verified boundary.

### 古川知宏 / interviewee

- Fast, associative speech with self-correction, ellipses, colloquial intensifiers, and specialist animation-production vocabulary.
- Frequently moves from fandom memory to abstract craft principle and back to a concrete shot or production situation.
- Keeps laughter marker `（笑）`, rhetorical `じゃないですか`, and informal evaluative language such as `たまらない` and `スゴい`.
- English: speakable and enthusiastic; technical terms must remain precise without turning speech into an academic essay.
- Japanese: exact verified Febri wording controls the interview body; Roof-only apparatus remains localized separately.

## Glossary

| source | zh | en | ja | status | scope | evidence and notes |
| --- | --- | --- | --- | --- | --- | --- |
| 古川知宏 | 古川知宏 | Tomohiro Furukawa | 古川知宏 | accepted | series | Stable from installment 1. |
| 前田 久 | 前田久 | Hisashi Maeda | 前田 久 | accepted | series | Febri credit. |
| 機動警察パトレイバー the Movie | 机动警察剧场版 | Patlabor: The Movie | 機動警察パトレイバー the Movie | accepted | work | Japanese official/Furry Febri wording; established English title. |
| 押井守 | 押井守 | Mamoru Oshii | 押井守 | accepted | series | Director discussed throughout. |
| 幾原邦彦 | 几原邦彦 | Kunihiko Ikuhara | 幾原邦彦 | accepted | series | Furukawa's mentor/directing reference. |
| 庵野秀明 | 庵野秀明 | Hideaki Anno | 庵野秀明 | accepted | work | Mentioned as another director discussing information control. |
| ユリ熊嵐 | 百合熊风暴 | Yurikuma Arashi | ユリ熊嵐 | accepted | work | Furukawa was assistant director per interview wording. |
| マテリアル（素材） | 素材 | material / expressive material | マテリアル（素材） | accepted | series | Means the medium/component selected for expression: dialogue, music, 3DCG, background art, animation. |
| 情報量のコントロール | 动画信息量的控制 | controlling the amount of information | （アニメの）情報量のコントロール | accepted | series | Keep production-theory sense. |
| 絵コンテ | 分镜 | storyboard / storyboards | 絵コンテ | accepted | series | Use “storyboard” in English, not generic “direction.” |
| 特効 | 摄影处理/特效 | special photographic effects | 特効 | accepted | work | Opening-cell treatment; do not flatten to generic VFX. |
| お仕事もの | 职场动画 | workplace story / workplace anime | お仕事もの | accepted | work | Genre-like colloquial label. |
| 舞台装置 | 舞台装置 | dramatic device | 舞台装置 | accepted | work | Ram as a device enabling the world rules. |
| 作家性 | 作者性 | auteurial identity / authorship | 作家性 | accepted | series | Preserve craft/auteur nuance. |
| プロデュースレベル | 制片层面 | at the producing level | プロデュースレベル | accepted | work | Means director thinking upstream at project/production design. |
| 納品 | 交付 | deliver / hand in | 納品 | accepted | work | Furukawa's deliberately production-minded contrast with audience enjoyment. |

## Serial memory

- Installment 1 established Furukawa as excitable, colloquial, analytically precise; Maeda remains compact and responsive.
- Keep `作家性`, directing vocabulary, speaker labels, title/name romanization, and Roof series navigation consistent across installments 1–3.
- Installment 2 develops the production-principle side of the same directing worldview: constraints/material selection in installment 1 become information control, material choice, character roles, and audience-experience design here.
- Do not import installment 1 or 3 body content into this page.

## Source discrepancies and routing decisions

- Roof publication date is 2021-11-30; the official page exposes `article:published_time` 2021-11-17T03:00:34+00:00. Targets keep Roof lifecycle metadata while dossier records original publication metadata separately.
- The Roof Chinese title is a pull-quote style sentence. The Japanese target restores the verified Febri article title, matching installment 1's established series policy; English translates that verified Febri title rather than translating the Roof pull-quote title as if it were original.
- The current Febri page contains a four-line editorial pull quote absent from Roof. It is not imported. This is an excerpt/layout boundary difference, not missing target content.
- Febri line 31 is one HTML paragraph. Roof divides the translated content after the list ending with animation/drawing. The internal Japanese source snapshot keeps exact Febri wording but mirrors that Roof split at the corresponding sentence boundary so target paragraph structure remains faithful to the Roof edition without changing original wording.
- Roof's long paragraph about the first *Patlabor* film contains duplicated/garbled Chinese around the opening cell-slide description. The verified Japanese original controls both targets; no duplicate is reproduced and no public correction note is added.
- Source link, local image, and final series navigation are Roof apparatus and are translated/localized from Chinese rather than sourced from Febri page furniture.

## Review evidence

- Protected structure: opening source-link blockquote, one image, one h2, eight interviewer prompts, eight Furukawa answers plus the Roof-preserved continuation paragraph, and final series navigation.
- High-risk facts: who first exposed Furukawa to directing theory; relationship among Oshii/Ikuhara/Anno; `マテリアル` examples; *Waiting for Godot* analogy; workplace-role dramaturgy; audience-enjoyment design versus mere delivery; speaker sequence.
- Mixed-source manifests will map Roof-only opening/nav to Chinese canonical and the interview body to the verified Japanese snapshot.


## English translator self-review

- Pass 1, bilingual fidelity: checked each prompt and Furukawa answer directly against the verified Febri Japanese snapshot, not against the Chinese relay. Particular attention went to `情報量のコントロール`, the five-way material list, Ikuhara changing themes to fit available materials, *Waiting for Godot*, the role/buddy dramaturgy, and the distinction between `納品` and audience enjoyment.
- Fidelity/fluency revision: `say this or that about direction myself` → `weigh in on direction myself`; the first phrase reproduced Japanese syntax rather than Furukawa's spoken meaning.
- Fluency revision: `at a much higher resolution` → `with much greater clarity`; keeps the metaphorical force of `高い解像度で` without an English calque.
- Terminology revision: `a director’s choice of materials` → `the way a director chooses among materials`, making `マテリアルの選び方` an ongoing craft practice rather than a single choice.
- Technical revision: `sliding cels covered in heavy special photographic effects` → `a cel-slide shot loaded with dense photographic effects`; this preserves the cel-era `セルのスライド` and `特効` production sense without treating it as generic VFX.
- Fidelity revision: `place of work and role` → `the place they occupy and the role they are given`; `場所` in the Japanese is broader than a literal workplace.
- Voice/clarity revision: `a basically patterned person` → `someone whose basic mode is “I have to act according to my role”`; the earlier wording was unreadable English and blurred the pairing logic.
- Voice/clarity revision: `prepared as a two-part set` → `work on two levels at once`; this preserves the paired imaginable/beyond-imaginable emotional range without translating `ふたつセット` mechanically.
- Core thesis revision: `design the audience’s way of enjoying it` → `design the way the audience will enjoy it`; retains Furukawa's repeated `設計` while making the line speakable.
- Pass 2, source-free fluency: reread as a creator interview and additionally changed `never exactly plenty of leeway` → `never much breathing room`, `goes straight into the audience` → `reaches the audience`, and `likes professions` → `has a thing for occupations`. These are voice repairs, not content changes.
- Pass 3, whole-work consistency: checked Tomohiro Furukawa / Hisashi Maeda / Mamoru Oshii / Kunihiko Ikuhara / Hideaki Anno, *Patlabor: The Movie*, *Yurikuma Arashi*, `material`, `storyboard`, `auteurial identity`, `dramatic device`, and `producing level` against installment 1 terminology and within this page.
- C-01 final fidelity/voice revisions: `美術` is rendered as `background art` in Ikuhara’s storyboard example; the paired imaginable/beyond-imaginable emotional range was restored more literally; Twitter `実況文化や同時性` is `real-time commentary culture and its sense of simultaneity`; the final target was then reopened and read source-free.

## Japanese restoration self-review

- Pass 1, source fidelity: the entire interview segment from the h2 through the final Furukawa answer was byte-compared against the Roof-aligned Febri snapshot and is exact (3,269 characters in both representations). The one paragraph split after `作画でやるか。` is inherited from Roof and documented; Japanese wording on both sides of that split is unchanged.
- Pass 2, source-free Japanese read: verified speaker rhythm, ellipses, `（笑）`, `じゃないですか`, `耳が痛いです`, specialist vocabulary, and punctuation as a continuous Febri interview. No smoothing of Furukawa's original speech was made.
- Roof-apparatus revision: image alt `題画像` → `メイン画像` for idiomatic Japanese; source-link and series navigation remain direct localizations with protected destinations unchanged.
- Pass 3, whole-work consistency: verified all proper names, titles, `マテリアル`, `情報量のコントロール`, `絵コンテ`, `お仕事もの`, `舞台装置`, `作家性`, `プロデュースレベル`, and `納品`; no Chinese relay wording remains in the interview body.
- C-01 responsibility correction: the public Japanese `translator` credit no longer claims `全文`; its scope is `Roof独自の要約・導入・画像代替テキスト・シリーズナビ`. The Febri-derived title and interview body are restored source text, not attributed to the agent as translation. `title_breaks` was also repaired so the runtime concatenation invariant matches the restored title exactly.

## C-01 rendered-page reacceptance (2026-08-19)

- Routes: `/en/posts/furukawa-tomohiro-interview-2-patlabor-original-animation` and `/ja/posts/furukawa-tomohiro-interview-2-patlabor-original-animation`, served from the exact candidate target files in the detached editorial-preview harness.
- Viewports: desktop `1440x1000`; mobile `390x844`. Both locales had root `scrollWidth <= clientWidth`; top and end-of-article views were captured and visually inspected.
- EN: HTTP 200, `html[lang=en]`, one retained image loaded at `720x417`, zero source footnotes, official Febri source link plus Roof Part 3/Part 1 links present, no process markers, visible Chinese/EN/JA language controls.
- JA: HTTP 200, `html[lang=ja]`, one retained image loaded at `720x417`, zero source footnotes, official Febri source link plus Roof 第3回/第1回 links present, no process markers, visible Chinese/EN/JA controls.
- Language navigation: EN→JA was exercised by click and landed on the correct JA route; the reciprocal EN link was present.
- Credit rendering: after a clean dev-server restart, the JA page visibly rendered `翻訳: 甚谁Bot · Roof独自の要約・導入・画像代替テキスト・シリーズナビ`, so the agent is not publicly credited for translating the restored Febri interview body.
- Environment note: the specified main worktree still has a candidate-external preview blocker in `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` (`title_breaks` does not concatenate exactly to `title`). No candidate-external target was modified. The detached preview worktree uses disposable candidate-external title-break normalization solely to allow route generation.
- Candidate result: no known content, credit, image, link, navigation, or responsive-layout defect remains in the two candidate editions.

## Gate evidence

- C-01 final mixed-source audit, EN: zero failures; two inspected numeric-token localization warnings.
- C-01 final mixed-source audit, JA: passed with zero warnings; restored interview body remains byte-exact to the verified Febri snapshot.
- `npm run verify:translations` after the final C-01 candidate-2 target edits: passed (16 editions; repository-wide inspected numeric warnings only).
- C-01 batch gate sweep after all five ordered candidates: `validate:content`, `validate:media-html`, `verify:wechat-assets-ready`, `audit:tags`, `verify:structured-credits`, `verify:license-placement`, `verify:typography`, `verify:typography-registry`, `verify:book-capabilities`, `verify:reading-progress`, `verify:han-script`, `verify:citations`, `verify:translations`, `verify:internal-links`, `verify:routing`, `verify:library`, `typecheck`, `lint`, and `git diff --check` passed.
- Repository-wide prerequisites outside this batch keep the aggregate gates from being green: `audit:roof-archive` lacks ignored `.local-archive/bilibili-raw/source-archive/articles`; `verify:preservation` lacks untracked/external `editorial-sources/preservation-manifest.json`; `npm run check` stops at `verify:wechat-preservation` because ignored `.local-archive/wechat-full/articles` is absent; `verify:fonts` reports a stale Japanese corpus inventory and the same failure was reproduced on clean `HEAD`; `npm run build` compiles and typechecks, then fails page-data collection on the untouched candidate-external `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` title-break invariant, which is already false on `HEAD`. No out-of-scope file was changed to force these gates green.
