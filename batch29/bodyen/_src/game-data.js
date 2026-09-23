/* ================= bodyen 身体英语 游戏数据（r41：词封闭 24 / 近形音族 20 / 动词指令 5 / 章配置 / 语音文案 / 小兔身体 SVG）
   玩法（SPEC-BATCH29 §0.70/§1 + SPEC-R41-BODYEN，6-7 岁听力辨词+词形认读+TPR 动词指令）：
   题型三族——hear（题面句 bod_q1 + 英语词音 bod_w_<en> 拼播 → 4 部位图卡点选，图卡=小兔
   身体高亮该部位的迷你图）/ see（小兔身体大图高亮目标部位 + 题面句 bod_q2 → 4 英语单词
   文字卡点选——不播词音防泄底）/ do（r41 新增·动词指令：题面句 bod_q3 + 英语指令音
   bod_v_<verb>(+bod_w_<en>) 拼播 → 4 动作卡点选；touch 族=4「小兔摸部位」卡（干扰近形族
   优先），clap/shake/stomp/wave 族=4 固定动作图标卡（拍拍手/摇摇头/跺跺脚/挥挥手，图标配
   中文短语——听英语指令→懂意思→选动作，判定单步 r25 M2）。
   词封闭 24（r41 扩容 8→24，头→脚教学序）；近形/近音族 NEAR 20 词（ch2+ 真值∈族时族干扰
   必在场；face/mouth/shoulder/belly 无族=ch1/do-touch 真值+全程干扰位）。
   点对=场景放大跳 + 小兔子滑入示范 + 确认句拼播（bod_right + bod_w_<en>；动作动词题确认
   链仅 bod_right——动词短语 clip 实长未注册实测，窗 4500 不扩，注册后复核）；点错=卡摇头 +
   bod_wrong + 语义句（hear=「再听一遍这个单词」+词音重播 / see=「再看看它指的地方」+部位图
   pulse / do=「再听一遍这个指令」不自动重播指令——错链窗 7200 内闭合，重播走再听按钮/救援），
   1000ms 防重入窗后可重选（探索不罚）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 词封闭 24（SPEC-R41 §R2：头→脚教学序；表外不出题。
   r41 扩容 8→24：原 8 词全保留（head/eye/ear/nose/mouth/hand/arm/leg）+新增 16
   （face/hair/eyebrow/tooth/tongue/chin/cheek/neck/shoulder/elbow/finger/thumb/knee/foot/toe/belly）*/
const WORDS24 = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',
                 'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
                 'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly'];
const PART_ZH = { head: '头', face: '脸', hair: '头发', eyebrow: '眉毛', eye: '眼睛',
                  ear: '耳朵', nose: '鼻子', mouth: '嘴巴', tooth: '牙齿', tongue: '舌头',
                  chin: '下巴', cheek: '脸颊', neck: '脖子', shoulder: '肩膀', arm: '胳膊',
                  elbow: '胳膊肘', hand: '手', finger: '手指', thumb: '大拇指', leg: '腿',
                  knee: '膝盖', foot: '脚', toe: '脚趾', belly: '肚子' };

/* ---------- 近形/近音族（r41：单伙伴 map→偏好序表；ch2+ 真值∈族 ⇒ 首族干扰必在场）。
   族构成=形近（eye↔ear↔eyebrow 同 ey/ea 头 / hand↔head↔hair 同 ha 头 / tooth↔tongue 同 to 头 /
   knee↔neck 同 ne 头 / chin↔cheek 同 ch 头 / foot↔toe/tooth 同 o·t / arm↔leg 三字母肢体对 /
   finger↔thumb 手部五指族）+近音（nose↔toe 押 /oʊ/ 韵，6-7 岁听力最小对立）。
   无族 4 词（face/mouth/shoulder/belly）：ch1 hear 与 do-touch 真值域+全程干扰位
   （r41 理由：face↔无同库形近词（pace/race∉库）；mouth↔month∉库；shoulder 8 字母无对；
   belly↔berry∉库——宁缺毋滥，假近形反而稀释辨析价值）。 */
