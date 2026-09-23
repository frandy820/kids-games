/* ================= errdoc 纯引擎：确定性关卡生成 + 三步诊判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 631)（本款常量 631，SPEC-BATCH35 §0.87 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC §0.87）：ch1=ans 20 内加减 / ch2=ans 表内乘法（fix≤20 域）/ ch3=num
   数字抄错 / ch4=混合三型（每题三型 seeded 取一）。静态关 flat0-14=QZ_BANK 静态表
   照录（同章各关同题同序）；flat15-19=ch4 构造；生成关 flat≥20 dch=ri(rnd,1,4)
   seeded 随机（b33 硬性②显式声明：域全档成立型）+按 dch 型构造公式生成新式
   （ans 加减=20 内新式（拒静态 ch1 sig）；ans 乘法=表内 fix≤20（拒 ch2 sig）；
   num=十几抄反 ab→ba 答案按 ba 算（拒 ch3 shown sig）；op=+/- 互换答案按错符算）。
   b34 坑③先验可满足性验算（2026-09-12 Python 等价模拟 flats 15-39）：
   生成器零空返回 / fix 恒 1-20 / dch 四档全现 {1:6,2:5,3:5,4:9} / dch4 合关三型
   全现（20-39 池化 {ans,num,op} 齐）/ 同关 5 题 sig 互异 ✓。
   quiz 结构：{ kind('errdoc' 恒), errType, shown{a,op,b,r}, orig{a,op,b}, fix,
   pills[3], phase('spot'|'fix'|'why'), _miss, _spotDone, _fixDone }
   miss 口径（b34 坑①）：步1 点正常部位与步2 选错药各计一次 miss——计数在本
   core 判定层；UI 层豁免窗 guard 在判定前拦且预判口径（i !== lesionOf(q) /
   q.pills[i] !== q.fix）与 core 判定严格同构。步3 归因不计 miss（非惩罚）。 */
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
const calc = (a, op, b) => op === '+' ? a + b : (op === '-' ? a - b : a * b);
const reverse2 = n => (n % 10) * 10 + Math.floor(n / 10);    // 两位数抄反：13↔31
/* 病灶映射（SPEC §0.87 定版三部位）：ans=答案 2 / num=左数 0 / op=运算符 1 */
const LESION = { ans: 2, num: 0, op: 1 };
const lesionOf = q => LESION[q.errType];

/* ---------- 静态题库 15 题（SPEC §4 全表照录禁改；verify 双录对账）
   行结构：{ t 错型, a, op, b, r }（shown 四元）+ fix + num 型 origA（正确原数）
   ch1 ans 加减：原式算对答案错（|r-fix|≤2 邻近误算）；
   ch2 ans 乘法：表内 fix≤20；
   ch3 num 抄错：shown=按抄错数算对的完整式（shown.r=calc(shown.a,op,b) 恒成立），
   fix=按原题算——孩子须发现「数不对」而非「答案错」。 ---------- */
const QZ_BANK = {
  1: [ /* SPEC §4 ch1：①13-5=9→fix8 ②7+6=12→fix13 ③15-8=8→fix7 ④9+9=17→fix18 ⑤16-7=10→fix9 */
    { t: 'ans', a: 13, op: '-', b: 5, r: 9,  fix: 8 },
    { t: 'ans', a: 7,  op: '+', b: 6, r: 12, fix: 13 },
    { t: 'ans', a: 15, op: '-', b: 8, r: 8,  fix: 7 },
    { t: 'ans', a: 9,  op: '+', b: 9, r: 17, fix: 18 },
    { t: 'ans', a: 16, op: '-', b: 7, r: 10, fix: 9 }
  ],
  2: [ /* SPEC §4 ch2：①3×4=14→fix12 ②2×7=12→fix14 ③4×4=18→fix16 ④5×3=16→fix15 ⑤3×3=8→fix9 */
    { t: 'ans', a: 3, op: '×', b: 4, r: 14, fix: 12 },
    { t: 'ans', a: 2, op: '×', b: 7, r: 12, fix: 14 },
    { t: 'ans', a: 4, op: '×', b: 4, r: 18, fix: 16 },
    { t: 'ans', a: 5, op: '×', b: 3, r: 16, fix: 15 },
    { t: 'ans', a: 3, op: '×', b: 3, r: 8,  fix: 9 }
  ],
  3: [ /* SPEC §4 ch3：①原13-5=8→shown 31-5=26 ②原15+4=19→shown 51+4=55 ③原16-9=7→shown 61-9=52
           ④原12+6=18→shown 21+6=27 ⑤原13-9=4→shown 31-9=22（fix=按原题算） */
    { t: 'num', a: 31, op: '-', b: 5, r: 26, fix: 8,  origA: 13 },
    { t: 'num', a: 51, op: '+', b: 4, r: 55, fix: 19, origA: 15 },
    { t: 'num', a: 61, op: '-', b: 9, r: 52, fix: 7,  origA: 16 },
    { t: 'num', a: 21, op: '+', b: 6, r: 27, fix: 18, origA: 12 },
    { t: 'num', a: 31, op: '-', b: 9, r: 22, fix: 4,  origA: 13 }
  ]
};
/* 静态 sig 集（生成题「新式」拒撞域：同型不与静态表撞 + 同关内互异） */
const STATIC_SIGS = {
  A: {}, M: {}, N: {}
};
(function () {
  for (let i = 0; i < 5; i++) {
    const r1 = QZ_BANK[1][i], r2 = QZ_BANK[2][i], r3 = QZ_BANK[3][i];
    STATIC_SIGS.A[r1.a + r1.op + r1.b] = 1;
    STATIC_SIGS.M[r2.a + '×' + r2.b] = 1;
    STATIC_SIGS.N[r3.a + r3.op + r3.b] = 1;
  }
})();

