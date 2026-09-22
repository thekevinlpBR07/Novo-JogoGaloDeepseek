// Textos do narrador Kazao (falas proprias, sem bordoes de pessoa real) e dos dias memoraveis.
// {a} = seu galo, {b} = rival. Roteiro fino a revisar pelo autor (Biblia, Adendo 0.4).
LOCALES['pt-BR'].narrator = {
  name: 'Kazão',
  banks: {
    open: [
      'Boa noite, terreiro! Hoje tem {a} contra {b} e eu já perdi a voz antes de começar!',
      'Senta que lá vem história: {a} de um lado, {b} do outro. Quem leva?',
      'Dois galos, um terreiro e eu sem café. Bora, {a}!',
    ],
    hitPlayer: [
      'Olha a pancada do {a}! Isso aí foi coisa de gente grande!',
      '{a} acertou em cheio! O {b} sentiu até o pé!',
      'Não é possível! {a} entrou de sola!',
      'Foi bonito, foi limpo, foi {a}!',
      'Que sequência! O {b} nem viu de onde veio!',
    ],
    hitRival: [
      'Ai, ai, ai! O {b} pegou o {a} de jeito!',
      'Levou! {a} vai sentir isso amanhã cedo!',
      'Respira, {a}! Respira que ainda dá!',
      'Essa doeu até em mim aqui na cabine!',
      'O {b} achou o ângulo! Cuidado, {a}!',
    ],
    tech: [
      'Olha a técnica! Ninguém ensinou isso pra ele, ele já nasceu sabendo!',
      'Golpe especial! Gravem esse nome, gravem!',
      'Isso não é sorte, isso é treino de quintal!',
    ],
    miss: [
      'Errou por um fio de pena!',
      'Passou raspando! A torcida até se abaixou!',
      'Cadê o galo? Ah, o outro desviou!',
      'Bicou o vento! O vento nem sentiu!',
    ],
    intervalUp: [
      'Intervalo! {a} está mandando, mas a luta é longa, hein.',
      'Tá bonito pro {a}, só que o {b} ainda respira. Cuidado!',
    ],
    intervalDown: [
      'Intervalo, e o {b} tá mandando. {a}, escuta o seu treinador!',
      'Tá pesado pro {a}. Mas galo bom vira o jogo no meio do terreiro.',
    ],
    intervalEven: [
      'Luta parelha! Eu não consigo piscar!',
      'Empatadíssimo. Quem piscar perde!',
    ],
    win: [
      'ACABOU! Vitória do {a}! Eu não tô acreditando, e olha que eu vi tudo!',
      'É do {a}! Guardem esse dia, guardem!',
    ],
    lose: [
      'Não deu pro {a} hoje. Mas o quintal fica de pé, e amanhã tem treino.',
      'O {b} levou. Respeito. E o {a} volta mais esperto.',
    ],
    draw: [
      'Empate! Ninguém ganhou, ninguém perdeu, e eu perdi o fôlego!',
      'Deu igual! Dois galos, uma história mal resolvida.',
    ],
  },
};
LOCALES.en.narrator = {
  name: 'Kazão',
  banks: {
    open: [
      'Good evening, barnyard! Tonight it is {a} against {b} and I already lost my voice before the start!',
      'Sit down, here comes a story: {a} on one side, {b} on the other. Who takes it?',
      'Two roosters, one yard and me without coffee. Let us go, {a}!',
    ],
    hitPlayer: [
      'What a blow from {a}! That was grown-up stuff!',
      '{a} landed it clean! {b} felt it down to the toes!',
      'No way! {a} came in swinging!',
      'That was pretty, that was clean, that was {a}!',
      'What a sequence! {b} did not see where it came from!',
    ],
    hitRival: [
      'Oh, oh, oh! {b} got {a} good!',
      'Got hit! {a} is going to feel that tomorrow morning!',
      'Breathe, {a}! Breathe, it is not over!',
      'That one hurt me all the way up here in the booth!',
      '{b} found the angle! Careful, {a}!',
    ],
    tech: [
      'Look at that technique! Nobody taught him that, he was born knowing!',
      'Special move! Remember that name, remember it!',
      'That is not luck, that is backyard training!',
    ],
    miss: [
      'Missed by a feather!',
      'Just barely! The crowd even ducked!',
      'Where is the rooster? Oh, the other one dodged!',
      'Pecked the wind! The wind did not even notice!',
    ],
    intervalUp: [
      'Break time! {a} is in control, but the fight is long, you know.',
      'Looking good for {a}, but {b} is still breathing. Careful!',
    ],
    intervalDown: [
      'Break time, and {b} is running the show. {a}, listen to your trainer!',
      'Heavy for {a}. But a good rooster turns it around in the middle of the yard.',
    ],
    intervalEven: [
      'Even fight! I cannot blink!',
      'Dead even. Whoever blinks loses!',
    ],
    win: [
      'IT IS OVER! {a} wins! I cannot believe it, and I saw everything!',
      'It belongs to {a}! Remember this day, remember it!',
    ],
    lose: [
      'It was not {a}\'s day. But the yard is still standing, and tomorrow there is training.',
      '{b} took it. Respect. And {a} comes back smarter.',
    ],
    draw: [
      'A draw! Nobody won, nobody lost, and I lost my breath!',
      'All even! Two roosters, one unfinished story.',
    ],
  },
};

