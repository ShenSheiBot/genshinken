---
work_id: anime-hair-color-personality-quantitative-analysis
source_type: post
source_slug: anime-hair-color-personality-quantitative-analysis
slug: anime-hair-color-personality-quantitative-analysis
language: en
status: review
title: "Blond Tsunderes? Pink-Haired Yanderes? A Quantitative Analysis of Hair Color and Personality in Japanese Anime"
title_breaks: ["Blond Tsunderes?", "Pink-Haired Yanderes?", "A Quantitative Analysis of Hair Color and Personality in Japanese Anime"]
excerpt: "Using data on Japanese anime characters from 2000 to 2021, this study applies frequency analysis, network analysis, and TF-IDF to examine associations between hair color and personality traits."
credits:
  - role: translator
    contributor_id: shen-shui-bot
    scope: complete work
  - role: reviewer
    contributor_id: shen-shui-bot
    scope: complete work
translation_method: agent
source_relationship: direct
base_language: zh-Hans
updated: 2026-08-28
rights: CC BY-NC-SA 4.0
format: article
---

[author] Sairai

![Portrait of Sairai](attachments/roof-archive/cv21792051/01-author-portrait-v5.png "=25%")

[author-bio] “We spend much of our time guarding great things, until we touch every idea and change the lives those ideas touch.”

This essay was an After Festival prizewinner in Lab on Roof’s Rags Drum 2022 annual call for submissions.

![A purple-tinted portrait of Yuno Gasai from *The Future Diary*](/attachments/roof-archive/cv21792051/5.jpg "=50%")

## Abstract

In Japanese anime, hair color and personality might ordinarily be expected to vary independently. Yet anime fandom abounds in perceived pairings such as “blond tsundere” and “pink-haired yandere.” This study first uses frequency statistics and network analysis to examine overall co-occurrence patterns between hair colors and keywords for *moe* traits, while noting the limitations of those methods. It then applies TF-IDF in two directions—personality traits conditioned on hair color and hair colors conditioned on personality—and intersects the rankings. Under that descriptive criterion, “blond tsundere” forms a mutually salient pairing, while “pink-haired yandere” does not. The author proposes that creator–audience feedback may reinforce some combinations, whereas a few memorable characters and associations drawn from color psychology may explain others. These explanations are hypotheses rather than causal findings.

Keywords: Japanese anime; frequency analysis; network analysis; text analysis; keyword co-occurrence.

## 1. Introduction

Hair color is widely used in Japanese anime to distinguish characters. This is readily understandable: in works with large casts, remembering every character’s name can be very difficult. Hair color, as a conspicuous physical feature, helps viewers remember a character and discuss them with other fans before they know the work well. In *Lycoris Recoil*, for example, Majima’s face appears relatively infrequently, so viewers may easily forget his name. His green hair is striking, however, and no other green-haired character appears in the series; calling him “Green Hair” therefore creates no obstacle to communication.

From the standpoint of storytelling, we might consequently assume that a character’s hair color is a distinctive feature assigned independently of personality. In the familiar “database” account of character design, after all, hair color and personality can appear to be elements sampled separately from a store of traits.

Yet this conflicts with persistent stereotypes among anime audiences that associate hair color with personality, such as “blond tsundere” and “pink-haired yandere.” Take “blond tsundere”: fans may expect a blond character to be tsundere and, conversely, may picture a blond character when they encounter the trait. This suggests that certain hair colors and personalities might be strongly bound together rather than assigned wholly at random.

Do hair color and personality among Japanese anime characters actually show systematic associations? If so, what might produce them? If not, why do viewers speak as though they exist? This essay uses descriptive quantitative analysis to approach these questions.

## 2. Data Sources and Description

The data come from Moegirlpedia. Using Python, I scraped 2,145 Japanese anime released from 2000 through 2021 and collected 17,353 character records. Here, a “character record” means a collected character occurrence, not a verified unique character. The inclusion rules were: (1) the anime link was valid; (2) the character link was valid; and (3) when an anime released two or more seasons in one year without changing its principal cast, those seasons were counted as one. The publication records no broader deduplication rule for the same character appearing through different anime pages, adaptations, seasons in different years, or other years. The same underlying character may therefore occur in more than one record, and cross-work or cross-year deduplication cannot be recovered from the published account.

