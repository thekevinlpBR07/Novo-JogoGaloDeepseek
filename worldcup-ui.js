// Mundial (Ato VIII): escolha da rodada na preparacao da luta, resultado, epilogo e legado (hall da fama + ranking).
const wcL = () => LOCALES[lang].worldcup;
const wcFmt = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const wcMoney = n => new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(n / 100);
const wcPara = (body, text, cls) => { const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; body.append(p); return p; };
const wcHead = (body, text) => { const h = document.createElement('h3'); h.textContent = text; body.append(h); };

// --- preparacao da luta ---
function chooseWorld(on) {
  const chk = WorldCup.canEnter(state, fightRoosterId);
  fightNational = null;
  fightIntl = null;
  if (on && chk.ok) {
    fightWorld = WorldCup.STAGES[chk.stage];
    pendingRival = WorldCup.rival(fightWorld);
    pendingRival.name = wcL().rivals[fightWorld.id];
  } else {
    fightWorld = null;
    pendingRival = generateRival(state.roosters.byId[fightRoosterId]);
  }
  renderYard();
}

function renderWorldBlock(body) {
  const l = wcL();
  const box = document.createElement('div');
  box.className = 'fight-scouted';
  const head = document.createElement('strong');
  head.textContent = l.title;
  box.append(head);
  const entry = WorldCup.entry(state), current = entry ? entry.stage : -1;
  WorldCup.STAGES.forEach((st, i) => {
    const status = entry && i < current ? l.status.done : entry && i === current ? l.status.next : !entry && i === 0 && WorldCup.available(state) ? l.status.next : l.status.locked;
    wcPara(box, wcFmt(l.stageLine, { etapa: l.stages[st.id], rival: l.rivals[st.id], status }));
  });
  body.append(box);
  wcPara(body, l.rule);
  if (fightWorld) {
    wcPara(body, wcFmt(l.selected, { etapa: l.stages[fightWorld.id], rival: pendingRival.name }), 'fight-mood');
    const back = document.createElement('button');
    back.textContent = l.back;
    back.onclick = () => chooseWorld(false);
    body.append(back);
    return;
  }
  if (!WorldCup.available(state)) { wcPara(body, wcFmt(l.wait, { dias: WorldCup.daysToNextSeason(state) })); return; }
  const chk = WorldCup.canEnter(state, fightRoosterId);
  if (!chk.ok) {
    const why = chk.code === 'cita' ? l.noCita : chk.code === 'registered' ? l.notRegistered : chk.code === 'money' ? wcFmt(l.noMoney, { valor: wcMoney(WorldCup.CONFIG.tripCost - state.money) }) : '';
    if (why) wcPara(body, why);
    return;
  }
  const st = WorldCup.STAGES[chk.stage];
  const go = document.createElement('button');
  go.className = 'fight-start';
  go.textContent = wcFmt(chk.first ? l.enter : l.enterNext, { etapa: l.stages[st.id], custo: wcMoney(WorldCup.CONFIG.tripCost), premio: wcMoney(st.prize) });
  go.onclick = () => chooseWorld(true);
  body.append(go);
}

function renderWorldResult(body) {
  if (!worldResult) return;
  const l = wcL();
  wcPara(body, wcFmt(l.result, { etapa: l.stages[worldResult.stageId], premio: wcMoney(worldResult.prize), viagem: wcMoney(worldResult.tripPaid) }), 'fight-mood');
  if (worldResult.champion) {
    wcPara(body, l.champion, 'fight-mood');
    if (worldResult.connection) wcPara(body, l.link, 'fight-mood');
  } else wcPara(body, worldResult.eliminated ? l.eliminated : l.advance, 'fight-mood');
}

// --- legado: hall da fama + ranking (usado na placa da linhagem) ---
function renderLegacy(body) {
  const l = wcL();
  const titles = WorldCup.hall(state);
  if (!titles.length && !wcFlag('epilogo_visto')) return;
  wcHead(body, l.hall.title);
  if (!titles.length) wcPara(body, l.hall.empty);
  for (const h of titles) wcPara(body, wcFmt(l.hall.row, { t: h.season, nome: h.name, g: h.generation, v: h.wins }) + (h.connection ? l.hall.link : ''));
  wcHead(body, l.ranking.title);
  const rank = WorldCup.ranking(state);
  if (!rank.length) wcPara(body, l.ranking.empty);
  rank.forEach((r, i) => wcPara(body, wcFmt(l.ranking.row, { pos: i + 1, nome: r.name, v: r.wins, e: r.draws, d: r.losses, g: r.generation })));
  if (wcFlag('epilogo_visto')) storyButton(body, l.viewEpilogue, 'view-epilogue', () => { yardView = 'epilogue'; renderYard(); });
}
const wcFlag = id => EventFlags.has(state, id);

// --- epilogo ---
function renderEpilogue(body) {
  if (yardView !== 'epilogue') return false;
  const l = wcL(), e = l.epilogue, sum = WorldCup.epilogue(state);
  $('closeYard').textContent = LOCALES[lang].lineage.close;
  body.className = 'first-day-body';
  $('yardTitle').textContent = e.title;
  if (typeof ArtSlots !== 'undefined' && ArtSlots.has('fim-epilogo')) {
    const cv = document.createElement('canvas');
    cv.width = 480; cv.height = 270; cv.className = 'story-portrait'; cv.style.width = '100%';
    body.append(cv);
    ArtSlots.draw(cv.getContext('2d'), 'fim-epilogo', 0, 0, cv.width, cv.height);
  }
  wcPara(body, e.intro, 'story-line');
  wcPara(body, wcFmt(e.days, { n: sum.day }));
  wcPara(body, wcFmt(e.money, { v: wcMoney(sum.money) }));
  wcPara(body, sum.lineage ? wcFmt(e.lineage, { nome: sum.lineage, g: sum.generations, r: sum.retired }) : e.noLineage);
  wcPara(body, wcFmt(e.fights, { w: sum.wins, f: sum.fights }));
  wcPara(body, wcFmt(e.circuits, { n: sum.nationalStages, d: sum.destinations }));
  if (sum.champion) wcPara(body, wcFmt(e.champion, { nome: sum.champion }), 'fight-mood');
  if (sum.connection) wcPara(body, l.link, 'fight-mood');
  wcPara(body, wcFmt(e.titles, { n: sum.titles }));
  wcPara(body, e.closing, 'story-line');
  return true;
}
