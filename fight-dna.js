// Renderizador do DNA visual (aparencia genetica individual) em cima dos
// sprites-mestre ja carregados pelo FightArt. So navegador (usa Canvas2D) -
// nao roda em Node. Comeca cobrindo so a pose idle de padrao-comum-ereta;
// qualquer outra combinacao cai pro sprite normal sem recolorir (fallback
// seguro, nunca quebra a tela por falta de mascara).
const FightDna = (() => {
  const V = window.VisualDna;

  // Mascaras calibradas a olho + auditadas com cores extremas (sem vazar pra
  // cabeca/pernas) no protótipo antes de virar código real. Uma entrada por
  // (bodyKey, pose). bodyKey = spriteId sem o sufixo de pose.
  const MASKS = {
    // Galinhas reprodutoras (raca Indio Combatente): mesma silhueta nas duas cristas.
    'galinha-comum-ereta': { '01-idle': { regions: {
        dorso: [[[520,520],[760,540],[820,600],[830,680],[720,800],[560,880],[400,900],[350,860],[420,740]]],
        peito: [[[820,500],[920,570],[960,700],[940,800],[860,880],[780,1000],[640,1090],[500,1060],[350,980],[430,900],[600,870],[740,800],[830,700]]],
        cauda: [[[30,780],[130,720],[290,730],[340,800],[330,930],[260,970],[130,940],[40,860]]] } } },
    'galinha-comum-tombada': { '01-idle': { regions: {
        dorso: [[[520,520],[760,540],[820,600],[830,680],[720,800],[560,880],[400,900],[350,860],[420,740]]],
        peito: [[[820,500],[920,570],[960,700],[940,800],[860,880],[780,1000],[640,1090],[500,1060],[350,980],[430,900],[600,870],[740,800],[830,700]]],
        cauda: [[[30,780],[130,720],[290,730],[340,800],[330,930],[260,970],[130,940],[40,860]]] } } },
    'campeao-comum-ereta': { '01-idle': { regions: {
        dorso: [[[620,470],[810,480],[830,560],[790,660],[690,740],[580,780],[550,690],[590,560]]],
        peito: [[[830,400],[960,500],[990,580],[940,680],[900,780],[880,900],[800,940],[650,900],[620,830],[700,760],[820,700]]],
        cauda: [[[190,660],[280,580],[400,550],[500,600],[540,680],[520,800],[470,870],[400,900],[320,930],[230,850],[190,760]]] },
        head: { rect: [810,20,170,300], pivot: [850,310] } } },
    // Malhadas: o padrao ja vem pintado, entao o recolorir e mais leve (intensity) pra nao apagar as manchas.
    'campeao-malhada-ereta': { '01-idle': { intensity: 0.6, regions: {
        dorso: [[[600,480],[800,470],[830,560],[800,660],[700,740],[590,760],[550,660],[580,560]]],
        peito: [[[830,420],[960,500],[990,580],[950,690],[900,780],[880,900],[780,930],[640,890],[610,830],[700,750],[820,700]]],
        cauda: [[[190,690],[290,580],[400,540],[500,590],[540,670],[510,800],[450,880],[340,900],[240,840],[190,760]]] },
        head: { rect: [780,10,170,300], pivot: [850,310] } } },
    'padrao-malhada-ereta': { '01-idle': { intensity: 0.6, regions: {
        dorso: [[[560,480],[780,470],[820,540],[800,640],[700,720],[570,750],[530,660]]],
        peito: [[[810,420],[920,500],[930,600],[880,700],[850,820],[790,890],[700,890],[610,890],[600,800],[690,740],[800,700]]],
        cauda: [[[260,620],[340,560],[440,560],[520,610],[520,700],[490,790],[420,830],[340,850],[290,760],[260,680]]] },
        head: { rect: [780,60,160,270], pivot: [820,300] } } },
    // Crista tombada e capenga: so a pose idle existe. Mesma anatomia das ereta (dorso = sela/asa, peito = corpo frontal e coxa, cauda).
    'padrao-comum-tombada': { '01-idle': { regions: {
        dorso: [[[680,330],[730,350],[760,400],[770,470],[770,540],[730,620],[650,690],[560,740],[500,700],[520,600],[600,490],[680,440]]],
        peito: [[[790,340],[850,380],[880,450],[905,510],[890,590],[850,660],[830,700],[830,760],[790,810],[730,840],[650,800],[600,760],[650,690],[730,620],[770,540],[775,450]]],
        cauda: [[[265,700],[300,610],[350,570],[430,570],[500,595],[500,700],[470,770],[430,820],[350,825],[300,770]]] },
        head: { rect: [680,60,280,270], pivot: [790,320] } } },
    'padrao-malhada-tombada': { '01-idle': { intensity: 0.6, regions: {
        dorso: [[[680,330],[730,350],[760,400],[770,470],[770,540],[730,620],[650,690],[560,740],[500,700],[520,600],[600,490],[680,440]]],
        peito: [[[790,340],[850,380],[880,450],[905,510],[890,590],[850,660],[830,700],[830,760],[790,810],[730,840],[650,800],[600,760],[650,690],[730,620],[770,540],[775,450]]],
        cauda: [[[255,720],[300,610],[350,570],[430,565],[500,590],[500,700],[480,780],[450,840],[390,850],[320,790]]] },
        head: { rect: [680,60,270,270], pivot: [790,320] } } },
    'campeao-comum-tombada': { '01-idle': { regions: {
        dorso: [[[690,330],[740,380],[780,440],[840,470],[840,560],[800,640],[700,700],[600,730],[560,700],[590,600],[640,520],[700,440]]],
        peito: [[[850,380],[920,430],[960,520],[970,590],[930,680],[890,740],[880,800],[820,880],[740,890],[700,800],[760,730],[840,650],[840,560],[850,470]]],
        cauda: [[[220,740],[280,620],[340,560],[420,545],[520,580],[550,610],[540,700],[510,790],[480,860],[400,930],[330,880],[270,830]]] },
        head: { rect: [700,50,290,270], pivot: [820,320] } } },
    'campeao-malhada-tombada': { '01-idle': { intensity: 0.6, regions: {
        dorso: [[[690,340],[740,400],[790,450],[830,480],[820,560],[790,640],[700,720],[580,760],[540,720],[590,610],[640,540],[700,440]]],
        peito: [[[850,400],[910,440],[950,520],[960,590],[900,690],[890,760],[880,830],[810,880],[760,900],[720,830],[760,750],[830,660],[840,560],[850,470]]],
        cauda: [[[215,720],[270,620],[340,550],[430,545],[520,590],[540,650],[540,730],[510,800],[470,850],[400,890],[340,880],[280,800]]] },
        head: { rect: [700,50,290,270], pivot: [810,320] } } },
    'capenga': { '01-idle': { regions: {
        dorso: [[[700,300],[780,340],[820,420],[830,480],[800,560],[730,640],[640,700],[540,740],[470,700],[520,600],[600,500],[700,440]]],
        peito: [[[840,380],[900,420],[940,500],[930,600],[900,650],[840,740],[820,790],[760,850],[690,860],[660,780],[720,720],[800,640],[820,560],[830,480]]],
        cauda: [[[255,700],[290,600],[350,550],[430,550],[490,590],[520,650],[500,730],[460,800],[420,850],[350,830],[300,770]]] },
        head: { rect: [700,70,320,250], pivot: [830,320] } } },
    // Fases de vida: recolorir leve (intensity) pra a diferenca de DNA aparecer pequena, como no bicho novo.
    'pintinho': { '01-idle': { intensity: 0.5, regions: {
        dorso: [[[540,400],[720,410],[740,470],[640,530],[520,560],[380,650],[290,780],[190,760],[160,680],[260,580],[390,470]]],
        peito: [[[380,780],[620,700],[900,560],[940,660],[920,850],[760,1010],[560,1030],[380,960]]],
        cauda: [[[140,660],[240,620],[290,700],[250,800],[160,760]]] } } },
    'jovem': { '01-idle': { intensity: 0.5, regions: {
        dorso: [[[400,540],[620,500],[720,540],[700,660],[560,770],[420,790],[330,690]]],
        peito: [[[720,540],[850,560],[860,700],[810,860],[660,900],[520,880],[600,740]]],
        cauda: [[[50,720],[200,690],[290,720],[290,850],[200,880],[90,860]]] } } },
    'topo': {
      '01-idle': { regions: {
        dorso: [[[690,470],[880,470],[900,540],[880,640],[780,720],[640,690],[620,560]]],
        peito: [[[880,430],[1040,500],[1060,640],[1000,780],[960,900],[840,950],[700,940],[690,820],[780,720],[880,640]]],
        cauda: [[[160,600],[300,490],[440,485],[540,540],[560,640],[500,760],[460,870],[330,980],[210,900],[160,760]]] },
        head: { rect: [810,0,200,300], pivot: [860,300] } },
      '02-guarda-defensiva': { regions: {
        dorso: [[[640,470],[820,400],[1000,390],[1090,320],[1180,330],[1220,420],[1200,560],[1050,700],[850,740],[720,640]]],
        peito: [[[560,700],[780,720],[900,760],[950,800],[880,870],[740,880],[600,860],[520,790]]],
        cauda: [[[80,590],[300,520],[450,540],[490,600],[470,720],[440,820],[300,880],[230,940],[120,830]]] } },
      '03-ataque-basico-preparo': { regions: {
        dorso: [[[560,320],[900,310],[950,380],[930,500],[760,540],[600,470]]],
        peito: [[[930,390],[1130,340],[1150,450],[1060,560],[900,600],[760,640],[620,650],[700,560],[930,500]]],
        cauda: [[[40,460],[170,300],[350,270],[470,330],[520,420],[520,560],[430,680],[300,760],[130,720],[50,620]]] },
        head: { rect: [1150,50,230,270], pivot: [1160,300] } },
      '04-ataque-basico-impacto': { regions: {
        dorso: [[[210,140],[350,40],[520,110],[620,300],[640,500],[520,610],[380,560],[240,380]]],
        peito: [[[640,540],[900,580],[920,700],[840,800],[640,830],[500,860],[450,800],[560,700]]],
        cauda: [[[40,640],[230,570],[420,610],[470,700],[420,820],[320,920],[190,900],[60,800]]] },
        head: { rect: [960,230,200,240], pivot: [990,470] } },
      '05-passo-terreiro-preparo': { regions: {
        dorso: [[[600,500],[860,490],[880,580],[840,690],[700,730],[590,690]]],
        peito: [[[880,440],[1000,520],[1010,640],[930,760],[860,830],[720,860],[650,900],[660,780],[720,730],[860,700]]],
        cauda: [[[150,690],[280,560],[420,530],[520,580],[560,670],[500,790],[400,870],[310,930],[170,780]]] },
        head: { rect: [800,40,190,260], pivot: [860,300] } },
      '06-passo-terreiro-impacto': { regions: {
        dorso: [[[600,520],[850,510],[890,590],[860,700],[740,790],[600,780],[560,680]]],
        peito: [[[890,470],[1030,560],[1030,720],[960,840],[890,1010],[810,1010],[780,860],[700,820],[850,740]]],
        cauda: [[[40,600],[210,470],[400,460],[510,550],[520,650],[480,800],[400,940],[260,960],[100,800]]] },
        head: { rect: [790,40,200,220], pivot: [850,270] } },
      '07-asa-fantasma-preparo': { regions: {
        dorso: [[[600,500],[880,480],[900,570],[850,700],[700,780],[600,800],[580,650]]],
        peito: [[[890,440],[1050,520],[1070,660],[990,780],[930,920],[840,930],[830,830],[740,760],[880,700]]],
        cauda: [[[170,570],[300,540],[440,540],[540,620],[540,740],[490,840],[400,920],[320,970],[200,880],[170,740]]] },
        head: { rect: [860,20,180,290], pivot: [900,300] } },
      '08-asa-fantasma-impacto': { regions: {
        dorso: [[[510,470],[650,470],[850,470],[1000,380],[1120,250],[1130,420],[1050,560],[900,650],[700,680],[540,640]]],
        peito: [[[420,720],[700,730],[720,860],[660,960],[560,1000],[430,980],[400,880]]],
        cauda: [[[30,700],[150,600],[300,610],[360,680],[350,800],[320,900],[200,980],[70,900]]] },
        head: { rect: [570,90,170,240], pivot: [640,330] } },
      '09-rei-poleiro-preparo': { regions: {
        dorso: [[[40,400],[200,290],[380,310],[560,420],[590,560],[540,640],[360,700],[160,640],[50,540]],[[880,480],[960,490],[1010,620],[990,800],[900,810],[870,650]],[[700,470],[860,470],[890,620],[840,720],[680,700]]],
        peito: [[[520,720],[860,720],[840,900],[800,1050],[700,1110],[540,1090],[500,900]]],
        cauda: [[[50,760],[250,740],[400,800],[440,900],[420,1040],[320,1150],[200,1200],[90,1050],[50,900]]] },
        head: { rect: [670,10,190,260], pivot: [740,270] } },
      '10-rei-poleiro-impacto': { regions: {
        dorso: [[[30,80],[200,20],[380,120],[520,300],[560,480],[520,660],[350,720],[180,600],[30,300]],[[890,380],[990,400],[1010,650],[900,800]],[[620,460],[880,470],[930,600],[860,720],[700,740],[600,620]]],
        peito: [[[560,760],[860,770],[860,900],[800,1040],[700,1080],[560,1090],[540,900]]],
        cauda: [[[20,780],[250,740],[430,810],[470,940],[430,1080],[330,1230],[220,1290],[70,1120],[30,900]]] },
        head: { rect: [670,30,220,240], pivot: [740,270] } },
      '11-olhar-milho-preparo': { regions: {
        dorso: [[[500,470],[820,470],[880,560],[840,680],[700,760],[540,760],[480,640]]],
        peito: [[[840,470],[990,560],[990,700],[900,800],[880,900],[790,980],[640,1050],[520,1060],[500,900],[520,800],[700,760],[860,680]]],
        cauda: [[[30,560],[200,420],[380,420],[470,520],[500,650],[470,820],[420,980],[330,1080],[180,1000],[60,850],[30,700]]] },
        head: { rect: [850,120,170,220], pivot: [880,340] } },
      '12-olhar-milho-impacto': { regions: {
        dorso: [[[470,340],[700,320],[930,330],[950,420],[880,500],[680,540],[520,520]]],
        peito: [[[500,540],[700,560],[980,540],[1060,470],[1090,580],[1000,650],[820,730],[600,710],[480,640]]],
        cauda: [[[140,180],[300,20],[500,60],[620,200],[640,330],[560,470],[440,600],[300,690],[180,560],[140,350]]] },
        head: { rect: [1240,190,200,220], pivot: [1250,410] } },
      '13-coco-combo-preparo': { regions: {
        dorso: [[[20,300],[200,260],[380,300],[560,420],[620,560],[580,640],[440,600],[240,540],[80,470]],[[640,480],[880,470],[960,580],[950,690],[800,760],[660,700],[640,580]]],
        peito: [[[640,700],[940,700],[930,860],[820,960],[640,1060],[500,1130],[480,980],[560,860]]],
        cauda: [[[10,620],[250,590],[400,680],[470,800],[430,940],[350,1080],[260,1180],[160,1200],[50,1000],[10,820]]] },
        head: { rect: [850,190,170,220], pivot: [870,410] } },
      '14-coco-combo-impacto': { regions: {
        dorso: [[[10,180],[210,60],[380,100],[510,260],[520,420],[450,540],[300,480],[150,400],[20,320]],[[470,440],[780,480],[900,570],[780,700],[600,730],[480,640]]],
        peito: [[[470,770],[720,780],[800,850],[700,950],[600,1050],[420,1080],[400,960]]],
        cauda: [[[10,610],[250,540],[400,620],[440,720],[420,860],[320,1000],[200,1130],[60,960],[10,760]]] } },
      '15-bicada-filosofica-preparo': { regions: {
        dorso: [[[540,480],[860,450],[880,560],[860,700],[700,790],[520,780],[490,640]]],
        peito: [[[880,440],[1010,520],[1010,700],[930,830],[860,940],[780,1050],[660,1070],[540,1050],[520,900],[540,800],[700,780],[860,700]]],
        cauda: [[[20,400],[200,280],[400,300],[480,420],[500,560],[460,760],[400,940],[300,1060],[120,1000],[40,780],[20,560]]] },
        head: { rect: [820,10,200,230], pivot: [850,240] } },
      '16-bicada-filosofica-impacto': { regions: {
        dorso: [[[240,560],[560,590],[680,690],[650,830],[500,930],[300,900],[150,800],[150,700]]],
        peito: [[[160,900],[420,920],[620,940],[640,1040],[440,1000],[300,1060],[190,1080],[140,980]]],
        cauda: [[[10,140],[200,70],[400,190],[470,330],[420,480],[300,540],[150,520],[40,400]]] } },
      '17-reacao-golpe': { regions: {
        dorso: [[[520,400],[820,360],[890,440],[870,560],[760,680],[600,700],[520,560]]],
        peito: [[[880,440],[1030,500],[1050,640],[990,760],[960,880],[880,930],[700,900],[640,860],[760,740],[880,690]]],
        cauda: [[[130,590],[300,540],[440,590],[520,650],[520,800],[430,910],[300,1040],[180,900],[130,730]]] },
        head: { rect: [920,30,200,300], pivot: [960,340] } },
      '18-nocaute': { regions: {
        dorso: [[[440,380],[700,380],[930,420],[1000,520],[930,620],[700,640],[480,590]]],
        peito: [[[520,660],[720,720],[1000,760],[1080,720],[1020,810],[760,800],[560,790],[480,700]]],
        cauda: [[[10,220],[200,60],[400,80],[560,180],[620,330],[560,430],[400,500],[200,540],[60,460]]] },
        head: { rect: [1230,600,290,230], pivot: [1230,720] } },
      '19-vitoria': { regions: {
        dorso: [[[730,300],[820,50],[930,110],[1010,300],[1000,560],[900,720],[840,800],[760,720],[730,500]],[[400,660],[640,620],[700,720],[620,900],[420,960],[380,800]]],
        peito: [[[640,700],[800,720],[820,900],[780,1040],[700,1170],[560,1180],[470,1100],[550,940],[640,860]]],
        cauda: [[[20,860],[120,760],[280,720],[380,800],[400,900],[380,1030],[300,1200],[190,1270],[70,1130],[30,1000]]] },
        head: { rect: [510,140,200,200], pivot: [590,360] } },
      '20-derrota': { regions: {
        dorso: [[[440,470],[700,450],[900,480],[950,560],[900,650],[700,700],[480,700]]],
        peito: [[[720,700],[960,590],[1020,680],[1000,780],[900,880],[760,900],[620,880],[600,800],[700,730]]],
        cauda: [[[10,250],[100,80],[300,20],[480,120],[560,260],[540,400],[450,520],[400,700],[300,880],[130,780],[40,600],[10,420]]] },
        head: { rect: [1170,590,200,220], pivot: [1170,700] } },
    },
    'padrao-comum-ereta': {
      '01-idle': {
        regions: {
          dorso: [[[610, 380], [890, 400], [900, 500], [840, 630], [700, 660], [590, 560], [570, 450]]],
          peito: [[[560, 610], [830, 630], [840, 790], [770, 900], [610, 900], [530, 760]]],
          cauda: [[[240, 480], [560, 540], [560, 640], [430, 800], [260, 900], [160, 700]]],
        },
        head: { rect: [700, 20, 300, 320], pivot: [770, 330] },
      },
      '02-guarda-defensiva': {
        regions: {
          dorso: [[[560, 400], [930, 395], [1010, 345], [1150, 300], [1190, 420], [1130, 650], [900, 730], [700, 700], [540, 600]]],
          peito: [[[520, 690], [900, 700], [925, 790], [840, 850], [560, 850], [500, 780]]],
          cauda: [[[90, 510], [420, 505], [500, 580], [500, 780], [400, 800], [250, 900], [100, 790]]],
        },
      },
      '03-ataque-basico-preparo': {
        regions: {
          dorso: [[[520, 470], [780, 405], [830, 450], [810, 600], [620, 640], [450, 600]]],
          peito: [[[840, 460], [1000, 480], [990, 600], [880, 700], [790, 740], [640, 790], [540, 740], [620, 650], [810, 610]]],
          cauda: [[[60, 480], [330, 410], [440, 470], [440, 600], [420, 740], [330, 800], [150, 760], [50, 600]]],
        },
        head: { rect: [980, 190, 240, 220], pivot: [1010, 400] },
      },
      '04-ataque-basico-impacto': {
        regions: {
          dorso: [
            [[210, 90], [420, 50], [600, 180], [700, 420], [520, 620], [380, 540], [220, 300]],
            [[600, 520], [900, 470], [1000, 540], [900, 600], [600, 640]],
          ],
          peito: [[[520, 640], [880, 610], [940, 680], [860, 790], [700, 790], [480, 870], [440, 820], [480, 730]]],
          cauda: [[[50, 570], [300, 560], [430, 620], [400, 700], [380, 830], [250, 890], [110, 820], [50, 720]]],
        },
        head: { rect: [960, 230, 220, 240], pivot: [980, 470] },
      },
      '05-passo-terreiro-preparo': {
        regions: {
          dorso: [[[600, 470], [800, 450], [850, 510], [830, 620], [650, 700], [560, 720], [550, 620]]],
          peito: [[[840, 480], [945, 495], [960, 590], [900, 690], [810, 745], [690, 790], [665, 875], [640, 800], [650, 720], [770, 690]]],
          cauda: [[[160, 510], [440, 500], [540, 570], [560, 700], [540, 800], [430, 830], [300, 850], [190, 760], [150, 620]]],
        },
        head: { rect: [810, 60, 190, 210], pivot: [810, 280] },
      },
      '06-passo-terreiro-impacto': {
        regions: {
          dorso: [[[640, 470], [880, 450], [900, 540], [860, 650], [700, 720], [600, 700], [600, 560]]],
          peito: [[[890, 470], [985, 545], [975, 690], [890, 770], [850, 920], [790, 925], [720, 760], [840, 700]]],
          cauda: [[[170, 520], [450, 510], [540, 580], [560, 700], [520, 790], [380, 830], [280, 810], [180, 690]]],
        },
        head: { rect: [750, 60, 200, 190], pivot: [800, 270] },
      },
      '07-asa-fantasma-preparo': {
        regions: {
          dorso: [[[620, 440], [800, 430], [830, 500], [800, 620], [640, 700], [520, 700], [560, 560]]],
          peito: [[[830, 480], [950, 500], [960, 620], [880, 740], [800, 800], [700, 830], [580, 860], [540, 800], [600, 740], [700, 700], [820, 620]]],
          cauda: [[[180, 520], [430, 520], [560, 560], [520, 680], [500, 780], [400, 810], [260, 800], [170, 680]]],
        },
        head: { rect: [880, 100, 190, 210], pivot: [900, 310] },
      },
      '08-asa-fantasma-impacto': {
        regions: {
          dorso: [[[540, 420], [900, 390], [1010, 330], [1080, 240], [1110, 340], [1050, 440], [950, 540], [800, 620], [620, 640], [520, 560]]],
          peito: [[[500, 620], [700, 650], [720, 760], [640, 860], [560, 880], [440, 860], [420, 760], [470, 690]]],
          cauda: [[[90, 600], [330, 590], [400, 640], [400, 740], [380, 840], [250, 880], [150, 790]]],
        },
        head: { rect: [600, 70, 200, 200], pivot: [650, 280] },
      },
      '09-rei-poleiro-preparo': {
        regions: {
          dorso: [
            [[240, 300], [420, 320], [560, 420], [600, 520], [520, 700], [330, 760], [150, 650], [40, 580], [60, 480]],
            [[610, 420], [820, 400], [870, 520], [860, 650], [700, 700], [600, 600]],
          ],
          peito: [[[540, 720], [850, 700], [820, 900], [780, 1050], [660, 1100], [560, 1080], [520, 900]]],
          cauda: [[[50, 760], [320, 740], [420, 790], [440, 880], [400, 1020], [300, 1140], [190, 1210], [80, 1000], [50, 880]]],
        },
        head: { rect: [560, 0, 280, 260], pivot: [630, 250] },
      },
      '10-rei-poleiro-impacto': {
        regions: {
          dorso: [
            [[100, 60], [330, 120], [520, 260], [620, 400], [600, 560], [480, 740], [300, 700], [130, 600], [20, 300]],
            [[620, 430], [850, 400], [880, 540], [860, 650], [700, 700]],
          ],
          peito: [[[540, 720], [850, 720], [860, 860], [780, 1020], [690, 1040], [560, 1050], [540, 900]]],
          cauda: [[[40, 780], [300, 750], [430, 800], [440, 900], [400, 1050], [300, 1200], [200, 1270], [60, 1100], [40, 900]]],
        },
        head: { rect: [600, 0, 260, 230], pivot: [660, 240] },
      },
      '11-olhar-milho-preparo': {
        regions: {
          dorso: [[[520, 440], [800, 440], [880, 520], [900, 620], [780, 760], [560, 800], [500, 700]]],
          peito: [[[520, 800], [800, 780], [820, 900], [780, 990], [650, 1050], [480, 1060], [480, 900]]],
          cauda: [[[30, 560], [250, 430], [380, 500], [450, 600], [430, 760], [380, 920], [300, 1080], [200, 1110], [60, 900], [20, 700]]],
        },
        head: { rect: [830, 140, 190, 200], pivot: [850, 340] },
      },
      '12-olhar-milho-impacto': {
        regions: {
          dorso: [[[420, 640], [600, 640], [640, 740], [600, 860], [420, 890], [300, 800], [330, 700]]],
          peito: [[[430, 880], [700, 820], [740, 930], [660, 1010], [500, 1080], [350, 1020], [250, 940]]],
          cauda: [[[10, 380], [200, 330], [340, 400], [400, 560], [360, 760], [300, 900], [120, 960], [10, 850]]],
        },
        head: { rect: [850, 520, 174, 260], pivot: [860, 740] },
      },
      '13-coco-combo-preparo': {
        regions: {
          dorso: [
            [[30, 300], [250, 240], [420, 300], [590, 400], [620, 540], [550, 640], [350, 570], [180, 470], [20, 380]],
            [[640, 440], [880, 420], [960, 560], [940, 700], [780, 780], [640, 700], [620, 560]],
          ],
          peito: [[[640, 700], [940, 700], [900, 850], [820, 960], [520, 1040], [450, 1080], [480, 900]]],
          cauda: [[[20, 560], [300, 540], [400, 620], [500, 780], [480, 900], [400, 1010], [300, 1100], [200, 1190], [60, 1000], [20, 780]]],
        },
        head: { rect: [830, 150, 194, 230], pivot: [860, 350] },
      },
      '14-coco-combo-impacto': {
        regions: {
          dorso: [
            [[20, 150], [220, 60], [400, 130], [500, 300], [490, 480], [350, 540], [200, 420], [60, 350]],
            [[500, 430], [760, 470], [800, 560], [720, 700], [560, 740], [470, 600]],
          ],
          peito: [[[470, 760], [760, 730], [800, 830], [760, 900], [600, 990], [420, 1070], [400, 900]]],
          cauda: [[[10, 560], [250, 540], [400, 610], [440, 700], [420, 820], [330, 960], [200, 1100], [60, 900], [20, 700]]],
        },
      },
      '15-bicada-filosofica-preparo': {
        regions: {
          dorso: [[[520, 470], [840, 430], [890, 520], [870, 680], [720, 780], [540, 840], [470, 700]]],
          peito: [[[880, 430], [1000, 520], [1000, 700], [900, 830], [820, 1000], [700, 1060], [560, 1070], [500, 960], [540, 860]]],
          cauda: [[[20, 300], [250, 280], [420, 380], [470, 520], [430, 700], [380, 900], [300, 1050], [180, 1110], [60, 900], [20, 600]]],
        },
        head: { rect: [800, 30, 220, 250], pivot: [830, 260] },
      },
      '16-bicada-filosofica-impacto': {
        regions: {
          dorso: [[[300, 600], [560, 600], [700, 680], [650, 800], [520, 930], [320, 930], [170, 830], [200, 700]]],
          peito: [[[190, 930], [440, 920], [620, 960], [680, 1100], [420, 1000], [340, 1060], [200, 1080]]],
          cauda: [[[10, 220], [250, 110], [420, 220], [430, 420], [360, 600], [240, 700], [120, 700], [20, 500]]],
        },
      },
      '17-reacao-golpe': {
        regions: {
          dorso: [[[520, 460], [800, 390], [850, 470], [820, 600], [700, 680], [560, 650]]],
          peito: [[[850, 480], [990, 480], [990, 620], [930, 740], [880, 860], [760, 870], [650, 880], [640, 780], [700, 680], [820, 600]]],
          cauda: [[[190, 560], [480, 580], [520, 650], [520, 780], [400, 860], [300, 880], [200, 760]]],
        },
        head: { rect: [890, 60, 220, 270], pivot: [930, 320] },
      },
      '18-nocaute': {
        regions: {
          dorso: [[[330, 520], [600, 510], [780, 600], [800, 700], [650, 780], [440, 700], [340, 620]]],
          peito: [[[420, 720], [800, 760], [1000, 720], [1000, 830], [850, 870], [560, 850], [440, 830]]],
          cauda: [[[40, 300], [300, 300], [440, 400], [460, 480], [420, 600], [330, 690], [130, 650], [50, 500]]],
        },
        head: { rect: [1000, 700, 230, 200], pivot: [1000, 790] },
      },
      '19-vitoria': {
        regions: {
          dorso: [
            [[850, 380], [930, 180], [1030, 30], [1150, 120], [1170, 280], [1100, 440], [1000, 600], [900, 640]],
            [[560, 500], [720, 470], [780, 540], [760, 660], [640, 700], [510, 650]],
          ],
          peito: [[[760, 480], [890, 500], [900, 640], [870, 760], [790, 860], [700, 900], [580, 890], [560, 800], [620, 700], [720, 640]]],
          cauda: [[[210, 600], [400, 590], [480, 620], [490, 760], [430, 860], [300, 890], [220, 780]]],
        },
        head: { rect: [680, 60, 200, 230], pivot: [730, 300] },
      },
      '20-derrota': {
        regions: {
          dorso: [[[520, 380], [800, 340], [900, 420], [860, 520], [700, 620], [520, 700], [490, 540]]],
          peito: [[[860, 480], [930, 500], [930, 650], [840, 760], [760, 830], [680, 840], [560, 850], [540, 780], [620, 700], [760, 600]]],
          cauda: [[[190, 580], [400, 540], [480, 600], [470, 720], [420, 800], [330, 900], [210, 850], [180, 700]]],
        },
        head: { rect: [960, 340, 220, 200], pivot: [960, 400] },
      },
    },
  };
  function bodyKeyFor(spriteId) {
    // 'padrao-comum-ereta-01-idle' -> bodyKey 'padrao-comum-ereta', pose '01-idle'.
    const m = /^(.*)-(\d{2}-.+)$/.exec(spriteId);
    return m ? { bodyKey: m[1], pose: m[2] } : null;
  }

  function supports(spriteId) {
    const parsed = bodyKeyFor(spriteId);
    return !!(parsed && MASKS[parsed.bodyKey] && MASKS[parsed.bodyKey][parsed.pose]);
  }

  function polygonMask(w, h, alphaData, polygons) {
    const shape = document.createElement('canvas');
    shape.width = w; shape.height = h;
    const sctx = shape.getContext('2d');
    sctx.fillStyle = '#fff';
    for (const points of polygons) {
      sctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y)));
      sctx.closePath();
      sctx.fill();
    }
    const shapeData = sctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (shapeData[i * 4 + 3] > 20 && alphaData[i * 4 + 3] > 20) mask[i] = 255;
    return mask;
  }

  function recolorRegion(ctx, w, h, mask, targetHex, intensity = 0.85) {
    const [tr, tg, tb] = V.hexToRgb(targetHex);
    const [th, ts] = V.rgbToHsl(tr, tg, tb);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      const strength = (mask[i] / 255) * intensity;
      const pi = i * 4;
      const [, , l] = V.rgbToHsl(px[pi], px[pi + 1], px[pi + 2]);
      const [nr, ng, nb] = V.hslToRgb(th, ts, l);
      px[pi] = px[pi] * (1 - strength) + nr * strength;
      px[pi + 1] = px[pi + 1] * (1 - strength) + ng * strength;
      px[pi + 2] = px[pi + 2] * (1 - strength) + nb * strength;
    }
    ctx.putImageData(data, 0, 0);
  }

  function blendSpots(ctx, w, h, mask, colorHex) {
    const [r, g, b] = V.hexToRgb(colorHex);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      const a = mask[i] / 255;
      const pi = i * 4;
      px[pi] = px[pi] * (1 - a) + r * a;
      px[pi + 1] = px[pi + 1] * (1 - a) + g * a;
      px[pi + 2] = px[pi + 2] * (1 - a) + b * a;
    }
    ctx.putImageData(data, 0, 0);
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function patternMask(w, h, baseMask, seed, count, style) {
    const rng = mulberry32(seed);
    const mask = new Uint8Array(w * h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (baseMask[y * w + x]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (maxX < minX) return mask;
    for (let s = 0; s < count; s++) {
      const cx = minX + rng() * (maxX - minX);
      const cy = minY + rng() * (maxY - minY);
      let rx, ry;
      if (style === 'carijo') { rx = 4 + rng() * 5; ry = rx * (0.85 + rng() * 0.3); }
      else { rx = 10 + rng() * 22; ry = rx * (0.6 + rng() * 0.5); }
      const rot = rng() * Math.PI;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      for (let y = Math.max(0, cy - rx - ry); y < Math.min(h, cy + rx + ry); y++) {
        for (let x = Math.max(0, cx - rx - ry); x < Math.min(w, cx + rx + ry); x++) {
          const i = Math.floor(y) * w + Math.floor(x);
          if (!baseMask[i]) continue;
          const dx = x - cx, dy = y - cy;
          const localX = dx * cosR + dy * sinR, localY = -dx * sinR + dy * cosR;
          const d = Math.hypot(localX / rx, localY / ry);
          if (d > 1) continue;
          const strength = Math.round((1 - d) * 255);
          mask[i] = Math.max(mask[i], strength);
        }
      }
    }
    return mask;
  }

  function featherEllipse(w, h, margin) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const fx = c.getContext('2d');
    fx.filter = 'blur(18px)';
    fx.fillStyle = '#fff';
    fx.beginPath();
    fx.ellipse(w / 2, h / 2, w / 2 - margin, h / 2 - margin, 0, 0, Math.PI * 2);
    fx.fill();
    return c;
  }

  function applyHeadTilt(ctx, headCfg, angleDeg) {
    if (!headCfg || !angleDeg) return;
    const [rx, ry, rw, rh] = headCfg.rect;
    const [px, py] = headCfg.pivot;
    const crop = document.createElement('canvas');
    crop.width = rw; crop.height = rh;
    const cctx = crop.getContext('2d');
    cctx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, rw, rh);
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(featherEllipse(rw, rh, 14), 0, 0);
    cctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(featherEllipse(rw, rh, 14), rx, ry);
    ctx.restore();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angleDeg * Math.PI / 180);
    ctx.translate(-px, -py);
    ctx.drawImage(crop, rx, ry);
    ctx.restore();
  }

  const cache = new Map();
  const MAX_CACHE = 200;

  function dnaKey(dna) {
    const p = dna.pattern;
    return [dna.colors.dorso, dna.colors.peito, dna.colors.cauda, p ? p.type + p.seed + p.count + p.spot : '-', dna.heightScale.toFixed(2), dna.bulkScale.toFixed(2), dna.headTilt.toFixed(1)].join('|');
  }

  // Compoe a imagem-base ja recolorida (sem escala de porte ainda - isso e
  // aplicado no draw() final, ancorado por altura de destino).
  function buildRecolored(spriteId, dna) {
    const parsed = bodyKeyFor(spriteId);
    const cfg = MASKS[parsed.bodyKey][parsed.pose];
    const frame = FightArt.frame(spriteId);
    const img = frame.image;
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const alphaData = ctx.getImageData(0, 0, w, h).data;
    const masks = {};
    for (const region of V.REGIONS) masks[region] = polygonMask(w, h, alphaData, cfg.regions[region]);
    for (const region of V.REGIONS) recolorRegion(ctx, w, h, masks[region], dna.colors[region], cfg.intensity ?? 0.85);
    if (dna.pattern) {
      const spots = patternMask(w, h, masks.peito, dna.pattern.seed, dna.pattern.count, dna.pattern.type);
      blendSpots(ctx, w, h, spots, dna.pattern.spot);
    }
    if (dna.headTilt) applyHeadTilt(ctx, cfg.head, dna.headTilt);
    return c;
  }

  function getRecolored(spriteId, dna) {
    const key = spriteId + '::' + dnaKey(dna);
    if (cache.has(key)) return cache.get(key);
    const canvas = buildRecolored(spriteId, dna);
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, canvas);
    return canvas;
  }

  // Desenha animal.visualDna aplicado ao spriteId, centrado em (x,y) com
  // altura alvo `height` (mesma assinatura de FightArt.draw). Retorna false
  // se essa pose/anatomia ainda nao tem mascara - quem chama deve cair pro
  // FightArt.draw normal nesse caso.
  function draw(ctx, animal, spriteId, x, y, height) {
    if (!animal?.visualDna || !supports(spriteId)) return false;
    const frame = FightArt.frame(spriteId);
    if (!frame) return false;
    let dna = animal.visualDna;
    // Galinha comum nao tem cauda azul-petroleo: herdando a anatomia topo, usa a cor do dorso.
    if (dna.bodyType === 'topo' && spriteId.startsWith('galinha')) dna = { ...dna, colors: { ...dna.colors, cauda: dna.colors.dorso } };
    const recolored = getRecolored(spriteId, dna);
    const box = frame.box; // bbox nao muda: recolorir/manchas nao alteram alpha
    const finalHeight = height * dna.heightScale * FightArt.scaleFor(spriteId);
    const width = (box[2] * finalHeight) / box[3] * dna.bulkScale;
    ctx.drawImage(recolored, ...box, x - width / 2, y - finalHeight, width, finalHeight);
    return true;
  }

  // Tenta o DNA visual; se a pose/anatomia nao tem mascara, desenha o sprite normal.
  function drawOrArt(ctx, animal, spriteId, x, y, height) {
    if (!draw(ctx, animal, spriteId, x, y, height)) FightArt.draw(ctx, spriteId, x, y, height);
  }

  // Pre-compoe as 20 poses do galo aos poucos (uma por tick), pra a primeira
  // vez que cada pose aparece na luta ja estar em cache e nao dar tranco (~70ms).
  const POSES = ['01-idle','02-guarda-defensiva','03-ataque-basico-preparo','04-ataque-basico-impacto','05-passo-terreiro-preparo','06-passo-terreiro-impacto','07-asa-fantasma-preparo','08-asa-fantasma-impacto','09-rei-poleiro-preparo','10-rei-poleiro-impacto','11-olhar-milho-preparo','12-olhar-milho-impacto','13-coco-combo-preparo','14-coco-combo-impacto','15-bicada-filosofica-preparo','16-bicada-filosofica-impacto','17-reacao-golpe','18-nocaute','19-vitoria','20-derrota'];
  function preload(animal) {
    if (!animal?.visualDna) return;
    FightArt.whenReady(() => {
      const keys = [...new Set(POSES.map(p => FightArt.spriteFor(animal, p)))].filter(k => supports(k) && FightArt.frame(k));
      const next = () => {
        const k = keys.shift();
        if (!k) return;
        getRecolored(k, animal.visualDna);
        setTimeout(next, 0);
      };
      setTimeout(next, 0);
    });
  }

  return { supports, draw, drawOrArt, preload };
})();
