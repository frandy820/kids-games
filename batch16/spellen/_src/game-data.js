/* ================= spellen 游戏数据（r16 难度改造：词库 60 词三题型 / 语音文案 / 字母瓦片配色 / 图标）
   词展示一律小写（一年级课本口径，SPEC-BATCH16 §2-r16）；
   单词发音=sp_word_<word> 预合成英文 clip（§0.32，禁 TTS 英文兜底）；
   中文释义=sp_mean_<word> 预合成中文 clip（meaning 题题面，§2-r16）。
   三题型（7-8 岁难度锚：从认读选择升到主动拼写回忆）：
   listen  听音拼词（原玩法：喇叭+全字母瓦片+干扰字母）
   missing 缺字母填空（词卡缺 1-2 字母+字母选项卡——拼写选择形态）
   meaning 中文释义→拼写（无音不自动播，中文释义卡+全字母瓦片——主动拼写回忆）
   干扰字母=目标词字母集外的常用字母 2-3 个（互异）+ b/d 同形翻转对（AUDIT-78 ④：
   词含 b 不含 d→干扰含 d；含 d 不含 b→干扰含 b；missing 正确字母 b→选项含 d，d→含 b——
   7-8 岁 b/d 镜像辨析训练）：约束①干扰组本身不构成完整英文词
   ②全池（词字母+干扰）不 anagram 成另一同长完整英文词——生成器用 WORDLIST 过滤，
   verify 侧 REF_WORDS 独立字面量分源复算（同内容双写，笔误即 fail）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- r16 时长模型（crd r12 范式；认知步主体非演出窗）
   estMs = s => s.length * 345 + 600（b25 定版：SAPI ~345ms/字+600，全字符口径——四方同步：
   本源常量+本注释验算+verify estMsV 独立副本+build.py 字面 assert）。
   每题 dur = faceMs(题面窗) + nSteps × (max(STAGE_MS, DECIDE_MS[type]) + ADV_STEP) + ADV_QUIZ：
   faceMs（每题一次，题面语音窗）：ENTER 400 + estMs(开场句) + 300
     listen = +WORD_SAY_MS 1200（英文词 clip 估值：单/双音节实测 0.8-1.1s 取整上限）
       = 400+3360+300+1200 = 5260（'再听一听这个单词' 8 字符 → 3360）
     missing = 4750（'看一看，少了哪个字母' 10 字符 → 4050）
     meaning = 400+4395+300+estMs(释义) = 5095+1290..1980 = 6385..7075
       （'看一看中文，拼一拼单词' 11 字符 → 4395；释义 2-4 字符 → 1290-1980）
   DECIDE_MS（7-8 岁认知推算，按题型分型定值）：
     listen 2600/字母：听音保持（语音工作记忆 1.5-2s 衰减窗）+音素→字母映射
       （逐音素 ~400ms）+池内瓦片视觉搜索（8-9 瓦片 ~500ms）+确认点击
     missing 5500/空：缺位音素推断（词形-音位对齐，缺 1 位 ~2s）+3-4 选项逐一
       甄别（b/d 镜像翻转对辨析每项 ~1s）+确认
     meaning 3600/字母：中文义→英文词形主动提取（词形检索首字母 ~2s+后续联想链
       ~300ms/字母，均摊含二次校对）——无语音提示，词汇回忆负荷高于听写
   ADV_STEP 600（入格/填空动画+音效窗）；ADV_QUIZ = estMs('拼对啦，你真棒') = 7×345+600 = 3015
   （7 字符含全角逗号，全字符口径；每题一次——拼对反馈窗）。
   验算（dch1 关理论下限，全 3 字母词）：listen 5×(5260+3×3200+3015)=89375 /
   missing 2×(4750+6100+3015)=27730 / meaning 1×(5095+1290+3×4200+3015)=22000
   → 关 ≥ 139105 —— 全部 ≥ LEVEL_MIN_MS 40000（r16 门禁，verify ⑪ 独立副本复算；
   80 关 modeled 实测最低值精确断言防回漂）。 ---------- */
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
const ENTER_MS = 400;                          // 题面窗基数（题面语音前置一拍）
const STAGE_MS = 400;                          // 步推进窗（步模型语音下限）
const WORD_SAY_MS = 1200;                      // 英文单词 clip 估值（单/双音节 0.8-1.1s 上限取整）
const DECIDE_MS = { listen: 2600, missing: 5500, meaning: 3600 };   // 分型认知决策（注释推算见上）
const ADV_STEP = 600;                          // 入格/填空反馈窗（每步）
const ADV_QUIZ = estMs('拼对啦，你真棒');       // = 3015（7 字符含逗号——全字符口径）
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r16 门禁，7-8 岁口径）
const faceMs = q => q.type === 'listen'
  ? ENTER_MS + estMs(q.face) + 300 + WORD_SAY_MS
  : q.type === 'missing'
    ? ENTER_MS + estMs(q.face) + 300
    : ENTER_MS + estMs(q.face) + 300 + estMs(q.mean);
