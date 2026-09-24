/* ================= zilearn 纯引擎：确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 97)：同 flat 永远同关（重玩一致、verify 可检）。
   每关 5 题位谱（CH_LEN=5，判定 7 点/关）：
     qi0 watch   字理亮相（演示型 0 判定）：静态关 5 新字逐一亮相 / 生成关 2 新引入字
     qi1 listen  听音找字（multi 三步）：静态=本关 5 字洗牌取前 3；生成=加权池取 3
     qi2 word|sentence  词语境选字（单步）：flat<10 词挖空 / 10≤flat<20 本关句子挖 1 字 / 生成关词挖空
     qi3 match   组词搭配（单步）：目标字大卡 → 4 词选 1（正确首词+3 干扰词=其他字首词，禁含目标字）
     qi4 quiz    关末小测（multi 两步）：静态=本关 1 字+复习字 1 字（review 空→再取本关字）；
                 生成=加权池 2 字；每步 sub=listen|word 洗牌分流
   engPick 返回：'wrong' 干扰（miss+1，soft=true 教学/演示不计）/ 'half' multi 中间步解出
   （不推 step）/ 'right' 题位解出推 step / 'done' 末步通关 / false 非法（watch 期/越界/已完）。
   选项=目标+distract 前 3（不足按 padOrder 确定性补位至 3 干扰），洗牌后 answer=目标下标。
   生成关加权律：recent3（本关与前 2 关引入字）×3 权重 > 其余已引入字 ×1（确定性权重表，
   shuffled 后取 7 个互异目标）；生成关池=静态 100+genPool 已引入部分（flat≥45 池尽=纯复习）。 */
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

/* ---------- 关卡框架 ---------- */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;   /* 进度章号单调递增（生成关 ch≥5） */
const lvOfFlat = flat => flat % CH_LEN;

/* 首见序表（静态 100 按 LEVELS 引入序，genPool 50 按池序）——确定性补位/加权池的规范序 */
const STATIC_ORDER = [];
for (let f = 0; f < STATIC_LEVELS; f++) STATIC_ORDER.push.apply(STATIC_ORDER, LEVELS[f].newChars);
const INTRO = {};                                        /* 字 → 引入 flat（句子挖空取最新引入字的依据） */
STATIC_ORDER.forEach((c, i) => { INTRO[c] = Math.floor(i / CH_LEN); });
GEN_POOL.forEach((c, i) => { INTRO[c] = STATIC_LEVELS + Math.floor(i / 2); });

/* 本关引入字：静态=LEVELS.newChars；生成=GEN_POOL 滇进切片（flat≥45 池尽=空） */
function newCharsOf(flat) {
  if (flat < STATIC_LEVELS) return LEVELS[flat].newChars;
  const g = flat - STATIC_LEVELS, s = g * 2;
  return s >= GEN_POOL.length ? [] : GEN_POOL.slice(s, Math.min(s + 2, GEN_POOL.length));
}
/* 生成关已学池：静态 100 + genPool 已引入（含本关新字——qi0 亮相后即可入题） */
function learnedPool(flat) {
  const pool = STATIC_ORDER.slice();
  if (flat >= STATIC_LEVELS) {
    const g = flat - STATIC_LEVELS;
    pool.push.apply(pool, GEN_POOL.slice(0, Math.min(g * 2 + 2, GEN_POOL.length)));
  }
  return pool;
}
/* recent3 集合：本关与前 2 关引入字（生成关复习权重的强权档） */
function recentSet(flat) {
  const s = {};
  for (let f = Math.max(0, flat - 2); f <= flat; f++) newCharsOf(f).forEach(c => { s[c] = 1; });
  return s;
}

