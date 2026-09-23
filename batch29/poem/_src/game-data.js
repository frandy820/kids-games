/* ================= poem 古诗跟读 游戏数据（诗封闭 12 / 行池 4×12 / 挖空表 48 / 章配置 / 语音文案 / 窗常量 / 配画 SVG）
   玩法（SPEC-BATCH29 §0.71/§2 + SPEC-R42-POEM）：顺序记忆+听辨认行+语序重建+缺字辨析。
   题面=诗题卡（每诗 1 幅主题配画 SVG 常驻背景承载诗意 + 诗名条 + 题面体：
   next 上行文字卡 / hear 听音图标 / fill 挖空句 / order 排序槽区），下方点选卡。
   题型四族（r42 谱）：
     next  出示上一行文字卡 + 读其行音拼 poe_q_next「下一句是哪一句」→ 行卡点选（ch1 坡 2 候选/ch2 起 4 候选）
     hear  播某行行音拼 poe_q_hear「听一听，是哪一句」→ 行卡点选（4 候选）
     fill  出示挖空句（句中挖 1 实词字）+ 读整句行音拼 poe_q_fill「缺了哪个字呀」
           → 4 字卡点选（真值+3 干扰，FILLS 封闭表 r42 定稿——干扰近形/近义/近类，蒙对 1/4）
     order 四句卡乱序（恒非原序）逐句即判排出正确语序（r25 M2 单步原子判定：
           点对当前句=飞入槽位 step 推进/点错=wrong miss+1 进度保留；句级排序区别于
           poemfill b17 的字级填空——poemfill 挖多字组词格，本款排整句语序）
   ---- 候选口径（§0.71+r42）----
   next/hear 行候选互异且 ⊆本诗行池；4 候选=池全集恒全摆（ch2 起）；next answer 行
   恒=prevLine+1 ≠ prevLine（上行作干扰在场）；fill 候选=真值字+FILLS.dis 3 干扰
   （互异、非句内字）；order opts=4 句乱序恒非 [0,1,2,3]（分布铁律：初始乱序非恒原序）。
   ---- 错反馈语义 ----
   next/fill 错→poe_wrong+引导句（next=poe_g_next「再读读上一行…」+上行卡 pulse /
   fill=poe_g_hear「再听一遍这一句」+挖空句 pulse——重听整句行音即听到挖空字音）；
   hear 错→poe_wrong+poe_g_hear+听音图标 pulse；order 错→poe_wrong+poe_g_next
   （「找找接下来那句」=排序每步语义精确贴合）+已排槽尾 pulse。1000ms 防重入窗后可重选。
   星级：全关错选 0=3★ / 1-2=2★ / ≥3=1★（永不 0 星；order 每错点计 1 miss）。
   契约 L：本款无数字/量词文案（诗行与引导句皆无数词——yqesl 数字诗文本豁免=诗原文），映射表豁免。 */
'use strict';

const INK = '#4A3B2E';                        // 统一暖棕描边（家族基调）
const ORG = '#E8975A';                        // 暖橙主色

/* ---------- 诗封闭 12（前 5=一年级已学原款保留【r42 锚面】；后 7=r42 新增半课外：
   一去二三里/敕勒歌/咏华山/江上渔者/登乐游原/鹿柴/相思——二年级课标+蒙学经典、
   6-7 岁可及；与 poemfill(b17) 30 首库重叠=0（其原 10+r13 新 20 已核，SPEC §R1）
   行文本与 voice/gen_clips.py 对账：前 5 诗=POEM29_LINES 现值严格一致（build 零手抄
   对账）；后 7 诗=r42 新键 TODO（主线 gen_clips 注册 POEM29_LINES 扩容后同律对账）；
   行音 clip key=poe_line_<pid>_<n>，禁复用 poemfill pf_poem 整诗 clip */
