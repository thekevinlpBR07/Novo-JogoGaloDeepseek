(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const C = node ? require('./genetics-config.js') : root.GeneticsConfig;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // --- RNG determinístico (breedingSeed), mesma tecnica do Combat.makeRng ----
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

  // --- Potencial de origem (comprado/selvagem, sem pedigree) -----------------
  function randomPotential(rng) {
    const [min, max] = C.INHERITANCE.baselineRange;
    const out = {};
    for (const attr of C.ATTRIBUTES) out[attr] = Math.round(min + rng() * (max - min));
    return out;
  }

  // --- Heranca de potencial: media dos pais + variancia + mutacao rara -------
  function inheritPotential(motherPotential, fatherPotential, rng) {
    const out = {};
    let mutated = false;
    for (const attr of C.ATTRIBUTES) {
      const base = ((motherPotential[attr] || 0) + (fatherPotential[attr] || 0)) / 2;
      const variance = (rng() * 2 - 1) * C.INHERITANCE.variance;
      let value = Math.round(clamp(base + variance, 0, 100));
      if (rng() < C.INHERITANCE.mutationChance) {
        const [min, max] = C.INHERITANCE.mutationRange;
        value = Math.round(min + rng() * (max - min));
        mutated = true;
      }
      out[attr] = value;
    }
    return { potential: out, mutated };
  }

  // --- Heranca de perks: 25% base por progenitor portador (Secao 5.6) -------
  // perkInheritBonus(perks) deve vir de fora (Combat.perkEffect) pra nao criar
  // dependencia circular entre genetics.js e combat.js.
  function inheritPerks(motherPerks, fatherPerks, rng, motherBonus = 0, fatherBonus = 0) {
    // Cada portador contribui sua propria chance; se os dois pais tem o mesmo
    // perk, combina como 1-(1-a)*(1-b), nao soma direto (nunca estoura 100%).
    const perkChances = new Map();
    for (const id of motherPerks || []) perkChances.set(id, combineChance(perkChances.get(id), chanceFor(motherBonus)));
    for (const id of fatherPerks || []) perkChances.set(id, combineChance(perkChances.get(id), chanceFor(fatherBonus)));
    const inherited = [];
    for (const [id, chance] of perkChances) if (rng() < chance) inherited.push(id);
    return inherited;
  }
  function chanceFor(bonus) {
    return clamp(C.PERK_INHERITANCE.base + (bonus || 0), 0, 0.95);
  }
  function combineChance(existing, next) {
    if (existing === undefined) return next;
    return 1 - (1 - existing) * (1 - next);
  }

  // --- Traco cosmetico: 1 alelo de cada pai, dominante vence -----------------
  function randomGenotype(rng) {
    const out = {};
    for (const [trait, def] of Object.entries(C.COSMETIC)) out[trait] = [rng() < 0.5 ? def.dominant : def.recessive, rng() < 0.5 ? def.dominant : def.recessive];
    return out;
  }
  function inheritGenotype(motherGenotype, fatherGenotype, rng) {
    const genotype = {};
    const phenotype = {};
    for (const [trait, def] of Object.entries(C.COSMETIC)) {
      const mAllele = (motherGenotype?.[trait] || [def.dominant, def.recessive])[Math.floor(rng() * 2)];
      const fAllele = (fatherGenotype?.[trait] || [def.dominant, def.recessive])[Math.floor(rng() * 2)];
      genotype[trait] = [mAllele, fAllele];
      phenotype[trait] = mAllele === def.dominant || fAllele === def.dominant ? def.dominant : def.recessive;
    }
    return { genotype, phenotype };
  }

  // --- Consanguinidade: ancestrais comuns ate a 3a geracao -------------------
  function ancestorsOf(lookupParents, id, depth = C.ANCESTRY_DEPTH) {
    const set = new Set();
    let frontier = [id];
    for (let d = 0; d < depth && frontier.length; d++) {
      const next = [];
      for (const nodeId of frontier) {
        const parents = lookupParents(nodeId) || [];
        for (const p of parents) {
          if (p && !set.has(p)) {
            set.add(p);
            next.push(p);
          }
        }
      }
      frontier = next;
    }
    return set;
  }
  function inbreedingBand(motherId, fatherId, lookupParents) {
    const mAncestors = ancestorsOf(lookupParents, motherId);
    const fAncestors = ancestorsOf(lookupParents, fatherId);
    let overlap = fatherId === motherId ? 99 : 0;
    for (const a of mAncestors) if (fAncestors.has(a) || a === fatherId) overlap++;
    for (const a of fAncestors) if (a === motherId) overlap++;
    const band = C.INBREEDING_BANDS.find(b => overlap <= b.max);
    return band.label;
  }

  // --- Categorias e faixas qualitativas mostradas na tela de cruzamento ------
  function categoryValue(potential, category) {
    const attrs = C.CATEGORIES[category];
    return attrs.reduce((sum, a) => sum + (potential[a] || 0), 0) / attrs.length;
  }
  function qualitativeBand(value) {
    return C.QUALITATIVE_BANDS.find(b => value <= b.max).label;
  }
  function predictCategories(motherPotential, fatherPotential) {
    const out = {};
    for (const category of Object.keys(C.CATEGORIES)) {
      const expected = (categoryValue(motherPotential, category) + categoryValue(fatherPotential, category)) / 2;
      out[category] = qualitativeBand(expected);
    }
    return out;
  }

  const Genetics = {
    makeRng,
    randomPotential,
    inheritPotential,
    inheritPerks,
    randomGenotype,
    inheritGenotype,
    ancestorsOf,
    inbreedingBand,
    categoryValue,
    qualitativeBand,
    predictCategories,
  };
  root.Genetics = Genetics;
  if (node) module.exports = Genetics;
})(typeof window === 'undefined' ? globalThis : window);
