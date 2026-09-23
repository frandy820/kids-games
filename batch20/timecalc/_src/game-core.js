/* ================= timecalc 纯引擎：确定性关卡生成 + 单选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   §0.43 真值：星期推算=严格模 7 算术（生成期即保证，verify 侧独立计算器分源对账）；
   时间运算=分钟制换算（h*60+m 统一基，跨夜 +1440）；干扰=合法格式且 ∉ answer、卡值互异。
   数据模型：q.answer=正确卡 idx（单选制）；q.opts=[{v 文本, img}] 恰 4 张；
   辅助字段（钩子契约+时长模型）：q.dur=elapse/comp/compd 经过分钟数、q.startH/endH=night
   晚睡/早起时、q.table/q.stype/q.askRow=sched 作息表三问型、q.days=span 差值。 */
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
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
/* §0.43 严格模 7 环回（JS 负数 % 为负，统一补正；星期日→星期一过星期六） */
const mod7 = x => ((x % 7) + 7) % 7;
const M5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];   // 5 分钟刻度全域
/* 进度章号单调递增（每章 LEVELS_PER_CH=10 关）；难度章号：静态关 (ch-1)%4+1 循环，
   生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / LEVELS_PER_CH) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 正确答案文本（§0.43 真值公式；verify 侧 refAnswer 分源双写对账）
   clock5：h:mm（分钟两位 5 刻）；elapse：起点+N 分钟同日（h*60+m+dur ≤ 11:55）；
   plus：mod7(today+plus) 环回；minus：mod7(today-back) 环回（负数补正）；
   span：B−A 不含今天 = mod7(to-from) 天；
   comp：下午起点+N（'下午h:mm'）；compd：晚上 11:mm+N 过半夜 12 点 → 次日
   （23*60+m+dur−1440 落 0:mm2 → 12 小时制 '12:mm2'，星期 = mod7(today+1)）；
   night：12−startH+endH 小时（晚 startH 睡→次日 endH 起，跨夜分段和）；
   sched：dur=行分钟差 / find=问刻活动名 / long=最长行活动名 ---------- */
const ansTextOf = (kind, pr) =>
  kind === 'clock5' ? fmtTime(pr.hour, pr.minute) :
  kind === 'elapse' ? fmtTime(Math.floor((pr.hour * 60 + pr.minute + pr.dur) / 60),
                              (pr.hour * 60 + pr.minute + pr.dur) % 60) :
  kind === 'plus'  ? WEEK[mod7(pr.today + pr.plus)] :
  kind === 'minus' ? WEEK[mod7(pr.today - pr.back)] :
  kind === 'span'  ? mod7(pr.to - pr.from) + ' 天' :
  kind === 'comp'  ? '下午' + fmtTime(Math.floor((pr.hour * 60 + pr.minute + pr.dur) / 60),
                                      (pr.hour * 60 + pr.minute + pr.dur) % 60) :
  kind === 'compd' ? WEEK[mod7(pr.today + 1)] + ' ' + fmtTime(12, pr.minute + pr.dur - 60) :
  kind === 'night' ? (12 - pr.startH + pr.endH) + ' 小时' :
  pr.stype === 'dur' ? ((pr.rowE - pr.rowS) + ' 分钟') : pr.rowName;

