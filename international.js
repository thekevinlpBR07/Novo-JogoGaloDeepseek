// Ato VII - Mundo: circuito internacional fictício + CITA (Certificado Internacional de Transito Aviario, Biblia 11.9).
// A viagem leva no maximo 2 galos (3 em destino especial). Cada galo precisa do seu CITA: individual, caro e com prazo;
// custo, prazo e validade sao mostrados ANTES de confirmar; erro documental nunca apaga nem apreende a ave.
// Regras: o grupo da viagem e fechado na primeira luta do destino (galos com CITA valido); cada membro luta uma vez; o
// destino e conquistado com pelo menos 1 vitoria. Modulo puro; estado em s.world.objects.international (campo livre).
// Valores em centavos e centralizados aqui (Biblia secao 10) - calibragem provisoria, ajustada na build de balanceamento.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const Flags = node ? require('./events.js') : root.EventFlags;
  const CombatConfig = () => (node ? require('./combat-config.js') : root.CombatConfig);
  const FirstDay = () => (node ? require('./first-day.js') : root.FirstDay);

  const CONFIG = Object.freeze({
    cita: Object.freeze({ cost: 40000, prepDays: 3, validDays: 30 }), // R$ 400,00 por galo; pronto em 3 dias; vale 30 dias
    tripCost: 30000, // R$ 300,00 por destino, pago na primeira luta
    gapDays: 5, // dias entre um destino e o proximo
    capacity: 2, // galos por viagem (destino especial: specialCapacity)
    specialCapacity: 3,
    prize: Object.freeze({ win: 80000, draw: 30000, lose: 10000 }),
    finalMultiplier: 2,
    rivalTier: [70, 95],
    boutBump: 2, // cada luta extra do mesmo destino enfrenta uma ave um pouco mais forte
  });

  // Destinos fictícios. arena = encaixe de arte 'arena-<arena>'. Nomes/rivais: LOCALES[lang].international.
  const DESTINATIONS = Object.freeze([
    { id: 'd1', arena: 'int-1', profile: 'tecnico', pct: 0.2, techniques: ['passo_terreno', 'olhar_milho'] },
    { id: 'd2', arena: 'int-2', profile: 'paciente', pct: 0.45, techniques: ['asa_fantasma', 'bicada_filosofica'] },
    { id: 'd3', arena: 'int-3', profile: 'agressivo', pct: 0.7, techniques: ['rei_poleiro', 'coco_combo', 'passo_terreno'], special: true },
    { id: 'd4', arena: 'int-4', profile: 'adaptativo', pct: 0.95, techniques: ['rei_poleiro', 'bicada_filosofica', 'olhar_milho'], final: true },
  ]);

  const data = s => (s.world.objects.international ??= { citas: {}, trips: {}, done: {}, attempts: {}, nextDay: 0 });
  const unlocked = s => Flags.has(s, 'internacional_visto');
  const dest = id => DESTINATIONS.find(d => d.id === id) || null;
  const capacityOf = d => (d?.special ? CONFIG.specialCapacity : CONFIG.capacity);
  const quote = () => ({ cost: CONFIG.cita.cost, prepDays: CONFIG.cita.prepDays, validDays: CONFIG.cita.validDays, tripCost: CONFIG.tripCost });

  // --- CITA ---
  const citaOf = (s, id) => data(s).citas[id] || null;
  function citaStatus(s, id) {
    const c = citaOf(s, id), day = s.clock.day;
    if (!c) return 'none';
    if (day < c.ready) return 'pending';
    return day <= c.expires ? 'valid' : 'expired';
  }
  const isRetired = (s, id) => !!s.world?.objects?.lineage?.retired?.[id];
  const isAdult = (s, r) => !(Number.isSafeInteger(r.bornDay) && s.clock.day - r.bornDay < CombatConfig().LIFE.chickDays);

  // Pedido do CITA. Erros: locked, missing, chick, retired, have (pendente ou valido), money.
  function orderCita(s, id) {
    if (!unlocked(s)) return { ok: false, code: 'locked' };
    const r = s.roosters?.byId?.[id];
    if (!r) return { ok: false, code: 'missing' };
    if (!isAdult(s, r)) return { ok: false, code: 'chick' };
    if (isRetired(s, id)) return { ok: false, code: 'retired' };
    const st = citaStatus(s, id);
    if (st === 'pending' || st === 'valid') return { ok: false, code: 'have' };
    if (s.money < CONFIG.cita.cost) return { ok: false, code: 'money' };
    const day = s.clock.day, ready = day + CONFIG.cita.prepDays;
    FirstDay().transact(s, 'cita_' + id + '_' + day, -CONFIG.cita.cost);
    data(s).citas[id] = { ordered: day, ready, expires: ready + CONFIG.cita.validDays };
    Flags.set(s, 'cita_pedida');
    return { ok: true, ready, expires: ready + CONFIG.cita.validDays };
  }
  const validCitas = s => Object.keys(data(s).citas).filter(id => s.roosters?.byId?.[id] && citaStatus(s, id) === 'valid' && !isRetired(s, id)).sort((a, b) => data(s).citas[a].ready - data(s).citas[b].ready || (a < b ? -1 : 1));

  // --- destinos e viagem ---
  const nextDestination = s => (unlocked(s) ? DESTINATIONS.find(d => !data(s).done[d.id]) || null : null);
  const tripOf = (s, id) => data(s).trips[id] || null;
  const available = s => !!nextDestination(s) && s.clock.day >= data(s).nextDay;
  const daysUntil = s => Math.max(0, data(s).nextDay - s.clock.day);
  const pendingParty = (s, id) => { const t = tripOf(s, id); return t ? t.party.filter(x => !t.bouts[x] && s.roosters?.byId?.[x]) : []; };

  // Pode este galo lutar agora no destino? Codigos: locked, notnext, wait, cita, party, done, money.
  function canFightBout(s, destId, id) {
    const d = dest(destId), next = nextDestination(s);
    if (!unlocked(s) || !d) return { ok: false, code: 'locked' };
    if (!next || next.id !== d.id) return { ok: false, code: 'notnext' };
    if (s.clock.day < data(s).nextDay) return { ok: false, code: 'wait' };
    if (citaStatus(s, id) !== 'valid' || isRetired(s, id) || !s.roosters?.byId?.[id]) return { ok: false, code: 'cita' };
    const trip = tripOf(s, d.id);
    if (trip) {
      if (!trip.party.includes(id)) return { ok: false, code: 'party' };
      if (trip.bouts[id]) return { ok: false, code: 'done' };
      return { ok: true, boutIndex: Object.keys(trip.bouts).length, first: false };
    }
    if (s.money < CONFIG.tripCost) return { ok: false, code: 'money' };
    return { ok: true, boutIndex: 0, first: true };
  }

  // Rival da luta (deterministico). boutIndex = quantas lutas ja houve neste destino.
  function rival(d, boutIndex = 0) {
    const [lo, hi] = CONFIG.rivalTier;
    const stat = Math.min(100, Math.round(lo + (hi - lo) * d.pct) + boutIndex * CONFIG.boutBump);
    return {
      id: 'rival_int_' + d.id + '_' + boutIndex, destId: d.id, boutIndex, isInternational: true, profile: d.profile, techniques: d.techniques.slice(),
      attributes: { forca: stat, velocidade: stat, resistencia: stat, reflexo: stat, tecnica: stat, disciplina: stat, inteligencia: stat },
      traits: [],
    };
  }

  const prizeFor = (d, result) => (CONFIG.prize[result] ?? CONFIG.prize.lose) * (d?.final ? CONFIG.finalMultiplier : 1);

  // Encerra a viagem (todos lutaram ou o jogador encerra): conquistado com 1+ vitoria; senao tenta de novo depois do intervalo.
  function finishTrip(s, destId) {
    const d = dest(destId), trip = tripOf(s, destId), st = data(s);
    if (!d || !trip || !Object.keys(trip.bouts).length) return null;
    const wins = Object.values(trip.bouts).filter(r => r === 'win').length, conquered = wins >= 1;
    delete st.trips[destId];
    st.nextDay = s.clock.day + CONFIG.gapDays;
    if (conquered) {
      st.done[destId] = { day: s.clock.day, wins };
      Flags.set(s, 'intl_dest_' + (DESTINATIONS.indexOf(d) + 1));
    }
    return { destId, conquered, wins, bouts: Object.keys(trip.bouts).length };
  }

  // Fim de uma luta no destino: fecha o grupo na 1a luta (paga a viagem), paga o premio, registra e encerra se acabou.
  function settleBout(s, destId, id, result) {
    const chk = canFightBout(s, destId, id);
    if (!chk.ok) return null;
    const d = dest(destId), st = data(s);
    if (chk.first) {
      const others = validCitas(s).filter(x => x !== id).slice(0, capacityOf(d) - 1);
      st.attempts[destId] = (st.attempts[destId] || 0) + 1;
      FirstDay().transact(s, 'intl_trip_' + destId + '_' + st.attempts[destId], -CONFIG.tripCost);
      st.trips[destId] = { day: s.clock.day, attempt: st.attempts[destId], party: [id, ...others], bouts: {} };
    }
    const trip = tripOf(s, destId), prize = prizeFor(d, result);
    FirstDay().transact(s, 'intl_' + destId + '_' + trip.attempt + '_' + id, prize);
    trip.bouts[id] = result;
    const out = { destId, rooster: id, result, prize, tripPaid: chk.first ? CONFIG.tripCost : 0, boutIndex: chk.boutIndex, party: trip.party.length, finished: null };
    if (pendingParty(s, destId).length === 0) out.finished = finishTrip(s, destId);
    return out;
  }

  const International = { CONFIG, DESTINATIONS, data, unlocked, dest, capacityOf, quote, citaOf, citaStatus, orderCita, validCitas, nextDestination, tripOf, available, daysUntil, pendingParty, canFightBout, rival, prizeFor, finishTrip, settleBout };
  root.International = International;
  if (node) module.exports = International;
})(typeof window === 'undefined' ? globalThis : window);
