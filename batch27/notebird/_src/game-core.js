/* ================= notebird 纯引擎：确定性关卡生成 + 点选判定（无 DOM/无音频，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R39 §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 认识小鸟：find 题**有序站位**+递增站台 + 教学特例错反馈（点错=free 唱歌不罚
           ——契约 E 教学特例；flat0 题0 恒 do——教学演示锚点）
     dch2 听音找鸟：find 题**乱序站位**（非完全升序——破位置查表，SPEC-R39 §R1 维度一）
     dch3 谁高谁低：higher 题**乱序**（音程 ≤2 度相邻对优先；近邻干扰必含——三律保留）
     dch4 混合：[find, higher, melody, iv, 掷币 h/find] 位洗牌（每关恒 melody==1+iv==1
           +find≥1+higher≥1——SPEC-R39 §R2 构成律）
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ 钩子直读）。
   铁律：场上 4 鸟互异且含答案（§0.17；iv 题为 3 类目卡例外）；ch1 notes 升序（教学映射）、
   ch2+ 非完全升序（noSort 兜底，0 rnd）；相邻题答案音互异（iv 题前后豁免——类目非音系）。 */
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
/* 乱序兜底（SPEC-R39 §R3）：完全升序时对调前两位（0 rnd 消耗，确定性）——ch2+ 站位
   洗牌后碰巧全升序概率 1/24，强制破坏=位置映射恒不可用 */
const noSort = arr => {
  let asc = true;
  for (let j = 1; j < arr.length; j++) if (idxOfNote(arr[j]) <= idxOfNote(arr[j - 1])) { asc = false; break; }
  if (!asc || arr.length < 2) return arr;
  const a = arr.slice(); const t = a[0]; a[0] = a[1]; a[1] = t;
  return a;
};

/* ---------- 每关题序表 {kind, note | lo+hi | mel4+sang | cls+lo+hi}（genLevel 预生成；rnd 同流）
   find 目标=answer 音（dch1/2 全 8 池随机）；higher 对=先掷音程 d（70% 相邻 |d|=1，
   否则 |d|=2）再掷起点 lo∈[0,7-d]；melody=shuffled(ORDER) 前 4 为场上鸟、前 3 再洗为
   唱序（sang[0] 与上题答案互异重洗 ≤4）；iv=三分类均衡 cls=ri(0,2)（cls2 时 d=ri(3,7)）
   +lo=ri(0,7-d)；相邻题答案音互异（≤8 掷兜底重掷）；flat0 题0 恒 find do（教学锚点） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickNote = (prev) => {
    let s = ORDER[Math.floor(rnd() * ORDER.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = ORDER[Math.floor(rnd() * ORDER.length)];
    return s;
  };
  const pickPair = (prev) => {                     // higher 对：音程 ≤2 度，相邻优先
    let lo, hi;
    for (let g = 0; g < 8; g++) {
      const d = rnd() < 0.7 ? 1 : 2;               // 70% 相邻对（mi-fa / si-dop 在内）
      lo = ri(rnd, 0, ORDER.length - 1 - d);
      hi = lo + d;
      if (ORDER[hi] !== prev) break;               // 答案（高音）与上题互异
    }
    return { lo: lo, hi: hi };
  };
  const pickMelody = (prev) => {                   // melody：场上 4 鸟+唱序 3 音（SPEC-R39 §R3）
    const mel4 = shuffled(ORDER, rnd).slice(0, 4); // 3 rnd
    let sang = shuffled(mel4.slice(0, 3), rnd);    // 2 rnd
    for (let g = 0; g < 4 && sang[0] === prev; g++) sang = shuffled(mel4.slice(0, 3), rnd);
    return { mel4: mel4, sang: sang };
  };
  const pickIv = () => {                           // interval：三分类均衡（SPEC-R39 §R3）
    const cls = ri(rnd, 0, 2);                     // 1 rnd
    const d = cls === 0 ? 1 : cls === 1 ? 2 : ri(rnd, 3, 7);
    const lo = ri(rnd, 0, ORDER.length - 1 - d);   // 1 rnd
    return { cls: cls, lo: lo, hi: lo + d };
  };
  const isFindCh = dch === 1 || dch === 2;
  let prev = null;
  if (isFindCh) {
    for (let qi = 0; qi < CH_LEN; qi++) {
      let note;
      if (flat === 0 && qi === 0) note = 'do';     // 教学演示锚点（flat0 题0 恒 do）
      else note = pickNote(prev);
      seq.push({ kind: 'find', note: note });
      prev = note;
    }
    return seq;
  }
  if (dch === 3) {
    for (let qi = 0; qi < CH_LEN; qi++) {
      const p = pickPair(prev);
      seq.push({ kind: 'higher', lo: p.lo, hi: p.hi });
      prev = ORDER[p.hi];
    }
    return seq;
  }
  /* dch4 混合（SPEC-R39 §R2 构成律）：掷币 h/find + [find,higher,melody,iv,币] 位洗牌 */
  const coin = rnd() < 0.5 ? 'higher' : 'find';    // 1 rnd
  const kseq = shuffled(['find', 'higher', 'melody', 'iv', coin], rnd);   // 4 rnd
  for (let qi = 0; qi < CH_LEN; qi++) {
    const k = kseq[qi];
    if (k === 'find') { const note = pickNote(prev); seq.push({ kind: 'find', note: note }); prev = note; }
    else if (k === 'higher') { const p = pickPair(prev); seq.push({ kind: 'higher', lo: p.lo, hi: p.hi }); prev = ORDER[p.hi]; }
    else if (k === 'melody') { const m = pickMelody(prev); seq.push({ kind: 'melody', mel4: m.mel4, sang: m.sang }); prev = m.sang[0]; }
    else { const v = pickIv(); seq.push({ kind: 'iv', cls: v.cls, lo: v.lo, hi: v.hi }); prev = null; }  // iv 类目非音系：prev 断链
  }
  return seq;
}