/* ---------- 组装（候选池=[answer]+3 干扰洗牌；answer=正确卡 idx） ---------- */
function finishQuiz(kind, pr, distract, rnd) {
  const ansV = ansTextOf(kind, pr);
  const opts = shuffled([ansV].concat(distract), rnd);
  return {
    kind: kind,
    stype: kind === 'sched' ? pr.stype : null,
    hour: kind === 'clock5' || kind === 'elapse' || kind === 'comp' ? pr.hour : null,
    minute: kind === 'clock5' || kind === 'elapse' || kind === 'comp' || kind === 'compd' ? pr.minute : null,
    today: kind === 'plus' || kind === 'minus' || kind === 'comp' || kind === 'compd' ? pr.today : null,
    plus: kind === 'plus' ? pr.plus : null,
    back: kind === 'minus' ? pr.back : null,
    from: kind === 'span' ? pr.from : null,
    to: kind === 'span' ? pr.to : null,
    days: kind === 'span' ? mod7(pr.to - pr.from) : null,
    dur: kind === 'elapse' || kind === 'comp' || kind === 'compd' ? pr.dur : null,
    startH: kind === 'night' ? pr.startH : null,
    endH: kind === 'night' ? pr.endH : null,
    table: kind === 'sched' ? pr.table.map(r => ({ name: r.name, sh: r.sh, sm: r.sm, eh: r.eh, em: r.em })) : null,
    askRow: kind === 'sched' ? (pr.askRow == null ? -1 : pr.askRow) : -1,
    answer: opts.indexOf(ansV),
    opts: opts.map(v => ({ v: v, img: null })),
    miss: 0, solved: false
  };
}
/* 干扰池去重取 3（候选互异且 ≠answer；不足 3 由 genLevel sig 重生成/兜底防） */
function uniq3(cands, ansV) {
  const seen = {};
  seen[ansV] = 1;
  const out = [];
  for (const v of cands) {
    if (seen[v]) continue;
    seen[v] = 1;
    out.push(v);
    if (out.length === 3) break;
  }
  return out;
}

/* ---------- ch1·clock5 钟面 5 分钟刻读刻：minute∈M5 全域，hour 1-12
   干扰=时针±1 同分（时针误读）+ 分针数刻偏 1 格——全为合法 5 刻时刻 ---------- */
function genClock5Quiz(rnd) {
  const hour = ri(rnd, 1, 12), minute = pick(rnd, M5);
  const mNear = minute === 55 ? 50 : (minute === 0 ? 5 : (rnd() < 0.5 ? minute - 5 : minute + 5));
  const distract = uniq3([
    fmtTime(hour % 12 + 1, minute),                     // 时针多读 1（8:05→9:05）
    fmtTime(hour === 1 ? 12 : hour - 1, minute),        // 时针少读 1
    fmtTime(hour, mNear)                                // 分针数刻偏 1 格
  ], fmtTime(hour, minute));
  return finishQuiz('clock5', { hour: hour, minute: minute }, distract, rnd);
}
/* ---------- ch1·elapse 同日经过时间：起点 h∈2-10、N 5 倍数（nLo-nHi）；终点 ≤11:55
   （不越上午界，verify ① 独立复算）；跨小时进位（3:50+20→4:10）为核心练习
   干扰=原时刻/分对了时针没进位/时针±1/分±5 ---------- */
function genElapseQuiz(rnd, nLo, nHi) {
  let hour, minute, dur;
  do {
    hour = ri(rnd, 2, 10);
    minute = pick(rnd, M5);
    dur = ri(rnd, nLo / 5, nHi / 5) * 5;
  } while (hour * 60 + minute + dur > 11 * 60 + 55);
  const t2 = hour * 60 + minute + dur;
  const h2 = Math.floor(t2 / 60), m2 = t2 % 60;
  const distract = uniq3([
    fmtTime(hour, minute),                              // 原时刻（没加 N）
    fmtTime(hour, m2),                                  // 分对了时针没进位
    fmtTime(h2 % 12 + 1, m2),                           // 时针多读 1
    fmtTime(h2 === 1 ? 12 : h2 - 1, m2),                // 时针少读 1
    fmtTime(h2, m2 === 55 ? 50 : (m2 === 0 ? 5 : m2 - 5)),
    fmtTime(h2, m2 === 55 ? 0 : m2 + 5)
  ], fmtTime(h2, m2));
  return finishQuiz('elapse', { hour: hour, minute: minute, dur: dur }, distract, rnd);
}
/* ---------- 星期顺推/逆推干扰：answer±1（多数/少数一天）+ today（没推算直接选今天）
   候选序去重取 3（N=6/7/8 时 a±1 会与 today 重合，须去重防重复卡 §0.43） ---------- */
