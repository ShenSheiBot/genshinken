---
title: SEP：蒙太古语义学（Montague Semantics）
title_breaks: [SEP：蒙太古语义学, （Montague Semantics）]
date: 2020-06-29
slug: sep-montague-semantics
script: hans
categories: [思想与理论]
section: translation
tags: [蒙太古语义学, 形式语义学, 语言哲学, 组合性原则, 模型论语义学]
post_author: Theo M. V. Janssen
translator: cjy
excerpt: 《斯坦福哲学百科》“蒙太古语义学”词条导言至第3.5节中译，介绍模型论语义学、组合性原则、广义量词、内涵逻辑、辖域与句法—语义关系；中文译文未收录第3.6节、结语和参考文献。
citation:
  itemType: bookSection
  citationKey: janssen2016MontagueSemanticsZH
  date: "2016"
  bookTitle: The Stanford Encyclopedia of Philosophy
  edition: Spring 2016
  publisher: Metaphysics Research Lab, Stanford University
  url: "https://plato.stanford.edu/archives/spr2016/entries/montague-semantics/"
  extra: "原词条2011-11-07初版、2016-02-25实质修订；中文译文首发于豆瓣笔记（https://www.douban.com/note/761585870/），原发日期未核明，2020-06-29发表于屋顶现视研；公开译文载至第3.5节，不含第3.6节、第4节及Bibliography。"
---

> **译者：**cjy
>
> **原地址：**<https://www.douban.com/note/761585870/>
>
> **译者前言：**
>
> - 简单介绍下作者来着，作者Theo Janssen也是以前阿姆斯特丹大学ILLC研究所的成员，但已于18年病逝，，，默哀一下，，，，，
> - 英文术语标识和引用标识会用小括号在文中标识出来。我译的时候复习到的一些感兴趣的东西，自作多情地作为一些基础性的补充，或者，自用吐槽之类与注释之类，会用中括号标识出来，以示区别。
> - 文章总体来说比较简单，形式化相关，和对蒙太古那些原始论文中的技术性与细节性讨的论非常少，应该对formal semantics没什么了解的也应该能通读来着(吧)
> - 参考文献部分，请参原文：<https://plato.stanford.edu/entries/montague-semantics/>

---

*First published Mon Nov 7, 2011; substantive revision Thu Feb 25, 2016*

蒙太古语义学是一个自然语言语义学(natural language semantics)理论，并且同样和句法学(syntax)相关。它最初由逻辑学家理查德蒙太古(Richard Montague)发展得到，随后被语言学家，哲学家，逻辑学家们修正并拓展。该理论最重要的特征是其对模型论语义学的使用(model theoretic semantics)，模型论语义学现在被广泛地运用在逻辑语言(logical languages)语义学，和反映对组合性原则的遵守(the principle of compositionality)上。后者指，整个的意义取决于其部分的意义及其句法的组合形式。在这里我们将介绍蒙太古语义学的起源，并总结一些其经典理论的重要方面，然后勾勒一些最新进展，最后我们将以一个反应了一些其理论的更当代特征的小例子来结束。

## 目录

- 1. Introduction

  - 1.1 Background

  - 1.2 Basic Aspects

- 2. Components of Montague Semantics

  - 2.1 Unicorns and Meaning Postulates

  - 2.2 Noun Phrases and Generalized Quantifiers

  - 2.3 Logic and Translating

  - 2.4 Intensionality and Tautologies

  - 2.5 Scope and Derivational History

- 3. Philosophical Aspects

  - 3.1 From Frege to Intensions

  - 3.2 Compositionality

  - 3.3 Syntactic Categories and Semantic Types

  - 3.4 Pragmatics

  - 3.5 Ontology

  - 3.6 Psychology

- 4. Concluding Remarks

  - 4.1 Legacy

  - 4.2 Further Reading

  - 4.3 Example

- Bibliography

## 1. Introduction

### 1.1 Background

蒙太古语义学是一种关于自然语言的语义学的进路，它最初由蒙太古在二十世纪七十年代引入。蒙太古这样描述了他整个事业的目标“语义学的基本目标是，描述关于真句子(在给定的解释(interpretation)下)，及其间的蕴涵(entailment)的概念 (Montague 1970c, 223 fn)”。

关于蒙太古建立其语义学理论的方式的一些显著特征是：它是模型论语义学的，语义与句法间系统性的关系[句法－语义的同态运算]，以及关于自然语言语片(fragment)的完整而明晰的描述。他的这些方式构成了一场革命：在乔姆斯基将数学手段引入到句法学之后，现在，这些相关手段现在同样被引入到了语义学之中。

蒙太古的方法后来变得很有影响力，许多学者开始在他的框架下进行讨论，并开展关于蒙太古语法(Montague Grammar)的专题会议。之后他的一些方法得到了一些修正与改变，一些总体上被接受下来而另一些则被完全抛弃。现在很少有人将自己的工作称为蒙太古语义学，因为的确这些工作已经和蒙太古的原始工作产生了很多差异。但他的想法在语义学上留下了浓墨重彩的一笔，并永久地改变了其格局。在我们对蒙太古语义学的介绍里，我们将重点关注这些发展。

蒙太古是一个曾专攻于集合论(set theory)和模态逻辑(modal logic)的数理逻辑学家。他关于自然语言的一些观点必须考虑到他的这些数学背景。蒙太古认为自然语言是形式语言，就像谓词逻辑是形式语言一样。在他看来关于自然语言的研究是属于[可以被还原到]数学上的，而非心理学上的[手动@Chomsky] (Thomason 1974, 2)。蒙太古这样阐述了他的观点“我认为自然语言与人工语言间并没有任何重要的理论性区别，我认为可以通过一个自然而精确的数学理论来理解这两种语言的语义与句法(Montague 1970c, 222)”。

