// Placa e painel da linhagem (Ato V): nomear, ver estatisticas e legado, aposentar veterano.
let lineagePendingRetire = null;
const lineageL = () => LOCALES[lang].lineage;
const lineageFmt = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

// Placa fisica no quintal. Usa a arte 'placa-linhagem' quando existir; senao um provisorio (poste + tabua).
function drawLineageSign(c, s, x, y) {
  const st = Lineage.signState(s);
  if (!st) return;
  c.save();
  if (typeof ArtSlots !== 'undefined' && ArtSlots.has('placa-linhagem')) {
    ArtSlots.draw(c, 'placa-linhagem', x - 40, y - 52, 80, 50);
  } else {
    c.fillStyle = '#1c27226b'; c.fillRect(x - 22, y - 2, 44, 4);
    c.fillStyle = '#5b4530'; c.fillRect(x - 3, y - 30, 6, 30);
    c.fillStyle = '#8a6a45'; c.fillRect(x - 32, y - 54, 64, 26);
    c.strokeStyle = '#4a3826'; c.lineWidth = 2; c.strokeRect(x - 32, y - 54, 64, 26);
  }
  if (st === 'named') {
    c.fillStyle = '#2b1e12'; c.font = 'bold 9px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(Lineage.name(s), x, y - 41, 58);
  } else {
    c.fillStyle = '#e05a3a'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('!', x, y - 60);
  }
  c.restore();
}

function renderLineage(body) {
  if (yardView !== 'lineage') return false;
  const l = lineageL();
  $('closeYard').textContent = l.close;
  body.className = 'first-day-body';
  $('yardTitle').textContent = l.title;

  if (!Lineage.isNamed(state)) {
    storyParagraph(body, l.blankIntro, 'story-line');
    const label = document.createElement('label');
    label.textContent = l.nameLabel + ' ';
    const input = document.createElement('input');
    input.type = 'text'; input.maxLength = Lineage.CONFIG.nameMax; input.placeholder = l.placeholder; input.dataset.lineage = 'name';
    label.append(input);
    body.append(label);
    storyButton(body, l.save, 'lineage-save', () => {
      let result;
      const ok = storyCommit(s => { result = Lineage.setName(s, input.value); return result.ok; });
      if (ok) { renderYard(); $('yardFeedback').textContent = lineageFmt(l.named, { nome: Lineage.name(state) }); }
      else if (result) $('yardFeedback').textContent = l.errors[result.code] || l.errors.locked;
    });
    return true;
  }

  const sum = Lineage.summary(state);
  storyParagraph(body, lineageFmt(l.named, { nome: sum.name }), 'story-line');
  storyParagraph(body, l.namedNote);
  storyParagraph(body, lineageFmt(l.stats, { g: sum.generations, n: sum.bornHere, r: sum.retired }));

  const hallHead = document.createElement('h3'); hallHead.textContent = l.hallTitle; body.append(hallHead);
  const hall = Lineage.hall(state);
  if (!hall.length) storyParagraph(body, l.hallEmpty);
  for (const h of hall) storyParagraph(body, lineageFmt(l.hallRow, { nome: h.name, g: h.generation, v: h.wins, d: h.descendants }));

  const retHead = document.createElement('h3'); retHead.textContent = l.retireTitle; body.append(retHead);
  storyParagraph(body, lineageFmt(l.retireHint, { n: Lineage.CONFIG.retireMinWins }));
  const candidates = Object.values(state.roosters.byId).filter(r => Lineage.eligibleToRetire(state, r));
  if (!candidates.length) storyParagraph(body, lineageFmt(l.retireNone, { n: Lineage.CONFIG.retireMinWins }));
  for (const r of candidates) {
    if (lineagePendingRetire === r.id) {
      storyParagraph(body, lineageFmt(l.retireConfirm, { nome: r.name }), 'fight-mood');
      storyButton(body, l.yes, 'retire-yes', () => {
        let result;
        const ok = storyCommit(s => { result = Lineage.retire(s, r.id); return result.ok; });
        lineagePendingRetire = null;
        renderYard();
        if (ok) $('yardFeedback').textContent = lineageFmt(l.retired, { nome: r.name });
      });
      storyButton(body, l.no, 'retire-no', () => { lineagePendingRetire = null; renderYard(); });
    } else {
      storyButton(body, lineageFmt(l.retireButton, { nome: r.name, v: r.record?.wins || 0 }), 'retire-' + r.id, () => { lineagePendingRetire = r.id; renderYard(); });
    }
  }
  if (typeof renderLegacy === 'function') renderLegacy(body);
  return true;
}
