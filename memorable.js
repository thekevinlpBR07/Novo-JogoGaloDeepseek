// Dias memoraveis (Biblia secao 12): a cada 3 a 5 dias, depois do Primeiro Dia, um microevento curto de bairro
// aparece na manha seguinte. Alguns dao uma pequena recompensa, a maioria nao. Deterministico por dia (sem
// Math.random), guardado em s.world.objects.memorable (campo livre: saves antigos so nao o tem ainda).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const FD = () => (node ? require('./first-day.js') : root.FirstDay);

  // reward em centavos (opcional). Os textos ficam em LOCALES[lang].memorable.events[id].
  const EVENTS = Object.freeze([
    { id: 'chuva' }, { id: 'galinha_fugida', reward: 500 }, { id: 'cafe_zorino' }, { id: 'promocao_deni' },
    { id: 'muro_janilson' }, { id: 'principe_passa' }, { id: 'dolores_sabia' }, { id: 'cachorro_portao' },
    { id: 'sara_corre' }, { id: 'mapa_renatinho' }, { id: 'envelope', reward: 1000 }, { id: 'manha_calma' },
  ]);
  const MIN_GAP = 3, GAP_SPAN = 3; // proximo evento em 3, 4 ou 5 dias

  function hash(n) {
    let x = (Math.imul(n >>> 0, 2654435761)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
    return x >>> 0;
  }
  const data = s => (s.world.objects.memorable ??= { next: 0, seen: {}, today: null });

  // Sorteia (no maximo uma vez por dia) o evento da manha. Retorna o evento ou null.
  function roll(s) {
    const fd = s.story?.firstDay;
    if (!fd?.enabled || fd.phase !== 'complete') return null;
    const m = data(s), day = s.clock.day;
    if (m.today?.day === day) return EVENTS.find(e => e.id === m.today.id) || null;
    if (!Number.isSafeInteger(m.next) || m.next < 1) m.next = day + MIN_GAP + (hash(day) % GAP_SPAN);
    if (day < m.next) return null;
    const recent = Object.entries(m.seen).sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
    const pool = EVENTS.filter(e => !recent.includes(e.id));
    const ev = pool[hash(day * 31 + 7) % pool.length];
    m.seen[ev.id] = day;
    m.today = { day, id: ev.id };
    m.next = day + MIN_GAP + (hash(day + 99) % GAP_SPAN);
    if (ev.reward) FD().transact(s, 'memorable' + day, ev.reward);
    return ev;
  }

  // Evento de hoje (ja sorteado), sem alterar nada. Usado pela tela da manha.
  function today(s) {
    const m = s.world?.objects?.memorable;
    return m?.today?.day === s.clock.day ? EVENTS.find(e => e.id === m.today.id) || null : null;
  }

  const Memorable = { EVENTS, MIN_GAP, GAP_SPAN, roll, today };
  root.Memorable = Memorable;
  if (node) module.exports = Memorable;
})(typeof window === 'undefined' ? globalThis : window);