关于这段话，有些时候只有第一段被人们引用，这可能引起一个大问题，即，蒙太古是否注意到了这两种语言间的巨大差异，例如自然语言的发展是没有一套先验性的规则，而人工语言却拥有清晰的句法，并服务于一个明确的设计目的。但是这整段话却清晰地表达了蒙太古的意思，注意，没有重要的理论性的差异。他所说的这样一个自然而精确的数学理论出现在他的论文《普遍语法(Universal Grammar (Montague 1970c))》中。他变得最为著名时是在Montague 1973的出现之后[被杀害两年后]，在其中，他的理论被运用在一些，在当时的哲学文献中被广泛讨论的现象上。

蒙太古对自然语言与人工语言相关的兴趣早在其讲授关于逻辑学的导论性课程时就展现了出来。课程要求人们去做一些将自然语言翻译成逻辑语言的联系。要回答这些问题需要一个双语者，他既懂自然语言又懂逻辑。蒙太古，其历史上首次提供了这样一种机械性的手段去获得这些逻辑翻译。关于这些他说到“应强调的是，这与模糊的直觉无关，就像初等的逻辑课中那样，而和我们已赋予其确切意义的断言有关(Montague 1973, 266)”。

我们接下来将描述一些关于蒙太古语义学的基本的思想。第二节则会提供一些更细节性的蒙太古语义学的组成，第三节会包括一些哲学性趣味的讨论，第四节则会提供一个更具细节的例子和深入阅读。

### 1.2 Basic aspects

为了实现他的目标，蒙太古使用了对于逻辑语言来说的标准方法，模型论语义学。这意味着，使用那些来自集合论的构造，一个模型是被定义的，进而自然语言的表达被解释为这个全集中的元素(或者集合，或者函数)。这样一个模型不必被视为一个现实的模型，一方面，这个模型给出的东西多于现实：自然语言不仅仅是关于过去，现在，将来的现实世界，还有那些可能的情况，想象，甚至是根本不可能的情况，而另一方面，这个模型给出的东西更少：它仅仅列举出语言所构想出的现实。一个例子是，当我谈论一些物质名词(mass nouns)时，比如“水”，就好像是水是同质的，没有最小部分一样，然而这在物理上并不正确。更多关于自然语言的形而上学相关，可参Bach 1986b。

蒙太古语义学对于一个特定的情形，比如现实世界，并没有兴趣，而有兴趣的是语言的语义属性。当形式化这些属性时必须提及参考一类模型，所以关于这个语言的解释也将会被定义为对一系列合适的模型的反映。一个例子，在导言中我们提及了对蕴涵的刻画是语义学的一个基本目标，蕴涵这个概念将被这样定义：句子A蕴涵句子B，如果，在所有模型的A的解释都是真的，则B的解释也是真的。同样，重言式为，它在所有模型下都为真，而矛盾则为，没有一个模型下为真。

蒙太古语义学的一个本质特征是句法与语义的系统关系。组合性原则描述了这样一种关系，它如今的标准形式是：复合表达式的意义取决于其部分的意义与其句法上的组合形式(Partee 1984, 281)。

一个例子，假定“走路(walk)”或者“唱歌(sing)”(对于这类中的每个模型)被定义为一个关于一些各自都分享了“走路”或者“唱歌”这一属性的个体的集合。通过诉诸组合性原则，如果这里有一个规则将这两个表达合并为一个动词短语，“走路并唱歌”，那么也一定会有一个相应的规则决定这个合并后的动词短语的意义，在这个例子中，这个最后的意义就是这两个集合的交集，所以，在所有模型中，“走路并唱歌”的意义，是“走路”的意义的子集。此外，我们还会有一个名词短语“John”和动词短语结合的规则。最后的句子是，“John walks and sings”，意味着，John是上面被提到的那个集合中的一个元素。注意到这样的一个事，如果在任何模型中的John是一个walkers与singers交集的元素的话，他同样也将是一个walkers的集合的元素。所以“John walks and sings”蕴涵“John walks”[这个简单的例子中暂时还没有引入句法上对于英语动词第三人称单数变形的处理，以及，给定，像walk和walkers这样两个词间的意义的关系]。

组合性原则的一个重要后果是一个句子所有句法上的组成都将拥有意义。此外，任何一个句法上的角色都将伴随着一个语义角色，以说明复合表的式的意义是如何得到的。所以，一个表达式的意义式由它形成的方式决定的。它的这个构成的派生(derivation)的历史也将在意义的决定上扮演重要角色。更多的讨论见2.5节[会造成影响的大部分是量词之类引起的辖域歧义]。

导言中的蒙太古语义学的目标的制定(刻画句子的“真”与“蕴涵”)，表明他的方法仅限于陈述句。但这并不是一定的，在Montague 1973中，我们已经找到一些关于如何如理命令句与问句的建议。Hamblin(1973)和Karttunen(1977)已经给出了一个关于问句的语义学，通过将这样一个意义考虑为基于句子集上的(即命题集(sets of propositions))。Groenendijk and Stokhof(1989)将问句视作自认性质的意义的表达(namely partitions)。

由于蒙太古仅仅将句子看作孤立的，因此一些评论者指出在这种方法下句子的界限是严格限制的。但是对于话语(discourse)呢？显而易见的要求是话语中的句子要被一个接一个的解释。那么如何处理回指(anaphora)跨句的共指关系(co-referentiality)呢[即驴子句的问题(donkey sentence)]？第一个解决方法是话语表达理论(Discourse Representation Theory)(Kamp 1981)。一方面，它是蒙太古进路的后裔，因为它也运用的是模型论语义学，但另一方面它是偏离的，因为话语表达(discourse representations)是必不可少的。现在，已经有一些对于DRT的重新表述使其适用于蒙太古的框架中(见 van Eijck and Kamp 1997)，稍晚一些的解决方法基于了一些逻辑上的改变，动态蒙太古语义学(Dynamic Montague Semantics)被发展起来，这个理论提供了一个对自由变项(free variables)结合的逻辑过程，并且它将会对后式产生影响(Groenendijk and Stokhof 1991)。所以，句子的边界对于蒙太古语义学并不是一个根本上的困难。

