import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "@playwright/test";
import { japaneseReaderWords, groupJapaneseHeadingWords } from "../../lib/reader-heading-words";
const css = readFileSync("app/components/reading-edition/reading-edition.module.css", "utf8");
const wordRule = css.match(/\.body:lang\(ja\) :global\(\[data-reader-heading-word\]\)\s*\{([^}]+)\}/)?.[1];
assert.ok(wordRule);
const input = '<h2 id="heading">現代の文化と<strong><a href="#reference">トランスナショナル</a></strong>な世界</h2>';
test('narrow headings keep normal katakana together but wrap an overlong token', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const long = 'トランスナショナル'.repeat(8);
    const fixture = input + `<h3 id="long">${long}</h3>`;
    async function inspect(grouped: boolean) {
      await page.setContent(`<style>body{margin:0}.body{width:280px}h2,h3{font:24px/1.5 sans-serif;margin:0;letter-spacing:0}a{color:inherit}[data-reader-heading-word]{${wordRule}}</style><article class="body" lang="ja">${grouped ? groupJapaneseHeadingWords(fixture, 'ja') : fixture}</article>`);
      return page.evaluate(() => {
        const a = document.querySelector('a')!;
        const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
        const tops = new Set();
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let i = 0; i < node.textContent!.length; i++) {
            const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
            tops.add(Math.round(range.getBoundingClientRect().top));
          }
        }
        const heading = document.querySelector<HTMLElement>('#long')!;
        return { lines: tops.size, width: heading.clientWidth, scroll: heading.scrollWidth, height: heading.getBoundingClientRect().height };
      });
    }
    assert.ok((await inspect(false)).lines > 1, 'reproduce the pre-fix mid-katakana break');
    const fixed = await inspect(true);
    assert.equal(fixed.lines, 1);
    assert.ok(fixed.scroll <= fixed.width, 'long token must not overflow');
    assert.ok(fixed.height > 36, 'long token wraps rather than being clipped');
});


test('recommendation cards group Japanese titles without overflowing long words', async ({ page }) => {
  const component = readFileSync('app/components/reading-edition/ReadingEdition.tsx', 'utf8');
  assert.ok(component.includes('<h3><ReaderTitleText text={post.title} locale={locale} /></h3>'));
  const rule = css.match(/\.latestCard \.titleWord\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  const title = '響け！ユーフォニアムとフェミニズム';
  const html = japaneseReaderWords(title).map(s => s.isWordLike ? `<span class="titleWord">${s.segment}</span>` : s.segment).join('');
  for (const width of [320, 375, 420]) {
    await page.setContent(`<style>.latestCard{width:${width}px}h3{font:42px/1.16 sans-serif;margin:0}.titleWord{white-space:nowrap}.latestCard .titleWord{${rule}}</style><article class="latestCard"><h3>${html}</h3><h3><span class="titleWord">${'ユーフォニアム'.repeat(12)}</span></h3></article>`);
    const result = await page.locator('h3').first().evaluate(h => ({ width: h.clientWidth, scroll: h.scrollWidth, words: Array.from(h.querySelectorAll('.titleWord')).map(e => { const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length; }) }));
    assert.ok(result.scroll <= result.width);
    assert.ok(result.words.every(lines => lines === 1));
    assert.ok(await page.locator('h3').last().evaluate(h => h.scrollWidth <= h.clientWidth));
  }
});