const NEAR = {
  head: ['hand', 'hair'],   face: [],            hair: ['head', 'hand'],
  eyebrow: ['eye', 'ear'],  eye: ['ear', 'eyebrow'], ear: ['eye', 'eyebrow'],
  nose: ['toe', 'neck'],    mouth: [],           tooth: ['tongue', 'toe', 'foot'],
  tongue: ['tooth', 'toe'], chin: ['cheek', 'tooth'], cheek: ['chin', 'tongue'],
  neck: ['knee', 'nose'],   shoulder: [],        arm: ['leg', 'elbow'],
  elbow: ['arm', 'leg'],    hand: ['head', 'hair', 'finger'],
  finger: ['thumb', 'hand'], thumb: ['finger', 'hand'],
  leg: ['arm', 'knee'],     knee: ['neck', 'leg', 'toe'],
  foot: ['toe', 'tooth'],   toe: ['foot', 'nose', 'knee'],  belly: []
};
const NEAR20 = WORDS24.filter(w => NEAR[w].length > 0);   // 有族词（派生，禁手写漂移）

/* ---------- 动词指令域（r41 新题型 do；6-7 岁课标 TPR 域 5 个）。
   point 否决理由：与 touch 的图卡动作不可视觉区分（都是「爪子指向部位」），四候选可判定性
   优先（r31 判别力）；动作动词固定部位：clap=双手/shake=头/stomp=双脚/wave=单手。 */
const VERBS = ['touch', 'clap', 'shake', 'stomp', 'wave'];
const ACT_ZH = { clap: '拍拍手', shake: '摇摇头', stomp: '跺跺脚', wave: '挥挥手' };

/* ---------- 错反馈语义句（TTS 拼句，SPEC §0.70 语义；flat≥3 只 10s 节流——契约 J）
   hear=「再听一遍这个单词」（链尾拼 bod_w_<en> 词音重播）/ see=「再看看它指的地方」（+pulse）
   / do=「再听一遍这个指令」（不自动重播指令——错链窗 7200 内闭合，重播走再听/救援）。
   三句均 8 字（estMs=8×345+600=3360，全字符口径）；无数字词——契约 L 豁免款 */
const HEAR_AGAIN = '再听一遍这个单词';
const SEE_AGAIN = '再看看它指的地方';
const DO_AGAIN = '再听一遍这个指令';

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言）。
   r41：CHAPTERS[3].hint/GEN_HINTS[3] 更新（ch4 新增动词指令题，预告同步） */
const CHAPTERS = {
  1: { name: '听一听', hint: '睁大眼睛，看一看也要学会哦' },   // 预告 ch2 see 词形认读
  2: { name: '看一看', hint: '听和看要混在一起啦' },           // 预告 ch3 混出+近形
  3: { name: '混一混', hint: '大挑战来啦，还要听指令做动作' }, // 预告 ch4 混合+动词指令（r41 改）
  4: { name: '大挑战', hint: '新一轮身体英语开始啦' }          // 预告生成关
};
const GEN_HINTS = ['听一听，点身体',        // dch1 hear
                   '看一看，选单词',        // dch2 see
                   '近形词要分清哦',        // dch3 混出+近形
                   '听看做动作，大集合'];   // dch4 混合+动词指令（r41 改）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=bod_ 已核
   manifest 84 前缀无占用）。clip 实长（SPEC-BATCH29 §4）：watch 3168/turn 1824/hint 2184/
   right 2256/wrong 1656/q1 2952/q2 2952；词音 bod_w_*：head 1344/eye 1296/ear 1392/
   nose 1536/mouth 1440/hand 1512/arm 1440/leg 1392；r41 扩 16 词全域 max=bod_w_shoulder 1656
   （修复轮 m-2 勘误原「max 1536」=旧 8 词口径——确认句词音尾段窗按 max+300=1956）。
   r41 新键 23 条（16 词音 bod_w_* + do 7 键）注册前过渡态：play/queue 缺 clip 静默+console.warn
   （非 pageerror），视觉/交互/判定完整；主线 gen_clips 注册后自动完整（SPEC-R41 §R6）。 */
