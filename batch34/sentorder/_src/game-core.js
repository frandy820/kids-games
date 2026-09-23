/* ================= sentorder 纯引擎：确定性关卡生成 + 词卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 601)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH34 §0.83/§2 + SPEC-R45 扩容；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 三词句：句长恒 3，池 = 句词（3 张），无干扰（起步下限不动）
     dch2 四词句：句长恒 4，池 = 句词 + 1 干扰（5 张，dist 表 2 词 seeded 抽 1，全远域）
     dch3 五词句：句长恒 5，池 = 句词 + 2 干扰（7 张；r45 新增句 dist=[近对,远域]）
     dch4 混合：句长 3-6（章句库 10 句滑窗），干扰 1-2（dist 表 seeded 抽，新句可含近对/tp 陷阱）
   生成关（flat>=20）：dch = ri(rnd, 1, 4)（SPEC 写死 seeded 随机——首掷即取，无 burn；
   b33 硬性②显式声明：本款生成关策略 = seeded 随机，非恒 N）。
   关内题序（r45 滑窗律，SPEC-R45 §R2）：题 qi 取 bank[(lv*2+qi) % 10]——lv 0-4 五窗
   [0-4][2-6][4-8][6-0][8-2] 并集 = 章内 10 句全可达（旧 (lv+qi)%10 窗并集漏第 10 句故弃）；
   lv=0 窗 = 存量 5 句原序 → flat0 题 0 恒 = ch1 首句「小兔子吃萝卜」教学锚点（全关字节保留）。
   池数学先验（§0.83 构造即满足——structWhy 双保险）：
     ① 候选池 = 本句词 + d 张干扰卡恒全摆（L+d 张，卡不消失——已用仅灰化）；
     ② 干扰词 ∈ 该句人工核定 dist 封闭表（≠ 本句任何词；远域 12 + r45 近对 4 两封闭池）；
     ③ 句内词互异 → 点选按词比较判定无歧义；句拼满判定 = picked 逐词 === words；
     ④ r45：dch>=3 词卡相对序恒等禁入（句词在池中恰按目标序排列 = 零重排挑战 → 拒并重洗）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 601);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（SPEC §0.83 写死：首掷即取）
  const bank = SENT_BANK[dch];
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const s = bank[(lv * 2 + qi) % bank.length];    // r45 滑窗 (lv*2+qi)%10（§R2：章内 10 句全可达；lv0 窗=存量 5 句 → flat0 字节锚）
    const d = dch === 1 ? 0 : dch === 2 ? 1 : dch === 3 ? 2 : ri(rnd, 1, 2);   // ch4 每题 seeded 抽 1-2
    const dist = d > 0 ? shuffled(s.dist || [], rnd).slice(0, d) : [];   // ch1 无 dist 表（d=0 恒空池）
    let shuf = shuffled(s.w.concat(dist), rnd);
    if (dch >= 3) {                                 /* r45 词卡相对序恒等禁入（§R3）：句词在池中的出现序恰为
                                                       目标语序 = 零重排挑战 → 拒并重洗（8 次防御上界，8 连恒等概率≈0）；
                                                       dch1-2 不设 = 保 flat0 字节锚与起步下限不变 */
      let g = 0;
      const pos = () => s.w.map(w => shuf.indexOf(w));
      const ident = () => pos().every((p, k, a) => k === 0 || p > a[k - 1]);
      while (g++ < 8 && ident()) shuf = shuffled(s.w.concat(dist), rnd);
    }
    const opts = shuf.map((w, j) => ({ id: 'p' + j, w: w, used: false }));
    quizzes.push({ words: s.w.slice(), text: s.t, opts: opts,
                   picked: [], _miss: 0, _answered: false, pic: s.pic });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点词卡引擎（无 DOM）：engTapWord(L, i) —— 点候选池第 i 张卡
   'fill'  点中下一正确词且句未满（词入槽 + TTS 读词）
   'done'  点中末词句拼满（整题完成=推进下一题；末题=通关——SPEC §2 定版）
   'wrong' 点错（语序跳前的本句词/干扰词——miss+1；错因两级文案由 UI 层选）
   'used'  已用卡（不记 miss——UI 层吞 false+轻叮+bump）
   null    越界下标 / 关卡已结束 ---------- */
