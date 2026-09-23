/* ================= evidence 纯引擎：确定性关卡生成 + 结论/证据候选构建 + 点选/勾选判定（无 DOM）
   r17 难度改造（SPEC-BATCH32 §-r17-evidence 现行真值源）：
   种子 = mulberry32(flat * 7919 + 1031)（本批常量 evi=1031）——同 flat 永远同关。
   章型（每关 8 题=每章 8 关，CH_LEN=8/STATIC_LEVELS=32；生成关 flat≥32 每关 dch=seeded ri(1,4)）：
     dch1 findexact 二分（干扰=该结论 none 全 3，weak 不在场——只考「能证明/无关」）
     dch2 findexact 三档（干扰 3=seeded 取自 dstr 5 且 weak≥1+none≥1——区分「有关但不能证明」）
     dch3 findall 三真值多选（真值 3 全在场+干扰 1；pick/unpick 勾选零惩罚，判定步在 submit）
     dch4 三族 seeded 混出且各 ≥1（在场保证：缺族换入重复槽）
   每关 8 题结论互异（20 池洗牌取 8——同关去重）；flat0 题0 锚 rainwet findexact puddle（教学锚）。
   数学先验铁律（§-r17 §2）：
     findexact 候选=恰 1 真证据+3 干扰（同结论其他真证据不得入候选——防双真值）；
     findall 候选=真值 3 全在场+干扰 1（answers=3 真值下标升序）；
     reverse 候选=真值 3+非真 1（answer=非真卡下标「哪张不能证明」）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 每关题型序表（genLevel 预生成，rnd 同流保确定性）
   域：dch1/2 {findexact} / dch3 {findall} / dch4 {findexact,findall,reverse}；
   在场保证：dch4 三族 ≥1（8 槽 ≥ 域大，必有重复槽可换）。 ---------- */
const KIND_POOL = {
  1: ['findexact'],
  2: ['findexact'],
  3: ['findall'],
  4: ['findexact', 'findall', 'reverse']
};
function kindSeqOf(dch, rnd) {
  const pool = KIND_POOL[dch] || KIND_POOL[4];
  let seq = [];
  for (let i = 0; i < CH_LEN; i++) seq.push(pool[Math.floor(rnd() * pool.length)]);
  for (const k of pool) {                          // 在场保证：缺族换入重复槽
    if (seq.indexOf(k) >= 0) continue;
    let slot = -1;
    for (let i = 0; i < CH_LEN; i++) {
      const v = seq[i];
      if (seq.indexOf(v) !== i) { slot = i; break; }   // 重复出现的槽（首次出现保留）
    }
    if (slot >= 0) seq[slot] = k;
  }
  return seq;
}
/* ---------- 每关结论序表：20 结论池洗牌取 8（互异——同关去重）；flat0 题0 锚 rainwet ---------- */
function conclSeqOf(rnd, flat) {
  const seq = shuffled(CONCLS20, rnd).slice(0, CH_LEN);
  if (flat === 0) {
    const i = seq.indexOf('rainwet');
    if (i > 0) { const t = seq[0]; seq[0] = 'rainwet'; seq[i] = t; }
    else if (i < 0) seq[0] = 'rainwet';            // 洗牌未含锚结论：直接落位（互异不破）
  }
  return seq;
}

/* ---------- 干扰采样（r17 三档；dstr 池恒 weak2+none3）
   dch1 findexact：干扰=none 全 3（二分章 weak 不在场）；
   dch2 findexact：seeded 取 3 且 weak≥1+none≥1（三档判别核心章）；
   findall/reverse：seeded 取 1（weak/none 皆可）。 ---------- */
function dstrOf(bank, rnd, dch, kind) {
  if (kind === 'findexact' && dch === 1) return bank.dstr.filter(d => d.type === 'none');
  if (kind === 'findexact') {                      // dch2：3 干扰三档混合
    let picks = shuffled(bank.dstr, rnd).slice(0, 3);
    if (!picks.some(d => d.type === 'weak')) {     // 全 none（none3 存在可能）：换入池内 weak
      const w = bank.dstr.find(d => d.type === 'weak');
      if (w) picks = [w].concat(picks.filter(p => p.img !== w.img).slice(0, 2));
    }
    return picks;                                  // none≥1 恒成立（weak 仅 2，取 3 必含 none）
  }
  return [bank.dstr[Math.floor(rnd() * bank.dstr.length)]];   // 1 干扰 seeded
}

