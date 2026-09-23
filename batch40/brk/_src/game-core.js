/* ================= brk 纯引擎：确定性关卡生成 + 点卡判定（无 DOM，UI 与 verify 共用）
   种子（SPEC-BATCH40 §0.3/§3）：
     关级流 = mulberry32(flat*7919+907)（本款常量 907）——生成关 flat≥20 先取
     dch=ri(rnd,1,4)（seeded 随机难度章，域全档成立型），再从 8 目标池 seeded
     无放回抽 5（同关 5 题目标互异——8 池取 5 天然满足）；静态关 flat<20 不耗
     关级流（行序=N1 rotate 公式，难度章=flat//5+1）。
     题级流 = mulberry32(flat*7919+907+qi*131)（plant 式逐题独立流——静态/生成
     关同式；干扰抽取与洗牌同流，rnd 消耗顺序恒定：pick=抽 3 正确步+抽 2 干扰
     +Fisher-Yates 洗 5 张；order=洗 5 张）。
   取题（N1 定版语义=章池+关内 rotate）：题(flat,k)=表行[(flat//5)*5+
   ((flat%5)+k)%5]——20 静态关每行恰现 5 次；生成关不走表行（目标抽取）。
   quiz 结构：{ row(0-19，生成关=-1), kind('pick'|'order'), goal(目标 id),
               goalLabel, cards(5 张 {id,label}), answerList(pick=3 正确步 id
               按步序/order=定序表 5 步 id), picked(已选 id 数组·进度真值),
               _miss(题级——order 跨步续算，换题清零), _answered }
   level 结构：{ ..., step(全关题号 0-4), retries(全关累计=星级口径), done }
   铁律：每关 5 题；同关 5 题目标互异（静态=章池互异/生成=无放回抽取）；
   pick 池干扰 2 张互异且 ∉ 本目标步骤集（35 卡池天然排除）；miss 在本判定层
   计（b34 坑①：UI guard 判定前拦+预判与 core 严格同构）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const kindOfDch = dch => (dch <= 2 ? 'pick' : 'order');   // dch1-2 pick / dch3-4 order

/* ---------- 单题构建（题级独立流）：
   pick：本目标 5 步 seeded 无放回抽 3（answerList 按步序升序）+他目标 35 卡
   seeded 无放回抽 2 干扰（互异且 ∉ 本目标——唯一归属保证）→ 池 seeded 洗 5 张
   order：5 步卡 seeded 乱序（cards），answerList=定序表（GOALS 数组序） ---------- */