function engTapWord(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  const card = q.opts[i];
  if (card.used) return 'used';                              // 已用卡（不记 miss）
  const P = q.picked.length;
  if (card.w !== q.words[P]) {                               // 非下一正确词
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  card.used = true;
  q.picked.push(card.w);
  if (q.picked.length === q.words.length) {                  // 句拼满=整题完成（done 推进）
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return 'done';
  }
  return 'fill';
}
const engWon = L => !!L && L.done;
/* 星级（§0.83 口径=miss）：全关 miss 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 错因分类（两级反馈）：语序跳前=本句词但非下一词（'order'）/ 干扰词=不在本句（'word'） */
const wrongWhy = (q, w) => q.words.indexOf(w) >= 0 ? 'order' : 'word';

/* ---------- 应点卡求解（教学帮指/答案级救援/autoSolve 共用）
   返回应点卡的 opts 下标（第一张未用且词=下一正确词），无=-1 ---------- */
function solveNext(q) {
  if (!q || q._answered) return -1;
  const need = q.words[q.picked.length];
  for (let i = 0; i < q.opts.length; i++)
    if (!q.opts[i].used && q.opts[i].w === need) return i;
  return -1;
}
const correctIdx = q => solveNext(q);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：句库封闭 / 章型规则 /
   池=句词+d 干扰（干扰∈该句 dist 表且∉本句词）/ 初始态干净 / flat0q0 锚点 ---------- */
function structWhy(q, dch, flat, qi, lv) {
  if (!q) return 'q';
  const bank = SENT_BANK[dch] || [];
  const hit = bank.find(s => s.w.join('/') === q.words.join('/'));
  if (!hit) return 'sent';                                  // 句 ∈ 本章句库封闭 5
  if (q.text !== hit.t || q.text !== q.words.join('')) return 'text';
  const L = q.words.length;
  if (new Set(q.words).size !== L) return 'dupw';           // 句内词互异
  const LEN_OK = dch === 1 ? L === 3 : dch === 2 ? L === 4 : dch === 3 ? L === 5 : (L >= 3 && L <= 6);
  if (!LEN_OK) return 'len' + dch;
  const d = q.opts.length - L;
  const D_OK = dch === 1 ? d === 0 : dch === 2 ? d === 1 : dch === 3 ? d === 2 : (d === 1 || d === 2);
  if (!D_OK) return 'd' + dch;                              // 干扰数按章型
  /* 干扰卡独立复算：∉本句词 && ∈该句 dist 封闭表 && 池=句词+干扰的多重集 */
  const inters = q.opts.filter(c => q.words.indexOf(c.w) < 0);
  if (inters.length !== d) return 'dN';
  for (const c of inters) {
    if (hit.dist.indexOf(c.w) < 0) return 'dist' + c.w;     // 干扰词 ∈ 人工核定表
    if (DIST_POOL.indexOf(c.w) < 0 && NEAR_POOL.indexOf(c.w) < 0) return 'pool' + c.w;   // ∈ 远域/近对封闭池（r45 两池）
  }
  const pm = q.opts.map(c => c.w).sort().join('/');
  const wm = q.words.concat(inters.map(c => c.w)).sort().join('/');
  if (pm !== wm) return 'multiset';
  /* 关内取句 = r45 滑窗律（genLevel 同构校验）：题 qi 句 = bank[(lv*2+qi)%10] */
  if (q.words.join('/') !== bank[(lv * 2 + qi) % bank.length].w.join('/')) return 'rotate';
  if (flat === 0 && qi === 0 && !(q.words.join('/') === '小兔子/吃/萝卜' && q.opts.length === 3))
    return 'anchor';                                        // 教学锚点：小兔子吃萝卜（3 卡无干扰）
  if (q.picked.length !== 0 || q._miss !== 0 || q._answered) return 'init';
  if (q.opts.some(c => c.used)) return 'used';
  return null;
}
