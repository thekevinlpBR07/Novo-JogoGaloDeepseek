(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  // Venda de aves (Secao 14.5): terceiro pilar da economia ja citado na
  // Biblia junto de "cruzar" e "competir" ("vender ave, cruzar, competir,
  // gastar alto"), nunca antes implementado.
  const SALE = {
    base: 500,
    perAveragePotentialPoint: 40,
    perWin: 200,
    perRarePerk: 1500,
    perCommonPerk: 300,
  };

  // Venda de produção da roça (pedido do jogador: fazenda como loop
  // secundário conectado à economia, sem virar sistema novo — só liga o
  // que já existia (colheita/ovo) ao Mercado). Precos por unidade, baixos
  // de proposito: é renda de apoio, nao o foco do jogo.
  const PRODUCE = {
    radish: 40,
    corn: 60,
    egg: 80,
  };

  const MarketConfig = { SALE, PRODUCE };
  root.MarketConfig = MarketConfig;
  if (node) module.exports = MarketConfig;
})(typeof window === 'undefined' ? globalThis : window);
