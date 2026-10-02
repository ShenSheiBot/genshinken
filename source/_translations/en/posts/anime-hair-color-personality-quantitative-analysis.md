---
title: "Blond Tsundere? Pink-Haired Yandere? A Quantitative Analysis of Associations between Hair Color and Personality in Japanese Anime"
title_breaks: ["Blond Tsundere?", "Pink-Haired Yandere?", "A Quantitative Analysis", "of Associations between", "Hair Color and Personality", "in Japanese Anime"]
date: 2023-02-13
work_id: anime-hair-color-personality-quantitative-analysis
source_type: post
source_slug: anime-hair-color-personality-quantitative-analysis
slug: anime-hair-color-personality-quantitative-analysis
language: en
status: review
categories: [Animation]
section: essay
tags: [Character studies]
author: Sairai
post_author: Sairai
excerpt: "Using Japanese anime character data from 2000–2021, this article applies frequency counts, network analysis, and TF-IDF to test associations between hair color and personality-related moe-elements—and explore what produces them."
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
updated: "2026-08-28"
rights: CC BY-NC-SA 4.0
format: article
citation:
  itemType: blogPost
  citationKey: cv21792051
  date: "2023-02-13"
  url: https://www.bilibili.com/read/cv21792051
  extra: "Submitted by Sairai; prize-winning entry in the Pre-Festival and Post-Festival of Lab on Roof’s annual call for submissions, Rags Drum 2022"
---

[author] Sairai

![Sairai’s avatar](attachments/roof-archive/cv21792051/01-author-portrait-v5.png "=25%")

[author-bio] We spend a great deal of time holding on to great things, until we reach every idea and change the lives it has touched.

This article won a prize in the Post-Festival of Lab on Roof’s annual call for submissions, Rags Drum 2022.

![Anime character illustration in purple tones](/attachments/roof-archive/cv21792051/5.jpg "=50%")

## Abstract

In Japanese anime, we would ordinarily expect hair color and personality to be independent of one another. Yet within fandom, we encounter pairings such as “blond tsundere” and “pink-haired yandere.”[^types] This article first uses term-frequency counts and network analysis to examine the overall pattern of co-occurrence between hair colors and moe-element keywords—character features that elicit the affection or attachment known as *moe*. This approach, however, has certain problems. The article then uses TF-IDF for further data processing and set analysis, examining the key relationships between hair color and personality from the perspectives of audiences and creators respectively. The results confirm most such pairings, including “blond tsundere,” as associations in which each term ranks prominently when the other is taken as the starting point. This may be connected to feedback between creators and audiences that continually reinforces the frequency of these combinations. Some pairings, however, such as “pink-haired yandere,” do not rank among the strong associations. Their emergence may be inseparable from particular successful characters created earlier, and may also have something to do with color psychology.

Keywords: Japanese anime; term-frequency analysis; network analysis; text analysis; keyword co-occurrence.

## 1. Introduction

Hair color is widely used in Japanese anime to identify characters. The reason is easy to understand: remembering every character’s name can be very difficult, especially in a large cast. As a conspicuous physical feature, hair color neatly overcomes the difficulty of remembering a character and discussing them with other fans before we know a work’s cast very well. In *Lycoris Recoil*, for example, Majima has relatively little screen time, so viewers can easily forget his name. But his green hair stands out, and no other green-haired character appears in the series. People can therefore call him “the green-haired guy” without any difficulty making themselves understood.

From the standpoint of storytelling in anime, then, we might naturally assume that hair color, as a physical feature, should be “distinctive,” “random,” and independent within a given work. In other words, a character’s hair color should have no relationship to their personality. After all, in the conventional understanding of the “simulacra database,” hair color and personality should both be drawn through “random sampling.”[^database]