/* ---------- 单题构建：场上 4 卡（notes）+ 答案 + 题面已唱序列 sang
   find：答案音 + 随机 3 干扰（8 选 4 含答案）；ch1 升序 / ch2+ shuffled+noSort 乱序
   higher：题面两音（lo,hi）+ 1 近邻干扰（必含）+ 1 随机干扰；shuffled+noSort 乱序；
           唱序随机 [lo,hi]|[hi,lo]
   melody：spec.mel4=场上 4 鸟（含唱序 3 音+1 干扰）；noSort 乱序；
           sang=3 音唱序；answer/ansNote 动态=当前进度位（engTapBird 维护）
   iv：notes=[iv_near,iv_mid,iv_far] 固定序（三分类文字卡）；sang=[lo,hi]（升序不动
       ——判定只看音程大小与顺序无关，无泄答面）；
        answer=cls；ansNote=类目 id（非音名——渲染/确认句分支处理）
   r39-bis rnd 消耗（相对 r39）：find dch≥2 站位 +3（shuffled 4 元）；
   higher 站位 +3、唱序 +1。dch1 分支消耗不变（谱面保留实证）；specSeqOf 全量
   先行消耗不变 → melody/iv 谱面与 dch4 题序（kseq）逐位不变；答案位 4 位均匀
   （洗牌 24 排列等概率——verify ④/pycheck 直方图护栏，SPEC-R39 §R3/§R13） */
