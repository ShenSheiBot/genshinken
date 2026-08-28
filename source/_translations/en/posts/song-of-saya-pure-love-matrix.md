---
work_id: song-of-saya-pure-love-matrix
source_type: post
source_slug: song-of-saya-pure-love-matrix
slug: song-of-saya-pure-love-matrix
language: en
status: review
title: "The Pure-Love Matrix of Saya no Uta"
title_breaks: ["The Pure-Love Matrix", "of Saya no Uta"]
excerpt: "Beginning with the character relations established at the opening of Saya no Uta, the essay uses complete graphs and the logic of pure love to derive the structural positions occupied by the visual novel’s three endings."
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

> This essay was selected at the Eve Festival of Lab on Roof’s Rags Drum 2022 call for submissions.

You wake up and discover that everyone around you has turned into a monster. This is how Osamu Tezuka’s *Phoenix: Resurrection* begins, and it is also the central hook of *Saya no Uta*. Gen Urobuchi undoubtedly borrowed much more than this from Tezuka, but if one insists on tracing the connection, the game’s sole explicit reference to *Phoenix* already says almost everything. After Fuminori Sakisaka kills his neighbor and rescues Saya, she realizes uneasily that, for her sake, he has begun moving to the opposite side of humanity. To persuade Saya to “accept him completely,” Fuminori recalls a manga he once read—*Phoenix*—and points out the similarity between his own situation and that of the protagonist of “Resurrection.” He then describes the man’s choice: “The man who fell in love with something nonhuman ultimately gave up continuing to exist as a human, and thereby consummated his love.” This is at once Fuminori’s promise to Saya and, voiced through him as Urobuchi’s stand-in, a definition of the entire work. To love something nonhuman, then relinquish something in order to remain with her—unlike the protagonist of “Resurrection,” this is indeed everything Fuminori does.

At bottom, *Saya no Uta* remains a work of pure love.

It is worth noting that the difference between the two works appears even earlier. Although the opening CG of *Saya no Uta* likewise shows other humans transformed into monsters, it is not, as in “Resurrection,” the first image Fuminori sees upon waking. The player is immediately told that “this life has gone on for more than three months now.” In other words, Urobuchi chooses to begin at a point when the abnormality caused by the accident has already become normal: “I gave up resisting long ago and accepted the facts.” The player bursts abruptly into this normality by clicking *Start*, then only gradually learns of the accident in the background through the protagonist’s narration. The same trope therefore serves two entirely different narrative functions. In *Phoenix: Resurrection*, the upheaval and the amnesia that follows—an **event**—generate a compelling mystery around which the protagonist acts. It is quite literally the first mover of the narrative’s main line. Once we “recover our memory” together with him, moreover, the reversal of perspective becomes a major turn in a complete chain of events; with its “help,” he can resolve conflicts and grievances that had previously been insoluble. In *Saya no Uta*, by contrast, the accident itself scarcely appears. Perhaps the only reason Urobuchi mentions it at all in so concise a work is that a premise cannot arise from nowhere. This unnatural state made normal—the **condition** from which everything proceeds—still needs a plausible pretext before it can present itself openly to the player.

This comparison reveals a rather interesting distinction. At the risk of coining terms, let us call it the opposition between a starting **point** and a starting **plane**. The former, as just described, is an event—and in physics an event is precisely a mathematical point in four-dimensional spacetime. The latter has a network structure: it is what results when the fundamental premise is projected onto the protagonist. We may define it as the set of all relations surrounding the protagonist at the moment the narrative begins, relations produced by the work’s underlying condition.[^1] A story begins from this entire plane and continues to develop; readers naturally form expectations about how each element within it will change. Because initial conditions are largely independent of the laws governing the evolution of particular things—as in a dynamical system in general—we can imagine that, in most cases, later plot development need not remain heavily constrained by the opening. In ordinary creative practice, the beginning may indeed be no more than a convenient route toward material conceived in advance. With *Saya no Uta*, however, the opposite is true in one particular sense. An experienced reader will notice an implicit structure patterned on that very starting plane. This structure—or framework; better still, this **matrix**—encloses every subsequent plot development, or every subsequent possibility, within its limits and gives them a common space in which to evolve. We shall even see that, once we take the “initial conditions” supplied by the opening and let them operate according to the logic of pure love, the game’s three endings correspond naturally to every possible plot derivation permitted by those constraints.[^2]

To spell out this claim, let us return to the opening. Three expository scenes appear in succession. Fuminori first speaks with his former friends at the university, then is examined at a clinic by a female physician, and finally returns home to Saya. Along the way, through his eyes, we encounter every important character who will later appear; through the eyes of everyone except Saya, we also learn how Fuminori appears to them. The information can readily be organized in the following diagram:

