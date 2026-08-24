---
work_id: anime-hair-color-personality-quantitative-analysis
source_type: post
source_slug: anime-hair-color-personality-quantitative-analysis
slug: anime-hair-color-personality-quantitative-analysis
language: en
status: review
title: "Blond Tsunderes? Pink-Haired Yanderes? A Quantitative Analysis of Hair Color and Personality in Japanese Anime"
title_breaks: ["Blond Tsunderes?", "Pink-Haired Yanderes?", "A Quantitative Analysis of Hair Color and Personality in Japanese Anime"]
excerpt: "Using data on Japanese anime characters from 2000 to 2021, this study applies frequency analysis, network analysis, and TF-IDF to test associations between hair color and personality traits."
credits:
  - role: translator
    contributor_id: shen-shui-bot
    scope: complete work
translation_method: agent
source_relationship: direct
base_language: zh-Hans
updated: 2026-08-23
rights: CC BY-NC-SA 4.0
format: article
---

![Author card for Sairai](/attachments/roof-archive/cv21792051/1.jpg "=100%")

This essay received an award at the After Festival of Lab on Roof’s annual Rags Drum 2022 call for submissions.

![Purple-toned illustration of an anime character](/attachments/roof-archive/cv21792051/5.jpg "=50%")

## Abstract

In Japanese anime, hair color and personality should, in ordinary terms, be independent of one another. Yet anime fandom abounds in perceived pairings such as “blond tsundere” and “pink-haired yandere.” This study first uses frequency statistics and network analysis to examine overall co-occurrence patterns between hair colors and keywords for *moe* traits, while noting the limitations of those methods. It then applies TF-IDF to the most significant relations between hair color and personality, processing and comparing the data from the perspectives of audiences and creators. The results confirm that most mutually salient pairings, including “blond tsundere,” do exist. This may arise from a feedback loop between creators and audiences that continually reinforces the frequency of such combinations. Other pairings, including “pink-haired yandere,” do not rank among the strongest relations. Their currency may instead be inseparable from a handful of successful earlier characters, and may also have some connection with color psychology.

Keywords: Japanese anime; frequency analysis; network analysis; text analysis; keyword co-occurrence.

## 1. Introduction

Hair color is widely used in Japanese anime to distinguish characters. This is readily understandable: in works with large casts, remembering every character’s name can be very difficult. Hair color, as a conspicuous physical feature, helps viewers remember a character and discuss them with other fans before they know the work well. In *Lycoris Recoil*, for example, Majima’s face appears relatively infrequently, so viewers may easily forget his name. His green hair is striking, however, and no other green-haired character appears in the series; calling him “Green Hair” therefore creates no obstacle to communication.

From the standpoint of storytelling, we may consequently assume that a character’s hair color is a distinctive and randomly assigned feature within a given anime, independent of other characters’ colors. Hair color itself should therefore bear no relation to personality. In the conventional conception of a database of simulacra, after all, hair color and personality should both be elements “sampled at random.”

Yet this conflicts with persistent stereotypes among anime audiences that associate hair color with personality, such as “blond tsundere” and “pink-haired yandere.” Take “blond tsundere”: from an audience perspective, a blond character may very likely possess a tsundere personality; conversely, a tsundere personality may very likely belong to a blond character. This implies that certain hair colors and personalities are strongly bound together rather than assigned wholly at random.

Do hair color and personality among Japanese anime characters actually correlate? If so, what mechanism lies behind the correlation? If not, why do people speak as though it exists? This essay uses quantitative analysis to answer these questions.

## 2. Data Sources and Description

The data come from Moegirlpedia. Using Python, I scraped 2,145 Japanese anime released from 2000 through 2021 and collected 17,353 character records. The inclusion rules were: (1) the anime link was valid; (2) the character link was valid; and (3) when an anime released two or more seasons in one year without changing its principal cast, those seasons were counted as one.

After collecting the characters, I gathered each character’s hair color, eye color, and *moe*-trait data, then performed an initial screening and cleaning. The screening rules were: (1) the character had a dedicated and uniquely assigned entry; (2) the character had hair-color data—when two or more hair colors were listed, the first two were collected—or eye-color data, again limited to the first two; and (3) the character had valid *moe* traits.