/* ---------- 单题构建（kind 特定部分 rnd 定序消费）
   findexact：真=真池 seeded 选 1（flat0q0 锚 puddle）+干扰=dstrOf；
   findall：真=真池全 3+干扰 1；answers=3 真值下标升序；picked=[]（勾选态）；
   reverse：真=真池全 3+非真 1；answer=非真卡下标。 ---------- */
function buildQuiz(kind, cid, rnd, flat, qi, dch) {
  const bank = EV_BANK[cid];
  const q = { kind: kind, concl: cid, opts: [], answer: -1, answers: null, picked: [],
              text: '', _miss: 0, _answered: false };
  let entries;
  if (kind === 'findexact') {
    const t = flat === 0 && qi === 0
      ? bank.true[0]                               // 教学锚：rainwet 真池[0]=puddle（§-r17 §3）
      : bank.true[Math.floor(rnd() * bank.true.length)];
    entries = [t].concat(dstrOf(bank, rnd, dch, kind));
  } else {                                         // findall/reverse：真 3 全在场+干扰 1
    entries = bank.true.concat(dstrOf(bank, rnd, dch, kind));
  }
  q.opts = shuffled(entries, rnd).map(e => ({ img: e.img, label: e.label }));
  const tImgs = bank.true.map(e => e.img);
  if (kind === 'findexact') {
    const tImg = entries[0].img;                   // 唯一真证据（教学锚/seeded 选出）
    for (let j = 0; j < q.opts.length; j++) if (q.opts[j].img === tImg) { q.answer = j; break; }
  } else if (kind === 'findall') {
    q.answers = [];
    for (let j = 0; j < q.opts.length; j++) if (tImgs.indexOf(q.opts[j].img) >= 0) q.answers.push(j);
    q.answers.sort((a, b) => a - b);               // 三真值下标升序
  } else {                                         // reverse：answer=非真卡下标
    for (let j = 0; j < q.opts.length; j++) if (tImgs.indexOf(q.opts[j].img) < 0) q.answer = j;
  }
  q.text = kind === 'findexact' ? Q1_TEXT : (kind === 'findall' ? Q2_TEXT : Q3_TEXT);
  return q;
}

/* ---------- 关卡生成（静态 32 关与生成关同一确定性通道；生成关 flat≥32 每关随机章参数）
   flat0 题0 恒 findexact+rainwet+puddle（教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 1031);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const kinds = kindSeqOf(dch, rnd);
  const concls = conclSeqOf(rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(kinds[qi], concls[qi], rnd, flat, qi, dch));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   'right'  findexact/reverse 答对且本题完成推进
   'done'   末题答对=通关
   'pick'/'unpick' findall 勾选/取消（零惩罚，勾选不是判定步——判定步在 engSubmit）
   'wrong'  点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null     非法下标 / 关卡已结束 / 已判定题（吞 pop 通道） ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (q.kind === 'findall') {                      // 勾选切换：中性动作不计 miss
    const k = q.picked.indexOf(i);
    if (k >= 0) { q.picked.splice(k, 1); return 'unpick'; }
    q.picked.push(i);
    return 'pick';
  }
  if (i === q.answer) {                            // findexact 真值 / reverse 非真卡
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++; L.retries++;
  return 'wrong';
}
/* ---------- 提交判定引擎（无 DOM）：engSubmit(L) —— findall 判定步（契约 F17）
   'right' picked 集==answers 集→本题完成推进 / 'done' 末题=通关
   'wrong' 漏/多选：miss+1 且已选对位保留（picked=picked∩answers，错选位清除），可续选补齐
   false   非 findall / 已判定被拦 / 空选（空选不判不计 miss）
   null    非法（关未在局/越界） ---------- */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind !== 'findall') return false;
  if (!Array.isArray(q.picked) || q.picked.length === 0) return false;
  const pk = q.picked.slice().sort((a, b) => a - b);
  const ok = pk.length === q.answers.length && pk.every((v, j) => v === q.answers[j]);
  if (ok) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++; L.retries++;
  q.picked = q.picked.filter(i => q.answers.indexOf(i) >= 0);   // 对位保留，错选清除
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题该亮（breathe）的正确卡下标
   findexact/reverse=answer 单卡 / findall=answers 中下一个未勾真值卡逐张步进（§-r17 §5） */
