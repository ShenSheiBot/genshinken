# 《零零年代的想象力》文库整合证据

- 十六个公开稿的 `citation.bookTitle` 均为《零零年代的想象力》，题名从第一章连续至第十六章，没有章号缺口。
- 第十三章的专篇证据明确记录其前章 `cv14950755` 与后章 `cv15049636`；第十六章正文自称最终章，并写明“本书到这里也将结束了”。因此本组是完整著作译文，不是按宇野常宽或零零年代主题聚类。
- 文库顺序严格按原章号，而非B站发布时间或文件名字典序。书级状态为 `complete`；书级作者只登记宇野常宽，各章译者、校对与发布日期保留在 chapter credits。
- 单一 `book_document` 使用第一章公开稿 `zero-years-imagination-ch1-problem-statement.md`。其余十五个独立公开稿撤下，完整JSON、逐篇 evidence 与R2资产均未删除。
- 合并时给每章脚注调用与定义统一增加 `chapter-NN-` 命名空间，防止同一Markdown文档内的编号相互覆盖；注释文本没有改写。
- 章节正文前增加稳定锚点 `chapter-01` 至 `chapter-16`。图片仍使用原有 `attachments/roof-archive/<cvId>/...` 路径，没有复制或改写二进制资产。
