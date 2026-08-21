---
work_id: witcher-wilderness-detective
translation_group: witcher-wilderness-detective
publication:
  decision: local-preview
targets:
  - language: en
    path: source/_translations/en/posts/witcher-wilderness-detective.md
    route: /en/posts/witcher-wilderness-detective
    status: review
  - language: ja
    path: source/_translations/ja/posts/witcher-wilderness-detective.md
    route: /ja/posts/witcher-wilderness-detective
    status: review
sources:
  - id: roof-zh
    language: zh-Hans
    path: source/_posts/witcher-wilderness-detective.md
    revision: sha256:40f640e611bb1bcf7bd421d8ebe57e4f6f7e0c741f7ec621c2c40f7e2252a5bf
    title: 猎魔人，荒野侦探
    author: 斑鸠
    coverage: "Complete Chinese original: eight prose paragraphs, three local images, and one embedded Walter Benjamin quotation inside the penultimate prose paragraph."
    rights_evidence: Canonical declares CC BY-NC-SA 4.0.
    publication_decision: Owner requested local-preview English/Japanese editions for this batch.
  - id: witcher-official
    language: en
    title: "The Witcher 3: Wild Hunt"
    venue: CD PROJEKT RED official Witcher site
    url: https://www.thewitcher.com/us/en/witcher3
    accessed: 2026-08-19
    coverage: "Terminology verification only: official game title, Geralt, Ciri, Wild Hunt, witcher/monster-slayer framing."
    rights_evidence: Bibliographic verification only; no reuse right inferred.
    publication_decision: verification-only
  - id: bolano-en
    language: en
    title: The Savage Detectives
    author: Roberto Bolaño
    venue: Penguin Random House
    url: https://www.penguinrandomhouse.com/books/200339/los-detectives-salvajes--the-savage-detectives-by-roberto-bolano/
    accessed: 2026-08-19
    coverage: Verifies established English title and Arturo Belano spelling for the literary allusion.
    rights_evidence: Bibliographic verification only.
    publication_decision: verification-only
  - id: bolano-ja
    language: ja
    title: 野生の探偵たち（上）
    author: ロベルト・ボラーニョ
    venue: 白水社
    url: https://www.hakusuisha.co.jp/book/b206354.html
    accessed: 2026-08-19
    coverage: Verifies the publisher's established Japanese title `野生の探偵たち` and Bolaño authorship; the upper-volume page is used as the primary title record.
    rights_evidence: Bibliographic verification only.
    publication_decision: verification-only
  - id: bolano-ja-lower
    language: ja
    title: 野生の探偵たち（下）
    author: ロベルト・ボラーニョ
    venue: 白水社
    url: https://www.hakusuisha.co.jp/book/b206355.html
    accessed: 2026-08-19
    coverage: Companion publisher record confirming the same established Japanese title for the lower volume.
    rights_evidence: Bibliographic verification only.
    publication_decision: verification-only
segments:
  - id: roof-original-body
    role: roof-original-body
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:40f640e611bb1bcf7bd421d8ebe57e4f6f7e0c741f7ec621c2c40f7e2252a5bf
    source_locator: Entire Markdown body, with the Benjamin quotation separately identified as an embedded relay.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Complete target body.
  - id: benjamin-relay
    role: quotation
    source_language: zh-Hans
    base_edition: roof-zh
    source_revision: sha256:40f640e611bb1bcf7bd421d8ebe57e4f6f7e0c741f7ec621c2c40f7e2252a5bf
    source_locator: Quoted Chinese sentence sequence beginning `过去都伴随着时间的指号` in the penultimate prose paragraph.
    roof_presence: complete
    coverage: quoted span only
    relationship: relay-to-en-and-ja
    target_anchor: Inline quotation in penultimate prose paragraph.
assets:
  - id: figure-6
    source: attachments/roof-archive/cv14264749/figure-6.jpg
    source_locator: First image.
    rights_evidence: Existing Roof archive asset.
    publication_decision: local-preview
  - id: figure-9
    source: attachments/roof-archive/cv14264749/figure-9.jpg
    source_locator: Second image.
    rights_evidence: Existing Roof archive asset.
    publication_decision: local-preview
  - id: figure-12
    source: attachments/roof-archive/cv14264749/figure-12.jpg
    source_locator: Third image.
    rights_evidence: Existing Roof archive asset.
    publication_decision: local-preview
