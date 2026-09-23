/* ================= pattern 纯引擎：规律显式纯函数 ruleAt + 关卡生成 + 判定
   规律一律写成纯函数 ruleAt(rule, i)——任意位置可程序推断：
     cycle: {icons:[图案...]} 周期=icons.length（AB 仅教学链+flat0 首题；正式谱周期≥3）
     dual:  {shapes:[s0,s1], colors:[c0,c1]} 双维度——形状轴/颜色轴各自周期 2
     dualP: {shapes:[s0,s1], colors:[c0,c1,c2]} 双轴独立周期（r27）——形状轴 2 ×
            颜色轴 3，合成周期 6：无法按 2 长单元整块复读，必须两轴分别归纳
     count: {shape,color,start,step} 数量规律 count(i)=start+step*i
     compound: {shapes:[s0,s1],color,start,step} 双变量复合（r27）——形状轴交替 ×
            数量轴等差同步，缺失项须同时满足两轴
   缺失项 answer = ruleAt(missingIdx)；序列可见项 = ruleAt(i)（i≠missingIdx）
   UI 与 ?verify=1 共用同一代码路径，防两套逻辑漂移 */
'use strict';

const CH_LEN = 5; // 5 关 = 1 章
const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);

function ruleAt(rule, i) {
  if (rule.kind === 'cycle') {
    const it = rule.icons[i % rule.icons.length];
    return { shape: it.shape, color: it.color, count: 1 };
  }
  if (rule.kind === 'dual') {
    return { shape: rule.shapes[i % 2], color: rule.colors[i % 2], count: 1 };
  }
  if (rule.kind === 'dualP') {
    return { shape: rule.shapes[i % rule.shapes.length], color: rule.colors[i % rule.colors.length], count: 1 };
  }
  if (rule.kind === 'compound') {
    return { shape: rule.shapes[i % 2], color: rule.color, count: rule.start + rule.step * i };
  }
  return { shape: rule.shape, color: rule.color, count: rule.start + rule.step * i };
}
function rulePeriod(rule) {
  if (rule.kind === 'cycle') return rule.icons.length;
  if (rule.kind === 'dual') return 2;
  if (rule.kind === 'dualP') return rule.shapes.length * rule.colors.length; // 2×3 互素=lcm=6
  if (rule.kind === 'compound') return 2; // 形状轴周期（数量轴单调不循环；此值供教学 helpPulse 高亮一个形状单元）
  return 1;
}
function ruleOutputs(rule, len) {
  const s = [];
  for (let i = 0; i < len; i++) s.push(ruleAt(rule, i));
  return s;
}
function sameItem(a, b) {
  return a.shape === b.shape && a.color === b.color && (a.count || 1) === (b.count || 1);
}
function itemKey(a) { return a.shape + '|' + a.color + '|' + (a.count || 1); }

/* ---------- 题型模板（章难度阶梯，r27 上探谱） ----------
   ch1 周期单元≥3 + 双维入门（AB 仅教学链+flat0 首题坡度锚）
   ch2 中间缺失（双侧推断）+ 复杂单元（ABCD/ABBC）
   ch3 双维度（2/2 → 章末 2/3 独立周期）| ch4 数量规律 + 形状×数量复合
   退役模板（r27 移除，低段概念_floor 根因）：AABB_END / AB_MID */
const QUIZ_T = {
  AB_END: { kind: 'cycle', pat: [0, 1], total: 5, miss: 4 },
  ABB_END: { kind: 'cycle', pat: [0, 1, 1], total: 6, miss: 5 },
  ABC_END: { kind: 'cycle', pat: [0, 1, 2], total: 6, miss: 5 },
  ABCD_END: { kind: 'cycle', pat: [0, 1, 2, 3], total: 8, miss: 7 },
  ABC_MID: { kind: 'cycle', pat: [0, 1, 2], total: 7, miss: 4 },
  ABCD_MID: { kind: 'cycle', pat: [0, 1, 2, 3], total: 7, miss: 4 },
  ABBC_END: { kind: 'cycle', pat: [0, 1, 1, 2], total: 8, miss: 7 },
  ABBC_MID: { kind: 'cycle', pat: [0, 1, 1, 2], total: 8, miss: 5 },
  DUAL_END: { kind: 'dual', total: 5, miss: 4 },
  DUAL_MID: { kind: 'dual', total: 5, miss: 2 },
  DUALP_END: { kind: 'dualP', total: 6, miss: 5 },
  DUALP_MID: { kind: 'dualP', total: 6, miss: 3 },
  CNT_UP1: { kind: 'count', step: 1, total: 5, miss: 4 },
  CNT_DN1: { kind: 'count', step: -1, total: 5, miss: 4 },
  CNT_UP2: { kind: 'count', step: 2, total: 5, miss: 4 },
  CNT_UP1M: { kind: 'count', step: 1, total: 5, miss: 2 },
  CMP_END: { kind: 'compound', step: 1, total: 5, miss: 4 },
  CMP_MID: { kind: 'compound', step: 1, total: 5, miss: 2 },
  CMP2_END: { kind: 'compound', step: 2, total: 5, miss: 4 }
};

