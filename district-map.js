(function(root){
'use strict';
// Bairro aberto: um unico espaco continuo. O quintal ocupa o canto superior
// esquerdo (0,0)-(640,640) e mantem as coordenadas originais, entao plantas,
// galinhas e saves antigos continuam validos sem conversao.
const TILE=32,WIDTH=2048,HEIGHT=1440,ID='bairro';
const bounds={left:16,top:16,right:1850,bottom:1424};

// Ruas (retangulos de asfalto). rua1 continua a faixa de estrada que ja
// existia nas colunas 18-19 do quintal.
const roads=[
 {id:'rua1',x:576,y:0,w:128,h:880,dir:'v',label:'RUA 1'},
 {id:'rua2',x:0,y:816,w:1856,h:64,dir:'h',label:'RUA 2'},
 {id:'rua3',x:448,y:880,w:64,h:560,dir:'v',label:'RUA 3'},
 {id:'rua4',x:0,y:1216,w:1420,h:64,dir:'h',label:'RUA 4'},
 {id:'ramal',x:1356,y:1216,w:204,h:64,dir:'h'},
 {id:'avenida',x:1888,y:0,w:160,h:1440,dir:'v',label:'AVENIDA'}
];

// Muros do quintal: as cercas antigas eram decorativas e a colisao vinha de um
// retangulo fechado. Agora a geometria vira solido de verdade, com o vao do
// portao aberto para o bairro.
const yardWalls=[
 {id:'yardTop',x:64,y:0,w:488,h:48},
 {id:'yardLeft',x:64,y:48,w:8,h:552},
 {id:'yardBottom',x:64,y:576,w:482,h:22},
 {id:'yardRightA',x:544,y:48,w:8,h:202},
 {id:'yardRightB',x:544,y:314,w:8,h:286}
];

const house=(id,x,y,w=140,h=120,extra={})=>({id,kind:'house',x,y,w,h,...extra});
const shop=(id,x,y,w=140,h=120,extra={})=>({id,kind:'shop',x,y,w,h,...extra});

const buildings=[
 // Norte da Rua 2, a oeste da Rua 1 (abaixo do quintal).
 house('casaN1',16,656,138,128),house('casaN2',170,656,138,128),
 shop('lojaN1',324,656,138,128,{sprite:'shop-bar'}),shop('lojaN2',478,656,90,128,{sprite:'shop-grocery'}),
 // Norte da Rua 2, a leste da Rua 1.
 shop('lojaN3',728,656,138,128,{sprite:'shop-garage'}),shop('lojaN4',882,656,138,128),
 house('casaN3',1036,656,138,128),house('casaN4',1190,656,138,128),
 house('casaN5',1344,656,138,128),house('casaN6',1498,656,138,128),
 // Coluna oeste: lojas, academia e casas.
 shop('lojaO1',24,904,146,120),shop('lojaO2',186,904,120,120),
 {id:'academia',kind:'gym',x:24,y:1048,w:282,h:150},
 house('casaO1',24,1312,138,112,{face:'n'}),house('casaO2',178,1312,128,112,{face:'n'}),
 // Quarteirao central, entre a Rua 3 e a coluna de lojas.
 house('casaC1',536,904,140,120),house('casaC2',692,904,140,120),
 house('casaC3',848,904,140,120),house('casaC4',1004,904,140,120),
 house('casaC5',536,1056,140,120),house('casaC6',692,1056,140,120),
 house('casaC7',848,1056,140,120),shop('lojaC1',1004,1056,140,120),
 house('casaS1',536,1312,140,112,{face:'n'}),house('casaS2',692,1312,140,112,{face:'n'}),
 house('casaS3',848,1312,140,112,{face:'n'}),house('casaS4',1004,1312,140,112,{face:'n'}),
 // Coluna leste de lojas.
 shop('lojaL1',1196,904,168,116),shop('lojaL2',1196,1036,168,116),
 // Deposito, canto inferior direito.
 {id:'deposito',kind:'depot',x:1560,y:1112,w:290,h:196}
];

// Comerciantes nomeados (favores). Ficam na calcada em frente a loja/casa correspondente.
// Personagens que passeiam (folhas animadas): vao e voltam entre dois pontos; showIf = flag que os liberta.
const walkers=[
 {id:'walk_claudineia',who:'claudineia',from:[900,810],to:[1480,810],speed:26,showIf:'E018'},
 {id:'walk_rogerinho',who:'rogerinho',from:[560,1252],to:[1300,1252],speed:32},
 {id:'walk_janilson',who:'janilson',from:[482,1000],to:[482,1400],speed:24},
 {id:'walk_sara',who:'sara',from:[100,898],to:[420,898],speed:44},
 {id:'walk_niva',who:'niva',from:[480,920],to:[480,1180],speed:22,showIf:'niva_contratado'}
];
// Vida da vila: cada personagem so aparece quando tem sprite pronto (RouteArt.has). Parados = moradores; andando = walkers.
const villagers=[
 {id:'vil_beto',who:'beto',x:1172,y:897},
 {id:'vil_marivaldo',who:'marivaldo',x:735,y:428},

 {id:'vil_tainan',who:'tainan',x:1640,y:1338},
 {id:'vil_principe',who:'principe',x:1690,y:1046},
 {id:'vil_renato',who:'renato',x:1560,y:1165},
 {id:'vil_fred',who:'fred',x:1600,y:1170},
 {id:'vil_renatinho',who:'renatinho',x:1582,y:1178},
 {id:'vil_bruno',who:'bruno',x:1500,y:1292},
 {id:'vil_juninho',who:'juninho',x:1282,y:1174},
 {id:'vil_kazao',who:'kazao',x:1335,y:1042}
];const npcs=[
 {id:'npc_zorino',who:'zorino',x:393,y:806},
 {id:'npc_deni',who:'deni',x:523,y:806},
 {id:'npc_juliana',who:'juliana',x:797,y:806},
 {id:'npc_dolores',who:'dolores',x:85,y:806}
];

// Pontos de interacao do bairro. IDs terminados em numero caem no mesmo texto.
const spots=[
 {id:'depotDoor',x:1705,y:1332},
 {id:'cityGate',x:1798,y:848},
 {id:'busStop',x:1790,y:1022},
 {id:'gym',x:165,y:1210},
 {id:'emptyLot',x:1100,y:420}
];
for(const n of npcs)spots.push({id:n.id,x:n.x,y:n.y});
for(const b of buildings){
 const doorY=b.face==='n'?b.y-14:b.y+b.h+14;
 if(b.kind==='house')spots.push({id:'houseDoor',x:b.x+b.w/2,y:doorY});
 if(b.kind==='shop')spots.push({id:'shopDoor',x:b.x+b.w/2,y:doorY});
}

// Mobiliario urbano solido (abrigo do ponto, portao). Sem postes/fiacao eletrica.
const props=[
 {id:'busShelter',kind:'shelter',x:1756,y:952,w:96,h:52},
 {id:'gateFrame',kind:'gate',x:1824,y:800,w:32,h:96}
];
const poles=[];

// Mobiliario decorativo sem colisao: hidrante, lixeiras, placas, postes de luz,
// bancos, banca de jornal e canteiros.
const decor=[
 {id:'hydrant1',kind:'hydrant',x:604,y:800},
 {id:'binBusA',kind:'bin',color:'green',x:1738,y:1006},
 {id:'binBusB',kind:'bin',color:'orange',x:1752,y:1006},
 {id:'binDepot',kind:'bin',color:'green',x:1544,y:1300},
 {id:'signRua1',kind:'plate',x:590,y:60},
 {id:'signRua2',kind:'plate',x:60,y:800},
 {id:'stop1',kind:'stop',x:530,y:894},
 {id:'stop2',kind:'stop',x:1372,y:1296},
 {id:'lamp1',kind:'lamp',x:162,y:800},{id:'lamp2',kind:'lamp',x:1028,y:800},
 {id:'lamp3',kind:'lamp',x:1336,y:800},{id:'lamp4',kind:'lamp',x:1636,y:800},
 {id:'lamp5',kind:'lamp',x:330,y:1228+62},{id:'lamp6',kind:'lamp',x:1100,y:1290},
 {id:'lamp7',kind:'lamp',x:566,y:400},{id:'lamp8',kind:'lamp',x:1690,y:1132},
 {id:'bench1',kind:'bench',x:1690,y:1012},{id:'bench2',kind:'bench',x:720,y:826},
 {id:'bench3',kind:'bench',x:1420,y:826},
 {id:'news1',kind:'news',x:1660,y:940},
 {id:'bed1',kind:'bed',x:1000,y:560},{id:'bed2',kind:'bed',x:1200,y:610},{id:'bed3',kind:'bed',x:800,y:470},
 {id:'bed4',kind:'bed',x:1230,y:1190},
 {id:'manhole1',kind:'manhole',x:640,y:848},{id:'manhole2',kind:'manhole',x:480,y:1100},{id:'manhole3',kind:'manhole',x:900,y:1248}
];

// Vegetacao: sorteio com rejeicao. Nada nasce sobre ruas/calcadas, predios,
// mobiliario ou em cima de outra planta.
const flora=[];
(function(){
 let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 const zones=[[736,40,1080,520],[1390,880,330,240],[10,60,50,500],[1160,1300,380,110],[1560,20,290,600],[1200,1150,340,60],[16,1440-140,0,0]];
 const clear=(x,y,w,h)=>{
  const m=26;
  if(roads.some(r=>r.id!=='avenida'&&x+w>r.x-m&&x<r.x+r.w+m&&y+h>r.y-m&&y<r.y+r.h+m))return false;
  if(x+w>1850||x<16||y+h>1424||y<16)return false;
  if(buildings.some(b=>x+w>b.x-16&&x<b.x+b.w+16&&y+h>b.y-70&&y<b.y+b.h+20))return false;
  if(yardWalls.some(b=>x+w>b.x-8&&x<b.x+b.w+8&&y+h>b.y-8&&y<b.y+b.h+8))return false;
  if(props.some(b=>x+w>b.x-20&&x<b.x+b.w+20&&y+h>b.y-40&&y<b.y+b.h+30))return false;
  if(decor.some(d=>Math.abs(d.x-(x+w/2))<40&&Math.abs(d.y-(y+h))<34))return false;
  if(spots.some(s=>Math.abs(s.x-(x+w/2))<44&&Math.abs(s.y-(y+h))<44))return false;
  return !flora.some(f=>Math.abs(f.x+f.w/2-(x+w/2))<(f.w+w)*.85&&Math.abs(f.y+f.h-(y+h))<32);
 };
 for(const [zx,zy,zw,zh] of zones){
  const tries=Math.round(zw*zh/6500);
  for(let i=0;i<tries;i++){
   const r=rnd(),kind=r<.34?'tree':r<.42?'palm':'bush';
   const variant=Math.floor(rnd()*4),scale=.85+rnd()*.3,tv=Math.floor(rnd()*12);
   const f=kind==='palm'?{w:46,h:92}:kind==='tree'?{w:56,h:60}
    :variant%3===0?{w:66,h:30}:variant%3===1?{w:44,h:40}:{w:34,h:46};
   const x=zx+rnd()*zw,y=zy+rnd()*zh;
   if(!clear(x,y,f.w,f.h))continue;
   flora.push({id:'flora'+flora.length,kind,variant,scale,tv,flip:rnd()>.5,x,y,...f});
  }
 }
})();
const solids=()=>[
 ...yardWalls.map(w=>({...w})),
 ...buildings.map(b=>({id:b.id,x:b.x,y:b.y,w:b.w,h:b.h})),
 ...props.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h})),
 ...flora.filter(f=>f.kind==='tree').map(f=>({id:f.id,x:f.x+f.w*.38,y:f.y+f.h-14,w:f.w*.24,h:12}))
];

