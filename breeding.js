(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const G = node ? require('./genetics.js') : root.Genetics;
  const GC = node ? require('./genetics-config.js') : root.GeneticsConfig;
  const Flags = node ? require('./events.js') : root.EventFlags;
  const Combat = node ? require('./combat.js') : root.Combat;
  const VisualDna = node ? require('./visual-dna.js') : root.VisualDna;

  // Curral de reproducao: 1 par por vez POR CURRAL (Secao 5.9/14.1/14.2).
  // "Ocupado" significa que existe um ovo fertil ainda nao chocado vindo
  // DAQUELE curral especifico; enquanto isso, nao da pra reatribuir os slots
  // nem iniciar outro cruzamento nele. Currais sao independentes entre si.

  function initialize(s) {
    s.breeding ??= { pens: { byId: { pen1: { roosterId: null, henId: null } } }, eggs: { byId: {} } };
    s.chickens.breeding ??= { byId: {} };
    return s;
  }

  // Chamado pela construcao (Secao 14.2) quando um novo curral e liberado.
  function addPen(s, penId) {
    s.breeding.pens.byId[penId] ??= { roosterId: null, henId: null };
  }

  function pen(s, penId) {
    return s.breeding.pens.byId[penId] || null;
  }

  function findAnimal(s, id) {
    return s.roosters.byId[id] || s.chickens.breeding.byId[id] || null;
  }

  function hashId(id) {
    let h = 7;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }

  // Animal "de origem" (sem pedigree conhecido) — mesmo shape que
  // GameState.createRooster, duplicado aqui de proposito pra nao criar
  // dependencia circular com state.js (que ja depende de breeding.js).
  function newOriginAnimal(id, name = '') {
    const rng = G.makeRng(hashId(id));
    const attributes = {};
    for (const a of GC.ATTRIBUTES) attributes[a] = 35;
    return {
      id,
      name,
      attributes,
      traits: [],
      genetics: { parents: [], genes: {}, generation: 0, potential: G.randomPotential(rng), genotype: G.randomGenotype(rng) },
      status: { health: 100, energy: 100, condition: 'idle', recoverDay: null, injuryMod: 0 },
      training: { experience: 0, levels: {}, history: [] },
      skillPoints: 0,
      skills: {},
      visualDna: VisualDna.randomVisualDna(rng),
    };
  }

  // E009 (Secao 5.9): a primeira breedingHen chega assim que o galo do
  // jogador acumula 2 resultados de luta — sempre de graca, o melhor negocio
  // possivel na epoca, nunca so uma alternativa ao mercado.
  function sync(s) {
    if (Flags.has(s, 'E009')) return false;
    const qualifies = Object.values(s.roosters.byId).some(r => r.record && r.record.wins + r.record.draws + r.record.losses >= 2);
    if (!qualifies) return false;
    Flags.set(s, 'E009');
    const henId = nextAnimalId(s, 'breedingHen');
    s.chickens.breeding.byId[henId] = newOriginAnimal(henId);
    return true;
  }

  function lookupParents(s) {
    return id => {
      const a = findAnimal(s, id);
      return a?.genetics?.parents || [];
    };
  }

  function isBusy(s, penId) {
    return Object.values(s.breeding.eggs.byId).some(e => e.penId === penId);
  }

  function anyPenFree(s) {
    return Object.keys(s.breeding.pens.byId).some(id => {
      const p = pen(s, id);
      return !p.roosterId && !p.henId && !isBusy(s, id);
    });
  }

  // Curral livre (sem os dois slots ja ocupados e sem ovo pendente); prefere
  // o curral original (pen1) antes de qualquer anexo construido depois.
  // Se `slot` for informado, so oferece um curral onde ESSE slot especifico
  // esta vazio (evita que dois galos em sequencia cortem um ao outro do
  // mesmo curral, ambos "livres" so porque o slot de galinha estava aberto).
  function findFreePen(s, slot) {
    const field = slot === 'rooster' ? 'roosterId' : slot === 'hen' ? 'henId' : null;
    for (const id of Object.keys(s.breeding.pens.byId).sort()) {
      const p = pen(s, id);
      if (isBusy(s, id)) continue;
      if (field ? !p[field] : !p.roosterId || !p.henId) return id;
    }
    return null;
  }

  function assign(s, penId, slot, id) {
    const p = pen(s, penId);
    if (!p) throw Error('Curral invalido');
    if (!['rooster', 'hen'].includes(slot)) throw Error('Invalid slot');
    if (isBusy(s, penId)) throw Error('Curral ocupado');
    if (id !== null) {
      const animal = slot === 'rooster' ? s.roosters.byId[id] : s.chickens.breeding.byId[id];
      if (!animal) throw Error('Animal invalido para este slot');
    }
    p[slot === 'rooster' ? 'roosterId' : 'henId'] = id;
  }

  function canCross(s, penId) {
    const p = pen(s, penId);
    return !!(p && p.roosterId && p.henId && !isBusy(s, penId));
  }

  // --- Previsao mostrada na tela de cruzamento (nunca numero exato) ----------
  function predict(s, penId) {
    const p = pen(s, penId);
    if (!p) return null;
    const rooster = s.roosters.byId[p.roosterId];
    const hen = s.chickens.breeding.byId[p.henId];
    if (!rooster || !hen) return null;
    return {
      categories: G.predictCategories(hen.genetics.potential, rooster.genetics.potential),
      inbreeding: G.inbreedingBand(hen.id, rooster.id, lookupParents(s)),
    };
  }

  function nextAnimalId(s, prefix) {
    let n = 1;
    while (s.roosters.byId[prefix + n] || s.chickens.breeding.byId[prefix + n]) n++;
    return prefix + n;
  }

  // --- Cruzamento: resultado decidido na hora, ovo so revela depois ----------
  function cross(s, penId, seed, day) {
    if (!canCross(s, penId)) throw Error('Curral nao esta pronto para cruzar');
    const p = pen(s, penId);
    const rooster = s.roosters.byId[p.roosterId];
    const hen = s.chickens.breeding.byId[p.henId];
    const breedingSeed = Number.isSafeInteger(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
    const rng = G.makeRng(breedingSeed);

    const { potential, mutated } = G.inheritPotential(hen.genetics.potential, rooster.genetics.potential, rng);
    const perks = G.inheritPerks(hen.traits, rooster.traits, rng, Combat.perkEffect(hen.traits, 'perkInheritChanceBonus'), Combat.perkEffect(rooster.traits, 'perkInheritChanceBonus'));
    const { genotype, phenotype } = G.inheritGenotype(hen.genetics.genotype, rooster.genetics.genotype, rng);
    const gender = rng() < 0.5 ? 'macho' : 'femea';
    const generation = Math.max(hen.genetics.generation || 0, rooster.genetics.generation || 0) + 1;
    // DNA visual (aparencia) do filhote: nasce da mistura dos pais + mutacao
    // rara, nunca sorteado do zero enquanto os pais tiverem DNA visual salvo.
    const visualDna = hen.visualDna && rooster.visualDna
      ? VisualDna.inheritVisualDna(hen.visualDna, rooster.visualDna, rng)
      : VisualDna.randomVisualDna(rng);

    const eggId = nextAnimalId(s, 'egg');
    s.breeding.eggs.byId[eggId] = {
      id: eggId,
      penId,
      motherId: hen.id,
      fatherId: rooster.id,
      day,
      incubationEndDay: day + GC.INCUBATION_DAYS,
      breedingSeed,
      genesRolled: { potential, perks, genotype, phenotype, mutated, gender, generation, visualDna },
    };
    // E010/E011: primeiro cruzamento e primeiro ovo (cenas em first-day-ui).
    Flags.set(s, 'E010');
    Flags.set(s, 'E011');
    return eggId;
  }

  function isReady(egg, day) {
    return day >= egg.incubationEndDay;
  }

  // --- Nascimento: revela o resultado ja decidido no cruzamento --------------
  function hatch(s, eggId, name, day) {
    const egg = s.breeding.eggs.byId[eggId];
    if (!egg) throw Error('Ovo invalido');
    if (!isReady(egg, day)) throw Error('Ovo ainda em incubacao');
    const roll = egg.genesRolled;
    const prefix = roll.gender === 'macho' ? 'rooster' : 'breedingHen';
    const id = nextAnimalId(s, prefix);
    const animal = {
      id,
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : '',
      // Pintinho recem-nascido: atributo atual comeca baixo, o potencial e que
      // veio do cruzamento; treino aproxima um do outro depois (Secao 5.5/5.9).
      attributes: Object.fromEntries(GC.ATTRIBUTES.map(a => [a, Math.round(roll.potential[a] * 0.15)])),
      traits: roll.perks,
      genetics: { parents: [egg.motherId, egg.fatherId], generation: roll.generation, potential: roll.potential, genotype: roll.genotype, genes: roll.phenotype },
      status: { health: 100, energy: 100, condition: 'idle', recoverDay: null, injuryMod: 0 },
      training: { experience: 0, levels: {}, history: [] },
      skillPoints: 0,
      skills: {},
      visualDna: roll.visualDna,
      bornDay: day,
    };
    if (roll.gender === 'macho') s.roosters.byId[id] = animal;
    else s.chickens.breeding.byId[id] = animal;
    delete s.breeding.eggs.byId[eggId];
    const p = pen(s, egg.penId);
    if (p) {
      p.roosterId = null;
      p.henId = null;
    }
    if (!Flags.has(s, 'E012')) Flags.set(s, 'E012');
    return { id, gender: roll.gender };
  }

  function validate(s) {
    if (!s.breeding || typeof s.breeding !== 'object') return false;
    if (!s.breeding.pens || typeof s.breeding.pens.byId !== 'object' || !s.breeding.pens.byId.pen1) return false;
    for (const [id, p] of Object.entries(s.breeding.pens.byId)) {
      if (!Flags.safeId(id) || !p || typeof p !== 'object') return false;
      if (p.roosterId !== null && !s.roosters.byId[p.roosterId]) return false;
      if (p.henId !== null && !s.chickens.breeding.byId[p.henId]) return false;
    }
    if (!s.breeding.eggs || typeof s.breeding.eggs.byId !== 'object') return false;
    for (const egg of Object.values(s.breeding.eggs.byId)) {
      if (!Flags.safeId(egg.id) || !Flags.safeId(egg.motherId) || !Flags.safeId(egg.fatherId)) return false;
      if (!Flags.safeId(egg.penId) || !s.breeding.pens.byId[egg.penId]) return false;
      if (!Number.isSafeInteger(egg.day) || !Number.isSafeInteger(egg.incubationEndDay) || !Number.isSafeInteger(egg.breedingSeed)) return false;
      const r = egg.genesRolled;
      if (!r || !['macho', 'femea'].includes(r.gender) || typeof r.mutated !== 'boolean') return false;
      if (!GC.ATTRIBUTES.every(a => Number.isSafeInteger(r.potential?.[a]))) return false;
      if (!Array.isArray(r.perks) || !r.perks.every(Flags.safeId)) return false;
    }
    if (!s.chickens.breeding || typeof s.chickens.breeding.byId !== 'object') return false;
    return true;
  }

  const Breeding = { initialize, addPen, pen, findAnimal, isBusy, anyPenFree, findFreePen, assign, canCross, predict, cross, isReady, hatch, validate, nextAnimalId, sync, newOriginAnimal };
  root.Breeding = Breeding;
  if (node) module.exports = Breeding;
})(typeof window === 'undefined' ? globalThis : window);
