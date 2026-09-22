const DistrictArt=(()=>{
 'use strict';
 const M=typeof DistrictMap!=='undefined'?DistrictMap:null;
 let ground=null,ground_road=null;
 const rand=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};

 // --- Sprites gerados (fundo ja recortado em disco) --------------------------
 // Carregados sob demanda; enquanto nao chegam, cada funcao cai no desenho
 // procedural equivalente, entao o bairro nunca fica com buracos.
 const IMG={};
 function loadImage(id,src){
  const img=new Image();img.onload=()=>{img.ready=true;ground=null};img.onerror=()=>{img.ready=false};
  img.src=src.includes('/')?src:'assets/district/'+src;IMG[id]=img;
 }
 // Casas 5 e 6 vem de uma folha maior (canto e sobrado) e pesam mais na
 // escolha se entrarem com o mesmo peso das casas simples; ponderadas menor
 // ate termos variantes desenhadas para esses lotes.
 ['house1','house2','house3','house4','house5','house6'].forEach(id=>loadImage(id,id+'.png'));
 ['shop-barber','shop-pharmacy','shop-gym','shop-bar','shop-garage','shop-kiosk','shop-grocery'].forEach(id=>loadImage(id,id+'.png'));
 ['flora-palm','flora-tree','flora-tree-bloom','flora-mango','flora-slim','flora-dead','flora-banana','flora-ipe'].forEach(id=>loadImage(id,id+'.png'));
 ['prop-bin-green','prop-bin-orange','prop-busshelter','prop-gate-closed','prop-gate-open'].forEach(id=>loadImage(id,id+'.png'));
 ['terrain-sidewalk','terrain-sidewalk-cracked','terrain-asphalt'].forEach(id=>loadImage(id,id+'.png'));
 loadImage('terrain-natural','assets/modular/terrain-natural.png');
 ['shop-depot','flora-hedge','flora-weeds','flora-palm-pot','prop-lamp','prop-bench','prop-newsstand','prop-flowerbed','prop-manhole','prop-stopsign'].forEach(id=>loadImage(id,id+'.png'));
 // Variante pre-renderizada (espelho + filtro de cor), guardada em cache.
 const VAR={};
 function variant(id,flip,filter){
  const img=IMG[id];if(!img||!img.ready||!img.naturalWidth)return null;
  const key=id+'|'+flip+'|'+filter;if(VAR[key])return VAR[key];
  const cv=canvas(img.naturalWidth,img.naturalHeight),k=cv.getContext('2d');
  if(filter)k.filter=filter;
  if(flip){k.translate(cv.width,0);k.scale(-1,1)}
  k.drawImage(img,0,0);cv.ready=true;cv.naturalWidth=cv.width;cv.naturalHeight=cv.height;
  return VAR[key]=cv;
 }
 const TREE_TINTS=['','hue-rotate(-18deg) saturate(1.1)','hue-rotate(14deg) brightness(1.08)','saturate(.8) brightness(.92)'];
 // Casas/lojas: escolha gulosa evitando repetir o sprite de vizinhos proximos.
 const LOT={};
 function assignLots(){
  if(LOT.done)return;LOT.done=true;
  const houseSet=['house1','house2','house3','house4','house5','house6'],
        shopSet=['shop-grocery','shop-bar','shop-barber','shop-garage','shop-kiosk','shop-pharmacy'];
  const tints=['','hue-rotate(20deg)','hue-rotate(-25deg) saturate(1.1)','saturate(.85) brightness(1.06)','hue-rotate(50deg)'];
  const used={},count={};
  // Lojas com dono nomeado (favores) tem sprite fixo; entram na conta para os vizinhos nao repetirem.
  for(const b of M.buildings)if(b.sprite){LOT[b.id]={id:b.sprite,flip:false,tint:''};count[b.sprite]=(count[b.sprite]||0)+1}
  for(const b of M.buildings){
   if(LOT[b.id])continue;
   if(b.kind!=='house'&&b.kind!=='shop')continue;
   const set=b.kind==='house'?houseSet:shopSet;
   const near=M.buildings.filter(o=>o!==b&&LOT[o.id]&&Math.hypot(o.x-b.x,o.y-b.y)<330).map(o=>LOT[o.id].id);
   let opts=set.filter(s=>!near.includes(s));if(!opts.length)opts=set;
   opts.sort((a,c)=>(count[a]||0)-(count[c]||0)||rand(b.x,a.length+b.y)-.5);
   const id=opts[Math.floor(rand(b.x*.3,b.y)*Math.min(2,opts.length))];
   count[id]=(count[id]||0)+1;
   const nearTint=M.buildings.filter(o=>LOT[o.id]&&Math.hypot(o.x-b.x,o.y-b.y)<330).map(o=>LOT[o.id].tint);
   const ts=tints.filter(x=>!nearTint.includes(x));
   LOT[b.id]={id,flip:rand(b.y,b.x)>.5,tint:(ts.length?ts:tints)[Math.floor(rand(b.x,b.y*.7)*(ts.length||tints.length))]};
  }
 }
 const HOUSE_IMGS=['house1','house1','house2','house2','house3','house3','house4','house4','house5','house6'];
 const SHOP_IMGS=['shop-grocery','shop-bar','shop-barber','shop-garage','shop-kiosk','shop-pharmacy'];
 function pick(list,seed){return list[Math.floor(rand(seed,3.7)*list.length)%list.length]}
 // Desenha um sprite ancorado na base do lote (b.y+b.h), crescendo para cima.
 // A largura desejada e b.w*widthMul, mas sempre presa entre minW/maxW: isso
 // evita que um lote estreito espreme o predio e que um lote largo o estique.
 function drawSprite(c,img,b,widthMul,liftMul,minW,maxW){
  if(!img||!img.ready||!img.naturalWidth)return false;
  let dw=b.w*widthMul;
  if(minW)dw=Math.max(minW,dw);
  if(maxW)dw=Math.min(maxW,dw);
  const scale=dw/img.naturalWidth,dh=img.naturalHeight*scale;
  const dx=b.x+b.w/2-dw/2,dy=b.y+b.h-dh+b.h*(liftMul||0);
  c.drawImage(img,dx,dy,dw,dh);
  return true;
 }
 const PALETTE={
  dirt:'#b58a58',dirtDark:'#9d7547',grass:'#5d7538',sidewalk:'#c4bdae',sidewalkLine:'#a9a294',
  road:'#8f7248',roadEdge:'#7a5f3c',avenue:'#4d4d54',paint:'#e8d98a',
  wall:['#e6dcc6','#dcc9a8','#cfd8dd','#e4cdbd','#d8d3bf'],
  roof:['#b5442f','#c2553a','#9c3a2a','#46628c','#3f5a80','#4a7550'],
  wood:'#6b4f33',glass:'#7fa3b8',awning:['#d9b23c','#c05a3e','#3f7a5a','#4b6fa8'],
  tank:'#3a5a78',tankCap:'#2a4560',wire:'#332f28',
  hydrant:'#c23b2f',hydrantCap:'#8a2a20',
  bin:{green:'#2f7a4a',orange:'#c67a2e',blue:'#3a6ea5'},
  palmTrunk:'#8a6a45',palmLeaf:'#4f7a3a',clothes:['#eef2f5','#c9536a','#4c7ba8','#e8d27a']
 };
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

 function speckle(c,x,y,w,h,step,colors,chance){
  for(let py=y;py<y+h;py+=step)for(let px=x;px<x+w;px+=step){
   const r=rand(px,py);if(r>chance)continue;
   c.fillStyle=colors[Math.floor(rand(py,px)*colors.length)];
   c.fillRect(px,py,step,step);
  }
 }
 // Texturas naturais do quintal (mesmo atlas do yard-renderer) => bairro e quintal uniformes.

 let usedModular=false;
 function materials(){
  // Preferido: as MESMAS texturas do quintal (yard-renderer), mapeadas por coordenada de mundo (1536 px de textura = 768 unidades),
  // assim o chao do bairro continua o do quintal sem emenda em x=640 / y=640.
  const Y=typeof ModularYard!=='undefined'?ModularYard.materials:null;
  if(Y&&Y.dirt&&Y.grass&&Y.road){usedModular=true;return {dirt:Y.dirt,grass:Y.grass,road:Y.road,period:768}}
  usedModular=false;
  const img=IMG['terrain-natural'];if(!img||!img.ready||!img.naturalWidth)return null;
  const n=img.naturalWidth/2,out={};
  for(const [id,q] of Object.entries({dirt:[0,0],grass:[1,0],road:[0,1]})){
   const p=canvas(1024,1024),k=p.getContext('2d');
   // amostras com borda suave, sem espelhar, para nao aparecerem emendas.
   k.drawImage(img,q[0]*n+8,q[1]*n+8,n-16,n-16,0,0,1024,1024);
   const st=canvas(256,256),sk=st.getContext('2d');
   for(let y=-1;y<6;y++)for(let x=-1;x<6;x++){
    sk.clearRect(0,0,256,256);sk.globalCompositeOperation='source-over';
    sk.drawImage(img,q[0]*n+8+rand(x,y)*(n-280),q[1]*n+8+rand(y+21,x)*(n-280),256,256,0,0,256,256);
    sk.globalCompositeOperation='destination-in';
    const m=sk.createRadialGradient(128,128,55,128,128,128);m.addColorStop(0,'#fff');m.addColorStop(1,'#fff0');sk.fillStyle=m;sk.fillRect(0,0,256,256);
    k.drawImage(st,x*192-40+rand(x+3,y)*40,y*192-40+rand(y,x+9)*40);
   }
   out[id]=p;
  }
  out.period=512;
  return out;
 }
 const vnoise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=rand(ix,iy),b=rand(ix+1,iy),c2=rand(ix,iy+1),d=rand(ix+1,iy+1);return (a+(b-a)*sx)*(1-sy)+(c2+(d-c2)*sx)*sy};
 function buildGround(){
  const g=canvas(M.WIDTH,M.HEIGHT),c=g.getContext('2d');
  const mat=materials();
  if(!mat){c.fillStyle=PALETTE.dirt;c.fillRect(0,0,M.WIDTH,M.HEIGHT)}
  else{
   // mato de fundo + manchas organicas de terra vermelha misturadas por ruido.
   const P=mat.period;
   const tile=(src,w,h)=>{const t=canvas(w,h),k=t.getContext('2d');
    for(let y=0;y<h;y+=P)for(let x=0;x<w;x+=P)k.drawImage(src,0,0,src.width,src.height,x,y,P,P);return t};
   const gr=tile(mat.grass,M.WIDTH,M.HEIGHT),dr=tile(mat.dirt,M.WIDTH,M.HEIGHT);
   c.drawImage(gr,0,0);
   // Mascara em baixa resolucao (1/4) ampliada com suavizacao: manchas organicas baratas.
   const S=4,mw=M.WIDTH/S,mh=M.HEIGHT/S,mk=canvas(mw,mh),mc=mk.getContext('2d'),md=mc.createImageData(mw,mh);
   for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
    const X=x*S,Y=y*S,nv=vnoise(X/230,Y/230)*.62+vnoise(X/70,Y/70)*.28+vnoise(X/20,Y/20)*.10;
    // mais terra perto de ruas e do quintal; mato nos terrenos abertos.
    let w=(nv-.58)/.10;w=w<0?0:w>1?1:w;
    const i=(y*mw+x)*4;md.data[i+3]=Math.round(255*w);
   }
   mc.putImageData(md,0,0);
   const dk=dr.getContext('2d');dk.globalCompositeOperation='destination-in';dk.imageSmoothingEnabled=true;dk.drawImage(mk,0,0,M.WIDTH,M.HEIGHT);
   c.drawImage(dr,0,0);   ground_road=c.createPattern(tile(mat.road,P,P),'repeat');
  }
  const patternOf=id=>{const img=IMG[id];return img&&img.ready&&img.naturalWidth?c.createPattern(img,'repeat'):null};
  const sidewalkTex=patternOf('terrain-sidewalk'),crackTex=patternOf('terrain-sidewalk-cracked'),asphaltTex=patternOf('terrain-asphalt');
  // Calcadas, depois a rua de terra batida por cima das bordas.
  for(const r of M.roads){
   if(r.id==='avenida')continue;
   c.fillStyle=sidewalkTex||PALETTE.sidewalk;c.fillRect(r.x-14,r.y-14,r.w+28,r.h+28);
   if(!sidewalkTex){
    c.fillStyle=PALETTE.sidewalkLine;
    if(r.dir==='h')for(let x=r.x-14;x<r.x+r.w+28;x+=46)c.fillRect(x,r.y-14,1,14),c.fillRect(x,r.y+r.h,1,14);
    else for(let y=r.y-14;y<r.y+r.h+28;y+=46)c.fillRect(r.x-14,y,14,1),c.fillRect(r.x+r.w,y,14,1);
   }
  }
  for(const r of M.roads){
   // A avenida continua asfaltada (fora da area jogavel); as ruas do bairro sao de terra.
   c.fillStyle=r.id==='avenida'?(asphaltTex||PALETTE.avenue):(ground_road||PALETTE.road);c.fillRect(r.x,r.y,r.w,r.h);
   if(r.id==='avenida'||!ground_road)speckle(c,r.x,r.y,r.w,r.h,3,r.id==='avenida'?[PALETTE.roadEdge,'#525258']:[PALETTE.roadEdge,PALETTE.dirtDark,'#a8804f'],r.id==='avenida'?.2:.32);
   if(r.id!=='avenida'){
    // Trilha de rodas mais clara no meio da rua de terra, sem pintura.
    c.fillStyle='#c9a86f30';
    if(r.dir==='v'){c.fillRect(r.x+r.w*.28,r.y,6,r.h);c.fillRect(r.x+r.w*.64,r.y,6,r.h)}
    else{c.fillRect(r.x,r.y+r.h*.28,r.w,6);c.fillRect(r.x,r.y+r.h*.64,r.w,6)}
   } else {
    c.fillStyle=PALETTE.paint;
    for(let y=r.y+16;y<r.y+r.h-16;y+=52)c.fillRect(r.x+r.w/2-1.5,y,3,26);
   }
  }
  for(const d of M.decor||[])if(d.kind==='manhole'){const im=IMG['prop-manhole'];if(im&&im.ready)c.drawImage(im,d.x-19,d.y-16,38,32)}
  return g;
 }

 function drawGround(ctx){
  // Se o chao foi montado antes das texturas do quintal ficarem prontas, refaz uma vez com elas.
  if(ground&&!usedModular&&typeof ModularYard!=='undefined'&&ModularYard.materials&&ModularYard.materials.road)ground=null;
  if(!ground)ground=buildGround();
  ctx.drawImage(ground,0,0);
 }
 // --- Construcoes -----------------------------------------------------------
 function shadow(c,b){c.fillStyle='#2a1f1420';c.fillRect(b.x+6,b.y+b.h-4,b.w,10)}
 function windowRow(c,b,top,count,wall){
  const gap=b.w/(count+1);
  for(let i=1;i<=count;i++){
   const x=b.x+gap*i-9;
   c.fillStyle='#3b3327';c.fillRect(x-1,top-1,20,18);
   c.fillStyle=PALETTE.glass;c.fillRect(x,top,18,16);
   c.fillStyle='#ffffff28';c.fillRect(x,top,18,6);
  }
 }
 function door(c,b,face){
  const x=b.x+b.w/2-10,y=face==='n'?b.y-2:b.y+b.h-24;
  c.fillStyle='#3a2a1b';c.fillRect(x-2,y-2,24,28);
  c.fillStyle=PALETTE.wood;c.fillRect(x,y,20,26);
  c.fillStyle='#d7c27a';c.fillRect(x+15,y+13,3,3);
 }
 // Caixa d'agua e antena no telhado, comuns nas casas do bairro.
 function roofExtras(c,b,seed){
  if(rand(seed,11)>.45){
   const tx=b.x+b.w*.76,ty=b.y-2;
   c.fillStyle=PALETTE.tank;c.fillRect(tx-9,ty-11,18,11);
   c.fillStyle=PALETTE.tankCap;c.beginPath();c.ellipse(tx,ty-11,9,4,0,0,Math.PI*2);c.fill();
   c.fillStyle='#ffffff20';c.fillRect(tx-9,ty-11,18,3);
  }
  if(rand(seed,17)>.62){
   const ax=b.x+b.w*.28,ay=b.y-1;
   c.strokeStyle='#3a352c';c.lineWidth=1;
   c.beginPath();c.moveTo(ax,ay);c.lineTo(ax,ay-15);c.lineTo(ax-6,ay-11);c.moveTo(ax,ay-14);c.lineTo(ax+6,ay-7);c.moveTo(ax,ay-9);c.lineTo(ax+5,ay-4);c.stroke();
  }
 }
 // Varal com roupa, atras de algumas casas.
 function clothesline(c,b,seed){
  if(rand(seed,19)<=.55)return;
  const y=b.y+b.h*.44+2,x1=b.x+10,x2=b.x+b.w-10;
  c.strokeStyle='#4a4234';c.lineWidth=1;c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.stroke();
  const n=3;
  for(let i=0;i<n;i++){
   const cx=x1+(x2-x1)*(i+1)/(n+1);
   c.fillStyle=PALETTE.clothes[(i+Math.floor(seed*7))%PALETTE.clothes.length];
   c.fillRect(cx-4,y,8,10);
  }
 }
 function drawAt(c,img,x,y,w,h){
  if(!img||!img.ready||!img.naturalWidth)return false;
  const scale=w/img.naturalWidth,dh=img.naturalHeight*scale;
  c.drawImage(img,x-w/2,y-dh+ (h||0),w,dh);
  return true;
 }
 function hydrant(c,p){c.save();c.translate(p.x,p.y);c.scale(1.5,1.5);c.translate(-p.x,-p.y);
  
  c.fillStyle='#00000020';c.beginPath();c.ellipse(p.x,p.y+2,8,3,0,0,Math.PI*2);c.fill();
  c.fillStyle=PALETTE.hydrant;c.fillRect(p.x-5,p.y-16,10,16);
  c.fillStyle=PALETTE.hydrantCap;c.beginPath();c.ellipse(p.x,p.y-16,5,3,0,0,Math.PI*2);c.fill();
  c.fillRect(p.x-8,p.y-9,16,4);c.restore();
 }
 function bin(c,p){
  if(p.color!=='blue'&&drawAt(c,IMG[p.color==='orange'?'prop-bin-orange':'prop-bin-green'],p.x,p.y,22))return;
  c.fillStyle='#00000018';c.beginPath();c.ellipse(p.x,p.y+2,7,3,0,0,Math.PI*2);c.fill();
  c.fillStyle=PALETTE.bin[p.color]||PALETTE.bin.green;c.fillRect(p.x-7,p.y-18,14,18);
  c.fillStyle='#00000022';c.fillRect(p.x-7,p.y-18,14,4);
 }
 function decorSprite(c,p,id,w){return drawAt(c,IMG[id],p.x,p.y,w)}
 function sign(c,p){
  if(p.kind==='plate')return;
  if(p.kind==='stop')return decorSprite(c,p,'prop-stopsign',34);
  if(p.kind==='lamp')return decorSprite(c,p,'prop-lamp',44);
  if(p.kind==='bench')return decorSprite(c,p,'prop-bench',66);
  if(p.kind==='news')return decorSprite(c,p,'prop-newsstand',56);
  if(p.kind==='bed')return decorSprite(c,p,'prop-flowerbed',84);
  c.fillStyle='#6e6a62';c.fillRect(p.x-1,p.y-30,2,30);
  c.fillStyle='#2f5f9e';c.fillRect(p.x-14,p.y-40,28,14);
  c.fillStyle='#ffffff';c.fillRect(p.x-11,p.y-36,22,7);
 }
 function palm(c,f){
  const v=variant('flora-palm',f.flip,'');
  if(v&&drawAt(c,v,f.x+f.w*.5,f.y+f.h,f.w*1.7))return;
  c.fillStyle='#2b2419';c.globalAlpha=.22;c.beginPath();c.ellipse(f.x+f.w*.5,f.y+f.h-4,f.w*.34,6,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.fillStyle=PALETTE.palmTrunk;c.fillRect(f.x+f.w*.46,f.y+f.h*.32,f.w*.1,f.h*.68);
  const topX=f.x+f.w*.5,topY=f.y+f.h*.3;
  c.fillStyle=PALETTE.palmLeaf;
  for(let i=0;i<6;i++){
   const a=(i/6)*Math.PI*2;
   c.beginPath();c.ellipse(topX+Math.cos(a)*f.w*.32,topY+Math.sin(a)*f.h*.14,f.w*.28,f.h*.1,a,0,Math.PI*2);c.fill();
  }
 }
 function lotImg(b){assignLots();const l=LOT[b.id];return l&&(variant(l.id,l.flip,l.tint)||IMG[l.id])}
 function house(c,b,seed){
  if(drawSprite(c,lotImg(b),b,1.22,.08,148,186))return;
  const wall=PALETTE.wall[Math.floor(rand(seed,1)*PALETTE.wall.length)],
        roof=PALETTE.roof[Math.floor(rand(seed,7)*PALETTE.roof.length)];
  shadow(c,b);
  c.fillStyle=wall;c.fillRect(b.x,b.y+b.h*.42,b.w,b.h*.58);
  c.fillStyle='#00000018';c.fillRect(b.x,b.y+b.h-8,b.w,8);
  // Telhado em duas aguas, visto de cima em leve perspectiva.
  c.fillStyle=roof;c.fillRect(b.x-6,b.y,b.w+12,b.h*.46);
  c.fillStyle='#ffffff18';c.fillRect(b.x-6,b.y,b.w+12,6);
  c.fillStyle='#00000022';
  for(let x=b.x-6;x<b.x+b.w+6;x+=9)c.fillRect(x,b.y,1,b.h*.46);
  c.fillStyle='#00000030';c.fillRect(b.x-6,b.y+b.h*.46-3,b.w+12,3);
  windowRow(c,b,b.y+b.h*.58,b.w>130?2:1,wall);
  door(c,b,b.face);
  roofExtras(c,b,seed);
  clothesline(c,b,seed);
 }
 function shop(c,b,seed){
  if(drawSprite(c,lotImg(b),b,1.18,.06,b.w<110?96:142,b.w<110?150:178))return;
  const wall=PALETTE.wall[Math.floor(rand(seed,3)*PALETTE.wall.length)],
        stripe=PALETTE.awning[Math.floor(rand(seed,5)*PALETTE.awning.length)];
  shadow(c,b);
  c.fillStyle=wall;c.fillRect(b.x,b.y+b.h*.3,b.w,b.h*.7);
  c.fillStyle=PALETTE.roof[Math.floor(rand(seed,9)*PALETTE.roof.length)];
  c.fillRect(b.x-5,b.y,b.w+10,b.h*.34);
  c.fillStyle='#00000026';c.fillRect(b.x-5,b.y+b.h*.34-3,b.w+10,3);
  // Vitrine e toldo listrado.
  const vy=b.y+b.h*.52;
  c.fillStyle='#2f2a20';c.fillRect(b.x+10,vy,b.w-20,26);
  c.fillStyle=PALETTE.glass;c.fillRect(b.x+13,vy+3,b.w-26,20);
  for(let i=0;i<b.w-26;i+=14){c.fillStyle=i%28?stripe:'#f2ead6';c.fillRect(b.x+13+i,vy-10,14,10)}
  c.fillStyle='#00000030';c.fillRect(b.x+13,vy,b.w-26,3);
  c.fillStyle='#f4ecd8';c.fillRect(b.x+18,b.y+b.h*.38,b.w-36,10);
  c.fillStyle='#4a3c28';
  for(let i=0;i<b.w-46;i+=7)c.fillRect(b.x+22+i,b.y+b.h*.38+3,4,4);
  door(c,b,b.face);
  roofExtras(c,b,seed);
 }
 function gym(c,b){
  if(drawSprite(c,IMG['shop-gym'],b,.65,.05,170,190))return;
  shadow(c,b);
  c.fillStyle='#cfd2d6';c.fillRect(b.x,b.y+b.h*.3,b.w,b.h*.7);
  c.fillStyle='#5b6068';c.fillRect(b.x-6,b.y,b.w+12,b.h*.34);
  c.fillStyle='#00000026';c.fillRect(b.x-6,b.y+b.h*.34-3,b.w+12,3);
  c.fillStyle='#1d2530';c.fillRect(b.x+b.w*.28,b.y+b.h*.44,b.w*.44,30);
  c.fillStyle='#9ad0e8';c.fillRect(b.x+b.w*.34,b.y+b.h*.5,10,6);c.fillRect(b.x+b.w*.6,b.y+b.h*.5,10,6);
  c.fillStyle='#e8ecef';c.fillRect(b.x+b.w*.42,b.y+b.h*.52,b.w*.16,3);
  windowRow(c,b,b.y+b.h*.72,3);
  door(c,b);
 }
 function depot(c,b){
  if(drawSprite(c,IMG['shop-depot'],b,1.22,.06,0,380)){drawAt(c,IMG['flora-hedge'],b.x+b.w+14,b.y+b.h+8,64);return}
  shadow(c,b);
  c.fillStyle='#d9d5cc';c.fillRect(b.x,b.y+b.h*.26,b.w,b.h*.74);
  c.fillStyle='#a8382a';c.fillRect(b.x-8,b.y,b.w+16,b.h*.3);
  c.fillStyle='#ffffff16';c.fillRect(b.x-8,b.y,b.w+16,6);
  c.fillStyle='#00000028';c.fillRect(b.x-8,b.y+b.h*.3-4,b.w+16,4);
  c.fillStyle='#8f8c84';
  for(let x=b.x+8;x<b.x+b.w-8;x+=26)c.fillRect(x,b.y+b.h*.36,2,b.h*.5);
  // Portoes de carga.
  for(let i=0;i<2;i++){
   const gx=b.x+b.w*(.22+i*.38);
   c.fillStyle='#4b4f55';c.fillRect(gx,b.y+b.h*.62,64,b.h*.32);
   c.fillStyle='#5f646b';for(let y=0;y<b.h*.32;y+=7)c.fillRect(gx,b.y+b.h*.62+y,64,3);
  }
  c.fillStyle='#f0e7d2';c.fillRect(b.x+b.w*.3,b.y+b.h*.4,b.w*.4,14);
  c.fillStyle='#8a3527';for(let i=0;i<b.w*.4-14;i+=8)c.fillRect(b.x+b.w*.3+6+i,b.y+b.h*.4+4,5,6);
  // Palete e engradados no patio.
  c.fillStyle='#6b4f33';c.fillRect(b.x+b.w+2,b.y+b.h+12,26,18);
  c.fillStyle='#8a6a45';c.fillRect(b.x-30,b.y+b.h+16,22,16);
 }
 // Altura de tela por especie (jogador ~48px; arvore de rua ~2,5-3x).
 const TREE_SET=[['flora-tree',132],['flora-mango',150],['flora-slim',140],['flora-tree-bloom',118],['flora-ipe',138],['flora-banana',100],['flora-dead',112]];
 const TREE_PICK=[0,1,0,2,4,3,1,5,2,4,6,0];
 function tree(c,f){
  const [id,h]=TREE_SET[TREE_PICK[(f.tv||0)%TREE_PICK.length]];
  const v=variant(id,f.flip,id==='flora-tree'?TREE_TINTS[f.variant%TREE_TINTS.length]:'');
  if(v&&v.naturalWidth){
   const H=h*(f.scale||1),W=H*v.naturalWidth/v.naturalHeight;
   c.fillStyle='#2b2419';c.globalAlpha=.18;c.beginPath();c.ellipse(f.x+f.w*.5,f.y+f.h-3,W*.22,6,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
   c.drawImage(v,f.x+f.w*.5-W/2,f.y+f.h-H,W,H);return;
  }
  c.fillStyle='#2b2419';c.globalAlpha=.25;c.beginPath();c.ellipse(f.x+f.w*.5,f.y+f.h-6,f.w*.42,7,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.fillStyle='#5a4128';c.fillRect(f.x+f.w*.42,f.y+f.h*.5,f.w*.16,f.h*.5);
  c.fillStyle='#3f5c2c';c.beginPath();c.ellipse(f.x+f.w*.5,f.y+f.h*.38,f.w*.5,f.h*.36,0,0,Math.PI*2);c.fill();
 } function bush(c,f){
  const m=f.variant%3,id=m===0?'flora-hedge':m===1?'flora-weeds':'flora-palm-pot';
  const v=variant(id,f.flip,f.variant>1?'hue-rotate(-12deg) brightness(1.05)':'');
  if(v&&drawAt(c,v,f.x+f.w*.5,f.y+f.h,f.w*(m===2?.8:1.0)))return;
  c.fillStyle='#4a6330';c.beginPath();c.ellipse(f.x+f.w*.5,f.y+f.h*.6,f.w*.5,f.h*.6,0,0,Math.PI*2);c.fill();
  c.fillStyle='#5b7639';c.beginPath();c.ellipse(f.x+f.w*.38,f.y+f.h*.4,f.w*.3,f.h*.4,0,0,Math.PI*2);c.fill();
 }
 function shelter(c,b){
  const sh=IMG['prop-busshelter'];
  if(sh&&sh.ready&&sh.naturalWidth){const sy=sh.naturalHeight*.79,dw=b.w*1.5,dh=sy*dw/sh.naturalWidth;
   c.drawImage(sh,0,0,sh.naturalWidth,sy,b.x+b.w/2-dw/2,b.y+b.h-dh+b.h*.1,dw,dh);return}
  c.fillStyle='#00000020';c.fillRect(b.x+4,b.y+b.h-2,b.w,8);
  c.fillStyle='#8d9aa4';c.fillRect(b.x,b.y+10,b.w,b.h-10);
  c.fillStyle='#b9c4cc';c.fillRect(b.x+6,b.y+18,b.w-12,20);
  c.fillStyle='#3f4a55';c.fillRect(b.x-4,b.y,b.w+8,12);
  c.fillStyle='#2f6fb0';c.fillRect(b.x+b.w-16,b.y-16,16,16);
  c.fillStyle='#e9f1f7';c.fillRect(b.x+b.w-13,b.y-12,10,7);
 }
 function gateFrame(c,b){
  if(drawSprite(c,IMG['prop-gate-closed'],b,1.6,.05))return;
  c.fillStyle='#6e6257';c.fillRect(b.x,b.y,b.w,b.h);
  c.fillStyle='#d8b23f';for(let y=b.y;y<b.y+b.h;y+=14)c.fillRect(b.x+4,y,b.w-8,7);
  c.fillStyle='#4a4238';c.fillRect(b.x-4,b.y-8,b.w+8,8);c.fillRect(b.x-4,b.y+b.h,b.w+8,8);
 }
 // Carros decorativos na avenida, sempre fora da area jogavel.
 function cars(c,t){
  const lane=[{x:1912,dir:1,color:'#d8d5cf'},{x:1912,dir:1,color:'#c2452f'},{x:1996,dir:-1,color:'#e2b13c'},{x:1996,dir:-1,color:'#4a6fa8'}];
  lane.forEach((l,i)=>{
   const span=M.HEIGHT+240,raw=(t*34+i*430)%span,y=l.dir>0?raw-120:M.HEIGHT+120-raw;
   c.fillStyle='#00000024';c.fillRect(l.x-14,y+4,32,54);
   c.fillStyle=l.color;c.fillRect(l.x-16,y,32,52);
   c.fillStyle='#2b3138';c.fillRect(l.x-12,y+10,24,16);c.fillRect(l.x-12,y+32,24,12);
   c.fillStyle='#f6e7a8';c.fillRect(l.x-13,l.dir>0?y+48:y,8,4);c.fillRect(l.x+5,l.dir>0?y+48:y,8,4);
  });
 }
 // Entradas ordenadas por profundidade, no mesmo formato do quintal modular.
 function objects(state,elapsed,art){
  const out=[];
  for(const f of M.flora)out.push({y:f.y+f.h,draw:c=>f.kind==='palm'?palm(c,f):f.kind==='tree'?tree(c,f):bush(c,f)});
  for(const b of M.buildings){
   const seed=b.x*.13+b.y*.07;
   out.push({y:b.y+b.h,draw:c=>b.kind==='house'?house(c,b,seed):b.kind==='shop'?shop(c,b,seed):b.kind==='gym'?gym(c,b):depot(c,b)});
  }
  if(typeof RouteArt!=='undefined'&&RouteArt.drawAnim)for(const w of M.walkers||[]){
   if(!RouteArt.hasAnim(w.who))continue;
   if(w.showIf&&!state?.events?.flags?.[w.showIf])continue;
   const dx=w.to[0]-w.from[0],dy=w.to[1]-w.from[1],len=Math.hypot(dx,dy),period=len/w.speed,ph=(elapsed%(2*period)),back=ph>period,u=(back?2*period-ph:ph)/period;
   const x=w.from[0]+dx*u,y=w.from[1]+dy*u,dir=Math.abs(dx)>=Math.abs(dy)?((dx>0)!==back?'right':'left'):((dy>0)!==back?'down':'up');
   out.push({y,draw:c=>RouteArt.drawAnim(c,x,y,w.who,dir,true,elapsed)});
  }
  if(typeof RouteArt!=='undefined')for(const n of M.villagers||[])if(RouteArt.hasAnim(n.who)||(n.who==='beto'||n.who==='tainan')&&RouteArt.has(n.who))out.push({y:n.y,draw:c=>RouteArt.person(c,n.x,n.y,n.who)});
  if(typeof RouteArt!=='undefined')for(const n of M.npcs||[])out.push({y:n.y,draw:c=>RouteArt.person(c,n.x,n.y,n.who)});
  for(const p of M.props)out.push({y:p.y+p.h,draw:c=>p.kind==='shelter'?shelter(c,p):gateFrame(c,p)});
  for(const d of M.decor||[])out.push({y:d.y,draw:c=>d.kind==='hydrant'?hydrant(c,d):d.kind==='bin'?bin(c,d):d.kind==='manhole'?0:sign(c,d)});
  const d=state.story?.firstDay;
  if(d?.shift?.paid&&!d.purchaseDay)out.push({y:534,draw:c=>typeof RouteArt!=='undefined'?RouteArt.person(c,662,534,'encapuzado'):art.person(662,534,0,true)});
  return out;
 }
 function drawAvenue(ctx,elapsed){cars(ctx,elapsed)}
 return {lots(){assignLots();return LOT},drawGround,objects,drawAvenue,invalidate(){ground=null},get ready(){return !!ground}};
})();
