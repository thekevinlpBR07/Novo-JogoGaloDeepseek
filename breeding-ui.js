// UI do curral de reproducao: 2 slots separados, previsao qualitativa,
// incubacao e nascimento. Suporta mais de um curral desde a 0.3.2 (o anexo
// construido por Janilson adiciona um segundo, independente do primeiro).
let breedingPicking = null;
let breedingActivePen = 'pen1';

function breedingPenLabel(id) {
  const l = LOCALES[lang].breeding;
  return id === 'pen1' ? l.pen1Label : l.pen2Label;
}

function renderBreedingSlot(slot, id, label, busy) {
  const l = LOCALES[lang].breeding;
  const box = document.createElement('div');
  box.className = 'breeding-slot';
  const h = document.createElement('h4');
  h.textContent = label;
  box.append(h);
  const animal = id ? Breeding.findAnimal(state, id) : null;
  const p = document.createElement('p');
  p.textContent = animal ? animal.name || id : l.empty;
  box.append(p);
  const btn = document.createElement('button');
  btn.textContent = animal ? l.clear : l.choose;
  btn.disabled = busy;
  btn.onclick = () => {
    if (animal) doAssign(slot, null);
    else {
      breedingPicking = slot;
      renderYard();
    }
  };
  box.append(btn);
  return box;
}

function renderBreedingPicker(slot) {
  const l = LOCALES[lang].breeding;
  const box = document.createElement('div');
  box.className = 'breeding-picker';
  const pool = slot === 'rooster' ? Object.values(state.roosters.byId) : Object.values(state.chickens.breeding.byId);
  const h = document.createElement('h4');
  h.textContent = slot === 'rooster' ? l.pickRooster : l.pickHen;
  box.append(h);
  if (!pool.length) {
    const p = document.createElement('p');
    p.textContent = slot === 'rooster' ? l.noRoosters : l.noHens;
    box.append(p);
    return box;
  }
  for (const a of pool) {
    const b = document.createElement('button');
    b.textContent = a.name || a.id;
    b.onclick = () => doAssign(slot, a.id);
    box.append(b);
  }
  return box;
}

function doAssign(slot, id) {
  storyCommit(s => Breeding.assign(s, breedingActivePen, slot, id));
  breedingPicking = null;
  renderYard();
}

function doCross() {
  storyCommit(s => {
    Breeding.cross(s, breedingActivePen, Math.floor(Math.random() * 2 ** 31), s.clock.day);
  });
  renderYard();
}

function doBuyHen() {
  const l = LOCALES[lang].breeding;
  if (state.money < GeneticsConfig.BREEDING_HEN_PRICE) {
    $('yardFeedback').textContent = l.noMoney;
    return;
  }
  storyCommit(s => {
    const id = Breeding.nextAnimalId(s, 'breedingHen');
    s.chickens.breeding.byId[id] = Breeding.newOriginAnimal(id);
    s.money -= GeneticsConfig.BREEDING_HEN_PRICE;
  });
  $('yardFeedback').textContent = l.bought;
  renderYard();
}

function doHatch(eggId, name) {
  const egg = state.breeding.eggs.byId[eggId];
  if (!egg) return;
  const roll = egg.genesRolled;
  if (storyCommit(s => Breeding.hatch(s, eggId, name, s.clock.day))) {
    const l = LOCALES[lang].breeding;
    let msg = roll.gender === 'macho' ? l.hatchedMale : l.hatchedFemale;
    if (roll.mutated) msg += ' ' + l.mutated;
    if (roll.perks.length) msg += ' — ' + l.perksInherited + ': ' + roll.perks.map(p => LOCALES[lang].combat.perk[p] || p).join(', ');
    $('toast').textContent = msg;
    $('toast').hidden = false;
    toastUntil = performance.now() + 6000;
    renderYard();
  }
}

