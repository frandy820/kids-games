/* ================= kitchen-rhythm 纯引擎（无 DOM）：确定性关卡映射 + 变速时刻积分 +
   判定三档（Perfect/Good/Miss，BPM 归一化窗）+ 双轨分流 + 连击门槛星级
   真值源 SPEC-R18-KITCHEN §2-§5；python 复算 _spec_calc.py（mulberry32 node 位级对照验证）。
   种子 = mulberry32(flat * 7919 + 1002)（本批常量 kr=1002）——同 flat 永远同关。
   生成关消费序：先 dch=ri(1,4) 后 song=ri(0,9)（同流保确定性）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));   // [lo,hi] 闭区间
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;

/* ---------- 关卡生成（静态 32 与生成关同一确定性通道；静态关不消费 rnd）
   flat≥32：dch=seeded ri(1,4)（门槛档）+ song=seeded ri(0,9)（任意曲——特性绑定曲目、
   门槛绑定 dch，SPEC §2） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + KR_SEED);
  const dch = flat < STATIC_LEVELS ? Math.min(4, ch) : ri(rnd, 1, 4);
  const song = flat < STATIC_LEVELS ? SONG_OF_STATIC[flat] : ri(rnd, 0, 9);
  return { flat: flat, ch: ch, dch: dch, lv: lv, song: song };
}

/* ---------- 变速时刻积分（SPEC §1 secAt 分段积分；与 _spec_calc.py 同序） ---------- */
function secAt(seg, t) {
  let s = 0, prev = 0, bpm = seg[0].bpm;
  for (let i = 1; i < seg.length; i++) {
    const f = seg[i].from;
    if (t <= f) break;
    s += (f - prev) * 60 / bpm;
    prev = f; bpm = seg[i].bpm;
  }
  return s + (t - prev) * 60 / bpm;
}
/* 音符局部拍长（判定窗归一化用：变速曲逐音符取所在段 bpm） */
function localBeatDur(seg, t) {
  let bpm = seg[0].bpm;
  for (let i = 1; i < seg.length; i++) {
    if (t >= seg[i].from) bpm = seg[i].bpm; else break;
  }
  return 60 / bpm;
}
const clampS = (v, a, b) => Math.max(a, Math.min(b, v));
/* 判定窗（SPEC §3）：perfectW=clamp(0.22*beatDur, .09, .15)；goodW=2×perfectW（对称） */
const perfectWOf = (song, t) => clampS(PERFECT_K * localBeatDur(song.seg, t), PERFECT_LO, PERFECT_HI);
const goodWOf = (song, t) => 2 * perfectWOf(song, t);

/* ---------- 连击门槛（SPEC §4；verify 独立复算同表） ---------- */
function gatesOf(L) {
  const n = SONGS[L.song].t.length;
  return { n: n, gate2: Math.floor(n * GATE2_R[L.dch - 1]), gate3: Math.floor(n * GATE3_R[L.dch - 1]) };
}

/* ---------- 运行态构建（notes 展开：k=i%3 轮换 / lane 显式或全 0） ---------- */
function mkRun(L, t0) {
  const s = SONGS[L.song];
  return {
    L: L, song: s, t0: t0,
    notes: s.t.map((t, i) => ({
      i: i, t: t, k: FOOD_KINDS[i % 3], l: s.lane ? s.lane[i] : 0,
      f: s.melody[i], done: false, hit: false, judge: '', missAt: 0, missX: -1
    })),
    hitN: 0, missN: 0, perfectN: 0, goodN: 0,
    combo: 0, maxCombo: 0, missRun: 0, ended: false
  };
}
const noteT = (R, n) => R.t0 + secAt(R.song.seg, n.t);

/* ---------- 点按判定引擎（无 DOM）：engTap(R, lane, nowSec)
   返回 { r:'perfect'|'good', n } —— 命中（Perfect/Good 都续连击）
        { r:'swipe' }                    —— 空挥（窗内无该轨 pending；游戏层走冷却+咔哒，无惩罚）
   对称档域：|dt| ≤ goodW 可命中，≤ perfectW 为 Perfect；未到窗（now < T-goodW）的音符不参与。 */
