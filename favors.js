(function(root){
'use strict';
const node=typeof module!=='undefined',Flags=node?require('./events.js'):root.EventFlags,FirstDay=node?require('./first-day.js'):root.FirstDay;
// Favores do bairro (missoes secundarias): comerciantes pedem producao do quintal e pagam ACIMA do mercado.
// Um pedido por comerciante por dia; produzir (ovo, rabanete, milho) vira renda de apoio e relacao com o bairro.
const DEFS=Object.freeze({
 deni:{item:'egg',count:6,unit:120,items:{}},          // ovos: mercado paga 80 por ovo
 zorino:{item:'radish',count:4,unit:100,items:{}},     // rabanete: mercado paga 40
 juliana:{item:'corn',count:3,unit:0,items:{feed:3}},   // milho -> racao (troca; sem dinheiro)
 dolores:null                                            // so fofoca (dica do dia)
});
const TIPS=['tip0','tip1','tip2','tip3','tip4','tip5'];
const unlocked=s=>s.story?.firstDay?.phase==='complete';
const ids=()=>Object.keys(DEFS);
const tipFor=s=>TIPS[(s.clock.day-1)%TIPS.length];
function order(s,id){const d=DEFS[id];if(!d)return null;const have=s.inventory.items[d.item]||0,key='favor_'+id+'_d'+s.clock.day,done=Object.hasOwn(s.world.objects.economy?.ledger||{},key);const react=s.story?.firstDay?.memory?.bairro_reage?1.25:1;return {id,item:d.item,count:d.count,have,done,reward:Math.round(d.count*d.unit*react),react:react>1,items:d.items,ready:have>=d.count&&!done}}
function meet(s,id){return Flags.set(s,'met_'+id)}
function deliver(s,id){const d=DEFS[id];if(!d||!unlocked(s))return false;const o=order(s,id);if(!o.ready)return false;const key='favor_'+id+'_d'+s.clock.day;
 if(!FirstDay.transact(s,key,o.reward))return false;s.inventory.items[d.item]-=d.count;if(s.inventory.items[d.item]===0)delete s.inventory.items[d.item];
 for(const [item,n] of Object.entries(d.items))s.inventory.items[item]=(s.inventory.items[item]||0)+n;
 Flags.set(s,'favor_'+id+'_feito');return true}
const Favors={DEFS,ids,unlocked,order,meet,deliver,tipFor};
root.Favors=Favors;if(node)module.exports=Favors;
})(typeof window==='undefined'?globalThis:window);
