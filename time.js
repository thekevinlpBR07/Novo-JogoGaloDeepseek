(function(root){
'use strict';
const Farm=typeof module!=='undefined'?require('./farm.js'):root.Farm;
const period=m=>m<360?'night':m<720?'morning':m<1080?'afternoon':'night';
const foods={radish:18,corn:22,egg:25};
function initialize(s){Object.assign(s.clock,{fractionMs:s.clock.fractionMs??0,needMinutes:s.clock.needMinutes??0,lastSleptDay:s.clock.lastSleptDay??0});s.world.objects.lastMealDay??=0;return s}
function validate(s){const c=s.clock,int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;return int(c.fractionMs,0,1999)&&int(c.needMinutes,0,29)&&int(c.lastSleptDay,0,c.day)&&int(s.world.objects.lastMealDay,0,c.day)}
function advance(s,minutes){if(!Number.isSafeInteger(minutes)||minutes<0||minutes>10080)throw Error('Invalid elapsed time');
 for(let i=0;i<minutes;i++){
  s.clock.minutes++;s.clock.needMinutes++;
  if(s.clock.needMinutes===30){s.clock.needMinutes=0;s.hunger=Math.min(100,s.hunger+2);s.energy=Math.max(0,s.energy-1)}
  if(s.clock.minutes===1440){const energy=s.energy;Farm.sleep(s);s.energy=energy;s.clock.minutes=0}
  s.clock.period=period(s.clock.minutes);
 }return s;
}
function tick(s,seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>1)throw Error('Invalid frame duration');const ms=s.clock.fractionMs+Math.round(seconds*1000),minutes=Math.floor(ms/2000);s.clock.fractionMs=ms%2000;if(minutes)advance(s,minutes);return minutes>0}
function sleep(s){const result=Farm.sleep(s);if(s.story.firstDay?.enabled){s.clock.minutes=390;s.clock.period='morning'}s.clock.fractionMs=0;s.clock.needMinutes=0;s.clock.lastSleptDay=s.clock.day;s.energy=100;s.hunger=Math.min(100,s.hunger+12);return result}
function eat(s,id){if(!Object.hasOwn(foods,id)||!(s.inventory.items[id]>0)||s.hunger===0)return false;s.inventory.items[id]--;s.hunger=Math.max(0,s.hunger-foods[id]);s.energy=Math.min(100,s.energy+3);advance(s,5);return true}
function meal(s){if(s.world.objects.lastMealDay===s.clock.day)return false;s.world.objects.lastMealDay=s.clock.day;s.hunger=Math.max(0,s.hunger-65);s.energy=Math.min(100,s.energy+10);advance(s,15);return true}
function work(s,type){const costs={prepare:4,plant:2,water:2,harvest:3,feed:2,collect:1};s.energy=Math.max(0,s.energy-(costs[type]||0));advance(s,costs[type]||0)}
function speed(s,running){return (running&&s.energy>15&&s.hunger<85?135:85)*(s.energy<=15||s.hunger>=85?.85:1)}
// Schedule windows use game minutes and support intervals crossing midnight.
function isOpen(clock,start,end){return start===end|| (start<end?clock.minutes>=start&&clock.minutes<end:clock.minutes>=start||clock.minutes<end)}
function darkness(clock){const m=clock.minutes+clock.fractionMs/2000;return m<300?.36:m<420?.36*(420-m)/120:m<1020?0:m<1200?.36*(m-1020)/180:.36}
const GameTime={initialize,validate,advance,tick,sleep,eat,meal,work,speed,isOpen,darkness,foods,period};root.GameTime=GameTime;if(typeof module!=='undefined')module.exports=GameTime;
})(typeof window==='undefined'?globalThis:window);
