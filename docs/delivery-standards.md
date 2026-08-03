# 西方負典 · 博客发布交付标准

适用于 `source/_posts/` 文章、`source/_books/` 书籍清单、`source/_topics/` 专题清单及
`lib/contributors.ts` 贡献者登记。**推送 `main` 之前，逐项核对本清单。**
渲染以博客前端（Next.js 构建产物）为唯一准绳——Outline / 任意 Markdown 预览里的样式不作数。

---

## 0. 发布前检查清单（TL;DR）

- [ ] **slug / 文件名全 ASCII**：短横线连字，无中文、空格、全角符号
- [ ] **YAML front-matter 完整**：标题、日期、分类、标签、署名等全部写进头部，不散落正文
- [ ] **编辑栏目已填写**：`section` 只能是 `essay / review / translation / multimedia`
- [ ] **署名均已登记**：每位作者、译者、校对者都有稳定贡献者 id，姓名和别名不冲突
- [ ] **修订旧文补 `updated` 字段**：实质性修订（改译文、补脚注）时在 front-matter 写 `updated: YYYY-MM-DD`——驱动 sitemap lastmod / RSS / 结构化数据，搜索引擎据此重抓
- [ ] **分类不重复进标签**：`categories` 与 `tags` 不重叠（前端会分别渲染）
- [ ] **引号全为方向性弯引号** `“ ” ‘ ’`，正文无 ASCII 直引号 `" '`
- [ ] **脚注用 GFM `[^n]` 语法**，`npm run build` 后确认角标可跳转、底部有脚注区
- [ ] **首行缩进交给前端**：勿手敲全角空格；承接段用 `<!--continue-->` 标记（见 §8）
- [ ] **书籍清单同步**：递归目录 id／number 稳定，已发布节点的 anchor 有效，`latestChapterId` 只指向已发布节点，`updatedAt` 与 `book_document` 构建源一致
- [ ] **专题引用有效**：分组顺序正确，`post / media / book` 类型与目标一致，导语和编者按已复核
- [ ] **链接有效**：外链正常；无残留的 Outline `mention://` 内链
- [ ] **原稿保真门禁通过**：源文已快照；允许转换归一化后的正文保留率 100%、未授权差异 0；逐项授权修订已登记；`npm run verify:preservation` 通过
- [ ] **提交作者 = `un-canon <un-canon@hotmail.com>`**
- [ ] 本地 `npm run check` 与 `npm run build` 通过，再推送

---

## 0.1 原稿保真与派生稿边界

本标准中的“编辑”不授权重写原稿。清洗阶段的最高优先级是保持原文内容、风格与节奏，完整规则以 [`pre-translation.md`](pre-translation.md) §0 为准。

- 原稿先存入 `editorial-sources/`，再生成博客派生稿；已登记快照不得原地修改。
- `preservation-manifest.json` 固定源文件哈希、来源、拼接顺序、允许的机械转换和逐项授权修订。
- 保真门禁不设模糊阈值：归一化并扣除已声明转换／修订后，正文字符保留率必须为 100%，段落边界与顺序完全一致，未授权差异必须为 0。
- OCR 订正和用户指定字词修订必须逐项登记 `authorizedChanges`，记录精确替换、理由、证据、授权人和日期；唯一匹配失败或跨段修改时直接失败。
- `npm run verify:snapshot-history` 依据 Git 基线禁止修改、删除或改名既有快照，只允许新增版本文件。
- 受保护正文只能由 `npm run sync:preserved` 重建；程序先验证全部清单和源哈希再写入，禁止手工“顺便润色”。
- `npm run verify:preservation` 对正文严格比较；任一未授权字符新增、删除、替换、重排或段落结构改变均直接失败。
- 实质性改写必须另立文档和 slug，保留原稿及其公开 URL，不得静默顶替。
- Outline 更新前保存文档 ID、修订号和全文，更新后回读全文；失败时先恢复，不得继续批量处理。