const VOICE = {
  watch: { key: 'bod_tut_watch', text: '看！听英语点身体' },
  turn:  { key: 'bod_tut_turn',  text: '你来点一点' },
  hint:  { key: 'bod_hint',      text: '再听一遍想一想' },
  right: { key: 'bod_right',     text: '点对啦，真棒' },
  wrong: { key: 'bod_wrong',     text: '再想一想' },
  q1:    { key: 'bod_q1',        text: '听一听，点出它的英语' },
  q2:    { key: 'bod_q2',        text: '看一看，选出它的英语' },
  q3:    { key: 'bod_q3',        text: '听一听，选出那个动作' }   // r41 do 题面句（10 字，开题链无窗）
};
const wordClip = w => 'bod_w_' + w;            // 词音键（en-US-AnaNeural 女童声）
const verbClip = v => 'bod_v_' + v;            // r41 指令键：touch=短语 clip+词音拼播/
                                              // clap·shake·stomp·wave=整短语 clip（en 童声）

/* ---------- 小兔身体 SVG（viewBox 0 0 210 260；hl=高亮部位 id 或 null=中性全身；
   mode='touch'=do-touch 卡叠加摸部位爪标——爪=暖橙描边小爪+指向短线，恒在最后绘制）
   r41 部位分组扩 8→24 .pt[data-part]：head 脸圆 / face 脸区椭圆（中性透明不描——区域本身
   即内容）/ hair 头顶呆毛 / eyebrow 双眉弓 / eye 双眼 / ear 双耳 / nose 鼻 / mouth 嘴 /
   tooth 门牙（兔宝宝大板牙，鼻下嘴上）/ tongue 舌（嘴下垂舌）/ chin 下巴（脸圆下缘凸起）/
   cheek 双颊红晕 / neck 脖（头躯之间竖带）/ shoulder 双肩垫（躯干上侧两角）/ arm 双臂 /
   elbow 双肘点（臂中）/ hand 双掌 / finger 掌上双指线 / thumb 掌侧拇指凸 / leg 双大腿
   （r41 改：原「脚蹄」画法移 foot，leg 重画为体侧大腿——腿/脚分离）/ knee 膝点（大腿上）/
   foot 双脚蹄 / toe 足趾小凸 / belly 肚皮（躯干中央椭圆，原中性衬底升格部位）。
   高亮=暖橙底 #F9C98A + 深橙描边 #C9772E + .pt.hl 辉光（CSS drop-shadow，方向级
   反馈再叠 .pt-pulse 三连闪）；hear 图卡=单部位高亮迷你兔，see 题面=目标部位高亮大图，
   do-touch 卡=高亮部位+爪标迷你兔。 */
