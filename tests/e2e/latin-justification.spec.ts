import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { renderMarkdown } from '../../lib/markdown';

const globals = readFileSync('app/globals.css', 'utf8');
const reader = readFileSync('app/components/reading-edition/reading-edition.module.css', 'utf8')
  .replace(/:global\(([^)]+)\)/g, '$1');
const source = readFileSync('source/_translations/ja/books/sarazanmai-production-notes/episode-01.md', 'utf8');
const credit = source.match(/^> 本文は[^\n]+\n> 原文：[^\n]+/m)![0];

test('Latin names in a justified Japanese quotation retain normal letter spacing', async ({ page }) => {
  const html = await renderMarkdown(credit, { language: 'ja' });
  await page.setContent(`<style>${globals}\n${reader}
    .body p {font:20px/1.8 sans-serif;letter-spacing:0;text-indent:0}
    blockquote {margin:0!important;padding:0!important;border:0!important}
    </style><main class="root"><article class="body art-body" lang="ja">${html}</article></main>`);
  await expect(page.locator("blockquote p")).toHaveCSS("text-align", "start");
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

test('the music article renders literal song dollars and valid image URLs', async ({ page, request }) => {
  const source = readFileSync('source/_translations/ja/posts/sousa-weebwave-2010s-music-videos.md', 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const html = await renderMarkdown(source, { language: 'ja' });
  await page.setContent(`<style>${globals}\n${reader}</style><main class="root"><article class="body art-body" lang="ja">${html}</article></main>`, { waitUntil: 'domcontentloaded' });
  const song = page.locator('p').filter({ hasText: 'Anime Pu$$y' }).first();
  await expect(song).toBeVisible();
  await expect(song.locator('.katex')).toHaveCount(0);
  expect(await page.locator('article').innerText()).not.toMatch(/\[fig(?:-note)?\]/);
  const urls = await page.locator('article img').evaluateAll(imgs => imgs.map(img => (img as HTMLImageElement).src));
  expect(urls).toHaveLength(10);
  for (const url of urls) {
    expect(url).not.toContain('assets.labonroof.top/attachments/');
    const response = await request.head(url);
    expect(response.ok(), url).toBeTruthy();
  }
});
