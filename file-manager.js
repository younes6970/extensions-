'use strict';
(()=> {
const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const button=(label,handler)=>{const e=$('button','',label);e.type='button';e.onclick=handler;return e};
const dbName='myspace-explorer',store='handles',key='lastDirectory';
function database(){return new Promise((ok,no)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore(store);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function saved(operation,mode='readonly'){const d=await database();return new Promise((ok,no)=>{const tx=d.transaction(store,mode),r=operation(tx.objectStore(store));r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);tx.oncomplete=()=>d.close()})}
const get=()=>saved(s=>s.get(key)),put=v=>saved(s=>s.put(v,key),'readwrite'),clear=()=>saved(s=>s.delete(key),'readwrite');
const cmp=new Intl.Collator('fa',{numeric:true,sensitivity:'base'});
const size=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(1)+' GB';
const extension=s=>s.includes('.')?s.split('.').pop().toLowerCase():'';
async function granted(h){try{return await h.queryPermission({mode:'read'})==='granted'}catch{return false}}
function mount(target){
target.replaceChildren();const panel=$('section','explorer');target.append(panel);
const head=$('div','explorer-head');const title=$('div');title.append($('h2','','▤ File Manager'),$('p','','مرور پوشه‌ها و فایل‌های انتخاب‌شده در Chrome'));const status=$('div','explorer-state','پوشه‌ای انتخاب نشده');head.append(title,status);
const bar=$('div','explorer-toolbar'),choose=button('◫ انتخاب پوشه',chooseDirectory),reconnect=button('↻ اتصال مجدد',reconnectDirectory),refresh=button('⟳ بروزرسانی',()=>scan(true)),forget=button('× فراموش‌کردن',forgetDirectory);
choose.className='explorer-primary';const search=$('input','explorer-search');search.type='search';search.placeholder='جست‌وجو در پوشه...';search.setAttribute('aria-label','جست‌وجوی فایل');
const sort=$('select','explorer-sort');[['name','نام'],['date','تاریخ'],['size','اندازه'],['type','نوع']].forEach(v=>{const o=$('option','',v[1]);o.value=v[0];sort.append(o)});
bar.append(choose,reconnect,refresh,forget,search,sort);
const crumbs=$('nav','explorer-crumbs'),summary=$('div','explorer-summary'),list=$('div','explorer-list'),note=$('p','explorer-note','مسیر انتخاب‌شده در حافظه مرورگر به خاطر سپرده می‌شود. هنگام باز بودن MySpace، تغییرات هر ۱۰ ثانیه بررسی می‌شوند. Chrome ممکن است مجوز پوشه را دوباره درخواست کند.');
panel.append(head,bar,crumbs,summary,list,note);
let root=null,path=[],items=[],busy=false,dead=false,stamp='',timer;
const tell=t=>status.textContent=t;
const current=()=>path.length?path[path.length-1]:root;
function render(){
reconnect.hidden=!root;forget.hidden=!root;refresh.disabled=!root;
crumbs.replaceChildren();if(root)[root,...path].forEach((h,i)=>{crumbs.append(button((i?'› ':'⌂ ')+h.name,()=>{path=path.slice(0,i);items=[];stamp='';render();scan(true)}))});
list.replaceChildren();if(!root){summary.textContent='';list.append($('div','explorer-empty','یک پوشه انتخاب کنید.'));return}
const query=search.value.trim().toLocaleLowerCase('fa'),order=sort.value;
const shown=items.filter(e=>e.name.toLocaleLowerCase('fa').includes(query)).sort((a,b)=>{if(a.kind!==b.kind)return a.kind==='directory'?-1:1;let delta=0;if(order==='date')delta=(b.modified||0)-(a.modified||0);if(order==='size')delta=(b.size||0)-(a.size||0);if(order==='type')delta=cmp.compare(extension(a.name),extension(b.name));return delta||cmp.compare(a.name,b.name)});
summary.textContent=shown.length+' مورد · '+shown.filter(e=>e.kind==='directory').length+' پوشه';
if(!shown.length){list.append($('div','explorer-empty',items.length?'چیزی پیدا نشد.':'این پوشه خالی است.'));return}
const hd=$('div','explorer-row explorer-row-head');['نام','نوع','اندازه','تاریخ تغییر'].forEach(s=>hd.append($('span','',s)));list.append(hd);
shown.forEach(e=>{const row=button('',()=>openEntry(e));row.className='explorer-row';const nm=$('span','explorer-filename');nm.append($('span','explorer-glyph',e.kind==='directory'?'📁':'▤'),$('span','',e.name));row.append(nm,$('span','',e.kind==='directory'?'پوشه':extension(e.name).toUpperCase()||'FILE'),$('span','',size(e.size)),$('span','',e.modified?new Date(e.modified).toLocaleDateString('fa-IR'):'—'));list.append(row)})}
async function chooseDirectory(){if(!window.showDirectoryPicker){tell('مرور پوشه در این نسخه Chrome پشتیبانی نمی‌شود');return}try{const h=await window.showDirectoryPicker({mode:'read'});root=h;path=[];items=[];stamp='';search.value='';await put(h);await scan(true)}catch(e){if(e.name!=='AbortError')tell('انتخاب پوشه ناموفق بود: '+e.message)}}
async function reconnectDirectory(){if(!root)return;try{if(!await granted(root)){if(await root.requestPermission({mode:'read'})!=='granted'){tell('مجوز داده نشد');return}}await scan(true)}catch(e){tell('اتصال مجدد ناموفق بود: '+e.message)}}
async function forgetDirectory(){if(!confirm('اتصال پوشه فراموش شود؟ فایل‌های اصلی پاک نمی‌شوند.'))return;await clear();root=null;path=[];items=[];render();tell('اتصال پوشه حذف شد')}
async function scan(force=false){if(dead||busy||!root||(!force&&document.hidden))return;if(!await granted(root)){tell('برای دسترسی مجدد روی «اتصال مجدد» بزنید');render();return}busy=true;refresh.disabled=true;try{const next=[];let count=0;for await(const handle of current().values()){if(dead||count++>=2000)break;const r={handle,kind:handle.kind,name:handle.name,size:null,modified:null};if(handle.kind==='file'){try{const f=await handle.getFile();r.size=f.size;r.modified=f.lastModified}catch{}}next.push(r)}const signature=next.map(x=>x.name+'|'+x.size+'|'+x.modified).sort().join('\n');if(signature!==stamp||force){items=next;stamp=signature;render()}tell('بروزرسانی: '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+(count>2000?' · حداکثر ۲۰۰۰ مورد':''))}catch{tell('خواندن پوشه ناموفق بود؛ مجوز را بررسی کنید')}finally{busy=false;refresh.disabled=false}}
async function openEntry(e){if(e.kind==='directory'){path.push(e.handle);items=[];stamp='';render();await scan(true);return}try{const f=await e.handle.getFile();const url=URL.createObjectURL(f);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),120000)}catch{tell('بازکردن فایل ناموفق بود')}}
search.oninput=render;sort.onchange=render;
(async()=>{try{root=await get()||null;if(dead)return;render();if(root){if(await granted(root))await scan(true);else tell('پوشه قبلی ذخیره شده؛ اتصال مجدد را بزنید')}}catch{tell('بازیابی پوشه قبلی ناموفق بود')}})();
timer=setInterval(()=>{if(dead||!target.isConnected){clearInterval(timer);return}scan(false)},10000);
const onVisible=()=>{if(!document.hidden&&!dead)scan(true)};document.addEventListener('visibilitychange',onVisible);
target.cleanupExplorer=()=>{dead=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)};
}
window.MySpaceFileManager={mount};
})();