function weekDistract(aDay, today) {
  const seen = {};
  seen[aDay] = 1;
  const out = [];
  for (const c of [aDay + 1, today, aDay + 6, aDay + 2, aDay + 5, aDay + 3, aDay + 4]) {
    const d = mod7(c);
    if (seen[d]) continue;
    seen[d] = 1;
    out.push(WEEK[d]);
    if (out.length === 3) break;
  }
  return out;
}
function genPlusQuiz(rnd, nLo, nHi) {
  const today = ri(rnd, 0, 6), plus = ri(rnd, nLo, nHi);
  return finishQuiz('plus', { today: today, plus: plus },
    weekDistract(mod7(today + plus), today), rnd);
}
function genMinusQuiz(rnd, nLo, nHi) {
  const today = ri(rnd, 0, 6), back = ri(rnd, nLo, nHi);
  return finishQuiz('minus', { today: today, back: back },
    weekDistract(mod7(today - back), today), rnd);
}
/* ---------- 区间差（span）：从 from 到 to 经过 (to-from+7)%7 天（B−A 不含今天 §0.43）
   干扰=合法天数（1-6，≠answer，互异）：偏移序取前 3 ---------- */
function genSpanQuiz(rnd, dLo, dHi) {
  const from = ri(rnd, 0, 6);
  const d = ri(rnd, dLo, dHi);
  const to = (from + d) % 7;
  const distract = [];
  for (const o of [1, -1, 2, 3, -2, 4, -3, 5, -4]) {
    const v = d + o;
    if (v >= 1 && v <= 6 && v !== d && distract.indexOf(v) < 0) distract.push(v);
    if (distract.length === 3) break;
  }
  return finishQuiz('span', { from: from, to: to },
    distract.map(v => v + ' 天'), rnd);
}
/* ---------- ch3·comp 同日复合：星期冗余+下午 h:mm+N 分钟（终点 ≤11:55 下午）
   干扰=原时刻/时针±1/分±5（星期冗余只进题面不进卡——剥离冗余=本题认知点） ---------- */
function genCompQuiz(rnd, nLo, nHi) {
  const today = ri(rnd, 0, 6);
  let hour, minute, dur;
  do {
    hour = ri(rnd, 1, 10);
    minute = pick(rnd, M5);
    dur = ri(rnd, nLo / 5, nHi / 5) * 5;
  } while (hour * 60 + minute + dur > 11 * 60 + 55);
  const t2 = hour * 60 + minute + dur;
  const h2 = Math.floor(t2 / 60), m2 = t2 % 60;
  const distract = uniq3([
    '下午' + fmtTime(hour, minute),                     // 原时刻（没加 N）
    '下午' + fmtTime(h2 % 12 + 1, m2),                  // 时针多读 1
    '下午' + fmtTime(h2 === 1 ? 12 : h2 - 1, m2),       // 时针少读 1
    '下午' + fmtTime(h2, m2 === 55 ? 50 : (m2 === 0 ? 5 : m2 - 5)),
    '下午' + fmtTime(h2, m2 === 55 ? 0 : m2 + 5)
  ], '下午' + fmtTime(h2, m2));
  return finishQuiz('comp', { hour: hour, minute: minute, dur: dur, today: today }, distract, rnd);
}
/* ---------- ch3·compd 跨日复合：晚上 11:mm 开始+N 分钟过半夜 12 点 → 次日 12:mm2
   today∈{5,6,0}（周五晚→周六/周六→周日/周日→周一——跨周环回覆盖 §0.43 mod7）；
   约束 m+dur∈(60,120)（终点落次日凌晨 0:mm2=12:mm2，mm2∈M5 非 0）；
   dur 域 20-55（5 刻；朗读两位数域内——超 59 中文两位数溢出）
   干扰=日没变（未跨夜）/日对了时没换/分±5 ---------- */
function genCompdQuiz(rnd) {
  const today = pick(rnd, [5, 6, 0]);
  const minute = pick(rnd, M5.filter(m => m >= 10));   // ≥10 才有解（m+dur>60 且 dur≤55）
  let dur;
  do {
    dur = ri(rnd, 4, 11) * 5;
  } while (minute + dur <= 60 || minute + dur >= 120);
  const mm2 = minute + dur - 60;
  const d2 = mod7(today + 1);
  const near = m => m === 55 ? 50 : (m === 0 ? 5 : m - 5);       // 分−5（界内）
  const nearUp = m => m === 55 ? 0 : m + 5;                      // 分+5（界内）
  const near2 = m => m >= 50 ? m - 10 : m + 10;                  // 分±10（界内）
  const distract = uniq3([
    WEEK[today] + ' ' + fmtTime(12, mm2),                        // 日没变（未跨夜——最强错误概念）
    WEEK[d2] + ' ' + fmtTime(12, near(mm2)),                     // 分数刻偏 1 格
    WEEK[d2] + ' ' + fmtTime(12, nearUp(mm2)),
    WEEK[d2] + ' ' + fmtTime(12, near2(mm2))                     // 分数刻偏 2 格
  ], WEEK[d2] + ' ' + fmtTime(12, mm2));
  return finishQuiz('compd', { today: today, minute: minute, dur: dur, hour: 11 }, distract, rnd);
}
/* ---------- ch3·night 跨日求时长：晚 startH(8-10) 睡→早 endH(6-8) 起=12−h1+h2 小时
   干扰=|endH−startH|（同日直减陷阱——跨夜分段和 vs 直减=本题认知点）+ 邻近值，
   全部过滤域外（1-12 小时外非法，§0.43 合法格式） ---------- */
