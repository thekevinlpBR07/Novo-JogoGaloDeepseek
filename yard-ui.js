let yardView=null,toastUntil=0,yardEffect=null,audioContext=null,soundEnabled=true;
const yardText=(text,vars={})=>text.replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));
// P016/0.3.36: alem dos efeitos do quintal (agua, colheita, erro...), 'hit'/'victory'/'defeat'
// cobrem o combate e 'correct'/'wrong' o minigame do deposito - mesma sintese, sem arquivo de audio.
function yardSound(type){if(!soundEnabled)return;try{
 audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});
 const now=audioContext.currentTime,notes=type==='water'?[650,420,720]:type==='harvest'||type==='collect'||type==='correct'?[523,659,784]:type==='sleep'?[392,494,587]:type==='error'||type==='wrong'?[160]:type==='hit'?[140,90]:type==='victory'?[523,659,784,1046]:type==='defeat'?[392,311,262]:[220,330];
 const wave=type==='prepare'?'triangle':type==='hit'?'square':type==='defeat'?'sawtooth':'sine';
 notes.forEach((freq,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=wave;o.frequency.setValueAtTime(freq,now+i*.075);g.gain.setValueAtTime(0,now+i*.075);g.gain.linearRampToValueAtTime(.07,now+i*.075+.008);g.gain.exponentialRampToValueAtTime(.001,now+i*.075+.12);o.connect(g);g.connect(audioContext.destination);o.start(now+i*.075);o.stop(now+i*.075+.13)});
 }catch{/* Visual confirmation remains available when audio is unsupported. */}}
function yardFeedback(text,type='error'){$('yardFeedback').textContent=text;$('toast').textContent=text;toastUntil=performance.now()+4000;$('toast').hidden=false;yardSound(type);yardEffect={type,x:state.player.x,y:state.player.y,time:performance.now()};}
function farmAction(type,id='hens',choice){
 if(!activeSlot||!$('yardPanel').open)return;
 const required=['prepare','plant','water','harvest'].includes(type)?'garden':['feed','collect'].includes(type)?'coop':'bed';
 if(yardView!==required)return;
 const next=GameState.clone(state),result=type==='sleep'?GameTime.sleep(next):Farm.act(next,type,id,choice);
 const l=LOCALES[lang].yard;if(!result.ok){yardFeedback(l.feedback[result.code]);return false}
 if(type!=='sleep')GameTime.work(next,type);
 try{new QuestManager(next).emit(result.event);FirstDay.sync(next);new QuestManager(next).sync();if(type==='sleep'&&typeof Memorable!=='undefined')Memorable.roll(next);saves.save(activeSlot,next)}catch{yardFeedback(LOCALES[lang].system.saveError);return false}
 state=next;missions=new QuestManager(state);ui();
 if(type==='sleep')yardView='morning';renderYard();
 yardFeedback(yardText(l.feedback[result.code],{amount:result.amount,crop:l.items[result.crop]||''}),type);return true;
}
function openYard(view){keys.clear();moving=false;yardView=view;$('yardFeedback').textContent='';renderYard();$('yardPanel').showModal();renderHotbar()}
function closeYard(){save();$('yardPanel').close();yardView=null;keys.clear();canvas.focus();renderHotbar()}

