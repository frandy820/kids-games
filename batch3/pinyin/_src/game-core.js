/* ================= pinyin 纯引擎（无 DOM，UI 与 ?verify=1 共用同一代码路径） =================
   sylSplit 音节拆分 / makeLevel 确定性关卡生成（mulberry32(flat*7919+13)）/
   engPick 答题判定 / engStars 星级 / distract 干扰项构造 */
'use strict';

/* ---------- 确定性随机（与 pipe/memory 同实现） ---------- */
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

/* ---------- 音节拆分：'ba'→{sm:'b',ym:'a'}；'zhi'→{whole:true}；'wei'→{sm:'w',ym:'ei'}；'a'→{sm:'',ym:'a'} ---------- */
function sylSplit(s) {
  if (ZTR_SET[s]) return { sm: '', ym: s, whole: true };
  if (ZERO_SPLIT[s]) return { sm: ZERO_SPLIT[s][0], ym: ZERO_SPLIT[s][1], whole: false };
  if (SPELL_ALT[s]) return { sm: SPELL_ALT[s][0], ym: SPELL_ALT[s][1], whole: false };  // jue=j+üe 省写
  if (YM_SET[s]) return { sm: '', ym: s, whole: false };       // 零声母纯韵母（a/ai/an...）
  const two = s.slice(0, 2);
  if (SM_SET[two]) return { sm: two, ym: s.slice(2), whole: false };  // zh/ch/sh 优先
  const one = s.slice(0, 1);
  if (SM_SET[one]) return { sm: one, ym: s.slice(1), whole: false };
  return null;
}
/* 拼合（正字法）：j/q/x + üe/ün 省两点写作 *ue/*un（M2 修复：ün 并入，jun=j+ün） */
function sylJoin(sm, ym) {
  if ((ym === 'üe' || ym === 'ün') && (sm === 'j' || sm === 'q' || sm === 'x')) return sm + (ym === 'üe' ? 'ue' : 'un');
  return sm + ym;
}

/* ---------- 全音节索引（两拼 ∪ 整体认读 ∪ 零声母；key→{s,r,p,sm,ym,whole}） ---------- */
function buildSylMap() {
  const m = {};
  SYL.forEach(e => { const sp = sylSplit(e.s); m[e.s] = { s: e.s, r: e.r, p: e.p || null, sm: sp.sm, ym: sp.ym, whole: false }; });
  ZTR_LIB.forEach(e => { m[e.s] = { s: e.s, r: e.r, p: e.p || null, sm: '', ym: '', whole: true }; });
  ZERO.forEach(e => { const sp = sylSplit(e.s); m[e.s] = { s: e.s, r: e.r, p: null, sm: sp.sm, ym: sp.ym, whole: sp.whole }; });
  return m;
}
const SYL_MAP = buildSylMap();
const SYL_BY_YM = {};  // 韵母 → 两拼条目列表（pin 题材料池）
SYL.forEach(e => {
  const sp = sylSplit(e.s);
  if (!sp || !sp.ym) return;
  (SYL_BY_YM[sp.ym] = SYL_BY_YM[sp.ym] || []).push(e);
});
const YM_COMPLEX = YM.filter(m => m.length > 1);   // 复韵母+鼻韵母（干扰池，含 eng/ong）
/* 单韵母结尾 / 复韵母+鼻韵母结尾的两拼池 */
const POOL_SINGLE = SYL.filter(e => { const y = sylSplit(e.s).ym; return y && y.length === 1; });
const POOL_COMPLEX = SYL.filter(e => { const y = sylSplit(e.s).ym; return y && y.length > 1; });

/* ---------- 干扰项：形近优先，不足从池内补，去重且不含目标 ---------- */
function distract(target, confuseMap, pool, count, rnd) {
  const near = shuffled((confuseMap[target] || []).filter(x => x !== target), rnd);
  const used = near.slice();
  if (near.length < count) {
    const far = shuffled(pool.filter(x => x !== target && used.indexOf(x) < 0), rnd);
    for (let i = 0; i < far.length && used.length < count; i++) used.push(far[i]);
  }
  return used.slice(0, count);
}

/* ---------- 关卡参数（章内 lv 0-4 递进；生成关 flat>=20 沿用章公式） ---------- */
function levelSpec(flat) {
  const ch = Math.floor(flat / CH_LEN) + 1, lv = flat % CH_LEN;
  if (ch === 1) {  // 认声母：前期限经典形近组、3 选；后期全 23 声母；末关 4 选
    return { ch, lv, n: 3, choices: lv >= 4 ? 4 : 3,
      pool: lv < 2 ? SM_EASY : SM, type: 'sm' };
  }
  if (ch === 2) {  // 认韵母：单韵母起，后混复韵母（eng/ong 无本音不作听音目标）
    return { ch, lv, n: lv < 2 ? 3 : 4, choices: lv >= 4 ? 4 : 3,
      pool: lv < 2 ? YM_SINGLE : YM_TARGET, type: 'ym' };
  }
  if (ch === 3) {  // 两拼（单韵母）：声母+货物，选韵母
    return { ch, lv, n: 4, choices: 3, pool: POOL_SINGLE, type: 'pin' };
  }
  return { ch, lv, n: lv < 2 ? 4 : 5, choices: 3, type: 'mix' };  // ch4：复韵母两拼 + 整体认读交替
}