function genNightQuiz(rnd) {
  const startH = ri(rnd, 8, 10), endH = ri(rnd, 6, 8);
  const d = 12 - startH + endH;
  const cands = [Math.abs(endH - startH), d + 1, d - 1, d + 2, d - 2]
    .filter(v => v >= 1 && v <= 12)
    .map(v => v + ' 小时');
  const distract = uniq3(cands, d + ' 小时');
  return finishQuiz('night', { startH: startH, endH: endH }, distract, rnd);
}
/* ---------- ch4·sched 作息表读表：n 行连续表（起点 7:00，行长 15-40 分钟 5 刻互异）
   三问型：dur=行时长 / find=问刻开始的活动 / long=最长活动
   唯一解（verify ①e 独立审计）：行长互异→dur 干扰≠他行真值+long 严格唯一最大；
   行名互异+行起点互异（连续表）→find 唯一 ---------- */
function genSchedQuiz(rnd, nRows, stype) {
  const lens = [];
  while (lens.length < nRows) {                        // 行时长互异（15-40 分钟，5 刻）
    const v = ri(rnd, 3, 8) * 5;
    if (lens.indexOf(v) < 0) lens.push(v);
  }
  let t = 7 * 60;                                      // 首行 7:00 起（连续表）
  const names = shuffled(ACTS, rnd).slice(0, nRows);
  const table = [];
  for (let i = 0; i < nRows; i++) {
    const len = lens[i];
    table.push({ name: names[i], sh: Math.floor(t / 60), sm: t % 60,
                 eh: Math.floor((t + len) / 60), em: (t + len) % 60 });
    t += len;
  }
  let r = 0;
  if (stype === 'long') {
    const durOf = x => (x.eh * 60 + x.em) - (x.sh * 60 + x.sm);
    for (let i = 1; i < nRows; i++) if (durOf(table[i]) > durOf(table[r])) r = i;
  } else r = ri(rnd, 0, nRows - 1);
  const row = table[r];
  const pr = { stype: stype, table: table, askRow: r,
    rowS: row.sh * 60 + row.sm, rowE: row.eh * 60 + row.em, rowName: row.name };
  let distract;
  if (stype === 'dur') {
    /* 干扰分钟数须避全部行真值（唯一解 ①e：dur 干扰≠任何行时长）——偏移序扩到 ±25
       补足（行时长互异 5 个占掉 5 个候选，域 5-50 仍恒可取满 3 个） */
    const len = pr.rowE - pr.rowS;
    const cands = [];
    for (const dv of [5, -5, 10, -10, 15, -15, 20, -20, 25]) {
      const v = len + dv;
      if (v >= 5 && v <= 50 && lens.indexOf(v) < 0 && cands.indexOf(v) < 0) cands.push(v);
      if (cands.length === 3) break;
    }
    distract = cands.map(v => v + ' 分钟');
  } else {
    distract = table.filter((_, i) => i !== r).map(x => x.name).slice(0, 3);
  }
  return finishQuiz('sched', pr, distract, rnd);
}

/* ---------- 单题生成入口（确定性；章分支+题内轮换）
   lv=flat%10；k=题号 0 基：ch1 前两关纯 clock5 认刻梯度，之后偶 clock5 奇 elapse；
   ch2 k%3=plus/minus/span；ch3 k%3=comp/compd/night；ch4 k%3=dur/find/long；
   ext=生成关（flat≥STATIC）参数扩档：plus/minus 5-9、span 3-6、elapse N 20-75、
   comp 15-55、sched 5 行表（clock5/compd/night 域固定无扩档） ---------- */
