(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';
  const C = node ? require('./construction-config.js') : root.ConstructionConfig;
  const Breeding = node ? require('./breeding.js') : root.Breeding;

  // Construcao (Secao 11/14.2): Janilson transforma o terreno baldio do
  // bairro (interacao 'emptyLot' ja existente) num anexo com um segundo
  // curral de reproducao. Uma obra por vez, custa dinheiro e leva dias reais
  // de jogo — nunca e instantanea (Secao 5 "Janilson e competente, lento pra
  // comecar").

  function initialize(s) {
    s.construction ??= { annex: { unlocked: false, project: null } };
    return s;
  }

  function available(s) {
    return !s.story?.firstDay?.enabled || s.story.firstDay.phase === 'complete';
  }

  function canStart(s) {
    const a = s.construction.annex;
    return available(s) && !a.unlocked && !a.project && s.money >= C.ANNEX.cost;
  }

  function start(s, day) {
    if (!canStart(s)) throw Error('Obra nao pode comecar agora');
    s.money -= C.ANNEX.cost;
    s.construction.annex.project = { startDay: day, endDay: day + C.ANNEX.days };
  }

  function isReady(s, day) {
    const project = s.construction.annex.project;
    return !!(project && day >= project.endDay);
  }

  function complete(s) {
    const a = s.construction.annex;
    if (!a.project) throw Error('Nenhuma obra em andamento');
    a.unlocked = true;
    a.project = null;
    Breeding.addPen(s, 'pen2');
  }

  function validate(s) {
    if (!s.construction || typeof s.construction !== 'object') return false;
    const a = s.construction.annex;
    if (!a || typeof a.unlocked !== 'boolean') return false;
    if (a.project !== null) {
      if (typeof a.project !== 'object') return false;
      if (!Number.isSafeInteger(a.project.startDay) || !Number.isSafeInteger(a.project.endDay)) return false;
      if (a.project.endDay < a.project.startDay) return false;
    }
    return true;
  }

  const Construction = { initialize, available, canStart, start, isReady, complete, validate };
  root.Construction = Construction;
  if (node) module.exports = Construction;
})(typeof window === 'undefined' ? globalThis : window);
