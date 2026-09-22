(function(root){
'use strict';
const crops={radish:{seed:'radishSeed',days:2,yield:3},corn:{seed:'cornSeed',days:3,yield:6}};
const ids=['plot1','plot2','plot3','plot4'];
function initialize(s){
 for(const id of ids)s.agriculture.plots[id]??={prepared:false,crop:null,growth:0,wateredDay:null,cycle:0};
 for(const h of Object.values(s.chickens.byId)){h.fedDay??=null;h.eggs??=1;h.lastProducedDay??=s.clock.day-1}
 if(!s.world.objects.yardSupplies){for(const [id,n] of Object.entries({radishSeed:4,cornSeed:4,feed:12}))s.inventory.items[id]=(s.inventory.items[id]||0)+n;s.world.objects.yardSupplies=true}
 s.agriculture.daily??={day:s.clock.day,prepared:0,planted:0,watered:0,fed:0,collected:0,harvested:0};
 s.agriculture.lastSummary??=null;return s;
}
function validate(s){
 const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 return ids.every(id=>{const p=s.agriculture.plots[id];return p&&typeof p.prepared==='boolean'&&(p.crop===null||Object.hasOwn(crops,p.crop))&&int(p.growth,0,p.crop?crops[p.crop].days:0)&&(p.crop===null||p.prepared)&&int(p.cycle)&&(p.wateredDay===null||int(p.wateredDay,1,s.clock.day))})&&
 ['hen1','hen2','hen3'].every(id=>s.chickens.byId[id]?.id===id)&&Object.values(s.chickens.byId).every(h=>h&&typeof h==='object'&&(h.fedDay===null||int(h.fedDay,1,s.clock.day))&&int(h.eggs,0,3)&&int(h.lastProducedDay,0,s.clock.day))&&
 s.agriculture.daily&&s.agriculture.daily.day===s.clock.day&&['prepared','planted','watered','fed','collected','harvested'].every(k=>int(s.agriculture.daily[k]))&&
 (s.agriculture.lastSummary===null||(s.agriculture.lastSummary&&int(s.agriculture.lastSummary.day,1,s.clock.day)&&['grew','ready','eggs','hungry','full'].every(k=>int(s.agriculture.lastSummary[k]))));
}
function stage(p){return !p.prepared?'bare':!p.crop?'tilled':p.growth>=crops[p.crop].days?'ready':p.growth===0?'seed':'growing'}
function act(s,type,id,choice){
 const day=s.clock.day,items=s.inventory.items,daily=s.agriculture.daily,p=s.agriculture.plots[id];
 const fail=code=>({ok:false,code});let amount=1,eventTarget=id;
 if(['prepare','plant','water','harvest'].includes(type)&&!ids.includes(id))return fail('invalid');
 switch(type){
 case 'prepare':if(p.prepared)return fail('alreadyPrepared');p.prepared=true;daily.prepared++;break;
 case 'plant':if(!p.prepared)return fail('prepareFirst');if(p.crop)return fail('occupied');if(!Object.hasOwn(crops,choice))return fail('invalid');if(!(items[crops[choice].seed]>0))return fail('noSeeds');items[crops[choice].seed]--;p.crop=choice;p.growth=0;p.cycle++;daily.planted++;break;
 case 'water':if(!p.prepared)return fail('prepareFirst');if(p.wateredDay===day)return fail('alreadyWatered');if(stage(p)==='ready')return fail('readyWater');p.wateredDay=day;daily.watered++;break;
 case 'harvest':if(stage(p)!=='ready')return fail('notReady');choice=p.crop;const c=crops[choice];items[choice]=(items[choice]||0)+c.yield;items[c.seed]=(items[c.seed]||0)+2;amount=c.yield;p.crop=null;p.growth=0;p.wateredDay=null;daily.harvested+=amount;break;
 case 'feed':{
  const hens=Object.values(s.chickens.byId).filter(h=>h.fedDay!==day);if(!hens.length)return fail('alreadyFed');
  if(!['feed','corn'].includes(choice))return fail('invalid');if((items[choice]||0)<hens.length)return fail('noFeed');
  items[choice]-=hens.length;for(const h of hens)h.fedDay=day;daily.fed+=hens.length;amount=hens.length;eventTarget='hens';break;
 }
 case 'collect':{const hens=Object.values(s.chickens.byId);amount=hens.reduce((n,h)=>n+h.eggs,0);if(!amount)return fail('noEggs');items.egg=(items.egg||0)+amount;for(const h of hens)h.eggs=0;daily.collected+=amount;eventTarget='egg';break;}
 default:return fail('invalid');
 }
 return {ok:true,code:type,amount,crop:choice,event:{id:`yard:${type}:${id}:${p?.cycle||0}:${day}`,type:'yard.'+type,target:eventTarget,amount}};
}
function sleep(s){
 const day=s.clock.day,summary={day:day+1,grew:0,ready:0,eggs:0,hungry:0,full:0};
 for(const id of ids){const p=s.agriculture.plots[id];
  if(p.crop&&stage(p)!=='ready'&&p.wateredDay===day){p.growth++;summary.grew++;if(stage(p)==='ready')summary.ready++}
  p.wateredDay=null;
 }
 // Seu Niva (Ato III): contratado, alimenta as galinhas que ficaram sem comida, ao custo de R$ 6,00 por noite e da racao/milho do estoque.
 if(s.events?.flags?.niva_contratado&&s.money>=600){const hungry=Object.values(s.chickens.byId).filter(h=>h.fedDay!==day),it=hungry.length&&(s.inventory.items.feed>=hungry.length?'feed':s.inventory.items.corn>=hungry.length?'corn':null);
  if(it){s.inventory.items[it]-=hungry.length;for(const h of hungry)h.fedDay=day;s.money-=600}}
 for(const h of Object.values(s.chickens.byId)){
  if(h.fedDay===day){if(h.eggs<3){h.eggs++;summary.eggs++}else summary.full++}else summary.hungry++;
  h.lastProducedDay=day+1;h.fedDay=null;
 }
 s.clock={...s.clock,day:day+1,minutes:480,period:'morning'};s.energy=100;
 s.agriculture.daily={day:day+1,prepared:0,planted:0,watered:0,fed:0,collected:0,harvested:0};s.agriculture.lastSummary=summary;
 return {ok:true,code:'sleep',summary,event:{id:'yard:sleep:'+day,type:'yard.sleep',target:'home'}};
}
const Farm={crops,ids,initialize,validate,stage,act,sleep};root.Farm=Farm;if(typeof module!=='undefined')module.exports=Farm;
})(typeof window==='undefined'?globalThis:window);
