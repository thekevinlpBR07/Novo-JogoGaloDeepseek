// Ato V - O nome da linhagem (Biblia). Depois de 2 geracoes nascidas no quintal o jogador da nome a linhagem numa
// placa fisica, ve descendentes e legado e pode aposentar um veterano como reprodutor (nao luta nem e vendido).
// Modulo puro: o estado fica em s.world.objects.lineage (campo livre, sem mudar o schema do save).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const Flags = node ? require('./events.js') : root.EventFlags;

  const CONFIG = Object.freeze({ minGeneration: 2, retireMinWins: 3, nameMin: 3, nameMax: 24 });
  const data = s => (s.world.objects.lineage ??= { name: null, namedDay: 0, retired: {} });

  const roosters = s => Object.values(s.roosters?.byId || {});
  const hens = s => Object.values(s.chickens?.breeding?.byId || {});
  const birds = s => [...roosters(s), ...hens(s)];
  const generation = b => (Number.isSafeInteger(b?.genetics?.generation) ? b.genetics.generation : 0);

  const maxGeneration = s => birds(s).reduce((m, b) => Math.max(m, generation(b)), 0);
  const ready = s => maxGeneration(s) >= CONFIG.minGeneration;
  const isNamed = s => !!data(s).name;
  const name = s => data(s).name;
  const isRetired = (s, id) => !!s.world?.objects?.lineage?.retired?.[id];

  // Sinal da placa no quintal: null (ainda nao existe), 'blank' (esperando o nome) ou 'named'.
  const signState = s => (isNamed(s) ? 'named' : Flags.has(s, 'linhagem_visto') ? 'blank' : null);

  function cleanName(text) { return String(text ?? '').replace(/\s+/g, ' ').trim(); }
  // Codigos: short | long | chars. Letras (com acento), numeros, espaco, apostrofo, ponto e hifen.
  function nameError(text) {
    const n = cleanName(text);
    if (n.length < CONFIG.nameMin) return 'short';
    if (n.length > CONFIG.nameMax) return 'long';
    if (!/^[\p{L}\p{N} '.-]+$/u.test(n)) return 'chars';
    return null;
  }

  function setName(s, text) {
    if (!Flags.has(s, 'linhagem_visto')) return { ok: false, code: 'locked' };
    if (isNamed(s)) return { ok: false, code: 'already' };
    const code = nameError(text);
    if (code) return { ok: false, code };
    const d = data(s);
    d.name = cleanName(text);
    d.namedDay = s.clock.day;
    Flags.set(s, 'linhagem_nomeada');
    return { ok: true };
  }

  // Quantas aves vivas descendem de `id` (segue pais registrados em genetics.parents).
  function descendants(s, id) {
    const all = birds(s), found = new Set();
    let grew = true;
    while (grew) {
      grew = false;
      for (const b of all) {
        if (found.has(b.id) || b.id === id) continue;
        if ((b.genetics?.parents || []).some(p => p === id || found.has(p))) { found.add(b.id); grew = true; }
      }
    }
    return found.size;
  }

  const eligibleToRetire = (s, r) => !!r && isNamed(s) && !isRetired(s, r.id) && (r.record?.wins || 0) >= CONFIG.retireMinWins;
  function retire(s, id) {
    const r = s.roosters?.byId?.[id];
    if (!isNamed(s)) return { ok: false, code: 'unnamed' };
    if (!r) return { ok: false, code: 'missing' };
    if (isRetired(s, id)) return { ok: false, code: 'already' };
    if ((r.record?.wins || 0) < CONFIG.retireMinWins) return { ok: false, code: 'wins' };
    data(s).retired[id] = s.clock.day;
    return { ok: true };
  }

  // Hall dos aposentados (legado): mais vitorioso primeiro.
  function hall(s) {
    return Object.entries(data(s).retired)
      .filter(([id]) => s.roosters?.byId?.[id])
      .map(([id, day]) => { const r = s.roosters.byId[id]; return { id, name: r.name, generation: generation(r), wins: r.record?.wins || 0, descendants: descendants(s, id), day }; })
      .sort((a, b) => b.wins - a.wins || a.day - b.day);
  }

  function summary(s) {
    return { name: name(s), generations: maxGeneration(s), bornHere: birds(s).filter(b => generation(b) >= 1).length, retired: hall(s).length, founders: roosters(s).filter(r => generation(r) === 0).length };
  }

  const Lineage = { CONFIG, data, birds, generation, maxGeneration, ready, isNamed, name, isRetired, signState, cleanName, nameError, setName, descendants, eligibleToRetire, retire, hall, summary };
  root.Lineage = Lineage;
  if (node) module.exports = Lineage;
})(typeof window === 'undefined' ? globalThis : window);