const roadAt=(x,y)=>roads.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)||null;
function terrain(x,y){
 const r=roadAt(x,y);if(r)return r.id==='avenida'?'avenue':'road';
 if(roads.some(r=>r.id!=='avenida'&&x>=r.x-14&&x<r.x+r.w+14&&y>=r.y-14&&y<r.y+r.h+14))return 'sidewalk';
 if(x<640&&y<640)return 'yard';
 return 'dirt';
}
// Colisao do bairro. O quintal continua com as mesmas regras de margem usadas
// pelo motor original (7 px lateral, 3 acima, 5 abaixo).
function blocked(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return true;
 if(x<bounds.left||y<bounds.top||x>bounds.right||y>bounds.bottom)return true;
 return solids().some(b=>x>b.x-7&&x<b.x+b.w+7&&y>b.y-3&&y<b.y+b.h+5);
}
function interactions(s){
 const list=spots.map(o=>({...o}));
 const d=s?.story?.firstDay;
 if(d?.shift?.paid&&!d.purchaseDay)list.push({id:'encapuzado',x:662,y:534});
 return list;
}
const inYard=(x,y)=>x<640&&y<640;
const DistrictMap={ID,TILE,WIDTH,HEIGHT,bounds,roads,buildings,props,poles,flora,decor,yardWalls,spots,npcs,walkers,villagers,
 solids,terrain,roadAt,blocked,interactions,inYard,
 spawn:{x:302,y:295},gateExit:{x:600,y:282},depotReturn:{x:1705,y:1352}};
root.DistrictMap=DistrictMap;if(typeof module!=='undefined')module.exports=DistrictMap;
})(typeof window==='undefined'?globalThis:window);
