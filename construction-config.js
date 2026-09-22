(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  // Secao 14.2: Janilson e competente, mas lento — a obra custa dinheiro real
  // e leva dias de jogo, nunca e instantanea. Numeros centralizados (Secao 10).
  const ANNEX = {
    cost: 80000, // R$ 800,00
    days: 3,
  };

  const ConstructionConfig = { ANNEX };
  root.ConstructionConfig = ConstructionConfig;
  if (node) module.exports = ConstructionConfig;
})(typeof window === 'undefined' ? globalThis : window);