## 2. Components of Montague Semantics

### 2.1 Unicorns and Meaning Postulates

蒙太古最具影响力的论文是，《普通英语中量词的特定处理(The Proper Treatment of Quantification in Ordinary English(Montague 1973))》。它提供了一个，涵盖一些在当时被广泛讨论的现象的英语片段。其中一个例子给出了蒙太古语法的特点：独角兽(unicorn)(很多关于蒙太古语法的文章或专著都用独角兽来举例)。

考虑这两个句子，John finds a unicorn，以及John seeks a unicorn. 它们在句法上是相似的(subject-verb-object)，但是有着很大的语义上的不同。根据第一个句子，我们可以说至少存在一只独角兽，但是第二个句子却是模糊的，因为存在这样两种解释：从言的(de dicto)，它并不隐含独角兽的存在，从物的(de re)则可以。

这两个句子的例子是一个被叫作内涵语境中的量化(quantification into intensional contexts)的经典疑难。传统上，第二个句子被整个地看作一个内涵语境。而蒙太古处理的新颖的地方在于他将seek的对象[即unicorn]看作这个问题的根本。他将seek形式化为一个个体和一个更为抽象的实体间的关系，而不是两个个体间的关系，见2.2节。在这种分析下，我们并不需要说独角兽存在，而如何得到从物解读的意义，则是通过另外一种不同的方式，见2.5节。

蒙太古的策略是将所有表达的范畴诉诸到最普遍的那一个[一中范畴－类型提升的手段，例如他在PTQ中将及物动词词组TV，e.g. seek，处理为类型为&lt;&lt;s,&lt;&lt;s,&lt;&lt;s,e&gt;,t&gt;&gt;,t&gt;&gt;,&lt;&lt;s,e&gt;,t&gt;&gt;的东西]，而在必要时通过意义公设(meaning postulate)缩小它。所以，最开始时find仍然是被视为一个在个体和抽象实体的关系，但一些意义公设将，在我们解释下的语片的这类模型限制为，find表示的仅仅是一个(经典的)个体间的关系。

这种策略的后果是，蒙太古的论文中有着太多的意义公设。而现在的语义学家们则更偏向于去直接表明，单个词汇的词汇意义中的语义属性，所以，find，被直接解释作两个个体间的关系。现今的意义公设主要被运用于去表达模型的结构属性(一个例子是时间轴的结构)，以及去表达一些语词的意义间的关系[比如，单身汉就是未婚的男人]。对意义公设的角色的讨论，可见Zimmermann 1999。

### 2.2 Noun Phrases and Generalized Quantifiers

像“a pig, every pig, Babe”这样的名词短语在句法上有诸多相似的表现，它们可以出现在同一个位置上，可以被组合，等等。但是如果说它们在语义上也是统一的看起来却会发生问题。一些建议是every pig指称(denote)普遍而通称的pig(universally generic pig)，而a pig则是一只任意的pig。但Lewis(1970)拒绝了这些建议，他举的一个例子是考虑“the color of the universal pig”的问题，这个universal pig有着all colors[指的是universally generic color？]，或者它是无色的[有点tmd柏拉图的味道，草]。

蒙太古的建议是将这些描述性的短语(descriptive phrase)的外延(denotation)当作是一个性质集(a set of properties)。举例来说，John的外延就是一个由他所拥有的性质所构成的集合，而对于every man则是一个every man所有的性质的集合。因此，它们现在在语义上也是一致的[这种对一致性的考量是2.1节中说的，他将所有表达式的范畴类型都诉诸并划归到最普遍的那一个的原因]，可以以同一种方式去处理，对它们添加合取，析取算子或者任意的量化短语(包括像 most but not all这样的)。

这种抽象的方法[通常通过λ-calculus实现]导致了广义量词理论(generalized quantifier theory)的相关研究，见Barwise &amp; Cooper 1981和Peters &amp; Westerståhl 2006。通过使用广义量词理论已经实现了一个关于负极词(negative polarity items)研究的卓越成果，像是“yet，ever”这样的词。它们的出现会需要被“否定”合法化，“The 6:05 has arrived yet.”这个句子将被排除掉，而“The 6:05 hasn’t arrived yet.”则是合法的。但是对于更多的负极词会出现的文本，句法学家之前并没有成功地刻画它们。而Ladusaw (1980)通过使用广义量词理论来做到了这一点，这对于形式语义学(formal semantics)来说是一个巨大的成功。他的建议大致如下，向下蕴涵(entailing expressions)的表达式将会允许从超集(supersets)到子集(subsets)的推论[或称向下单调的(downward monotonic)，对表达式的单调性的考察也是广义量词研究的一个重点]，而“no”则是一个向下蕴含的，因为从“No man walks.”可以推出“No father walks.”。而负极词是可接受的，仅当，它被解释在向下蕴涵的表达式的辖域中，例如“No man ever walks”。更进一步的研究显示关于负极词的分析需要进一步的完善，及需要考虑到负极词的层级结构(Ladusaw 1996)。

### 2.3 Logic and Translating

一个表达式或许会被直接联系为模型中的元素。比如，“walk”和一些关于个体的集合。然后同样的，一些意义上的操作也需要被直接指定，这导致了这样的一些形式化，例如[直接语义解释]：