function engTap(R, lane, now) {
  let best = null, bd = 1e9;
  for (const n of R.notes) {
    if (n.done || n.l !== lane) continue;
    const T = noteT(R, n), gw = goodWOf(R.song, n.t);
    if (now < T - gw) continue;               // 还没进入窗（早于窗的留给 miss 检查）
    const ad = Math.abs(T - now);
    if (ad < bd) { bd = ad; best = n; }
  }
  if (!best || bd > goodWOf(R.song, best.t)) return { r: 'swipe' };
  const judge = bd <= perfectWOf(R.song, best.t) ? 'perfect' : 'good';
  best.done = true; best.hit = true; best.judge = judge;
  R.hitN++; R.combo++; R.maxCombo = Math.max(R.maxCombo, R.combo); R.missRun = 0;
  if (judge === 'perfect') R.perfectN++; else R.goodN++;
  return { r: judge, n: best };
}

/* ---------- 漏检引擎（无 DOM）：engMissCheck(R, nowSec) —— 过窗未击 → miss（连击断）
   返回本次新 miss 数（游戏层用 missRun 驱动错反馈链 kr_missmore）。 */
function engMissCheck(R, now) {
  let m = 0;
  for (const n of R.notes) {
    if (n.done) continue;
    if (now > noteT(R, n) + goodWOf(R.song, n.t)) {
      n.done = true; n.missAt = now;
      R.missN++; R.combo = 0; R.missRun++; m++;
    }
  }
  return m;
}

/* ---------- 曲终判定：全部音符 done（曲长=末音+尾拍过窗即全结算） ---------- */
const engAllDone = R => R.notes.every(n => n.done);

/* ---------- 连击门槛星级（SPEC §4）：maxCombo≥gate3→3 / ≥gate2→2 / 曲终即 1（永不 0 星） ---------- */
function engStars(R) {
  const g = gatesOf(R.L);
  return R.maxCombo >= g.gate3 ? 3 : (R.maxCombo >= g.gate2 ? 2 : 1);
}

/* ---------- 曲库结构校验（verify 用，返回错误列表；SPEC §1 全量规则） ---------- */
function auditSong(s, i) {
  const errs = [];
  const n = s.t.length;
  if (n === 0) errs.push('no-notes');
  if (s.melody.length !== n) errs.push('melody!=notes(%d/%d)'.replace('%d/%d', s.melody.length + '/' + n));
  if (n / s.beats > 0.8 + 1e-9) errs.push('density=' + (n / s.beats).toFixed(3));
  for (let j = 1; j < n; j++) {
    const d = s.t[j] - s.t[j - 1];
    if (!(d > 0)) errs.push('t-not-inc@' + j);
    else if (d < 0.5 - 1e-9) errs.push('gap<0.5@' + j + '(' + d + ')');
  }
  for (let j = 0; j < n; j++) {
    if (!(s.t[j] >= 0 && s.t[j] < s.beats)) errs.push('t-range@' + j);
  }
  s.melody.forEach((f, j) => { if (!(f > 0)) errs.push('freq@' + j); });
  if (s.seg[0].from !== undefined) errs.push('seg0-from');
  for (let j = 1; j < s.seg.length; j++) {
    if (!(s.seg[j].from > (j === 1 ? 0 : s.seg[j - 1].from))) errs.push('seg-order@' + j);   // seg[0] 无 from=起点 0
    if (s.seg[j].from >= s.beats) errs.push('seg-beyond@' + j);
  }
  if (s.lane) {
    if (s.lane.length !== n) errs.push('lane-len');
    for (let j = 0; j < n; j++) if (s.lane[j] !== 0 && s.lane[j] !== 1) errs.push('lane@' + j);
  }
  if (!s.lane && s.style === 'dual') errs.push('dual-no-lane');
  const bpmOk = s.seg.every(g => g.bpm >= 80 && g.bpm <= 125);
  if (!bpmOk) errs.push('bpm-range');
  return errs;
}
