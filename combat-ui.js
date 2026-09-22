// UI de combate: preparo, intervalo entre rounds e resultado. Segue o mesmo
// padrão de renderStory/renderYard (first-day-ui.js / yard-ui.js).
let fight = null;
let fightRoosterId = null;
let pendingRival = null;
let fightStance = 'tecnica';
let fightTechniques = [];
let fightOption = 'segure';
let fightNextStance = 'tecnica';
let fightScouted = false;
let fightStake = 'amistosa';
let fightPayout = 0;
let regionalPay = null;
let firstCompetition = null; // E007: presenca paga na primeira luta do galo inicial
let fightPlaybackEvents = [];
let fightPlaybackIndex = -1;
let fightPlaybackTimer = null;
let fightPlaybackOnDone = null;
let fightLiveVida = null;
let fightLastEvent = null;
let fightNarr = '';

// --- Circuito Nacional (Ato VI, national.js): etapa escolhida na preparacao da luta ---
let fightNational = null; // etapa nacional escolhida (ou null = circuito local)
let nationalResult = null; // resultado pago, mostrado na tela de resultado
let fightIntl = null; // destino internacional escolhido (Ato VII, international.js) ou null
let intlResult = null; // resultado da luta internacional (premio, viagem, grupo)
let fightWorld = null; // rodada do Mundial escolhida (Ato VIII, worldcup.js) ou null
let worldResult = null; // resultado da rodada do Mundial
const natL = () => LOCALES[lang].national;
const natFmt = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const natMoney = n => new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(n / 100);

function nationalRivalFor(st) {
  const r = National.rival(st);
  r.name = natL().rivals[st.id];
  return r;
}

function chooseNational(on) {
  const st = National.nextStage(state);
  fightIntl = null; // nacional, internacional e Mundial sao excludentes
  fightWorld = null;
  if (on && st && National.canEnter(state)) {
    fightNational = st;
    pendingRival = nationalRivalFor(st);
  } else {
    fightNational = null;
    pendingRival = generateRival(state.roosters.byId[fightRoosterId]);
  }
  renderYard();
}

function renderNationalBlock(body) {
  const n = natL();
  const box = document.createElement('div');
  box.className = 'fight-scouted';
  const head = document.createElement('strong');
  head.textContent = n.title;
  box.append(head);
  const next = National.nextStage(state);
  for (const st of National.STAGES) {
    const status = National.stageDone(state, st.id) ? n.status.done : st === next ? n.status.next : n.status.locked;
    const line = document.createElement('p');
    line.textContent = natFmt(n.stageLine, { etapa: n.stages[st.id], rival: n.rivals[st.id], status });
    box.append(line);
  }
  body.append(box);
  if (!next) {
    const done = document.createElement('p');
    done.className = 'fight-mood';
    done.textContent = n.finished;
    body.append(done);
    return;
  }
  if (fightNational) {
    const sel = document.createElement('p');
    sel.className = 'fight-mood';
    sel.textContent = natFmt(n.selected, { etapa: n.stages[fightNational.id], rival: n.rivals[fightNational.id] });
    body.append(sel);
    const back = document.createElement('button');
    back.textContent = n.back;
    back.onclick = () => chooseNational(false);
    body.append(back);
    return;
  }
  if (!National.available(state)) {
    const wait = document.createElement('p');
    wait.textContent = natFmt(n.wait, { dias: National.daysUntil(state) });
    body.append(wait);
    return;
  }
  if (next.sponsored) {
    const sp = document.createElement('p');
    sp.textContent = n.sponsored;
    body.append(sp);
  }
  if (!National.canEnter(state)) {
    const poor = document.createElement('p');
    poor.textContent = natFmt(n.noMoney, { valor: natMoney(National.cost(next) - state.money) });
    body.append(poor);
    return;
  }
  const go = document.createElement('button');
  go.className = 'fight-start';
  go.textContent = natFmt(n.enter, { etapa: n.stages[next.id], custo: natMoney(National.cost(next)), premio: natMoney(National.maxPrize(next)) });
  go.onclick = () => chooseNational(true);
  body.append(go);
}

