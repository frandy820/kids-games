/* ================= ?verify=1 自检（仅 verify 分支加载执行；r16 独立第 4 script 块）
   ① 80 关全量审计（flat 0-79，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     词库域+三型域分源复算（REF_WORDS60/REF_MEANS/REF_WORDS 独立字面量——词属章、
     题型配比（q0 恒 listen+REF_TYPE_MIX 对账）、瓦片池约束（池可拼目标词、干扰数 2/3、
     互异、不在词字母集内、干扰组本身≠完整词、全池不 anagram 成另一同长完整词、
     b/d 同形翻转对）、missing 域（缺位数 1/2、升序互异、dch≤2 非首位、选项数 3/4、
     选项互异、含每空正确字母、干扰∉词字母集、b/d 翻转对）/
     拼接词 clip（sp_word_<word> 全 60 条）+释义 clip（sp_mean_<word> 全 60 条）在场/
     同关 8 词互异 / structOk
   ①b 引擎直驱三型：瓦片型非法/已用拒绝、拼满错=miss 恰一次、退回零计数、正确拼满推进；
     missing 非法下标/瓦片通道拒绝、错选项=miss、对选项逐空推进、末空=right；
     星级三档独立驱动（3 错=1★ / 1 错=2★ / 0 错=3★）
   ①c 救援目标闭环三型：rescueTarget（undo/tile/opt）步进执行收敛到拼对（right）
   ② tapTile 单元（flat0 真实 UI，listen q0）：入格 DOM 同步+退回复活+非法下标 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关 8 题（首题拼错一次+退回=1 错 2 星；关内三型全覆盖；
     verify 页不弹层；拼对后字母名跟读在场——sp_l_ clip 通道，T46）
   ④ UI 冒烟 B：flat16（ch3 辅音簇）全对通关 3 星+④b flat24（ch4）meaning 题释义卡/通道
   ⑤ 布局（竖屏三件套）：双 viewport（1280×800 横/800×1180 body.port）×（flat0/8/16/24）
     portStyle 判别锚=喇叭尺寸横 104/竖 96；瓦片/已拼格 ≥64、喇叭/提示 ≥96、按钮 ≥64、
     overflowX ≤0；⑤b flat0 逐题推进三型几何轮（missing 选项/meaning 释义卡，横+竖）
   ⑥ 分布与专项：VOICE 表 8 键文案独立字面量对账（SPEC 定稿）/ WORDS60+MEANS 双写对账 /
     WORDLIST 双写对账 / 191 条 clips（sp_ 8+sp_word_ 60+sp_mean_ 60+sp_l_ 60+core 3）clipOk /
     开场顺序链分型（listen=[sp_hint,sp_word_*] / missing=[sp_missing,sp_word_*] /
     meaning=[sp_mean,sp_mean_*] 单通道）/ 救援重播=单词 clip 通道 / 英文发音无 TTS 兜底
     （缺 clip=不播+false，play 无 text、say 无英文单词文本——§0.32）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 逐字母点选+真实拼对
     __spDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([sp_tut_turn, sp_word_*])
     → tut='help' 解锁
   ⑪ duration（r16 门禁）：80 关 modeled 硬断言——独立副本常量重列（禁引源模型：
     V_DECIDE/V_STEP/V_QUIZ/V_ENTER/V_STAGE/V_WORD_SAY/V_MIN/V_FACE）≥40000+最低值精确
     （防回漂）+与源模型 levelDurMs 逐关对账+DECIDE≥STAGE 恒真+源常量同步
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算字面量（与 game-data 分源双写；内容一致，笔误即 fail） ---- */
  const REF_WORDS60 = {
    1: ['cat', 'dog', 'sun', 'hat', 'map', 'bed', 'pig', 'bus',
        'cake', 'make', 'bike', 'kite', 'home', 'nose', 'rope'],
    2: ['lake', 'gate', 'name', 'game', 'five', 'nine', 'time', 'bone',
        'rose', 'cute', 'wave', 'ride', 'note', 'rice', 'safe'],
    3: ['fish', 'tree', 'star', 'frog', 'milk', 'grass', 'bread', 'black',
        'green', 'snake', 'brush', 'sleep', 'cloud', 'plant', 'small'],
    4: ['apple', 'tiger', 'water', 'happy', 'pencil', 'orange', 'yellow', 'rabbit',
        'flower', 'monkey', 'seven', 'paper', 'sister', 'robot', 'garden']
  };
  const REF_MEANS = {
    cat: '小猫', dog: '小狗', sun: '太阳', hat: '帽子', map: '地图', bed: '床',
    pig: '小猪', bus: '公共汽车', cake: '蛋糕', make: '制作', bike: '自行车',
    kite: '风筝', home: '家', nose: '鼻子', rope: '绳子',
    lake: '湖', gate: '大门', name: '名字', game: '游戏', five: '五', nine: '九',
    time: '时间', bone: '骨头', rose: '玫瑰', cute: '可爱', wave: '波浪',
    ride: '骑', note: '笔记', rice: '米饭', safe: '安全',
    fish: '鱼', tree: '树', star: '星星', frog: '青蛙', milk: '牛奶', grass: '草',
    bread: '面包', black: '黑色', green: '绿色', snake: '蛇', brush: '刷子',
    sleep: '睡觉', cloud: '云', plant: '植物', small: '小的',
    apple: '苹果', tiger: '老虎', water: '水', happy: '开心的', pencil: '铅笔',
    orange: '橙子', yellow: '黄色', rabbit: '兔子', flower: '花', monkey: '猴子',
    seven: '七', paper: '纸', sister: '姐妹', robot: '机器人', garden: '花园'
  };
  /* r16 题型配比真值（后 7 题；q0 恒 listen=教学演示固定听音拼词范式） */
  const REF_TYPE_MIX = {
    1: { listen: 4, missing: 2, meaning: 1 },
    2: { listen: 3, missing: 2, meaning: 2 },
    3: { listen: 2, missing: 2, meaning: 3 },
    4: { listen: 1, missing: 2, meaning: 4 }
  };
  const REF_WORDS = ('ad ah am an as at be by do go he hi if in is it me my no of oh ok or so to up us we ' +
    'ace act add age aim air and ant any ape arm art ash ask bad bag ban bar bat bay bed bee beg bet big bin bit bow box boy bud bug bus but buy cab can cap car cat cob cog con cop cot cow coy cry cub cue cup cut dab dad dam day den dew dig dim dip dog dot dry dug duo dye ear eat eel egg elf elk emu end era eve ewe eye fan far fat fax fee few fig fin fit fix fly foe fog for fox fun fur gag gap gas gel gem get gig gin got gum gun guy gym had ham has hat hay hem hen her hew hex hid him hip his hit hog hot how hug hum hut ice icy ill imp ink inn its ivy jab jam jar jaw jay jet job jog joy jug key kid kit lab lad lag lap law lax lay led leg let lid lie lip lit log lot low lug mad man map mar mat may men met mid mix mob mom mop mud mug nab nap net new nip nod nor not now nun nut oar oat odd off oil old one orb ore our out owl own pad pal pan paw pay pea pen pet pie pig pin pit ply pod pot pry pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod row rub rug rum run rye sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob son sow soy spa spy sub sum sun tab tag tan tap tar tax tea ten the tie tin tip toe ton too top tow toy try tub tug two use van vat vet vow wad wag war was wax way web wed wet who why wig win wit woe wok won wow yak yam yap yes yet you zap zip zoo ' +
    'able acid aide army aunt away baby back bake ball band bank barn base bath bean bear beat beef bell belt bend best bike bird bite blue boat body boil bone book boot bore born boss both bowl brow buck bulb burn bush busy cage cake calf call calm came camp cane cape card care carp cart case cash cast cave cell cent chat chef chin chip chop city clad clam clan clap claw clay clip club clue coal coat code coin cold colt comb come cook cool copy cord core cork corn cost crab cram crew crib crop crow cube curb cure curl dark dart dash date dawn dead deaf deal dear debt deck deed deep deer dent desk dial dice diet dirt dish dive dock doll dome done door dose dove down drag draw drew drip drop drum duck dull dust duty each earn ease east easy edge even evil exit face fact fade fail fair fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish fist five flag flat flee flew flip flow foam fold folk food fool foot fork form fort four free frog from fuel full fund gain game gate gave gear gift girl give glad glow glue goal goat goes gold golf gone good gown grab gram gray grew grid grim grin grip grow gulf hair half hall hand hang hard harm hate haul have hawk head heal heap hear heat heel held help herb herd here hero hers hide high hike hill hint hive hold hole holy home hood hoof hook hoop hope horn host hour huge hung hunt hurt icon idea inch into iron item jail jazz jeep join joke jump just keen keep kick kind king kiss kite knee knew knot know lace lack lady laid lake lamb lamp land lane last late lawn lazy lead leaf leak lean leap left lend lens less lift like lime line link lion list live load loaf loan lock loft logo long look loop lord lose loss lost loud love luck lung made mail main make male mall mask mass mast mate meal mean meat meet melt menu mild mile milk mill mind mine mist mode mold mood moon more moss most moth move much mule must nail name navy near neat neck need nest news next nice nine none noon nose note oath obey pace pack page paid pain pair pale palm pane park part pass past path peak pear peel pest pick pile pine pink pipe plan play plea plot plow plug plum plus poem poet pole poll pond pony pool poor pork port pose post pour pray prey pull pump pure push quiz race rack raft rage raid rail rain rake ramp rang rank rare rate read real rest rice rich ride ring rise risk road rock rode role roll roof room root rope rose rude ruin rule rush rust safe said sail sake sale salt same sand save scan scar seal seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut side sign silk sing sink site size skin skip slam sled slid slim slip slot slow snap snow soap sock soda sofa soft soil sold sole solo some song soon sore sort soul soup sour span spar sped spin spot star stay stem step stew stir stop such suit sung sure surf swap swim tail take tale talk tall tame tape task taxi team tear tech tell tend tent term test text than that thaw them then they thin this thus tick tide tidy tied tile tilt time tiny tire toad toll tone tool tore torn toss tour town trap tray tree trim trio trip true tuba tube tuna tune turn tusk twin type ugly undo unit upon urge used vain vast veil vein verb very vest veto view visa void vote wait wake walk wall want ward warm warn wash wasp wave weak wear weed week weep well went were west what when wide wild will wind wine wing wink wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn year yell zero zone ' +
    'about above actor acute adapt after again agent agile agree ahead alarm album alert alike alive allow alone along aloud alpha amber amble amend among angel anger angry ankle annoy apart apple apply argue arise armor aroma array arrow aside asset attic audio avoid awake award aware awful bacon badge bagel baker basic basin batch beach beard beast began begin being belly below bench berry birth black blade blame blank blast blaze bleed bless blind blink block blood board boast bonus boost booth bound brain brake brand brave bread break brick bride brief bring broad brook broom brown brush build built bunch burst cabin cable candy canoe cargo carol carry carve catch cause chain chair chalk charm chart chase cheap check cheek cheer chess chest chief child chill china chose claim clash clasp class clean clear clerk click cliff climb cling clock close cloth cloud coach coast cocoa color comic coral couch could count court cover crack craft crane crash cream creek creep crest crime cross crowd crown crumb crush curve cycle daily dairy dance dealt decay delay delta dense depth devil diary digit diner dodge doing donor doubt dozen draft drain drama drank dream dress dried drift drill drink drive drone drove eager eagle early eaten eight elbow elder elect elite email empty enemy enjoy enter entry equal error essay event every exact exist extra fable faint fairy faith false fancy fault favor feast fence ferry fever fiber field fiery fifth fifty fight final first flame flash fleet flesh flint float flock flood floor flour fluid flute focus force forge forth forty forum found frame fraud fresh front frost frown fruit gauge ghost giant given glass globe glory glove goose grace grade grain grand grant grape graph grasp grass grave great greed green greet grief grill grind groan groom gross group guard guess guest guide guilt habit happy harsh haste hatch haunt heart heavy hello hence hinge hobby honey honor horse hotel hound house human humor hurry ideal image imply index inner input issue jelly jewel joint judge juice kneel knife knock known label labor large laser latch later laugh layer learn lease least leave legal lemon level lever light limit liver lobby lodge logic loose lucky lunar lunch macho magic major maker mango maple march match mayor medal media melon mercy merge merit meter midst might mimic minor minus model money month moral motor mount mouse mouth movie music naive nerve never night noble noise north novel nurse nylon oasis occur ocean offer often olive onion opera orbit order organ other otter ought ounce outer owner oxide ozone paint panel panic paper party pasta patch pause peace peach pearl pedal penny perch peril petal phase phone photo piano piece pilot pinch pitch pivot pixel pizza place plain plane plant plate plaza plead pluck plume plump point polar porch pouch pound power press price pride prime print prize probe prone proof proud prove pulse punch pupil puppy purse quack queen query quest queue quick quiet quill quilt quite quota quote radar radio raise rally ranch range rapid ratio reach react ready realm rebel refer reign relax relay reply reset resin rhyme ridge rifle right rigid rinse risky rival river roast robin robot rocky rogue rough round route royal rural salad salon salsa sandy sauce scale scarf scene scent scoop scope score scout scrap screw seize sense serve seven shade shaft shake shall shame shape share shark sharp shave sheep sheet shelf shell shift shine shiny shirt shock shore short shout sight silky since sixth skate skill skirt skull slate sleep slice slide slope small smart smile smoke snack snake sneak solar solid solve sonic sorry sound south space spare spark speak speed spell spend spice spicy spike spine spite split spoke spoon sport spray stack staff stage stain stair stake stamp stand stare start state steam steel steep stick stiff still sting stock stone stool storm story stove strap straw strip stuck study stuff stump style sugar suite sunny super sweat sweep sweet swell swift swing sword table taken talon tango taste teach teeth tempo tenor tense tenth thank theft their theme there these thick thief thigh thing think third thorn those three throw thumb tiger tight timer title toast today token torch total touch tough tower toxic trace track trade trail train trait tramp treat trend trial tribe trick troop trout truck truly trunk trust truth tulip tutor twice twist ultra uncle under union unite until upper upset urban usage usual vague valid value valve vapor vault venue verse video vigor villa viola viral virus visit vital vivid vocal vowel wagon waist waste watch water weary weave wedge weird whale wheat wheel where which while whisk white whole widow width world worth would wound woven wrist write wrong wrote yacht yeast yield young youth zebra ' +
    'cat dog sun hat map bed pig bus cake make bike kite home nose rope lake gate name game five nine time bone rose cute wave ride note rice safe fish tree star frog milk grass bread black green snake brush sleep cloud plant small apple tiger water happy pencil orange yellow rabbit flower monkey seven paper sister robot garden ' +
    'crate cater trace react cleat caste haste hates earth hater aunts units master stream teaser eater binder staple applets sorting' +
    '').trim().split(/\s+/);
  const REF_SET = {};
  REF_WORDS.forEach(w => { REF_SET[w] = true; });
  const REF_ANAGRAM = {};                        // 独立 anagram 索引（分源复算）
  REF_WORDS.forEach(w => {
    const k = w.split('').sort().join('');
    (REF_ANAGRAM[k] = REF_ANAGRAM[k] || []).push(w);
  });

  /* 词库域+三型域+干扰约束分源复算（禁复用生成器 WORDLIST/WORDSET/ANAG_INDEX 自证） */
  function refRangeOk(dch, q) {
    if (REF_WORDS60[dch].indexOf(q.word) < 0) return false;         // 词属章（60 词封闭域）
    if (!/^[a-z]{3,6}$/.test(q.word)) return false;
    if (q.type === 'missing') {
      const nB = dch <= 2 ? 1 : 2;
      if (q.blanks.length !== nB) return false;                     // 缺位数
      for (let k = 0; k < nB; k++) {
        const j = q.blanks[k];
        if (!(j >= 0 && j < q.word.length)) return false;
        if (dch <= 2 && j === 0) return false;                      // dch≤2 缺位非首位（保首字母线索）
        if (k > 0 && j <= q.blanks[k - 1]) return false;            // 升序互异
      }
      const nOpts = dch <= 2 ? 3 : 4;
      if (q.opts.length !== nOpts) return false;                    // 选项数
      if (q.opts.some((c, k) => q.opts.indexOf(c) !== k)) return false;  // 互异
      const uniq = [];
      for (const j of q.blanks) if (uniq.indexOf(q.word[j]) < 0) uniq.push(q.word[j]);
      if (!uniq.every(c => q.opts.indexOf(c) >= 0)) return false;   // 每空正确字母有选项
      if (q.opts.some(c => uniq.indexOf(c) < 0 && q.word.indexOf(c) >= 0)) return false;  // 干扰∉词字母集
      let must = null;                                              // b/d 同形翻转对（AUDIT-78 ④）
      if (uniq.indexOf('b') >= 0 && uniq.indexOf('d') < 0) must = 'd';
      else if (uniq.indexOf('d') >= 0 && uniq.indexOf('b') < 0) must = 'b';
      if (must && q.word.indexOf(must) < 0 && q.opts.indexOf(must) < 0) return false;
      return true;
    }
    if (q.type !== 'listen' && q.type !== 'meaning') return false;
    if (q.type === 'meaning' && q.mean !== REF_MEANS[q.word]) return false;   // 释义同源
    const cnt = {};
    q.tiles.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
    for (const c of q.word) { cnt[c] = (cnt[c] || 0) - 1; if (cnt[c] < 0) return false; }  // 池可拼目标词
    const dis = [];
    Object.keys(cnt).forEach(k => { for (let n = 0; n < cnt[k]; n++) dis.push(k); });
    if (dis.length !== (dch <= 2 ? 2 : 3)) return false;            // 干扰字母数（§2-r16 定版）
    if (dis.some(c => q.word.indexOf(c) >= 0)) return false;        // 干扰不在词字母集内
    if (dis.some((c, k) => dis.indexOf(c) !== k)) return false;     // 干扰互异
    if ((REF_ANAGRAM[dis.slice().sort().join('')] || []).length > 0) return false;  // 干扰组多重集=完整英文词
    const sig = q.tiles.slice().sort().join('');
    const hits = REF_ANAGRAM[sig] || [];
    if (hits.some(w => w !== q.word)) return false;                 // 全池 anagram 成另一同长完整词
    const has = {};                                                // b/d 同形翻转对（瓦片型）
    for (const c of q.word) has[c] = 1;
    const bd = (has.b && !has.d) ? 'd' : ((has.d && !has.b) ? 'b' : null);
    if (bd && dis.indexOf(bd) < 0) {                               // 缺席唯一正当路径=word+bd 拼成另一
      const hits2 = REF_ANAGRAM[(q.word + bd).split('').sort().join('')] || [];  // 完整词（如 ride+b=bride）——
      if (!hits2.some(w => w !== q.word)) return false;            // 池唯一性硬约束优先于 b/d 对
    }
    return true;
  }
  /* 拼满错点击计划（瓦片型）：首放干扰瓦片（其字母 ∉ 词 ⇒ 首格必错），余位任意填满 */
  function wrongPlan(q) {
    let d = -1;
    for (let i = 0; i < q.tiles.length; i++) {
      if (q.word.indexOf(q.tiles[i]) < 0) { d = i; break; }
    }
    if (d < 0) return null;
    const plan = [d];
    for (let i = 0; i < q.tiles.length && plan.length < q.word.length; i++) {
      if (i !== d) plan.push(i);
    }
    return plan;
  }
  /* missing 错选项索引（≠当前空正确字母的第一项） */
  function wrongOption(q) {
    for (let i = 0; i < q.opts.length; i++) {
      if (q.opts[i] !== q.word[q.blanks[q.cur]]) return i;
    }
    return -1;
  }
  const refSolveTap = (L, q) => {              // 依词逐字母点可用瓦片（引擎直驱，瓦片型）
    for (let j = 0; j < q.word.length; j++) {
      const i = q.tiles.findIndex((t, k) => !q._used[k] && t === q.word[j]);
      engTapTile(L, i);
    }
  };
  const refSolveOpt = (L, q) => {              // 逐空点正确选项（引擎直驱，missing）
    while (!q.solved) {
      const i = q.opts.indexOf(q.word[q.blanks[q.cur]]);
      if (i < 0 || engTapOption(L, i) === null) return false;
    }
    return true;
  };
  const refClearBuilt = (L, q) => {
    while (stepOf(q) > 0) {
      const j = q._bt.map(t => t >= 0).lastIndexOf(true);
      engTapBuilt(L, j);
    }
  };
  const refSolveQuiz = (L, q) => q.type === 'missing' ? refSolveOpt(L, q) : (refSolveTap(L, q), true);

  /* ---- ① 80 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-79） ---- */
  for (let flat = 0; flat < 80; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, clipAll = true, structAll = true, driveOk = true, rescueOk = true, mixOk = true;
    const seen = {};
    let wordsRepeated = false;
    const typeCnt = { listen: 0, missing: 0, meaning: 0 };
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN || CH_LEN !== 8) rangeAll = false;   // r16 每关 8 题
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (k === 0 && q.type !== 'listen') mixOk = false;            // q0 恒 listen（教学范式）
      typeCnt[q.type]++;
      if (!refRangeOk(L1.dch, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      if (!KIDS.voice.clips['sp_word_' + q.word]) clipAll = false;   // 单词发音 clip 在场（§0.32）
      if (q.type === 'meaning' && !KIDS.voice.clips['sp_mean_' + q.word]) clipAll = false;  // 释义 clip
      if (!KIDS.voice.clips['sp_l_' + q.word]) clipAll = false;      // 字母名跟读 clip（T46 拆段）
      if (seen[q.word]) wordsRepeated = true;
      seen[q.word] = true;
    }
    if (wordsRepeated) rangeAll = false;                             // 同关 8 词互异
    /* 题型配比对账（q0 listen + REF_TYPE_MIX 后 7 题） */
    const wantMix = REF_TYPE_MIX[L1.dch];
    if (typeCnt.listen !== wantMix.listen + 1 || typeCnt.missing !== wantMix.missing ||
        typeCnt.meaning !== wantMix.meaning) mixOk = false;

    /* ①b 引擎直驱（三型混驱整关+首题错径） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (q.type === 'missing') {
        if (engTapTile(Ld, 0) !== null) driveOk = false;            // missing 拒瓦片通道
        const wo = wrongOption(q);
        if (wo < 0 || engTapOption(Ld, -1) !== null || engTapOption(Ld, 99) !== null) driveOk = false;
        if (engTapOption(Ld, wo) !== 'wrong') driveOk = false;      // 错选项=miss 一次
        if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;
        if (engTapBuilt(Ld, 0) !== null) driveOk = false;           // missing 拒退回通道
        if (!refSolveOpt(Ld, q)) driveOk = false;                   // 逐空正确→right/done
        if (!q.solved || q.filled.join('') !== q.blanks.map(j => q.word[j]).join('')) driveOk = false;
      } else {
        if (engTapOption(Ld, 0) !== null) driveOk = false;          // 瓦片题拒选项通道
        if (engTapTile(Ld, -1) !== null || engTapTile(Ld, 99) !== null) driveOk = false;
        const plan = wrongPlan(q);
        if (!plan) { driveOk = false; break; }
        for (const i of plan) {
          if (engTapTile(Ld, i) === null) { driveOk = false; break; }
        }
        if (driveOk && engTapTile(Ld, 0) !== null) driveOk = false;
        if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;
        if (builtOf(q).join('') === q.word) driveOk = false;
        refClearBuilt(Ld, q);
        if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;  // 退回=探索零计数
        if (engTapBuilt(Ld, 0) !== null) driveOk = false;
        for (const i of plan) engTapTile(Ld, i);                    // 再错一次（退回后重拼）
        if (q.miss !== 2 || Ld.retries !== base + 2) driveOk = false;
        refClearBuilt(Ld, q);
        refSolveTap(Ld, q);
        if (!q.solved || builtOf(q).join('') !== q.word) driveOk = false;
      }
      if (Ld.step !== k + 1) driveOk = false;                       // 推进
    }
    if (Ld.done !== true) driveOk = false;                          // 8 题全解=关完成
    /* 星级三档独立驱动（首题错 3/1/0 次 → 1★/2★/3★） */
    const L1x = genLevel(flat);
    const qs1 = L1x.quizzes[0];
    let g1 = 0;
    while (qs1.miss < 3 && g1++ < 16) {                             // 首题连错 3 次（分型错径）
      if (qs1.type === 'missing') { engTapOption(L1x, wrongOption(qs1)); }
      else { const plan = wrongPlan(qs1); if (!plan) break; plan.forEach(i => engTapTile(L1x, i)); refClearBuilt(L1x, qs1); }
    }
    let g2x = 0;
    while (!L1x.done && g2x++ < 40) refSolveQuiz(L1x, L1x.quizzes[L1x.step]);
    const s1 = L1x.done && L1x.retries === 3 && engStars(L1x) === 1;
    const L2x = genLevel(flat);
    const qs2 = L2x.quizzes[0];
    if (qs2.type === 'missing') engTapOption(L2x, wrongOption(qs2));
    else { const plan2 = wrongPlan(qs2); if (plan2) { plan2.forEach(i => engTapTile(L2x, i)); refClearBuilt(L2x, qs2); } }
    let g3 = 0;
    while (!L2x.done && g3++ < 40) refSolveQuiz(L2x, L2x.quizzes[L2x.step]);
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let g4 = 0;
    while (!L3.done && g4++ < 40) refSolveQuiz(L3, L3.quizzes[L3.step]);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环（三型）：歧途态起步 → rescueTarget 步进 → 收敛拼对 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    if (qr.type !== 'missing') {
      const planR = wrongPlan(qr);
      if (planR) planR.forEach(i => engTapTile(Lr, i));
    }
    let chainOk = true, steps = 0;
    while (!qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (t.act === 'tile') {
        if (engTapTile(Lr, t.i) === null) { chainOk = false; break; }
      } else if (t.act === 'opt') {
        if (engTapOption(Lr, t.i) === null) { chainOk = false; break; }
      } else if (engTapBuilt(Lr, t.j) === null) { chainOk = false; break; }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                 // 已解题无救援目标
    /* missing 型救援目标补测（第二题若为 missing：空态起步 opt 链收敛） */
    const qm = L1.quizzes.find(q => q.type === 'missing');
    if (qm) {
      const Lm = genLevel(flat);
      const idx = Lm.quizzes.indexOf(Lm.quizzes.find(x => x.word === qm.word));
      for (let k2 = 0; k2 < idx; k2++) refSolveQuiz(Lm, Lm.quizzes[k2]);
      const qmm = Lm.quizzes[Lm.step];
      let ok2 = true, st2 = 0;
      while (!qmm.solved && st2++ < 12) {
        const t = rescueTarget(qmm);
        if (!t || t.act !== 'opt' || engTapOption(Lm, t.i) === null) { ok2 = false; break; }
      }
      if (!ok2 || !qmm.solved) chainOk = false;
    }
    rescueOk = chainOk;

    const ok = det && rangeAll && clipAll && structAll && driveOk && rescueOk && mixOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, clipAll: clipAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk, mixOk: mixOk, types: typeCnt,
      stars: { many1: engStars(L1x), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.type[0] + ':' + q.word + '[' + (q.type === 'missing' ? q.opts.join('') : q.tiles.join('')) + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapTile 单元（flat0 真实 UI，q0 恒 listen）：入格/退回 DOM 同步 + 非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = q0.type === 'listen';
  const w0 = q0.word;
  for (let j = 0; j < w0.length - 1 && domOk; j++) {                // 先拼前 n-1 个字母
    const i = freeTileFor(q0, w0[j]);
    const r = await SP.tapTile(i);
    if (r !== 'placed') domOk = false;
    const qz = SP.quiz;
    if (qz.built[j] !== w0[j] || qz.built.filter(x => x !== null).length !== j + 1) domOk = false;
    const tEl = tileEl(i);
    if (!tEl || !tEl.classList.contains('gone')) domOk = false;     // 瓦片 .gone
    const c = cellEl(j);
    if (!c || !c.classList.contains('full') || c.querySelector('.lt').textContent !== w0[j]) domOk = false;  // 格 .full+字母
  }
  const lastJ = w0.length - 1;                                      // 退回路径：末格先入再退
  const iLast = freeTileFor(q0, w0[lastJ]);
  await SP.tapTile(iLast);                                          // 完成拼对（right 流程推进）
  await wait(700 * SPEED);                                          // 等推进+换题渲染
  const lv0 = SP.currentLevel;
  const backOk = lv0.step === 1 && SP.quiz.word !== w0 && SP.quiz.built && SP.quiz.built.every(x => x === null);
  startLevel(0);                                                    // 重发同关测退回
  const q0b = cur.quizzes[0];
  for (let j = 0; j < 2; j++) { await SP.tapTile(freeTileFor(q0b, q0b.word[j])); }
  const stB = SP.quiz.built.filter(x => x !== null).length;         // 已拼 2 格
  const rB = SP.tapBuilt(1);                                        // 退回第 2 格
  const goneN = tilePoolEl.querySelectorAll('.tile.gone').length;
  const back2 = rB === 1 && stB === 2 && goneN === 1 &&
    !cellEl(1).classList.contains('full') && cellEl(1).querySelector('.lt').textContent === '';
  const badIdx = (await SP.tapTile(-1)) === false && (await SP.tapTile(99)) === false &&
    SP.tapBuilt(-1) === false && SP.tapBuilt(99) === false;
  const selfOk = domOk && backOk && back2 && badIdx;
  if (selfOk) npass++;
  units.tapTile = { ok: selfOk, domOk: domOk, backOk: backOk, back2: back2, badIdx: badIdx,
    word: w0, tiles: SP.quiz.tiles };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  startLevel(0);                                                    // flat0：每错必播
  const planA = wrongPlan(cur.quizzes[0]);
  for (const i of planA) await SP.tapTile(i);
  await SP.tapTile(planA ? 0 : 0);                                  // 拼满后再点（拒绝，不播）
  refClearBuilt(cur, cur.quizzes[0]);
  for (const i of planA) await SP.tapTile(i);                       // 第二次拼满错
  const sayA = cnt('sp_wrong');                                     // → 2
  startLevel(3);                                                    // flat3：10s 节流
  lastWrongVoice = Date.now();                                      /* 显式进入节流窗口内 */
  const planB = wrongPlan(cur.quizzes[0]);
  for (const i of planB) await SP.tapTile(i);
  const sayB = cnt('sp_wrong') - 2;                                 // 增量 → 0
  startLevel(3);                                                    // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                               /* 隔离上一子用例时间戳 */
  const planC = wrongPlan(cur.quizzes[0]);
  refClearBuilt(cur, cur.quizzes[0]);                               // 保险：从空格起步
  const q3 = cur.quizzes[0];
  const base3 = q3.miss;
  const pl1 = wrongPlan(q3);
  for (const i of pl1) await SP.tapTile(i);                         // miss=1 窗口外 → 播
  refClearBuilt(cur, q3);
  const pl2 = wrongPlan(q3);
  for (const i of pl2) await SP.tapTile(i);                         // miss=2 → force === 2 → 播
  const sayC = cnt('sp_wrong') - 2 - sayB;                          // 增量 → 2
  const missOk = q3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关 8 题（首题拼错一次+退回 → 1 错=2 星；三型全覆盖） ---- */
  total++;
  const sayLog3 = [], pLog3 = [];
  const origSay3 = KIDS.voice.say, origP3 = KIDS.voice.play;
  KIDS.voice.say = function (t) { sayLog3.push(String(t)); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };   /* 字母跟读走 play(clip) 通道（T46） */
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  const typeSeen = { listen: 0, missing: 0, meaning: 0 };
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = SP.quiz;
    if (!q) { smokeA = false; break; }
    typeSeen[q.type]++;
    if (s === 0) {                                        // 首错（listen）：晃动零惩罚可退回；首错不出救援视觉
      const plan = wrongPlan(cur.quizzes[0]);
      for (const i of plan) { await SP.tapTile(i); }
      const wig = slotsEl.classList.contains('wig');
      const tileOk = !!tilePoolEl.querySelector('.tile:not(.gone)');
      const peOk = getComputedStyle(tilePoolEl.querySelector('.tile:not(.gone)')).pointerEvents !== 'none';
      const noRescue = !slotsEl.querySelector('.cell.breathe') && !tilePoolEl.querySelector('.tile.pulse');
      const lv = SP.currentLevel;
      wrongOk = wig && tileOk && peOk && noRescue && lv.retries === 1 && lv.step === 0;
      while (SP.quiz.built.some(x => x !== null)) {       // 全部退回（零惩罚可调整）
        const j = SP.quiz.built.map(x => x !== null).lastIndexOf(true);
        SP.tapBuilt(j);
      }
      if (SP.quiz.built.some(x => x !== null) || SP.quiz.miss !== 1) smokeA = false;
      const lvE = SP.currentLevel;
      if (lvE.retries !== 1) smokeA = false;              // 退回不追加错次
    }
    const qq = cur.quizzes[cur.step];
    if (qq.type === 'missing') {
      let guard = 0;
      while (!qq.solved && guard++ < 8) {
        const i = qq.opts.indexOf(qq.word[qq.blanks[qq.cur]]);
        if (i < 0 || (await SP.tapOption(i)) === null) { smokeA = false; break; }
      }
    } else {
      for (let j = 0; j < qq.word.length; j++) {          // 依词逐字母真实点选
        const r = await SP.tapTile(freeTileFor(qq, qq.word[j]));
        if (r === null) smokeA = false;
      }
    }
    quizzesA++;
    await wait(400 * SPEED);
  }
  await wait(900 * SPEED);
  const lvA = SP.currentLevel;
  const lettersSaid = pLog3.filter(k => k.indexOf('sp_l_') === 0);        // 字母名跟读=sp_l_ clip 通道（T46）
  const noKeylessLetters = sayLog3.every(t => !/^[a-z](、[a-z])+$/.test(t));  // 字母串零 TTS keyless（决定性）
  const noEnTts = sayLog3.every(t => !/^[a-z]{3,6}$/.test(t));            // 无英文单词 TTS
  KIDS.voice.say = origSay3; KIDS.voice.play = origP3;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && lettersSaid.length >= 1 && noKeylessLetters && noEnTts &&
    typeSeen.listen >= 5 && typeSeen.missing === 2 && typeSeen.meaning === 1 &&
    !document.querySelector('.k-celebrate');              // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA, retries: lvA.retries,
    stars: engStars(cur), types: typeSeen, lettersSaid: lettersSaid.slice(0, 2), noEnTts: noEnTts };

  /* ---- ④ UI 冒烟 B：flat16（ch3 辅音簇）全对通关 3 星（瓦片=词+3/选项=4） ---- */
  total++;
  startLevel(16);
  const q16 = SP.quiz;
  const shapeOk = q16 && REF_WORDS60[3].indexOf(q16.word) >= 0 && q16.word.length >= 4;
  let playB = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && playB; s++) {
    const qq = cur.quizzes[cur.step];
    if (!qq) { playB = false; break; }
    if (qq.type === 'missing') {
      if (qq.opts.length !== 4) playB = false;             // ch3 恒 4 选项
      let guard = 0;
      while (!qq.solved && guard++ < 8) {
        const r = await SP.tapOption(qq.opts.indexOf(qq.word[qq.blanks[qq.cur]]));
        if (r === null) playB = false;
      }
    } else {
      if (SP.quiz.tiles.length !== qq.word.length + 3) playB = false;   // ch3 恒 3 干扰
      for (let j = 0; j < qq.word.length; j++) {
        const r = await SP.tapTile(freeTileFor(qq, qq.word[j]));
        if (r === null) playB = false;
      }
    }
    quizzesB++;
    await wait(360 * SPEED);
  }
  await wait(900 * SPEED);
  const lv16 = SP.currentLevel;
  const smokeOkB = shapeOk && playB && quizzesB === CH_LEN && lv16.done && lv16.won &&
    lv16.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat16 = { ok: smokeOkB, shapeOk: shapeOk, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④b meaning 题专项（flat24 ch4 推进到 meaning 题）：释义卡替位+主动听通道
     （换题开场链/释义自动播=verify 页 stub 且 VERIFY 门静默——真实页行为由无头自测覆盖） ---- */
  total++;
  const origP4 = KIDS.voice.play;
  const pLog4 = [];
  KIDS.voice.play = function (key) { pLog4.push(String(key)); };
  startLevel(24);
  let mOk = false, guard4 = 0;
  const types4 = [];
  while (guard4++ < CH_LEN) {
    const q4 = SP.quiz;
    if (!q4) break;
    types4.push(q4.type);
    if (q4.type === 'meaning') {
      const card = $id('mean-card');
      const shown = card && getComputedStyle(card).display !== 'none' && card.textContent === MEANS[q4.word];
      const spkHidden = getComputedStyle(speakerBtn).display === 'none';
      const opts4 = tilePoolEl.querySelectorAll('.tile').length === q4.word.length + distractorCount(cur.dch);
      const hear4 = SP.hear();                            // meaning 主动听=词 clip 通道
      mOk = shown && spkHidden && opts4 && hear4 === true &&
        pLog4.indexOf('sp_word_' + q4.word) >= 0;
      break;
    }
    const qq = cur.quizzes[cur.step];
    if (qq.type === 'missing') {
      let g2 = 0;
      while (!qq.solved && g2++ < 8) await SP.tapOption(qq.opts.indexOf(qq.word[qq.blanks[qq.cur]]));
    } else {
      for (let j = 0; j < qq.word.length; j++) await SP.tapTile(freeTileFor(qq, qq.word[j]));
    }
    await wait(360 * SPEED);
  }
  KIDS.voice.play = origP4;
  const meanOk = mOk && types4.filter(t => t === 'meaning').length >= 1;
  if (meanOk) npass++;
  units.meaning = { ok: meanOk, types: types4, shown: mOk };

  /* ---- ⑤ 布局（竖屏三件套）：双 viewport ×（flat0/8/16/24）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：tile-in scale(0) 起帧）；
     portStyle 判别锚=喇叭尺寸横 104/竖 96（q0 恒 listen=喇叭恒在场） ---- */
  async function simView(w, h, port, flat) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——三件套）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    await wait(620);                            // 瓦片入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const tiles = Array.prototype.slice.call(tilePoolEl.querySelectorAll('.tile'));
    const tileOk = tiles.length > 0 &&
      tiles.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const cells = Array.prototype.slice.call(slotsEl.querySelectorAll('.cell'));
    const cellOk = cells.length > 0 &&
      cells.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const spk = speakerBtn.getBoundingClientRect();
    const spkOk = spk.width >= 96 && spk.height >= 96;
    const spkW = speakerBtn.offsetWidth;
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = port ? (spkW >= 94 && spkW <= 98)
                           : (realPort || (spkW >= 102 && spkW <= 106));
    const hb = hintBtnEl();
    const hintOk = !!hb && hb.getBoundingClientRect().width >= 96 && hb.getBoundingClientRect().height >= 96;
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: flat, tileOk: tileOk, cellOk: cellOk, spkOk: spkOk,
      spkW: spkW, portStyle: portStyle, hintOk: hintOk, btnOk: btnOk, ox: ox,
      pass: tileOk && cellOk && spkOk && portStyle && hintOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 8, 16, 24]) {
    sims.push(await simView(1280, 800, false, f));
    sims.push(await simView(800, 1180, true, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑤b 题型几何轮：flat0 逐题推进（8 题三型全见），横+竖逐题量触摸域与 ox ---- */
  total++;
  const typeSims = [];
  for (const tvp of [[1280, 800, false], [800, 1180, true]]) {
    const g = $id('game');
    document.body.classList.toggle('port', !!tvp[2]);
    g.style.width = tvp[0] + 'px';
    g.style.height = tvp[1] + 'px';
    startLevel(0);
    for (let s = 0; s < CH_LEN; s++) {
      const q = SP.quiz;
      if (!q) break;
      await wait(560);
      const tiles = Array.prototype.slice.call(tilePoolEl.querySelectorAll('.tile'));
      const tOk = tiles.length > 0 && tiles.every(b => {
        const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
      const cells = Array.prototype.slice.call(slotsEl.querySelectorAll('.cell'));
      const cOk = cells.length === q.word.length && cells.every(b => {
        const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
      const mCard = $id('mean-card');
      const mOk2 = q.type !== 'meaning' ||
        (getComputedStyle(mCard).display !== 'none' && mCard.getBoundingClientRect().height >= 64);
      const spkH = q.type === 'meaning' || (speakerBtn.getBoundingClientRect().width >= 96);
      const de = document.documentElement;
      const ox2 = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
      typeSims.push({ vp: tvp[0] + 'x' + tvp[1] + (tvp[2] ? 'P' : ''), s: s, type: q.type,
        tOk: tOk, cOk: cOk, mOk: mOk2, spkH: spkH, ox: ox2 });
      const qq = cur.quizzes[cur.step];
      if (qq.type === 'missing') {
        let g2 = 0;
        while (!qq.solved && g2++ < 8) await SP.tapOption(qq.opts.indexOf(qq.word[qq.blanks[qq.cur]]));
      } else {
        for (let j = 0; j < qq.word.length; j++) await SP.tapTile(freeTileFor(qq, qq.word[j]));
      }
      await wait(360 * SPEED);
    }
    document.body.classList.remove('port');
    g.style.width = '';
    g.style.height = '';
  }
  startLevel(0);
  const typeLayoutOk = typeSims.length === 16 &&
    typeSims.every(t => t.tOk && t.cOk && t.mOk && t.spkH && t.ox <= 0) &&
    ['listen', 'missing', 'meaning'].every(tp => typeSims.some(t => t.type === tp));
  if (typeLayoutOk) npass++;
  smokes.typeLayout = { ok: typeLayoutOk, sims: typeSims };

  /* ---- ⑥ 分布与专项：文案对账 / 词库双写对账 / clip 注入 / 开场链分型 / 救援重播 / 英文无 TTS 兜底 ---- */
  total++;
  /* SPEC §2-r16 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！听一听拼一拼' &&
    VOICE.turn.text === '你来拼一拼' && VOICE.hint.text === '再听一听这个单词' &&
    VOICE.right.text === '拼对啦，你真棒' && VOICE.wrong.text === '听一听再拼一拼' &&
    VOICE.first.text === '第一个字母亮啦' &&
    VOICE.missing.text === '看一看，少了哪个字母' &&
    VOICE.mean.text === '看一看中文，拼一拼单词';
  /* 词库双写对账：WORDS60/MEANS 与 verify 侧 REF 逐词逐值一致（60 词封闭域防笔误） */
  const dictOk = [1, 2, 3, 4].every(d =>
    WORDS60[d].length === REF_WORDS60[d].length &&
    WORDS60[d].every((w, k) => w === REF_WORDS60[d][k])) &&
    Object.keys(MEANS).length === 60 &&
    Object.keys(REF_MEANS).every(w => MEANS[w] === REF_MEANS[w]) &&
    REF_WORDS60[1].concat(REF_WORDS60[2], REF_WORDS60[3], REF_WORDS60[4]).every(w => MEANS[w]);
  /* 词表双写对账：生成器 WORDLIST ⊆ REF_WORDS（同内容同长度） */
  const listOk = WORDLIST.length === REF_WORDS.length && WORDLIST.every(w => !!REF_SET[w]);
  /* 191 条 clips 注入对账（sp_ 8 + sp_word_ 60 + sp_mean_ 60 + sp_l_ 60 + core 3，
     manifest games:['spellen']——T46 拆段字母名跟读族 sp_l_<word>） */
  const SP_KEYS = ['sp_tut_watch', 'sp_tut_turn', 'sp_hint', 'sp_right', 'sp_wrong', 'sp_first',
    'sp_missing', 'sp_mean'];
  const WORD_KEYS = REF_WORDS60[1].concat(REF_WORDS60[2], REF_WORDS60[3], REF_WORDS60[4])
    .map(w => 'sp_word_' + w);
  const MEAN_KEYS = REF_WORDS60[1].concat(REF_WORDS60[2], REF_WORDS60[3], REF_WORDS60[4])
    .map(w => 'sp_mean_' + w);
  const L_KEYS = REF_WORDS60[1].concat(REF_WORDS60[2], REF_WORDS60[3], REF_WORDS60[4])
    .map(w => 'sp_l_' + w);                                             /* 字母名跟读族（T46） */
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 191 &&
    SP_KEYS.concat(WORD_KEYS, MEAN_KEYS, L_KEYS).every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链分型 + 救援重播 + 英文无 TTS 兜底（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链（q0 listen）
  const wordV = genLevel(0).quizzes[0].word;
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 2 && lastQ[0] === 'sp_hint' &&
    lastQ[1] === 'sp_word_' + wordV;            // listen 开场=[hint, 单词英文 clip] 单通道
  const hearR = SP.hear();                      // 救援/重听=单词 clip 通道
  const hearOk = hearR === true && playLog.some(p => p[0] === 'sp_word_' + wordV);
  /* 缺 clip：禁 TTS 英文兜底（§0.32）——不播+false+无任何带英文文本的 play/say */
  const keyV = 'sp_word_' + wordV;
  const clipBak = KIDS.voice.clips[keyV];
  delete KIDS.voice.clips[keyV];
  playLog.length = 0; sayLog.length = 0;
  const hearMiss = SP.hear();
  const noFallback = hearMiss === false && playLog.length === 0 && sayLog.length === 0;
  KIDS.voice.clips[keyV] = clipBak;             // 还原
  const hearR2 = SP.hear();
  const restored = hearR2 === true && playLog.some(p => p[0] === keyV);
  /* 全程无带 text 的 play（sayWord 不传 text=零 TTS 兜底通道；中文句 clip 带 text=兜底层） */
  const noTextPlay = playLog.every(p => p[1] === null);
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const specOk = refVoice && dictOk && listOk && clipOk && openChain && hearOk &&
    noFallback && restored && noTextPlay;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, dictOk: dictOk, listOk: listOk,
    clips: clipOk, nClips: nClips, openChain: openChain, hearOk: hearOk,
    noFallback: noFallback, restored: restored, noTextPlay: noTextPlay,
    missing: SP_KEYS.concat(WORD_KEYS, MEAN_KEYS, L_KEYS).filter(k => !KIDS.voice.clips[k]) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → demo 听音+逐字母点选 → 拼对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const word0 = genLevel(0).quizzes[0].word;
  const q0t = SP.quiz;
  const tutOk = pLog7.indexOf('sp_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    pLog7.indexOf('sp_word_' + word0) >= 0 &&                            /* 演示听音=英文 clip 通道 */
    window.__spDemoR === 'right' &&                                     /* §0.27 演示拼对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    SP.currentLevel && SP.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.word === word0 &&                       /* 新题面同词初态 */
    q0t.built.every(x => x === null) && q0t.miss === 0 &&
    lastQ7 && lastQ7.length === 2 && lastQ7[0] === 'sp_tut_turn' &&      /* 交接顺序链单通道 */
    lastQ7[1] === 'sp_word_' + word0;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('sp_tut_watch') >= 0,
    wordClip: pLog7.indexOf('sp_word_' + word0) >= 0, demoR: window.__spDemoR,
    handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑪ duration（r16 门禁）：80 关 modeled ≥40000+实测最低值精确（防回漂）
     +逐关对账+DECIDE≥STAGE 恒真+源常量同步 ---- */
  /* 独立副本常量（禁引源模型；DECIDE_MS 三型=SPEC §2-r16 认知推算定版） */
  const estMsV = s => s.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_DECIDE = { listen: 2600, missing: 5500, meaning: 3600 };
  const V_STEP = 600, V_ENTER = 400, V_STAGE = 400, V_WORD = 1200, V_MIN = 40000;
  const V_QUIZ = estMsV('拼对啦，你真棒');        // = 3015（7 字符含逗号——全字符口径）
  const REF_FACE = { listen: '再听一听这个单词', missing: '看一看，少了哪个字母', meaning: '看一看中文，拼一拼单词' };
  const vFace = q => q.type === 'listen' ? V_ENTER + estMsV(REF_FACE.listen) + 300 + V_WORD
    : q.type === 'missing' ? V_ENTER + estMsV(REF_FACE.missing) + 300
    : V_ENTER + estMsV(REF_FACE.meaning) + 300 + estMsV(REF_MEANS[q.word]);
  const vSteps = q => q.type === 'missing' ? q.blanks.length : q.word.length;
  const vDur = L => L.quizzes.reduce((s, q) =>
    s + vFace(q) + vSteps(q) * (Math.max(V_STAGE, V_DECIDE[q.type]) + V_STEP) + V_QUIZ, 0);
  let dMin = Infinity, dFlat = -1, parityOk = true, decideOk = true;
  for (let flat = 0; flat < 80; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) if (V_DECIDE[q.type] < V_STAGE) decideOk = false;
  }
  /* 源常量同步断言（estMs 全字符口径/DECIDE_MS/ADV_STEP/ADV_QUIZ=3015/LEVEL_MIN_MS——build.py 另做字面 assert） */
  const constOk = JSON.stringify(DECIDE_MS) === JSON.stringify(V_DECIDE) &&
    ADV_STEP === 600 && ADV_QUIZ === 3015 && estMs('拼对啦，你真棒') === 3015 &&
    ENTER_MS === 400 && STAGE_MS === 400 && WORD_SAY_MS === 1200 && LEVEL_MIN_MS === 40000 &&
    typeof modeled === 'function' && modeled(0) === vDur(genLevel(0));
  const durUnitOk = dMin >= V_MIN && dMin === 142995 && dFlat === 0 && parityOk && decideOk && constOk;
  total++;
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
    parity: parityOk, decideDominates: decideOk, constOk: constOk,
    decide: V_DECIDE, quiz: V_QUIZ, step: V_STEP };

  const out = { game: 'spellen', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
