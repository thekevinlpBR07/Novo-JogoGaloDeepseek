// Ato VIII - Campeao / Epilogo: o Mundial (mata-mata de 3 rodadas), epilogo, hall da fama, ranking e temporadas (pos-game).
// A ave inscrita e a que o jogador escolhe (com CITA valido); se ela descende do primeiro galo o jogo reconhece a conexao de
// linhagem para falas especiais (Biblia, Ato VIII). Perdeu (ou empatou) uma rodada: eliminado. Uma tentativa por temporada
// (30 dias); depois do epilogo o Mundial vira o desafio de cada temporada. Modulo puro; estado em s.world.objects.worldcup.
// Valores em centavos e centralizados aqui (calibragem provisoria; ajustada na build de balanceamento).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const Flags = node ? require('./events.js') : root.EventFlags;
  const FirstDay = () => (node ? require('./first-day.js') : root.FirstDay);
  const International = () => (node ? require('./international.js') : root.International);

  const CONFIG = Object.freeze({
    seasonDays: 30,
    tripCost: 50000, // R$ 500,00, pago na primeira rodada da tentativa
    consolation: 20000, // R$ 200,00 ao ser eliminado
    rivalTier: [85, 100],
    firstRoosterId: 'firstRooster',
    rankingSize: 10,
  });
  // pct = posicao do rival na faixa; prize = premio por vencer a rodada.
  const STAGES = Object.freeze([
    { id: 'quartas', profile: 'tecnico', pct: 0.5, prize: 100000, techniques: ['passo_terreno', 'olhar_milho'] },
    { id: 'semi', profile: 'oportunista', pct: 0.75, prize: 150000, techniques: ['coco_combo', 'asa_fantasma', 'rei_poleiro'] },
    { id: 'final', profile: 'adaptativo', pct: 1, prize: 400000, techniques: ['rei_poleiro', 'bicada_filosofica', 'olhar_milho'], final: true },
  ]);

  const data = s => (s.world.objects.worldcup ??= { entry: null, lastSeason: 0, attempts: 0, champions: [] });
  const season = s => Math.floor((s.clock.day - 1) / CONFIG.seasonDays) + 1;
  const daysToNextSeason = s => season(s) * CONFIG.seasonDays + 1 - s.clock.day;
  const unlocked = s => Flags.has(s, 'convite_mundial_visto');
  const entry = s => data(s).entry;
  const stageNow = s => (entry(s) ? STAGES[entry(s).stage] : STAGES[0]);
  // Pode haver Mundial agora? (uma tentativa por temporada; em andamento continua)
  const available = s => unlocked(s) && (!!entry(s) || data(s).lastSeason < season(s));

  function canEnter(s, id) {
    if (!available(s)) return { ok: false, code: 'wait' };
    if (!s.roosters?.byId?.[id]) return { ok: false, code: 'missing' };
    if (International().citaStatus(s, id) !== 'valid') return { ok: false, code: 'cita' };
    const e = entry(s);
    if (e) return e.rooster === id ? { ok: true, stage: e.stage, first: false } : { ok: false, code: 'registered' };
    if (s.money < CONFIG.tripCost) return { ok: false, code: 'money' };
    return { ok: true, stage: 0, first: true };
  }

  function rival(st) {
    const [lo, hi] = CONFIG.rivalTier;
    const stat = Math.min(100, Math.round(lo + (hi - lo) * st.pct));
    return { id: 'rival_mundial_' + st.id, stageId: st.id, isWorld: true, profile: st.profile, techniques: st.techniques.slice(), attributes: { forca: stat, velocidade: stat, resistencia: stat, reflexo: stat, tecnica: stat, disciplina: stat, inteligencia: stat }, traits: [] };
  }

  // A ave descende do primeiro galo? (segue os pais registrados; o proprio primeiro galo tambem conta)
  function connection(s, id) {
    const root = CONFIG.firstRoosterId;
    if (id === root) return true;
    const birds = { ...(s.roosters?.byId || {}), ...(s.chickens?.breeding?.byId || {}) }, seen = new Set(), queue = [id];
    while (queue.length) {
      const b = birds[queue.pop()];
      for (const p of b?.genetics?.parents || []) { if (p === root) return true; if (!seen.has(p)) { seen.add(p); queue.push(p); } }
    }
    return false;
  }

  // Fim de uma luta do Mundial. Vencer avanca; empate/derrota elimina (com consolo). Vencer a final da o titulo.
  function settle(s, id, result) {
    const chk = canEnter(s, id);
    if (!chk.ok) return null;
    const d = data(s), st = STAGES[chk.stage];
    if (chk.first) {
      FirstDay().transact(s, 'mundial_viagem_' + (d.attempts + 1), -CONFIG.tripCost);
      d.entry = { rooster: id, stage: 0, season: season(s), day: s.clock.day };
    }
    const e = d.entry, win = result === 'win';
    const prize = win ? st.prize : CONFIG.consolation;
    FirstDay().transact(s, 'mundial_' + (d.attempts + 1) + '_' + st.id, prize);
    const out = { stageId: st.id, stageIndex: chk.stage, result, prize, tripPaid: chk.first ? CONFIG.tripCost : 0, eliminated: !win, champion: false, connection: connection(s, id) };
    if (!win) {
      d.entry = null; d.lastSeason = e.season; d.attempts++;
    } else if (st.final) {
      const r = s.roosters.byId[id];
      d.champions.push({ season: e.season, day: s.clock.day, rooster: id, name: r?.name || id, wins: r?.record?.wins || 0, generation: r?.genetics?.generation || 0, connection: out.connection });
      d.entry = null; d.lastSeason = e.season; d.attempts++;
      Flags.set(s, 'mundial_campeao');
      out.champion = true;
    } else {
      e.stage++;
    }
    return out;
  }

  const hall = s => data(s).champions.slice();

  // Ranking dos galos vivos por vitorias (desempate: menos derrotas, depois nome).
  function ranking(s) {
    return Object.values(s.roosters?.byId || {})
      .map(r => ({ id: r.id, name: r.name, wins: r.record?.wins || 0, draws: r.record?.draws || 0, losses: r.record?.losses || 0, generation: r.genetics?.generation || 0 }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .slice(0, CONFIG.rankingSize);
  }

  // Resumo da carreira para o epilogo.
  function epilogue(s) {
    const L = s.world.objects.lineage, N = s.world.objects.national, I = s.world.objects.international;
    const rs = Object.values(s.roosters?.byId || {});
    const first = data(s).champions[0] || null;
    return {
      day: s.clock.day, money: s.money, lineage: L?.name || null, retired: Object.keys(L?.retired || {}).length,
      generations: [...rs, ...Object.values(s.chickens?.breeding?.byId || {})].reduce((m, b) => Math.max(m, b?.genetics?.generation || 0), 0),
      wins: rs.reduce((n, r) => n + (r.record?.wins || 0), 0), fights: rs.reduce((n, r) => n + (r.record ? r.record.wins + r.record.draws + r.record.losses : 0), 0),
      nationalStages: Object.keys(N?.done || {}).length, destinations: Object.keys(I?.done || {}).length,
      champion: first ? first.name : null, connection: first ? first.connection : false, titles: data(s).champions.length,
    };
  }

  const WorldCup = { CONFIG, STAGES, data, season, daysToNextSeason, unlocked, entry, stageNow, available, canEnter, rival, connection, settle, hall, ranking, epilogue };
  root.WorldCup = WorldCup;
  if (node) module.exports = WorldCup;
})(typeof window === 'undefined' ? globalThis : window);
