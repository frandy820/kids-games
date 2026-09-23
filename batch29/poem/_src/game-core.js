/* ================= poem 纯引擎：确定性关卡生成 + 四题型判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 71)：同 flat 永远同关（重玩一致、verify 可检）。
   关-诗映射（r42 §R2）：pid = POEM_IDS[flat % 12]（前 5 旧诗序不变=flat0-4 锚面）、
   dch = 1 + flat//5（静态 20 关）；生成关 flat≥20 每关随机章参数 dch=ri(1,4)
   （先取数保确定性——b25 坑④ verify 钩子直读）。
   章型（r42 §R2）：
     dch1 next 2 候选（真值+1 干扰——入门二选一【原款锚面】）
     dch2 fill ≥2 + next(4 候选) ≥1 混出（缺字填空引入坡）
     dch3 order ≥2 + hear ≥2 混出（乱序接龙引入坡；order 恒非原序）
     dch4 四族各 ≥1（['next','fill','order','hear', 掷] 洗牌）
   数学先验：next/hear 行候选互异且 ⊆本诗行池、4 候选=池全集；next answer 行恒
   =prevLine+1 ≠ prevLine；hear answer 行=音频行；fill 候选=FILLS 真值+3 干扰
   （互异非句内字）、answer=真值卡；order opts=4 句洗牌**恒非原序**（洗牌碰巧
   [0,1,2,3] → 首两位对调兜底，0 rnd 消耗——r39-bis noSort 同构）。
   铁律：dch2/dch3/dch4 混出保底（见 specSeqOf）；相邻题（kind+行号）互异
   （order 题无行参数——互异律豁免：同关两 order 乱序谱不同即体验互异）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号：静态=1+flat//5、生成关随机 1-4 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;

/* ---------- 每关题序表 {kind, prevLine|audioLine|fillLine}（genLevel 预生成；rnd 同流保确定性）
   next 题 prevLine ∈ [0,2]（answer=prevLine+1 ∈ [1,3]——末行无下一句）；
   hear 题 audioLine ∈ [0,3]；fill 题 fillLine ∈ [0,3]（挖空位/干扰=FILLS 封闭表 r42）；
   order 题无行参数（整诗 4 句全排）；flat0 题0 锚定 next/prevLine0（教学演示锚点：
   咏鹅「鹅，鹅，鹅」→「曲项向天歌」【原款锚面逐字节保留】） */