function genQuiz(dch, rnd, lv, k, kind, ext) {
  const e = !!ext;
  if (dch === 1) {
    if (!e && lv < 2) return genClock5Quiz(rnd);        // 静态 ch1 前两关纯 clock5 认刻梯度
    if (kind === 'clock5') return genClock5Quiz(rnd);
    if (kind === 'elapse') return genElapseQuiz(rnd, e ? 20 : 5, e ? 75 : 55);
    return k % 2 === 0 ? genClock5Quiz(rnd) : genElapseQuiz(rnd, e ? 20 : 5, e ? 75 : 55);
  }
  if (dch === 2) {
    const kf = kind != null ? kind : ['plus', 'minus', 'span'][k % 3];
    if (kf === 'plus') return genPlusQuiz(rnd, e ? 5 : 2, e ? 9 : 4);
    if (kf === 'minus') return genMinusQuiz(rnd, e ? 5 : 2, e ? 9 : 4);
    return genSpanQuiz(rnd, e ? 3 : 2, e ? 6 : 4);
  }
  if (dch === 3) {
    const kf = kind != null ? kind : ['comp', 'compd', 'night'][k % 3];
    if (kf === 'comp') return genCompQuiz(rnd, e ? 15 : 10, e ? 55 : 50);
    if (kf === 'compd') return genCompdQuiz(rnd);
    return genNightQuiz(rnd);
  }
  const st = kind != null ? kind : ['dur', 'find', 'long'][k % 3];
  return genSchedQuiz(rnd, e ? 5 : 4, st);
}
/* 生成关 kind 序：章池洗牌前 3 + 随机补足 → 8 题 ≥min(3,池型数) 型（SPEC §1「混出」）
   ch1 章池 2 型（≥2 型）；ch2/ch3/ch4 池 3 型（≥3 型） */
function kindSeqFor(dch, rnd) {
  const pool = dch === 1 ? ['clock5', 'elapse'] :
               dch === 2 ? ['plus', 'minus', 'span'] :
               dch === 3 ? ['comp', 'compd', 'night'] :
                           ['dur', 'find', 'long'];
  const base = shuffled(pool, rnd).slice(0, 3);
  const seq = base.slice();
  while (seq.length < CH_LEN) seq.push(pool[ri(rnd, 0, pool.length - 1)]);
  return shuffled(seq, rnd);
}

/* ---------- 手解安全网模板（genLevel 极端防御；verify 侧 REF_FALLBACKS 双写对账）
   参数字段名与 ansTextOf 读取一致；sched 恒 dur 型（安全网单形态） ---------- */
const FALLBACKS = {
  clock5: { hour: 3, minute: 5, distract: ['4:05', '2:05', '3:10'] },
  elapse: { hour: 3, minute: 50, dur: 20, distract: ['3:50', '3:10', '5:10'] },
  plus:   { today: 3, plus: 2, distract: ['星期四', '星期六', '星期三'] },
  minus:  { today: 5, back: 3, distract: ['星期一', '星期三', '星期五'] },
  span:   { from: 3, to: 6, distract: ['2 天', '4 天', '5 天'] },
  comp:   { hour: 3, minute: 20, dur: 40, today: 3, distract: ['下午3:20', '下午5:00', '下午4:05'] },
  compd:  { today: 6, minute: 40, dur: 40, hour: 11, distract: ['星期六 12:20', '星期日 12:15', '星期日 12:25'] },
  night:  { startH: 9, endH: 7, distract: ['2 小时', '9 小时', '11 小时'] },
  sched:  { stype: 'dur', askRow: 1, rowS: 440, rowE: 470, rowName: '早读',
            table: [{ name: '起床', sh: 7, sm: 0, eh: 7, em: 20 },
                    { name: '早读', sh: 7, sm: 20, eh: 7, em: 50 },
                    { name: '游戏', sh: 7, sm: 50, eh: 8, em: 30 },
                    { name: '学习', sh: 8, sm: 30, eh: 9, em: 5 }],
            distract: ['25 分钟', '15 分钟', '50 分钟'] }
};
function fallbackQuiz(dch, k) {
  let kind;
  if (dch === 1) kind = k % 2 === 0 ? 'clock5' : 'elapse';
  else if (dch === 2) kind = ['plus', 'minus', 'span'][k % 3];
  else if (dch === 3) kind = ['comp', 'compd', 'night'][k % 3];
  else kind = 'sched';
  const f = FALLBACKS[kind];
  const pr = {};
  for (const key of ['hour', 'minute', 'today', 'plus', 'back', 'from', 'to', 'dur',
                     'startH', 'endH', 'askRow', 'rowS', 'rowE', 'rowName', 'stype']) {
    if (f[key] !== undefined) pr[key] = f[key];
  }
  if (f.table) pr.table = f.table.map(r => Object.assign({}, r));   // 深拷贝（finishQuiz 再拷贝一次）
  return finishQuiz(kind, pr, f.distract, function () { return 0.9; });   // 恒 0.9 确定性洗牌
}

