/* ================= column 纯引擎：确定性竖式题目生成 + 计划(plan)驱动进退位操作步与逐位填键判定
   （无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r15 章难度（SPEC-BATCH12 §3-r15；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 两位加法（qi0 不进位热身 / qi1-7 进位自点亮小 1）
     dch2 两位减法（qi0 不退位热身 / qi1-7 退位自点亮）
     dch3 三位数加减（qi0 加无标记 / qi1 减无标记 / qi2 加单进 / qi3 减单退 / qi4 加单进 /
          qi5 减单退 / qi6 加连进双标记 / qi7 减连退双标记）
     dch4 两步竖式（qi0 两步无标记 / qi1-4 恰一步有标记 / qi5-7 两步全标记；as=+后− / sa=−后+）
   生成关（flat≥STATIC_LEVELS）难度章 = ri(rnd,1,4) 随机取材（§0.3 batch11 M1 定版）
   ——生成关随机章在四型全域成立（每章型 qi 0-7 构造域全档可生成，§3-r15 先验验算）
   计划(plan)驱动（r15 核心 delta：进退位标记=玩家操作步，非系统代劳）：
     加法动作序（个位起）：填 i 位 →[满十?点亮进位小 1 于 i+1 列]→…（标记在填位后）
     减法动作序（个位起）：[不够减?点亮退位点于 i+1 列]→ 填 i 位 →…（标记在填位前）
     两步题=步 1 计划走完 → 换步 2（中间结果作步 2 首操作数）→ 步 2 计划
   miss 口径（题级 q.miss，不灰化）：填位错数字 / 标记相位按数字键（不可跳过）/
     同 op 槽位错点亮 = miss；提前点亮（后续将点亮的标记）与重复点已亮 = 轻反馈不 miss；
     异 op 槽位（减法点进位带/加法点数位格）= 惰性 no-op（返回 false，非数学断言不罚） */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const markKey = (t, col) => t + col;                     // 'c1'=进位到十位 / 'b2'=百位退位点

/* ---------- 单步竖式（两位/三位）：由数值独立推导计划（加=填后标记/减=标记后填） ---------- */
function buildStep(op, a, b) {
  const nd = op === 'add' ? (a + b >= 100 ? 3 : 2) : (a - b >= 100 ? 3 : 2);
  const dg = n => String(n).split('').reverse().map(Number);   // 个位起
  const A = dg(a), B = dg(b);
  const plan = [], marks = [], digits = [];
  if (op === 'add') {
    let carry = 0;
    for (let i = 0; i < nd; i++) {
      const s = (A[i] || 0) + (B[i] || 0) + carry;
      digits.push(s % 10);
      plan.push({ t: 'd', col: i, v: s % 10 });
      carry = s >= 10 ? 1 : 0;
      if (carry && i < nd - 1) { plan.push({ t: 'c', col: i + 1 }); marks.push(markKey('c', i + 1)); }
    }
  } else {
    let borrow = 0;
    for (let i = 0; i < nd; i++) {
      const av = (A[i] || 0) - borrow, r = av - (B[i] || 0);
      if (r < 0) {
        plan.push({ t: 'b', col: i + 1 }); marks.push(markKey('b', i + 1));
        digits.push(r + 10); plan.push({ t: 'd', col: i, v: r + 10 });
        borrow = 1;
      } else {
        digits.push(r); plan.push({ t: 'd', col: i, v: r });
        borrow = 0;
      }
    }
  }
  return { op: op, a: a, b: b, ans: op === 'add' ? a + b : a - b, nd: nd,
           plan: plan, digits: digits, marks: marks,
           pos: 0, cells: new Array(nd).fill(null), lit: [], miss: 0, solved: false };
}