/* ---------- 药卡构造（确定性，禁用 rnd——同题恒同药卡）：fix+两个干扰
   （d1=fix±10 邻近 / d2=fix±1 邻近，域 0-20 互异），轮转 k=(fix+a+b)%3 定序 ---------- */
function pillSet(fix, a, b) {
  const d1 = fix >= 10 ? fix - 10 : fix + 10;
  const d2 = fix % 2 === 0 ? fix - 1 : fix + 1;
  const base = [fix, d1, d2];
  const k = (fix + a + b) % 3;
  return base.slice(k).concat(base.slice(0, k));
}
/* 行 → quiz 组装（shown/orig/fix/pills/相位与 miss 态初始化） */
function mkQuiz(row) {
  const t = row.t;
  const orig = t === 'num' ? { a: row.origA, op: row.op, b: row.b }
             : t === 'op' ? { a: row.a, op: row.origOp, b: row.b }
             : { a: row.a, op: row.op, b: row.b };
  return { kind: 'errdoc', errType: t,
           shown: { a: row.a, op: row.op, b: row.b, r: row.r },
           orig: orig, fix: row.fix,
           pills: pillSet(row.fix, row.a, row.b),
           phase: 'spot', _miss: 0, _spotDone: false, _fixDone: false };
}

/* ---------- 生成构造器（确定性公式，SPEC §4 ch4 规则；拒绝式保新式+同关互异）
   ans 加减：a/b 域保证 fix 1-20、r=fix±1/±2 误算邻近；
   ans 乘法：a,b∈2-5 排 5×5（fix≤20 域）、r=fix±1/±2/±3；
   num：原数 12-19（抄反≠自身）抄反 ab→ba，答案按 ba 算对（加法限 a0+b≤20）；
   op：+/- 互换（原 + 需 a>b 使错式 9-6=3 形态成立；原 - 需 a+b≤20 卡面友好）。 ---------- */
