# 西方負典 · 博客发布交付标准

适用于 `source/_posts/` 文章、`source/_books/` 书籍清单、`source/_topics/` 专题清单及
`lib/contributors.ts` 贡献者登记。**推送 `main` 之前，逐项核对本清单。**
渲染以博客前端（Next.js 构建产物）为唯一准绳——Outline / 任意 Markdown 预览里的样式不作数。

---

## 0. 发布前检查清单（TL;DR）

- [ ] **slug / 文件名全 ASCII**：短横线连字，无中文、空格、全角符号
- [ ] **YAML front-matter 完整**：标题、日期、分类、标签、署名等全部写进头部，不散落正文
- [ ] **编辑栏目已填写**：`section` 只能是 `essay / review / translation / multimedia`
- [ ] **署名均已登记**：每位作者、译者都有稳定贡献者 id，姓名和别名不冲突
- [ ] **修订旧文补 `updated` 字段**：实质性修订（改译文、补脚注）时在 front-matter 写 `updated: YYYY-MM-DD`——驱动 sitemap lastmod / RSS / 结构化数据，搜索引擎据此重抓
- [ ] **分类不重复进标签**：`categories` 与 `tags` 不重叠（前端会分别渲染）
- [ ] **引号全为方向性弯引号** `“ ” ‘ ’`，正文无 ASCII 直引号 `" '`
- [ ] **脚注用 GFM `[^n]` 语法**，`npm run build` 后确认角标可跳转、底部有脚注区
- [ ] **首行缩进交给前端**：勿手敲全角空格；承接段用 `<!--continue-->` 标记（见 §8）
- [ ] **书籍清单同步**：递归目录 id／number 稳定，已发布节点的 anchor 有效，`latestChapterId` 只指向已发布节点，`updatedAt` 与连续正文一致
- [ ] **专题引用有效**：分组顺序正确，`post / media / book` 类型与目标一致，导语和编者按已复核
- [ ] **链接有效**：外链正常；无残留的 Outline `mention://` 内链
- [ ] **提交作者 = `un-canon <un-canon@hotmail.com>`**
- [ ] 本地 `npm run check` 与 `npm run build` 通过，再推送

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
excerpt: 一句话摘要         # 可选，缺省取正文首段
featured_order: 0        # 可选；同栏目首页推荐优先级，数值越大越靠前
---
```

- 署名角色只有作者与译者，顺序固定为 作者 → 译者；一个角色多人优先写 YAML 数组，也兼容逗号、顿号、分号、换行或全角空格分隔。不要新增 `editor / proofreader` 等前端未定义字段。
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
- 显示名和任何别名必须全局唯一。新增文章署名前，先登记作者或译者；书籍清单中的作者与译者也使用同一登记簿。
- `teamMember` 默认且通常为 `false`。一次投稿、翻译或被转载不意味着属于编辑部；只有取得明确公开授权后才设为 `true`，并按需填写 `teamTitle / teamOrder / bio / links`。
- 前端只有姓名进入 `/library?contributor=<id>` 链接。前面的「作／译」角色方块不属于链接；默认姓名链接也不附加 `role`，角色细分交给文库筛选面板。
- 同一人在不同署名位置出现时必须复用同一 id，文库据此跨作者和译者角色聚合。

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

每本书使用 `source/_books/<slug>.json`，书籍元数据与承载全文的 Markdown 分离。全文仍是一篇连续正文；章节清单是可递归的编辑目录，只提供稳定定位、逐项发布状态和更新时间，不把目录节点拆成独立正文。

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
  "publishedAt": "2026-07-18",
  "updatedAt": "2026-07-18",
  "startAnchor": "reading-cover",
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
- `published` 节点必须填写非空 `anchor` 与有效 `publishedAt`，anchor 在整棵目录树内唯一。`forthcoming` 节点必须省略 `anchor / publishedAt`；它只展示待更新目录，不参与锚点存在性校验，也不得包含状态为 `published` 的后代。
- `documentSlug` 必须指向已发布的非多媒体文稿。只有 `published` 节点生成 `/books/<slug>/chapters/<chapter-id>` 路由、Book JSON-LD `hasPart` 和可点击目录入口；`forthcoming` 节点不得生成上述三类公开入口。
- `latestChapterId` 必须指向递归目录中已经 `published` 的节点，不能指向待更新节点。书籍页和目录统计分别显示“已发布节点数 / 全部节点数”，两个数字都按整棵目录树递归计算。
- 后续连载继续追加到同一个 `documentSlug` 对应的连续正文：先把新标题和正文写入该 Markdown，再将既有目录节点从 `forthcoming` 切换为 `published`，补齐 `anchor / publishedAt`，并按需更新 `latestChapterId`。同时更新书籍 `updatedAt` 与正文 `updated`；两处日期不一致会阻止发布。不得为同一本书的后续章节另建互相隔离的正文文稿。
- 已发布章节入口 `/books/<slug>/chapters/<chapter-id>` 是永久稳定跳转，不是独立正文。不得改变既有章节 id 来“整理”名称；需要改标题时只改 `title`。
- 普通文章与连载连续正文都默认保存完全本地的阅读位置。记录只属于当前浏览器配置文件和本站域名，不上传服务器、不使用 Cookie，也不跨浏览器或设备共享；阅读设置必须允许关闭保存、清除本文记录和清除全部阅读记录，关闭时不得清除或改变主题、字族与字号设置。
- 直接进入不带 hash 的正文 URL 时自动恢复到上次语义位置，不提供「继续阅读」入口或恢复弹窗。书籍页仍只提供「从头阅读」与「阅读最新章节」：前者的 `#reading-cover` 和后者的章节 hash 都优先于本地记录；浏览器前进后退、刷新与 BFCache 等原生滚动恢复同样优先，客户端不得二次跳转。
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
- sitemap 收录首页、`/topics`、`/library`、`/books`、`/about`、专题详情、书籍详情及文章／多媒体 canonical。它不收录旧 `/search`、带查询参数的筛选页或只负责跳转的章节入口。
- 文章、多媒体、书籍和专题详情必须同时提供自洽的 canonical、OpenGraph 与实体 JSON-LD；`og:site_name` 统一为「西方負典的博客」，暂不输出 `og:image` 与 `og:locale`。平台兼容分享标签不单独维护内容，必须共享同页 OpenGraph 的标题与摘要且不带图片。结构化数据内的 URL 使用 `https://un-canon.blog/...` 绝对地址。
- RSS 只发布文章和多媒体正文。书籍的连续正文已经通过 `documentSlug` 对应文章进入 RSS；书籍落地页、章节跳转和专题策展页不重复生成 feed 项。
- 推送文章、书籍或专题源文件到 `main` 后，IndexNow 工作流会提交实体 URL 及相应聚合页。Google 依靠 sitemap `lastmod` 重抓。