[fig] The principal actors in *Saya no Uta* and the relations among them.

![Diagram of the principal actors in *Saya no Uta* and their relations](/attachments/roof-archive/rags-drum-2022/saya-pure-love-matrix/translations/en/relations.png)

In the diagram, A denotes Fuminori; B, his classmates; C, Ryoko; and D, Saya. The red arrow marks romantic love; the black solid arrows mark disgust, concern and estrangement, and wariness; the dashed arrows mark relations not yet established. The principal characters fall naturally, according to identity, into four distinct actors: individuals or groups whose motives, functions or capacities, aims, and modes of action resemble one another while differing from those of the other units.[^3] Every character besides Saya is wary of Fuminori. His former friends may be motivated mainly by concern for his health, but every player knows that, from Fuminori’s point of view, he needs neither extra curiosity nor extra attention. On the contrary, anything that might expose Saya to the world constitutes a threat. At this stage, then, Saya is the only character who retains a “positive relation” with Fuminori—the red edge $AD$. Every other relation is a potential source of conflict.

The diagram contains more information than this. Only the three relations centered on Fuminori—$AB$, $AC$, and $AD$—have actually been established. Yet once all the principal actors have appeared as nodes, every other possible relation, marked by a dotted line, has also been activated. This follows from a convenient mathematical fact: even if we restrict the “available” edges in the diagram to $\{AB, AC, AD\}$, the resulting structure—a subgraph of the complete graph $K_4$[^4]—remains connected. If all the characters can, in theory, come to know one another through Fuminori, and if they genuinely have reasons to contact and investigate him, then we have no reason to suppose that they will not in fact come to know one another through that very circumstance. In other words, the entire complete graph $K_4$ is available. Moreover, because the whole work contains only four important actors, while a filled-out $K_4$ contains every possible relation, we may infer that the stage-matrix has indeed been completely specified from the beginning. The moment we enter the game, we are given the key that will unfold every later plot structure. Continuing the story only strengthens this conviction, because escalating conflict eventually causes one ending[^5] to **fill out exactly** the $K_4$ that serves as the matrix.[^6]

To some extent, *Saya no Uta* follows a plot logic resembling formal derivation.

---

## Interlude: Questions and Answers

**1. Question:** Why $K_4$ rather than, say, $K_5$? Is there something special about the number four?

**Answer:** There is not necessarily anything inevitable about it. But $K_4$ is indeed the simplest of all “nontrivial” choices. To give two examples, $K_3$ has only three edges and offers little dramatic interest, while $K_5$, with ten edges, would be excessively complex for a work as short as *Saya no Uta*.

As for the second question, the double symmetry of four makes $K_4$ a favored framework for many conceptual systems grounded in dualism. Graham Harman has observed that many philosophical traditions around the world contain similar fourfold structures—his own Object-Oriented Ontology is one example. They generally arise from the cross-combination of two binary oppositions: $2 \times 2 = 4$.[^7] *Saya no Uta* likewise begins from a dichotomy, so the appearance of four should not surprise us. Strictly speaking, of course, the work does not fit Harman’s account, because it has only one opposition: human and nonhuman. It obtains four nodes by another strategy—relativizing the same binary opposition, then applying it to itself a second time. Fuminori and Saya plainly form the most fundamental human–nonhuman pair.[^8] But because Fuminori is a character who combines human and nonhuman elements, we can also, in another sense, group him together with Saya on the side opposed to humanity; for the sake of their love, he ultimately takes that position of his own accord. In this second opposition, built from the same pair of concepts, the vacant other side then demands the existence of two further nodes. Fuminori’s fellow students and the female physician perform precisely this function. In short, the generative formula of *Saya no Uta* is $2^2 = 4$.

**2. Question:** In what sense is *Saya no Uta* a work of pure love?

**Answer:** *Saya no Uta* is a work of pure love because it possesses all the central features of a certain Japanese mode of pure-love fiction. We need not get bogged down in a precise definition. For our purposes, what matters most is that the romantic bond it depicts satisfies two conditions:

1. **Meta-ness.** Pure-love fiction is fundamentally an apparatus for producing emotion. Readers invest their feelings in the act of reading and immerse themselves in a romance on the plane of fantasy, temporarily escaping the troubles of life. Under the reading contract between author and reader, love itself is sold as an ultimate remedy. Everything about love in such works is therefore decided at the meta-level: logically, it precedes the work itself. This is what I mean by meta-ness. Consider, for example, what the synopsis of a pure-love work normally includes. Besides the identities of the male and female protagonists, it often guarantees the certainty of their romantic bond: after all, they were designed for each other. *Saya no Uta* is no exception. Indeed, Urobuchi rather boldly places the meta-ness of pure love directly on the table.[^9] He trusts the reading contract so completely that he makes the protagonists’ extraordinary romantic relationship part of the background. A later flashback summarizes their first meeting, but we have no need to learn every detail of how Fuminori and Saya fell in love, because it simply does not matter. Their togetherness is the foundation of everything, not a conclusion that must be justified by some external logic.[^10]

