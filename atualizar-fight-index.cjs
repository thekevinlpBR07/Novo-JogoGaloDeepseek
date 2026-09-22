// Gera public/assets/plantel/fight/index.json com os ids das poses de combate EXTRAS (as que nao estao na
// lista fixa de fight-art.js). Rode depois de colocar PNGs novos na pasta:  node tools/atualizar-fight-index.cjs
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'public', 'assets', 'plantel', 'fight');
const fixed = new Set([...fs.readFileSync(path.join(__dirname, '..', 'public', 'fight-art.js'), 'utf8').matchAll(/'([a-z0-9-]+)': BASE \+/g)].map(m => m[1]));
const extras = fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).filter(id => /^[a-z0-9-]+$/.test(id) && !fixed.has(id)).sort();
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(extras, null, 2) + '\n');
console.log(extras.length + ' pose(s) extra(s) em index.json' + (extras.length ? ':\n  ' + extras.join('\n  ') : ' (nenhuma nova).'));
