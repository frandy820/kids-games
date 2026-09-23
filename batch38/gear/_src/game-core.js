/* ================= gear 纯引擎 v3：确定性关卡生成 + 双答判定（无 DOM，UI 与 verify 共用）
   取题（SPEC-BATCH38 §3 v3：题库封闭 20 题=4 章×5；每关 5 题）：
   静态关 flat<20：dch=diffOfCh(ch) 静态档，关内 5 题=章池 5 行 rotate (lv+k)%5
   （thanks 先例同构）；候选序 seeded 打散。
   生成关 flat≥20：dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*7919+847) 首随机数
   先取保确定性——b33 硬性②+quickcmp 先例；本款常量 847），再从该 dch 档行池
   seeded 无放回抽 5（域全档成立型：四档布局域均自洽）——同 flat 永远同关。
   阶段1 真值（v3 双答制——SPEC §3 独立推导式，verify 用独立副本复算禁抄本层）：
   dirAt(k)      = k % 2 === 0 ? 'cw' : 'ccw'（驱动轮 0 号恒 cw，相邻反向交替）
   conflict jam  = (blank % 2) !== ((n - 1 - blank) % 2)（双驱两端均 cw，两路奇偶
                   冲突=锁死「转不动」——代数等价 iff n 为偶数）
   speed dirAns  = dteeth === need ? 'same' : 'small'（啮合角速度与齿数成反比——
                   齿少者恒快；'big'=misconception 干扰恒非真值）
   候选去恒等：picks = [need] + NEIGHBOR[need]（邻档两干扰，|齿数差|∈{2,4}），
   seeded 打散 → answer = picks.indexOf(need) 唯一。
   quiz 结构：{ kind, layout, slots[], blank, need, dteeth, dirAns, jam, picks[],
   answer, obs, obsWin, phase(1 预判答|2 选齿数), _miss, _dirOk, _answered }
   slots[]：{ k, type('D'|'W'|'B'|'fix'|'blank'), gear(齿数档 id|'D'|'W'|'B'|null),
   teeth(数字|null), dir('cw'|'ccw'|'jam'|null——固定轮真值), meshed }
   铁律：每关 5 题；每题恰一枚正确候选（邻档池互异——structWhy 校验）；
   阶段1 未答对（_dirOk=false）阶段2 判定不可入（engTapGear null）。 */
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

/* ---------- 转向律（SPEC §0.93/§3 v3 数学锚——verify 独立复算依据） ---------- */
const dirAt = k => (k % 2 === 0 ? 'cw' : 'ccw');

/* ---------- 阶段1 真值推导（引擎真源；verify 独立副本禁调本函数） ---------- */
function deriveDirAns(row) {
  if (row.kind === 'speed') return row.dteeth === row.need ? 'same' : 'small';
  const n = row.layout.length, k = row.blank;
  if (row.kind === 'conflict') {
    const jam = (k % 2) !== ((n - 1 - k) % 2);   /* 双驱两路奇偶冲突=锁死 iff n 偶 */
    return jam ? 'jam' : dirAt(k);
  }
  return dirAt(k);
}

/* ---------- 布局解析：记法串 → 槽位骨架（D/W/B/x/_；fixes 表给 x 位齿数） ---------- */
function parseLayout(row) {
  const slots = [];
  const dt = row.dteeth || DTEETH_DEFAULT;         // 驱动轮齿数（speed 章 dteeth 表定）
  for (let k = 0; k < row.layout.length; k++) {
    const c = row.layout.charAt(k);
    if (c === 'D') slots.push({ k: k, type: 'D', gear: 'D', teeth: TEETH[dt], dir: 'cw', meshed: false });
    else if (c === 'W') slots.push({ k: k, type: 'W', gear: 'W', teeth: null, dir: dirAt(k), meshed: false });
    else if (c === 'B') slots.push({ k: k, type: 'B', gear: 'B', teeth: TEETH[DTEETH_DEFAULT], dir: 'cw', meshed: false });
    else if (c === 'x') slots.push({ k: k, type: 'fix', gear: row.fixes[k], teeth: TEETH[row.fixes[k]], dir: dirAt(k), meshed: false });
    else slots.push({ k: k, type: 'blank', gear: null, teeth: null, dir: null, meshed: false });
  }
  return slots;
}