## 12. 自动交付门禁

- `npm run validate:content`：检查贡献者登记和署名、文章字段、书籍／章节 JSON、专题分组、跨实体引用、日期同步和唯一性。
- `npm run validate:media-html`：验证多媒体资料 HTML 的允许列表会剔除播放器、主动内容和危险属性。
- `npm run typecheck`：执行严格 TypeScript 检查，不生成文件。
- `npm run lint`：使用非交互 ESLint CLI；任何警告也视为失败。
- `npm run check`：依次运行内容、多媒体、排版、类型和 ESLint 门禁，适合作为提交前快速检查。
- `npm run build`：执行完整生产构建。首页、索引、案卷正文与多媒体的产品验收以
  [`frontend-product-spec.md`](frontend-product-spec.md) 为准。
- `npm run verify:release -- <base-url>`：对已经启动的本地生产构建或公开环境执行完整发布回归；覆盖导航、五组文库筛选、贡献者姓名、About、专题、书籍、重定向、canonical、OpenGraph、JSON-LD、sitemap 和 RSS。例如 `npm run verify:release -- https://un-canon.blog`。
- `npm run verify:editorial -- <base-url>` 暂作为同一脚本的兼容别名保留。
- GitHub Actions 的质量门禁只在 `main` 分支 push 和所有 pull request 上运行；功能分支 push 由其 pull request 覆盖，避免重复执行。
