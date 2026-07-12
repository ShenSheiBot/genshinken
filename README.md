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

### Front-matter 字段

```markdown
---
title: 文章标题
categories: 历史          # 主分类（也用作首页/文章页的分类标签）
tags: [历史, 产业]        # 标签（可多个；用于首页筛选）
date: 2026-05-12         # 发布日期 YYYY-MM-DD
post_author: 作者名       # 作者；首页卡片上以实心橙块「作」标记
translator: 译者名        # 可选；空心橙块「译」
editor: 编者名            # 可选；空心橙块「编」
proofreader: 校对名       # 可选；空心橙块「校」
slug: my-custom-url      # 自定义 URL；必须为 ASCII（缺省取文件名，故中文文件名也要补此项）
excerpt: 一句话摘要        # 可选，缺省时自动取正文首段
---

> 署名顺序固定为 作者 → 译者 → 编者 → 校对；一个角色多人用逗号分隔。

正文从这里开始……
```

> 兼容历史写法：也可以用「`# 标题`(会被当作 YAML 注释) + 散列键 + 单独一行 `---`」的旧式头部，
> 解析结果与标准 front-matter 一致。新文章建议直接用上面的标准写法。

### 图片

把图片放进 `public/attachments/`，在正文里用相对路径引用即可：

```markdown
![说明](attachments/your-image.png)
```

构建时会自动改写为 `/attachments/your-image.png`。

### 标点与引号（写作规范）

正文引号统一使用**方向性弯引号** `“ ”`（双）/ `‘ ’`（单），由字体按中英文环境渲染为全角 / 半角；**不要用 ASCII 直引号** `"` `'`。

构建管线会把正文文本中的直引号自动规范化为弯引号（区分开 / 闭，英文词内撇号如 `it's` 归一为 `’`），并跳过代码块与 Markdown 语法本身（如图片 `title`）。即便有此兜底，**写作时仍建议直接输入弯引号**，使 Outline / 任意 Markdown 预览里的源文也保持正确。

### 脚注与链接

脚注用 **GFM 语法** `[^n]`（正文角标）+ `[^n]: 定义`（文末定义），前端会渲染为可点角标、文末脚注区与返回箭头。Outline 的 Markdown 预览会弄乱 `[^n]`——**以博客前端为准**，落库到 `source/_posts/` 的 `.md` 必须用 GFM 脚注语法。外链自动新窗口打开；Outline 内部 `mention://` 链接会被降级为纯文本，发布前请替换为真实 URL。

---

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建（与 Vercel 一致）
```

## 目录结构

```
app/                  Next.js App Router（页面、布局、组件）
  components/         TopBar / Hero / Footer / PostIndex
  posts/[slug]/       文章详情页
  page.tsx            首页（英雄区 + 索引列表 + 标签筛选）
  globals.css         全站样式（新粗野主义设计 + Markdown 正文样式）
lib/
  posts.ts            读取 / 解析文章
  markdown.ts         Markdown → HTML 渲染管线
  site.ts             站点常量（品牌、简介等）
source/_posts/        文章内容（Markdown）
public/               静态资源（attachments / img）
```

## 部署说明

Vercel 项目 `un-canon-blog` 的 Framework Preset 应为 **Next.js**
（仓库内 `vercel.json` 已声明 `"framework": "nextjs"`）。推送 `main` 即自动部署。

### 爬虫访问策略

站点通过 `app/robots.ts` 允许搜索引擎和常见 LLM 爬虫访问，并以 `Crawl-delay: 10`
请求合作爬虫保持低频访问。`public/llms.txt` 提供站点范围、文章索引和访问约定。

注意：`robots.txt` 和 `Crawl-delay` 只能表达协议层面的访问意愿，不能强制不遵守协议的
爬虫限速。当前域名的线上 `robots.txt` 还可能被 Cloudflare Managed Content 追加规则；
如需真正允许 GPTBot、ClaudeBot 等，必须在 Cloudflare 的 AI Crawl Control / Managed
Content 设置中关闭对应的禁止规则，并在 Cloudflare Rate Limiting 中配置实际限速。

授权：CC0 1.0