---
## 1. 文件与 URL：必须 ASCII

`slug` 决定公开 URL：普通文章为 `/posts/<slug>`，`section: multimedia` 为 `/media/<slug>`，
书籍为 `/books/<slug>`，专题为 `/topics/<slug>`。
**slug 必须是 ASCII**（小写字母、数字、短横线 `-`），
禁止中文、空格、全角标点——中文 URL 会被百分号编码成乱码，不利于分享与 SEO。

```yaml
slug: pechatnov-soviet-union-bretton-woods   # ✅
slug: 苏联与布雷顿森林会议                      # ❌ 会变成 %E8%8B%8F... 乱码
```

运行时为兼容旧稿，缺省时仍会从文件名回退 `slug`；但发布门禁禁止依赖这一行为。每篇稿件都必须
显式填写 ASCII `slug`，Markdown 文件名也必须是 ASCII，且建议与 slug 保持一致。

> 命名约定：`<作者姓氏或主题>-<英文关键词>`，如 `pechatnov-soviet-union-bretton-woods`、
> `historical-materialism-theses`。

---

## 2. YAML front-matter：所有博客元信息都进头部

每篇文章以标准 front-matter 起头。**与文章相关的信息（标题、署名、分类、日期、摘要）一律写进
front-matter，不要混在正文里。**

```yaml
---
title: 文章标题
title_breaks: ["优先断行前半", "优先断行后半"] # 必填；各段拼接后必须等于 title
date: 2026-06-15          # 发布日期 YYYY-MM-DD
updated: 2026-07-13       # 可选；实质性修订时更新，缺省回退到 date
slug: ascii-url-slug      # 必填且必须 ASCII（见 §1）
categories: [历史]         # 主分类；前端单独渲染为分类标记
section: translation      # 编辑栏目；驱动首页卡片页眉与文库筛选
tags: [布雷顿森林, 冷战起源] # 标签；勿与 categories 重复
post_author: 作者名         # 作者，实心方块「作」
translator: 译者名          # 可选，空心「译」
proofreader: 校对者名       # 可选，空心「校」
excerpt: 一句话摘要         # 可选，缺省取正文首段
featured_order: 0        # 可选；同栏目首页推荐优先级，数值越大越靠前
---
```

- 署名角色为作者、译者与校对，顺序固定为 作者 → 译者 → 校对；一个角色多人优先写 YAML 数组，也兼容逗号、顿号、分号、换行或全角空格分隔。`editor` 等未定义角色仍不得写入。
- `title_breaks` 明确标题在空间不足时的优先断点。标题能在一行显示时不会强制换行；确实需要换行时，编辑应避免第二行以「的／之／与」等非实词开头，避免切进实词内部，并使相邻两行长度不过度悬殊。短标题仍填写单项数组，例如 `title_breaks: ["列宁之争"]`。字段缺失时内容校验给出建议和非阻塞警告；拼接后不等于 `title`、类型错误或空数组会阻止构建。
- 每个署名必须能按显示名、稳定 id 或登记别名解析到 `lib/contributors.ts` 的唯一记录；未登记署名会阻止校验和构建。
- `categories` 只用于分类标记，**不会**再混进标签行（`lib/posts.ts` 已分离二者）。
- `section` 是文章的编辑栏目，必须且只能取以下值之一：
  - `essay`：论
  - `review`：评
  - `translation`：译
  - `multimedia`：多媒体
- `section` 与 `categories` 相互独立；不要用“历史 / 哲学”等主题分类代替栏目，也不要只依赖译者署名推断「译」栏目。
- `featured_order` 可用于任一栏目，必须是有限数值；缺省为 `0`，数值越大则在同栏目首页越靠前。
- 首页推荐卡页眉由 `section` 与 `categories` 组合为「栏目 · 主题分类」，不得手写 `#03` 一类类别编号。「译」栏目推荐只展示 `post_author`，完整译者署名留在正文和文库。
- `related_posts` 只允许多媒体条目使用，写作 slug 列表，例如
  `related_posts: [lih-lenin-disputed, pechatnov-soviet-union-bretton-woods]`。目标必须是已发布的
  非多媒体站内文稿，不得重复或指向条目自身。