// Fundo da arena (assets/arena/*, encaixe de arte): so desenha quando o arquivo existe; sem ele fica sem fundo.
function drawFightArena(pc, w, h) {
  if (typeof ArtSlots === 'undefined') return;
  const id = fightWorld ? 'arena-mundial' : fightIntl ? 'arena-' + fightIntl.arena : fightNational ? 'arena-nacional' : pendingRival?.isRegional ? 'arena-regional' : 'arena-local';
  const img = ArtSlots.image(id);
  if (img) pc.drawImage(img, 0, 0, w, h);
}

// Narrador Kazao (0.4.1): fala deterministica pela semente da luta; nao usa Math.random nem altera a simulacao.
function narrText(kind, n) {
  const nl = LOCALES[lang].narrator;
  if (typeof Narrator === 'undefined' || !nl || !fight) return '';
  const a = state.roosters.byId[fightRoosterId]?.name || LOCALES[lang].combat.you;
  return Narrator.line(nl.banks, kind, fight.seed + fight.round * 17, n, { a, b: fight.rival?.name || '' });
}

function narratorParagraph(body, text) {
  if (!text) return;
  const p = document.createElement('p');
  p.className = 'fight-narrator';
  p.textContent = LOCALES[lang].narrator.name + ': ' + text;
  body.append(p);
}

const PLAYBACK_MS = 140; // ritmo da reproducao beat a beat (Secao 14.9)

const FIGHT_STAKE_POOL = ['amistosa', 'baixa', 'media', 'alta'];
const FIGHT_TECHNIQUE_POOL = ['passo_terreno', 'asa_fantasma', 'rei_poleiro', 'olhar_milho', 'coco_combo', 'bicada_filosofica'];
const FIGHT_STANCE_POOL = ['ofensiva', 'tecnica', 'defensiva', 'contra', 'conservadora', 'adaptativa'];
const FIGHT_OPTION_POOL = ['pressione', 'segure', 'mude_ritmo', 'respire', 'observe', 'acalme'];

// O galo da historia inicial so pode lutar depois da rotina de cuidado
// (E005) estar completa; qualquer outro galo (nascido por reproducao) pode
// lutar assim que existir — a tutorial-gate e so pro primeiro animal.
function canFight(id) {
  const r = state.roosters?.byId?.[id];
  if (!r) return false;
  if (Combat.isInjured(r, state.clock.day)) return false;
  if (Combat.isChick(r, state.clock.day)) return false;
  // Veterano aposentado na placa da linhagem (Ato V) vira reprodutor: nao luta mais.
  if (typeof Lineage !== 'undefined' && Lineage.isRetired(state, id)) return false;
  // Primeiro galo: so depois do cuidado (E005) e de Gabriel apresentar o circuito local (E006).
  if (id === FirstDay.CONFIG.roosterId) return FirstDay.data(state)?.phase === 'complete' && FirstDay.circuitOpen(state);
  return true;
}

function generateRival(rooster) {
  const l = LOCALES[lang].combat;
  // Campeonato Regional (E019): depois da viagem com Renato, a proxima luta e contra a ave da Claudineia (tecnica, no alto da faixa).
  if (EventFlags.has(state, 'viagem_visto') && !EventFlags.has(state, 'regional_disputado')) {
    const [rMin, rMax] = Combat.reputationTier(rooster).rivalBase;
    const stat = () => Math.round(rMin + (rMax - rMin) * 0.85);
    return {
      id: 'rival_regional', name: LOCALES[lang].firstDay.regionalName, profile: 'tecnico', isRegional: true,
      techniques: ['passo_terreno', 'olhar_milho'],
      attributes: { forca: stat(), velocidade: stat(), resistencia: stat(), reflexo: stat(), tecnica: stat() + 4, disciplina: stat() + 4, inteligencia: stat() },
      traits: [],
    };
  }
  // E014: primeira rivalidade — o Principe do circuito (Carlos Nascimento), provocador, enfrentado uma vez por evento.
  if (rooster.id === FirstDay.CONFIG.roosterId && EventFlags.has(state, 'E014') && !EventFlags.has(state, 'principe_enfrentado')) {
    const [rMin, rMax] = Combat.reputationTier(rooster).rivalBase;
    const stat = () => Math.round(rMin + (rMax - rMin) * 0.75);
    return {
      id: 'rival_principe', name: LOCALES[lang].firstDay.principeName, profile: 'agressivo', isPrincipe: true,
      techniques: ['passo_terreno', 'rei_poleiro'],
      attributes: { forca: stat(), velocidade: stat(), resistencia: stat(), reflexo: stat(), tecnica: stat(), disciplina: stat(), inteligencia: stat() },
      traits: [],
    };
  }
  const profiles = Object.keys(CombatConfig.RIVAL_PROFILES);
  const profile = profiles[Math.floor(Math.random() * profiles.length)];
  const [repMin, repMax] = Combat.reputationTier(rooster).rivalBase;
  const base = repMin + Math.floor(Math.random() * (repMax - repMin));
  const jitter = () => Math.max(10, base + Math.floor(Math.random() * 14 - 7));
  const shuffled = [...FIGHT_TECHNIQUE_POOL].sort(() => Math.random() - 0.5);
  return {
    id: 'rival_' + Math.floor(Math.random() * 1e6),
    name: l.rivalNames[Math.floor(Math.random() * l.rivalNames.length)],
    profile,
    techniques: shuffled.slice(0, 1 + Math.floor(Math.random() * 2)),
    attributes: {
      forca: jitter(),
      velocidade: jitter(),
      resistencia: jitter(),
      reflexo: jitter(),
      tecnica: jitter(),
      disciplina: jitter(),
      inteligencia: jitter(),
    },
    traits: [],
  };
}

