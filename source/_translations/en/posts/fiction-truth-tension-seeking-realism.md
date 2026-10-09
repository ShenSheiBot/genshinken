---
title_breaks: ["The Tension Between","Fiction and Truth—How to Seek","a Sense of Reality in Fictional Stories"]
title: "The Tension Between Fiction and Truth—How to Seek a Sense of Reality in Fictional Stories"
date: 2019-02-09
updated: 2026-10-02
work_id: fiction-truth-tension-seeking-realism
source_type: post
source_slug: fiction-truth-tension-seeking-realism
slug: fiction-truth-tension-seeking-realism
language: en
script: latn
status: draft
categories: [Thought and Theory]
section: essay
tags: [Logic, Philosophy of Language, Game Studies]
post_author: Wuyou Zhi Ren
excerpt: "Beginning with Kyon’s famous remark about fiction and a sense of reality, this essay draws on hierarchies of truth predicates, descriptions, possible worlds, free logic, and supervaluational semantics to examine the relations among fictional worlds, objects, and truth values."
featured_order: 0
credits:
  - role: translator
    contributor_id: shen-shui-bot
    scope: complete work
translation_method: agent
source_relationship: direct
base_language: zh-Hans
format: article
rights: CC BY-NC-SA 4.0
citation:
  itemType: blogPost
  citationKey: wuYouZhiRen2019fictionTruthTension
  date: "2019-02-09"
  blogTitle: Lab on Roof
  url: "https://www.bilibili.com/read/cv2031971/"
---

[author] Wuyou Zhi Ren (乌有之人)

![Portrait of Wuyou Zhi Ren](attachments/roof-archive/cv2031971/01-author-portrait-v5.png "=25%")

[author-bio] Though I speak with the tongues of men and of angels.[^bio]

[fig] The “7” image: Anyone looking for a sense of reality in a fictional story must have something wrong with their head. —Kyon.[^seven]

![Kyon on fiction and a sense of reality in The Melancholy of Haruhi Suzumiya](attachments/roof-archive/cv2031971/02-haruhi-fiction-realism.png)

Whether or not you have seen *The Melancholy of Haruhi Suzumiya*, I’m sure you know this famous line of Kyon’s. Taken on its own, it does not run counter to our intuitions: fiction is, after all, different from reality. But once we consider its context—it occurs in a fictional story—it becomes a paradoxical sentence resembling the liar sentence.

**(1) Anyone looking for a sense of reality in a fictional story must have something wrong with their head.**

**(2) “Anyone looking for a sense of reality in a fictional story must have something wrong with their head” is fictional.**

Sentence (1) is intuitively acceptable in itself, but in certain circumstances that intuition leads into a paradox. Simply add sentence (2) to sentence (1), and from (1) and (2) we can infer (3):

**(3) Anyone looking for a sense of reality in (3) must have something wrong with their head.**

Clearly, (3) resembles the liar sentence. It produces a paradox because it **refers to itself**, so we can regard it as a variant of the liar paradox and prevent such self-referential sentences by distinguishing the metalanguage from the object language. (This is a strengthened liar paradox; logicians have already proved that many-valued logic cannot resolve the strengthened liar paradox.) But this essay aims to do more than that. Its concern is whether sentences (1) and (2) can directly yield sentence (3). Both (1) and (2) contain “fictional,” whereas (3) eliminates “fictional” through rules of inference. Here, “fictional” is being treated as a predicate. Yet it need not be a predicate, and (3) need not follow directly from (1) and (2). This essay attempts to change the interpretation of “fictional” so that we do not arrive at (3) from (1) and (2). Nor, however, does it seek to define what fiction is. It merely takes “7” as its starting point for discussing, from the standpoint of logic, how we “say” that a text is fictional: how the word “fictional” is used.

[fig]

![Dialogue image accompanying the discussion of Bertrand Russell and the liar paradox](attachments/roof-archive/cv2031971/03-russell-liar-paradox.jpg)

[fig-note] Chinese subtitle: “These kinds of syllogisms are unreliable.”

Should we treat “fictional” as a predicate? The understanding of fiction in sentence (1) rests on two presuppositions: first, fictional worlds and the actual world do not have equal standing; second, a sense of reality consists in correspondence with the actual world we inhabit—a naive correspondence theory of truth. On these two premises, we can define the predicate “is fictional” as follows: a sentence is fictional if and only if it describes objects or events in a fictional world; a story is fictional if and only if it is a set consisting of sentences that describe a fictional world and their consequences—that is, the sentences that can be inferred from them. A sentence is true, however, if and only if it correctly describes objects or events in the actual world. We predicate fictionality of sentences describing fictional worlds; but if truth is a relation between sentences and the actual world, these sentences naturally have nothing to do with truth or falsity. In fact, this is precisely how classical logic proceeds, so long as we leave aside the possibility that “fictional sentences are themselves true” is itself fictional. The question is: how do we exclude that possibility?

### (1) The Hierarchy of Truth Predicates

Just as the person who declares that all Cretans are liars may himself be a Cretan, we can apply the predicate “is fictional” to the sentence “Fiction has nothing to do with truth or falsity” itself. According to Tarski’s undefinability theorem for truth—Tarski’s theorem, or the undefinability theorem for short—a semantically closed language, one containing a truth predicate that can apply to sentences containing that very predicate, always allows a liar sentence to be constructed through the diagonal lemma. Likewise, a language containing the predicate “is fictional” cannot prevent that predicate from being applied to fictional sentences themselves.

