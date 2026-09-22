// Tela de Plantel (Biblia 7.3/7.4): lista + ficha de qualquer ave do jogador.
// E o ponto de entrada real pra combate/treino/curral a partir da 0.3.1 —
// antes disso, so o galo da historia inicial era acessivel por IDs fixos.
let plantelSelectedId = null;
let plantelFilter = 'all';
let plantelSearch = '';
let plantelTab = 'resumo';

function plantelAllAnimals() {
  const list = [];
  for (const r of Object.values(state.roosters.byId)) list.push({ id: r.id, name: r.name, gender: 'macho' });
  for (const h of Object.values(state.chickens.breeding.byId)) list.push({ id: h.id, name: h.name, gender: 'femea' });
  return list;
}

function plantelFilteredAnimals() {
  const l = LOCALES[lang].plantel;
  return plantelAllAnimals().filter(a => {
    if (plantelFilter !== 'all' && a.gender !== plantelFilter) return false;
    if (plantelSearch && !(a.name || l.unnamed).toLowerCase().includes(plantelSearch.toLowerCase()) && !a.id.toLowerCase().includes(plantelSearch.toLowerCase())) return false;
    return true;
  });
}

function updatePlantelButton() {
  const btn = $('plantelButton');
  if (!btn) return;
  const has = plantelAllAnimals().length > 0;
  btn.hidden = !has;
  if (has) btn.textContent = LOCALES[lang].plantel.title;
}

function openPlantel() {
  if (plantelAllAnimals().length === 0) return;
  if (!plantelAllAnimals().some(a => a.id === plantelSelectedId)) plantelSelectedId = null;
  openYard('plantel');
}

function plantelAnimal(id) {
  return state.roosters.byId[id] || state.chickens.breeding.byId[id] || null;
}

function plantelBar(parent, label, value, max) {
  const row = document.createElement('div');
  row.className = 'fight-bar';
  const name = document.createElement('span');
  name.textContent = label;
  const meter = document.createElement('progress');
  meter.max = max;
  meter.value = value;
  meter.setAttribute('aria-label', label);
  row.append(name, meter);
  parent.append(row);
}

function plantelRename(id, name) {
  storyCommit(s => {
    const a = s.roosters.byId[id] || s.chickens.breeding.byId[id];
    if (a && typeof name === 'string' && name.trim().length <= 100) a.name = name.trim();
  });
  renderYard();
}

function plantelUnlockSkill(skillId) {
  const sl = LOCALES[lang].combat.skills;
  const id = plantelSelectedId;
  if (storyCommit(s => Combat.unlockSkill(s.roosters.byId[id] || s.chickens.breeding.byId[id], skillId))) {
    $('yardFeedback').textContent = sl.unlockDone.replace('{nome}', sl.name[skillId]);
  }
  renderYard();
}

function plantelSendToPen(id, gender) {
  const l = LOCALES[lang].plantel;
  const slot = gender === 'macho' ? 'rooster' : 'hen';
  const already = Object.values(state.breeding.pens.byId).some(p => p[slot === 'rooster' ? 'roosterId' : 'henId'] === id);
  if (already) {
    $('yardFeedback').textContent = l.penAssigned;
    return;
  }
  const penId = Breeding.findFreePen(state, slot);
  if (!penId) {
    $('yardFeedback').textContent = l.penFull;
    return;
  }
  if (storyCommit(s => Breeding.assign(s, penId, slot, id))) $('yardFeedback').textContent = l.penDone;
  renderYard();
}

function plantelSell(id, value) {
  const l = LOCALES[lang].plantel;
  const formatted = new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(value / 100);
  askAction(l.sellConfirm.replace('{valor}', formatted), () => {
    if (!storyCommit(s => Market.sell(s, id))) return;
    plantelSelectedId = null;
    $('yardFeedback').textContent = l.sellDone.replace('{valor}', formatted);
    renderYard();
  });
}

