---
work_id: monogatari-kaiki-speech-self-deception
translation_group: monogatari-kaiki-speech-self-deception
publication:
  decision: local-preview
targets:
  - language: en
    path: source/_translations/en/books/monogatari-series-essays/kaiki-speech-fracture-self-deception.md
    route: /en/books/monogatari-series-essays/chapters/kaiki-speech-fracture-self-deception
    status: review
  - language: ja
    path: source/_translations/ja/books/monogatari-series-ronko/kaiki-gensetsu-hasai-jiko-giman.md
    route: /ja/books/monogatari-series-ronko/chapters/kaiki-gensetsu-hasai-jiko-giman
    status: review
sources:
  - id: roof-book-chapter-zh
    language: zh-Hans
    path: source/_posts/monogatari-love-deishu-kaiki-speech-fracture-self-deception.md
    source_scope: chapter-translation-payload
    source_anchor: kaiki-speech-self-deception
    revision: sha256:6985f5562397f313a9cf1ab22f38bdf4a63601454b214167a4dda42260b86ae4
    title: 物语/爱恋/贝木泥舟：言说/破碎/自我欺诈
    author: 一只非0的O
    coverage: Complete first chapter, four numbered sections, editor's note, seven figures, three block quotations, and one footnote.
    rights_evidence: No chapter-specific license statement is asserted in the source metadata.
    publication_decision: The owner requested a local translated book-chapter reference; no external publication was requested.
segments:
  - id: complete-roof-chapter
    role: roof-original-body
    source_language: zh-Hans
    base_edition: roof-book-chapter-zh
    source_revision: sha256:6985f5562397f313a9cf1ab22f38bdf4a63601454b214167a4dda42260b86ae4
    source_locator: Chapter slice beginning after the h2 anchor kaiki-speech-self-deception and ending before the next published chapter anchor.
    roof_presence: complete
    coverage: complete
    relationship: direct
    target_anchor: Complete Markdown body in each target file.
  - id: supplied-japanese-lyrics
    role: quotation
    source_language: ja
    base_edition: text printed in the Roof chapter
    source_locator: Block quotation in section 003.
    roof_presence: Japanese lines followed by a Chinese rendering.
    coverage: eight lyric lines.
    relationship: original-language recovery from the supplied source.
    target_anchor: Section 003 block quotation.
  - id: coleridge-dejection
    role: quotation
    source_language: en
    base_edition: "Samuel Taylor Coleridge, Dejection: An Ode"
    source_locator: Four-line block quotation in section 004.
    roof_presence: Chinese rendering without attribution in the chapter body.
    coverage: four lines.
    relationship: original-language recovery.
    target_anchor: Section 004 block quotation.
assets:
  - id: source-figures
    source: roof-book-chapter-zh
    source_locator: attachments/roof-archive/cv1804388/ figures 01 through 07 in chapter order.
    rights_evidence: Inherited from the Roof source chapter; asset-specific rights are not separately asserted.
    publication_decision: local-preview reference only
reviews:
  fidelity: Independent bilingual final reviews completed for both editions; the Japanese relay quotation is explicitly identified and no unverified back-translation is presented as an original-language quotation.
  fluency: Independent source-free whole-chapter reads completed in English and Japanese; material semantic and idiomatic defects were directly repaired.
  whole_work: Chapter boundaries, title, author, seven figures, three block quotations, editor's note, one footnote, localized book identity, and the untranslated next-chapter relation were checked.
  rendered: Local production preview passed at 1440x1000 and 390x844 for both targets; all seven figures decoded, contents and note links round-tripped, hosted target-language fonts loaded, and no failed requests, console errors, or horizontal overflow occurred.
---

## Discourse map

- Objective: read Deishuu Kaiki's lies not as noise around an objective account but as the privileged evidence of his desire and position inside *Koimonogatari*.
- Movement: truth within lies; Nadeko's fraudulent love and Kaiki's unique ability to reach it; Kaiki's fiction of disinterested adulthood; Senjougahara as the point where his investment becomes visible; the collapse of the genuine/fake opposition; Kaiki's departure as a narrative release.
- Recurrent structures: fraud, position, self-erasure, the empty shrine, genuine/fake, the wall around the heart, departure and death.
- Ending function: the editor's note repeats the chapter's deliberately awkward “probably, indeed” death formula rather than resolving Kaiki's fate.

## Voice card

- Genre and register: fan criticism with psychoanalytic vocabulary, close reading, first-person hypotheses, and occasional colloquial asides.
- Rhythm: extended interpretive paragraphs broken by emphatic questions, bold theses, character images, and three quoted passages.
- English treatment: essayistic and direct; official romanized character names retained; psychoanalytic “the Real” used only where the source's 实在 carries that force.
- Japanese treatment: contemporary criticism in である style; official Japanese names and titles restored; source modesty and polemical emphasis preserved without stiff Chinese syntax.

## Glossary and continuity