const nSteps = q => q.type === 'missing' ? q.blanks.length : q.word.length;
const quizDurMs = q => faceMs(q) +
  nSteps(q) * (Math.max(STAGE_MS, DECIDE_MS[q.type]) + ADV_STEP) + ADV_QUIZ;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   r16 年级梯度：ch1 CVC 热身+CVCe 起步 / ch2 CVCe 长元词 / ch3 辅音簇 / ch4 双音节
   hint=章末预告**下一章**文案（CHAPTERS[i].hint ↔ 第 i+1 章，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（生成关预告，verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '小小单词',   hint: '长元音的单词来啦' },
  2: { name: '长音单词',   hint: '两个字母一起读的单词' },
  3: { name: '字母搭伙',   hint: '两个音节的单词来啦' },
  4: { name: '双音节词',   hint: '新一轮拼写挑战' }
};
const GEN_HINTS = ['小单词再拼一次',        // dch1 CVC/CVCe（题 0-7）
                   '长元音单词再拼一次',    // dch2 CVCe
                   '辅音簇单词再拼一次',    // dch3 辅音簇
                   '双音节单词再拼一次'];   // dch4 双音节
const CH_LEN = 8;          // 8 题 = 1 关（r16：5→8，AUDIT-78；配旧档迁移 IIFE 见 main 顶部）
const STATIC_LEVELS = 40;  // 静态 40 关 = 4 章 × 10 关（r16：20→40）

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18）
   单词发音/中文释义不入 VOICE 表（走 sayWord/sayMean 专用通道） ---------- */
const VOICE = {
  watch:   { key: 'sp_tut_watch', text: '看！听一听拼一拼' },
  turn:    { key: 'sp_tut_turn',  text: '你来拼一拼' },
  hint:    { key: 'sp_hint',      text: '再听一听这个单词' },      /* listen 开场句（8 字符 → estMs 3360） */
  right:   { key: 'sp_right',     text: '拼对啦，你真棒' },        /* 答对反馈（7 字符 → estMs 3015=ADV_QUIZ） */
  wrong:   { key: 'sp_wrong',     text: '听一听再拼一拼' },        /* 答错 clip 化（§0.24） */
  first:   { key: 'sp_first',     text: '第一个字母亮啦' },        /* 提示按钮句（§2） */
  missing: { key: 'sp_missing',   text: '看一看，少了哪个字母' },  /* r16 missing 开场句（10 字符 → 4050） */
  mean:    { key: 'sp_mean',      text: '看一看中文，拼一拼单词' } /* r16 meaning 开场句（11 字符 → 4395） */
};

/* ---------- 词库（r16：24→60 词封闭定稿，4 章 × 15；SPEC §2-r16；小写）
   dch1 CVC 热身 8 + CVCe 起步 7（ch1 起步即见 CVCe 长元词——AUDIT-78 ②）
   dch2 CVCe 长元词（a_e×6 / i_e×5 / o_e×3 / u_e×1）
   dch3 辅音簇（起始/结尾辅音簇）
   dch4 双音节（5-6 字母） ---------- */
const WORDS60 = {
  1: ['cat', 'dog', 'sun', 'hat', 'map', 'bed', 'pig', 'bus',
      'cake', 'make', 'bike', 'kite', 'home', 'nose', 'rope'],
  2: ['lake', 'gate', 'name', 'game', 'five', 'nine', 'time', 'bone',
      'rose', 'cute', 'wave', 'ride', 'note', 'rice', 'safe'],
  3: ['fish', 'tree', 'star', 'frog', 'milk', 'grass', 'bread', 'black',
      'green', 'snake', 'brush', 'sleep', 'cloud', 'plant', 'small'],
  4: ['apple', 'tiger', 'water', 'happy', 'pencil', 'orange', 'yellow', 'rabbit',
      'flower', 'monkey', 'seven', 'paper', 'sister', 'robot', 'garden']
};

