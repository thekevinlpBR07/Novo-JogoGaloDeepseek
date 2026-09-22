(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const MC = node ? require('./market-config.js') : root.MarketConfig;
  const GC = node ? require('./genetics-config.js') : root.GeneticsConfig;
  const CombatConfig = node ? require('./combat-config.js') : root.CombatConfig;
  const FirstDay = node ? require('./first-day.js') : root.FirstDay;

  // Preco de venda: piso fixo + potencial genetico medio + cartel de lutas +
  // perks (raros valem bem mais que comuns). Nunca depende de sorte no
  // momento da venda — so do que o animal ja e (Secao 13, determinismo).
  function saleValue(animal) {
    const potentials = Object.values(animal.genetics?.potential || {});
    const avgPotential = potentials.length ? potentials.reduce((a, b) => a + b, 0) / potentials.length : 0;
    const wins = animal.record?.wins || 0;
    const rarePerks = (animal.traits || []).filter(id => CombatConfig.PERKS[id]?.rare).length;
    const commonPerks = (animal.traits || []).length - rarePerks;
    const value = MC.SALE.base + avgPotential * MC.SALE.perAveragePotentialPoint + wins * MC.SALE.perWin + rarePerks * MC.SALE.perRarePerk + commonPerks * MC.SALE.perCommonPerk;
    return Math.round(value);
  }

  function isInAnyPen(s, id) {
    return Object.values(s.breeding.pens.byId).some(p => p.roosterId === id || p.henId === id);
  }

  function canSell(s, id) {
    const isRooster = !!s.roosters.byId[id];
    const isHen = !!s.chickens.breeding.byId[id];
    if (!isRooster && !isHen) return false;
    if (id === FirstDay.CONFIG.roosterId && FirstDay.data(s)?.phase !== 'complete') return false;
    if (isInAnyPen(s, id)) return false;
    // Veterano aposentado na placa da linhagem (Ato V) e memoria da casa: nao se vende.
    if (s.world?.objects?.lineage?.retired?.[id]) return false;
    return true;
  }

  function sell(s, id) {
    if (!canSell(s, id)) throw Error('Esta ave nao pode ser vendida agora');
    const bucket = s.roosters.byId[id] ? s.roosters.byId : s.chickens.breeding.byId;
    const amount = saleValue(bucket[id]);
    delete bucket[id];
    s.money += amount;
    return amount;
  }

  // Venda de producao da roca (ovo/colheita): preco fixo por unidade, sem
  // genetica nem sorte envolvida — e so escoar excedente de inventario.
  function producePrice(itemId) {
    return MC.PRODUCE[itemId] || 0;
  }

  function canSellProduce(s, itemId, quantity) {
    return producePrice(itemId) > 0 && Number.isSafeInteger(quantity) && quantity > 0 && (s.inventory.items[itemId] || 0) >= quantity;
  }

  function sellProduce(s, itemId, quantity) {
    if (!canSellProduce(s, itemId, quantity)) throw Error('Venda de producao invalida');
    const amount = producePrice(itemId) * quantity;
    s.inventory.items[itemId] -= quantity;
    s.money += amount;
    return amount;
  }

  const Market = { saleValue, canSell, sell, producePrice, canSellProduce, sellProduce };
  root.Market = Market;
  if (node) module.exports = Market;
})(typeof window === 'undefined' ? globalThis : window);