| source | en | ja | decision |
| --- | --- | --- | --- |
| 贝木泥舟 | Deishuu Kaiki | 貝木泥舟 | Official character name. |
| 千石抚子 | Nadeko Sengoku | 千石撫子 | Official character name. |
| 战场原黑仪 | Hitagi Senjougahara | 戦場ヶ原ひたぎ | Official character name. |
| 阿良良木历 | Koyomi Araragi | 阿良々木暦 | Official character name. |
| 怪异 | aberration | 怪異 | Retains the series-specific category. |
| 伽蓝之洞 | empty shrine | 伽藍の洞 | Links the Kara no Kyoukai reference to Kaiki's internal emptiness. |
| 真物／伪物 | genuine / fake | 本物／偽物 | Stable conceptual opposition; not reduced to true/false propositions. |
| 实在 | the Real | 現実界 | Psychoanalytic sense in section 004. |

## Protected-structure and source decisions

- The translated chapter excludes the host document's chapter-root h2 because the localized route supplies its own title. The audited source slice uses the same boundary.
- All seven source media URLs remain unchanged and in source order. Alt text is translated without adding visual claims.
- The source's section 003 quotation alternates supplied Japanese lyrics with a Chinese rendering. English keeps the Japanese and adds an English rendering; Japanese keeps the supplied Japanese once rather than duplicating each line.
- The longer dialogue from *Koimonogatari* is rendered from the Roof Chinese text. An exact cited-edition Japanese passage was not established in this bounded review, so the Japanese target uses complete indirect discourse and tells the reader that it is a relay based on the Roof Chinese edition, not a verbatim quotation from the Japanese original.
- The closing four lines were identified as Coleridge's “Dejection: An Ode.” English restores the attested wording; Japanese translates from that English rather than back-translating the Roof Chinese.
- The editor's wordplay around 解脱 and “大约的确” is intentionally not regularized into an unambiguous statement of Kaiki's death.
- The song lyric was checked against the authorized Uta-Net page for 「木枯らしセンティメント」. The Roof source's Japanese line omits `未来`, while its Chinese rendering preserves the meaning; both targets restore the complete final sense and the dossier records the discrepancy rather than silently treating the incomplete line as authoritative.
- The English Coleridge quotation was checked against the University of Toronto Representative Poetry Online text of “Dejection: An Ode,” lines 21–24; the Japanese wording was reviewed from that English source.
- The Japanese first-figure alt uses the attested Japanese title 『汝の症候を楽しめ――ハリウッドVSラカン』. Its localized book excerpt describes only this translated chapter and does not claim that the untranslated second chapter is present.
- Independent English review repaired the lyric's final meaning, the force of `退治`, `空话` as an empty truism, and the logical collapse of a lie once it attains the Real. It also made local rhythm and alt-text repairs without replacing the essay wholesale.
- Independent Japanese review repaired the relay-quotation claim, lyric, established book title, localized book coverage, abstract title wording, and several subject, agency, and collocation errors. Most of the draft remained intact; substantive rewriting was concentrated in the unverified quotation and a small number of key sentences.
- Both targets remain `review`. The owner requested a localhost reference, not publication.

## Verification evidence

- Product-side protected-structure audit: four sections, seven figures, three block quotations, and one footnote are present in both targets; only the inspected `001–004` versus `01–04` number-token warning remains.
- `npm run check` passed after both independent reviews and the multilingual contract repairs.
- Default production build passed with 2,028 static pages. Hidden review book routes do not leak into production language links.
- Local preview build passed with 2,032 static pages. Both chapter routes returned HTTP 200 with server-rendered `html lang`, localized skip links and JSON-LD.
- Contents links and the footnote reference/backreference were exercised in Chromium. Seven CDN figures decoded in both languages, normal entry motion ran, reduced-motion produced no animations, and both viewports had no failed requests, console/page errors, or horizontal overflow.
- Japanese body paragraphs computed to the next/font-hosted `Noto Serif JP`; English body paragraphs computed to `Source Serif 4`.

## Quotation and title references

- [Uta-Net: 木枯らしセンティメント](https://www.uta-net.com/song/200198/)
- [University of Toronto RPO: Dejection: An Ode](https://rpo.library.utoronto.ca/content/dejection-ode)
- [Kodansha: 恋物語](https://www.kodansha.co.jp/book/products/0000208906)
- [Rakuten Books: 汝の症候を楽しめ――ハリウッドVSラカン](https://books.rakuten.co.jp/rb/1360608/)

## Serial memory

- This work is chapter 01 of the paused two-chapter book `monogatari-series-articles`.
- Chinese canonical route: `/books/monogatari-series-articles/chapters/kaiki-speech-self-deception`.
- The next Chinese chapter is `nisemonogatari-human-nature-authenticity`; it has not been translated in this pilot.
- Translation routing uses stable `work_id` for the work and language-specific book/chapter slugs for each target.
