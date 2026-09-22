// Ato VI - Brasil: circuito nacional. 4 etapas em ordem (rivais anteriores voltam, Bruno entra como adversario, a ultima e o
// Campeonato Nacional). Calendario (uma etapa a cada N dias), viagem paga (a 1a e patrocinada pelo Bruno) e premio por
// resultado. Modulo puro; estado em s.world.objects.national (campo livre, sem mudar o schema do save).
// Valores em centavos e centralizados aqui (Biblia secao 10).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const Flags = node ? require('./events.js') : root.EventFlags;
  const FirstDay = () => (node ? require('./first-day.js') : root.FirstDay);

  const CONFIG = Object.freeze({
    minWins: 12, // uma ave com 12 vitorias abre o circuito (Ato V ja concluido)
    gapDays: 3, // dias entre uma etapa e a proxima
    travelCost: 8000, // R$ 80,00 por viagem (a etapa patrocinada nao paga)
    prize: Object.freeze({ win: 25000, draw: 12000, lose: 6000 }),
    finalMultiplier: 2,
    rivalTier: [60, 80], // faixa 'lendario' de CombatConfig.REPUTATION
  });

  // pct = onde o rival fica na faixa. name: LOCALES[lang].national.rivals[id].
  const STAGES = Object.freeze([
    { id: 'etapa1', rival: 'principe', profile: 'agressivo', pct: 0.55, techniques: ['passo_terreno', 'rei_poleiro'], sponsored: true },
    { id: 'etapa2', rival: 'claudineia', profile: 'tecnico', pct: 0.68, techniques: ['passo_terreno', 'olhar_milho'], tecnicaBonus: 4 },
    { id: 'etapa3', rival: 'bruno', profile: 'oportunista', pct: 0.82, techniques: ['coco_combo', 'asa_fantasma'] },
    { id: 'final', rival: 'campeao', profile: 'adaptativo', pct: 0.97, techniques: ['rei_poleiro', 'bicada_filosofica', 'olhar_milho'], final: true },
  ]);

  const data = s => (s.world.objects.national ??= { done: {}, attempts: {}, nextDay: 0 });
  const unlocked = s => Flags.has(s, 'nacional_visto');
  const doneIds = s => Object.keys(data(s).done);
  const stageDone = (s, id) => !!data(s).done[id];
  const nextStage = s => (unlocked(s) ? STAGES.find(st => !stageDone(s, st.id)) || null : null);
  const stageIndex = st => STAGES.indexOf(st) + 1;
  const cost = st => (st?.sponsored ? 0 : CONFIG.travelCost);
  const prizeFor = (st, result) => (CONFIG.prize[result] ?? CONFIG.prize.lose) * (st?.final ? CONFIG.finalMultiplier : 1);
  const maxPrize = st => prizeFor(st, 'win');

  // Etapa liberada no calendario? (nextDay = primeiro dia em que a proxima etapa acontece)
  const available = s => !!nextStage(s) && s.clock.day >= data(s).nextDay;
  const canEnter = s => available(s) && s.money >= cost(nextStage(s));
  const daysUntil = s => Math.max(0, data(s).nextDay - s.clock.day);

  // Rival da etapa (mesma forma de generateRival em combat-ui.js). Deterministico: so depende da etapa.
  function rival(st) {
    const [lo, hi] = CONFIG.rivalTier;
    const stat = Math.round(lo + (hi - lo) * st.pct);
    const t = st.tecnicaBonus || 0;
    return {
      id: 'rival_nac_' + st.id, stageId: st.id, isNational: true, profile: st.profile, techniques: st.techniques.slice(),
      attributes: { forca: stat, velocidade: stat, resistencia: stat, reflexo: stat, tecnica: stat + t, disciplina: stat + t, inteligencia: stat },
      traits: [],
    };
  }

  // Fim da luta da etapa: paga premio menos viagem (nunca deixa o saldo negativo), registra e agenda a proxima.
  // A vitoria na final da o titulo. Etapas 1-3 contam qualquer resultado; a final so fecha com vitoria (pode tentar de novo).
  function settle(s, stageId, result) {
    const st = STAGES.find(x => x.id === stageId), d = data(s);
    if (!st || !unlocked(s) || stageDone(s, stageId)) return null;
    const prize = prizeFor(st, result), travel = cost(st);
    let net = prize - travel;
    if (s.money + net < 0) net = s.money > 0 ? -s.money : 0; // nunca deixa o saldo negativo (evita -0)
    d.attempts[stageId] = (d.attempts[stageId] || 0) + 1;
    FirstDay().transact(s, 'nacional_' + stageId + '_' + d.attempts[stageId], net);
    d.nextDay = s.clock.day + CONFIG.gapDays;
    const closes = !st.final || result === 'win';
    if (closes) {
      d.done[stageId] = { day: s.clock.day, result };
      const n = stageIndex(st);
      if (!st.final) Flags.set(s, 'nacional_etapa_' + n);
      if (st.final) Flags.set(s, 'nacional_campeao');
    }
    return { stageId, result, prize, travel, net, closed: closes, champion: !!(st.final && result === 'win') };
  }

  const maxWins = s => Object.values(s.roosters?.byId || {}).reduce((m, r) => Math.max(m, r.record?.wins || 0), 0);
  // Abre o circuito (E023) quando a linhagem tem nome e alguma ave chega ao minimo de vitorias.
  const shouldUnlock = s => Flags.has(s, 'linhagem_nomeada') && maxWins(s) >= CONFIG.minWins;

  const National = { CONFIG, STAGES, data, unlocked, doneIds, stageDone, nextStage, stageIndex, cost, prizeFor, maxPrize, available, canEnter, daysUntil, rival, settle, maxWins, shouldUnlock };
  root.National = National;
  if (node) module.exports = National;
})(typeof window === 'undefined' ? globalThis : window);
