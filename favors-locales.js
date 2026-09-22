(function(){
const pt={
 title:'Bairro · favores',close:'Voltar · Esc',next:'Continuar · Enter',deliver:'Entregar',locked:'Termine primeiro o Ato I: o bairro só confia em quem já tem rotina.',
 need:'Pedido de hoje',have:'Você tem',reward:'Pagamento',rewardItems:'Você recebe',done:'Pedido de hoje já entregue. Volte amanhã.',missing:'Ainda faltam itens. Produza no quintal e volte.',delivered:'Entrega feita.',market:'No Mercado você ganharia menos por isso.',
 items:{egg:'ovos',radish:'rabanetes',corn:'milho',feed:'ração'},
 npc_deni:'Deni · mercadinho',npc_zorino:'Zorino · bar',npc_juliana:'Juliana · agropecuária',npc_dolores:'Dolores Fofoquinha',
 speakers:{deni:'Adeni “Deni” Ribeiro',zorino:'Zorino Almeida',juliana:'Juliana Campos',dolores:'Dolores Fofoquinha'},
 meet:{
  deni:['Você é o do galo torto, né? Não faz essa cara, aqui todo mundo fica sabendo.','Eu compro ovo do quintal de vizinho, e pago mais do que o atacado. Conta feita, todo mundo ganha.','Traz seis ovos e a gente acerta. Um pedido por dia.'],
  zorino:['Senta, se quiser. Hoje o bar está calmo.','Rabanete fresco faz falta na salada do prato feito. Quatro por dia, se você tiver.','Pago no ato. Sem pressa.'],
  juliana:['Vi seu galo passar. Boa postura, perna ruim.','Eu troco ração por milho. Três milhos, três rações. Sem milagre, é conta simples.','Uma troca por dia. Ração custa mais do que parece.'],
  dolores:['Ai, fala baixo. Ninguém contou isso pra você, tá?','Eu só observo da janela. O bairro inteiro passa por aqui.']
 },
 ask:{deni:'Preciso de {n} ovos.',zorino:'Preciso de {n} rabanetes.',juliana:'Troco {n} milhos por {n} rações.',dolores:''},
 tips:{
  tip0:'Dizem que perder aposta grande dói mais que perder luta. A presença no circuito paga mesmo assim.',
  tip1:'Galo novo não luta nem treina. Filhote precisa crescer. Paciência é renda.',
  tip2:'Mãe importa tanto quanto pai. O Seu Marivaldo repete isso pra todo mundo.',
  tip3:'Ração e água todo dia. Ave mal cuidada rende menos, e o bairro repara.',
  tip4:'O Príncipe do circuito adora provocar quem é novo. Não caia na conversa.',
  tip5:'Quem vende ovo e rabanete não fica rico, mas paga a ração. Faz conta.'
 }
};
const en={
 title:'Neighborhood · favors',close:'Back · Esc',next:'Continue · Enter',deliver:'Deliver',locked:'Finish Act I first: the neighborhood only trusts people who have a routine.',
 need:'Today’s order',have:'You have',reward:'Payment',rewardItems:'You receive',done:'Today’s order already delivered. Come back tomorrow.',missing:'Still missing items. Produce them in the yard and come back.',delivered:'Delivery made.',market:'At the Market you would earn less for this.',
 items:{egg:'eggs',radish:'radishes',corn:'corn',feed:'feed'},
 npc_deni:'Deni · grocery',npc_zorino:'Zorino · bar',npc_juliana:'Juliana · farm supply',npc_dolores:'Dolores the Gossip',
 speakers:{deni:'Adeni “Deni” Ribeiro',zorino:'Zorino Almeida',juliana:'Juliana Campos',dolores:'Dolores the Gossip'},
 meet:{
  deni:['You’re the crooked-rooster one, right? Don’t make that face, everyone finds out here.','I buy eggs from neighbors’ yards, and I pay above wholesale. Do the math, everybody wins.','Bring six eggs and we settle. One order a day.'],
  zorino:['Have a seat if you like. The bar is quiet today.','Fresh radish is missing from the daily lunch salad. Four a day, if you have them.','I pay on the spot. No rush.'],
  juliana:['Saw your rooster go by. Good posture, bad leg.','I swap feed for corn. Three corn, three feed. No miracles, just simple math.','One swap a day. Feed costs more than it looks.'],
  dolores:['Oh, keep your voice down. Nobody told you this, okay?','I just watch from the window. The whole neighborhood passes by here.']
 },
 ask:{deni:'I need {n} eggs.',zorino:'I need {n} radishes.',juliana:'I swap {n} corn for {n} feed.',dolores:''},
 tips:{
  tip0:'They say losing a big stake hurts more than losing a fight. The circuit’s appearance fee pays anyway.',
  tip1:'Young birds can’t fight or train. Chicks have to grow. Patience is income.',
  tip2:'The mother matters as much as the father. Mr. Marivaldo tells everyone that.',
  tip3:'Feed and water every day. Poorly cared-for birds earn less, and the neighborhood notices.',
  tip4:'The circuit’s Prince loves teasing newcomers. Don’t take the bait.',
  tip5:'Selling eggs and radishes won’t make you rich, but it pays for feed. Do the math.'
 }
};
LOCALES['pt-BR'].favors=pt;LOCALES.en.favors=en;
for(const l of [LOCALES['pt-BR'],LOCALES.en])for(const id of ['npc_deni','npc_zorino','npc_juliana','npc_dolores'])l.names[id]=l.favors[id];
})();
