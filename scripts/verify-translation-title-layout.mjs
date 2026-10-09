import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { getAllTranslationEditions, translationPreviewEnabled } from '../lib/translations.ts';
import { translationEditionIsVisible } from '../lib/translation-contract.mjs';

const base = process.env.PLAYWRIGHT_BASE_URL;
if (!base) throw new Error('Set PLAYWRIGHT_BASE_URL to the built site to inspect.');
const editions = (await getAllTranslationEditions()).filter(e => translationEditionIsVisible(e.status, translationPreviewEnabled()));
if (!editions.length) throw new Error('No visible translations: check the build visibility settings.');
const books = [...new Map(editions.filter(e => e.sourceRef.type === 'book-chapter')
  .map(e => [`/${e.locale}/books/${e.bookSlug}`, {href:`/${e.locale}/books/${e.bookSlug}`, locale:e.locale, title:e.bookTitle}])).values()];
const allRoutes = [...editions, ...books];
const routes = process.env.TITLE_LAYOUT_PATH ? allRoutes.filter(e => e.href === process.env.TITLE_LAYOUT_PATH) : allRoutes;
if (!routes.length) throw new Error('No matching routes.');
const browser = await chromium.launch();
const context = await browser.newContext({reducedMotion:'reduce'});
const results = [];
const report = process.env.TITLE_LAYOUT_REPORT || '/tmp/translation-title-layout.json';
if (process.env.TITLE_LAYOUT_SCREENSHOTS) await fs.mkdir(process.env.TITLE_LAYOUT_SCREENSHOTS, {recursive:true});
try {
  for (const edition of routes) {
    const page = await context.newPage();
    try {
      const response = await page.goto(new URL(edition.href, base).href, {waitUntil:'domcontentloaded', timeout:120000});
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
      const heading = page.locator('main #article-title, main h1').first();
      await heading.waitFor();
      for (const width of [390, 768, 1442]) {
        await page.setViewportSize({width, height:1000});
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const result = await page.evaluate(() => {
          const title = document.querySelector('#article-title, main h1');
          if (!title) return {error:'Missing article title'};
          const box = title.getBoundingClientRect();
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          const rects = [];
          const lines = [];
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            // Only marked punctuation may use the layout's optical hanging margin.
            // It must still remain inside the viewport.
            const parent = walker.currentNode.parentElement;
            const style = getComputedStyle(parent);
            const side = parent.dataset.readerTitlePunctuation;
            const hangLeft = side === 'open' ? Math.max(0, -parseFloat(style.marginLeft)) : 0;
            const hangRight = side === 'close' ? Math.max(0, -parseFloat(style.marginRight)) : 0;
            rects.push(...Array.from(range.getClientRects(), r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom,hangLeft,hangRight})));
            let offset = 0;
            for (const character of walker.currentNode.textContent) {
              range.setStart(walker.currentNode, offset);
              offset += character.length;
              range.setEnd(walker.currentNode, offset);
              const rect = range.getBoundingClientRect();
              if (!rect.width) continue;
              let line = lines.find(line => Math.abs(line.center - (rect.top + rect.bottom) / 2) < parseFloat(getComputedStyle(title).fontSize) * 0.3);
              if (!line) { line = {center:(rect.top + rect.bottom) / 2,text:''}; lines.push(line); }
              line.text += character;
            }
          }
          return {text:title.textContent, lines:lines.map(line=>line.text.trim()), overflow:rects.some(r => r.left < Math.max(0,box.left-r.hangLeft)-2 || r.right > Math.min(innerWidth,box.right+r.hangRight)+2), titleWidth:box.width, bounds:{left:box.left,right:box.right}, outside:rects.filter(r => r.left < Math.max(0,box.left-r.hangLeft)-2 || r.right > Math.min(innerWidth,box.right+r.hangRight)+2)};
        });
        const normalize = value => value?.replace(/\s+/gu, ' ').trim();
        const titleMismatch = normalize(result.text) !== normalize(edition.title);
        results.push({href:edition.href,locale:edition.locale,width,...result,titleMismatch});
        if (process.env.TITLE_LAYOUT_SCREENSHOTS) {
          const filename = `${edition.href.slice(1).replaceAll('/','__')}-${width}.png`;
          await heading.screenshot({path:path.join(process.env.TITLE_LAYOUT_SCREENSHOTS,filename)});
        }
      }
    } catch (error) { results.push({href:edition.href,error:String(error)}); }
    finally { await page.close(); }
    await fs.writeFile(report, JSON.stringify(results,null,2));
    console.log(`${results.length}: ${edition.href}`);
  }
} finally { await browser.close(); }
await fs.writeFile(report, JSON.stringify(results,null,2));
const failures=results.filter(r=>r.error||r.titleMismatch||r.overflow||r.titleWidth<=0);
console.log(`${routes.length}/${allRoutes.length} routes; ${failures.length} failures. This checks geometry, not editorial quality.`);
if(failures.length){console.error(failures);process.exitCode=1;}