![蒙太古的直接语义解释公式](attachments/roof-archive/cv6584358/01-direct-semantic-interpretation.png)

*直接语义解释。*

[重写后的间接语义解释]:

![内涵逻辑重写公式](attachments/roof-archive/cv6584358/02-intensional-logic-rewrite.png)

*重写。*

这些描述并不好懂而且用起来也不方便。蒙太古(1973)指出，或许间接地处理它们会更加清晰明了。因此他引进了一种叫“内涵逻辑(intensional logic)”的语言，上述引文中的操作被重新表达为上图所示的形式。λt意味着一个t为自变量的函数，同样对于λu也是。λtλu[t = u]是一个有两个自变量的函数，当两个自变量相等时它输出为真，反之为假。前面的∧[必须注意的是，这里这个符号是一个上标，它被称作内涵算子(intensor)而不是合取符]意味着，我们将其考虑作一个从可能世界以及时刻[都为复数，possible words, moments of time]，到一个如此被定义[参照了具体的某个可能世界及时刻]的函数的函数[The preceding ∧ says that we consider a function from possible worlds and moments of time to the thus defined function]。

有两个关于蒙太古的内涵逻辑的特征需要注意。

1. 它是一个高阶逻辑(higher order logic)。在当时，语言学家，哲学家，以及数学家仅仅比较熟悉一阶逻辑(first order logic)(即那种只有关于基本实体的变项的逻辑)。由于在蒙太古语义学中，各个表达式的部分都必须是有意义的，因此他需要一个高阶逻辑(正如我们已经看到的，“every man”指称(denote)一个性质集)。

2. 这个逻辑中含有lambda抽象(lambda abstraction)，这在蒙太古那个时候并不是逻辑中的标准成分。Lambda算子将使表达一个高阶函数成为可能，以及这个算子使得他可以去处理那些句法和语义间的差异。比如，在“John walks and he talks.”这个句子中，“John”只出现了一次，然而在逻辑上，“John”需要出现两次，分别对应于谓词“walk”以及谓词“talk”。Lambda算子的使用使得我们可以在几个位置上插入John的意义。Lambda表达式的重要性在The first decade of Montague Grammar被Partee (Partee 1996, 24)这样说道，它改变了我的人生。现在，lambda在所有的关于语义学的论文中都成为了一个基本工具。在4.1节中我们会举个例子说明lambda的威力[表达力]

这样使用翻译的动机(将其作为一个工具去获得清晰的意义的表达)有这些一定的后果。

1. 翻译是一个去获得表达意义的公式的工具。不同但相等的公式将是可接受的。在文章的导言中已经说过，蒙太古语法提供了一个机械式的程序去获得逻辑的翻译。而实际上，蒙太古对“every man runs”的翻译与传统翻译也并不相同，尽管它们是相等的。可参4.1节的例子。

2. 转换，在逻辑中将是可有可无的。所以在蒙太古语义学中没有一个所谓“逻辑式(logical form)”的东西(但其在乔姆斯基传统中扮演着重要角色)

3. 对于所有句法规则，无论其是去组合一个还是多个表达式的，这里都将有一个相对应的语义规则去提供语义上的，去组合了这些表达式的，相对应的意义的表达。这个关系被提炼为rule-to-rule假说(rule-to-rule hypothesis) (Bach 1976)。它对强调对应的语义规则可以是恒等映射(identity mapping)的这一点或许非常有用(以免句法操作被认为保留了意义)。

4. 根据公式的一些特定的特征去进行操作是不允许的。Janssen (1997)对这方面的这种建议提出了批评，他认为不满足这方面[这个要求]的那些提议，要么它们是不正确的(错误地预测了一些紧密相关的句子)，要么是可以被纠正，概括并改善的。

运用逻辑去表达意义的这种手段有着很长的历史。你们或许马上就会想到，比如达尔加诺(George Dalgarno)，与提出需要发展一种形式语言使得哲学表达更加清晰的莱布尼茨。在19世纪，许多关于人工语言的建议是去使得数学的争论更加透明，这样的例子是弗雷格与皮亚诺。弗雷格(Frege 1879)的《概念文字(Begriffsschrift)》，可以被视为谓词逻辑的诞生，即他对量词的引进。他的动机来自于数学上的需求，而他在他关于自然语言的论文中并没有去用概念文字。罗素(1905)使用了逻辑去表达自然语言的意义。在他论文中一个经典的例子就是关于“当今法国国王是个秃子”的分析，从句法上，它是一个subject-predicate形式，但是如果它的逻辑结构也是subject-predicate式的话，那么“当今法国国王”将不指称(denote)任何东西。所以在句法形式和逻辑形式上这里存在着差异，即自然语言掩盖了真正含义的观点，它以[自然语言的]误导形式论(misleading form thesis)而著名。所以，在那个时候的语言哲学家们将逻辑视为一个改善自然语言的工具[ideal language]。关于这段历史的有趣的回溯可参Stokhof 2007。

但是请注意，蒙太古语义学并没有打算去改善自然语言或者是提供一个它的逻辑式。

### 2.4 Intensionality and Tautologies

蒙太古将一个句子的外延(denotation)定义为从一个可能世界以及时刻到真值的函数，而这样的函数被称为内涵(intension)[原文为， Montague defined the denotation of a sentence as a function from possible worlds and moments of time to truth values. Such a function is called an ‘intension’，我也不知道这里咋译，因为这里要不是作者写反了，要不是没表达清楚。蒙太古把一个句子的内涵，参，在2.3节中介绍的那个内涵算子，辖域内的式子，定义为，关于所有外延函数的一个函数，输入可能世界与时刻，输出对应的外延函数]。他说道(Montague 1970a, 218)，这样就能得到一种，能够处理像修饰语(modifier)引起的，[模态词项之类，一些会导致晦暗语境(opaque context )出现的表达]一些普遍现象的语义学。例如，在“Necessarily the father of Cain is Adam”这个句子中，句子的外延并不能通过” The father of Cain is Adam”的真值获得，即我们必须知道相对于其他可能世界与时刻的后者的真值。内涵的方法同样能够处理一些其他的经典疑难，在Montague 1973中有这样两个例子，“The temperature is rising”不能够被分析为一些数字[即温度读数]正在上升，以及“John wishes to catch a fish and eat”也不应被分析为在John心中[wish]有一个特定的鱼，而应是他想去吃那条他将要抓到的鱼。