2. **Purity.** The function of pure-love fiction pushes its author toward an Edenic vision of beautiful love. Yet this state cannot be described positively and directly.[^11] The only workable method is to construct it in reverse from its opposite: to manifest the harmony of the romantic bond through the negation of conflict. “Pure love means love without quarrels” is a roughly accurate summary. Even if conflict arises, it can only come from outside the “pure-love couple,” and it must eventually be overcome. Or perhaps defects of character drive their relationship into an impasse; but some transformative event will ultimately give them the opportunity to put matters right, and the protagonists can always be trusted to seize it, better themselves, resolve the conflict, and deepen their love. In short, pure-love fiction permits no development that would truly damage love—infidelity, for example. On the contrary, such works often feed on adversity, displaying love’s strength through the successful conquest of its many enemies. *Saya no Uta* adopts exactly this strategy. Its premise sets love against the most formidable opponent of all: morality itself. One cannot help thinking of Sade’s sovereign figures, whose endless aggrandizement likewise uses ethics and virtue as stepping-stones. Perhaps the following passage from Fuminori’s inner monologue turns this somewhat playful analogy into something tangible:

> With the very same heat as the love she bears me, she condemned a woman named Yoh to the stake. One need only look upon Yoh’s misery to understand how fiercely, how ardently Saya loves me.
>
> At some point, I had begun to welcome the gifts Saya gave me.

*Translator’s note: The first passage above has been restored from the original Japanese game text; the second follows the official English edition.*

No wonder many readers find *Saya no Uta* morally nauseating.[^12]

---

Let us return to the structure of *Saya no Uta*. If the discussion above has taught us anything, it is that pure love possesses a teleology. *Saya no Uta* constructs a framework in which the protagonists’ love stands opposed to certain forces. As a work of pure love, its first task is therefore to show how love defeats those forces in the conflicts that follow. But this is a demand we can place upon an ordinary work, not one we can transfer directly to a visual novel. The visual novel’s nonlinearity makes it necessarily a combinatorial genre. Its fundamental aim is to exhaust, in the richest possible ways, the possibilities of a given narrative framework. It must find and realize every interesting derivation, carrying the story as far as logic will permit. For *Saya no Uta*, one rather unfortunate consequence is that it cannot present only the victory of love. Fuminori and Saya’s opponents are powerful enough that defeat cannot be excluded. The work must therefore actually present that possibility and place it on the same plane as a successful ending, without favoring either side.

How many essentially different trajectories, then, can *Saya no Uta* take? Two points matter. First, its conflicts admit no compromise. Their only resolution is naked force; everything ultimately escalates into a zero-sum game in which one side or the other must die. Under these conditions, every possible ending is determined directly by the balance of power between the parties. Second, Urobuchi appears determined to keep all four actors at roughly the same level of combat effectiveness. Fuminori has three fellow students, but two of them—Yoh and Omi—plainly devote themselves to the great cause of intensifying the conflict. Through their deaths, they draw the sole survivor, Koji, step by step into the affair until he and Fuminori become mortal enemies.[^13] In the end, *Saya no Uta* is a “gladiatorial arena for four,” with the balance of power pushed as far as the premise can possibly allow.[^14]

To summarize: the ending depends directly on the balance of power, and that balance is determined entirely by the relative number of allies and enemies. This matters greatly, because we now possess enough information to derive every outcome in *Saya no Uta*. According to the matrix above, Fuminori has only four possible courses. Let $S$ denote the set of allies and $E$ the set of enemies;[^15] the other letters come from the diagram.

1. $S = \{\}$, while $E$ is a nonempty subset of $\{B, C\}$;
2. $S = \{D\}$, $E = \{B\}$;
3. $S = \{D\}$, $E = \{C\}$;
4. $S = \{D\}$, $E = \{B, C\}$.

Every option is determined by the two independent variables $S$ and $E$. These correspond exactly to the only two choices the game ever asks the player to make.[^16] On this basis alone, most of our work is already done. All that remains is to read every ending in *Saya no Uta* from the options one by one:

