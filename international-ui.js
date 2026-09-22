// Central de viagens (ponto de onibus, Ato VII): pedir o CITA por galo, ver o circuito internacional e o grupo da viagem;
// mais o bloco de escolha de destino na preparacao da luta (combat-ui.js) e o resultado.
let intlPendingCita = null;
const intlL = () => LOCALES[lang].international;
const intlFmt = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const intlMoney = n => new Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' }).format(n / 100);
const intlPara = (body, text, cls) => { const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; body.append(p); return p; };
const intlHead = (body, text) => { const h = document.createElement('h3'); h.textContent = text; body.append(h); };
const intlRivalName = (d, boutIndex) => intlL().rivals[d.id] + (boutIndex > 0 ? ' ' + 'I'.repeat(boutIndex + 1) : '');

function citaStatusText(id) {
  const l = intlL(), st = International.citaStatus(state, id), c = International.citaOf(state, id);
  const day = st === 'pending' ? c.ready : st === 'valid' ? c.expires : 0;
  return intlFmt(l.status[st], { dia: day });
}

function renderInternational(body) {
  if (yardView !== 'international') return false;
  const l = intlL(), q = International.quote();
  $('closeYard').textContent = l.close;
  body.className = 'first-day-body';
  $('yardTitle').textContent = l.title;
  intlPara(body, l.intro, 'story-line');

  intlHead(body, l.citaTitle);
  intlPara(body, l.citaHint);
  intlPara(body, intlFmt(l.quote, { custo: intlMoney(q.cost), prep: q.prepDays, val: q.validDays }));
  const roosters = Object.values(state.roosters.byId).filter(r => !Lineage.isRetired(state, r.id) && !Combat.isChick(r, state.clock.day));
  if (!roosters.length) intlPara(body, l.noRoosters);
  for (const r of roosters) {
    intlPara(body, r.name + ' · ' + citaStatusText(r.id));
    const st = International.citaStatus(state, r.id);
    if (st === 'pending' || st === 'valid') continue;
    if (intlPendingCita === r.id) {
      intlPara(body, intlFmt(l.confirm, { nome: r.name, custo: intlMoney(q.cost), prep: q.prepDays, val: q.validDays }), 'fight-mood');
      storyButton(body, l.yes, 'cita-yes', () => {
        let res;
        const ok = storyCommit(s => { res = International.orderCita(s, r.id); return res.ok; });
        intlPendingCita = null;
        renderYard();
        $('yardFeedback').textContent = ok ? intlFmt(l.ordered, { nome: r.name, dia: res.ready }) : (l.errors[res?.code] || l.errors.locked);
      });
      storyButton(body, l.no, 'cita-no', () => { intlPendingCita = null; renderYard(); });
    } else {
      storyButton(body, intlFmt(l.order, { nome: r.name }), 'cita-' + r.id, () => { intlPendingCita = r.id; renderYard(); }, state.money < q.cost);
    }
  }

  intlHead(body, l.tripTitle);
  const next = International.nextDestination(state);
  for (const d of International.DESTINATIONS) {
    const status = International.data(state).done[d.id] ? l.destStatus.done : next && next.id === d.id ? l.destStatus.next : l.destStatus.locked;
    intlPara(body, intlFmt(l.destLine, { destino: l.destinations[d.id], status }));
  }
  if (!next) { intlPara(body, l.finished, 'fight-mood'); return true; }
  intlPara(body, intlFmt(next.special ? l.special : l.capacity, { n: International.capacityOf(next) }));
  intlPara(body, intlFmt(l.tripCost, { custo: intlMoney(International.CONFIG.tripCost) }));
  const trip = International.tripOf(state, next.id);
  if (trip) {
    intlHead(body, l.party);
    for (const id of trip.party) {
      const r = state.roosters.byId[id], res = trip.bouts[id];
      if (r) intlPara(body, intlFmt(l.partyRow, { nome: r.name, estado: l.boutState[res || 'pending'] }));
    }
    intlPara(body, l.goFight);
    storyButton(body, l.closeTrip, 'trip-close', () => {
      let out;
      storyCommit(s => { out = International.finishTrip(s, next.id); return !!out; });
      renderYard();
      if (out) $('yardFeedback').textContent = out.conquered ? intlFmt(l.tripClosedWin, { destino: l.destinations[next.id] }) : l.tripClosedFail;
    });
  } else if (!International.available(state)) {
    intlPara(body, intlFmt(l.wait, { dias: International.daysUntil(state) }));
  } else {
    intlPara(body, l.goFight);
  }
  return true;
}

// --- preparacao da luta: escolher o destino internacional para este galo ---
function chooseIntl(on) {
  const d = International.nextDestination(state);
  const chk = d ? International.canFightBout(state, d.id, fightRoosterId) : { ok: false };
  fightNational = null;
  fightWorld = null;
  if (on && d && chk.ok) {
    fightIntl = d;
    pendingRival = International.rival(d, chk.boutIndex);
    pendingRival.name = intlRivalName(d, chk.boutIndex);
  } else {
    fightIntl = null;
    pendingRival = generateRival(state.roosters.byId[fightRoosterId]);
  }
  renderYard();
}

function renderIntlBlock(body) {
  const l = intlL(), d = International.nextDestination(state);
  const box = document.createElement('div');
  box.className = 'fight-scouted';
  const head = document.createElement('strong');
  head.textContent = l.tripTitle;
  box.append(head);
  for (const x of International.DESTINATIONS) {
    const status = International.data(state).done[x.id] ? l.destStatus.done : d && d.id === x.id ? l.destStatus.next : l.destStatus.locked;
    intlPara(box, intlFmt(l.destLine, { destino: l.destinations[x.id], status }));
  }
  body.append(box);
  if (!d) { intlPara(body, l.finished, 'fight-mood'); return; }
  if (fightIntl) {
    intlPara(body, intlFmt(l.selected, { destino: l.destinations[fightIntl.id], rival: pendingRival.name }), 'fight-mood');
    const back = document.createElement('button');
    back.textContent = l.back;
    back.onclick = () => chooseIntl(false);
    body.append(back);
    return;
  }
  if (!International.available(state)) { intlPara(body, intlFmt(l.wait, { dias: International.daysUntil(state) })); return; }
  const chk = International.canFightBout(state, d.id, fightRoosterId);
  if (!chk.ok) {
    const why = chk.code === 'cita' ? l.noCita : chk.code === 'party' ? l.notInParty : chk.code === 'money' ? intlFmt(l.noMoney, { valor: intlMoney(International.CONFIG.tripCost - state.money) }) : '';
    if (why) intlPara(body, why);
    return;
  }
  const go = document.createElement('button');
  go.className = 'fight-start';
  go.textContent = intlFmt(l.enter, { destino: l.destinations[d.id], custo: intlMoney(chk.first ? International.CONFIG.tripCost : 0), premio: intlMoney(International.prizeFor(d, 'win')) });
  go.onclick = () => chooseIntl(true);
  body.append(go);
}

function renderIntlResult(body) {
  if (!intlResult) return;
  const l = intlL(), d = International.dest(intlResult.destId);
  intlPara(body, intlFmt(l.result, { destino: l.destinations[d.id], premio: intlMoney(intlResult.prize), viagem: intlMoney(intlResult.tripPaid) }), 'fight-mood');
  if (intlResult.finished) intlPara(body, intlResult.finished.conquered ? l.conquered : l.tripOver, 'fight-mood');
  else {
    const left = International.pendingParty(state, d.id).length;
    if (left) intlPara(body, intlFmt(l.partyLeft, { n: left }));
  }
}
