/* ================= cir 纯引擎 r4：确定性关卡生成 + 双答判定（无 DOM，UI 与 verify 共用）
   取题（SPEC-BATCH39 §3 r4：题库封闭 20 题=4 章×5；每关 5 题）：
   静态关 flat<20：dch=diffOfCh(ch) 静态档，关内 5 题=章池 5 行 rotate (lv+k)%5
   （thanks 先例同构）；候选序 seeded 打散。
   生成关 flat≥20：dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*7919+877) 首随机数
   先取保确定性——b33 硬性②+quickcmp 先例；本款常量 877），再从该 dch 档行池
   seeded 无放回抽 5（域全档成立型：四题型档池均自洽）——同 flat 永远同关。
   阶段1 真值（r4 双答制——SPEC §3 独立推导式，verify 用独立副本复算禁抄本层）：
   predAnsOf(row)：
     twogap  second.at==='main' → 'dark'（两缺口都在主环，只接判定位一根不亮）;
             否则 'lit'（第二缺口在死支路，主环只有判定位一个缺口）
     fault   !short && blankAt!=='main' → 'lit'（主环完好——断口只在死支路）;
             否则 'dark'（主路断口 或 跨接线短路灯）
     switch  branch.bridge==='lamp' && branch.sw → 'dark'（支路开关合上跨灯短路）;
             否则 'lit'（跨线段支路开关 / 开关在主路）
     bright  branch ? 'same'（并联=与单灯一样亮） : 'down'（串联=比单灯更暗）;
             'up'（更亮）=误解干扰项恒非真值
   候选构造 r4（同尺寸干扰——SPEC §3）：decoy ⟺ second && second.at==='dead'
   → 3 枚=[need(通路导线), 同尺寸死支路元件(dead 标), 邻档线]（两根同尺寸按目测失效，
   须按拓扑排除）；F3（need=null）→ [拆线卡, 线 M, 线 L]（answer=卡位）；余经典
   [need + 两异档线] → answer=picks 内 need 唯一位。
   quiz 结构：{ kind, layout, slots[], blank, blankAt, need, second, branch, short, sw,
   litAns, brightAns, predAns, picks[], answer, deadIdx, obs, obsWin, phase, _miss,
   _predOk, _answered }
   slots[]：{ k, type('fix'|'blank'|'bunny'), part, on }——死支路缺口槽追加为末槽
   （index=layout.length）；on=终点态（本题完成后全 true——回路闭合律终点口径；
   阶段中途的灯亮为渲染层 .lamp.on 非槽真值）。
   铁律：每关 5 题；每题恰一枚正确候选（structWhy 校验）；阶段1 未答对（_predOk=false）
   阶段2 判定不可入（engTapPart null——顺序守卫）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 阶段1 真值推导（引擎真源；verify specLitOf 独立副本禁调本函数） ---------- */
function predAnsOf(row) {
  if (row.kind === 'bright') return row.branch ? 'same' : 'down';
  if (row.kind === 'twogap') return (row.second && row.second.at === 'main') ? 'dark' : 'lit';
  if (row.kind === 'fault') return (!row.short && row.blankAt !== 'main') ? 'lit' : 'dark';
  return !(row.branch && row.branch.bridge === 'lamp' && row.branch.sw) ? 'lit' : 'dark';
}

/* ---------- 布局解析：记法串 → 主环槽位骨架（part=FIX_PART/on=false） ---------- */
function parseLayout(layout) {
  const slots = [];
  for (let k = 0; k < layout.length; k++) {
    slots.push({ k: k, type: 'fix', part: FIX_PART, on: false });
  }
  return slots;
}