/* ---------- 关卡生成（静态 40 关与生成关同一确定性通道；同关 8 题签名互异）
   sig=kind+全部题面参数+答案卡文本（体验维度：孩子看到的钟面/星期/数字与答案） ---------- */
const sigOf = q => q.kind + (q.kind === 'sched' ? ':' + q.stype : '') + '|' +
  q.hour + ',' + q.minute + '|' + q.today + '+' + q.plus + '-' + q.back + '|' +
  q.from + '>' + q.to + '|' + q.dur + '|' + q.startH + '~' + q.endH + '|' +
  (q.table ? q.table.map(r => r.name + r.sh + ':' + r.sm).join(';') + '#' + q.askRow : '-') + '|' +
  (q.answer >= 0 ? q.opts[q.answer].v : '?');
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % LEVELS_PER_CH;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);
  const ext = flat >= STATIC_LEVELS;
  const kseq = ext ? kindSeqFor(dch, rnd) : null;
  const quizzes = [], sigs = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 200) {
    const k = quizzes.length;
    const q = genQuiz(dch, rnd, lv, k, kseq ? kseq[k] : null, ext);
    if (!q || q.opts.length !== 4 || q.answer < 0) continue;      // 干扰不足防御（不可达）
    const sig = sigOf(q);
    if (sigs[sig]) continue;
    sigs[sig] = 1;
    quizzes.push(q);
  }
  while (quizzes.length < CH_LEN) quizzes.push(fallbackQuiz(dch, quizzes.length));   // 不可达防御
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 单选引擎（无 DOM）：点卡即判定（§1 单选制）
   engCommit(L,i)：点候选卡 i → 与 answer 比对。
   对 → solved+推进，返回 'right'/'done'；错 → miss/retries 各 +1 返回 'wrong'
   （错次口径 §1：答错=1 错）；非法（越界/已结束）→ null。
   判定不含 UI 时序（反馈演出/防重入窗在 UI 层），纯算可被 verify 直驱 ---------- */
function engCommit(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return null;
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§1：题面关键词 pulse=方向级恒给 + 正确卡 breathe=答案级） ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  return { act: 'opt', i: q.answer };
}
function dirTarget(q) {
  if (!q || q.solved) return null;
  return { act: 'kw', kind: q.kind };
}

/* ---------- 格式合法性（§0.43 干扰项域：全为合法星期名/时刻/天数/小时/分钟/活动名格式） ---------- */
const isLegalTime5 = v => /^(1[0-2]|[1-9]):[0-5][05]$/.test(v);        // 5 刻时刻（分钟两位）
const isLegalAfternoon = v => /^下午(1[0-2]|[1-9]):[0-5][05]$/.test(v); // 下午时刻
const isLegalCompd = v => /^星期[日一二三四五六] 12:[0-5][05]$/.test(v);// 跨日组合卡
const isLegalHours = v => /^(1[0-2]|[1-9]) 小时$/.test(v);             // night 时长卡（1-12 合法时长域）
const isLegalMins = v => /^([1-9]|[1-4][0-9]|50) 分钟$/.test(v);       // sched 行长（5-50）
const isLegalWeek = v => WEEK.indexOf(v) >= 0;
const isLegalDays = v => /^[1-6] 天$/.test(v);
const isLegalAct = v => ACTS.indexOf(v) >= 0;