Yet this conflicts with the “stereotypes” that have long circulated among anime audiences, linking hair color and personality in combinations such as “blond tsundere” and “pink-haired yandere.” Take “blond tsundere”: from the audience’s perspective, a blond character is very likely to have a tsundere personality; conversely, a tsundere personality is very likely to belong to a blond character. This would mean that certain hair colors and personalities should be strongly associated, rather than combined entirely at random.

So is there actually a relationship between hair color and personality in Japanese anime characters? If there is, what mechanisms lie behind it? If there is not, why do people say there is? This article uses quantitative analysis to answer these questions.

## 2. Data Sources and Description

Using Moegirl Encyclopedia as its data source, this article collected 17,353 character instances from 2,145 Japanese anime titles released between 2000 and 2021, through a Python scraper. The collection rules were: ① the anime link had to be valid; ② the character link had to be valid; ③ where an anime released two or more seasons in one year without changing its principal cast, these were counted as a single season.

After collecting the characters, their available hair-color, eye-color, and moe-element data were scraped, then subjected to preliminary filtering and cleaning. The filtering rules were: ① the character had to have a separate entry and be unambiguously identified; ② the character had to have hair-color data, with only the first two colors collected if two or more were listed, or eye-color data, with only the first two collected if more than two were listed; ③ the character had to have valid moe-elements.

Because Moegirl Encyclopedia uses redirects, the moe-element labels needed to be standardized, and tags referring solely to hair color or eye color removed. Since this article focuses on hair color, only characters with hair-color information were retained. Bald characters were also removed because they lacked this information. After further cleaning, the final research sample comprised 13,307 character instances from 1,325 Japanese anime titles released between 2000 and 2021, covering 13 hair colors and 2,145 moe-elements, including personality, appearance, identity, and other attributes.

## 3. Network and Frequency Methods

### 3.1 Frequency Counts and Network Construction

This article focuses on the relationship between hair color and personality among the moe-elements. Hair colors were therefore first designated as Class I nodes and moe-elements as Class II nodes, with co-word links established between them and the frequency of each type of node counted. Note that this article does not construct co-word links between nodes of the same class. The frequency counts appear in Table 1.

The counts reveal enormous differences between hair colors. Black-haired characters have a far higher recorded frequency than brown-haired or blond characters, which in turn have far higher frequencies than characters with other hair colors. Rainbow and transparent hair are very rare, with extremely low frequencies. The differences between moe-element frequencies are comparatively gradual.

We then counted how often the pairings occurred. These results appear in Table 2.

The co-word frequencies of hair colors and moe-elements can be used to construct the network in Figure 1. Because the relationships are complex, and this article is concerned only with the strongest associations between nodes, the co-word network was processed using only the TOP1 algorithm. The resulting network appears in Figure 1.

[table] Hair-color and selected moe-element frequencies (top 13).[^frequencies]

| Rank | Hair color | Hair-color frequency | Moe-element (selection) | Moe-element frequency |
| ---: | --- | ---: | --- | ---: |
| 1 | Black | 22,049 | Large breasts | 1,747 |
| 2 | Brown | 15,956 | Short hair | 1,501 |
| 3 | Blond | 15,840 | Tsundere | 1,461 |
| 4 | Silver | 9,643 | Cheerful energy | 1,380 |
| 5 | Blue | 7,655 | Natural airheadedness | 1,072 |
| 6 | Purple | 6,391 | Glasses | 1,049 |
| 7 | Pink | 5,656 | Gap moe[^gap] | 1,013 |
| 8 | Red | 5,197 | Concealed scheming | 996 |
| 9 | Green | 3,271 | Younger sister | 992 |
| 10 | Orange | 3,203 | Loli[^loli] | 991 |
| 11 | White | 1,106 | Flat chest | 988 |
| 12 | Rainbow | 48 | Gentleness | 987 |
| 13 | Transparent | 6 | Older sister | 982 |

[table] Hair-color/moe-element co-word frequencies (top 10).

