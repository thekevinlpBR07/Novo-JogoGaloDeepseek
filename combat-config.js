(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  // Todos os numeros de balanceamento do combate vivem aqui (Biblia Secao 10:
  // "nao espalhar numeros magicos pelos sistemas"). Nada de gore/instrucao real:
  // tudo abaixo e abstrato (Postura, Confianca, Momentum), nunca dano fisico literal.

  const ROUND = {
    BEAT_MS: 500,
    BEATS_NORMAL: 70, // 35s / 0.5s
    BEATS_FINAL: 90, // 45s / 0.5s — rounds finais tambem duram um pouco mais
    MAX_ROUNDS_NORMAL: 3,
    MAX_ROUNDS_FINAL: 5,
  };

  // Fracao do que falta para o maximo que e recuperada no intervalo, por
  // transicao de round (indice 0 = do round 1 para o 2, etc.). Decrescente de
  // proposito: rounds finais de uma luta de 5 devem doer mais que os iniciais.
  const RECOVERY_CURVE = [0.4, 0.25, 0.15, 0.05];

  const ACTION_CHANCE = { base: 35, tecnica: 0.22, velocidade: 0.18, inteligencia: 0.12, min: 15, max: 90 };
  // Calibrado para que um round de 70 beats raramente esgote 100 de Vida
  // sozinho: o padrao deve ser "vai pro proximo round", nao nocaute no round 1
  // (Biblia 6.11 - round cronometrado, interrupcao e a excecao, nao a regra).
  const IMPACT = { base: 0.7, forca: 0.012, tecnica: 0.005 };
  const OBEDIENCE = { base: 65, disciplina: 0.25, vinculo: 0.1, fadiga: -0.15, min: 45, max: 98 };
  const VARIANCE_MAX = 0.08;

  // 6.3 Posturas
  const POSTURES = {
    ofensiva: { actionBonus: 10, energyCost: 1.4, guard: 0.8 },
    tecnica: { actionBonus: 4, energyCost: 1.0, guard: 1.0, precision: 1.15 },
    defensiva: { actionBonus: -6, energyCost: 0.75, guard: 1.35 },
    contra: { actionBonus: -2, energyCost: 1.0, guard: 1.1, counter: 1.4 },
    conservadora: { actionBonus: -10, energyCost: 0.55, guard: 1.2 },
    adaptativa: { actionBonus: 0, energyCost: 1.0, guard: 1.0, adaptive: true },
  };

  // 6.11 - opcoes da conversa no intervalo (antigos "comandos" da 6.4, agora
  // decisao tatica entre rounds, nao clique em tempo real durante a luta).
  const INTERVAL_OPTIONS = {
    pressione: { confidence: 6, energyRecoveryMod: -0.15, postureRecoveryMod: 0 },
    segure: { confidence: 0, energyRecoveryMod: 0, postureRecoveryMod: 0.2 },
    mude_ritmo: { confidence: 0, energyRecoveryMod: 0, postureRecoveryMod: 0, scramble: true },
    respire: { confidence: 0, energyRecoveryMod: 0.25, postureRecoveryMod: 0 },
    observe: { confidence: 0, energyRecoveryMod: 0, postureRecoveryMod: 0, scout: true },
    acalme: { confidence: 0.25, energyRecoveryMod: 0, postureRecoveryMod: 0, confidenceRecoveryMod: 0.25 },
  };

  // Mesmo leque de opcoes pode ser usado como ajuste de emergencia dentro do
  // round (6.11), no maximo uma vez por round, com efeito reduzido pela metade.
  const EMERGENCY_SCALE = 0.5;

  // 6.7 Tecnicas ficticias — ate 4 equipadas por luta. Cada uma aplica um
  // buff temporario (em beats) quando dispara sozinha; usar uma tecnica
  // diferente pouco depois da anterior conta como combo (ver COMBO abaixo).
  const TECHNIQUES = {
    passo_terreno: { name: 'Passo do Terreiro', cooldownBeats: 24, buff: 'actionBonus', value: 6, durationBeats: 6 },
    asa_fantasma: { name: 'Asa Fantasma', cooldownBeats: 20, buff: 'guardBonus', value: 0.25, durationBeats: 6 },
    rei_poleiro: { name: 'Rei do Poleiro', cooldownBeats: 30, buff: 'confidenceOnTrigger', value: 8, durationBeats: 0 },
    olhar_milho: { name: 'Olhar de Milho', cooldownBeats: 26, buff: 'actionBonus', value: 5, durationBeats: 8 },
    coco_combo: { name: 'Có-Có Combo', cooldownBeats: 28, buff: 'impactBonus', value: 0.3, durationBeats: 3 },
    bicada_filosofica: { name: 'Bicada Filosófica', cooldownBeats: 22, buff: 'opponentActionPenalty', value: 6, durationBeats: 5 },
  };
  // Chance de disparo por beat (por atributo de Tecnica) e janela de combo:
  // duas tecnicas diferentes do mesmo lado dentro de COMBO.windowBeats dao
  // bonus extra de impacto/momentum na segunda.
  const TECHNIQUE_TRIGGER = { base: 0.05, tecnicaScale: 0.0015 };
  const COMBO = { windowBeats: 6, impactMultiplier: 1.4, momentumBonus: 10 };

  // Bolsa da luta (Secao 14.4): valor apostado antes da luta, perdido em
  // derrota, devolvido em empate e multiplicado em vitoria. "amistosa" existe
  // pra treinar sem risco. Fecha o loop economico que faltava: ate aqui,
  // vencer uma luta nao rendia nenhum dinheiro.
  const BOLSA = {
    tiers: {
      amistosa: { stake: 0, multiplier: 1 },
      baixa: { stake: 1500, multiplier: 1.8 },
      media: { stake: 4000, multiplier: 2.0 },
      alta: { stake: 10000, multiplier: 2.4 },
    },
  };

  // Lesao/condicao pos-derrota (Secao 6.13/14.7): a 6.10 ja definia dias de
  // recuperacao por carga (leve/moderada/alta) mas nunca teve consequencia
  // mecanica real. Aplicada so em derrota (nome da secao), nunca remove o
  // animal nem causa nada permanente — so bloqueia lutar e reduz atributos
  // temporariamente ate os dias passarem (incentiva elenco rotativo, Secao 6.10).
  const INJURY = {
    tiers: {
      leve: { days: 2, attributeMod: -0.06 },
      moderada: { days: 4, attributeMod: -0.14 },
      alta: { days: 6, attributeMod: -0.25 },
    },
    // Mapeia o metodo de derrota (Secao 6.11) pra severidade da lesao.
    methodTier: { decisao: 'leve', tempo: 'leve', interrupcao_confianca: 'moderada', interrupcao_vida: 'alta' },
  };

  // Ladder/reputacao (Secao 14.10): rivais e bolsa liberada escalam com o
  // cartel do galo, em vez de todo adversario ser sorteado do mesmo jeito
  // desde a primeira luta ate a centesima. Usa wins ja existentes em
  // rooster.record, sem precisar de contador novo.
  const REPUTATION = {
    tiers: [
      { minWins: 0, label: 'novato', rivalBase: [28, 42], maxStake: 'baixa' },
      { minWins: 3, label: 'respeitado', rivalBase: [38, 55], maxStake: 'media' },
      { minWins: 8, label: 'temido', rivalBase: [50, 68], maxStake: 'alta' },
      { minWins: 16, label: 'lendario', rivalBase: [60, 80], maxStake: 'alta' },
    ],
  };
  const STAKE_ORDER = ['amistosa', 'baixa', 'media', 'alta'];

  // Estilos de luta (Secao 6.13/14.5 - roadmap antigo): identidade
  // PERMANENTE do galo, diferente da Postura (escolha tatica do round).
  // Derivado sempre da mesma forma a partir de atributos/perks (Secao 13 -
  // determinismo, nunca persistido, nunca depende de sorte na hora de olhar).
  const STYLES = {
    rasteiro: { effect: { impactMod: 0.08 } }, // forca/ofensiva
    voador: { effect: { actionChanceBonus: 5 } }, // velocidade/reflexo
    estrategista: { effect: { varianceMod: -0.04 } }, // inteligencia, mais consistente
    showman: { effect: { bolsaBonus: 0.15, confidenceOnMomentumLead: 3 } }, // so quem tem o perk showman
  };
  const STYLE_CATEGORIES = {
    rasteiro: ['forca', 'resistencia'],
    voador: ['velocidade', 'reflexo'],
    estrategista: ['tecnica', 'disciplina', 'inteligencia'],
  };

  // Arvore de habilidades (Secao 6.13/14.5 - roadmap antigo, escopo reduzido
  // de proposito pra caber na Secao 12.1: nao empilhar sistema demais cedo).
  // XP de combate e' distinto de dinheiro; ganho em treino e em lutas.
  // 3 ramos pequenos, sequenciais dentro do ramo (T1 antes de T2, etc.):
  // Tecnica (reduz cooldown das tecnicas equipadas), Carater (amplifica os
  // perks que o galo ja tem, em vez de criar perk novo do nada) e Postura
  // (reforca a postura escolhida no round, generico, nao trava numa so).
  const SKILL_XP = { perTraining: 4, perFightWin: 10, perFightDraw: 6, perFightLose: 4 };
  const SKILLS = {
    tecnica1: { cost: 1, branch: 'tecnica', requires: null, effect: { cooldownMod: -0.1 } },
    tecnica2: { cost: 2, branch: 'tecnica', requires: 'tecnica1', effect: { cooldownMod: -0.2 } },
    tecnica3: { cost: 3, branch: 'tecnica', requires: 'tecnica2', effect: { cooldownMod: -0.3, triggerBonus: 0.01 } },
    carater1: { cost: 1, branch: 'carater', requires: null, effect: { perkAmplify: 0.15 } },
    carater2: { cost: 2, branch: 'carater', requires: 'carater1', effect: { perkAmplify: 0.3 } },
    carater3: { cost: 3, branch: 'carater', requires: 'carater2', effect: { perkAmplify: 0.5 } },
    postura1: { cost: 1, branch: 'postura', requires: null, effect: { actionBonus: 3 } },
    postura2: { cost: 2, branch: 'postura', requires: 'postura1', effect: { actionBonus: 6 } },
    postura3: { cost: 3, branch: 'postura', requires: 'postura2', effect: { actionBonus: 6, guardBonus: 0.08 } },
  };

  // 6.8 Perfis de IA rival
  const RIVAL_PROFILES = {
    agressivo: { postureBias: { ofensiva: 0.5, contra: 0.15, tecnica: 0.15, defensiva: 0.1, conservadora: 0.05, adaptativa: 0.05 } },
    tecnico: { postureBias: { tecnica: 0.45, contra: 0.2, ofensiva: 0.15, defensiva: 0.1, conservadora: 0.05, adaptativa: 0.05 } },
    paciente: { postureBias: { conservadora: 0.35, defensiva: 0.25, contra: 0.2, tecnica: 0.1, ofensiva: 0.05, adaptativa: 0.05 } },
    oportunista: { postureBias: { contra: 0.4, tecnica: 0.2, ofensiva: 0.15, defensiva: 0.15, conservadora: 0.05, adaptativa: 0.05 } },
    conservador: { postureBias: { conservadora: 0.45, defensiva: 0.3, tecnica: 0.1, contra: 0.1, ofensiva: 0.03, adaptativa: 0.02 } },
    adaptativo: { postureBias: { adaptativa: 0.5, tecnica: 0.2, contra: 0.15, ofensiva: 0.1, defensiva: 0.03, conservadora: 0.02 }, learns: true },
    imprevisivel: { postureBias: null }, // sorteia postura a cada round, sem viés fixo
  };

  // 5.7 Perks — 0 a 3 comuns + chance de raro por ave. Efeitos pequenos e
  // legiveis; alguns sao so manifestacao visual/comportamental (flavor:true),
  // como a propria Biblia pede ("perks devem ter manifestacao visual").
  const PERKS = {
    valente: { rare: false, effect: { postureFloorBonus: 8 } }, // resiste mais antes de ser interrompido
    inteligente: { rare: false, effect: { actionChanceBonus: 4 } },
    atleta: { rare: false, effect: { energyCostMod: -0.1 } },
    pe_de_mola: { rare: false, effect: { guardBonus: 0.1 } },
    osso_duro: { rare: false, effect: { impactTakenMod: -0.12 } },
    centrado: { rare: false, effect: { varianceMod: -0.03 } },
    showman: { rare: true, effect: { confidenceOnMomentumLead: 5 }, flavor: true },
    herdeiro: { rare: true, effect: { perkInheritChanceBonus: 0.15 }, flavor: true }, // usado na genetica (0.3.0), so registrado aqui
    preguicoso: { rare: false, effect: { actionChanceBonus: -6, energyCostMod: -0.15 } },
    esquentadinho: { rare: false, effect: { impactMod: 0.12, varianceMod: 0.05 } },
    medroso: { rare: false, effect: { confidenceRecoveryMod: -0.2 } },
    mimado: { rare: false, effect: { obedienceMod: -6 }, flavor: true },
    cabeca_dura: { rare: false, effect: { confidenceFloorBonus: 8 } },
    dorminhoco: { rare: false, effect: {}, flavor: true }, // afeta sono/rotina, nao combate
    celebridade: { rare: true, effect: { bolsaBonus: 0.2 }, flavor: true }, // bonus de bolsa (Secao 14.4)
    fiscal_de_milho: { rare: false, effect: {}, flavor: true }, // comedia de quintal, sem efeito de luta
    dono_do_terreiro: { rare: false, effect: { homeTurfActionChanceBonus: 5 } },
    dramatico: { rare: true, effect: {}, flavor: true }, // reacoes maiores na tela, sem efeito numerico
  };

  // RESERVADO - Biblia Secao 14.11 (ideia, nao implementado). Poderes magicos
  // elementais (fogo/agua/terra/ar), restritos a uma sub-raca cara de galo de
  // combate com potencial 4+ estrelas. Nenhum sistema le este objeto ainda -
  // e so um lembrete de nomenclatura/formato para quando isso for retomado
  // (depois do prototipo de DNA visual/genetica). Nao gerar galos com isso,
  // nao calcular dano com isso, nao desbloquear ramos de habilidade com isso.
  const MAGIC_ELEMENTS = {
    enabled: false,
    types: ['fogo', 'agua', 'terra', 'ar'],
    // pedra-papel-tesoura a definir; exemplo de formato (nao balanceado):
    strongAgainst: { fogo: 'ar', ar: 'terra', terra: 'agua', agua: 'fogo' },
    minPotentialStars: 4,
    baseChance: 0.25, // chance do 1o elemento; cada elemento a mais corta pela metade
    subRaceRequired: true, // so a sub-raca cara de combate pode manifestar isso
  };

  // Fases de vida (dias desde o nascimento): pintinho nao luta; a arte muda por fase.
  const LIFE = { chickDays: 4, youngDays: 10 };

  const CombatConfig = { LIFE, ROUND, RECOVERY_CURVE, ACTION_CHANCE, IMPACT, OBEDIENCE, VARIANCE_MAX, POSTURES, INTERVAL_OPTIONS, EMERGENCY_SCALE, TECHNIQUES, TECHNIQUE_TRIGGER, COMBO, RIVAL_PROFILES, PERKS, BOLSA, INJURY, REPUTATION, STAKE_ORDER, STYLES, STYLE_CATEGORIES, SKILL_XP, SKILLS, MAGIC_ELEMENTS };
  root.CombatConfig = CombatConfig;
  if (node) module.exports = CombatConfig;
})(typeof window === 'undefined' ? globalThis : window);
