/* ================= habitat 纯引擎：确定性关卡生成 + 候选点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   r4 六族题型（SPEC-BATCH25 §0.60 r4 版本块；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 谁吃什么：[home×1, feed×3, chain×1]——flat0 题0 恒 home fish→pond（教学演示锚点），
           home=常见池 6 + 常见环境 4 全集（沿 v1）；feed=FEED_POOL 18 取材（candy 恒在场）；
           chain=链封闭 4 取材（up 干扰禁 food==base）
     dch2 冬天的秘密：[hib(sleep), struct, hib(awake), struct, hib(掷向)]——正反两型都有
     dch3 两个条件：[dual×5]——5 对交集条件每关全覆盖一次（答案互异）
     dch4 大挑战：[home, feed, chain|struct(掷), hib, dual]——≥5 型在场，dual 恒 ≥1
   生成关（flat≥20）：dch=ri(1,4) 掷章参数（先取数保确定性）。
   铁律：候选 4 卡互异（§0.17）恰 1 正确；相邻题同型同答案互异（防同关连题单调）；
   每动物唯一主环境/习性标签（ANIMALS 表封闭，判定=表内值）。 */
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
const KINDS = ['home', 'feed', 'chain', 'hib', 'struct', 'dual'];

/* ---------- 每关题序表 spec（genLevel 预生成；rnd 同流保确定性）
   spec = { kind, animal?(home/feed 题面), dir?(chain/hib), chain?(链 id), feat?(特征 id),
            pair?(交集对 id), home(=答案 id，生成期定死供相邻互异判) }
   pickDiff：池内随机 + 与前一 spec 同型同答案互异（≤8 掷兜底，防同关连题重复） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickDiff = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  if (dch === 1) {
    const s0 = flat === 0 ? 'fish' : pickDiff(COMMON_POOL, null);      // flat0 题0 锚 fish（教学演示）
    seq.push({ kind: 'home', animal: s0, home: ANIMALS[s0].home, near: false });
    const usedFood = {};                                                 // feed ×3（3 题食物全互异）
    for (let qi = 1; qi <= 3; qi++) {
      let s = FEED_POOL[Math.floor(rnd() * FEED_POOL.length)];
      for (let g = 0; g < 8 && usedFood[ANIMALS[s].food]; g++) s = FEED_POOL[Math.floor(rnd() * FEED_POOL.length)];
      seq.push({ kind: 'feed', animal: s, home: ANIMALS[s].food });
      usedFood[ANIMALS[s].food] = true;
    }
    const c = pickDiff(CHAINS, null);                                   // chain ×1 压轴
    const dir = rnd() < 0.5 ? 'up' : 'down';
    seq.push({ kind: 'chain', chain: c.id, dir: dir, home: dir === 'up' ? c.top : c.mid });
    return seq;
  }
  if (dch === 2) {
    const sleepAns = pickDiff(HIB_LIST, null);                          // hib 正向：睡长觉
    seq.push({ kind: 'hib', dir: 'sleep', home: sleepAns });
    const f1 = pickDiff(Object.keys(STRUCTS), null);                    // struct ×2（特征互异）
    seq.push({ kind: 'struct', feat: f1, home: STRUCTS[f1].abil });
    const awakeAns = pickDiff(NOHIB_LIST, null);                        // hib 反向：不睡
    seq.push({ kind: 'hib', dir: 'awake', home: awakeAns });
    const f2 = pickDiff(Object.keys(STRUCTS).filter(f => f !== f1), f1);
    seq.push({ kind: 'struct', feat: f2, home: STRUCTS[f2].abil });
    const dir3 = rnd() < 0.5 ? 'sleep' : 'awake';                       // 第 3 道 hib 掷向（答案与前互异）
    const pool3 = dir3 === 'sleep' ? HIB_LIST.filter(a => a !== sleepAns)
                                   : NOHIB_LIST.filter(a => a !== awakeAns);
    seq.push({ kind: 'hib', dir: dir3, home: pickDiff(pool3, null) });
    return seq;
  }
  if (dch === 3) {
    const pairs = shuffled(DUALS, rnd);                                 // 5 对全覆盖（对序 seeded）
    /* 答案全局互异：按答案池大小升序贪心分配（小池先占——farm_herb 池 1 最先，
       swim_egg 池 4 最后，手验任意分配序池恒非空），出题序仍用 pairs */
    const used = {}, ansMap = {};
    pairs.slice().sort((x, y) =>
      ALL24.filter(a => CONDS[x.a].t(a) && CONDS[x.b].t(a)).length -
      ALL24.filter(a => CONDS[y.a].t(a) && CONDS[y.b].t(a)).length
    ).forEach(d => {
      const pool = ALL24.filter(a => CONDS[d.a].t(a) && CONDS[d.b].t(a) && !used[a]);
      ansMap[d.id] = pool[Math.floor(rnd() * pool.length)];
      used[ansMap[d.id]] = true;
    });
    pairs.forEach(d => seq.push({ kind: 'dual', pair: d.id, home: ansMap[d.id] }));
    return seq;
  }
  /* dch4 混合：[home, feed, chain|struct(掷), hib, dual]——≥5 型在场 */
  const ha = pickDiff(ALL24, null);                                     // home 全 24 池（近对规则加难）
  seq.push({ kind: 'home', animal: ha, home: ANIMALS[ha].home, near: !!NEAR[ANIMALS[ha].home] });
  const fs = pickDiff(FEED_POOL, null);
  seq.push({ kind: 'feed', animal: fs, home: ANIMALS[fs].food });
  if (rnd() < 0.5) {                                                    // 掷位 3：chain 或 struct
    const c = pickDiff(CHAINS, null);
    const dir = rnd() < 0.5 ? 'up' : 'down';
    seq.push({ kind: 'chain', chain: c.id, dir: dir, home: dir === 'up' ? c.top : c.mid });
  } else {
    const f = pickDiff(Object.keys(STRUCTS), null);
    seq.push({ kind: 'struct', feat: f, home: STRUCTS[f].abil });
  }
  const dirH = rnd() < 0.5 ? 'sleep' : 'awake';
  seq.push({ kind: 'hib', dir: dirH, home: pickDiff(dirH === 'sleep' ? HIB_LIST : NOHIB_LIST, null) });
  const d4 = pickDiff(DUALS, null);
  seq.push({ kind: 'dual', pair: d4.id, home: pickDiff(ALL24.filter(a => CONDS[d4.a].t(a) && CONDS[d4.b].t(a)), null) });
  return seq;
}