内涵语义学(intensional semantics)已被批评到这会使得所有重言式(tautology)的意义都是相同的(即都是同义的(synonymous))。确实，比如“John is ill or he is not ill.”这个句子的内涵就是这个不断输出为真的函数，而对于另外一些其他的重言式来说则也是如此。因此，我们就有必要对“意义(meaning)”与“相等(equivalence)”的概念进行完善，在不同的重言式之间必须应能看到它们间的意义存在着差别，而”相等“的概念则需要对这个精致的意义的概念是敏感的[某种程度上所有广义的真值条件语义学(truth-conditional semantics)，即尝试用真值条件去分析语句意义的理论，从戴维森到蒙太古，都面临着这种批评]。对于这个困难，最早的建议由Lewis(1970)提出，命题是由其所包含的意义以及其部分的意义所构成的，因此”Green grass is green.“与” White snow is white.“确实具有不同的意义[事实上，Carnap 1947也针对这个问题提出了intensional isomorphism(内涵同构)的概念]。然而词汇(lexical)的同义仍然是个问题，由于woodchuck(土拨鼠)与groundhog确实就是一种东西的名字，在这种观点下，”John believes that Phil is a groundhog“就与”John believes that Phil is a woodchuck.“相等。它可以被视为一个关于信念语境的[belief contexts]的单独的问题，但多数人仍认为它是所有重言式等价问题的一部分[参考更著名的，晨星与昏星的弗雷格之谜(Frege’s puzzles )]。

关于这个问题的处理有这样些稍晚一些的建议。Bäuerle and Cresswell (2003)给出了个对之前那些建议的回顾，Fox and Lappin (2005)则评论了那些最近的。后者解释了，对这个问题有两种策略，一是引进可能世界，在其中“woodchuck“与”groundhog“可能并不相等[这种策略在承认严格指示词(rigid designator)的视角下可能显得有些诡异？但如我们所看到的，毕竟对蒙太古语义学来说并不直接承认这种东西]，第二种策略是引入一种蕴涵关系，这种蕴涵关系的性质是，同一性不能从相互蕴含中推得。Fox and Lappin采取的是第二种策略。

### 2.5 Scope and Derivational History

一个著名的关于辖域歧义(scope ambiguity)的例子是“Every man loves a woman.“这里是说有一个女人被所有人爱着呢(例如圣母玛丽亚)，还是说所有的男人爱着一个但是是不同的女人呢？在这里没有导致词汇歧义(lexically ambiguous)的词，也没有句法上的争论指出这里有不同的构成结构，那么如何解释这种歧义呢？

在Montague1973中，他通过对辖域歧义的句子提供两种不同的派生来解决这个问题。一种解读是对“every“取宽域解读，则这个句子是由”every man“与”loves a woman“这两部分构成。另一种解读是在这里只有一个女人，则该句子由”Every man loves him1“得到。”him1“是一个人工占位符(placeholder)，或者称之为句法变项(syntactic variable)，一种被叫做量化插入的(quantifying-in rule)特别的规则会将”him1“替换为一个名词短语或者一个代词(以防这里有更多的占位符的出现)。一个占位符对应一个逻辑变项，这通过量化插入规则来绑定为语义[与句法]对应的。对于讨论中的句子来说，使用量化插入规则的效果就是“a woman and Every man loves him1”是我们理想中的那个句子，它通过对应于“a woman”的那个量词取宽域解读得到。当我们将这种派生描写为分析树时，由于我们对him1的引入与消去操作，这个分析树实际上会大于句子的组成结构。

量化插入规则同样被蒙太古用在对其他现象的刻画上。一个例子就是共指(co-referentiality)，“Mary loves the man whom she kissed”通过“He1 loves the man whom he1 kissed”得到。而对于“John seeks a unicorn”的从物解读也是通过“a unicorn and John seeks him1”得到。

因为对强有力的句法规则和人工符号(him1)的使用，许多人并不喜欢这种分析，下面我们将考虑两种补救策略。

第一种策略是拒绝歧义。一些语言学家已经认为辖域与其表层相同[严格地说就是，辖域大小取决于表层结构(surface structure)]，其以Jackendoff’s principle著称(Jackendoff 1972)，但是这对有些句子不起作用[关于生成语法的对辖域问题研究相关的一种，60-70年代围绕生成语义学及Katz-Postal hypothesis的争论中的一些相关问题，Katz对Jackendoff的相关反驳重新辩护到，许多句子的辖域大小仍与深层结构相关(deep structure)，因此在Katz那里辖域等语义研究仍与句法研究是相关的(Katz 1980)。而乔姆斯基则采取了Jackendoff 1972，语义表达将只与表层结构相关。还可参后来生成语法对LF层提出的研究]。还有一些人说，显然我们总是取对句子的最弱解读(即every取宽域)，而更强的解读则需要在有其他的附加信息被引入时才是恰当的。但是有些句子的不同的辖域解读在逻辑上是独立的，就像“Every woman loves one man”一样。

