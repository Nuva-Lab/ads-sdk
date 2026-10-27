import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'playground-connection-'));after(()=>rm(dir,{recursive:true,force:true}));
await build({stdin:{contents:"export {ChatController} from './src/chat.ts';export {notice,dismissNotice} from './src/ui.ts';export {setLocale} from './src/i18n.ts';",resolveDir:new URL('..',import.meta.url).pathname,loader:'ts'},outfile:join(dir,'fixture.mjs'),bundle:true,platform:'node',format:'esm'});
const {ChatController,notice,dismissNotice,setLocale}=await import(pathToFileURL(join(dir,'fixture.mjs')));
function element(){const classes=new Set();return {hidden:true,dataset:{},children:[],className:'',classList:{toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)},replaceChildren(...children){this.children=children;for(const child of children)child.parentNode=this},set textContent(value){this.children=[{data:value,parentNode:this}]},get textContent(){return this.children.map(c=>c.data).join('')}}}
function fixture(t){
 t.mock.timers.enable({apis:['setTimeout']});const previous=globalThis.document;
 const elements=new Map(['notice','connection-button','connection-label'].map(id=>[id,element()]));
 globalThis.document={documentElement:{lang:''},getElementById:id=>elements.get(id),createTextNode:data=>({data,parentNode:null})};setLocale('en',false);
 const chat=Object.create(ChatController.prototype);Object.assign(chat,{sessionId:'test-session',connectionError:''});
 t.after(()=>{dismissNotice();globalThis.document=previous});
 return {chat,toast:elements.get('notice'),control:elements.get('connection-button'),label:elements.get('connection-label')};
}
const healthy={status:'idle'};
const interrupted={status:'idle',error:{code:'CONNECTION_ERROR',message:'Connection interrupted; retaining the last saved state.',retryable:true}};
test('header follows interruption and the owned notice clears on a healthy snapshot',t=>{
 const {chat,toast,control,label}=fixture(t);chat.renderConnection(healthy);assert.equal(label.textContent,'Connected');assert.ok(control.classList.contains('connected'));
 chat.renderConnection(interrupted);assert.equal(label.textContent,'Reconnecting…');assert.equal(control.classList.contains('connected'),false);assert.equal(toast.hidden,false);
 chat.renderConnection(healthy);assert.equal(label.textContent,'Connected');assert.equal(toast.hidden,true);
});
test('repeated failure snapshots neither extend the toast lifetime nor redisplay it forever',t=>{
 const {chat,toast,label}=fixture(t);chat.renderConnection(interrupted);t.mock.timers.tick(5000);chat.renderConnection(interrupted);t.mock.timers.tick(1000);assert.equal(toast.hidden,true);
 chat.renderConnection(interrupted);assert.equal(toast.hidden,true);assert.equal(label.textContent,'Reconnecting…');
 chat.renderConnection(healthy);chat.renderConnection(interrupted);assert.equal(toast.hidden,false);
});
test('recovery and old connection timers do not erase an unrelated save error',t=>{
 const {chat,toast}=fixture(t);chat.renderConnection(interrupted);notice('Could not confirm the save.',true);chat.renderConnection(healthy);t.mock.timers.tick(10000);
 assert.equal(toast.hidden,false);assert.equal(toast.textContent,'Could not confirm the save.');
 chat.renderConnection(interrupted);assert.equal(toast.textContent,'Could not confirm the save.');
});
test('initial connection and terminal authentication failures never show a connected header',t=>{
 const {chat,control,label}=fixture(t);chat.renderConnection({status:'loading'});assert.equal(label.textContent,'Connecting…');assert.equal(control.classList.contains('connected'),false);
 chat.renderConnection({status:'error',error:{code:'UNAUTHENTICATED',message:'Sign in again.',retryable:false}});assert.equal(label.textContent,'Offline');assert.equal(control.classList.contains('connected'),false);
});