function openFight(roosterId) {
  if (!canFight(roosterId)) return;
  fightRoosterId = roosterId;
  if (typeof FightDna !== 'undefined') FightDna.preload(state.roosters.byId[roosterId]);
  fight = null;
  fightStance = 'tecnica';
  fightNextStance = 'tecnica';
  fightTechniques = [];
  fightOption = 'segure';
  fightScouted = false;
  fightStake = 'amistosa';
  fightPayout = 0;
  firstCompetition = null;
  regionalPay = null;
  fightNational = null;
  nationalResult = null;
  fightIntl = null;
  intlResult = null;
  fightWorld = null;
  worldResult = null;
  clearTimeout(fightPlaybackTimer);
  fightPlaybackEvents = [];
  fightPlaybackIndex = -1;
  fightPlaybackOnDone = null;
  fightLiveVida = null;
  fightLastEvent = null;
  pendingRival = generateRival(state.roosters.byId[roosterId]);
  openYard('fight-prep');
}

function toggleTechnique(id) {
  const i = fightTechniques.indexOf(id);
  if (i >= 0) fightTechniques.splice(i, 1);
  else if (fightTechniques.length < 4) fightTechniques.push(id);
  renderYard();
}

function startFight() {
  const stakeCfg = CombatConfig.BOLSA.tiers[fightStake];
  const rooster = state.roosters.byId[fightRoosterId];
  const maxStakeIdx = CombatConfig.STAKE_ORDER.indexOf(Combat.reputationTier(rooster).maxStake);
  if (CombatConfig.STAKE_ORDER.indexOf(fightStake) > maxStakeIdx) {
    $('yardFeedback').textContent = LOCALES[lang].combat.bolsa.locked;
    return;
  }
  if (stakeCfg.stake > 0 && state.money < stakeCfg.stake) {
    $('yardFeedback').textContent = LOCALES[lang].combat.bolsa.noMoney;
    return;
  }
  fight = Combat.createFight(rooster, pendingRival, { seed: Math.floor(Math.random() * 2 ** 31), stance: fightStance, techniques: fightTechniques, isFinal: false, day: state.clock.day });
  advanceRound();
}

// Simula o round inteiro de uma vez (deterministico, Secao 13) mas
// APRESENTA beat a beat (Secao 14.9 - combate visual estilo Punch Club):
// a simulacao ja tem o resultado, a reproducao so anima o que ja aconteceu.
function advanceRound() {
  const roundNumber = fight.round;
  fightLiveVida = { player: fight.player.vida, rival: fight.rival.vida };
  Combat.simulateRound(fight);
  const events = fight.beatLog.filter(e => e.round === roundNumber);
  startPlayback(events, () => {
    if (fight.finished) {
      settleFinishedFight();
      if (typeof yardSound === 'function') yardSound(fight.outcome.result === 'win' ? 'victory' : fight.outcome.result === 'lose' ? 'defeat' : 'error');
      yardView = 'fight-result';
    } else {
      yardView = 'fight-interval';
    }
    renderYard();
  });
}