| Rank | Hair color | Moe-element | Co-word frequency |
| ---: | --- | --- | ---: |
| 1 | Black | Long, straight black hair | 459 |
| 2 | Brown | Short hair | 375 |
| 3 | Black | Short hair | 360 |
| 4 | Black | Tsundere | 333 |
| 5 | Black | Large breasts | 331 |
| 6 | Blond | Blond hair and blue eyes | 324 |
| 7 | Brown | Large breasts | 317 |
| 8 | Blond | Large breasts | 303 |
| 9 | Brown | Cheerful energy | 299 |
| 9 | Black | Glasses | 299 |

[fig] Figure 1: Hair-color/moe-element co-word network (TOP1 algorithm).

![Co-word network of hair colors and moe-elements](/attachments/roof-archive/cv21792051/36.jpg "=100%")

Red nodes represent hair colors and blue nodes represent moe-elements; the greater a node’s centrality, the larger its area in the diagram. The network shows very clear community formation. The more frequently a hair color occurs, the more moe-element nodes connect to it: a positive relationship. Some hair-color and moe-element nodes are linked in both directions, meaning that each is the other’s most frequent co-occurring term. At the level of the overall network, this shows that certain hair colors and moe-elements do indeed have some degree of association.

### 3.2 The Limitations of Frequency Counts

Frequency counts offer a simple, straightforward way to study co-word relationships. Nevertheless, the results in Section 3.1 reveal several problems.

First, comparing Tables 1 and 2 shows that the high frequencies of black, brown, and blond hair also produce relatively high link frequencies between these colors and moe-elements. These three colors occupy the entire top ten; the first pairing involving a different hair color does not appear until the top forty. Likewise, large breasts, short hair, and tsundere all appear in the top ten.

Second, consider the black hair–large breasts pairing, with 331 occurrences, and the brown hair–large breasts pairing, with 317, in Table 2. By frequency, the association with black hair is stronger. Yet black hair’s frequency is approximately 138% of brown hair’s, while the difference between these two links is only about 4%. This does not seem sufficient to establish greater importance in relation to this moe-element. Conversely, the moe-elements “long, straight black hair” and “blond hair and blue eyes” have relatively low frequencies but very strong co-word associations. In short, we face the problem of balancing “strong nodes” with “weak relationships” against “weak nodes” with “strong relationships.”

Finally, the network shows some moe-element nodes linked to two hair-color nodes. In other words, for a given moe-element node, hair-color node A is its most frequent co-occurring term; meanwhile, for hair-color node B, that same moe-element is B’s most frequent co-occurring term. We thus face the same dilemma about which relationship to prioritize. All in all, frequency counts are not a particularly suitable measure of co-word relationships, since frequency itself interferes with the results.

## 4. TF-IDF Feature Extraction

### 4.1 Introducing TF-IDF

Zipf’s law states that a word’s frequency is inversely proportional to its rank. As the limitations discussed in Section 3 indicate, this means that high-frequency words are not necessarily keywords. To extract keywords more effectively, this article adopts TF-IDF, an algorithm commonly used in text analysis. TF stands for term frequency, and IDF for inverse document frequency. IDF indicates that the fewer documents contain a word, the better that word distinguishes between categories, and the higher its IDF value. TF-IDF is calculated as follows:

[fig] TF-IDF formula.

$$
\begin{aligned}
\mathrm{TF} &= \frac{n}{\mathrm{total}}, \\
\mathrm{IDF} &= \ln\!\left(\frac{N}{n_t}\right), \\
\mathrm{TF\!\text{-}\!IDF} &= \mathrm{TF}\times\mathrm{IDF}.
\end{aligned}
$$

Here, $n$ is the term’s frequency, $\mathrm{total}$ is the total number of terms in the text meeting the given condition, $N$ is the total number of fictional characters counted, and $n_t$ is the number of those characters bearing that term.[^formula] The higher the TF-IDF value, the more important the term under the given condition.

### 4.2 Data Filtering

Based on the frequency counts in Section 3, this article removed some unimportant nodes to simplify the analysis. The low-frequency rainbow-hair and transparent-hair nodes were removed, leaving 11 hair-color terms. Moe-element nodes with frequencies below 100 were also removed, leaving 222.

