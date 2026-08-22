---
work_id: death-and-rebirth-in-isekai-reincarnation
translation_group: death-and-rebirth-in-isekai-reincarnation
publication:
  decision: local-preview
targets:
  - language: en
    path: source/_translations/en/posts/death-and-rebirth-in-isekai-reincarnation.md
    route: /en/posts/death-and-rebirth-in-isekai-reincarnation
    status: review
  - language: ja
    path: source/_translations/ja/posts/death-and-rebirth-in-isekai-reincarnation.md
    route: /ja/posts/death-and-rebirth-in-isekai-reincarnation
    status: review
sources:
  - id: roof-zh
    language: zh-Hans
    path: source/_posts/death-and-rebirth-in-isekai-reincarnation.md
    revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    title: 死亡何以“新生”：异世界转生作品中的死亡研究
    author: 甚谁
    coverage: "Complete Roof Chinese original: one image, abstract, four numbered sections, conclusion, four long block quotations plus source-attribution lines, and the two Japanese Mushoku Tensei web quotations already preserved in the canonical."
    rights_evidence: The repository applies its default CC BY-NC-SA 4.0 publication notice when no distinct page licence is asserted.
    publication_decision: Owner explicitly requested English and Japanese local-preview translation work for this batch; no external publication was requested.
  - id: mushoku-official
    language: ja
    title: 無職転生 ～異世界行ったら本気だす～
    author: 理不尽な孫の手 / official anime production committee
    venue: TVアニメ「無職転生 ～異世界行ったら本気だす～」公式サイト
    url: https://mushokutensei.jp/introduction/
    accessed: 2026-08-19
    coverage: First-party verification of the Japanese work title and the work’s positioning as a representative isekai-reincarnation light novel; the official story page also confirms the 34-year-old shut-in protagonist’s death and reincarnation as Rudeus.
    rights_evidence: Bibliographic/terminology verification only; no reuse right inferred.
    publication_decision: verification-only
  - id: mushoku-narou-chapter-1
    language: ja
    title: 第一話「もしかして：異世界」
    author: 理不尽な孫の手
    venue: 小説家になろう
    url: https://ncode.syosetu.com/n9669bk/2/
    accessed: 2026-08-21
    coverage: Public author-posted source for the first Japanese quotation reproduced in section III; wording matches the Roof canonical quotation.
    rights_evidence: Verification of an excerpt already quoted by Roof; no broader reuse right inferred.
    publication_decision: verification-only
  - id: mushoku-narou-prologue
    language: ja
    title: プロローグ
    author: 理不尽な孫の手
    venue: 小説家になろう
    url: https://ncode.syosetu.com/n9669bk/1/
    accessed: 2026-08-21
    coverage: Public author-posted source for the second Japanese quotation reproduced in section III; wording matches the Roof canonical quotation.
    rights_evidence: Verification of an excerpt already quoted by Roof; no broader reuse right inferred.
    publication_decision: verification-only
  - id: slime300-official
    language: ja
    title: スライム倒して300年、知らないうちにレベルMAXになってました
    venue: TVアニメ公式サイト
    url: https://1st.slime300-anime.com/
    accessed: 2026-08-19
    coverage: First-party verification of the Japanese work title and official English title “I’ve Been Killing Slimes for 300 Years and Maxed Out My Level.”
    rights_evidence: Bibliographic verification only.
    publication_decision: verification-only
  - id: bokurema-official
    language: ja
    title: ぼくたちのリメイク
    venue: TVアニメ「ぼくたちのリメイク」公式サイト
    url: https://bokurema.com/
    accessed: 2026-08-19
    coverage: First-party verification of the Japanese title, the Ver.β spin-off title, and the story premise of Hashiba Kyōya returning ten years to his university-entry point.
    rights_evidence: Bibliographic verification only.
    publication_decision: verification-only
  - id: juumonji-afterword
    language: ja
    title: 灰と幻想のグリムガル level.1 ささやき、詠唱、祈り、目覚めよ
    author: 十文字青
    edition: Volume 1 afterword cited by the Roof Chinese original through the Ching Win Chinese edition.
    accessed: 2026-08-19
    coverage: Roof quotes a long Chinese translation of the afterword naming formative console RPGs and Mizuno Ryō / Benny Matsuyama. An authoritative Japanese text matching the full quoted span was not located in this pass.
    rights_evidence: Historical citation in the Roof essay; exact Japanese wording remains unverified.
    publication_decision: verification-only
  - id: azuma-game-realism
    language: ja
    title: ゲーム的リアリズムの誕生――動物化するポストモダン2
    author: 東浩紀
    edition: Roof cites the Chinese Tangshan edition for a passage on the origin of 『ロードス島戦記』 and Group SNE.
    accessed: 2026-08-19
    coverage: Work identity and the broader TRPG / Lodoss genealogy are independently corroborated; an authoritative Japanese edition exposing the exact quoted paragraph was not located in this pass.
    rights_evidence: Historical citation in the Roof essay; exact Japanese wording remains unverified.
    publication_decision: verification-only
