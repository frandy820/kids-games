/* ================= picto 纯引擎：确定性关卡生成 + 选项判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r12 章难度（delta 定稿；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 图→字入门：toChar，干扰=库内非同族字（sameFam 全排除）；lv0-1 两选、lv2-4 三选
   dch2 字→图：toPic，候选恒 3-4 选，干扰全部 ∈同形近族（famOf）；fam≥3 且 lv≥3 升 4 选
   dch3 形近辨析：双模式交替（qi 奇偶），fam≥3 恒 4 选（峰）；目标池=DEEP
   dch4 混合+字源推演：[toChar, toPic, evo, toChar, evo] 固定题型谱（两匹配模式必现+evo×2）；
       匹配目标池=DEEP 轮换、evo 目标池=EVO 轮换（关内 used 去重）；干扰全 ∈同形近族
   目标轮换：ch1 全库 40（两轮 dch1 覆盖全库——章内 25<40 单章不全）；ch2/3=DEEP 18（25 连取章内全覆盖）；
       ch4 匹配=DEEP 每关 3 连取、evo=EVO 每关 2 连取（两轮 dch4 并集全覆盖）
   判定：点对 → 该题解出推进并读组词 clip（音-形-义三绑定）；点错 → 该卡灰掉可重点
       （零惩罚，引擎 'again' 早退为防御层），首错不提示正确项 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* 每关选项数（r12 delta②：ch2 起恒 3-4 选）
   ch1 入门：lv0-1 两选→lv2-4 三选（非同族干扰）
   ch2+：基数 3；fam（同族可干扰字数）≥3 时按章升 4（ch3 峰恒 4；ch2 lv≥3 / ch4 lv≥2）；
   fam=2 的字恒 3 选（池不足降档——Math.min 保证恒 3-4） */
function nOptOf(dch, lv, target) {
  if (dch === 1) return (lv % CH_LEN) < 2 ? 2 : 3;
  const fam = famOf(target);
  let n = 3;
  if (dch === 3) n = fam.length >= 3 ? 4 : 3;
  else if (fam.length >= 3 && lv >= (dch === 2 ? 3 : 2)) n = 4;
  return Math.min(n, fam.length + 1);
}
/* 题字序列：目标池 (flat*CH_LEN)%len 连续取 5（相邻题不同字；ch2/3 章内池全覆盖） */
function targetsFor(dch, flat) {
  const pool = dch === 1 ? PICTO_KEYS : DEEP_KEYS;
  const off = (flat * CH_LEN) % pool.length;
  return Array.from({ length: CH_LEN }, (_, i) => pool[(off + i) % pool.length]);
}

/* ch4 题型谱：两匹配模式必现 + evo×2（位置固定=确定性） */
const MIX_PAT = ['toChar', 'toPic', 'evo', 'toChar', 'evo'];

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  if (dch === 4) {
    /* 混合关：evo 目标先定（EVO 旋转每关 2 连取——先取保旋转覆盖完整），
       匹配目标随后（DEEP 旋转每关 3 连取，避开已用）；used 关内去重（相邻不同字） */
    const used = [];
    const pick = (pool, base) => {
      for (let s = 0; s < pool.length; s++) {
        const k = pool[(base + s) % pool.length];
        if (used.indexOf(k) < 0) { used.push(k); return k; }
      }
      return pool[base % pool.length];
    };
    const mOff = (flat * CH_LEN) % DEEP_KEYS.length, eOff = (flat * 2) % EVO_KEYS.length;
    const evoT = [pick(EVO_KEYS, eOff), pick(EVO_KEYS, eOff + 1)];
    let mi = 0, ei = 0;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const mode = MIX_PAT[qi];
      const t = mode === 'evo' ? evoT[ei++] : pick(DEEP_KEYS, mOff + (mi++));
      quizzes.push(makeQuiz(mode, t, dch, lv, rnd));
    }
  } else {
    const targets = targetsFor(dch, flat);
    for (let qi = 0; qi < CH_LEN; qi++) {
      const mode = dch === 1 ? 'toChar' : dch === 2 ? 'toPic' : (qi % 2 ? 'toPic' : 'toChar');
      quizzes.push(makeQuiz(mode, targets[qi], dch, lv, rnd));
    }
  }
  return { flat, ch, dch, lv, quizzes, step: 0, misses: 0, done: false };
}

/* 单题构造：干扰选取（dch1=非同族 / dch2+=同形近族全量）+ 洗牌定位答案 */
function makeQuiz(mode, t, dch, lv, rnd) {
  const nOpt = nOptOf(dch, lv, t);
  const distr = [];
  if (dch === 1) {                                       // 入门：排除整族（sameFam 全排除，干扰与真值明显不同）
    shuffled(PICTO_KEYS.filter(k => k !== t && !sameFam(k, t)), rnd)
      .forEach(k => { if (distr.length < nOpt - 1) distr.push(k); });
  } else {                                               // r12 delta②：干扰全部 ∈同形近族（非随机字）
    shuffled(famOf(t), rnd)
      .forEach(k => { if (distr.length < nOpt - 1) distr.push(k); });
  }
  const options = shuffled([t].concat(distr), rnd);
  return {
    mode: mode, target: t, options: options,
    answerIdx: options.indexOf(t), distractors: distr.slice(),
    near: distr.some(k => sameFam(k, t)),                // 实际形近干扰标记（verify 断言依据）
    nOpt: nOpt, solved: false, _miss: 0, _grey: []
  };
}

/* ---------- 选项引擎（无 DOM）：engTapOption(L, i) —— 点第 i 张选项卡
   'right' 答对推进（非末题）/ 'done' 答对通关 / 'wrong' 答错（该卡灰掉可重点，计错）
   'again' 点已灰卡/已解题（早退零惩罚不计数）；false 非法下标；null 关卡已结束 ---------- */
function engTapOption(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q) return null;
  if (q.solved) return 'again';
  if (i < 0 || i >= q.options.length) return false;
  if (q._grey[i]) return 'again';
  if (i === q.answerIdx) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._grey[i] = 1;
  q._miss++;
  L.misses++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点=3 星；错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：模式/选项数/干扰规则/选项互异含目标
   dch1 干扰非同族 / dch2+ 干扰全 ∈同形近族（r12 delta②）/ evo 仅 dch4 且目标 ∈EVO 池 ---------- */
function structOk(q, dch) {
  if (!q || !q.options || !q.options.length) return false;
  if (q.mode !== 'toChar' && q.mode !== 'toPic' && q.mode !== 'evo') return false;
  if (!PIC_BY[q.target]) return false;
  if (q.mode === 'evo' && EVO_KEYS.indexOf(q.target) < 0) return false;
  if (dch < 4 && q.mode === 'evo') return false;                    // evo 只在 ch4/生成 ch4 型
  if (q.options.length !== q.nOpt) return false;
  if (q.options.indexOf(q.target) < 0) return false;
  for (let a = 0; a < q.options.length; a++)
    for (let b = a + 1; b < q.options.length; b++)
      if (q.options[a] === q.options[b]) return false;              // 选项互异
  const distr = q.options.filter(k => k !== q.target);
  if (distr.length !== q.nOpt - 1) return false;
  for (let a = 0; a < distr.length; a++) {
    if (!PIC_BY[distr[a]]) return false;
    if (dch === 1 && sameFam(distr[a], q.target)) return false;     // ch1 干扰非同族（入门）
    if (dch >= 2 && !sameFam(distr[a], q.target)) return false;     // ch2+ 干扰恒同形近族（delta②）
  }
  return true;
}