function buildQuiz(goal, kind, rnd) {
  const mk = (g, i) => ({ id: g + '_' + i, label: GOALS[g][i] });
  if (kind === 'order') {
    const seq = [0, 1, 2, 3, 4].map(i => mk(goal, i));   // 定序表（SPEC 箭头序）
    return { row: -1, kind: kind, goal: goal, goalLabel: GOAL_LABEL[goal],
             cards: shuffled(seq, rnd), answerList: seq.map(c => c.id),
             picked: [], _miss: 0, _answered: false };
  }
  const idx = [0, 1, 2, 3, 4], sel = [];
  for (let k = 0; k < 3; k++) sel.push(idx.splice(ri(rnd, 0, idx.length - 1), 1)[0]);
  sel.sort((a, b) => a - b);                              // answerList 按步序
  const pool = [];
  for (const g2 of GOAL_IDS) if (g2 !== goal) for (let i = 0; i < 5; i++) pool.push(g2 + '_' + i);
  const dis = [];
  for (let k = 0; k < 2; k++) dis.push(pool.splice(ri(rnd, 0, pool.length - 1), 1)[0]);
  const cards = shuffled(sel.map(i => mk(goal, i)).concat(dis.map(d => {
    const g = d.split('_'); return { id: d, label: GOALS[g[0]][+g[1]] };
  })), rnd);
  return { row: -1, kind: kind, goal: goal, goalLabel: GOAL_LABEL[goal],
           cards: cards, answerList: sel.map(i => goal + '_' + i),
           picked: [], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   静态关：行序=N1 rotate（题(flat,k)=表行[(flat//5)*5+((flat%5)+k)%5]）；
   生成关：关级流先 dch 后抽 5 互异目标（rnd 消耗序恒定）。
   quiz 内容统一由题级独立流构建（静态关联行补 row 字段供取材反查）。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 907);              // 关级流（本款常量 907）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let goals;
  if (flat < STATIC_LEVELS) {
    goals = [];
    for (let k = 0; k < CH_LEN; k++)                       // N1 rotate：章池行→目标
      goals.push(QUESTIONS[(dch - 1) * 5 + (lv + k) % 5].goal);
  } else {
    const gs = GOAL_IDS.slice(), out = [];                 // 8 池 seeded 无放回抽 5（互异）
    for (let k = 0; k < CH_LEN; k++) out.push(gs.splice(ri(rnd, 0, gs.length - 1), 1)[0]);
    goals = out;
  }
  const kind = kindOfDch(dch);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = buildQuiz(goals[qi], kind, mulberry32(flat * 7919 + 907 + qi * 131));   // 题级独立流
    if (flat < STATIC_LEVELS) q.row = (dch - 1) * 5 + (lv + qi) % 5;   // 静态关联行（生成关恒 -1）
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, kind: kind, goals: goals,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapCard(L, i) —— 点候选池第 i 张卡
   'fill'   点对且本题未完成（pick=未选正确卡/order=当前步卡）——卡飞入槽
   'done'   点对且完成本题推进（pick=第 3 张正确/order=第 5 步）；
            若是末题同时 L.done=true（通关）
   'wrong'  点错（pick=干扰卡/order=非当前步卡）：该题 miss+1（order 跨步续算
            ——b39 crd 先例；retries 全关累计=星级口径），卡可重点（探索不罚）
   false    已选卡：拒绝（家族 D——已选卡轻摇，不计 miss 不泄不罚）
   null     非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
  const c = q.cards[i];
  if (q.picked.indexOf(c.id) >= 0) return false;          // 已选卡=拒绝（不泄、不罚）
  const want = q.kind === 'order'
    ? q.answerList[q.picked.length]                        // order 当前步（每步重读 quiz 之源）
    : null;                                                // pick 任一未选正确卡皆可
  const ok = q.kind === 'order' ? c.id === want
                              : q.answerList.indexOf(c.id) >= 0;
  if (ok) {
    q.picked.push(c.id);                                   // 进度真值（渲染层飞入槽之源）
    const full = q.picked.length === q.answerList.length;  // pick=3 / order=5
    if (full) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;       // 末题=通关
      return 'done';                                       // 题完成（SPEC 枚举：点满 3/5 步完=done，不分末题）
    }
    return 'fill';                                         // 步进（pick 非末张/order 非末步）
  }
  q._miss++;                                               // 题级 miss（order 跨步续算）
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0 miss 计数款）：全关错点 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前应点卡下标（order=当前步卡/pick=首张未选正确卡；
   独立函数供 verify 复核——UI 与救援不得缓存步进前的值） */
const correctIdx = q => {
  if (!q) return -1;
  const want = q.kind === 'order'
    ? q.answerList[q.picked.length]
    : q.answerList.find(id => q.picked.indexOf(id) < 0);
  return want ? q.cards.findIndex(c => c.id === want) : -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：kind/goal 域 /
   卡 label 与定表一致（id→(goal,步序)→GOALS 反查）／cards 5 张 id 互异 /
   pick：answerList 3 id ⊆ 本目标 5 步且互异+干扰=cards∖answerList 恰 2 张
   ∉ 本目标步骤集且互异（SPEC §3 干扰验算律）／order：answerList=定序表、
   cards=同 5 id 排列／初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (q.kind !== kindOfDch(dch)) return 'kind';            // dch1-2 pick / dch3-4 order
  if (GOAL_IDS.indexOf(q.goal) < 0) return 'goal';
  if (q.goalLabel !== GOAL_LABEL[q.goal]) return 'goalLabel';
  if (!Array.isArray(q.cards) || q.cards.length !== 5) return 'cardsN';
  const seen = {};
  for (const c of q.cards) {
    if (!c || seen[c.id]) return 'dupCard';                // 5 张 id 互异
    seen[c.id] = 1;
    const g = c.id.split('_');
    if (!GOALS[g[0]] || GOALS[g[0]][+g[1]] !== c.label) return 'label';   // label 定表反查（id→定表→label）
  }
  const own = [0, 1, 2, 3, 4].map(i => q.goal + '_' + i);
  if (q.kind === 'order') {
    if (JSON.stringify(q.answerList) !== JSON.stringify(own)) return 'orderSeq';   // answer=定序表
    const cardIds = q.cards.map(c => c.id).sort().join('|');
    if (cardIds !== own.slice().sort().join('|')) return 'orderPerm';   // cards=同 5 id 排列
  } else {
    if (q.answerList.length !== 3) return 'ansN';
    if (new Set(q.answerList).size !== 3) return 'ansDup';
    if (!q.answerList.every(id => own.indexOf(id) >= 0)) return 'ansOwn';   // 正确 3 ⊆ 本目标
    if (q.answerList.join('|') !== own.filter(id => q.answerList.indexOf(id) >= 0).join('|')) return 'ansSeq';   // 按步序
    const disr = q.cards.map(c => c.id).filter(id => q.answerList.indexOf(id) < 0);
    if (disr.length !== 2 || disr[0] === disr[1]) return 'disrN';          // 干扰恰 2 互异
    if (!disr.every(id => own.indexOf(id) < 0)) return 'disrOwn';          // 干扰 ∉ 本目标步骤集
  }
  if ((q.picked && q.picked.length) || q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