After collecting the characters, I gathered each character’s hair color, eye color, and *moe*-trait data, then performed an initial screening and cleaning. The screening rules were: (1) the character had a dedicated and uniquely assigned entry; (2) the character had hair-color data—when two or more hair colors were listed, the first two were collected—or eye-color data, again limited to the first two; and (3) the character had valid *moe* traits.

Because Moegirlpedia uses redirects, *moe*-trait terms had to be normalized, and traits that merely restated hair or eye color had to be removed. Since this study focuses on hair color, it retained only characters with a hair-color attribute; bald characters, who lack such information, were also removed. After this second cleaning, the final sample covered 2000 through 2021 and contained 13,307 character records from 1,325 Japanese anime. It included 13 hair-color categories and 2,145 *moe*-trait tags encompassing personality, appearance, role, identity, and other attributes. The tags are community-generated descriptors, not standardized psychological measures.

### 2.1 Scope and Reproducibility

The published source does not provide its scraper or analysis code, raw or cleaned data, crawl date and Moegirlpedia revision, redirect-normalization list, anime and character sample lists, personality-tag dictionary, or software versions. Nor does it identify the network’s centrality measure or explain how TOP1 ties were handled. The sample counts, formulas, tables, and plotted results can therefore be checked against the article, but the calculations cannot be independently reproduced from the publication alone. The study also reports no significance tests, confidence intervals, robustness checks, or causal design. In this edition, terms such as “association,” “salience,” and “dominant” describe the article's frequency and TF-IDF criteria; they do not mean statistical significance or evidence of creator intent.

## 3. Network and Frequency Methods

### 3.1 Frequency Statistics and Network Construction

This study concerns the relation between hair color and personality traits within the larger set of *moe* traits. I therefore treated hair colors as type-I nodes and *moe* traits as type-II nodes, linked the two types through co-occurrence, and counted the frequency of each kind of node. No links were constructed between nodes of the same type. These are node-occurrence counts in the expanded hair-color–trait data, not counts of unique characters: a character record can contribute multiple trait links and, under the collection rules, as many as two hair colors. This is why the hair-color frequencies in Table 1 can exceed the final sample of 13,307 character records.

The hair-color node frequencies differ enormously. Black hair occurs far more often in the co-occurrence data than brown and blond hair, which in turn occur far more often than the other colors. Rainbow and transparent hair are extremely rare. Frequencies among *moe* traits, by contrast, follow a comparatively smooth distribution.

I next counted the frequencies of individual pairings. Table 2 presents the results.

The hair-color and *moe*-trait co-occurrence frequencies can be used to construct the network in Figure 1. Since the relationships are complex and this study focuses only on the most deeply bound nodes, I processed the co-occurrence network using only the TOP1 algorithm. The published description defines TOP1 only to the following extent: in a given direction, a node retains its highest-frequency co-occurrence with an opposite-type node, and a reciprocal link appears when two nodes select each other. It does not state how equal maxima were retained or broken.

[table] Frequencies of hair colors and selected *moe* traits (top 13)

| Rank | Hair color | Frequency | Selected *moe* trait | Frequency |
| ---: | --- | ---: | --- | ---: |
| 1 | Black | 22,049 | Large breasts | 1,747 |
| 2 | Brown | 15,956 | Short hair | 1,501 |
| 3 | Blond | 15,840 | Tsundere | 1,461 |
| 4 | Silver | 9,643 | Energetic | 1,380 |
| 5 | Blue | 7,655 | Airheaded | 1,072 |
| 6 | Purple | 6,391 | Glasses | 1,049 |
| 7 | Pink | 5,656 | Gap moe | 1,013 |
| 8 | Red | 5,197 | Two-faced | 996 |
| 9 | Green | 3,271 | Younger sister | 992 |
| 10 | Orange | 3,203 | Loli | 991 |
| 11 | White | 1,106 | Flat-chested | 988 |
| 12 | Rainbow | 48 | Gentle | 987 |
| 13 | Transparent | 6 | Older sister | 982 |

[table] Hair-color and *moe*-trait co-occurrence frequencies (top 10)