## 3. 贡献者登记与姓名链接

- `lib/contributors.ts` 是公开人物身份的唯一登记簿。`id` 使用小写 ASCII kebab-case，一经发布保持稳定；显示名变化通过 `displayName` 与 `aliases` 兼容，不从姓名临时生成 URL。
- 显示名和任何别名必须全局唯一。新增文章署名前，先登记作者、译者或校对者；书籍清单中的三类署名也使用同一登记簿。
- `teamMember` 默认且通常为 `false`。一次投稿、翻译或被转载不意味着属于编辑部；只有取得明确公开授权后才设为 `true`，并按需填写 `teamTitle / teamOrder / bio / links`。
- 前端只有姓名进入 `/library?contributor=<id>` 链接。前面的「作／译／校」角色方块不属于链接；默认姓名链接也不附加 `role`，角色细分交给文库筛选面板。
- 同一人在不同署名位置出现时必须复用同一 id，文库据此跨作者、译者和校对角色聚合。

---

## 4. 引号与标点

正文引号统一使用**方向性 Unicode 弯引号**：双引号 `“ ”`、单引号 `‘ ’`。
由字体按上下文渲染为 **CJK 全角 / 西文半角**。**禁止使用 ASCII 直引号 `"` `'`。**

构建管线（`lib/markdown.ts` 的 `rehypeSmartQuotes`）会把正文文本里的直引号自动规范化为弯引号
（区分开 / 闭，英文词内撇号如 `it's` 归一为 `’`），并跳过 `code` / `pre` 与 Markdown 语法本身。
即便有此兜底，**写作时仍应直接输入弯引号**，使源文在任何预览里都正确。

> 注意：front-matter 的值、图片 `title` 等**不经过**正文引号规范化，写时务必直接用弯引号或避免引号。

---

## 5. 脚注与链接：前端必须可渲染、可跳转

### 脚注

使用 **GFM 脚注语法** `[^n]`（正文角标）+ `[^n]: 定义`（文末定义）。`remark-gfm` 会渲染为：
上标可点角标 → 跳转至文末脚注区 → 每条脚注带返回箭头。

```markdown
苏方的准备相当周密。[^1]

[^1]: 兹韦列夫致莫洛托夫，1943年5月6日，AFP RF……
```

- **不要手写 `## 注释` 标题，也不要在脚注前加 `---` 分割线。** `remark-gfm` 会自动把所有 `[^n]: 定义`
  收拢到文末，生成一个本地化的「注释」区（标签已在 `lib/markdown.ts` 设为「注释」，并去掉 `sr-only`）。
  手写标题会与自动区块重复；`---` 则会变成一条孤立、突兀的分割线。
- **注释 / 脚注是文章要件，标题样式不同于正文内容标题。** 正文 `##` 标题是红方块大标题；注释区标题由
  CSS 渲染为细体 mono 小标签（无红方块）+ 顶部分隔线，并整体左对齐、字号略小。这套样式由 CSS 统一定义，
  作者不要在正文里手动模仿或套用正文标题样式。
- **不要以 Outline 里的显示为准**——Outline 的 Markdown 解析器会把 `[^n]` 弄乱（内联成链接或留下
  `\[^n\]` 字面量）。Outline 只作存储，脚注样式由博客前端定义。在 Outline 存稿时可用纯文本角标
  （如 `〔1〕`），但**落库到 `source/_posts/` 的 `.md` 必须改回 GFM `[^n]` 语法**。
