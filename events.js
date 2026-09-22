(function(root){
'use strict';
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const EventFlags={
 safeId,
 has(state,id){return state.events.flags[id]===true},
 set(state,id){if(!safeId(id))throw Error('Invalid flag ID');if(this.has(state,id))return false;state.events.flags[id]=true;return true},
 record(state,event){
  if(!safeId(event.id)||!safeId(event.type)||(event.target!==undefined&&!safeId(event.target))||!Number.isSafeInteger(event.amount??1)||(event.amount??1)<1)throw Error('Invalid event');
  if(Object.hasOwn(state.events.records,event.id))return false;
  state.events.records[event.id]={type:event.type,target:event.target??null,amount:event.amount??1,day:state.clock.day,minutes:state.clock.minutes};return true;
 }
};
root.EventFlags=EventFlags;if(typeof module!=='undefined')module.exports=EventFlags;
})(typeof window==='undefined'?globalThis:window);