| Rank | Hair color | *Moe* trait | Co-occurrences |
| ---: | --- | --- | ---: |
| 1 | Black | Long, straight black hair | 459 |
| 2 | Brown | Short hair | 375 |
| 3 | Black | Short hair | 360 |
| 4 | Black | Tsundere | 333 |
| 5 | Black | Large breasts | 331 |
| 6 | Blond | Blond hair and blue eyes | 324 |
| 7 | Brown | Large breasts | 317 |
| 8 | Blond | Large breasts | 303 |
| 9 | Brown | Energetic | 299 |
| 9 | Black | Glasses | 299 |

[fig] Figure 1. Hair-color–*moe*-trait co-occurrence network (TOP1 algorithm).

![Network graph in which large red hair-color hubs connect to many small blue moe-trait nodes; area encodes an unspecified centrality measure and TOP1 links retain the strongest co-occurrence direction](/attachments/roof-archive/cv21792051/36.jpg "=100%")

Red nodes represent hair colors and blue nodes represent *moe* traits; nodes with higher centrality occupy a larger area. The archived article does not identify which centrality measure was used, so relative node areas must not be interpreted quantitatively. At the archived image’s 640-pixel resolution, the dense Chinese node labels are not legible enough to localize reliably; Figure 1 preserves the network’s topology and color encoding, while Tables 1 and 2 supply the named frequencies and high-frequency pairings used in the discussion. The graph reveals a pronounced community structure. More frequent hair-color nodes visibly have more *moe*-trait neighbors, a descriptive positive association in this network; the article reports no correlation coefficient or significance test. Some hair colors and traits also have bidirectional links: each is the other's most frequent co-occurrence. At the network level, this gives the study an operational sign that some hair colors and *moe* traits are more tightly paired than others.

### 3.2 Limitations of Frequency Statistics

Frequency statistics have the advantage of being simple and clear when studying co-occurrence, but the results in Section 3.1 expose several problems.

First, comparing Tables 1 and 2 shows that black, brown, and blond hair occur so frequently that their links with other traits also dominate the top 10 co-occurrences. The first pairing involving none of these three colors appears only around the top 40. Large breasts, short hair, and tsundere likewise enter the top 10 because they are frequent traits.

Second, consider the black hair–large breasts relation (331 instances) and the brown hair–large breasts relation (317 instances) in Table 2. By raw frequency, the black-hair pairing appears stronger. Yet black hair occurs at roughly 138 percent the frequency of brown hair, while its link here is only about 4 percent more frequent. That hardly demonstrates greater relative salience for the trait. Conversely, the relatively infrequent traits “long, straight black hair” and “blond hair and blue eyes” have exceptionally high co-occurrence counts. The method therefore confronts a trade-off between strong nodes with weak relative relations and weak nodes with strong relative relations.

Finally, the network shows some trait nodes linked to two hair-color nodes. For such a trait, node A may have its highest-frequency co-occurrence with the trait, while the trait may simultaneously be node B’s highest-frequency co-occurrence. This produces the same dilemma of selection described above. In short, raw frequency is not an ideal measure of co-occurrence because the result is confounded by the frequencies of the terms themselves.

## 4. TF-IDF Feature Extraction

### 4.1 Introduction to TF-IDF

Zipf’s law states that a word’s frequency is inversely proportional to its rank. As the limitations discussed in Section 3 show, a frequent word is not necessarily a keyword. To extract keywords more effectively, this study uses TF-IDF, a standard algorithm in text analysis. TF denotes term frequency, while IDF denotes inverse document frequency. The fewer documents contain a term, the better it distinguishes among categories and the higher its IDF value. The formula is shown below.

[fig] TF-IDF formula.

$$
\begin{aligned}
\mathrm{TF} &= \frac{n}{\mathrm{total}}, \\
\mathrm{IDF} &= \ln\!\left(\frac{N}{n_t}\right), \\
\mathrm{TF\!\text{-}\!IDF} &= \mathrm{TF}\times\mathrm{IDF}.
\end{aligned}
$$