- 也兼容 Word/Outline 导出的 `_ftn/_ftnref` 锚点（`lib/markdown.ts` 会互锚）。
- **交付前必须 `npm run build`**，确认生成的 HTML 含 `data-footnotes` 区与 `#user-content-fn-*`
  跳转锚点；脚注回引的可见符号为 `↑`，无障碍名称使用中文，不保留英文 `Back to reference`。

### 链接

- 外链自动加 `target="_blank" rel="noopener noreferrer"`。
- 站内资源用相对路径。
- **Outline 内部 `mention://` 链接在公网无意义**，构建时会被降级为纯文本——发布前应替换为真实 URL。

---

## 6. 图片

放进 `public/attachments/`，正文用相对路径引用，构建时自动改写为 `/attachments/...`：

```markdown
![说明](attachments/your-image.png)
```

### 表格进入正文侧栏的规则

- 两列表格可以完整显示在注释／文献侧栏；数字列不得在数字内部强制换行。
- 三列及以上表格只在文末注释／文献中完整显示，侧栏自动替换为「查看文后表格」链接。作者无需手写锚点或另做一份窄表。
- 列数按实际单元格及其 `colspan` 计算；不要通过拆分单元格或删减表头规避该规则。

---

## 7. 提交与部署

- **Author 与 Committer 都固定为 `un-canon <un-canon@hotmail.com>`**。在本仓库执行一次：

  ```bash
  git config --local user.name un-canon
  git config --local user.email un-canon@hotmail.com
  ```

  不要只用 `git commit --author=...`：它不会修改 Committer。提交后同时核对四个字段：

  ```bash
  git show -s --format='Author: %an <%ae>%nCommitter: %cn <%ce>' HEAD
  ```

  只有 Author 与 Committer 的姓名、邮箱都完全一致时才可推送。
- 推送 `main` 即触发 Vercel 自动构建上线。
- ⚠️ **部署去重**：若某 commit 已作为分支 preview 构建过，再把**同一 SHA**推到 `main` 时，Vercel 可能
  因 SHA 去重而**不重新生成生产部署**。确保进入生产的是一个新 commit（内容有实质变化），或在 Vercel
  控制台手动 Promote 对应部署。
- Vercel 项目 Framework Preset 应为 **Next.js**；仓库内 `vercel.json` 已声明 `"framework": "nextjs"`
  并固定 `buildCommand: npm run check && next build`，构建以此为准。

---

## 8. 首行缩进与承接段

- 正文自然段**首行缩进两格**——但**不要手敲全角空格**：缩进由前端 CSS（`.art-body p { text-indent: 2em }`）
  自动完成，手敲会叠加成四格。
- **承接段例外**：在自然段中插入引文（blockquote）后、继续该段的段落**不缩进**。在该段前**单独一行**写
  哨兵记号 `<!--continue-->`（ASCII，必须独立成行，否则会被 CommonMark 当作 HTML 块吞掉整段）：

  ```markdown
  > ……引文最后一行。

  <!--continue-->

  在英国的清算联盟方案……（承接段，前端去标记并赋 .cont，不缩进首行）
  ```

  该标记应在**译前处理**阶段注入，原则见 `docs/pre-translation.md`。引文本身不缩进，无需标记。

---

## 9. 书籍与章节清单

每本书使用 `source/_books/<slug>.json`，书籍元数据与标记为 `book_document: true` 的 Markdown 构建源分离。编辑源可以保持一份连续文本，但公开构建必须按递归目录切成独立章节页；每页只含本章正文和本章引用的注释／文献。

