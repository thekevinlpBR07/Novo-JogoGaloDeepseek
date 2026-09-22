(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const C = node ? require('./training-config.js') : root.TrainingConfig;
  const GC = node ? require('./genetics-config.js') : root.GeneticsConfig;
  const CC = node ? require('./combat-config.js') : root.CombatConfig;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function initialize(rooster) {
    rooster.training ??= { experience: 0, levels: {}, history: [] };
    rooster.training.fatigue ??= 0;
    rooster.training.sessionsToday ??= 0;
    rooster.training.lastDay ??= 0;
    return rooster;
  }

  // Sessoes e fadiga sao por dia: uma noite de descanso zera as duas
  // (Secao 5.8 - retornos decrescentes valem dentro do MESMO dia).
  function rollDay(rooster, day) {
    initialize(rooster);
    if (rooster.training.lastDay !== day) {
      rooster.training.sessionsToday = 0;
      rooster.training.fatigue = 0;
      rooster.training.lastDay = day;
    }
  }

  // Pintinho (ha menos de LIFE.chickDays dias do nascimento) nao treina.
  function isChick(rooster, day) {
    return Number.isSafeInteger(rooster?.bornDay) && day - rooster.bornDay < CC.LIFE.chickDays;
  }

  function canTrain(rooster, day) {
    if (isChick(rooster, day)) return false;
    rollDay(rooster, day);
    return rooster.training.sessionsToday < C.MAX_SESSIONS_PER_DAY;
  }

  // performance: 0-1, vem do minigame de timing (media dos toques).
  // condition: 0-1, vem da saude/energia atual do animal.
  function applyTraining(rooster, attribute, performance, day) {
    if (!GC.ATTRIBUTES.includes(attribute)) throw Error('Invalid attribute');
    if (isChick(rooster, day)) throw Error('Pintinho nao pode treinar');
    rollDay(rooster, day);
    if (!canTrain(rooster, day)) throw Error('Sem sessoes de treino hoje');

    const potential = rooster.genetics.potential[attribute];
    const atual = rooster.attributes[attribute];
    const gap = Math.max(0, potential - atual);
    const sessionIndex = rooster.training.sessionsToday;
    const diminishing = C.SESSION_MULTIPLIER[Math.min(sessionIndex, C.SESSION_MULTIPLIER.length - 1)];
    const fatiguePenalty = clamp(1 - rooster.training.fatigue / C.FATIGUE_GAIN_PENALTY, C.MIN_GAIN_FACTOR, 1);
    const condition = clamp((rooster.status.health || 0) / 100, 0, 1);
    const perf = clamp(performance, 0, 1);

    const gain = Math.round(gap * C.BASE_RATE * diminishing * fatiguePenalty * condition * perf * 10) / 10;
    rooster.attributes[attribute] = clamp(Math.round((atual + gain) * 10) / 10, 0, potential);
    rooster.training.sessionsToday += 1;
    rooster.training.fatigue = clamp(rooster.training.fatigue + C.FATIGUE_PER_SESSION, 0, 100);
    rooster.training.experience += 1;
    rooster.training.history.push({ day, attribute, performance: Math.round(perf * 100), gain });
    if (rooster.training.history.length > 200) rooster.training.history.shift();
    rooster.skillPoints = (rooster.skillPoints || 0) + CC.SKILL_XP.perTraining;

    return { attribute, gain, atual: rooster.attributes[attribute], potential };
  }

  function validate(s) {
    for (const r of Object.values(s.roosters?.byId || {})) {
      const t = r.training;
      if (t.fatigue !== undefined && !(Number.isInteger(t.fatigue) && t.fatigue >= 0 && t.fatigue <= 100)) return false;
      if (t.sessionsToday !== undefined && !Number.isSafeInteger(t.sessionsToday)) return false;
      if (t.lastDay !== undefined && !Number.isSafeInteger(t.lastDay)) return false;
    }
    return true;
  }

  const Training = { initialize, rollDay, canTrain, isChick, applyTraining, validate };
  root.Training = Training;
  if (node) module.exports = Training;
})(typeof window === 'undefined' ? globalThis : window);