function settleFinishedFight() {
  const stakeCfg = CombatConfig.BOLSA.tiers[fightStake];
  storyCommit(s => {
    const r = s.roosters.byId[fightRoosterId];
    if (r) {
      Combat.recordFight(r, fight, { day: s.clock.day, event: fightNational ? 'nacional' : fightIntl ? 'internacional' : fightWorld ? 'mundial' : 'local' });
      Combat.applyInjury(r, fight.outcome, s.clock.day);
      const xp = fight.outcome.result === 'win' ? CombatConfig.SKILL_XP.perFightWin : fight.outcome.result === 'draw' ? CombatConfig.SKILL_XP.perFightDraw : CombatConfig.SKILL_XP.perFightLose;
      Combat.awardSkillXp(r, xp);
    }
    Breeding.sync(s);
    if (fightRoosterId === FirstDay.CONFIG.roosterId) firstCompetition = FirstDay.competition(s);
    if (pendingRival && pendingRival.isPrincipe) EventFlags.set(s, 'principe_enfrentado');
    if (pendingRival && pendingRival.isRegional) regionalPay = FirstDay.regional(s);
    if (fightNational) nationalResult = National.settle(s, fightNational.id, fight.outcome.result);
    if (fightIntl) intlResult = International.settleBout(s, fightIntl.id, fightRoosterId, fight.outcome.result);
    if (fightWorld) worldResult = WorldCup.settle(s, fightRoosterId, fight.outcome.result);
    if (stakeCfg.stake > 0) {
      const result = fight.outcome.result;
      if (result === 'win') fightPayout = Math.round(stakeCfg.stake * (stakeCfg.multiplier - 1) * (1 + Combat.economyEffect(r, 'bolsaBonus')));
      else if (result === 'lose') fightPayout = -stakeCfg.stake;
      else fightPayout = 0;
      if (Number.isSafeInteger(s.money + fightPayout)) s.money = Math.max(0, s.money + fightPayout);
    } else fightPayout = 0;
  });
}

function startPlayback(events, onDone) {
  clearTimeout(fightPlaybackTimer);
  fightPlaybackEvents = events;
  fightPlaybackIndex = -1;
  fightPlaybackOnDone = onDone;
  fightLastEvent = null;
  yardView = 'fight-live';
  stepPlayback();
}

function stepPlayback() {
  fightPlaybackIndex++;
  if (fightPlaybackIndex >= fightPlaybackEvents.length) {
    finishPlayback();
    return;
  }
  const event = fightPlaybackEvents[fightPlaybackIndex];
  fightLastEvent = event;
  fightNarr = typeof Narrator === 'undefined' ? '' : narrText(fightPlaybackIndex === 0 && event.round === 1 ? 'open' : Narrator.kindForEvent(event), fightPlaybackIndex);
  if (event.type === 'hit') {
    if (event.side === 'player') fightLiveVida.rival = Math.max(0, fightLiveVida.rival - event.impact);
    else fightLiveVida.player = Math.max(0, fightLiveVida.player - event.impact);
    if (typeof yardSound === 'function') yardSound('hit');
  }
  renderYard();
  fightPlaybackTimer = setTimeout(stepPlayback, PLAYBACK_MS);
}

function skipPlayback() {
  clearTimeout(fightPlaybackTimer);
  fightPlaybackIndex = fightPlaybackEvents.length;
  finishPlayback();
}

function finishPlayback() {
  clearTimeout(fightPlaybackTimer);
  fightLiveVida = null;
  fightLastEvent = null;
  const cb = fightPlaybackOnDone;
  fightPlaybackOnDone = null;
  if (cb) cb();
}

function goNextRound() {
  Combat.applyInterval(fight, { option: fightOption, stance: fightNextStance });
  if (CombatConfig.INTERVAL_OPTIONS[fightOption]?.scout) fightScouted = true;
  advanceRound();
}

function bar(parent, label, value, max = 100) {
  const row = document.createElement('div');
  row.className = 'fight-bar';
  const name = document.createElement('span');
  name.textContent = label;
  const meter = document.createElement('progress');
  meter.max = max;
  meter.value = Math.max(0, value);
  meter.setAttribute('aria-label', label);
  row.append(name, meter);
  parent.append(row);
  return row;
}