### 4.3 From Hair Color to Personality: TF-IDF Rankings

Taking hair color as the condition, TF-IDF values were calculated for the co-occurring moe-elements. After retaining the personality-related moe-elements, the top ten rankings were as shown in Figure 2:

[fig] [Figure 2 (Part 1)](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/58-faithful-labels.png): Top ten personality-related TF-IDF values for each hair color.

![TF-IDF personality rankings for white, orange, and pink hair](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/58-faithful-labels.png "=100%")

**White hair:** 1. Kuangqi; 2. Little angel; 3. Concealed scheming; 4. Gap moe; 5. Natural airheadedness; 6. Tsundere; 7. Gentleness; 8. Chuunibyou; 9. Yamato nadeshiko; 10. Stone-faced.

**Orange hair:** 1. Cheerful energy; 2. Natural airheadedness; 3. Idiot; 4. Gentleness; 5. Tsundere; 6. Gap moe; 7. Tsukkomi; 8. Soothing presence; 9. Sharp tongue; 10. Little angel.

**Pink hair:** 1. Cheerful energy; 2. Natural airheadedness; 3. Concealed scheming; 4. Tsundere; 5. Gentleness; 6. Little-devil type; 7. Soothing presence; 8. Idiot; 9. Sharp tongue; 10. Gap moe.

[fig] [Figure 2 (Part 2)](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/60-faithful-labels.png): Top ten personality-related TF-IDF values for each hair color.

![TF-IDF personality rankings for black, red, and blond hair](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/60-faithful-labels.png "=100%")

**Black hair:** 1. Tsundere; 2. Gap moe; 3. Concealed scheming; 4. Gentleness; 5. Natural airheadedness; 6. Tsukkomi; 7. Cheerful energy; 8. Icy beauty; 9. Yamato nadeshiko; 10. Taciturnity.

**Red hair:** 1. Tsundere; 2. Cheerful energy; 3. Assertiveness; 4. Natural airheadedness; 5. Gentleness; 6. Gap moe; 7. Idiot; 8. Sharp tongue; 9. Tsukkomi; 10. “Gentleman” (shenshi).

**Blond hair:** 1. Tsundere; 2. Cheerful energy; 3. Concealed scheming; 4. Natural airheadedness; 5. Gentleness; 6. Gap moe; 7. Sharp tongue; 8. “Gentleman” (shenshi); 9. Idiot; 10. Assertiveness.

[fig] [Figure 2 (Part 3)](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/62-faithful-labels.png): Top ten personality-related TF-IDF values for each hair color.

![TF-IDF personality rankings for blue, green, and silver hair](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/62-faithful-labels.png "=100%")

**Blue hair:** 1. Gap moe; 2. Tsundere; 3. Concealed scheming; 4. Cheerful energy; 5. Gentleness; 6. Natural airheadedness; 7. Icy beauty; 8. Too nice for their own good; 9. Tsukkomi; 10. Queenly dominance.

**Green hair:** 1. Cheerful energy; 2. Natural airheadedness; 3. Gap moe; 4. Tsundere; 5. Concealed scheming; 6. Clumsiness; 7. Tsukkomi; 8. Soothing presence; 9. Sharp tongue; 10. Shyness.

**Silver hair:** 1. Tsundere; 2. Gap moe; 3. Concealed scheming; 4. Taciturnity; 5. Natural airheadedness; 6. Gentleness; 7. Sharp tongue; 8. Sanwu; 9. Icy beauty; 10. Natural charm.

[fig] [Figure 2 (Part 4)](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/64-faithful-labels.png): Top ten personality-related TF-IDF values for each hair color.

![TF-IDF personality rankings for purple and brown hair](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/64-faithful-labels.png "=100%")