/* ---------- 数值域（§3-r15 全封闭；ri 直接落域，无全域拒绝采样） ---------- */
function pickAdd2(rnd, carry) {
  if (carry) {
    const ta = ri(rnd, 1, 7), tb = ri(rnd, 1, 8 - ta);     // 十位和 ≤8（进 1 后 ≤9 → 和 ≤99）
    const oa = ri(rnd, 1, 9), ob = ri(rnd, 10 - oa, 9);    // 个位和 ≥10（进位）
    return [ta * 10 + oa, tb * 10 + ob];
  }
  const ta = ri(rnd, 1, 8), tb = ri(rnd, 1, 9 - ta);       // 十位和 ≤9 → 和 ≤99
  const oa = ri(rnd, 0, 9), ob = ri(rnd, 0, 9 - oa);       // 个位和 ≤9（不进位）
  return [ta * 10 + oa, tb * 10 + ob];
}
function pickSub2(rnd, borrow) {
  if (borrow) {
    const ta = ri(rnd, 3, 9), tb = ri(rnd, 1, ta - 2);      // 十位差 ≥2（借 1 后仍 ≥1 → 差 ≥10）
    const oa = ri(rnd, 0, 8), ob = ri(rnd, oa + 1, 9);      // 个位不够减（退位借 1）
    return [ta * 10 + oa, tb * 10 + ob];
  }
  const ta = ri(rnd, 2, 9), tb = ri(rnd, 1, ta - 1);       // 十位差 ≥1 → 差 ≥10
  const oa = ri(rnd, 0, 9), ob = ri(rnd, 0, oa);           // 个位够减（不退位）
  return [ta * 10 + oa, tb * 10 + ob];
}
/* 三位数加：varr 'nc' 无进位 / 'o' 仅个位进 / 't' 仅十位进 / 'cc' 连续进位（双标记） */
function pickAdd3(rnd, varr) {
  let ha, hb, ta, tb, oa, ob;
  if (varr === 'nc') {
    ha = ri(rnd, 1, 8); hb = ri(rnd, 1, 9 - ha);
    ta = ri(rnd, 0, 9); tb = ri(rnd, 0, 9 - ta);
    oa = ri(rnd, 0, 9); ob = ri(rnd, 0, 9 - oa);
  } else if (varr === 'o') {
    ha = ri(rnd, 1, 8); hb = ri(rnd, 1, 9 - ha);           // 百位和 ≤9（无百位进 → 和三位）
    ta = ri(rnd, 0, 8); tb = ri(rnd, 0, 8 - ta);           // 十位和 ≤8（+1 后 ≤9 不二连进）
    oa = ri(rnd, 1, 9); ob = ri(rnd, 10 - oa, 9);          // 个位和 ≥10
  } else if (varr === 't') {
    ha = ri(rnd, 1, 7); hb = ri(rnd, 1, 8 - ha);           // 百位和 ≤8（+1 后 ≤9 → 和三位；ha ≤7 防空区间）
    ta = ri(rnd, 1, 9); tb = ri(rnd, 10 - ta, 9);          // 十位和 ≥10（进百位）
    oa = ri(rnd, 0, 9); ob = ri(rnd, 0, 9 - oa);           // 个位和 ≤9
  } else {                                                  // 'cc' 连续进位
    ha = ri(rnd, 1, 7); hb = ri(rnd, 1, 8 - ha);           // 百位和 ≤8（+1 后 ≤9 → 和三位；ha ≤7 防空区间）
    ta = ri(rnd, 0, 9); tb = ri(rnd, 9 - ta, 9);           // 十位和 ≥9（+1 ≥10 二连进）
    oa = ri(rnd, 1, 9); ob = ri(rnd, 10 - oa, 9);          // 个位和 ≥10
  }
  return [ha * 100 + ta * 10 + oa, hb * 100 + tb * 10 + ob];
}
/* 三位数减：varr 'nb' 无退位 / 'o' 仅个位退 / 't' 仅十位退 / 'bb' 连续退位（双标记） */
function pickSub3(rnd, varr) {
  let ha, hb, ta, tb, oa, ob;
  if (varr === 'nb') {
    ha = ri(rnd, 2, 9); hb = ri(rnd, 1, ha - 1);           // 百位差 ≥1 → 差三位
    ta = ri(rnd, 0, 9); tb = ri(rnd, 0, ta);
    oa = ri(rnd, 0, 9); ob = ri(rnd, 0, oa);
  } else if (varr === 'o') {
    ha = ri(rnd, 2, 9); hb = ri(rnd, 1, ha - 1);           // 百位差 ≥1（无百位退 → 差三位）
    ta = ri(rnd, 1, 9); tb = ri(rnd, 0, ta - 1);           // 十位借 1 后仍够减（ta−1 ≥ tb）
    oa = ri(rnd, 0, 8); ob = ri(rnd, oa + 1, 9);           // 个位不够减
  } else if (varr === 't') {
    ha = ri(rnd, 3, 9); hb = ri(rnd, 1, ha - 2);           // 百位差 ≥2（借 1 后 ≥1 → 差三位）
    ta = ri(rnd, 0, 8); tb = ri(rnd, ta + 1, 9);           // 十位不够减（向百位借）
    oa = ri(rnd, 0, 9); ob = ri(rnd, 0, oa);               // 个位够减（仅十位退）
  } else {                                                  // 'bb' 连续退位
    ha = ri(rnd, 3, 9); hb = ri(rnd, 1, ha - 2);           // 百位差 ≥2（借 1 后 ≥1 → 差三位）
    ta = ri(rnd, 0, 8); tb = ri(rnd, ta + 1, 9);           // 十位借 1 后仍不够（ta−1 < tb）
    oa = ri(rnd, 0, 8); ob = ri(rnd, oa + 1, 9);           // 个位不够减
  }
  return [ha * 100 + ta * 10 + oa, hb * 100 + tb * 10 + ob];
}