```json
{
  "id": "stable-book-id",
  "slug": "stable-book-slug",
  "title": "书名",
  "subtitle": "副标题",
  "description": "书目说明",
  "documentSlug": "continuous-post-slug",
  "status": "serializing",
  "authors": ["作者显示名"],
  "translators": ["译者显示名"],
  "proofreaders": ["校对者显示名"],
  "publishedAt": "2026-07-18",
  "updatedAt": "2026-07-18",
  "latestChapterId": "chapter-one",
  "citations": {
    "original": {
      "itemType": "book",
      "citationKey": "original_edition",
      "title": "Original title",
      "creators": [
        {
          "creatorType": "author",
          "firstName": "Given",
          "lastName": "Family"
        }
      ],
      "date": "1925"
    },
    "translation": {
      "itemType": "book",
      "citationKey": "un_canon_translation",
      "rights": "CC0 1.0 Universal"
    }
  },
  "pdfUrl": "/attachments/example-book.pdf",
  "epubUrl": "https://example.org/example-book.epub",
  "chapters": [
    {
      "id": "preface",
      "number": "00",
      "title": "序言",
      "status": "published",
      "anchor": "序言",
      "publishedAt": "2026-07-01"
    },
    {
      "id": "chapter-one",
      "number": "01",
      "title": "第一章",
      "status": "published",
      "anchor": "第一章",
      "publishedAt": "2026-07-18",
      "tags": ["专题标签", "章节标签"],
      "children": [
        {
          "id": "chapter-two",
          "number": "02",
          "title": "第二章",
          "status": "forthcoming"
        }
      ]
    }
  ]
}
```

