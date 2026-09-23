/* ================= worden 纯引擎：确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-R32-WORDEN §R2/§R3 定稿；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 pic2word 图→3 词卡选恒 3 选（r32 上探：原 2 选——起步辨析负荷）
   dch2 sound2pic 播 en 发音→图选（音-义；lv0 两选起步坡保留 / lv1-4 三选，r32：原 lv0-1 两选）
   dch3 qi0/1/3 pic2word 3 选+库外形近干扰（r32 扩 12 组）+ qi2/4 blank 缺字母补全产出题
   dch4 qi0-1 word2pic 词→图认读 + qi2 blank + qi3-4 三模式混合，恒 3 选（word2pic ≥2 不变）
   规则铁律：options 含判定真值且互异；词卡干扰 ∈词库；形近干扰 ∉词库（verify 显式断言）；
   相邻题 target 不同（同关内不连出同词）；blank 判定真值=pick 字母（target=词面） */
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
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 章级覆盖牌库（r32）：同 dch 的 10 关（静态 5+生成 5）共用一副章级洗牌牌库，
   各关取连续 5 词段——族内 50 抽 ≥48 词 → 词库全覆盖=结构性保证（SPEC §R3）。
   原 drawDeck（每关独立洗牌）在 24 词时代靠概率+实测断言过；48 词下实测缺词（bird/egg），
   无结构保证 → 退役换章级段制（谱全刷新，与每关独立洗牌同属确定性通道）。 */
function deckOf(dch, idx) {
  const pool = dch === 3 ? CONFUSE_KEYS : WORD_KEYS;
  const all = shuffled(pool, mulberry32(dch * 104729 + 7));   // 章级种子（独立于 flat 题内种子流）
  const seg = [0, 1, 2, 3, 4].map(k => all[(idx * 5 + k) % all.length]);
  if (dch >= 3) {                                             // blank 段防御：段内 ≥2 词长 ≥4（qi2/qi4
    let have = seg.filter(w => w.length >= 4).length;         // 产出题顺延取材，避开 last 的死角）
    if (have < 2) {                                           //（dch3 数学恒满足：12 基词仅 cat/dog <4，
      const extras = all.filter(w => w.length >= 4 && seg.indexOf(w) < 0);
      for (let s = 0; s < 5 && have < 2 && extras.length; s++) {
        if (seg[s].length < 4) { seg[s] = extras.shift(); have++; }
      }
    }
  }
  return seg;
}
/* 干扰词：同类别优先（视觉/语义邻近更锻炼辨析），其次全库随机；排除已用与 target */
function pickDistract(target, rnd, n, used) {
  const out = [];
  const sameCat = WORD_KEYS.filter(w => w !== target && WORDS[w].cat === WORDS[target].cat && used.indexOf(w) < 0);
  const rest = WORD_KEYS.filter(w => w !== target && WORDS[w].cat !== WORDS[target].cat && used.indexOf(w) < 0);
  const pool = shuffled(sameCat, rnd).concat(shuffled(rest, rnd));
  for (let i = 0; i < pool.length && out.length < n; i++) out.push(pool[i]);
  return out;
}

/* ---------- r32 blank 缺字母补全（SPEC §R1 维度三/§R3 生成律） ----------
   NEAR=缺字母的形近字母族（手写常见混淆族——辨析价值主承载；族外靠词内字母+高频池补） */
const NEAR = { b: 'dq', d: 'bp', p: 'bq', q: 'bd', m: 'n', n: 'm', w: 'v', v: 'w',
  i: 'l', l: 'i', u: 'v', e: 'a', a: 'e', o: 'u', s: 'z', z: 's', c: 'g', g: 'c',
  t: 'f', f: 't', r: 'n', h: 'k', k: 'h' };
const BLANK_POOL = ['a', 'e', 'i', 'o', 'u', 'r', 's', 't', 'n', 'l', 'm', 'p', 'd', 'b'];
/* blank 单题：target 词长 ≥4（3 字母词缺 1 位提示过强）；缺位=非首字母随机位；
   干扰字母=NEAR 族→词内他字母→高频池（去重 ≠pick）取 2；options 洗牌恒 3 字母卡 */
function genBlank(target, rnd) {
  const blankPos = ri(rnd, 1, target.length - 1);
  const pick = target[blankPos];
  const cand = [];
  (NEAR[pick] || '').split('').forEach(c => cand.push(c));
  for (let k = 0; k < target.length; k++) if (k !== blankPos) cand.push(target[k]);
  BLANK_POOL.forEach(c => cand.push(c));
  const dis = [];
  for (let k = 0; k < cand.length && dis.length < 2; k++) {
    const c = cand[k];
    if (c !== pick && /^[a-z]$/.test(c) && dis.indexOf(c) < 0) dis.push(c);
  }
  const options = shuffled([pick].concat(dis), rnd);
  return { mode: 'blank', target: target, options: options, pick: pick,
    blankPos: blankPos, _miss: 0, solved: false };
}

/* ---------- 单题生成（rnd 同流保证确定性）
   ch1: pic2word 恒 3 选（r32）/ ch2: sound2pic lv0=2 选 lv1-4=3 选 /
   ch3: qi2/4=blank 产出题，qi0/1/3=pic2word 3 选+形近干扰（blank 固定位=主线 qidx 驱动兼容 SPEC §R7）/
   ch4: qi0-1 word2pic + qi2 blank + qi3-4 随机三模式，恒 3 选 ---------- */