/* 静态 20 关（4 章 × 5）：flat 0-19 题型谱（r27 上探）——
   flat0 首题保留 AB_END（教学链演示题，逐字节锚：rnd 首题消耗序列不变，教程
   "看/帮"演示题与改造前完全一致）；flat0 第 2/3 题起坡度上探；
   flat10-13 / flat15-16 六关原样保留（基线谱，字节级不动——对照证据见 SPEC-R27）；
   flat14 章末上探 dualP；flat17-19 引入复合 CMP。
   【图标预算铁律】图案池 12 枚+材料袋整级去重借出（refill 无法扩容，见 makeBag）：
   每关 cycle/dual/dualP/compound 题材去重图标需求（cycle=pat 去重数、dual/dualP=2、
   count=1、compound=2）的任意前缀和恒 ≤12，超限=take 返短→icons[p] undefined 崩。 */
const STATIC_SPECS = [
  ['AB_END', 'ABB_END', 'ABC_END'],
  ['ABC_END', 'ABC_MID', 'ABC_END'],
  ['ABC_END', 'DUAL_END', 'ABBC_END'],
  ['ABCD_END', 'ABC_END', 'DUAL_END'],
  ['ABCD_END', 'ABBC_END', 'DUAL_MID'],
  ['ABC_MID', 'ABBC_END', 'ABC_MID', 'ABBC_END'],
  ['ABCD_MID', 'ABC_MID', 'DUAL_MID', 'ABBC_END'],
  ['ABCD_MID', 'ABBC_END', 'DUAL_END', 'ABBC_MID'],
  ['ABBC_MID', 'ABCD_MID', 'ABC_MID', 'DUAL_MID'],
  ['ABCD_MID', 'ABBC_MID', 'DUAL_MID', 'ABC_END'],
  ['DUAL_END', 'DUAL_END', 'DUAL_MID', 'DUAL_END'],
  ['DUAL_END', 'DUAL_MID', 'DUAL_END', 'DUAL_MID'],
  ['DUAL_MID', 'DUAL_END', 'DUAL_END', 'DUAL_MID'],
  ['DUAL_END', 'DUAL_MID', 'DUAL_MID', 'DUAL_END'],
  ['DUAL_END', 'DUALP_END', 'DUAL_MID', 'DUALP_END'],
  ['CNT_UP1', 'CNT_UP1', 'CNT_DN1', 'CNT_UP1', 'CNT_UP1'],
  ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1', 'CNT_DN1'],
  ['CMP_END', 'CNT_UP2', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
  ['CNT_UP2', 'CMP2_END', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
  ['CMP2_END', 'CNT_UP1M', 'CMP_MID', 'CNT_UP2', 'CMP_END']
];
/* flat≥20 生成关：主题按章循环（r27：进阶周期→中间缺失→双维度→数量+复合），
   关卡 key 随章号单调不重复；AB_END 不入生成池（生成关为后期内容，恒进阶谱）；
   生成池同样受图标预算 ≤12 约束（theme1 含 dual 系稀释 ABCD 的 4 图标成本） */
const CH_TPL = [
  ['ABC_END', 'ABBC_END', 'ABCD_END', 'ABC_MID', 'DUAL_END'],
  ['ABCD_MID', 'ABBC_MID', 'DUAL_END', 'ABC_MID', 'DUAL_MID'],
  ['DUAL_END', 'DUAL_MID', 'DUALP_END', 'DUALP_MID'],
  ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1M', 'CMP_END', 'CMP_MID', 'CMP2_END']
];
const CH_QUIZN = [3, 4, 4, 5];
function levelSpec(flat) {
  if (flat < STATIC_SPECS.length) return { ch: Math.floor(flat / CH_LEN) + 1, tks: STATIC_SPECS[flat] };
  const ch = Math.floor(flat / CH_LEN) + 1, theme = (ch - 1) % 4;
  const pool = CH_TPL[theme], n = CH_QUIZN[theme], tks = [];
  for (let i = 0; i < n; i++) tks.push(pool[(flat + i) % pool.length]);
  return { ch: ch, tks: tks };
}

/* ---------- 材料袋：从图案池按种子抽取（耗竭自动重洗） ---------- */
function makeBag(rnd) {
  let bag = shuffled(POOL, rnd);
  function refill(keep) {
    bag = shuffled(POOL, rnd);
    for (let i = 0; i < keep.length; i++) {  // 避开本轮已借出的组合
      const j = bag.findIndex(function (b) { return itemKey(b) === itemKey(keep[i]); });
      if (j >= 0) bag.splice(j, 1);
    }
  }
  return {
    take: function (k, keep) {
      if (bag.length < k) refill(keep || []);
      return bag.splice(0, k);
    },
    dualPair: function () {
      for (let t = 0; t < 8; t++) {
        for (let i = 0; i < bag.length; i++) {
          for (let j = i + 1; j < bag.length; j++) {
            if (bag[i].shape !== bag[j].shape && bag[i].color !== bag[j].color) {
              const a = bag.splice(i, 1)[0];
              const b = bag.splice(j - 1, 1)[0];
              return [a, b];
            }
          }
        }
        bag = shuffled(POOL, rnd);
      }
      return [poolItem('ball', 'red'), poolItem('cushion', 'green')]; // 不可达兜底
    }
  };
}

/* ---------- 干扰项：同池、规律外（≠ruleAt 任何输出）、≠answer、互异 ---------- */
function iconDistractors(outs, answer, rnd) {
  const outKeys = outs.map(itemKey);
  const cand = shuffled(POOL, rnd).filter(function (p) { return outKeys.indexOf(itemKey(p)) < 0; });
  cand.sort(function (a, b) {  // 优先与 answer 共享形状或颜色的（真干扰，非一眼排除）
    const sa = (a.shape === answer.shape || a.color === answer.color) ? 0 : 1;
    const sb = (b.shape === answer.shape || b.color === answer.color) ? 0 : 1;
    return sa - sb;
  });
  return cand.slice(0, 2).map(cloneItem);
}
function countDistractors(outs, answer, rnd) {
  const used = outs.map(function (o) { return o.count; });
  const cand = [];
  for (let c = 1; c <= 9; c++) if (used.indexOf(c) < 0 && c !== answer.count) cand.push(c);
  cand.sort(function (a, b) { return Math.abs(a - answer.count) - Math.abs(b - answer.count); });
  return cand.slice(0, 2).map(function (c) {
    return { shape: answer.shape, color: answer.color, count: c };
  });
}
/* 复合题干扰（r27）：两个「半对」干扰——d1 形状错·数量对，d2 形状对·数量近错；
   每个错项恰在一根轴上违律（另一轴成立），逼双向校验；均在规律外且互异 */
function compoundDistractors(rule, outs, answer) {
  const otherShape = rule.shapes[0] === answer.shape ? rule.shapes[1] : rule.shapes[0];
  const usedC = outs.map(function (o) { return o.count; });
  const cand = [];
  for (let c = 1; c <= 9; c++) if (usedC.indexOf(c) < 0 && c !== answer.count) cand.push(c);
  cand.sort(function (a, b) { return Math.abs(a - answer.count) - Math.abs(b - answer.count); });
  return [
    { shape: otherShape, color: rule.color, count: answer.count },
    { shape: answer.shape, color: rule.color, count: cand[0] }
  ];
}

/* ---------- 组题 ---------- */
function buildQuiz(tk, rnd, bag, used) {
  const t = QUIZ_T[tk];
  let rule;
  if (t.kind === 'cycle') {
    const icons = bag.take(Math.max.apply(null, t.pat) + 1, used);
    icons.forEach(function (it) { used.push(it); });
    rule = { kind: 'cycle', icons: t.pat.map(function (p) { return icons[p]; }) };
  } else if (t.kind === 'dual') {
    const pair = bag.dualPair();
    pair.forEach(function (it) { used.push(it); });
    rule = { kind: 'dual', shapes: [pair[0].shape, pair[1].shape], colors: [pair[0].color, pair[1].color] };
  } else if (t.kind === 'dualP') { // 双轴独立周期：形状 2 色 3（第三色 seeded 抽取）
    const pair = bag.dualPair();
    pair.forEach(function (it) { used.push(it); });
    const c2 = shuffled(COLOR_KEYS.filter(function (c) {
      return c !== pair[0].color && c !== pair[1].color;
    }), rnd)[0];
    rule = { kind: 'dualP', shapes: [pair[0].shape, pair[1].shape], colors: [pair[0].color, pair[1].color, c2] };
  } else if (t.kind === 'compound') { // 形状×数量复合：池内同色异形对（每色恰 2 形状）
    const it = bag.take(1, used)[0];
    used.push(it);
    const other = sameColor(it);
    used.push(other);
    const start = t.step === 2 ? 1 : 1 + Math.floor(rnd() * 3); // step2:1(1,3,5,7,9)；step1:1-3(max 7)
    rule = { kind: 'compound', shapes: [it.shape, other.shape], color: it.color, start: start, step: t.step };
  } else {
    const it = bag.take(1, used)[0];
    used.push(it);
    const start = t.step === 2 ? 1 : (t.step < 0 ? 5 + Math.floor(rnd() * 5) : 1 + Math.floor(rnd() * 5));
    rule = { kind: 'count', shape: it.shape, color: it.color, start: start, step: t.step };
  }
  const len = t.total, miss = t.miss;
  const seq = [];
  for (let i = 0; i < len; i++) seq.push(ruleAt(rule, i));
  const answer = ruleAt(rule, miss);
  const outs = ruleOutputs(rule, len);
  const ds = t.kind === 'dual'
    ? shuffled([sameShape(answer), sameColor(answer)], rnd)
    : (t.kind === 'count' ? countDistractors(outs, answer, rnd)
    : (t.kind === 'compound' ? compoundDistractors(rule, outs, answer)
    : iconDistractors(outs, answer, rnd))); // cycle + dualP 同通道（池内真干扰、规律外）
  const items = shuffled([cloneItem(answer), ds[0], ds[1]], rnd);
  const correctIdx = items.findIndex(function (it) { return sameItem(it, answer); });
  return { tk: tk, rule: rule, len: len, missingIdx: miss, seq: seq, answer: answer, items: items, correctIdx: correctIdx };
}

/* ---------- 关卡生成：静态 20 与生成关同一确定性通道
   种子 = mulberry32(flat * 7919 + 13)，同 flat 永远同关（重玩一致、verify 可检） ---------- */
function makeLevel(flat) {
  flat = Math.max(0, flat | 0);
  const rnd = mulberry32(flat * 7919 + 13);
  const spec = levelSpec(flat);
  const bag = makeBag(rnd), used = [];
  return {
    flat: flat, ch: spec.ch,
    quizzes: spec.tks.map(function (tk) { return buildQuiz(tk, rnd, bag, used); }),
    qi: 0, misses: 0, won: false
  };
}

/* ---------- 纯引擎（无 DOM） ---------- */
function engPick(L, i) { // 点选项：对=推进下一题（末题→won）；错=计一次重试、停留本题
  if (engWon(L)) return false;
  const q = L.quizzes[L.qi];
  if (!q || i < 0 || i >= q.items.length) return false;
  if (i === q.correctIdx) {
    L.qi++;
    if (L.qi >= L.quizzes.length) L.won = true;
    return 'correct';
  }
  L.misses++;
  return 'wrong';
}
function engWon(L) { return L.qi >= L.quizzes.length; }
/* 星级：全对=3 星；总重试≤3=2 星；否则 1 星（永不 0 星） */
function engStars(L) { return L.misses === 0 ? 3 : (L.misses <= 3 ? 2 : 1); }