segments:
  - id: roof-original-body
    role: roof-original-body
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    source_locator: Complete Markdown body after front matter, excluding separately routed embedded quotations.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Complete body in both target files.
  - id: mushoku-web-quotes
    role: quotation
    source_language: ja
    base_edition: roof-zh
    source_revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    source_locator: Two Japanese quotations already preserved verbatim in section III, followed by Roof Chinese translations.
    roof_presence: complete
    coverage: two quoted spans
    relationship: direct-to-ja; direct-ja-to-en
    target_anchor: Section III quotation blocks.
  - id: juumonji-afterword-relay
    role: quotation
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    source_locator: Section I block quotation attributed to 十文字青, Chinese translation of a Japanese afterword.
    roof_presence: complete
    coverage: quoted span only
    relationship: relay-to-en; paraphrase-in-ja-to-avoid-ghost-back-translation
    target_anchor: Section I first long quotation block.
  - id: azuma-lodoss-relay
    role: quotation
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    source_locator: Section I block quotation attributed to 東浩紀, Chinese translation of a Japanese book passage.
    roof_presence: complete
    coverage: quoted span only
    relationship: relay-to-en; paraphrase-in-ja-to-avoid-ghost-back-translation
    target_anchor: Section I second long quotation block.
  - id: image-1
    role: caption
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:71698722826dcb8bc923fe9dc3315937286894bc81a00a35ecee426ac5291136
    source_locator: Opening Markdown image alt text.
    roof_presence: complete
    coverage: one image
    relationship: direct
    target_anchor: Opening image.
assets:
  - id: roof-cv14159519-figure-1
    source: /attachments/roof-archive/cv14159519/figure-1.jpg
    source_locator: Opening image in canonical Roof post.
    rights_evidence: Existing retained Roof archive asset; reused unchanged for local-preview targets.
    publication_decision: local-preview
reviews:
  fidelity: "C-02 corrective review: English remains aligned with the complete canonical. Japanese was re-compared against the canonical and both public Narou passages; the two exact Japanese quotations are restored directly, while the immediately following Chinese reader glosses are deliberately omitted rather than translated back into Japanese."
  fluency: "C-01 reacceptance: both final target files were reopened and reread source-free after the last edits. English generalization/calques and Japanese 重开 / game-tool wording were revised; no known target-language defect remains in the candidate files."
  whole_work: "C-02 corrective review: both targets preserve five h2 headings, one image, the diagram sequence, and every substantive quotation/source-attribution position. The Japanese mixed-source audit records the approved omission of two Chinese gloss blocks whose exact Japanese originals immediately precede them; no substantive argument or apparatus unique to the Roof edition is omitted."
  rendered: "Isolated local editorial preview, exact candidate files: /en/posts/death-and-rebirth-in-isekai-reincarnation and /ja/posts/death-and-rebirth-in-isekai-reincarnation returned HTTP 200. Desktop 1440x1000 and mobile 390x844 were inspected visually and by DOM: article text present, image loaded at natural 720x405, no horizontal overflow, no source footnotes expected or rendered, no process-note markers, visible Chinese/EN/JA navigation, and EN→JA navigation was clicked successfully with an EN return link present. The specified main worktree cannot currently render translation routes cleanly because candidate-external source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md has a pre-existing title_breaks/title mismatch; the preview used a detached temporary worktree where candidate-external title_breaks were normalized solely as a noncommitted harness workaround."
---

## Research log