function genOne(dch, lv, qi, rnd, deck, last) {
  let mode, target, options;
  /* 发词：从章级牌库连续段取（相邻不同词已由 deckOf 段内互异+顺延/回绕换位兜底保证——r32 审查 minor3 勘正：drawDeck 已退役）；
     blank 题 target 顺延取词长 ≥4 者（3 字母词缺位提示过强——SPEC §R3） */
  const needBlank = (dch === 3 && (qi === 2 || qi === 4)) || (dch === 4 && qi === 2);
  let k = qi % deck.length, guard = 0;
  target = deck[k];
  if (needBlank) {
    while ((target.length < 4 || (last && target === last)) && guard++ < deck.length) {
      k = (k + 1) % deck.length;                              // 顺延：词长 ≥4 且 ≠上一题
      target = deck[k];
    }
  } else if (last && target === last && deck.length > 1) {    // 兜底（牌库回绕处相邻同词）
    target = deck[(qi + 1) % deck.length];
  }
  if (needBlank) return genBlank(target, rnd);                // blank 题走专属生成（零干扰词抽取）

  if (dch === 1) {                                            // 章 1：图→词 恒 3 选（r32 上探）
    mode = 'pic2word';
    options = [target].concat(pickDistract(target, rnd, 2, [target]));
  } else if (dch === 2) {                                     // 章 2：听音→图 lv0=2 选/lv1-4=3 选（r32）
    mode = 'sound2pic';
    options = [target].concat(pickDistract(target, rnd, lv === 0 ? 1 : 2, [target]));
  } else if (dch === 3) {                                     // 章 3：图→词 3 选+库外形近干扰
    mode = 'pic2word';
    const near = CONFUSE[target];                             // target ∈ CONFUSE_KEYS（牌库即 12 词）
    options = [target].concat(pickDistract(target, rnd, 1, [target])).concat([near]);
  } else {                                                    // 章 4：word2pic ≥2 + blank + 混合，3 选
    mode = qi <= 1 ? 'word2pic' : ['pic2word', 'sound2pic', 'word2pic'][Math.floor(rnd() * 3)];
    options = [target].concat(pickDistract(target, rnd, 2, [target]));
  }
  options = shuffled(options, rnd);
  return { mode: mode, target: target, options: options, _miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  /* 章级覆盖牌库段：dch 族内关号 idx（静态 0-4 / 生成 5-9）——族 50 抽 ≥48 词结构性覆盖 */
  const idx = (flat % STATIC_LEVELS) - (dch - 1) * CH_LEN + (flat >= STATIC_LEVELS ? CH_LEN : 0);
  const deck = deckOf(dch, idx);
  const quizzes = [];
  let last = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, lv, qi, rnd, deck, last);
    last = q.target;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张选项卡
   'right' = 答对（题继续）；'done' = 末题答对（通关）；'wrong' = 点错（灰掉，计错点）；
   'again' = 点已灰选项（早退零惩罚不计数）；null = 非法/关卡已结束
   判定真值：blank 题=pick 字母（点字母补全），其余=target 词（r32 单点扩——非 blank 逐字节同行为） */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.options.length) return null;
  if (q._dead && q._dead[i]) return 'again';                  // 已灰选项：早退（防御层 §0.7）
  const truth = q.mode === 'blank' ? q.pick : q.target;
  if (q.options[i] === truth) {
    q._dead = q._dead || [];
    q._dead[i] = 1;
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._dead = q._dead || [];
  q._dead[i] = 1;
  q._miss = (q._miss || 0) + 1;
  L.retries++;                                                // 错点次数（星级判据）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点=3 星；错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：mode 合法 / options 含判定真值且互异 /
   词卡干扰 ∈词库 / 形近干扰 ∈CONFUSE 值且 ∉词库 / 图题选项全 ∈词库 /
   blank（r32）：pick 单字符=词缺位字母、target 词长 ≥4、blankPos 非首、3 字母卡互异 ---------- */
function structOk(q) {
  if (!q || ['pic2word', 'sound2pic', 'word2pic', 'blank'].indexOf(q.mode) < 0) return false;
  if (!q.target || !WORDS[q.target]) return false;
  if (!q.options || q.options.length < 2) return false;
  if (q.mode === 'blank') {
    if (q.target.length < 4) return false;
    if (typeof q.pick !== 'string' || q.pick.length !== 1) return false;
    if (!(q.blankPos >= 1) || q.blankPos >= q.target.length) return false;
    if (q.target[q.blankPos] !== q.pick) return false;
    if (q.options.length !== 3) return false;
    if (q.options.indexOf(q.pick) < 0) return false;
    for (let i = 0; i < q.options.length; i++) {
      if (!/^[a-z]$/.test(q.options[i])) return false;
      for (let j = i + 1; j < q.options.length; j++) if (q.options[i] === q.options[j]) return false;
    }
    return true;
  }
  if (q.options.indexOf(q.target) < 0) return false;
  for (let i = 0; i < q.options.length; i++) {
    for (let j = i + 1; j < q.options.length; j++) if (q.options[i] === q.options[j]) return false;
    if (q.mode === 'sound2pic' || q.mode === 'word2pic') {
      if (!WORDS[q.options[i]]) return false;                 // 图选项必须都在词库（有 SVG）
    }
  }
  return true;
}