function genAnsAdd(rnd, used) {
  for (let g = 0; g < 60; g++) {
    const op = rnd() < 0.5 ? '+' : '-';
    let a, b, fix;
    if (op === '+') { a = ri(rnd, 5, 15); b = ri(rnd, 2, 9); fix = a + b; if (fix > 20) continue; }
    else { a = ri(rnd, 9, 19); b = ri(rnd, 2, 8); fix = a - b; }
    if (fix < 1) continue;
    if (STATIC_SIGS.A[a + op + b] || used['A' + a + op + b]) continue;
    let r = fix + (rnd() < 0.5 ? -1 : 1) * ri(rnd, 1, 2);
    if (r < 0) r = fix + 2;
    used['A' + a + op + b] = 1;
    return { t: 'ans', a: a, op: op, b: b, r: r, fix: fix };
  }
  return null;
}
function genAnsMul(rnd, used) {
  for (let g = 0; g < 60; g++) {
    const a = ri(rnd, 2, 5), b = ri(rnd, 2, 5);
    if (a === 5 && b === 5) continue;                       // fix ≤ 20（SPEC：乘法章 fix≤20 域）
    if (STATIC_SIGS.M[a + '×' + b] || used['M' + a + '×' + b]) continue;
    const fix = a * b;
    let r = fix + (rnd() < 0.5 ? -1 : 1) * ri(rnd, 1, 3);
    if (r < 0) r = fix + 1;
    used['M' + a + '×' + b] = 1;
    return { t: 'ans', a: a, op: '×', b: b, r: r, fix: fix };
  }
  return null;
}
function genNum(rnd, used) {
  for (let g = 0; g < 60; g++) {
    const a0 = ri(rnd, 12, 19);                             // 原数十几（12-19 抄反≠自身）
    const op = rnd() < 0.5 ? '+' : '-';
    let b;
    if (op === '+') { b = ri(rnd, 1, 9); if (a0 + b > 20) continue; }
    else { b = ri(rnd, 2, 9); if (b >= a0) continue; }
    const ra = reverse2(a0);                                // 抄反 13→31
    if (STATIC_SIGS.N[ra + op + b] || used['N' + ra + op + b]) continue;
    used['N' + ra + op + b] = 1;
    return { t: 'num', a: ra, op: op, b: b,
             r: calc(ra, op, b), fix: calc(a0, op, b), origA: a0 };
  }
  return null;
}
function genOp(rnd, used) {
  for (let g = 0; g < 40; g++) {
    const origOp = rnd() < 0.5 ? '+' : '-';
    let a, b;
    if (origOp === '+') { a = ri(rnd, 6, 9); b = ri(rnd, 2, a - 1); }          // 错式 - 需 a>b
    else {
      a = ri(rnd, 8, 15);
      const hi = Math.min(9, a - 2, 20 - a);                                   // 错式 + 需 a+b≤20
      if (hi < 2) continue;
      b = ri(rnd, 2, hi);
    }
    const showOp = origOp === '+' ? '-' : '+';
    if (used['O' + a + showOp + b]) continue;
    used['O' + a + showOp + b] = 1;
    return { t: 'op', a: a, op: showOp, b: b,
             r: calc(a, showOp, b), fix: calc(a, origOp, b), origOp: origOp };
  }
  return null;
}
/* 手解安全网（genLevel 极端防御；先验模拟证明不可达——flats 15-39 零空返回） */
const GEN_FALLBACKS = {
  A: { t: 'ans', a: 14, op: '-', b: 6, r: 9,  fix: 8 },
  M: { t: 'ans', a: 4,  op: '×', b: 3, r: 13, fix: 12 },
  N: { t: 'num', a: 41, op: '-', b: 8, r: 33, fix: 6, origA: 14 },
  O: { t: 'op',  a: 8,  op: '+', b: 5, r: 13, fix: 3, origOp: '-' }
};
function genRow(dch, rnd, used) {
  let row = null;
  if (dch === 1) row = genAnsAdd(rnd, used);
  else if (dch === 2) row = genAnsMul(rnd, used);
  else if (dch === 3) row = genNum(rnd, used);
  else {                                    // dch4 混合：每题三型 seeded 取一（SPEC §4）
    const t = ['ans', 'num', 'op'][ri(rnd, 0, 2)];
    row = t === 'ans' ? genAnsAdd(rnd, used) : (t === 'num' ? genNum(rnd, used) : genOp(rnd, used));
  }
  if (row) return row;
  const fk = dch === 2 ? 'M' : (dch === 3 ? 'N' : (dch === 4 ? 'O' : 'A'));
  return GEN_FALLBACKS[fk];
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   静态 flat0-14：QZ_BANK[dch] 照录同序；flat15-19=ch4 混合构造；
   生成关 flat≥20：dch=ri(rnd,1,4)（先取数保确定性）+按型构造新式。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 631);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let quizzes;
  if (dch <= 3 && flat < STATIC_LEVELS) {
    quizzes = QZ_BANK[dch].map(mkQuiz);                      // 静态 15 题照录（同章各关同题同序）
  } else {
    const used = {};                                         // 同关互异 sig（静态 sig 已在各构造器内拒）
    quizzes = [];
    for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(mkQuiz(genRow(dch, rnd, used)));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 三步诊引擎（无 DOM）
   engTapPart(L,i) 步1 点部位 i（0=左数/1=运算符/2=答案）：
     中病灶 'spot'（phase→'fix'）；正常部位 'wrong'（该题 miss+1=步1 计 miss）；
     null=关已结束/非 spot 相位/非法下标。
   engTapFix(L,i) 步2 点药卡 i：对 'fix'（phase→'why'）；错 'wrong'（miss+1）；
     null=非 fix 相位/越界。
   engTapWhy(L,i) 步3 归因三选（0/1/2 任何选择都接受，不计 miss）：
     末题步3 完 'done'（L.done）；否则 'why_done'（step++）；null=非 why 相位/越界。 ---------- */
function engTapPart(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'spot') return null;
  if (!Number.isInteger(i) || i < 0 || i > 2) return null;
  if (i === lesionOf(q)) {
    q._spotDone = true;
    q.phase = 'fix';
    return 'spot';
  }
  q._miss++;                                  /* miss 计数在 core 判定层（b34 坑①） */
  L.retries++;
  return 'wrong';
}
function engTapFix(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'fix') return null;
  if (!Number.isInteger(i) || i < 0 || i >= 3) return null;
  if (q.pills[i] === q.fix) {
    q._fixDone = true;
    q.phase = 'why';
    return 'fix';
  }
  q._miss++;                                  /* miss 计数在 core 判定层（b34 坑①） */
  L.retries++;
  return 'wrong';
}
function engTapWhy(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'why') return null;
  if (!Number.isInteger(i) || i < 0 || i > 2) return null;
  L.step++;                                   /* 任何选择都接受（元认知自评无真值，非惩罚） */
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'why_done';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径：步1+步2 各计，累计 L.retries）：0 错 3★ / 1-2 错 2★ / ≥3 错 1★，永不 0★ */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- TTS 段键（T46 化 2026-09-19：全式/提示句拆段 clip 拼播——零 keyless；
   eqTTS/hintTTS 整句 TTS 构造退役，verify 持独立 SPEC 副本对账）
   确认链尾段：[ed_n_a, ed_op_*, ed_n_b, ed_s_eq, ed_n_fix]（原 NUMCN[a]+op+NUMCN[b]+等于+NUMCN[fix]）；
   spot 提示尾段：[ed_s_here, ed_n_a | ed_op_*]（原「这里应该是」+正确原数/正确符号读法） ---------- */
