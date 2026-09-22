(function(root){
'use strict';
const node=typeof module!=='undefined',Flags=node?require('./events.js'):root.EventFlags,CC=node?require('./combat-config.js'):root.CombatConfig;
const CONFIG=Object.freeze({startMinutes:390,salary:8000,maxBonus:800,bonusPerOrder:50,errorPenalty:10,shiftMs:30000,endMinutes:1110,workEnergy:18,feedCost:1,defaultName:'Pé de Pano',roosterId:'firstRooster'});
function initialize(s,enabled=false){s.story.firstDay={enabled,phase:enabled?'routine':'legacy',intro:false,routeSeen:false,shift:null,refusals:0,purchaseDay:0,spent:0,reaction:false,profile:false,named:false,dialogue:{},memory:{}};if(enabled){s.clock.minutes=CONFIG.startMinutes;s.clock.period='morning';// E001 is deliberately order-free: every requested action is available immediately.
  s.agriculture.plots.plot1={prepared:true,crop:null,growth:0,wateredDay:null,cycle:0};
  s.agriculture.plots.plot2={prepared:true,crop:'radish',growth:1,wateredDay:null,cycle:1};
  s.agriculture.plots.plot3={prepared:false,crop:null,growth:0,wateredDay:null,cycle:0};
  s.agriculture.plots.plot4={prepared:false,crop:null,growth:0,wateredDay:null,cycle:0};s.events.flags.firstDayActive=true;s.story.chapter=1;s.story.stage='E001';}return s}
const data=s=>s.story.firstDay;
const enabled=s=>!!data(s)?.enabled;
function sync(s){if(!enabled(s))return;const d=data(s),records=Object.values(s.events.records),did=type=>records.some(e=>e.type==='yard.'+type);for(const type of ['prepare','plant','water','collect'])if(did(type))Flags.set(s,'day1_'+type);
 if(d.intro&&['prepare','plant','water','collect'].every(t=>Flags.has(s,'day1_'+t))){Flags.set(s,'E001');Flags.set(s,'rotina_basica_aprendida');if(d.phase==='routine'){d.phase='outbound';s.story.stage='E002'}}
 if(d.purchaseDay&&s.clock.day>d.purchaseDay&&d.phase==='bought'){d.phase='care';s.story.stage='E005'}
 const r=s.roosters.byId[CONFIG.roosterId];if(d.phase==='care'&&d.reaction&&d.profile&&d.named&&r?.care.fedDay===s.clock.day&&r.care.waterDay===s.clock.day){d.phase='complete';d.completeDay=s.clock.day;Flags.set(s,'E005');s.story.stage='E005-complete'}
 // E006 (Ato I): 1 dia depois do cuidado basico, o circuito local e mencionado. Saves antigos sem completeDay disparam ja.
 if(d.phase==='complete'){if(!Number.isSafeInteger(d.completeDay))d.completeDay=s.clock.day-1;
  if(!Flags.has(s,'E006')&&s.clock.day>=d.completeDay+1){Flags.set(s,'E006');s.story.stage='E006'}
  // E008: um dia depois da primeira competicao, Seu Marivaldo aparece no portao.
  // Ato III. E015 Nasceu Aqui: primeiro macho nascido no quintal chega a idade adulta.
  const young=(node?CC:root.CombatConfig)?.LIFE?.youngDays||10;
  if(!Flags.has(s,'E015')&&Object.values(s.roosters.byId).some(r=>Number.isSafeInteger(r.bornDay)&&s.clock.day-r.bornDay>=young)){Flags.set(s,'E015');s.story.stage='E015'}
  // E016 Seu Niva: com o circuito aberto e pelo menos 6 aves no total.
  const birds=Object.keys(s.roosters.byId).length+Object.keys(s.chickens.byId).length+Object.keys(s.chickens.breeding?.byId||{}).length;
  if(Flags.has(s,'E007')&&birds>=6&&!Flags.has(s,'E016')){Flags.set(s,'E016');s.story.stage='E016'}
  // E017 Primeiro titulo local: 5 vitorias de uma mesma ave; o bairro reage por 3 dias (favores pagam mais).
  if(!Flags.has(s,'E017')&&Object.values(s.roosters.byId).some(r=>(r.record?.wins||0)>=5)){Flags.set(s,'E017');s.story.stage='E017';d.titleDay=s.clock.day;d.memory.bairro_reage=s.clock.day+3}
  // Ato IV: Claudineia (E018) no dia seguinte ao titulo, viagem com Renato (E019), Regional disputado, Bruno patrocina (E020).
  if(Flags.has(s,'E017')&&!Flags.has(s,'E018')&&s.clock.day>(d.titleDay||0)){Flags.set(s,'E018');s.story.stage='E018'}
  if(Flags.has(s,'claudineia_visto')&&!Flags.has(s,'E019')){Flags.set(s,'E019');s.story.stage='E019'}
  if(Flags.has(s,'regional_disputado')&&!Flags.has(s,'E020')&&s.clock.day>(d.regionalDay||0)){Flags.set(s,'E020');s.story.stage='E020'}
  // E021 Top 10 local: 8 vitorias de uma mesma ave. Libera scouting avancado (atributos do rival na preparacao da luta).
  if(!Flags.has(s,'E021')&&Object.values(s.roosters.byId).some(r=>(r.record?.wins||0)>=8)){Flags.set(s,'E021');s.story.stage='E021'}
  // E022 (Ato V - O nome da linhagem): depois do patrocinio do Bruno (E020), com aves de 2 geracoes nascidas no quintal.
  const maxGen=[...Object.values(s.roosters.byId),...Object.values(s.chickens?.breeding?.byId||{})].reduce((m,b)=>Math.max(m,Number.isSafeInteger(b?.genetics?.generation)?b.genetics.generation:0),0);
  if(!Flags.has(s,'E022')&&Flags.has(s,'E020')&&maxGen>=2){Flags.set(s,'E022');s.story.stage='E022'}
  // Ato VI - Brasil. E023: linhagem nomeada e uma ave com vitorias suficientes abrem o circuito nacional (national.js).
  // E024: campeao nacional (vitoria na final).
  const NAT=node?require('./national.js'):root.National;
  if(NAT&&!Flags.has(s,'E023')&&NAT.shouldUnlock(s)){Flags.set(s,'E023');s.story.stage='E023'}
  if(!Flags.has(s,'E024')&&Flags.has(s,'nacional_campeao')){Flags.set(s,'E024');s.story.stage='E024'}
  // Ato VII - Mundo. E025: depois da cena do titulo nacional abre a central de viagens (CITA + circuito internacional, international.js).
  // E026: os 4 destinos conquistados -> convite para o Mundial (Ato VIII).
  if(!Flags.has(s,'E025')&&Flags.has(s,'campeao_nacional_visto')){Flags.set(s,'E025');s.story.stage='E025'}
  if(!Flags.has(s,'E026')&&Flags.has(s,'intl_dest_4')){Flags.set(s,'E026');s.story.stage='E026'}
  // Ato VIII. E027: depois do convite (E026) o Mundial abre (worldcup.js). E028: campeao mundial -> epilogo (Encapuzado) e pos-game.
  if(!Flags.has(s,'E027')&&Flags.has(s,'convite_mundial_visto')){Flags.set(s,'E027');s.story.stage='E027'}
  if(!Flags.has(s,'E028')&&Flags.has(s,'mundial_campeao')){Flags.set(s,'E028');s.story.stage='E028'}
  // E013: depois do primeiro nascimento (cena vista), Janilson entra.
  if(Flags.has(s,'birth_visto')&&!Flags.has(s,'E013')){Flags.set(s,'E013');s.story.stage='E013'}
  // E014: com 3 lutas no cartel o Principe (Carlos Nascimento) vira o rival local; ele aparece na proxima luta.
  const fights=Object.values(s.roosters.byId).reduce((n,r)=>n+(r.record?r.record.wins+r.record.draws+r.record.losses:0),0);
  if(Flags.has(s,'E007')&&fights>=3&&!Flags.has(s,'E014')){Flags.set(s,'E014');s.story.stage='E014'}
  if(Flags.has(s,'E007')&&!Flags.has(s,'E008')&&s.clock.day>(d.marivaldoDay||0)){Flags.set(s,'E008');s.story.stage='E008'}}
 for(const [key,expiry] of Object.entries(d.memory))if(s.clock.day>=expiry)delete d.memory[key];
}
function transact(s,id,amount){s.world.objects.economy??={ledger:{}};const ledger=s.world.objects.economy.ledger;if(Object.hasOwn(ledger,id))return false;if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(s.money+amount)||s.money+amount<0)throw Error('Invalid transaction');s.money+=amount;ledger[id]={amount,day:s.clock.day};return true}
function order(index){const count=2+index%3;return {items:Array.from({length:count},(_,i)=>(index*3+i*i+i)%4),bench:index%2}}
// P017: depois do primeiro expediente (Ato I), o turno no deposito volta a ficar disponivel uma vez por dia
// (Tainan aceita o mesmo minigame). d.repeatJob marca esse caso para tickWork nao repetir a passagem de dia do Ato I.
function canRepeatWork(s){const d=data(s);return enabled(s)&&Flags.has(s,'E002')&&d.phase==='complete'&&(!d.shift||d.shift.paid&&d.shift.paidDay!==s.clock.day)}
function startWork(s){const d=data(s);if(!enabled(s)||!Flags.has(s,'E002'))return false;if(d.shift&&!d.shift.paid)return true;if(d.shift?.paid){if(!canRepeatWork(s))return false}d.repeatJob=d.phase==='complete';d.shift={elapsedMs:0,index:0,basket:[],correct:0,errors:0,paid:false,earned:0,paidDay:null};d.phase='work';if(!d.repeatJob)s.story.stage='E003';return true}
function workAction(s,type,value){const w=data(s)?.shift;if(!w||w.paid)return false;if(type==='pick'){if(!Number.isInteger(value)||value<0||value>3||w.basket.length>=4)return false;w.basket.push(value);return 'pick'}if(type==='clear'){w.basket=[];return 'clear'}if(type==='deliver'){if(![0,1].includes(value))return false;const o=order(w.index),sort=a=>a.slice().sort().join(',');const correct=value===o.bench&&sort(o.items)===sort(w.basket);if(correct){w.correct++;w.index++}else w.errors++;w.basket=[];return correct?'correct':'wrong'}return false}
function tickWork(s,ms){const d=data(s),w=d?.shift;if(!w||w.paid)return false;if(!Number.isSafeInteger(ms)||ms<0||ms>1000)throw Error('Invalid shift tick');w.elapsedMs=Math.min(CONFIG.shiftMs,w.elapsedMs+ms);if(w.elapsedMs===CONFIG.shiftMs){const bonus=Math.max(0,Math.min(CONFIG.maxBonus,w.correct*CONFIG.bonusPerOrder-w.errors*CONFIG.errorPenalty)),repeat=!!d.repeatJob;transact(s,repeat?'jobSalary'+s.clock.day:'firstSalary',CONFIG.salary);transact(s,repeat?'jobBonus'+s.clock.day:'firstBonus',bonus);w.earned=CONFIG.salary+bonus;w.paid=true;w.paidDay=s.clock.day;s.energy=Math.max(0,s.energy-CONFIG.workEnergy);if(repeat){d.phase='complete'}else{s.clock.minutes=Math.max(s.clock.minutes,CONFIG.endMinutes);s.clock.period='night';s.clock.fractionMs=0;d.phase='return';Flags.set(s,'E003');s.story.stage='E004'}return true}return false}
function price(s){return Math.min(s.money,data(s)?.shift?.earned||0)}
function buy(s,createRooster){const d=data(s);if(!enabled(s)||!d.shift?.paid||d.purchaseDay||s.roosters.byId[CONFIG.roosterId])return false;const amount=price(s),r=createRooster(CONFIG.roosterId,CONFIG.defaultName);r.status.condition='recovering';r.status.health=65;r.genetics.genes={signature:'quiet-potential-01'};r.care={fedDay:0,waterDay:0};if(!transact(s,'firstRooster',-amount))return false;s.roosters.byId[r.id]=r;d.spent=amount;d.purchaseDay=s.clock.day;d.phase='bought';d.memory.compra_suspeita=s.clock.day+4;s.npcs.encapuzado={id:'encapuzado',met:true};Flags.set(s,'E004');s.world.objects.firstPen=true;return true}
function care(s,type,value){const d=data(s),r=s.roosters.byId[CONFIG.roosterId];if(!r||!enabled(s))return false;if(type==='profile'){d.profile=true;return true}if(type==='name'){if(typeof value!=='string'||!value.trim()||value.trim().length>40)return false;r.name=value.trim();d.named=true}else if(type==='feed'){if(r.care.fedDay===s.clock.day)return false;const id=s.inventory.items.feed>0?'feed':s.inventory.items.corn>0?'corn':null;if(!id)return false;s.inventory.items[id]-=CONFIG.feedCost;r.care.fedDay=s.clock.day}else if(type==='water'){if(r.care.waterDay===s.clock.day)return false;r.care.waterDay=s.clock.day}else return false;sync(s);return true}
function finishScene(s,id){const d=data(s);if(id==='intro'){d.intro=true;Flags.set(s,'talkedToFriend');s.npcs.friend.met=true;s.npcs.gabriel={id:'gabriel',met:true};d.memory.mudou_para_bairro=s.clock.day+3}else if(id==='reaction')d.reaction=true;else if(id==='circuit'){d.circuitOpen=true;Flags.set(s,'circuito_local')}else if(id==='observe'){d.observed=true;Flags.set(s,'marivaldo_observou')}else if(id==='work')s.npcs.tainan={id:'tainan',met:true};else if(id==='bruno'){transact(s,'bruno1',SPONSOR);Flags.set(s,'patrocinio_bruno');Flags.set(s,'bruno_visto')}else Flags.set(s,id+'_visto');sync(s)}
// E007: a primeira luta do galo inicial e a primeira competicao. Presenca paga (R$ 35,00) mesmo em derrota; unica vez.
const PRESENCE=3500,REGIONAL_PAY=10000,SPONSOR=15000;
function competition(s){const d=data(s);if(!enabled(s)||!d.circuitOpen||Flags.has(s,'E007'))return null;if(!transact(s,'presence1',PRESENCE))return null;Flags.set(s,'E007');s.story.stage='E007';s.npcs.marivaldo={id:'marivaldo',met:true};d.marivaldoDay=s.clock.day;return {presence:PRESENCE}}
// Campeonato Regional: viagem paga (R$ 100,00) uma unica vez, mesmo em derrota; grava o dia para o E020.
function regional(s){const d=data(s);if(!enabled(s)||!Flags.has(s,'viagem_visto')||Flags.has(s,'regional_disputado'))return null;if(!transact(s,'regional1',REGIONAL_PAY))return null;Flags.set(s,'regional_disputado');s.story.stage='E019-regional';d.regionalDay=s.clock.day;return {pay:REGIONAL_PAY}}
function circuitOpen(s){return !!data(s)?.circuitOpen}
function validate(s){const d=data(s),int=(v,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=a&&v<=b;if(d&&(d.completeDay!==undefined&&!Number.isSafeInteger(d.completeDay)||d.marivaldoDay!==undefined&&!Number.isSafeInteger(d.marivaldoDay)||d.titleDay!==undefined&&!Number.isSafeInteger(d.titleDay)||d.regionalDay!==undefined&&!Number.isSafeInteger(d.regionalDay)))return false;if(!d||typeof d.enabled!=='boolean'||!['legacy','routine','outbound','work','return','bought','care','complete'].includes(d.phase))return false;if(!['intro','routeSeen','reaction','profile','named'].every(k=>typeof d[k]==='boolean')||!int(d.refusals,0,2)||!int(d.purchaseDay,0,s.clock.day)||!int(d.spent)||!d.dialogue||!Object.values(d.dialogue).every(n=>int(n,0,30))||!d.memory||!Object.values(d.memory).every(n=>int(n,1)))return false;const w=d.shift;if(w!==null&&(!w||!int(w.elapsedMs,0,CONFIG.shiftMs)||!int(w.index)||!int(w.correct)||!int(w.errors)||!Array.isArray(w.basket)||w.basket.length>4||!w.basket.every(n=>int(n,0,3))||typeof w.paid!=='boolean'||!int(w.earned)||w.paid&&(w.elapsedMs!==CONFIG.shiftMs||w.earned<CONFIG.salary||w.earned>CONFIG.salary+CONFIG.maxBonus)||w.paid&&w.paidDay!==undefined&&!int(w.paidDay,0,s.clock.day)))return false;if(d.repeatJob!==undefined&&typeof d.repeatJob!=='boolean')return false;const r=s.roosters.byId[CONFIG.roosterId];if(d.purchaseDay&&(!r||!r.care||!int(r.care.fedDay,0,s.clock.day)||!int(r.care.waterDay,0,s.clock.day)))return false;const ledger=s.world.objects.economy?.ledger;if(ledger&&!Object.values(ledger).every(e=>e&&Number.isSafeInteger(e.amount)&&int(e.day,1,s.clock.day)))return false;return true}
const FirstDay={CONFIG,PRESENCE,REGIONAL_PAY,SPONSOR,regional,competition,circuitOpen,initialize,data,enabled,sync,transact,order,startWork,workAction,tickWork,price,buy,care,finishScene,validate,canRepeatWork};root.FirstDay=FirstDay;if(node)module.exports=FirstDay;
})(typeof window==='undefined'?globalThis:window);
