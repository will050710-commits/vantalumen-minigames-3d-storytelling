/* VantaLumen SVG Story · GSAP + ScrollTrigger · no WebGL, canvas or model loading.
   One root per page. Keep IDs stable; see LAYER_MAP.md for transform ownership. */
(function(){
  'use strict';
  const ROOT_ID='vanta-svg-story';
  const SCENES=[
    {id:'origin',emotion:'happy',x:500,y:435,scale:1.22,tilt:-7,bounce:19,speech:[377,174],line:'Hey, explorer!',wash:'#e7eddf'},
    {id:'worlds',emotion:'curious',x:500,y:670,scale:.61,tilt:11,bounce:12,speech:[380,161],line:'Which world calls to you?',wash:'#e5ecdf'},
    {id:'landing',emotion:'amazed',x:246,y:418,scale:.72,tilt:-9,bounce:16,speech:[126,204],line:'We’re really here!',wash:'#e2e9d8'},
    {id:'discovery',emotion:'focused',x:778,y:402,scale:.66,tilt:-12,bounce:7,speech:[653,204],line:'There’s a story in here…',wash:'#eee8d4'},
    {id:'inspection',emotion:'confident',x:241,y:333,scale:.58,tilt:6,bounce:10,speech:[122,150],line:'Every little part matters.',wash:'#e1eddf'},
    {id:'future',emotion:'concerned',x:783,y:386,scale:.64,tilt:8,bounce:4,speech:[653,193],line:'What will we leave behind?',wash:'#e8e8d2'},
    {id:'legacy',emotion:'grateful',x:500,y:364,scale:.83,tilt:-3,bounce:17,speech:[380,135],line:'You’re part of this story.',wash:'#233f46'}
  ];
  const WORLDS={
    moon:{name:'the Moon',heading:'The silence<br>says <em>so much.</em>',location:'Tranquility Base',date:'20 July 1969',quote:'Welcome to the lunar surface. Here, in the quiet void, we examine humanity’s first steps.',copy:'Eagle’s descent stage remains where humans first landed on the Moon. It is a machine, and a memory.',relic:'Eagle’s descent stage',short:'EAGLE',parts:['Landing footpad','Descent engine','Descent-stage structure'],markers:[[355,609],[542,570],[534,420]],contribution:['The footpads spread the landing load across the lunar surface.','The descent engine controlled the approach to the surface.','The descent stage supported the landing and became a platform for the ascent stage.'],briefing:['20 July 1969. Eagle touches down at Tranquility Base. For the first time, humans have landed on another world.','The ascent stage carries the crew back to lunar orbit. The descent stage stays behind, preserving a physical connection to that first landing.','A quiet machine holds an extraordinary story. Documenting its context helps future explorers understand what happened here.']},
    mars:{name:'Mars',heading:'A brave heart.<br>A <em>red horizon.</em>',location:'Gusev Crater',date:'4 January 2004 · UTC',quote:'You have entered the red horizon of Mars. Here, robotic pioneers braved fierce dust storms.',copy:'Spirit crossed the rocks and soil of Gusev Crater, looking for clues to water in Mars’ past. Its tracks became a scientific journey.',relic:'the Spirit rover',short:'SPIRIT',parts:['Solar array','Camera mast','Rover wheel'],markers:[[453,442],[551,299],[401,610]],contribution:['The solar array converted sunlight into electrical power.','Mast-mounted cameras surveyed the terrain and helped scientists choose the next destination.','Six wheels carried Spirit across the landscape to investigate rocks and soil.'],briefing:['4 January 2004, UTC. Spirit arrives at Gusev Crater, beginning a robotic exploration of Mars.','Cameras, wheels and a robotic arm work together. Spirit studies rocks and soil for clues to ancient water.','The rover’s discoveries become part of humanity’s shared story. That legacy asks future explorers to tread with care.']}
  };
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  const mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
  function poseAt(progress){const p=clamp(progress,0,6),i=Math.min(5,Math.floor(p)),t=smooth(p-i),a=SCENES[i],b=SCENES[i+1],out={};for(const k of ['x','y','scale','tilt','bounce'])out[k]=mix(a[k],b[k],t);out.speech=a.speech.map((n,j)=>mix(n,b.speech[j],t));return out;}
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;const timer=setTimeout(()=>reject(Error('Script timed out')),15000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(Error('Script unavailable'));};document.head.append(s);});}
  async function dependencies(){
    if(!window.gsap)await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js');
    if(!window.ScrollTrigger)await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js');
    if(!window.gsap||!window.ScrollTrigger)throw Error('Animation dependencies unavailable');
    window.gsap.registerPlugin(window.ScrollTrigger);return {gsap:window.gsap,ScrollTrigger:window.ScrollTrigger};
  }
  function mount(root){
    if(!root||root.vantaSVG)return root?.vantaSVG;
    const $=selector=>root.querySelector(selector),$$=selector=>Array.from(root.querySelectorAll(selector));
    const abort=new AbortController(),signal=abort.signal;
    const on=(element,event,fn,opts={})=>element.addEventListener(event,fn,{...opts,signal});
    const blank=()=>({cleared:new Set(),matches:new Set(),year:2026,protected:false,timeline:false,recorded:false});
    const journey={world:'moon',moon:blank(),mars:blank(),selected:null};
    const state=()=>journey[journey.world],world=()=>WORLDS[journey.world];
    const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    let manualPause=false,reduced=motionQuery.matches,alive=true,visible=true,active=-1,progress=0,anchors=[];
    let gsap=null,ScrollTrigger=null,master=null,mainTrigger=null,idle=null,entryTween=null,reactionTween=null,expressionTweens=[],blink=null,resizeTimer=null,futureTween=null;
    const futureView={damage:0,sand:0};
    const sandBands=$$('[data-sand-band]');
    let temporaryEmotion=null;const playhead={value:0},idleState={phase:0},entry={y:0},reaction={y:0};
    let currentPose=poseAt(0),currentMood='happy',faceBlink=false;
    const sectionNodes=$$('.vs-chapter');
    const txt=(selector,value)=>$$(selector).forEach(el=>{el.textContent=value;});
    const attr=(selector,key,value)=>{const el=$(selector);if(el)el.setAttribute(key,String(value));};
    function required(s){return s.cleared.size>=24&&s.matches.size===3&&s.timeline;}
    function complete(){return journey.moon.recorded&&journey.mars.recorded;}
    function moodFor(chapter){return chapter===5&&state().protected?'confident':SCENES[chapter].emotion;}
    function refreshFace(animate=true){
      const next=temporaryEmotion||moodFor(Math.max(0,active));
      if(next===currentMood&&root.dataset.emotion&&animate)return;
      currentMood=next;root.dataset.emotion=next;
      expressionTweens.forEach(t=>t.kill());expressionTweens=[];
      $$('[data-emotion]').forEach(g=>{const opacity=g.dataset.emotion===next?1:0;if(gsap&&animate&&!reduced)expressionTweens.push(gsap.to(g,{attr:{opacity},duration:.15,overwrite:true}));else g.setAttribute('opacity',String(opacity));});
      txt('.vs-emotion-label','RISE IS FEELING '+next.toUpperCase());
    }
    function setBlink(value){faceBlink=value;$$('.rise-eye-pair').forEach(g=>g.setAttribute('opacity',value?'0':'1'));attr('#rise-blink','opacity',value?1:0);}
    function applyBounce(){
      const jump=reduced?0:(1-Math.cos(idleState.phase))*.5;
      const y=-jump*currentPose.bounce+entry.y+reaction.y;
      attr('#rise-bounce','transform',`translate(0 ${y.toFixed(3)})`);
      const squash=reduced?0:.018*(1-jump);
      attr('#rise-squash','transform',`scale(${1+squash} ${1-squash})`);
      attr('#rise-shadow','rx',currentPose.scale*(112-jump*17));attr('#rise-shadow','opacity',.15-jump*.035);
    }
    function pauseLoops(){const shouldPause=reduced||!visible||document.hidden;for(const tween of [idle,blink])if(tween){if(shouldPause)tween.pause();else tween.resume();}if(shouldPause)setBlink(false);}
    function react(emotion='grateful'){
      temporaryEmotion=emotion;refreshFace();reactionTween?.kill();
      if(!gsap||reduced){reaction.y=0;applyBounce();return;}
      reactionTween=gsap.timeline({onComplete:()=>{temporaryEmotion=null;refreshFace();}}).to(reaction,{y:-24,duration:.2,ease:'power2.out',onUpdate:applyBounce}).to(reaction,{y:0,duration:.65,ease:'bounce.out',onUpdate:applyBounce}).to({},{duration:.5});
    }
    function chapterChanged(chapter){
      if(chapter===active)return;active=chapter;temporaryEmotion=null;journey.selected=null;refreshFace();
      const cfg=SCENES[active];txt('#rise-speech-text',active===5&&state().protected?'We can care for this.':cfg.line);
      txt('.vs-scene-count',String(active+1).padStart(2,'0')+' / 07');
      $$('.vs-nav a').forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
      $$('[data-scene]').forEach(g=>{const isActive=Number(g.dataset.scene)===active;g.setAttribute('aria-hidden',String(!isActive));g.querySelectorAll('[role="button"]').forEach(b=>b.setAttribute('tabindex',isActive?'0':'-1'));});
      $$('.vs-part').forEach(b=>b.setAttribute('aria-pressed','false'));
      entryTween?.kill();entry.y=0;
      if(gsap&&!reduced&&visible&&!document.hidden){entry.y=-22;entryTween=gsap.to(entry,{y:0,duration:.75,ease:'bounce.out',onUpdate:applyBounce});}
      updateEnvironment();
    }
    function paintScene(p){
      progress=clamp(p,0,6);chapterChanged(Math.round(progress));
      const rendered=reduced?Math.round(progress):progress;currentPose=poseAt(rendered);
      attr('#rise-position','transform',`translate(${currentPose.x.toFixed(3)} ${currentPose.y.toFixed(3)})`);
      attr('#rise-scale','transform',`scale(${currentPose.scale.toFixed(5)})`);
      attr('#rise-tilt','transform',`rotate(${currentPose.tilt.toFixed(3)})`);
      attr('#rise-speech','transform',`translate(${currentPose.speech[0].toFixed(3)} ${currentPose.speech[1].toFixed(3)})`);
      attr('#rise-shadow','cx',currentPose.x);attr('#rise-shadow','cy',currentPose.y+currentPose.scale*147+25);
      $$('[data-scene]').forEach(g=>{const sceneIndex=Number(g.dataset.scene),opacity=1-smooth(clamp((Math.abs(rendered-sceneIndex)-.32)/.36));g.setAttribute('opacity',opacity.toFixed(4));g.setAttribute('visibility',opacity>.001?'visible':'hidden');g.setAttribute('transform',`translate(0 ${reduced?0:(sceneIndex-rendered)*26})`);});
      attr('#background-wash','fill',active===2&&journey.world==='mars'?'#f0dfca':SCENES[active].wash);
      attr('#background-orbit','stroke',active===6?'#a6b797':'#c8d1c3');
      attr('#inspection-scan-beam','transform',`translate(0 ${Math.sin(progress*Math.PI)*80+80})`);
      attr('#origin-orbits','transform',`rotate(${reduced?0:progress*9} 500 455)`);
      attr('#origin-flight-trail','stroke-dashoffset',reduced?0:-progress*.07);
      $('.vs-progress span').style.width=(progress/6*100)+'%';applyBounce();
    }
    function measure(){const top=root.getBoundingClientRect().top;anchors=sectionNodes.map(s=>s.getBoundingClientRect().top-top);refreshCertificateVisibility();}
    function fromRatio(ratio){const y=ratio*(anchors[6]||1);let i=0;while(i<5&&y>anchors[i+1])i++;return clamp(i+(y-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]),0,6);}
    function syncFallback(){if(gsap||!alive)return;measure();paintScene(fromRatio(clamp(-root.getBoundingClientRect().top/Math.max(1,anchors[6]))));}
    function buildAnimation(){
      master?.kill();mainTrigger?.kill();idle?.kill();blink?.kill();entryTween?.kill();reactionTween?.kill();
      master=null;mainTrigger=null;entry.y=0;reaction.y=0;idleState.phase=0;setBlink(false);measure();
      if(!gsap){paintScene(progress);return;}
      if(reduced){mainTrigger=ScrollTrigger.create({trigger:root,start:'top top',end:()=>'+='+Math.max(1,anchors[6]),onRefreshInit:measure,onUpdate:self=>paintScene(fromRatio(self.progress)),onRefresh:self=>paintScene(fromRatio(self.progress))});}
      else{
        playhead.value=0;
        master=gsap.timeline({scrollTrigger:{trigger:root,start:'top top',end:()=>'+='+Math.max(1,anchors[6]),scrub:.65,invalidateOnRefresh:true,onRefreshInit:measure},onUpdate:()=>paintScene(fromRatio(playhead.value))});
        master.to(playhead,{value:1,duration:1,ease:'none'});mainTrigger=master.scrollTrigger;
        idle=gsap.to(idleState,{phase:Math.PI*2,duration:2.6,repeat:-1,ease:'none',onUpdate:applyBounce});
        const blinkClock={v:0};blink=gsap.timeline({repeat:-1,repeatDelay:4.8}).to(blinkClock,{v:1,duration:.11,onStart:()=>setBlink(true)}).to(blinkClock,{v:0,duration:.09,onComplete:()=>setBlink(false)});
      }
      mainTrigger.refresh();pauseLoops();
    }
    function setMotion(value){manualPause=value;reduced=manualPause||motionQuery.matches;root.dataset.reduced=String(reduced);$('.vs-motion').setAttribute('aria-pressed',String(reduced));$('.vs-motion').textContent=reduced?'Motion paused ▷':'Pause motion Ⅱ';temporaryEmotion=null;buildAnimation();updateEnvironment();refreshFace(false);}
    on($('.vs-motion'),'click',()=>{if(motionQuery.matches&&!manualPause){txt('.vs-runtime-status','Reduced motion follows your system setting.');return;}setMotion(!manualPause);});
    on(motionQuery,'change',()=>setMotion(manualPause));
    function go(i){sectionNodes[i].scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});const h=sectionNodes[i].querySelector('h1,h2');h.tabIndex=-1;h.focus({preventScroll:true});}
    $$('a[href^="#vs-chapter-"]').forEach(a=>on(a,'click',e=>{const target=$(a.getAttribute('href'));if(target){e.preventDefault();go(Number(target.dataset.chapter));}}));
    on($('.vs-hello'),'click',()=>react('grateful'));on($('.vs-return'),'click',()=>go(1));
    const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!alive)return;measure();mainTrigger?.refresh();},120);});resizeObserver.observe(root);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;pauseLoops();},{rootMargin:'0px'});intersection.observe(root);
    on(document,'visibilitychange',pauseLoops);on(window,'scroll',syncFallback,{passive:true});

    function chooseWorld(name,travel=false){
      if(!WORLDS[name])return;journey.world=name;journey.selected=null;temporaryEmotion=null;root.dataset.world=name;
      const w=world();$$('[data-select-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.selectWorld===name)));
      $$('[data-world-layer]').forEach(g=>{g.setAttribute('display',g.dataset.worldLayer===name?'inline':'none');});
      txt('.vs-world-name',w.name);$('.vs-landing-heading').innerHTML=w.heading;txt('.vs-landing-quote','“'+w.quote+'”');txt('.vs-location',w.location);txt('.vs-arrival',w.date);txt('.vs-landing-copy',w.copy);txt('.vs-relic-name',w.relic);txt('#dust-ui-heading',w.short);
      txt('.vs-next-world','Next stop: '+(name==='moon'?'Mars':'the Moon')+' →');
      $('#vs-year').value=String(state().year);$('#vs-protect').checked=state().protected;txt('.vs-year-output',state().year);
      world().markers.forEach((point,i)=>attr('#inspection-marker-'+i,'transform',`translate(${point.join(' ')})`));
      buildParts();paintDust();updateEnvironment();updateCompletion();paintScene(progress);refreshFace(false);if(travel)go(2);
    }
    $$('[data-select-world]').forEach(b=>on(b,'click',()=>{chooseWorld(b.dataset.selectWorld);react('curious');}));
    function svgAction(g,fn){on(g,'click',fn);on(g,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
    $$('[data-svg-world]').forEach(g=>svgAction(g,()=>{chooseWorld(g.dataset.svgWorld);react('curious');}));
    on($('.vs-next-world'),'click',()=>chooseWorld(journey.world==='moon'?'mars':'moon',true));

    // Native SVG dust tiles: no raster canvas and no external media.
    const NS='http://www.w3.org/2000/svg',dustSVG=$('#vs-dust-svg'),tileGroup=$('#dust-ui-tiles');
    for(let i=0;i<40;i++){const rect=document.createElementNS(NS,'rect');rect.id='dust-tile-'+String(i).padStart(2,'0');rect.setAttribute('x',String((i%10)*40));rect.setAttribute('y',String(Math.floor(i/10)*37.5));rect.setAttribute('width','40.5');rect.setAttribute('height','38');rect.setAttribute('fill',i%3===0?'#b6aa8f':i%3===1?'#afa287':'#bcb094');tileGroup.append(rect);}
    function paintDust(){
      const s=state(),done=s.cleared.size>=24;
      for(let i=0;i<40;i++)attr('#dust-tile-'+String(i).padStart(2,'0'),'opacity',done||s.cleared.has(i)?0:1);
      txt('.vs-dust-count',Math.min(100,Math.round(s.cleared.size/24*100))+'% revealed');$('.vs-dust-hint').hidden=s.cleared.size>0;$('.vs-open-briefing').disabled=!done;
      attr('#discovery-dust','opacity',done?0:.85*(1-s.cleared.size/24));txt('#discovery-clean-label',done?'ARCHIVE RECOVERED / A STORY REMEMBERED':'A STORY WAITING TO BE FOUND');
      updateCompletion();
    }
    function brushAt(x,y){
      const was=state().cleared.size>=24;
      for(let r=0;r<4;r++)for(let c=0;c<10;c++)if(Math.hypot(c+.5-x*10,(r+.5-y*4))<1.45)state().cleared.add(r*10+c);
      paintDust();if(!was&&state().cleared.size>=24)react('amazed');
    }
    let brushing=false;const brushEvent=e=>{const b=dustSVG.getBoundingClientRect();brushAt(clamp((e.clientX-b.left)/b.width),clamp((e.clientY-b.top)/b.height));};
    on(dustSVG,'pointerdown',e=>{brushing=true;brushEvent(e);dustSVG.setPointerCapture?.(e.pointerId);});on(dustSVG,'pointermove',e=>{if(brushing)brushEvent(e);});on(dustSVG,'pointerup',()=>brushing=false);on(dustSVG,'pointercancel',()=>brushing=false);
    on($('.vs-brush'),'click',()=>{const n=Array.from({length:40},(_,i)=>i).find(i=>!state().cleared.has(i));if(n!==undefined)brushAt((n%10+.5)/10,(Math.floor(n/10)+.5)/4);});
    function buildParts(){
      $('.vs-parts').replaceChildren();$('.vs-marker-buttons').replaceChildren();
      [2,0,1].forEach(i=>{const b=document.createElement('button');b.type='button';b.className='vs-part';b.dataset.part=String(i);b.textContent=world().parts[i];b.setAttribute('aria-pressed','false');b.dataset.matched=String(state().matches.has(i));on(b,'click',()=>{journey.selected=i;$$('.vs-part').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.part)===i)));txt('.vs-match-feedback','Find “'+world().parts[i]+'” in the illustration.');});$('.vs-parts').append(b);});
      [0,1,2].forEach(i=>{const b=document.createElement('button');b.type='button';b.className='vs-marker';b.dataset.marker=String(i);b.textContent=String(i+1);b.setAttribute('aria-label','Match marker '+(i+1));b.dataset.matched=String(state().matches.has(i));on(b,'click',()=>matchPart(i));$('.vs-marker-buttons').append(b);attr('#inspection-marker-disc-'+i,'fill',state().matches.has(i)?'#a8cfad':'#fffdf3');});
      txt('.vs-match-feedback',state().matches.size===3?'All three parts remembered. On to the next fifty years.':'Choose a component to begin.');
    }
    function matchPart(i){
      if(journey.selected===null){txt('.vs-match-feedback','Choose a component name first.');return;}
      if(journey.selected!==i){txt('.vs-match-feedback','Almost! Look at the illustration and try a different marker.');react('curious');return;}
      state().matches.add(i);journey.selected=null;$$('.vs-part').forEach(b=>b.setAttribute('aria-pressed','false'));$$(`[data-part="${i}"],[data-marker="${i}"]`).forEach(b=>b.dataset.matched='true');attr('#inspection-marker-disc-'+i,'fill','#a8cfad');txt('.vs-match-feedback','Exactly! '+world().contribution[i]);updateCompletion();react('confident');
    }
    $$('[data-svg-part]').forEach(g=>svgAction(g,()=>matchPart(Number(g.dataset.svgPart))));
    // Reversible future choreography. Geometry is a pure function of time;
    // GSAP eases the playhead, never accumulates transforms on the SVG parts.
    const phase=(start,end,p)=>smooth(clamp((p-start)/(end-start)));
    function paintFuture(){
      const p=clamp(futureView.damage),sand=clamp(futureView.sand);
      const first=phase(.02,.34,p),second=phase(.18,.53,p),fall=phase(.12,.72,p);
      const impact=phase(.68,1,p),settle=Math.sin(impact*Math.PI*3)*(1-impact)*3;
      const rattle=Math.sin(p*66)*phase(0,.08,p)*(1-phase(.18,.45,p))*1.6;
      const move=(id,x,y,angle,cx=0,cy=0)=>attr('#'+id,'transform',`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${angle.toFixed(3)} ${cx} ${cy})`);
      move('future-eagle-body-rig',30*fall,6*fall+settle,48*fall+rattle+settle*.35,-90,100);
      move('future-eagle-leg-right',153*first,38*first,-76*first,142,104);
      move('future-eagle-leg-left',-68*second,29*second,67*second,-158,99);
      move('future-spirit-body-rig',32*fall,-27*fall+settle,37*fall+rattle+settle*.35,-130,110);
      move('future-spirit-leg-back',105*phase(.02,.32,p),77*phase(.02,.32,p),-95*phase(.02,.32,p),108,43);
      move('future-spirit-leg-middle',145*first,68*first,72*first,133,79);
      move('future-spirit-leg-front',100*second,62*second,113*second,57,112);
      $$('[data-future-cracks]').forEach(el=>el.setAttribute('opacity',phase(0,.12,p).toFixed(4)));
      $$('[data-future-break]').forEach(el=>el.setAttribute('opacity',(el.dataset.futureBreak==='left'?second:first).toFixed(4)));
      sandBands.forEach(el=>{const layer=Number(el.dataset.sandBand);el.setAttribute('opacity',(.94*phase(.005+layer*.09,.48+layer*.13,sand)).toFixed(4));});
      attr('#future-contact-shadow','cx',510+45*fall);attr('#future-contact-shadow','rx',145+40*fall);attr('#future-contact-shadow','opacity',.13+.09*fall);
      const label=p<.02?'intact':p<.18?'joints weakening':p<.53?'supports separating':p<.72?'losing balance':'fallen';
      root.dataset.futurePhase=label;
      if(active===5)txt('#rise-speech-text',state().protected?'We can care for this.':p<.18?'What will we leave behind?':p<.72?'The supports are failing.':'Time leaves its traces.');
    }
    function updateEnvironment(animate=false){
      const s=state(),years=clamp((s.year-2026)/50);
      // A protected site retains its structure in this illustrative comparison.
      const target={damage:s.protected?0:years,sand:years*(s.protected?.16:1)};
      txt('#future-year',s.year);attr('#future-protection','opacity',s.protected?1:0);attr('#future-site-base','fill',journey.world==='moon'?'#d2d8c1':'#d8ad86');
      attr('#vs-year','aria-valuetext',`${s.year}, ${s.protected?'protected site':years===0?'intact':years<.18?'joints weakening':years<.72?'supports separating and vehicle tilting':'vehicle fallen'}, ${years===0?'no':'accumulating'} surface sand`);
      futureTween?.kill();futureTween=null;
      if(animate&&gsap&&!reduced){
        futureTween=gsap.to(futureView,{...target,duration:.22+Math.abs(futureView.damage-target.damage)*.85,ease:'none',onUpdate:paintFuture});
      }else{Object.assign(futureView,target);paintFuture();}
      if(active===5)refreshFace();
    }
    on($('#vs-year'),'input',e=>{state().year=Number(e.target.value);if(state().year>2026)state().timeline=true;txt('.vs-year-output',state().year);updateEnvironment(true);updateCompletion();});
    on($('#vs-protect'),'change',e=>{state().protected=e.target.checked;temporaryEmotion=null;updateEnvironment(true);if(state().protected)react('confident');});
    const nameInput=$('#vs-explorer-name'),createCertificate=$('.vs-create-certificate'),certificateDialog=$('.vs-certificate-dialog'),certificatePreview=$('.vs-certificate-preview'),printButton=$('.vs-print-certificate');
    const certificateForm=$('.vs-certificate'),certificateSection=certificateForm.closest('.vs-chapter');
    let certificateVisible=false;
    function refreshCertificateVisibility(){
      const bounds=certificateSection.getBoundingClientRect();
      // Scroll positions round to pixels; ignore a fractional sliver at chapter boundaries.
      certificateVisible=bounds.top<window.innerHeight-1&&bounds.bottom>1;
      root.dataset.certificateActive=String(certificateVisible);
      certificateForm.inert=!certificateVisible;
      certificateForm.setAttribute('aria-hidden',String(!certificateVisible));
      createCertificate.disabled=!certificateVisible||!complete()||!cleanName();
      if(!certificateVisible&&certificateDialog.open)closeCertificate();
      return certificateVisible;
    }
    function closeCertificate(){
      certificateDialog.hidden=true;
      if(certificateDialog.open)certificateDialog.close();
      certificatePreview.replaceChildren();cleanupPrint();
    }
    on(window,'scroll',refreshCertificateVisibility,{passive:true});
    on(window,'resize',refreshCertificateVisibility);
    let printRoot=null,printStyle=null,printTimer=null,printLaunch=null;
    const xmlEscape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    const cleanName=()=>nameInput.value.replace(/\s+/g,' ').trim().slice(0,60);
    function certificateSVG(name){
      const safe=xmlEscape(name),date=new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'}),dateSafe=xmlEscape(date);
      let hash=0;for(const ch of name+date)hash=(hash*31+ch.codePointAt(0))>>>0;
      const serial='VL-'+String(hash).padStart(6,'0').slice(-6);
      const nameSize=Math.max(22,Math.min(56,Math.floor(1500/Math.max(1,name.length))));
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794" role="img" aria-label="VantaLumen Interplanetary Heritage Certificate">
<title>VantaLumen Interplanetary Heritage Certificate for ${safe}</title>
<rect width="1123" height="794" fill="#f6f3e9"/>
<rect x="26" y="26" width="1071" height="742" rx="10" fill="none" stroke="#96af95" stroke-width="1.5"/>
<rect x="38" y="38" width="1047" height="718" rx="6" fill="none" stroke="#c5b577" stroke-width="1" stroke-opacity=".72"/>
<g fill="none" stroke="#b9c9b8" stroke-width="1"><path d="M26 86V26h60M1037 26h60v60M1097 708v60h-60M86 768H26v-60"/></g>
<g fill="#d8b45e"><path d="M86 86l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1zM1037 86l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1zM86 708l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1zM1037 708l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1z"/></g>
<text x="90" y="72" font-family="monospace" font-size="10" letter-spacing="2" fill="#7c8c72">NO. ${serial}</text>
<text x="1033" y="72" text-anchor="end" font-family="monospace" font-size="10" letter-spacing="2" fill="#7c8c72">${dateSafe.toUpperCase()}</text>
<circle cx="561.5" cy="126" r="46" fill="#e5eddb"/>
<path d="M561.5 90l9 27 28 1-23 17 9 28-23-17-23 17 9-28-23-17 28-1z" fill="#d8b45e"/>
<text x="561.5" y="203" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="6" fill="#73876c">VANTALUMEN</text>
<text x="561.5" y="257" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#233d47">Interplanetary Heritage Certificate</text>
<text x="561.5" y="302" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="17" fill="#73876c">This certifies that</text>
<text x="561.5" y="382" text-anchor="middle" font-family="Georgia,serif" font-size="${nameSize}" fill="#276ec4">${safe}</text>
<path d="M311 408H812" stroke="#c5b577" stroke-width="1"/>
<g text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#233d47"><text x="561.5" y="456">has explored the Moon and Mars with RISE,</text><text x="561.5" y="484">and now carries their stories as a guardian of our cosmic legacy.</text></g>
<g text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="2" fill="#688777"><rect x="437" y="515" width="112" height="30" rx="15" fill="none" stroke="#a7ba9e" stroke-dasharray="3 3"/><text x="493" y="535">○ MOON</text><rect x="574" y="515" width="112" height="30" rx="15" fill="none" stroke="#a7ba9e" stroke-dasharray="3 3"/><text x="630" y="535">○ MARS</text></g>
<line x1="565" y1="646" x2="835" y2="646" stroke="#b9c9b8"/>
<text x="700" y="669" text-anchor="middle" font-family="monospace" font-size="9" letter-spacing="2" fill="#688777">VANTALUMEN EDUCATION</text>
<text x="700" y="690" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#73876c">A guardian of our cosmic story.</text>
<circle cx="935" cy="633" r="56" fill="#e5eddb" stroke="#c5b577" stroke-width="1.5"/>
<circle cx="935" cy="633" r="46" fill="none" stroke="#8ca78d" stroke-dasharray="2 3"/>
<path d="M935 602l6 17 18 1-15 11 6 18-15-11-15 11 6-18-15-11 18-1z" fill="#d8b45e"/>
<text x="935" y="657" text-anchor="middle" font-family="monospace" font-size="8" letter-spacing="2" fill="#688777">RISE · 2026</text>
<text x="561.5" y="724" text-anchor="middle" font-family="monospace" font-size="10" letter-spacing="1.5" fill="#7c8c72">${dateSafe} · TWO WORLDS. ONE SHARED LEGACY.</text>
<text x="561.5" y="749" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#8b987e">Educational completion certificate issued by VantaLumen · Not a NASA-endorsed credential.</text>
</svg>`;
    }
    function refreshCertificate(){
      const name=cleanName();
      txt('#legacy-card-name',name||'Your name among the stars');
      attr('#legacy-card-name','font-size',Math.max(11,Math.min(24,Math.floor(700/Math.max(1,name.length)))));
      refreshCertificateVisibility();
      txt('.vs-certificate-status',!complete()?'Complete both worlds to unlock your certificate.':!name?'Add your name to create your certificate.':'Your A4 certificate is ready to preview and save as a PDF.');
    }
    function updateCompletion(){
      const s=state(),todo=[];if(s.cleared.size<24)todo.push('uncover the relic');if(s.matches.size<3)todo.push('match '+(3-s.matches.size)+' more parts');if(!s.timeline)todo.push('move the timeline');
      txt('.vs-record-status',s.recorded?'This world is in your explorer’s passport.':todo.length?'Still to discover: '+todo.join(', ')+'.':'Ready to add this world to your passport.');
      txt('.vs-record',s.recorded?'World remembered ✓':'Add this world to my passport ✓');
      for(const name of ['moon','mars']){const badge=$('.vs-'+name+'-stamp');badge.textContent=(journey[name].recorded?'✓ ':'○ ')+name.toUpperCase();badge.dataset.complete=String(journey[name].recorded);}
      refreshCertificate();
    }
    on($('.vs-record'),'click',()=>{if(!required(state())){updateCompletion();react('curious');return;}state().recorded=true;updateCompletion();react('grateful');if(complete())go(6);});
    on(nameInput,'input',refreshCertificate);
    on(createCertificate,'click',()=>{
      if(!refreshCertificateVisibility()||!complete())return;
      const name=cleanName();
      if(!name){nameInput.focus();refreshCertificate();return;}
      certificatePreview.innerHTML=certificateSVG(name);
      certificatePreview.setAttribute('aria-label','Certificate preview');
      certificateDialog.hidden=false;
      certificateDialog.showModal();printButton.focus();react('grateful');
    });
    on($('.vs-certificate-close'),'click',closeCertificate);
    on(certificateDialog,'close',()=>{
      if(certificateDialog.open)return;
      closeCertificate();
      if(certificateVisible)createCertificate.focus({preventScroll:true});
    });
    on($('.vs-download-certificate'),'click',()=>{
      if(!certificateDialog.open||!refreshCertificateVisibility())return;
      const svg=certificateSVG(cleanName()||'Cosmic Explorer'),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');
      a.href=url;a.download='VantaLumen_RISE_Certificate.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);react('grateful');
    });
    function cleanupPrint(){
      if(printTimer){clearTimeout(printTimer);printTimer=null;}
      if(printLaunch){clearTimeout(printLaunch);printLaunch=null;}
      document.body.classList.remove('vs-printing-certificate');
      printRoot?.remove();printStyle?.remove();printRoot=printStyle=null;
    }
    on(window,'afterprint',cleanupPrint);
    on(printButton,'click',()=>{
      if(!certificateDialog.open||!refreshCertificateVisibility())return;
      const name=cleanName()||'Cosmic Explorer';
      cleanupPrint();
      printRoot=document.createElement('div');printRoot.className='vs-certificate-print';printRoot.setAttribute('aria-hidden','true');printRoot.style.cssText='position:fixed;left:-300vw;top:0;width:1123px;height:794px;pointer-events:none;';
      printRoot.innerHTML=certificateSVG(name);
      printStyle=document.createElement('style');
      printStyle.textContent='@page{size:A4 landscape;margin:0}@media print{body.vs-printing-certificate{overflow:visible!important;margin:0!important;background:#fff!important}body.vs-printing-certificate>*{display:none!important}body.vs-printing-certificate>.vs-certificate-print{display:block!important;position:static!important;left:auto!important;width:297mm!important;height:210mm!important}body.vs-printing-certificate>.vs-certificate-print svg{display:block;width:297mm;height:210mm}}';
      document.head.appendChild(printStyle);document.body.appendChild(printRoot);document.body.classList.add('vs-printing-certificate');
      printLaunch=setTimeout(()=>{printLaunch=null;if(typeof window.print==='function')window.print();},80);
      printTimer=setTimeout(cleanupPrint,120000);
    });
    // Captioned 30-second briefing. Its clock is independent of scroll and can pause.
    const dialog=$('.vs-briefing');let briefingTime=0,briefingPlaying=false,briefingWorld='moon',lastTick=performance.now();
    function paintBriefing(){
      const beat=Math.min(2,Math.floor(briefingTime/10));txt('.vs-brief-caption',WORLDS[briefingWorld].briefing[beat]);$('.vs-brief-progress').value=briefingTime;txt('.vs-brief-time',String(Math.floor(briefingTime)).padStart(2,'0')+' / 30 s');
      const a=reduced?0:briefingTime/30*Math.PI*2;attr('#briefing-traveller','cx',200+Math.cos(a)*130);attr('#briefing-traveller','cy',80+Math.sin(a)*48);
      if(briefingTime>=30){briefingPlaying=false;txt('.vs-brief-toggle','Replay');}
    }
    on($('.vs-open-briefing'),'click',()=>{if(state().cleared.size<24)return;briefingTime=0;briefingWorld=journey.world;briefingPlaying=true;lastTick=performance.now();txt('.vs-brief-toggle','Pause');paintBriefing();dialog.showModal();});
    on($('.vs-close'),'click',()=>dialog.close());on(dialog,'close',()=>{briefingPlaying=false;$('.vs-open-briefing').focus();});
    on($('.vs-brief-toggle'),'click',()=>{if(briefingTime>=30)briefingTime=0;briefingPlaying=!briefingPlaying;lastTick=performance.now();txt('.vs-brief-toggle',briefingPlaying?'Pause':'Play');});
    const briefClock=setInterval(()=>{const now=performance.now(),dt=Math.min((now-lastTick)/1000,.3);lastTick=now;if(dialog.open&&briefingPlaying&&!document.hidden){briefingTime=Math.min(30,briefingTime+dt);paintBriefing();}},100);

    root.dataset.reduced=String(reduced);$('.vs-motion').setAttribute('aria-pressed',String(reduced));if(reduced)$('.vs-motion').textContent='Motion paused ▷';
    chooseWorld('moon');measure();paintScene(0);
    dependencies().then(libs=>{if(!alive)return;gsap=libs.gsap;ScrollTrigger=libs.ScrollTrigger;buildAnimation();root.dataset.ready='true';txt('.vs-runtime-status','RISE is ready. Scroll to explore.');}).catch(error=>{if(!alive)return;root.dataset.ready='fallback';reduced=true;root.dataset.reduced='true';$('.vs-motion').disabled=true;$('.vs-motion').textContent='Still scenes';syncFallback();txt('.vs-runtime-status','Animation libraries unavailable. Still scenes and activities remain available.');console.warn('VantaLumen SVG:',error.message);});
    function destroy(){futureTween?.kill();alive=false;abort.abort();clearInterval(briefClock);clearTimeout(resizeTimer);resizeObserver.disconnect();intersection.disconnect();master?.kill();mainTrigger?.kill();idle?.kill();blink?.kill();entryTween?.kill();reactionTween?.kill();expressionTweens.forEach(t=>t.kill());setBlink(false);cleanupPrint();if(dialog.open)dialog.close();closeCertificate();delete root.vantaSVG;root.dataset.ready='false';}
    root.vantaSVG={
      destroy,
      getState:()=>({world:journey.world,chapter:active,emotion:currentMood,progress,reduced,ready:root.dataset.ready,moon:{cleared:journey.moon.cleared.size,matches:journey.moon.matches.size,recorded:journey.moon.recorded},mars:{cleared:journey.mars.cleared.size,matches:journey.mars.matches.size,recorded:journey.mars.recorded}}),
      // Maintainer hooks for scene inspection. They do not scroll the host page.
      renderAt:value=>{master?.pause();entryTween?.kill();reactionTween?.kill();idle?.pause();blink?.pause();entry.y=0;reaction.y=0;idleState.phase=0;temporaryEmotion=null;paintScene(value);entryTween?.kill();entry.y=0;applyBounce();refreshFace(false);setBlink(false);},
      // Instant inspection/export hook; normal slider changes use the GSAP playhead.
      renderFutureAt:(year,protectedSite=false)=>{const n=Number(year);if(!Number.isFinite(n))return;state().year=Math.round(clamp(n,2026,2076));state().protected=Boolean(protectedSite);$('#vs-year').value=String(state().year);$('#vs-protect').checked=state().protected;txt('.vs-year-output',state().year);updateEnvironment();refreshFace(false);},
      setEmotion:name=>{if(!SCENES.some(s=>s.emotion===name))return;temporaryEmotion=name;refreshFace(false);},
      createCertificate:name=>certificateSVG(String(name??'').replace(/\s+/g,' ').trim().slice(0,60)||'Cosmic Explorer'),
      chooseWorld,
      setMotion,
      resume:()=>{temporaryEmotion=null;refreshFace();mainTrigger?.refresh();pauseLoops();}
    };
    on(window,'pagehide',e=>{if(!e.persisted)destroy();});return root.vantaSVG;
  }
  if(window.VantaLumenSVG){window.VantaLumenSVG.mount(document.getElementById(ROOT_ID));return;}
  window.VantaLumenSVG={mount,poses:SCENES,poseAt,version:'1.1.0'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(document.getElementById(ROOT_ID)),{once:true});else mount(document.getElementById(ROOT_ID));
})();