- `id / slug / documentSlug / chapter.id / latestChapterId` 均使用稳定 ASCII kebab-case；文件名与书籍 slug 一致。`children` 可以在任意目录节点下继续嵌套；父子数组的书写顺序共同构成公开目录顺序。
- 书籍 `status` 只能是 `serializing / complete / paused`。每个新增或修改的目录节点必须显式填写 `status: published / forthcoming`；旧清单中缺省 `status` 的平铺节点仅为兼容既有内容而按 `published` 读取，不得在新书中继续省略。节点 `id / number` 在整棵目录树内不得重复，不能只在同一层检查唯一性。
- `/books` 书目必须按 `serializing → paused → complete` 排列，同一状态内再按 `updatedAt` 降序和书名稳定排序。连载中书籍永远排在已完结书目之前；发布或更新完结书不得改变这一优先级。
- `published` 节点必须填写非空 `anchor` 与有效 `publishedAt`，anchor 在整棵目录树内唯一。`forthcoming` 节点必须省略 `anchor / publishedAt`；它只展示待更新目录，不参与锚点存在性校验，也不得包含状态为 `published` 的后代。
- 章节节点可选填 `tags` 字符串数组以覆盖本章标签；每项必须是非空字符串且不得重复。省略或使用空数组时继承 `book_document` Markdown 的 front matter 标签，确保每个章节页都有自己的最终标签集合。
- 章节节点可选填 `presentation: reading / reference / navigation`，缺省为 `reading`。序、前言与正文使用 `reading`；致谢、术语说明、索引、文献等附属材料使用 `reference`；只承载子目录跳转而没有正文的父节点使用 `navigation`。表现类型用于计算整本书的最新正文日期、阅读时长等聚合字段；首页和文库始终只为整本书生成一个条目。
- 同一章题下按日期或篇次连续发布的分篇不是目录子章节：manifest 在父章的 `sections` 数组中保留分篇 id、number、title 和显式 status，已发布分篇另填 anchor／publishedAt 并在同一章节正文中使用同标题、同 anchor 的 `h3` 副标题；待更新分篇省略 anchor／publishedAt 且不得提前出现在正文。已发布分篇必须连续排在所有待更新分篇之前。不得为这些分篇生成独立 canonical、BibTeX、章节导航位置或书籍统计节点；全书目录对已发布分篇生成当前页或跨页 hash 链接，对待更新分篇只显示不可点击状态。`sections` 不得与同一父章的 `children` 同时使用。
- `documentSlug` 必须指向已发布、非多媒体且显式填写 `book_document: true` 的 Markdown 构建源。该源不得生成 `/posts/<documentSlug>` 页面，不进入首页、文库、RSS 或 sitemap。只有 `published` 节点生成 `/books/<slug>/chapters/<chapter-id>` 独立正文、Book JSON-LD `hasPart` 和可点击目录入口；`forthcoming` 节点不得生成上述三类公开入口。
- `latestChapterId` 必须指向递归目录中已经 `published` 的节点，不能指向待更新节点。书籍页和目录统计分别显示“已发布节点数 / 全部节点数”，两个数字都按整棵目录树递归计算。
- 后续连载继续追加到同一个 `documentSlug` 对应的构建源：先写入新标题和正文，再将既有目录节点从 `forthcoming` 切换为 `published`，补齐 `anchor / publishedAt`，并按需更新 `latestChapterId`。同时更新书籍 `updatedAt` 与正文 `updated`；两处日期不一致会阻止发布。
- 已发布章节路径 `/books/<slug>/chapters/<chapter-id>` 是独立正文与自身 canonical。不得改变既有章节 id 来“整理”名称；需要改标题时只改 `title`。普通文章与每本书共同进入公开页面顺序；首页和文库都只显示一张链接 `/books/<slug>` 的连载卡，同一本书的所有章节页继承书籍条目的 `no / sectionNo`，因此共享同一个全站号和“译号”。
- 章节页面必须提供「目录／全书目录」索引；只有本章正文实际含图片时才在二者之间显示「图录」，不得渲染空图录标签或面板。全书目录不重复书籍首页入口；每个含正文标题的章节在右侧提供 `＋/−` 展开按钮，展开后对其他已发布章节执行带 hash 的跨页跳转、对当前章节执行章内跳转，并保留待更新节点的不可点击状态。章节行复用普通目录最小 `16px` 的自适应编号列与 `3px` 列间距，「前 1／附 1」等复合编号保持单行；次级标题只使用与编号列左缘对齐的灰色层级标记，不绘制强调色竖线。页尾上一章／返回目录／下一章使用相同的两层按钮结构与表面样式，不在封面和正文之间或页尾导航上方绘制分隔线。
- 普通文章与书籍章节页都默认保存完全本地的阅读位置。记录只属于当前浏览器配置文件和本站域名，不上传服务器、不使用 Cookie，也不跨浏览器或设备共享；阅读设置必须允许关闭保存、清除本文记录和清除全部阅读记录，关闭时不得清除或改变主题、字族与字号设置。阅读习惯面板打开和关闭时必须作为独立右侧抽屉水平平移进出，并可覆盖在页眉上方；面板标题行的上缘和高度必须与页眉对齐；页眉中的主题、繁简与阅读习惯三个按钮必须始终保持同一 DOM 节点和同一几何位置，不得迁入面板或因面板开合重排。面板标题行提供独立关闭按钮，关闭后焦点恢复到页眉中稳定存在的阅读习惯按钮。
- 直接进入不带 hash 的正文 URL 时自动恢复到上次语义位置，不提供「继续阅读」入口或恢复弹窗。书籍页仍只提供「从第一章阅读」与「阅读最新章节」：二者都进入相应的独立章节页；章节页的本地阅读记录只在本章 URL 内恢复。浏览器前进后退、刷新与 BFCache 等原生滚动恢复同样优先，客户端不得二次跳转。
- 连载更新必须保留稳定标题锚点；构建产物同时以渲染后正文 HTML 的 SHA-256 短哈希标识内容版本。已读完的正文追加内容后仍恢复旧版本的原完成位置，不自动进入新增内容，由读者自行向后阅读；原块被改动或删除时按相邻语义块、章节和全文比例依次降级，不依赖旧的绝对滚动坐标。
- `citations` 直接使用 Zotero item JSON 字段名。`translation` 必填，且 `itemType` 必须是 `book`；未覆写的译本题名、作者／译者、日期、出版社和摘要从书籍清单派生，URL 永远是 `https://un-canon.blog/books/<slug>`。`original` 可选，只有原版资料已经核验时才填写；两者分别生成独立的 BibTeX 复制位，不得拿另一版本冒充。
- 文章页缺省为 Zotero `blogPost`。只有已核验来源类别时才在 Markdown front matter 添加 `citation` 覆写为 `bookSection / journalArticle / preprint / thesis / interview`；字段必须采用 Zotero 名称，例如 `bookTitle / publicationTitle / repository / thesisType / university / interviewMedium / creators`。构建门禁会拒绝未知字段和缺少类型必需字段的记录。
- 经典 BibTeX 没有 Zotero `blogPost / preprint / interview` 的一一对应 entry type；本站遵循 Zotero 自带 BibTeX translator，以 `@misc` 输出这三类，并在页面嵌入 `z:itemType` 保存精确 Zotero 类型。不得虚构 `@preprint`、`@interview` 等非标准 entry type。
- `pdfUrl` 与 `epubUrl` 都是可选字段，只接受根相对、HTTP 或 HTTPS URL。前端只在字段存在时显示对应下载链接；没有文件时不要填写空字符串、`#` 或占位地址。
- 一级导航中的「连载」直接进入 `/books`；文库不再放置书籍入口。发布书籍时应从该入口验收索引、详情、两个阅读入口、章节和资源操作。