Here, $n$ is the frequency of trait $t$ within the records satisfying the condition, and $\mathrm{total}$ is the total number of trait tokens in those records. For this application, each character record functions like a document: $N$ is the total number of character records in the comparison corpus, and $n_t$ is the number of character records carrying trait $t$. A larger TF-IDF value means that the term is more salient under this operationalization; it is not a probability, effect size, or significance statistic.

### 4.2 Data Filtering

On the basis of the frequency statistics in Section 3, I removed low-frequency nodes to simplify the analysis. Among hair colors, I removed the infrequent rainbow and transparent nodes, leaving 11. Among *moe* traits, I removed nodes with frequencies below 100, leaving 222.

### 4.3 Personality TF-IDF by Hair Color

Taking hair color as the condition, I calculated TF-IDF values for co-occurring *moe* traits. After retaining personality-related traits, the top-10 rankings are shown in Figure 2.

[fig] Figure 2, part 1. Top-10 TF-IDF values for personalities associated with each hair color.

![English-labeled bar charts ranking the ten personality traits with the highest TF-IDF values for white, orange, and pink hair; madness is especially prominent for white hair, while energetic and airheaded lead for orange and pink hair](/attachments/roof-archive/cv21792051/translations/en/58-personality-by-hair.png "=100%")

[fig] Figure 2, part 2. Top-10 TF-IDF values for personalities associated with each hair color.

![English-labeled bar charts ranking the ten personality traits with the highest TF-IDF values for black, red, and blond hair; tsundere ranks first for each, with energetic especially prominent for red and blond hair](/attachments/roof-archive/cv21792051/translations/en/60-personality-by-hair.png "=100%")

[fig] Figure 2, part 3. Top-10 TF-IDF values for personalities associated with each hair color.

![English-labeled bar charts ranking the ten personality traits with the highest TF-IDF values for blue, green, and silver hair; green hair is led by energetic, while silver hair includes the Chinese-fandom sanwu category and the ice-beauty archetype](/attachments/roof-archive/cv21792051/translations/en/62-personality-by-hair.png "=100%")

[fig] Figure 2, part 4. Top-10 TF-IDF values for personalities associated with each hair color.

![English-labeled bar charts ranking the ten personality traits with the highest TF-IDF values for purple and brown hair; purple hair is led by tsundere and two-faced traits, while brown hair is led by energetic and gentle traits](/attachments/roof-archive/cv21792051/translations/en/64-personality-by-hair.png "=100%")

Conditioning on hair color is this study’s proxy for an audience-side question: given a visible hair color, which personality tags are most distinctive in the data? It does not use audience surveys or perception data. TF-IDF makes some traits especially salient under that conditioning. Among white-haired characters, for example, the value for “madness” exceeds 0.1, even though both white hair and madness have low raw frequencies. The results also resemble familiar stereotypes: silver hair is associated with what Chinese anime fandom calls the *sanwu* archetype—taciturn, expressionless, and emotionally unreadable—while red hair is associated with energetic characters.

At the same time, traits such as tsundere and energetic rank relatively high for most hair colors because they are themselves common, even though their TF-IDF values vary across colors. Selecting personality solely on the condition of hair color therefore retains limited explanatory power.

### 4.4 Hair Color by Personality

I next reverse the conditioning as a proxy for a creator-side design question: given a personality tag, which hair colors are most distinctive in the data? This is an analytical perspective, not direct evidence about creators’ decisions. Because there are many personality traits, I retained only those for which the difference between the first- and second-ranked hair colors exceeded 0.05. That is the author’s descriptive cutoff for a distinctly dominant first-ranked color, not a statistical-significance threshold. Figure 3 presents the five highest-ranked hair colors for each retained personality.

[fig] Figure 3. Top-five TF-IDF values for hair colors associated with each personality ($\mathrm{TF\text{-}IDF}(T_1)-\mathrm{TF\text{-}IDF}(T_2)>0.05$).

![English-labeled small-multiple charts showing the five hair colors with the highest TF-IDF values for each retained personality; examples include purple for masochistic, black for ice beauty, blond for hapless, and silver for sanwu](/attachments/roof-archive/cv21792051/translations/en/73-hair-by-personality-v2.png "=100%")

Read through this creator-side proxy, the top-ranked hair color for each personality echoes some of the stereotypes observed in Section 4.3, such as the “sweet and naïve” image of brown-haired characters.