/* ---------- 单题生成（章型+题序定变体；确定性同 rnd 流） ---------- */
function genQuiz(dch, qi, rnd, used) {
  for (let t = 0; t < 80; t++) {                           // 同关无重复题（80 次兜底）
    let q;
    if (dch === KIND_ADD2) {
      const [a, b] = pickAdd2(rnd, qi > 0);
      q = quizOfSingle('add', a, b);
    } else if (dch === KIND_SUB2) {
      const [a, b] = pickSub2(rnd, qi > 0);
      q = quizOfSingle('sub', a, b);
    } else if (dch === KIND_MIX3) {                        // 三位混合章：奇偶交替加减
      if (qi % 2 === 0) {
        const varr = qi === 0 ? 'nc' : (qi === 6 ? 'cc' : (rnd() < 0.5 ? 'o' : 't'));
        const [a, b] = pickAdd3(rnd, varr);
        q = quizOfSingle('add', a, b);
      } else {
        const varr = qi === 1 ? 'nb' : (qi === 7 ? 'bb' : (rnd() < 0.5 ? 'o' : 't'));
        const [a, b] = pickSub3(rnd, varr);
        q = quizOfSingle('sub', a, b);
      }
    } else {                                                // KIND_TWO 两步竖式
      const form = qi % 2 === 0 ? 'as' : 'sa';             // as/sa 确定性交替
      /* 标记分布：qi0 两步无标记 / qi1-4 恰一步 / qi5-7 两步全标记 */
      const both = qi >= 5, none = qi === 0;
      q = genTwo(form, rnd, none, both);
      if (!q) continue;                                     // 步 2 域不可满足 → 重试（域充裕）
    }
    if (!used || used.indexOf(q.text) < 0) return q;
  }
  return null;                                              // 域耗尽（先验保证不达；verify 兜断言）
}