The conclusion of the undefinability theorem is this: a semantically closed language cannot define truth by its own resources; truth relative to that language must be defined outside it. We call this language the *object language*, and the language used to discuss it the *metalanguage*. For an object language $L$, we can define the predicate “true in $L$” in the metalanguage. Since “true” and “false” are predicates in the metalanguage, they cannot be applied within a sentence to that sentence itself, and the construction of a liar sentence is avoided. By assigning sentences to different levels in this way, we can define truth in the object language in the metalanguage, truth in the metalanguage in the metametalanguage, and truth in any language in a language at a higher level.

Defining truth in an object language $L$ in the metalanguage requires the $T$-schema: $S$ is true if and only if $p$. Here, $p$ is the translation into the metalanguage of a sentence in $L$, and $S$ is the name or structural description of $p$ in the metalanguage—for instance, the sentence’s Gödel number. Taking $T$ as the truth predicate and $P$ as any sentence in the object language, we can express the $T$-schema as:

$$
T(P) \leftrightarrow P
$$

To say that a sentence in a language $L$ is true is to be able to substitute it for $P$ while substituting its name into $T(P)$. A definition of truth for $L$ must have all instances of the $T$-schema as its consequences: if we can obtain all the true sentences in a language, we have a definition of truth. If we take instances of the $T$-schema as parts of a truth definition, then the disjunction—the logical operation representing “or”—of all those instances would be a truth definition conforming to the $T$-schema. But in an infinite language, one with infinitely many true sentences, no such “disjunction of all true sentences” exists. The $T$-schema is therefore only a criterion for a definition of truth; it cannot itself serve as that definition.[^tarski] Tarski was pessimistic about defining truth in natural language, but he gave a recursive definition of truth for first-order languages.

### (2) The Predicate “Is Fictional”

The $T$-schema allows us to distinguish a sentence from its name. Tarski chose quotation marks to represent a sentence’s name, and truth is a relation between a sentence and its name, as in his famous example:

The sentence “snow is white” is true if, and only if, snow is white.[^snow]

A sentence’s truth is a property of its metalanguage. To say it is true is to say that its quotation marks can be removed in the metalanguage—some philosophers call this property of truth “disquotation” or “semantic ascent.”[^tarski] The difference between object language and metalanguage is like the difference between a sentence and its name. A sentence’s name must be treated as a whole, distinct from the sentence itself; this prevents self-reference.

Examining the hierarchical construction of truth predicates is important to our study of the predicate “is fictional.” These levels of language can apply not only to truth predicates but also to “is fictional” as a predicate of sentences. We can regard this as a modification of the correspondence-theoretic presupposition about truth identified earlier in sentence (1): by establishing levels of language, we define “truth” relative to a language. Rather than investigating the correspondence between words and the world, this view pays closer attention to language itself, **holding that language describes the world at different levels.** Similarly, we can apply the distinction between object language and metalanguage to the predicate “is fictional,” **treating fictionality as relative to a world and thus defining “fictional in world W.”** A hierarchy of this predicate lets us distinguish fictional world one, which is fictional relative to the actual world, from fictional world two, which is fictional relative to fictional world one. In this way, the predicate avoids self-reference. Thus, **the fictional world a certain Kyon is talking about is the “1096 world,” which is fictional within the “Haruhi Suzumiya world”**; we avoid treating the two worlds as on a par.[^mikuru]

To consider these “worlds,” we must return to the level of language. Although arranging the predicate “is fictional” in a hierarchy gives us a sequence of fictional worlds that can ascend indefinitely from level to level, we need not make excessive ontological assumptions. We need only regard them as sets of sentences: when we speak of a world, we are speaking of the set of sentences that describes it. Worlds at different levels thus relate to one another as metalanguage and object language do, and sentences describing different levels relate to one another as sentences and their names do. In other words, sentences in fictional worlds are, for us, names of sentences. We intuitively think such a sentence is true because we interpret it in the actual world, treating a sentence’s name as a sentence. In fact, we cannot remove quotation marks so readily. By analogy with the $T$-schema, we can describe the use of the predicate “is fictional” as follows: “Anyone looking for a sense of reality in a fictional story must have something wrong with their head” is fictional in the actual world if and only if, in the “Haruhi Suzumiya world,” anyone looking for a sense of reality in a story fictional relative to the “Haruhi Suzumiya world”—the “1096 world”—must have something wrong with their head.

The final answer is deeply ironic: “Anyone looking for a sense of reality in a fictional story must have something wrong with their head” is correct relative to the fictional world a certain Kyon inhabits. Indeed, the sentence can be correct relative to any world, actual or fictional. As for the world we inhabit, we cannot actually exclude the possibility that it is fictional relative to another world—**it is actual only for us within it.**

## II. The Ontological Perspective—The Ontological Status of Fictional Worlds

The solution offered above modifies the correspondence-theoretic presupposition about truth, but this modification also affects the other presupposition. In accepting Tarski’s proposal to arrange truth predicates hierarchically, it does the same for the predicate “is fictional.” “Truth” is thus not merely relative to a language: it should first of all be relative to a world. Although we still consider fictional worlds at the level of language, a fictional world is no longer an exceptional case to be excluded. It becomes another world at a distinct level. Conversely, examining fictional worlds also marks out the boundaries of our actual world, refining our previously vague understanding of “world.” No one would deny the distinction between fiction and reality, but the preceding conclusions allow us to characterize more precisely the relations between worlds at different levels, and even between different worlds at the same level.

