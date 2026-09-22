// Same world units as outdoors; camera magnifies the whole room equally.
(function(root){
const H={spawn:{x:328,y:396},outside:{x:228,y:187},bounds:{x:232,y:256,w:176,h:128},blocks:[{x:236,y:268,w:39,h:83},{x:353,y:257,w:48,h:36},{x:364,y:315,w:35,h:45},{x:377,y:350,w:17,h:19}],objects:[{id:'exit',x:328,y:403},{id:'bed',x:284,y:332},{id:'kitchen',x:370,y:305},{id:'table',x:350,y:343}]};
H.blocked=(x,y)=>x<239||x>401||y<280||y>405||(y>376&&(x<313||x>335))||H.blocks.some(b=>x>b.x-7&&x<b.x+b.w+7&&y>b.y-3&&y<b.y+b.h+5);
H.draw=function(ctx,art,player,step,face){const r=art.r;ctx.fillStyle='#17211e';ctx.fillRect(0,0,640,640);ctx.save();ctx.translate(320,330);ctx.scale(2,2);ctx.translate(-320,-320);
r(224,234,192,158,'#151c19');r(232,256,176,128,'#938473');
for(let y=258;y<383;y+=8)for(let x=234;x<405;x+=8){const n=(x*17+y*31)%13;r(x,y,7,7,n<4?'#998b7a':'#91816e');if(n===0)r(x+2,y+2,3,1,'#756856')}
// Exposed masonry, cracks and a boarded window.
r(228,232,184,32,'#805943');for(let y=233;y<263;y+=7)for(let x=229+(y%2)*7;x<405;x+=18){r(x,y,16,5,'#aa7252');r(x,y,14,1,'#bf8b65')}
r(277,236,34,24,'#353d34');r(279,238,30,19,'#6d8473');r(280,243,27,4,'#8e7757');r(282,250,27,4,'#705b43');r(298,238,2,20,'#b0956b');r(232,264,4,120,'#655445');r(404,264,4,120,'#655445');
// Bed: reclaimed frame, thin mattress, patched blanket.
r(239,268,32,61,'#463c30');r(242,270,26,56,'#6e563d');r(244,273,22,49,'#a59e7d');r(245,274,20,12,'#c4bc96');r(244,290,22,31,'#68796d');r(247,297,8,10,'#899281');r(260,308,4,9,'#485e55');r(241,267,3,9,'#a0865c');r(265,267,3,9,'#a0865c');
// Cheap cooker and sink on a makeshift counter.
r(354,264,45,26,'#514a3f');r(355,266,43,17,'#aaa28b');r(356,269,18,13,'#797b70');r(359,271,12,8,'#3d4c49');r(364,265,2,6,'#c0c4ad');r(377,269,19,13,'#d0c6a7');r(380,271,5,5,'#343b36');r(389,274,5,5,'#343b36');r(378,284,18,4,'#766a53');
// Uneven packing-crate table, single stool.
r(365,321,27,24,'#513f2e');r(364,319,29,17,'#95724a');for(let y=322;y<335;y+=5)r(366,y,25,1,'#684d32');r(369,321,6,5,'#b9b18c');r(387,323,3,4,'#5e7365');r(381,348,10,7,'#6a5137');
r(232,383,79,5,'#594a3b');r(344,383,64,5,'#594a3b');r(312,382,31,6,'#b6a07a');r(319,384,16,2,'#d9c495');
art.person(player.x,player.y,step,false,face);ctx.restore();};
root.HOUSE=H;if(typeof module!=='undefined')module.exports=H;
})(typeof window==='undefined'?globalThis:window);
