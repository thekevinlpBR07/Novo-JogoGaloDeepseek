// UI da construcao (Secao 11/14.2): Janilson oferece transformar o terreno
// baldio do bairro num anexo com um segundo curral de reproducao.
function doStartConstruction() {
  const l = LOCALES[lang].construction;
  if (!Construction.canStart(state)) {
    $('yardFeedback').textContent = l.noMoney;
    return;
  }
  storyCommit(s => Construction.start(s, s.clock.day));
  renderYard();
}

function doCompleteConstruction() {
  const l = LOCALES[lang].construction;
  storyCommit(s => Construction.complete(s));
  $('toast').textContent = l.done;
  $('toast').hidden = false;
  toastUntil = performance.now() + 6000;
  renderYard();
}

function renderConstruction(body) {
  if (yardView !== 'construction') return false;
  const l = LOCALES[lang].construction;
  $('closeYard').textContent = l.close;
  $('yardTitle').textContent = l.title;
  body.className = 'construction-body';

  const intro = document.createElement('p');
  intro.className = 'construction-intro';
  intro.textContent = l.janilsonIntro;
  body.append(intro);

  const annex = state.construction.annex;

  if (annex.unlocked) {
    const p = document.createElement('p');
    p.textContent = l.finished;
    body.append(p);
    return true;
  }

  if (annex.project) {
    const daysLeft = annex.project.endDay - state.clock.day;
    const status = document.createElement('p');
    status.className = 'construction-status';
    status.textContent = daysLeft > 0 ? l.inProgress + ' — ' + daysLeft + ' ' + l.daysLeft : l.ready;
    body.append(status);
    if (daysLeft <= 0) {
      const btn = document.createElement('button');
      btn.className = 'fight-start';
      btn.textContent = l.complete;
      btn.onclick = doCompleteConstruction;
      body.append(btn);
    }
    return true;
  }

  const offer = document.createElement('div');
  offer.className = 'construction-offer';
  const h = document.createElement('h3');
  h.textContent = l.offerTitle;
  offer.append(h);
  const desc = document.createElement('p');
  desc.textContent = l.offerDesc;
  offer.append(desc);
  const cost = document.createElement('p');
  cost.textContent = l.cost + ': ' + new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(ConstructionConfig.ANNEX.cost / 100);
  offer.append(cost);
  const duration = document.createElement('p');
  duration.textContent = l.duration + ': ' + ConstructionConfig.ANNEX.days + ' ' + l.days;
  offer.append(duration);
  const slow = document.createElement('p');
  slow.className = 'construction-slow';
  slow.textContent = l.janilsonSlow;
  offer.append(slow);
  body.append(offer);

  const btn = document.createElement('button');
  btn.className = 'fight-start';
  btn.textContent = l.start;
  btn.disabled = !Construction.canStart(state);
  btn.onclick = doStartConstruction;
  body.append(btn);

  return true;
}