/* ---------- seeded 打散（Fisher-Yates，确定性） ---------- */
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
  const slots = parseLayout(row);
  const picks = shuffled([row.need].concat(NEIGHBOR[row.need]), rnd);   // 去恒等邻档池
  const answer = picks.indexOf(row.need);                      // 唯一正确候选（先验验算 ✓）
  const dirAns = deriveDirAns(row);                            // 阶段1 真值（SPEC 独立式）
  return { kind: row.kind, layout: row.layout, slots: slots, blank: row.blank,
           need: row.need,
           dteeth: row.dteeth || DTEETH_DEFAULT,               // 驱动轮齿数档（非 speed 恒 t12）
           dirAns: dirAns, jam: dirAns === 'jam',
           picks: picks, answer: answer,
           obs: CHAPTERS[ch].obs, obsKey: CHAPTERS[ch].obsKey, obsWin: CHAPTERS[ch].obsWin,
           phase: 1, _miss: 0, _dirOk: false, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   静态关章池 rotate：flat 关 5 题 = SPEC_TABLE[(dch-1)*5 + (lv+k)%5]（章池全 5 题轮转取尽）
   生成关：dch=ri(rnd,1,4) 先取，再从 dch 档行池 seeded 无放回抽 5 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 847);                   // 本款常量 847（SPEC §0.93）
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

/* ---------- 阶段1 预判答引擎（无 DOM）：engTapDir(L, d) —— 选项 d（cw/ccw/jam/small/same/big）
   'ok'     答对：_dirOk=true，phase→2（开放选齿数）
   'wrong'  答错：该题 miss+1（retries 全关累计=星级口径），可重答
   null     关卡已结束 / 本题已答过 / 阶段1 已过 / 非法选项 ---------- */
function engTapDir(L, d) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q._dirOk || q.phase !== 1) return null;
  if (DIR_KINDS[q.kind].indexOf(d) < 0) return null;
  if (d === q.dirAns) {
    q._dirOk = true; q.phase = 2;
    return 'ok';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}

