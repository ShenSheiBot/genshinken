# 西方負典 / UN-CANON

新粗野主义人文随笔站 —— 关注历史、产业与文化的中文博客。
线上地址：<https://un-canon.blog>

技术栈：**Next.js（App Router，SSG）+ Markdown**。文章以 Markdown 形式存放在仓库中，
推送到 GitHub 后由 Vercel 自动构建并部署。

---

## 写作 / 发布流程

1. 在 `source/_posts/` 下新建一个 `.md` 文件。
2. 填写 front-matter（见下），写正文。
3. 提交并推送到 `main` 分支 —— Vercel 会自动构建上线。

> **发布前请逐项核对交付标准：[`docs/delivery-standards.md`](docs/delivery-standards.md)**
> （slug 全 ASCII、front-matter 完整、弯引号、脚注 `[^n]` 可跳转、作者署名等）。
>
> **前端产品和验收标准：[`docs/frontend-product-spec.md`](docs/frontend-product-spec.md)**
> （首页、内容索引、案卷正文、多媒体详情页及响应式交互的现行决定）。

## 文档索引

- [`docs/delivery-standards.md`](docs/delivery-standards.md)：内容字段、编辑规范与发布要求。
- [`docs/frontend-product-spec.md`](docs/frontend-product-spec.md)：公开页面、响应式行为和产品验收标准。
- [`docs/architecture/reader-runtime.md`](docs/architecture/reader-runtime.md)：正式正文组件、状态边界、位置恢复与回滚。
- [`docs/architecture/content-pipeline.md`](docs/architecture/content-pipeline.md)：内容解析、字体闭包、构建、CI、部署与发布回归。
- [`docs/releases/`](docs/releases/)：已经发布并具备版本锚点的历史记录。

仓库文档是本地构建、测试和发布操作的权威来源；Outline ADR 记录决策背景和取舍，不复制运行手册。

### Front-matter 字段

```markdown
---
title: 文章标题
categories: 历史          # 主分类（也用作首页/文章页的分类标签）
section: essay           # 编辑栏目：essay / review / translation / multimedia / negative
tags: [产业, 冷战史]      # 标签（可多个；勿与主分类重复；用于内容索引筛选）
date: 2026-05-12         # 发布日期 YYYY-MM-DD
post_author: 作者名       # 作者；首页卡片上以实心橙块「作」标记
translator: 译者名        # 可选；空心橙块「译」
slug: my-custom-url      # 必填 URL；必须为小写 ASCII kebab-case
excerpt: 一句话摘要        # 可选，缺省时自动取正文首段
featured_order: 0       # 可选；同栏目首页推荐优先级，数值越大越靠前
---

> 署名角色只有作者与译者，顺序固定为 作者 → 译者；一个角色多人用逗号分隔。
> 前端的「作／译」角色方块只是文本，只有姓名链接到 `/library?contributor=<id>`；首页译介推荐只显示作者。
> `section` 与主题分类相互独立：例如一篇历史译文应写 `categories: 历史` 与 `section: translation`。
> 运行时仍兼容旧稿从文件名回退 slug，但发布门禁要求每篇稿件显式填写；不要依赖回退。
> 多媒体条目可以另外填写 `related_posts: [article-slug, another-slug]`，关联零篇或多篇站内文稿；
> 该字段只能用于 `section: multimedia`，目标必须是已经发布的非多媒体文章。

正文从这里开始……
```

正文页默认按 Zotero `blogPost` 发布并生成可复制 BibTeX。译载论文、预印本、学位论文或访谈应在
front matter 增加 `citation`，字段名直接采用 Zotero item JSON，而不是另建站内字段：

```yaml
citation:
  itemType: journalArticle
  citationKey: author2024articleZH
  publicationTitle: Journal Name
  volume: "12"
  issue: "3"
  pages: 10-24
  DOI: 10.0000/example
```

支持的 `itemType` 为 `blogPost / book / bookSection / journalArticle / preprint / thesis / interview`。其中
`bookSection` 必须填写 `bookTitle`，`journalArticle` 必须填写 `publicationTitle`，`preprint` 必须填写 `repository`，
`thesis` 必须填写 `thesisType / university`，`interview` 必须用 Zotero `creators`
显式标明至少一位 `interviewee`，并填写 `interviewMedium`。没有核验过的来源字段应留空，不能猜填。

> 兼容历史写法：也可以用「`# 标题`(会被当作 YAML 注释) + 散列键 + 单独一行 `---`」的旧式头部，
> 解析结果与标准 front-matter 一致。新文章建议直接用上面的标准写法。

### 图片

把图片放进 `public/attachments/`，在正文里用相对路径引用即可：

```markdown
![说明](attachments/your-image.png)
```

构建时会自动改写为 `/attachments/your-image.png`。

### 书籍、连载与专题

