// Atualiza os indices de arte depois de colocar imagens novas nas pastas:
//   node tools/atualizar-arte.cjs
// 1) public/assets/art-index.json: ids dos encaixes de public/art-slots.js cujo arquivo ja existe
//    (o jogo so pede imagens listadas aqui, entao nao gera 404 para as que ainda faltam);
// 2) public/assets/plantel/fight/index.json: poses de combate extras (ver atualizar-fight-index.cjs).
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const { DEFS } = require(path.join(pub, 'art-slots.js'));
const present = DEFS.filter(d => fs.existsSync(path.join(pub, d.path))).map(d => d.id).sort();
fs.writeFileSync(path.join(pub, 'assets', 'art-index.json'), JSON.stringify(present, null, 2) + '\n');
console.log(present.length + ' encaixe(s) com arquivo de ' + DEFS.length + ' em art-index.json' + (present.length ? ':\n  ' + present.join('\n  ') : '.'));
require('./atualizar-fight-index.cjs');
