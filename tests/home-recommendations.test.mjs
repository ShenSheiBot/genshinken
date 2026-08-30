import assert from "node:assert/strict";
import test from "node:test";
import {
  READER_EDITORIAL_SECTIONS,
  selectHomeRecommendations,
} from "../lib/editorial.ts";
import {
  createHomeVariantRandom,
  HOME_VARIANT_COUNT,
  homeVariantPath,
  pickHomeVariant,
} from "../lib/home-variants.ts";
import { needsDenseHomeTitle } from "../lib/home-wall.ts";

const items = [
  { slug: "essay-new", section: "essay" },
  { slug: "review-new", section: "review" },
  { slug: "translation-new", section: "translation" },
  { slug: "interview-new", section: "interview" },
  { slug: "community-new", section: "community" },
  { slug: "essay-old", section: "essay" },
  { slug: "review-old", section: "review" },
  { slug: "translation-old", section: "translation" },
  { slug: "interview-old", section: "interview" },
  { slug: "community-old", section: "community" },
  { slug: "essay-older", section: "essay" },
];

test("the static fallback leads with one item from every reader section", () => {
  const selected = selectHomeRecommendations(items);

  assert.deepEqual(
    selected.slice(0, READER_EDITORIAL_SECTIONS.length).map((item) => item.section),
    READER_EDITORIAL_SECTIONS
  );
  assert.deepEqual(
    selected.slice(0, READER_EDITORIAL_SECTIONS.length).map((item) => item.slug),
    [
      "essay-new",
      "review-new",
      "translation-new",
      "interview-new",
      "community-new",
    ]
  );
  assert.equal(selected.length, 10);
  assert.equal(new Set(selected.map((item) => item.slug)).size, selected.length);
});

test("a random source changes both section picks and the shared remainder", () => {
  const low = selectHomeRecommendations(items, 10, () => 0);
  const high = selectHomeRecommendations(items, 10, () => 0.999999);

  assert.deepEqual(
    high.slice(0, READER_EDITORIAL_SECTIONS.length).map((item) => item.section),
    READER_EDITORIAL_SECTIONS
  );
  assert.notDeepEqual(
    high.map((item) => item.slug),
    low.map((item) => item.slug)
  );
  assert.equal(new Set(high.map((item) => item.slug)).size, high.length);
});

test("missing sections and short collections remain valid", () => {
  const sparse = [
    { slug: "essay", section: "essay" },
    { slug: "community", section: "community" },
  ];

  assert.deepEqual(
    selectHomeRecommendations(sparse, 10, () => Number.NaN).map((item) => item.slug),
    ["essay", "community"]
  );
  assert.deepEqual(selectHomeRecommendations(items, 0), []);
});

test("pre-rendered homepage variants are stable and meaningfully different", () => {
  const first = selectHomeRecommendations(items, 10, createHomeVariantRandom(1));
  const repeat = selectHomeRecommendations(items, 10, createHomeVariantRandom(1));
  const second = selectHomeRecommendations(items, 10, createHomeVariantRandom(2));

  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first.map((item) => item.slug), second.map((item) => item.slug));
});

test("the request picker always resolves to a pre-rendered homepage", () => {
  assert.equal(homeVariantPath(pickHomeVariant(() => 0)), "/home-variants/0");
  assert.equal(
    homeVariantPath(pickHomeVariant(() => 1)),
    `/home-variants/${HOME_VARIANT_COUNT - 1}`
  );
  assert.equal(homeVariantPath(pickHomeVariant(() => Number.NaN)), "/home-variants/0");
});

test("feature titles that would occupy four CJK lines use the dense scale", () => {
  assert.equal(
    needsDenseHomeTitle({
      title: "为什么日本文化中对少女有着病态般的喜爱？为什么日本女性总是要强调可爱？",
      homeTitleBreaks: [],
      section: "essay",
    }),
    true
  );
  assert.equal(
    needsDenseHomeTitle({
      title: "回答：如何评价2020年4月新番《昨日之歌》？",
      homeTitleBreaks: [],
      section: "review",
    }),
    false
  );
  assert.equal(
    needsDenseHomeTitle({
      title: "伊藤计划、大屠杀、政治国家与《和谐<harmony/>》",
      homeTitleBreaks: [],
      section: "review",
    }, true),
    true
  );
});