### (1) Fictional Objects and the Theory of Descriptions

The Handsome Monkey King and my wife have one thing in common: neither exists in the actual world.[^wife] Philosophers call terms without referents in the actual world *empty terms* or *empty names*. Since the meaning of a sentence lies in its reference, terms without referents naturally have no meaning either. Fictionalism, however, holds that empty names do not simply fail to exist: they merely fail to exist in the actual world.

Fictionalism is also known as Meinongianism, after the philosopher Meinong—and that really isn’t pinyin.[^meinong] Meinong’s theory became widely known through Russell’s criticism, and it was on the basis of that criticism that Russell developed his theory of descriptions. Meinong held that empty names refer to fictional objects. Unlike real things, fictional objects have a kind of incomplete existence. Russell considered this absurd: in a sentence such as “The golden mountain does not exist,” we cannot say that the golden mountain does not exist and yet exists in some sense. Russell held that an empty name is really a disguised description, which the techniques of predicate logic allow us to eliminate from the sentence containing it.

[fig]

![Dialogue image accompanying the discussion of Russell’s theory of descriptions](attachments/roof-archive/cv2031971/05-russell-description-theory.jpg)

[fig-note] Chinese subtitle: “This is a logical fallacy.”

The theory of descriptions is, in effect, a technique for replacing sentences containing singular terms with equivalent sentences containing no singular terms. Different kinds of sentences containing different kinds of descriptions receive different treatments. For sentences containing indefinite descriptions (“an…”), we replace “An object with property P has property Q”—indefinite because it does not specify which object—with “All objects with property P have property Q”:

$$
\forall x(Px \to Qx)
$$

For sentences containing definite descriptions (“the…”), we replace “The object with property P exists”—definite because it specifies the object—with “Exactly one object has property P”:

$$
\exists x\forall y(Px \leftrightarrow x=y)
$$

We replace “The object with property P has property Q” with the conjunction—the logical operation representing “and”—of “Exactly one object has property P” and “Any object with property P has property Q.”

$$
\exists x\forall y\bigl((Px \leftrightarrow x=y) \land Qx\bigr)
$$

A sentence such as “The golden mountain does not exist” can thus be expressed as saying that no object has the property of being a golden mountain. Here, the golden mountain is not an object but a property. Russell’s point is that whatever a sentence containing empty terms can express can also be expressed by using quantifiers and predicates appropriately: under the same conditions, the truth value will always be the same. I have explained the theory of descriptions in such detail precisely so that I can give a better explanation of quantifiers and predicates.[^descriptions]

### (2) Definitions of Truth and Actual-World Models

We have already introduced Tarski’s theory of truth. Following his lead, logicians developed model-theoretic semantics. Through the concept of a *model*, they could not only define truth in first-order logic but also use “truth” to explain quantifiers and predicates.

To define “true in a first-order language $L$”: a model $M$ for $L$ is an ordered pair $\langle D,f\rangle$. The domain of discourse $D$ is a nonempty set of individuals; $f$ is an interpretation function from terms to the domain. It maps terms to the domain of individuals, assigning singular terms their referents in that domain and predicates their extensions in it. When the referent of a singular term $t$ belongs to the extension of a predicate $F$, the model assigns the sentence $Ft$ the value true. We then recursively define truth for sentences containing propositional connectives: implication, disjunction, conjunction, negation, and equivalence. For quantified sentences such as “All $x$ are $F$”—taking “there exists” as an abbreviation of “not all are not”—the model assigns true when the extension of $F$ is the entire domain $D$. A model that makes a sentence true is a model in which that sentence is true; a model that makes all the sentences in a set true is a model of that set of sentences. A sentence is a logical truth if and only if it is true in every model.

We can see that this definition of truth does not conflict with the preceding part of the essay. We can take the domain $D$ to be the set of objects in the actual world and call such a model an *actual-world model*. Earlier, we defined a world as a set consisting of sentences describing that world and their consequences. “Consequence” there meant *syntactic consequence*: given a set of sentences $T$ in a deductive system for a first-order language $L$, a sentence $A$ is a syntactic consequence of $T$ if there is a sequence of sentences $B_1,\ldots,B_n$ such that $B_n=A$, and each of $B_1,\ldots,B_n$ either belongs to $T$, is an axiom, or follows from preceding sentences by a rule of inference. Through the concept of a model, we can define *semantic consequence*: a sentence $A$ is a syntactic consequence of a set of sentences $T$ if and only if every model of $T$ is a model of $A$.[^consequence] The great logician Gödel proved the completeness of first-order logic. Together with its previously established soundness, this gives us the equivalence of semantic and syntactic consequence: for any first-order sentence $A$ and set of first-order sentences $T$, $A$ is a syntactic consequence of $T$ if and only if it is a semantic consequence of $T$. Truth relative to a world can thus be characterized precisely through truth relative to a model. A world is better understood not as a set of sentences describing it, but as a model—or set of models—satisfying that set of sentences.

