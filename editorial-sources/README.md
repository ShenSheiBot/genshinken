# Editorial source snapshots

本目录保存进入博客前的**完整、不可变源文快照**。它不是公开内容目录，也不是供润色的工作副本。

## 强制规则

- 先保存完整源文，再做任何清洗或落库操作。
- 已登记文件不得原地修改、删除或改名；订正必须新增版本文件。
- `npm run verify:snapshot-history` 依据 Git 基线执行追加式历史检查，防止“改快照并同时更新哈希”的绕过。
- `preservation-manifest.json` 固定源文件 SHA-256、来源、拼接顺序、允许转换和逐项授权修订。
- `npm run sync:preserved` 先验证全部清单、路径和源哈希，再从快照确定性重建正文。
- `npm run verify:preservation` 执行零差异比较：允许转换归一化后的正文保留率为 100%，未授权差异为 0。
- 合法的实质性改写必须另立文件／slug；不得通过更新快照或清单静默覆盖原稿。

## 当前允许的派生模式

- `verbatim`：正文必须与单一源文逐字一致。
- `section-merge`：只允许按清单顺序增加指定 Markdown 节标题并拼接源文。

## 当前允许的机械转换

- `smart-double-quotes`：只允许逐行把成对 ASCII 双直引号转换为 `“ ”`；遇到不成对引号直接失败。

任何新的转换都必须先在规范中定义、在校验脚本中实现并加入失败测试，不能临时由模型自由发挥。

## 逐项授权修订

OCR 订正和用户明确指定的字词修订放入对应文档的 `authorizedChanges`。每项必须包含：

```json
{
  "id": "ocr-001",
  "kind": "ocr-correction",
  "find": "错误字词",
  "replacement": "订正字词",
  "reason": "订正理由",
  "evidence": "页图、录音、可信底本或用户指令",
  "authorizedBy": "授权人",
  "authorizedAt": "2026-08-03"
}
```

`find` 必须在前序转换和修订完成后唯一匹配，且 `find`／`replacement` 均不得跨越换行；这样逐项修订不能被用来删除、合并或重写自然段。
