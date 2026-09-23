/* ================= trace 纯引擎：确定性题序生成 + 自推笔顺比对 + 选卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH24 §7 r5；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 自推笔顺 1-5（起点+终点标记 hintMode='ends'）/ dch2 自推笔顺 6-10（仅起点 'start'）/
   dch3 听数选字+描（1-10 轮转，选对卡才进描红）/ dch4 镜像辨析混出 [mirror,listen,trace,mirror,trace]；
   生成关 flat≥20 按 dch 循环 = 四型混排。flat0 题 0 恒数字 1（教学演示题面稳定）。
   rnd 消耗序（Python 对拍真值）：dch1/2 offset→池轮转；dch3 offset→逐题 listenCards（补足+洗牌）；
   dch4 mOff,lOff,tOff→逐题（mirror 洗牌 / listenCards / 池轮转）。
   自推铁律（§7）：点对当前锚点 = pos+1 连线延伸；点错 = miss+1 且 pos 不进（不重头，piano 同构），
   错型分流（engWrongType）：跳笔（i>pos）与逆笔（i<pos，按期望段主轴给方向）——不 flash 正确锚点。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const tr_ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function shuffleArr(arr, rnd) {              // Fisher-Yates（rnd 消耗 arr.length-1 次）
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = tr_ri(rnd, 0, i);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function listenCards(num, rnd) {            // 听数候选：[num]+近伙伴+随机补足 → 洗牌
  const cards = [num];
  const near = LISTEN_NEAR[num] || [];
  for (let k = 0; k < near.length && cards.length < 4; k++) {
    if (cards.indexOf(near[k]) < 0) cards.push(near[k]);
  }
  while (cards.length < 4) {                // 随机补足（拒绝重复——消耗次数不定但确定）
    const c = tr_ri(rnd, 1, 10);
    if (cards.indexOf(c) < 0) cards.push(c);
  }
  return shuffleArr(cards, rnd);
}
function mirrorCards(num, rnd) {            // 镜像候选：正体+3 变体（m/r/f 后缀）洗牌
  return shuffleArr([String(num), num + 'm', num + 'r', num + 'f'], rnd);
}
function mkTrace(num, mode) {
  const d = DIGITS[num];
  return { kind: 'trace', num: num,
           anchors: d.anchors.map(a => a.slice()), strokes: d.strokes.slice(),
           loop: d.loop, pos: 0, miss: 0, solved: false,
           phase: 'write', hintMode: mode, cards: null, right: -1 };
}
function mkPick(kind, num, cards, right) {
  const d = DIGITS[num];
  return { kind: kind, num: num,
           anchors: d.anchors.map(a => a.slice()), strokes: d.strokes.slice(),
           loop: d.loop, pos: 0, miss: 0, solved: false,
           phase: 'pick', hintMode: 'start', cards: cards, right: right };
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let pool = ALL10.slice();
  if (dch === 1) {                          // 自推笔顺 1-5：起点+终点
    const p = [1, 2, 3, 4, 5];
    const off = flat === 0 ? 0 : tr_ri(rnd, 0, 4);
    pool = p.slice();
    for (let i = 0; i < CH_LEN; i++) quizzes.push(mkTrace(p[(off + i) % 5], 'ends'));
  } else if (dch === 2) {                   // 自推笔顺 6-10：仅起点
    const p = [6, 7, 8, 9, 10];
    const off = tr_ri(rnd, 0, 4);
    pool = p.slice();
    for (let i = 0; i < CH_LEN; i++) quizzes.push(mkTrace(p[(off + i) % 5], 'start'));
  } else if (dch === 3) {                   // 听数选字+描（1-10 轮转）
    const off = tr_ri(rnd, 0, 9);
    for (let i = 0; i < CH_LEN; i++) {
      const num = ALL10[(off + i) % 10];
      const cards = listenCards(num, rnd);
      quizzes.push(mkPick('listen', num, cards, cards.indexOf(num)));
    }
  } else {                                  // 镜像辨析混出（固定型序）
    const kinds = ['mirror', 'listen', 'trace', 'mirror', 'trace'];
    const mOff = tr_ri(rnd, 0, MIRROR_POOL.length - 1);
    const lOff = tr_ri(rnd, 0, 9);
    const tOff = tr_ri(rnd, 0, 9);
    let mi = 0, li = 0, ti = 0;
    for (let k = 0; k < kinds.length; k++) {
      const kk = kinds[k];
      if (kk === 'mirror') {
        const num = MIRROR_POOL[(mOff + mi++) % MIRROR_POOL.length];
        const cards = mirrorCards(num, rnd);
        quizzes.push(mkPick('mirror', num, cards, cards.indexOf(String(num))));
      } else if (kk === 'listen') {
        const num = ALL10[(lOff + li++) % 10];
        const cards = listenCards(num, rnd);
        quizzes.push(mkPick('listen', num, cards, cards.indexOf(num)));
      } else {
        quizzes.push(mkTrace(ALL10[(tOff + ti++) % 10], 'start'));
      }
    }
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, pool: pool,
           quizzes: quizzes, step: 0, done: false, missTotal: 0 };
}

/* ---------- 点锚引擎（无 DOM）：engTapAnchor(L, 锚点序号 i) —— 自推笔顺比对
   'right'  点对且未到题尾（pos+1）
   'done'   点对且该题完成（还有后续题）
   'won'    末题完成 = 通关
   'wrong'  点错（i ≠ 当前锚点序号）：miss+1，pos 不进（不重头——§0.56 定版沿承）
   null     序号越界 / 关已结束 / 非 write 相位（选卡期点板无效） ---------- */
