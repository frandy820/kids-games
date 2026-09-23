/* ================= poemfill 纯引擎：确定性关卡生成 + 依序入格判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   r13 题型（SPEC-BATCH17 §1-r13）：整句回忆四型——
   F 给上句选下句（cueIdx 偶 0-2，ansIdx=cueIdx+1）/ R 给下句选上句（cueIdx 奇 1-3，
   ansIdx=cueIdx-1，逆向联想）/ O 句序重组（给 li0，排 li1-3 三槽）/ FF 飞花令
   （指定字 FF_CHARS 轮换，跨诗选含字句）。干扰句=r13 规则：F/R 恒含同诗他句 1 张
   （不出现在题面两联中）+其余取库内他诗同长句；O=他诗同长句 1 张；FF=不含指定字的
   库内句（优先同长）。句卡互异、干扰≠答案≠题面句（verify 分源复算）。
   数据模型：q._bt[j]=入格句卡索引或 -1（j=槽位，O 型 3 槽按句序）；q._used[i]=句卡已入格；
   依序入格=找最左空槽；填满即判：built 逐位===ans → right（推进，唯一重置救援钟主路径）；
   ≠ans → wrong（miss/retries 各 +1，句留槽可点退回，零惩罚）；退回=探索不计 miss。
   （r13 复用 b17 填空引擎 engTapTile/engTapBuilt/rescueTarget/engStars 原语义——
   引擎按"字符串卡+槽位"通用，与句长无关） */
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
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 干扰句挑选（确定性；全部取自库内真诗文本，禁造句） ---------- */
/* 同诗他句 1 张：排除题面句与答案句（恰剩 2 张候选）——同诗干扰提供"熟诗内部辨析"负荷 */
function pickSamePoem(rnd, poem, cueIdx, ansIdx) {
  const pool = [0, 1, 2, 3].filter(li => li !== cueIdx && li !== ansIdx);
  const pick = shuffled(pool, rnd)[0];
  return poem.lines[pick];
}
/* 他诗同长句 n 张：库内他诗（pid 除外）中与答案句等长（全字符口径）的句，互异 */
function pickOtherPoem(rnd, pid, len, n, exclude) {
  const excl = {}; (exclude || []).forEach(s => { excl[s] = 1; });
  const pool = [];
  ALL_POEMS.forEach(op => {
    if (op === pid) return;
    POEMS[op].lines.forEach(ln => { if (ln.length === len && !excl[ln]) pool.push(ln); });
  });
  if (pool.length < n) throw new Error('distractor pool exhausted');
  return shuffled(pool, rnd).slice(0, n);
}
/* 飞花令干扰 n 张：库内不含指定字的句（优先与答案句同长），互异且 ≠ 答案句 */
function pickFFDistract(rnd, ch, ansText, n) {
  const sameLen = [], anyLen = [];
  ALL_POEMS.forEach(op => {
    POEMS[op].lines.forEach(ln => {
      if (ln === ansText || ln.indexOf(ch) >= 0) return;
      (ln.length === ansText.length ? sameLen : anyLen).push(ln);
    });
  });
  const pool = sameLen.length >= n ? sameLen : sameLen.concat(anyLen);
  const seen = {}, out = [];
  const sh = shuffled(pool, rnd);
  for (const ln of sh) {
    if (seen[ln]) continue;
    seen[ln] = 1; out.push(ln);
    if (out.length === n) break;
  }
  if (out.length < n) throw new Error('ff distractor pool exhausted');
  return out;
}

/* ---------- 飞花令指定字→含字句注册表（库内全量；飞 6/春 7/花 8 ≥5 出题域充足） ---------- */
const FF_REG = {};
FF_CHARS.forEach(c => {
  FF_REG[c] = [];
  ALL_POEMS.forEach(op => {
    POEMS[op].lines.forEach((ln, li) => { if (ln.indexOf(c) >= 0) FF_REG[c].push({ pid: op, li: li, text: ln }); });
  });
});