function plantelTryFight(id) {
  const l = LOCALES[lang].plantel;
  const animal = plantelAnimal(id);
  if (animal && Combat.isInjured(animal, state.clock.day)) {
    $('yardFeedback').textContent = l.cannotFightInjured.replace('{dias}', animal.status.recoverDay - state.clock.day);
    return;
  }
  if (animal && Combat.isChick(animal, state.clock.day)) {
    $('yardFeedback').textContent = l.cannotFightChick.replace('{dias}', animal.bornDay + CombatConfig.LIFE.chickDays - state.clock.day);
    return;
  }
  if (typeof canFight === 'function' && !canFight(id)) {
    $('yardFeedback').textContent = l.cannotFightYet;
    return;
  }
  if (typeof openFight === 'function') openFight(id);
}

function renderPlantelList(container) {
  const l = LOCALES[lang].plantel;
  const header = document.createElement('div');
  header.className = 'plantel-filters';
  for (const [id, text] of [
    ['all', l.filterAll],
    ['macho', l.filterMale],
    ['femea', l.filterFemale],
  ]) {
    const b = document.createElement('button');
    b.textContent = text;
    b.setAttribute('aria-pressed', String(plantelFilter === id));
    b.onclick = () => {
      plantelFilter = id;
      renderYard();
    };
    header.append(b);
  }
  container.append(header);

  const search = document.createElement('input');
  search.className = 'plantel-search';
  search.placeholder = l.search;
  search.value = plantelSearch;
  search.oninput = e => {
    plantelSearch = e.target.value;
    renderYard();
  };
  container.append(search);

  const list = document.createElement('div');
  list.className = 'plantel-list';
  const animals = plantelFilteredAnimals();
  if (!animals.length) {
    const p = document.createElement('p');
    p.textContent = l.empty;
    list.append(p);
  }
  for (const a of animals) {
    const card = document.createElement('button');
    card.className = 'plantel-card';
    card.setAttribute('aria-pressed', String(a.id === plantelSelectedId));
    const name = document.createElement('strong');
    name.textContent = a.name || l.unnamed;
    const gender = document.createElement('small');
    gender.textContent = l.gender[a.gender];
    card.append(name, gender);
    const full = plantelAnimal(a.id);
    if (a.gender === 'macho' && full?.record) {
      const cartel = document.createElement('small');
      cartel.textContent = Combat.cartelString(full.record);
      card.append(cartel);
    }
    card.onclick = () => {
      plantelSelectedId = a.id;
      plantelTab = 'resumo';
      renderYard();
    };
    list.append(card);
  }
  container.append(list);
}

