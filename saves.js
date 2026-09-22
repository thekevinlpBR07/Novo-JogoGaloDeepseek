(function(root){
'use strict';
const State=typeof module!=='undefined'?require('./state.js'):root.GameState;
class SaveManager{
 constructor(storage){this.storage=storage}
 key(slot){if(!Number.isInteger(slot)||slot<1||slot>3)throw Error('Invalid slot');return 'quintal.slot.'+slot}
 inspect(slot){try{const raw=this.storage.getItem(this.key(slot));if(raw===null||raw==='null')return {status:'empty'};return {status:'ready',...State.decode(raw)}}catch(error){return {status:'unavailable',error:error.message}}}
 load(slot){const result=this.inspect(slot);if(result.status!=='ready')throw Error('Slot unavailable');return result.state}
 save(slot,state){this.storage.setItem(this.key(slot),State.encode(state))}
 delete(slot){this.storage.setItem(this.key(slot),'null')}
 migrateLegacy(){if(this.storage.getItem(this.key(1))!==null)return;const raw=this.storage.getItem('quintal.save.v1');if(raw&&raw!=='null')this.save(1,State.decode(raw).state)}
}
root.SaveManager=SaveManager;if(typeof module!=='undefined')module.exports=SaveManager;
})(typeof window==='undefined'?globalThis:window);