一级导航依次为「专题」「连载」「文库」「关于」，分别进入 `/topics`、`/books`、`/library`、`/about`。
文库只负责文章与多媒体的栏目、分类、标签、贡献者和署名位置筛选；书籍清单与连续阅读统一由 `/books` 承担。

书籍清单位于 `source/_books/*.json`。`citations.translation` 是必填的 Zotero 结构化书目，
`citations.original` 只在原版资料已经核验时填写；构建期统一生成两个复制位的 BibTeX。译本固定为
Zotero `book` / BibTeX `@book`，引用 URL 固定指向 `/books/<slug>`。`pdfUrl`、`epubUrl`
下载入口只在对应 URL 存在时出现。不得为补齐界面而虚构书目信息或空文件地址。专题位于
`source/_topics/*.md`，按分组与条目数组的人工顺序公开，不从标签自动生成。

### 标点与引号（写作规范）

正文引号统一使用**方向性弯引号** `“ ”`（双）/ `‘ ’`（单），由字体按中英文环境渲染为全角 / 半角；**不要用 ASCII 直引号** `"` `'`。

构建管线会把正文文本中的直引号自动规范化为弯引号（区分开 / 闭，英文词内撇号如 `it's` 归一为 `’`），并跳过代码块与 Markdown 语法本身（如图片 `title`）。即便有此兜底，**写作时仍建议直接输入弯引号**，使 Outline / 任意 Markdown 预览里的源文也保持正确。

### 脚注与链接

脚注用 **GFM 语法** `[^n]`（正文角标）+ `[^n]: 定义`（文末定义），前端会渲染为可点角标、文末脚注区与返回箭头。Outline 的 Markdown 预览会弄乱 `[^n]`——**以博客前端为准**，落库到 `source/_posts/` 的 `.md` 必须用 GFM 脚注语法。外链自动新窗口打开；Outline 内部 `mention://` 链接会被降级为纯文本，发布前请替换为真实 URL。

---

## 本地开发

```bash
npm ci
npm run dev      # http://localhost:3000
npm run check    # 全部静态、内容与纯逻辑门禁；不启动真实浏览器
npm run build    # Next.js 生产构建；Vercel 会先执行 npm run check
```

验证构建结果时，在终端 A 启动并保持服务运行：

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
```

再在终端 B 执行 SSR／HTTP 发布回归：

```bash
npm run verify:release -- http://127.0.0.1:3100
```

`npm run check`、`npm run build` 和 `verify:release` 分别验证不同层级，不能互相替代。当前自动门禁尚不执行 Playwright；真实浏览器交互与视觉终态的覆盖边界见 [`docs/architecture/content-pipeline.md`](docs/architecture/content-pipeline.md)。

## 目录结构

```
app/                  Next.js App Router（页面、布局、组件）
  components/         TopBar / Footer / PosterWallHome / PostIndex
    reading-edition/  正式正文布局、客户端 Chrome 与阅读记录
  library/            文库与栏目、主题分类、标签、贡献者、署名位置筛选
  books/              书籍、连载与章节入口
  topics/             人工策展专题索引与详情
  about/              联系方式与站外入口
  search/             旧 `/search` 的兼容重定向
  media/[slug]/       多媒体条目详情页
  posts/[slug]/       文章详情页
  page.tsx            首页（四栏目编辑展示 + 最新更新）
  globals.css         全站样式（新粗野主义设计 + Markdown 正文样式）
lib/
  posts.ts            读取 / 解析文章
  markdown.ts         Markdown → HTML 渲染管线
  site.ts             站点常量（品牌、简介等）
source/_posts/        文章内容（Markdown）
source/_books/        书籍与章节清单（JSON）
source/_topics/       人工策展专题（Markdown）
public/               静态资源（attachments / img）
scripts/              内容、字体、路由、引用与发布验证
docs/architecture/    运行时和内容管线维护说明
docs/releases/        已发布版本锚点
```

## 部署说明

Vercel 项目 `un-canon-blog` 的 Framework Preset 应为 **Next.js**
（仓库内 `vercel.json` 已声明 `"framework": "nextjs"`）。推送 `main` 即自动部署。

### 爬虫访问策略

站点通过 `app/robots.ts` 允许搜索引擎和常见 LLM 爬虫访问，并以 `Crawl-delay: 10`
请求合作爬虫保持低频访问。`public/llms.txt` 提供站点范围、内容索引和访问约定。

注意：`robots.txt` 和 `Crawl-delay` 只能表达协议层面的访问意愿，不能强制不遵守协议的
爬虫限速。当前域名的线上 `robots.txt` 还可能被 Cloudflare Managed Content 追加规则；
如需真正允许 GPTBot、ClaudeBot 等，必须在 Cloudflare 的 AI Crawl Control / Managed
Content 设置中关闭对应的禁止规则，并在 Cloudflare Rate Limiting 中配置实际限速。

授权：CC0 1.0
