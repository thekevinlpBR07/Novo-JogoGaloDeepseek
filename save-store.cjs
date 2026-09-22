const fs = require('node:fs');
const path = require('node:path');
const State = require('./public/state.js');

const keyAllowed = key =>
  key === 'quintal.language' ||
  key === 'quintal.save.v1' ||
  /^quintal\.slot\.[123]$/.test(key);

function allowed(key, value) {
  if (!keyAllowed(key) || typeof value !== 'string' || value.length > State.MAX_BYTES) return false;
  if (key === 'quintal.language') return ['pt-BR', 'en'].includes(value);
  if (value === 'null') return true;
  try {
    State.decode(value);
    return true;
  } catch {
    return false;
  }
}

function createStore(directory) {
  const file = path.join(directory, 'progress.json');
  let entries = {};
  let readFailure = null;

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw Error('Invalid store');
    // Retain unknown/corrupt slots verbatim so saving another slot never erases them.
    for (const [key, value] of Object.entries(parsed)) {
      if (keyAllowed(key) && typeof value === 'string') entries[key] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') readFailure = error;
  }

  return {
    getItem(key) {
      if (!keyAllowed(key)) throw Error('Invalid key');
      if (readFailure) throw Error('Store unreadable; progress.json preserved');
      return entries[key] ?? null;
    },

    setItem(key, value) {
      if (readFailure) throw Error('Store unreadable; progress.json preserved');
      if (!allowed(key, value)) throw Error('Invalid save');

      const next = { ...entries, [key]: value };
      fs.mkdirSync(directory, { recursive: true });
      if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');

      // Escrita atomica: grava em .tmp e so troca o arquivo real no rename.
      fs.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(file + '.tmp', file);
      entries = next;
    },
  };
}

module.exports = { createStore, allowed };