Because Moegirlpedia uses redirects, *moe*-trait terms had to be normalized, and traits that merely restated hair or eye color had to be removed. Since this study focuses on hair color, it retained only characters with a hair-color attribute; bald characters, who lack such information, were also removed. After this second cleaning, the final sample covered 2000 through 2021 and contained 13,307 character records from 1,325 Japanese anime. It included 13 hair colors and 2,145 *moe* traits, encompassing personality, appearance, identity, and other attributes.

## 3. Network and Frequency Methods

### 3.1 Frequency Statistics and Network Construction

This study concerns the relation between hair color and personality traits within the larger set of *moe* traits. I therefore treated hair colors as type-I nodes and *moe* traits as type-II nodes, linked the two types through co-occurrence, and counted the frequency of each kind of node. No links were constructed between nodes of the same type. Table 1 presents the frequency results.

The hair-color frequencies differ enormously. Black-haired characters occur far more often than brown- and blond-haired characters, which in turn occur far more often than characters with other hair colors. Rainbow and transparent hair are extremely rare. Frequencies among *moe* traits, by contrast, follow a comparatively smooth distribution.

I next counted the frequencies of individual pairings. Table 2 presents the results.

The hair-color and *moe*-trait co-occurrence frequencies can be used to construct the network in Figure 1. Since the relationships are complex and this study focuses only on the most deeply bound nodes, I processed the co-occurrence network using only the TOP1 algorithm.

[图题] Table 1. Frequencies of hair colors and selected *moe* traits (top 13).

![Frequency table for hair colors and selected moe traits](/attachments/roof-archive/cv21792051/28.png "=100%")

In descending order, the hair-color counts are black 22,049; brown 15,956; blond 15,840; silver 9,643; blue 7,655; purple 6,391; pink 5,656; red 5,197; green 3,271; orange 3,203; white 1,106; rainbow 48; and transparent 6. The selected *moe*-trait counts are large breasts 1,747; short hair 1,501; tsundere 1,461; energetic 1,380; airheaded 1,072; glasses 1,049; gap moe 1,013; two-faced 996; younger sister 992; loli 991; flat-chested 988; gentle 987; and older sister 982.

[图题] Table 2. Hair-color and *moe*-trait co-occurrence frequencies (top 10).

![Hair-color and moe-trait co-occurrence frequency table](/attachments/roof-archive/cv21792051/32.jpg "=100%")

The top co-occurrences are black hair–long, straight black hair 459; brown hair–short hair 375; black hair–short hair 360; black hair–tsundere 333; black hair–large breasts 331; blond hair–blond hair and blue eyes 324; brown hair–large breasts 317; blond hair–large breasts 303; brown hair–energetic 299; and black hair–glasses 299.

[图题] Figure 1. Hair-color–*moe*-trait co-occurrence network (TOP1 algorithm).

![Network graph of co-occurring hair colors and moe traits](/attachments/roof-archive/cv21792051/36.jpg "=100%")

Red nodes represent hair colors and blue nodes represent *moe* traits; nodes with higher centrality occupy a larger area. The graph reveals a pronounced community structure. The more frequently a hair color occurs, the more *moe*-trait nodes connect to it, showing a positive correlation. Some hair colors and traits also have bidirectional links: each is the other’s most frequent co-occurrence. At the macroscopic network level, this indicates that some hair colors and *moe* traits are indeed bound together to a degree.

### 3.2 Limitations of Frequency Statistics

Frequency statistics have the advantage of being simple and clear when studying co-occurrence, but the results in Section 3.1 expose several problems.

First, comparing Tables 1 and 2 shows that black, brown, and blond hair occur so frequently that their links with other traits also dominate the top 10 co-occurrences. The first pairing involving none of these three colors appears only around the top 40. Large breasts, short hair, and tsundere likewise enter the top 10 because they are frequent traits.

