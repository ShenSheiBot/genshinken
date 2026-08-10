// Node --experimental-strip-types 运行 .ts 时相对导入必须带扩展名，而
// tsconfig 未开 allowImportingTsExtensions。与 media-material-runtime.mjs
// 相同的桥接：让 lib/library-filter.ts 与验证脚本共享 editorial 的运行时值。
export {
  EDITORIAL_SECTIONS,
  EDITORIAL_SECTION_META,
  editorialSectionFrom,
  isEditorialSection,
  postPath,
} from "./editorial.ts";
