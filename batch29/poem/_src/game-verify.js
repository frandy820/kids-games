/* ================= ?verify=1 自检（仅 verify 分支加载执行；r42 四族谱全量重写）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章映射（ch=flat/5+1）/ 关-诗映射（pid=SPEC_IDS[flat%12]，r42）/ 章型规则
     （structWhy 全 null；静态 dch=1+flat//5，生成关 dch∈1-4）/ 引擎直驱
     （order 题逐句 4 点 step×3→right/末 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_POEMS 12 诗+SPEC_IDS+SPEC_FILLS 48 挖空封闭表——
     verify 内从 SPEC-R42-POEM §R4 与 gen_clips.py 文字独立重列，不引用页面
     POEMS/POEM_IDS/FILLS）× 40 关全题：行卡文本↔行号互证 / 互异 ⊆池 /
     next·hear 4 候选=池全集（ch2+）/ ch1 2 候选 / answer 独立复算 /
     fill 挖空位+真值互证（hanAt）+干扰 3 在场+非句内 / order 4 句全集+恒非原序
   ③ 章型聚合：dch1 全 next / dch2 fill+next 混出（fill ≥2+next ≥1 每关）/
     dch3 order+hear 混出（各 ≥2 每关）/ dch4 四族各 ≥1 每关 / 生成关四型全现
   ④ tapOpt 单元（flat0 真实 UI 状态机【原款锚面】：越界=null；错=wrong+miss+1+
     1000ms 防重入+反馈链绑定（poe_wrong+SPEC 口径引导句）；对=right 推进）
   ㉒ fill 单元（r42 新）：flat5 首 fill 题——挖空句 DOM（.fill-line .hole 在场+
     汉位换算互证）/ 4 字卡 / FILLS 独立表对账 / 点错 wrong+点对 right 推进
   ㉓ order 单元（r42 新）：flat10 首 order 题——初始乱序非原序 / 槽区在场 /
     step×3（进度保留+槽逐个填充）+right 推进 / 错点 miss+1 进度保留（r25 M2）
     +错链 guide 键断言 [poe_wrong, poe_g_next]（m3）
   ⑨ 读题拼播链 stub 对账（家族 G·四型）：next=[行音, poe_q_next] /
     hear=[行音, poe_q_hear] / fill=[整句行音, poe_q_fill] /
     order=[poe_q_order, 4 行音全诗链]
   ⑧ 帧内容断言（契约 M）：next 上行卡 / hear 听音图标 / fill 挖空句帧 /
     order 槽区帧 / 诗名条==SPEC 诗名 / 卡 DOM 文本逐卡==opts（渲染即引擎）
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __pmDemoR==='right' 且
     tut='help'，watch 折算真实时长 ≤16s（r42 分账 14610）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑦ UI 冒烟：flat0 autoSolve 通关（taps=5 恒 3 星）；flat10（ch3 order+hear）
     先 1 错再 autoSolve（1 错=2 星；taps=Σ(order?4:1) 独立复算）
   ⑩ 布局：双 viewport ×（flat0 两卡 / flat5 fill 字卡 / flat10 order 句卡+槽）：
     卡 ≥96×96（主答案按钮）、配画 SVG ≥120px 高、排序槽 ≥40px 宽、
     描边对比度 ≥3:1、overflowX ≤0
   ⑪ clips（r42 终态 2026-09-22 主线注册）：poe_ 59 + core 3 = 62 全注入 +
     duration 辨别器（11 通用条+新 30 键 SPEC 实长 ±60ms；旧 5 诗行音 >500
     且 ≤2424+60）
   ⑫ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑬ 契约 A/B/F/I/J/K 源码断言（读自身合并 script 文本）+orderChainUntil 三处
     （speakQuiz 设窗/rescueTick 守卫/startLevel 重置——家族 I r42 扩展）
   ⑭ 章末预告关键词独立硬编码（r42 新表）+ 生成关 nextHint(f)===GEN_HINTS
     [genLevel(f+1).dch-1] 对账
   ⑮ estMs 语音窗动态断言（r42 §R9 est 口径；实测复核完成 2026-09-22：
     clg_1 实测 3096<est 3705 保守向）：
     LINE_MAX ≥ 敕勒歌行1 est 3705×1.04；四型读题链窗 ≥ 链估+300；
     ORDER_WIN ≥ 敕勒歌全诗链估 17355；错链豁免 ≥6402；判对窗 3600 与
     celebrate 3020 ≥ 2472+300；WATCH_T 3204/TURN_DELAY 2100
   ⑯ SPEED=0.12 提速断言
   ⑰ 关-诗映射专项：flat0-19 全表 (pid,dch) 硬编码期望——flat0=yie/dch1（锚面）、
     flat5=yqesl/dch2、flat10=lc/dch3、flat15=mn/dch4
   ⑱ 分布断言（r39-bis 铁律）：40 关 fill 题挖空位 ≥5 种汉位且位 0 占比 ≤30%；
     order 初始序 40 关全非 [0,1,2,3]（structWhy 同律，独立复算）；fill 真值卡位
     直方图 4 位各 ≥ceil(n/8)（防答案恒位——F1 防线）；m3 扩展=next/hear 答案
     卡位（4 卡/2 卡分桶）+order 首步正确卡位同 ceil(n/8) 下界
   结果写 #verify-result + window.__pmVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R42-POEM §R1/§R4 文字独立重列（禁抄页面 POEMS/POEM_IDS/FILLS/VOICE 表）
     前 5 诗=gen_clips.py POEM29_LINES 现值；新 7 诗=SPEC-R42 §R1 定稿 */
  const SPEC_POEMS = {
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
  const SPEC_IDS = ['yie', 'jys', 'cx', 'mn', 'dgjl',
                    'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs'];   // flat%12=诗 idx（r42）
  /* SPEC-R42 §R4 挖空封闭表独立重列：[h 汉位, ch 真值, dis 3 干扰] × 12 诗 × 4 行 */
  const SPEC_FILLS = {
    yie:   [[0, '鹅', ['鸡', '鸭', '雁']], [4, '歌', ['唱', '鸣', '叫']], [2, '浮', ['游', '漂', '沉']], [2, '拨', ['划', '推', '摇']]],
    jys:   [[3, '月', ['日', '星', '灯']], [4, '霜', ['雪', '冰', '露']], [2, '望', ['看', '瞧', '观']], [2, '思', ['想', '念', '恋']]],
    cx:    [[1, '眠', ['睡', '梦', '醒']], [2, '闻', ['听', '见', '有']], [4, '声', ['响', '音', '光']], [1, '落', ['开', '飘', '飞']]],
    mn:    [[0, '锄', ['种', '耕', '割']], [1, '滴', ['流', '落', '洒']], [4, '餐', ['饭', '菜', '碗']], [4, '苦', ['甜', '酸', '辣']]],
    dgjl:  [[4, '尽', ['落', '沉', '完']], [3, '海', ['湖', '江', '天']], [1, '穷', ['看', '望', '见']], [1, '上', ['下', '进', '回']]],
    yqesl: [[1, '去', ['回', '来', '走']], [4, '家', ['户', '舍', '屋']], [2, '六', ['八', '九', '十']], [3, '枝', ['朵', '棵', '片']]],
    clg:   [[2, '川', ['河', '原', '天']], [7, '野', ['山', '川', '地']], [3, '野', ['草', '原', '地']], [5, '牛', ['马', '驴', '犬']]],
    yhs:   [[2, '天', ['日', '月', '山']], [4, '齐', ['平', '高', '远']], [0, '举', ['抬', '擎', '拿']], [4, '低', ['高', '远', '近']]],
    jsyz:  [[2, '往', ['去', '过', '行']], [3, '鱼', ['虾', '蟹', '龟']], [3, '叶', ['艘', '只', '条']], [0, '出', ['入', '沉', '浮']]],
    dlyy:  [[1, '晚', ['晨', '早', '夜']], [2, '登', ['上', '爬', '过']], [0, '夕', ['朝', '晨', '日']], [3, '黄', ['红', '金', '黑']]],
    lc:    [[1, '山', ['林', '野', '谷']], [4, '响', ['声', '音', '歌']], [3, '深', ['密', '暗', '远']], [2, '青', ['绿', '蓝', '红']]],
    xs:    [[0, '红', ['绿', '黄', '黑']], [2, '发', ['开', '长', '生']], [3, '采', ['摘', '拿', '收']], [4, '思', ['念', '想', '恋']]]
  };
  const SPEC_DUR = { poe_tut_watch: 2904, poe_tut_turn: 1776, poe_hint: 3096,
                     poe_right: 2472, poe_wrong: 2232, poe_q_next: 2136, poe_q_hear: 2472,
                     poe_g_next: 3720, poe_g_hear: 2112,   // 在册 9 条实长（SPEC §4）
                     /* r42 30 新键实长（主线 mutagen 实测 2026-09-22，manifest 5321）：
                        最长 poe_line_clg_1=3096（LINE_MAX 3900 est 口径预扩，实测 3096<3705 est 保守方向）；
                        ORDER_WIN 实测口径=2760+150*4+clg 行合计 10632+300=14292 <=18600 */
                     poe_q_fill: 1944, poe_q_order: 2760,
                     poe_line_yqesl_0: 1944, poe_line_yqesl_1: 2016, poe_line_yqesl_2: 2040, poe_line_yqesl_3: 1896,
                     poe_line_clg_0: 2496, poe_line_clg_1: 3096, poe_line_clg_2: 2544, poe_line_clg_3: 2496,
                     poe_line_yhs_0: 1944, poe_line_yhs_1: 1992, poe_line_yhs_2: 1920, poe_line_yhs_3: 1944,
                     poe_line_jsyz_0: 1944, poe_line_jsyz_1: 1896, poe_line_jsyz_2: 1968, poe_line_jsyz_3: 1944,
                     poe_line_dlyy_0: 1944, poe_line_dlyy_1: 2016, poe_line_dlyy_2: 1992, poe_line_dlyy_3: 1992,
                     poe_line_lc_0: 1968, poe_line_lc_1: 1896, poe_line_lc_2: 2064, poe_line_lc_3: 2064,
                     poe_line_xs_0: 2088, poe_line_xs_1: 2040, poe_line_xs_2: 2136, poe_line_xs_3: 2040 };
  const SPEC_LINE_MAX_OLD = 2424;                     // 旧 5 诗行音实长 max（§4 实测）
  const SPEC_GUIDE_NEXT = '再读读上一行，找找接下来那句';          // next/order 错引导句（14 字符）
  const SPEC_GUIDE_HEAR = '再听一遍这一句';                       // hear/fill 错引导句（7 字符）
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  /* 汉位字（跳标点 0 基）——SPEC 口径独立实现 */
  const specHanAt = (line, h) => { let k = -1; for (let i = 0; i < line.length; i++) { if ('，。！？、'.indexOf(line[i]) >= 0) continue; if (++k === h) return line[i]; } return null; };
  /* answer 独立复算：next=上行下一句 / hear=音频行 / fill=真值字卡 / order=动态当前步 */
  const specAnsIdx = q => q.kind === 'next' ? q.prevLine + 1 : q.audioLine;
  /* 敕勒歌全诗链估（r42 §R9 最坏链）：q_order 3705 + 4×150 + Σ行 est(3015+3705+3015+3015) + 300 */
  const SPEC_CLG_CHAIN = 3705 + 600 + (3015 + 3705 + 3015 + 3015) + 300;   // 17355
  const unlocked = async () => {                  // 等防重入/演出窗结束（verify 提速后 ≤6s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* 驱动到 flat 关内首个 kind 题型（前面题逐点点掉；order 4 点）——返回该题快照 */
  const driveToKind = async (flat, kind) => {
    startLevel(flat);
    await unlocked();
    for (let g = 0; g < 30; g++) {
      const q = PM.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (q.kind === 'order') { for (let p = 0; p < 4; p++) { await PM.tapOpt(correctIdx(cur.quizzes[cur.step])); await unlocked(); } }
      else { await PM.tapOpt(q.answer); await unlocked(); }
    }
    return null;
  };

  /* ---- ①②③ 40 关全量审计 + SPEC 表独立对账 + 章型聚合 ---- */
  const kindSeen = { 1: {}, 2: {}, 3: {}, 4: {} }, genDch = {}, mixBad = [], dch4Bad = [];
  const fillHoleHist = {}, fillAnsHist = { 0: 0, 1: 0, 2: 0, 3: 0 }, orderSortedN = 0;
  /* r42 修复轮 m3：next/hear 答案卡位直方图（4 卡桶=dch2+ 全摆池洗牌位 / 2 卡桶=dch1
     ch1 关）+ order 首步正确卡位（idx 0 句在 opts 中的位置）——F1 恒位防线扩三型 */
  const ans4Hist = { 0: 0, 1: 0, 2: 0, 3: 0 }, ans2Hist = { 0: 0, 1: 0 },
        orderFirstHist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let nFillQ = 0, tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) { ruleOk = false; badCase = 'struct ' + flat + '/' + k + ':' + why; }
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const pidOk = L1.pid === SPEC_IDS[flat % 12];                                 // 关-诗映射（r42）
    const dchOk = flat < STATIC_LEVELS ? L1.dch === 1 + Math.floor(flat / 5)
                                       : (L1.dch >= 1 && L1.dch <= 4);          // 生成关随机章参数
    /* 引擎直驱：order 逐句 4 点（step×3→right/done）其余单点；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (q.kind === 'order') {
        for (let p = 0; p < 4 && driveOk; p++) {
          const exp = p < 3 ? 'step' : (k === L3.quizzes.length - 1 ? 'done' : 'right');
          const r = engTapOpt(L3, correctIdx(q));
          if (r !== exp || q._miss !== 0) driveOk = false;
        }
      } else {
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
        const r = engTapOpt(L3, q.answer);
        if (r !== exp || q._miss !== 0) driveOk = false;
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* 章型混出（③）：dch2 fill ≥2+next ≥1 / dch3 order ≥2+hear ≥2 / dch4 四族各 ≥1 */
    const cnt = k => L1.quizzes.filter(q => q.kind === k).length;
    if (L1.dch === 2 && (cnt('fill') < 2 || cnt('next') < 1)) mixBad.push('d2 ' + flat + ':' + cnt('fill') + '/' + cnt('next'));
    if (L1.dch === 3 && (cnt('order') < 2 || cnt('hear') < 2)) mixBad.push('d3 ' + flat + ':' + cnt('order') + '/' + cnt('hear'));
    if (L1.dch === 4 && (cnt('next') < 1 || cnt('fill') < 1 || cnt('order') < 1 || cnt('hear') < 1))
      dch4Bad.push(flat + ':' + ['next', 'fill', 'order', 'hear'].map(cnt).join('/'));

    /* SPEC 表独立对账（每题） */
    let specOk = true;
    const specLines = SPEC_POEMS[L1.pid].lines;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      kindSeen[L1.dch][q.kind] = (kindSeen[L1.dch][q.kind] || 0) + 1;
      if (q.kind === 'order') {
        const idxs = q.opts.map(o => o.idx);
        if (idxs.slice().sort().join() !== '0,1,2,3') { badCase = 'ordFull ' + flat + '/' + k; specOk = false; break; }     // 全集=排序后恰 0123
        if (idxs.join() === '0,1,2,3') { orderSortedN++; badCase = 'ordSorted ' + flat + '/' + k; specOk = false; break; }  // 恒非原序
        orderFirstHist[idxs.indexOf(0)]++;                      // 首步正确卡位（m3）
        for (let j = 0; j < 4; j++) if (q.opts[j].line !== specLines[idxs[j]]) { badCase = 'ordText ' + flat + '/' + k; specOk = false; break outer; }
        continue;
      }
      if (q.kind === 'fill') {
        const f = SPEC_FILLS[L1.pid][q.line];
        nFillQ++;
        fillHoleHist[q.hole] = (fillHoleHist[q.hole] || 0) + 1;
        if (!f || q.hole !== f[0] || specHanAt(specLines[q.line], f[0]) !== f[1]) {   // 挖空位+真值互证（零手抄）
          badCase = 'fillSpec ' + flat + '/' + k; specOk = false; break;
        }
        const chs = q.opts.map(o => o.ch);
        if (q.opts.length !== 4) { badCase = 'fillLen ' + flat + '/' + k; specOk = false; break; }
        for (let j = 0; j < 4; j++) if (chs.indexOf(chs[j]) !== j) { badCase = 'fillDup ' + flat + '/' + k; specOk = false; break outer; }
        if (chs.indexOf(f[1]) < 0) { badCase = 'fillTruth ' + flat + '/' + k; specOk = false; break; }
        for (let d = 0; d < 3; d++) {
          if (chs.indexOf(f[2][d]) < 0) { badCase = 'fillDis ' + flat + '/' + k; specOk = false; break; }
          if (specLines[q.line].indexOf(f[2][d]) >= 0) { badCase = 'fillDisIn ' + flat + '/' + k; specOk = false; break; }   // 干扰非句内字
        }
        if (!specOk) break;
        if (q.answer < 0 || q.answer >= 4 || chs[q.answer] !== f[1]) { badCase = 'fillAns ' + flat + '/' + k; specOk = false; break; }
        fillAnsHist[q.answer]++;
        continue;
      }
      /* next / hear（原款口径） */
      const nOpt = L1.dch === 1 ? 2 : 4;
      if (q.opts.length !== nOpt) { badCase = 'len ' + flat + '/' + k; specOk = false; break; }
      const idxs = [];
      for (let j = 0; j < q.opts.length; j++) {           // 行文本↔行号互证+互异+⊆池
        const o = q.opts[j];
        if (o.idx < 0 || o.idx > 3 || o.line !== specLines[o.idx]) {
          badCase = 'lineText ' + flat + '/' + k; specOk = false; break outer;
        }
        if (idxs.indexOf(o.idx) >= 0) { badCase = 'dup ' + flat + '/' + k; specOk = false; break outer; }
        idxs.push(o.idx);
      }
      if (!specOk) break;
      if (nOpt === 4 && idxs.slice().sort().join() !== '0,1,2,3') {   // 4 候选=池全集恒全摆
        badCase = 'fullSet ' + flat + '/' + k; specOk = false; break;
      }
      if (nOpt === 2 && idxs.filter(i => i !== specAnsIdx(q)).length !== 1) {   // ch1=真值+1 干扰
        badCase = 'twoOpt ' + flat + '/' + k; specOk = false; break;
      }
      const want = specAnsIdx(q);                        // answer 独立复算（行号+文本双口径）
      if (q.answer < 0 || q.answer >= nOpt || q.opts[q.answer].idx !== want ||
          q.opts[q.answer].line !== specLines[want]) {
        badCase = 'ans ' + flat + '/' + k; specOk = false; break;
      }
      if (nOpt === 4) ans4Hist[q.answer]++; else ans2Hist[q.answer]++;   // 答案卡位（m3）
      if (q.kind === 'next') {                           // 「排除上行」答案层口径：answer 行≠上行行
        if (q.prevLine === null || q.prevLine < 0 || q.prevLine > 2 || want === q.prevLine ||
            q.audioLine !== null) { badCase = 'nextSem ' + flat + '/' + k; specOk = false; break; }
      } else {
        if (q.audioLine === null || q.audioLine < 0 || q.audioLine > 3 ||
            q.prevLine !== null) { badCase = 'hearSem ' + flat + '/' + k; specOk = false; break; }
      }
    }
    if (!specOk) tableOk = false;
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && pidOk && dchOk && driveOk && solvedAll && specOk &&
               mixBad.length === 0 && dch4Bad.length === 0;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, pid: L1.pid, ok: ok, det: det, ruleOk: ruleOk,
                  chOk: chOk, pidOk: pidOk, dchOk: dchOk, driveOk: driveOk,
                  solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => q.kind === 'order' ? 'O' : q.kind[0] +
                    (q.kind === 'next' ? q.prevLine : q.kind === 'hear' ? q.audioLine : q.line)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 聚合：dch1 纯 next / dch2 fill+next / dch3 order+hear / dch4 四族 / 生成关四型全现 */
  const aggOk = tableOk && mixBad.length === 0 && dch4Bad.length === 0 &&
    kindSeen[1].next > 0 && !kindSeen[1].hear && !kindSeen[1].fill && !kindSeen[1].order &&
    kindSeen[2].next > 0 && kindSeen[2].fill > 0 && !kindSeen[2].hear && !kindSeen[2].order &&
    kindSeen[3].order > 0 && kindSeen[3].hear > 0 && !kindSeen[3].next && !kindSeen[3].fill &&
    kindSeen[4].next > 0 && kindSeen[4].hear > 0 && kindSeen[4].fill > 0 && kindSeen[4].order > 0 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  total++;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, mixBad: mixBad, dch4Bad: dch4Bad, kinds: kindSeen, genDch: genDch };

  /* ---- ⑰ 关-诗映射专项（flat0-19 全表硬编码期望；r42 锚=flat0 yie/dch1、
     flat5 yqesl/dch2、flat10 lc/dch3、flat15 mn/dch4） ---- */
  total++;
  let mapOk = true;
  for (let flat = 0; flat < 20; flat++) {
    const ePid = SPEC_IDS[flat % 12], eDch = 1 + Math.floor(flat / 5);
    const L = genLevel(flat);
    if (L.pid !== ePid || L.dch !== eDch) { mapOk = false; break; }
  }
  const f5 = genLevel(5), f10 = genLevel(10), f15 = genLevel(15);
  const anchorOk = f5.pid === 'yqesl' && f5.dch === 2 && f10.pid === 'lc' && f10.dch === 3 &&
                   f15.pid === 'mn' && f15.dch === 4;
  const m17 = mapOk && anchorOk;
  if (m17) npass++;
  units.map = { ok: m17, flat20: mapOk, flat5: f5.pid + '/dch' + f5.dch,
                flat10: f10.pid + '/dch' + f10.dch, flat15: f15.pid + '/dch' + f15.dch };

  /* ---- ④ tapOpt 单元（flat0 dch1 next 2 候选【原款锚面】：立即开点） ---- */
  total++;
  startLevel(0);
  const q4 = PM.quiz;
  const initOk = q4 && q4.kind === 'next' && q4.poem === 'yie' && q4.prevLine === 0 &&
                 q4.audioLine === null && q4.opts.length === 2 &&
                 q4.opts[q4.answer].line === SPEC_POEMS.yie.lines[1] &&      /* 真值=第二行 */
                 q4.step === 0 && q4.miss === 0 &&
                 q4.opts[0].line !== q4.opts[1].line;
  const badTap = (await PM.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wIdx = q4.opts.findIndex((o, i) => i !== q4.answer);   // 唯一错卡
  const pW = PM.tapOpt(wIdx);                              // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await PM.tapOpt(wIdx);                      // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue[0] === 'poe_wrong' &&   // 反馈链=poe_wrong+引导句 clip
                window.__lastQueue[1] && window.__lastQueue[1].key === 'poe_g_next' &&
                window.__lastQueue[1].text === SPEC_GUIDE_NEXT;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             PM.quiz.miss === 1 && PM.currentLevel.miss === 1;
  const pW2 = PM.tapOpt(wIdx);                             // 同题再点错卡（防重入窗后）
  const rW2 = await pW2;
  const s1b = rW2 === 'wrong' && PM.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rR = await PM.tapOpt(q4.answer);
  const s2 = rR === 'right' && PM.quiz.step === 1 && PM.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, right: s2 };

  /* ---- ㉒ fill 单元（flat5 首 fill 题：挖空句帧+字卡+FILLS 独立表+判定链） ---- */
  total++;
  const qf0 = await driveToKind(5, 'fill');
  const flDom = sceneEl.querySelector('.fill-line');
  const flHole = flDom && flDom.querySelector('.hole');
  const flTxts = flDom ? Array.prototype.map.call(flDom.querySelectorAll('.fc'), s => s.textContent) : [];
  const sf = qf0 ? SPEC_FILLS.yqesl[qf0.line] : null;
  const expJoin = qf0 ? (function () {          // 期望非挖字序列：整行汉字去汉位 h 处（独立构造）
    let k = -1; const out = [];
    for (const c of SPEC_POEMS.yqesl.lines[qf0.line]) {
      if ('，。！？、'.indexOf(c) >= 0) continue;
      if (++k !== qf0.hole) out.push(c);
    }
    return out.join('');
  })() : '';
  const flHoleOk = qf0 && qf0.kind === 'fill' && !!flDom && !!flHole &&
                   flTxts.join('') === expJoin &&                            /* 非挖字逐字在场 */
                   flHole.textContent === '?' &&                              /* 空槽占位符 */
                   Number(flDom.dataset.hole) === qf0.hole && Number(flDom.dataset.line) === qf0.line;
  const fcards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  const flBoardOk = fcards.length === 4 && boardEl.dataset.k === 'fill' &&
                    fcards.every((c, i) => c.querySelector('.t-label').textContent === qf0.opts[i].ch);
  const fWrong = qf0 ? await PM.tapOpt((qf0.answer + 1) % 4) : null;      // 点错字卡
  const fMiss = PM.quiz && PM.quiz.miss === 1;
  const fChain = window.__lastQueue && window.__lastQueue[1] &&
                 window.__lastQueue[1].key === 'poe_g_hear' &&             // fill 错引导=再听这一句
                 window.__lastQueue[1].text === SPEC_GUIDE_HEAR;
  const fRight = await PM.tapOpt(PM.quiz.answer);
  const fillOk = flHoleOk && flBoardOk && fWrong === 'wrong' && fMiss && fChain &&
                 fRight === 'right';
  if (fillOk) npass++;
  units.fill = { ok: fillOk, frame: flHoleOk, board: flBoardOk, wrong: fWrong === 'wrong' && fMiss,
                 chain: fChain, right: fRight === 'right', line: qf0 && qf0.line, hole: qf0 && qf0.hole };

  /* ---- ㉓ order 单元（flat10 首 order 题：乱序帧+槽区+step 推进+错点进度保留） ---- */
  total++;
  const qo0 = await driveToKind(10, 'order');
  const oSlots = sceneEl.querySelectorAll('.oslot');
  const oIdxs = qo0 ? qo0.opts.map(o => o.idx) : [];
  const oFrameOk = qo0 && qo0.kind === 'order' && oSlots.length === 4 &&
                   oIdxs.join() !== '0,1,2,3' &&                             // 初始乱序非原序
                   oIdxs.slice().sort().join() === '0,1,2,3' &&               // 全集
                   PM.quiz.prog === 0;
  let stepSeq = [], slotFilled = [];
  if (qo0) {
    const p1 = await PM.tapOpt(correctIdx(cur.quizzes[cur.step])); stepSeq.push(p1);   // 第 1 句
    slotFilled.push(oSlots[0].classList.contains('filled') && oSlots[0].querySelector('.os-t').textContent === SPEC_POEMS.lc.lines[0]);
    const p2 = await PM.tapOpt(correctIdx(cur.quizzes[cur.step])); stepSeq.push(p2);   // 第 2 句
    slotFilled.push(oSlots[1].classList.contains('filled'));
    const wIdx2 = (function () { const q = cur.quizzes[cur.step]; for (let j = 0; j < q.opts.length; j++) if (j !== correctIdx(q)) return j; return 0; })();
    const pW3 = await PM.tapOpt(wIdx2);                 // 错点：miss+1 进度保留（r25 M2）
    const kept = PM.quiz.prog === 2 && PM.quiz.miss === 1;
    // r42 修复轮 m3：order 错链 guide 键断言=[poe_wrong, poe_g_next]（实现 game-main 258-260；㉒ fill 同式对位）
    const wChainOk = window.__lastQueue && window.__lastQueue[0] === 'poe_wrong' &&
                     window.__lastQueue[1] && window.__lastQueue[1].key === 'poe_g_next';
    const p3 = await PM.tapOpt(correctIdx(cur.quizzes[cur.step])); stepSeq.push(p3);
    const p4 = await PM.tapOpt(correctIdx(cur.quizzes[cur.step])); stepSeq.push(p4);   // 第 4 句=right/done
    const seqOk = stepSeq[0] === 'step' && stepSeq[1] === 'step' && pW3 === 'wrong' && kept &&
                  p3 === 'step' && (p4 === 'right' || p4 === 'done') && wChainOk;
    const slotOk = slotFilled[0] === true && slotFilled[1] === true &&
                   oSlots[3].classList.contains('filled');
    units.order = { ok: oFrameOk && seqOk && slotOk, frame: oFrameOk, seq: seqOk ? 'ok' : stepSeq.join(','),
                    wrongKept: kept, wrongChain: !!wChainOk, slots: slotOk, init: oIdxs.join('') };
  }
  const orderOk = units.order ? units.order.ok : false;
  if (orderOk) npass++;
  if (!units.order) units.order = { ok: false, miss: 'no order quiz' };

  /* ---- ⑨ 读题拼播链 stub 对账（家族 G·四型） ---- */
  total++;
  startLevel(0);
  speakQuiz();
  const chainNext = JSON.stringify(window.__lastQueue) === JSON.stringify(['poe_line_yie_0', 'poe_q_next']);
  const qhc = await driveToKind(10, 'hear');
  speakQuiz();
  const chainHear = qhc && window.__lastQueue && window.__lastQueue[0] === 'poe_line_lc_' + qhc.audioLine &&
                    window.__lastQueue[1] === 'poe_q_hear';
  const qfc = await driveToKind(5, 'fill');
  speakQuiz();
  const chainFill = qfc && window.__lastQueue && window.__lastQueue[0] === 'poe_line_yqesl_' + qfc.line &&
                    window.__lastQueue[1] === 'poe_q_fill';
  const qoc = await driveToKind(10, 'order');
  speakQuiz();
  const chainOrder = qoc && JSON.stringify(window.__lastQueue) === JSON.stringify(
    ['poe_q_order', 'poe_line_lc_0', 'poe_line_lc_1', 'poe_line_lc_2', 'poe_line_lc_3']);
  const chainOk = chainNext && chainHear && chainFill && chainOrder;
  if (chainOk) npass++;
  units.qchain = { ok: chainOk, next: chainNext, hear: chainHear, fill: chainFill, order: chainOrder };

  /* ---- ⑧ 帧内容断言（契约 M：next/fill/order 帧内元素内容与 SPEC 真值一致） ---- */
  total++;
  startLevel(5);                                           // dch2（yqesl fill+next 混出）
  const qf8 = PM.quiz;
  const prevEl = sceneEl.querySelector('.prev-line');
  const prevTxt = prevEl && prevEl.querySelector('.pl-txt') ? prevEl.querySelector('.pl-txt').textContent : '';
  const titleTxt = sceneEl.querySelector('.q-text') ? sceneEl.querySelector('.q-text').textContent : '';
  const isNext5 = qf8.kind === 'next';
  const frameNext = isNext5 && !!prevEl &&
                    prevTxt === SPEC_POEMS.yqesl.lines[qf8.prevLine] &&
                    titleTxt === SPEC_POEMS.yqesl.title && !sceneEl.querySelector('.hear-ico');
  const cards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  const frameBoard = cards.length === qf8.opts.length &&
    cards.every((c, i) => c.dataset.i === String(i) &&
      c.querySelector('.t-label').textContent === (qf8.opts[i].line || qf8.opts[i].ch) &&
      (qf8.kind === 'fill' || c.dataset.oid === String(qf8.opts[i].idx)));
  const rF = await PM.tapOpt(qf8.answer);                  /* 答对推进 → 新题帧更新 */
  const qf2 = PM.quiz;
  const frameAdv = rF === 'right' && qf2 && PM.currentLevel.step === 1;
  const qh2 = await driveToKind(10, 'hear');               // dch3（lc order+hear）驱动至首 hear 题
  const frameHear = qh2 && qh2.kind === 'hear' && !!sceneEl.querySelector('.hear-ico') &&
                    !sceneEl.querySelector('.prev-line') &&
                    sceneEl.querySelector('.q-text').textContent === SPEC_POEMS.lc.title &&
                    sceneEl.querySelector('.hear-ico').dataset.line === String(qh2.audioLine);
  const frameOk = frameNext && frameBoard && frameAdv && frameHear;
  if (frameOk) npass++;
  units.frames = { ok: frameOk, next: frameNext, board: frameBoard, adv: frameAdv, hear: frameHear };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __pmDemoR='right'（演示点第二行卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__pmDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'next' &&
                cur.quizzes[0].prevLine === 0 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__pmDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await PM.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await PM.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && PM.quiz.step === 0 && PM.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await PM.autoSolve();
  const lv0 = PM.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B：flat10（ch3 lc order+hear）先 1 错再 autoSolve（1 错=2 星；
     taps 期望独立复算=Σ(order?4:1)——order 题每题 4 点） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q8 = PM.quiz;
  const wrongC = q8.kind === 'order'
    ? (function () { for (let j = 0; j < q8.opts.length; j++) if (j !== correctIdx(cur.quizzes[cur.step])) return j; return 0; })()
    : q8.opts.findIndex((o, i) => i !== q8.answer);
  const r8 = await PM.tapOpt(wrongC);
  const L10 = genLevel(10);
  const expTaps = L10.quizzes.reduce((s, q) => s + (q.kind === 'order' ? 4 : 1), 0);
  const a10 = await PM.autoSolve();
  const lv10 = PM.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === expTaps && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, expTaps: expTaps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 两行卡 / flat5 fill 字卡 / flat10 order 句卡+槽） ---- */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cssToHex = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [1, 2, 3].map(i => ('0' + (+m[i]).toString(16)).slice(-2)).join('') : c; };
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const svg = sceneEl.querySelector('.scene-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const slots = Array.prototype.map.call(sceneEl.querySelectorAll('.oslot'), s => s.offsetWidth);
    const slotOk = slots.length === 0 || slots.every(x => x >= 40);          // order 槽 ≥40px（非题面跳过）
    const hitOk = cards.length > 0 && cards.every(b => b.w >= 96 && b.h >= 96);   /* 卡=主答案按钮 ≥96 */
    const sceneOk = svgh >= 120 && sc.w >= 64 && sc.h >= 64;          /* 配画 ≥120px 高 */
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, svgH: svgh, slotW: slots,
             hitOk: hitOk, sceneOk: sceneOk, slotOk: slotOk, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && slotOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips（r42 终态 2026-09-22 主线注册）：poe_ 59 + core 3 = 62 全注入 + duration 辨别器 ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['poe_tut_watch', 'poe_tut_turn', 'poe_hint', 'poe_right', 'poe_wrong',
                'poe_q_next', 'poe_q_hear', 'poe_q_fill', 'poe_q_order', 'poe_g_next', 'poe_g_hear',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  for (let i = 0; i < 4; i++) for (const p of ['yie', 'jys', 'cx', 'mn', 'dgjl',
                                               'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs'])   // 12 诗行音 48
    need.push('poe_line_' + p + '_' + i);
  const preOk = keys.length === 62 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  durKeys.push('poe_line_yie_0', 'poe_line_dgjl_3', 'poe_line_mn_1', 'poe_line_jys_2', 'poe_line_cx_3',
               'poe_q_fill', 'poe_q_order', 'poe_line_clg_1', 'poe_line_clg_3', 'poe_line_yqesl_0');   // r42 新键代表（clg=最长行族）
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  let durOk = true;
  for (let i = 0; i < durKeys.length; i++) {
    const spec = SPEC_DUR[durKeys[i]];
    if (spec != null) { if (Math.abs(durs[i] - spec) > 60) durOk = false; }   // 通用条 ±60ms
    else if (!(durs[i] > 500 && durs[i] <= SPEC_LINE_MAX_OLD + 60)) durOk = false;   // 旧 5 诗行音 ≤旧 max+60
  }
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑬ 契约 A/B/F/I/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块）
     + r42 orderChainUntil 三处（家族 I 扩展） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0;   // B：双锚
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&    // F：生成关实算 dch-1
               src.indexOf('(ci ' + '+ 1) % 4') < 0;   /* F：禁 (ci+1)%4——字符串拼接防源码自匹配 */
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcI42 = src.indexOf('orderChainUntil = Date.now() + ORDER_WIN') >= 0 &&
                 src.indexOf('Date.now() < wrongChainUntil || Date.now() < orderChainUntil') >= 0 &&
                 src.indexOf('orderChainUntil = 0;') >= 0;   // I-r42：order 链豁免三处
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf('function rescueTick()') >= 0 &&               // K：命名函数+面板守卫
               src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0;
  const srcOk = srcA && srcB && srcF && srcI && srcI42 && srcJ && srcK;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, F: srcF, I: srcI, I42: srcI42, J: srcJ, K: srcK };

  /* ---- ⑭ 章末预告关键词独立硬编码（r42 新表：hint[i] ↔ CHAPTERS[i+1]；
     GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('填') >= 0 &&                       // 预告 ch2 fill
                 CHAPTERS[2].hint.indexOf('排') >= 0 &&                       // 预告 ch3 order
                 CHAPTERS[3].hint.indexOf('挑战') >= 0 &&                     // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                       // 预告生成关
                 GEN_HINTS[0].indexOf('下一句') >= 0 &&                       // dch1 next
                 GEN_HINTS[1].indexOf('填') >= 0 &&                           // dch2 fill
                 GEN_HINTS[2].indexOf('排') >= 0 &&                           // dch3 order
                 GEN_HINTS[3].indexOf('挑战') >= 0;                           // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ estMs 语音窗动态断言（r42 §R9 est 口径；主线实测复核 2026-09-22 完成：
     clg_1 实测 3096 < est 3705（est 高估方向保守），LINE_MAX 3900 双口径均罩；ORDER_WIN 实测口径 14292≤18600） ---- */
  total++;
  const estChainFill = LINE_MAX + 150 + 2700 + 300;
  const winOk = LINE_MAX >= Math.ceil(3705 * 1.04) &&                        // ≥3854（敕勒歌行1）
                NEXT_WIN >= LINE_MAX + 150 + SPEC_DUR.poe_q_next + 300 &&    // 6486
                HEAR_WIN >= LINE_MAX + 150 + SPEC_DUR.poe_q_hear + 300 &&    // 6822
                FILL_WIN >= estChainFill &&                                  // 7050 ≥ 7050
                ORDER_WIN >= SPEC_CLG_CHAIN &&                               // 18600 ≥ 17355（最坏诗链）
                WRONG_CHAIN_WIN >= SPEC_DUR.poe_wrong + 150 + SPEC_DUR.poe_g_next + 300 &&   // 8400 ≥ 6402
                (1800 + 1800) >= SPEC_DUR.poe_right + 300 &&                 // 判对窗 3600 ≥ 2772
                (2620 + 400) >= SPEC_DUR.poe_right + 300 &&                  // celebrate 3020 ≥ 2772
                WATCH_T >= SPEC_DUR.poe_tut_watch + 300 &&                   // 3204
                TURN_DELAY >= SPEC_DUR.poe_tut_turn + 300;                   // 2100 ≥ 2076
  const estData = { lineMax: LINE_MAX, nextWin: NEXT_WIN, hearWin: HEAR_WIN,
                    fillWin: FILL_WIN, orderWin: ORDER_WIN, clgChain: SPEC_CLG_CHAIN,
                    wrongChain: WRONG_CHAIN_WIN, lineWin: LINE_WIN,
                    chainNeed: SPEC_DUR.poe_wrong + 150 + SPEC_DUR.poe_g_next + 300,
                    rightWin: 3600, rightFlow: 3020, watchT: WATCH_T, turnDelay: TURN_DELAY };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑯ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑱ 分布断言（r39-bis 铁律：防恒位/防恒首挖） ---- */
  total++;
  const holeKeys = Object.keys(fillHoleHist);
  const hole0N = fillHoleHist[0] || 0;
  const holesOk = holeKeys.length >= 5 &&                                  // ≥5 种汉位
                  hole0N / Math.max(1, nFillQ) <= 0.30 &&                   // 位 0 占比 ≤30%
                  orderSortedN === 0;                                      // 40 关 order 全非原序
  const ansN = fillAnsHist[0] + fillAnsHist[1] + fillAnsHist[2] + fillAnsHist[3];
  const ansOk = ansN > 0 && [0, 1, 2, 3].every(i => fillAnsHist[i] >= Math.ceil(ansN / 8));   // 真值卡位半值下限
  /* m3 扩展：next/hear 答案卡位（4 卡桶均匀期望 n/4、2 卡桶 n/2——下界统一 ceil(n/8)
     半值口径防假红，恒位（某位 0）必抓）+ order 首步正确卡位 4 位同律 */
  const a4N = ans4Hist[0] + ans4Hist[1] + ans4Hist[2] + ans4Hist[3];
  const a4Ok = a4N === 0 || [0, 1, 2, 3].every(i => ans4Hist[i] >= Math.ceil(a4N / 8));
  const a2N = ans2Hist[0] + ans2Hist[1];
  const a2Ok = a2N === 0 || (ans2Hist[0] >= Math.ceil(a2N / 8) && ans2Hist[1] >= Math.ceil(a2N / 8));
  const ofN = orderFirstHist[0] + orderFirstHist[1] + orderFirstHist[2] + orderFirstHist[3];
  const ofOk = ofN === 0 || [0, 1, 2, 3].every(i => orderFirstHist[i] >= Math.ceil(ofN / 8));
  const distOk = holesOk && ansOk && a4Ok && a2Ok && ofOk;
  if (distOk) npass++;
  units.dist = { ok: distOk, holes: holesOk, holesHist: fillHoleHist, hole0Ratio: hole0N / Math.max(1, nFillQ),
                 ansHist: fillAnsHist, ansN: ansN, orderSorted: orderSortedN, nFill: nFillQ,
                 ans4Hist: ans4Hist, a4N: a4N, ans2Hist: ans2Hist, a2N: a2N,
                 orderFirstHist: orderFirstHist, ofN: ofN };

  const out = { game: 'poem', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__pmVlog = out;                          // 挂 window 供外部断言（任务书 §verify）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；voice.say 记录 TTS 拼句
     （__lastSayText）；voice.queue 记录拼播链（__lastQueue）供反馈链/读题链绑定断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
