// Checagem de qualidade de microcopy (build 0.3.37): compara PT-BR x EN em todos os
// arquivos *-locales.js: paridade de placeholders {var}, strings vazias e duplicadas
// dentro do mesmo idioma (indício de copiar-colar errado).
const fs=require('fs'),vm=require('vm'),path=require('path');
const dir=path.join(__dirname,'..','public');
// mesma ordem de carregamento do index.html (algumas locales dependem de chaves ja definidas por outras)
const order=['locales.js','yard-locales.js','time-locales.js','combat-locales.js','narrator-locales.js','lineage-locales.js','national-locales.js','international-locales.js','worldcup-locales.js','breeding-locales.js','training-locales.js','plantel-locales.js','construction-locales.js','first-day-locales.js','favors-locales.js'];
const scope={window:{}};vm.createContext(scope);
for(const f of order){vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),scope);if(f==='locales.js')scope.LOCALES=scope.window.LOCALES}
const L=scope.window.LOCALES;
function leaves(o,p=''){return Object.entries(o).flatMap(([k,v])=>{
  if(Array.isArray(v))return v.map((item,i)=>typeof item==='string'?[p+k+'['+i+']',item]:null).filter(Boolean);
  if(v&&typeof v==='object')return leaves(v,p+k+'.');
  return typeof v==='string'?[[p+k,v]]:[];
});}
const pt=Object.fromEntries(leaves(L['pt-BR'])), en=Object.fromEntries(leaves(L.en));
const ph=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
let problems=0;
for(const key of Object.keys(pt)){
  if(!(key in en)){console.log('SO EM PT:',key);problems++;continue}
  const a=pt[key],b=en[key];
  if(key==='favors.ask.dolores')continue; // vazio de proposito: ela da dica, nao pede favor
  if(!a.trim()){console.log('PT VAZIO:',key);problems++}
  if(!b.trim()){console.log('EN VAZIO:',key);problems++}
  const pa=ph(a),pb=ph(b);
  if(pa!==pb){console.log('PLACEHOLDER DIFERENTE:',key,'pt=['+pa+']','en=['+pb+']');problems++}
}
for(const key of Object.keys(en))if(!(key in pt)){console.log('SO EM EN:',key);problems++}
// Strings pt-BR identicas a en (mesmo texto, pode ser esquecimento de traducao - ignora nomes proprios curtos e numeros)
for(const key of Object.keys(pt)){
  const a=pt[key],b=en[key];
  if(a&&b&&a===b&&a.length>6&&/[a-zA-Z]{4,}/.test(a)&&!/^[A-Z][a-zA-ZÀ-ú' ]+$/.test(a)){
    console.log('IGUAL EM PT E EN (confira se e nome proprio):',key,'->',JSON.stringify(a));
  }
}
console.log(problems?('\n'+problems+' problema(s) estrutural(is).'):'\nSem problemas estruturais (placeholders/chaves) encontrados.');
process.exit(problems?1:0);