function quizOfSingle(op, a, b) {
  const st = buildStep(op, a, b);
  return attachDur({ form: null, op: op, a: a, b: b, ans: st.ans, nd: st.nd,
                     steps: [st], si: 0, miss: 0, solved: false,
                     text: a + (op === 'add' ? '+' : '-') + b });
}
/* 步 2 第二操作数按首操作数（mid）定域构造：null=该变体对此 mid 不可满足（外层重试步 1） */
function pickSub2From(a, rnd, borrow) {
  const ta = Math.floor(a / 10), oa = a % 10;
  if (borrow) {
    if (ta < 3 || oa > 8) return null;                    // 借位需十位 ≥3（差 ≥10）且个位可借（≤8）
    return ri(rnd, 1, ta - 2) * 10 + ri(rnd, oa + 1, 9);
  }
  if (ta < 2) return null;                                // 不退位需十位差 ≥1（差 ≥10）
  return ri(rnd, 1, ta - 1) * 10 + ri(rnd, 0, oa);
}
function pickAdd2From(a, rnd, carry) {
  const ta = Math.floor(a / 10), oa = a % 10;
  if (carry) {
    if (ta > 7 || oa < 1) return null;                    // 进位需十位和 ≤8（+1 ≤9）且个位和可 ≥10
    return ri(rnd, 1, 8 - ta) * 10 + ri(rnd, 10 - oa, 9);
  }
  if (ta > 8) return null;                                // 不进位需十位和 ≤9
  return ri(rnd, 1, 9 - ta) * 10 + ri(rnd, 0, 9 - oa);
}
function genTwo(form, rnd, none, both) {
  /* 步 1：as=加 / sa=减；步 2：as=减 / sa=加（中间结果作步 2 首操作数） */
  const mk1 = none ? false : (both ? true : rnd() < 0.5);   // 恰一步=seeded 选步 1 或步 2 带标记
  const mk2 = none ? false : (both ? true : !mk1);
  for (let t = 0; t < 80; t++) {
    const p1 = form === 'as' ? pickAdd2(rnd, mk1) : pickSub2(rnd, mk1);
    const s1 = buildStep(form === 'as' ? 'add' : 'sub', p1[0], p1[1]);
    const mid = s1.ans;
    const c2 = form === 'as' ? pickSub2From(mid, rnd, mk2) : pickAdd2From(mid, rnd, mk2);
    if (c2 == null) continue;                              // 步 2 变体对此 mid 不可满足 → 重试步 1
    const s2 = buildStep(form === 'as' ? 'sub' : 'add', mid, c2);
    if (s2.nd !== 2) continue;                             // 步 2 结果恒两位（域保证，防御断言）
    return attachDur({ form: form, op: s1.op, a: s1.a, b: s1.b, c: s2.b, mid: mid, ans: s2.ans,
                       nd: 2, steps: [s1, s2], si: 0, miss: 0, solved: false,
                       text: s1.a + (form === 'as' ? '+' : '-') + s1.b + (form === 'as' ? '-' : '+') + s2.b });
  }
  return null;
}
/* 时长模型挂账（data 的 quizDurMs 消费）：planLen/planDecide/twoStart */
function attachDur(q) {
  const s1 = q.steps[0], s2 = q.steps[1];
  q.planLen = s1.plan.length + (s2 ? s2.plan.length : 0);
  q.planDecide = s1.plan.map(p => p.t === 'd' ? DECIDE_INPUT_MS : DECIDE_MARK_MS)
    .concat(s2 ? s2.plan.map(p => p.t === 'd' ? DECIDE_INPUT_MS : DECIDE_MARK_MS) : []);
  q.twoStart = s2 ? s1.plan.length : null;
  return q;
}

/* ---------- 关卡生成（静态 32 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const gen = flat >= STATIC_LEVELS;                    // 静态 32 关之外=无限生成关
  const dch = gen ? ri(rnd, 1, 4) : diffOfCh(ch);       // 生成关难度章随机（先取数保确定性）
  const used = [];
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genQuiz(dch, qi, rnd, used);
    used.push(q.text);
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, gen, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 引擎动作判定（无 DOM） ----------
   curActOf(L)：当前步当前 plan 动作；engKey(L,d)=数字键；engMark(L,t,col)=标记槽
   返回：'right' 填对推进 / 'mark' 标记点亮 / 'step2' 两步题步 1 完成换步 /
        'done' 末题末位（整关通关） / 'wrong' miss（题级计数） /
        'early' 轻反馈不 miss（提前点亮/重复点已亮） / null=非法或关末 /
        false=惰性 no-op（异 op 槽位：非数学断言不罚，UI 静默） ---------- */
