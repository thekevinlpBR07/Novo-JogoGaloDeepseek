// Arte real de combate por genotipo/qualidade (Secao 14.8/14.9 - roadmap,
// ainda nao fechado como build formal). Cada ave escolhe seu sprite conforme
// tier de potencial (capenga/padrao/campeao) e cor/crista (Secao 2 do
// documento de assets); so o tier padrao-comum-ereta tem o conjunto completo
// de poses de combate por enquanto — as demais caem pra idle (Secao 7 do
// documento: prioridade e cobrir esse conjunto pras outras 8 combinacoes).
const FightArt = (() => {
  const BASE = 'assets/plantel/fight/';
  const sources = {
    'capenga-01-idle': BASE + 'capenga-01-idle.png',
    'padrao-comum-ereta-01-idle': BASE + 'padrao-comum-ereta-01-idle.png',
    'padrao-comum-tombada-01-idle': BASE + 'padrao-comum-tombada-01-idle.png',
    'padrao-malhada-ereta-01-idle': BASE + 'padrao-malhada-ereta-01-idle.png',
    'padrao-malhada-tombada-01-idle': BASE + 'padrao-malhada-tombada-01-idle.png',
    'campeao-comum-ereta-01-idle': BASE + 'campeao-comum-ereta-01-idle.png',
    'campeao-comum-tombada-01-idle': BASE + 'campeao-comum-tombada-01-idle.png',
    'campeao-malhada-ereta-01-idle': BASE + 'campeao-malhada-ereta-01-idle.png',
    'campeao-malhada-tombada-01-idle': BASE + 'campeao-malhada-tombada-01-idle.png',
    'padrao-comum-ereta-02-guarda-defensiva': BASE + 'padrao-comum-ereta-02-guarda-defensiva.png',
    'padrao-comum-ereta-03-ataque-basico-preparo': BASE + 'padrao-comum-ereta-03-ataque-basico-preparo.png',
    'padrao-comum-ereta-04-ataque-basico-impacto': BASE + 'padrao-comum-ereta-04-ataque-basico-impacto.png',
    'padrao-comum-ereta-05-passo-terreiro-preparo': BASE + 'padrao-comum-ereta-05-passo-terreiro-preparo.png',
    'padrao-comum-ereta-06-passo-terreiro-impacto': BASE + 'padrao-comum-ereta-06-passo-terreiro-impacto.png',
    'padrao-comum-ereta-07-asa-fantasma-preparo': BASE + 'padrao-comum-ereta-07-asa-fantasma-preparo.png',
    'padrao-comum-ereta-08-asa-fantasma-impacto': BASE + 'padrao-comum-ereta-08-asa-fantasma-impacto.png',
    'padrao-comum-ereta-09-rei-poleiro-preparo': BASE + 'padrao-comum-ereta-09-rei-poleiro-preparo.png',
    'padrao-comum-ereta-10-rei-poleiro-impacto': BASE + 'padrao-comum-ereta-10-rei-poleiro-impacto.png',
    'padrao-comum-ereta-11-olhar-milho-preparo': BASE + 'padrao-comum-ereta-11-olhar-milho-preparo.png',
    'padrao-comum-ereta-12-olhar-milho-impacto': BASE + 'padrao-comum-ereta-12-olhar-milho-impacto.png',
    'padrao-comum-ereta-13-coco-combo-preparo': BASE + 'padrao-comum-ereta-13-coco-combo-preparo.png',
    'padrao-comum-ereta-14-coco-combo-impacto': BASE + 'padrao-comum-ereta-14-coco-combo-impacto.png',
    'padrao-comum-ereta-15-bicada-filosofica-preparo': BASE + 'padrao-comum-ereta-15-bicada-filosofica-preparo.png',
    'padrao-comum-ereta-16-bicada-filosofica-impacto': BASE + 'padrao-comum-ereta-16-bicada-filosofica-impacto.png',
    'padrao-comum-ereta-17-reacao-golpe': BASE + 'padrao-comum-ereta-17-reacao-golpe.png',
    'padrao-comum-ereta-18-nocaute': BASE + 'padrao-comum-ereta-18-nocaute.png',
    'padrao-comum-ereta-19-vitoria': BASE + 'padrao-comum-ereta-19-vitoria.png',
    'padrao-comum-ereta-20-derrota': BASE + 'padrao-comum-ereta-20-derrota.png',
    'topo-01-idle': BASE + 'topo-01-idle.png',
    'topo-02-guarda-defensiva': BASE + 'topo-02-guarda-defensiva.png',
    'topo-03-ataque-basico-preparo': BASE + 'topo-03-ataque-basico-preparo.png',
    'topo-04-ataque-basico-impacto': BASE + 'topo-04-ataque-basico-impacto.png',
    'topo-05-passo-terreiro-preparo': BASE + 'topo-05-passo-terreiro-preparo.png',
    'topo-06-passo-terreiro-impacto': BASE + 'topo-06-passo-terreiro-impacto.png',
    'topo-07-asa-fantasma-preparo': BASE + 'topo-07-asa-fantasma-preparo.png',
    'topo-08-asa-fantasma-impacto': BASE + 'topo-08-asa-fantasma-impacto.png',
    'topo-09-rei-poleiro-preparo': BASE + 'topo-09-rei-poleiro-preparo.png',
    'topo-10-rei-poleiro-impacto': BASE + 'topo-10-rei-poleiro-impacto.png',
    'topo-11-olhar-milho-preparo': BASE + 'topo-11-olhar-milho-preparo.png',
    'topo-12-olhar-milho-impacto': BASE + 'topo-12-olhar-milho-impacto.png',
    'topo-13-coco-combo-preparo': BASE + 'topo-13-coco-combo-preparo.png',
    'topo-14-coco-combo-impacto': BASE + 'topo-14-coco-combo-impacto.png',
    'topo-15-bicada-filosofica-preparo': BASE + 'topo-15-bicada-filosofica-preparo.png',
    'topo-16-bicada-filosofica-impacto': BASE + 'topo-16-bicada-filosofica-impacto.png',
    'topo-17-reacao-golpe': BASE + 'topo-17-reacao-golpe.png',
    'topo-18-nocaute': BASE + 'topo-18-nocaute.png',
    'topo-19-vitoria': BASE + 'topo-19-vitoria.png',
    'topo-20-derrota': BASE + 'topo-20-derrota.png',
    'pintinho-01-idle': BASE + 'pintinho-01-idle.png',
    'jovem-01-idle': BASE + 'jovem-01-idle.png',
    'galinha-comum-ereta-01-idle': BASE + 'galinha-comum-ereta-01-idle.png',
    'galinha-comum-tombada-01-idle': BASE + 'galinha-comum-tombada-01-idle.png',
  };
  const frames = {};
  const waiters = [];

  function boundingBox(img) {
    const w = img.naturalWidth,
      h = img.naturalHeight;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const g = out.getContext('2d');
    g.drawImage(img, 0, 0);
    const pixels = g.getImageData(0, 0, w, h).data;
    let left = w,
      top = h,
      right = 0,
      bottom = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = (y * w + x) * 4;
        if (pixels[n + 3] > 32) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    return [left, top, right - left + 1, bottom - top + 1];
  }

  // Encaixe de arte (build 0.4.0): poses novas entram so colocando o PNG em
  // assets/plantel/fight/ e rodando `node tools/atualizar-fight-index.cjs`, que grava
  // index.json com os ids extras (ex.: 'campeao-comum-ereta-04-ataque-basico-impacto').
  // Sem mascara em fight-dna.js a pose aparece sem recolorir (fallback seguro).
  let indexLoaded = typeof fetch !== 'function';
  const isReady = () => indexLoaded && Object.keys(frames).length === Object.keys(sources).length;
  const flush = () => { if (isReady()) waiters.splice(0).forEach(fn => fn()); };

  function load(id, src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      frames[id] = { image: img, box: boundingBox(img) };
      flush();
    };
    // Arquivo listado mas ausente: nao trava o jogo esperando por ele.
    img.onerror = () => { delete sources[id]; flush(); };
  }

  for (const [id, src] of Object.entries(sources)) load(id, src);
  if (typeof fetch === 'function') {
    fetch(BASE + 'index.json').then(r => (r.ok ? r.json() : [])).catch(() => []).then(list => {
      for (const id of Array.isArray(list) ? list : []) {
        if (typeof id === 'string' && !sources[id]) { sources[id] = BASE + id + '.png'; load(id, sources[id]); }
      }
      indexLoaded = true;
      flush();
    });
  }

  function whenReady(fn) {
    if (isReady()) fn();
    else waiters.push(fn);
  }

  // Desenha a pose `id` centrada em (x,y) com a altura alvo `height`.
  function draw(c, id, x, y, height) {
    const f = frames[id] || frames['padrao-comum-ereta-01-idle'];
    if (!f) return false;
    height *= scaleFor(id);
    const width = (f.box[2] * height) / f.box[3];
    c.drawImage(f.image, ...f.box, x - width / 2, y - height, width, height);
    return true;
  }

  // --- Selecao por genotipo/qualidade (Secao 1/2 do documento de assets) -----
  function tierOf(animal) {
    const potentials = Object.values(animal?.genetics?.potential || {});
    if (!potentials.length) return 'padrao';
    const avg = potentials.reduce((a, b) => a + b, 0) / potentials.length;
    if (avg <= 40) return 'capenga';
    if (avg <= 80) return 'padrao';
    return 'campeao';
  }

  function colorKeyOf(animal) {
    const genes = animal?.genetics?.genes || {};
    const plumagem = genes.plumagem === 'malhada' ? 'malhada' : 'comum';
    const crista = genes.crista === 'tombada' ? 'tombada' : 'ereta';
    return plumagem + '-' + crista;
  }

  // Chave do sprite de uma ave numa pose. So padrao-comum-ereta tem o
  // conjunto de combate completo; qualquer outra combinacao cai pro idle
  // dela mesma (nunca pro idle de outra ave) enquanto a arte nao existir.
  // Fase de vida: filhotes guardam o dia de nascimento (bornDay); sem bornDay = adulto.
  // pintinho < 4 dias, jovem < 10 dias, depois adulto.
  function stageOf(animal) {
    if (!animal?.bornDay || typeof state === 'undefined') return 'adulto';
    const age = state.clock.day - animal.bornDay;
    const life = window.CombatConfig.LIFE;
    return age < life.chickDays ? 'pintinho' : age < life.youngDays ? 'jovem' : 'adulto';
  }
  const STAGE_SCALE = { pintinho: 0.4, jovem: 0.78 };
  function scaleFor(id) {
    return STAGE_SCALE[id.split('-')[0]] || 1;
  }

  function spriteFor(animal, pose = 'idle') {
    const stage = stageOf(animal);
    if (stage !== 'adulto') return stage + '-01-idle';
    // Anatomia 'topo' (sub-raca rara): so quem tem visualDna.bodyType === 'topo'.
    if (animal?.visualDna?.bodyType === 'topo') {
      const key = 'topo-' + (pose === 'idle' ? '01-idle' : pose);
      return sources[key] ? key : 'topo-01-idle';
    }
    const tier = tierOf(animal);
    if (tier === 'capenga') {
      const capKey = 'capenga-' + pose;
      return pose !== 'idle' && sources[capKey] ? capKey : 'capenga-01-idle';
    }
    const color = colorKeyOf(animal);
    const idleKey = tier + '-' + color + '-01-idle';
    if (pose === 'idle') return idleKey;
    // Qualquer combinacao com a pose desenhada usa a propria; senao cai no idle dela mesma.
    const fullKey = tier + '-' + color + '-' + pose;
    return sources[fullKey] ? fullKey : idleKey;
  }

  // Postura tatica -> pose de combate mais proxima (Secao 6.3/Secao 5 do doc).
  const POSTURE_POSE = {
    ofensiva: '04-ataque-basico-impacto',
    contra: '04-ataque-basico-impacto',
    tecnica: '03-ataque-basico-preparo',
    adaptativa: '01-idle',
    defensiva: '02-guarda-defensiva',
    conservadora: '02-guarda-defensiva',
  };

  function poseForPosture(posture) {
    return POSTURE_POSE[posture] || '01-idle';
  }

  // Tecnica disparada -> pose de impacto especifica (Secao 4 do doc de assets).
  const TECHNIQUE_POSE = {
    rei_poleiro: '10-rei-poleiro-impacto',
    olhar_milho: '12-olhar-milho-impacto',
    coco_combo: '14-coco-combo-impacto',
    bicada_filosofica: '16-bicada-filosofica-impacto',
  };

  function poseForTechnique(technique) {
    return TECHNIQUE_POSE[technique] || null;
  }

  // Sprite de galinha reprodutora (raca Indio Combatente). So a plumagem
  // "comum" tem arte propria por enquanto; "malhada" cai pra comum na mesma
  // crista ate a arte existir (nunca mistura ereta/tombada).
  function henSpriteFor(animal) {
    const stage = stageOf(animal);
    if (stage !== 'adulto') return stage + '-01-idle';
    const genes = animal?.genetics?.genes || {};
    const crista = genes.crista === 'tombada' ? 'tombada' : 'ereta';
    const key = 'galinha-comum-' + crista + '-01-idle';
    return sources[key] ? key : 'galinha-comum-ereta-01-idle';
  }

  // Expostos pro renderizador de DNA visual (fight-dna.js) reaproveitar a
  // MESMA imagem ja carregada aqui, sem baixar/decodificar de novo.
  function frame(id) { return frames[id] || null; }

  return { draw, spriteFor, henSpriteFor, tierOf, colorKeyOf, poseForPosture, poseForTechnique, whenReady, frame, stageOf, scaleFor, ready: isReady };
})();