第二种策略是通过不同于量化插入的方式来捕捉辖域歧义。历史上第一个方法是先将名词的解释储存起来，然后在需要的时候把它们取出来，在不同阶段取出这些解释对应于不同的辖域。有人会认为这样的语法实际上放松了句法与语义间的对应关系。这种方法被称为Cooper Store，由Cooper 1983提出。另一个稍晚的建议则是话语表达理论，通过诉诸话语表达取来解释这些歧义(van Eijck &amp; Kamp 1997).。

一个最近的方法是提升规则(lifting rules)(见3.3节)，名词短语的意义被提升到更加抽象的层级，而不同的层级对应输出不同的辖域解释(见Hendriks 2001，与Jacobson 2014)。

即使对于辖域歧义与共指问题句子构成的派生不必要，解释其他的现象仍然需要诉诸它。一个例子是“John wondered when Alice said she would leave“。这里有一个歧义是，John想知道的是那个Alice要离开的时间，还是那个Alice说她将要离开这句话时的时间。所以句子仍然是歧义的，即使这里没有任何多于一个的组成的结构。Pelletier (1993)提供了这个句子以及其他的句子，然后评论到，为了坚守组合性原则，这些人已经诉诸了许多，或多或少是动机不明的手段(除了去保持所谓的组合性原则)，包括蒙太古式的量化插入，语迹(traces)，间隙(gaps)等等。如果人们假定意义是直接相关于组成结构的话，那么Pelletier的反驳是可以理解的。但是正如1.2节所解释的那样，这是不相干的。派生将会指定哪些规则以什么样的顺序进行结合，而这个派生将构成一个对于意义的指定的函数的一个输入。而构成结构作为句法规则的输出而被决定。不同的派生也可能拥有着概括性的一个或者同样的构成结构，在这种意义上，语义歧义得到解释[诉诸不同的派生][Derivation constitutes the input to the meaning assignment function，与The constituent structure is determined by the output of the syntactic rules。不过不得不说，在这里关于derivation与constituent的联系与区别仍然比较模糊。而关于分析树h，Montague本人在1970c中提供了对其更严格与清晰的定义]。如果不打算把这些东西称之为”构成结构(constituent structure)“的话，那么接下来的反驳应该是它们不具有我们所在这里期待的那些属性。

派生的树与结构的树间的区别已经催生出了多种相关的语法理论。在树－邻接文法(Tree Adjoining Grammars, TAG’s)中，不同的辖域解读相关与这样一件事，即“loving a woman”与在basic tree中的名词短语的不同的替换顺序不同而不同。在乔姆斯基式语法中一个经典的例子是，”The shooting of the hunters was bloody.“是歧义的，即猎人开枪了，还是猎人受到了枪击。这两种解读有两种不同的来源，前者是猎人是这个句子的主语(subject)，而后者猎人则是这个句子的宾语(object)。

## 3. Philosophical Aspects

### 3.1 From Frege to Intensions

Frege(1892)引进了涵义(sense[英], sinn[德])与意谓(reference[英], bedeutung[德])的区分，有人认为蒙太古沿用了这个区分，其内涵(intension)与涵义相符，但这并不正确。让我们先来考虑一下弗雷格的论证，它与这样一个事有关，即，古希腊人并不知道晨星是昏星，在古典时期，他们还没有发现晨星和昏星都是金星。但是我们不想分析这句话，即古希腊人没有意识到金星是金星，因为这意味着古希腊人没有意识到一个如此明显的真理。弗雷格的理论是，在通常的语境下它表达的是晨星指称(denote)的是他的指称物(referent[即那个金星])，但在间接语境下它将指称一些不同的东西，其被称之为它的涵义。这个概念不仅包括了指称物，还包括了它是如何指称一个客体的方式。因此，由于指称一个天体是晨星，还是昏星，这两者是不同的，晨星是昏星，这个句子并不表达一个分析真理(analytic truth)。

弗雷格的方法很快被抛弃了，因为它并不真的令人满意。它引进了一个关于短语，晨星的歧义，而这个歧义显然又并不是词汇歧义，因为没有出现由于这个短语而造成的对这个句子的不同解读，然而弗雷格将这个表达与两个不同的外延(denotations)联系了起来，而这是错误的。Carnap(1947)注意到，在弗雷格的方法下，我们很可能需要涵义的涵义，这样的东西[即infinite regress]，结果就是这种方法将会要求一个关于语义外延(semantic denotations)的无尽的层级区分(甚至对于那些永远不会引起歧义的句子来说)[相似于罗素在OD中(1905)提出的那个Gray’s elegy’ argument?]。卡尔纳普提出了一个与弗雷格相似的方法，但是一个表达的外延仅仅与一个东西相关。蒙太古(1970c, 233)引进的那个他的内涵逻辑就是这种想法的变体。与弗雷格的区别(一个外延对应于一个表达，而不是无限多的)，可能由于这两点创新，“描述性短语并不指称个体“，以及”句子的外延并不是真值“。

更进一步的讨论参Janssen 2011，关于内涵逻辑的历史可参Montague 1970b (145)。

### 3.2 Compositionality

对于蒙太古来说，组合性原则并不是需要考虑或讨论的东西，因为他是一个数理逻辑学家，这就是唯一的途径。在旁注中他将他的方法描述为追随塔斯基，或者追随弗雷格，而从来没有称其为一个原则。后来一些人将组合性原则认为是蒙太古工作的基石，所以相关的讨论被提出，并去追问蒙太古语法的基础。

有一些人称蒙太古自己没有用组合性原则去处理代词相关的问题，但是这没有关系，为了更好的理解对代词的组合性的处理，Janssen (1997) 与Dowty (2007)解释了变项怎么在逻辑中得到解释的，我们则遵循这种理解。考虑对于以下式子，来自于传统的塔斯基式对谓词逻辑的解释。

![塔斯基式谓词逻辑解释公式](attachments/roof-archive/cv6584358/03-tarskian-interpretation.png)