Yet selecting hair-color nodes on personality alone still offers limited explanatory power.

### 4.5 Cross-Analysis

To establish the pairings more securely, I intersected the rankings from Sections 4.3 and 4.4. Table 3 presents the result. To simplify it, the personality-to-hair-color side retains only its top two features.

[table] Intersection of hair color to personality (top 10) and personality to hair color (top 2)

| Result | Co-occurring groups |
| --- | --- |
| Intersection | Black: Yamato nadeshiko, gentle, ice beauty, tsundere, gap moe<br>Brown: gentle, healing type, airheaded, timid<br>Blond: airheaded, tsundere<br>Silver: *sanwu*, naturally cute<br>Blue: ice beauty, kindhearted, gap moe<br>Purple: masochistic, earnest<br>White: madness |
| Hair color → personality only | Black: two-faced, airheaded, wisecracker, energetic, taciturn<br>Brown: energetic, tsundere, gap moe, two-faced, wisecracker, fool<br>Blond: energetic, two-faced, gentle, gap moe, sharp-tongued, gentlemanly, fool, strong-willed<br>Silver: tsundere, gap moe, two-faced, taciturn, airheaded, gentle, sharp-tongued, ice beauty<br>Blue: tsundere, two-faced, energetic, gentle, airheaded, wisecracker, queenly<br>Purple: tsundere, two-faced, gap moe, airheaded, energetic, sadistic, gentle, chūnibyō<br>Pink: energetic, airheaded, two-faced, tsundere, gentle, little-devil type, healing type, fool, sharp-tongued, gap moe<br>Red: tsundere, energetic, strong-willed, airheaded, gentle, gap moe, fool, sharp-tongued, wisecracker, gentlemanly<br>Green: energetic, airheaded, gap moe, tsundere, two-faced, clumsy, wisecracker, healing type, sharp-tongued, shy<br>Orange: energetic, airheaded, fool, gentle, tsundere, gap moe, wisecracker, healing type, sharp-tongued, “little angel”<br>White: “little angel,” two-faced, gap moe, airheaded, tsundere, gentle, chūnibyō, Yamato nadeshiko, “difficulty” (literal source tag) |
| Personality → hair color only | Black: *sanwu*, shy, kuudere, earnest, kindhearted, timid<br>Brown: losing heroine, naturally devious, shy, slow on the uptake, naturally cute, “little angel”<br>Blond: losing heroine, hapless, healing type, slow on the uptake, “little angel”<br>Blue: split personality, naturally devious<br>Purple: Yamato nadeshiko<br>Red: madness<br>Orange: hapless |

The intersecting pairs overlap strongly with stereotypes commonly circulated in anime fandom. The “blond tsundere” mentioned at the beginning appears in both directional rankings, so it meets this study’s criterion for a mutually salient pairing. “Pink-haired yandere,” however, does not appear in the union of the two sets.

## 5. Analysis of Causes and Conclusion

### 5.1 Why “Blond Tsundere” Pairings Arise

The analysis above shows descriptive associations between Japanese anime characters’ hair colors and personality tags, broadly matching some impressions accumulated within anime fandom over many years. We may now ask what might produce these associations.

The author’s first proposed mechanism begins with the finite repertoire of hair colors and *moe* traits. After nearly half a century of anime production, it is difficult to claim that any pairing of hair color and trait has never appeared. Invoking Hiroki Azuma’s database model, the essay treats contemporary characters as combinations assembled from a shared store of recognizable elements. Common hair colors and popular personality traits are especially few relative to the total number of characters, so familiar stereotyped combinations are likely to recur. The present data do not test this theory.

On this account, commercial production rewards quickly legible combinations. Creators need characters who can be produced within practical limits yet remain distinct enough to be remembered, and a cluster of *moe* traits offers one economical solution. The essay also proposes an audience-side demand for characters who stand out within a single work even if their components are familiar across many works. Its metaphor is “fast-food” viewing: audiences under pressure for time may favor traits immediately legible in appearance, speech, and behavior over characterization that unfolds slowly through a story. If creators and audiences reinforce this arrangement, database-driven design becomes more common and produces still more combinations. These are interpretive hypotheses; the dataset measures tags, not production budgets, attention, or audience preferences.

