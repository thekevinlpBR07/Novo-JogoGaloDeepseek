// Encaixes de arte (build 0.4.0). Cada entrada e uma imagem que o jogo JA sabe usar mas que ainda nao foi
// criada: enquanto o arquivo nao existe o jogo desenha um provisorio (caixa tracejada com o nome) e
// continua funcional; ao colocar o PNG no caminho indicado ele passa a ser usado sem mexer no codigo.
// Lista dos que faltam: `node tools/art-inventory.cjs` (a Biblia, Adendo 0.4, aponta para ele).
// Regras de arte: nada de marca real, nada de texto desenhado (o jogo escreve os textos), fundo transparente
// (ou magenta #FF00FF quando a peca for recortada por tools/SheetCut.cs), mesmo estilo dos personagens novos.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const DEFS = [];
  const add = (id, cat, path, size, note, prio = 'B') => DEFS.push({ id, cat, path, size, note, prio });

  // --- COMBATE (P011): 19 poses x 7 combinacoes de galo (so o idle existe hoje) ------------------------------
  const BODIES = ['campeao-comum-ereta', 'campeao-comum-tombada', 'campeao-malhada-ereta', 'campeao-malhada-tombada', 'padrao-malhada-ereta', 'padrao-malhada-tombada', 'capenga'];
  const POSES = ['02-guarda-defensiva', '03-ataque-basico-preparo', '04-ataque-basico-impacto', '05-passo-terreiro-preparo', '06-passo-terreiro-impacto', '07-asa-fantasma-preparo', '08-asa-fantasma-impacto', '09-rei-poleiro-preparo', '10-rei-poleiro-impacto', '11-olhar-milho-preparo', '12-olhar-milho-impacto', '13-coco-combo-preparo', '14-coco-combo-impacto', '15-bicada-filosofica-preparo', '16-bicada-filosofica-impacto', '17-reacao-golpe', '18-nocaute', '19-vitoria', '20-derrota'];
  for (const b of BODIES) for (const p of POSES) {
    add(b + '-' + p, 'combate', 'assets/plantel/fight/' + b + '-' + p + '.png', '1254x1254 PNG transparente, mesma pose/enquadramento de padrao-comum-ereta-' + p.slice(0, 2), 'Pose de luta do galo ' + b + '. Depois: rodar tools/atualizar-fight-index.cjs. Mascara de DNA em fight-dna.js e opcional (sem ela aparece sem recolorir).', b.startsWith('campeao-comum-ereta') ? 'A' : 'C');
  }

  // --- ARENAS (fundo da tela de luta, um por circuito) ---------------------------------------------------------
  for (const [id, nome, prio] of [['local', 'terreiro do bairro (Atos I-III)', 'A'], ['regional', 'arena regional (Ato IV)', 'B'], ['nacional', 'arena nacional (Ato VI)', 'B'], ['int-1', 'arena internacional 1 (estilo visual proprio)', 'C'], ['int-2', 'arena internacional 2 (estilo visual proprio)', 'C'], ['int-3', 'arena internacional 3 (estilo visual proprio)', 'C'], ['int-4', 'arena internacional 4 (estilo visual proprio)', 'C'], ['mundial', 'arena do Mundial (Ato VIII)', 'B']])
    add('arena-' + id, 'cenario', 'assets/arena/arena-' + id + '.png', '1280x720 PNG, sem personagens, area central livre para os dois galos', 'Fundo da luta: ' + nome + '. Publico so como silhueta ao fundo.', prio);

  // --- VIAGEM (vinheta) -----------------------------------------------------------------------------------------
  for (const [id, nome] of [['ceu', 'ceu e nuvens'], ['colinas', 'colinas/paisagem distante'], ['estrada', 'pista e acostamento']])
    add('viagem-' + id, 'viagem', 'assets/trip/layer-' + id + '.png', '1280x260 PNG, repete na horizontal (bordas iguais)', 'Camada de paralaxe da vinheta da viagem (hoje vetorial): ' + nome + '.', 'C');
  // Nacional: a van do Renato (assets/trip/van.png, ja existe). Internacional: a van leva ate o aeroporto e depois avião.
  add('viagem-aeroporto', 'viagem', 'assets/trip/layer-aeroporto.png', '1280x260 PNG, repete na horizontal', 'Fundo do aeroporto onde a van do Renato deixa o grupo (Ato VII).', 'C');
  add('viagem-aviao', 'viagem', 'assets/trip/plane.png', 'PNG transparente, lateral, ~1200x400', 'Aviao da viagem internacional (Ato VII).', 'C');

  // --- LINHAGEM, TROFEUS, HALL DA FAMA (Atos V e VIII) ---------------------------------------------------------
  add('placa-linhagem', 'linhagem', 'assets/lineage/sign.png', 'PNG transparente ~480x300, com FACE EM BRANCO para o jogo escrever o nome', 'Placa fisica da propriedade com o nome da linhagem (Ato V).', 'B');
  add('moldura-hall', 'linhagem', 'assets/lineage/hall-frame.png', 'PNG ~1000x700 com miolo transparente', 'Moldura do Hall da Fama / arvore de linhagem.', 'C');
  for (const [id, nome] of [['local', 'titulo local'], ['regional', 'Regional'], ['nacional', 'Nacional'], ['mundial', 'Mundial']])
    add('trofeu-' + id, 'linhagem', 'assets/lineage/trophy-' + id + '.png', 'PNG transparente ~256x384', 'Trofeu: ' + nome + '.', id === 'local' ? 'C' : 'B');
  add('galo-aposentado', 'linhagem', 'assets/lineage/retired-badge.png', 'PNG transparente 128x128', 'Selo/faixa de campeao aposentado no recinto.', 'C');

  // --- DOCUMENTO CITA (Ato VII) -----------------------------------------------------------------------------------
  for (const [id, nome] of [['fundo', 'papel do certificado, sem texto'], ['selo-pendente', 'selo em preparo'], ['selo-pronto', 'selo aprovado'], ['selo-vencido', 'selo vencido']])
    add('cita-' + id, 'cita', 'assets/cita/' + id + '.png', id === 'fundo' ? 'PNG ~900x600' : 'PNG transparente 192x192', 'CITA (documento ficticio de gameplay): ' + nome + '.', 'B');

  // --- CONSTRUCOES DO QUINTAL (masterplan 11.6/11.7): 1 conjunto por area, niveis 1-3 ------------------------------
  for (const area of ['postura', 'horta', 'reproducao', 'incubacao', 'pintinhos', 'juvenis', 'galos', 'treino', 'recuperacao', 'estoque', 'aposentados', 'administracao'])
    for (const nivel of [1, 2, 3])
      add('obra-' + area + '-' + nivel, 'construcao', 'assets/yard/' + area + '-' + nivel + '.png', 'PNG transparente, mesma escala de assets/modular e do anexo', 'Area ' + area.toUpperCase() + ' nivel ' + nivel + ' (ocupa o envelope da Biblia 11.7; nao invade corredores livres).', nivel === 1 ? 'B' : 'C');

  // --- PERSONAGENS NOVOS (metodo das 2 folhas, PROMPTS-PERSONAGENS.md) ---------------------------------------------
  for (const [id, nome] of [['rival-nac-1', 'rival nacional 1'], ['rival-nac-2', 'rival nacional 2'], ['rival-nac-3', 'rival nacional 3'], ['rival-int-1', 'rival internacional 1'], ['rival-int-2', 'rival internacional 2'], ['rival-int-3', 'rival internacional 3'], ['juiz', 'juiz/arbitro do circuito'], ['fiscal-cita', 'atendente do CITA']])
    add('npc-' + id, 'personagem', 'assets/npcs/' + id.replace(/-/g, '') + '/manifest.json', 'Folhas A e B (ver PROMPTS-PERSONAGENS.md) + tools/Integrar.ps1', 'Personagem ' + nome + ': aparece enquanto nao existe como retrato generico com o nome.', 'C');

  // --- TELAS ---------------------------------------------------------------------------------------------------------
  add('capa-menu', 'tela', 'assets/ui/cover.png', '1920x1080 PNG', 'Arte da tela inicial (o titulo e escrito pelo jogo).', 'B');
  add('fim-epilogo', 'tela', 'assets/ui/epilogue.png', '1920x1080 PNG', 'Ilustracao do epilogo: quintal, NPCs, linhagem (Ato VIII).', 'B');

  // --- AUDIO (arquivos OGG/MP3; o jogo hoje usa sons sintetizados) -------------------------------------------------------
  for (const [id, nome] of [['quintal-dia', 'quintal de dia'], ['quintal-noite', 'quintal a noite'], ['bairro', 'bairro / rua'], ['luta', 'luta'], ['resultado', 'resultado da luta'], ['viagem', 'viagem'], ['internacional', 'circuito internacional'], ['epilogo', 'epilogo'], ['menu', 'menu inicial']])
    add('musica-' + id, 'audio', 'assets/audio/' + id + '.ogg', 'OGG loop 1-3 min (ou .mp3)', 'Trilha: ' + nome + '. Autor fornece os arquivos ou libera ferramenta de geracao.', id === 'luta' || id === 'quintal-dia' ? 'B' : 'C');

  const ArtSlots = { DEFS, byId: id => DEFS.find(d => d.id === id) || null };

  if (node) module.exports = ArtSlots;
  else {
    const imgs = {};
    // assets/art-index.json (gerado por tools/atualizar-arte.cjs) lista os encaixes que ja tem arquivo; assim o jogo
    // nunca pede uma imagem que nao existe (sem 404 no console). null = indice ainda nao carregou.
    let indexed = null;
    if (typeof fetch === 'function') {
      fetch('assets/art-index.json').then(r => (r.ok ? r.json() : [])).catch(() => []).then(list => { indexed = new Set(Array.isArray(list) ? list : []); });
    }
    // Devolve a imagem quando o arquivo existe e ja carregou; senao null (quem chama desenha o provisorio).
    ArtSlots.image = id => {
      const def = ArtSlots.byId(id);
      if (!def || !indexed || !indexed.has(id)) return null;
      if (!imgs[id]) {
        imgs[id] = { ok: false, img: new Image() };
        imgs[id].img.onload = () => { imgs[id].ok = true; };
        imgs[id].img.onerror = () => { imgs[id].failed = true; };
        imgs[id].img.src = def.path;
      }
      return imgs[id].ok ? imgs[id].img : null;
    };
    ArtSlots.has = id => !!ArtSlots.image(id);
    // Desenha a arte no retangulo (x,y,w,h); sem arte, uma caixa tracejada com o nome (provisorio funcional).
    ArtSlots.draw = (c, id, x, y, w, h, label) => {
      const img = ArtSlots.image(id);
      if (img) { c.drawImage(img, x, y, w, h); return true; }
      c.save();
      c.fillStyle = 'rgba(40,52,44,.55)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(229,215,173,.7)'; c.setLineDash([6, 4]); c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      c.setLineDash([]); c.fillStyle = 'rgba(229,215,173,.9)'; c.font = 'bold ' + Math.max(10, Math.min(16, w / 14)) + 'px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label || id, x + w / 2, y + h / 2, w - 8);
      c.restore();
      return false;
    };
    root.ArtSlots = ArtSlots;
  }
})(typeof window === 'undefined' ? globalThis : window);
