import assert from 'node:assert/strict';
import test from 'node:test';
import { groupJapaneseHeadingWords } from '../lib/reader-heading-words.ts';

const input = '<h2 id="heading">現代の文化と<strong><a href="#reference">トランスナショナル</a></strong>な世界</h2>';
test('Japanese heading grouping preserves inline markup, anchors and other editions', () => {
  const output = groupJapaneseHeadingWords(input, 'ja');
  assert.match(output, /<h2 id="heading">/);
  assert.match(output, /<strong><a href="#reference"><span data-reader-heading-word="">トランスナショナル<\/span><\/a><\/strong>/);
  assert.equal(output.replace(/<[^>]*>/g, ''), input.replace(/<[^>]*>/g, ''));
  assert.equal(groupJapaneseHeadingWords(input, 'zh-Hans'), input);
  assert.equal(groupJapaneseHeadingWords(input, 'en'), input);
  assert.equal(groupJapaneseHeadingWords(output, 'ja'), output);
  const formula = '<h3 id="math"><span class="katex">トランスナショナル</span><code>トランスナショナル</code></h3>';
  assert.equal(groupJapaneseHeadingWords(formula, 'ja'), formula);
});

