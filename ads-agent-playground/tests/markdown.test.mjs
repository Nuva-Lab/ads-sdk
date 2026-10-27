import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'playground-markdown-'));after(()=>rm(dir,{recursive:true,force:true}));
await build({entryPoints:[new URL('../src/markdown.ts',import.meta.url).pathname],outfile:join(dir,'markdown.mjs'),bundle:true,platform:'node',format:'esm'});
const {renderMarkdown}=await import(pathToFileURL(join(dir,'markdown.mjs')));
function target(t){const dom=new JSDOM('<main></main>');t.after(()=>dom.window.close());return dom.window.document.querySelector('main');}
test('GFM tables render as rows and cells instead of literal pipe-delimited text',t=>{
 const el=target(t);renderMarkdown(el,'Saved **four prompts**.\n\n| Clip | Prompt ID | Job ID |\n|---|---|---|\n| C01 | `prompt-1` | `job-1` |\n| C02 | `prompt-2` | `job-2` |');
 assert.equal(el.querySelectorAll('table').length,1);assert.equal(el.querySelectorAll('tbody tr').length,2);assert.equal(el.querySelector('th').textContent,'Clip');assert.equal(el.querySelector('strong').textContent,'four prompts');assert.equal(el.querySelector('td code').textContent,'prompt-1');assert.equal(el.querySelector('table').parentElement.className,'markdown-table-scroll');assert.equal(el.querySelector('table').parentElement.tabIndex,0);
});
test('headings, lists, blockquotes, links and fenced code retain their structure',t=>{
 const el=target(t);renderMarkdown(el,'## Result\n\n- First\n- Second\n\n> Keep the original.\n\n[Details](https://example.com)\n\n```html\n<img src=x onerror=alert(1)>\n```');
 assert.equal(el.querySelector('h2').textContent,'Result');assert.equal(el.querySelectorAll('li').length,2);assert.match(el.querySelector('blockquote').textContent,/Keep the original/);assert.match(el.querySelector('pre code').textContent,/<img/);assert.equal(el.querySelector('a').rel,'noopener noreferrer');assert.equal(el.querySelector('a').target,'_blank');assert.equal(el.querySelectorAll('img').length,0);
});
test('raw HTML is inert and unsafe Markdown URLs are removed',t=>{
 const el=target(t);renderMarkdown(el,'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[Unsafe](javascript:alert(1))\n\n<Picture 1> is a literal reference tag.');
 assert.equal(el.querySelectorAll('script,img,iframe,form,input').length,0);assert.equal(el.querySelector('a').hasAttribute('href'),false);assert.match(el.textContent,/<Picture 1>/);assert.match(el.textContent,/<script>/);
});
test('partial streaming Markdown is replaceable without duplicate blocks',t=>{
 const el=target(t);const text='**Saving**\n\n| Clip | ID |\n|---|---|\n| C01 | `p-1` |';
 for(const end of [1,3,9,20,32,text.length-1,text.length])assert.doesNotThrow(()=>renderMarkdown(el,text.slice(0,end)));
 assert.equal(el.querySelectorAll('table').length,1);assert.equal(el.querySelectorAll('strong').length,1);assert.equal(el.querySelectorAll('.markdown-table-scroll').length,1);
});
