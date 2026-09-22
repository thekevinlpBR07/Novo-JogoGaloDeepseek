// UI de treino: lista de atributos -> minigame de timing (reacao) -> resultado.
// Mesma familia de padrao das outras telas (renderCombat/renderBreeding).
let trainingRoosterId = null;
let trainingAttribute = null;
let trainingRep = 0;
let trainingScores = [];
let trainingPhase = 'idle'; // idle | wait | go | early | hit
let trainingStartAt = 0;
let trainingTimer = null;
let trainingLastResult = null;

function openTraining(id) {
  const animal = state.roosters.byId[id];
  if (animal && Training.isChick(animal, state.clock.day)) {
    $('yardFeedback').textContent = LOCALES[lang].plantel.cannotTrainChick.replace('{dias}', animal.bornDay + CombatConfig.LIFE.chickDays - state.clock.day);
    return;
  }
  trainingRoosterId = id;
  trainingAttribute = null;
  openYard('training');
}

function startMinigame(attribute) {
  const rooster = state.roosters.byId[trainingRoosterId];
  if (!Training.canTrain(rooster, state.clock.day)) return;
  trainingAttribute = attribute;
  trainingRep = 0;
  trainingScores = [];
  yardView = 'training-play';
  renderYard();
  scheduleNextRep();
}

function scheduleNextRep() {
  trainingPhase = 'wait';
  renderYard();
  const delay = 600 + Math.random() * 1400;
  clearTimeout(trainingTimer);
  trainingTimer = setTimeout(() => {
    if (!$('yardPanel').open || yardView !== 'training-play') return;
    trainingPhase = 'go';
    trainingStartAt = performance.now();
    renderYard();
  }, delay);
}

function handleTrainingTap() {
  if (trainingPhase === 'wait') {
    trainingScores.push(0);
    trainingPhase = 'early';
    renderYard();
    setTimeout(advanceTrainingRep, 650);
    return;
  }
  if (trainingPhase !== 'go') return;
  const rt = performance.now() - trainingStartAt;
  const ideal = 250,
    tolerance = 300;
  const score = Math.max(0, 1 - Math.abs(rt - ideal) / tolerance);
  trainingScores.push(score);
  trainingPhase = 'hit';
  renderYard();
  setTimeout(advanceTrainingRep, 650);
}

function advanceTrainingRep() {
  if (!$('yardPanel').open || yardView !== 'training-play') return;
  trainingRep++;
  if (trainingRep >= TrainingConfig.REPS_PER_SESSION) {
    finishTrainingMinigame();
    return;
  }
  scheduleNextRep();
}

function finishTrainingMinigame() {
  const performanceScore = trainingScores.reduce((a, b) => a + b, 0) / trainingScores.length;
  let result = null;
  storyCommit(s => {
    result = Training.applyTraining(s.roosters.byId[trainingRoosterId], trainingAttribute, performanceScore, s.clock.day);
  });
  trainingLastResult = result ? { ...result, performance: Math.round(performanceScore * 100) } : null;
  yardView = 'training-result';
  renderYard();
}

function renderTraining(body) {
  if (!yardView || !yardView.startsWith('training')) return false;
  const l = LOCALES[lang].training;
  $('closeYard').textContent = l.close;
  $('yardTitle').textContent = l.title;
  body.className = 'training-body';
  const rooster = state.roosters.byId[trainingRoosterId];
  if (!rooster) return true;

  if (yardView === 'training') {
    if (typeof plantelSelectedId !== 'undefined' && plantelSelectedId) {
      const back = document.createElement('button');
      back.textContent = l.back;
      back.onclick = () => {
        yardView = 'plantel';
        renderYard();
      };
      body.append(back);
    }
    Training.rollDay(rooster, state.clock.day);
    const left = TrainingConfig.MAX_SESSIONS_PER_DAY - rooster.training.sessionsToday;
    const sessionsP = document.createElement('p');
    sessionsP.textContent = left + ' ' + l.sessionsLeft;
    body.append(sessionsP);
    if (left <= 0) {
      const p = document.createElement('p');
      p.textContent = l.noSessions;
      body.append(p);
    }
    for (const attr of GeneticsConfig.ATTRIBUTES) {
      const row = document.createElement('div');
      row.className = 'training-row';
      const h = document.createElement('h4');
      h.textContent = l.attribute[attr];
      row.append(h);
      const flavor = document.createElement('small');
      flavor.textContent = l.flavor[TrainingConfig.MINIGAMES[attr].flavor];
      row.append(flavor);
      const bar = document.createElement('div');
      bar.className = 'training-bar';
      const meter = document.createElement('progress');
      meter.max = rooster.genetics.potential[attr];
      meter.value = rooster.attributes[attr];
      meter.setAttribute('aria-label', l.attribute[attr]);
      bar.append(meter);
      row.append(bar);
      const btn = document.createElement('button');
      btn.textContent = l.start;
      btn.disabled = left <= 0;
      btn.onclick = () => startMinigame(attr);
      row.append(btn);
      body.append(row);
    }
    return true;
  }

  if (yardView === 'training-play') {
    const heading = document.createElement('h3');
    heading.textContent = l.attribute[trainingAttribute] + ' — ' + l.rep + ' ' + (trainingRep + 1) + ' ' + l.of + ' ' + TrainingConfig.REPS_PER_SESSION;
    body.append(heading);
    const zone = document.createElement('button');
    zone.className = 'training-zone training-zone-' + trainingPhase;
    zone.textContent = trainingPhase === 'go' ? l.go : trainingPhase === 'early' ? l.early : trainingPhase === 'hit' ? l.hit : l.getReady;
    zone.onclick = handleTrainingTap;
    body.append(zone);
    return true;
  }

  if (yardView === 'training-result') {
    const title = document.createElement('h3');
    title.textContent = l.resultTitle;
    body.append(title);
    if (trainingLastResult) {
      const perf = document.createElement('p');
      perf.textContent = l.performance + ': ' + trainingLastResult.performance + '%';
      body.append(perf);
      const gain = document.createElement('p');
      gain.textContent = trainingLastResult.gain > 0 ? l.gain + ': +' + trainingLastResult.gain + ' (' + trainingLastResult.atual + '/' + trainingLastResult.potential + ')' : l.noGain;
      body.append(gain);
    }
    const back = document.createElement('button');
    back.textContent = l.back;
    back.onclick = () => {
      yardView = 'training';
      renderYard();
    };
    body.append(back);
    return true;
  }

  return false;
}