function specSeqOf(dch, rnd, flat) {
  const keyOfSpec = s => s.kind + ':' + (s.kind === 'next' ? s.prevLine :
    s.kind === 'hear' ? s.audioLine : s.kind === 'fill' ? s.fillLine : 'o');
  const mk = () => {
    if (dch === 1) return { kind: 'next', prevLine: ri(rnd, 0, 2) };
    if (dch === 2) return rnd() < 0.5 ? { kind: 'fill', fillLine: ri(rnd, 0, 3) }
                                     : { kind: 'next', prevLine: ri(rnd, 0, 2) };
    if (dch === 3) return rnd() < 0.55 ? { kind: 'order' }
                                       : { kind: 'hear', audioLine: ri(rnd, 0, 3) };
    const roll = ri(rnd, 0, 3);                       // dch4 第 5 题从四族掷
    if (roll === 0) return { kind: 'next', prevLine: ri(rnd, 0, 2) };
    if (roll === 1) return { kind: 'fill', fillLine: ri(rnd, 0, 3) };
    if (roll === 2) return { kind: 'order' };
    return { kind: 'hear', audioLine: ri(rnd, 0, 3) };
  };
  let specs = [];
  if (dch === 4) {                                    // 四族各 ≥1：['next','fill','order','hear',掷] 洗牌
    const roll = ri(rnd, 0, 3);
    const fifth = roll === 0 ? 'next' : roll === 1 ? 'fill' : roll === 2 ? 'order' : 'hear';
    specs = shuffled(['next', 'fill', 'order', 'hear', fifth], rnd).map(k =>
      k === 'next' ? { kind: 'next', prevLine: ri(rnd, 0, 2) } :
      k === 'fill' ? { kind: 'fill', fillLine: ri(rnd, 0, 3) } :
      k === 'order' ? { kind: 'order' } :
                      { kind: 'hear', audioLine: ri(rnd, 0, 3) });
  } else {
    specs = [];
    for (let qi = 0; qi < CH_LEN; qi++) specs.push(mk());
    /* 混出保底（r42 §R2）：dch2 fill ≥2+next ≥1 / dch3 order ≥2+hear ≥2 */
    if (dch === 2) {
      const nFill = specs.filter(s => s.kind === 'fill').length;
      if (nFill < 2) { specs[0] = { kind: 'fill', fillLine: ri(rnd, 0, 3) }; specs[1] = { kind: 'fill', fillLine: ri(rnd, 0, 3) }; }
      else if (nFill === CH_LEN) specs[1] = { kind: 'next', prevLine: ri(rnd, 0, 2) };
    }
    if (dch === 3) {
      const nOrder = specs.filter(s => s.kind === 'order').length;
      if (nOrder < 2) { specs[0] = { kind: 'order' }; specs[1] = { kind: 'order' }; }
      else if (nOrder > 3) { specs[1] = { kind: 'hear', audioLine: ri(rnd, 0, 3) };
                             specs[2] = { kind: 'hear', audioLine: ri(rnd, 0, 3) }; }
    }
  }
  /* flat0 题0 锚点：next/prevLine=0（教学「听一句，找下一句」演示题【原款锚面】） */
  if (flat === 0) specs[0] = { kind: 'next', prevLine: 0 };
  /* 相邻题互异（order 显式豁免：同关两 order 乱序谱不同即体验互异——§R2）。
     族内重掷（r42 修复轮 M1 2026-09-22）：保 kind 只重掷行参数——保底计数恒不动；
     原 s=mk() 跨族重掷（dch3 mk 含 order 55%/dch2 fill↔next 互变）会击穿混出保底
     （审查 REPORT-REVIEW-r42 M1），且旧注释「非 order 题重掷不会掷出 order」与 mk 实现矛盾 */
  const reroll = t => t.kind === 'hear' ? { kind: 'hear', audioLine: ri(rnd, 0, 3) }
                   : t.kind === 'fill' ? { kind: 'fill', fillLine: ri(rnd, 0, 3) }
                   : { kind: 'next', prevLine: ri(rnd, 0, 2) };
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && keyOfSpec(prev);
    if (s.kind !== 'order')
      for (let g = 0; g < 8 && keyOfSpec(s) === pk; g++) { s = reroll(s); specs[qi] = s; }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建
   next：nOpt=2（dch1）候选=真值行+1 干扰行洗牌；nOpt=4（dch2+）=池全集恒全摆
   hear：4 候选=池全集
   fill：候选=FILLS[pid][line] 真值字+3 干扰洗牌（answer=真值卡下标）
   order：opts=4 句洗牌恒非原序（非完全升序兜底=首两位对调，0 rnd） */
function buildQuiz(spec, pid, dch, rnd) {
  const lines = POEMS[pid].lines;
  if (spec.kind === 'fill') {
    const f = FILLS[pid][spec.fillLine];
    const opts = shuffled([f.ch].concat(f.dis), rnd).map(ch => ({ ch: ch }));
    let answer = -1;
    for (let j = 0; j < opts.length; j++) if (opts[j].ch === f.ch) answer = j;
    return { kind: 'fill', poem: pid, line: spec.fillLine, hole: f.h,
             opts: opts, answer: answer, _miss: 0, _answered: false };
  }
  if (spec.kind === 'order') {
    let idxOrder = shuffled([0, 1, 2, 3], rnd);
    if (idxOrder[0] === 0 && idxOrder[1] === 1 && idxOrder[2] === 2 && idxOrder[3] === 3) {
      const t = idxOrder[0]; idxOrder[0] = idxOrder[1]; idxOrder[1] = t;   // 恒非原序兜底（r39-bis noSort 同构）
    }
    const opts = idxOrder.map(i => ({ line: lines[i], idx: i }));
    return { kind: 'order', poem: pid,
             opts: opts, _prog: 0,                              // 已排句数（0-4，动态判定轴）
             _miss: 0, _answered: false };
  }
  const ansIdx = spec.kind === 'next' ? spec.prevLine + 1 : spec.audioLine;
  const nOpt = dch === 1 ? 2 : 4;
  let idxOrder;
  if (nOpt === 4) idxOrder = shuffled([0, 1, 2, 3], rnd);
  else idxOrder = shuffled([ansIdx].concat(shuffled([0, 1, 2, 3].filter(i => i !== ansIdx), rnd).slice(0, 1)), rnd);
  const opts = idxOrder.map(i => ({ line: lines[i], idx: i }));
  let answer = -1;
  for (let j = 0; j < opts.length; j++) if (opts[j].idx === ansIdx) answer = j;
  return { kind: spec.kind, poem: pid,
           prevLine: spec.kind === 'next' ? spec.prevLine : null,
           audioLine: spec.kind === 'hear' ? spec.audioLine : null,
           opts: opts, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 next/prevLine0（§2 教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const pid = POEM_IDS[flat % POEM_IDS.length];          // 关-诗映射：flat%12=诗 idx（r42）
  const rnd = mulberry32(flat * 7919 + 71);
  const dch = flat < STATIC_LEVELS ? 1 + Math.floor(flat / 5) : ri(rnd, 1, 4);   // 生成关先取数保确定性
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], pid, dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, pid: pid,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张卡（opts 数组下标）
   next/hear/fill（单步原子判定）：'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   order（逐句即判，r25 M2 单步）：点对当前步句卡='step'（_prog+1；第 4 步=本题完成
   推进 right/done）/ 点错='wrong'（miss+1，**进度保留**——_prog 不动，错窗后从当前步续点）
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (q.kind === 'order') {
    if (q.opts[i].idx === q._prog) {                    // 点对当前步句（语序第 _prog+1 句）
      q._prog++;
      if (q._prog >= 4) {
        q._answered = true;
        L.step++;
        if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
        return 'right';
      }
      return 'step';
    }
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.71 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（order=当前步句卡动态下标——notebird
   melody 动态 answer 同构；单步题=q.answer，独立函数供 verify 复核） */
const correctIdx = q => {
  if (!q) return -1;
  if (q.kind === 'order') {
    for (let j = 0; j < q.opts.length; j++) if (q.opts[j].idx === q._prog) return j;
    return -1;
  }
  return q.answer;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 / 候选与答案
   自洽 / 互异与全摆 / 相邻题互异 / flat0q0 锚点 / 初始态干净 / order 非原序 / FILLS 互证 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (['next', 'hear', 'fill', 'order'].indexOf(q.kind) < 0) return 'kind';
  if (POEM_IDS.indexOf(q.poem) < 0) return 'poem';
  if (q.poem !== POEM_IDS[flat % POEM_IDS.length]) return 'poemMap';    // 关-诗映射
  if (dch === 1 && q.kind !== 'next') return 'dch1kind';               // ch1 恒 next
  if (dch === 2 && q.kind !== 'fill' && q.kind !== 'next') return 'dch2kind';
  if (dch === 3 && q.kind !== 'order' && q.kind !== 'hear') return 'dch3kind';
  const isAnchor = flat === 0 && qi === 0;                             // 教学演示题锚点
  if (isAnchor && (q.kind !== 'next' || q.prevLine !== 0)) return 'anchor';
  if (q.kind === 'fill') {
    if (q.line < 0 || q.line > 3) return 'fillLine';
    const f = FILLS[q.poem][q.line];
    if (q.hole !== f.h) return 'fillHole';                             // 挖空位=FILLS 封闭表
    if (hanAt(POEMS[q.poem].lines[q.line], q.hole) !== f.ch) return 'fillTruth';   // 真值互证（零手抄）
    if (q.opts.length !== 4) return 'len';
    const chs = q.opts.map(o => o.ch);
    for (let j = 0; j < chs.length; j++) if (chs.indexOf(chs[j]) !== j) return 'dup';   // 互异
    if (chs.indexOf(f.ch) < 0) return 'fillMiss';                      // 真值在场
    for (let j = 0; j < f.dis.length; j++) {
      if (chs.indexOf(f.dis[j]) < 0) return 'fillDis';                 // 3 干扰在场
      if (POEMS[q.poem].lines[q.line].indexOf(f.dis[j]) >= 0) return 'fillDisIn';   // 干扰非句内字
    }
    if (q.answer < 0 || q.answer >= 4 || q.opts[q.answer].ch !== f.ch) return 'ansIdx';
    if (q._miss !== 0 || q._answered) return 'init';
    return null;
  }
  if (q.kind === 'order') {
    if (q.opts.length !== 4) return 'len';
    const idxs = q.opts.map(o => o.idx);
    for (let j = 0; j < idxs.length; j++) {
      if (idxs[j] < 0 || idxs[j] > 3) return 'idxRange';
      if (idxs.indexOf(idxs[j]) !== j) return 'dup';
      if (q.opts[j].line !== POEMS[q.poem].lines[idxs[j]]) return 'lineText';
    }
    if (idxs.slice().sort().join() !== '0,1,2,3') return 'fullSet';    // 4 句=全集
    if (idxs[0] === 0 && idxs[1] === 1 && idxs[2] === 2 && idxs[3] === 3) return 'orderSorted';   // 恒非原序
    if (q._prog !== 0 || q._miss !== 0 || q._answered) return 'init';
    return null;                                                       // order 相邻互异豁免（§R2）
  }
  /* next / hear（原款路径） */
  const nOpt = dch === 1 ? 2 : 4;
  if (q.opts.length !== nOpt) return 'len';
  const idxs = q.opts.map(o => o.idx);
  for (let j = 0; j < idxs.length; j++) {
    if (idxs[j] < 0 || idxs[j] > 3) return 'idxRange';                 // ⊆行池（行号域）
    if (idxs.indexOf(idxs[j]) !== j) return 'dup';                     // 互异
    if (q.opts[j].line !== POEMS[q.poem].lines[idxs[j]]) return 'lineText';   // 行文本↔行号
  }
  if (nOpt === 4 && idxs.slice().sort().join() !== '0,1,2,3') return 'fullSet';   // 4 候选=池全集
  let want;
  if (q.kind === 'next') {
    if (q.prevLine < 0 || q.prevLine > 2) return 'prevRange';          // 上行有下一句
    if (q.audioLine !== null) return 'hearField';
    want = q.prevLine + 1;                                             // 答案行=下一句（≠上行）
  } else {
    if (q.audioLine < 0 || q.audioLine > 3) return 'audioRange';
    if (q.prevLine !== null) return 'nextField';
    want = q.audioLine;                                                // 答案行=音频行
  }
  if (q.answer < 0 || q.answer >= nOpt || q.opts[q.answer].idx !== want) return 'ansIdx';
  if (nOpt === 2 && idxs.filter(i => i !== want).length !== 1) return 'twoOpt';   // ch1=真值+1 干扰
  if (prevQ && prevQ.kind === q.kind &&
      (q.kind === 'next' ? prevQ.prevLine === q.prevLine : prevQ.audioLine === q.audioLine)) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