- Because the relationship between Fuminori and Saya is given in advance, option 1 actually signifies the dissolution of love. This cannot appear literally in a work of pure love. Urobuchi’s solution is to suspend love, preserving option 1 without violating pure-love logic. The result is the first ending, **“White Room.”** It is easy to see that every subsequent conflict is suspended along with love, because, as noted above, Fuminori and Saya’s relationship is the point of departure for everything that follows.
- Option 2 unmistakably means victory for Fuminori and Saya. Koji must face the pair alone and, under the principle of balanced forces, has no chance of winning. Option 2 indeed corresponds exactly to the eponymous ending, **“The Song of Saya.”** The gun Koji receives from Ryoko is neutralized by Yoh, after which Fuminori and Saya kill him together. Although Ryoko reconstructs the truth from Ogai’s notes, she is powerless to alter the outcome.
- Option 3 is structurally isomorphic to option 2, but remains only a theoretical possibility. Ryoko cannot reach Saya by herself.[^17] She must follow Koji’s investigation of Fuminori in order to make contact with Saya through him; once that happens, her position necessarily places her in Koji’s camp, contradicting the premise.
- Option 4 corresponds to **“World’s Sanity,”** the victory of the “villains,” because Ryoko’s shotgun directly breaks the two-against-two balance of power. Accordingly, in the story as it unfolds, Koji is the battle’s sole survivor. Everything concerning Saya is ultimately buried.

At this point, without exaggeration, we have unlocked every narrative secret of *Saya no Uta*. Our account may not touch enough details, but once the general direction is clear, explaining their functions one by one is merely unskilled manual labor. Let us therefore leave lengthy textual archaeology aside and end instead with a typical question:

**Question:** Is *Saya no Uta* a tragedy?

**Answer:** No, because it is a visual novel.

[^1]: This definition may be understood as an extension and transformation of the totality of character relations conventionally introduced by a work’s “exposition.” Note the protagonist’s central place in the definition.
[^2]: We must constantly remind ourselves that *Saya no Uta* is not a novel in the traditional sense but a visual novel. The latter’s greatest advantage is its ability to draw a perfect equals sign between possibility and actuality. Urobuchi can therefore choose the organizing logic best suited to the medium—a choice that unmistakably demonstrates his mastery of visual-novel form.
[^3]: Our definition directly excludes the dead from becoming actors, so Professor Ogai does not count. His role in the plot is nowhere near central in any case.
[^4]: A complete graph is a simple undirected graph in which each pair of distinct vertices is connected by a unique edge. A complete graph on $n$ vertices is denoted $K_n$. Here we disregard the specific properties of a relation—directionality and variability, for example—and ask only whether two actors have a relation, that is, whether they know one another.
[^5]: The second bad ending, “World’s Sanity.” See below.
[^6]: One need not think very hard to see that Urobuchi plainly intended to keep the plot within this framework. Dr. Ryoko’s instruction that Koji should not call the police, for example, is really the screenwriter refusing to involve additional forces, since under the circumstances both calling and not calling the police would be defensible. At the same time, the refusal to call the police may be understood as a Lovecraftian element.
[^7]: Literature supplies a perfect example as well: Greimas’s semiotic square.
[^8]: Paradoxically, one can only fall in love with a person. If Saya possessed no genuine humanity, the story could not even begin.
[^9]: Once again, perhaps the reason was simply to save space.
[^10]: Thus, readers who feel that the protagonists “somehow just got together” do not truly understand the logic of pure love. Even works that seem to provide a complete history of courtship use some convention implicit in the reading contract, the moment the heroine or hero first appears, to declare: this is the destined person. In fact, they are already together before they truly meet.
[^11]: Strictly speaking, a positive description is possible. Regrettably, however, it can appear only as a fleeting ending: “From then on, they lived happily ever after.”
[^12]: Yet rather than saying that Urobuchi went too far, we might say that *Saya no Uta*, by working the logic of pure love out to its extreme, exposes the danger within pure love itself. Its exclusiveness means that, when necessary, pure love is willing to make an enemy of everything. The controversy around Makoto Shinkai’s *Weathering with You* arose in part for much the same reason.
[^13]: Dr. Ryoko, by contrast, needs no such inducement. Her fundamental opposition to Saya was established through her relationship with Professor Ogai.
[^14]: Saya’s conspicuous weakness compared with other Lovecraftian creatures may likewise exist to produce this final balance.
[^15]: The case $E = \{\}$ can be excluded immediately, for obvious reasons.
[^16]: Ironically, the second choice—the choice of $E$—appears from Koji’s point of view. Fuminori does not hold his destiny entirely in his own hands.
[^17]: Saya’s elusiveness is interesting. Her basic physical attributes resemble a human’s and her actual combat strength is low, yet she can remain entirely outside human society.