What we earlier called “true in the actual world” thus means true in an actual-world model. To say that an object does not exist is to say that it has no assignment in the model’s domain, or that the property corresponding to the object has no extension in that domain. Through the theory of descriptions, we can avoid the occurrence of empty names in the actual world without worrying that empty terms will endanger classical logic as it stands. Understood this way, Russell’s theory of descriptions has not really refuted fictionalism: fictional objects were never in the actual world to begin with, and the theory of descriptions happens to give us a way of describing fictional objects in the actual world.

### (3) De Re and De Dicto

Consider the negation of a sentence such as “The object with property P has property Q.” There are two possibilities:

$$
\begin{aligned}
&\neg\exists x\forall y\bigl((Px \leftrightarrow x=y) \land Qx\bigr) \\
&\exists x\forall y\bigl((Px \leftrightarrow x=y) \land \neg Qx\bigr)
\end{aligned}
$$

For example, suppose we want to deny “Sun Wukong has the surname Zhang.” In the first case, we negate the whole sentence “Sun Wukong has the surname Zhang,” saying, in effect, “Either the object with property P does not exist, or this object does not have property Q.” In the second case, it becomes “Sun Wukong does not have the surname Zhang,” negating only the fact of “having the surname Zhang”—as everyone knows, Sun Wukong is not an actual person, and the law has forbidden monkeys from becoming spirits ever since the founding of the People’s Republic.[^monkey] In the first case, the description replaces the whole sentence; in the second, it replaces only the first part. These reflect two scopes of a description: we call the former *wide scope* and the latter *narrow scope*.[^scope] If we adopt narrow scope for a sentence, then whether Sun Wukong has the surname Zhang or not, we have not really denied his existence. If we do not want monkeys turning into spirits, we need to avoid confusing scopes.

The choice of scope raises an important question: why should we approach fiction through sentences rather than words? We call the approach that begins with words *de re*, and the approach that begins with sentences *de dicto*. Fictionalists in the past always began by defining fictional objects, trying to argue that these objects simply have another kind of existence, different from actuality, and that sentences containing them remain meaningful. But as the theory of descriptions reveals, a failure to understand scope clearly misleads us into accepting nonexistent objects, and thus into considering fictional and actual objects within the same world. For Russell, however, these are precisely the descriptions that can be eliminated. Fictional things necessarily lie outside the actual world, while words are the basic units for describing a world. If the predicate “is fictional” has narrow scope when applied to fictional and actual things, we have to commit ourselves to the existence of transworld objects, confusing the two worlds. It must therefore have wide scope. If fiction is to be strictly distinguished from reality, fictionality should be a property of sentences rather than words, of worlds rather than individuals.

### (4) Possibility and Being Beyond the Actual

Fictionality, as a property of worlds, must be distinguished from another such property: possibility. Possible-worlds semantics is a semantic theory for interpreting modal logic, which adds modal expressions such as “necessarily” to classical logic. Following the model-theoretic approach, we can construct a possible-worlds model $\langle W,R,V\rangle$. Here, $W$ is a nonempty set, the set of all possible worlds; $R$ is a binary relation on $W$, the accessibility relation between worlds; and $V$ is a valuation function assigning sentences in a modal language—a first-order language with modal expressions added—to a world in $W$. A possible-worlds model allows us to define modal expressions. Write “necessarily $p$” as $Np$, and take “possibly $p$” as an abbreviation of “not necessarily not $p$”:

$Np$ is true in a possible world $w$ if and only if $p$ is true in every world accessible from $w$.

We can thus define truth for sentences in a modal language relative to a world in $W$. Since the actual world is one of the possible worlds, what we previously called truth is also truth relative to the actual world.

As we can see, possible-worlds semantics also defines “truth” relative to worlds and treats possibility as a property of worlds. Unlike fictional worlds, however, the “possibility” of possible worlds is not a purely extensional, clear-cut concept. Nor is there an adequate definition of “possible world” itself. Philosophers’ definitions are either incomplete or circular, to the point that logicians have had to treat it as a primitive concept. Nevertheless, we can still identify some properties of possible worlds. First, they conform to the laws of logic: they contain no contradictions. Second, they are conceivable.

Besides the lack of a clear definition, possible worlds face the problem of transworld identity for possible individuals. When we say that an individual $t$ might have property $S$, we mean that there is a possible world $w$ in which $t$—write it as $t'$—has property $S$. If the actual $t$ lacks property $S$, but $t'$ in $w$ has it, then under Leibniz’s law ($t=s$ if and only if $s$ has every property that $t$ has), $t$ and $t'$ are not identical. Although Leibniz’s law is too strict, weakening “every property of $t$” to “some properties of $t$” leads back to essentialism, identifying a thing with certain essential properties. Yet if we accept that they are not identical, the cost is even greater: if $t$ is not $t'$, how could $t$ possibly become $t'$, with property $S$? Some philosophers pin their hopes on establishing a relation of correspondence between $t$ and $t'$, but that is even harder to explain.

[fig]

![The world’s possibility in an anime dialogue](attachments/roof-archive/cv2031971/10-possible-world.jpg)

[fig-note] Chinese subtitle: “It is this world’s possibility.”