// --- Barra de itens e interacao direta por canteiro (arar/plantar/regar/colher
// sem abrir menu: chega perto, equipa o item certo, aperta E) --------------
let equippedItem=null;
const HOTBAR_TOOLS=[{id:'hoe',icon:'🔨'},{id:'wateringcan',icon:'🚿'}];
function hotbarSlots(){
 return [...HOTBAR_TOOLS,
  ...Object.keys(Farm.crops).map(crop=>({id:Farm.crops[crop].seed,icon:crop==='corn'?'🌽':'🌱',crop})),
  {id:'feed',icon:'🌾'},{id:'corn',icon:'🟡'}];
}
function cropForSeed(itemId){return Object.keys(Farm.crops).find(c=>Farm.crops[c].seed===itemId)||null}
function equipHotbar(id){
 const slot=hotbarSlots().find(s=>s.id===id);if(!slot)return;
 const isTool=HOTBAR_TOOLS.some(t=>t.id===id);
 if(!isTool&&(state.inventory.items[id]||0)<=0)return;
 equippedItem=equippedItem===id?null:id;renderHotbar();
}
function renderHotbar(){
 const bar=$('hotbar');if(!bar)return;
 if(!activeSlot||state.world.room!=='yard'||document.querySelector('dialog[open]')){bar.hidden=true;return}
 bar.hidden=false;const yl=LOCALES[lang].yard,l=yl.hotbar;bar.replaceChildren();
 hotbarSlots().forEach((slot,i)=>{
  const isTool=HOTBAR_TOOLS.some(t=>t.id===slot.id),count=isTool?null:(state.inventory.items[slot.id]||0);
  const btn=document.createElement('button');btn.type='button';btn.className='hotbar-slot'+(equippedItem===slot.id?' active':'');btn.disabled=!isTool&&count<=0;
  btn.title=(l[slot.id]||yl.items[slot.id]||slot.id)+' · '+(i+1);btn.onclick=()=>equipHotbar(slot.id);
  const key=document.createElement('span');key.className='hotbar-key';key.textContent=String(i+1);btn.append(key);
  const icon=document.createElement('span');icon.className='hotbar-icon';icon.textContent=slot.icon;btn.append(icon);
  if(count!==null){const c=document.createElement('span');c.className='hotbar-count';c.textContent=String(count);btn.append(c)}
  bar.append(btn);
 });
}
function plotPromptLabel(near){
 const l=LOCALES[lang].yard,p=state.agriculture.plots[near.plotId];if(!p)return l.plot;
 const stg=Farm.stage(p);
 if(stg==='bare')return l.prepare;
 if(stg==='tilled'){const crop=equippedItem&&cropForSeed(equippedItem);return crop?l.plant+' '+l.items[crop]:l.plantHint}
 if(stg==='ready')return l.harvest;
 return p.wateredDay===state.clock.day?l.plot:l.water;
}
function plotAct(type,id,choice,near){
 if(!activeSlot||transition||document.querySelector('dialog[open]'))return false;
 const next=GameState.clone(state),result=Farm.act(next,type,id,choice);
 const l=LOCALES[lang].yard;if(!result.ok){yardFeedback(l.feedback[result.code]);return false}
 GameTime.work(next,type);
 try{new QuestManager(next).emit(result.event);FirstDay.sync(next);new QuestManager(next).sync();saves.save(activeSlot,next)}catch{yardFeedback(LOCALES[lang].system.saveError);return false}
 state=next;missions=new QuestManager(state);ui();renderHotbar();
 yardEffect={type,x:near.x,y:near.y,time:performance.now()};yardSound(type);
 $('toast').textContent=yardText(l.feedback[result.code],{amount:result.amount,crop:l.items[result.crop]||''});toastUntil=performance.now()+2200;$('toast').hidden=false;
 return true;
}
function plotInteract(near){
 const id=near.plotId,p=state.agriculture.plots[id];if(!p)return;
 const l=LOCALES[lang].yard,stg=Farm.stage(p);
 if(stg==='bare'){if(equippedItem!=='hoe'){yardFeedback(l.feedback.needHoe);return}plotAct('prepare',id,undefined,near);return}
 if(stg==='tilled'){const crop=equippedItem&&cropForSeed(equippedItem);if(!crop){yardFeedback(l.feedback.needSeed);return}plotAct('plant',id,crop,near);return}
 if(stg==='ready'){plotAct('harvest',id,undefined,near);return}
 if(p.wateredDay===state.clock.day){yardFeedback(l.feedback.alreadyWatered);return}
 if(equippedItem!=='wateringcan'){yardFeedback(l.feedback.needWateringCan);return}
 plotAct('water',id,undefined,near);
}
function feedPromptLabel(){
 const l=LOCALES[lang].yard,hungry=Object.values(state.chickens.byId).filter(h=>h.fedDay!==state.clock.day).length;
 if(!hungry)return l.feedback.alreadyFed;
 return equippedItem==='feed'?l.feed:equippedItem==='corn'?l.cornFeed:l.feedHint;
}
function feedInteract(near){
 const l=LOCALES[lang].yard,hungry=Object.values(state.chickens.byId).filter(h=>h.fedDay!==state.clock.day).length;
 if(!hungry){yardFeedback(l.feedback.alreadyFed);return}
 if(equippedItem!=='feed'&&equippedItem!=='corn'){yardFeedback(l.feedback.needFeed);return}
 plotAct('feed','hens',equippedItem,near);
}
function nestPromptLabel(){
 const l=LOCALES[lang].yard,eggs=Object.values(state.chickens.byId).reduce((n,h)=>n+h.eggs,0);
 return eggs?l.collect:l.feedback.noEggs;
}
function nestInteract(near){
 plotAct('collect','hens',undefined,near);
}
function renderYard(){const previousFocus=document.activeElement?.dataset?.action;const l=LOCALES[lang].yard,body=$('yardBody');body.replaceChildren();$('yardTitle').textContent=l[yardView]||l.title;$('yardPanel').dataset.view=yardView;$('closeYard').textContent=l.close;
 const para=(text,parent=body)=>{const p=document.createElement('p');p.textContent=text;parent.append(p);return p};
 const button=(text,id,fn,parent=body,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.dataset.action=id;b.onclick=fn;b.disabled=disabled;parent.append(b);if(disabled)explainDisabled(b,blockedReason(id));return b};
 body.className='';if(renderStory(body))return;if(typeof renderFavor==='function'&&renderFavor(body))return;if(typeof renderCombat==='function'&&renderCombat(body))return;if(typeof renderBreeding==='function'&&renderBreeding(body))return;if(typeof renderTraining==='function'&&renderTraining(body))return;if(typeof renderPlantel==='function'&&renderPlantel(body))return;if(typeof renderConstruction==='function'&&renderConstruction(body))return;if(typeof renderLineage==='function'&&renderLineage(body))return;if(typeof renderInternational==='function'&&renderInternational(body))return;if(typeof renderEpilogue==='function'&&renderEpilogue(body))return;const item=id=>(state.inventory.items[id]||0);
 if(['kitchen','bed','morning','coop'].includes(yardView)){const hero=document.createElement('div');hero.className='interaction-hero '+(yardView==='coop'?'coop':'');hero.setAttribute('aria-hidden','true');body.append(hero)}
 if(yardView==='garden'){
  para(l.gardenHint);const grid=document.createElement('div');grid.className='yard-grid';body.append(grid);
  Farm.ids.forEach((id,index)=>{const p=state.agriculture.plots[id],stage=Farm.stage(p),card=document.createElement('article');card.className='yard-card';card.dataset.plot=id;const preview=document.createElement('canvas');preview.className='plot-preview';preview.width=440;preview.height=252;const pc=preview.getContext('2d');pc.fillStyle='#3a3024';pc.fillRect(0,0,440,252);pc.drawImage(PlotArt.get(p,p.wateredDay===state.clock.day,index),0,0,256,256,100,6,240,240);preview.setAttribute('aria-hidden','true');card.append(preview);const h=document.createElement('h3');h.textContent=l.plot+' '+(index+1);card.append(h);
   const meter=document.createElement('progress');meter.className='growth-meter';meter.max=p.crop?Farm.crops[p.crop].days:1;meter.value=p.growth;meter.setAttribute('aria-label',l.growth);card.append(meter);para(l[stage]+(p.crop?' · '+l.items[p.crop]+' · '+p.growth+'/'+Farm.crops[p.crop].days+' '+l.growth:''),card);para(p.wateredDay===state.clock.day?'● '+l.wet:'○ '+l.dry,card);
   if(!p.prepared)button(l.prepare,'prepare-'+id,()=>farmAction('prepare',id),card);
   else if(!p.crop){for(const crop of Object.keys(Farm.crops))button(l.plant+' '+l.items[crop]+' ('+item(Farm.crops[crop].seed)+')','plant-'+id+'-'+crop,()=>farmAction('plant',id,crop),card,item(Farm.crops[crop].seed)<1)}
   if(p.prepared&&stage!=='ready')button(p.wateredDay===state.clock.day?'✓ '+l.wet:l.water,'water-'+id,()=>farmAction('water',id),card,p.wateredDay===state.clock.day);
   if(stage==='ready')button(l.harvest,'harvest-'+id,()=>farmAction('harvest',id),card);grid.append(card);
  });
 }else if(yardView==='coop'){
  para(l.coopHint);Object.values(state.chickens.byId).forEach((h,i)=>para(l.hen+' '+(i+1)+' · '+(h.fedDay===state.clock.day?'✓ '+l.fed:'○ '+l.hungry)+' · '+h.eggs+'/3 '+l.eggs));
  const hungry=Object.values(state.chickens.byId).filter(h=>h.fedDay!==state.clock.day).length;
  button(l.feed+' ('+item('feed')+')','feed',()=>farmAction('feed','hens','feed'),body,!hungry||item('feed')<hungry);
  button(l.cornFeed+' ('+item('corn')+')','feed-corn',()=>farmAction('feed','hens','corn'),body,!hungry||item('corn')<hungry);
  if(hungry&&item('feed')<hungry&&item('corn')<hungry)para(l.feedback.noFeed);
  const eggs=Object.values(state.chickens.byId).reduce((n,h)=>n+h.eggs,0);button(l.collect+' ('+eggs+')','collect',()=>farmAction('collect'),body,!eggs);
 }else if(yardView==='kitchen'){
  const meal=document.createElement('canvas');meal.className='meal-art';meal.width=300;meal.height=260;drawMeal(meal.getContext('2d'),150,130,260);meal.setAttribute('aria-hidden','true');body.append(meal);para(LOCALES[lang].time.mealHint);button(LOCALES[lang].time.meal,'meal',()=>needAction('meal'),body,state.world.objects.lastMealDay===state.clock.day);
 }else if(yardView==='bed'){
  para(LOCALES[lang].time.sleepHint);para(l.sleepWarning);para(routineText());button(l.sleep,'sleep',()=>{askAction(l.sleepConfirm,()=>farmAction('sleep'));$('confirmWarning').textContent=l.sleepWarning});
 }else if(yardView==='morning'){para(yardText(l.summary,state.agriculture.lastSummary));const mem=typeof Memorable!=='undefined'?Memorable.today(state):null,ml=LOCALES[lang].memorable;if(mem&&ml){para(ml.title+': '+ml.events[mem.id])}para(l.sleepHint)}
 else if(yardView==='inventory')renderInventory(body,button);
 if(previousFocus&&$('yardPanel').open){const buttons=body.querySelectorAll?.('button')||[];const next=[...buttons].find(b=>b.dataset.action===previousFocus&&!b.disabled);(next||$('closeYard')).focus()}
}
function routineText(){const l=LOCALES[lang].yard,d=state.agriculture.daily;return [d.prepared+' '+l.prepared,d.planted+' '+l.planted,d.watered+' '+l.watered,d.fed+' '+l.fedCount,d.collected+' '+l.collected,d.harvested+' '+l.harvested].join(' · ')}
window.addEventListener('DOMContentLoaded',()=>{$('closeYard').onclick=closeYard;$('bagButton').onclick=()=>toggleInventory();$('soundButton').onclick=()=>{soundEnabled=!soundEnabled;$('soundButton').textContent=LOCALES[lang].yard.sounds+': '+LOCALES[lang].yard[soundEnabled?'on':'off'];if(soundEnabled)yardSound('collect')};});