Second, consider the black hair–large breasts relation (331 instances) and the brown hair–large breasts relation (317 instances) in Table 1. By raw frequency, the black-hair pairing appears stronger. Yet black hair occurs at roughly 138 percent the frequency of brown hair, while its link here is only about 4 percent more frequent. That hardly demonstrates greater importance for the trait. Conversely, the relatively infrequent traits “long, straight black hair” and “blond hair and blue eyes” have exceptionally high co-occurrence rates. The method therefore confronts a trade-off between “strong nodes and weak relations” and “weak nodes and strong relations.”

Finally, the network shows some trait nodes linked to two hair-color nodes. For such a trait, node A may have its highest-frequency co-occurrence with the trait, while the trait may simultaneously be node B’s highest-frequency co-occurrence. This produces the same dilemma of selection described above. In short, raw frequency is not an ideal measure of co-occurrence because the result is confounded by the frequencies of the terms themselves.

## 4. TF-IDF Feature Extraction

### 4.1 Introduction to TF-IDF

Zipf’s law states that a word’s frequency is inversely proportional to its rank. As the limitations discussed in Section 3 show, a frequent word is not necessarily a keyword. To extract keywords more effectively, this study uses TF-IDF, a standard algorithm in text analysis. TF denotes term frequency, while IDF denotes inverse document frequency. The fewer documents contain a term, the better it distinguishes among categories and the higher its IDF value. The formula is shown below.

[图题] TF-IDF formula.

$$
\begin{aligned}
\mathrm{TF} &= \frac{n}{\mathrm{total}}, \\
\mathrm{IDF} &= \ln\!\left(\frac{N}{n_t}\right), \\
\mathrm{TF\!\text{-}\!IDF} &= \mathrm{TF}\times\mathrm{IDF}.
\end{aligned}
$$

Here, $n$ is the frequency of the term, $\mathrm{total}$ is the total word count of the texts satisfying the condition, $N$ is the total number of characters, and $n_t$ is the number of characters with that term. A larger TF-IDF value means that the term is more important under the given condition.

### 4.2 Data Filtering

On the basis of the frequency statistics in Section 3, I removed less important nodes to simplify the analysis. Among hair colors, I removed the infrequent rainbow and transparent nodes, leaving 11. Among *moe* traits, I removed nodes with frequencies below 100, leaving 222.

### 4.3 Personality TF-IDF by Hair Color

Taking hair color as the condition, I calculated TF-IDF values for co-occurring *moe* traits. After retaining personality-related traits, the top-10 rankings are shown in Figure 2.

[图题] Figure 2, part 1. Top-10 TF-IDF values for personalities associated with each hair color.

![Bar charts ranking the ten personality traits with the highest TF-IDF values for white, orange, and pink hair; madness is especially prominent for white hair, while energetic and airheaded lead for orange and pink hair](/attachments/roof-archive/cv21792051/58.jpg "=100%")

[图题] Figure 2, part 2. Top-10 TF-IDF values for personalities associated with each hair color.

![Bar charts ranking the ten personality traits with the highest TF-IDF values for black, red, and blond hair; tsundere ranks first for each, with energetic especially prominent for red and blond hair](/attachments/roof-archive/cv21792051/60.jpg "=100%")

[图题] Figure 2, part 3. Top-10 TF-IDF values for personalities associated with each hair color.

![Bar charts ranking the ten personality traits with the highest TF-IDF values for blue, green, and silver hair; green hair is led by energetic, while silver hair includes the Chinese-fandom sanwu category and the ice-beauty archetype](/attachments/roof-archive/cv21792051/62.jpg "=100%")

[图题] Figure 2, part 4. Top-10 TF-IDF values for personalities associated with each hair color.

![Bar charts ranking the ten personality traits with the highest TF-IDF values for purple and brown hair; purple hair is led by tsundere and two-faced traits, while brown hair is led by energetic and gentle traits](/attachments/roof-archive/cv21792051/64.jpg "=100%")

Conditioning on hair color simulates the process by which an audience sees a character’s hair and ranks the personalities that character is likely to possess. TF-IDF makes some traits especially salient. Among white-haired characters, for example, the importance of the “madness” trait exceeds 0.1, even though both white hair and madness have low raw frequencies. The results also reveal familiar stereotypes: silver-haired characters tend toward what Chinese anime fandom calls the *sanwu* archetype—taciturn, expressionless, and emotionally unreadable—while red-haired characters tend to be energetic.

