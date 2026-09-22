(function(root){
'use strict';
const Flags=typeof module!=='undefined'?require('./events.js'):root.EventFlags;
const definitions=[{
 id:'firstSteps',nameKey:'questTitle',descriptionKey:'intro',autoStart:true,sequential:false,conditions:[],
 steps:[{id:'friend',nameKey:'tasks.0',conditions:[{type:'flag',id:'talkedToFriend'}]},
 {id:'coop',nameKey:'tasks.1',conditions:[{type:'flag',id:'inspectedCoop'}]},
 {id:'garden',nameKey:'tasks.2',conditions:[{type:'flag',id:'visitedGarden'}]}],
 reward:{money:0,items:{},flags:['firstStepsCompleted'],unlocks:[]},nextMission:null
},{id:'yardCare',nameKey:'yard.questName',descriptionKey:'yard.questDescription',autoStart:true,sequential:false,conditions:[],steps:[
 {id:'prepare',nameKey:'yard.prepareTask',conditions:[{type:'event',event:'yard.prepare'}]},
 {id:'plant',nameKey:'yard.plantTask',conditions:[{type:'event',event:'yard.plant'}]},
 {id:'water',nameKey:'yard.waterTask',conditions:[{type:'event',event:'yard.water'}]},
 {id:'feed',nameKey:'yard.feedTask',conditions:[{type:'event',event:'yard.feed'}]},
 {id:'collect',nameKey:'yard.collectTask',conditions:[{type:'event',event:'yard.collect'}]},
 {id:'harvest',nameKey:'yard.harvestTask',conditions:[{type:'event',event:'yard.harvest'}]}
 ],reward:{flags:['firstYardCareCompleted']},nextMission:null}];
for(const [i,steps] of [[1,['prepare','plant','water','collect']],[2,['E002']],[3,['E003']],[4,['E004']],[5,['E005']]])definitions.push({id:'E00'+i,nameKey:'firstDay.q'+i,descriptionKey:'firstDay.d'+i,autoStart:true,sequential:false,conditions:[{type:'flag',id:i===1?'firstDayActive':'E00'+(i-1)}],steps:steps.map(t=>({id:t,nameKey:'firstDay.'+t,conditions:[{type:'flag',id:i===1?'day1_'+t:t}]})),reward:{}});
// Ato I, fim: circuito local (E006), primeira competicao (E007) e Seu Marivaldo (E008).
for(const [i,cond,steps] of [[6,'E005',[['invited','E006'],['circuitTalk','circuito_local']]],[7,'circuito_local',[['fightStep','E007']]],[8,'E008',[['observeStep','marivaldo_observou']]],[9,'E009',[['henStep','hen_visto'],['crossStep','E010']]],[11,'E011',[['eggStep','egg_visto'],['birthStep','E012']]],[12,'E012',[['birthSceneStep','birth_visto']]],[13,'E013',[['janilsonStep','janilson_visto']]],[14,'E014',[['principeStep','principe_enfrentado']]],[15,'E015',[['nasceuStep','nasceu_visto']]],[16,'E016',[['nivaStep','niva_visto'],['nivaHireStep','niva_contratado']]],[17,'E017',[['tituloStep','titulo_visto']]],[18,'E018',[['claudineiaStep','claudineia_visto']]],[19,'E019',[['viagemStep','viagem_visto'],['regionalStep','regional_disputado']]],[20,'E020',[['brunoStep','bruno_visto']]],[21,'E021',[['top10Step','top10_visto']]],[22,'E022',[['linhagemStep','linhagem_visto'],['nameStep','linhagem_nomeada']]],[23,'E023',[['nacionalStep','nacional_visto'],['etapasStep','nacional_etapa_3']]],[24,'E024',[['finalStep','nacional_campeao'],['campeaoStep','campeao_nacional_visto']]],[25,'E025',[['internacionalStep','internacional_visto'],['citaStep','cita_pedida'],['destinoStep','intl_dest_1']]],[26,'E026',[['mundoStep','intl_dest_4'],['conviteStep','convite_mundial_visto']]],[27,'E027',[['mundialStep','mundial_visto'],['mundoCupStep','mundial_campeao']]],[28,'E028',[['epilogoStep','epilogo_visto']]]])definitions.push({id:'E0'+String(i).padStart(2,'0'),nameKey:'firstDay.q'+i,descriptionKey:'firstDay.d'+i,autoStart:true,sequential:false,conditions:[{type:'flag',id:cond}],steps:steps.map(([id,flag])=>({id,nameKey:'firstDay.'+id,conditions:[{type:'flag',id:flag}]})),reward:{}});
class QuestManager{
 constructor(state,quests=definitions){this.state=state;this.definitions=quests;this.validateDefinitions();this.sync()}
 validateDefinitions(){
  const ids=new Set();for(const q of this.definitions){
   if(!Flags.safeId(q.id)||ids.has(q.id)||!q.steps?.length)throw Error('Invalid quest definition');ids.add(q.id);
   const steps=new Set();for(const s of q.steps){if(!Flags.safeId(s.id)||steps.has(s.id)||!Array.isArray(s.conditions)||!s.conditions.length)throw Error('Invalid quest step');steps.add(s.id)}
   for(const c of [...(q.conditions||[]),...q.steps.flatMap(s=>s.conditions)]){
    if(!['flag','event','inventory','room','quest'].includes(c.type))throw Error('Unknown condition');
    if(c.type==='event'&&!Flags.safeId(c.event))throw Error('Invalid event condition');
    if(['flag','inventory','quest'].includes(c.type)&&!Flags.safeId(c.id))throw Error('Invalid condition ID');
    if(c.count!==undefined&&(!Number.isSafeInteger(c.count)||c.count<1))throw Error('Invalid condition count');
   }
   const r=q.reward||{};if(!Number.isSafeInteger(r.money??0)||(r.money??0)<0)throw Error('Invalid reward');
   for(const [id,n] of Object.entries(r.items||{}))if(!Flags.safeId(id)||!Number.isSafeInteger(n)||n<1)throw Error('Invalid item reward');
   for(const id of [...(r.flags||[]),...(r.unlocks||[])])if(!Flags.safeId(id))throw Error('Invalid reward ID');
   if((q.conditions||[]).some(c=>c.type==='event'))throw Error('Use a flag for quest activation');
  }
  for(const q of this.definitions)if(q.nextMission&&!ids.has(q.nextMission))throw Error('Unknown next quest');
 }
 condition(c,progress=0){const s=this.state;switch(c.type){
  case 'flag':return Flags.has(s,c.id)?1:0;
  case 'event':return Math.min(c.count||1,progress);
  case 'inventory':return Math.min(c.count||1,s.inventory.items[c.id]||0);
  case 'room':return s.world.room===c.room?1:0;
  case 'quest':return s.quests[c.id]?.status===(c.status||'completed')?1:0;
 }}
 target(c){return c.type==='event'||c.type==='inventory'?(c.count||1):1}
 activate(id){const q=this.definitions.find(q=>q.id===id);if(!q)throw Error('Unknown quest');const p=this.state.quests[id];if(p.status==='locked'&&(q.conditions||[]).every(c=>this.condition(c)>=this.target(c)))p.status='active'}
 sync(event=null){
  const state=this.state;
  const eligible=new Set();if(event)for(const q of this.definitions){const p=state.quests[q.id];if(p?.status==='active'){for(const step of q.steps){if(!p.steps[step.id]?.complete){eligible.add(q.id+'.'+step.id);if(q.sequential)break}}}}
  for(const q of this.definitions){
   state.quests[q.id]??={status:'locked',steps:{},rewardGranted:false};const p=state.quests[q.id];
   for(const step of q.steps)p.steps[step.id]??={complete:false,progress:step.conditions.map(()=>0)};
  }
  // Reconciliation never replays events or pays an already claimed reward.
  for(let pass=0;pass<=this.definitions.length;pass++)for(const q of this.definitions){
   const p=state.quests[q.id];if(q.autoStart)this.activate(q.id);
   if(p.status==='completed'){this.finish(q,p);continue}if(p.status!=='active')continue;
   for(const step of q.steps){const sp=p.steps[step.id];if(sp.complete)continue;
    step.conditions.forEach((c,i)=>{let progress=sp.progress[i]||0;
     if(pass===0&&event&&eligible.has(q.id+'.'+step.id)&&c.type==='event'&&event.type===c.event&&(!c.target||c.target===event.target))progress+=event.amount??1;
     sp.progress[i]=this.condition(c,progress);
    });sp.complete=step.conditions.every((c,i)=>sp.progress[i]>=this.target(c));
    if(q.sequential&&!sp.complete)break;
    // One occurrence may satisfy at most one sequential step.
    if(q.sequential&&pass===0&&event)break;
   }
   if(q.steps.every(step=>p.steps[step.id].complete)){p.status='completed';this.finish(q,p)}
  }
 }
 finish(q,p){const s=this.state;if(!p.rewardGranted){const r=q.reward||{};
  if(!Number.isSafeInteger(s.money+(r.money||0)))throw Error('Money overflow');
  for(const [id,n] of Object.entries(r.items||{}))if(!Number.isSafeInteger((s.inventory.items[id]||0)+n))throw Error('Inventory overflow');
  s.money+=r.money||0;for(const [id,n] of Object.entries(r.items||{}))s.inventory.items[id]=(s.inventory.items[id]||0)+n;
  for(const id of r.flags||[])Flags.set(s,id);for(const id of r.unlocks||[])s.unlocks[id]=true;p.rewardGranted=true;
 }if(q.nextMission)this.activate(q.nextMission)}
 emit(event){if(!Flags.record(this.state,event))return false;this.sync(event);return true}
 setFlag(id){const changed=Flags.set(this.state,id);this.sync();return changed}
 list(){return this.definitions.map(q=>({definition:q,progress:this.state.quests[q.id]}))}
}
root.QuestManager=QuestManager;if(typeof module!=='undefined')module.exports=QuestManager;
})(typeof window==='undefined'?globalThis:window);