const curStepOf = L => {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  return q.steps[q.si];
};
const curActOf = s => s.plan[s.pos];
function advStep(L, q, s, r) {                           // 末位填对：换步/换题/通关
  s.solved = true;
  if (q.steps[1] && q.si === 0) { q.si = 1; return 'step2'; }
  q.solved = true;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return r;                                              // 'right'（换题）
}
function miss(L, q) { q.miss++; L.retries++; }         /* 题级 miss 计数（不灰化款无上限） */
function engKey(L, d) {
  const s = curStepOf(L);
  if (!s) return null;
  if (!Number.isInteger(d) || d < 0 || d > 9) return null;
  const q = L.quizzes[L.step];
  const act = curActOf(s);
  if (act.t !== 'd') { miss(L, q); return 'wrongmark'; } /* 标记相位按数字键=miss（不可跳过，方向分型） */
  if (d !== act.v) { miss(L, q); return 'wrong'; }      /* 填错：零惩罚同位重填（不灰化可重点） */
  s.cells[act.col] = d;
  s.pos++;
  if (s.pos >= s.plan.length) return advStep(L, q, s, 'right');
  return 'right';
}
function engMark(L, t, col) {
  const s = curStepOf(L);
  if (!s) return null;
  if ((t !== 'c' && t !== 'b') || !Number.isInteger(col) || col < 1 || col > 2) return null;
  const q = L.quizzes[L.step];
  const act = curActOf(s);
  const key = markKey(t, col);
  if (act.t === t && act.col === col) {                 /* 当前应点标记：点亮推进 */
    s.lit.push(key);
    s.pos++;
    if (s.pos >= s.plan.length) return advStep(L, q, s, 'mark');   /* 末动作恒为填位，此支防御 */
    return 'mark';
  }
  if (s.op === 'add' && t === 'b') return false;        /* 异 op 槽位：惰性 no-op 不罚 */
  if (s.op === 'sub' && t === 'c') return false;
  if (s.plan.some(p => p.t === t && p.col === col && s.lit.indexOf(key) < 0))
    return 'early';                                     /* 提前点亮（后续将点）/未到相位：轻反馈不 miss */
  if (s.lit.indexOf(key) >= 0) return 'early';          /* 重复点已亮：轻反馈不 miss */
  miss(L, q); return 'wrongslot';                       /* 同 op 错点亮（本题无此标记/位置错）=miss */
}
/* 星级：一关零错次=3 星；错次 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：数值域+计划+标记独立语义审计（不抄生成器分支，防两套逻辑同错）
   auditStep：从 (op,a,b) 独立位算复推 marks/digits/plan 并对账（auditQuiz 调） ---------- */