/* ---------- 选项构造（确定性补位：目标+distract+padOrder 补足 3 干扰，洗牌） ---------- */
function padOrder(target, flat) {
  const out = [], seen = {};
  seen[target] = 1;
  const push = c => { if (CHARS[c] && !seen[c]) { seen[c] = 1; out.push(c); } };
  newCharsOf(flat).forEach(push);                        /* ① 本关新字（排除目标） */
  if (flat < STATIC_LEVELS) {
    LEVELS[flat].review.forEach(push);                   /* ② 本关复习字 */
    LEVELS[flat].sentence.charsUsed.forEach(c => { if (WHITELIST.indexOf(c) < 0) push(c); });  /* ③ 句子实字 */
  }
  STATIC_ORDER.forEach(push);                            /* ④ 静态首见序 */
  GEN_POOL.forEach(push);                                /* ⑤ genPool 池序 */
  return out;
}
function charOpts(target, flat, rnd) {
  const seen = {}, dis = [];
  CHARS[target].distract.forEach(d => { const c = d[0]; if (!seen[c] && c !== target) { seen[c] = 1; dis.push(c); } });
  if (dis.length < 3) {
    const pads = padOrder(target, flat);
    for (let k = 0; k < pads.length && dis.length < 3; k++)
      if (!seen[pads[k]]) { seen[pads[k]] = 1; dis.push(pads[k]); }
  }
  const opts = shuffled([target].concat(dis.slice(0, 3)), rnd);
  return { opts: opts, ans: opts.indexOf(target) };
}
/* 组词搭配选项：正确=目标首词；干扰=其他字首词（禁含目标字；静态取本关其余新字，
   生成关取本关 7 目标其余+池序补位），互异取 3 */
function wordOpts(target, candChars, rnd) {
  const correct = CHARS[target].words[0][0];
  const seen = {}, dis = [];
  const cand = [];
  candChars.forEach(c => { if (c !== target && cand.indexOf(c) < 0) cand.push(c); });
  STATIC_ORDER.concat(GEN_POOL).forEach(c => { if (c !== target && cand.indexOf(c) < 0) cand.push(c); });
  for (const c of cand) {
    const w = CHARS[c].words[0][0];
    if (w === correct || w.indexOf(target) >= 0 || seen[w]) continue;
    seen[w] = 1; dis.push(w);
    if (dis.length === 3) break;
  }
  const opts = shuffled([correct].concat(dis), rnd);
  return { opts: opts, ans: opts.indexOf(correct) };
}
/* 词挖空显示：目标首词中目标字换 ＿（目标字必在其首词内——数据定稿保证） */
function blankWord(target) {
  const w = CHARS[target].words[0][0];
  return w.split(target).join('＿');
}
/* 句子挖空目标：charsUsed 中非白名单且在 CHARS 的字里取引入 flat 最新者（并列取后见位置）
   ——句子只用关前已学字（子集铁律），挖"最新学的字"复习价值最高 */
function sentenceBlank(lv) {
  let best = null;
  lv.sentence.charsUsed.forEach((c, i) => {
    if (WHITELIST.indexOf(c) >= 0 || !CHARS[c]) return;
    if (!best || INTRO[c] > best.f || (INTRO[c] === best.f && i > best.i)) best = { c: c, f: INTRO[c], i: i };
  });
  return best ? best.c : null;
}
function blankSentence(text, ch) {
  return text.split(ch).join('＿');
}

