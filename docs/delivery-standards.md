# 西方負典 · 博客发布交付标准

适用于 `source/_posts/` 下的每一篇文章。**推送 `main` 之前，逐项核对本清单。**
渲染以博客前端（Next.js 构建产物）为唯一准绳——Outline / 任意 Markdown 预览里的样式不作数。

---

## 0. 发布前检查清单（TL;DR）

- [ ] **slug / 文件名全 ASCII**：短横线连字，无中文、空格、全角符号
- [ ] **YAML front-matter 完整**：标题、日期、分类、标签、署名等全部写进头部，不散落正文
- [ ] **编辑栏目已填写**：`section` 只能是 `essay / review / translation / multimedia`
- [ ] **修订旧文补 `updated` 字段**：实质性修订（改译文、补脚注）时在 front-matter 写 `updated: YYYY-MM-DD`——驱动 sitemap lastmod / RSS / 结构化数据，搜索引擎据此重抓
- [ ] **分类不重复进标签**：`categories` 与 `tags` 不重叠（前端会分别渲染）
- [ ] **引号全为方向性弯引号** `“ ” ‘ ’`，正文无 ASCII 直引号 `" '`
- [ ] **脚注用 GFM `[^n]` 语法**，`npm run build` 后确认角标可跳转、底部有脚注区
- [ ] **首行缩进交给前端**：勿手敲全角空格；承接段用 `<!--continue-->` 标记（见 §7）
- [ ] **链接有效**：外链正常；无残留的 Outline `mention://` 内链
- [ ] **提交作者 = `un-canon <un-canon@hotmail.com>`**
- [ ] 本地 `npm run check` 与 `npm run build` 通过，再推送

---

## 1. 文件与 URL：必须 ASCII

`slug` 决定文章 URL：普通文章为 `/posts/<slug>`，`section: multimedia` 为 `/media/<slug>`。
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
date: 2026-06-15          # 发布日期 YYYY-MM-DD
updated: 2026-07-13       # 可选；实质性修订时更新，缺省回退到 date
slug: ascii-url-slug      # 必填且必须 ASCII（见 §1）
categories: [历史]         # 主分类；前端单独渲染为分类标记
section: translation      # 编辑栏目；驱动首页入口与内容索引筛选
tags: [布雷顿森林, 冷战起源] # 标签；勿与 categories 重复
post_author: 作者名         # 作者，实心方块「作」
translator: 译者名          # 可选，空心「译」
editor: 编者名             # 可选，空心「编」
proofreader: 校对名         # 可选，空心「校」
excerpt: 一句话摘要         # 可选，缺省取正文首段
featured_order: 0        # 可选；同栏目首页推荐优先级，数值越大越靠前
---
```

- 署名顺序固定：作者 → 译者 → 编者 → 校对；一个角色多人用逗号分隔。
- `categories` 只用于分类标记，**不会**再混进标签行（`lib/posts.ts` 已分离二者）。
- `section` 是首页栏目，必须且只能取以下值之一：
  - `essay`：论
  - `review`：评
  - `translation`：译介
  - `multimedia`：多媒体
- `section` 与 `categories` 相互独立；不要用“历史 / 哲学”等主题分类代替栏目，也不要只依赖译者署名推断译介。
- `featured_order` 可用于任一栏目，必须是有限数值；缺省为 `0`，数值越大则在同栏目首页越靠前。
- `related_posts` 只允许多媒体条目使用，写作 slug 列表，例如
  `related_posts: [lih-lenin-disputed, pechatnov-soviet-union-bretton-woods]`。目标必须是已发布的
  非多媒体站内文稿，不得重复或指向条目自身。

---

## 3. 引号与标点

正文引号统一使用**方向性 Unicode 弯引号**：双引号 `“ ”`、单引号 `‘ ’`。
由字体按上下文渲染为 **CJK 全角 / 西文半角**。**禁止使用 ASCII 直引号 `"` `'`。**

构建管线（`lib/markdown.ts` 的 `rehypeSmartQuotes`）会把正文文本里的直引号自动规范化为弯引号
（区分开 / 闭，英文词内撇号如 `it's` 归一为 `’`），并跳过 `code` / `pre` 与 Markdown 语法本身。
即便有此兜底，**写作时仍应直接输入弯引号**，使源文在任何预览里都正确。

> 注意：front-matter 的值、图片 `title` 等**不经过**正文引号规范化，写时务必直接用弯引号或避免引号。

---

## 4. 脚注与链接：前端必须可渲染、可跳转

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
  跳转锚点。

### 链接

- 外链自动加 `target="_blank" rel="noopener noreferrer"`。
- 站内资源用相对路径。
- **Outline 内部 `mention://` 链接在公网无意义**，构建时会被降级为纯文本——发布前应替换为真实 URL。

---

## 5. 图片

放进 `public/attachments/`，正文用相对路径引用，构建时自动改写为 `/attachments/...`：

```markdown
![说明](attachments/your-image.png)
```

---

## 6. 提交与部署

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
  并固定 `buildCommand: next build`，构建以此为准。

---

## 7. 首行缩进与承接段

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

## 8. 自动交付门禁

- `npm run validate:content`：检查栏目、显式 ASCII slug、slug 唯一性、分类/标签和多媒体关联字段。
- `npm run validate:media-html`：验证多媒体资料 HTML 的允许列表会剔除播放器、主动内容和危险属性。
- `npm run typecheck`：执行严格 TypeScript 检查，不生成文件。
- `npm run lint`：使用非交互 ESLint CLI；任何警告也视为失败。
- `npm run check`：依次运行上述四项，适合作为提交前快速门禁。
- `npm run build`：执行完整生产构建。首页、索引、案卷正文与多媒体的产品验收以
  [`frontend-product-spec.md`](frontend-product-spec.md) 为准。
- `npm run verify:editorial -- <base-url>`：对已经启动的本地站点或公开环境执行发布回归；例如
  `npm run verify:editorial -- https://un-canon.blog`。
