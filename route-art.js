const RouteArt=(()=>{
 const frames={},atlas=new Image();atlas.src='assets/first-day-atlas.png';
 atlas.onload=()=>{for(const [i,id] of ['beto','tainan','seller'].entries()){const w=Math.floor(atlas.naturalWidth/2),h=Math.floor(atlas.naturalHeight/2),out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');g.drawImage(atlas,i%2*w,Math.floor(i/2)*h,w,h,0,0,w,h);const data=g.getImageData(0,0,w,h),p=data.data;let left=w,top=h,right=0,bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=(y*w+x)*4;if(p[n]>140&&p[n+2]>140&&p[n+1]<110){p[n+3]=0}else{left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}g.putImageData(data,0,0);frames[id]={image:out,box:[left,top,right-left+1,bottom-top+1]}}};
 // NPCs do Ato I/II: recortes prontos (fundo ja removido), um arquivo por personagem.
 for(const id of ['marivaldo','janilson','claudineia','principe','deni','zorino','juliana','dolores']){const img=new Image();img.onload=()=>{frames[id]={image:img,box:[0,0,img.naturalWidth,img.naturalHeight]}};img.src='assets/npcs/'+id+'.png'}
 // NPCs animados (folhas A/B geradas por personagem): frames por direcao + retratos com expressao.
 // Desenho: altura de mundo 47px = quadro parado de frente; os demais mantem a proporcao da folha.
 const anim={};
 // Altura relativa por personagem (canon da Biblia); o desenho base tem 47 px.
 const HEIGHT_K={janilson:.93,dolores:.88,sara:.92,renatinho:.65,juninho:1.08,kazao:1.05};
 function loadAnim(who){
  if(typeof fetch!=='function')return;
  fetch('assets/npcs/'+who+'/manifest.json').then(r=>r.json()).then(m=>{
   const a={m,img:{}};let pending=0;const add=n=>{pending++;const i=new Image();i.onload=()=>{a.img[n]=i;if(--pending===0)anim[who]=a};i.onerror=()=>{--pending};i.src='assets/npcs/'+who+'/'+n+'.png'};
   for(const list of [...Object.values(m.walk),...Object.values(m.idle).map(x=>[x]),m.portraits])for(const n of list)if(!a.img[n])add(n);
  }).catch(()=>{});
 }
 // dir: 'down'|'up'|'left'|'right'; t em segundos; parado = quadro de idle da direcao.
 function drawAnim(c,x,y,who,dir='down',moving=false,t=0){
  const a=anim[who];if(!a)return false;const side=dir==='left'||dir==='right',key=side?'side':dir==='up'?'up':'down';
  const list=a.m.walk[key],name=moving?list[Math.floor(t*10)%list.length]:a.m.idle[key],img=a.img[name];if(!img)return false;
  const s=47*(HEIGHT_K[who]||1)/a.img[a.m.idle[key]].naturalHeight,w=img.naturalWidth*s,h=img.naturalHeight*s; // cada direcao normalizada pela propria altura parada (linhas da folha tem escalas diferentes)
  c.save();if(dir==='left'){c.translate(x,0);c.scale(-1,1);c.translate(-x,0)}
  c.fillStyle='#1c27226b';c.beginPath();c.ellipse(x,y-1,w*.32,3,0,0,Math.PI*2);c.fill();
  c.drawImage(img,x-w/2,y-h,w,h);c.restore();return true}
 // Retrato de busto (expressao 0-4: neutro, feliz, bravo, triste, surpreso), centralizado e ajustado a size x size.
 function portrait(c,who,expr,size){const a=anim[who];if(!a)return false;const img=a.img[a.m.portraits[expr]||a.m.portraits[0]];if(!img)return false;
  const k=Math.min(size/img.naturalWidth,size/img.naturalHeight),w=img.naturalWidth*k,h=img.naturalHeight*k;c.drawImage(img,(size-w)/2,size-h,w,h);return true}
 // Troféu do primeiro titulo local (E017): taca dourada sobre um pedestal de madeira, ao lado da porta da casa.
 function trophy(c,x,y){rect(c,x-11,y-2,24,4,'#1c27226b');rect(c,x-8,y-12,16,12,'#6b4f33');rect(c,x-8,y-12,16,3,'#8a6a45');
  rect(c,x-2,y-22,4,10,'#c9a13c');rect(c,x-8,y-36,16,14,'#e0b93f');rect(c,x-11,y-33,3,7,'#c9a13c');rect(c,x+8,y-33,3,7,'#c9a13c');rect(c,x-5,y-34,3,10,'#f4dc7a');rect(c,x-6,y-24,12,3,'#c9a13c');}
 const hasAnim=who=>!!anim[who];
 const has=who=>!!anim[who]||!!frames[who];
 // index.json lista os personagens com folhas prontas (gerado por tools/Integrar.ps1).
 if(typeof fetch==='function')fetch('assets/npcs/index.json').then(r=>r.json()).then(l=>l.forEach(loadAnim)).catch(()=>{});
 const roosterImage=new Image();roosterImage.src='assets/rooster-indio-combatente.png';
 roosterImage.onload=()=>{const w=roosterImage.naturalWidth,h=roosterImage.naturalHeight,out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');g.drawImage(roosterImage,0,0);const pixels=g.getImageData(0,0,w,h).data;let left=w,top=h,right=0,bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=(y*w+x)*4;if(pixels[n+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}frames.rooster={image:roosterImage,box:[left,top,right-left+1,bottom-top+1]}};
 function sprite(c,id,x,y,height){const f=frames[id];if(!f)return false;const width=f.box[2]*height/f.box[3];c.drawImage(f.image,...f.box,x-width/2,y-height,width,height);return true}

 const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
 function person(c,x,y,who){if(anim[who]&&drawAnim(c,x,y,who,'down',false,0))return;if(who==='player'&&typeof createArt!=='undefined'){createArt(c).person(x,y,0,false,0);return}if(sprite(c,who,x,y,47))return;const hood=who==='seller',skin=who==='tainan'?'#ab7652':who==='player'?'#e6b28b':'#cb9873',shirt=hood?'#353c37':who==='tainan'?'#747e62':who==='player'?'#a16e47':'#547878';rect(c,x-10,y-2,23,4,'#1c27226b');rect(c,x-8,y-19,7,18,'#3a4143');rect(c,x+2,y-19,7,18,'#3a4143');rect(c,x-10,y-2,9,4,'#30291e');rect(c,x+2,y-2,10,4,'#30291e');rect(c,x-11,y-38,23,23,shirt);rect(c,x-15,y-34,5,21,shirt);rect(c,x+12,y-34,5,21,shirt);rect(c,x-15,y-14,5,6,skin);rect(c,x+12,y-14,5,6,skin);rect(c,x-8,y-54,17,19,hood?'#222b28':skin);rect(c,x-9,y-56,19,7,'#282824');if(hood){rect(c,x-12,y-51,5,20,'#3d453d');rect(c,x+9,y-51,5,20,'#3d453d');rect(c,x-5,y-43,12,7,'#7d6953')}else{rect(c,x-8,y-49,3,9,'#282824');rect(c,x+8,y-49,3,9,'#282824');rect(c,x-4,y-46,2,2,'#282824');rect(c,x+4,y-46,2,2,'#282824');rect(c,x-2,y-39,6,2,'#916247')}if(who==='tainan'){rect(c,x-7,y-30,5,6,'#c6c3a0');rect(c,x+8,y-25,11,15,'#b69d69')}}
 function rooster(c,x,y,scale=1,battered=true){c.save();if(battered){c.translate(x,y);c.rotate(-.06);c.translate(-x,-y)}sprite(c,'rooster',x,y,40*scale);if(battered){c.strokeStyle='#c1a06d';c.lineWidth=Math.max(.7,scale*.65);c.beginPath();c.moveTo(x-7*scale,y-19*scale);c.lineTo(x+2*scale,y-23*scale);c.moveTo(x-10*scale,y-10*scale);c.lineTo(x-3*scale,y-14*scale);c.stroke();c.fillStyle='#6f5b3d';c.fillRect(x+4*scale,y-5*scale,5*scale,2*scale);c.fillStyle='#d0b379';c.fillRect(x-2*scale,y+10*scale,3*scale,7*scale)}c.restore()}
 function label(c,text,x,y,width=190){c.save();c.fillStyle='#e5d7ad';c.font='bold 12px Georgia';c.textAlign='center';c.fillText(text,x,y,width);c.restore()}
 function building(c,b,color,title,index){rect(c,b.x+5,b.y+6,b.w,b.h,'#27362d');rect(c,b.x,b.y,b.w,b.h,color);for(let y=b.y+30;y<b.y+b.h;y+=16){for(let x=b.x+8+(y%32?0:12);x<b.x+b.w-12;x+=28)rect(c,x,y,22,2,'#bc97734a')};rect(c,b.x-7,b.y-12,b.w+14,24,'#704d37');for(let x=b.x-7;x<b.x+b.w+7;x+=10)rect(c,x,b.y-12,3,22,'#976845');rect(c,b.x+9,b.y+22,b.w-18,23,'#35483c');label(c,title,b.x+b.w/2,b.y+38,b.w-25);rect(c,b.x+20,b.y+58,44,b.h-58,'#4f6058');for(let y=b.y+60;y<b.y+b.h;y+=7)rect(c,b.x+20,y,44,2,'#778679');rect(c,b.x+85,b.y+66,55,41,'#24382f');rect(c,b.x+111,b.y+66,3,42,'#a28e66');rect(c,b.x+85,b.y+84,55,3,'#a28e66');rect(c,b.x+80,b.y+108,66,5,'#8a6b46');rect(c,b.x+160,b.y+b.h-34,15,25,index%2?'#888875':'#735945');for(let i=0;i<4;i++)rect(c,b.x+161+i*3,b.y+b.h-40-(i%2)*5,2,10,'#6e7f47')}
 function street(c,s,elapsed,a){const l=LOCALES[lang].firstDay;rect(c,0,0,640,1280,'#62734a');rect(c,246,0,162,1280,'#a17b51');if(ModularYard.materials.grass&&ModularYard.materials.road){for(let y=0;y<1280;y+=640){c.drawImage(ModularYard.materials.grass,0,0,1280,1280,0,y,640,640);c.drawImage(ModularYard.materials.road,0,0,324,1280,246,y,162,640)}}rect(c,239,0,8,1280,'#5e5c40');rect(c,409,0,7,1280,'#5e5c40');for(let i=0;i<600;i++){const x=(i*73)%640,y=(i*109)%1280;rect(c,x,y,2+i%3,1,x>245&&x<409?'#b79766':'#748052')}for(let y=20;y<1280;y+=43){rect(c,267,y,2,21,'#8c6e49');rect(c,386,y+15,3,17,'#8c6e49')}
 const colors=['#ad9370','#8c9776','#b69f85','#858779','#99866b'];RouteMap.specs.street.blocks.forEach((b,i)=>building(c,b,colors[i],l.shops[i]||'Rua 1',i));
 rect(c,220,32,215,45,'#77796a');rect(c,232,35,191,26,'#324e41');label(c,l.depot,327,53);rect(c,279,63,89,14,'#404d43');rect(c,279,70,89,8,'#b0a581');
 for(const [x,y] of [[425,145],[229,482],[425,1020]]){rect(c,x,y,5,91,'#534b39');rect(c,x-12,y,21,4,'#41483c');rect(c,x-14,y+3,12,5,'#e4c876');rect(c,x+3,y+28,5,14,'#756a48')}
 c.strokeStyle='#454b3b';c.lineWidth=1;c.beginPath();c.moveTo(429,146);c.quadraticCurveTo(320,385,231,482);c.quadraticCurveTo(320,795,429,1021);c.stroke();
 for(const [x,y,w,h] of [[4,330,80,105],[528,525,95,120],[5,735,70,90]])if(ModularYard.sprites.tree)c.drawImage(ModularYard.sprites.tree,x,y,w,h);
 // Small residential details: washing line, stacked bricks and waiting neighbors.
 rect(c,61,770,126,3,'#413e30');for(let i=0;i<4;i++)rect(c,70+i*26,772,17,22,['#b0aa8b','#768e85','#aa7756','#928776'][i]);for(let i=0;i<8;i++)rect(c,81+i%4*17,1030+Math.floor(i/4)*10,15,8,'#a06b47');a.person(110,1030,0,true);a.person(494,1001,0,true);
 if(FirstDay.data(s).phase==='outbound'){for(let y=200;y<1180;y+=220){c.fillStyle='#d9bd6e';c.beginPath();c.moveTo(320,y);c.lineTo(309,y+14);c.lineTo(316,y+14);c.lineTo(316,y+25);c.lineTo(324,y+25);c.lineTo(324,y+14);c.lineTo(331,y+14);c.closePath();c.fill()}}
 if(FirstDay.data(s).shift?.paid&&!FirstDay.data(s).purchaseDay){person(c,355,1085,'seller');rooster(c,379,1092,.7)}
 rect(c,270,1210,102,10,'#69573b');label(c,l.yardGate,322,1247);a.person(s.player.x,s.player.y,moving?elapsed*13:0,false,face)}
 function depot(c,s,elapsed,a){const l=storyL(),working=FirstDay.data(s).phase==='work'&&!FirstDay.data(s).shift?.paid,w=FirstDay.data(s).shift,o=working?FirstDay.order(w.index):null;rect(c,0,0,640,640,'#74776c');for(let y=0;y<640;y+=32)for(let x=0;x<640;x+=32){rect(c,x,y,31,31,(x+y)%64?'#787c70':'#71776c');rect(c,x+3,y+3,2,2,'#858a7d')}rect(c,18,25,604,45,'#45594c');label(c,l.depot,320,53,550);for(const b of RouteMap.specs.depot.blocks){rect(c,b.x,b.y,b.w,b.h,'#675e46');for(let i=0;i<6;i++){const x=b.x+5+i%3*38,y=b.y+4+Math.floor(i/3)*34;rect(c,x,y,31,28,'#ad9261');rect(c,x+12,y,5,28,'#c3ae7d');rect(c,x+4,y+9,6,5,'#695f44')}}if(working){RouteMap.workStations.shelves.forEach(st=>{const needed=o.items.filter(i=>i===st.item).length>w.basket.filter(i=>i===st.item).length;if(needed){c.strokeStyle='#efd072';c.lineWidth=2;c.strokeRect(st.x-20,st.y-18,40,22)}c.fillStyle=['#e5d0a0','#99654a','#5c95a0','#c6ad59'][st.item];c.fillRect(st.x-13,st.y-15,26,12);label(c,l.items[st.item],st.x,st.y+20,70)});RouteMap.workStations.benches.forEach(st=>{const target=o.bench===st.bench;rect(c,st.x-37,st.y-15,74,22,target?'#d2ad5d':'#806a45');rect(c,st.x-29,st.y-11,58,4,target?'#fff0a0':'#aa9063');if(target){c.strokeStyle='#fff0a0';c.lineWidth=2;c.strokeRect(st.x-39,st.y-17,78,26)}label(c,st.bench?l.benchB:l.benchA,st.x,st.y+25,90)})}for(let y=350;y<530;y+=30){rect(c,236,y,4,16,'#cfb360');rect(c,400,y,4,16,'#cfb360')}person(c,320,290,'tainan');person(c,397,356,'gabriel');rect(c,269,553,104,13,'#b6a072');label(c,l.depotExit,320,588);a.person(s.player.x,s.player.y,moving?elapsed*13:0,false,face)}
 function pen(c,s){if(!s.world.objects.firstPen)return;const x=185,y=345;rect(c,x,y,108,80,'#83724c');for(let i=0;i<45;i++)rect(c,x+(i*37)%107,y+(i*23)%75,3,1,'#a68b5b');rect(c,x+5,y+8,40,31,'#605541');rect(c,x+2,y,47,13,'#687369');for(let i=0;i<5;i++)rect(c,x+3+i*10,y,2,13,'#a0a28b');for(let i=0;i<=6;i++){rect(c,x+i*17,y+51,3,31,'#705237');rect(c,x+i*17,y+13,3,23,'#705237')}rect(c,x,y+59,108,4,'#a38555');rect(c,x,y+74,108,4,'#94734a');rect(c,x+82,y+37,15,7,'#9a8660');rect(c,x+84,y+38,11,3,'#709894');rooster(c,x+63,y+58,1)}
 // Curral de reproducao: cercado com dois lados visiveis, um pro galo e um
 // pra galinha (Secao 5.9 - slots separados de proposito).
 function breedingPen(c,s){if(!EventFlags.has(s,'E009'))return;const x=110,y=440,w=100,h=70;rect(c,x,y,w,h,'#7a6a48');for(let i=0;i<30;i++)rect(c,x+(i*29)%w,y+(i*19)%h,2,1,'#8f7c56');for(let i=0;i<=6;i++){rect(c,x+i*(w/6),y,3,h,'#6b4f33');rect(c,x+i*(w/6),y,w/6,3,'#6b4f33')}rect(c,x+w/2-1,y,3,h,'#4a3826');
  // So pen1 tem local fisico no quintal; pen2 (anexo do Janilson, Secao 14.2)
  // e' um segundo curral abstrato, sem representacao propria no mapa ainda.
  const pen=s.breeding?.pens?.byId?.pen1||{roosterId:null,henId:null};
  if(pen.roosterId)rooster(c,x+w*.28,y+h*.66,.7);
  if(pen.henId){const hx=x+w*.72,hy=y+h*.66;rect(c,hx-6,hy-2,12,8,'#e9e1c0');rect(c,hx-8,hy-8,6,6,'#c9c591');rect(c,hx+3,hy-11,6,7,'#fff3d0');rect(c,hx+9,hy-6,3,2,'#e6b856')}
 }
 return {person,drawAnim,portrait,hasAnim,has,trophy,rooster,street,depot,pen,breedingPen,ready:()=>['beto','tainan','seller','rooster'].every(k=>frames[k])};
})();
