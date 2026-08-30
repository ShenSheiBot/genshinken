# 归档稿编辑：最短可执行路径

本文给参与编辑者一条不依赖个人 agent 配置的公共路径。完整字段、排版和媒体规则见
[`delivery-standards.md`](delivery-standards.md)；这里不重复抄写规则，也不要求流程证明。

## 微信原稿

1. 在当前 worktree 内定位仓库，不假设固定目录：`cd "$(git rev-parse --show-toplevel)"`。新 worktree 第一次使用时运行
   `npm ci`；不要链接另一个提交的 `node_modules`。
2. 完整阅读该篇 `raw.html`；原始目录只读，不在里面写稿。
3. 生成确定性底稿：

   ```bash
   npm run convert:wechat -- "$SOURCE_DIR" /tmp/wechat-candidate
   ```

   转换器只恢复 HTML 明示结构。它不替编辑者判断署名、推广、二维码、图题、章节、连载、专题或文字价值。
   `/tmp/wechat-candidate.ir.json` 只帮助定位转换不了的媒体，不提交。

4. 把最终文章写进 `source/_posts/`，同时完成必要的贡献者、书籍或专题修改。逐段对读来源和成稿，允许纠错、
   语义重排和网页排版；不得遗漏实质内容。只在确有下一位编辑会复用的来源、版本、术语、关系或未决事实时写短备忘，
   不写 ledger、dossier、覆盖率、逐段证明、命令流水或截图报告。
5. 完成图片删留后，机械登记最终稿采用的预上传图片：

   ```bash
   npm run assets:wechat:register -- "$SOURCE_DIR" source/_posts/<slug>.md
   ```

6. 运行 `npm run check`。随后逐屏查看桌面与移动页面：

   ```bash
   npm run review:route -- /posts/<slug>
   ```

   命令会启动独立临时服务，输出两种视口的分段截图目录，并在退出时关闭自己启动的浏览器与服务；编辑者仍须实际查看这些截图。
   若本次不走 Cloudflare 候选上传或生产部署，再单独运行 `npm run build`；两个发布入口自身都会执行同一套
   OpenNext／Next 生产构建，不要在它们之前紧邻重复构建。
7. 检查普通 Git diff，确认没有原始库存、临时 IR、构建产物或个人 agent 配置，再提交。

如果上述仓库命令因环境或工具缺失而失败，停在准确命令并报告环境缺口；不要为完成单篇编辑而修改基础设施、
创建 Python shim、重写公共清单或发明替代流程。
