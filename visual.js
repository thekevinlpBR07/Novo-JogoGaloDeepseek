// Character fallback only. The yard background is assembled by ModularYard.
const legacyArt=window.createArt;
window.createArt=function(ctx){const old=legacyArt(ctx),r=old.r;
function person(x,y,step=0,npc=false,face=0){const walk=Math.abs(Math.sin(step)),s=step?Math.sin(step)*2:0,back=face===2,side=face===1||face===-1;
ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(.9,.9);if(face===-1)ctx.scale(-1,1);
r(-10,-2,21,4,'#233a3b55');r(-6,-12,5,11+s,'#31495b');r(2,-12,5,11-s,'#3b5865');r(-7,-2+s,7,3,'#443829');r(2,-2-s,7,3,'#443829');r(-6,-10,2,6,'#66818a');
r(-8,-27-walk,17,17,npc?'#92513c':'#446e73');r(-5,-26-walk,11,14,npc?'#c38559':'#6a9691');r(-2,-26-walk,2,12,'#c2c6a0');r(-8,-14-walk,17,3,'#5e4d3a');r(-10,-24+s,4,11,'#c68a57');r(9,-24-s,4,11,'#dfac71');
r(-6,-39-walk,13,13,'#c9935e');r(-4,-37-walk,10,9,'#e5b77b');if(back)r(-6,-38-walk,13,9,'#624632');else{r(side?4:-3,-34-walk,2,2,'#293838');if(!side)r(3,-34-walk,2,2,'#293838');r(side?6:-1,-31-walk,3,2,'#b37950');r(-2,-28-walk,7,2,'#75513c')}
r(-13,-42-walk,27,4,'#735635');r(-12,-44-walk,25,3,'#edc77a');r(-8,-49-walk,17,7,'#c49651');r(-6,-50-walk,13,3,'#e9c47b');r(-8,-44-walk,17,2,'#966638');r(-5,-47-walk,2,2,'#f4d596');ctx.restore()}
return {...old,background(){},pond(){},tree(){},person,chicken(x,y,t,i){ctx.save();ctx.translate(Math.round(x),Math.round(y));if(Math.sin(t*.4+i)<0)ctx.scale(-1,1);r(-8,1,18,4,'#253e3655');r(-6,-8,12,10,'#bba986');r(-4,-9,11,9,i===1?'#bc7850':'#f1e8c4');r(-3,-6,7,5,i===1?'#88593f':'#d8c9a4');r(-9,-11,5,7,'#efe3c0');r(4,-13,6,8,'#fff1cf');r(4,-15,5,3,'#ba4737');r(8,-10,1,2,'#282c2a');r(10,-9,3,2,'#daa04f');r(6,-5,3,3,'#c05a40');r(-3,1,2,4,'#c19752');r(4,1,2,4,'#c19752');ctx.restore()}};
};
