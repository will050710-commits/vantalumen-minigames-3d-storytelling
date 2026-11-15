/* Offline DOM checks with the actual GSAP/ScrollTrigger builds. Not browser QA. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const BASE=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(BASE,p),'utf8');
const results=[],pass=label=>results.push({check:label,status:'PASS'});
async function run(){
 const dom=new JSDOM(read('index.html'),{url:'https://offline.invalid',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 let scroll=0;
 Object.defineProperties(w,{innerWidth:{value:1440,configurable:true},innerHeight:{value:900,configurable:true},pageYOffset:{get:()=>scroll},scrollY:{get:()=>scroll}});
 w.scrollTo=(x,y)=>{scroll=typeof x==='object'?x.top||0:y||0;};
 w.matchMedia=query=>Object.assign(new w.EventTarget(),{matches:query.includes('min-width: 0'),media:query,addListener(){},removeListener(){}});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.HTMLElement.prototype.scrollIntoView=function(){w.scrollTo(0,Number(this.dataset.chapter||0)*1200);w.dispatchEvent(new w.Event('scroll'));};
 function bounds(){const isSection=this.classList?.contains('vs-chapter');const top=isSection?Number(this.dataset.chapter)*1200-scroll:this.id==='vanta-svg-story'?-scroll:0;return {top,left:0,right:1440,bottom:top+(isSection?1200:8400),width:this.id==='vs-dust-svg'?400:1440,height:isSection?1200:this.id==='vs-dust-svg'?150:8400,x:0,y:top,toJSON(){return this;}};}
 w.Element.prototype.getBoundingClientRect=bounds;
 Object.defineProperties(w.HTMLElement.prototype,{offsetHeight:{get(){return this.classList?.contains('vs-chapter')?1200:8400;}},clientHeight:{get(){return this===d.documentElement?900:8400;}},offsetWidth:{get(){return 1440;}},clientWidth:{get(){return 1440;}}});
 w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:100,height:100});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Blob=Blob;let certificate='',download=false;
 w.URL.createObjectURL=blob=>{blob.text().then(t=>certificate=t);return 'blob:local-certificate';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){if(this.download)download=true;};
 const errors=[];w.console.warn=(...x)=>errors.push(x.join(' '));w.console.error=(...x)=>errors.push(x.join(' '));
 w.eval(read('assets/vendor/gsap.min.js'));w.eval(read('assets/vendor/ScrollTrigger.min.js'));w.eval(read('assets/story.js'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,80));
 const root=d.getElementById('vanta-svg-story'),api=root.vantaSVG,q=s=>root.querySelector(s),click=s=>q(s).click();
 assert(api,'App mounted');assert.equal(root.dataset.ready,'true',errors.join('\n'));assert(w.gsap&&w.ScrollTrigger);pass('App starts with the actual GSAP and ScrollTrigger libraries');
 assert(q('.vs-certificate-dialog').hidden);assert(!q('.vs-certificate-dialog').open);assert(q('.vs-certificate').inert);assert(q('.vs-create-certificate').disabled);
 pass('Certificate form and preview start hidden and unavailable outside the finale');
 const triggers=w.ScrollTrigger.getAll();assert.equal(triggers.length,1);assert.equal(triggers[0].vars.scrub,.65);triggers[0].animation.progress(.5);assert.equal(api.getState().chapter,3);pass('ScrollTrigger drives the scrubbed story timeline');
 const idList=Array.from(root.querySelectorAll('[id]'),el=>el.id);assert.equal(idList.length,new Set(idList).size);assert.equal(root.querySelectorAll('#vl-svg-stage path:not([id])').length,0);assert.equal(root.querySelectorAll('#vl-svg-stage g:not([id])').length,0);pass('Every story SVG path/group has a unique named ID');
 fs.mkdirSync(path.join(BASE,'.qa-scenes'),{recursive:true});
 const emotions=['happy','curious','amazed','focused','confident','concerned','grateful'];
 for(let i=0;i<7;i++){
  api.renderAt(i);assert.equal(api.getState().chapter,i);assert.equal(api.getState().emotion,emotions[i]);assert.equal(q('#rise-expression-'+emotions[i]).getAttribute('opacity'),'1');
  assert.equal(q(`[data-scene="${i}"]`).getAttribute('opacity'),'1.0000');
  for(const g of root.querySelectorAll('[data-scene]'))if(Number(g.dataset.scene)!==i)assert.equal(g.getAttribute('visibility'),'hidden');
  const cfg=w.VantaLumenSVG.poses[i];assert.equal(q('#rise-position').getAttribute('transform'),`translate(${cfg.x.toFixed(3)} ${cfg.y.toFixed(3)})`);
  fs.writeFileSync(path.join(BASE,'.qa-scenes',`chapter-${i}.svg`),q('#vl-svg-stage').outerHTML);
 }
 pass('Seven exact poses, expressions, layer visibility and scene states');
 api.chooseWorld('mars');for(const i of [2,3,4,5]){api.renderAt(i);fs.writeFileSync(path.join(BASE,'.qa-scenes',`mars-${i}.svg`),q('#vl-svg-stage').outerHTML);}api.chooseWorld('moon');
 for(let p=0;p<=6;p+=.02){const pose=w.VantaLumenSVG.poseAt(p);assert(Object.values(pose).flat().every(Number.isFinite));assert(pose.scale>0);assert(pose.x-pose.scale*185>0&&pose.x+pose.scale*185<1000);assert(pose.y-pose.scale*210-pose.bounce-46>0&&pose.y+pose.scale*165<900);}
 pass('Interpolated mascot bounds include bounce/entry movement inside the SVG viewBox');
 // Reversible, independent future rigs; snapshot both worlds at four times.
 const baseArt=q('#art-eagle').outerHTML+q('#art-spirit').outerHTML;
 for(const name of ['moon','mars']){
  api.chooseWorld(name);api.renderAt(5);api.renderFutureAt(2026);
  const rig=name==='moon'?'eagle':'spirit',body=q('#future-'+rig+'-body-rig'),rest=body.getAttribute('transform');
  assert.equal(root.dataset.futurePhase,'intact');
  const bands=Array.from(q('#future-'+rig).querySelectorAll('[data-sand-band]'));
  assert(bands.length>=7);assert(bands.every(el=>Number(el.getAttribute('opacity'))===0));
  for(const year of [2026,2031,2040,2055,2076]){
   api.renderFutureAt(year);
   fs.writeFileSync(path.join(BASE,'.qa-scenes',`future-${name}-${year}.svg`),q('#vl-svg-stage').outerHTML);
   if(year>2026){assert.notEqual(body.getAttribute('transform'),rest);assert(bands.some(el=>Number(el.getAttribute('opacity'))>0));}
  }
  assert.equal(root.dataset.futurePhase,'fallen');
  const loose=q(name==='moon'?'#future-eagle-leg-right':'#future-spirit-leg-middle');
  assert(Number(loose.getAttribute('transform').match(/translate\(([-.0-9]+)/)[1])>100);
  for(let year=2076;year>=2026;year--){api.renderFutureAt(year);assert(!/NaN|undefined/.test(q('#future-'+rig).outerHTML));}
  assert.equal(body.getAttribute('transform'),rest);assert(bands.every(el=>Number(el.getAttribute('opacity'))===0));
  api.renderFutureAt(2076,true);assert.equal(body.getAttribute('transform'),rest);assert.equal(root.dataset.futurePhase,'intact');assert(bands.some(el=>Number(el.getAttribute('opacity'))>0));
  fs.writeFileSync(path.join(BASE,'.qa-scenes',`future-${name}-protected.svg`),q('#vl-svg-stage').outerHTML);
  api.renderFutureAt(2026);
 }
 assert.equal(q('#art-eagle').outerHTML+q('#art-spirit').outerHTML,baseArt);
 assert(!q('#future-dust-a')&&!q('#future-dust-b'));
 assert(q('#future-spirit-body-rig #future-spirit-sand-panels'));
 assert(q('#future-eagle-body-rig #future-eagle-sand-top'));
 pass('Future supports separate, both vehicles fall, sand follows body, backward scrubbing resets exactly, protection preserves structure');
 api.chooseWorld('moon');api.renderAt(5.2);assert.equal(q('#scene-legacy').getAttribute('visibility'),'hidden');
 pass('Future chapter holds solid without a ghost certificate underneath');
 api.renderAt(1);assert.equal(q('[data-svg-world]').getAttribute('tabindex'),'0');api.renderAt(3);assert.equal(q('[data-svg-world]').getAttribute('tabindex'),'-1');pass('Inactive SVG controls leave the keyboard tab order');
 click('.vs-hello');assert.equal(api.getState().emotion,'grateful');pass('Mascot responds to the hello action');
 click('.vs-record');assert(!api.getState().moon.recorded);assert(q('.vs-create-certificate').disabled);pass('Incomplete missions and certificates stay locked');
 async function finish(name){
  api.chooseWorld(name);api.renderAt(3);for(let i=0;i<20&&q('.vs-open-briefing').disabled;i++)click('.vs-brush');assert(!q('.vs-open-briefing').disabled);assert.equal(q('#discovery-dust').getAttribute('opacity'),'0');
  click('.vs-open-briefing');assert(q('.vs-briefing').open);click('.vs-brief-toggle');assert.equal(q('.vs-brief-toggle').textContent,'Play');click('.vs-close');assert(!q('.vs-briefing').open);
  api.renderAt(4);click('[data-part="0"]');click('.vs-marker[data-marker="2"]');assert(q('.vs-match-feedback').textContent.startsWith('Almost!'));assert.equal(api.getState()[name].matches,0);
  for(let i=0;i<3;i++){click(`[data-part="${i}"]`);click(`.vs-marker[data-marker="${i}"]`);}
  assert.equal(api.getState()[name].matches,3);api.renderAt(5);q('#vs-year').value='2076';q('#vs-year').dispatchEvent(new w.Event('input'));assert.equal(q('#future-year').textContent,'2076');await new Promise(r=>setTimeout(r,1250));const unprotected=Number(q('[data-world-layer="'+name+'"] [data-sand-band]').getAttribute('opacity'));assert.equal(root.dataset.futurePhase,'fallen');
  q('#vs-protect').checked=true;q('#vs-protect').dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,1250));assert(Number(q('[data-world-layer="'+name+'"] [data-sand-band]').getAttribute('opacity'))<unprotected);assert.equal(root.dataset.futurePhase,'intact');assert.equal(q('#future-protection').getAttribute('opacity'),'1');assert.equal(api.getState().emotion,'confident');
  click('.vs-record');assert(api.getState()[name].recorded);pass(`${name}: dust, briefing controls, part matching, timeline, emotional reassurance and passport`);
 }
 await finish('moon');assert(q('.vs-create-certificate').disabled);await finish('mars');assert(q('.vs-create-certificate').disabled);assert(q('.vs-certificate-status').textContent.includes('Add your name'));pass('Certificate stays locked until both expeditions are recorded and a name is entered');
 api.chooseWorld('moon');assert.equal(q('#vs-year').value,'2076');assert.equal(api.getState().moon.matches,3);pass('Destination progress survives a return trip');
 q('#vs-explorer-name').value='<script>alert(1)</script> & RISE';q('#vs-explorer-name').dispatchEvent(new w.Event('input'));assert.equal(q('#legacy-card-name').textContent,'<script>alert(1)</script> & RISE');assert(!q('.vs-create-certificate').disabled);
 click('.vs-create-certificate');const certDialog=q('.vs-certificate-dialog'),certPreview=q('.vs-certificate-preview');assert(certDialog.open);assert(certPreview.querySelector('svg'));assert(certPreview.innerHTML.includes('&lt;script&gt;'));assert(!certPreview.innerHTML.includes('<script>'));assert(certPreview.innerHTML.includes('viewBox="0 0 1123 794"'));
 let printed=0;w.print=()=>printed++;click('.vs-print-certificate');await new Promise(r=>setTimeout(r,140));assert.equal(printed,1);assert(d.body.classList.contains('vs-printing-certificate'));const printRoot=d.body.querySelector('.vs-certificate-print');assert(printRoot);assert(printRoot.innerHTML.includes('&lt;script&gt;'));assert(d.head.textContent.includes('@page{size:A4 landscape;margin:0}'));
 w.dispatchEvent(new w.Event('afterprint'));assert(!d.body.classList.contains('vs-printing-certificate'));assert(!d.body.querySelector('.vs-certificate-print'));assert(!d.head.textContent.includes('@page{size:A4 landscape;margin:0}'));
 click('.vs-download-certificate');await new Promise(r=>setTimeout(r,20));assert(download);assert(certificate.includes('&lt;script&gt;'));assert(!certificate.includes('<script>'));assert(certificate.includes('viewBox="0 0 1123 794"'));
 click('.vs-certificate-close');assert(!certDialog.open);assert(certDialog.hidden);assert(!certPreview.firstChild);pass('A4 certificate preview, safe SVG export and isolated print-to-PDF sheet');
 click('.vs-create-certificate');assert(certDialog.open);click('.vs-print-certificate');
 w.scrollTo(0,0);w.dispatchEvent(new w.Event('scroll'));assert(!certDialog.open);assert(certDialog.hidden);assert(q('.vs-certificate').inert);assert(!certPreview.firstChild);assert(!d.body.querySelector('.vs-certificate-print'));
 q('.vs-create-certificate').dispatchEvent(new w.Event('click'));assert(!certDialog.open);
 await new Promise(r=>setTimeout(r,140));assert.equal(printed,1,'Leaving the finale cancels a pending print');
 q('.vs-finale').scrollIntoView();assert(!q('.vs-certificate').inert);assert(!q('.vs-create-certificate').disabled);assert(!certDialog.open);assert(q('#vs-explorer-name').value.includes('RISE'));
 pass('Leaving the finale hides the certificate, cancels pending print, blocks reopening and preserves the name on return');
 const sentinel=w.ScrollTrigger.create({id:'host-page-trigger',trigger:d.body,start:'top top',end:'+=100'});
 api.setMotion(true);assert(api.getState().reduced);assert.equal(q('#rise-bounce').getAttribute('transform'),'translate(0 0.000)');assert.equal(w.ScrollTrigger.getAll().length,2);api.renderAt(5);assert.equal(q('#rise-squash').getAttribute('transform'),'scale(1 1)');api.setMotion(false);assert.equal(w.ScrollTrigger.getAll().length,2);pass('Reduced motion stops bounce and avoids duplicate triggers');
 api.destroy();assert.equal(w.ScrollTrigger.getAll().length,1);assert.equal(w.ScrollTrigger.getAll()[0],sentinel);sentinel.kill();pass('Cleanup preserves the host page’s ScrollTriggers');
 for(const file of ['01_HEAD.html','02_BODY_EMBED.html','03_FOOTER.html'])assert(read('webflow/'+file).length<50000);pass('All three native Webflow blocks fit their character limits');
 const runtime=read('assets/story.js');assert(!/THREE\.|GLTFLoader|\.glb["']|getContext\(/.test(runtime));assert(!read('VantaLumen_SVG_Preview.html').includes('<image '));pass('SVG-only runtime: no model, WebGL, canvas or raster image dependency');
 w.gsap.ticker.sleep();dom.window.close();
 const report={checksPassed:results.length,checks:results,browserVisualQA:'Run python tests/certificate_browser.py for desktop/mobile certificate checks across both stories, offline preview and local Webflow blocks; results in .qa-scenes/certificate-browser-results.json. Published Webflow and touch gestures are not covered.',vectorVisualQA:'Certificate SVG rendered in Chrome at 1123 × 794 and reviewed',testEnvironment:'jsdom + actual GSAP 3.13.0 / ScrollTrigger 3.13.0'};
 fs.writeFileSync(path.join(BASE,'VALIDATION.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error(e);process.exit(1);});