LOCALES['pt-BR'].memorable = {
  title: 'Dia memorável',
  events: {
    chuva: 'Choveu de madrugada. A terra cheira a terra e os galos têm cara de quem odiou.',
    galinha_fugida: 'Uma galinha da vizinha fugiu para o seu quintal. Você devolveu e ganhou R$ 5,00 de agradecimento.',
    cafe_zorino: 'Zorino passou com uma garrafa de café e não cobrou. Conversa curta, das boas.',
    promocao_deni: 'Deni colou um cartaz de promoção de milho: "só hoje". Lá todo dia é só hoje.',
    muro_janilson: 'Janilson passou medindo um muro que não é dele. Só para não perder a mão.',
    principe_passa: 'O Príncipe passou de moto olhando o seu quintal, fingindo que não olhava.',
    dolores_sabia: 'Dolores já sabia da sua vida antes de você acordar. Ninguém pergunta como.',
    cachorro_portao: 'Um cachorro de rua sentou na frente do portão e ficou. Não latiu. Só observava o galo.',
    sara_corre: 'Sara passou correndo e gritou uma recomendação de saúde sem parar de correr.',
    mapa_renatinho: 'Renatinho mostrou um mapa dobrado e avisou que o pai errou o caminho de novo.',
    envelope: 'Um envelope com R$ 10,00 embaixo do portão. Sem nome. O bairro tem seus mistérios.',
    manha_calma: 'Manhã sem novidade nenhuma. Café, galos, céu. Às vezes é isso.',
  },
};
LOCALES.en.memorable = {
  title: 'Memorable day',
  events: {
    chuva: 'It rained before dawn. The soil smells like soil and the roosters look like they hated it.',
    galinha_fugida: 'A neighbor\'s hen ran off to your yard. You took her back and got R$5.00 as thanks.',
    cafe_zorino: 'Zorino stopped by with a bottle of coffee and charged nothing. A short, good chat.',
    promocao_deni: 'Deni put up a corn sale sign: "today only". There, every day is today only.',
    muro_janilson: 'Janilson walked by measuring a wall that is not his. Just to keep his hand in.',
    principe_passa: 'The Prince rode by on his motorbike looking at your yard, pretending not to look.',
    dolores_sabia: 'Dolores already knew about your life before you woke up. Nobody asks how.',
    cachorro_portao: 'A stray dog sat in front of the gate and stayed. It did not bark. It just watched the rooster.',
    sara_corre: 'Sara ran past and shouted a health tip without slowing down.',
    mapa_renatinho: 'Renatinho showed a folded map and warned that his dad took the wrong road again.',
    envelope: 'An envelope with R$10.00 under the gate. No name. The neighborhood has its mysteries.',
    manha_calma: 'A morning with no news at all. Coffee, roosters, sky. Sometimes that is it.',
  },
};
