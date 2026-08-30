import assert from "node:assert/strict";
import test from "node:test";
import {
  READER_EDITORIAL_SECTIONS,
  selectHomeRecommendations,
} from "../lib/editorial.ts";

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
