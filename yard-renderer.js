const ModularYard=(()=>{
 'use strict';
 const atlas=new Image(),terrainImage=new Image(),sprites={},materials={},plotCache=new Map();
 let detailReady=0,spritesReady=false,terrainReady=false,failed=false,groundCache=null,groundKey='',loadRevision=0;
 const frames={
  house:[12,93,346,277],coop:[374,132,295,256],tree:[674,31,283,372],banana:[957,62,296,340],
  barrel:[94,423,153,218],feedFull:[371,508,249,110],feedEmpty:[682,509,244,109],nest:[992,475,215,160],
  radish:[12,685,310,298],corn:[362,637,226,344],radishYoung:[680,746,245,219],cornYoung:[998,693,229,271],
  sprout:[89,1053,131,139],weeds:[353,988,260,245],rocks:[697,1038,223,168],eggs:[994,1046,237,163]
 };
 const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
 function loadError(){failed=true;console.error('Modular yard asset failed to load')}
 atlas.onload=()=>{
  // Runtime color key is a standard sprite import step; the source atlas stays untouched.
  const clean=makeCanvas(atlas.naturalWidth,atlas.naturalHeight),c=clean.getContext('2d',{willReadFrequently:true});c.drawImage(atlas,0,0);
  const pixels=c.getImageData(0,0,clean.width,clean.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const magenta=Math.min(d[i],d[i+2])-d[i+1];if(magenta>65&&d[i]>110&&d[i+2]>110)d[i+3]=0;else if(magenta>25){d[i+3]=Math.round(255*(1-(magenta-25)/65));d[i]=Math.min(d[i],d[i+1]+25);d[i+2]=Math.min(d[i+2],d[i+1]+25)}}
  c.putImageData(pixels,0,0);
  for(const [id,b] of Object.entries(frames)){const sprite=makeCanvas(b[2],b[3]);sprite.getContext('2d').drawImage(clean,...b,0,0,b[2],b[3]);sprites[id]=sprite}
  spritesReady=true;loadRevision++;plotCache.clear();
 };
 function detail(src,parts){
  const img=new Image();img.onerror=loadError;img.onload=()=>{
   const clean=makeCanvas(img.naturalWidth,img.naturalHeight),c=clean.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
   const data=c.getImageData(0,0,clean.width,clean.height),d=data.data;
   for(let i=0;i<d.length;i+=4)if(Math.min(d[i],d[i+2])-d[i+1]>55&&d[i]>110&&d[i+2]>110)d[i+3]=0;
   c.putImageData(data,0,0);
   for(const [id,q] of Object.entries(parts)){
    const sx=Math.floor(q[0]*clean.width),sy=Math.floor(q[1]*clean.height),sw=Math.floor(q[2]*clean.width),sh=Math.floor(q[3]*clean.height);
    let left=sw,top=sh,right=0,bottom=0;
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(d[((sy+y)*clean.width+sx+x)*4+3]>160){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
    const out=makeCanvas(right-left+1,bottom-top+1);out.getContext('2d').drawImage(clean,sx+left,sy+top,out.width,out.height,0,0,out.width,out.height);sprites[id]=out;
   }
   detailReady++;loadRevision++;
  };img.src=src;
 }
 detail('assets/modular/house-detail.png',{houseHD:[0,0,1,1]});
 detail('assets/modular/fence-kit.png',{fenceH:[0,0,.5,.5],fenceV:[.5,0,.5,.5],gateV:[0,.5,.5,.5]});
 terrainImage.onload=()=>{
  // Feathered, unreflected samples prevent mirror motifs and hard tile seams.
  for(const [id,q] of Object.entries({dirt:[0,0],grass:[1,0],road:[0,1],soil:[1,1]})){
   const patch=makeCanvas(1536,1536),c=patch.getContext('2d'),n=terrainImage.naturalWidth/2;
   c.drawImage(terrainImage,q[0]*n+8,q[1]*n+8,n-16,n-16,0,0,1536,1536);
   const stamp=makeCanvas(256,256),sc=stamp.getContext('2d');
   for(let y=-1;y<9;y++)for(let x=-1;x<9;x++){
    sc.clearRect(0,0,256,256);sc.globalCompositeOperation='source-over';
    sc.drawImage(terrainImage,q[0]*n+8+noise(x,y)*(n-280),q[1]*n+8+noise(y+21,x)*(n-280),256,256,0,0,256,256);
    sc.globalCompositeOperation='destination-in';const mask=sc.createRadialGradient(128,128,55,128,128,128);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#fff0');sc.fillStyle=mask;sc.fillRect(0,0,256,256);
    c.drawImage(stamp,x*192-40+noise(x+3,y)*40,y*192-40+noise(y,x+9)*40);
   }
   materials[id]=patch;
  }
  terrainReady=true;loadRevision++;groundCache=null;plotCache.clear();
 };
 atlas.onerror=terrainImage.onerror=loadError;
 atlas.src='assets/modular/objects-source.png';terrainImage.src='assets/modular/terrain-natural.png';
 function sprite(c,id,x,y,w,h,shadow=false){
  if(!sprites[id])return;
  if(shadow){c.save();c.fillStyle='#17231535';c.beginPath();c.ellipse(x+w*.55,y+h*.94,w*.43,Math.min(8,h*.08),0,0,Math.PI*2);c.fill();c.restore()}
  c.drawImage(sprites[id],x,y,w,h);
 }
 function material(c,type,x,y,w,h,worldX=x,worldY=y){
  const source=materials[type];if(!source){c.fillStyle={dirt:'#a77b4c',grass:'#4e6231',road:'#b49365',soil:'#58412c'}[type];c.fillRect(x,y,w,h);return}
  // 2 source pixels per world unit; wrapped chunks never stretch a whole scene.
  for(let dy=0;dy<h;){let sy=((worldY+dy)*2%1536+1536)%1536,dh=Math.min(h-dy,(1536-sy)/2);
   for(let dx=0;dx<w;){let sx=((worldX+dx)*2%1536+1536)%1536,dw=Math.min(w-dx,(1536-sx)/2);c.drawImage(source,sx,sy,dw*2,dh*2,x+dx,y+dy,dw,dh);dx+=dw}dy+=dh;
  }
 }
 function ground(s){
  const key=YardMap.signature(s)+':'+loadRevision;if(groundCache&&key===groundKey)return groundCache;
  groundKey=key;groundCache=makeCanvas(1280,1280);const c=groundCache.getContext('2d');c.scale(2,2);
  for(let row=0;row<20;row++)for(let col=0;col<20;col++)material(c,'dirt',col*32,row*32,32,32);
  if(!terrainReady)return groundCache;
  const tile=makeCanvas(64,64),tc=tile.getContext('2d');
  const terrain=Array.from({length:22},(_,y)=>Array.from({length:22},(_,x)=>YardMap.terrain(s,x-1,y-1)));
  const sample=(type,x,y)=>terrain[Math.max(0,Math.min(21,y+1))][Math.max(0,Math.min(21,x+1))]===type?1:0;
  const smooth=t=>t*t*(3-2*t);
  for(const type of ['grass','soil','road'])for(let row=0;row<20;row++)for(let col=0;col<20;col++){
   let nearby=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(sample(type,col+dx,row+dy))nearby=true;
   if(!nearby)continue;
   tc.setTransform(2,0,0,2,0,0);tc.clearRect(0,0,32,32);material(tc,type,0,0,32,32,col*32,row*32);
   const data=tc.getImageData(0,0,64,64),d=data.data;
   const cells=Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>sample(type,col+x-1,row+y-1)));
   for(let py=0;py<64;py++)for(let px=0;px<64;px++){
    const x=(px+.5)/2,y=(py+.5)/2,gx=x/32+.5,gy=y/32+.5,ix=Math.floor(gx),iy=Math.floor(gy),fx=smooth(gx-ix),fy=smooth(gy-iy);
    const a=cells[iy][ix]*(1-fx)+cells[iy][ix+1]*fx,b=cells[iy+1][ix]*(1-fx)+cells[iy+1][ix+1]*fx;
    let weight=a*(1-fy)+b*fy;
    if(weight>0&&weight<1){const wx=col*32+x,wy=row*32+y;weight+=(Math.sin(wx*.31+wy*.17)+Math.cos(wy*.37-wx*.12))*.045+(noise(wx,wy)-.5)*.09}
    d[(py*64+px)*4+3]=Math.round(255*Math.max(0,Math.min(1,(weight-.32)/.36)));
   }
   tc.putImageData(data,0,0);c.drawImage(tile,0,0,64,64,col*32,row*32,32,32);
  }
  return groundCache;
 }
 function wood(c,x,y,w,h){
  c.fillStyle='#604a33';c.fillRect(x,y,w,h);
  if(sprites.nest){c.save();c.translate(x,y);if(h>w){c.translate(w,0);c.rotate(Math.PI/2);c.drawImage(sprites.nest,20,130,170,16,0,0,h,w)}else c.drawImage(sprites.nest,20,130,170,16,0,0,w,h);c.restore()}
  c.fillStyle='#b0996b';c.fillRect(x,y,w,Math.min(.5,h));
  c.fillStyle='#291f1844';for(let i=0;i<Math.ceil(w*h/4);i++){const a=noise(i,x)*w,b=noise(i,y)*h;c.fillRect(x+a,y+b,Math.min(w,2),.4)}
  c.fillStyle='#342e25';for(const a of [.1,.9])c.fillRect(x+w*a,y+h*.4,.7,.7);
 }
 function paintPlot(c,p,wet,index=0){
  c.save();c.scale(4,4);const stage=Farm.stage(p);
  material(c,'soil',1,1,30,30,index*37,0);if(wet){c.fillStyle='#12191645';c.fillRect(1,1,30,30)}
  c.strokeStyle=wet?'#211b1799':'#211b1755';c.lineWidth=.9;
  if(p.prepared)for(let y=12;y<32;y+=9){c.beginPath();c.moveTo(3,y);c.bezierCurveTo(12,y-1,22,y+1,30,y);c.stroke()}

  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=3+col*14,y=1+row*14;
   if(stage==='bare'){if(row===0&&col===index%2)sprite(c,'weeds',x+noise(index,2)*6,y+7,6,6);}
   else if(stage==='seed')sprite(c,'sprout',x+3,y+8,6,7);
   else if(p.crop){const mature=stage==='ready',id=p.crop+(mature?'':'Young'),h=p.crop==='corn'?(mature?26:18):(mature?16:12);sprite(c,id,x-1,y+17-h,15,h,true)}
  }
  c.restore();
 }
 function plot(p,wet,index=0){
  const key=[Farm.stage(p),p.crop,p.growth,wet,index,loadRevision].join(':');
  if(!plotCache.has(key)){const out=makeCanvas(256,256),c=out.getContext('2d');c.scale(2,2);paintPlot(c,p,wet,index);plotCache.set(key,out)}return plotCache.get(key);
 }
 function fence(c,e){
  if(e.kind==='fenceV')sprite(c,'fenceV',e.x-3,e.y-18,9,50);
  else sprite(c,'fenceH',e.x-2,e.y-18,37,22);
 }
 function entity(c,e,s){
  const {x,y,size}=e;if(e.kind==='actorAnchor')return;
  if(e.kind==='plot'){c.drawImage(plot(s.agriculture.plots[e.stateId],s.agriculture.plots[e.stateId].wateredDay===s.clock.day,Number(e.stateId.slice(-1))-1),x,y,...size);return}
  if(e.kind==='feed'){sprite(c,Object.values(s.chickens.byId).every(h=>h.fedDay===s.clock.day)?'feedFull':'feedEmpty',x,y,...size,true);return}
  if(e.kind==='nest'){sprite(c,'nest',x,y,...size,true);const count=s.chickens.byId[e.stateId]?.eggs||0;for(let i=0;i<count;i++){const egg=c.createRadialGradient(x+5+i*5,y+5,.2,x+6+i*5,y+6,3);egg.addColorStop(0,'#fff0cb');egg.addColorStop(1,'#b49b71');c.fillStyle=egg;c.beginPath();c.ellipse(x+5+i*5,y+6,2,2.8,-.2,0,Math.PI*2);c.fill()}return}
  if(e.kind.startsWith('fence')){fence(c,e);return}
  if(e.kind==='gate'){sprite(c,'gateV',x-4,y-18,12,82);return}
  if(e.kind==='sign'){wood(c,x+11,y+5,3,19);wood(c,x,y,25,12);c.strokeStyle='#d9c799';c.lineWidth=1.2;c.beginPath();c.moveTo(x+5,y+5);c.lineTo(x+19,y+5);c.lineTo(x+15,y+2);c.moveTo(x+19,y+5);c.lineTo(x+15,y+8);c.stroke();return}
  sprite(c,e.kind==='house'&&sprites.houseHD?'houseHD':e.kind,x,y,...size,true);
 }
 function objects(s){return YardMap.all(s).filter(e=>e.kind!=='actorAnchor').map(e=>({id:e.id,y:e.sortY,draw:c=>entity(c,e,s)}))}
 function drawGround(c,s){c.save();c.imageSmoothingEnabled=true;c.drawImage(ground(s),0,0,640,640);c.restore()}
 function drawObject(c,entry){c.save();c.imageSmoothingEnabled=true;entry.draw(c);c.restore()}
 function overlay(c,s){
  if(yardEffect&&performance.now()-yardEffect.time<1200){const t=(performance.now()-yardEffect.time)/1200;const colors={water:'#b3d7d5',harvest:'#f4d689',prepare:'#a9885f',plant:'#7ec27e'};c.fillStyle=colors[yardEffect.type]||'#f4d689';for(let i=0;i<9;i++)c.fillRect(yardEffect.x+Math.sin(i*2)*t*17,yardEffect.y-20-t*20+i%3,1.5,1.5)}
  if(!debug)return;c.save();c.strokeStyle='#ffec8580';c.lineWidth=.4;for(let i=0;i<=20;i++){c.beginPath();c.moveTo(i*32,0);c.lineTo(i*32,640);c.moveTo(0,i*32);c.lineTo(640,i*32);c.stroke()}
  for(const b of YardMap.blocks(s)){c.strokeStyle='#ff7070';c.strokeRect(b.x,b.y,b.w,b.h)}
  for(const o of YardMap.interactions(s)){c.fillStyle='#9dfbd8';c.fillRect(o.x-2,o.y-2,4,4);c.font='7px sans-serif';c.fillText(o.entityId,o.x+3,o.y)}c.restore();
 }
 let debug=false;
 window.addEventListener('keydown',e=>{if(e.key==='F3'&&!e.repeat){e.preventDefault();debug=!debug}});
 return {drawGround,objects,drawObject,overlay,plot,ready:()=>detailReady===2&&spritesReady&&terrainReady&&!!groundCache&&groundKey.endsWith(':'+loadRevision),failed:()=>failed,frames,materials,sprites,ground,entity,get debug(){return debug}};
})();