function engTapAnchor(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'write') return null;
  if (!(i >= 0 && i < q.anchors.length)) return null;
  if (i === q.pos) {
    q.pos++;
    if (q.pos >= q.anchors.length) {
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'won'; }
      return 'done';
    }
    return 'right';
  }
  q.miss++;
  L.missTotal++;
  return 'wrong';
}
/* ---------- 选卡引擎（r5 新题型）：engPickCard(L, 卡下标 i)
   'right'  选对 → phase 'pick'→'write'（进描红）
   'wrong'  选错：miss+1，phase 不变（重选）
   null     越界 / 非 pick 相位 / 关已结束 ---------- */
function engPickCard(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'pick') return null;
  if (!(i >= 0 && i < q.cards.length)) return null;
  if (i === q.right) { q.phase = 'write'; return 'right'; }
  q.miss++;
  L.missTotal++;
  return 'wrong';
}
/* ---------- 错型分类（自推方向反馈真值，§7）：engWrongType(q, i)
   i>pos = 跳笔（点了后面的笔）→ 'skip'；
   i<pos = 逆笔（回点已写过的）→ 'back' + 期望段（pos→pos+1）主轴方向：
   |dy|>=|dx| 竖向（dy>0 'down' / dy<0 'up'），否则横向（dx>0 'right' / dx<0 'left'）。
   返回 null = i 不是错点。verify 从 SPEC 锚点表独立重算对账。 ---------- */
function engWrongType(q, i) {
  if (i === q.pos) return null;
  if (i > q.pos) return { type: 'skip', dir: null };
  const a = q.anchors, p = q.pos;
  const j = p + 1 < a.length ? p + 1 : a.length - 1;   // 末锚未点时=最后一段来向
  const k = j === p ? p - 1 : p;
  const dx = a[j][0] - a[k][0], dy = a[j][1] - a[k][1];
  const dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
  return { type: 'back', dir: dir };
}
const engWon = L => !!L && L.done;

/* ---------- 星级（SPEC §2/§7 定版）：失败尝试总数口径（点错+选错同计）
   0=3★ / 1-2=2★ / ≥3=1★。永不 0 星 ---------- */
const engStars = L => {
  const m = !L ? 0 : (L.missTotal || 0);
  return m === 0 ? 3 : (m <= 2 ? 2 : 1);
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）
   题型封闭（dch1 全 trace-ends / dch2 全 trace-start / dch3 全 listen / dch4 固定型序）/
   数字在封闭池 / 锚点数 2-6 / 首锚方向（y<中位 或 x<左半）/ 笔数 4/5/7/10 ≥2 其余 1 /
   选卡题：4 卡唯一 / listen 近伙伴在场+right 指向 num / mirror 目标在池+变体集封闭+right 指正体 /
   初始 pos0 未解 ---------- */
function structWhy(q, dch, flat, qi, pool) {
  if (!q || typeof q.num !== 'number') return 'shape';
  const KINDS = ['trace', 'listen', 'mirror'];
  if (KINDS.indexOf(q.kind) < 0) return 'kind:' + q.kind;
  if (dch === 1 && !(q.kind === 'trace' && q.hintMode === 'ends')) return 'dch1:' + q.kind;
  if (dch === 2 && !(q.kind === 'trace' && q.hintMode === 'start')) return 'dch2:' + q.kind;
  if (dch === 3 && q.kind !== 'listen') return 'dch3:' + q.kind;
  if (dch === 4 && q.kind !== ['mirror', 'listen', 'trace', 'mirror', 'trace'][qi]) return 'dch4pat:' + qi;
  if (q.kind === 'listen' && ALL10.indexOf(q.num) < 0) return 'pool:' + q.num;
  if (q.kind === 'mirror' && MIRROR_POOL.indexOf(q.num) < 0) return 'mirpool:' + q.num;
  if (q.kind === 'trace' && pool.indexOf(q.num) < 0) return 'pool:' + q.num;
  const n = q.anchors.length;
  if (!(n >= 2 && n <= 6)) return 'nanchors:' + n;
  const a0 = q.anchors[0];
  if (!(a0[1] < 50 || a0[0] < 50)) return 'startdir:' + q.num;
  const multi = [4, 5, 7, 10].indexOf(q.num) >= 0;
  if (multi && q.strokes.length < 2) return 'strokes:' + q.num;
  if (!multi && q.strokes.length !== 1) return 'strokes1:' + q.num;
  if (q.strokes[0] !== 0) return 'strokes0:' + q.num;
  for (let k = 1; k < q.strokes.length; k++) if (q.strokes[k] <= q.strokes[k - 1]) return 'strokesasc:' + q.num;
  if (q.strokes[q.strokes.length - 1] >= n) return 'strokesrange:' + q.num;
  if (q.kind === 'trace' && q.phase !== 'write') return 'phase';
  if (q.kind !== 'trace') {
    if (q.phase !== 'pick') return 'phase';
    if (!Array.isArray(q.cards) || q.cards.length !== 4) return 'cards';
    if (Array.from(new Set(q.cards.map(String))).length !== 4) return 'cardsdup';
    if (!(q.right >= 0 && q.right < 4)) return 'right';
    if (q.kind === 'listen') {
      if (String(q.cards[q.right]) !== String(q.num)) return 'listenright';
      const near = LISTEN_NEAR[q.num] || [];
      if (near.length && !near.some(p => q.cards.indexOf(p) >= 0)) return 'near';
    } else {
      const want = new Set([String(q.num), q.num + 'm', q.num + 'r', q.num + 'f']);
      if (!q.cards.every(c => want.has(String(c)))) return 'mirset';
      if (String(q.cards[q.right]) !== String(q.num)) return 'mirright';
    }
  }
  if (q.pos !== 0 || q.solved || q.miss !== 0) return 'init';
  return null;
}