function renderFighterStats(parent, fighter, title) {
  const box = document.createElement('div');
  box.className = 'fight-stats';
  const h = document.createElement('h4');
  h.textContent = title;
  box.append(h);
  const l = LOCALES[lang].combat;
  bar(box, l.vida, fighter.vida);
  bar(box, l.energy, fighter.energy);
  bar(box, l.confidence, fighter.confianca);
  parent.append(box);
}

function renderCombat(body) {
  if (!yardView || !yardView.startsWith('fight-')) return false;
  const l = LOCALES[lang].combat;
  $('closeYard').textContent = l.close;
  body.className = 'fight-body';
  $('yardTitle').textContent = l.title;

  if (yardView === 'fight-prep') {
    if (typeof FightArt !== 'undefined') {
      const portrait = document.createElement('canvas');
      portrait.width = 320;
      portrait.height = 260;
      portrait.className = 'fight-portrait';
      body.append(portrait);
      const pc = portrait.getContext('2d');
      const rooster = state.roosters.byId[fightRoosterId];
      const drawPortrait = () => {
        pc.clearRect(0, 0, portrait.width, portrait.height);
        drawFightArena(pc, portrait.width, portrait.height);
        FightDna.drawOrArt(pc, rooster, FightArt.spriteFor(rooster, FightArt.poseForPosture(fightStance)), portrait.width / 2, portrait.height - 10, 230);
      };
      drawPortrait();
      FightArt.whenReady(drawPortrait);
    }

    if (EventFlags.has(state, 'top10_visto') && pendingRival) {
      const adv = document.createElement('div');
      adv.className = 'fight-scouted';
      const advTitle = document.createElement('strong');
      advTitle.textContent = LOCALES[lang].firstDay.scoutAdvanced + ':';
      adv.append(advTitle);
      for (const [attr, value] of Object.entries(pendingRival.attributes)) bar(adv, LOCALES[lang].training.attribute[attr] || attr, Math.round(value));
      body.append(adv);
    }
    if (EventFlags.has(state, 'viagem_visto') && !EventFlags.has(state, 'regional_disputado')) {
      const regional = document.createElement('p');
      regional.className = 'fight-mood';
      regional.textContent = LOCALES[lang].firstDay.regionalPrep;
      body.append(regional);
    }
    if (fightRoosterId === FirstDay.CONFIG.roosterId && FirstDay.circuitOpen(state) && !EventFlags.has(state, 'E007')) {
      const circuit = document.createElement('p');
      circuit.className = 'fight-mood';
      circuit.textContent = LOCALES[lang].firstDay.circuitPrep;
      body.append(circuit);
    }
    if (typeof National !== 'undefined' && National.unlocked(state)) renderNationalBlock(body);
    if (typeof International !== 'undefined' && International.unlocked(state)) renderIntlBlock(body);
    if (typeof WorldCup !== 'undefined' && WorldCup.unlocked(state)) renderWorldBlock(body);

    const p = document.createElement('p');
    p.textContent = l.scouting + ': ' + (l.profileHint[pendingRival.profile] || '');
    body.append(p);

    const stanceHeading = document.createElement('h3');
    stanceHeading.textContent = l.stance;
    body.append(stanceHeading);
    const stanceRow = document.createElement('div');
    stanceRow.className = 'fight-choice-row';
    for (const id of FIGHT_STANCE_POOL) {
      const b = document.createElement('button');
      b.textContent = l.stances[id];
      b.title = l.stanceHint[id];
      b.setAttribute('aria-pressed', String(fightStance === id));
      b.onclick = () => {
        fightStance = id;
        renderYard();
      };
      stanceRow.append(b);
    }
    body.append(stanceRow);

    const techHeading = document.createElement('h3');
    techHeading.textContent = l.techniques;
    body.append(techHeading);
    const techRow = document.createElement('div');
    techRow.className = 'fight-choice-row';
    for (const id of FIGHT_TECHNIQUE_POOL) {
      const b = document.createElement('button');
      b.textContent = l.technique[id];
      b.setAttribute('aria-pressed', String(fightTechniques.includes(id)));
      b.disabled = !fightTechniques.includes(id) && fightTechniques.length >= 4;
      b.onclick = () => toggleTechnique(id);
      techRow.append(b);
    }
    body.append(techRow);

    const roosterForRep = state.roosters.byId[fightRoosterId];
    const repTier = Combat.reputationTier(roosterForRep);
    const maxStakeIdx = CombatConfig.STAKE_ORDER.indexOf(repTier.maxStake);

    const repLine = document.createElement('p');
    repLine.className = 'fight-reputation';
    repLine.textContent = l.reputation.title + ': ' + l.reputation.tier[repTier.label];
    body.append(repLine);

    const bolsaHeading = document.createElement('h3');
    bolsaHeading.textContent = l.bolsa.title;
    body.append(bolsaHeading);
    const bolsaRow = document.createElement('div');
    bolsaRow.className = 'fight-choice-row';
    for (const id of FIGHT_STAKE_POOL) {
      const cfg = CombatConfig.BOLSA.tiers[id];
      const locked = CombatConfig.STAKE_ORDER.indexOf(id) > maxStakeIdx;
      const b = document.createElement('button');
      b.textContent = l.bolsa.tier[id] + (cfg.stake > 0 ? ' — ' + new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(cfg.stake / 100) : '');
      b.title = locked ? l.bolsa.locked : cfg.stake > 0 ? l.bolsa.payoutHint.replace('{valor}', new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(Math.round(cfg.stake * (cfg.multiplier - 1)) / 100)) : l.bolsa.amistosaHint;
      b.setAttribute('aria-pressed', String(fightStake === id));
      b.disabled = locked || cfg.stake > state.money;
      b.onclick = () => {
        fightStake = id;
        renderYard();
      };
      bolsaRow.append(b);
    }
    body.append(bolsaRow);

    const start = document.createElement('button');
    start.className = 'fight-start';
    start.textContent = l.start;
    start.onclick = startFight;
    body.append(start);
    return true;
  }

  if (yardView === 'fight-live' && fight) {
    const rooster = state.roosters.byId[fightRoosterId];
    const event = fightLastEvent;
    const playerHit = event?.type === 'hit' && event.side === 'player';
    const gotHit = event?.type === 'hit' && event.side === 'rival';

    if (typeof FightArt !== 'undefined') {
      const portrait = document.createElement('canvas');
      portrait.width = 320;
      portrait.height = 260;
      portrait.className = 'fight-portrait' + (gotHit ? ' fight-portrait-hit' : '');
      body.append(portrait);
      const pc = portrait.getContext('2d');
      const techPose = playerHit && event.technique ? FightArt.poseForTechnique(event.technique) : null;
      const pose = techPose || (playerHit ? '04-ataque-basico-impacto' : gotHit ? '17-reacao-golpe' : FightArt.poseForPosture(fightStance));
      const sprite = FightArt.spriteFor(rooster, pose);
      const paintLive = () => { drawFightArena(pc, portrait.width, portrait.height); FightDna.drawOrArt(pc, rooster, sprite, portrait.width / 2, portrait.height - 10, 230); };
      paintLive();
      FightArt.whenReady(paintLive);
    }

    if (event?.type === 'hit') {
      const callout = document.createElement('p');
      callout.className = 'fight-callout ' + (playerHit ? 'fight-callout-player' : 'fight-callout-rival');
      const who = playerHit ? (rooster?.name || l.you) : fight.rival.name;
      const techName = event.technique ? ' — ' + l.technique[event.technique] : '';
      callout.textContent = who + techName + ' (-' + event.impact + ')';
      body.append(callout);
    }
    narratorParagraph(body, fightNarr);

    const statsRow = document.createElement('div');
    statsRow.className = 'fight-stats-row';
    renderFighterStats(statsRow, { ...fight.player, vida: fightLiveVida ? fightLiveVida.player : fight.player.vida }, rooster?.name || l.you);
    renderFighterStats(statsRow, { ...fight.rival, vida: fightLiveVida ? fightLiveVida.rival : fight.rival.vida }, fight.rival.name);
    body.append(statsRow);

    const skip = document.createElement('button');
    skip.textContent = l.skipPlayback;
    skip.onclick = skipPlayback;
    body.append(skip);
    return true;
  }

  if (yardView === 'fight-interval' && fight) {
    const last = fight.history[fight.history.length - 1];
    const heading = document.createElement('h3');
    heading.textContent = l.round + ' ' + last.round + ' ' + l.of + ' ' + fight.maxRounds;
    body.append(heading);

    const summary = document.createElement('p');
    summary.textContent = l.roundSummary + ': ' + (last.avgMomentum > 6 ? l.momentumFavor.player : last.avgMomentum < -6 ? l.momentumFavor.rival : l.momentumFavor.even);
    body.append(summary);
    if (typeof Narrator !== 'undefined') narratorParagraph(body, narrText(Narrator.kindForInterval(last), 100 + last.round));

    const statsRow = document.createElement('div');
    statsRow.className = 'fight-stats-row';
    renderFighterStats(statsRow, fight.player, state.roosters.byId[fightRoosterId].name);
    renderFighterStats(statsRow, fight.rival, fight.rival.name);
    body.append(statsRow);

    const roundTechniques = fight.techniqueLog.filter(t => t.round === last.round);
    if (roundTechniques.length) {
      const techList = document.createElement('p');
      techList.className = 'fight-techniques';
      techList.textContent = roundTechniques
        .map(t => (t.side === 'player' ? state.roosters.byId[fightRoosterId].name : fight.rival.name) + ' ' + l.techniqueUsed + ' ' + l.technique[t.technique] + (t.combo ? ' — ' + l.combo : ''))
        .join(' · ');
      body.append(techList);
    }

    if (fightScouted) {
      const scouted = document.createElement('div');
      scouted.className = 'fight-scouted';
      const bias = CombatConfig.RIVAL_PROFILES[fight.rivalProfile]?.postureBias;
      if (!bias) {
        scouted.textContent = l.scoutedNoPattern;
      } else {
        const title = document.createElement('p');
        title.textContent = l.scoutedChance + ':';
        scouted.append(title);
        for (const [id, weight] of Object.entries(bias).sort((a, b) => b[1] - a[1])) {
          bar(scouted, l.stances[id], Math.round(weight * 100));
        }
      }
      body.append(scouted);
    }

    const intervalHeading = document.createElement('h3');
    intervalHeading.textContent = l.intervalTitle;
    body.append(intervalHeading);
    const hint = document.createElement('p');
    hint.textContent = l.intervalHint;
    body.append(hint);

    const optionRow = document.createElement('div');
    optionRow.className = 'fight-choice-row';
    for (const id of FIGHT_OPTION_POOL) {
      const b = document.createElement('button');
      b.textContent = l.intervalOption[id];
      b.setAttribute('aria-pressed', String(fightOption === id));
      b.onclick = () => {
        fightOption = id;
        renderYard();
      };
      optionRow.append(b);
    }
    body.append(optionRow);

    const stanceHeading = document.createElement('h3');
    stanceHeading.textContent = l.nextStance;
    body.append(stanceHeading);
    const stanceRow = document.createElement('div');
    stanceRow.className = 'fight-choice-row';
    for (const id of FIGHT_STANCE_POOL) {
      const b = document.createElement('button');
      b.textContent = l.stances[id];
      b.setAttribute('aria-pressed', String(fightNextStance === id));
      b.onclick = () => {
        fightNextStance = id;
        renderYard();
      };
      stanceRow.append(b);
    }
    body.append(stanceRow);

    const next = document.createElement('button');
    next.className = 'fight-start';
    next.textContent = l.nextRound;
    next.onclick = goNextRound;
    body.append(next);
    return true;
  }

  if (yardView === 'fight-result' && fight) {
    const outcome = fight.outcome;
    const rooster = state.roosters.byId[fightRoosterId];

    if (typeof FightArt !== 'undefined') {
      const portrait = document.createElement('canvas');
      portrait.width = 320;
      portrait.height = 260;
      portrait.className = 'fight-portrait';
      body.append(portrait);
      const pc = portrait.getContext('2d');
      const resultPose = outcome.result === 'win' ? '19-vitoria' : outcome.result === 'lose' ? (outcome.method === 'interrupcao_vida' ? '18-nocaute' : '20-derrota') : '01-idle';
      const sprite = FightArt.spriteFor(rooster, resultPose);
      const paintResult = () => { drawFightArena(pc, portrait.width, portrait.height); FightDna.drawOrArt(pc, rooster, sprite, portrait.width / 2, portrait.height - 10, 230); };
      paintResult();
      FightArt.whenReady(paintResult);
    }

    const title = document.createElement('h3');
    title.textContent = l.resultTitle[outcome.result];
    title.className = 'fight-result-title fight-result-' + outcome.result;
    body.append(title);
    if (typeof Narrator !== 'undefined') narratorParagraph(body, narrText(Narrator.kindForResult(outcome.result), 200));

    const method = document.createElement('p');
    method.textContent = l.method[outcome.method] || l.method.decisao;
    body.append(method);

    const cartel = document.createElement('p');
    cartel.textContent = l.cartel + ': ' + Combat.cartelString(rooster?.record);
    body.append(cartel);

    if (intlResult) renderIntlResult(body);
    if (worldResult) renderWorldResult(body);
    if (nationalResult) {
      const n = natL();
      const res = document.createElement('p');
      res.className = 'fight-mood';
      res.textContent = natFmt(n.result, { etapa: n.stages[nationalResult.stageId], premio: natMoney(nationalResult.prize), viagem: natMoney(nationalResult.travel), saldo: natMoney(nationalResult.net) });
      body.append(res);
      const extra = nationalResult.champion ? n.champion : !nationalResult.closed ? n.finalRetry : '';
      if (extra) { const ex = document.createElement('p'); ex.className = 'fight-mood'; ex.textContent = extra; body.append(ex); }
    }

    const mood = Combat.currentMood(rooster, state.clock.day);
    if (mood) {
      const moodP = document.createElement('p');
      moodP.className = 'fight-mood';
      moodP.textContent = l.mood[mood.result];
      body.append(moodP);
    }

    if (firstCompetition) {
      const fl = LOCALES[lang].firstDay;
      const presenceP = document.createElement('p');
      presenceP.className = 'fight-payout fight-payout-win';
      presenceP.textContent = fl.presence.replace('{valor}', new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(firstCompetition.presence / 100));
      body.append(presenceP);
      const quote = document.createElement('p');
      quote.className = 'story-line';
      quote.textContent = fl.marivaldoAfter;
      body.append(quote);
    }

    if (regionalPay) {
      const fl = LOCALES[lang].firstDay;
      const rp = document.createElement('p');
      rp.className = 'fight-payout fight-payout-win';
      rp.textContent = fl.regionalPaid.replace('{valor}', new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(regionalPay.pay / 100));
      body.append(rp);
      if (RouteArt.hasAnim('claudineia')) {
        const cp = document.createElement('canvas');
        cp.width = 160;
        cp.height = 160;
        cp.className = 'story-portrait';
        RouteArt.portrait(cp.getContext('2d'), 'claudineia', outcome.result === 'win' ? 4 : outcome.result === 'lose' ? 1 : 0, 160);
        body.append(cp);
      }
      const rq = document.createElement('p');
      rq.className = 'story-line';
      rq.textContent = fl['claudineiaAfter' + outcome.result] || fl.claudineiaAfterlose;
      body.append(rq);
    }

    if (pendingRival && pendingRival.isPrincipe) {
      if (RouteArt.hasAnim('principe')) {
        const pp = document.createElement('canvas');
        pp.width = 160;
        pp.height = 160;
        pp.className = 'story-portrait';
        RouteArt.portrait(pp.getContext('2d'), 'principe', outcome.result === 'win' ? 2 : outcome.result === 'lose' ? 0 : 3, 160);
        body.append(pp);
      }
      const pq = document.createElement('p');
      pq.className = 'story-line';
      pq.textContent = LOCALES[lang].firstDay['principeAfter' + outcome.result] || LOCALES[lang].firstDay.principeAfterlose;
      body.append(pq);
    }

    if (fightPayout !== 0) {
      const payoutP = document.createElement('p');
      payoutP.className = 'fight-payout ' + (fightPayout > 0 ? 'fight-payout-win' : 'fight-payout-lose');
      const formatted = new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(Math.abs(fightPayout) / 100);
      payoutP.textContent = (fightPayout > 0 ? l.bolsa.won : l.bolsa.lost).replace('{valor}', formatted);
      body.append(payoutP);
    }

    const close = document.createElement('button');
    close.textContent = l.close;
    close.onclick = () => {
      fight = null;
      if (typeof openPlantel === 'function' && plantelSelectedId) {
        yardView = 'plantel';
        renderYard();
      } else closeYard();
    };
    body.append(close);
    return true;
  }

  return false;
}