## 10. 专题清单

专题使用 `source/_topics/<slug>.md`，标准 YAML front matter 负责策展结构，正文负责专题导语：

```yaml
---
title: 专题名
subtitle: 可选副标题
summary: 一句话说明
status: ongoing             # ongoing / complete / archived
published: 2026-07-18
updated: 2026-07-18
curators: [可选策展人]
groups:
  - id: first-group
    number: "00"             # 可选；缺省时按数组顺序生成 01、02……
    title: 第一组
    summary: 分组说明
    items:
      - type: post          # post / media / book
        ref: existing-slug
        editorialNote: 该条目为什么放在这里
---

这里填写专题导语。
```

- 文件名是默认 slug；如显式填写 `slug`，必须与文件名完全一致。
- 分组和条目数组的顺序就是公开阅读顺序；首组首项会成为「从这里开始」。`number` 如填写必须是一至两位数字，规范化为两位显示并在专题内唯一；序言等前置单元可使用 `00`，缺省时按数组顺序生成 `01 / 02 / …`。发布后不要以自动标签排序替代手工顺序。
- `post` 只能引用非多媒体文稿，`media` 只能引用 `section: multimedia`，`book` 引用书籍 slug。目标必须存在、已发布且类型匹配。
- 同一专题不得重复编排同一 `type:ref`；`editorialNote` 如填写必须有实际内容。
- 实质性修改导语、分组、顺序或编者按时更新 `updated`，以驱动 sitemap `lastmod` 和 IndexNow。

## 11. Canonical、sitemap、RSS 与发布发现

- `/library` 是内容筛选唯一 canonical；旧 `/search` 仅作 `308` 兼容跳转并保留查询参数。不要在新内容或界面中创建新的 `/search` 链接。
- sitemap 收录首页、`/topics`、`/library`、`/books`、`/about`、专题详情、书籍详情、已发布章节及文章／多媒体 canonical。它不收录旧 `/search`、带查询参数的筛选页或书籍 Markdown 构建源。
- 文章、多媒体、书籍和专题详情必须同时提供自洽的 canonical、OpenGraph 与实体 JSON-LD；`og:site_name` 统一为「西方負典的博客」，暂不输出 `og:image` 与 `og:locale`。平台兼容分享标签不单独维护内容，必须共享同页 OpenGraph 的标题与摘要且不带图片。结构化数据内的 URL 使用 `https://un-canon.blog/...` 绝对地址。
- RSS 只发布文章和多媒体正文。书籍构建源、书籍落地页、章节正文和专题策展页不生成 feed 项。
- 推送文章、书籍或专题源文件到 `main` 后，IndexNow 工作流会提交实体 URL 及相应聚合页。Google 依靠 sitemap `lastmod` 重抓。

## 12. 自动交付门禁