function needAction(type,id){if(!activeSlot||!$('yardPanel').open||yardView!==(type==='meal'?'kitchen':'inventory'))return;const next=GameState.clone(state);if(!(type==='meal'?GameTime.meal(next):GameTime.eat(next,id)))return;try{saves.save(activeSlot,next)}catch{yardFeedback(LOCALES[lang].system.saveError);return}state=next;missions=new QuestManager(state);ui();renderYard();yardFeedback(LOCALES[lang].time.ate,'collect');}
let inventoryCategory='all',inventorySelection=null;
const itemCategory=id=>GameTime.foods[id]?'food':Object.values(Farm.crops).some(c=>c.seed===id)?'agriculture':id==='feed'?'husbandry':'other';
function blockedReason(action){
 const l=LOCALES[lang],f=l.yard.feedback;
 if(action.startsWith('plant-'))return f.noSeeds;
 if(action.startsWith('water-'))return f.alreadyWatered;
 if(action==='feed'||action==='feed-corn')return Object.values(state.chickens.byId).every(h=>h.fedDay===state.clock.day)?f.alreadyFed:f.noFeed;
 if(action==='collect')return f.noEggs;
 if(action==='meal')return l.interface.mealUsed;
 if(action.startsWith('eat-'))return (state.inventory.items[action.slice(4)]||0)<1?l.interface.noItem:l.interface.full;
 return f.invalid;
}
function explainDisabled(button,reason){
 button.title=reason;const note=document.createElement('small');note.className='action-reason';note.textContent=reason;note.id='reason-'+button.dataset.action;note.tabIndex=0;note.setAttribute('role','note');button.setAttribute('aria-describedby',note.id);button.parentElement?.append(note);
}
function itemIcon(id,size=96){
 const out=document.createElement('canvas');out.width=out.height=size;out.className='item-icon';out.setAttribute('aria-hidden','true');
 const c=out.getContext('2d'),key={radishSeed:'radish',cornSeed:'corn',feed:'feedFull',egg:'eggs'}[id]||id,source=ModularYard.sprites[key];
 const seed=id.endsWith('Seed');if(seed){c.fillStyle='#d2b47b';c.fillRect(size*.2,size*.1,size*.6,size*.8);c.strokeStyle='#755737';c.lineWidth=2;c.strokeRect(size*.2,size*.1,size*.6,size*.8)}
 if(source){const span=size*(seed?.52:.8),ratio=Math.min(span/source.width,span/source.height),w=source.width*ratio,h=source.height*ratio;c.drawImage(source,(size-w)/2,(size-h)/2,w,h)}
 else{c.fillStyle='#d9bd82';c.font=(size*.5)+'px Georgia';c.textAlign='center';c.fillText('?',size/2,size*.68)}
 return out;
}
function renderInventory(body,button){
 const l=LOCALES[lang],u=l.interface,items=Object.entries(state.inventory.items).filter(([,n])=>n>0);
 if(state.roosters.byId[FirstDay.CONFIG.roosterId]){const b=document.createElement('button');b.textContent=storyL().rooster;b.dataset.story='profile';b.onclick=()=>{if(storyCommit(s=>FirstDay.care(s,'profile'))){yardView='rooster';renderYard()}};body.append(b)}
 const categories=['all',...new Set(items.map(([id])=>itemCategory(id)))];
 if(!categories.includes(inventoryCategory))inventoryCategory='all';
 const tabs=document.createElement('nav');tabs.className='ui-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',l.yard.inventory);
 for(const category of categories)uiTab(tabs,category,u[category],inventoryCategory===category,()=>{inventoryCategory=category;inventorySelection=null;renderYard()});
 body.append(tabs);const visible=items.filter(([id])=>inventoryCategory==='all'||itemCategory(id)===inventoryCategory);
 if(!visible.some(([id])=>id===inventorySelection))inventorySelection=visible[0]?.[0]||null;
 if(!visible.length){const empty=document.createElement('div');empty.className='empty-state';const h=document.createElement('h3');h.textContent=u.empty;const p=document.createElement('p');p.textContent=u.emptyHint;empty.append(h);empty.append(p);body.append(empty);return}
 const layout=document.createElement('div');layout.className='inventory-layout';const grid=document.createElement('div');grid.className='inventory-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',l.yard.inventory);
 for(const [id,n] of visible){const b=document.createElement('button');b.className='item-slot';b.dataset.item=id;b.setAttribute('aria-pressed',String(id===inventorySelection));b.onclick=()=>{inventorySelection=id;renderYard();$('yardBody').querySelector('[data-item="'+id+'"]')?.focus()};b.append(itemIcon(id));
 const name=document.createElement('span');name.textContent=l.yard.items[id]||id;const count=document.createElement('strong');count.textContent='×'+new Intl.NumberFormat(lang).format(n);b.append(name);b.append(count);grid.append(b)}
 const id=inventorySelection,detail=document.createElement('section');detail.className='item-detail';detail.setAttribute('aria-label',u.details);detail.append(itemIcon(id,160));
 const title=document.createElement('h3');title.textContent=l.yard.items[id]||id;detail.append(title);
 for(const text of [u.itemDescriptions[id]||u.genericItem,u.quantity+': '+new Intl.NumberFormat(lang).format(state.inventory.items[id]),u.uses+' — '+(u.itemUses[id]||u.genericUse)]){const p=document.createElement('p');p.textContent=text;detail.append(p)}
 if(GameTime.foods[id]){const effect=document.createElement('p');effect.className='item-effect';effect.textContent=yardText(u.eatEffect,{hunger:GameTime.foods[id]});detail.append(effect);button(l.time.eat,'eat-'+id,()=>needAction('eat',id),detail,state.hunger===0)}
 if(typeof Market!=='undefined'&&Market.producePrice(id)>0){const qty=state.inventory.items[id]||0,unit=Market.producePrice(id),total=unit*qty,fmt=n=>new Intl.NumberFormat(lang,{style:'currency',currency:'BRL'}).format(n/100);const sellP=document.createElement('p');sellP.className='item-effect';sellP.textContent=u.sellHint.replace('{preco}',fmt(unit));detail.append(sellP);button(u.sellAll.replace('{valor}',fmt(total)),'sell-'+id,()=>{if(storyCommit(s=>Market.sellProduce(s,id,s.inventory.items[id]||0))){inventorySelection=null;yardFeedback(u.sellDone.replace('{valor}',fmt(total)),'collect');renderYard()}},detail,qty<1)}
 layout.append(grid);layout.append(detail);body.append(layout);
}