At the same time, traits such as tsundere and energetic rank relatively high for most hair colors because they are themselves common, even though their TF-IDF values vary across colors. Selecting personality solely on the condition of hair color therefore retains limited explanatory power.

### 4.4 Hair Color by Personality

I next analyze the creator’s perspective: assigning a hair color to a character on the basis of a personality already defined in the design. Taking personality traits as the condition, I calculated TF-IDF values for co-occurring hair colors. Because there are many personality traits, I retained only those for which the difference between the first- and second-ranked hair colors exceeded 0.05—that is, traits with one distinctly dominant hair color. Figure 3 presents the top five; each bar’s color represents the hair color most important to that personality.

[图题] Figure 3. Top-five TF-IDF values for hair colors associated with each personality ($\mathrm{TF\text{-}IDF}(T_1)-\mathrm{TF\text{-}IDF}(T_2)>0.05$).

![Small-multiple charts showing the five hair colors with the highest TF-IDF values for each personality; several traits have one distinctly dominant hair color, such as purple for masochistic, black for ice beauty, and blond for hapless](/attachments/roof-archive/cv21792051/73.jpg "=100%")

From the creator’s perspective, focusing on only the top-ranked hair-color node for each personality further reveals stereotypes observed in Section 4.3, such as the “sweet and naïve” quality of brown-haired characters.

Yet selecting hair-color nodes on personality alone still offers limited explanatory power.

### 4.5 Cross-Analysis

To establish the pairings more securely, I intersected the rankings from Sections 4.3 and 4.4. Table 3 presents the result. To simplify it, the personality-to-hair-color side retains only its top two features.

[图题] Table 3. Intersection of hair color to personality (top 10) and personality to hair color (top 2).

![Table intersecting bidirectional TF-IDF rankings for hair color and personality](/attachments/roof-archive/cv21792051/81.png "=100%")

The bidirectional intersections are: black hair with Yamato nadeshiko, gentleness, ice beauty, tsundere, and gap moe; brown hair with gentleness, healing, airheadedness, and timidity; blond hair with airheadedness and tsundere; silver hair with the Chinese-fandom *sanwu* category and natural cuteness; blue hair with ice beauty, kindheartedness, and gap moe; purple hair with masochism and seriousness; and white hair with madness.

The intersecting pairs overlap strongly with stereotypes commonly circulated in anime fandom. The “blond tsundere” mentioned at the beginning appears in both sets, demonstrating that the combination is indeed strongly bound. “Pink-haired yandere,” however, does not appear in the union of the two sets.

## 5. Analysis of Causes and Conclusion

### 5.1 Why “Blond Tsundere” Pairings Arise

The analysis above shows a degree of correlation between Japanese anime characters’ hair colors and their personality traits, broadly confirming the intuitive impressions accumulated within anime fandom over many years. We may now ask what produces these correlations.

First, the available number of hair colors and *moe* traits is undeniably finite. After nearly half a century of anime production, it is difficult to claim that any pairing of hair color and trait has never appeared. In Hiroki Azuma’s database model, contemporary characters are largely assembled by retrieving needed elements from a database. Common hair colors and popular personality traits are especially few relative to the total number of characters, so familiar stereotyped combinations inevitably recur.

This assemblage of elements has become increasingly common in anime character creation, reflecting two issues. On one side stands the demand for mass production in consumer society, particularly in commercial anime. Creators cannot devote enormous effort to shaping every character, yet they also cannot leave characters so bland that audiences remember nothing about them. Adding several *moe* traits solves both problems at once, allowing creators to produce many characters quickly without making them all look identical. On the other side stands a fast-food mode of consumption among audiences who pay for characters that are distinctive within a single work yet highly homogeneous in aggregate. The pace of contemporary life makes it difficult to settle down and watch anime as “art”; viewers more often demand works as “fast food,” with an unbroken succession of visual stimuli. Rather than a character’s underlying story, many viewers may prefer *moe* traits that become evident at once in appearance, speech, and behavior. Since creators and audiences alike accept this arrangement, database-driven character creation becomes still more unavoidable. The future may bring even more combinations of different traits.