function buildQuiz(spec, dch, rnd) {
  const byOrder = (a, b) => idxOfNote(a) - idxOfNote(b);
  if (spec.kind === 'find') {
    const ds = shuffled(ORDER.filter(x => x !== spec.note), rnd).slice(0, 3);
    const notes = dch === 1 ? [spec.note].concat(ds).sort(byOrder)
                            : noSort(shuffled([spec.note].concat(ds), rnd));   // r39-bis F1：真洗牌（3 rnd）防答案恒 index0
    return { kind: 'find', notes: notes, ansNote: spec.note, answer: notes.indexOf(spec.note),
             sang: [spec.note], freeOrder: dch !== 1, _miss: 0, _answered: false };
  }
  if (spec.kind === 'higher') {
    const lo = ORDER[spec.lo], hi = ORDER[spec.hi];
    const nearPool = ORDER.filter(x => x !== lo && x !== hi &&
      (Math.abs(idxOfNote(x) - idxOfNote(lo)) === 1 || Math.abs(idxOfNote(x) - idxOfNote(hi)) === 1));
    const near = nearPool[Math.floor(rnd() * nearPool.length)];   // 近邻干扰必含（§0.66）
    let other;
    do { other = ORDER[Math.floor(rnd() * ORDER.length)]; }
    while (other === lo || other === hi || other === near);
    const notes = noSort(shuffled([lo, hi, near, other], rnd));   // r39-bis F1：真洗牌（3 rnd）防答案恒 index1
    const sang = rnd() < 0.5 ? [lo, hi] : [hi, lo];               // r39-bis M1 方案 c：唱序随机（1 rnd）——后亮不再恒=hi
    return { kind: 'higher', notes: notes, ansNote: hi, answer: notes.indexOf(hi),
             sang: sang, freeOrder: true, _miss: 0, _answered: false };
  }
  if (spec.kind === 'melody') {
    const notes = noSort(spec.mel4);
    return { kind: 'melody', notes: notes, ansNote: spec.sang[0],
             answer: notes.indexOf(spec.sang[0]), sang: spec.sang.slice(),
             freeOrder: true, _prog: 0, _miss: 0, _answered: false };
  }
  /* iv（SPEC-R39 §R1 维度三） */
  const notes = IV_KEYS.slice();
  return { kind: 'iv', notes: notes, ansNote: IV_KEYS[spec.cls], answer: spec.cls,
           sang: [ORDER[spec.lo], ORDER[spec.hi]], freeOrder: true,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 find do 有序（§3 教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapBird(L, i) —— 点场上第 i 张卡（notes 下标=视觉左起位）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'step'  melody 点对当前位但未满 3（progress+1，SPEC-R39 §R1 维度二——逐点即判进度保留）
   'wrong' 点错（dch2-4）：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   'free'  点错（dch1 认识小鸟教学特例，契约 E）：不判对错不计 miss 不进 step——唱歌给你听
   null    非法下标或关卡已结束 ---------- */
function engTapBird(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.notes.length) return null;
  if (q.kind === 'melody') {                      // melody：逐点即判（r25 M2 口径）
    if (q.notes[i] === q.sang[q._prog]) {
      q._prog++;
      q.ansNote = q.sang[q._prog] || q.sang[2];   // 动态答案=当前进度位（救援/钩子通用）
      q.answer = q.notes.indexOf(q.ansNote);
      if (q._prog >= q.sang.length) {
        q._answered = true;
        L.step++;
        if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
        return 'right';
      }
      return 'step';
    }
    q._miss++; L.retries++;
    return 'wrong';
  }
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  if (L.dch === 1) return 'free';                 // ch1 自由点鸟教学特例：不罚
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.64 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题答案卡下标（melody=当前进度位，动态） */
const correctIdx = q => (q ? q.answer : -1);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 / 四型结构 /
   有序-乱序律 / notes 升序含答案（ch1）/ 相邻题答案互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q || q.kind !== 'find' && q.kind !== 'higher' && q.kind !== 'melody' && q.kind !== 'iv') return 'kind';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（听音找 do 红鸟）锚点
  if (isAnchor && (q.kind !== 'find' || q.ansNote !== 'do')) return 'anchor';
  if ((dch === 1 || dch === 2) && q.kind !== 'find') return 'chFind';
  if (dch === 3 && q.kind !== 'higher') return 'chHigher';
  if (q.kind === 'iv') {                                // interval（SPEC-R39 §R3）
    if (dch !== 4) return 'chIv';
    if (q.notes.length !== 3 || q.notes[0] !== 'iv_near' || q.notes[1] !== 'iv_mid' || q.notes[2] !== 'iv_far') return 'ivCards';
    if (q.sang.length !== 2 || !ORDER.includes(q.sang[0]) || !ORDER.includes(q.sang[1])) return 'ivSang';
    const d = idxOfNote(q.sang[1]) - idxOfNote(q.sang[0]);
    if (d < 1) return 'ivSang';
    if (q.answer !== ivClsOf(d) || q.ansNote !== IV_KEYS[q.answer]) return 'ivCls';   // 分类独立复算
    if (q._miss !== 0 || q._answered) return 'init';
    return null;                                        // iv 前后豁免相邻互异（类目非音系）
  }
  if (q.notes.length !== 4) return 'len';
  const ns = q.notes;
  if (ns.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup';
  if (!ns.every(v => idxOfNote(v) >= 0)) return 'lib';
  let asc = true;
  for (let j = 1; j < 4; j++) if (idxOfNote(ns[j]) <= idxOfNote(ns[j - 1])) { asc = false; break; }
  if (dch === 1 && !asc) return 'orderCh1';             // ch1 有序（教学映射）
  if (dch >= 2 && asc) return 'orderMix';               // ch2+ 非完全升序（乱序律）
  if (ns.indexOf(q.ansNote) < 0 || q.answer !== ns.indexOf(q.ansNote)) return 'ansIdx';
  if (q.kind === 'find') {
    if (!(q.sang.length === 1 && q.sang[0] === q.ansNote)) return 'sangFind';
  } else if (q.kind === 'higher') {
    /* r39-bis 唱序随机：sang=[lo,hi] 或 [hi,lo]——顺序无关校验（答案=对中较高者） */
    if (!(q.sang.length === 2 && ns.indexOf(q.sang[0]) >= 0 && ns.indexOf(q.sang[1]) >= 0 &&
          idxOfNote(q.ansNote) === Math.max(idxOfNote(q.sang[0]), idxOfNote(q.sang[1])))) return 'sangHi';
    const d = Math.abs(idxOfNote(q.sang[1]) - idxOfNote(q.sang[0]));
    if (d < 1 || d > 2) return 'interval';               // 音程 ≤2 度（近对）
    const nearOk = ns.some(x => x !== q.sang[0] && x !== q.sang[1] &&
      (Math.abs(idxOfNote(x) - idxOfNote(q.sang[0])) === 1 ||
       Math.abs(idxOfNote(x) - idxOfNote(q.sang[1])) === 1));
    if (!nearOk) return 'nearMissing';                   // 干扰必含题面两鸟近邻
  } else {                                               // melody（SPEC-R39 §R3）
    if (q.sang.length !== 3 || q.sang.filter((v, i, a) => a.indexOf(v) === i).length !== 3) return 'melSang';
    if (!q.sang.every(v => ns.includes(v))) return 'melIn';   // 唱序 3 音 ⊆ 场上
    if (ns.filter(v => !q.sang.includes(v)).length !== 1) return 'melDistr';  // 干扰恰 1
    if (q._prog !== 0 || q.ansNote !== q.sang[0] || q.answer !== ns.indexOf(q.sang[0])) return 'melInit';
  }
  const prevAns = prevQ && prevQ.kind !== 'iv' ? prevQ.ansNote : null;
  if (prevAns && prevAns === q.ansNote) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