/* ---------- seeded 打散（Fisher-Yates，确定性——对象数组按引用交换） ---------- */
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(rnd, 0, i);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* ---------- 单题构建：SPEC_TABLE 行 + 槽位骨架 + seeded 候选序；answer=唯一正确下标 ---------- */
function buildQuiz(rowIdx, rnd) {
  const row = SPEC_TABLE[rowIdx];
  const ch = Math.floor(rowIdx / 5) + 1;                       // 行→章（封闭表域 1-4）
  const kind = row.kind;
  const branch = row.branch ? { bridge: row.branch.bridge, sw: !!row.branch.sw, lamp: !!row.branch.lamp } : null;
  const layout = kind === 'bright' ? (row.branch ? 'B??L?' : 'B??L') : 'B??L';
  const isCut = kind === 'fault' && row.short;                 // F3 拆线卡题：无缺口
  const blankAt = row.blankAt === 'dead' ? 'dead' : 'main';
  const deadSlot = layout.length;                              // 死支路缺口槽=追加末槽
  const blank = isCut ? -1 : (blankAt === 'dead' ? deadSlot : row.blank);
  const slots = parseLayout(layout);
  if (blankAt === 'dead' || (row.second && row.second.at === 'dead'))
    slots.push({ k: deadSlot, type: 'fix', part: FIX_PART, on: false });
  if (!isCut) {
    slots[blank].type = 'blank';                               // 判定缺口槽（孩子放）
    slots[blank].part = null;
  }
  let bunny = -1, bunnySize = null;
  if (row.second) {                                            // 第二缺口（兔子补齐——演出层）
    bunny = row.second.at === 'main' ? row.second.i : deadSlot;
    slots[bunny].type = 'bunny';
    slots[bunny].part = null;
    bunnySize = row.second.size;
  }
  /* 候选构造 r4（SPEC §3）：F3 拆线卡 / decoy 同尺寸死支路元件 / 经典三异档 */
  let picks, answer, deadIdx = -1;
  if (kind === 'fault' && row.short) {
    picks = shuffled([{ t: 'cut', size: null }, { t: 'wire', size: 'M' }, { t: 'wire', size: 'L' }], rnd);
    answer = picks.findIndex(p => p.t === 'cut');
  } else if (row.second && row.second.at === 'dead') {
    const adj = row.need === 'M' ? (rnd() < 0.5 ? 'S' : 'L') : 'M';   // 邻档干扰（need M 时 seeded 二选）
    picks = shuffled([{ t: 'wire', size: row.need }, { t: 'wire', size: row.need, dead: true },
                      { t: 'wire', size: adj }], rnd);
    deadIdx = picks.findIndex(p => p.dead);
    answer = picks.findIndex(p => p.t === 'wire' && p.size === row.need && !p.dead);
  } else {
    const others = ['S', 'M', 'L'].filter(s => s !== row.need);
    picks = shuffled([{ t: 'wire', size: row.need }, { t: 'wire', size: others[0] },
                      { t: 'wire', size: others[1] }], rnd);
    answer = picks.findIndex(p => p.size === row.need);
  }
  const predAns = predAnsOf({ kind: kind, second: row.second ? { at: row.second.at } : null,
                              blankAt: blankAt, short: !!row.short,
                              branch: row.branch ? { bridge: row.branch.bridge, sw: !!row.branch.sw } : null });   // 阶段1 真值（SPEC 独立式——归一化行口径与 structWhy 复算一致）
  return { kind: kind, layout: layout, slots: slots, blank: blank, blankAt: blankAt,
           need: row.need || null,
           second: row.second ? { at: row.second.at, i: bunny,
                                  size: row.second.size } : null,
           branch: branch, short: !!row.short, sw: !!row.sw,
           litAns: kind === 'bright' ? null : predAns === 'lit',
           brightAns: kind === 'bright' ? predAns : null,
           predAns: predAns,
           picks: picks, answer: answer, deadIdx: deadIdx,
           obs: CHAPTERS[ch].obs, obsKey: CHAPTERS[ch].obsKey, obsWin: CHAPTERS[ch].obsWin,
           phase: 1, _miss: 0, _predOk: false, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   静态关章池 rotate：flat 关 5 题 = SPEC_TABLE[(dch-1)*5 + (lv+k)%5]（章池全 5 题轮转取尽）
   生成关：dch=ri(rnd,1,4) 先取，再从 dch 档行池 seeded 无放回抽 5 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 877);                   // 本款常量 877（SPEC §0.96）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);     // 生成关随机章参数（先取数保确定性）
  let rows;
  if (flat < STATIC_LEVELS) {
    const base = (dch - 1) * 5;                                // 静态关 dch===ch：章池 rotate
    rows = [];
    for (let k = 0; k < CH_LEN; k++) rows.push(base + (lv + k) % 5);
  } else {
    const pool = [(dch - 1) * 5, (dch - 1) * 5 + 1, (dch - 1) * 5 + 2, (dch - 1) * 5 + 3, (dch - 1) * 5 + 4];
    const a = pool.slice(), out = [];
    for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
    rows = out;                                                // 生成关：档池 seeded 无放回抽 5
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(rows[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, rows: rows,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 阶段1 预判答引擎（无 DOM）：engTapPred(L, d) —— 选项 d（lit/dark/up/same/down）
   'ok'     答对：_predOk=true，phase→2（开放元件库——顺序守卫之源）
   'wrong'  答错：该题 miss+1（retries 全关累计=星级口径），可重答
   null     关卡已结束 / 本题已答过 / 阶段1 已过 / 非法选项 ---------- */
function engTapPred(L, d) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q._predOk || q.phase !== 1) return null;
  if (PRED_KINDS[q.kind].indexOf(d) < 0) return null;
  if (d === q.predAns) {
    q._predOk = true; q.phase = 2;
    return 'ok';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}

/* ---------- 阶段2 放元件引擎（无 DOM）：engTapPart(L, i) —— 点候选下标 i 的元件
   'lit'    放对且本题完成推进（判定槽真值落位；F3=short 置 false（跨接线拆掉）；
            兔子槽联动补齐；终点态全槽 on=true——回路闭合律终点口径）
   'done'   放对且末题=通关
   'wrong'  放错（干扰跨距/死支路元件/拆线卡题选了线）：miss+1，可重放
   null     阶段1 未答对（双答制顺序守卫）/ 非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapPart(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || !q._predOk) return null;             // 双答制：先答预判再放元件
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) return null;
  if (i === q.answer) {
    q._answered = true;
    if (q.kind === 'fault' && q.short) {
      q.short = false;                                          // F3：拆掉跨接线（真值落位）
    } else {
      const bs = q.slots[q.blank];                              // 判定槽真值落位（渲染层 .closed 之源）
      bs.part = q.need;
    }
    let bunnyK = -1;
    if (q.second) bunnyK = q.second.i;   // 兔子槽下标（dead 型 second.i 已上游归一化为死支路槽号——r4 审查 m-4 删恒等三元）
    if (q.second && bunnyK >= 0) q.slots[bunnyK].part = q.second.size;         // 兔子补齐槽联动落位
    for (let s = 0; s < q.slots.length; s++) q.slots[s].on = true;   // 回路律终点态：全槽通电
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'lit';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径承 v1）：全关放错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前步正确候选下标（阶段2） */
const correctPick = q => !q ? -1 : q.answer;

/* ---------- 结构校验 r4（verify 用，返回失败原因或 null）：
   kind 域 / 布局域封闭（记法串字符数=槽数 4|5 / 字符域 B L ?）/ 预判域（PRED_KINDS）
   / predAns=predAnsOf 复算 / litAns·brightAns 派生一致 / blank 在槽数域内且=blankAt 口径
   / need∈{S,M,L}（F3=null）/ second 仅 4 槽板在（tw 板无第二缺口）/ second main 时 i≠blank
   且 size≠need / decoy ⟺ second dead（picks 含恰一根 dead 同尺寸线）
   / picks 恰 3 枚 / answer=picks 内唯一非 dead need 位（F3=cut 位）/ deadIdx 对位
   / 槽位真值（fix 槽 part≠null、blank/bunny 槽 part=null、初始全 on=false）
   / 分支域（bridge∈{lamp,seg}）/ 初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (!CHAPTERS[dch]) return 'dch';
  if (q.kind !== 'twogap' && q.kind !== 'fault' && q.kind !== 'switch' && q.kind !== 'bright') return 'kind';
  const lay = q.layout;
  const expLay = q.kind === 'bright' ? (q.branch ? 'B??L?' : 'B??L') : 'B??L';
  if (lay !== expLay) return 'layout';
  for (let i = 0; i < lay.length; i++) {
    const c = lay.charAt(i);
    if (c !== 'B' && c !== 'L' && c !== '?') return 'chr';
  }
  if (PRED_KINDS[q.kind].indexOf(q.predAns) < 0) return 'predDom';
  const rowLike = { kind: q.kind, second: q.second ? { at: q.second.at } : null,
                    blankAt: q.blankAt, short: q.short,
                    branch: q.branch ? { bridge: q.branch.bridge, sw: q.branch.sw } : null };
  if (q.predAns !== predAnsOf(rowLike)) return 'predAns';       // 阶段1 真值自洽复算
  if (q.kind === 'bright') {
    if (q.litAns !== null || q.brightAns !== q.predAns) return 'litBright';
  } else {
    if (q.brightAns !== null || q.litAns !== (q.predAns === 'lit')) return 'litBright';
  }
  const blankAt = q.blankAt === 'dead' ? 'dead' : 'main';
  if (blankAt !== q.blankAt) return 'blankAt';
  const isCutQ = q.kind === 'fault' && q.short;
  if (isCutQ) {
    if (q.blank !== -1) return 'blankCut';                      // F3 拆线卡题无缺口
  } else if (!Number.isInteger(q.blank) || q.blank < 0 || q.blank >= q.slots.length) return 'blank';
  if (!isCutQ && blankAt === 'dead' && q.blank !== lay.length) return 'blankDead';   // 死支路槽=追加末槽
  if (q.kind === 'fault' && q.short) {
    if (q.need !== null) return 'needCut';                      // F3 拆线卡题 need=null
  } else if (q.need !== 'S' && q.need !== 'M' && q.need !== 'L') return 'need';
  if (q.second) {
    if (lay.length !== 4) return 'second5';                     // 第二缺口仅 4 槽板（tw 无）
    if (q.second.at === 'main') {
      if (!Number.isInteger(q.second.i) || q.second.i < 0 || q.second.i >= lay.length) return 'secondI';
      if (q.second.i === q.blank) return 'secondBlank';
      if (q.second.size === q.need) return 'secondEq';          // 主环第二缺口≠need（视觉可辨）
    } else if (q.second.at !== 'dead') return 'secondAt';
  }
  if (q.branch && q.branch.bridge !== 'lamp' && q.branch.bridge !== 'seg') return 'bridge';
  if (q.branch && q.kind === 'bright') {
    /* bright-PR 的 branch=拓扑标记非渲染支路（tw 板本身即两灯并联）：恒 bridge='lamp' 无开关 */
    if (lay.length !== 5 || q.branch.bridge !== 'lamp' || q.branch.sw) return 'brightBranch';
  } else if (q.branch && lay.length !== 4) return 'branch5';    // 渲染支路仅 4 槽板
  if (q.picks.length !== 3) return 'picks';
  const hasDead = !!(q.second && q.second.at === 'dead');
  let cutN = 0, wireSizes = [], deadN = 0;
  for (let i = 0; i < 3; i++) {
    const p = q.picks[i];
    if (p.t === 'cut') { cutN++; if (p.size !== null) return 'pickCut'; }
    else if (p.t === 'wire') { if (!SPAN[p.size]) return 'pickSize'; wireSizes.push(p.size); if (p.dead) deadN++; }
    else return 'pickT';
  }
  if (q.kind === 'fault' && q.short) {                          // F3：恰一卡+两线，answer=卡位
    if (cutN !== 1 || deadN !== 0) return 'cutMix';
    if (q.answer !== q.picks.findIndex(p => p.t === 'cut') || q.answer < 0) return 'answer';
    if (q.deadIdx !== -1) return 'deadCut';
  } else {
    if (cutN !== 0) return 'cutMix';
    if (hasDead) {                                              // 同尺寸干扰：need×2（一真一 dead）+邻档
      if (deadN !== 1) return 'deadN';
      if (q.deadIdx < 0 || !q.picks[q.deadIdx].dead || q.picks[q.deadIdx].size !== q.need) return 'deadIdx';
      const needN = wireSizes.filter(s => s === q.need).length;
      if (needN !== 2) return 'deadPair';                       // 恰两根同尺寸=need（拓扑排除前提）
      const other = wireSizes.filter(s => s !== q.need);
      if (other.length !== 1) return 'deadOther';
      if (q.answer !== q.picks.findIndex(p => p.t === 'wire' && p.size === q.need && !p.dead) || q.answer < 0) return 'answer';
    } else {                                                    // 经典：三枚全异（need+两邻档）
      if (deadN !== 0 || q.deadIdx !== -1) return 'deadClassic';
      if (wireSizes.filter(s => s === q.need).length !== 1) return 'uniq';
      if (q.answer !== q.picks.findIndex(p => p.size === q.need) || q.answer < 0) return 'answer';
    }
  }
  for (let i = 0; i < q.slots.length; i++) {                    // 槽位真值：类型对位+part 域+初始不通电
    const s = q.slots[i];
    if (s.k !== i) return 'slotK';
    const expType = i === q.blank ? 'blank'
      : (q.second && q.second.i === i ? 'bunny' : 'fix');
    if (s.type === 'fix') {
      if (s.part !== 'S' && s.part !== 'M' && s.part !== 'L') return 'slotFix';
    } else if (s.type === 'blank' || s.type === 'bunny') {
      if (s.part !== null) return 'slotEmpty';
    } else return 'slotType';
    if (s.on) return 'slotOn';
    if (s.type !== expType) return 'slotMap';
  }
  if (q.phase !== 1 || q._miss !== 0 || q._predOk || q._answered) return 'init';
  return null;
}