- Direct source verification: `https://ncode.syosetu.com/n9669bk/2/` matches the first quoted Japanese passage from `悪くない` through `全力で`.
- Direct source verification: `https://ncode.syosetu.com/n9669bk/1/` matches the second quoted Japanese passage from `仕事を探す方法がわからない` through `人生が完全に詰んだのを自覚した`.
- Query: `site:mushokutensei.jp 無職転生 異世界行ったら本気だす 公式`. Match: official anime introduction/story pages; confirms title and reincarnation premise. Included for terminology verification, not as the article base.
- Query: `site:slime300-anime.com スライム倒して300年 公式`. Match: official anime site; confirms the Japanese and official English titles. Included for title verification only.
- Query: `site:bokurema.com ぼくたちのリメイク 公式`. Match: official anime site; confirms title, Ver.β spin-off, and ten-year rewind premise. Included for title verification only.
- Query: `“ドラゴンクエスト” “wizardry” “十文字青” “グリムガル” “あとがき”`. Candidate results did not expose an authoritative complete Japanese afterword matching the Roof quotation. Excluded as a restoration base.
- Query: `“グループSNE” “ロードス島戦記” “ゲーム的リアリズムの誕生” 東浩紀`. Candidate secondary sources corroborate the historical TRPG/Lodoss relation, but no authoritative full Japanese paragraph matching the Roof quotation was found. Excluded as an exact-quotation base.
- Opening anchor for source identity: opening image followed by the abstract beginning `“異世界転生”，指的是原本世界的主人公死亡后...`.
- Closing anchor: conclusion ending with the question `当我们在想象的世界中无敌之后，我们想过一种怎样的新生？`.
- Coverage decision: complete Roof article only; no external text is added and no omitted material is filled.

## Discourse map

- Thesis/objective: explain why death is structurally necessary in modern Japanese isekai-reincarnation narratives and what kind of social transcendence the device of “starting life over” encodes.
- Movement: distinguish contemporary isekai from older fantasy; distinguish reincarnation (転生) from transfer (転移); identify death as the hard boundary between former and present life; read *Mushoku Tensei* and *Slime 300* through labor, social exclusion, and the desire for a rule system one can accept; contrast this with Japanese time-reset stories and Chinese “restart/re-roll” fantasies.
- Major qualifications: the essay rejects a simple decline narrative from professional fantasy to amateur game-like isekai; it does not say isekai merely rejects effort, but argues that it rejects a particular effort-success logic while retaining effort within a different world-system; the China/Japan comparison is deliberately schematic and polemical.
- Recurring oppositions: fantasy / isekai; transfer / reincarnation; former life / present life; everyday / extraordinary; return / irreversible break; labor / exclusion; escape / restart; effort / success; reality’s rules / game-world rules.
- Ending function: `/remake` becomes both game command and metaphor; the conclusion asks whether cultural imagination can move beyond merely becoming invincible toward imagining a world in which one genuinely wants to live seriously.

## Voice card

- Genre/register: long-form cultural criticism with theory vocabulary, internet slang, game terminology, and forceful evaluative claims.
- Rhythm: long cumulative analytical paragraphs, rhetorical questions, and repeated binary formulations; occasional deliberately blunt internet-language terms such as “开挂”, “摆烂”, “重开”.
- First person/reader address: mostly impersonal argument with occasional inclusive “we” in the conclusion.
- Polemic: openly critical of nationalist “web fiction vs. Japanese light novel” discourse, meritocratic restart fantasies, and the belief that only “winners” deserve an ordinary life. Do not neutralize the force.
- English treatment: readable cultural criticism; retain terms such as isekai, reincarnation, transfer, NEET, restart/re-roll, grind/work, and `/remake` where they carry subcultural specificity, while explaining them through context rather than added notes.
- Japanese treatment: contemporary critical prose in である style. Keep ネット小説 / ラノベ / 異世界転生 / 異世界転移 / ニート / 社畜 / 人生やり直し・人生リセット register differences without making the article uniformly academic.

## Glossary

