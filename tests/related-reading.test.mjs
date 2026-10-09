import test from 'node:test';
import assert from 'node:assert/strict';
import { localizedReadingEntries, relatedPostsFor } from '../lib/related-reading.ts';
const post = (slug, extra = {}) => ({slug, kind:'post', tags:[], category:'criticism', section:'review', timestamp:0, title:'中文标题', subtitle:'中文副题', excerpt:'中文摘要', readMin:99, ...extra});
const edition = (slug, extra = {}) => ({locale:'ja', status:'reviewed', sourceRef:{type:'post',slug}, href:`/ja/posts/alias-${slug}`,title:'日本語の題名',subtitle:'',excerpt:'日本語の紹介',readMin:5,...extra});
test('filter visibility and locale before ranking; keep source identity and translated routes', () => {
 const posts=[post('self',{tags:['robot']}),post('untranslated',{tags:['robot','labor']}),post('translated',{tags:['robot']}),post('english')];
 const editions=[edition('self'),edition('translated'),edition('english',{locale:'en'})];
 const candidates=localizedReadingEntries(posts,editions,'ja',true);
 const selected=relatedPostsFor(posts[0],candidates);
 assert.equal(selected.length,1);
 assert.equal(selected[0].slug,'translated');
 assert.equal(selected[0].href,'/ja/posts/alias-translated');
 assert.equal(selected[0].title,'日本語の題名');
 assert.equal(selected[0].subtitle,'');
 assert.equal(selected[0].readMin,5);
 assert.equal(localizedReadingEntries(posts,editions,'ja',false).length,0);
 assert.equal(localizedReadingEntries(posts,[edition('translated',{status:'published'})],'ja',false).length,1);
});
test('shared tags outrank category/section and publication order; at most three',()=>{
 const current=post('self',{tags:['robot']});
 const posts=[current,post('newest',{timestamp:100}),post('related',{tags:['robot'],category:'other',section:'essay'}),post('second',{timestamp:50}),post('fourth')];
 assert.deepEqual(relatedPostsFor(current,posts).map(p=>p.slug),['related','newest','second']);
});
test('books appear once and sum only readable localized chapters',()=>{
 const books=[post('source-book',{kind:'book',bookSlug:'source-book'})];
 const chapter=(slug,status)=>edition(slug,{sourceRef:{type:'book-chapter',bookSlug:'source-book',chapterSlug:slug},bookSlug:'localized-book',bookTitle:'訳書',bookSubtitle:'',bookExcerpt:'紹介',status});
 const result=localizedReadingEntries(books,[chapter('a','published'),chapter('b','reviewed')],'ja',false);
 assert.equal(result.length,1);
 assert.equal(result[0].title,'訳書');
 assert.equal(result[0].href,'/ja/books/localized-book');
 assert.equal(result[0].readMin,5);
 assert.equal(localizedReadingEntries(books,[chapter('a','published'),chapter('b','reviewed')],'ja',true)[0].readMin,10);
});