function renderBreeding(body) {
  if (yardView !== 'breeding') return false;
  const l = LOCALES[lang].breeding;
  $('closeYard').textContent = l.close;
  $('yardTitle').textContent = l.title;
  body.className = 'breeding-body';

  if (!EventFlags.has(state, 'E009')) {
    const p = document.createElement('p');
    p.textContent = l.locked;
    body.append(p);
    return true;
  }

  const penIds = Object.keys(state.breeding.pens.byId).sort();
  if (!penIds.includes(breedingActivePen)) breedingActivePen = penIds[0];

  if (penIds.length > 1) {
    const tabs = document.createElement('div');
    tabs.className = 'breeding-pen-tabs';
    for (const id of penIds) {
      const b = document.createElement('button');
      b.textContent = breedingPenLabel(id);
      b.setAttribute('aria-pressed', String(breedingActivePen === id));
      b.onclick = () => {
        breedingActivePen = id;
        breedingPicking = null;
        renderYard();
      };
      tabs.append(b);
    }
    body.append(tabs);
  }

  const hint = document.createElement('p');
  hint.textContent = l.hint;
  body.append(hint);

  const pen = Breeding.pen(state, breedingActivePen);
  const busy = Breeding.isBusy(state, breedingActivePen);

  const slotsRow = document.createElement('div');
  slotsRow.className = 'breeding-slots';
  slotsRow.append(renderBreedingSlot('rooster', pen.roosterId, l.roosterSlot, busy));
  slotsRow.append(renderBreedingSlot('hen', pen.henId, l.henSlot, busy));
  body.append(slotsRow);

  if (busy) {
    const eggId = Object.keys(state.breeding.eggs.byId).find(id => state.breeding.eggs.byId[id].penId === breedingActivePen);
    const egg = state.breeding.eggs.byId[eggId];
    const daysLeft = egg.incubationEndDay - state.clock.day;
    const p = document.createElement('p');
    p.className = 'breeding-status';
    p.textContent = daysLeft > 0 ? l.incubating + ' — ' + daysLeft + ' ' + l.daysLeft : l.ready;
    body.append(p);
    if (daysLeft <= 0) {
      const label = document.createElement('label');
      label.textContent = l.nameChick;
      const input = document.createElement('input');
      input.id = 'chickName';
      input.maxLength = 40;
      label.append(input);
      body.append(label);
      const hatchBtn = document.createElement('button');
      hatchBtn.className = 'fight-start';
      hatchBtn.textContent = l.hatch;
      hatchBtn.onclick = () => doHatch(eggId, input.value);
      body.append(hatchBtn);
    }
  } else if (pen.roosterId && pen.henId) {
    const prediction = Breeding.predict(state, breedingActivePen);
    if (prediction) {
      const predBox = document.createElement('div');
      predBox.className = 'breeding-prediction';
      const h = document.createElement('h3');
      h.textContent = l.prediction;
      predBox.append(h);
      for (const [cat, band] of Object.entries(prediction.categories)) {
        const row = document.createElement('p');
        row.textContent = l.category[cat] + ': ' + l.band[band];
        predBox.append(row);
      }
      const inb = document.createElement('p');
      inb.className = 'breeding-inbreeding';
      inb.textContent = l.inbreeding + ': ' + l.inbreedingBand[prediction.inbreeding];
      predBox.append(inb);
      body.append(predBox);
    }
    const crossBtn = document.createElement('button');
    crossBtn.className = 'fight-start';
    crossBtn.textContent = l.cross;
    crossBtn.onclick = doCross;
    body.append(crossBtn);
  }

  const buyBtn = document.createElement('button');
  buyBtn.textContent = l.buyHen + ' (' + new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(GeneticsConfig.BREEDING_HEN_PRICE / 100) + ')';
  buyBtn.disabled = busy;
  buyBtn.onclick = doBuyHen;
  body.append(buyBtn);

  if (breedingPicking) body.append(renderBreedingPicker(breedingPicking));

  return true;
}