/* ---------- 加权抽取（生成关）：recent3 ×3 + 其余 ×1，洗牌后按序取互异 ---------- */
function weightedTargets(flat, rnd, n) {
  const recent = recentSet(flat), pool = learnedPool(flat);
  const tickets = [];
  pool.forEach(c => { const reps = recent[c] ? 3 : 1; for (let k = 0; k < reps; k++) tickets.push(c); });
  const drawn = shuffled(tickets, rnd);
  const out = [], got = {};
  for (const c of drawn) { if (!got[c]) { got[c] = 1; out.push(c); if (out.length === n) break; } }
  return out;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function makeListen(t, flat, rnd) {
  const o = charOpts(t, flat, rnd);
  return { sub: 'listen', t: t, opts: o.opts, ans: o.ans };
}
function makeWord(t, flat, rnd) {
  const o = charOpts(t, flat, rnd);
  return { sub: 'word', t: t, opts: o.opts, ans: o.ans, display: blankWord(t) };
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const rnd = mulberry32(flat * 7919 + 97);
  const ch = chOfFlat(flat), lv = lvOfFlat(flat);
  let watchChars, listenT, wT, mT, q4a, q4b, cand3;
  if (flat < STATIC_LEVELS) {
    const L = LEVELS[flat], order = shuffled(L.newChars, rnd);
    watchChars = L.newChars.slice();
    listenT = [order[0], order[1], order[2]];            /* qi1 三步=本关 5 字洗牌取前 3 */
    wT = order[3];                                       /* qi2 词挖空目标 */
    mT = order[4];                                       /* qi3 组词目标 */
    cand3 = L.newChars.slice();                          /* qi3 干扰词候选=本关其余新字首词 */
    q4a = L.newChars[Math.floor(rnd() * CH_LEN)];        /* 小测位 1：本关字（rnd 抽） */
    const rv = L.review;
    q4b = rv.length ? rv[flat % rv.length]               /* 小测位 2：reviewSchedule 确定性复习字 */
                    : order[(order.indexOf(q4a) + 1) % CH_LEN];   /* 空 review 兜底：错位取本关字 */
  } else {
    const targets = weightedTargets(flat, rnd, 7);
    listenT = [targets[0], targets[1], targets[2]];
    wT = targets[3];
    mT = targets[4];
    cand3 = targets.slice();
    q4a = targets[5]; q4b = targets[6];
    const nc = newCharsOf(flat);
    watchChars = nc.length ? nc : targets.slice(0, 2);   /* flat≥45 池尽：亮相复习 2 字（0 新字） */
  }
  const quizzes = [];
  quizzes.push({ kind: 'watch', chars: watchChars.slice(), ri: 0 });
  quizzes.push({ kind: 'listen', ri: 0,
    rounds: [makeListen(listenT[0], flat, rnd), makeListen(listenT[1], flat, rnd), makeListen(listenT[2], flat, rnd)] });
  if (flat >= 10 && flat < STATIC_LEVELS) {
    const bc = sentenceBlank(LEVELS[flat]);
    const o = charOpts(bc, flat, rnd);
    quizzes.push({ kind: 'sentence', ri: 0, t: bc, opts: o.opts, ans: o.ans,
                   display: blankSentence(LEVELS[flat].sentence.text, bc) });
  } else {
    const o = charOpts(wT, flat, rnd);
    quizzes.push({ kind: 'word', ri: 0, t: wT, opts: o.opts, ans: o.ans, display: blankWord(wT) });
  }
  const wo = wordOpts(mT, cand3, rnd);
  quizzes.push({ kind: 'match', ri: 0, t: mT, opts: wo.opts, ans: wo.ans });
  quizzes.push({ kind: 'quiz', ri: 0, rounds: [
    rnd() < 0.5 ? makeListen(q4a, flat, rnd) : makeWord(q4a, flat, rnd),
    rnd() < 0.5 ? makeListen(q4b, flat, rnd) : makeWord(q4b, flat, rnd)
  ] });
  return { flat: flat, ch: ch, lv: lv, quizzes: quizzes, step: 0, ri: 0, misses: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）
   当前步：q = quizzes[step]；watch 期不可判（false）；
   multi（listen/quiz）按 q.rounds[q.ri] 当前步判：对→非末步 'half'（ri+1）/末步 'right'（step+1）；
   单步题（word/sentence/match）对→'right'；末步对→'done'；错→'wrong'（miss+1，soft 免计） ---------- */
function engRound(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.kind === 'watch') return null;
  return q.rounds ? q.rounds[q.ri] : q;
}
/* watch 题位推进（0 判定演示位）：亮相演出结束由 UI 调用（verify/autoSolve 直驱同口） */
function engSkipWatch(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  if (L.quizzes[L.step].kind !== 'watch') return false;
  L.quizzes[L.step].solved = true;
  L.step++;
  return true;
}
function engPick(L, i, soft) {
  const r = engRound(L);
  if (!r || i < 0 || i >= r.opts.length) return false;
  if (i === r.ans) {
    const q = L.quizzes[L.step];
    if (q.rounds && q.ri < q.rounds.length - 1) { q.ri++; return 'half'; }
    q.solved = true;
    L.ri = 0;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  if (!soft) { q_miss(L); }
  return 'wrong';
}
function q_miss(L) { L.misses++; L.quizzes[L.step]._miss = (L.quizzes[L.step]._miss || 0) + 1; }
const engWon = L => !!L && L.done;
/* 星级：关 miss 0=3 星 / 1-2=2 星 / ≥3=1 星（家族口径，永不 0 星） */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);
/* autoSolve 依据：当前步正确下标 */
const engAnswer = L => { const r = engRound(L); return r ? r.ans : -1; };
