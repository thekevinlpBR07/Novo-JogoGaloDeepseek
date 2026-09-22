// Narrador Kazao (Biblia 4.2): comenta a luta com falas proprias. Modulo puro e deterministico: a fala
// depende so da semente da luta e do numero do lance, nunca do Math.random, entao nao mexe na simulacao
// nem no save. Os textos ficam em narrator-locales.js (LOCALES[lang].narrator).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  function hash(a, b) {
    let x = (Math.imul((a >>> 0) ^ 0x9e3779b9, 2654435761) + Math.imul((b >>> 0) + 1, 2246822519)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    return x >>> 0;
  }

  // Escolhe uma fala do banco sem repetir a anterior (prev = indice usado no lance anterior do mesmo banco).
  function pick(bank, seed, n, prev = -1) {
    if (!Array.isArray(bank) || !bank.length) return { text: '', index: -1 };
    let i = hash(seed, n) % bank.length;
    if (bank.length > 1 && i === prev) i = (i + 1) % bank.length;
    return { text: bank[i], index: i };
  }

  const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

  // Tipo de fala de um lance da luta (evento de beatLog do combat.js).
  function kindForEvent(event) {
    if (!event) return 'open';
    if (event.type === 'miss') return 'miss';
    if (event.type !== 'hit') return 'open';
    if (event.side === 'player') return event.technique ? 'tech' : 'hitPlayer';
    return 'hitRival';
  }

  function kindForInterval(last) {
    const m = last?.avgMomentum || 0;
    return m > 6 ? 'intervalUp' : m < -6 ? 'intervalDown' : 'intervalEven';
  }

  const kindForResult = result => (result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');

  // line(banks, kind, seed, n, vars): banks = LOCALES[lang].narrator.banks. Retorna o texto ja preenchido.
  function line(banks, kind, seed, n, vars) {
    const { text } = pick(banks?.[kind], seed, n);
    return text ? fill(text, vars) : '';
  }

  const Narrator = { hash, pick, fill, kindForEvent, kindForInterval, kindForResult, line };
  root.Narrator = Narrator;
  if (node) module.exports = Narrator;
})(typeof window === 'undefined' ? globalThis : window);
