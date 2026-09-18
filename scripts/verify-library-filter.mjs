/* ============================================================
   文库客户端筛选契约 — lib/library-filter.ts 的纯函数语义门禁。
   /library 静态化后，筛选正确性完全依赖这些函数（服务端与
   客户端共用）；HTTP 层的内容一致性由 verify-editorial-release
   对照 front matter 再验一次（C3），这里锁定语义边界。
   ============================================================ */
import assert from "node:assert/strict";
import { findContributorByName } from "../lib/contributors.ts";
import {
  connectedTagFacetValues,
  filterHref,
  parseLibraryFilters,
  rowMatches,
  showContributorByDefault,
} from "../lib/library-filter.ts";

assert.deepEqual(
  connectedTagFacetValues(["单篇", "共同", "另一共同", "共同", "另一共同", "共同"]),
  ["共同", "另一共同"],
  "singleton tags must stay out of the default facet while connected tags sort by count"
);

assert.equal(showContributorByDefault(5), false, "contributors with five entries stay collapsed");
assert.equal(showContributorByDefault(6), true, "contributors with six entries stay visible");
assert.equal(showContributorByDefault(1, true), true, "an active low-frequency contributor stays visible");

const facets = {
  categories: ["历史", "政治经济学"],
  tags: ["伊朗", "历史", "苏联"],
  contributors: [
    { id: "wang-yu", name: "王鱼" },
    { id: "fang-cao", name: "方草" },
  ],
};

const row = (overrides) => ({
  slug: "example",
  href: "/posts/example",
  title: "示例",
  section: "translation",
  category: "历史",
  tags: ["伊朗"],
  credits: [
    { role: "author", contributorId: "fang-cao", mark: "作", name: "方草", solid: true },
    { role: "translator", contributorId: "wang-yu", mark: "译", name: "王鱼", solid: false },
  ],
  author: "方草",
  no: "1",
  sectionNo: "01",
  displayDateISO: "2026-01-01",
  readMin: 5,
  ...overrides,
});

function parse(query) {
  return parseLibraryFilters(new URLSearchParams(query), facets);
}

// --- 解析：规范值、别名、大小写、NFKC ---------------------------------
{
  const { filters, hasInvalid } = parse("section=essay&tag=伊朗&contributor=wang-yu&role=translator");
  assert.equal(hasInvalid, false);
  assert.deepEqual(filters, {
    section: "essay",
    category: null,
    tag: "伊朗",
    contributor: "wang-yu",
    role: "translator",
  });
}
assert.equal(parse("section=论").filters.section, "essay", "section aliases must resolve");
assert.equal(parse("section=社").filters.section, "community", "community alias must resolve");
assert.equal(parse("section=ESSAY").filters.section, "essay", "section must be case-insensitive");
assert.equal(parse("contributor=WANG-YU").filters.contributor, "wang-yu");
assert.equal(parse("category=历史").filters.category, "历史");
for (const byline of ["侑", "村上侑", "长相最刻板印象的亚洲企鹅"]) {
  assert.equal(findContributorByName(byline)?.id, "murakami-yu", `${byline} must share one identity`);
}
assert.notEqual(
  findContributorByName("实在狗子")?.id,
  findContributorByName("非实在狗子")?.id,
  "the interview explicitly introduces them as two people"
);
for (const [byline, currentId] of Object.entries({
  "崆峒山下三角鸦": "kong-tong-shan-xia-san-jiao-ya",
  "静希草十郎": "jing-xi",
  "伦勃朗君": "lun-bo-lang",
  "暗黑寒冰领主＆免费版DeepL": "an-hei-han-bing",
  "河豚ccc": "he-tun",
  "AI + 生命体征维持茶话会": "sheng-ming-ti-zheng-wei-chi-cha-hua-hui",
  "王琼海": "red-tea-seaweed",
})) {
  const contributor = findContributorByName(byline);
  assert.equal(contributor?.id, currentId, `${byline} must share the confirmed identity`);
  assert.equal(contributor.preserveSourceByline, true, `${byline} must remain visible in its original credit`);
}
for (const [oldId, currentId] of Object.entries({
  "kongtongshanxia-sanjiaoya": "kong-tong-shan-xia-san-jiao-ya",
  "jing-xi-cao-shi-lang": "jing-xi",
  "lun-bo-lang-jun": "lun-bo-lang",
  "an-hei-han-bing-ling-zhu-deepl": "an-hei-han-bing",
  "he-tun-ccc": "he-tun",
  "ai-sheng-ming-ti-zheng-wei-chi-cha-hua-hui": "sheng-ming-ti-zheng-wei-chi-cha-hua-hui",
  "wang-qionghai": "red-tea-seaweed",
  "you-fisherman": "murakami-yu",
})) {
  const mergedFacets = {
    ...facets,
    contributors: [{ id: currentId, name: currentId }],
  };
  const legacy = parseLibraryFilters(new URLSearchParams(`contributor=${oldId}`), mergedFacets);
  assert.equal(legacy.filters.contributor, currentId, `${oldId} must resolve to its confirmed identity`);
  assert.equal(legacy.normalizedHref, `/library?contributor=${currentId}`);
}

// --- 无效值：标记 invalid 并保留其余有效 facet（旧 307 语义） ----------
{
  const { filters, hasInvalid, normalizedHref } = parse("contributor=not-a-contributor&role=translator");
  assert.equal(hasInvalid, true, "unknown contributor must be flagged invalid");
  assert.equal(filters.contributor, null);
  assert.equal(filters.role, "translator");
  assert.equal(
    normalizedHref,
    "/library?role=translator",
    "normalization must preserve the remaining valid facets"
  );
}
assert.equal(parse("tag=不存在的标签").hasInvalid, true);
assert.equal(parse("tag=不存在的标签").normalizedHref, "/library");
assert.equal(parse("utm_source=x").hasInvalid, false, "unknown params are ignored, not invalid");
assert.equal(parse("").normalizedHref, "/library");

// --- 匹配：contributor+role 必须命中同一条署名 -------------------------
const filters = parse("contributor=wang-yu&role=translator").filters;
assert.equal(rowMatches(row({}), filters), true, "translator credit must match");
assert.equal(
  rowMatches(row({
    credits: [
      { role: "translator", contributorId: "fang-cao", mark: "译", name: "方草", solid: false },
      { role: "author", contributorId: "wang-yu", mark: "作", name: "王鱼", solid: true },
    ],
  }), filters),
  false,
  "contributor+role must match within a single credit, not across credits"
);
assert.equal(rowMatches(row({ tags: [] }), parse("tag=伊朗").filters), false);
assert.equal(rowMatches(row({}), parse("section=translation&category=历史").filters), true);
assert.equal(rowMatches(row({ section: "essay" }), parse("section=translation").filters), false);

// --- href 往返 --------------------------------------------------------
{
  const parsed = parse("section=essay&tag=伊朗");
  assert.equal(filterHref(parsed.filters), "/library?section=essay&tag=%E4%BC%8A%E6%9C%97");
  const roundTrip = parse(new URL(filterHref(parsed.filters), "https://x.invalid").search);
  assert.deepEqual(roundTrip.filters, parsed.filters, "filterHref must round-trip through parsing");
  assert.equal(filterHref(parsed.filters, { section: null, tag: null }), "/library");
}

console.log("library filter contract passed");
