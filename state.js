(function (root) {
  'use strict';

  const node = typeof module !== 'undefined';
  const Flags = node ? require('./events.js') : root.EventFlags;
  const Quests = node ? require('./quests.js') : root.QuestManager;
  if (node) require('./interior.js');
  const World = node ? require('./world.js') : root.WORLD;
  const Farm = node ? require('./farm.js') : root.Farm;
  const Time = node ? require('./time.js') : root.GameTime;
  const Map = node ? require('./yard-map.js') : root.YardMap;
  const FirstDay = node ? require('./first-day.js') : root.FirstDay;
  const RouteMap = node ? require('./route-map.js') : root.RouteMap;
  const Combat = node ? require('./combat.js') : root.Combat;
  const CombatConfig = node ? require('./combat-config.js') : root.CombatConfig;
  const Genetics = node ? require('./genetics.js') : root.Genetics;
  const Breeding = node ? require('./breeding.js') : root.Breeding;
  const Training = node ? require('./training.js') : root.Training;
  const Construction = node ? require('./construction.js') : root.Construction;
  const VisualDna = node ? require('./visual-dna.js') : root.VisualDna;

  const VERSION = 13;
  const MAX_BYTES = 2 * 1024 * 1024;

  const clone = value => JSON.parse(JSON.stringify(value));
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(v) && v >= min && v <= max;

  // Valida recursivamente que um valor e serializavel em JSON com limites
  // de tamanho/profundidade, e bloqueia chaves de poluicao de prototipo.
  function jsonSafe(v, depth = 0) {
    if (depth > 30) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') return v.length <= 10000;
    if (Array.isArray(v)) return v.length <= 10000 && v.every(x => jsonSafe(x, depth + 1));
    return (
      object(v) &&
      Object.keys(v).length <= 10000 &&
      Object.entries(v).every(
        ([k, x]) => !['__proto__', 'prototype', 'constructor'].includes(k) && jsonSafe(x, depth + 1)
      )
    );
  }

  // Valida um dicionario cujas chaves sao IDs seguros e cujos valores passam em `test`.
  const map = (v, test) => object(v) && Object.entries(v).every(([k, x]) => Flags.safeId(k) && test(x));

  const period = minutes => (minutes < 360 ? 'night' : minutes < 720 ? 'morning' : minutes < 1080 ? 'afternoon' : 'night');

  // Seed estavel a partir do id: mesmo id sempre nasce com o mesmo potencial
  // de origem, sem depender de Math.random (determinismo, Secao 13).
  function idSeed(id) {
    let h = 7;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }

  function createRooster(id, name = '') {
    if (!Flags.safeId(id) || typeof name !== 'string' || name.length > 100) throw Error('Invalid rooster');
    const rng = Genetics.makeRng(idSeed(id));
    return {
      id,
      name,
      // Nomes conforme a Biblia Secao 5.5 (atributo -> efeito em combate).
      attributes: { forca: 35, velocidade: 35, resistencia: 35, reflexo: 35, tecnica: 35, disciplina: 35, inteligencia: 35 },
      traits: [],
      genetics: { parents: [], genes: {}, generation: 0, potential: Genetics.randomPotential(rng), genotype: Genetics.randomGenotype(rng) },
      status: { health: 100, energy: 100, condition: 'idle', recoverDay: null, injuryMod: 0 },
      training: { experience: 0, levels: {}, history: [] },
      skillPoints: 0,
      skills: {},
      visualDna: VisualDna.randomVisualDna(rng),
    };
  }

  function roosterValid(r) {
    return (
      object(r) &&
      Flags.safeId(r.id) &&
      typeof r.name === 'string' &&
      r.name.length <= 100 &&
      map(r.attributes, n => Number.isFinite(n) && n >= 0) &&
      Array.isArray(r.traits) &&
      r.traits.every(Flags.safeId) &&
      object(r.genetics) &&
      Array.isArray(r.genetics.parents) &&
      r.genetics.parents.length <= 2 &&
      r.genetics.parents.every(Flags.safeId) &&
      object(r.genetics.genes) &&
      integer(r.genetics.generation) &&
      object(r.genetics.potential) &&
      map(r.genetics.potential, n => integer(n, 0, 100)) &&
      (r.genetics.genotype === undefined || (object(r.genetics.genotype) && Object.values(r.genetics.genotype).every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(a => typeof a === 'string' && a.length <= 30)))) &&
      object(r.status) &&
      integer(r.status.health, 0, 100) &&
      integer(r.status.energy, 0, 100) &&
      Flags.safeId(r.status.condition) &&
      (r.status.recoverDay === null || integer(r.status.recoverDay, 1)) &&
      typeof r.status.injuryMod === 'number' &&
      r.status.injuryMod <= 0 &&
      r.status.injuryMod >= -1 &&
      integer(r.skillPoints, 0) &&
      object(r.skills) &&
      Object.keys(r.skills).every(id => CombatConfig.SKILLS[id] && r.skills[id] === true) &&
      VisualDna.valid(r.visualDna) &&
      (r.bornDay === undefined || integer(r.bornDay, 1)) &&
      object(r.training) &&
      integer(r.training.experience) &&
      map(r.training.levels, n => integer(n)) &&
      Array.isArray(r.training.history)
    );
  }

  function create() {
    const s = {
      schemaVersion: VERSION,
      build: '0.3.7',
      money: 1250,
      energy: 100,
      hunger: 0,
      player: { ...World.spawn },
      inventory: { items: {} },
      clock: { day: 1, minutes: 480, period: 'morning' },
      story: { chapter: 0, stage: 'arrival' },
      events: { flags: {}, records: {} },
      world: { room: 'yard', objects: {} },
      npcs: { friend: { id: 'friend', met: false } },
      agriculture: { plots: {} },
      chickens: { byId: { hen1: { id: 'hen1' }, hen2: { id: 'hen2' }, hen3: { id: 'hen3' } } },
      roosters: { byId: {} },
      trainings: { active: null, history: [] },
      relationships: {},
      unlocks: {},
      quests: {},
    };
    Farm.initialize(s);
    Time.initialize(s);
    Map.initialize(s);
    FirstDay.initialize(s);
    Combat.initialize(s);
    Breeding.initialize(s);
    Construction.initialize(s);
    new Quests(s);
    return s;
  }

  function validate(s) {
    if (!object(s) || !jsonSafe(s) || s.schemaVersion !== VERSION || typeof s.build !== 'string') return false;

    if (!integer(s.money) || !integer(s.energy, 0, 100) || !integer(s.hunger, 0, 100) || !object(s.player)) return false;

    if (
      !object(s.clock) ||
      !integer(s.clock.day, 1) ||
      !integer(s.clock.minutes, 0, 1439) ||
      s.clock.period !== period(s.clock.minutes)
    )
      return false;

    const roomReachable = RouteMap.specs[s.world.room]
      ? !RouteMap.blocked(s.world.room, s.player.x, s.player.y)
      : World.valid({ version: 1, room: s.world.room, x: s.player.x, y: s.player.y, visited: [] }, s.world.map);

    if (
      !object(s.world) ||
      !['yard', 'home', 'street', 'depot'].includes(s.world.room) ||
      !object(s.world.objects) ||
      !Map.validate(s.world.map) ||
      !roomReachable
    )
      return false;

    if (!object(s.inventory) || !map(s.inventory.items, n => integer(n))) return false;

    if (!object(s.story) || !integer(s.story.chapter) || typeof s.story.stage !== 'string') return false;

    if (
      !object(s.events) ||
      !map(s.events.flags, b => typeof b === 'boolean') ||
      !map(
        s.events.records,
        e =>
          object(e) &&
          Flags.safeId(e.type) &&
          (e.target === null || Flags.safeId(e.target)) &&
          integer(e.amount, 1) &&
          integer(e.day, 1) &&
          integer(e.minutes, 0, 1439)
      )
    )
      return false;

    if (
      !object(s.npcs) ||
      !object(s.npcs.friend) ||
      s.npcs.friend.id !== 'friend' ||
      typeof s.npcs.friend.met !== 'boolean' ||
      !object(s.agriculture) ||
      !object(s.agriculture.plots) ||
      !object(s.chickens) ||
      !object(s.chickens.byId)
    )
      return false;

    if (
      !object(s.roosters) ||
      !map(s.roosters.byId, roosterValid) ||
      !Object.entries(s.roosters.byId).every(([id, r]) => id === r.id)
    )
      return false;

    if (
      !object(s.chickens.breeding) ||
      !map(s.chickens.breeding.byId, roosterValid) ||
      !Object.entries(s.chickens.breeding.byId).every(([id, r]) => id === r.id)
    )
      return false;

    if (
      !object(s.trainings) ||
      !(s.trainings.active === null || object(s.trainings.active)) ||
      !Array.isArray(s.trainings.history) ||
      !object(s.relationships) ||
      !map(s.unlocks, b => typeof b === 'boolean')
    )
      return false;

    if (
      !map(
        s.quests,
        q =>
          object(q) &&
          ['locked', 'active', 'completed', 'failed'].includes(q.status) &&
          typeof q.rewardGranted === 'boolean' &&
          (!q.rewardGranted || q.status === 'completed') &&
          map(
            q.steps,
            t => object(t) && typeof t.complete === 'boolean' && Array.isArray(t.progress) && t.progress.every(n => integer(n))
          )
      )
    )
      return false;

    return Farm.validate(s) && Time.validate(s) && FirstDay.validate(s) && Combat.validate(s) && Breeding.validate(s) && Training.validate(s) && Construction.validate(s);
  }

  function migrateLegacy(old) {
    const n = World.normalize(old);
    if (!n || !World.valid(n)) throw Error('Invalid legacy save');

    const s = create();
    s.player = { x: n.x, y: n.y };
    s.world.room = n.room || 'yard';

    const flags = { friend: 'talkedToFriend', coop: 'inspectedCoop', garden: 'visitedGarden' };
    for (const id of n.visited) Flags.set(s, flags[id]);
    s.npcs.friend.met = n.visited.includes('friend');

    new Quests(s);
    return s;
  }

  // Add one migration per schema revision; build numbers do not define the schema.
  const migrations = {
    1: migrateLegacy,
    2: s => {
      s.schemaVersion = 3;
      Farm.initialize(s);
      return s;
    },
    3: s => {
      s.schemaVersion = 4;
      Time.initialize(s);
      return s;
    },
    4: s => {
      s.schemaVersion = 5;
      s.build = '0.2.4';
      Map.initialize(s);
      return s;
    },
    5: s => {
      s.schemaVersion = 6;
      s.build = '0.2.5';
      Farm.initialize(s);
      // Se o jogador ficou preso pela nova geometria do mapa, realoca no spawn.
      if (
        s.world.room === 'yard' &&
        Number.isFinite(s.player.x) &&
        Number.isFinite(s.player.y) &&
        World.blocked(s.player.x, s.player.y, s)
      )
        s.player = { ...World.spawn };
      return s;
    },
    6: s => {
      s.schemaVersion = 7;
      s.build = '0.2.6';
      FirstDay.initialize(s, false);
      return s;
    },
    7: s => {
      s.schemaVersion = 8;
      s.build = '0.2.10';
      Combat.initialize(s);
      return s;
    },
    8: s => {
      s.schemaVersion = 9;
      s.build = '0.3.0';
      Breeding.initialize(s);
      // Galos salvos antes da genetica existir ganham um potencial de origem
      // com folga acima do atual, pra ainda poderem evoluir com treino.
      for (const r of Object.values(s.roosters.byId)) {
        if (!r.genetics.potential) {
          const rng = Genetics.makeRng(idSeed(r.id));
          r.genetics.potential = Object.fromEntries(Object.entries(r.attributes).map(([k, v]) => [k, Math.min(100, v + 20)]));
          r.genetics.genotype = Genetics.randomGenotype(rng);
        }
      }
      return s;
    },
    9: s => {
      s.schemaVersion = 10;
      s.build = '0.3.2';
      // 0.3.0/0.3.1 salvavam um curral unico em breeding.pen; agora currais
      // vivem em breeding.pens.byId (Secao 14.2 - segundo curral via anexo).
      if (s.breeding.pen && !s.breeding.pens) {
        const oldPen = s.breeding.pen;
        delete s.breeding.pen;
        s.breeding.pens = { byId: { pen1: oldPen } };
        for (const egg of Object.values(s.breeding.eggs.byId)) egg.penId ??= 'pen1';
      }
      Breeding.initialize(s);
      Construction.initialize(s);
      return s;
    },
    10: s => {
      s.schemaVersion = 11;
      s.build = '0.3.5';
      // Lesao/condicao pos-derrota (Secao 14.7): aves salvas antes disso
      // nunca estiveram machucadas, entao chegam saudaveis (recoverDay null).
      for (const bucket of [s.roosters.byId, s.chickens.breeding.byId]) {
        for (const r of Object.values(bucket)) {
          r.status.recoverDay ??= null;
          if (typeof r.status.injuryMod !== 'number') r.status.injuryMod = 0;
        }
      }
      return s;
    },
    11: s => {
      s.schemaVersion = 12;
      s.build = '0.3.6';
      // Arvore de habilidades (Secao 14.10): aves salvas antes disso comecam
      // sem pontos e sem nada desbloqueado, nunca retroativo.
      for (const bucket of [s.roosters.byId, s.chickens.breeding.byId]) {
        for (const r of Object.values(bucket)) {
          if (!Number.isSafeInteger(r.skillPoints)) r.skillPoints = 0;
          if (typeof r.skills !== 'object' || !r.skills) r.skills = {};
        }
      }
      return s;
    },
    12: s => {
      s.schemaVersion = 13;
      s.build = '0.3.7';
      // DNA visual (aparencia geneticamente gerada, roadmap pos-14.10): aves
      // salvas antes disso ganham um DNA determinado pelo proprio id (nunca
      // aleatorio de verdade, pra nao mudar de aparencia a cada load).
      for (const bucket of [s.roosters.byId, s.chickens.breeding.byId]) {
        for (const r of Object.values(bucket)) {
          if (VisualDna.valid(r.visualDna)) continue;
          let h = 7;
          for (const ch of r.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          const rng = Genetics.makeRng(h);
          r.visualDna = VisualDna.randomVisualDna(rng);
        }
      }
      return s;
    },
  };

  function decode(raw) {
    if (typeof raw === 'string') {
      if (raw.length > MAX_BYTES) throw Error('Save too large');
      raw = JSON.parse(raw);
    }
    if (!object(raw) || !jsonSafe(raw)) throw Error('Invalid save');

    let version = raw.schemaVersion ?? raw.version;
    if (!integer(version, 1) || version > VERSION) throw Error('Unsupported save version');

    let state = clone(raw.state ?? raw);
    if (raw.state && raw.schemaVersion !== state.schemaVersion) throw Error('Schema mismatch');

    while (version < VERSION) {
      if (!migrations[version]) throw Error('Missing migration');
      state = migrations[version](state);
      version = state.schemaVersion;
    }

    if (!validate(state)) throw Error('Invalid game state');
    // Reconstruir as quests pode preencher campos derivados; valida de novo depois.
    new Quests(state);
    if (!validate(state)) throw Error('Invalid reconciled state');

    return {
      schemaVersion: VERSION,
      build: '0.3.7',
      savedAt: typeof raw.savedAt === 'string' && Number.isFinite(Date.parse(raw.savedAt)) ? raw.savedAt : null,
      state,
    };
  }

  function encode(state) {
    if (!validate(state)) throw Error('Invalid game state');
    const value = JSON.stringify({ schemaVersion: VERSION, build: '0.3.7', savedAt: new Date().toISOString(), state });
    if (value.length > MAX_BYTES) throw Error('Save too large');
    return value;
  }

  function setTime(state, day, minutes) {
    if (!integer(day, 1) || !integer(minutes, 0, 1439)) throw Error('Invalid clock');
    if (day < state.clock.day) throw Error('Clock cannot go backwards');
    while (state.clock.day < day) Farm.sleep(state);
    state.clock = { ...state.clock, day, minutes, period: period(minutes) };
  }

  function newGame() {
    const s = create();
    FirstDay.initialize(s, true);
    new Quests(s);
    return s;
  }

  const GameState = { newGame, VERSION, MAX_BYTES, create, createRooster, validate, decode, encode, clone, setTime };
  root.GameState = GameState;
  if (node) module.exports = GameState;
})(typeof window === 'undefined' ? globalThis : window);