/* ---------- 单题生成（r13）；题 sig 互异（同关） ---------- */
function genQuiz(dch, pid, spec, rnd) {
  const poem = POEMS[pid];
  let type, cueIdx = null, ansIdx = null, targetChar = null, ans, distract, sig;
  if (spec.type === 'F' || spec.type === 'R') {
    type = spec.type;
    cueIdx = spec.cue;
    ansIdx = type === 'F' ? cueIdx + 1 : cueIdx - 1;
    ans = [poem.lines[ansIdx]];
    const n = distractN(dch, type);
    distract = [pickSamePoem(rnd, poem, cueIdx, ansIdx)]
      .concat(pickOtherPoem(rnd, pid, ans[0].length, n - 1, [ans[0], poem.lines[cueIdx]]));
    sig = type + ':' + pid + ':' + cueIdx;
  } else if (spec.type === 'O') {
    type = 'O';
    cueIdx = 0;
    ans = [poem.lines[1], poem.lines[2], poem.lines[3]];
    distract = pickOtherPoem(rnd, pid, ans[0].length, 1, ans.concat([poem.lines[0]]));
    sig = 'O:' + pid;
  } else {                                              /* FF 飞花令 */
    type = 'FF';
    targetChar = spec.char;
    const row = spec.pick;                              /* {pid,li,text}（关级去重后传入） */
    ans = [row.text];
    distract = pickFFDistract(rnd, targetChar, row.text, distractN(dch, 'FF'));
    sig = 'FF:' + targetChar + ':' + row.pid + ':' + row.li;
    pid = row.pid;
  }
  const cards = shuffled(ans.concat(distract), rnd);
  if (cards.some((c, k) => cards.indexOf(c) !== k)) throw new Error('cards dup');
  return { kind: 'poemfill', type: type, pid: pid, title: POEMS[pid].title, author: POEMS[pid].author,
    lines: POEMS[pid].lines.slice(), cueIdx: cueIdx, ansIdx: ansIdx, targetChar: targetChar,
    ans: ans, tiles: cards, len: ans[0].length,
    sig: sig,
    _bt: ans.map(function () { return -1; }),
    _used: cards.map(function () { return false; }),
    miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题 sig 互异）
   ch1-3 每关一首诗贯穿（一诗一课）；ch4 飞花令 5 轮指定字轮换（FF_CHARS[(lv+k)%3]，
   三字每关全覆盖；答案句关级去重）。生成关 flat≥20：dch 随机、诗按档池轮换 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  let quizzes, pid = null;
  if (dch === 4) {
    const usedFF = {};                                  /* 关级含字句去重（sig 互异保障） */
    quizzes = COMPOSE[4].map(function (s, k) {
      const c = FF_CHARS[(lv + k) % 3];
      const cands = FF_REG[c].filter(r => !usedFF[r.pid + ':' + r.li]);
      const row = cands[Math.floor(rnd() * cands.length)];
      usedFF[row.pid + ':' + row.li] = 1;
      return genQuiz(dch, null, { type: 'FF', char: c, pick: row }, rnd);
    });
  } else {
    const pool = dch === 1 ? FIVE_CHAR : (dch === 2 ? SEVEN_CHAR : ALL_POEMS);
    pid = flat < STATIC_LEVELS ? LEVEL_POEMS[flat] : pool[flat % pool.length];
    quizzes = COMPOSE[dch].map(function (s) { return genQuiz(dch, pid, s, rnd); });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, pid: dch === 4 ? null : pid,
    quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 填空引擎（无 DOM；r13 原样沿用 b17——通用"卡入槽"语义） ---------- */
const builtOf = q => q._bt.map(t => t >= 0 ? q.tiles[t] : null);
const stepOf = q => q._bt.reduce((s, t) => s + (t >= 0 ? 1 : 0), 0);

/* engTapTile(L, i)：点池中第 i 张句卡 → 入最左空槽；返回
   'placed'（未满）/ 'right'|'done'（填满且对，step 推进）/ 'wrong'（填满且错，miss 计一次）
   / null（非法：越界、句卡已用、关已结束）。放句卡=探索不重置救援钟（§0.7a） */
function engTapTile(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.tiles.length) return null;
  if (q._used[i]) return null;
  const j = q._bt.indexOf(-1);
  if (j < 0) return null;
  q._bt[j] = i;
  q._used[i] = true;
  if (stepOf(q) === q.ans.length) {
    if (builtOf(q).every((c, k) => c === q.ans[k])) {
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    q.miss++;
    L.retries++;
    return 'wrong';
  }
  return 'placed';
}
/* engTapBuilt(L, j)：点第 j 槽已填句退回池（该句卡复活）→ 返回新 step；
   非法下标/空槽 → null。退回=探索不计 miss 不重置救援钟（§0.7a） */
function engTapBuilt(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q.ans.length) return null;
  if (q._bt[j] < 0) return null;
  q._used[q._bt[j]] = false;
  q._bt[j] = -1;
  return stepOf(q);
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（填满判错口径，退回不计，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§1）：自左向右第一处"未填对"的槽——
   该槽有错句 → {act:'undo', j}（先退回）；空 → {act:'tile', i, j}（点答案句卡）；
   答案句无空闲卡但被错放在后槽 → {act:'undo', k}（先退回后槽释放该卡——
   覆盖"错位句需前移"态，保证步进恒收敛）；已解题 → null（r13 引擎原样沿用） ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  for (let j = 0; j < q.ans.length; j++) {
    const b = q._bt[j] >= 0 ? q.tiles[q._bt[j]] : null;
    if (b === q.ans[j]) continue;
    if (b !== null) return { act: 'undo', j: j };
    for (let i = 0; i < q.tiles.length; i++) {
      /* tile 分支带 j（doHint/applyRescueVisual 取 t.j 点亮首未对槽 breathe） */
      if (!q._used[i] && q.tiles[i] === q.ans[j]) return { act: 'tile', i: i, j: j };
    }
    for (let k = 0; k < q.ans.length; k++) {       // 所需句错放在"错槽"（≠其正确位）：先退回释放；
      if (k !== j && q._bt[k] >= 0 &&               // 只动错槽不动已对槽（双同句教训：牺牲对槽=死循环）
          q.tiles[q._bt[k]] === q.ans[j] && q.tiles[q._bt[k]] !== q.ans[k]) {
        return { act: 'undo', j: k };
      }
    }
    return null;                                   // 理论不可达（池 ⊇ 答案句）
  }
  return null;                                     // 填满即判，不可达
}

/* ---------- 结构校验（verify 用）：题域+池约束（诗库语义由 verify 分源复算，此处只查结构）
   dch 由调用方传入（章属真值；缺省回退 dchOfQuiz 形态推断——r13 型别可直接判档，
   唯 F/R 五言在 ch3 生成关会误判 1，仅作兜底不作真值） ---------- */
function structOk(q, dch) {
  if (!q || q.kind !== 'poemfill') return false;
  if (!POEMS[q.pid] || q.title !== POEMS[q.pid].title || q.author !== POEMS[q.pid].author) return false;
  if (!Array.isArray(q.lines) || q.lines.length !== 4 ||
      q.lines.some((ln, k) => ln !== POEMS[q.pid].lines[k])) return false;
  const t = q.type;
  if (['F', 'R', 'O', 'FF'].indexOf(t) < 0) return false;
  if (t === 'F' && !(q.cueIdx >= 0 && q.cueIdx <= 2 && q.ansIdx === q.cueIdx + 1)) return false;
  if (t === 'R' && !(q.cueIdx >= 1 && q.cueIdx <= 3 && q.ansIdx === q.cueIdx - 1)) return false;
  if (t === 'O' && !(q.cueIdx === 0 && q.ans.length === 3)) return false;
  if (t === 'FF' && !(FF_CHARS.indexOf(q.targetChar) >= 0 && q.ans.length === 1 &&
      q.ans[0].indexOf(q.targetChar) >= 0)) return false;
  if (!Array.isArray(q.tiles) || q.tiles.some(s => typeof s !== 'string' || s.length < 3)) return false;
  if (q.tiles.length !== q.ans.length + distractN(dch == null ? dchOfQuiz(q) : dch, t)) return false;
  const need = {}, have = {};
  q.ans.forEach(s => { need[s] = (need[s] || 0) + 1; });
  q.tiles.forEach(s => { have[s] = (have[s] || 0) + 1; });
  return Object.keys(need).every(k => (have[k] || 0) >= need[k]);   // 池必可排出答案
}
function dchOfQuiz(q) {                              // 题→难度章（structOk 缺省回退）
  if (q.type === 'FF') return 4;
  if (q.type === 'O') return 3;
  return q.lines.every(ln => ln.length === 5) ? 1 : 2;
}