function bodySvg(hl, mode) {
  const on = w => w === hl;
  const F = w => on(w) ? '#F9C98A' : '#FBF7F0';   // 部位底色（高亮=暖橙）
  const S = w => on(w) ? '#C9772E' : INK;         // 描边（高亮=深橙）
  const G = w => '<g class="pt' + (on(w) ? ' hl' : '') + '" data-part="' + w + '">';
  /* 双耳（耳廓+粉耳内；头后；两侧同包一组——与 arm/hand/leg 同构，高亮恰 1 组） */
  const earSide = (cx, rot) =>
    '<ellipse cx="' + cx + '" cy="46" rx="14" ry="34" fill="' + F('ear') + '" stroke="' + S('ear') + '" stroke-width="4" transform="rotate(' + rot + ' ' + cx + ' 46)"/>' +
    '<ellipse cx="' + cx + '" cy="50" rx="6" ry="22" fill="#F2B8C6" transform="rotate(' + rot + ' ' + cx + ' 46)"/>';
  const earG = G('ear') + earSide(84, -14) + earSide(128, 14) + '</g>';
  /* 脖子（头躯之间竖带；头后绘制露出下段——头覆盖上缘） */
  const neckG = G('neck') +
    '<rect x="93" y="150" width="24" height="34" rx="9" fill="' + F('neck') + '" stroke="' + S('neck') + '" stroke-width="4"/></g>';
  /* 双大腿（r41：体侧胶囊——与臂同构；原脚蹄画法归 foot） */
  const legG = G('leg') +
    '<ellipse cx="74" cy="228" rx="14" ry="21" fill="' + F('leg') + '" stroke="' + S('leg') + '" stroke-width="4" transform="rotate(10 74 228)"/>' +
    '<ellipse cx="136" cy="228" rx="14" ry="21" fill="' + F('leg') + '" stroke="' + S('leg') + '" stroke-width="4" transform="rotate(-10 136 228)"/></g>';
  /* 双膝点（大腿上缘小圆） */
  const kneeG = G('knee') +
    '<circle cx="74" cy="222" r="5.5" fill="' + F('knee') + '" stroke="' + S('knee') + '" stroke-width="3"/>' +
    '<circle cx="136" cy="222" r="5.5" fill="' + F('knee') + '" stroke="' + S('knee') + '" stroke-width="3"/></g>';
  /* 双脚蹄（体前趴蹄——原 leg 画法） */
  const footG = G('foot') +
    '<ellipse cx="82" cy="247" rx="17" ry="10" fill="' + F('foot') + '" stroke="' + S('foot') + '" stroke-width="4"/>' +
    '<ellipse cx="128" cy="247" rx="17" ry="10" fill="' + F('foot') + '" stroke="' + S('foot') + '" stroke-width="4"/></g>';
  /* 足趾（蹄前缘三小凸） */
  const toeFoot = cx => [cx - 8, cx, cx + 8].map(x =>
    '<circle cx="' + x + '" cy="252" r="2.4" fill="' + F('toe') + '" stroke="' + S('toe') + '" stroke-width="2"/>').join('');
  const toeG = G('toe') + toeFoot(82) + toeFoot(128) + '</g>';
  /* 双臂（体侧斜挂胶囊） */
  const armG = G('arm') +
    '<ellipse cx="63" cy="196" rx="11" ry="23" fill="' + F('arm') + '" stroke="' + S('arm') + '" stroke-width="4" transform="rotate(24 63 196)"/>' +
    '<ellipse cx="147" cy="196" rx="11" ry="23" fill="' + F('arm') + '" stroke="' + S('arm') + '" stroke-width="4" transform="rotate(-24 147 196)"/></g>';
  /* 双肘点（臂中外侧小圆） */
  const elbowG = G('elbow') +
    '<circle cx="71" cy="191" r="5" fill="' + F('elbow') + '" stroke="' + S('elbow') + '" stroke-width="3"/>' +
    '<circle cx="139" cy="191" r="5" fill="' + F('elbow') + '" stroke="' + S('elbow') + '" stroke-width="3"/></g>';
  /* 双掌（臂端圆爪） */
  const handG = G('hand') +
    '<circle cx="51" cy="217" r="10" fill="' + F('hand') + '" stroke="' + S('hand') + '" stroke-width="4"/>' +
    '<circle cx="159" cy="217" r="10" fill="' + F('hand') + '" stroke="' + S('hand') + '" stroke-width="4"/></g>';
  /* 手指（掌上双短线——中性淡棕，高亮深橙加粗） */
  const fingPaw = cx => [cx - 3.5, cx + 3.5].map(x =>
    '<line x1="' + x + '" y1="209.5" x2="' + x + '" y2="214.5" stroke="' + (on('finger') ? '#C9772E' : '#B9A88F') +
    '" stroke-width="' + (on('finger') ? 3.4 : 2.4) + '" stroke-linecap="round"/>').join('');
  const fingerG = G('finger') + fingPaw(51) + fingPaw(159) + '</g>';
  /* 大拇指（掌侧拇指凸——掌外缘小圆连掌，连指手套形） */
  const thumbG = G('thumb') +
    '<circle cx="43.5" cy="213.5" r="4.6" fill="' + F('thumb') + '" stroke="' + S('thumb') + '" stroke-width="3"/>' +
    '<circle cx="166.5" cy="213.5" r="4.6" fill="' + F('thumb') + '" stroke="' + S('thumb') + '" stroke-width="3"/></g>';
  /* 双肩垫（躯干上侧两角小椭圆，臂根上方） */
  const shoulderG = G('shoulder') +
    '<ellipse cx="72" cy="177" rx="11" ry="9" fill="' + F('shoulder') + '" stroke="' + S('shoulder') + '" stroke-width="3.5"/>' +
    '<ellipse cx="138" cy="177" rx="11" ry="9" fill="' + F('shoulder') + '" stroke="' + S('shoulder') + '" stroke-width="3.5"/></g>';
  /* 肚皮（躯干中央椭圆——原中性衬底升格部位） */
  const bellyG = G('belly') +
    '<ellipse cx="105" cy="208" rx="30" ry="26" fill="' + (on('belly') ? '#F9C98A' : '#F6EAD6') +
    '" stroke="' + (on('belly') ? '#C9772E' : 'none') + '" stroke-width="4"/></g>';
  /* 脸圆（头部；r41 cy 114→110 r 52→48 给脖/下巴让位） */
  const headG = G('head') +
    '<circle cx="105" cy="110" r="48" fill="' + F('head') + '" stroke="' + S('head') + '" stroke-width="4"/></g>';
  /* 呆毛（头顶三撮弧线） */
  const hairG = G('hair') +
    '<path d="M95 65 Q92 51 100 49 M104 63 Q104 47 112 49 M113 66 Q117 52 110 51" fill="none" stroke="' +
    (on('hair') ? '#C9772E' : INK) + '" stroke-width="' + (on('hair') ? 4.4 : 3.4) + '" stroke-linecap="round"/></g>';
  /* 脸区（眼鼻嘴所在椭圆；中性透明不描——区域本身即内容，不与 head 争夺中性视觉） */
  const faceG = G('face') +
    '<ellipse cx="105" cy="118" rx="33" ry="29" fill="' + (on('face') ? '#F9C98A' : 'rgba(0,0,0,0)') +
    '" stroke="' + (on('face') ? '#C9772E' : 'none') + '" stroke-width="4"/></g>';
  /* 双眉（眉弓短线；中性淡棕） */
  const browSide = x0 =>
    '<path d="M' + x0 + ' 95 Q' + (x0 + 8) + ' 88 ' + (x0 + 16) + ' 95" fill="none" stroke="' +
    (on('eyebrow') ? '#C9772E' : '#B9A88F') + '" stroke-width="' + (on('eyebrow') ? 4.4 : 3.2) + '" stroke-linecap="round"/>';
  const browG = G('eyebrow') + browSide(79) + browSide(115) + '</g>';
  /* 双眼（高亮=橙瞳放大加描边；中性=墨点+高光） */
  const eye = cx => '<circle cx="' + cx + '" cy="104" r="' + (on('eye') ? 8.5 : 7) +
    '" fill="' + (on('eye') ? '#E8975A' : INK) + '" stroke="' + (on('eye') ? INK : 'none') + '" stroke-width="2.5"/>' +
    (on('eye') ? '' : '<circle cx="' + (cx + 2.5) + '" cy="101.5" r="2.2" fill="#FFF" opacity=".85"/>');
  const eyeG = G('eye') + eye(87) + eye(123) + '</g>';
  /* 鼻（粉鼻/高亮橙鼻） */
  const noseG = G('nose') +
    '<ellipse cx="105" cy="123" rx="6.5" ry="5" fill="' + (on('nose') ? '#E8975A' : '#D98A8A') +
    '" stroke="' + S('nose') + '" stroke-width="' + (on('nose') ? 3 : 2.5) + '"/></g>';
  /* 门牙（兔宝宝大板牙：鼻下白方块；嘴前绘制） */
  const toothG = G('tooth') +
    '<rect x="100" y="127" width="10" height="8.5" rx="2" fill="' + (on('tooth') ? '#F9C98A' : '#FFFFFF') +
    '" stroke="' + (on('tooth') ? '#C9772E' : INK) + '" stroke-width="' + (on('tooth') ? 3 : 2) + '"/></g>';
  /* 嘴（w 形兔唇） */
  const mouthG = G('mouth') +
    '<path d="M97 136 q3.5 4.5 7 0 q3.5 4.5 7 0" fill="none" stroke="' + (on('mouth') ? '#C9772E' : INK) +
    '" stroke-width="' + (on('mouth') ? 4.5 : 3) + '" stroke-linecap="round"/></g>';
  /* 舌头（嘴下垂舌滴） */
  const tongueG = G('tongue') +
    '<ellipse cx="105" cy="146" rx="6" ry="8" fill="' + (on('tongue') ? '#F9C98A' : '#F2B8C6') +
    '" stroke="' + (on('tongue') ? '#C9772E' : INK) + '" stroke-width="' + (on('tongue') ? 3 : 2.4) + '"/></g>';
  /* 双颊红晕 */
  const cheekG = G('cheek') +
    '<ellipse cx="78" cy="124" rx="9" ry="6" fill="' + (on('cheek') ? '#F9C98A' : '#F2B8C6') +
    '" stroke="' + (on('cheek') ? '#C9772E' : 'none') + '" stroke-width="2.5"/>' +
    '<ellipse cx="132" cy="124" rx="9" ry="6" fill="' + (on('cheek') ? '#F9C98A' : '#F2B8C6') +
    '" stroke="' + (on('cheek') ? '#C9772E' : 'none') + '" stroke-width="2.5"/></g>';
  /* 下巴（脸圆下缘小凸） */
  const chinG = G('chin') +
    '<ellipse cx="105" cy="159" rx="11" ry="6" fill="' + F('chin') + '" stroke="' + S('chin') + '" stroke-width="3"/></g>';
  /* do-touch 爪标：小爪圆+双趾痕+指向短线（画在最后，位置按部位锚点偏外） */
  const PAW_ANCHOR = {
    head: [113, 88], face: [113, 122], hair: [113, 64], eyebrow: [95, 92], eye: [95, 104],
    ear: [84, 58], nose: [113, 124], mouth: [113, 136], tooth: [111, 132], tongue: [113, 146],
    chin: [113, 158], cheek: [86, 124], neck: [113, 172], shoulder: [72, 177], arm: [63, 196],
    elbow: [71, 191], hand: [51, 217], finger: [51, 210], thumb: [44, 214], leg: [74, 228],
    knee: [74, 221], foot: [82, 247], toe: [82, 241], belly: [113, 208]
  };
  const pawG = (mode === 'touch' && hl && PAW_ANCHOR[hl])
    ? '<g class="ptouch" aria-hidden="true">' +
      '<line x1="' + (PAW_ANCHOR[hl][0] + 4) + '" y1="' + (PAW_ANCHOR[hl][1] + 3) +
        '" x2="' + (PAW_ANCHOR[hl][0] + 9) + '" y2="' + (PAW_ANCHOR[hl][1] + 7) +
        '" stroke="#C9772E" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="' + (PAW_ANCHOR[hl][0] + 15) + '" cy="' + (PAW_ANCHOR[hl][1] + 12) +
        '" r="8" fill="#FFF9EE" stroke="#C9772E" stroke-width="3.4"/>' +
      '<line x1="' + (PAW_ANCHOR[hl][0] + 12) + '" y1="' + (PAW_ANCHOR[hl][1] + 8) +
        '" x2="' + (PAW_ANCHOR[hl][0] + 14.5) + '" y2="' + (PAW_ANCHOR[hl][1] + 11) +
        '" stroke="#C9772E" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="' + (PAW_ANCHOR[hl][0] + 17) + '" y1="' + (PAW_ANCHOR[hl][1] + 7.5) +
        '" x2="' + (PAW_ANCHOR[hl][0] + 19) + '" y2="' + (PAW_ANCHOR[hl][1] + 11) +
        '" stroke="#C9772E" stroke-width="2.2" stroke-linecap="round"/></g>'
    : '';
  /* 总装：地影→躯干→肚→脖→大腿→膝→脚→趾→臂→肘→掌→指→拇→肩→耳→脸圆→呆毛→脸区→
     眉→眼→鼻→门牙→嘴→舌→颊→下巴（前后遮挡次序；爪标最后） */
  return '<svg class="body" viewBox="0 0 210 260" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="105" cy="256" rx="62" ry="6" fill="#EFE3CD" opacity=".6"/>' +
    '<ellipse cx="105" cy="205" rx="52" ry="46" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    bellyG + neckG + legG + kneeG + footG + toeG + armG + elbowG + handG + fingerG + thumbG +
    shoulderG + earG + headG + hairG + faceG + browG + eyeG + noseG + toothG + mouthG + tongueG +
    cheekG + chinG + pawG +
    '</svg>';
}

