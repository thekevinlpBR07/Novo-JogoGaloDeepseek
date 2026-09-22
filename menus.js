function resizeGame(){canvas.width=Math.round(innerWidth*Math.min(devicePixelRatio||1,2));canvas.height=Math.round(innerHeight*Math.min(devicePixelRatio||1,2))}
window.addEventListener('resize',()=>resizeGame());
function renderMenu(){const running=!!activeSlot,l=LOCALES[lang].system;
 $('menuTitle').textContent=running?l.pauseTitle:l.startTitle;$('menuText').textContent=running?l.pauseText:l.startText;
 for(const id of ['play','loadSlots','saveNow','saveSlots','reset','fullscreen','mainMenu','quit','closeQuests','questButton','menuButton','slotsEyebrow','closeSlots','confirmWarning','confirmYes','confirmNo'])$(id).textContent=l[id];
 $('questButton').setAttribute('aria-label',l.questButton);$('menuButton').setAttribute('aria-label',l.menuButton);
 for(const id of ['play','saveNow','saveSlots','mainMenu','export','import','importLabel'])$(id).hidden=!running;
 $('menu').classList.toggle('start',!running);document.body.classList.toggle('at-title',!running);$('quit').hidden=!window.desktopStorage;
}
function askAction(title,action){$('confirmWarning').textContent=LOCALES[lang].system.confirmWarning;$('confirmTitle').textContent=title;$('confirmYes').onclick=()=>{try{action();$('confirmAction').close()}catch{$('confirmTitle').textContent=LOCALES[lang].system.saveError}};$('confirmAction').showModal();$('confirmNo').focus()}
function setState(next){$('toast').hidden=true;toastUntil=0;yardEffect=null;state=relocateLegacyStreet(next);missions=new QuestManager(state);transition=null;near=null;keys.clear();face=0;moving=false;$('prompt').style.display='none'}
function beginSlot(i,next){
 const candidate=next||GameState.newGame();saves.save(i,candidate);
 $('dialogue').close();$('quests').close();$('yardPanel').close();yardView=null;activeSlot=i;setState(candidate);$('notice').textContent='';ui();$('slots').close();$('menu').close();canvas.focus();
}
function showSlots(mode='load'){
 keys.clear();const l=LOCALES[lang].system;$('slotsTitle').textContent=mode==='new'?l.newTitle:mode==='save'?l.saveTitle:l.loadTitle;$('slotList').replaceChildren();
 for(let i=1;i<=3;i++){
  const info=saves.inspect(i),occupied=info.status!=='empty',s=info.state,card=document.createElement('article');card.className='slot';card.dataset.slot=i;
  const title=document.createElement('h3');title.textContent='0'+i+' / '+(s?l.occupied:occupied?l.unavailable:l.empty);card.append(title);
  const desc=document.createElement('p');
  if(s){const m=new QuestManager(s).list(),total=m.reduce((n,q)=>n+q.definition.steps.length,0),done=m.reduce((n,q)=>n+q.definition.steps.filter(step=>q.progress.steps[step.id].complete).length,0);
   desc.textContent=`${l.day} ${s.clock.day} · ${l[s.world.room]} · ${new Intl.NumberFormat(lang,{style:'currency',currency:'BRL'}).format(s.money/100)} · ${done}/${total} ${l.missions}${info.savedAt?' · '+new Date(info.savedAt).toLocaleString(lang):''}`;
  }else desc.textContent=occupied?l.unavailableText:l.emptyText;card.append(desc);
  const btn=document.createElement('button');btn.textContent=mode==='load'?(occupied?l.load:l.reset):occupied?l.replace:mode==='save'?l.saveHere:l.begin;
  btn.disabled=mode==='load'&&occupied&&!s;if(btn.disabled){btn.title=LOCALES[lang].interface.unavailable;btn.setAttribute('aria-label',btn.textContent+'. '+btn.title)}card.dataset.status=info.status;
  btn.onclick=()=>{const action=()=>{if(mode==='save'){saves.save(i,state);activeSlot=i;$('slots').close();$('notice').textContent=l.savedSlot+' '+i;renderMenu()}else beginSlot(i,mode==='load'?s:null)};
   if(occupied&&mode!=='load')askAction(l.replaceConfirm+' '+i+'?',action);else try{action()}catch{$('slotsTitle').textContent=l.saveError}};
  card.append(btn);
  if(occupied){const del=document.createElement('button');del.className='danger';del.textContent=l.erase;del.onclick=()=>askAction(l.deleteConfirm+' '+i+'?',()=>{saves.delete(i);if(activeSlot===i){activeSlot=0;renderMenu()}showSlots(mode)});card.append(del)}
  $('slotList').append(card);
 }
 if(!$('slots').open)$('slots').showModal();
}
window.addEventListener('DOMContentLoaded',()=>{
 try{saves.migrateLegacy()}catch{storageOK=false;$('notice').textContent=LOCALES[lang].storage}
 $('questButton').onclick=()=>toggleJournal();
 $('loadSlots').onclick=()=>showSlots();$('saveSlots').onclick=()=>showSlots('save');$('saveNow').onclick=()=>{if(save())$('notice').textContent=LOCALES[lang].system.savedSlot+' '+activeSlot};
 $('closeSlots').onclick=()=>$('slots').close();$('confirmNo').onclick=()=>$('confirmAction').close();$('closeQuests').onclick=()=>$('quests').close();
 $('mainMenu').onclick=()=>{if(save()){activeSlot=0;renderMenu()}};$('quit').onclick=()=>{if(save())window.close()};
 $('fullscreen').onclick=async()=>{try{if(window.desktopStorage?.toggleFullscreen)window.desktopStorage.toggleFullscreen();else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('notice').textContent=LOCALES[lang].system.fullscreenHint}};
 for(const d of document.querySelectorAll('dialog')){
 d.setAttribute('aria-labelledby',({menu:'menuTitle',quests:'questTitle',slots:'slotsTitle',confirmAction:'confirmTitle',yardPanel:'yardTitle',dialogue:'speaker'})[d.id]);
 d.addEventListener('cancel',e=>e.preventDefault());
 d.addEventListener('close',()=>{if(d.id==='yardPanel'&&!d.open)yardView=null;const parent=topDialog();if(parent){const focus=parent.querySelector?.('[data-return-focus]')||parent.querySelector?.('button:not(:disabled):not([hidden])');focus?.focus()}else if(activeSlot)canvas.focus()});
 }
 $('importLabel').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('import').click()}};
 $('objectiveToggle').onclick=()=>{objectiveCollapsed=!objectiveCollapsed;renderObjective()};
 document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(button){const dialog=button.closest('dialog');if(dialog){dialog.querySelectorAll('[data-return-focus]').forEach(b=>b.removeAttribute('data-return-focus'));button.setAttribute('data-return-focus','')}}});
 document.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tab=e.target.closest?.('[role="tab"]');if(!tab)return;const tabs=[...tab.parentElement.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;e.preventDefault();const key=tabs[next].dataset.tab,dialog=tab.closest('dialog');tabs[next].click();dialog?.querySelector('[data-tab="'+key+'"]')?.focus()});

});
let journalTab='today',objectiveCollapsed=false;
function topDialog(){return ['confirmAction','slots','yardPanel','quests','dialogue','menu'].map($).find(d=>d.open)||null}
function toggleJournal(){
 if(!activeSlot||transition||$('menu').open||$('dialogue').open||$('slots').open||$('confirmAction').open)return;
 keys.clear();if($('quests').open){$('quests').close();return}
 if($('yardPanel').open)closeYard();ui();$('quests').showModal();
}
function toggleInventory(){
 if(!activeSlot||transition||$('menu').open||$('dialogue').open||$('slots').open||$('confirmAction').open)return;
 keys.clear();if($('yardPanel').open&&yardView==='inventory'){closeYard();return}
 if($('quests').open)$('quests').close();if($('yardPanel').open)closeYard();openYard('inventory');
}
function uiTab(parent,key,label,selected,action){
 const b=document.createElement('button');b.textContent=label;b.dataset.tab=key;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;b.onclick=action;parent.append(b);return b;
}
function renderObjective(){
 const l=LOCALES[lang],lookup=key=>key.split('.').reduce((o,k)=>o?.[k],l)||key;
 const active=missions.list().find(q=>q.progress.status==='active'),step=active?.definition.steps.find(s=>!active.progress.steps[s.id].complete);
 $('objectiveToggle').textContent=l.interface.objective+(objectiveCollapsed?' +':' −');$('objectiveToggle').setAttribute('aria-expanded',String(!objectiveCollapsed));$('objectiveToggle').setAttribute('aria-label',l.interface[objectiveCollapsed?'showObjective':'hideObjective']);
 $('objectiveText').hidden=objectiveCollapsed;$('objectiveText').textContent=FirstDay.enabled(state)?storyObjective():step?lookup(step.nameKey):l.interface.freeDay;
}