All these views treat objects in possible worlds as real objects. They treat a possible world as a “distant country,” and possibility as a matter of looking through a telescope at that country to see whether the corresponding phenomenon occurs. All the worlds are real; it is just that only the actual world is actual. They also identify proper names with sets of descriptions expressing their properties—“the object with property S.” This view is called realism about possible worlds. Faced with realism’s various problems, Kripke proposed a conceptualist account of possible worlds: possible worlds are not “possible worlds” but “the world’s possibilities” (from *Boogiepop*). Kripke rejected the theory of descriptions: a proper name is uniquely determined by its referent, not by the descriptions associated with it. Discussion of possible worlds thus becomes discussion of the possible states of a world composed of these objects. But Kripke’s definition of a proper name as “referring to the same object in all possible worlds” is not free from the suspicion of circularity.

Whatever possible worlds consist of, these discussions at least give us a third property: individuals in possible worlds correspond to individuals in the actual world. When we consider possibility, we do so on the basis of the actual world. In this respect, we can distinguish possible worlds from fictional worlds. Although fictional worlds, too, are based on imagination and must conform to logic, they are certainly not actual. If we insist on examining their possibility, they can only be impossible. A large part of the difficulty faced by earlier theories of possible worlds arose from placing fictional, impossible objects within possible worlds.

We can now distinguish possible worlds from the actual world. Although both are concepts relative to the actual world, the relation between the actual world and possible worlds is one between the actual and the nonactual; the distinction between the actual world and fictional worlds is one between the actual and what lies beyond it. Fiction’s being beyond the actual is manifested in the hierarchical structure of the predicate “is fictional.” Possible worlds, by contrast, run parallel to the actual world.

We have now characterized the relation between fictional worlds and the actual world clearly enough—though not necessarily adequately, since the paper was too small for me to supply all the details of the argument. I think the account of fictional objects offered here does not compete with established mainstream areas of logic and philosophy such as model-theoretic semantics, the theory of descriptions, and possible-worlds theory. Rather, it usefully supplements them. It does not in the least prevent us from defining truth within model-theoretic semantics, discussing modal logic within possible-worlds semantics, or using the theory of descriptions as a tool that lets us discuss descriptions of fictional objects in the actual world. Such descriptions can be regarded as translations of fictional sentences.

## III. The Epistemological Perspective: Fiction That Is Neither True nor False?

How does “truth relative to a world” differ from earlier conceptions of truth? Must what is true in a fictional world be false in the actual world? Both Russell and Tarski were staunch supporters of the principle of bivalence: every proposition is either true or false, with no third option. But this understanding runs into difficulties with fictional objects. The problem is particularly acute for logical truths that ought to be true in every model, such as the law of identity and the law of excluded middle. When their singular terms are replaced with fictional objects—as in “Sun Wukong = Sun Wukong” or “Sun Wukong either has the surname Zhang or does not”—are they still true in the actual world? If we take them to be false, these logical truths will not be true in every case, challenging the validity of logic. We call such sentences instances of logical truths in fictional-world models. Logical truths should be true in every world relative to every world, not true in every world only relative to the world in which they occur.

For these sentences, Russell insists on bivalence. He holds that if we distinguish wide scope from narrow scope, we can regard all sentences predicating something of nonexistent objects as false without violating excluded middle. Russell is guilty here of “extending anti-fictionalism beyond its proper targets”: he leaves us unable to distinguish descriptions of fictional worlds from false descriptions of the actual world. In fact, although fictional sentences are not true in the actual world, they are not equivalent to false descriptions of it. Russell’s “extension of anti-fictionalism beyond its proper targets” also shows itself when, in eliminating empty terms from sentences, he eliminates ordinary, innocent names along with them. The distinction between empty and ordinary terms is not, in fact, an a priori one. Fictional objects do not exist in the actual world, but the empty terms referring to them do. Whether their referents exist is an empirical judgment, not an a priori one.

If we are to maintain a fictionalist position, we need to be clear about the following facts. Fictional sentences are meaningful: they describe fictional worlds and therefore cannot have their truth or falsity determined by the actual world. Moreover, although fictional worlds are not actual, the names of fictional sentences, and the activity of conceiving fictional worlds, are actual. Finally, the theorems of classical logic remain applicable to fictional objects in the actual world. The philosophical position of fictionalism requires us to establish a fictionalist logic without violating classical logic.

### (1) Empty Terms and Existential Presupposition

First, we need to define empty terms through model-theoretic semantics. For a model $M=\langle D,f\rangle$, if $f$ makes no assignment to a term $t$ in $D$, we say that $t$ is undefined in $M$. We call such terms *empty terms*. Classical logic presupposes that every term has a referent. This requirement is called *existential presupposition*. We define presupposition as a semantic relation between sentences:

A sentence $A$ presupposes a sentence $B$ if and only if $B$ is true in every model that makes both $A$ and not-$A$ true.[^presupposition]

Existential presupposition means that a sentence $\varphi$ containing an individual constant $t$ presupposes that $t$ has a referent: this follows whether or not $\varphi(t/x)$ is true. As in the theory of descriptions, we use quantifiers and the identity sign to express a term’s having a referent. We write $\exists x(x=t)$ to say that $t$ has a referent, indicating that $t$ is defined in the model $M$. We can see, then, that introducing empty terms as fictionalism requires is not really a matter of adding empty terms to our existing stock of terms. It is a matter of abandoning the presupposition that every term has a referent, so that in a first-order language we no longer know a priori whether a term’s referent exists. This accords with intuition: the existence of a name does not amount to the actual existence of its referent.

