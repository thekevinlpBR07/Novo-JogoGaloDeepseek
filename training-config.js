(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  // Secao 5.8: treino aproxima o atual do potencial genetico, nunca ultrapassa,
  // com retornos decrescentes e fadiga. Numeros centralizados aqui (Secao 10).

  const MAX_SESSIONS_PER_DAY = 3;
  // Retorno decrescente por sessao no mesmo dia (1a sessao rende 100%, a 3a so 35%).
  const SESSION_MULTIPLIER = [1, 0.6, 0.35];
  const BASE_RATE = 0.08; // fracao do gap (potencial-atual) fechada numa sessao perfeita
  const FATIGUE_PER_SESSION = 15;
  const FATIGUE_GAIN_PENALTY = 150; // gain *= 1 - fadiga/FATIGUE_GAIN_PENALTY (piso 0.3 abaixo)
  const MIN_GAIN_FACTOR = 0.3;
  const REPS_PER_SESSION = 5; // toques no minigame de timing por sessao

  // Minigame generico de timing, tematizado por atributo (Secao 5.8 lista
  // metaforas ficcionais especificas; forca/inteligencia nao tinham uma na
  // bibia, entao ganharam uma tematica propria e consistente).
  const MINIGAMES = {
    forca: { flavor: 'saco_racao' },
    velocidade: { flavor: 'carrinho_milho' },
    resistencia: { flavor: 'circuito' },
    reflexo: { flavor: 'espuma' },
    tecnica: { flavor: 'sequencia' },
    disciplina: { flavor: 'sinais' },
    inteligencia: { flavor: 'padroes' },
  };

  const TrainingConfig = { MAX_SESSIONS_PER_DAY, SESSION_MULTIPLIER, BASE_RATE, FATIGUE_PER_SESSION, FATIGUE_GAIN_PENALTY, MIN_GAIN_FACTOR, REPS_PER_SESSION, MINIGAMES };
  root.TrainingConfig = TrainingConfig;
  if (node) module.exports = TrainingConfig;
})(typeof window === 'undefined' ? globalThis : window);