reviews:
  fidelity: "C-01 reacceptance: both targets were compared in sequence against all eleven canonical logical blocks. The embedded Benjamin quotation remains explicitly routed from the Roof Chinese relay because no exact cited German edition/locator is present in the canonical and no verified exact source span was established in this reacceptance."
  fluency: "C-01 reacceptance: both final target files were reopened and read source-free after the last edits. English after-the-fact wordplay, the RPG old-lady joke, and several calques were repaired; Japanese opening and late theoretical phrasing were smoothed without importing external lore or published Benjamin wording."
  whole_work: "All three images, eight prose paragraphs, Witcher/Bolaño names, everyday-time/rupture terminology, and the Benjamin relay remain consistent across both targets; English and Japanese title-break concatenation invariants are exact."
  rendered: "Final isolated local preview: EN and JA candidate routes returned HTTP 200. Desktop 1440x1000 and mobile 390x844 were visually and structurally checked with no horizontal overflow; all three lazy-loaded images settled and loaded at 720x405, 720x391, and 720x405; no source footnotes or in-article links are present in the canonical and none were invented; Chinese/EN/JA navigation was visible and EN→JA was clicked successfully; no process-note markers were found."
---

## Research log

- Source classification: canonical credits only `post_author: 斑鸠`, declares CC BY-NC-SA 4.0, and names no translator or external article source. It is therefore a Chinese original, not a translation requiring a hidden foreign-language base.
- Query: official *The Witcher 3: Wild Hunt* title/character terminology. CD PROJEKT RED official page confirms the game title, Geralt, Ciri, the Wild Hunt, and Geralt's witcher/monster-slayer role.
- Query: Roberto Bolaño `The Savage Detectives` / Arturo Belano. Penguin Random House confirms the established English title and character spelling.
- Query: ボラーニョ `野生の探偵たち`. C-01 correction: the prior dossier pointed at an unrelated Shinchosha book page. Hakusuisha publisher records for `野生の探偵たち（上）` (`b206354`) and `野生の探偵たち（下）` (`b206355`) directly confirm the established Japanese title and Bolaño authorship.
- Benjamin quotation: identified as a Chinese relay of the “weak messianic power” passage from Benjamin, but the Roof canonical gives no edition, translator, page/section locator, or source-language wording, and its quoted span is excerpted. C-01 did not establish an exact original-language span tied to the canonical quotation. Targets therefore translate the Roof Chinese quotation as relay rather than borrowing a familiar published English/Japanese wording or fabricating a source-language restoration.
- Opening anchor: first sentence beginning `《巫师3》前期的游玩体验给人的感觉是迟缓`.
- Closing anchor: final sentence `这正是一切革命诞生的方式。`.
- Coverage: exact Roof body only; no game-lore expansion and no omitted Benjamin material is added.

## Discourse map

- Thesis: *The Witcher 3* turns its much-remarked slowness into a temporal structure in which Geralt's detective-like excavation of private histories can transform repetitive everyday time into a time of rupture and redemption.
- Movement: gameplay slowness → everyday time versus ruptural time → witcher work as investigation → Geralt as a Bolaño-like “savage detective” of disappearing private histories → side quests as interventions in NPCs' stalled lives → Bloody Baron as example → Benjamin's weak messianic power → literature/art as trace-following that can reopen the past toward the future → revolution.
- Major qualification: the author acknowledges that quest-giving/waiting is an RPG convention; the claim is not that *The Witcher 3* invented it, but that some of its quests expose a special possibility of rupture within that convention.
- Ending function: apparent powerlessness of the detective, literature, and art becomes a form of power through sincere excavation and retelling.

## Voice card

- Genre/register: compact game criticism moving into literary-philosophical argument; essayistic rather than academic, with long accumulating sentences and occasional colloquial jokes.
- Preserve game-player idiom early (`女儿都要出事了...打昆特牌`, nested A/B/C quest structure) and allow the prose to become denser around Benjamin and revolution.
- First person remains visible in argumentative pivots (`我想谈谈`, `在我看来`, `我的意思是`).
- English: use “slowness,” “everyday time,” and “time of rupture” consistently; keep “Savage Detective” capitalized only when it is clearly the Bolaño title/allusion.
- Japanese: contemporary critical prose in である style; use `遅さ`, `日常の時間`, `断絶の時間` as the central temporal pair, while retaining colloquial game vocabulary where the source loosens.

## Glossary