*塔斯基对谓词逻辑的解释。*

第一个式子声称ϕ ∧ ψ在指派(assignment)g下是真的，当且仅当在指派g下ϕ与ψ都是真的。而第二个式子引入了指派h，它和指派g是相等的，除了它们可能都指派了变项x的值这种情况。蒙太古运用了相同的格式，但有个不同是，在上标中，包括g，他还有i，这与时间相关，以及j，与可能世界相关。

在这些式子的公式化中没有一个我们可以称之为“意义“的东西，实际上，它是一个参照作为参数的g与h而对真(truth)进行的定义，所以，它(以及蒙太古的工作)如何可能是组合性的呢？

这个答案需要一个观念上的转变，公式ϕ的意义，缩写为M(ϕ)，是一个关于使得这个公式为真的指派的集合。然后，第一个式子就说的是M(ϕ ∧ ψ) = M(ϕ) ∩ M(ψ)，这样它就被表示为一个，在两个意义上的简单的集合论式的结合。M(∀xϕ) = {h ∼xg∣g ∈ M(ϕ)}，则可描述为，将M(ϕ)扩展到所有变项x上。像这样，在蒙太古语义学中，意义的表达就是一个函数，它的域(domain)是一个三元组&lt;时刻，可能世界，对变项的指派&gt;(&lt;moment of time, possible world, assignment to variables&gt;)。

将组合性原则运用到自然语言上是可能的吗？明显的一个可能的反例是习语(idioms)，因为它们的意义看上去并不是建立于它们各个词的组成上。然而Westerståhl (2002)提供了一系列方法，涵盖了从复合的基本表达，到一些含有偏离意义的组成部分。Janssen (1997)拒斥了一些在文献中被提及的其他反例。

组合性到底有多强呢？数学结果显示了对任何一种语言都可给定一种组合性的语义学，无论是使用一种非传统句法(Janssen 1997)，还是非传统语义(Zadrozny 1994)。然而这些证明对实际来说并没有什么帮助，Hodges (2001)展示了如何将一些语片的组合性语义学扩展到一个更大的语言上。

在形式语义学家中，我们可以找到对于组合性的以下的态度(一个Partee 1996给出的清单)：

1. 组合性是一个基本的方法论原则(methodological principle)，而且我们必须遵守它。Janssen(1997) 与Jacobson(2014)是这一立场的拥护者。

2. 组合性是一个好的方法，可以被原则性地运用。一个例子是话语表达理论(Kamp 1981)。

3. 组合性只是一个理想性的东西，并不是所有建议都必须满足它

4. 能否实现组合性原则是一个经验上的问题，见Dowty 2007.对其的讨论。

更多的对组合性原则的拓展的讨论见Janssen 1997与Szabó 2007。

### 3.3 Syntactic Categories and Semantic Types

根据蒙太古，句法去产生一个语义的输入这一建议：除了将其作为语义基础外，我没有任何对句法的兴趣(Montague 1970c, 223)。

尽管在他的眼中句法是从属的，但他仍然完整而清晰地在规则中使用了一些特殊的句法工具。

在Montague 1970a中，他只给了一个句法范畴(syntactic categories)和语义类型(semantic types)的清单。蒙太古(1973)定义了一个句法关系，其与在范畴语法(categorial grammar)中相同。然而蒙太古的句法本身不是一个范畴语法，因为这些规则并不总是由范畴驱动的，有些也不是范畴的串联规则(concatenation rules)。

对于这两个方面，一些建议已经被提出去改变这种情况。一个方向是尽可能近地保持范畴语法的理想，只使用类型驱动规则(type driven rules)，并在一些情况下允许有限的扩展串联规则的能力。一个例子可见Morrill 1994与Carpenter 1998。另一种进路是尽可能多地将句法理论的见解纳入到蒙太古语法中，特别是那些来自于乔姆斯基传统的。Partee1973)走出了第一步，使用语法去产生结构(括号标记法(labelled bracketing)[就简单地是像乔姆斯基他们做语法分析一样用中括号去标短语])，一个在句法上更精细的语法(包含乔姆斯基式的移位规则(movement rules))被用在Rosetta translation project上(Rosetta 1994)。

蒙太古在“John walks and Mary sings“这个句子中引入”and“，并不是将其处理为词汇的输入，而是规则的结果。这就是所谓的将and当成虚词性的处理(syncategorematically)。他对所有的限定词与否定也是如此处理的。对于”John walks and sings.“需要一个与”John walks and Mary sings.“不同的规则，因为从句法上，第一个句子中的and联结的是动词短语，而后者则是联结的句子。然而两者的意义是相近的以及这样处理将缺乏概括性。一个总的解决方法(或者一个总得替代性原则)是将一个表达式的范畴改为另一个范畴，这个改变对应于语义上的意义的提升规则(lifting rule)。举个例子，and作为联结两个动词短语的意义，是通过提升联结两个句子的∧，到λPλQλx[P(x)∧Q(x)]上得到的。经典的关于提升规则的进路的论文是Partee and Rooth 1983，Partee 1987，以及Hendriks 2001。在Winter 2001的专著中，整个都是关于连词的(conjoined phrases)复杂性的研究。

在现在，句法方面通常并不在蒙太古语义学的研究中扮演重要角色。蒙太古对一个语片提供的完整而清晰的句法的那种方式也被抛弃掉了。大家都关注于语义上有趣的现象，提出只涉及这方面的规则。而对这些现象的处理和对其他现象的其他处理是否一致却没有得到考虑。但Partee在Janssen 1997中，与Jacobson 2014，强烈反对了这一倾向，而Jacobson 2014确实也提供了一个语片。

### 3.4 Pragmatics

