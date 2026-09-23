/* ================= clock 纯引擎：确定性关卡生成（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH4 §1；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 认整点/半点（干扰=时针近邻+半点混淆）/ dch2 认五分钟刻度（干扰=镜像读针+相邻刻度）
   dch3 拨分针（5 分钟吸附，时针联动）/ dch4 经过时间（干扰=±5 分钟+整点混淆）
   clockMin = 12 小时制分钟数 0..719（0=12:00，60=1:00） */
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
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 时间格式：clockMin(0..719) → '12:00' / '1:05' ---------- */
const fmtClock = m => {
  const h = Math.floor(m / 60);
  return (h === 0 ? 12 : h) + ':' + String(m % 60).padStart(2, '0');
};
/* ---------- 镜像读针干扰：2:50 → 3:10（时针读到下一个数、分针反向，低龄经典错误） ---------- */
const mirrorOf = m => {
  const H = Math.floor(m / 60), mm = m % 60;
  return ((H + 1) * 60 + (60 - mm)) % 720;
};
/* ---------- 钟面指针角度（度，12 点方向为 0，顺时针；verify 钟面一致性用） ---------- */
const angleHour = m => m / 720 * 360;          // 时针：clockMin/720*360（含分针联动分量）
const angleMin = m => (m % 60) * 6;            // 分针：每分钟 6 度

/* ---------- 单题生成（rnd 全程同流保证确定性；used=同关去重键） ---------- */
function genOne(dch, lv, qi, rnd, used) {
  const H = ri(rnd, 0, 11);                    // 小时 0..11（显示 1..12）
  if (dch === 1) {                             // 认整点/半点：前期整点为主，后期混合
    const minute = lv < 2 ? (qi < 3 ? 0 : 30) : (rnd() < 0.5 ? 0 : 30);
    const target = H * 60 + minute;
    if (used.indexOf(target) >= 0) return null;
    used.push(target);
    const hourNbr = (H + (rnd() < 0.5 ? 1 : 11)) % 12 * 60 + minute;  // 时针近邻：相邻小时同时刻
    const halfConf = H * 60 + (minute === 0 ? 30 : 0);                // 半点混淆：同小时另半刻
    const items = shuffled([fmtClock(target), fmtClock(hourNbr), fmtClock(halfConf)], rnd);
    return { type: 'read', clockMin: target, items: items, answer: items.indexOf(fmtClock(target)),
      rules: ['hourNbr', 'halfConf'] };
  }
  if (dch === 2) {                             // 认五分钟刻度：分针任意 ×5（5..55），必有镜像干扰
    const minute = ri(rnd, 1, 11) * 5;
    const target = H * 60 + minute;
    if (used.indexOf(target) >= 0) return null;
    used.push(target);
    const mirror = mirrorOf(target);                                 // 镜像读针（必含）
    const d2m = minute === 5 ? 10 : minute === 55 ? 50 : minute + (rnd() < 0.5 ? -5 : 5);
    const step5 = H * 60 + d2m;                                      // 相邻 5 分钟刻度
    const items = shuffled([fmtClock(target), fmtClock(mirror), fmtClock(step5)], rnd);
    return { type: 'read', clockMin: target, items: items, answer: items.indexOf(fmtClock(target)),
      rules: ['mirror', 'step5'] };
  }
  if (dch === 3) {                             // 拨分针：目标任意 ×5（含 :00），拖拨判定
    const minute = ri(rnd, 0, 11) * 5;
    const target = H * 60 + minute;
    if (used.indexOf(target) >= 0) return null;
    used.push(target);
    return { type: 'dial', clockMin: target, items: [fmtClock(target)], answer: 0 };
  }
  /* dch === 4 经过时间：跨整点优先（如 2:40→3:05 过 25 分钟） */
  const DURS = [15, 20, 25, 30, 35, 40, 45, 50];
  const dur = DURS[ri(rnd, 0, DURS.length - 1)];
  const startMin = rnd() < 0.6
    ? ri(rnd, (60 - dur) / 5, 11) * 5          // 跨整点：startMin + dur ≥ 60
    : ri(rnd, 0, (55 - dur) / 5) * 5;          // 不跨：同一小时内
  const target = H * 60 + startMin;
  if (used.indexOf(target) >= 0) return null;
  used.push(target);
  let d1 = dur + (qi % 2 === 0 ? 5 : -5);      // ±5 分钟干扰（逐题交替方向）
  if (d1 < 5 || d1 > 55) d1 = dur + (qi % 2 === 0 ? -5 : 5);
  let d2 = 60 - dur;                           // 整点混淆：差多少到下一个整点
  if (d2 === dur || d2 === d1 || d2 < 5 || d2 > 55) d2 = dur + (d1 === dur + 5 ? -5 : 5);
  const lab = v => v + '分钟';
  const items = shuffled([lab(dur), lab(d1), lab(d2)], rnd);
  return { type: 'elapsed', clockMin: target, endMin: (target + dur) % 720, dur: dur,
    items: items, answer: items.indexOf(lab(dur)), rules: ['pm5', 'hourConf'] };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const used = [];
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    let q = null;
    for (let t = 0; t < 40 && !q; t++) q = genOne(dch, lv, qi, rnd, used);  // 撞目标重试兜底
    if (q) quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 答题引擎（无 DOM）：i = 答案按钮下标（read/elapsed 题）
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 首次点错（该按钮灰掉、计重试）
   'again' 点已灰按钮 / null 非点选题或关卡已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.type === 'dial') return null;
  q.wrong = q.wrong || [];
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  if (q.wrong.indexOf(i) >= 0) return 'again';
  q.wrong.push(i);
  L.retries++;
  return 'wrong';
}
/* ---------- 拨针判定（章 3）：mins=拨到的分钟数（0..59），吸附最近 5 分钟刻度后与目标比对
   'right'/'done' 吸附到位 / 'wrong' 松手不在目标刻度（计重试，零惩罚）/ 'bad' 非法输入 ---------- */
function engDial(L, mins) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.type !== 'dial') return null;
  if (typeof mins !== 'number' || !isFinite(mins)) return 'bad';
  const snap = ((Math.round(mins / 5) % 12) + 12) % 12 * 5;   // 吸附最近 5 分钟刻度（0..55）
  if (snap === q.clockMin % 60) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关全对（retries=0）=3 星；总重试 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：answer 在 items 中且唯一、选项无重复 ---------- */
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