| source | en | ja | status | notes |
| --- | --- | --- | --- | --- |
| 《巫师3》 | *The Witcher 3: Wild Hunt* / *The Witcher 3* | 『ウィッチャー3 ワイルドハント』／『ウィッチャー3』 | accepted | Official English title verified; Japanese conventional franchise form. |
| 猎魔人 | witcher | ウィッチャー | accepted | CDPR official English role term. |
| 杰洛特 | Geralt | ゲラルト | accepted | Character. |
| 希里 | Ciri | シリ | accepted | Character. |
| 狂猎 | Wild Hunt | ワイルドハント | accepted | Group/force in game. |
| 昆特牌 | Gwent | グウェント | accepted | In-game card game. |
| 荒野侦探 | savage detective | 野生の探偵 | accepted | Deliberate allusion to Bolaño title; lower-case as role, title case/italics for book. |
| 《荒野侦探》 | *The Savage Detectives* | 『野生の探偵たち』 | accepted | Established EN/JA titles verified. |
| 阿图罗·贝拉诺 | Arturo Belano | アルトゥーロ・ベラーノ | accepted | Bolaño character. |
| 日常的时间 | everyday time | 日常の時間 | accepted | Central analytical pair. |
| 剧变的时间 | time of rupture | 断絶の時間 | accepted | Chosen to keep the essay's sudden-break/revolutionary force rather than merely “rapid change.” |
| 血腥男爵 | Bloody Baron | 血まみれ男爵 | accepted | Game character/quest shorthand. |
| 弱/孱弱的救世权柄 | weak messianic power | 弱いメシア的な力 | accepted | Benjamin relay; translate from Roof Chinese, not an established target-language edition. |

## Source discrepancies and routing decisions

- The title's `荒野侦探` is not generic “wilderness detective” in target languages: the body explicitly names Bolaño and Arturo Belano, so targets preserve the allusion through *The Savage Detectives* / 『野生の探偵たち』 terminology.
- The Benjamin quotation has no edition, translator, footnote, or source-language wording in Roof. Because English/Japanese are third languages relative to German, relay translation from the canonical Chinese is permitted and is explicitly documented; it is not presented as a published Benjamin translation.
- No external lore is used to “correct” the author's simplified descriptions of side quests or the Bloody Baron. Official game sources are terminology checks only.

## Review evidence

- Protected structure: eleven logical blocks, including three images and eight prose paragraphs; no headings or standalone blockquotes.
- High-risk facts: Ciri as daughter figure; everyday/rupture distinction; Geralt's investigative senses; Bolaño/Arturo Belano comparison; old friends helping against Wild Hunt; Bloody Baron domestic violence/miscarried child/reburial; Benjamin quotation; final literature/revolution claim.


## English translator self-review

- Pass 1, bilingual fidelity: all eleven logical blocks were compared in sequence. Checked the A/B/C nested-quest joke, Ciri/Gwent complaint, everyday time versus rupture, Geralt's intervention into private histories, the Bolaño comparison, the RPG-convention qualification, Bloody Baron causality, Benjamin quotation, mechanistic-time argument, and final revolution claim.
- Intertext revision: title uses `Savage Detective`, not `Wilderness Detective`, because the body explicitly invokes Roberto Bolaño and Arturo Belano; *The Savage Detectives* is the established English title.
- Relay fidelity: `the past lays claim to that power` → `this power belongs to the past`. The former drifted toward a familiar German/English formulation; Roof's Chinese relay says `这个权柄属于过去`, so the target follows the canonical relay.
- Relay/quest fidelity: `rebury the dead infant` → `bury the abandoned infant`; the later Chinese paragraph says `埋葬弃婴`, while the earlier paragraph separately contains the “reburial” formulation.
- Fluency revision: `the first half of a life spent far from home` → `a first half of life spent displaced from home`; preserves `背井离乡` rather than merely geographic distance.
- Fluency revision: `acquire a future` → `have a future`; the argument remains that historical reckoning releases the Baron from stopped time, without a Chinese-shaped collocation.
- Metadata revision: excerpt removed an unverified romanization of 斑鸠 and uses `this essay`; contributor naming is not invented.
- Pass 2, source-free fluency: reread the essay as criticism. Early RPG jokes retain plain diction; the middle uses `savage detective` and `time of rupture` consistently; the Benjamin/revolution section is denser but not converted into academic jargon beyond the source.
- Pass 3, whole-work consistency: verified *The Witcher 3: Wild Hunt*, Geralt, Ciri, Gwent, Wild Hunt, Bloody Baron, *The Savage Detectives*, Arturo Belano, `everyday time`, `time of rupture`, `redemption`, and `weak messianic power` across title, excerpt, body, and conclusion.
- C-01 final corrections: repaired the title-break concatenation invariant; restored `扶老奶奶过马路` without the inserted `metaphorically`; preserved the source’s `事后无力／事后有力` contrast as powerlessness in coming after the fact versus redemptive power still available to action after the fact; rendered `众多时代中那短暂的人` as `the countless fleeting lives of his age`; and made the Benjamin wording a fresh relay from Roof Chinese (`temporal sign`, `weak messianic power`) rather than a simulation of an established English translation. The complete final English file was then reopened and reread source-free.

## Japanese translator self-review

