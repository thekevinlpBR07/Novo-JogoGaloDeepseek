// Varredura objetiva de erros comuns de digitacao nas strings de locale (build 0.3.37).
const fs=require('fs'),vm=require('vm'),path=require('path');
const dir=path.join(__dirname,'..','public');
const order=['locales.js','yard-locales.js','time-locales.js','combat-locales.js','narrator-locales.js','lineage-locales.js','national-locales.js','international-locales.js','worldcup-locales.js','breeding-locales.js','training-locales.js','plantel-locales.js','construction-locales.js','first-day-locales.js','favors-locales.js'];
const scope={window:{}};vm.createContext(scope);
for(const f of order){vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),scope);if(f==='locales.js')scope.LOCALES=scope.window.LOCALES}
const L=scope.window.LOCALES;
function leaves(o,p=''){return Object.entries(o).flatMap(([k,v])=>{
  if(Array.isArray(v))return v.map((item,i)=>typeof item==='string'?[p+k+'['+i+']',item]:null).filter(Boolean);
  if(v&&typeof v==='object')return leaves(v,p+k+'.');
  return typeof v==='string'?[[p+k,v]]:[];
});}
let hits=0;
for(const lang of ['pt-BR','en']){
  for(const [key,text] of leaves(L[lang])){
    if(/  +/.test(text)){console.log(lang,key,'ESPACO DUPLO:',JSON.stringify(text));hits++}
    if(/\b(\w+)\s+\1\b/i.test(text)){console.log(lang,key,'PALAVRA REPETIDA:',JSON.stringify(text));hits++}
    if(/ [,.!?;:]/.test(text)){console.log(lang,key,'ESPACO ANTES DE PONTUACAO:',JSON.stringify(text));hits++}
    if(/^\s|\s$/.test(text)){console.log(lang,key,'ESPACO NA PONTA:',JSON.stringify(text));hits++}
  }
}
console.log(hits?('\n'+hits+' ocorrencia(s).'):'\nNenhuma ocorrencia encontrada.');
process.exit(0);
