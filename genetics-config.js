(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  // Numeros de balanceamento da reproducao/genetica (Biblia Secao 5.9 e
  // Registro Mestre). Nada aqui aparece cru pro jogador: a tela de cruzamento
  // so mostra as faixas qualitativas.

  const ATTRIBUTES = ['forca', 'velocidade', 'resistencia', 'reflexo', 'tecnica', 'disciplina', 'inteligencia'];

  // As 3 categorias de exibicao da tela de cruzamento (Secao 5.9): os 7
  // atributos continuam herdados individualmente por baixo.
  const CATEGORIES = {
    fisico: ['forca', 'resistencia'],
    agilidade: ['velocidade', 'reflexo'],
    mente: ['tecnica', 'disciplina', 'inteligencia'],
  };

  const INHERITANCE = {
    variance: 15, // +/- pontos de potencial em torno da media dos pais
    mutationChance: 0.01, // Registro Mestre: mutacao genetica 1% base
    mutationRange: [10, 100], // faixa de onde a mutacao sorteia o atributo afetado
    baselineRange: [20, 55], // potencial de um animal "de origem" (comprado/selvagem), nao filhote
  };

  const PERK_INHERITANCE = { base: 0.25 }; // 25% por progenitor portador (Secao 5.6); Herdeiro soma via perkInheritChanceBonus

  // Faixas qualitativas mostradas ao jogador (nunca o numero).
  const QUALITATIVE_BANDS = [
    { max: 20, label: 'baixo' },
    { max: 40, label: 'medio' },
    { max: 60, label: 'bom' },
    { max: 80, label: 'alto' },
    { max: Infinity, label: 'excelente' },
  ];

  // Consanguinidade: numero de ancestrais comuns encontrados ate a 3a geracao
  // mapeado direto pras 5 faixas ja fechadas na Biblia.
  const INBREEDING_BANDS = [
    { max: 0, label: 'nenhum' },
    { max: 1, label: 'baixo' },
    { max: 2, label: 'moderado' },
    { max: 3, label: 'alto' },
    { max: Infinity, label: 'muito_alto' },
  ];
  const ANCESTRY_DEPTH = 3;

  // Traco cosmetico simplificado (par de alelos dominante/recessivo). Poucas
  // variacoes de proposito (Secao 14.1 NAO ENTRA: tabela cosmetica completa
  // fica pra depois).
  const COSMETIC = {
    plumagem: { dominant: 'comum', recessive: 'malhada' },
    crista: { dominant: 'ereta', recessive: 'tombada' },
  };

  const INCUBATION_DAYS = 4; // Registro Mestre: ovo fertil 4 dias
  const BREEDING_HEN_PRICE = 150000; // R$1.500,00 em centavos; placeholder ate ligar a escala de progressao real

  const GeneticsConfig = { ATTRIBUTES, CATEGORIES, INHERITANCE, PERK_INHERITANCE, QUALITATIVE_BANDS, INBREEDING_BANDS, ANCESTRY_DEPTH, COSMETIC, INCUBATION_DAYS, BREEDING_HEN_PRICE };
  root.GeneticsConfig = GeneticsConfig;
  if (node) module.exports = GeneticsConfig;
})(typeof window === 'undefined' ? globalThis : window);
