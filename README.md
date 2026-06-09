# 西方負典 / UNCANON

新粗野主义人文随笔站 —— 关注历史、产业与文化的中文博客。
线上地址：<https://un-canon.blog>

技术栈：**Next.js（App Router，SSG）+ Markdown**。文章以 Markdown 形式存放在仓库中，
推送到 GitHub 后由 Vercel 自动构建并部署。

---

## 写作 / 发布流程

1. 在 `source/_posts/` 下新建一个 `.md` 文件。
2. 填写 front-matter（见下），写正文。
3. 提交并推送到 `main` 分支 —— Vercel 会自动构建上线。

### Front-matter 字段

```markdown
---
title: 文章标题
categories: 历史          # 主分类（也用作首页/文章页的分类标签）
tags: [历史, 产业]        # 标签（可多个；用于首页筛选）
date: 2026-05-12         # 发布日期 YYYY-MM-DD
post_author: 作者名       # 可选，显示在文章页元信息中
slug: my-custom-url      # 可选，自定义 URL；缺省时用文件名
excerpt: 一句话摘要        # 可选，缺省时自动取正文首段
---

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

授权：CC0 1.0