**Purple hair:** 1. Tsundere; 2. Concealed scheming; 3. Gap moe; 4. Natural airheadedness; 5. Cheerful energy; 6. Earnestness; 7. Sadistic traits (S); 8. Masochistic traits (M); 9. Gentleness; 10. Chuunibyou.

**Brown hair:** 1. Cheerful energy; 2. Gentleness; 3. Natural airheadedness; 4. Tsundere; 5. Gap moe; 6. Concealed scheming; 7. Tsukkomi; 8. Soothing presence; 9. Timidity; 10. Idiot.

Calculating with hair color as the condition simulates the process by which viewers, on seeing a character’s hair color, rank the personalities that character might have in order of importance. Extracting TF-IDF values brings the importance of certain moe-elements to the fore. Among white-haired characters, for example, the TF-IDF value for *kuangqi* (狂气)—wild, overbearing intensity that may be menacing or violent—exceeds 0.1, whereas both white hair and kuangqi had relatively low term frequencies. Certain hair colors also reveal recognizable stereotypes: silver-haired characters tend toward the cold reserve of the *sanwu* (三无) type, characterized by little speech, little facial expression, and little outward display of feeling; red-haired characters, meanwhile, tend to be full of energy.

We can also see, however, that personality-related moe-elements such as tsundere and cheerful energy remain relatively important for most hair colors because their own frequencies are high, even though their TF-IDF values differ from color to color. Selecting personalities on the basis of hair color alone therefore falls somewhat short in explanatory power.

### 4.4 From Personality to Hair Color

Next comes analysis from the creator’s perspective: the process of assigning a hair color to a character whose personality has been established. Taking personality-related moe-elements as the condition, TF-IDF values were calculated for the co-occurring hair colors. Because there are many personality-related moe-elements, the analysis retained only those for which the difference between the first- and second-ranked hair colors’ TF-IDF values exceeded 0.05—that is, those for which the leading hair color stood out markedly. The top five rankings appear in Figure 3, where the colors represent the most important hair color for each personality.

[fig] [Figure 3](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/73-faithful-labels.png): Top five hair colors ranked by TF-IDF for each personality-related moe-element, where $\mathrm{TF\text{-}IDF}(T_1)-\mathrm{TF\text{-}IDF}(T_2)>0.05$. $T_1$ and $T_2$ are the first- and second-ranked hair colors. Each panel’s bar color represents its first-ranked hair color.

![Chart of the top five hair-color TF-IDF values for each personality](/attachments/translation-revisions/en/anime-hair-color-personality-quantitative-analysis/73-faithful-labels.png "=100%")

From the creator’s perspective, focusing only on the top-ranked hair-color node for each personality brings the stereotypes identified in Section 4.3 into sharper view—for example, the “sweet, naïve airhead” type associated with brown hair.

But again, selecting hair-color nodes on the basis of personality alone still falls somewhat short in explanatory power.

### 4.5 Cross-Analysis

To establish the associations more clearly, this article cross-compared the rankings in Sections 4.3 and 4.4. The results appear in Table 3. To simplify the results, only the top two hair colors were retained for each personality in the personality-to-hair-color rankings.

[table] Cross-comparison of hair-color-to-personality rankings (top 10) and personality-to-hair-color rankings (top 2).[^labels]