/* ---------- 中文释义（r16 meaning 题题面；与 gen_clips.py SP_MEANS 同内容双写+verify 分源对账） ---------- */
const MEANS = {
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

/* ---------- 题型配比（r16：q0 恒 listen 保教学演示=听音拼词范式；后 7 题按 dch 配比洗牌
   ——从认读选择升到主动拼写回忆：meaning 占比 dch1 1/8 → dch4 4/8 单调升） ---------- */
const TYPE_MIX = {
  1: { listen: 4, missing: 2, meaning: 1 },
  2: { listen: 3, missing: 2, meaning: 2 },
  3: { listen: 2, missing: 2, meaning: 3 },
  4: { listen: 1, missing: 2, meaning: 4 }
};

/* ---------- 干扰字母候选源：常用字母（SPEC §2"从目标词外的常用字母取"；
   排除生僻 j/q/x/z，避免弱干扰） ---------- */
const COMMON_LETTERS = 'aeioubcdfghklmnprstvwy'.split('');

/* ---------- 约束词表（生成器侧字面量；verify 侧 REF_WORDS 同内容独立双写）
   用于：①干扰组本身是否构成完整英文词 ②全池是否 anagram 成另一同长完整英文词。
   含 60 目标词全集与常见 2-6 字母词及关键 anagram 陷阱（crate/trace/aunts/earth/master…） */
const WORDLIST = ('ad ah am an as at be by do go he hi if in is it me my no of oh ok or so to up us we ' +
  'ace act add age aim air and ant any ape arm art ash ask bad bag ban bar bat bay bed bee beg bet big bin bit bow box boy bud bug bus but buy cab can cap car cat cob cog con cop cot cow coy cry cub cue cup cut dab dad dam day den dew dig dim dip dog dot dry dug duo dye ear eat eel egg elf elk emu end era eve ewe eye fan far fat fax fee few fig fin fit fix fly foe fog for fox fun fur gag gap gas gel gem get gig gin got gum gun guy gym had ham has hat hay hem hen her hew hex hid him hip his hit hog hot how hug hum hut ice icy ill imp ink inn its ivy jab jam jar jaw jay jet job jog joy jug key kid kit lab lad lag lap law lax lay led leg let lid lie lip lit log lot low lug mad man map mar mat may men met mid mix mob mom mop mud mug nab nap net new nip nod nor not now nun nut oar oat odd off oil old one orb ore our out owl own pad pal pan paw pay pea pen pet pie pig pin pit ply pod pot pry pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod row rub rug rum run rye sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob son sow soy spa spy sub sum sun tab tag tan tap tar tax tea ten the tie tin tip toe ton too top tow toy try tub tug two use van vat vet vow wad wag war was wax way web wed wet who why wig win wit woe wok won wow yak yam yap yes yet you zap zip zoo ' +
  'able acid aide army aunt away baby back bake ball band bank barn base bath bean bear beat beef bell belt bend best bike bird bite blue boat body boil bone book boot bore born boss both bowl brow buck bulb burn bush busy cage cake calf call calm came camp cane cape card care carp cart case cash cast cave cell cent chat chef chin chip chop city clad clam clan clap claw clay clip club clue coal coat code coin cold colt comb come cook cool copy cord core cork corn cost crab cram crew crib crop crow cube curb cure curl dark dart dash date dawn dead deaf deal dear debt deck deed deep deer dent desk dial dice diet dirt dish dive dock doll dome done door dose dove down drag draw drew drip drop drum duck dull dust duty each earn ease east easy edge even evil exit face fact fade fail fair fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish fist five flag flat flee flew flip flow foam fold folk food fool foot fork form fort four free frog from fuel full fund gain game gate gave gear gift girl give glad glow glue goal goat goes gold golf gone good gown grab gram gray grew grid grim grin grip grow gulf hair half hall hand hang hard harm hate haul have hawk head heal heap hear heat heel held help herb herd here hero hers hide high hike hill hint hive hold hole holy home hood hoof hook hoop hope horn host hour huge hung hunt hurt icon idea inch into iron item jail jazz jeep join joke jump just keen keep kick kind king kiss kite knee knew knot know lace lack lady laid lake lamb lamp land lane last late lawn lazy lead leaf leak lean leap left lend lens less lift like lime line link lion list live load loaf loan lock loft logo long look loop lord lose loss lost loud love luck lung made mail main make male mall mask mass mast mate meal mean meat meet melt menu mild mile milk mill mind mine mist mode mold mood moon more moss most moth move much mule must nail name navy near neat neck need nest news next nice nine none noon nose note oath obey pace pack page paid pain pair pale palm pane park part pass past path peak pear peel pest pick pile pine pink pipe plan play plea plot plow plug plum plus poem poet pole poll pond pony pool poor pork port pose post pour pray prey pull pump pure push quiz race rack raft rage raid rail rain rake ramp rang rank rare rate read real rest rice rich ride ring rise risk road rock rode role roll roof room root rope rose rude ruin rule rush rust safe said sail sake sale salt same sand save scan scar seal seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut side sign silk sing sink site size skin skip slam sled slid slim slip slot slow snap snow soap sock soda sofa soft soil sold sole solo some song soon sore sort soul soup sour span spar sped spin spot star stay stem step stew stir stop such suit sung sure surf swap swim tail take tale talk tall tame tape task taxi team tear tech tell tend tent term test text than that thaw them then they thin this thus tick tide tidy tied tile tilt time tiny tire toad toll tone tool tore torn toss tour town trap tray tree trim trio trip true tuba tube tuna tune turn tusk twin type ugly undo unit upon urge used vain vast veil vein verb very vest veto view visa void vote wait wake walk wall want ward warm warn wash wasp wave weak wear weed week weep well went were west what when wide wild will wind wine wing wink wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn year yell zero zone ' +
  'about above actor acute adapt after again agent agile agree ahead alarm album alert alike alive allow alone along aloud alpha amber amble amend among angel anger angry ankle annoy apart apple apply argue arise armor aroma array arrow aside asset attic audio avoid awake award aware awful bacon badge bagel baker basic basin batch beach beard beast began begin being belly below bench berry birth black blade blame blank blast blaze bleed bless blind blink block blood board boast bonus boost booth bound brain brake brand brave bread break brick bride brief bring broad brook broom brown brush build built bunch burst cabin cable candy canoe cargo carol carry carve catch cause chain chair chalk charm chart chase cheap check cheek cheer chess chest chief child chill china chose claim clash clasp class clean clear clerk click cliff climb cling clock close cloth cloud coach coast cocoa color comic coral couch could count court cover crack craft crane crash cream creek creep crest crime cross crowd crown crumb crush curve cycle daily dairy dance dealt decay delay delta dense depth devil diary digit diner dodge doing donor doubt dozen draft drain drama drank dream dress dried drift drill drink drive drone drove eager eagle early eaten eight elbow elder elect elite email empty enemy enjoy enter entry equal error essay event every exact exist extra fable faint fairy faith false fancy fault favor feast fence ferry fever fiber field fiery fifth fifty fight final first flame flash fleet flesh flint float flock flood floor flour fluid flute focus force forge forth forty forum found frame fraud fresh front frost frown fruit gauge ghost giant given glass globe glory glove goose grace grade grain grand grant grape graph grasp grass grave great greed green greet grief grill grind groan groom gross group guard guess guest guide guilt habit happy harsh haste hatch haunt heart heavy hello hence hinge hobby honey honor horse hotel hound house human humor hurry ideal image imply index inner input issue jelly jewel joint judge juice kneel knife knock known label labor large laser latch later laugh layer learn lease least leave legal lemon level lever light limit liver lobby lodge logic loose lucky lunar lunch macho magic major maker mango maple march match mayor medal media melon mercy merge merit meter midst might mimic minor minus model money month moral motor mount mouse mouth movie music naive nerve never night noble noise north novel nurse nylon oasis occur ocean offer often olive onion opera orbit order organ other otter ought ounce outer owner oxide ozone paint panel panic paper party pasta patch pause peace peach pearl pedal penny perch peril petal phase phone photo piano piece pilot pinch pitch pivot pixel pizza place plain plane plant plate plaza plead pluck plume plump point polar porch pouch pound power press price pride prime print prize probe prone proof proud prove pulse punch pupil puppy purse quack queen query quest queue quick quiet quill quilt quite quota quote radar radio raise rally ranch range rapid ratio reach react ready realm rebel refer reign relax relay reply reset resin rhyme ridge rifle right rigid rinse risky rival river roast robin robot rocky rogue rough round route royal rural salad salon salsa sandy sauce scale scarf scene scent scoop scope score scout scrap screw seize sense serve seven shade shaft shake shall shame shape share shark sharp shave sheep sheet shelf shell shift shine shiny shirt shock shore short shout sight silky since sixth skate skill skirt skull slate sleep slice slide slope small smart smile smoke snack snake sneak solar solid solve sonic sorry sound south space spare spark speak speed spell spend spice spicy spike spine spite split spoke spoon sport spray stack staff stage stain stair stake stamp stand stare start state steam steel steep stick stiff still sting stock stone stool storm story stove strap straw strip stuck study stuff stump style sugar suite sunny super sweat sweep sweet swell swift swing sword table taken talon tango taste teach teeth tempo tenor tense tenth thank theft their theme there these thick thief thigh thing think third thorn those three throw thumb tiger tight timer title toast today token torch total touch tough tower toxic trace track trade trail train trait tramp treat trend trial tribe trick troop trout truck truly trunk trust truth tulip tutor twice twist ultra uncle under union unite until upper upset urban usage usual vague valid value valve vapor vault venue verse video vigor villa viola viral virus visit vital vivid vocal vowel wagon waist waste watch water weary weave wedge weird whale wheat wheel where which while whisk white whole widow width world worth would wound woven wrist write wrong wrote yacht yeast yield young youth zebra ' +
  'cat dog sun hat map bed pig bus cake make bike kite home nose rope lake gate name game five nine time bone rose cute wave ride note rice safe fish tree star frog milk grass bread black green snake brush sleep cloud plant small apple tiger water happy pencil orange yellow rabbit flower monkey seven paper sister robot garden ' +
  'crate cater trace react cleat caste haste hates earth hater aunts units master stream teaser eater binder staple applets sorting' +
  '').trim().split(/\s+/);
const WORDSET = {};                                   // Set 语义用对象（旧浏览器稳）
WORDLIST.forEach(w => { WORDSET[w] = true; });
/* anagram 索引：排序签名 → 词表词数组（多重集判词共用；构建期一次） */
const ANAG_INDEX = {};
WORDLIST.forEach(w => {
  const k = w.split('').sort().join('');
  (ANAG_INDEX[k] = ANAG_INDEX[k] || []).push(w);
});

/* ---------- 字母多重集工具（生成器约束与 verify 分源复算共用语义、各自实现） ---------- */
function letterCounts(s) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  return c;
}
/* 干扰组（互异字母多重集）本身是否构成完整英文词——按排序签名查 anagram 索引
   （多重集语义：{d,a,b} 能拼 bad/dab 即算成词，与选取顺序无关） */