`package.json` 是命令和执行顺序的唯一真源；本文只解释门禁层级，新增或删除脚本时必须在同一变更中更新相关说明。

### 12.1 确定性静态与逻辑门禁

- `npm run validate:content`：贡献者登记和署名、文章字段、书籍／章节 JSON、专题分组、跨实体引用、日期同步和唯一性。
- `npm run verify:snapshot-history`：按 Git 基线检查 `editorial-sources/` 的追加式历史；既有快照修改、删除或改名即失败。
- `npm run verify:preservation`：源文快照哈希、派生顺序、允许机械转换及逐项授权修订；执行正文 100% 保留／未授权差异 0 的零差异门禁。
- `npm run validate:media-html`：多媒体资料 HTML 允许列表、主动内容和危险属性。
- `npm run verify:typography`：Markdown 排版、标题、表格、脚注、媒体和危险协议契约。
- `npm run verify:negative`：负栏目及其既有内容回归。
- `npm run verify:fonts`：CJK 语料、OpenCC 闭包、字体文件、大小、哈希与 CSS 缓存键。
- `npm run verify:reading-progress`：阅读记录数据、恢复优先级、跨版本和跨标签页纯逻辑契约。
- `npm run verify:han-script`：繁简偏好、转换方向、文章源文字系统和媒体指纹。
- `npm run verify:citations`：Zotero／BibTeX 类型、字段和引用路由。
- `npm run verify:dependencies`：当前依赖组合的兼容边界。
- `npm run verify:routing`：静态动态路由、`generateStaticParams` 与未知实体行为。
- `npm run typecheck`：严格 TypeScript 检查，不生成文件。
- `npm run lint`：非交互 ESLint；任何警告也视为失败。
- `npm run check`：按 `package.json` 串行执行以上全部门禁，适合作为提交前确定性检查。

`npm run check` 不启动真实浏览器，不执行 React hydration，也不验证焦点、真实字体行盒、WebKit、localStorage 或动画终态。

### 12.2 构建与发布回归

- `npm run build`：执行完整生产构建并生成 SSG、路由和静态资源。首页、索引、案卷正文与多媒体的产品验收以 [`frontend-product-spec.md`](frontend-product-spec.md) 为准。
- `npm run verify:release -- <base-url>`：对已经启动的生产构建或公开环境执行 SSR／HTTP 发布回归；覆盖导航、文库筛选、贡献者、About、专题、书籍、正文、多媒体、重定向、canonical、OpenGraph、JSON-LD、sitemap、RSS 和字体资源。例如 `npm run verify:release -- https://un-canon.blog`。
- `npm run verify:editorial -- <base-url>` 仅作为历史兼容别名保留；新流程统一使用 `verify:release`。

`verify:release` 使用 Node `fetch` 和生成 HTML 断言，不是浏览器 E2E。仓库 Playwright 资产的状态、项目矩阵、UCCTB reusable workflow、caller artifact 与 test charters 统一见 [`testing.md`](testing.md)；`implemented` 只表示仓库中有可执行资产，不能替代远端 run、mobile／WebKit 实体设备、完整无障碍交互或部署后正式域名证据。

### 12.3 CI 与部署

- GitHub Actions 在 `main` push 和所有 pull request 上执行 `npm ci → check → build → start → verify:release`；功能分支 push 由 pull request 覆盖，避免重复运行。
- Vercel 使用 `npm ci`，并在 `next build` 前执行 `npm run check`。
- IndexNow 只负责内容发现，不是发布质量门禁。
- 正式冻结还需要精确提交、Deployment ID、不可变部署 URL、构建时间、生产域名回归、代表性浏览器证据和已知未覆盖范围。

完整的所有权、字体重建、可重复构建、发布与回滚流程见 [`architecture/content-pipeline.md`](architecture/content-pipeline.md)；正文状态与恢复契约见 [`architecture/reader-runtime.md`](architecture/reader-runtime.md)。