| source | zh | en | ja | status | scope | evidence and notes |
| --- | --- | --- | --- | --- | --- | --- |
| 異世界転生 | 异世界转生 | isekai reincarnation | 異世界転生 | accepted | work | Core category; Japanese orthography retained. |
| 異世界転移 | 异世界转移 | isekai transfer | 異世界転移 | accepted | work | Keep distinct from reincarnation. |
| ファンタジー | 奇幻 | fantasy | ファンタジー | accepted | work | Used for older fantasy genealogy. |
| 小説家になろう | 小説家になろう | Shōsetsuka ni Narō | 小説家になろう | accepted | work | Platform name; Romanized in English. |
| 無職転生 ～異世界行ったら本気だす～ | 无职转生 | Mushoku Tensei: Jobless Reincarnation | 無職転生 ～異世界行ったら本気だす～ | accepted | work | Japanese title verified on official site; established English franchise title used. |
| スライム倒して300年、知らないうちにレベルMAXになってました | 狩猎史莱姆三百年 | I’ve Been Killing Slimes for 300 Years and Maxed Out My Level | スライム倒して300年、知らないうちにレベルMAXになってました | accepted | work | Official site provides English title. |
| ぼくたちのリメイク | 我们的重置人生 | Remake Our Life! | ぼくたちのリメイク | accepted | work | Japanese title verified on official site; English title established by licensed release. |
| ぼくたちのリメイク Ver.β | 我们的重置人生ver.β | Remake Our Life! Ver.β | ぼくたちのリメイク Ver.β | accepted | work | Official site identifies spin-off. |
| ロードス島戦記 | 罗德斯岛战记 | Record of Lodoss War | ロードス島戦記 | accepted | work | Established franchise title. |
| 様式/ゲーム的リアリズム | 游戏写实主义 | game-like realism / game realism | ゲーム的リアリズム | accepted | work | Azuma term; avoid overextending it beyond the cited argument. |
| 重开 | 重开 | restart / start over | やり直し／人生リセット | contextual | work | Internet meme; do not import the distinct gacha/reroll concept unless the source does. |
| 开挂 | 开挂 | cheat / use a cheat code | チート | contextual | work | Game metaphor, not moral/legal “cheating” in every occurrence. |
| 社畜 | 社畜 | corporate drone | 社畜 | accepted | work | Keep Japanese loan/source term in JA; idiomatic English in EN. |
| 摆烂 | 摆烂 | give up / stop trying | 投げやりになる／頑張るのをやめる | contextual | work | Preserve colloquial force. |

## Serial memory

- Standalone post; no serial memory required.
- Work titles and core isekai terminology are work-scoped unless independently reused later.

## Source discrepancies and routing decisions

- This article is Chinese original writing by 甚谁. Lack of a Japanese “original” is not a source failure. Both target editions are based on the repository Chinese canonical except for embedded quotations that can be routed to a verified source-language passage.
- The two *Mushoku Tensei* web quotations are already present in Japanese in the Chinese canonical and match the public Narou chapters. Japanese restores those Japanese blocks directly and omits the immediately following Chinese translations, whose sole reader-facing function was to gloss the Japanese quotations for Chinese readers. English translates the Japanese originals directly.
- The Juumonji Ao and Azuma Hiroki passages are Chinese translations of Japanese books. Exact authoritative Japanese passages matching the full Roof quotation were not established. English may use the Roof Chinese as an explicit internal relay because English is a third language. Japanese must not ghost-back-translate them into purported originals; the Japanese target therefore preserves their block-quotation positions but turns the wording into attributed summary/paraphrase rather than fake quotation text.
- The source uses `《狩猎史莱姆三百年》`, a shortened Chinese title for *I’ve Been Killing Slimes for 300 Years and Maxed Out My Level*; targets use verified established titles without altering the Chinese canonical.
- The source later writes `《我的重置人生》` once after consistently using `《我们的重置人生》`; context clearly refers to the same work. Targets use the verified single work identity and dossier records the source slip rather than reproducing a false second title.
- No external text is used to expand the article’s boundary. Official pages serve only to verify titles and premises already present in the Roof essay.

## Review evidence

- Protected structure to preserve: one opening image; abstract blockquote; headings I–IV plus conclusion; all body paragraph boundaries; sequence diagram blockquotes; four cited/quoted blocks in sections I and III; source-attribution lines.
- High-risk fidelity facts: 转生 vs 转移; the claim that death is a hard boundary between lives; the distinction between rejecting social effort-success logic and rejecting effort itself; the one-time death contrast with loop narratives; the China/Japan comparison’s direction of critique; the final `/remake` metaphor.
- Japanese high-risk anti-back-translation rule: only the two Japanese *Mushoku Tensei* passages may be restored as original-language quotation blocks from canonical evidence; Juumonji/Azuma remain attributed paraphrase unless exact text is later independently verified.


## English translator self-review

