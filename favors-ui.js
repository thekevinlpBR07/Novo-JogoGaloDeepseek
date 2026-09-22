// Favores do bairro (missoes secundarias): comerciantes nomeados pedem producao do quintal.
let favorId = null;
let favorPage = 0;
const favorL = () => LOCALES[lang].favors;

function favorOpen(id) {
  if (!Favors.ids().includes(id)) return false;
  favorId = id;
  favorPage = 0;
  openYard('favor');
  return true;
}

function renderFavor(body) {
  if (yardView !== 'favor' || !favorId) return false;
  const l = favorL();
  $('closeYard').textContent = l.close;
  body.className = 'first-day-body';
  $('yardTitle').textContent = l.speakers[favorId];
  const portrait = document.createElement('canvas');
  portrait.width = 192;
  portrait.height = 192;
  portrait.className = 'story-portrait';
  portrait.setAttribute('aria-hidden', 'true');
  const pc = portrait.getContext('2d');
  pc.scale(3, 3);
  if (RouteArt.hasAnim(favorId)) RouteArt.portrait(pc, favorId, 1, 64);
  else RouteArt.person(pc, 32, 58, favorId);
  body.append(portrait);

  if (!Favors.unlocked(state)) {
    storyParagraph(body, l.locked);
    return true;
  }
  const lines = l.meet[favorId];
  if (!EventFlags.has(state, 'met_' + favorId)) {
    storyParagraph(body, lines[favorPage], 'story-line');
    storyParagraph(body, favorPage + 1 + ' / ' + lines.length, 'story-page');
    storyButton(body, l.next, 'next', () => {
      if (favorPage + 1 < lines.length) {
        favorPage++;
        renderYard();
        return;
      }
      storyCommit(s => Favors.meet(s, favorId));
      favorPage = 0;
      renderYard();
    });
    return true;
  }
  if (favorId === 'dolores') {
    storyParagraph(body, l.tips[Favors.tipFor(state)], 'story-line');
    return true;
  }
  const o = Favors.order(state, favorId);
  storyParagraph(body, l.ask[favorId].replace(/\{n\}/g, o.count), 'story-line');
  storyParagraph(body, l.need + ' · ' + o.count + ' ' + l.items[o.item]);
  storyParagraph(body, l.have + ' · ' + o.have + ' ' + l.items[o.item]);
  if (o.reward) storyParagraph(body, l.reward + ' · ' + storyMoney(o.reward));
  for (const [item, n] of Object.entries(o.items)) storyParagraph(body, l.rewardItems + ' · ' + n + ' ' + l.items[item]);
  if (o.done) storyParagraph(body, l.done, 'fight-mood');
  else if (!o.ready) storyParagraph(body, l.missing, 'fight-mood');
  storyButton(body, l.deliver, 'deliver', () => {
    if (storyCommit(s => Favors.deliver(s, favorId))) {
      renderYard();
      $('yardFeedback').textContent = l.delivered;
    }
  }, !o.ready);
  return true;
}