function correctIdx(q) {
  if (!q) return -1;
  if (q.kind === 'findall') {
    for (const a of q.answers) if (q.picked.indexOf(a) < 0) return a;
    return -1;                                     // 三真值已集齐（过渡瞬间）
  }
  return q.answer;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null）：结论/候选先验 /
   防双真值 / 档位律（dch1 无 weak/dch2 weak≥1+none≥1）/ answer 自洽 / flat0q0 锚点 /
   初始态干净 ---------- */
function structWhy(q, dch, flat, qi) {
  if (!q) return 'quiz';
  if (q.kind !== 'findexact' && q.kind !== 'findall' && q.kind !== 'reverse') return 'kind';
  if (CONCLS20.indexOf(q.concl) < 0) return 'conclPool';       // 结论 ⊆ 封闭 20
  const bank = EV_BANK[q.concl];
  if (dch <= 2 && q.kind !== 'findexact') return 'dchKind';    // ch1/2 只 findexact
  if (dch === 3 && q.kind !== 'findall') return 'dchKind';     // ch3 只 findall
  if (q.text !== (q.kind === 'findexact' ? Q1_TEXT : (q.kind === 'findall' ? Q2_TEXT : Q3_TEXT))) return 'text';
  const nT = q.kind === 'findexact' ? 1 : 3;                   // 恰 1 真 / 三真值全在场
  if (q.opts.length !== 4) return 'optLen';                    // 恒 4 候选
  const imgs = q.opts.map(o => o.img);
  if (new Set(imgs).size !== 4) return 'optDup';               // 候选互异
  const poolImg = bank.true.map(e => e.img).concat(bank.dstr.map(e => e.img));
  for (const v of imgs) if (poolImg.indexOf(v) < 0) return 'optPool';   // ⊆ 该结论证据池
  const tImgs = bank.true.map(e => e.img);
  const tCnt = imgs.filter(v => tImgs.indexOf(v) >= 0).length;
  if (tCnt !== nT) return 'truthN';                            // findexact 恰 1 真（防双真值）
  const dImgs = imgs.filter(v => tImgs.indexOf(v) < 0);        // 干扰位（findexact3/findall·reverse1）
  if (dImgs.length !== 4 - nT) return 'dstrN';
  const typeOf = v => { const d = bank.dstr.find(x => x.img === v); return d ? d.type : '?'; };
  if (q.kind === 'findexact') {
    const w = dImgs.filter(v => typeOf(v) === 'weak').length;
    const n = dImgs.filter(v => typeOf(v) === 'none').length;
    if (dch === 1 && (w !== 0 || n !== 3)) return 'tier1';     // 二分章：干扰全 none
    if (dch >= 2 && !(w >= 1 && n >= 1)) return 'tier2';       // 三档章：weak≥1+none≥1
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= 4) return 'ansRange';
    if (tImgs.indexOf(q.opts[q.answer].img) < 0) return 'ansIdx';
    if (q.answers !== null) return 'extra';
    if (Array.isArray(q.picked) && q.picked.length !== 0) return 'extraP';
  } else if (q.kind === 'findall') {
    if (!Array.isArray(q.answers) || q.answers.length !== 3) return 'ansLen';
    if (new Set(q.answers).size !== 3) return 'ansDup';
    for (const a of q.answers) {
      if (!Number.isInteger(a) || a < 0 || a >= 4) return 'ansRange';
      if (tImgs.indexOf(q.opts[a].img) < 0) return 'ansIdx';
    }
    if (q.answers[0] >= q.answers[1] || q.answers[1] >= q.answers[2]) return 'ansOrder';   // 升序
    if (q.answer !== -1) return 'extra';
    if (!Array.isArray(q.picked) || q.picked.length !== 0) return 'picked0';
  } else {                                                     // reverse
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= 4) return 'ansRange';
    if (tImgs.indexOf(q.opts[q.answer].img) >= 0) return 'ansIdx';   // answer=非真卡
    if (q.answers !== null) return 'extra';
    if (!Array.isArray(q.picked) || q.picked.length !== 0) return 'picked0';
  }
  if (flat === 0 && qi === 0) {                                // 教学演示锚：rainwet findexact puddle
    if (q.concl !== 'rainwet' || q.kind !== 'findexact' ||
        q.opts[q.answer].img !== 'puddle') return 'anchor';
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