/* ---------- 单题生成（rnd 全程同流保证确定性） ---------- */
function makeQuestion(spec, rnd, used) {
  const rint = n => Math.floor(rnd() * n);
  let tries = 0, key = null, mk = null;
  while (tries < 10) {   // 目标去重（同关不同题目标不同；10 次仍撞则接受）
    tries++;
    if (spec.type === 'sm' || spec.type === 'ym') {
      const t = spec.pool[rint(spec.pool.length)];
      if (used.indexOf(t) >= 0) continue;
      const pool0 = spec.type === 'sm' ? SM : YM_TARGET;
      /* 首两关各留 1 题远形近干扰（教玩观察 P2：连续形近组对初学者挫败密度高；lv0 第一题/ lv1 第二题） */
      const confMap = spec.type === 'sm' ? SM_CONFUSE : YM_CONFUSE;
      const farQ = spec.ch === 1 && spec.lv < 2 && spec.qi === (spec.lv === 0 ? 0 : 1);
      const confuse = farQ ? {} : confMap;
      const pool = farQ ? pool0.filter(x => !(confMap[t] || []).includes(x)) : pool0;
      const read = spec.type === 'sm' ? SM_READ[t] : YM_READ[t];
      const ds = distract(t, confuse, pool, spec.choices - 1, rnd);
      const items = shuffled([t].concat(ds), rnd);
      mk = { type: spec.type, sm: spec.type === 'sm' ? t : '', ym: spec.type === 'ym' ? t : '',
        syl: read, rep: SYL_MAP[read] ? SYL_MAP[read].r : '', pic: null,
        items, answer: items.indexOf(t) };
      key = t;
      break;
    }
    if (spec.type === 'pin') {   // 两拼：韵母干扰优先形近（同长度族），池补单韵母
      const e = spec.pool[rint(spec.pool.length)];
      if (used.indexOf(e.s) >= 0) continue;
      const sp = sylSplit(e.s);
      const yPool = sp.ym.length === 1 ? YM_SINGLE : YM_COMPLEX;
      const ds = distract(sp.ym, YM_CONFUSE, yPool, spec.choices - 1, rnd);
      const items = shuffled([sp.ym].concat(ds), rnd);
      mk = { type: 'pin', sm: sp.sm, ym: sp.ym, syl: e.s, rep: e.r, pic: e.p || null,
        items, answer: items.indexOf(sp.ym) };
      key = e.s;
      break;
    }
    /* spec.type === 'mix'：偶数题 pin2（复韵母）、奇数题 ztr（整体认读），确定性交替 */
    const isPin = (spec.qi % 2 === 0);
    if (isPin) {
      const e = POOL_COMPLEX[rint(POOL_COMPLEX.length)];
      if (used.indexOf(e.s) >= 0) continue;
      const sp = sylSplit(e.s);
      const ds = distract(sp.ym, YM_CONFUSE, YM_COMPLEX, spec.choices - 1, rnd);
      const items = shuffled([sp.ym].concat(ds), rnd);
      mk = { type: 'pin', sm: sp.sm, ym: sp.ym, syl: e.s, rep: e.r, pic: e.p || null,
        items, answer: items.indexOf(sp.ym) };
      key = e.s;
    } else {
      const e = ZTR_LIB[rint(ZTR_LIB.length)];
      if (used.indexOf(e.s) >= 0) continue;
      const ds = distract(e.s, ZTR_CONFUSE, ZTR, spec.choices - 1, rnd);
      const items = shuffled([e.s].concat(ds), rnd);
      mk = { type: 'ztr', sm: '', ym: '', syl: e.s, rep: e.r, pic: e.p || null,
        items, answer: items.indexOf(e.s) };
      key = e.s;
    }
    break;
  }
  if (mk && key != null && used.indexOf(key) < 0) used.push(key);
  return mk;
}

/* ---------- 关卡生成：静态 20 关与生成关同一确定性通道（同 flat 永远同关） ---------- */
function makeLevel(flat) {
  flat = Math.max(0, flat | 0);
  const spec = levelSpec(flat);
  const rnd = mulberry32(flat * 7919 + 13);
  const used = [];
  const questions = [];
  for (let qi = 0; qi < spec.n; qi++) {
    const q = makeQuestion(Object.assign({ qi }, spec), rnd, used);
    if (!q) continue;
    questions.push(q);
  }
  return { flat, ch: spec.ch, lv: spec.lv, n: questions.length, spec: { choices: spec.choices, type: spec.type },
    questions, idx: 0, retries: 0, solved: 0 };
}

/* ---------- 答题判定（纯引擎）：对 → solved++ 进入下一题；错 → retries++（零惩罚，可重点） ---------- */
function engPick(L, i) {
  const q = L.questions[L.idx];
  if (!q) return null;
  if (i === q.answer) {
    L.solved++;
    L.idx++;
    return true;
  }
  L.retries++;
  return false;
}
function engWon(L) { return L.idx >= L.questions.length; }
/* 星级：全对（retries=0）=3 星；总重试 ≤2=2 星；否则 1 星。永不 0 星 */
function engStars(retries) { return retries === 0 ? 3 : (retries <= 2 ? 2 : 1); }

/* ---------- 引擎直驱整关（verify autoSolve 与钩子共用） ---------- */
function engAutoSolve(L) {
  const picks = [];
  while (!engWon(L)) {
    const q = L.questions[L.idx];
    picks.push(q.answer);
    engPick(L, q.answer);
  }
  return picks;
}

/* ---------- 结构校验（verify 用）：answer 在 items 中且唯一、干扰≠answer ---------- */
function structOk(q) {
  if (!q || !q.items || !q.items.length) return false;
  if (q.answer < 0 || q.answer >= q.items.length) return false;
  const t = q.items[q.answer];
  let cnt = 0;
  q.items.forEach(it => { if (it === t) cnt++; });
  if (cnt !== 1) return false;
  for (let i = 0; i < q.items.length; i++) {
    for (let j = i + 1; j < q.items.length; j++) if (q.items[i] === q.items[j]) return false;
  }
  return true;
}
