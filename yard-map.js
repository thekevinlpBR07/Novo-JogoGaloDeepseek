(function(root){
'use strict';
const TILE=32,SIZE=20,ID='quintal',REVISION=1;
const terrainTypes=['dirt','grass','road','soil'];
const bounds={left:72,top:48,right:530,bottom:570};
// Tile anchors plus offsets align irregular art and sub-tile hitboxes.
const entities=[
 {id:'home',kind:'house',tile:[3,0],offset:[-6,14],size:[214,166],footprint:[0,10,214,156],interaction:{id:'home',offset:[138,181]}},
 {id:'coop',kind:'coop',tile:[11,1],offset:[21,22],size:[129,112],footprint:[0,26,129,86],interaction:{id:'coop',offset:[52,126]}},
 {id:'barrel',kind:'barrel',tile:[3,10],offset:[15,10],size:[33,48],footprint:[2,8,30,40],interaction:{id:'well',offset:[17,62]}},
 ...Array.from({length:4},(_,i)=>({id:'plot'+(i+1),kind:'plot',tile:[14+i%2,15+Math.floor(i/2)],offset:[0,0],size:[32,32],interaction:{id:'plot',offset:[16,16]},stateId:'plot'+(i+1)})),
 {id:'feed',kind:'feed',tile:[14,6],offset:[13,7],size:[27,12],interaction:{id:'feed',offset:[13,6]}},
 {id:'nest1',kind:'nest',tile:[12,5],offset:[3,17],size:[21,16],stateId:'hen1',interaction:{id:'nest',offset:[10,8]}},
 {id:'nest2',kind:'nest',tile:[12,5],offset:[28,17],size:[21,16],stateId:'hen2',interaction:{id:'nest',offset:[10,8]}},
 {id:'nest3',kind:'nest',tile:[13,5],offset:[21,17],size:[21,16],stateId:'hen3',interaction:{id:'nest',offset:[10,8]}},
 {id:'friend',kind:'actorAnchor',tile:[11,7],offset:[18,6],interaction:{id:'friend',offset:[0,0]}},
 {id:'hens',kind:'actorAnchor',tile:[12,6],offset:[26,16]},
 {id:'exitSign',kind:'sign',tile:[16,8],offset:[-1,0],size:[25,20],interaction:{id:'sign',offset:[9,19]}},
 {id:'gate',kind:'gate',tile:[17,8],offset:[0,-6],size:[10,64]}
];
for(let i=0;i<16;i++){
 const y=58+i*32;
 entities.push({id:'fenceLeft'+i,kind:'fenceV',tile:[2,Math.floor(y/32)],offset:[0,y%32],size:[8,32]});
 if(i<6||i>7)entities.push({id:'fenceRight'+i,kind:'fenceV',tile:[17,Math.floor(y/32)],offset:[0,y%32],size:[8,32]});
}
for(let i=0;i<15;i++)entities.push({id:'fenceBottom'+i,kind:'fenceH',tile:[2+i,18],offset:[0,0],size:[34,22]});
const plants=[['banana',0,110,74,98],['tree',0,35,98,133],['tree',320,-70,84,112],['tree',486,4,100,133],['banana',2,455,75,100],['tree',21,528,110,142],['tree',176,553,110,143],['tree',286,535,102,136],['banana',409,560,88,118],['tree',486,538,96,130],['tree',512,406,66,88],['tree',22,312,60,80]];
plants.forEach(([kind,x,y,w,h],i)=>entities.push({id:'borderPlant'+i,kind,tile:[Math.floor(x/32),Math.floor(y/32)],offset:[x%32,y%32],size:[w,h]}));
// Ground is authored data, not a sliced photograph.
const rows=[
 'ggggggggggggggggggrr','gggddddddgggggggggrr','gggddddddggdddddggrr',
 'gggdddddddggddddggrr','gggdddddddddddddggrr','gggdddddddddddddggrr',
 'ggddddddddddddddggrr','ggddddddddddddddggrr','ggddddddddddddddddrr',
 'gggdddddddddddddddrr','gggdddddddddddddggrr','gggdddddddddddddggrr',
 'ggggddddddddddddggrr','ggggddddddddddddggrr','gggggddddddddddgggrr',
 'ggggggddddddddggggrr','gggggggdddddggggggrr','ggggggggdddgggggggrr',
 'ggggggggggggggggggrr','ggggggggggggggggggrr'
];
// Locked chunks share coordinates with the yard; no expansion unlock is exposed.
const regions=[{id:'yard',x:0,y:0,width:20,height:20,locked:false},{id:'west',x:-10,y:0,width:10,height:20,locked:true},{id:'south',x:0,y:20,width:20,height:10,locked:true}];
const regionAt=(col,row)=>regions.find(r=>col>=r.x&&row>=r.y&&col<r.x+r.width&&row<r.y+r.height);
const garden={origin:[10,11],width:6,height:6,initialIds:['plot1','plot2','plot3','plot4']};
const expansionTiles=regions.filter(r=>r.locked).flatMap(r=>Array.from({length:r.width*r.height},(_,i)=>({col:r.x+i%r.width,row:r.y+Math.floor(i/r.width),type:'grass'})));
const codes={d:'dirt',g:'grass',r:'road',s:'soil'},tiles=rows.flatMap(row=>[...row].map(c=>codes[c]));
const byId=Object.fromEntries(entities.map(e=>[e.id,e]));
function create(){return {id:ID,revision:REVISION,tiles:{},entities:{}}}
function layout(s){return s?.world?.map||s||create()}
function initialize(s){s.world.map??=create();return s}
function validate(m){
 if(!m||m.id!==ID||m.revision!==REVISION||!m.tiles||Array.isArray(m.tiles)||!m.entities||Array.isArray(m.entities))return false;
 if(typeof m.tiles!=='object'||typeof m.entities!=='object')return false;
 const pair=(v,min,max)=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isSafeInteger(n)&&n>=min&&n<=max);
 return Object.entries(m.tiles).every(([key,value])=>/^-?\d+:-?\d+$/.test(key)&&!!regionAt(...key.split(':').map(Number))&&terrainTypes.includes(value))&&
 Object.entries(m.entities).every(([id,e])=>Object.hasOwn(byId,id)&&e&&Object.keys(e).every(k=>['tile','offset'].includes(k))&&pair(e.tile,0,19)&&pair(e.offset,-31,31));
}
function terrain(s,col,row){if(!regionAt(col,row))return 'grass';return layout(s).tiles[col+':'+row]||(col>=0&&row<20?tiles[row*SIZE+col]:'grass')}
function resolve(s,id){const base=byId[id];if(!base)return null;const change=layout(s).entities[id]||{},tile=change.tile||base.tile,offset=change.offset||base.offset;
 const x=tile[0]*TILE+offset[0],y=tile[1]*TILE+offset[1];return {...base,tile,offset,x,y,sortY:y+(base.size?.[1]||0)};
}
function all(s){return entities.map(e=>resolve(s,e.id))}
function blocks(s){return all(s).filter(e=>e.footprint).map(e=>({id:e.id,x:e.x+e.footprint[0],y:e.y+e.footprint[1],w:e.footprint[2],h:e.footprint[3]}))}
function interactions(s){return all(s).filter(e=>e.interaction).map(e=>({id:e.interaction.id,entityId:e.id,plotId:e.stateId,x:e.x+e.interaction.offset[0],y:e.y+e.interaction.offset[1]}))}
function setTile(s,col,row,type){if(!Number.isInteger(col)||!Number.isInteger(row)||!regionAt(col,row)||!terrainTypes.includes(type))throw Error('Invalid tile');s.world.map.tiles[col+':'+row]=type}
function moveEntity(s,id,tile,offset=[0,0]){const m=JSON.parse(JSON.stringify(s.world.map));m.entities[id]={tile,offset};if(!validate(m))throw Error('Invalid entity placement');s.world.map=m}
function signature(s){return JSON.stringify(layout(s))}
const YardMap={regions,regionAt,expansionTiles,garden,ID,REVISION,TILE,SIZE,entities,tiles,terrainTypes,bounds,create,initialize,validate,terrain,resolve,all,blocks,interactions,setTile,moveEntity,signature};
root.YardMap=YardMap;if(typeof module!=='undefined')module.exports=YardMap;
})(typeof window==='undefined'?globalThis:window);