/* ---------- 动作图标（r41 do 题 clap/shake/stomp/wave 候选卡；内嵌 SVG 描线风，主色 INK，
   viewBox 0 0 120 120；动作读法靠动效符号（冲击线/摆动弧/尘点）——图标即答案内容） */
const ACT_SVG = {
  clap: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M60 40 l0 -12 M44 44 l-8 -9 M76 44 l8 -9 M36 60 l-12 0 M84 60 l12 0" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="42" cy="68" r="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="78" cy="68" r="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<line x1="36" y1="56" x2="36" y2="62" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<line x1="48" y1="56" x2="48" y2="62" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<line x1="72" y1="56" x2="72" y2="62" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<line x1="84" y1="56" x2="84" y2="62" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M56 74 q4 4 8 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  shake: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M30 52 q-9 14 0 28 M20 46 q-14 20 0 36 M90 52 q9 14 0 28 M100 46 q14 20 0 36" stroke="#E8975A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="34" rx="7" ry="16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(-12 42 34)"/>' +
    '<ellipse cx="78" cy="34" rx="7" ry="16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(12 78 34)"/>' +
    '<circle cx="60" cy="72" r="26" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="51" cy="70" r="3.2" fill="' + INK + '"/><circle cx="69" cy="70" r="3.2" fill="' + INK + '"/>' +
    '<path d="M53 80 q7 6 14 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  stomp: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="60" cy="62" rx="27" ry="16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4" transform="rotate(-8 60 62)"/>' +
    '<circle cx="38" cy="54" r="3" fill="' + INK + '"/><circle cx="60" cy="51" r="3" fill="' + INK + '"/><circle cx="82" cy="54" r="3" fill="' + INK + '"/>' +
    '<path d="M38 86 l-4 14 M54 88 l-2 14 M70 88 l2 14 M84 84 l5 13" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="30" cy="102" r="4" fill="none" stroke="#E8975A" stroke-width="2.6"/>' +
    '<circle cx="94" cy="100" r="4.6" fill="none" stroke="#E8975A" stroke-width="2.6"/></svg>',
  wave: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M84 40 q10 16 0 32 M96 32 q16 24 0 48" stroke="#E8975A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="46" cy="64" r="20" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<line x1="34" y1="49" x2="31" y2="54" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<line x1="42" y1="46" x2="41" y2="52" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<line x1="50" y1="47" x2="52" y2="52" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M40 72 q6 5 12 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 小兔脸（家族 IP 锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="17" cy="13" rx="3.4" ry="7" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(-12 17 13)"/>' +
    '<ellipse cx="27" cy="13" rx="3.4" ry="7" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(12 27 13)"/>' +
    '<circle cx="22" cy="26" r="10.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="18.4" cy="25" r="1.6" fill="' + INK + '"/><circle cx="25.6" cy="25" r="1.6" fill="' + INK + '"/>' +
    '<path d="M20 29 q2 2 4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
