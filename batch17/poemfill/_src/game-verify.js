/* ================= ?verify=1 自检（仅 verify 分支加载执行；build 独立第 4 script 块）
   断言全部从 SPEC-BATCH17 §1-r13+§0.34 推导（禁从实现行为归纳——b15/b16 双批教训）；
   REF 侧字面量与 game-data 分源双写（内容一致，笔误即 fail）：
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/ 诗库域 30 首
     分源复算（REF_POEMS 独立字面量：诗全文+作者一致）/ 关→诗映射（静态 15+生成关池轮换）
     / 章题构成（REF_COMPOSE 逐题序：F×3+R×2 / O 型 F×3+R+O / FF×5）/ 题型结构
     （F:cueIdx 0-2·ansIdx=cueIdx+1；R:cueIdx 1-3·ansIdx=cueIdx-1；O:三槽 li1-3；FF 含字句）/
     干扰句规则分源复算（F/R=同诗他句恰 1+他诗同长句；O=他诗同长 1；FF=不含指定字 3、
     互异、库内真句、干扰≠答案≠题面句）/ 句卡互异 / 飞花令指定字轮换
     （FF_CHARS[(lv+k)%3]）与答案句关级互异 / 章诗长档（dch1 全 5 字·dch2 全 7 字）/
     整首朗读 clip（pf_poem_<pid> 30 条在场）/ 同关 5 题 sig 互异 / structOk
     / 反启发式锚：同句跨题正解+干扰双现 ≥5 句
   ①b 引擎直驱：非法句卡/已用卡拒绝；填满错=miss 恰一次（退回后重填再错再计）；
     退回=探索零计数；正确填满推进 right/done；星级三档独立驱动
   ①c 救援目标闭环：rescueTarget（undo/tile）步进执行收敛到填对（right）
   ② tapCard 单元（flat0 F 题+flat10 O 题真实 UI）：入槽 DOM 同步（句卡 .gone+槽 .full+句文）
     +退回复活（tapBuilt 重建小方格+句卡还原）+非法下标 false+钩子 lines 视图（题面句全文/
     答案句 □ 串/不参与句 ''）
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题选错一次+退回路径=1 错 2 星；verify 页不弹层；
     答对=right clip+答案句完整朗读 say(原句)+关末整首朗读奖励 pf_poem_<pid> 在场——r13）
   ④ UI 冒烟 B：flat10（ch3：F×3+R+O）全对通关 3 星（O 题=4 卡 3 槽句序重组）
   ④b UI 冒烟 C：flat15（ch4 飞花令）5 轮全对通关——每轮正解句必含指定字+干扰句不含
     （引擎真值）；关末无整首朗读（ch4 无单一诗）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → 读题面句（TTS 豁免）→ demo 点答案
     句卡 __pfDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([pf_tut_turn]) 单通道
     （r13 开场链无整首朗读）→ tut='help' 解锁
   ⑤ 布局（竖屏三件套 M3）：双 viewport（1280×800 / 800×1180 body.port）×（flat0/5/10/15
     =ch1-4 四形态）：句卡/句槽 ≥64、读音/提示 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、
     句卡 rect 落卡池容器、portStyle 固定尺寸判别锚（.scard 高横 76/竖 66）、overflowX ≤0
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿 6 句不变）/ POEMS 与 REF_POEMS
     30 首双写对账（题+作者+全文）/ LEVEL_POEMS 与 REF_LEVEL_POEMS 双写 / FF_CHARS 双写
     +含字句频次（飞 6/春 7/花 8 ≥5 出题域）/ 165 条 clips（pf 6+pf_poem 30+T46 pf_l 120 行
     +pf_ff 6+core 3；T46 阶段2 行键全集从 POEMS 封闭域推导）/
     开场链=queue([pf_hint]) 单通道（r13 无整首朗读）/ 重听=say(题面句) TTS 通道（不再播
     整首 clip）/ 首字提示=pf_first+槽首格亮首字 / 整首朗读无 TTS 兜底（缺 clip=不播+false）
   ⑭ duration（r13 门禁）：40 关 modeled 时长硬断言——独立副本常量重列（禁引源模型：
     引擎：V_DECIDE/V_RIGHT/V_TAIL/V_ENTER/V_STAGE/V_MIN）≥40000+与源模型 levelDurMs
     逐关对账+每步 DECIDE≥voiceWin（认知步主体——语音窗从不撑时长）+最低值精确 70625
     （ch1 五言关 F×3+R×2——SPEC §1-r13 验算，防回漂）+源常量同步断言
     （estMs 全字符口径/DECIDE_MS/LEVEL_MIN_MS）
   结果写 #verify-result + window.__pfVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算字面量（与 game-data 分源双写；内容一致，笔误即 fail） ---- */
  const REF_POEMS = {
    yie:   { title: '咏鹅',       author: '骆宾王', lines: ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'] },
    jys:   { title: '静夜思',     author: '李白',   lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'] },
    cx:    { title: '春晓',       author: '孟浩然', lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'] },
    mn:    { title: '悯农',       author: '李绅',   lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'] },
    dgjl:  { title: '登鹳雀楼',   author: '王之涣', lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'] },
    cs:    { title: '池上',       author: '白居易', lines: ['小娃撑小艇', '偷采白莲回', '不解藏踪迹', '浮萍一道开'] },
    jx:    { title: '江雪',       author: '柳宗元', lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'] },
    wlsbp: { title: '望庐山瀑布', author: '李白',   lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'] },
    zwl:   { title: '赠汪伦',     author: '李白',   lines: ['李白乘舟将欲行', '忽闻岸上踏歌声', '桃花潭水深千尺', '不及汪伦送我情'] },
    jgsh:  { title: '绝句',       author: '杜甫',   lines: ['两个黄鹂鸣翠柳', '一行白鹭上青天', '窗含西岭千秋雪', '门泊东吴万里船'] },
    hua:   { title: '画',         author: '佚名',   lines: ['远看山有色', '近听水无声', '春去花还在', '人来鸟不惊'] },
    glyx:  { title: '古朗月行',   author: '李白',   lines: ['小时不识月', '呼作白玉盘', '又疑瑶台镜', '飞在青云端'] },
    feng:  { title: '风',         author: '李峤',   lines: ['解落三秋叶', '能开二月花', '过江千尺浪', '入竹万竿斜'] },
    xyze:  { title: '寻隐者不遇', author: '贾岛',   lines: ['松下问童子', '言师采药去', '只在此山中', '云深不知处'] },
    xich:  { title: '小池',       author: '杨万里', lines: ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头'] },
    huaj:  { title: '画鸡',       author: '唐寅',   lines: ['头上红冠不用裁', '满身雪白走将来', '平生不敢轻言语', '一叫千门万户开'] },
    yess:  { title: '夜宿山寺',   author: '李白',   lines: ['危楼高百尺', '手可摘星辰', '不敢高声语', '恐惊天上人'] },
    meih:  { title: '梅花',       author: '王安石', lines: ['墙角数枝梅', '凌寒独自开', '遥知不是雪', '为有暗香来'] },
    xec:   { title: '小儿垂钓',   author: '胡令能', lines: ['蓬头稚子学垂纶', '侧坐莓苔草映身', '路人借问遥招手', '怕得鱼惊不应人'] },
    cunj:  { title: '村居',       author: '高鼎',   lines: ['草长莺飞二月天', '拂堤杨柳醉春烟', '儿童散学归来早', '忙趁东风放纸鸢'] },
    yl:    { title: '咏柳',       author: '贺知章', lines: ['碧玉妆成一树高', '万条垂下绿丝绦', '不知细叶谁裁出', '二月春风似剪刀'] },
    cao:   { title: '草',         author: '白居易', lines: ['离离原上草', '一岁一枯荣', '野火烧不尽', '春风吹又生'] },
    xjc:   { title: '晓出净慈寺送林子方', author: '杨万里', lines: ['毕竟西湖六月中', '风光不与四时同', '接天莲叶无穷碧', '映日荷花别样红'] },
    mnq:   { title: '悯农·其一',  author: '李绅',   lines: ['春种一粒粟', '秋收万颗子', '四海无闲田', '农夫犹饿死'] },
    zys:   { title: '舟夜书所见', author: '查慎行', lines: ['月黑见渔灯', '孤光一点萤', '微微风簇浪', '散作满河星'] },
    sjian: { title: '所见',       author: '袁枚',   lines: ['牧童骑黄牛', '歌声振林樾', '意欲捕鸣蝉', '忽然闭口立'] },
    zlj:   { title: '赠刘景文',   author: '苏轼',   lines: ['荷尽已无擎雨盖', '菊残犹有傲霜枝', '一年好景君须记', '最是橙黄橘绿时'] },
    shx:   { title: '山行',       author: '杜牧',   lines: ['远上寒山石径斜', '白云生处有人家', '停车坐爱枫林晚', '霜叶红于二月花'] },
    sxg:   { title: '宿新市徐公店', author: '杨万里', lines: ['篱落疏疏一径深', '树头新绿未成阴', '儿童急走追黄蝶', '飞入菜花无处寻'] },
    jj2:   { title: '绝句·迟日',  author: '杜甫',   lines: ['迟日江山丽', '春风花草香', '泥融飞燕子', '沙暖睡鸳鸯'] }
  };
  /* 库全局健全性：30 首 / 120 句全互异（干扰句"库内真句"判定的前提） */
  const REF_KEYS = Object.keys(REF_POEMS);
  const REF_LIB = {};
  REF_KEYS.forEach(pid => REF_POEMS[pid].lines.forEach(ln => { REF_LIB[ln] = 1; }));
  /* 关→诗映射（静态 15；ch4 飞花令无单一关诗）与生成关池（r13 SPEC） */
  const REF_LEVEL_POEMS = ['jys', 'cx', 'mn', 'glyx', 'hua',
                           'wlsbp', 'zwl', 'jgsh', 'xich', 'cunj',
                           'yie', 'dgjl', 'cs', 'jx', 'cao'];
  const REF_FIVE = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'cs', 'jx',
                    'hua', 'glyx', 'feng', 'xyze', 'yess', 'meih', 'cao', 'mnq', 'zys', 'sjian', 'jj2'];
  const REF_SEVEN = ['wlsbp', 'zwl', 'jgsh', 'xich', 'huaj', 'xec', 'cunj', 'yl', 'xjc', 'zlj', 'shx', 'sxg'];
  const REF_ALL = REF_FIVE.concat(REF_SEVEN);
  /* 章题构成（REF_COMPOSE 与 game-data COMPOSE 分源双写·同构对象）与干扰句数（SPEC §1-r13 定版） */
  const REF_COMPOSE = {
    1: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
        { type: 'R', cue: 3 }, { type: 'R', cue: 2 }],
    2: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
        { type: 'R', cue: 3 }, { type: 'R', cue: 2 }],
    3: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
        { type: 'R', cue: 3 }, { type: 'O' }],
    4: [{ type: 'FF' }, { type: 'FF' }, { type: 'FF' }, { type: 'FF' }, { type: 'FF' }]
  };
  const refDisN = (dch, type) => type === 'O' ? 1 : (type === 'FF' ? 3 : (dch === 1 ? 2 : 3));
  const REF_FF_CHARS = ['飞', '春', '花'];
  /* 飞花令出题域：含字句频次（分源手数：飞 6/春 7/花 8——SPEC ≥5 出题域断言） */
  const FF_WANT = { '飞': 6, '春': 7, '花': 8 };
  const ffCnt = {};
  REF_FF_CHARS.forEach(c => {
    ffCnt[c] = 0;
    REF_KEYS.forEach(pid => REF_POEMS[pid].lines.forEach(ln => { if (ln.indexOf(c) >= 0) ffCnt[c]++; }));
  });

  /* ---- ⑭ duration 独立副本常量（r13 门禁；禁引源模型） ---- */
  const estMsV = s => s.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_DECIDE = { fnext: 9000, fprev: 10000, order: 11000, feihua: 12000 };
  const V_RIGHT = 2000, V_TAIL = 400, V_ENTER = 400, V_STAGE = 400, V_MIN = 40000;
  const TYPE_DEC = { F: 'fnext', R: 'fprev', O: 'order', FF: 'feihua' };
  const vCueText = q => q.type === 'FF' ? '找一找有「' + q.targetChar + '」字的诗句' : q.lines[q.cueIdx];
  const vVoice = (q, k) => k === 0 ? (V_ENTER + estMsV(vCueText(q)) + 300) : V_STAGE;
  const vDur = L => L.quizzes.reduce((s, q) => {
    let d = 0;
    for (let k = 0; k < q.ans.length; k++) d += Math.max(vVoice(q, k), V_DECIDE[TYPE_DEC[q.type]]);
    return s + d + V_RIGHT + estMsV(q.ans[0]) + V_TAIL;
  }, 0);

  /* 干扰句抽取（cards 多重集 − ans 多重集；b16 S4 sorted 签名同归一） */
  function distractOf(q) {
    const cnt = {};
    q.tiles.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
    q.ans.forEach(a => { cnt[a] = (cnt[a] || 0) - 1; });
    const dis = [];
    Object.keys(cnt).forEach(k => { for (let n = 0; n < cnt[k]; n++) dis.push(k); });
    return dis;
  }
  /* 分源题域审计（禁复用生成器 pickSamePoem/pickOtherPoem/pickFFDistract 自证） */
  function refRangeOk(dch, L, q, k) {
    const rp = REF_POEMS[q.pid];
    if (!rp) return false;                              // pid ∈ 30 首封闭域
    if (q.title !== rp.title || q.author !== rp.author) return false;
    if (q.lines.length !== 4 || q.lines.some((ln, i) => ln !== rp.lines[i])) return false;  // 全文一致
    const spec = REF_COMPOSE[dch][k];                   // 章题构成逐题序（F/R cue/O/FF）
    if (q.type !== spec.type) return false;
    if (q.type === 'F' || q.type === 'R') {
      if (q.cueIdx !== spec.cue) return false;
      const want = q.type === 'F' ? q.cueIdx + 1 : q.cueIdx - 1;
      if (q.ansIdx !== want || q.ans.length !== 1 || q.ans[0] !== rp.lines[want]) return false;
    } else if (q.type === 'O') {
      if (q.cueIdx !== 0 || q.ans.length !== 3 ||
          q.ans.some((a, i) => a !== rp.lines[i + 1])) return false;
    } else {                                            // FF 飞花令
      if (q.targetChar !== REF_FF_CHARS[(L.lv + k) % 3]) return false;   // 指定字轮换
      if (q.ans.length !== 1 || q.ans[0].indexOf(q.targetChar) < 0) return false;   // 正解句必含指定字
    }
    /* 句卡数=答案+干扰（章档定版）+互异 */
    const dis = distractOf(q);
    if (dis.length !== refDisN(dch, q.type)) return false;
    if (q.tiles.some((c, i) => q.tiles.indexOf(c) !== i)) return false;     // 句卡互异（禁同句重复）
    if (q.tiles.some(t => !REF_LIB[t])) return false;                       // 卡皆库内真句
    if (q.type === 'FF') {
      if (dis.some(s => s.indexOf(q.targetChar) >= 0)) return false;        // 干扰句不含指定字
      return true;
    }
    /* F/R/O 干扰规则：同诗他句恰 1（≠题面句≠答案句）+其余他诗同长句互异 */
    const cueText = rp.lines[q.cueIdx];
    const inThis = dis.filter(s => rp.lines.indexOf(s) >= 0);
    if (q.type !== 'O') {
      if (inThis.length !== 1) return false;
      if (inThis[0] === cueText || q.ans.indexOf(inThis[0]) >= 0) return false;
    } else if (inThis.length !== 0) return false;      // O 干扰=纯他诗 1 句
    const others = dis.filter(s => rp.lines.indexOf(s) < 0);
    if (others.length !== dis.length - inThis.length) return false;
    if (dis.some((s, i) => dis.indexOf(s) !== i)) return false;             // 干扰互异
    return others.every(s => s.length === q.ans[q.type === 'O' ? 0 : 0].length);   // 他诗干扰同长
  }
  /* 填满错点击计划：首放干扰句卡（∉ 答案 ⇒ 首槽必错），余槽任意填满 */
  function wrongPlan(q) {
    let d = -1;
    for (let i = 0; i < q.tiles.length; i++) {
      if (q.ans.indexOf(q.tiles[i]) < 0) { d = i; break; }
    }
    if (d < 0) return null;
    const plan = [d];
    for (let i = 0; i < q.tiles.length && plan.length < q.ans.length; i++) {
      if (i !== d) plan.push(i);
    }
    return plan;
  }
  const refSolveTap = (L, q) => {              // 依答案逐槽点可用句卡（引擎直驱）
    for (let j = 0; j < q.ans.length; j++) {
      const i = q.tiles.findIndex((t, k) => !q._used[k] && t === q.ans[j]);
      engTapTile(L, i);
    }
  };
  const refClearBuilt = (L, q) => {
    while (stepOf(q) > 0) {
      const j = q._bt.map(t => t >= 0).lastIndexOf(true);
      engTapBuilt(L, j);
    }
  };

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  const anchorAns = {}, anchorDis = {};        // 反启发式锚：同句跨题正解/干扰双现登记
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, clipAll = true, structAll = true, driveOk = true, rescueOk = true;
    const seen = {};
    let sigRepeated = false;
    const wantDch = flat < STATIC_LEVELS ? (Math.floor(flat / 5)) % 4 + 1 : null;
    if (L1.ch !== Math.floor(flat / 5) + 1) rangeAll = false;         // 章号 1 基（§0.3）
    if (flat < STATIC_LEVELS && L1.dch !== wantDch) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;                // 每关 5 题（§0.10）
    /* 关→诗映射（静态 15 定值；生成关池轮换；ch4 无单一诗） */
    if (L1.dch === 4) {
      if (L1.pid !== null) rangeAll = false;
    } else if (flat < STATIC_LEVELS) {
      if (L1.pid !== REF_LEVEL_POEMS[flat]) rangeAll = false;
    } else {
      const pool = L1.dch === 1 ? REF_FIVE : (L1.dch === 2 ? REF_SEVEN : REF_ALL);
      if (L1.pid !== pool[flat % pool.length]) rangeAll = false;
    }
    /* 章诗长档（dch1 全 5 字 / dch2 全 7 字——出题域分源） */
    if (L1.dch !== 4) {
      const lens = REF_POEMS[L1.pid].lines.map(ln => ln.length);
      if (L1.dch === 1 && lens.some(n => n !== 5)) rangeAll = false;
      if (L1.dch === 2 && lens.some(n => n !== 7)) rangeAll = false;
    }
    const ffSeen = {};
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refRangeOk(L1.dch, L1, q, k)) rangeAll = false;
      if (!structOk(q, L1.dch)) structAll = false;
      if (!KIDS.voice.clips['pf_poem_' + q.pid]) clipAll = false;      // 整首朗读 clip 30 条在场（§1-r13 关末奖励）
      if (!KIDS.voice.clips[cueKeyOf(q)]) clipAll = false;             // T46：题面句 clip（FF=pf_ff_q/F·R·O=pf_l 行）
      if (!KIDS.voice.clips[lineKeyOf(q.ans[0])]) clipAll = false;     // T46：答案句行 clip（FF 跨诗行经文本映射）
      if (seen[q.sig]) sigRepeated = true;
      seen[q.sig] = true;
      q.ans.forEach(a => { anchorAns[a] = 1; });
      distractOf(q).forEach(d => { anchorDis[d] = 1; });
      if (q.type === 'FF') {                                            // 飞花令答案句关级互异
        const key = q.ans[0];
        if (ffSeen[key]) rangeAll = false;
        ffSeen[key] = 1;
      }
    }
    if (sigRepeated) rangeAll = false;                                 // 同关 5 题 sig 互异（§1）

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engTapTile(Ld, -1) !== null || engTapTile(Ld, 99) !== null) driveOk = false;   // 非法下标
      const plan = wrongPlan(q);
      if (!plan) { driveOk = false; break; }
      for (const i of plan) {
        const r = engTapTile(Ld, i);
        if (r === null) { driveOk = false; break; }                 // 依次入槽
      }
      if (driveOk && engTapTile(Ld, 0) !== null) driveOk = false;   // 填满后再点=拒绝
      if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false; // 填满判错一次=1 错
      if (builtOf(q).every((c, j) => c === q.ans[j])) driveOk = false;  // 干扰首槽 ⇒ 必错
      refClearBuilt(Ld, q);
      if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false; // 退回=探索零计数
      if (engTapBuilt(Ld, 0) !== null) driveOk = false;             // 空槽退回=拒绝
      for (const i of plan) engTapTile(Ld, i);                      // 再错一次（退回后重填）
      if (q.miss !== 2 || Ld.retries !== base + 2) driveOk = false;
      refClearBuilt(Ld, q);
      refSolveTap(Ld, q);
      if (!q.solved || !builtOf(q).every((c, j) => c === q.ans[j])) driveOk = false;  // 正确填满=解
      const st = Ld.step;
      if (st !== k + 1) driveOk = false;                            // 推进
    }
    if (Ld.done !== true) driveOk = false;                          // 5 题全解=关完成
    /* 星级三档独立驱动 */
    const L1x = genLevel(flat);
    const qs1 = L1x.quizzes[0];
    let g1 = 0;
    while (qs1.miss < 3 && g1++ < 12) {                             // 首题连错 3 次
      const plan = wrongPlan(qs1);
      if (!plan) break;
      plan.forEach(i => engTapTile(L1x, i));
      refClearBuilt(L1x, qs1);
    }
    let g2x = 0;
    while (!L1x.done && g2x++ < 30) refSolveTap(L1x, L1x.quizzes[L1x.step]);
    const s1 = L1x.done && L1x.retries === 3 && engStars(L1x) === 1;
    const L2x = genLevel(flat);
    const qs2 = L2x.quizzes[0];
    const plan2 = wrongPlan(qs2);
    if (plan2) plan2.forEach(i => engTapTile(L2x, i));              // 仅首题错一次
    refClearBuilt(L2x, qs2);
    let g3 = 0;
    while (!L2x.done && g3++ < 30) refSolveTap(L2x, L2x.quizzes[L2x.step]);
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let g4 = 0;
    while (!L3.done && g4++ < 30) refSolveTap(L3, L3.quizzes[L3.step]);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：歧途态起步 → rescueTarget 步进（undo/tile）→ 收敛填对 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    const planR = wrongPlan(qr);
    if (planR) planR.forEach(i => engTapTile(Lr, i));
    let chainOk = true, steps = 0;
    while (!qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (t.act === 'tile') {
        if (engTapTile(Lr, t.i) === null) { chainOk = false; break; }
      } else if (engTapBuilt(Lr, t.j) === null) { chainOk = false; break; }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                 // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && clipAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, pid: L1.pid, ok: ok, det: det, rangeAll: rangeAll,
      clipAll: clipAll, structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(L1x), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.type + '·' + q.title + '·' + (q.type === 'FF' ? q.ans[0] : q.lines[q.cueIdx])) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 反启发式锚计数：同句在别题正解+别题干扰双现 ≥5（SPEC §1-r13） */
  const anchorLines = Object.keys(anchorAns).filter(a => anchorDis[a]);
  const anchorOk = anchorLines.length >= 5;

  /* ---- ② tapCard 单元：flat0 F 题（错选/退回/对选+钩子视图）+ flat10 O 题（placed/退回） ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  {
    const hz = PF.quiz;                                            // 钩子视图（SPEC §1-r13）
    if (hz.type !== 'F' || hz.cueIdx !== 0 || hz.slots.length !== 1) domOk = false;
    if (hz.lines[0] !== q0.lines[0] || hz.lines[1] !== '□'.repeat(5) ||
        hz.lines[2] !== '' || hz.lines[3] !== '') domOk = false;   // 题面句全文/答案句□/隐藏句 ''
    if (hz.slots[0] !== q0.ans[0] || hz.cards.length !== 3) domOk = false;
    if (hz.built.some(x => x !== null)) domOk = false;
    const badIdx = (await PF.tapCard(-1)) === false && (await PF.tapCard(99)) === false &&
      PF.tapBuilt(-1) === false && PF.tapBuilt(99) === false;      // 非法下标
    if (!badIdx) domOk = false;
    const wi = q0.tiles.findIndex(t => t !== q0.ans[0]);
    const rw = await PF.tapCard(wi);                               // 单槽：错选即判 wrong
    if (rw !== 'wrong' || PF.quiz.miss !== 1) domOk = false;
    await wait(1100 * SPEED);                                      // 过 1000ms 防重入窗（§0.26）
    if (!slotEl(0).classList.contains('full') ||
        slotEl(0).querySelector('.lt').textContent !== q0.tiles[wi]) domOk = false;   // 槽 .full+句文
    if (!cardEl(wi).classList.contains('gone')) domOk = false;     // 句卡 .gone
    const rB = PF.tapBuilt(0);                                     // 退回（探索零惩罚）
    if (rB !== 0 || PF.quiz.built[0] !== null) domOk = false;
    if (cardEl(wi).classList.contains('gone')) domOk = false;      // 句卡复活
    if (slotEl(0).classList.contains('full')) domOk = false;       // 槽重建小方格
    if (PF.quiz.miss !== 1) domOk = false;                         // 退回不改 miss
    const ri = freeCardFor(q0, q0.ans[0]);
    const rr = await PF.tapCard(ri);                               // 对选
    if (rr !== 'right') domOk = false;
  }
  /* O 型 placed/退回（flat10 第 5 题=句序重组 4 卡 3 槽） */
  let ordOk = true;
  {
    startLevel(10);
    for (let s = 0; s < 4; s++) {                                  // 先通 F×3+R（真实点击）
      const qq = cur.quizzes[cur.step];
      await PF.tapCard(freeCardFor(qq, qq.ans[0]));
      await wait(700 * SPEED);
    }
    const hz = PF.quiz;
    if (hz.type !== 'O' || hz.slots.length !== 3 || hz.cards.length !== 4) ordOk = false;
    if (hz.lines[0] !== cur.quizzes[4].lines[0] ||
        hz.lines[1] !== '□'.repeat(5) || hz.lines[2] !== '□'.repeat(5) ||
        hz.lines[3] !== '□'.repeat(5)) ordOk = false;              // O 钩子=首句全文+三□串
    const qo = cur.quizzes[4];
    const di = qo.tiles.findIndex(t => qo.ans.indexOf(t) < 0);     // 干扰句卡（∉ 三答案句）
    const rp = await PF.tapCard(di);                               // 入槽未满=placed
    if (rp !== 'placed') ordOk = false;
    if (PF.quiz.built[0] !== qo.tiles[di] || PF.quiz.built[1] !== null) ordOk = false;
    if (!cardEl(di).classList.contains('gone')) ordOk = false;
    if (PF.tapBuilt(0) !== 0) ordOk = false;                       // 退回首槽 → step 归 0（仅 1/3 槽占用）
    if (cardEl(di).classList.contains('gone')) ordOk = false;
    for (let j = 0; j < 3; j++) { await PF.tapCard(freeCardFor(qo, qo.ans[j])); }   // 正确排完
    await wait(700 * SPEED);
    if (!(PF.currentLevel.done && PF.currentLevel.won)) ordOk = false;              // 通关（末题）
  }
  const selfOk = domOk && ordOk;
  if (selfOk) npass++;
  units.tapCard = { ok: selfOk, domOk: domOk, ordOk: ordOk,
    quiz0: q0.type + '·' + q0.lines[q0.cueIdx], cards: q0.tiles.length };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  startLevel(0);                                                    // flat0：每错必播
  let planA = wrongPlan(cur.quizzes[0]);
  for (const i of planA) await PF.tapCard(i);
  await PF.tapCard(planA ? 0 : 0);                                  // 填满后再点（拒绝，不播）
  refClearBuilt(cur, cur.quizzes[0]);
  planA = wrongPlan(cur.quizzes[0]);
  for (const i of planA) await PF.tapCard(i);                       // 第二次填满错
  const sayA = cnt('pf_wrong');                                     // → 2
  startLevel(3);                                                    // flat3：10s 节流
  lastWrongVoice = Date.now();                                      /* 显式进入节流窗口内 */
  const planB = wrongPlan(cur.quizzes[0]);
  for (const i of planB) await PF.tapCard(i);
  const sayB = cnt('pf_wrong') - 2;                                 // 增量 → 0
  startLevel(3);                                                    // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                               /* 隔离上一子用例时间戳 */
  refClearBuilt(cur, cur.quizzes[0]);                               // 保险：从空槽起步
  const q3 = cur.quizzes[0];
  const base3 = q3.miss;
  const pl1 = wrongPlan(q3);
  for (const i of pl1) await PF.tapCard(i);                         // miss=1 窗口外 → 播
  refClearBuilt(cur, q3);
  const pl2 = wrongPlan(q3);
  for (const i of pl2) await PF.tapCard(i);                         // miss=2 → force === 2 → 播
  const sayC = cnt('pf_wrong') - 2 - sayB;                          // 增量 → 2
  const missOk = q3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题选错一次+退回路径 → 1 错=2 星） ---- */
  total++;
  const sayLog3 = [], playLog3 = [];
  const origSay3 = KIDS.voice.say, origPlay3 = KIDS.voice.play;
  KIDS.voice.say = function (t) { sayLog3.push(String(t)); };
  KIDS.voice.play = function (key, text) { playLog3.push(String(key)); };
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = PF.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：空槽行晃动零惩罚可退回；首错不出救援视觉
      const plan = wrongPlan(cur.quizzes[0]);
      for (const i of plan) { await PF.tapCard(i); }
      const wig = !!lineEl(cur.quizzes[0].ansIdx).classList.contains('wig');
      const cardOk = !!cardPoolEl.querySelector('.scard:not(.gone)');
      const peOk = getComputedStyle(cardPoolEl.querySelector('.scard:not(.gone)')).pointerEvents !== 'none';
      const noRescue = !poemLinesEl.querySelector('.bslot.breathe') && !cardPoolEl.querySelector('.scard.pulse');
      const lv = PF.currentLevel;
      wrongOk = wig && cardOk && peOk && noRescue && lv.retries === 1 && lv.step === 0;
      while (PF.quiz.built.some(x => x !== null)) {       // 全部退回（零惩罚可调整）
        const j = PF.quiz.built.map(x => x !== null).lastIndexOf(true);
        PF.tapBuilt(j);
      }
      if (PF.quiz.built.some(x => x !== null) || PF.quiz.miss !== 1) smokeA = false;
      const lvE = PF.currentLevel;
      if (lvE.retries !== 1) smokeA = false;              // 退回不追加错次
    }
    const qq = cur.quizzes[cur.step];
    const r = await PF.tapCard(freeCardFor(qq, qq.ans[0]));   // 单槽题：对选一步到位
    if (r === null) smokeA = false;
    quizzesA++;
    await wait(700 * SPEED);
  }
  await wait(900 * SPEED);
  const lvA = PF.currentLevel;
  /* r13+T46：答对演出=right clip+答案句行键 clip；关末奖励=整首朗读 clip（ch1 一诗一课） */
  const lineSaid = playLog3.filter(k => k === lineKeyOf(q0.ans[0]));
  const rewardPlayed = playLog3.indexOf('pf_poem_' + q0.pid) >= 0;
  KIDS.voice.say = origSay3; KIDS.voice.play = origPlay3;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && lineSaid.length >= 1 && rewardPlayed &&
    !document.querySelector('.k-celebrate');              // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA, retries: lvA.retries,
    stars: engStars(cur), lineSaid: lineSaid.slice(0, 2), reward: rewardPlayed };

  /* ---- ④ UI 冒烟 B：flat10（ch3：F×3+R+O 句序重组）全对通关 3 星 ---- */
  total++;
  startLevel(10);
  const q10 = PF.quiz;
  const shapeOk = !!q10 && q10.type === 'F' && q10.cards.length === 4;      // ch3 F=4 卡
  let playB = true, quizzesB = 0, sawO = false;
  for (let s = 0; s < CH_LEN && playB; s++) {
    const qq = cur.quizzes[cur.step];
    if (!qq) { playB = false; break; }
    if (qq.type === 'O') {
      sawO = true;
      if (qq.ans.length !== 3 || qq.tiles.length !== 4) playB = false;      // O=4 卡 3 槽
    }
    for (let j = 0; j < qq.ans.length; j++) {
      const r = await PF.tapCard(freeCardFor(qq, qq.ans[j]));
      if (r === null) playB = false;
    }
    quizzesB++;
    await wait(500 * SPEED);
  }
  await wait(900 * SPEED);
  const lv10 = PF.currentLevel;
  const smokeOkB = shapeOk && playB && sawO && quizzesB === CH_LEN && lv10.done && lv10.won &&
    lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, shapeOk: shapeOk, sawO: sawO, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④b UI 冒烟 C：flat15（ch4 飞花令）5 轮——正解含字+干扰不含（引擎真值）+无整首奖励 ---- */
  total++;
  const playLog4 = [];
  const origPlay4 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { playLog4.push(String(key)); };
  startLevel(15);
  let ffOk = true, quizzesC = 0;
  const charsSeen = [];
  for (let s = 0; s < CH_LEN && ffOk; s++) {
    const qq = cur.quizzes[cur.step];
    if (!qq) { ffOk = false; break; }
    if (qq.type !== 'FF' || PF.quiz.targetChar !== REF_FF_CHARS[(0 + s) % 3]) ffOk = false;
    charsSeen.push(qq.targetChar);
    if (qq.ans[0].indexOf(qq.targetChar) < 0) ffOk = false;               // 正解句必含指定字
    if (distractOf(qq).some(d => d.indexOf(qq.targetChar) >= 0)) ffOk = false;   // 干扰句不含
    if (distractOf(qq).some((d, i, a) => a.indexOf(d) !== i)) ffOk = false;      // 干扰互异
    const r = await PF.tapCard(freeCardFor(qq, qq.ans[0]));
    if (r === null) ffOk = false;
    quizzesC++;
    await wait(500 * SPEED);
  }
  await wait(900 * SPEED);
  const lv15 = PF.currentLevel;
  const ffRewardNone = playLog4.indexOf('pf_poem_' + (lv15.pid || '')) < 0 &&
    !playLog4.some(k => k.indexOf('pf_poem_') === 0);                     // ch4 无整首朗读奖励
  KIDS.voice.play = origPlay4;
  const smokeOkC = ffOk && quizzesC === CH_LEN && lv15.done && lv15.won &&
    lv15.pid === null && lv15.retries === 0 && ffRewardNone;
  if (smokeOkC) npass++;
  smokes.flat15 = { ok: smokeOkC, ffOk: ffOk, quizzes: quizzesC, chars: charsSeen, rewardNone: ffRewardNone };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 读题面句 → 指空槽 → demo 点答案句卡 → 填对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const pid0 = genLevel(0).quizzes[0].pid;
  const q0t = PF.quiz;
  const g0 = genLevel(0).quizzes[0];
  const tutOk = pLog7.indexOf('pf_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    pLog7.indexOf(cueKeyOf(g0)) >= 0 &&                                  /* 演示读题面句（T46 行键 clip 在场） */
    sLog7.length === 0 &&                                                /* T46：say 通道恒零 */
    pLog7.indexOf(lineKeyOf(g0.ans[0])) < 0 &&                           /* r13：不读答案句（防泄题，clip 通道同禁） */
    pLog7.indexOf('pf_right') >= 0 &&                                   /* demo 填对走真实反馈 */
    window.__pfDemoR === 'right' &&                                     /* §0.27 演示填对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    PF.currentLevel && PF.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.pid === pid0 &&                        /* 新题面同诗初态 */
    q0t.built.every(x => x === null) && q0t.miss === 0 &&
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'pf_tut_turn';        /* 交接顺序链单通道（r13 无整首朗读） */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('pf_tut_watch') >= 0,
    demoR: window.__pfDemoR, rightClip: pLog7.indexOf('pf_right') >= 0,
    handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑤ 布局（竖屏三件套 M3）：双 viewport ×（flat0/5/10/15=ch1-4 四形态）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱）；量测用 offsetWidth/Height
     （rect 仅容器归属判别）；portStyle 判别锚=.scard 固定高（横 76/竖 66） ---- */
  async function simView(w, h, port, flat) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——M3）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    await wait(620);                            // 句卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const cards = Array.prototype.slice.call(cardPoolEl.querySelectorAll('.scard'));
    const cardOk = cards.length >= 3 &&
      cards.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    const pr = cards[0].getBoundingClientRect(), tr = cardPoolEl.getBoundingClientRect();
    const inBox = pr.left >= tr.left - 2 && pr.right <= tr.right + 2 &&
                  pr.top >= tr.top - 2 && pr.bottom <= tr.bottom + 2;   // 句卡落卡池容器（M3 之二）
    const aw = cards[0].offsetHeight;
    /* 竖屏样式通道生效实锤（M3 之三）：.scard 固定高（横 76/竖 66）判别力最强。
       横屏 sim 仅当真实视口也横屏才断言 76（真竖屏外层下 @media 覆盖量测无意义
       ——thanks r12 形态；真通道由 P1b 真竖视口轮外部断言兜底） */
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = port ? (aw >= 64 && aw <= 68) : (realPort || (aw >= 74 && aw <= 78));
    let slotOk = true;
    if (flat !== 15) {                           // F/R/O 形态查句槽；FF 形态查徽章
      const slots = Array.prototype.slice.call(poemLinesEl.querySelectorAll('.bslot'));
      slotOk = slots.length >= 1 &&
        slots.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    } else {
      const fc = $id('ff-char');
      slotOk = fc.offsetWidth >= 90 && fc.offsetHeight >= 90;
    }
    /* 读音主目标按形态分流（r13 §1-r13）：诗卡形态=卡上读音大按钮 ≥96；
       飞花令形态无诗卡（按钮随卡隐藏）→ 徽章 ≥90+底栏「再听题面」≥72 为读音主目标 */
    const isFF = cur && cur.quizzes[cur.step] && cur.quizzes[cur.step].type === 'FF';
    let spkOk;
    if (isFF) {
      const hb2 = $id('btn-hear').getBoundingClientRect();
      spkOk = hb2.width >= 72 && hb2.height >= 72;
    } else {
      const spk = speakerBtn.getBoundingClientRect();
      spkOk = spk.width >= 96 && spk.height >= 96;
    }
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
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: flat, cards: cards.length, cardOk: cardOk,
      inBox: inBox, portStyle: portStyle, cardH: Math.round(aw), slotOk: slotOk,
      spkOk: spkOk, hintOk: hintOk, btnOk: btnOk, ox: ox,
      pass: cardOk && inBox && portStyle && slotOk && spkOk && hintOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, false, f));
    sims.push(await simView(800, 1180, true, f));
  }
  const gv = $id('game');
  gv.style.width = '';
  gv.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / 诗库双写 / 关诗映射双写 / clips / 开场链 / 重听 / 首字提示 / 整首通道 ---- */
  total++;
  /* SPEC §1-r13 定稿文案独立字面量（manifest 一致，禁改——6 句沿用 b17） */
  const refVoice = VOICE.watch.text === '看！读一读古诗' &&
    VOICE.turn.text === '你来填一填' && VOICE.hint.text === '听一听想一想' &&
    VOICE.right.text === '填对啦，你真棒' && VOICE.wrong.text === '再读一读这句诗' &&
    VOICE.first.text === '第一个字亮啦';
  /* 诗库双写对账：POEMS 与 verify 侧 REF_POEMS 逐首逐句一致（30 首封闭域防笔误） */
  const dictOk = REF_KEYS.length === 30 && REF_KEYS.every(pid =>
    POEMS[pid] && POEMS[pid].title === REF_POEMS[pid].title &&
    POEMS[pid].author === REF_POEMS[pid].author &&
    POEMS[pid].lines.length === 4 &&
    POEMS[pid].lines.every((ln, k) => ln === REF_POEMS[pid].lines[k]));
  const libOk = Object.keys(REF_LIB).length === 120;               // 120 句全互异
  /* 关诗映射+章构成+飞花令字表 双写对账（单侧改动 VERIFY 必 FAIL） */
  const mapOk = JSON.stringify(LEVEL_POEMS) === JSON.stringify(REF_LEVEL_POEMS) &&
    JSON.stringify(COMPOSE) === JSON.stringify(REF_COMPOSE) &&
    JSON.stringify(FF_CHARS) === JSON.stringify(REF_FF_CHARS);
  const ffDomOk = REF_FF_CHARS.every(c => ffCnt[c] === FF_WANT[c] && ffCnt[c] >= 5);   // 出题域 ≥5
  /* 165 条 clips 注入对账（pf 6+pf_poem 30+T46 pf_l 120 行+pf_ff 6+core 3，
     manifest games:['poemfill']；行键全集从 POEMS 封闭域推导——零手抄） */
  const PF_KEYS = ['pf_tut_watch', 'pf_tut_turn', 'pf_hint', 'pf_right', 'pf_wrong', 'pf_first'];
  const POEM_KEYS = REF_KEYS.map(pid => 'pf_poem_' + pid);
  const LINE_KEYS_ALL = REF_KEYS.map(pid => REF_POEMS[pid].lines.map((ln, li) => 'pf_l_' + pid + '_' + li))
    .reduce((a, b) => a.concat(b), []);
  const FF_KEYS = REF_FF_CHARS.map(c => 'pf_ff_q_' + c).concat(REF_FF_CHARS.map(c => 'pf_ff_c_' + c));
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 165 &&
    PF_KEYS.concat(POEM_KEYS).concat(LINE_KEYS_ALL).concat(FF_KEYS)
      .every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链单通道（r13 无整首朗读）+ 重听=题面句 say + 首字提示 + 整首无 TTS 兜底（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'pf_hint';   // 开场=[hint] 单通道
  const hearR = PF.hear();                      // 重听=题面句 clip（T46 cueKeyOf；r13 不播整首 clip）
  const hearOk = hearR === true && playLog.length >= 1 &&
    playLog[playLog.length - 1][0] === cueKeyOf(q0) &&
    playLog[playLog.length - 1][1] === q0.lines[q0.cueIdx] &&
    sayLog.length === 0 &&
    !playLog.some(p => p[0].indexOf('pf_poem_') === 0);
  /* 首字提示：pf_first+槽首格亮出首字（hint 前空、hint 后=答案句首字） */
  const cell0 = () => slotEl(0).querySelector('.cell');
  const beforeHint = cell0() && cell0().textContent === '';
  PF.hint();
  const afterHint = cell0() && cell0().textContent === q0.ans[0].charAt(0) &&
    playLog.some(p => p[0] === 'pf_first');
  const hintOk = !!beforeHint && !!afterHint;
  /* 缺 clip：整首朗读禁 TTS 兜底（§1-r13 关末奖励通道）——不播+false+无任何带诗文本的 play/say */
  const keyV = 'pf_poem_' + q0.pid;
  const clipBak = KIDS.voice.clips[keyV];
  delete KIDS.voice.clips[keyV];
  playLog.length = 0; sayLog.length = 0;
  const hearMiss = sayPoem(q0.pid);
  const noFallback = hearMiss === false && playLog.length === 0 && sayLog.length === 0;
  KIDS.voice.clips[keyV] = clipBak;             // 还原
  const restored = sayPoem(q0.pid) === true;
  /* 全程无带 text 的 play（sayPoem 不传 text=零 TTS 兜底通道） */
  const noTextPlay = playLog.every(p => p[1] === null);
  /* 点题面句=跟读（T46 行键 clip）且 locked 态拒 */
  sayLog.length = 0; playLog.length = 0;                        // 隔离 hear/hint 阶段的记录
  const sTap1 = sentTap(0);
  const followOk = sTap1 === true && playLog.length === 1 &&
    playLog[0][0] === 'pf_l_' + cur.pid + '_0' && playLog[0][1] === cur.quizzes[0].lines[0] &&
    sayLog.length === 0;
  state.locked = true;
  const sTap2 = sentTap(1);
  const followLocked = sTap2 === false && playLog.length === 1;
  state.locked = false;
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const specOk = refVoice && dictOk && libOk && mapOk && ffDomOk && clipOk && anchorOk &&
    openChain && hearOk && hintOk && noFallback && restored && noTextPlay && followOk && followLocked;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, dictOk: dictOk, libOk: libOk, mapOk: mapOk,
    ffCnt: ffCnt, clips: clipOk, nClips: nClips, anchorLines: anchorLines.length,
    openChain: openChain, hearOk: hearOk, hintOk: hintOk,
    noFallback: noFallback, restored: restored, noTextPlay: noTextPlay,
    followOk: followOk, followLocked: followLocked,
    missing: PF_KEYS.concat(POEM_KEYS).concat(LINE_KEYS_ALL).concat(FF_KEYS)
      .filter(k => !KIDS.voice.clips[k]).slice(0, 5) };

  /* ---- ⑭ duration（r13 门禁）：40 关 modeled ≥40000+逐关对账+语音窗从不撑时长+源常量同步 ---- */
  total++;
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) {
      for (let k = 0; k < q.ans.length; k++)
        if (V_DECIDE[TYPE_DEC[q.type]] < vVoice(q, k)) voiceOk = false;   // 逐步：决策 ≥ 语音窗
    }
  }
  /* 源常量同步断言（estMs 全字符口径/DECIDE_MS/LEVEL_MIN_MS——build.py 另做字面 assert） */
  const constOk = estMs('床前明月光') === 5 * 345 + 600 && estMs('飞流直下三千尺') === 7 * 345 + 600 &&
    JSON.stringify(DECIDE_MS) === JSON.stringify(V_DECIDE) && LEVEL_MIN_MS === 40000;
  const durUnitOk = dMin >= V_MIN && dMin === 70625 && dFlat === 0 && parityOk && voiceOk && constOk;
  /* M1 防回漂：40 关 modeled 最低=ch1 五言关 70625 精确（SPEC §1-r13 验算） */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
                     parity: parityOk, voiceNeverDominates: voiceOk, constOk: constOk,
                     decide: V_DECIDE, right: V_RIGHT, tail: V_TAIL };

  const out = { game: 'poemfill', total: total, pass: npass, units: units,
    levels: levels, gen: gen, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__pfVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
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