The author’s next hypothesis asks why fixed pairings such as “blond tsundere” proliferate. A combination may begin with a more or less contingent character design; if the work becomes enormously successful, that character can leave a deep impression on audiences and other creators. Because the historical origin is difficult to establish, the essay offers Eri Sawachika from *School Rumble* as a provisional example, not as the proven first blond tsundere. Later creators thinking about similar characters might recall Eri and reproduce attributes such as blond hair and twin tails. The author describes this as a self-fulfilling prophecy: one successful character could establish an association that makes later examples more noticeable while counterexamples fade into the background. The analysis itself supplies both kinds of evidence. Blond hair is also salient for “hapless” and “losing heroine,” and many black- and brown-haired characters carry the tsundere tag. Yet later blond, tsundere, and often twin-tailed examples—including Nagi Sanzenin, Airi Akitsuki, and Eriri Spencer Sawamura—could reinforce the more familiar association.

[fig] “Blond, tsundere, twin tails.”

![Eriri Spencer Sawamura with blond twin tails in “Blooming Lily” artwork](/attachments/roof-archive/cv21792051/93.jpg "=50%")

The proposed feedback loop would also require audience uptake. The essay points to the circulating joke that “Chinese viewers are all fans of white-haired characters” as anecdotal evidence, not survey data. With celebrated precedents already before them, viewers may be more willing to try a work when they see a similar character. The same memory mechanism could operate on the audience side: among an ever-growing number of characters, a few famous examples remain easiest to recall. Remembering a trait through one such character links it to that character’s other features. Further examples with the same two or three traits deepen the impression, while occasional counterexamples may do little to weaken it. In this account, blond hair, tsundere, twin tails, and similar traits eventually settle into a shared stereotype.

### 5.2 Why “Pink-Haired Yandere” Pairings Arise

Sometimes, however, collective impressions among audiences may be skewed by memorable examples. Consider the relation between pink hair and yandere. Over the past decade, viewers have often perceived these two attributes as bound together. In this analysis, however, pink hair has a low overall frequency, and energetic and airheaded rank above yandere among its associated traits. As in the previous section, the impression may stem from a single exceptionally successful character: Yuno Gasai in *The Future Diary*. The success of Yuno’s characterization made the relatively niche yandere trait widely familiar, while reaction images and memes circulated extensively through fandom. Yuno became virtually synonymous with yandere, and pink hair became associated with it in turn. Later characters who fit the pattern, such as Satō Matsuzaka from *Happy Sugar Life* and Kisara from *Engage Kiss*, reinforced the impression, but the pairing does not meet this study’s bidirectional TF-IDF criterion.

[fig] Yuno Gasai.

![Illustration of Yuno Gasai](/attachments/roof-archive/cv21792051/100.jpg "=50%")

The author also offers color psychology as a possible interpretation; the study does not test viewers’ color associations. Silver, for instance, can give a cold impression, matching the aloofness associated with the *sanwu* category; red evokes fiery passion, and energetic is salient among red-haired characters. Pink can read as cute, and many of the traits most salient for pink-haired characters are likewise cute. Yet pink hair is also associated here with scheming or two-faced personalities—the fandom saying “pink turns black”—and with the “pink-haired yandere” discussed above. Such designs may seek the appeal of contrast: pink’s cuteness sets off the darkness behind it. The turn can surprise viewers while giving the character greater depth. This distinctive, almost deceptive contrast may have helped the pairing circulate.

Producing this contrast, however, places great demands on plot and character design; mishandled, it can easily make viewers dislike the character. Yandere is therefore not a commonly used *moe* trait in character creation. If a creator can write an excellent story for a yandere, pink hair is no longer necessary: ordinary black or brown hair can serve the character just as well.

In conclusion, the author interprets the results as two kinds of relationship. First, pairings that appear in both directional analyses may reflect a shared convention between creators and audiences. Second, pairings salient only in audience discourse may be memory-driven impressions without a matching design-side tendency in this dataset. Because the study observes character tags rather than creators’ decisions or viewers’ perceptions, these remain proposed explanations rather than direct measurements of either side.
