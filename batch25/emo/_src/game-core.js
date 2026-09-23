/* ================= emo 纯引擎：确定性关卡生成 + 候选点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R35-EMO §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 心情脸：fwd×5，目标 shuffled(ALL6).slice(0,5)（全池互异，flat0 题0 恒 happy 锚点）
     dch2 哪件事：shuffled([fwd,fwd,fwd,rev,rev])——rev 逆向题 ×2/关（全池）
     dch3 像不像：shuffled([rev,rev,rev,fwd,fwd])——rev 主载 ×3/关，目标域 HARD4（硬对）
     dch4 大挑战：shuffled([fwd,fwd,rev,rev,coin])——双向混合 rev∈[2,3]（全池）
   两向题型（r35）：
     fwd 正向 = 情境→情绪：题面情境句（emo_s_），候选 4 表情脸（1 对+3 干扰）
     rev 逆向 = 情绪→情境：题面大表情脸+情绪词（emo_w_）+问句（emo_rev_q），
           候选 4 情境图（1 对+3 干扰——答案情境+近伙伴情境+随机 2 情绪情境）
   铁律：每题干扰必含目标情绪的近伙伴（NEAR 3 对全域恒在——r35 §R1 维度一）；
   4 候选互异（脸=情绪互异；情境=情绪互异且情境 id 互异）；情境映射唯一（emo=SCENES 表内答案）；
   同关情境 id 互异（rev 候选消耗槽位守卫 levelSlots<4——构造性防池耗尽，§R3 预算论证）；
   相邻题情绪互异（供给律天然满足：全互异/dch3 尾题 ≠ 第 4 题）。 */
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

/* ---------- 每关题序表 {emo, mode}（genLevel 预生成；rnd 同流保确定性——SPEC-R35-EMO §R3）
   目标供给律：dch1/2/4 = shuffled(ALL6).slice(0,5)（每情绪 ≤1 次/关，天然相邻互异）；
     flat0 特例 = ['happy'] + shuffled(ALL6\{happy}).slice(0,4)（教学锚）；
     dch3 = shuffled(HARD4) + 尾题 a[ri(0,2)]（≠第 4 题保相邻互异，每情绪 ≤2 次/关）。
   题型配给（消耗序=实现序，pycheck 逐位对拍）：dch1 全 fwd；dch2 shuffled([f,f,f,r,r])；
     dch3 shuffled([r,r,r,f,f])；dch4 先 coin=rnd()<0.5（1 rnd）后 shuffled([f,f,r,r,coin])。 */
function specSeqOf(dch, rnd, flat) {
  let modes = null, emos;
  if (dch === 2) modes = shuffled(['fwd', 'fwd', 'fwd', 'rev', 'rev'], rnd);
  else if (dch === 3) modes = shuffled(['rev', 'rev', 'rev', 'fwd', 'fwd'], rnd);
  else if (dch === 4) {
    const coin = rnd() < 0.5 ? 'fwd' : 'rev';           // 先掷币（1 rnd）——§R3 消耗序
    modes = shuffled(['fwd', 'fwd', 'rev', 'rev', coin], rnd);
  }
  if (dch === 3) {
    const a = shuffled(HARD4, rnd);                     // 硬对域 4 情绪互异
    emos = a.concat([a[ri(rnd, 0, 2)]]);                // 尾题从前 3 取（≠a[3] 保相邻互异）
  } else if (dch === 1 && flat === 0) {
    emos = ['happy'].concat(shuffled(ALL6.filter(x => x !== 'happy'), rnd).slice(0, 4));   // 教学锚
  } else {
    emos = shuffled(ALL6, rnd).slice(0, CH_LEN);        // 全池互异供给
  }
  return emos.map((e, qi) => ({ emo: e, mode: modes ? modes[qi] : 'fwd' }));
}

/* ---------- 情境供给（本关惰性池 + 槽位守卫——§R3 构造性互异论证）
   levelSlots[emo]=本关该情绪已取情境数（fwd 目标/rev 候选同计）；
   情绪 E 单关槽上界=目标(≤2)+伙伴(≤2)+随机(守卫 <4)=4=情境池容量 → 同关情境互异恒成立；
   池耗尽 reshuffle=防御性兜底（槽位守卫下理论不可达）。 */
function takeScene(emo, rnd, pools, levelSlots) {
  let pool = pools[emo];
  if (!pool || !pool.length) {
    pool = pools[emo] = shuffled(SCENES.filter(s => s.emo === emo), rnd);
  }
  const sc = pool.shift();
  levelSlots[emo] = (levelSlots[emo] || 0) + 1;
  return sc;
}

/* ---------- 单题构建（§R3 rnd 消耗序）
   fwd：情境=takeScene(E)；干扰情绪=[NEAR[E]]+shuffled(其余4情绪).slice(0,2)（近对恒在）；
        faces=shuffled(4 情绪) → {id,emo,scene:null,right:emo===E}
   rev：答案情境=takeScene(E)；候选情绪=[E,NEAR[E]]+shuffled(其余4 且槽<4).slice(0,2)，
        逐情绪 takeScene（实现序=伙伴→r1→r2）；faces=shuffled(4 情境)
        → {id,emo,scene,right:scene===答案情境}（4 候选情绪互异+近对情境恒在） */