function auditStep(st) {
  if (!st || !Number.isInteger(st.a) || !Number.isInteger(st.b) || !Number.isInteger(st.ans)) return false;
  const nd = st.nd;
  if (nd !== 2 && nd !== 3) return false;
  const lo = nd === 2 ? 10 : 100, hi = nd === 2 ? 99 : 999;
  if (st.a < lo || st.a > hi || st.b < lo || st.b > hi) return false;               // 操作数 nd 位数
  if (st.ans !== (st.op === 'add' ? st.a + st.b : st.a - st.b)) return false;       // 总账
  if (st.ans < lo || st.ans > hi) return false;                                     // 结果 nd 位禁前导 0
  if (st.op === 'sub' && st.a <= st.b) return false;                                // 减法 a>b 禁负
  /* 独立位算（个位起）：进/退位标记复推 */
  const A = String(st.a).split('').reverse().map(Number);
  const B = String(st.b).split('').reverse().map(Number);
  const marks = [], digits = [], plan = [];
  if (st.op === 'add') {
    let carry = 0;
    for (let i = 0; i < nd; i++) {
      const sum = (A[i] || 0) + (B[i] || 0) + carry;
      digits.push(sum % 10); plan.push({ t: 'd', col: i, v: sum % 10 });
      carry = sum >= 10 ? 1 : 0;
      if (carry && i < nd - 1) { plan.push({ t: 'c', col: i + 1 }); marks.push(markKey('c', i + 1)); }
    }
    if (carry) return false;                                                        // 百位禁再进（结果恒 nd 位）
  } else {
    let borrow = 0;
    for (let i = 0; i < nd; i++) {
      const av = (A[i] || 0) - borrow, r = av - (B[i] || 0);
      if (r < 0) {
        if (i >= nd - 1) return false;                                              // 顶位禁再借（a>b 保证）
        plan.push({ t: 'b', col: i + 1 }); marks.push(markKey('b', i + 1));
        digits.push(r + 10); plan.push({ t: 'd', col: i, v: r + 10 });
        borrow = 1;
      } else { digits.push(r); plan.push({ t: 'd', col: i, v: r }); borrow = 0; }
    }
  }
  if (JSON.stringify(st.marks) !== JSON.stringify(marks)) return false;             // 标记集合对账
  if (JSON.stringify(st.digits) !== JSON.stringify(digits)) return false;           // 填序数字对账
  if (st.plan.length !== plan.length) return false;
  for (let k = 0; k < plan.length; k++) {                                            // 计划序对账（标记相位）
    if (st.plan[k].t !== plan[k].t || st.plan[k].col !== plan[k].col) return false;
    if (st.plan[k].v !== plan[k].v) return false;
  }
  return true;
}
/* 章型契约：dch+qi → (op/nd/标记总数) 期望（SPEC §3-r15 章型表独立硬编码） */
function auditProfile(dch, qi, q) {
  const s1 = q.steps[0], s2 = q.steps[1];
  const n1 = s1.marks.length, n2 = s2 ? s2.marks.length : 0;
  if (dch === KIND_ADD2) return s1.op === 'add' && s1.nd === 2 && !s2 &&
    n1 === (qi === 0 ? 0 : 1);
  if (dch === KIND_SUB2) return s1.op === 'sub' && s1.nd === 2 && !s2 &&
    n1 === (qi === 0 ? 0 : 1);
  if (dch === KIND_MIX3) {                               // 混合章：奇偶交替；qi0/1 热身 0 标记
    if (qi % 2 === 0) return s1.op === 'add' && s1.nd === 3 && !s2 &&
      n1 === (qi === 0 ? 0 : (qi === 6 ? 2 : 1));
    return s1.op === 'sub' && s1.nd === 3 && !s2 &&
      n1 === (qi === 1 ? 0 : (qi === 7 ? 2 : 1));
  }
  /* KIND_TWO：两位两步；as/sa 交替；qi0 全无 / qi1-4 恰一 / qi5-7 全有 */
  if (!s2 || s1.nd !== 2 || s2.nd !== 2) return false;
  if (q.form !== (qi % 2 === 0 ? 'as' : 'sa')) return false;
  if (s1.op !== (q.form === 'as' ? 'add' : 'sub')) return false;
  if (s2.op !== (q.form === 'as' ? 'sub' : 'add')) return false;
  const total = n1 + n2;
  return total === (qi === 0 ? 0 : (qi <= 4 ? 1 : 2));
}
function auditQuiz(dch, qi, q) {
  if (!q) return false;
  if (!q.steps.every(auditStep)) return false;
  if (q.steps[1]) {                                     // 两步：mid 链路对账
    if (q.mid !== q.steps[0].ans) return false;
    if (q.steps[1].a !== q.mid) return false;
    if (q.ans !== q.steps[1].ans) return false;
    if (q.a !== q.steps[0].a || q.b !== q.steps[0].b || q.c !== q.steps[1].b) return false;
  } else {
    if (q.a !== q.steps[0].a || q.b !== q.steps[0].b || q.ans !== q.steps[0].ans) return false;
  }
  return auditProfile(dch, qi, q);
}