function renderPlantelFicha(container) {
  const l = LOCALES[lang].plantel;
  if (!plantelSelectedId) {
    const p = document.createElement('p');
    p.className = 'plantel-hint';
    p.textContent = l.selectHint;
    container.append(p);
    return;
  }
  const a = plantelAnimal(plantelSelectedId);
  if (!a) {
    plantelSelectedId = null;
    return;
  }
  const gender = state.roosters.byId[plantelSelectedId] ? 'macho' : 'femea';

  const head = document.createElement('div');
  head.className = 'plantel-head';
  const portrait = document.createElement('canvas');
  portrait.width = 220;
  portrait.height = 150;
  portrait.className = 'rooster-portrait';
  const pc = portrait.getContext('2d');
  if (gender === 'macho' && typeof FightArt !== 'undefined') {
    const drawFicha = () => {
      pc.clearRect(0, 0, portrait.width, portrait.height);
      const sprite = FightArt.spriteFor(a, 'idle');
      const drewDna = typeof FightDna !== 'undefined' && FightDna.draw(pc, a, sprite, portrait.width / 2, portrait.height - 5, 140);
      if (!drewDna) FightArt.draw(pc, sprite, portrait.width / 2, portrait.height - 5, 140);
    };
    drawFicha();
    FightArt.whenReady(drawFicha);
  } else if (gender === 'macho') RouteArt.rooster(pc, 110, 120, 1.8);
  else if (typeof FightArt !== 'undefined') {
    const drawFicha = () => {
      pc.clearRect(0, 0, portrait.width, portrait.height);
      FightDna.drawOrArt(pc, a, FightArt.henSpriteFor(a), portrait.width / 2, portrait.height - 5, 140);
    };
    drawFicha();
    FightArt.whenReady(drawFicha);
  }
  head.append(portrait);

  const info = document.createElement('div');
  const nameRow = document.createElement('div');
  nameRow.className = 'plantel-name-row';
  const input = document.createElement('input');
  input.value = a.name || '';
  input.placeholder = l.unnamed;
  input.maxLength = 100;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = l.save;
  saveBtn.onclick = () => plantelRename(plantelSelectedId, input.value);
  nameRow.append(input, saveBtn);
  info.append(nameRow);

  const genderP = document.createElement('p');
  genderP.textContent = l.gender[gender];
  info.append(genderP);
  if (gender === 'macho') {
    const cartelP = document.createElement('p');
    cartelP.textContent = l.cartel + ': ' + Combat.cartelString(a.record);
    info.append(cartelP);
  }
  head.append(info);
  container.append(head);

  const tabs = document.createElement('nav');
  tabs.className = 'ui-tabs plantel-tabs';
  const tabIds = gender === 'macho' ? ['resumo', 'atributos', 'lutas', 'genetica', 'treino', 'habilidades'] : ['resumo', 'atributos', 'genetica'];
  for (const id of tabIds) {
    const b = document.createElement('button');
    b.textContent = l.tab[id];
    b.setAttribute('aria-pressed', String(plantelTab === id));
    b.onclick = () => {
      plantelTab = id;
      renderYard();
    };
    tabs.append(b);
  }
  container.append(tabs);
  if (!tabIds.includes(plantelTab)) plantelTab = 'resumo';

  const panel = document.createElement('div');
  panel.className = 'plantel-tab-panel';

  if (plantelTab === 'resumo') {
    const perksP = document.createElement('p');
    const perkNames = (a.traits || []).map(id => LOCALES[lang].combat.perk[id] || id);
    perksP.textContent = l.perks + ': ' + (perkNames.length ? perkNames.join(', ') : l.none);
    panel.append(perksP);
    if (gender === 'macho') {
      const styleP = document.createElement('p');
      styleP.textContent = LOCALES[lang].combat.style.title + ': ' + LOCALES[lang].combat.style[Combat.styleOf(a)];
      panel.append(styleP);
      const repP = document.createElement('p');
      repP.textContent = LOCALES[lang].combat.reputation.title + ': ' + LOCALES[lang].combat.reputation.tier[Combat.reputationTier(a).label];
      panel.append(repP);
      const mood = Combat.currentMood(a, state.clock.day);
      if (mood) {
        const moodP = document.createElement('p');
        moodP.className = 'fight-mood';
        moodP.textContent = LOCALES[lang].combat.mood[mood.result];
        panel.append(moodP);
      }
      if (Combat.isInjured(a, state.clock.day)) {
        const injuryP = document.createElement('p');
        injuryP.className = 'plantel-injury';
        injuryP.textContent = l.injured.replace('{dias}', a.status.recoverDay - state.clock.day);
        panel.append(injuryP);
      }
    }
  } else if (plantelTab === 'atributos') {
    for (const attr of GeneticsConfig.ATTRIBUTES) plantelBar(panel, LOCALES[lang].training.attribute[attr], a.attributes[attr], a.genetics.potential[attr]);
  } else if (plantelTab === 'lutas') {
    const history = a.record?.history || [];
    if (!history.length) {
      const p = document.createElement('p');
      p.textContent = l.noFights;
      panel.append(p);
    } else {
      for (const h of history.slice(-5).reverse()) {
        const p = document.createElement('p');
        p.textContent = 'Dia ' + h.day + ' · ' + l.fightResult[h.result] + ' · ' + (LOCALES[lang].combat.method[h.method] || h.method);
        panel.append(p);
      }
    }
  } else if (plantelTab === 'genetica') {
    const gen = document.createElement('p');
    gen.textContent = l.generation + ': ' + (a.genetics.generation || 0) + (Number.isSafeInteger(a.bornDay) ? '  ·  ' + l.bornHere : '');
    panel.append(gen);
    const parents = a.genetics.parents || [];
    const parentsP = document.createElement('p');
    if (!parents.length) parentsP.textContent = l.parents + ': ' + l.unknownParent;
    else parentsP.textContent = l.parents + ': ' + parents.map(pid => plantelAnimal(pid)?.name || pid).join(' × ');
    panel.append(parentsP);
    if (a.genetics.genes && Object.keys(a.genetics.genes).length) {
      const cosmeticP = document.createElement('p');
      cosmeticP.textContent = l.cosmetic + ': ' + Object.entries(a.genetics.genes).map(([trait, value]) => (l[trait] || trait) + ' ' + (l.cosmeticValue[value] || value)).join(', ');
      panel.append(cosmeticP);
    }
  } else if (plantelTab === 'treino') {
    const btn = document.createElement('button');
    btn.className = 'fight-start';
    btn.textContent = l.actionTrain;
    btn.onclick = () => openTraining(plantelSelectedId);
    panel.append(btn);
    if (Training.isChick(a, state.clock.day)) {
      btn.disabled = true;
      const chickP = document.createElement('p');
      chickP.className = 'plantel-hint';
      chickP.textContent = l.cannotTrainChick.replace('{dias}', a.bornDay + CombatConfig.LIFE.chickDays - state.clock.day);
      panel.append(chickP);
    }
  } else if (plantelTab === 'habilidades') {
    const sl = LOCALES[lang].combat.skills;
    const pointsP = document.createElement('p');
    pointsP.textContent = sl.points + ': ' + (a.skillPoints || 0);
    panel.append(pointsP);
    for (const branch of ['tecnica', 'carater', 'postura']) {
      const branchTitle = document.createElement('h4');
      branchTitle.textContent = sl.branch[branch];
      panel.append(branchTitle);
      const row = document.createElement('div');
      row.className = 'plantel-skill-row';
      for (const id of [branch + '1', branch + '2', branch + '3']) {
        const def = CombatConfig.SKILLS[id];
        const node = document.createElement('div');
        node.className = 'plantel-skill-node';
        const name = document.createElement('strong');
        name.textContent = sl.name[id];
        const desc = document.createElement('small');
        desc.textContent = sl.desc[id];
        node.append(name, desc);
        const unlocked = !!(a.skills && a.skills[id]);
        const btn = document.createElement('button');
        if (unlocked) {
          btn.textContent = sl.unlocked;
          btn.disabled = true;
        } else {
          btn.textContent = sl.unlock.replace('{custo}', def.cost);
          btn.disabled = !Combat.canUnlockSkill(a, id);
          btn.onclick = () => plantelUnlockSkill(id);
        }
        node.append(btn);
        row.append(node);
      }
      panel.append(row);
    }
  }
  container.append(panel);

  const actions = document.createElement('div');
  actions.className = 'plantel-actions';
  if (gender === 'macho') {
    const fightBtn = document.createElement('button');
    fightBtn.textContent = l.actionFight;
    fightBtn.disabled = Combat.isInjured(a, state.clock.day) || Combat.isChick(a, state.clock.day);
    fightBtn.onclick = () => plantelTryFight(plantelSelectedId);
    actions.append(fightBtn);
  }
  const penBtn = document.createElement('button');
  penBtn.textContent = l.actionPen;
  penBtn.onclick = () => plantelSendToPen(plantelSelectedId, gender);
  actions.append(penBtn);
  if (Market.canSell(state, plantelSelectedId)) {
    const sellBtn = document.createElement('button');
    sellBtn.className = 'danger';
    const value = Market.saleValue(a);
    sellBtn.textContent = l.actionSell + ' (' + new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(value / 100) + ')';
    sellBtn.onclick = () => plantelSell(plantelSelectedId, value);
    actions.append(sellBtn);
  }
  container.append(actions);
}

function renderPlantel(body) {
  if (yardView !== 'plantel') return false;
  const l = LOCALES[lang].plantel;
  $('closeYard').textContent = l.close;
  $('yardTitle').textContent = l.title;
  body.className = 'plantel-body';

  const layout = document.createElement('div');
  layout.className = 'plantel-layout';
  const listCol = document.createElement('div');
  listCol.className = 'plantel-col-list';
  renderPlantelList(listCol);
  const fichaCol = document.createElement('div');
  fichaCol.className = 'plantel-col-ficha';
  renderPlantelFicha(fichaCol);
  layout.append(listCol, fichaCol);
  body.append(layout);
  return true;
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = $('plantelButton');
  if (btn) btn.onclick = openPlantel;
});