const POEMS = {
  yie:   { title: '咏鹅',       lines: ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'] },
  jys:   { title: '静夜思',     lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'] },
  cx:    { title: '春晓',       lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'] },
  mn:    { title: '悯农',       lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'] },
  dgjl:  { title: '登鹳雀楼',   lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'] },
  yqesl: { title: '一去二三里', lines: ['一去二三里', '烟村四五家', '亭台六七座', '八九十枝花'] },
  clg:   { title: '敕勒歌',     lines: ['敕勒川，阴山下', '天似穹庐，笼盖四野', '天苍苍，野茫茫', '风吹草低见牛羊'] },
  yhs:   { title: '咏华山',     lines: ['只有天在上', '更无山与齐', '举头红日近', '回首白云低'] },
  jsyz:  { title: '江上渔者',   lines: ['江上往来人', '但爱鲈鱼美', '君看一叶舟', '出没风波里'] },
  dlyy:  { title: '登乐游原',   lines: ['向晚意不适', '驱车登古原', '夕阳无限好', '只是近黄昏'] },
  lc:    { title: '鹿柴',       lines: ['空山不见人', '但闻人语响', '返景入深林', '复照青苔上'] },
  xs:    { title: '相思',       lines: ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思'] }
};
/* 关-诗映射（r42 §R2）：flat%12 = 诗 idx（POEM_IDS 下标——前 5 序不变保 flat0-4 锚面
   = 一年级旧 5 首；flat5-11 = 新 7 首各一）；dch=1+flat//5（静态 20 关章型四档） */
const POEM_IDS = ['yie', 'jys', 'cx', 'mn', 'dgjl',
                  'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs'];

/* ---------- 挖空封闭表 FILLS[pid][line] = { h: 汉位(跳标点 0 基), ch: 真值字, dis: [3 干扰] }
   r42 定稿（SPEC §R4）：每行恰 1 挖空位+固定 3 干扰（近形/近义/近类族，全部实词——
   名/动/形/数，非虚词）；真值字与行文本汉位互证（build/verify 双断言零手抄）；
   干扰互异、≠真值、非本句字（防题面可见排除）。
   位次分布铁律（r39-bis F1 同族防线）：全库 48 空 7 种汉位 {0:6,1:8,2:12,3:9,4:11,5:1,7:1}
   ——非恒首字（位 0 仅 12.5%）；每诗 ≥3 种位次（verify ㉒/pycheck 双落）。 */
const FILLS = {
  yie:   [ { h: 0, ch: '鹅', dis: ['鸡', '鸭', '雁'] }, { h: 4, ch: '歌', dis: ['唱', '鸣', '叫'] },
           { h: 2, ch: '浮', dis: ['游', '漂', '沉'] }, { h: 2, ch: '拨', dis: ['划', '推', '摇'] } ],
  jys:   [ { h: 3, ch: '月', dis: ['日', '星', '灯'] }, { h: 4, ch: '霜', dis: ['雪', '冰', '露'] },
           { h: 2, ch: '望', dis: ['看', '瞧', '观'] }, { h: 2, ch: '思', dis: ['想', '念', '恋'] } ],
  cx:    [ { h: 1, ch: '眠', dis: ['睡', '梦', '醒'] }, { h: 2, ch: '闻', dis: ['听', '见', '有'] },
           { h: 4, ch: '声', dis: ['响', '音', '光'] }, { h: 1, ch: '落', dis: ['开', '飘', '飞'] } ],
  mn:    [ { h: 0, ch: '锄', dis: ['种', '耕', '割'] }, { h: 1, ch: '滴', dis: ['流', '落', '洒'] },
           { h: 4, ch: '餐', dis: ['饭', '菜', '碗'] }, { h: 4, ch: '苦', dis: ['甜', '酸', '辣'] } ],
  dgjl:  [ { h: 4, ch: '尽', dis: ['落', '沉', '完'] }, { h: 3, ch: '海', dis: ['湖', '江', '天'] },
           { h: 1, ch: '穷', dis: ['看', '望', '见'] }, { h: 1, ch: '上', dis: ['下', '进', '回'] } ],
  yqesl: [ { h: 1, ch: '去', dis: ['回', '来', '走'] }, { h: 4, ch: '家', dis: ['户', '舍', '屋'] },
           { h: 2, ch: '六', dis: ['八', '九', '十'] }, { h: 3, ch: '枝', dis: ['朵', '棵', '片'] } ],
  clg:   [ { h: 2, ch: '川', dis: ['河', '原', '天'] }, { h: 7, ch: '野', dis: ['山', '川', '地'] },
           { h: 3, ch: '野', dis: ['草', '原', '地'] }, { h: 5, ch: '牛', dis: ['马', '驴', '犬'] } ],
  yhs:   [ { h: 2, ch: '天', dis: ['日', '月', '山'] }, { h: 4, ch: '齐', dis: ['平', '高', '远'] },
           { h: 0, ch: '举', dis: ['抬', '擎', '拿'] }, { h: 4, ch: '低', dis: ['高', '远', '近'] } ],
  jsyz:  [ { h: 2, ch: '往', dis: ['去', '过', '行'] }, { h: 3, ch: '鱼', dis: ['虾', '蟹', '龟'] },
           { h: 3, ch: '叶', dis: ['艘', '只', '条'] }, { h: 0, ch: '出', dis: ['入', '沉', '浮'] } ],
  dlyy:  [ { h: 1, ch: '晚', dis: ['晨', '早', '夜'] }, { h: 2, ch: '登', dis: ['上', '爬', '过'] },
           { h: 0, ch: '夕', dis: ['朝', '晨', '日'] }, { h: 3, ch: '黄', dis: ['红', '金', '黑'] } ],
  lc:    [ { h: 1, ch: '山', dis: ['林', '野', '谷'] }, { h: 4, ch: '响', dis: ['声', '音', '歌'] },
           { h: 3, ch: '深', dis: ['密', '暗', '远'] }, { h: 2, ch: '青', dis: ['绿', '蓝', '红'] } ],
  xs:    [ { h: 0, ch: '红', dis: ['绿', '黄', '黑'] }, { h: 2, ch: '发', dis: ['开', '长', '生'] },
           { h: 3, ch: '采', dis: ['摘', '拿', '收'] }, { h: 4, ch: '思', dis: ['念', '想', '恋'] } ]
};
/* 行文本汉位字（跳标点 0 基）——FILLS 真值互证用（verify/pycheck 与 main 渲染共用） */
const hanAt = (line, h) => {
  let k = -1;
  for (let i = 0; i < line.length; i++) {
    if ('，。！？、'.indexOf(line[i]) >= 0) continue;
    if (++k === h) return line[i];
  }
  return null;
};

/* ---------- 章配置（章号 1 基；r42 谱：ch1 next 坡/ch2 fill+next4/ch3 order+hear/ch4 四族）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（生成关预告，verify 关键词断言）。 */
const CHAPTERS = {
  1: { name: '找下一句', hint: '诗句缺字了，填一填' },       // 预告 ch2 fill
  2: { name: '填一填',   hint: '四句打乱了，排一排' },       // 预告 ch3 order
  3: { name: '排一排',   hint: '又读又听又排，大挑战' },     // 预告 ch4 四族混合
  4: { name: '大挑战',   hint: '新的古诗继续背起来' }        // 预告生成关（原样）
};
const GEN_HINTS = ['读上一句，想下一句',      // dch1 next 2 候选（原样）
                   '读读诗句，填出缺的字',    // dch2 fill+next4
                   '听一听，把诗句排好队',    // dch3 order+hear
                   '又读又听又排大挑战'];     // dch4 四族
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章 × 5 关（12 诗轮换 flat%12）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=poe_ 已核
   manifest 无占用（pf_=poemfill 不撞）；行音 poe_line_* ×48=晓晓读单行，不入 VOICE 表
   （走 lineKey 专用通道，复用于 next 上行/hear 听辨/fill 整句/order 全诗链）
   clip 实长（SPEC-BATCH29 §4，2026-09-10 浏览器实测）：watch 2904/turn 1776/hint 3096/
   right 2472/wrong 2232/q_next 2136/q_hear 2472/g_next 3720/g_hear 2112；
   旧 5 诗行音 max 2424。r42 新键（q_fill/q_order/新 7 诗行音 28）主线已注册
   （2026-09-22，manifest 5321）：q_fill 1944/q_order 2760/新行音 max=clg_1 3096
   （verify §SPEC_DUR 实测表）；est 估窗全部保守向（实长<est），窗常量维持不动。 */
const VOICE = {
  watch: { key: 'poe_tut_watch', text: '看！听一句古诗' },
  turn:  { key: 'poe_tut_turn',  text: '你来找一找' },
  hint:  { key: 'poe_hint',      text: '读读上一行，想想下一句' },
  right: { key: 'poe_right',     text: '找对啦，真厉害' },
  wrong: { key: 'poe_wrong',     text: '再读一读想一想' },
  qNext: { key: 'poe_q_next',    text: '下一句是哪一句' },
  qHear: { key: 'poe_q_hear',    text: '听一听，是哪一句' },
  qFill: { key: 'poe_q_fill',    text: '缺了哪个字呀' },          // r42 新键（已注册 2026-09-22）
  qOrder:{ key: 'poe_q_order',   text: '听一听，排出这首诗' }     // r42 新键（已注册 2026-09-22）
};

/* ---------- 语音窗常量（家族 G/H/I：clip 实长 + 停顿 150 + 余量 300）
   r42：LINE_MAX 2424→3900——新库最长行=敕勒歌行1「天似穹庐，笼盖四野」9 字符
   estMs=3705×1.043（旧库 estMs(5)=2325 vs 实测 2424 的实/估比外推）→ 取 3900
   【实测复核完成 2026-09-22：clg_1 实长 3096<3740，窗维持】。
   LINE_WIN=行音窗 3900+300=4200；NEXT_WIN=next 读题链窗 3900+150+2136+300=6486；
   HEAR_WIN=hear 链窗 3900+150+2472+300=6822；FILL_WIN=fill 链窗 3900+150+2700+300=7050
   （Q_FILL_MS=estMs(6 字)=2670 取整 2700【实测 1944，est 保守向】）；
   ORDER_WIN=order 全诗链窗=q_order 3705(est)+150×4+敕勒歌 Σ行 est 12750×1.043+300
   ≈18400 → 取 18600【实测口径 2760+600+10632+300=14292≤18600，全库最长诗链=敕勒歌】
   >14000 方向级救援间隔 → orderChainUntil 链豁免窗（r40 readChainUntil 同构，家族 I 扩展）。
   WRONG_CHAIN_WIN=错链豁免窗 ≥2232+150+3720+300=6402 → 取 8400（四族共用引导句
   g_next/g_hear 不变）；WATCH_T=教学 watch 后窗 2904+300=3204；TURN_DELAY ≥1776+300 → 2100 */
const LINE_MAX = 3900, Q_NEXT_MS = 2136, Q_HEAR_MS = 2472, Q_FILL_MS = 2700,
      Q_ORDER_MS = 3705, WRONG_MS = 2232, RIGHT_MS = 2472,
      WATCH_MS = 2904, TURN_MS = 1776;
const LINE_WIN = LINE_MAX + 300;                       // 4200
const NEXT_WIN = LINE_MAX + 150 + Q_NEXT_MS + 300;     // 6486
const HEAR_WIN = LINE_MAX + 150 + Q_HEAR_MS + 300;     // 6822
const FILL_WIN = LINE_MAX + 150 + Q_FILL_MS + 300;     // 7050
const ORDER_WIN = 18600;                               // ≥最坏诗（敕勒歌）全链 est+300（build/verify 双断言）
const WRONG_CHAIN_WIN = 8400;                          // ≥6402（四族共用，build/verify 双断言）
const WATCH_T = WATCH_MS + 300;                        // 3204
const TURN_DELAY = 2100;                               // ≥2076

/* ---------- 错反馈语义引导句（§0.71/r42 语义；clip 已在册（T46 阶段2 键段）零新键）
   next/order=再读上一行找接下来那句（order 排序每步=「找接下来那句」精确贴合）/
   hear/fill=再听同一句（fill 重听整句行音即听到挖空字音） */
const GUIDE_NEXT = '再读读上一行，找找接下来那句';     // 14 字符（estMs=5430，链豁免下界依据）
const GUIDE_HEAR = '再听一遍这一句';                   // 7 字符（estMs=3015）

/* 行音 clip key（poe_line_<pid>_<n>；n=0-3 行号） */
const lineKey = (pid, n) => 'poe_line_' + pid + '_' + n;

/* ---------- 配画 SVG（§0.71+r42：每诗 1 幅主题常驻背景，承载诗意维度非装饰——
   咏鹅=白鹅浮绿水红掌 / 静夜思=床前地上月光 / 春晓=枝头小鸟+落花 /
   悯农=烈日锄禾苗 / 登鹳雀楼=落日依山+楼阁+河波【以上原款 5 幅锚面保留】/
   一去二三里=烟村四五家炊烟+亭台+枝花 / 敕勒歌=穹庐天穹+草原+风吹草低见牛羊 /
   咏华山=华山高耸红日近+回首白云低 / 江上渔者=江上一叶舟+风波 /
   登乐游原=夕阳无限好+古原车辙 / 鹿柴=空山深林返照青苔 / 相思=红豆枝头南国；
   viewBox 0 0 360 150 同 conserve 框 */
function artFrame(body) {
  return '<svg class="sky" viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="10" y="14" width="340" height="122" rx="14" fill="#FDF3DF" stroke="none"/>' + body + '</svg>';
}
const POEM_ART = {
  /* 咏鹅：绿水波面 + 白鹅（白身/曲项向天/红掌拨波）——「曲项向天歌·白毛浮绿水·红掌拨清波」 */
  yie: artFrame(
    '<ellipse cx="72" cy="38" rx="26" ry="8" fill="#F6E8CC"/>' +
    '<ellipse cx="300" cy="30" rx="20" ry="6" fill="#F6E8CC"/>' +
    '<rect x="10" y="92" width="340" height="44" fill="#BFE0C8"/>' +
    '<path d="M24 104 q12 -6 24 0 t24 0 M130 116 q12 -6 24 0 t24 0 M262 106 q12 -6 24 0 t24 0" stroke="#8FC49B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="204" cy="92" rx="44" ry="23" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M176 90 q-24 -14 -22 -42" stroke="' + INK + '" stroke-width="15" fill="none" stroke-linecap="round"/>' +
    '<path d="M176 90 q-24 -14 -22 -42" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<circle cx="153" cy="42" r="11.5" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="156" cy="39" r="2.2" fill="' + INK + '"/>' +
    '<path d="M143 39 l-16 -3 10 12 z" fill="' + ORG + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M232 104 l15 9 M232 104 l17 1 M232 104 l13 -7 M232 104 l4 -15" stroke="' + ORG + '" stroke-width="3.5" stroke-linecap="round"/>'),
  /* 静夜思：圆月悬空 + 床前地上一片淡蓝白月光斑（疑是地上霜）+ 床沿——「床前明月光」 */
  jys: artFrame(
    '<circle cx="298" cy="46" r="27" fill="none" stroke="#E8D28F" stroke-width="2.5" opacity=".6"/>' +
    '<circle cx="298" cy="46" r="19" fill="#F7E9B0" stroke="#D8BC6E" stroke-width="3"/>' +
    '<path d="M288 52 a13 13 0 0 1 4 -14 M302 38 a9 9 0 0 1 6 10" stroke="#E3CE93" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 134 L92 98 L148 112 L82 146 Z" fill="#EDF3F7" stroke="#C7D8E4" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="72" cy="124" rx="18" ry="6" fill="#F8FBFD" stroke="#C7D8E4" stroke-width="2"/>' +
    '<rect x="216" y="108" width="13" height="30" rx="3" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M222 108 h108 M216 126 h114" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M232 126 q20 -10 44 0 t44 0" stroke="#D8C0A2" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  /* 春晓：右上枝头两只小鸟（处处闻啼鸟）+ 飘落花瓣（花落知多少）+ 春草 */
  cx: artFrame(
    '<path d="M352 26 q-58 8 -92 36 M300 40 q-16 10 -20 26 M268 54 q-14 8 -16 22" stroke="#B08968" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="266" cy="26" rx="15" ry="11" fill="' + ORG + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="253" cy="20" r="7.5" fill="' + ORG + '" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M246 19 l-8 1 8 4 z" fill="#F2C98C" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="252" cy="19" r="1.8" fill="' + INK + '"/>' +
    '<path d="M270 22 q12 -6 18 2 q-10 6 -18 -2" fill="#D97F4A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="312" cy="52" rx="13" ry="10" fill="#8FB3D9" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="322" cy="44" r="7" fill="#8FB3D9" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M329 43 l8 1 -8 4 z" fill="#F2C98C" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="323" cy="43" r="1.8" fill="' + INK + '"/>' +
    '<path d="M306 48 q-10 -4 -14 4 q10 4 14 -4" fill="#6E93BE" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<g fill="#F2B8C6" stroke="#D98CA0" stroke-width="1.6">' +
    '<ellipse cx="120" cy="76" rx="7" ry="4.5" transform="rotate(-24 120 76)"/>' +
    '<ellipse cx="86" cy="104" rx="7" ry="4.5" transform="rotate(18 86 104)"/>' +
    '<ellipse cx="150" cy="112" rx="7" ry="4.5" transform="rotate(-40 150 112)"/>' +
    '<ellipse cx="54" cy="126" rx="6" ry="4" transform="rotate(30 54 126)"/>' +
    '<ellipse cx="186" cy="128" rx="6" ry="4" transform="rotate(-12 186 128)"/>' +
    '<ellipse cx="112" cy="132" rx="6" ry="4" transform="rotate(8 112 132)"/></g>' +
    '<path d="M30 136 q4 -14 2 -20 M44 136 q-2 -12 4 -18 M214 136 q4 -12 0 -18" stroke="#57B368" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  /* 悯农：烈日当日（日当午）+ 扛锄农人（锄禾）+ 田垄禾苗——汗滴禾下土的画面锚 */
  mn: artFrame(
    '<circle cx="286" cy="38" r="17" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M286 12 v-6 M286 64 v6 M260 38 h-6 M312 38 h6 M268 20 l-4 -4 M304 56 l4 4 M304 20 l4 -4 M268 56 l-4 4" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M10 122 h340" stroke="#D8C0A2" stroke-width="3"/>' +
    '<circle cx="118" cy="76" r="10" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M100 74 q18 -14 36 0 z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M118 86 q-14 6 -12 24 h24 q2 -18 -12 -24" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M112 110 v12 M124 110 v12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M128 82 L172 58" stroke="#8A6B4F" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M172 58 q14 2 16 14 M172 58 l6 -10" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<path d="M56 122 q-2 -16 -10 -22 M62 122 q2 -14 10 -20 M78 122 q-2 -14 4 -20 M236 122 q-2 -16 -10 -22 M242 122 q4 -14 12 -18 M262 122 q-2 -14 6 -20 M300 122 q-2 -14 6 -20" stroke="#57B368" stroke-width="3.5" fill="none" stroke-linecap="round"/>'),
  /* 登鹳雀楼：白日半轮依山尽（落日贴山）+ 两层楼阁 + 黄河波流入画——登楼所见 */
  dgjl: artFrame(
    '<path d="M10 118 L96 52 L182 118 z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="96" cy="52" r="20" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M10 118 h340" stroke="#D8C0A2" stroke-width="3"/>' +
    '<path d="M26 130 q13 -6 26 0 t26 0 M120 132 q13 -6 26 0 t26 0 M214 130 q13 -6 26 0 t26 0 M266 132 q13 -6 26 0 t26 0" stroke="#C9A87C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<rect x="238" y="84" width="88" height="34" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="252" y="92" width="14" height="16" fill="#FBF6EC" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="298" y="92" width="14" height="16" fill="#FBF6EC" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="256" y="50" width="52" height="34" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="270" y="58" width="24" height="18" fill="#FBF6EC" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M244 50 h76 l8 -8 h-92 z M250 84 h64" stroke="' + INK + '" stroke-width="3" fill="#F2DDC0" stroke-linejoin="round"/>'),
  /* 一去二三里：炊烟小村（烟村四五家）+ 亭台（六七座）+ 枝头花（八九十枝花） */
  yqesl: artFrame(
    '<path d="M64 78 q-4 -16 2 -26 M70 78 q-6 -10 -2 -20 M76 78 q-2 -14 4 -22" stroke="#B8C4CC" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<rect x="46" y="78" width="42" height="26" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 78 l25 -14 25 14 z" fill="#D97F4A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="58" y="88" width="9" height="16" fill="' + INK + '"/>' +
    '<path d="M148 96 h44 M152 96 v-18 h36 v18 M150 78 h50 l-25 -14 z" stroke="' + INK + '" stroke-width="3" fill="#F2DDC0" stroke-linejoin="round"/>' +
    '<path d="M156 82 v8 M166 82 v8 M176 82 v8" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M246 46 q-22 14 -26 40 M232 60 q-12 2 -14 14" stroke="#B08968" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<g fill="#F2B8C6" stroke="#D98CA0" stroke-width="1.8">' +
    '<circle cx="252" cy="40" r="7"/>' +
    '<circle cx="266" cy="52" r="6"/>' +
    '<circle cx="246" cy="62" r="6"/>' +
    '<circle cx="260" cy="72" r="5.5"/>' +
    '<circle cx="222" cy="76" r="5"/></g>' +
    '<circle cx="252" cy="40" r="2" fill="' + ORG + '"/>' +
    '<circle cx="246" cy="62" r="2" fill="' + ORG + '"/>' +
    '<path d="M10 112 h340" stroke="#D8C0A2" stroke-width="3"/>' +
    '<path d="M20 124 q4 -12 0 -18 M34 124 q-2 -10 4 -16 M300 124 q4 -12 0 -18 M316 124 q-2 -10 4 -16" stroke="#57B368" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  /* 敕勒歌：穹庐天穹（天似穹庐）+ 草原（野茫茫）+ 风吹草低见牛羊（草浪间两牛两羊） */
  clg: artFrame(
    '<path d="M10 66 q85 -44 170 0 t170 0" stroke="#A8C8E8" stroke-width="3" fill="none" opacity=".7"/>' +
    '<path d="M10 78 q85 -40 170 0 t170 0" stroke="#A8C8E8" stroke-width="2.5" fill="none" opacity=".5"/>' +
    '<circle cx="62" cy="42" r="13" fill="#F7E9B0" stroke="#D8BC6E" stroke-width="2.6"/>' +
    '<path d="M10 108 q42 -12 85 0 t85 0 t85 0 t85 0" stroke="#8FC49B" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 118 q42 -10 85 0 t85 0 t85 0 t85 0" stroke="#57B368" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<rect x="10" y="120" width="340" height="16" fill="#BFE0C8" stroke="none"/>' +
    '<ellipse cx="120" cy="102" rx="20" ry="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="104" cy="94" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M98 88 l-4 -8 M110 88 l4 -8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="252" cy="98" rx="19" ry="10.5" fill="#F6E8CC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="237" cy="90" r="7.5" fill="#F6E8CC" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M246 88 q8 -6 12 2" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'),
  /* 咏华山：主峰高耸入云（更无山与齐）+ 红日近（举头红日近）+ 白云低（回首白云低） */
  yhs: artFrame(
    '<path d="M10 118 L88 34 L104 52 L128 22 L196 118 z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M118 40 l10 -12 10 12 z" fill="#FBF6EC" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="196" cy="44" r="17" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="196" cy="44" r="24" fill="none" stroke="' + ORG + '" stroke-width="2" opacity=".45"/>' +
    '<path d="M238 84 q18 -10 34 0 t34 -2" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<path d="M244 98 q16 -8 30 0 t28 -4" stroke="#FFF" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M10 118 h340" stroke="#D8C0A2" stroke-width="3"/>' +
    '<path d="M232 132 q12 -6 24 0 t24 0" stroke="#C9A87C" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  /* 江上渔者：江面（江上）+ 一叶小舟（君看一叶舟）+ 风波（出没风波里） */
  jsyz: artFrame(
    '<rect x="10" y="88" width="340" height="48" fill="#BFD9E8"/>' +
    '<path d="M28 104 q14 -6 28 0 t28 0 M210 118 q14 -6 28 0 t28 0 M92 126 q14 -6 28 0 t28 0 M268 102 q14 -6 28 0 t28 0" stroke="#8FB3D9" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M150 66 q34 -14 74 0" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M148 68 q38 10 78 -2 q-6 18 -38 20 q-32 -2 -40 -18 z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M188 68 v-22 l24 22" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="166" cy="48" r="8.5" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M152 46 q14 -12 28 0 z" fill="#8A6B4F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M160 68 q4 10 0 16" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M64 66 q10 -22 4 -34 M70 66 q-8 -16 -2 -30" stroke="#B8C4CC" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  /* 登乐游原：古道车辙（驱车登古原）+ 无限好夕阳（夕阳无限好）+ 黄昏天色（近黄昏） */
  dlyy: artFrame(
    '<circle cx="272" cy="66" r="24" fill="#F2A868" stroke="#D97F4A" stroke-width="3"/>' +
    '<circle cx="272" cy="66" r="33" fill="none" stroke="#F2A868" stroke-width="2.5" opacity=".5"/>' +
    '<rect x="10" y="94" width="340" height="42" fill="#F2DDC0" stroke="none"/>' +
    '<path d="M10 96 q60 -10 120 -2 t110 0 t110 2" stroke="#D8C0A2" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 118 q34 -8 68 0 M196 124 q34 -8 68 0" stroke="#C9A87C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M120 82 l44 -26" stroke="#8A6B4F" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="112" cy="84" r="10" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="168" cy="52" r="10" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M100 74 q12 -10 24 0 z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="112" cy="60" r="7" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="112" cy="60" r="2" fill="' + INK + '"/>' +
    '<ellipse cx="60" cy="106" rx="15" ry="7" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="228" cy="112" rx="15" ry="7" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>'),
  /* 鹿柴：空山（空山不见人）+ 深林（返景入深林）+ 一束返照落在青苔上（复照青苔上） */
  lc: artFrame(
    '<path d="M10 120 L64 40 L112 86 L150 26 L206 120 z" fill="#C8DCC8" stroke="#8FB49B" stroke-width="3" stroke-linejoin="round" opacity=".85"/>' +
    '<path d="M150 26 l-6 14 h12 z" fill="#FBF6EC" stroke="#8FB49B" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="10" y="120" width="340" height="16" fill="#BFE0C8" stroke="none"/>' +
    '<g stroke="#57B368" stroke-width="5" stroke-linecap="round" fill="none">' +
    '<path d="M240 126 v-44 M240 98 l-18 -14 M240 108 l18 -12"/>' +
    '<path d="M278 126 v-52 M278 96 l-16 -12 M278 106 l16 -10"/>' +
    '<path d="M312 126 v-40 M312 100 l-14 -10 M312 108 l14 -8"/></g>' +
    '<g stroke="#3E8E5A" stroke-width="3" stroke-linecap="round" fill="none">' +
    '<path d="M246 92 q10 -8 16 0 M272 88 q10 -8 16 0 M306 96 q10 -8 14 0"/></g>' +
    '<path d="M226 132 h104" stroke="#8FB49B" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="282" cy="132" rx="30" ry="4" fill="#6FA063" opacity=".45" stroke="none"/>' +
    '<path d="M150 34 l0 88" stroke="#F7E9B0" stroke-width="7" opacity=".55" stroke-linecap="round"/>' +
    '<path d="M158 40 l-6 82" stroke="#F7E9B0" stroke-width="3" opacity=".4" stroke-linecap="round"/>'),
  /* 相思：南国红豆枝（红豆生南国）+ 春来发枝（春来发几枝）+ 采撷小手意象（愿君多采撷） */
  xs: artFrame(
    '<path d="M352 30 q-64 10 -98 44 M296 44 q-18 12 -22 30 M270 58 q-14 10 -16 24" stroke="#B08968" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<g fill="#D94F4F" stroke="' + INK + '" stroke-width="2">' +
    '<circle cx="300" cy="34" r="8"/>' +
    '<circle cx="276" cy="58" r="7.5"/>' +
    '<circle cx="262" cy="80" r="7"/>' +
    '<circle cx="240" cy="98" r="6.5"/></g>' +
    '<g fill="#57B368" stroke="#3E8E5A" stroke-width="1.8">' +
    '<ellipse cx="318" cy="52" rx="11" ry="6" transform="rotate(24 318 52)"/>' +
    '<ellipse cx="288" cy="72" rx="11" ry="6" transform="rotate(28 288 72)"/>' +
    '<ellipse cx="224" cy="82" rx="10" ry="5.5" transform="rotate(18 224 82)"/></g>' +
    '<circle cx="300" cy="34" r="2.6" fill="#FFF9EE"/>' +
    '<circle cx="276" cy="58" r="2.4" fill="#FFF9EE"/>' +
    '<path d="M60 136 L96 96 L130 108 L104 136 Z" fill="#EDF3F7" stroke="#C7D8E4" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M10 136 q4 -14 2 -20 M24 136 q-2 -12 4 -18 M186 136 q4 -12 0 -18" stroke="#57B368" stroke-width="3" fill="none" stroke-linecap="round"/>')
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 诗卷意象（卷边+三行诗句） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M11 32 q0 -5 5 -5 h12 q5 0 5 -5" stroke="' + ORG + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M13 14 h18 M13 19.5 h18 M13 25 h11" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="32.5" cy="29" r="3" fill="' + ORG + '" stroke="' + INK + '" stroke-width="1.8"/></svg>',
  /* hear 题题面大听音图标（喇叭+三道声波；.hw 波弧做呼吸动画） */
  earBig: '<svg viewBox="0 0 104 74" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 26 h13 l15 -12 v46 l-15 -12 h-13 Z" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path class="hw" d="M58 25 q6 12 0 24" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path class="hw" d="M68 18 q11 19 0 38" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path class="hw" d="M78 11 q16 26 0 52" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  /* 上行卡内小喇叭（点上行卡=重听上行音的视觉提示） */
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="' + ORG + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