Once existential presupposition is abandoned, the valuation function $f$ in model $M$ no longer makes an assignment for every term. It becomes a *partial function*, and the model becomes a *partial model*.[^partial] Although empty terms have been introduced, quantifiers retain their existential import. We interpret quantification as ranging “over all objects in the domain of individuals”: an object’s existence consists in its being substitutable for the variable $x$ bound by a quantifier—Quine’s ontological commitment. A logic that abandons existential presupposition while retaining the existential import of quantifiers is *free logic*: free from existential presupposition. I think we can build a semantics suited to fictionalism on the basis of free logic.

Free logic divides the domain of individuals into two parts. The domain over which quantifiers range is taken as the *inner domain*, while the referents of empty terms are assigned to the *outer domain*. Classical logic remains applicable to the inner domain; we can regard the outer domain as composed of fictional objects. This outer domain is merely a technical device for considering fiction within the actual world. It need not have a precise delimitation, nor is it equivalent to a fictional world. We can understand it this way: individuals in this world belong to the inner domain, and individuals in other worlds belong to the outer domain.

### (2) Truth-Value Gaps and the Principle of Bivalence

Another consequence of abandoning existential presupposition is the *truth-value gap*. Truth-value gaps arise from presupposition failure. Suppose sentence $A$ presupposes sentence $B$. If $B$ is false, $A$ is neither true nor false: $A$ falls into a truth-value gap. In free logic, $M$, with existential presupposition abandoned, is a partial model. It cannot assign objects in the domain of individuals to empty terms, and so cannot assign truth or falsity to sentences containing them.

Take $M$ to be an actual-world model containing the names of fictional objects. For fictional sentences to have neither truth nor falsity in $M$ is for them to have neither truth nor falsity in the actual world, which is natural enough. But do tautologies and contradictions containing empty terms likewise have neither truth nor falsity? What makes these tautologies true and contradictions false is not their correspondence with the world, but the definitions of logical symbols and the construction of logical rules: pure logical form. For example, “Sun Wukong has the surname Zhang” and “Sun Wukong does not have the surname Zhang” have no determinate truth values in the actual world, because truth here is truth relative to a world. But “Sun Wukong either has the surname Zhang or does not” is true. Its truth depends on the definition of “or.”

In classical logic, we define logical truths as sentences true in every model. The soundness and completeness theorems allow us to prove that these sentences true in every model are equivalent to sentences true by virtue of their form. Yet even though these two kinds of truth have the same extension in classical logic, we still need to distinguish them. “Sun Wukong either has the surname Zhang or does not” is naturally true in a certain fictional world. But as we said earlier, logical truths should be true in every world relative to every world, not true in every world only relative to the world in which they occur. The latter might allow something to be untrue in one world relative to another: its truth would still depend on a world. If logical truths are to be true in every model, they should not be confined to a particular kind of model or to a particular world. Otherwise, even if they were true in every world, their truth would remain relative and contingent. Logical truth should depend on something more fundamental, a property common to different worlds: logical form. We regard a fictional world as a set of sentences depicting it. Only if different worlds share the same logical form can we describe them in logical languages with the same structure; otherwise, positing fictional worlds would lose its point. Besides, being untrue in one world relative to another is not a case of being true in every model, and this would damage logical completeness.

To understand these two kinds of truth better, we need to distinguish the syntactic law of excluded middle, “$P\lor\neg P$,” from the semantic principle of bivalence, “$T(P)\lor T(\neg P)$.” If we are to maintain that truth by virtue of form is more fundamental, we need to prove that truth-value gaps, in which sentences are neither true nor false, do not prevent excluded middle from holding. In proposing supervaluational semantics, van Fraassen sought to show that even though $P$ and not-$P$ individually lack truth values in a truth-value gap, $P$ or not-$P$ can still be supertrue. He first pointed out that if we follow Tarski’s $T$-schema and accept the definition of semantic presupposition, we find that bivalence itself is presupposed:

1. $P$ implies $T(P)$.
2. $T(P)$ implies $T(P)\lor T(\neg P)$.
3. $P$ implies $T(P)\lor T(\neg P)$.
4. $\neg P$ implies $T(P)$.[^step]
5. $T(\neg P)$ implies $T(P)\lor T(\neg P)$.
6. $\neg P$ implies $T(P)\lor T(\neg P)$.
7. $P$ implies $T(P)\lor T(\neg P)$, and $\neg P$ implies $T(P)\lor T(\neg P)$.
8. $P$ and $\neg P$ each presuppose that bivalence holds.

If we accept this conclusion, it becomes quite natural to accept that bivalence is not absolute. Bivalence is presupposed. Since truth is defined relative to a world, being either true or false is also defined relative to a world. Excluded middle, as a logical form, should take priority over it.

If we follow this conclusion further and compare presupposed bivalence with existential presupposition, we find a very close connection between them. For an atomic sentence composed of a singular term and a predicate, the model can assign it a truth value only when the singular term is defined. Thus, for sentences containing singular terms, bivalence depends on existential presupposition being satisfied. Conversely, if a sentence is either true or false, the singular term it contains has a referent. Existential presupposition depends on bivalence holding. From this we obtain the following two inferences:

1. $\exists x(x=t)$ and $\varphi(t/x)$ imply $T(\varphi)\lor T(\neg\varphi)$.
2. $T(\varphi)\lor T(\neg\varphi)$ and $\varphi(t/x)$ imply $\exists x(x=t)$.

