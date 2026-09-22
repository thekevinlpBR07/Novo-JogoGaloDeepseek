// Inventario de arte/audio que ainda falta (build 0.4.0). Le public/art-slots.js e confere quais arquivos
// ja existem. Uso:  node tools/art-inventory.cjs            -> resumo por categoria
//                   node tools/art-inventory.cjs --lista    -> lista completa dos que faltam
//                   node tools/art-inventory.cjs --md       -> mesma lista em Markdown (para colar na Biblia)
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const { DEFS } = require(path.join(pub, 'art-slots.js'));
const args = process.argv.slice(2);
const missing = DEFS.filter(d => !fs.existsSync(path.join(pub, d.path)));
const byCat = {};
for (const d of DEFS) (byCat[d.cat] ??= { total: 0, falta: 0, A: 0, B: 0, C: 0 }).total++;
for (const d of missing) { byCat[d.cat].falta++; byCat[d.cat][d.prio]++; }
const line = (a, b, c, d, e, f) => [a.padEnd(12), String(b).padStart(6), String(c).padStart(6), String(d).padStart(4), String(e).padStart(4), String(f).padStart(4)].join(' ');
console.log(line('categoria', 'total', 'falta', 'A', 'B', 'C'));
for (const [cat, n] of Object.entries(byCat)) console.log(line(cat, n.total, n.falta, n.A, n.B, n.C));
console.log(line('TOTAL', DEFS.length, missing.length, missing.filter(d => d.prio === 'A').length, missing.filter(d => d.prio === 'B').length, missing.filter(d => d.prio === 'C').length));
console.log('Prioridade: A = melhora o jogo agora; B = necessario para o jogo completo; C = acabamento/extra.');
if (args.includes('--lista')) for (const d of missing) console.log(`[${d.prio}] ${d.cat} ${d.id} -> public/${d.path} (${d.size})`);
if (args.includes('--md')) { console.log('\n| Prio | Categoria | Id | Caminho | Especificacao |\n|---|---|---|---|---|'); for (const d of missing) console.log(`| ${d.prio} | ${d.cat} | ${d.id} | public/${d.path} | ${d.size} |`); }
