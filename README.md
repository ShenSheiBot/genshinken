# 屋顶现视研

屋顶现视研的文章档案与发布站点。本站以动画、漫画、游戏及相关视听文化为对象，收录原创评论、研究译介与视频论文，并保留作者、译者、校对者、原注和最初发布信息。

前端基于 [un-canon-blog](https://github.com/un-canon/un-canon-blog) 改造，采用 Next.js App Router、静态生成和 Markdown 内容管线。

## 本地预览

```bash
npm ci
npm run dev
```

浏览器访问 <http://localhost:3000>。生产构建：

```bash
npm run check
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

Cloudflare Workers 预览地址：<https://roof-genshinken-a8f3d7c2.hiddengem.workers.dev>。更新部署：

```bash
npm run cf:deploy
```

## 内容结构

- `source/_posts/`：发布文章，使用 Markdown 与 YAML front matter。
- `public/attachments/roof-archive/`：文章配图的本地副本。
- `editorial-sources/roof-archive/`：本次示例文章的来源网页快照与校验信息。
- `lib/site.ts`：站名、简介、联系地址与站外主页。

文章支持作者、译者、校对、分类、标签、参考文献和 GFM 脚注。图片放在 `public/attachments/`，正文中使用 `attachments/...` 相对路径。

## 内容与授权

界面和代码基础来自上游公开的 CC0 1.0 模板。站内文章与图片不因此自动变为 CC0；各篇内容仍遵循原始发布页标明的权利与授权条件。转载、引用或再发布前请核对文章页和原始来源。