Once we accept this correlation, we can ask why fixed pairings such as “blond tsundere” proliferate. I argue that they begin with a character designed more or less by chance; the work in which that character appears then becomes enormously successful, leaving a deep impression on audiences and other creators. Since the origin is difficult to establish, I use Eri Sawachika from *School Rumble* as a provisional example. Later creators, thinking of a character with these traits, may recall Eri and unconsciously give their own tsundere similar attributes, such as blond hair and twin tails. The psychological phenomenon of the self-fulfilling prophecy may help explain this. One extraordinarily successful character can create an unconscious association between that character and her attributes in the minds of later creators. The mind automatically filters out information that does not fit the association. The empirical analysis, for example, shows that blond hair also correlates strongly with “hapless” and “losing heroine” traits, while many black- and brown-haired characters are tsunderes. By directing more attention toward characters that fit the association, creators produced later examples such as Nagi Sanzenin, Airi Akizuki, and Eriri Spencer Sawamura, reinforcing the blond-tsundere—and often twin-tailed—combination.

[图题] “Blond, tsundere, twin tails.”

![Illustration of a blond anime character with twin tails](/attachments/roof-archive/cv21792051/93.jpg "=50%")

This process depends on consumer acceptance, and consumers have demonstrably embraced it. With celebrated precedents already before them, viewers may be more willing to try a work when they see a similar character—the circulating claim that “Chinese viewers are all fans of white-haired characters” offers one example. The same account applies to audiences: as new characters continually appear, those who remain in memory and can be recalled at once are necessarily a few famous examples. Recalling a given trait through a famous character naturally associates it with that character’s other traits, producing the suggestion that these attributes simply belong together. Encountering further characters with the same two or three traits deepens the impression, while an occasional counterexample does little to weaken it. Eventually, blond hair, tsundere, twin tails, and similar traits become bound together in a shared stereotype.

### 5.2 Why “Pink-Haired Yandere” Pairings Arise

Sometimes, however, collective impressions among audiences are biased. Consider the relation between pink hair and yandere. Over the past decade, viewers have often perceived these two attributes as bound together. The analysis above shows, however, that pink-haired characters have a low overall frequency and that traits such as energetic and airheaded are more important among them than yandere. As in the previous section, the impression may stem from a single exceptionally successful character: Yuno Gasai in *The Future Diary*. The success of Yuno’s characterization made the relatively niche yandere trait widely familiar, while reaction images and memes circulated extensively through fandom. Yuno became virtually synonymous with yandere, and pink hair became associated with it in turn. Later characters who fit the pattern, such as Satou Matsuzaka and Kisara, reinforced the impression, but the relation remains statistically insignificant.

[图题] Yuno Gasai.

![Illustration of Yuno Gasai](/attachments/roof-archive/cv21792051/100.jpg "=50%")

The associations above also bear traces of color psychology. Silver, for instance, gives a cold impression, matching the aloofness associated with the *sanwu* category; red evokes fiery passion, and red-haired personalities are often energetic. Pink likewise tends to appear cute, and the traits most important to pink-haired characters are indeed mostly cute ones. Yet pink hair also correlates with scheming or two-faced personalities—the fandom saying “pink turns black”—and with the “pink-haired yandere” discussed here. Such designs likely seek the appeal of contrast: pink’s cuteness sets off the darkness behind it. The change can surprise viewers while giving the character greater depth. This distinctive, almost deceptive contrast helped the pairing circulate.

Producing this contrast, however, places great demands on plot and character design; mishandled, it can easily make viewers dislike the character. Yandere is therefore not a commonly used *moe* trait in character creation. If a creator can write an excellent story for a yandere, pink hair is no longer necessary: ordinary black or brown hair can serve the character just as well.

In conclusion, hair color and character attributes relate in two ways. Some relations are real: creators deliberately choose them, audiences recognize them, and the two sides form a bidirectional understanding. Others are one-sided illusions produced among audiences, with no clear evidence that creators favor the corresponding choice when designing characters.