| Result category | Co-word pairs |
| --- | --- |
| Intersection: selected in both directions | Black hair: Yamato nadeshiko, gentleness, icy beauty, tsundere, gap moe<br>Brown hair: gentleness, soothing presence, natural airheadedness, timidity<br>Blond hair: natural airheadedness, tsundere<br>Silver hair: sanwu, natural charm<br>Blue hair: icy beauty, too nice for their own good, gap moe<br>Purple hair: masochistic traits (M), earnestness<br>White hair: kuangqi |
| Selected only from hair color to personality | Black hair: concealed scheming, natural airheadedness, tsukkomi, cheerful energy, taciturnity<br>Brown hair: cheerful energy, tsundere, gap moe, concealed scheming, tsukkomi, idiot<br>Blond hair: cheerful energy, concealed scheming, gentleness, gap moe, sharp tongue, “gentleman” (shenshi)[^shenshi], idiot, assertiveness<br>Silver hair: tsundere, gap moe, concealed scheming, taciturnity, natural airheadedness, gentleness, sharp tongue, icy beauty<br>Blue hair: tsundere, concealed scheming, cheerful energy, gentleness, natural airheadedness, tsukkomi, queenly dominance<br>Purple hair: tsundere, concealed scheming, gap moe, natural airheadedness, cheerful energy, sadistic traits (S), gentleness, chuunibyou<br>Pink hair: cheerful energy, natural airheadedness, concealed scheming, tsundere, gentleness, little-devil type, soothing presence, idiot, sharp tongue, gap moe<br>Red hair: tsundere, cheerful energy, assertiveness, natural airheadedness, gentleness, gap moe, idiot, sharp tongue, tsukkomi, “gentleman” (shenshi)<br>Green hair: cheerful energy, natural airheadedness, gap moe, tsundere, concealed scheming, clumsiness, tsukkomi, soothing presence, sharp tongue, shyness<br>Orange hair: cheerful energy, natural airheadedness, idiot, gentleness, tsundere, gap moe, tsukkomi, soothing presence, sharp tongue, little angel<br>White hair: little angel, concealed scheming, gap moe, natural airheadedness, tsundere, gentleness, chuunibyou, Yamato nadeshiko, stone-faced[^stone] |
| Selected only from personality to hair color | Black hair: sanwu, shyness, kuudere, earnestness, too nice for their own good, timidity<br>Brown hair: romantic loser, unwitting cruelty, shyness, obliviousness, natural charm, little angel<br>Blond hair: romantic loser, flawed beauty, soothing presence, obliviousness, little angel<br>Blue hair: multiple personalities, unwitting cruelty<br>Purple hair: Yamato nadeshiko<br>Red hair: kuangqi<br>Orange hair: flawed beauty |

The cross-comparison shows considerable overlap between the co-word pairs in the intersection and the stereotypes commonly circulated in fandom. The “blond tsundere” pairing mentioned at the start of this article lies in that intersection, proving that blond hair and tsundere are indeed strongly associated. The “pink-haired yandere” pairing, however, does not occur even in the union of the two sets.

## 5. Analyzing the Causes

### 5.1 Why Pairings Like “Blond Tsundere” Occur

The preceding analysis establishes some correlation between Japanese anime characters’ hair colors and their personalities, or moe-elements. This broadly confirms the intuitive impressions that have circulated in anime fandom for years. We will now begin by considering why this correlation arises.

First, there is no denying that the number of hair colors and character moe-elements is relatively limited. Looking across more than half a century of anime production, it is hard to say with any confidence that a particular hair-color/moe-element combination has never appeared. According to Hiroki Azuma’s “database” theory, character creation today essentially consists of drawing the required elements from a database and assembling them. Common hair colors and popular personalities—or moe-elements—form an even smaller fraction of the total repertoire, so some of the familiar combinations found in fandom stereotypes inevitably arise.

This practice of patching together elements to create characters has become increasingly widespread in anime, reflecting two problems. On one side is the demand for mass production in a consumer society, particularly in commercial animation. In pursuit of output, creators cannot lavish time and energy on every character, yet neither can they make characters so bland that they leave no impression on viewers. Adding a few moe-elements solves both problems at once: creators can quickly turn out large numbers of characters that do not look quite so much alike. On the other side are the audiences who pay for these characters—distinctive within individual works, yet severely homogenized across the field—and their fast-food mode of consumption. In today’s fast-paced life, people struggle to settle down and give anime their full attention as an “artwork.” What they want more often is “fast food”: an overwhelming succession of visual impacts. Rather than the story behind a character, most viewers may prefer moe-elements that can be displayed in a short time through appearance, speech, and behavior. With both creators and audiences willing to accept this arrangement, database-driven character creation becomes all the more inevitable. In the future, we may see still more combinations of different moe-elements.