/* ---------- 单题构建：答案 + 干扰 → 洗牌 4 候选卡（id='s'+最终位置下标，kind=候选 id）
   home：dch1=常见环境 4 全集（沿 v1）；dch4=近环境对必在场（NEAR[home]+随机 2，sky 无近对随机 3）
   feed：答案食物 + candy 恒在场 + 其余食物随机 2
   chain：链外动物 3（up 型再排除 food==base——草食干扰会造成双正确）
   hib：sleep=冬眠者答案+不冬眠干扰 3；awake=不冬眠答案+冬眠干扰 3
   struct：能力 4 全集（封闭宇宙）
   dual：答案 + 只满足A + 只满足B + 双不满足（双干扰必在场，照 shapecount r3 先例） */
function buildQuiz(spec, dch, rnd) {
  let ds, ans = spec.home;
  if (spec.kind === 'home') {
    if (dch === 1) {
      ds = COMMON_ENVS.filter(e => e !== ans);                          // 常见环境互为干扰（沿 v1）
    } else if (NEAR[ans]) {
      ds = [NEAR[ans]];                                                 // 近环境对必在场（沿 v1 加难）
      ds = ds.concat(shuffled(ALL7.filter(e => e !== ans && e !== NEAR[ans]), rnd).slice(0, 2));
    } else {
      ds = shuffled(ALL7.filter(e => e !== ans), rnd).slice(0, 3);      // sky 无近对：随机 3
    }
  } else if (spec.kind === 'feed') {
    ds = ['candy'].concat(shuffled(FOOD_KEYS.filter(k => k !== ans && k !== 'candy'), rnd).slice(0, 2));
  } else if (spec.kind === 'chain') {
    const c = chainById(spec.chain);
    ds = shuffled(ALL24.filter(a => a !== c.mid && a !== c.top &&
      (spec.dir !== 'up' || ANIMALS[a].food !== c.base)), rnd).slice(0, 3);
  } else if (spec.kind === 'hib') {
    ds = shuffled(spec.dir === 'sleep' ? NOHIB_LIST : HIB_LIST.filter(a => a !== ans), rnd).slice(0, 3);
  } else if (spec.kind === 'struct') {
    ds = ABILITY_KEYS.filter(k => k !== ans);
  } else {                                                              /* dual */
    const d = dualById(spec.pair);
    const onlyA = ALL24.filter(a => CONDS[d.a].t(a) && !CONDS[d.b].t(a) && a !== ans);
    const onlyB = ALL24.filter(a => !CONDS[d.a].t(a) && CONDS[d.b].t(a) && a !== ans);
    const never = ALL24.filter(a => !CONDS[d.a].t(a) && !CONDS[d.b].t(a) && a !== ans);
    ds = [shuffled(onlyA, rnd)[0], shuffled(onlyB, rnd)[0], shuffled(never, rnd)[0]];
  }
  const order = shuffled([ans].concat(ds), rnd);
  const scenes = order.map((k, j) => ({ id: 's' + j, kind: k }));
  const q = { kind: spec.kind, home: ans, scenes: scenes, _miss: 0, _answered: false };
  if (spec.kind === 'home') { q.animal = spec.animal; q.near = !!spec.near; }
  if (spec.kind === 'feed') q.animal = spec.animal;
  if (spec.kind === 'chain') { q.chain = spec.chain; q.dir = spec.dir; }
  if (spec.kind === 'hib') q.dir = spec.dir;
  if (spec.kind === 'struct') q.feat = spec.feat;
  if (spec.kind === 'dual') q.pair = spec.pair;
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 home fish（§3 教学演示锚点——specSeqOf flat===0 分支保确定性） */
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

/* ---------- 点候选引擎（无 DOM）：engTapScene(L, i) —— 点第 i 张候选卡（scenes 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapScene(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.scenes.length) return null;
  if (q.scenes[i].kind === q.home) {
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
/* 星级（§0.60 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确候选下标（六族题型通用——scenes[].kind===home） */
const correctIdx = q => {
  if (!q) return -1;
  for (let i = 0; i < q.scenes.length; i++) if (q.scenes[i].kind === q.home) return i;
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   题型专属规则（feed candy 在场 / chain 链外取干扰+up 禁 food==base / hib 正反集合 /
   struct 能力 4 全集 / dual 双干扰在场+双满足唯一）/ 相邻同型同答案互异 /
   flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  /* 题型只进所属章（feed/chain∈{1,4}；hib/struct∈{2,4}；dual∈{3,4}；home∈{1,4}） */
  if ((q.kind === 'feed' || q.kind === 'chain') && dch !== 1 && dch !== 4) return 'kindCh';
  if ((q.kind === 'hib' || q.kind === 'struct') && dch !== 2 && dch !== 4) return 'kindCh';
  if (q.kind === 'dual' && dch !== 3 && dch !== 4) return 'kindCh';
  if (q.kind === 'home' && dch !== 1 && dch !== 4) return 'kindCh';
  const kinds = q.scenes.map(s => s.kind);
  if (q.scenes.length !== 4) return 'len';
  if (kinds.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup';
  if (kinds.filter(v => v === q.home).length !== 1) return 'homeN';
  const isAnchor = flat === 0 && qi === 0;
  if (q.kind === 'home') {
    if (!ANIMALS[q.animal]) return 'animal';
    if (q.home !== ANIMALS[q.animal].home) return 'home';
    if (isAnchor && q.animal !== 'fish') return 'anchor';
    if (!kinds.every(v => ENV[v])) return 'lib';
    if (dch === 1) {
      if (COMMON_POOL.indexOf(q.animal) < 0) return 'dch1pool';
      if (kinds.slice().sort().join() !== COMMON_ENVS.slice().sort().join()) return 'dch1envs';
    } else if (NEAR[q.home] && kinds.indexOf(NEAR[q.home]) < 0) return 'nearMissing';
  } else if (q.kind === 'feed') {
    if (!ANIMALS[q.animal] || !ANIMALS[q.animal].food) return 'feedSub';
    if (q.home !== ANIMALS[q.animal].food) return 'feedFood';
    if (!kinds.every(v => FOOD[v])) return 'feedLib';
    if (kinds.indexOf('candy') < 0) return 'feedCandy';
  } else if (q.kind === 'chain') {
    const c = chainById(q.chain);
    if (!c) return 'chainLib';
    if (q.dir !== 'up' && q.dir !== 'down') return 'chainDir';
    if (q.home !== (q.dir === 'up' ? c.top : c.mid)) return 'chainAns';
    if (!kinds.every(v => ANIMALS[v])) return 'chainLib';
    if (kinds.some(v => v !== q.home && (v === c.mid || v === c.top))) return 'chainPool';
    if (q.dir === 'up' && kinds.some(v => ANIMALS[v].food === c.base)) return 'chainBase';
  } else if (q.kind === 'hib') {
    if (q.dir !== 'sleep' && q.dir !== 'awake') return 'hibDir';
    if (!ANIMALS[q.home]) return 'hibAns';
    if (q.dir === 'sleep' && ANIMALS[q.home].hib !== true) return 'hibAns';
    if (q.dir === 'awake' && ANIMALS[q.home].hib !== false) return 'hibAns';
    if (!kinds.every(v => ANIMALS[v])) return 'hibLib';
    const others = kinds.filter(v => v !== q.home);
    if (q.dir === 'sleep' && !others.every(v => ANIMALS[v].hib === false)) return 'hibPool';
    if (q.dir === 'awake' && !others.every(v => ANIMALS[v].hib === true)) return 'hibPool';
  } else if (q.kind === 'struct') {
    if (!STRUCTS[q.feat]) return 'structFeat';
    if (q.home !== STRUCTS[q.feat].abil) return 'structAbil';
    if (kinds.slice().sort().join() !== ABILITY_KEYS.slice().sort().join()) return 'structSet';
  } else {                                                              /* dual */
    const d = dualById(q.pair);
    if (!d || !CONDS[d.a] || !CONDS[d.b]) return 'dualLib';
    if (!ANIMALS[q.home] || !(CONDS[d.a].t(q.home) && CONDS[d.b].t(q.home))) return 'dualAns';
    if (!kinds.every(v => ANIMALS[v])) return 'dualLib';
    const others = kinds.filter(v => v !== q.home);
    if (others.some(v => CONDS[d.a].t(v) && CONDS[d.b].t(v))) return 'dualD2';
    if (!others.some(v => CONDS[d.a].t(v) && !CONDS[d.b].t(v))) return 'dualDA';
    if (!others.some(v => !CONDS[d.a].t(v) && CONDS[d.b].t(v))) return 'dualDB';
  }
  if (prevQ && prevQ.kind === q.kind && prevQ.home === q.home) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