- Pass 1, bilingual fidelity: checked all eleven logical blocks against Chinese, including all three image positions and the causal sequence of the Bloody Baron discussion. No game-lore material was added beyond the source.
- Intertext revision: `野生の探偵` / 『野生の探偵たち』 preserves the Bolaño allusion using the established Japanese book title rather than translating `荒野` literally as a generic wilderness label.
- Relay fidelity: `過去はその力に権利をもっている` → `その力は過去に属している`, following Roof's Chinese wording instead of importing a familiar Japanese rendering of Benjamin's German.
- Fidelity revision: `死んだ乳児を葬る` → `遺棄された乳児を葬る` for source `弃婴` in the later Bloody Baron paragraph.
- Voice revision: final `悪の追随者` → `悪に唱和するもの`, which better preserves `恶的应声虫` as echo/accord rather than turning it into simple ideological following.
- Pass 2, source-free fluency: reread in である style, retaining colloquial player language (`グウェントまでしている`, RPG quest shorthand) before allowing the prose to tighten around `日常の時間／断絶の時間`, `救済`, and revolution.
- Pass 3, whole-work consistency: verified 『ウィッチャー3』, ゲラルト, シリ, ワイルドハント, 血まみれ男爵, 『野生の探偵たち』, アルトゥーロ・ベラーノ, `日常の時間`, `断絶の時間`, `弱いメシア的な力`, and all image captions.
- C-01 final corrections: opening `脇道へうまく没入させ` was replaced with natural `脇道に夢中にさせ`; the historian jibe now follows `已发生事件的跟屁虫` without the narrower `既成事実`; `意想不到的改变性元素` is rendered as `思いがけず変化をもたらす要素`. The complete final Japanese file was reopened and reread source-free.

## C-01 rendered-page reacceptance (2026-08-19)

- Routes: `/en/posts/witcher-wilderness-detective` and `/ja/posts/witcher-wilderness-detective`, served from the exact candidate target files in the detached editorial-preview harness.
- Viewports: desktop `1440x1000`; mobile `390x844`. Both locales had root/body widths within their viewport and no horizontal overflow. Top, all three image positions, and end-of-article views were captured; mobile and settled desktop image views were visually inspected.
- EN: HTTP 200, `html[lang=en]`, 9,419 article-text characters, no headings, zero source footnotes, no canonical in-article links, and no process-marker hits. Three images loaded after lazy-load settlement at `720x405`, `720x391`, `720x405`.
- JA: HTTP 200, `html[lang=ja]`, 4,054 article-text characters, no headings, zero source footnotes, no canonical in-article links, and no process-marker hits. The same three images loaded at `720x405`, `720x391`, `720x405`.
- Language navigation: Chinese / EN / 日 controls were visible; EN→JA was exercised by click and landed on the correct JA route with `html[lang=ja]`; the reciprocal EN link was present.
- Review-status editions correctly emitted no published-edition `hreflang` alternates. Visible translation credits remained full-work credits, which is accurate for this Chinese-original/direct-translation candidate.
- Environment note: direct route generation in the specified main worktree remains blocked by the candidate-external `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` title-break invariant. No candidate-external target was modified; the detached harness uses disposable normalization only to make route-level inspection possible.
- Candidate result: no known translation, source-routing, image, navigation, credit, or responsive-layout defect remains in the two candidate editions.

## Gate evidence

- C-01 final direct structure audit, EN: zero failures; one inspected Arabic-number localization warning.
- C-01 final direct structure audit, JA: passed with zero warnings.
- `npm run verify:translations` after the final C-01 candidate-4 target/dossier update: passed (16 editions; 11 repository-wide numeric-token warnings inspected by the gate).
- C-01 batch gate sweep after all five ordered candidates: `validate:content`, `validate:media-html`, `verify:wechat-assets-ready`, `audit:tags`, `verify:structured-credits`, `verify:license-placement`, `verify:typography`, `verify:typography-registry`, `verify:book-capabilities`, `verify:reading-progress`, `verify:han-script`, `verify:citations`, `verify:translations`, `verify:internal-links`, `verify:routing`, `verify:library`, `typecheck`, `lint`, and `git diff --check` passed.
- Repository-wide prerequisites outside this batch keep the aggregate gates from being green: `audit:roof-archive` lacks ignored `.local-archive/bilibili-raw/source-archive/articles`; `verify:preservation` lacks untracked/external `editorial-sources/preservation-manifest.json`; `npm run check` stops at `verify:wechat-preservation` because ignored `.local-archive/wechat-full/articles` is absent; `verify:fonts` reports a stale Japanese corpus inventory and the same failure was reproduced on clean `HEAD`; `npm run build` compiles and typechecks, then fails page-data collection on the untouched candidate-external `source/_translations/ja/posts/furukawa-tomohiro-interview-1-saint-seiya-style.md` title-break invariant, which is already false on `HEAD`. No out-of-scope file was changed to force these gates green.

## Gate-driven metadata correction

- Production build rejected both target files because `format: review` did not preserve the canonical post format. Both English and Japanese front matters were corrected `format: review` → `format: article`. This is a source-metadata fidelity correction; body translation and structure are unchanged.