Having established this correlation, we can go on to ask why fixed pairings such as “blond tsundere” proliferate. This article argues that the process begins with a character designed by chance, who leaves a deep impression on viewers and other creators because the work becomes hugely successful. Since the origins are difficult to trace, we will provisionally take Eri Sawachika from *School Rumble* as an example. Later creators think of Eri when this kind of character comes to mind, and may subconsciously add similar attributes—blond hair, twin tails—to a tsundere character. Here we can try explaining the process through the psychological phenomenon of the “self-fulfilling prophecy.” An exceptionally successful character creates a subconscious association in later creators’ minds between that character and their attributes. At the same time, the mind automatically filters out information that does not fit the association. The empirical analysis shows, for example, that blond hair is also relatively highly correlated with the flawed-beauty and romantic-loser types, while many black-haired and brown-haired characters are tsundere too. By directing more attention toward characters that fit the association, creators brought forth later examples such as Nagi Sanzenin, Airi Akitsuki, and Eriri Spencer Sawamura. Through these characters, the blond–tsundere–twin-tails combination was reinforced.

[fig] “Blond, tsundere, twin tails.”

![Illustration of Eriri Spencer Sawamura with blond twin tails, bearing the text “Blooming Lily”](/attachments/roof-archive/cv21792051/93.jpg "=50%")

For this to work commercially, there is another prerequisite: consumers must accept it. The fact is that consumers lap it up. With an outstanding example already before them, consumers may be more willing to give a similar character a try—consider the saying that once circulated, “All Chinese people have a thing for white-haired characters.” The same explanation applies to audiences. With new characters continually appearing, the ones that remain in viewers’ minds and spring immediately to memory are bound to be a handful of the most famous. When recalling a particular attribute, viewers naturally associate it, through a famous character, with that character’s other attributes. A psychological suggestion takes hold: these attributes seem to belong together. Encountering other characters with the same two or three attributes deepens this impression, while occasional characters who do not fit it do nothing to shake its apparent correctness. Eventually, everyone acquires the stereotype that blond hair is tied to attributes such as tsundere and twin tails.

### 5.2 Why Pairings Like “Pink-Haired Yandere” Occur

Sometimes, though, the audience’s collective impression is “mistaken,” as with the relationship between pink hair and yandere. Over the past decade, viewers have often associated pink hair with the yandere attribute. Yet the preceding analysis shows that pink-haired characters not only have a relatively low overall frequency, but also have moe-elements such as cheerful energy and natural airheadedness that are more important than yandere. This may have the same cause discussed above: the considerable influence of an exceptionally successful character. This article suggests that the character in question is Yuno Gasai from *The Future Diary*. The effectiveness of Yuno’s characterization at the time brought the relatively niche yandere attribute firmly into the public imagination, while reaction-image memes spread widely through fandom. Yuno became almost synonymous with yandere, incidentally linking pink hair to the type as well. Admittedly, later characters such as Satou Matsuzaka and Kisara also fit the pink-haired yandere description, reinforcing the impression. But the pattern is not pronounced in the data.

[fig] Yuno Gasai.

![Illustration of Yuno Gasai](/attachments/roof-archive/cv21792051/100.jpg "=50%")

We can also glimpse something of color psychology in the relationships between hair color and personality described above. Silver, for example, feels cold, matching the impression of detachment conveyed by the sanwu type. Red hair suggests fiery enthusiasm, and red-haired characters likewise tend to be full of energy. Pink, meanwhile, tends to suggest cuteness, and the personalities that rank as important for pink hair are indeed mostly cute. Yet concealed scheming is also an important trait for pink-haired characters—the Chinese fandom saying is “Pink outside; cut it open, black inside”—and there is also the “pink-haired yandere” pairing discussed here. The aim, presumably, is precisely to create gap moe: using pink hair’s cuteness to set off the darkness beneath. On one hand, the reversal can surprise viewers; on the other, it can give the character design greater depth. It is this distinctive contrast, the feeling of almost having been deceived, that has helped the “pink-haired yandere” combination spread.