/* ---------- 结构校验（verify 用）：kind 域+池约束（恰 4 卡互异+answer idx 域+格式合法） ---------- */
function structOk(q) {
  if (!q) return false;
  const KINDS = ['clock5', 'elapse', 'plus', 'minus', 'span', 'comp', 'compd', 'night', 'sched'];
  if (KINDS.indexOf(q.kind) < 0) return false;
  if (!Array.isArray(q.opts) || q.opts.length !== 4) return false;
  if (q.opts.some(o => typeof o.v !== 'string' || !o.v)) return false;
  const vals = q.opts.map(o => o.v);
  if (new Set(vals).size !== 4) return false;                 // 卡值互异
  if (typeof q.answer !== 'number' || Math.floor(q.answer) !== q.answer ||
      q.answer < 0 || q.answer > 3) return false;
  if (q.kind === 'clock5') {
    if (!(q.hour >= 1 && q.hour <= 12) || M5.indexOf(q.minute) < 0) return false;
    if (!vals.every(isLegalTime5)) return false;
  } else if (q.kind === 'elapse') {
    if (!(q.hour >= 2 && q.hour <= 10) || M5.indexOf(q.minute) < 0) return false;
    if (!(q.dur >= 5 && q.dur <= 75 && q.dur % 5 === 0)) return false;
    if (q.hour * 60 + q.minute + q.dur > 11 * 60 + 55) return false;   // 不越上午界
    if (!vals.every(isLegalTime5)) return false;
  } else if (q.kind === 'plus') {
    if (!(q.today >= 0 && q.today <= 6) || !(q.plus >= 2 && q.plus <= 9)) return false;
    if (!vals.every(isLegalWeek)) return false;
  } else if (q.kind === 'minus') {
    if (!(q.today >= 0 && q.today <= 6) || !(q.back >= 2 && q.back <= 9)) return false;
    if (!vals.every(isLegalWeek)) return false;
  } else if (q.kind === 'span') {
    if (!(q.from >= 0 && q.from <= 6) || !(q.to >= 0 && q.to <= 6)) return false;
    if (q.from === q.to) return false;                        // 差值 0=非法题
    if (!vals.every(isLegalDays)) return false;
  } else if (q.kind === 'comp') {
    if (!(q.hour >= 1 && q.hour <= 10) || M5.indexOf(q.minute) < 0) return false;
    if (!(q.dur >= 10 && q.dur <= 60 && q.dur % 5 === 0)) return false;
    if (q.hour * 60 + q.minute + q.dur > 11 * 60 + 55) return false;
    if (!vals.every(isLegalAfternoon)) return false;
  } else if (q.kind === 'compd') {
    if (!(q.today === 0 || q.today === 5 || q.today === 6)) return false;   // 跨日跨周覆盖域
    if (M5.indexOf(q.minute) < 0) return false;
    if (!(q.dur % 5 === 0) || q.dur < 20 || q.dur > 55) return false;       // dur 20-55（朗读域）
    if (q.minute + q.dur <= 60 || q.minute + q.dur >= 120) return false;
    if (!vals.every(isLegalCompd)) return false;
  } else if (q.kind === 'night') {
    if (!(q.startH >= 8 && q.startH <= 10) || !(q.endH >= 6 && q.endH <= 8)) return false;
    if (!vals.every(isLegalHours)) return false;
  } else {
    if (['dur', 'find', 'long'].indexOf(q.stype) < 0) return false;
    if (!Array.isArray(q.table) || q.table.length < 4) return false;
    const lens = q.table.map(r => (r.eh * 60 + r.em) - (r.sh * 60 + r.sm));
    if (lens.some(v => v < 15 || v > 40 || v % 5 !== 0)) return false;     // 行长 5 刻域
    if (new Set(lens).size !== q.table.length) return false;               // 行时长互异
    for (let i = 1; i < q.table.length; i++) {                             // 连续表
      if (q.table[i].sh * 60 + q.table[i].sm !== q.table[i - 1].eh * 60 + q.table[i - 1].em) return false;
    }
    if (q.table.some(r => ACTS.indexOf(r.name) < 0)) return false;
    if (new Set(q.table.map(r => r.name)).size !== q.table.length) return false;
    if (q.stype === 'dur' && !vals.every(isLegalMins)) return false;
    if ((q.stype === 'find' || q.stype === 'long') && !vals.every(isLegalAct)) return false;
  }
  return true;
}