const numClip = n => 'ed_n_' + n;
const OP_CLIP = { '+': 'ed_op_add', '-': 'ed_op_sub', '×': 'ed_op_mul' };
const opClip = op => OP_CLIP[op];
const eqParts = q => [numClip(q.orig.a), opClip(q.orig.op), numClip(q.orig.b), 'ed_s_eq', numClip(q.fix)];
const hintParts = q => ['ed_s_here', q.errType === 'num' ? numClip(q.orig.a) : opClip(q.orig.op)];
/* 提示泡卡面文案（阿拉伯数字/符号展示——与 TTS 中文读法分流） */
function hintShow(q) {
  return '这里应该是 ' + (q.errType === 'num' ? String(q.orig.a) : q.orig.op);
}
const pillIndexOf = q => q.pills.indexOf(q.fix);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：三错型不变量逐条
   （num/op 型 shown 恒算术自洽=「数对/符错答案对」，ans 型算式对仅答案错且
   误算邻近；orig↔shown 抄反/互换互推；fix=calc(orig) 恒 ≤20；药卡邻近域） ---------- */
function structWhy(q) {
  if (!q || q.kind !== 'errdoc') return 'kind';
  if (['ans', 'num', 'op'].indexOf(q.errType) < 0) return 'errType';
  const s = q.shown, o = q.orig;
  if (!s || !Number.isInteger(s.a) || !Number.isInteger(s.b) || !Number.isInteger(s.r)) return 'shownInt';
  if (!OP_WORD[s.op]) return 'shownOp';
  if (!o || !Number.isInteger(o.a) || !Number.isInteger(o.b) || !OP_WORD[o.op]) return 'orig';
  if (!Number.isInteger(q.fix) || q.fix !== calc(o.a, o.op, o.b)) return 'fixCalc';
  if (q.fix < 1 || q.fix > 20) return 'fixRange';
  if (q.errType === 'num') {
    if (s.r !== calc(s.a, s.op, s.b)) return 'numR';            // 答案按抄错数算对
    if (reverse2(s.a) !== o.a || reverse2(o.a) !== s.a) return 'numRev';   // 十几抄反互推
    if (o.a < 12 || o.a > 19) return 'numTeen';
  } else if (q.errType === 'op') {
    if (s.r !== calc(s.a, s.op, s.b)) return 'opR';             // 答案按错符算对
    if (s.op === o.op) return 'opSwap';                         // +/- 互换（× 不入 op 型）
    if ((s.op !== '+' && s.op !== '-') || (o.op !== '+' && o.op !== '-')) return 'opDom';
    if (s.a !== o.a || s.b !== o.b) return 'opAb';
  } else {
    if (s.a !== o.a || s.op !== o.op || s.b !== o.b) return 'ansEq';   // 算式本身对
    if (s.r === q.fix) return 'ansR';                                  // 答案必须错
    if (s.r < 0 || Math.abs(s.r - q.fix) > 3) return 'ansNear';        // 误算邻近（静态≤2 生成≤3）
  }
  if (s.r < 0) return 'rNeg';
  if (!Array.isArray(q.pills) || q.pills.length !== 3) return 'pillsLen';
  if (q.pills.filter(v => v === q.fix).length !== 1) return 'pillsFix';
  const ds = q.pills.filter(v => v !== q.fix);
  if (ds[0] === ds[1]) return 'pillsDup';
  const near = [q.fix - 10, q.fix - 1, q.fix + 1, q.fix + 10];
  if (!ds.every(v => v >= 0 && near.indexOf(v) >= 0)) return 'pillsNear';
  if (q.phase !== 'spot' || q._miss !== 0 || q._spotDone || q._fixDone) return 'init';
  return null;
}