Creating this contrast, however, is an enormous test of plot and character design. Handle it badly, and viewers can easily come to dislike the character. Yandere is therefore not a commonly used moe-element in character creation. Given this, if an excellent story can be created for a yandere character, pink hair is no longer necessary: common colors such as black or brown can serve just as well in making the character work.

To sum up, we can identify two forms of association between hair color and attributes. The first actually exists: creators deliberately choose these combinations when creating characters, and audiences recognize the same connection—recognition on both sides. The second is one-sided: an illusion arising among audiences, with no clear preference for the combination evident among creators when they design characters.

[^types]: English-edition note: *Tsundere* describes a character whose abrasive or distancing manner contrasts with affection; *yandere* describes one whose affection or devotion becomes dangerously possessive or destructive. These are fandom categories, not clinical diagnoses.

[^database]: English-edition note: The compressed phrase “simulacra database” invokes [Hiroki Azuma’s account](https://www.upress.umn.edu/9780816653522/otaku/) of characters and works assembled from a database of reusable elements. It is not the name of the Moegirl Encyclopedia dataset used below.

[^frequencies]: English-edition note: The counting unit behind the reported hair-color frequencies is not fully specified. These figures should not be read as counts of distinct characters.

[^gap]: English-edition note: *Gap moe* is the appeal generated by a discrepancy between a character’s expected qualities and what their appearance or behavior reveals; see [this English-language discussion of the term](https://www.crunchyroll.com/id/news/features/2020/5/1/the-springtime-of-youth-love-and-poetry-in-senryu-girl).

[^loli]: English-edition note: *Loli* is a fandom label for a young or young-looking girl character.

[^formula]: English-edition note: These definitions follow the [original formula image](https://i0.hdslb.com/bfs/article/0f0cf5998a3faec2c04a0203ba16457988650651.jpg), which specifies 角色, fictional characters. The count does not necessarily represent distinct fictional individuals.

[^labels]: English-edition note: These are fan classifications, not a standardized psychological inventory. *Yamato nadeshiko* names an idealized Japanese feminine type; *kuudere* combines a cool exterior with affection, and is distinct here from *sanwu*. *Chuunibyou* refers to adolescent self-dramatization and fantasies of exceptional identity or powers. “Natural charm” translates 天然萌, unaffected moe appeal, distinct from the unselfconscious airheadedness of 天然呆. *Tsukkomi* means comic retorts that call out absurdity. “Romantic loser” means the losing party in a romantic rivalry; “flawed beauty” means an attractive character whose qualities are undermined by conspicuous shortcomings. “Unwitting cruelty” denotes hurtful words or actions delivered with innocent unawareness, rather than concealed calculation. See Moegirl Encyclopedia’s entries on [tsukkomi](https://moegirl.uk/吐槽), [the flawed-beauty type](https://moegirl.uk/残念系), and [天然黑](https://moegirl.uk/天然黑).

[^shenshi]: English-edition note: *Shenshi* (绅士) literally means “gentleman,” but its historical fandom use prominently included an ironic meaning, “pervert.” The [November 2022 Moegirl Encyclopedia entry](https://web.archive.org/web/20221103045337/https://zh.moegirl.org.cn/%E7%BB%85%E5%A3%AB) included both ironic and literal examples; the label alone does not establish which sense applies to every character counted here.

[^stone]: English-edition note: The [original Table 3](https://i0.hdslb.com/bfs/article/30a3df23d2994e4be91d9d1e7a683230c54a5420.png) uses the label 面瘫, rendered here as “stone-faced.” The [January 2022 category description](https://web.archive.org/web/20220119154518/https://zh.moegirl.org.cn/%E9%9D%A2%E7%98%AB) concerns an expressionless appearance, not necessarily facial paralysis.