function buildQuiz(spec, rnd, pools, levelSlots) {
  const emo = spec.emo, mode = spec.mode;
  const scene = takeScene(emo, rnd, pools, levelSlots);
  if (mode === 'rev') {
    const restEmos = shuffled(ALL6.filter(x => x !== emo && x !== NEAR[emo] && (levelSlots[x] || 0) < 4), rnd).slice(0, 2);
    const cands = [emo, NEAR[emo]].concat(restEmos);
    const objs = cands.map(e => (e === emo ? { emo: e, scene: scene }               // 答案情绪的候选=答案情境（已取，不重复消耗）
                                               : { emo: e, scene: takeScene(e, rnd, pools, levelSlots) }));
    const order = shuffled(objs, rnd);
    const faces = order.map((o, j) => ({ id: 'f' + j, emo: o.emo, scene: o.scene.id, right: o.scene.id === scene.id }));
    return { mode: mode, scene: scene.id, emo: emo, faces: faces, _miss: 0, _answered: false };
  }
  const ds = [NEAR[emo]].concat(shuffled(ALL6.filter(x => x !== emo && x !== NEAR[emo]), rnd).slice(0, 2));
  const order = shuffled([emo].concat(ds), rnd);
  const faces = order.map((e, j) => ({ id: 'f' + j, emo: e, scene: null, right: e === emo }));
  return { mode: mode, scene: scene.id, emo: emo, faces: faces, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 {fwd, happy}（教学演示锚点——specSeqOf flat===0 分支保确定性，r35 post 谱机检） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const pools = {};                                        // 同关情境惰性池
  const levelSlots = {};                                   // 槽位守卫（§R3 构造性互异）
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd, pools, levelSlots));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点候选卡引擎（无 DOM，两向通吃）：engTapFace(L, i) —— 点第 i 张候选卡
   （faces 数组下标；fwd=表情脸卡 / rev=情境场景卡，right 旗标语义同构）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该卡 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapFace(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.faces.length) return null;
  if (q.faces[i].right) {
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
/* 星级（§0.59 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确脸下标 */
const correctIdx = q => {
  if (!q) return -1;
  for (let i = 0; i < q.faces.length; i++) if (q.faces[i].right) return i;
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null；SPEC-R35-EMO §R3 推导）：
   情绪封闭 / mode 域 / 情境映射唯一 / 章型规则（dch3 目标域=HARD4）/
   近伙伴恒在场（NEAR 3 对全域律）/ 候选互异与 right 自洽（fwd 按情绪 / rev 按情境）/
   rev 候选情境互异且映射一致 / 同关情境互异（rev 全候选入账）/ 相邻情绪互异 /
   flat0q0 锚点 {fwd, happy} / 初始态干净 */
function structWhy(q, dch, flat, qi, seenScenes, prevQ) {
  if (!q || !EMOS[q.emo]) return 'emo';
  if (q.mode !== 'fwd' && q.mode !== 'rev') return 'mode';
  const sc = sceneById(q.scene);
  if (!sc) return 'scene';                             // 情境不在封闭表
  if (sc.emo !== q.emo) return 'sceneMap';             // 答案≠表内唯一答案（映射唯一）
  const isAnchor = flat === 0 && qi === 0;             // 教学演示题（选开心脸）锚点
  if (isAnchor && (q.emo !== 'happy' || q.mode !== 'fwd')) return 'anchor';
  if (dch === 3 && HARD4.indexOf(q.emo) < 0) return 'dch3pool';    // ch3 目标 ∈ 硬对域（r35）
  if (q.faces.length !== 4) return 'facesLen';
  const ems = q.faces.map(f => f.emo);
  if (ems.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'facesDup';
  if (!ems.every(v => EMOS[v])) return 'facesLib';
  if (ems.indexOf(q.emo) < 0) return 'selfMissing';    // 目标情绪自身必在候选
  if (ems.indexOf(NEAR[q.emo]) < 0) return 'nearMissing';   // 近伙伴恒在场（r35 全域律）
  const rights = q.faces.filter(f => f.right);
  if (rights.length !== 1) return 'rightCount';
  if (q.mode === 'rev') {
    for (let k = 0; k < q.faces.length; k++) {
      if (q.faces[k].right !== (q.faces[k].scene === q.scene)) return 'rightFlag';
    }
    if (rights[0].scene !== q.scene) return 'rightScene';
    const scn = q.faces.map(f => f.scene);
    if (scn.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'sceneDupFaces';   // rev 候选情境互异
    for (let k = 0; k < q.faces.length; k++) {
      const fsc = sceneById(q.faces[k].scene);
      if (!fsc || fsc.emo !== q.faces[k].emo) return 'faceSceneMap';   // 候选情境映射=候选情绪
    }
    if (seenScenes && scn.some(s => seenScenes.indexOf(s) >= 0)) return 'sceneDup';   // 同关情境互异
  } else {
    for (let k = 0; k < q.faces.length; k++) {
      if (q.faces[k].scene !== null) return 'fwdSceneNotNull';
      if (q.faces[k].right !== (q.faces[k].emo === q.emo)) return 'rightFlag';
    }
    if (rights[0].emo !== q.emo) return 'rightEmo';
    if (seenScenes && seenScenes.indexOf(q.scene) >= 0) return 'sceneDup';   // 同关情境互异
  }
  if (prevQ && prevQ.emo === q.emo) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
