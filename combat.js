(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const C = node ? require('./combat-config.js') : root.CombatConfig;

  // Nomenclatura (decisao registrada na Biblia 6.11): "Postura" e sempre a
  // ESTRATEGIA/estilo de luta escolhida (ofensiva, tecnica, defensiva...).
  // O recurso que cai com os golpes e interrompe a luta ao chegar a zero se
  // chama "Vida" — evita a colisao de nomes que existia entre a 6.2 e a 6.3.

  // --- RNG determinístico (fightSeed) -----------------------------------------
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    return function rng() {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // --- Perks --------------------------------------------------------------
  const PERK_IDS = Object.keys(C.PERKS);
  function assignPerks(seed) {
    const rng = makeRng(seed);
    const perks = [];
    const count = rng() < 0.15 ? 3 : rng() < 0.45 ? 2 : rng() < 0.85 ? 1 : 0;
    const pool = PERK_IDS.filter(id => !C.PERKS[id].rare);
    while (perks.length < count && pool.length) {
      const i = Math.floor(rng() * pool.length);
      perks.push(pool.splice(i, 1)[0]);
    }
    const rarePool = PERK_IDS.filter(id => C.PERKS[id].rare);
    if (rng() < 0.12 && rarePool.length) perks.push(rarePool[Math.floor(rng() * rarePool.length)]);
    return perks;
  }

  function perkEffect(perks, key, fallback = 0) {
    return perks.reduce((sum, id) => sum + (C.PERKS[id]?.effect?.[key] || 0), fallback);
  }

  // --- Arvore de habilidades (Secao 14.10) ------------------------------------
  function skillEffect(skills, key, fallback = 0) {
    return Object.keys(skills || {}).reduce((sum, id) => sum + (C.SKILLS[id]?.effect?.[key] || 0), fallback);
  }

  function reputationTier(rooster) {
    const wins = rooster?.record?.wins || 0;
    let tier = C.REPUTATION.tiers[0];
    for (const t of C.REPUTATION.tiers) if (wins >= t.minWins) tier = t;
    return tier;
  }

  function canUnlockSkill(rooster, skillId) {
    const def = C.SKILLS[skillId];
    if (!def) return false;
    const skills = rooster.skills || {};
    if (skills[skillId]) return false;
    if (def.requires && !skills[def.requires]) return false;
    return (rooster.skillPoints || 0) >= def.cost;
  }

  function unlockSkill(rooster, skillId) {
    if (!canUnlockSkill(rooster, skillId)) throw Error('Habilidade nao pode ser desbloqueada agora');
    rooster.skillPoints -= C.SKILLS[skillId].cost;
    rooster.skills[skillId] = true;
  }

  function awardSkillXp(rooster, amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    rooster.skillPoints = (rooster.skillPoints || 0) + amount;
  }

  // --- Estilos de luta (Secao 14.10): identidade permanente, derivada sempre
  // da mesma forma a partir de atributos/perks — nunca sorteada, nunca salva.
  function styleOf(rooster) {
    if ((rooster.traits || []).includes('showman')) return 'showman';
    const attrs = rooster.attributes || {};
    let best = 'rasteiro',
      bestAvg = -Infinity;
    for (const [style, keys] of Object.entries(C.STYLE_CATEGORIES)) {
      const avg = keys.reduce((sum, k) => sum + (attrs[k] || 0), 0) / keys.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = style;
      }
    }
    return best;
  }

  // Combina perk (amplificado pelo ramo Carater da arvore) + estilo permanente
  // num unico numero, pra nao espalhar 3 fontes de bonus pela simulacao toda.
  function combinedEffect(side, key, fallback = 0) {
    const perkPart = perkEffect(side.perks || [], key, 0);
    const amplify = skillEffect(side.skills, 'perkAmplify');
    const stylePart = (C.STYLES[side.style]?.effect || {})[key] || 0;
    return perkPart * (1 + amplify) + stylePart + fallback;
  }

  // Mesmo calculo, mas a partir do rooster salvo (fora de uma luta em
  // andamento) — usado pela bolsa da luta, que resolve fora do simulateBeat.
  function economyEffect(rooster, key) {
    return combinedEffect({ perks: rooster?.traits || [], skills: rooster?.skills || {}, style: styleOf(rooster || {}) }, key);
  }

  // --- Lesao/condicao pos-derrota (Secao 6.13/14.7) ---------------------------
  function isInjured(rooster, day) {
    return Number.isSafeInteger(rooster.status?.recoverDay) && Number.isSafeInteger(day) && day < rooster.status.recoverDay;
  }

  // Pintinho (nascido de ovo ha menos de LIFE.chickDays dias) nao pode lutar.
  function isChick(rooster, day) {
    return Number.isSafeInteger(rooster?.bornDay) && Number.isSafeInteger(day) && day - rooster.bornDay < C.LIFE.chickDays;
  }

  function effectiveAttributes(rooster, day) {
    const a = rooster.attributes || {};
    if (!isInjured(rooster, day)) return a;
    const mod = 1 + (rooster.status.injuryMod || 0);
    return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Math.max(1, Math.round(v * mod))]));
  }

  function downgradeInjuryTier(tier) {
    return tier === 'alta' ? 'moderada' : 'leve';
  }

  // So aplica em derrota (nome da secao); vitoria/empate nao ferem o galo.
  // osso_duro (impactTakenMod negativo) reduz a severidade em um degrau.
  function applyInjury(rooster, outcome, day) {
    if (outcome.result !== 'lose') return;
    let tier = C.INJURY.methodTier[outcome.method] || 'leve';
    if (perkEffect(rooster.traits || [], 'impactTakenMod') < 0) tier = downgradeInjuryTier(tier);
    const cfg = C.INJURY.tiers[tier];
    rooster.status.recoverDay = day + cfg.days;
    rooster.status.injuryMod = cfg.attributeMod;
  }

  // --- Lutador em tempo de luta (nao persistido; derivado do rooster) --------
  function makeFighter(rooster, opts = {}) {
    const a = Number.isSafeInteger(opts.day) ? effectiveAttributes(rooster, opts.day) : rooster.attributes || {};
    return {
      id: rooster.id,
      name: rooster.name || rooster.id,
      attributes: { forca: 0, velocidade: 0, resistencia: 0, reflexo: 0, tecnica: 0, disciplina: 0, inteligencia: 0, ...a },
      perks: rooster.traits || [],
      style: styleOf(rooster),
      skills: rooster.skills || {},
      stance: opts.stance || 'tecnica',
      techniques: opts.techniques || [],
      vida: 100,
      energy: rooster.status?.energy ?? 100,
      confianca: 60,
      fadiga: 0,
      techniqueCooldown: {},
      buffs: [], // {key:'actionBonus'|'guardBonus'|'impactBonus', value, until:beat}
      lastTechnique: null, // {id, beat} — usado pra detectar combo
      isPlayer: !!opts.isPlayer,
      homeTurf: !!opts.homeTurf,
    };
  }

  function pruneBuffs(side, beat) {
    if (side.buffs.length) side.buffs = side.buffs.filter(b => b.until >= beat);
  }
  function activeBuffValue(side, key, beat) {
    let sum = 0;
    for (const b of side.buffs) if (b.key === key && b.until >= beat) sum += b.value;
    return sum;
  }

  // --- Tecnicas ficticias em combate: dispara sozinho, combo se encadeado ----
  function tryTechniques(side, opponent, fight, beat, rng) {
    if (!side.techniques.length) return;
    const ready = side.techniques.filter(id => !(side.techniqueCooldown[id] > beat) && C.TECHNIQUES[id]);
    if (!ready.length) return;
    const chance = C.TECHNIQUE_TRIGGER.base + C.TECHNIQUE_TRIGGER.tecnicaScale * side.attributes.tecnica + skillEffect(side.skills, 'triggerBonus');
    if (rng() > chance) return;
    const id = ready[Math.floor(rng() * ready.length)];
    const def = C.TECHNIQUES[id];
    side.techniqueCooldown[id] = beat + def.cooldownBeats * (1 + skillEffect(side.skills, 'cooldownMod'));

    const combo = !!(side.lastTechnique && side.lastTechnique.id !== id && beat - side.lastTechnique.beat <= C.COMBO.windowBeats);
    if (combo) fight.momentum = clamp(fight.momentum + (side.isPlayer ? C.COMBO.momentumBonus : -C.COMBO.momentumBonus), -100, 100);
    side.lastTechnique = { id, beat };
    const mult = combo ? C.COMBO.impactMultiplier : 1;

    if (def.buff === 'confidenceOnTrigger') {
      side.confianca = clamp(side.confianca + def.value * mult, -combinedEffect(side, 'confidenceFloorBonus'), 100);
    } else if (def.buff === 'opponentActionPenalty') {
      opponent.buffs.push({ key: 'actionBonus', value: -def.value * mult, until: beat + def.durationBeats });
    } else {
      side.buffs.push({ key: def.buff, value: def.value * mult, until: beat + def.durationBeats });
    }
    fight.techniqueLog.push({ beat, round: fight.round, side: side.isPlayer ? 'player' : 'rival', technique: id, combo });
  }

  // --- Criacao da luta ------------------------------------------------------
  function createFight(playerRooster, rivalDef, opts = {}) {
    if (isChick(playerRooster, opts.day)) throw Error('Pintinho nao pode lutar');
    const seed = Number.isSafeInteger(opts.seed) ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    const isFinal = !!opts.isFinal;
    return {
      seed,
      isFinal,
      round: 1,
      maxRounds: isFinal ? C.ROUND.MAX_ROUNDS_FINAL : C.ROUND.MAX_ROUNDS_NORMAL,
      beatsPerRound: isFinal ? C.ROUND.BEATS_FINAL : C.ROUND.BEATS_NORMAL,
      momentum: 0,
      player: makeFighter(playerRooster, { isPlayer: true, techniques: opts.techniques, stance: opts.stance, homeTurf: opts.homeTurf, day: opts.day }),
      rival: makeFighter(rivalDef, { profile: rivalDef.profile, techniques: rivalDef.techniques || [] }),
      rivalProfile: rivalDef.profile || 'agressivo',
      scores: [], // {player:[j1,j2], rival:[j1,j2]} por round
      history: [], // {round, method, log:[...]}
      techniqueLog: [], // {beat, round, side, technique, combo}
      beatLog: [], // {beat, round, side, type:'hit'|'miss', impact?, technique?, targetVida?} — reproducao visual (Secao 14.9)
      finished: false,
      outcome: null,
      emergencyUsedThisRound: false,
    };
  }

  // --- Escolha de postura da IA rival por beat de round ----------------------
  function pickRivalStance(fight, rng) {
    const profile = C.RIVAL_PROFILES[fight.rivalProfile] || C.RIVAL_PROFILES.agressivo;
    if (fight.forceRandomRivalStance) {
      fight.forceRandomRivalStance = false;
      const keys = Object.keys(C.POSTURES);
      return keys[Math.floor(rng() * keys.length)];
    }
    if (!profile.postureBias) {
      const keys = Object.keys(C.POSTURES);
      return keys[Math.floor(rng() * keys.length)];
    }
    let roll = rng(),
      acc = 0;
    for (const [stance, weight] of Object.entries(profile.postureBias)) {
      acc += weight;
      if (roll <= acc) return stance;
    }
    return 'tecnica';
  }

  // --- Um beat de simulacao (0.5s de luta) -----------------------------------
  function simulateBeat(fight, rng, beat) {
    const { player, rival } = fight;
    pruneBuffs(player, beat);
    pruneBuffs(rival, beat);
    tryTechniques(player, rival, fight, beat, rng);
    tryTechniques(rival, player, fight, beat, rng);
    for (const side of [player, rival]) {
      const posture = C.POSTURES[side.stance] || C.POSTURES.tecnica;
      const fatiguePenalty = side.fadiga * 0.2;
      const energyPenalty = side.energy < 30 ? (30 - side.energy) * 0.3 : 0;
      const chance = clamp(
        C.ACTION_CHANCE.base +
          C.ACTION_CHANCE.tecnica * side.attributes.tecnica +
          C.ACTION_CHANCE.velocidade * side.attributes.velocidade +
          C.ACTION_CHANCE.inteligencia * side.attributes.inteligencia +
          posture.actionBonus +
          activeBuffValue(side, 'actionBonus', beat) +
          combinedEffect(side, 'actionChanceBonus') +
          skillEffect(side.skills, 'actionBonus') +
          (side.homeTurf ? combinedEffect(side, 'homeTurfActionChanceBonus') : 0) -
          fatiguePenalty -
          energyPenalty,
        C.ACTION_CHANCE.min,
        C.ACTION_CHANCE.max
      );
      side.energy = clamp(side.energy - posture.energyCost * (1 + combinedEffect(side, 'energyCostMod')), 0, 100);
      side.fadiga = clamp(side.fadiga + posture.energyCost * 0.35, 0, 100);
      if (rng() * 100 > chance) {
        // Beat sem acao: registrado pra apresentacao visual (Secao 14.9 -
        // reproducao beat a beat), o galo fica em guarda/espera nesse tick.
        fight.beatLog.push({ beat, round: fight.round, side: side.isPlayer ? 'player' : 'rival', type: 'miss' });
        continue;
      }

      const opponent = side === player ? rival : player;
      const oppPosture = C.POSTURES[opponent.stance] || C.POSTURES.tecnica;
      const effectiveGuard = (oppPosture.guard || 1) + activeBuffValue(opponent, 'guardBonus', beat) + skillEffect(opponent.skills, 'guardBonus');
      const varianceMod = combinedEffect(side, 'varianceMod');
      const variance = 1 + (rng() * 2 - 1) * clamp(C.VARIANCE_MAX + varianceMod, 0, 0.2);
      let impact = (C.IMPACT.base + C.IMPACT.forca * side.attributes.forca + C.IMPACT.tecnica * side.attributes.tecnica) * variance;
      impact *= 1 + combinedEffect(side, 'impactMod');
      impact *= 1 + activeBuffValue(side, 'impactBonus', beat);
      impact /= effectiveGuard;
      impact *= 1 + combinedEffect(opponent, 'impactTakenMod');
      impact = Math.max(0.2, impact);

      // Vida e Confianca podem cair abaixo de 0 ate o "chao" que os perks de
      // resistencia (Valente/Cabeca Dura) concedem; a interrupcao real usa
      // esse chao, nao zero fixo, entao o perk se sente na luta de verdade.
      const vidaFloor = -combinedEffect(opponent, 'postureFloorBonus');
      const confFloor = -combinedEffect(opponent, 'confidenceFloorBonus');
      opponent.vida = clamp(opponent.vida - impact, vidaFloor, 100);
      opponent.confianca = clamp(opponent.confianca - impact * 0.4, confFloor, 100);
      side.confianca = clamp(side.confianca + impact * 0.15, -combinedEffect(side, 'confidenceFloorBonus'), 100);
      fight.momentum = clamp(fight.momentum + (side.isPlayer ? impact : -impact), -100, 100);
      fight.beatLog.push({
        beat,
        round: fight.round,
        side: side.isPlayer ? 'player' : 'rival',
        type: 'hit',
        impact: Math.round(impact * 10) / 10,
        technique: side.lastTechnique && side.lastTechnique.beat === beat ? side.lastTechnique.id : null,
        targetVida: Math.round(opponent.vida),
      });
    }
    // Perks de confianca por dominancia de momentum (Showman / Rei do Poleiro
    // ja cobrem casos parecidos via tecnica; aqui so o efeito base de perk).
    if (fight.momentum > 40) player.confianca = clamp(player.confianca + combinedEffect(player, 'confidenceOnMomentumLead') * 0.05, -combinedEffect(player, 'confidenceFloorBonus'), 100);
    if (fight.momentum < -40) rival.confianca = clamp(rival.confianca + combinedEffect(rival, 'confidenceOnMomentumLead') * 0.05, -combinedEffect(rival, 'confidenceFloorBonus'), 100);
  }

  const vidaFloorOf = fighter => -combinedEffect(fighter, 'postureFloorBonus');
  const confFloorOf = fighter => -combinedEffect(fighter, 'confidenceFloorBonus');

  // --- Simula um round inteiro, beat a beat, ate interrupcao ou tempo --------
  function simulateRound(fight) {
    if (fight.finished) throw Error('Fight already finished');
    const rng = makeRng(fight.seed + fight.round * 7919);
    fight.rival.stance = pickRivalStance(fight, rng);
    fight.emergencyUsedThisRound = false;
    // Cooldowns de tecnica sao por round: o intervalo e a pausa natural pra
    // "reiniciar o plano", entao cada round comeca com as tecnicas liberadas.
    fight.player.techniqueCooldown = {};
    fight.rival.techniqueCooldown = {};
    fight.player.lastTechnique = null;
    fight.rival.lastTechnique = null;
    const momentumSamples = [];
    let method = 'tempo';
    let loser = null;

    for (let beat = 0; beat < fight.beatsPerRound; beat++) {
      simulateBeat(fight, rng, beat);
      momentumSamples.push(fight.momentum);
      if (fight.player.vida <= vidaFloorOf(fight.player)) {
        method = 'vida';
        loser = 'player';
        break;
      }
      if (fight.rival.vida <= vidaFloorOf(fight.rival)) {
        method = 'vida';
        loser = 'rival';
        break;
      }
      if (fight.player.confianca <= confFloorOf(fight.player)) {
        method = 'confianca';
        loser = 'player';
        break;
      }
      if (fight.rival.confianca <= confFloorOf(fight.rival)) {
        method = 'confianca';
        loser = 'rival';
        break;
      }
    }

    const avgMomentum = momentumSamples.reduce((a, b) => a + b, 0) / (momentumSamples.length || 1);
    const efficiency = clamp(50 + avgMomentum / 2, 0, 100);
    // 10-9 para quem dominou o round; 10-10 quando muito parelho.
    const playerWonRound = loser === 'rival' || (!loser && avgMomentum > 6);
    const rivalWonRound = loser === 'player' || (!loser && avgMomentum < -6);
    const scoreEntry = rivalWonRound
      ? { player: [9, 9], rival: [10, 10] }
      : playerWonRound
        ? { player: [10, 10], rival: [9, 9] }
        : { player: [10, 10], rival: [10, 10] };
    fight.scores.push(scoreEntry);
    fight.history.push({ round: fight.round, method, loser, avgMomentum: Math.round(avgMomentum) });

    if (loser) {
      fight.finished = true;
      fight.outcome = { result: loser === 'rival' ? 'win' : 'lose', method: method === 'vida' ? 'interrupcao_vida' : 'interrupcao_confianca', rounds: fight.round };
    } else if (fight.round >= fight.maxRounds) {
      fight.finished = true;
      fight.outcome = decideByPoints(fight);
    }
    return { method, loser, avgMomentum: Math.round(avgMomentum) };
  }

  function decideByPoints(fight) {
    const total = side => fight.scores.reduce((sum, s) => sum + s[side][0] + s[side][1], 0);
    const p = total('player'),
      r = total('rival');
    const result = p > r ? 'win' : r > p ? 'lose' : 'draw';
    return { result, method: 'decisao', rounds: fight.round, points: { player: p, rival: r } };
  }

  // --- Intervalo entre rounds: recuperacao decrescente + conversa -----------
  function applyInterval(fight, choice = {}) {
    if (fight.finished) return null;
    const idx = fight.round - 1; // round 1->2 usa curva[0], etc.
    const baseFrac = C.RECOVERY_CURVE[Math.min(idx, C.RECOVERY_CURVE.length - 1)] || 0;
    const option = C.INTERVAL_OPTIONS[choice.option] || {};
    for (const side of [fight.player, fight.rival]) {
      const isPlayerChoice = side.isPlayer;
      const energyMod = isPlayerChoice ? option.energyRecoveryMod || 0 : 0;
      const postureMod = isPlayerChoice ? option.postureRecoveryMod || 0 : 0;
      const confMod = isPlayerChoice ? (option.confidenceRecoveryMod || 0) + (option.confidence ? option.confidence / 100 : 0) : 0;
      side.energy = clamp(side.energy + (100 - side.energy) * clamp(baseFrac + energyMod, 0, 1), 0, 100);
      side.vida = clamp(side.vida + (100 - side.vida) * clamp(baseFrac + postureMod, 0, 1), 0, 100);
      side.confianca = clamp(side.confianca + (100 - side.confianca) * clamp(baseFrac + confMod, 0, 1), 0, 100);
      side.fadiga = clamp(side.fadiga - 8, 0, 100);
    }
    if (choice.stance && C.POSTURES[choice.stance]) fight.player.stance = choice.stance;
    if (option.scramble) fight.forceRandomRivalStance = true;
    fight.round += 1;
    return { nextRound: fight.round, scouted: option.scout ? fight.rivalProfile : null };
  }

  // 6.4 Obediencia — o galo pode simplesmente ignorar o ajuste de emergencia;
  // a falha nao trava nada, so nao aplica o efeito (feedback: "ele ignorou").
  function obedienceChance(fighter) {
    const disciplina = fighter.attributes.disciplina || 0;
    const vinculo = 50; // vinculo dono-animal: neutro ate a Secao de rotina/cuidado alimentar essa entrada
    return clamp(
      C.OBEDIENCE.base + C.OBEDIENCE.disciplina * disciplina + C.OBEDIENCE.vinculo * vinculo - Math.abs(C.OBEDIENCE.fadiga) * fighter.fadiga + perkEffect(fighter.perks, 'obedienceMod'),
      C.OBEDIENCE.min,
      C.OBEDIENCE.max
    );
  }

  // --- Ajuste de emergencia dentro do round (6.11): no maximo 1 por round ----
  function useEmergency(fight, optionId) {
    if (fight.finished || fight.emergencyUsedThisRound) return { used: false, obeyed: false };
    const option = C.INTERVAL_OPTIONS[optionId];
    if (!option) return { used: false, obeyed: false };
    fight.emergencyUsedThisRound = true;
    fight.emergencyCalls = (fight.emergencyCalls || 0) + 1;
    const rng = makeRng(fight.seed + fight.round * 131 + fight.emergencyCalls * 17);
    const obeyed = rng() * 100 <= obedienceChance(fight.player);
    if (!obeyed) return { used: true, obeyed: false };
    const scale = C.EMERGENCY_SCALE;
    fight.player.confianca = clamp(fight.player.confianca + (option.confidence || 0) * scale, confFloorOf(fight.player), 100);
    fight.player.energy = clamp(fight.player.energy + 100 * (option.energyRecoveryMod > 0 ? option.energyRecoveryMod * scale : 0), 0, 100);
    return { used: true, obeyed: true };
  }

  // --- Cartel e historico (6.9) ----------------------------------------------
  function recordFight(rooster, fight, eventInfo = {}) {
    rooster.record ??= { wins: 0, draws: 0, losses: 0, history: [] };
    const outcome = fight.outcome;
    if (outcome.result === 'win') rooster.record.wins++;
    else if (outcome.result === 'draw') rooster.record.draws++;
    else rooster.record.losses++;
    rooster.record.history.push({
      day: eventInfo.day || 0,
      event: eventInfo.event || 'local',
      opponent: fight.rival.id,
      result: outcome.result,
      method: outcome.method,
      rounds: outcome.rounds,
      seed: fight.seed,
    });
    if (rooster.record.history.length > 200) rooster.record.history.shift();
    // "Mundo reagindo ao sucesso" (Secao 9.1): o resultado fica visivel por
    // alguns dias no quintal, depois expira como qualquer memoria recente.
    const day = eventInfo.day || 0;
    rooster.mood = { result: outcome.result, sinceDay: day, expiresDay: day + 3 };
  }

  function currentMood(rooster, day) {
    if (!rooster?.mood || day > rooster.mood.expiresDay) return null;
    return rooster.mood;
  }

  function cartelString(record) {
    if (!record) return '0–0–0';
    return `${record.wins}–${record.draws}–${record.losses}`;
  }

  // --- Persistencia (schema) ---------------------------------------------
  function initialize(s) {
    s.combat ??= { config: 'v1' };
    return s;
  }
  function validate(s) {
    if (!s.combat || typeof s.combat !== 'object') return false;
    for (const r of Object.values(s.roosters?.byId || {})) {
      if (r.record !== undefined) {
        const rec = r.record;
        if (!rec || typeof rec !== 'object') return false;
        if (![rec.wins, rec.draws, rec.losses].every(n => Number.isSafeInteger(n) && n >= 0)) return false;
        if (!Array.isArray(rec.history) || rec.history.length > 200) return false;
        for (const h of rec.history) {
          if (!h || !['win', 'lose', 'draw'].includes(h.result)) return false;
          if (!['interrupcao_vida', 'interrupcao_confianca', 'decisao'].includes(h.method)) return false;
          if (!Number.isSafeInteger(h.rounds) || !Number.isSafeInteger(h.seed)) return false;
        }
      }
      if (r.mood !== undefined) {
        if (!r.mood || !['win', 'lose', 'draw'].includes(r.mood.result)) return false;
        if (!Number.isSafeInteger(r.mood.sinceDay) || !Number.isSafeInteger(r.mood.expiresDay)) return false;
      }
    }
    return true;
  }

  const Combat = {
    createFight,
    simulateRound,
    applyInterval,
    useEmergency,
    obedienceChance,
    recordFight,
    currentMood,
    cartelString,
    assignPerks,
    perkEffect,
    isInjured, isChick,
    effectiveAttributes,
    applyInjury,
    reputationTier,
    styleOf,
    economyEffect,
    skillEffect,
    canUnlockSkill,
    unlockSkill,
    awardSkillXp,
    initialize,
    validate,
    makeRng,
  };
  root.Combat = Combat;
  if (node) module.exports = Combat;
})(typeof window === 'undefined' ? globalThis : window);