一个句子的意义有时候会由来自对语境的使用，这样一个因素而决定。比如我现在很开心，这个句子是否为真，取决于说话者现在是否开心，其他的例子是，比如“here”与“this”。蒙太古在他的文章《语用学(pragmatics Montague 1968)》与Montague 1970b中考察了这些因素。他指出可以通过引入新的参数来处理这些问题(除了时间与可能世界)。他的论文主要关注于处理这些问题的那些形式工具[formal pragmatics]，以及他仅仅考察了代词“I”。

一些人追随蒙太古的进路而拓展了他，并在适当的时候列出这些参数。经典的例子是Kaplan 1989，他处理了指示词(demonstratives)与索引词(indexicals)。他使用“语境”，作为一整个参数，它至少包括行为者(agent)，时刻，位置，与可能世界。一个句子的内容(content)是一个反应语境的命题，而一个表达式的语言意义，或者被称为特征(character)，则是一个从语境到内容的函数。语境和内容的区别被用来发展他(十分具有影响力的)的指示词(she, her, that)与索引词理论(I, today)[character作为一个函数输入context，输出content，从而我们就能知道索引词的所指，之后卡普兰批评了蒙太古没有去区分context与circumstance，因为得到content之后我们才能根据后者去决定命题的真值。而关于demonstratives与indexicals，前者需要demonstrations，而后者不需要]。

Cresswell (1973, 111)采取了另一个选择，他认为列参数这种方法要求我们事先给出一个有限的语境特征(contextual features)的列表，而他认为这是不可能的。但是他的建议没有被其他的人采纳[毕竟我们只是模型论语义淆]。

预设(presuppositions)和隐含(implicatures)常被认为是属于语用学研究的[最著名的诸如格赖斯的理论]。用递归(recursive)性的方法去处理预设能否成功一直悬而未决，因为看起来递归是处理是无限多句子的唯一可能。一个组合性式处理的例子由Peters 1979给出。但是他要解释的现象太过复杂，以及稍晚一些处理并不是完全意义上的组合性的，因为必须去考虑到一些修正因素(Beaver 1997)。

最后，有这样一个含义的语用学，即，对语言的使用是在实际的场景下的，陈述句可以被用来提问，也可以被用来给出命令，以及有些时候并不是依其字面意思使用的，而是隐喻性的(metaphorically)。在这方面的语用学并没有得到很多考察，但是Cresswell (1973)解释道，形式语义学是具备处理它们的所有要素的。

### 3.5 Ontology

蒙太古的内涵逻辑是高阶逻辑的。由辛提卡提出了对于这个方面的关键的批评: 在我看来这是蒙太古语法的研究者采取的策略，他们实际上非常坚定于组合性原则……然而这是有代价的。相比于我们最原始的“个体”，“类型提升(type theoretical ascent)”在哲学上于心理语言学上(psycholinguistically)具有更少的现实性。因此，这种提升必会偏理心理语言学以及方法论现实主义(methodological realism) (Hintikka 1983, 20)。

辛提卡的批评并没有很多支持者。讽刺的是，辛提卡的替代方法(博弈论语义学(game theoretical semantics))也是在塔斯基式进路之内的(见Hodges 1997 或者Caicedo et al. 2009)。他们[也]将公式的意义定义为一组指派的集合。

在蒙太古的方法中，可能世界是一个没有内部或外部结构的基本对象，但是对与信念(belief)有关的处理需要外部结构，比如一个关于信念的替代选择的可及关系(accessibility relation)。反事实条件句(counterfactuals)需要一个不同的概念去刻画彼此间的差异最小可能世界。关于可能世界的结构实际上经常被用到[在可能世界语义学(possible world semantics)的研究中]。

有时候，可能世界的内部结构也被提到。一个可能世界会决定一个命题的集合(这些命题对于这个世界来说是真的)，在Fox and Lappin 2005中是一个相反的顺序。他们将命题视为初始概念，然后在其之上定义可能世界。Cresswell (1973)也提供了一个方法去获得可能世界及其内部结构，它描述了如何从基本事实出发去构建可能世界。这些就是说要提供一个可能世界的内部结构的全部建议。

某些实体的哲学地位并不是很清晰，例如痛苦(pains)，任务(tasks)，义务(obligations)，以及事件(events)。当我们提升像这样的一些句子时我们需要它们，“Jones had a pain similar to the one he had yesterday.”在《论某些哲学实体的本质(On the nature of certain philosophical entities Montague 1969)》中，蒙太古描述了这些概念如何在他的内涵逻辑下得到刻画，它们是在一个可能世界的关于一个时刻的性质。在这些概念中，只有事件出现在了其他人那里，尽管并不是以蒙太古所建议的方式。它们被视为最基本的，但对其提供一个代数结构(algebraic structure)是允许的，例如子事件(subevents)(Link 1998, ch. 10–12; Bach 1986a)[与“事件”直接相关的或许就是戴维森哲学与后来的事件语义学(event semantics)]。

关于E[即事件]的集合将包括任何一个人们会考虑到其为基本实体的东西，数(numbers)，可能的客体(possible objects)，以及可能的个体(possible individuals)，无论一个个体被认为是真的活着的，还是存在于一个特定可能世界的特定时刻，它都不会被模型直接给定，因此，人们必须引进谓词去表达这些东西。通常情况下集合E不会有任何内部结构，但是对于物质名词(它具有这样的特征，任何水的部分都是水)，我们需要一个结构，见Pelletier &amp; Schubert 2003。并且，复数(plurals)可能会导致一个集合E的结构，例如，当个体总和(sum-individuals)被用到时(见Link 1983, 1998 (ch. 1–4),与Bach 1986a)。以及，当性质(loving John)被考虑为实体时，对这样的谓词也许也需要结，property theory给出了一个把它们整合起来的工具(见 Turner 1983)。
