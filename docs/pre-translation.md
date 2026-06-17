# 西方負典 · 译前处理原则

规定**译前处理（文本清洗）阶段**的约束——原始稿件 / 译文在**进入** `source/_posts/*.md` **之前**应完成的规范化。
处在「来源 → 译前处理 → 翻译 → 落库 md → 博客」链条中的清洗这一环。落库后的写作规范见
[`delivery-standards.md`](delivery-standards.md)。**所有记号一律 ASCII，不夹中文。**

---

## 1. 文件与 URL：ASCII 化

slug / 文件名规范化为 ASCII（小写、数字、短横线）。细则见 `delivery-standards.md` §1。

## 2. 引号规范化

正文 ASCII 直引号 `" '` 转为方向性 Unicode 弯引号（`“ ”` 双 / `‘ ’` 单）。front-matter 值、图片 `title`
不经前端构建期规范化，须在此阶段改正。

## 3. 脚注统一为 GFM

一切脚注（Word/Outline 导出的 `_ftnref` 锚点、纯文本角标等）统一改写为 GFM：正文 `[^n]` + 文末 `[^n]: 定义`。
不要手写 `## 注释` 标题或脚注前的 `---`；文末「注释」区由前端自动生成。

## 4. 承接段标记

自然段中插入引文后承接该段的段落，于该段**前一行单独**写哨兵记号 `<!--continue-->`：

```markdown
> ……引文最后一行。

<!--continue-->

在英国的清算联盟方案……（承接段，前端将不缩进首行）
```

记号必须**独立成行**（与正文同行会被 CommonMark 当作 HTML 块吞掉整段）。渲染管线（`lib/markdown.ts`）
识别紧邻其下的段落、抹掉记号并赋 `.cont`（首行不缩进）。其余段落默认首行缩进两格。

## 5. 内链与图片

- Outline 内部 `mention://` 链接在公网无意义，替换为真实 URL 或纯文本。
- 图片落到 `public/attachments/`，正文用相对路径 `attachments/...`。

## 6. front-matter 补全

落库前补全 YAML：`title` / `date` / `slug`(ASCII) / `categories` / `tags` / 署名等。细则见
`delivery-standards.md` §2。
