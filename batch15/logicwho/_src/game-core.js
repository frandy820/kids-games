/* ================= logicwho 纯引擎：确定性出题 + 线索判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   数据模型（SPEC §2）：quiz = { animals[3]（座位序=隐藏真值排列）, hats[3]（座位帽色，可见）,
   items[3]|null（ch4 物品，可见）, clues[2-3], ask{kind,value}, answer（=问句属性所在座位
   下标）, choices[3]（动物卡显示序）, kc（关键线索下标：与问句属性相关者优先，承重者优先）,
   _miss, solved }。
   线索型四类：pos 正"戴X帽子的是Y" / neg 负"戴X帽子的不是W" / rel 相对"X住在Y左边"
   （相邻左，观察者视角=屏幕左，承 batch9 定版）/ abs 绝对"最左/右边的是X" / ipos 物品正"拿I的是X"。
   §0.29 生成门：线索全真 + 问句答案在 6 排列穷举下唯一（solveCheck）；不满足换参数重生成
   （确定性 rnd 循环）。 */
function mulberry32(a) {
  return function () {
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数

/* 6 种排列（animals → 座位 0/1/2 的全部双射）——§0.29 穷举真值源 */
const PERMS6 = (function () {
  const out = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    if (b === a) continue;
    out.push([ANIMAL_IDS[a], ANIMAL_IDS[b], ANIMAL_IDS[3 - a - b]]);
  }
  return out;
})();

/* ---------- 线索构造（text/segs 由参数派生，禁手抄——verify 用独立段表对账） ---------- */
function mkClue(o) {
  const c = { t: o.t, hat: o.hat || null, item: o.item || null, X: o.X || null,
    Y: o.Y || null, W: o.W || null, edge: o.edge || null, keyClue: false };
  c.text = clueText(c);
  c.segs = clueSegs(c);
  return c;
}
function clueText(c) {
  if (c.t === 'pos')  return '戴' + HATS[c.hat].cn + '帽子的是' + ANIMALS[c.X].name;
  if (c.t === 'neg')  return '戴' + HATS[c.hat].cn + '帽子的不是' + ANIMALS[c.W].name;
  if (c.t === 'rel')  return ANIMALS[c.X].name + '住在' + ANIMALS[c.Y].name + '左边';
  if (c.t === 'abs')  return (c.edge === 'L' ? '最左边的是' : '最右边的是') + ANIMALS[c.X].name;
  if (c.t === 'ipos') return '拿' + ITEMS[c.item].cn + '的是' + ANIMALS[c.X].name;
  return '';
}
/* 线索句语音 = queue 拼接段（§0.23：4 段拼接单元 lgw_c_a+色词+lgw_c_b+动物名 等） */
function clueSegs(c) {
  if (c.t === 'pos')  return ['lgw_c_a', HATS[c.hat].key, 'lgw_c_b', ANIMALS[c.X].key];
  if (c.t === 'neg')  return ['lgw_c_a', HATS[c.hat].key, 'lgw_c_nb', ANIMALS[c.W].key];
  if (c.t === 'rel')  return [ANIMALS[c.X].key, 'lgw_c_l', ANIMALS[c.Y].key, 'lgw_c_left'];
  if (c.t === 'abs')  return [c.edge === 'L' ? 'lgw_c_ll' : 'lgw_c_rr', ANIMALS[c.X].key];
  if (c.t === 'ipos') return ['lgw_c_h', ITEMS[c.item].key, 'lgw_c_i', ANIMALS[c.X].key];
  return [];
}
/* 线索真值：perm=候选排列（animals→座位序），hats/items=座位属性布局 */
function clueTrueEng(c, perm, hats, items) {
  if (c.t === 'pos')  return perm[hats.indexOf(c.hat)] === c.X;
  if (c.t === 'neg')  return perm[hats.indexOf(c.hat)] !== c.W;
  if (c.t === 'rel')  return perm.indexOf(c.X) === perm.indexOf(c.Y) - 1;   /* 相邻左（屏幕左） */
  if (c.t === 'abs')  return c.edge === 'L' ? perm[0] === c.X : perm[2] === c.X;
  if (c.t === 'ipos') return perm[items.indexOf(c.item)] === c.X;
  return false;
}
const seatOfAttr = (q, kind, value) =>
  kind === 'hat' ? q.hats.indexOf(value) : (q.items || []).indexOf(value);

/* §0.29 核心：6 排列穷举——满足全部线索的排列取"问句座位"的动物，恰一解=答案唯一 */
function solveCheck(qx) {
  const answers = [];
  for (let k = 0; k < PERMS6.length; k++) {
    const perm = PERMS6[k];
    let ok = true;
    for (let i = 0; i < qx.clues.length; i++)
      if (!clueTrueEng(qx.clues[i], perm, qx.hats, qx.items)) { ok = false; break; }
    if (ok) answers.push(perm[seatOfAttr(qx, qx.ask.kind, qx.ask.value)]);
  }
  const uniq = answers.length > 0 && answers.every(a => a === answers[0]);
  return { ok: uniq, answer: uniq ? answers[0] : null, sat: answers.length };
}

/* ---------- 单题生成（章配方 + §0.29 重生成循环） ----------
   ch1：1 正（问该帽=直接型，练"线索→卡"映射）
   ch2：1 正 1 负（负帽=问帽：正线索钉死一只，负线索把第三只排除出问句座位→恰一解且负线索承重）
   ch3：相对+绝对+1 负（先定位置再读属性：rel+abs 唯一确定排列，负帽给问句座位直接排除）
   ch4：帽正+物正+帽负（双属性交叉：正线索钉死两只在不同座位→第三座位住客唯一，问其帽或物） */
function genQuiz(rnd, dch, prevAnimals) {
  let best = null;
  for (let att = 0; att < 500; att++) {
    const animals = shuffled(ANIMAL_IDS, rnd);
    const hats = shuffled(HAT_IDS, rnd);
    const items = dch === 4 ? shuffled(ITEM_IDS, rnd) : null;
    const clues = [];
    let ask = null, answer = -1;
    if (dch === 1) {
      const s = Math.floor(rnd() * 3);
      clues.push(mkClue({ t: 'pos', hat: hats[s], X: animals[s] }));
      ask = { kind: 'hat', value: hats[s] }; answer = s;
    } else if (dch === 2) {
      const sA = Math.floor(rnd() * 3);
      const sB = (sA + 1 + Math.floor(rnd() * 2)) % 3;
      const sC = 3 - sA - sB;
      clues.push(mkClue({ t: 'pos', hat: hats[sA], X: animals[sA] }));
      clues.push(mkClue({ t: 'neg', hat: hats[sB], W: animals[sC] }));
      ask = { kind: 'hat', value: hats[sB] }; answer = sB;
    } else if (dch === 3) {
      const s = Math.floor(rnd() * 2);
      clues.push(mkClue({ t: 'rel', X: animals[s], Y: animals[s + 1] }));
      const edge = rnd() < 0.5 ? 'L' : 'R';
      clues.push(mkClue({ t: 'abs', edge: edge, X: edge === 'L' ? animals[0] : animals[2] }));
      const t = Math.floor(rnd() * 3);
      const ws = [0, 1, 2].filter(k => k !== t);
      clues.push(mkClue({ t: 'neg', hat: hats[t], W: animals[ws[Math.floor(rnd() * 2)]] }));
      ask = { kind: 'hat', value: hats[t] }; answer = t;
    } else {
      const sA = Math.floor(rnd() * 3);
      let sI = Math.floor(rnd() * 3);
      if (sI === sA) sI = (sA + 1 + Math.floor(rnd() * 2)) % 3;
      const sC = 3 - sA - sI;
      clues.push(mkClue({ t: 'pos', hat: hats[sA], X: animals[sA] }));
      clues.push(mkClue({ t: 'ipos', item: items[sI], X: animals[sI] }));
      const t3 = Math.floor(rnd() * 3);
      const ws3 = [0, 1, 2].filter(k => k !== t3);
      clues.push(mkClue({ t: 'neg', hat: hats[t3], W: animals[ws3[Math.floor(rnd() * 2)]] }));
      ask = rnd() < 0.5 ? { kind: 'item', value: items[sC] } : { kind: 'hat', value: hats[sC] };
      answer = sC;
    }
    const ordered = shuffled(clues, rnd);
    /* §0.29 生成门：线索全真 + 恰一解（先记 best：唯一解但相邻排列重复的候选留作兜底） */
    if (!ordered.every(c => clueTrueEng(c, animals, hats, items))) continue;
    const chk = solveCheck({ hats: hats, items: items, clues: ordered, ask: ask, animals: animals });
    if (!chk.ok || chk.answer !== animals[answer]) continue;
    if (!best) best = { animals: animals, hats: hats, items: items, clues: ordered, ask: ask, answer: answer };
    /* 相邻题排列互异（防同关连续两题谜底一眼相同） */
    if (prevAnimals && prevAnimals.join() === animals.join()) continue;
    /* 关键线索 kc（救援/错点回看指向）：与问句属性相关者优先（其中承重者优先）；
       无相关线索时取承重线索（去掉后答案不再唯一）→ 位置线索 → 第一条。
       注：ch3 存在"任两条线索都恰一解"的配置（rel+abs 已钉死排列），承重性非恒存在，
       故 kc 不强制承重——verify 按同款优先级独立复算选择结果 */
    const askRelated = c => ask.kind === 'hat'
      ? ((c.t === 'pos' || c.t === 'neg') && c.hat === ask.value)
      : (c.t === 'ipos' && c.item === ask.value);
    const breaks = i => {
      const sub2 = ordered.filter((_, j) => j !== i);
      const ck2 = solveCheck({ hats: hats, items: items, clues: sub2, ask: ask, animals: animals });
      return !(ck2.ok && ck2.answer === animals[answer]);
    };
    let kc = -1;
    for (let i = 0; i < ordered.length; i++) if (askRelated(ordered[i]) && breaks(i)) { kc = i; break; }
    if (kc < 0) kc = ordered.findIndex(askRelated);
    if (kc < 0) { for (let i = 0; i < ordered.length; i++) if (breaks(i)) { kc = i; break; } }
    if (kc < 0) kc = ordered.findIndex(c => c.t === 'rel' || c.t === 'abs');
    if (kc < 0) kc = 0;
    ordered[kc].keyClue = true;
    const a = ASKS[ask.value];
    return { animals: animals, hats: hats, items: items, clues: ordered,
      ask: { kind: ask.kind, value: ask.value }, askKey: a.key, askText: a.text,
      answer: answer, choices: shuffled(ANIMAL_IDS, rnd), kc: kc, _miss: 0, solved: false };
  }
  /* 理论不可达（配方构造性满足恰一解）；兜底返回首个唯一解候选（放弃相邻互异） */
  if (!best) return null;
  best.clues[0].keyClue = true;
  const a = ASKS[best.ask.value];
  return { animals: best.animals, hats: best.hats, items: best.items, clues: best.clues,
    ask: { kind: best.ask.kind, value: best.ask.value }, askKey: a.key, askText: a.text,
    answer: best.answer, choices: shuffled(ANIMAL_IDS, mulberry32(7)), kc: 0, _miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 生成关难度随机（b15 审查 M1）
  const quizzes = [];
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genQuiz(rnd, dch, prev);
    prev = q.animals;
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 点选动物卡引擎（无 DOM）
   'right' 答对推进（非末题）/ 'done' 通关 / 'wrong' 答错（miss+1，零惩罚可重点）/
   false 非法（越界/已解/关卡结束） ---------- */
function engTapAnimal(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.choices.length) return false;
  if (q.choices[i] === q.animals[q.answer]) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._miss++;
  L.misses++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：关 miss（错点）0=3 星 / 1-2=2 星 / 更多=1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：排列合法性 / 章配方构成 / 文本与段同源 /
   线索全真 / 问句与属性分配一致 / 恰一解 / kc 承重 ---------- */
function structOk(q, dch) {
  if (!q || !q.clues || !q.ask) return false;
  const isPerm = (a, ids) => !!a && a.length === 3 && ids.every(x => a.indexOf(x) >= 0);
  if (!isPerm(q.animals, ANIMAL_IDS) || !isPerm(q.hats, HAT_IDS)) return false;
  if (!isPerm(q.choices, ANIMAL_IDS)) return false;
  if (dch === 4 ? !isPerm(q.items, ITEM_IDS) : q.items !== null) return false;
  const n = { 1: 1, 2: 2, 3: 3, 4: 3 }[dch];
  if (q.clues.length !== n) return false;
  const cnt = t => q.clues.filter(c => c.t === t).length;
  if (dch === 1 && !(cnt('pos') === 1)) return false;
  if (dch === 2 && !(cnt('pos') === 1 && cnt('neg') === 1)) return false;
  if (dch === 3 && !(cnt('rel') === 1 && cnt('abs') === 1 && cnt('neg') === 1)) return false;
  if (dch === 4 && !(cnt('pos') === 1 && cnt('ipos') === 1 && cnt('neg') === 1)) return false;
  for (const c of q.clues) {
    if (c.text !== clueText(c) || c.segs.join() !== clueSegs(c).join()) return false;
    if (!clueTrueEng(c, q.animals, q.hats, q.items)) return false;
  }
  if (q.answer !== seatOfAttr(q, q.ask.kind, q.ask.value)) return false;
  if (q.askKey !== ASKS[q.ask.value].key || q.askText !== ASKS[q.ask.value].text) return false;
  if (q.clues.filter(c => c.keyClue).length !== 1 || !q.clues[q.kc] || !q.clues[q.kc].keyClue) return false;
  const chk = solveCheck(q);
  if (!chk.ok || chk.answer !== q.animals[q.answer]) return false;
  return true;
}