const distractorIsWord = ds => (ANAG_INDEX[ds.split('').sort().join('')] || []).length > 0;
/* 全池（词字母+干扰）能否重排成"另一"同长完整英文词（≠目标词） */
function poolAnagramOther(poolStr, word) {
  const hits = ANAG_INDEX[poolStr.split('').sort().join('')] || [];
  return hits.some(w => w !== word);
}

/* ---------- b/d 同形翻转对（AUDIT-78 ④）：词含 b 不含 d→'d'；含 d 不含 b→'b'；否则 null */
const bdPairOf = word => {
  const has = letterCounts(word);
  return (has.b && !has.d) ? 'd' : ((has.d && !has.b) ? 'b' : null);
};

/* ---------- 字母瓦片配色（暖色积木卡五色轮换，确定性按序） ---------- */
const TILE_PALETTE = ['#F6E3C5', '#D8EDDF', '#F2D8E4', '#D6E4F0', '#FDEBD2'];
const tileBg = i => TILE_PALETTE[i % TILE_PALETTE.length];

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="12" width="16" height="16" rx="3.5" fill="#F6E3C5" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="14" y="6" width="16" height="16" rx="3.5" fill="#D8EDDF" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="24" y="16" width="16" height="16" rx="3.5" fill="#F2D8E4" stroke="#FFF" stroke-width="2"/>' +
    '<text x="12" y="24.5" text-anchor="middle" font-size="11" font-weight="800" fill="#4A3B2E" font-family="Georgia, serif">a</text>' +
    '<text x="22" y="18.5" text-anchor="middle" font-size="11" font-weight="800" fill="#4A3B2E" font-family="Georgia, serif">b</text>' +
    '<text x="32" y="28.5" text-anchor="middle" font-size="11" font-weight="800" fill="#4A3B2E" font-family="Georgia, serif">c</text></svg>',
  speaker: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M10 24 h10 l13 -11 v38 l-13 -11 h-10 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M41 22 q6 10 0 20 M49 15 q11 17 0 34" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  bulb: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 8 a15 15 0 0 1 9 27 q-3 2.4 -3 6 h-12 q0 -3.6 -3 -6 a15 15 0 0 1 9 -27 Z" fill="#F2C98C" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 47 h12 M27.5 52 h9" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 16 v9 M25 20 l3.5 4 M39 20 l-3.5 4" stroke="#FFF9EE" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M10 14 l4 4 M54 14 l-4 4 M8 30 h5.5 M51 30 h5.5" stroke="#F2C98C" stroke-width="3" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  ear: '<svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 Q6 12 12 8 Q18 4 24 8 Q29 12 27 19 Q26 24 20 26 L13 26 Q9 25 8 20 Z" fill="#F0A868" stroke="#4A3B2E" stroke-width="2"/>' +
    '<path d="M14 15 q2 -3 5 -1" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>'
};