/* ---------- 阶段2 放齿轮引擎（无 DOM）：engTapGear(L, i) —— 点候选下标 i 的齿轮
   'meshed' 放对且本题完成推进 / 'done' 放对且末题=通关
   'wrong'  放错（干扰齿数不合槽）：miss+1，可重放
   null     阶段1 未答对（双答制顺序守卫）/ 非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapGear(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || !q._dirOk) return null;             // 双答制：先答预判再选尺寸
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) return null;
  if (i === q.answer) {
    q._answered = true;
    const bs = q.slots[q.blank];                               // 判定槽真值落位（渲染层 .meshed 之源）
    bs.gear = q.need; bs.teeth = TEETH[q.need]; bs.meshed = true;
    bs.dir = q.jam ? 'jam' : dirAt(bs.k);                      // jam 题锁死=演出不转锚
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'meshed';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.93 miss 口径）：全关放错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前步正确选项（阶段1=dirAns / 阶段2=answer 下标） */
const correctPick = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：
   布局域封闭（D 首位 / 尾位 W（dir|speed）或 B（conflict）/ 字符集 D W B x _ /
   恰 1 空槽 / blank 在 '_' 位非两端 / fixes 恰覆盖 x 位）
   / kind 域与布局匹配 / need∈齿数档域 / dteeth∈域
   / dirAns=deriveDirAns 复算 / picks=need+NEIGHBOR 邻档池（去恒等：差 2/4 互异）
   / answer=indexOf / 转向律真值（固定槽 dir===dirAt(k)；B 恒 cw）/ 初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (!CHAPTERS[dch]) return 'dch';
  const lay = q.layout;
  if (!lay || lay.length < 3 || lay.length > 6) return 'layout';
  if (lay.charAt(0) !== 'D') return 'head';                    // 驱动轮恒 0 号位
  const tail = lay.charAt(lay.length - 1);
  if (q.kind === 'conflict') { if (tail !== 'B') return 'tail'; }
  else if (tail !== 'W') return 'tail';                        // 风车恒链尾（conflict=B）
  let blanks = 0, dN = 0, wN = 0, bN = 0;
  const fixes = {};
  for (let i = 0; i < lay.length; i++) {
    const c = lay.charAt(i);
    if (c === '_') blanks++;
    else if (c === 'D') dN++;
    else if (c === 'W') wN++;
    else if (c === 'B') bN++;
    else if (c === 'x') fixes[i] = null;
    else return 'chr';
  }
  if (dN !== 1) return 'dw';
  if (q.kind === 'conflict' && bN !== 1) return 'dw';          // conflict 恰一 B
  if (q.kind !== 'conflict' && (wN !== 1 || bN !== 0)) return 'dw';
  if (blanks !== 1) return 'blanks';                           // v3 每题恰 1 判定空槽
  if (!Number.isInteger(q.blank) || q.blank < 1 || q.blank >= lay.length - 1) return 'blank';
  if (lay.charAt(q.blank) !== '_') return 'blankAt';
  if (q.kind !== 'dir' && q.kind !== 'speed' && q.kind !== 'conflict') return 'kind';
  if (q.kind === 'speed' && lay !== 'D_W') return 'speedLay';  // 传动比=两轮直驱
  if (!TEETH[q.need] || !TEETH[q.dteeth]) return 'need';       // 齿数档域（need/dteeth）
  /* 阶段1 真值自洽复算（q 自身字段——禁反查 SPEC_TABLE：rotate 行序会错位；
     行对账归 verify specFlow 独立通道） */
  if (q.dirAns !== deriveDirAns({ kind: q.kind, layout: q.layout, blank: q.blank,
                                  dteeth: q.dteeth, need: q.need })) return 'dirAns';
  if (q.jam !== (q.dirAns === 'jam')) return 'jam';
  if (q.picks.length !== 3) return 'picks';
  const pool = [q.need].concat(NEIGHBOR[q.need]);
  if (q.picks.slice().sort().join('') !== pool.slice().sort().join('')) return 'picksSet';   // 去恒等邻档池
  if (q.answer !== q.picks.indexOf(q.need) || q.answer < 0) return 'answer';   // 唯一（池互异已检）
  for (let i = 0; i < q.slots.length; i++) {                   // 槽位真值：固定轮 dir、空槽 null
    const s = q.slots[i];
    if (s.k !== i) return 'slotK';
    if ((lay.charAt(i) === 'x') !== (s.type === 'fix')) return 'slotFixAt';   // fixes 恰覆盖 x 位
    if (s.type === 'D' || s.type === 'B') {
      if (s.gear !== s.type || s.dir !== 'cw' || s.meshed || !s.teeth) return 'slotFix';
    } else if (s.type === 'W') {
      if (s.gear !== 'W' || s.dir !== dirAt(s.k) || s.meshed) return 'slotFix';
    } else if (s.type === 'fix') {
      if (!TEETH[s.gear] || s.teeth !== TEETH[s.gear] || s.dir !== dirAt(s.k) || s.meshed) return 'slotFix';
    } else if (s.type === 'blank') {
      if (s.gear !== null || s.dir !== null || s.meshed) return 'slotEmpty';
    } else return 'slotType';
  }
  if (q.phase !== 1 || q._miss !== 0 || q._dirOk || q._answered) return 'init';
  return null;
}