We can see that existential presupposition and bivalence are equivalent for the language of predicate logic. When a fictional sentence’s existential presupposition fails in the actual world, its presupposition of bivalence fails there too. Thus, the so-called “either true or false” truth-value-gap state of fictional sentences is, in essence, a state with no truth value assigned in which bivalence fails.[^gap]

### (3) Supervaluation

We now know that bivalence and “truth in a world” are relative to a world. What remains is to prove that excluded middle holds in every world as an expression of the logical structure shared by different worlds. Bencivenga, another important figure in supervaluational semantics, calls its way of assigning values a “mental experiment.”[^mental] When a singular term has no referent, the actual world cannot verify the truth or falsity of a sentence containing it. Here we must turn to a thought experiment: imagine that the term has a referent, whatever it may be, and then consider the sentence’s truth under those conditions. Supertruth belongs to sentences that are true no matter what object the term is imagined to refer to. Their truth cannot be obtained through physical facts; it requires counterfactual situations imagined through an “if.” Hence the name *counterfactual theory of truth*. We can summarize supertruth under this thought experiment with a conditional: if the singular term had a referent, the sentence would be true.

As a method of assigning values, supervaluation proceeds in two steps. First comes a *partial valuation*: given a model $M=\langle D,f\rangle$, assign true or false to sentences that are true or false under $M$, and assign no truth value to sentences without a truth value under $M$. Then arbitrarily assign truth values to the sentences without truth values under $M$, extending the original partial valuation into a *total valuation*. We do this by assigning the term an arbitrary object and then imagining the sentence’s truth under that condition. This is the thought experiment. The resulting total model is called a *classical extension* or *completion* of $M$.

Given an ($f$; $D$) model $M$, a supervaluation model $S_M$ over $M$ is the set of all completions of $M$. Sentences true under the supervaluations of all models constitute the logical truths of supervaluation ($\mathrm{SL}$-truths).

Definitions:

$A$ is true in $S_M$ if and only if $A$ is true in every classical extension of $M$.

$A$ is false in $S_M$ if and only if $A$ is false in every classical extension of $M$.

$A$ is neither true nor false in $S_M$ if and only if $A$ is true in some classical extensions of $M$ and false in others.

The third case is the state with no truth value assigned discussed in the previous section. Through supervaluation, logical truths are supertrue in every model. Bencivenga proved that the logical truths of classical logic are precisely the logical truths under supervaluation, thereby proving the weak completeness of free logic (tautologies = formulas true in every model). Although later logicians proved that supervaluation cannot achieve strong completeness (formal consequence = semantic consequence), that kind of completeness need only be proved relative to a particular world. Weak completeness is sufficient for the purposes of fictionalism.[^completeness]

### (4) Conceivability

Supervaluational semantics takes logical truths to hold in fictional sentences as a result of thought experiments. Conceiving of fictional objects as existing in these experiments can likewise be regarded as conceiving a fictional world. We may call this property of depending on acts of conception for existence *conceivability*: fictional worlds are possible because we can conceive of them, and such conception is possible only by following the laws of logic. Thus, the laws of logic hold not only relative to the actual world; through the activity of conception, they hold in every world.

In supervaluational semantics, the conceivability of a fictional world takes the form of completing a partial model. To conceive of fictional objects as existing is to conceive of fictional individuals originally in the outer domain being added to the inner domain. This allows the partial model to be completed into a total model, so that both existential presupposition and the presupposition of bivalence hold over this domain of individuals. A particular completion of a partial model can, in fact, be regarded as a particular fictional world. A fictional world does not consist entirely of objects from fictional worlds; it can also be an extension of the actual world, composed of a subset of existing individuals together with certain fictional objects. Individuals whose coexistence with those fictional objects might produce contradictions should be eliminated. A fictional world does not emerge from nothing: it must still be patterned on the actual world.

We should note that although fictional worlds can contain actually existing objects—Baker Street in Conan Doyle’s writing, for example—those objects remain in a fictional world, at a different level from the actual world. Strictly speaking, they should be described as individuals in a fictional world that can correspond to individuals in the actual world. Fictional objects therefore cannot simply be defined as objects in fictional worlds. They are objects that appear in fictional worlds but have no corresponding actual individuals. Fictional objects may draw on real-life models when they are conceived, but that relation is readily distinguishable from the correspondence at issue here. A fictional object may have many real-life models, or just one person, but that person will not have the same properties or have lived through the same story as the character. Even if the real-life model did experience events just as the story describes, or if a secondary-school concert band in Uji happened to reach the national competition in real life, we can still appeal to the familiar disclaimer in fiction: any resemblance is purely coincidental.

We can now give a relatively complete characterization of fictional worlds. As I said earlier, a fictional world is a set of sentences describing it, and also the set of all models satisfying that set of sentences. The domains of individuals in these models satisfying the fictional world are naturally formed by taking the actual world as a basis, adding fictional objects, and eliminating individuals that might lead to contradictions. Fictional individuals are objects appearing in fictional worlds that have no corresponding actual individuals. Although “fictional” here describes objects, it is quite different from “fictional” as a predicate of sentences; this usage is merely for ease of understanding. Fictionality is primarily a property of sentences, and only secondarily a property of objects.