- Pass 1, bilingual fidelity: compared all 52 logical blocks in order. The first structural audit exposed two merged blockquote boundaries in the Jūmonji afterword excerpt; the English file was changed from one continuous Markdown quote to three separate quote blocks plus the attribution, matching the canonical structure.
- Fidelity revision: `post-narrative system` → `metanarrative system`, because the Roof phrase `后设叙事性的系统` denotes a meta-narrative/metanarrative system and the first rendering changed the theoretical relation.
- Fidelity/voice revision: `he fails to understand this world / understands it extremely well` → `he is simply maladapted to this world / has adapted to its rules all too thoroughly`, preserving the source's repeated `适应` while retaining the rule-knowledge point developed by the following quotation.
- Bibliographic caution: `Roses of Maria` → `Bara no Maria`; no official English title was established, so the Japanese title is romanized rather than presented as a licensed English title.
- Idiom revision: `reincarnation lottery memes` → `being reborn memes`; the former over-imported the later Japanese `親ガチャ` concept into the Roof's broader Chinese `投胎` wording.
- Pass 2, source-free fluency: reread the complete English essay. `Being influenced by RPGs produces the desire...` was ultimately revised to `Under the influence of RPGs, Jūmonji wanted to write novels that felt like RPGs.` to remove an abstract calque without generalizing beyond the source. The title was also revised from `How Can Death Become` to `How Does Death Become` to state the essay's interpretive question rather than a possibility claim.
- Pass 3, whole-work consistency: checked isekai reincarnation / transfer, fantasy, NEET, corporate drone, restart, cheat, *Mushoku Tensei*, *Remake Our Life!*, and *I’ve Been Killing Slimes for 300 Years and Maxed Out My Level* across title, abstract, headings, quotations, and conclusion.
- C-01 final fidelity corrections: the 1990s/2000s transfer paragraph now preserves the source’s universal `又都是` claim; `重生` in the *Remake Our Life!* paragraph is rendered as `time-reset` rather than the essay’s technical `reincarnation`; the source’s `无一不是如此` is restored as `none is an exception`; and several final calques were removed without changing argumentative force.
- Final metadata invariant check: English `title_breaks` was corrected so concatenation reproduces `title` exactly; no visible title wording changed.
- English protected-structure audit after revision: zero failures. The sole warning is an inspected Arabic-number-token difference: the Chinese canonical spells most decades and ages with Han numerals, while English convention uses Arabic numerals and introduces bibliographic `1989`, `300`, and section-related digits; no source number is omitted or altered.


## Japanese translator self-review

- Pass 1, bilingual fidelity: compared all 52 logical blocks against the Chinese canonical. Reincarnation/transfer, one-time death versus loop death, return versus irreversible separation, labor/social exclusion, and the direction of the China/Japan comparison were checked paragraph by paragraph.
- Anti-back-translation correction: the two *Mushoku Tensei* Japanese quotations remain exact Japanese blocks. The following Roof `译：` blocks are Chinese reader glosses of those same quotations, not independent authorial content; retranslating them into Japanese created redundant near-duplicate passages and has been removed. The Jūmonji and Azuma book passages remain third-person attributed summaries in Japanese because exact authoritative Japanese spans were not verified; no synthetic first-person “original” was created.
- Naturalness revision: `前世と今生` → `前世と今世`; `RPGゲーム` → `RPG`; `越境的なメディア性` → `メディア横断性`; `プロらしさ` → `専門性`. These remove Chinese-shaped wording without changing claims.
- Title consistency revision: `今日から㋮王！` → `今日からマ王！`; final game title `League of Legends` → `リーグ・オブ・レジェンド`; `ゲーム改変ツール` → `ゲーム改造ツール`; the final conclusion now distinguishes `チート、ハック、ゲーム改造ツール`.
- Pass 2, source-free fluency: reread the full essay in である style, keeping internet/game vocabulary more colloquial where the source becomes polemical (`チート`, `重开`, `人生やり直し`) and avoiding uniform academic stiffness.
- Pass 3, whole-work consistency: verified 異世界転生 / 異世界転移, ファンタジー, ニート, 社畜, 人生リセット, 努力―成功, and all named works across abstract, body, diagram, and conclusion.
- C-01 changed `人生リセマラ小説` to `人生やり直し小説`, because the Chinese `重开文` does not itself assert a gacha/reroll concept. C-02 removed the two redundant Japanese retranslations of Roof's Chinese quotation glosses.
- C-02 normalizes the public translator scope to `全文`. The detailed distinction between translated Chinese-authored prose and restored source-language quotations belongs to the internal segment map; ordinary quotation authorship is already clear from the displayed attribution.
- Japanese protected-structure audit after revision: zero failures. The sole warning is an inspected Arabic-number-token difference caused by target-language date/title conventions; no source numeric fact is omitted or altered.

