import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { renderMarkdown } from '../../lib/markdown';

const globals = readFileSync('app/globals.css', 'utf8');
const reader = readFileSync('app/components/reading-edition/reading-edition.module.css', 'utf8')
  .replace(/:global\(([^)]+)\)/g, '$1');
// Credit line from the retired Sarazanmai notes edition: Latin names inside justified Japanese.
const credit = '> 本文は **kViN** が2019年4月12日に SAKUGABLOG へ掲載したもの\n> 原文：[Sarazanmai Production Notes 01](https://blog.sakugabooru.com/2019/04/12/sarazanmai-production-notes-01/)';

test('Latin names in a justified Japanese quotation retain normal letter spacing', async ({ page }) => {
  const html = await renderMarkdown(credit, { language: 'ja' });
  await page.setContent(`<style>${globals}\n${reader}
    .body p {font:20px/1.8 sans-serif;letter-spacing:0;text-indent:0}
    blockquote {margin:0!important;padding:0!important;border:0!important}
    </style><main class="root"><article class="body art-body" lang="ja">${html}</article></main>`);
  await expect(page.locator("blockquote p")).toHaveCSS("text-align", "justify");
  const widths = [280, 320, 375, 450, 620, 740];
  for (const width of widths) {
    const result = await page.evaluate((width) => {
      const p = document.querySelector('blockquote p') as HTMLElement;
      p.style.width = `${width}px`;
      const name = p.querySelector('strong .latin-run')!;
      const measure = () => { const r = document.createRange(); r.selectNodeContents(name); return r.getBoundingClientRect().width; };
      p.style.textAlign = "justify";
      const justified = measure();
      p.style.textAlign = 'start';
      const natural = measure();
      p.style.textAlign = '';
      return { justified, natural };
    }, width);
    expect(Math.abs(result.justified - result.natural), `name stretched at ${width}px`).toBeLessThan(0.2);
  }
});

test('song titles with dollar signs render literally, not as math', async ({ page }) => {
  const html = await renderMarkdown('Josip On Deckの「Anime Pu\\$\\$y」が4chanで話題になった。', { language: 'ja' });
  await page.setContent(`<style>${globals}\n${reader}</style><main class="root"><article class="body art-body" lang="ja">${html}</article></main>`);
  const song = page.locator('p').filter({ hasText: 'Anime Pu$$y' }).first();
  await expect(song).toBeVisible();
  await expect(song.locator('.katex')).toHaveCount(0);
});

test('translations never hard-code asset-host attachment URLs', () => {
  const offenders = readdirSync('source/_translations', { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.md'))
    .filter((file) => readFileSync(`source/_translations/${file}`, 'utf8').includes('assets.labonroof.top/attachments/'));
  expect(offenders).toEqual([]);
});
