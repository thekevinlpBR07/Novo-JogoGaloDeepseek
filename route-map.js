(function(root){
const streetBlocks=[{x:35,y:120,w:205,h:160},{x:410,y:325,w:200,h:145},{x:40,y:565,w:200,h:145},{x:410,y:825,w:200,h:155},{x:40,y:875,w:180,h:135}];
const depotBlocks=[{x:70,y:95,w:125,h:90},{x:440,y:95,w:125,h:90},{x:70,y:245,w:125,h:90},{x:440,y:245,w:125,h:90},{x:252,y:195,w:135,h:55}];
const workStations=Object.freeze({shelves:[{id:'workShelf0',x:132,y:198,item:0},{id:'workShelf1',x:502,y:198,item:1},{id:'workShelf2',x:132,y:348,item:2},{id:'workShelf3',x:502,y:348,item:3}],benches:[{id:'workBench0',x:248,y:430,bench:0},{id:'workBench1',x:392,y:430,bench:1}]});
const specs={street:{width:640,height:1280,blocks:streetBlocks,objects:[{id:'yardGate',x:320,y:1200},{id:'depotDoor',x:320,y:80},{id:'encapuzado',x:355,y:1085}]},depot:{width:640,height:640,blocks:depotBlocks,objects:[{id:'depotExit',x:320,y:555},{id:'tainan',x:320,y:290}]}};
function blocked(room,x,y){const r=specs[room];return !r||!Number.isFinite(x)||!Number.isFinite(y)||x<25||x>r.width-25||y<45||y>r.height-35||r.blocks.some(b=>x>b.x-7&&x<b.x+b.w+7&&y>b.y-3&&y<b.y+b.h+5)}
function objects(s){const base=specs[s.world.room].objects.filter(o=>o.id!=='encapuzado'||s.story.firstDay?.shift?.paid&&!s.story.firstDay.purchaseDay);const w=s.story.firstDay?.shift;if(s.world.room==='depot'&&s.story.firstDay?.phase==='work'&&w&&!w.paid)return base.concat(workStations.shelves,workStations.benches);return base}
const RouteMap={specs,blocked,objects,workStations,spawn:{street:{x:320,y:1170},depot:{x:320,y:510}}};root.RouteMap=RouteMap;if(typeof module!=='undefined')module.exports=RouteMap;
})(typeof window==='undefined'?globalThis:window);