## C-01 rendered-page reacceptance (2026-08-19)

- Exact candidate routes checked in detached preview: `/en/posts/death-and-rebirth-in-isekai-reincarnation` and `/ja/posts/death-and-rebirth-in-isekai-reincarnation`.
- Viewports: desktop `1440x1000`; mobile `390x844`. Both locales had `scrollWidth <= clientWidth`; top and end-of-article screenshots were visually inspected at both sizes.
- EN route: HTTP 200, `html[lang=en]`, 24,084 article-text characters, five article headings, one loaded image (`720x405`), 23 rendered blockquotes, zero footnote calls/sections because the canonical has none, and no process-marker hits.
- JA route: HTTP 200, `html[lang=ja]`, 9,746 article-text characters, five article headings, one loaded image (`720x405`), 23 rendered blockquotes, zero footnote calls/sections, and no process-marker hits.
- Language navigation: Chinese / EN / 日 controls were visible; EN→JA was exercised by click and landed on the correct JA route; the JA page exposed the reciprocal EN link. Review-status editions correctly do not emit published-edition `<link rel=alternate hreflang>` metadata.
- Environment note: direct preview from the specified worktree is currently interrupted by a candidate-external runtime validation error in `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` (`title_breaks` does not concatenate exactly to `title`). No candidate-external file was changed in the requested worktree. A detached temporary preview worktree normalized only candidate-external `title_breaks` as a disposable route-generation workaround; those changes are outside the deliverable and will not be committed.
- Candidate-page result: no known content, image, navigation, or responsive-layout defect was found in the two candidate editions themselves. Repository-wide preview cleanliness remains blocked by the unrelated file above.
- Final metadata-only recheck after repairing the English `title_breaks` invariant: exact final EN and JA candidate files again returned HTTP 200 in the detached preview; the final titles were visually inspected at `1440x1000` and `390x844`, with no horizontal overflow. The visible English title wording is unchanged; only the stored break boundary now concatenates exactly to `title`.
- Final JA credit recheck after narrowing responsibility: `/ja/posts/death-and-rebirth-in-isekai-reincarnation` returned HTTP 200 and visibly/structurally rendered `翻訳: 甚谁Bot · 中国語由来の翻訳部分（日本語原文復元引用を除く）`; desktop/mobile wrapping was checked, and a settled `390x844` pass had no horizontal overflow.

## Gate evidence

- C-01 reacceptance direct structure audit, EN: passed with zero failures and one inspected numeric-token localization warning.
- C-01 reacceptance direct structure audit, JA: passed with zero failures and one inspected numeric-token localization warning.
- `npm run verify:translations` after the final C-01 text/dossier edits: passed (16 editions; repository-wide inspected numeric warnings only).
- C-01 batch gate sweep after all five ordered candidates: `validate:content`, `validate:media-html`, `verify:wechat-assets-ready`, `audit:tags`, `verify:structured-credits`, `verify:license-placement`, `verify:typography`, `verify:typography-registry`, `verify:book-capabilities`, `verify:reading-progress`, `verify:han-script`, `verify:citations`, `verify:translations`, `verify:internal-links`, `verify:routing`, `verify:library`, `typecheck`, `lint`, and `git diff --check` passed.
- Repository-wide prerequisites outside this batch keep the aggregate gates from being green: `audit:roof-archive` lacks ignored `.local-archive/bilibili-raw/source-archive/articles`; `verify:preservation` lacks untracked/external `editorial-sources/preservation-manifest.json`; `npm run check` stops at `verify:wechat-preservation` because ignored `.local-archive/wechat-full/articles` is absent; `verify:fonts` reports a stale Japanese corpus inventory and the same failure was reproduced on clean `HEAD`; `npm run build` compiles and typechecks, then fails page-data collection on the untouched candidate-external `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` title-break invariant, which is already false on `HEAD`. No out-of-scope file was changed to force these gates green.