That is as far as my thinking goes. Although this essay may look like an academic paper, I cannot answer for every sentence in it: it is far too rough. It can only count as a draft, since any reader who takes the trouble will readily find many places where it fails to cohere. I have crudely spliced together theories and concepts of different kinds, and lack of space has prevented me from analyzing and repairing the finer points where they do not fit. Nor can I guarantee the accuracy of the accounts of those theories and concepts: they all come from my subjective, and possibly mistaken, understanding. I can only thank the discipline of logic for making them at least look correct. Still, I do not think this essay is without value. I have presented my thoughts on fictionalism and used some theories from logic to develop them, introducing some ideas from logic along the way. I hope readers will focus on what is valuable here, find inspiration in it, and offer me worthwhile comments.

## Editor’s Note

[fig] Complete Defeat

![Editor’s illustration: Complete Defeat. A character says they now understand completely; an arrow labels them as understanding nothing at all.](attachments/roof-archive/cv2031971/13-editor-defeated.jpg)

[fig-note] Chinese text: “Ohhh, so that’s how it works. Yes, I understand completely now.” Arrow: “Understands absolutely nothing.”

[^bio]: Translator’s note: The opening of [1 Corinthians 13:1, King James Version](https://www.biblegateway.com/passage/?search=1+Corinthians+13%3A1&version=KJV). The author’s biography stops before the rest of the verse.

[^seven]: Translator’s note: “7” is [Chinese fandom shorthand for this image](https://moegirl.icu/天树虚字): the strip of sky and Kyon’s upright figure roughly form the numeral. It is not a figure number.

[^tarski]: Translator’s note: “Disjunction,” the relation between a sentence and its name, and the pairing of “disquotation” with “semantic ascent” follow the Chinese source. In [Tarski’s own account, §§4–5](https://www.jfsowa.com/logic/tarski.htm), the partial definitions are combined by conjunction, and truth is a property of sentences.

[^snow]: Translator’s note: Wording from [Tarski’s “The Semantic Conception of Truth and the Foundations of Semantics,” §4](https://www.jfsowa.com/logic/tarski.htm).

[^mikuru]: Translator’s note: “1096” is a [Chinese numerical nickname for Mikuru Asahina](https://keyfc.com/bbs/showtopic.aspx?forumid=2&forumpage=1&go=prev&topicid=19591), based on the sound of her Chinese name. The “1096 world” here refers to the film within the story, *The Adventures of Mikuru Asahina Episode 00*. The [official *Haruhi* site](https://www.haruhi.tv/fanclub/special_event.html) identifies it as the independently made film screened by Haruhi at the school festival.

[^wife]: Translator’s note: “My wife” invokes the fan practice of claiming a fictional character as a spouse. The Handsome Monkey King is Sun Wukong, the protagonist of *Journey to the West*.

[^meinong]: Translator’s note: The equation of [fictionalism](https://plato.stanford.edu/entries/fictionalism/) with Meinongianism is the author’s usage; the terms are not ordinarily synonyms. *Pinyin* is the romanization system for Mandarin Chinese.

[^descriptions]: Translator’s note: The formulas and their accompanying claims are retained as printed. On the usual existential reading, “An object with property P has property Q” takes an existential quantifier, not the universal quantifier shown here. In the definite-description formulas, the uniqueness condition requires $Py$ where the source prints $Px$. For Russell’s contextual analysis of descriptions, see [“On Denoting”](https://users.drew.edu/~jlenz/br-on-denoting.html).

[^consequence]: Translator’s note: The source introduces semantic consequence but calls it “syntactic consequence” in this definition.

[^monkey]: Translator’s note: [Zhang Jinlai, known as Liu Xiao Ling Tong](https://www.chinadaily.com.cn/culture/2016-01/28/content_23281337.htm), famously played Sun Wukong: the example plays on the distinction between actor and character. The supposed legal ban echoes the Chinese internet joke that animals have been forbidden to become spirits since the founding of the People’s Republic in 1949.

[^scope]: Translator’s note: These are the source’s labels. If the scope in question is that of the description relative to negation, the first displayed form gives the description narrow scope, and the second gives it wide scope. See Russell’s distinction between primary and secondary occurrence in [“On Denoting”](https://users.drew.edu/~jlenz/br-on-denoting.html).

[^presupposition]: Translator’s note: The source says “both.” The surrounding explanation considers $A$’s truth and falsity separately, rather than requiring both in the same model.

[^partial]: Translator’s note: The source’s Chinese term means “partial model,” but its accompanying English gloss repeats “partial function.”

[^step]: Translator’s note: Step 4 prints $T(P)$ in the source; the subsequent argument requires $T(\neg P)$.

[^gap]: Translator’s note: The source says “either true or false” here, in conflict with its account of a truth-value gap as neither true nor false.

[^mental]: Translator’s note: Bencivenga uses “mental experiment” in [“Putting Language First: The ‘Liberation’ of Logic from Ontology,” p. 302](https://www.blackwellpublishing.com/content/BPL_Images/content_store/WWW_Content/9780631216711/019.pdf), for imagining otherwise non-denoting names as having referents.

[^completeness]: Translator’s note: Van Fraassen already distinguishes statement-completeness from argument-completeness in [“Singular Terms, Truth-Value Gaps, and Free Logic” (1966), §§VI–VII](https://ontologievorlesung.wordpress.com/wp-content/uploads/2011/11/van-fraassen-gaps-and-singular-terms.pdf). The historical sequence given here follows the Chinese source.
