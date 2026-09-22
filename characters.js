// Original layered pixel sprites. Coordinates stay in the same world scale.
(function(){const previous=createArt;window.createArt=function(ctx){const art=previous(ctx),r=art.r;
const palettes=[{shirt:['#384d49','#5e7768','#8c9c7b'],pants:['#34404a','#50616b'],skin:['#96613e','#bd8656','#dbac78'],hat:['#705331','#ab8249','#d5b477']},{shirt:['#613e31','#996345','#bf9062'],pants:['#343e3e','#546158'],skin:['#825039','#ad7450','#ca966c'],hat:['#4e4a39','#77734f','#aaa174']}];
function person(x,y,step=0,npc=false,face=0){const p=palettes[npc?1:0],stride=step?Math.round(Math.sin(step)*2):0,bob=step?Math.round(Math.abs(Math.sin(step))):0,side=Math.abs(face)===1,back=face===2;
ctx.save();ctx.translate(Math.round(x),Math.round(y));if(face===-1)ctx.scale(-1,1);
r(-9,-1,18,3,'#16251d50');r(-6,1,12,2,'#17251d24');
function leg(x,dy){r(x,-14+dy,6,12,p.pants[0]);r(x+1,-12+dy,3,9,p.pants[1]);r(x,-3+dy,6,3,'#4b3d2c');r(x-1,-1+dy,8,2,'#302c24');r(x+1,-2+dy,4,1,'#796446')}
leg(side?-3:-6, stride);leg(side?0:2,-stride);
ctx.translate(0,-bob);
r(side?-5:-8,-28,side?12:17,16,p.shirt[0]);r(side?-3:-6,-27,side?8:13,13,p.shirt[1]);r(side?0:-5,-26,side?3:6,2,p.shirt[2]);r(-5,-15,12,2,'#6c6e50');r(-6,-13,14,2,'#514636');
if(!back){r(side?5:0,-24,1,10,'#b0aa83');r(side?4:-4,-23,3,4,p.shirt[0]);r(side?4:-4,-23,3,1,p.shirt[2]);r(side?1:4,-18,3,4,'#a09c70');r(side?1:4,-18,3,1,'#beb58b');r(side?2:5,-16,1,1,p.shirt[0])}else{r(-4,-21,1,7,p.shirt[0]);r(4,-24,1,10,p.shirt[2]);r(-3,-16,4,2,'#80917a')}
function arm(ax,swing){r(ax,-26+swing,4,7,p.shirt[0]);r(ax,-25+swing,3,5,p.shirt[1]);r(ax,-19+swing,3,8,p.skin[0]);r(ax+1,-18+swing,2,6,p.skin[1]);r(ax,-12+swing,3,3,p.skin[2])}
if(side)arm(3,stride);else{arm(-10,stride);arm(8,-stride)}
r(-5,-38,11,12,p.skin[0]);r(-4,-37,10,9,p.skin[1]);r(-2,-36,7,6,p.skin[2]);
if(back){r(-5,-38,11,7,'#53412e');r(-5,-32,2,3,'#745338');r(4,-32,2,3,'#745338')}else if(side){r(5,-34,3,3,p.skin[1]);r(4,-35,1,2,'#282e29');r(1,-29,5,2,'#714d36');r(-5,-35,3,4,'#58422e')}else{r(-4,-35,3,1,'#745139');r(2,-35,3,1,'#745139');r(-3,-34,1,2,'#26312b');r(3,-34,1,2,'#26312b');r(0,-32,2,2,p.skin[0]);r(-2,-29,6,1,'#744d34');r(-1,-28,4,1,'#8e6240')}
// Frayed straw hat (friend wears a worn fabric cap).
if(!npc){r(-12,-40,24,3,p.hat[0]);r(-11,-41,23,2,p.hat[2]);r(-8,-46,16,6,p.hat[1]);r(-6,-47,12,2,p.hat[2]);r(-8,-42,16,2,p.hat[0]);for(let i=-6;i<8;i+=3)r(i,-45,1,3,p.hat[2]);r(-13,-39,3,1,p.hat[1]);r(10,-38,3,1,p.hat[1]);r(-7,-41,2,1,'#d7c393')}else{r(-6,-43,13,5,p.hat[0]);r(-4,-44,10,4,p.hat[1]);r(-3,-43,4,2,p.hat[2]);r(side?3:-7,-39,side?8:16,2,p.hat[0])}
ctx.restore()}
function chicken(x,y,t,i){const peck=Math.sin(t*1.8+i*2)>.83,dir=Math.sin(t*.4+i)<0?-1:1,brown=i===1;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(dir,1);r(-7,1,15,3,'#1d2e2149');r(-4,0,1,4,'#b48642');r(3,0,1,4,'#b48642');r(-5,3,3,1,'#d1a558');r(2,3,3,1,'#d1a558');r(-8,-10,3,6,'#9a8c70');r(-10,-12,3,6,brown?'#563d2e':'#e6dac0');r(-8,-13,3,5,brown?'#8b5638':'#f5e7c9');r(-6,-9,12,10,brown?'#9a603e':'#cfc4a5');r(-4,-11,9,10,brown?'#c38a59':'#f0e4c5');r(-4,-7,8,5,brown?'#8e563b':'#b9b298');r(-3,-7,7,1,brown?'#d8a16b':'#fff0cd');r(-1,-4,4,1,brown?'#b37a4c':'#d8ccb0');const hy=peck?-2:-13;r(4,hy,5,7,brown?'#d0a471':'#fff0cd');r(5,hy-2,4,2,'#b54835');r(6,hy-3,1,2,'#d26643');r(8,hy+2,1,1,'#273029');r(9,hy+3,3,2,'#c99b43');r(6,hy+6,2,2,'#b74a35');ctx.restore()}
return {...art,person,chicken};};})();
