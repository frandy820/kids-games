/* ================= kitchen-rhythm 主逻辑（场景/渲染/判定接线/教学/救援/推进）
   r18 老结构重建（SPEC-R18-KITCHEN）：曲库 10+变速长曲+双轨 / 连击门槛星级 / 章爬升。
   会话：flat 关卡序列（CH_LEN=8，生成关 flat≥32）+ celebrate/章末/日末/rest/家长面板走 core。
   家族契约落地：A 双 nextHint(lim-1) / B 救援双锚 lastDir(14s)+lastAct(30s) / D 吞输入 bump /
   E 教学特例先查 sv.kitchen.tutSeen / F 生成关 GEN_HINTS[genLevel(f+1).dch-1] 实算 /
   I 错链豁免窗 3216+300（kr_missmore 实长+300）+ startLevel 重置 / J 语义句 10s 节流 /
   K rescueTick 命名+面板守卫 / N queue 链全 clip 无 keyless 段（天然合规）。
   验收钩子 window.RHY = { start(flat), hit(lane), miss(), autoRun(), get state }。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const POKE = /[?&]poke=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内演出提速
const sfx = n => { if (!VERIFY && !POKE) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs 定版在 game-data（四方同步之一；main 不重复声明直接使用） */
/* 错反馈链豁免窗（契约 I）：kr_missmore 3216 + 300 = 3516（SPEC_DUR 实测表） */
const WRONG_CHAIN_WIN = 3216 + 300;
const CUT_CD_HIT = 0.22, CUT_CD_MISS = 0.28;   // 命中/空挥冷却（每 lane 独立，防无脑连点）
const MISS_CHAIN_STEP = 3;                     // 连漏每 +3 触发错链（3,6,9…）
const TAU = Math.PI * 2;
const lerp = (a, b, p) => a + (b - a) * p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* 纠错链节流（契约 J）：flat<3 每触发必播；flat≥3 走 10s 节流 */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                       /* 错链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = () => {
  if (!G.R) return false;
  const parts = [VOICE.missmore.key];          /* 单段 clip 链（无 keyless——契约 N 天然合规） */
  if (G.R.L.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                                /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

/* ================= r18 存档迁移 IIFE（CH_LEN 5→8 键基迁移，r16 范式，SPEC §7）
   ①v1 键基检测——v1 keyOf 分母=CH_LEN=5，v1 完整档打到 ch c 的 lv0 必有 'c-0' 而新基前置键
     '(c-1)-5' v1 从不写：'c-0' 在而 '(c-1)-5' 缺（c=2..4）= v1 基档一次性重置；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >7）；章号上界放开：生成关章号 ≥5 合法无界
     （keyOf 分母 CH_LEN=8，flat≥32 写 '5-0'+——禁整档 removeItem 吞掉生成关进度）；
   ③k_tut 转译——v1 顶层 k_tut:1 → v2 kitchen.tutSeen:true（家族 E 教学特例子键化），删旧键。
   执行点先于 KIDS.init 读档。 */
try {
  const raw = localStorage.getItem('kidsgame_kitchen');
  if (raw) {
    const sv = JSON.parse(raw) || {};
    const lv = sv.levels || {};
    let reset = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > CH_LEN - 1) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_kitchen');
    else if (sv.k_tut === 1) {                 /* v1 教学标记转译（幂等：转译后删旧键） */
      sv.kitchen = sv.kitchen || {};
      sv.kitchen.tutSeen = true;
      delete sv.k_tut;
      localStorage.setItem('kidsgame_kitchen', JSON.stringify(sv));
    }
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

/* ================= 运行状态 ================= */
const ST = { verifySim: false, simT0: 0, simRate: 1, simBeat: 0.1 };
const G = {
  scene: 'home', R: null, slotF: null, dual: false,
  laneCd: [0, 0], playing: false, ended: false, tutAuto: 0, tutHelp: 0, tutStage: 'none',
  lastStars: 0, pieces: [], checkFx: [], ripAt: -9, ripLane: -1, swipeAt: -9,
  cat: { state: 'idle', at: -9 }, auto: false, _pending: null, _anchor: null, _pulseJudge: false
};
let stage, ctx, W = 800, H = 600;
let lastAct = Date.now();                      /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                      /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                         // 点空白轻提示节流（10s）
const wrapEl = () => $id('stage-wrap');

/* ================= 时钟：主时钟=audioContext.currentTime（老款契约沿用）；
   verify/poke 用加速模拟时钟（spec：禁 setInterval 驱动音符时刻） ================= */
function nowSec() {
  if (ST.verifySim) return (performance.now() - ST.simT0) / 1000 * ST.simRate;
  const c = KIDS.audio.ctx;
  return c ? c.currentTime : performance.now() / 1000;
}
const approachSec = () => 4 * 60 / G.R.song.seg[0].bpm;   // 视觉提前 4 拍（首段拍长）

/* ================= 槽位模型（flat 关卡序列；点曲目卡进该曲下一未完成槽） ================= */
const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7];
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const unlockedCount = () => KIDS._save() ? KIDS.calendar.limit(Infinity) : STATIC_LEVELS;  // verify 空档兜底
function songNextFlat(song, lim, sv) {
  let first = null;
  for (let f = 0; f < lim; f++) {
    if (genLevel(f).song !== song) continue;
    if (first === null) first = f;
    if (!sv.levels[keyOf(f)]) return f;
  }
  return first;                                 // 该曲全完成 → 重玩其首个槽（自由重玩）
}
function songStars(song, lim, sv) {
  let s = 0;
  for (let f = 0; f < lim; f++) {
    if (genLevel(f).song !== song) continue;
    s = Math.max(s, (sv.levels[keyOf(f)] || {}).stars || 0);
  }
  return s;
}
function chapterStars(ch) {
  const sv = KIDS._save(); let s = 0;
  for (let lv = 0; lv < CH_LEN; lv++) s += (sv.levels[ch + '-' + lv] || {}).stars || 0;
  return s;
}

/* ================= 场景与首页 ================= */
function showScene(name) {
  G.scene = name;
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('on'));
  $id('scene-' + name).classList.add('on');
  if (name === 'play') fitCanvas();
}
function buildHome() {
  $id('logo-row').innerHTML = ICONS.logo;
  const grid = $id('song-grid');
  grid.innerHTML = '';
  const lim = unlockedCount(), sv = KIDS._save() || { levels: {} };
  SONGS.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.song = i;
    const st = songStars(i, lim, sv);
    card.innerHTML =
      '<div class="art">' + ICONS[s.icon] + '</div>' +
      '<div class="stars">' + [1, 2, 3].map(n => '<span class="' + (st >= n ? 'on' : '') + '">★</span>').join('') + '</div>' +
      '<button class="listen-btn" aria-label="试听">' + ICONS.speaker + '</button>';
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('.listen-btn')) return;
      KIDS.audio.unlock(); KIDS.audio.sfx('click');
      const lim2 = unlockedCount(), sv2 = KIDS._save();
      const f = songNextFlat(i, lim2, sv2);
      if (f != null) startLevel(f); else startLevel(0);
    });
    card.querySelector('.listen-btn').addEventListener('pointerdown', e => {
      e.stopPropagation(); preview(i);
    });
    grid.appendChild(card);
  });
  const free = document.createElement('div');
  free.className = 'song-card';
  free.innerHTML = '<div class="art">' + ICONS.keys + '</div><div class="stars"></div>' +
    '<button class="listen-btn" aria-label="琴键">' + ICONS.play.replace('#fff', '#FFF9EE') + '</button>';
  free.addEventListener('pointerdown', e => {
    if (e.target.closest('.listen-btn')) return;
    KIDS.audio.unlock(); KIDS.audio.sfx('click'); showFree();
  });
  free.querySelector('.listen-btn').addEventListener('pointerdown', e => { e.stopPropagation(); previewFree(); });
  grid.appendChild(free);
}
function renderDots() {
  const lim = unlockedCount(), sv = KIDS._save() || { levels: {} }, box = $id('today-dots');
  box.innerHTML = '';
  for (let i = Math.max(0, lim - 3); i < lim; i++) {
    const d = document.createElement('div');
    d.className = 'tdot' + (sv.levels[keyOf(i)] ? ' done' : '');
    box.appendChild(d);
  }
}
function showHome() { buildHome(); renderDots(); showScene('home'); }

/* 曲目卡试听：前 4 音 */
const KEY_FREQ = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.5];
const KEY_COLORS = ['#E8975A', '#EDAA6C', '#F0BC80', '#F3C99A', '#C9C17E', '#A9C587', '#93BF84', '#8FBF7F'];
function preview(i) {
  KIDS.audio.unlock();
  setTimeout(() => SONGS[i].melody.slice(0, 4).forEach((f, j) => { if (f) KIDS.audio.note(f, 0.32, j * 0.3, 0.8); }), 130);
}
function previewFree() {
  KIDS.audio.unlock();
  setTimeout(() => [0, 2, 4, 7].forEach((k, j) => KIDS.audio.note(KEY_FREQ[k], 0.3, j * 0.22, 0.8)), 130);
}

/* ---------- 自由琴键（保留） ---------- */
function showFree() {
  const box = $id('keys');
  box.innerHTML = '';
  KEY_FREQ.forEach((f, i) => {
    const k = document.createElement('div');
    k.className = 'kkey'; k.dataset.i = i;
    k.style.background = KEY_COLORS[i];
    k.textContent = String(i + 1);
    box.appendChild(k);
  });
  showScene('free');
}

/* ================= 关卡装载与开曲 =================
   opts: { skipTut }（测试入口跳过教学）；tut 由 startLevel 按存档判定注入 */
function startLevel(flat) {
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  G.pieces = []; G.checkFx = []; G.cat = { state: 'idle', at: -9 };
  G.lastStars = 0;
  const L = genLevel(flat);
  const sv = KIDS._save() || { levels: {} };
  const freshTut = !VERIFY && !POKE && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.kitchen && sv.kitchen.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  const dualFirst = !VERIFY && !POKE && SONGS[L.song].style === 'dual' &&
                    !(sv.kitchen && sv.kitchen.dualSeen); // ch4 双轨首教（SPEC §6 kr_dual）
  startSong(L, { tut: freshTut, dualFirst: dualFirst });
}
function startSong(L, opts = {}) {
  if (G._anchor) { document.removeEventListener('pointerdown', G._anchor); G._anchor = null; }
  G._pending = null;
  G.ripAt = -9; G.swipeAt = -9;                  /* 波纹锚清理：时钟重置后旧锚产生负半径 */
  G.R = null; G.slotF = Math.max(0, L.flat); G.auto = false;
  G.dual = SONGS[L.song].style === 'dual';
  G.laneCd = [0, 0]; G.playing = false; G.ended = false;
  G.tutAuto = opts.tut ? 4 : 0;                 // "看"：前 4 音自动命中演示
  G.tutHelp = opts.tut ? 8 : 0;                 // "帮"：第 5-8 音幽灵手指提示（9+=独，放手）
  G.tutStage = opts.tut ? 'watch' : 'none';
  showScene('play');
  $id('btn-cut').classList.toggle('dual', G.dual);
  $id('btn-cut-l1').classList.toggle('dual', G.dual);
  const finger = $id('tut-finger');
  finger.classList.remove('on');
  /* 双轨首教：kr_dual 2640 → 起拍缓冲 ≥2940（estWin 断言窗） */
  let lead = opts.lead != null ? opts.lead : 1.6;
  if (opts.dualFirst && !opts.tut) {
    KIDS.voice.play(VOICE.dual.key, VOICE.dual.text);
    lead = Math.max(lead, 3.3);                 // ≥ kr_dual 2640 + 300 = 2940
    const sv = KIDS._save();
    if (sv && sv.kitchen) {
      sv.kitchen.dualSeen = true;
      KIDS.store.persist();
    }
  }
  const beginT0 = () => {
    const R = mkRun(L, nowSec() + lead);
    G.R = R;
  };
  const ctxOk = !!(KIDS.audio.ctx && KIDS.audio.ctx.state === 'running');   // suspended=未手势，走引导锚定
  if (ST.verifySim || ctxOk) beginT0();             // verify 模拟时钟路径无手势，直接锚定
  else {
    /* 老款 M5 修复沿用：音频时钟未解锁时 t0 暂缺——等首次 pointerdown 解锁后锚定；
     * 期间引导手指常显「点一下开始」。mkRun 延后到手势后（t0 用真实时钟）。 */
    finger.classList.add('on');
    G._pending = () => { G._pending = null; beginT0(); G.playing = true; };
    const anchor = () => {
      KIDS.audio.unlock();
      if (G._pending) G._pending();
      else if (!G.R) beginT0();
      finger.classList.remove('on');
      document.removeEventListener('pointerdown', anchor);
    };
    document.addEventListener('pointerdown', anchor);
    G._anchor = anchor;
  }
  if (opts.tut) {
    KIDS.voice.play(VOICE.tut.key, VOICE.tut.text);   // kitchen_tut 3960 → 看阶段演示窗（lead≥4.3 罩）
    lead = Math.max(lead, 4.3);                       // ≥ 3960 + 300 = 4260（estWin 断言）
    if (G.R) G.R.t0 = nowSec() + lead;                // 已锚定（verify 路径）则平移
    G.playing = true;
  } else if (ST.verifySim || ctxOk) {
    G.playing = true;
  }
  lastAct = Date.now(); lastDir = Date.now();
}

/* ================= 判定接线（引擎在 game-core；此处只做视觉/音频/连击 UI） ================= */
const laneYOf = lane => G.dual ? (lane === 0 ? H * 0.24 : H * 0.50) : H * 0.34;
const judgeXOf = lane => G.dual ? (lane === 0 ? W * 0.20 : W * 0.66) : W * 0.22;
const foodVX = lane => (W + 60 - judgeXOf(lane)) / approachSec();
function foodX(n, now) {
  const T = noteT(G.R, n), jx = judgeXOf(n.l);
  if (!n.missAt) return lerp(W + 60, jx, 1 - (T - now) / approachSec());
  return n.missX - foodVX(n.l) * (now - n.missAt) * 0.6;
}
function foodY(n, now) {
  const ty = laneYOf(n.l), ground = H * 0.62 - 34;
  if (!n.missAt) return ty;
  const t = now - n.missAt, k = clamp(t / 0.5, 0, 1);
  return ty + (ground - ty) * k * k;            // 落向猫嘴高度
}
function tryCut(lane) {
  if (G.scene !== 'play' || !G.R || !G.playing || G.ended) return { r: 'blocked' };
  if (G.tutStage === 'watch') {                  /* 教学看：演示期输入全吞+轻叮（家族 D/E） */
    sfx('pop'); replayAnim(wrapEl(), 'bump');
    return { r: 'tut' };
  }
  const now = nowSec();
  if (now < G.laneCd[lane]) {                    // 冷却中：吞（家族 D：轻叮+容器 bump）
    sfx('pop'); replayAnim(wrapEl(), 'bump');
    return { r: 'cooling' };
  }
  const res = engTap(G.R, lane, now);
  if (res.r === 'swipe') {
    G.swipeAt = now; G.laneCd[lane] = now + CUT_CD_MISS;
    KIDS.audio.sfx('click');
    return res;
  }
  doHit(res.n, now, res.r);
  G.laneCd[lane] = now + CUT_CD_HIT;
  return res;
}
function doHit(n, now, judge) {
  // 命中即旋律：马林巴想起（取证 stub 记 __noteLog——notebird 模式）
  const next = G.R.notes[n.i + 1];
  const gapBeats = next ? Math.max(0.5, next.t - n.t) : 1.5;
  KIDS.audio.note(n.f || 523.25, clamp(gapBeats * localBeatDur(G.R.song.seg, n.t) * 0.9, 0.3, 1.1), 0, 1);
  // 形状冗余反馈：两半飞出 + 勾/星光效 + 圈波纹（Perfect 金星 / Good 绿勾）
  const x = foodX(n, now), y = laneYOf(n.l);
  spawnHalves(n.k, x, y, now);
  G.checkFx.push({ at: now, judge, lane: n.l });
  G.ripAt = now; G.ripLane = n.l;
  updateCombo(G.R.combo);
}
function forceMiss(n, now) {
  if (n.done) return;
  n.done = true; n.missAt = now; n.missX = foodX(n, now);
  G.R.missN++; G.R.combo = 0; G.R.missRun++;
  updateCombo(0);
  KIDS.audio.note(146.83, 0.12, 0, 0.2);        // 低闷短音（取证 stub 记录——漏音通道）
  if (G.cat.state === 'idle') G.cat = { state: 'catch', at: now };
  if (G.R.missRun >= MISS_CHAIN_STEP && G.R.missRun % MISS_CHAIN_STEP === 0) {
    if (sayW()) wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免窗（契约 I） */
  }
}
function checkMiss(now) {
  for (const n of G.R.notes) {
    if (n.done) continue;
    const T = noteT(G.R, n);
    if (now > T + goodWOf(G.R.song, n.t)) forceMiss(n, now);
  }
}
function updateCombo(c) {
  const b = $id('combo-bunny'), num = $id('combo-n');
  if (c >= 5) {
    if (!b.classList.contains('show')) { b.innerHTML = KIDS.assets.rabbit('happy', 108); b.classList.add('show'); KIDS.audio.sfx('pop'); }
    num.textContent = '×' + c;
    if (!num.classList.contains('show')) num.classList.add('show');
  } else {
    b.classList.remove('show'); num.classList.remove('show');
  }
}

/* ================= 粒子（两半 + 判定光效） ================= */
function spawnHalves(k, x, y, now) {
  G.pieces.push({ k, side: -1, x, y, vx: -150, vy: -210, rot: 0, vr: -4.2, born: now, life: 0.6 });
  G.pieces.push({ k, side: 1, x, y, vx: 150, vy: -170, rot: 0, vr: 3.6, born: now, life: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.7;
    G.pieces.push({ spark: true, x, y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, born: now, life: 0.5 });
  }
}

/* ================= 渲染（Canvas，DPR=min(devicePixelRatio,2)；双轨两条时间轴） ================= */
function fitCanvas() {
  const wrap = wrapEl(), r = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stage.width = Math.max(1, Math.round(r.width * dpr));
  stage.height = Math.max(1, Math.round(r.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = r.width; H = r.height;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawFood(k, x, y, rot, alpha, half) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = clamp(alpha, 0, 1);
  if (half) { ctx.beginPath(); ctx.rect(half < 0 ? -60 : 0, -60, 60, 120); ctx.clip(); }
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#4A3B2E'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (k === 'carrot') {
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.quadraticCurveTo(-14, -15, 14, -12); ctx.quadraticCurveTo(30, -8, 30, 0);
    ctx.quadraticCurveTo(30, 8, 14, 12); ctx.quadraticCurveTo(-14, 15, -32, 0);
    ctx.closePath(); ctx.fillStyle = '#EC8B4D'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.strokeStyle = 'rgba(74,59,46,.32)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -9, 6, -7);
    ctx.moveTo(-12, 2); ctx.quadraticCurveTo(-4, 1, 4, 3); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#8FBF7F';
    [[27, -15, -0.6], [32, -3, 0.1], [26, 10, 0.75]].forEach(p => {
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]);
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 10, 0, 0, TAU); ctx.fill(); ctx.restore();
    });
  } else if (k === 'tomato') {
    ctx.beginPath(); ctx.arc(0, 2, 24, 0, TAU); ctx.fillStyle = '#DE6256'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8FBF7F';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.save(); ctx.translate(Math.cos(a) * 20, 2 + Math.sin(a) * 20); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 7.5, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(-8, -4, 6, -2.7, -1.3); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3.5; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(0, 0, 21, 27, 0, 0, TAU); ctx.fillStyle = '#FFF7E9'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, -9, 5, 0.5, 2.1); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3.2; ctx.stroke();
  }
  ctx.restore();
}
function drawCat(now) {
  const cx = Math.max(90, W * 0.115), cy = H * 0.62;
  let dy = 0, sy = 1, mouth = false, squint = false, lean = 0;
  if (G.cat.state === 'catch') {
    const k = clamp((now - G.cat.at) / 0.55, 0, 1);
    dy = -46 * Math.sin(k * Math.PI); mouth = true; lean = -0.14 * Math.sin(k * Math.PI);
  } else if (G.cat.state === 'chew') {
    const t = now - G.cat.at;
    if (t > 0.9) G.cat.state = 'idle';
    else { squint = true; sy = 1 - 0.07 * Math.abs(Math.sin(t * 9)); }
  }
  ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(lean); ctx.scale(1.2, 1.2 * sy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(34, -8);
  ctx.quadraticCurveTo(58, -12, 56, -32 + Math.sin(now * 2) * 3);
  ctx.strokeStyle = '#D98E4F'; ctx.lineWidth = 8; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#4A3B2E';
  ctx.beginPath(); ctx.ellipse(0, -22, 36, 26, 0, 0, TAU); ctx.fillStyle = '#EFA666'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -62, 26, 0, TAU); ctx.fill(); ctx.stroke();
  [[-17, -80, -0.3], [17, -80, 0.3]].forEach(e => {
    ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(e[2]);
    ctx.beginPath(); ctx.moveTo(-9, 6); ctx.quadraticCurveTo(0, -14, 9, 6); ctx.closePath();
    ctx.fillStyle = '#EFA666'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(0, -6, 4, 3); ctx.closePath();
    ctx.fillStyle = '#F2B8C6'; ctx.fill(); ctx.restore();
  });
  if (squint) {
    ctx.beginPath(); ctx.moveTo(-14, -64); ctx.lineTo(-6, -64);
    ctx.moveTo(6, -64); ctx.lineTo(14, -64); ctx.stroke();
  } else {
    ctx.fillStyle = '#4A3B2E';
    ctx.beginPath(); ctx.arc(-10, -64, 2.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -64, 2.8, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#F2B8C6';
  ctx.beginPath(); ctx.moveTo(-3.5, -57); ctx.lineTo(3.5, -57); ctx.lineTo(0, -52); ctx.closePath(); ctx.fill();
  if (mouth) {
    ctx.beginPath(); ctx.ellipse(0, -46, 6, 7, 0, 0, TAU); ctx.fillStyle = '#8A5A44'; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-4, -50); ctx.quadraticCurveTo(0, -46, 4, -50); ctx.stroke();
  }
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-24, -56); ctx.lineTo(-36, -58); ctx.moveTo(-24, -50); ctx.lineTo(-36, -49);
  ctx.moveTo(24, -56); ctx.lineTo(36, -58); ctx.moveTo(24, -50); ctx.lineTo(36, -49);
  ctx.stroke(); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(-14, -2, 8, 6, 0, 0, TAU); ctx.ellipse(14, -2, 8, 6, 0, 0, TAU);
  ctx.fillStyle = '#EFA666'; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawJudgeLane(lane, now) {
  const jx = judgeXOf(lane), ty = laneYOf(lane);
  const breathe = Math.sin(now * 2.2) * 2;
  const swipe = clamp(1 - (now - G.swipeAt) / 0.25, 0, 1);   // 双向 clamp：时钟重置防负半径
  ctx.save(); ctx.translate(jx, ty);
  ctx.scale(1 + swipe * 0.05, 1 + swipe * 0.05);
  const r = G.dual ? 36 : 44;
  ctx.beginPath(); ctx.arc(0, 0, r + breathe, 0, TAU);
  ctx.setLineDash([10, 8]); ctx.strokeStyle = lane === 1 ? '#93BF84' : '#E8975A'; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, r - 10, 0, TAU); ctx.fillStyle = 'rgba(255,249,238,.92)'; ctx.fill();
  ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.quadraticCurveTo(0, 4, 14, -5);
  ctx.strokeStyle = '#E4D5BC'; ctx.lineWidth = 3; ctx.stroke();
  const rip = G.ripAt > 0 && (G.ripLane === lane || !G.dual) ? clamp(1 - (now - G.ripAt) / 0.42, 0, 1) : 0;   // 双向 clamp：时钟重置防负半径
  if (rip > 0) {
    ctx.beginPath(); ctx.arc(0, 0, r + (1 - rip) * 26, 0, TAU);
    ctx.strokeStyle = 'rgba(143,191,127,' + (rip * 0.9).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.stroke();
  }
  if (G._pulseJudge && Date.now() - G._pulseJudge < 2400) {   // 方向级救援：圈强调波纹（2.4s 三闪）
    const k = ((Date.now() - G._pulseJudge) % 800) / 800;
    ctx.beginPath(); ctx.arc(0, 0, r + 10 + k * 16, 0, TAU);
    ctx.strokeStyle = 'rgba(240,180,41,' + ((1 - k) * 0.85).toFixed(3) + ')'; ctx.lineWidth = 5; ctx.stroke();
  }
  ctx.restore();
}
function drawBg(now) {
  ctx.fillStyle = '#F8EFD9'; ctx.fillRect(0, 0, W, H * 0.14);
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(W * 0.5, H * 0.07, Math.min(38, W * 0.05), 0, TAU);
  ctx.fillStyle = '#DCEBE4'; ctx.fill(); ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.07 - 38); ctx.lineTo(W * 0.5, H * 0.07 + 38);
  ctx.moveTo(W * 0.5 - 38, H * 0.07); ctx.lineTo(W * 0.5 + 38, H * 0.07);
  ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)';
  const c1 = (now * 12) % (W + 200) - 100;
  ctx.beginPath(); ctx.arc(c1, H * 0.05, 16, 0, TAU); ctx.arc(c1 + 18, H * 0.05, 11, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawTrackLane(lane, now) {
  const ty = laneYOf(lane);
  ctx.fillStyle = '#F6E9CF'; ctx.fillRect(0, ty + 46, W, H - ty - 46);
  rrect(-14, ty - 46, W + 28, 92, 24); ctx.fillStyle = '#FBF0DC'; ctx.fill();
  ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 3; ctx.stroke();
  const sp = foodVX(lane), span = W + 120;
  ctx.fillStyle = 'rgba(232,151,90,.28)';
  for (let i = 0; i < span / 90 + 1; i++) {
    const x = W - ((now * sp + i * 90) % span);
    ctx.beginPath(); ctx.arc(x, ty, 4.5, 0, TAU); ctx.fill();
  }
}
function drawDots(now) {
  if (!G.R) return;
  const n = G.R.notes.length; if (!n) return;
  const x0 = W * 0.07, x1 = W * 0.93, y = 24;
  G.R.notes.forEach(d => {
    const x = lerp(x0, x1, n === 1 ? 0.5 : d.i / (n - 1));
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU);
    ctx.fillStyle = d.hit ? '#8FBF7F' : d.done ? '#AEBDCC' : '#E4D5BC';
    ctx.fill();
  });
}
function drawFoods(now) {
  for (const n of G.R.notes) {
    if (n.hit) continue;
    const T = noteT(G.R, n);
    const p = 1 - (T - now) / approachSec();
    if (p < -0.6 || p > 1.2) continue;
    let alpha = 1;
    if (p < 0) alpha = clamp(1 + p * 3.3, 0, 1);
    if (n.missAt) {
      const t = now - n.missAt;
      alpha = t < 0.5 ? 1 : clamp(1 - (t - 0.5) * 2.2, 0, 1);
    }
    const rot = n.missAt ? (now - n.missAt) * 2.8 : Math.sin(now * 3 + n.i) * 0.06;
    drawFood(n.k, foodX(n, now), foodY(n, now), rot, alpha, 0);
  }
}
function drawPieces(now) {
  G.pieces = G.pieces.filter(p => now - p.born < p.life);
  for (const p of G.pieces) {
    const t = now - p.born, a = clamp(1 - t / p.life, 0, 1);
    if (p.spark) {
      ctx.save(); ctx.globalAlpha = a * 0.9;
      ctx.beginPath(); ctx.arc(p.x + p.vx * t, p.y + p.vy * t + 260 * t * t, 4.5, 0, TAU);
      ctx.fillStyle = '#F5C445'; ctx.fill(); ctx.restore();
    } else {
      drawFood(p.k, p.x + p.vx * t, p.y + p.vy * t + 420 * t * t, p.rot + p.vr * t, a, p.side);
    }
  }
  G.checkFx = G.checkFx.filter(c => now - c.at < 0.55);
  for (const c of G.checkFx) {   // 判定光效（Perfect=金星 / Good=绿勾——形状冗余反馈档位可视）
    const t = (now - c.at) / 0.55, a = t < 0.25 ? t / 0.25 : clamp(1 - (t - 0.25) / 0.75, 0, 1);
    ctx.save(); ctx.translate(judgeXOf(c.lane), laneYOf(c.lane) - 60 - t * 24); ctx.globalAlpha = a;
    if (c.judge === 'perfect') {
      ctx.strokeStyle = '#F0B429'; ctx.lineWidth = 6.5;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + k * TAU / 5;
        const ang2 = ang + TAU / 10;
        ctx.lineTo(Math.cos(ang) * 13, Math.sin(ang) * 13);
        ctx.lineTo(Math.cos(ang2) * 6, Math.sin(ang2) * 6);
      }
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.strokeStyle = '#8FBF7F'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-3, 11); ctx.lineTo(15, -12); ctx.stroke();
    }
    ctx.restore();
  }
}
function render(now) {
  ctx.clearRect(0, 0, W, H);
  drawBg(now);
  if (!G.R) return;                               /* 空窗期（等手势/刚退出）：track 绘制依赖 G.R */
  const lanes = G.dual ? [0, 1] : [0];
  lanes.forEach(l => drawTrackLane(l, now));
  drawCat(now);
  lanes.forEach(l => drawJudgeLane(l, now));
  if (G.R) { drawFoods(now); drawDots(now); }
  drawPieces(now);
}

/* ================= "帮"阶段幽灵手指（教学第 5-8 音；等手势期常显——老款教玩观察 P1 沿用） ================= */
function tutFingerTick(now) {
  const f = $id('tut-finger');
  if (!G.R) {                                    // 等首次点按启动期间手指常显+周期重按
    f.classList.add('on');
    if (!G._waitAt || now - G._waitAt > 1.6) {
      G._waitAt = now;
      f.classList.add('press');
      setTimeout(() => f.classList.remove('press'), 320);
    }
    return;
  }
  if (G.tutStage !== 'help') { f.classList.remove('on'); return; }
  let target = null, bd = 1e9;
  for (const n of G.R.notes) {
    if (n.done || n.i >= G.tutHelp) continue;
    const d = Math.abs(noteT(G.R, n) - now);
    if (d < bd) { bd = d; target = n; }
  }
  if (target && bd < approachSec()) {
    f.classList.add('on');
    if (G.dual) {
      f.style.left = (judgeXOf(target.l) / W * 100) + '%';
      f.style.top = (laneYOf(target.l) / H * 100) + '%';
    }
    if (bd < 0.28 && !f.classList.contains('press')) {
      f.classList.add('press');
      setTimeout(() => f.classList.remove('press'), 320);
    }
  } else {
    f.classList.remove('on');
  }
}

/* ================= 主循环（rAF + interval 双驱动，幂等） ================= */
function tick(now) {
  if (!G.R || !G.playing || G.ended) return;
  // "看"阶段：前 4 音自动命中演示（先于 checkMiss——帧粒度晚到也按命中计）
  for (const n of G.R.notes) {
    if (n.done) continue;
    const auto = G.auto || (G.tutAuto && n.i < G.tutAuto);
    if (auto && now >= noteT(G.R, n) - 0.02) {
      const r = engTap(G.R, n.l, noteT(G.R, n));   // 演示=perfect 时刻命中
      if (r.r !== 'swipe') doHit(r.n, noteT(G.R, n), r.r);
      if (G.tutAuto && n.i === G.tutAuto - 1) window.__krDemoR = r.r;   // 演示生效证据（gate 断言）
    }
  }
  checkMiss(now);
  if (G.tutStage === 'watch' && G.R.notes.slice(0, G.tutAuto).every(n => n.done)) {
    G.tutStage = 'help';                           // 看→帮：演示完转手指提示（第 5-8 音）
  }
  if (G.tutStage === 'help' && G.R.notes.slice(0, G.tutHelp).every(n => n.done)) {
    G.tutStage = 'solo';                           // 帮→独：第 9 音起完全放手（手指收）
    $id('tut-finger').classList.remove('on');
  }
  if (G.tutStage === 'help') tutFingerTick(now);
  const lastT = G.R.song.t[G.R.song.t.length - 1];
  if (now > G.R.t0 + secAt(G.R.song.seg, lastT + 1.5) + 0.9) {
    G.ended = true;
    endSong();
  }
}
function loop() {
  requestAnimationFrame(loop);
  if (G.scene !== 'play') return;
  const now = nowSec();
  tick(now);
  render(now);
  if (G.cat.state === 'catch' && now - G.cat.at > 0.55) G.cat = { state: 'chew', at: now };
}
setInterval(() => { if (G.scene === 'play') tick(nowSec()); }, 50);

/* ================= 曲终 → 装盘结算（.k-song-end：连击+星级+播报链） → 家族仪式 ================= */
function showSongEnd(stars) {
  const R = G.R;
  const ov = document.createElement('div');
  ov.className = 'k-song-end';
  const foods = [];
  for (let i = 0; i < Math.min(R.hitN, 6); i++) foods.push(iconFood(R.notes[(i * 4) % R.notes.length].k));
  if (R.hitN > 6) foods.push('<span class="more">×' + R.hitN + '</span>');
  ov.innerHTML =
    '<div class="se-plate">' + ICONS.plate + '</div>' +
    '<div class="se-foods">' + (foods.join('') || '<span class="more"></span>') + '</div>' +
    '<div class="se-stats">' +
      '<div class="se-row">' + ICONS.knife + '<b>' + R.hitN + '</b></div>' +
      '<div class="se-row se-combo">' + ICONS.combo + '<b>×' + R.maxCombo + '</b></div>' +
      '<div class="se-row">' + ICONS.cat + '<b>' + R.missN + '</b></div>' +
    '</div>' +
    '<div class="se-stars">' + [1, 2, 3].map(n => '<span class="' + (stars >= n ? 'on' : '') + '">★</span>').join('') + '</div>' +
    '<button class="k-btn se-go">' + ICONS.play + '</button>';
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  ov.querySelector('.se-go').addEventListener('pointerdown', e => {
    e.stopPropagation(); ov.remove(); afterEnd(stars);
  });
  (() => {   // 结算播报（T46 拆段全 clip）：cut+N个+，连击+M下+cat+K个 六段链（数词复用 kitchen_n_，
    // 句式段 kr_combo/kr_dn_*）；曲库上限 28 音 → 三值域 0..30。0 值（AFK/完美局）零值键
    // kitchen_n_0/kr_dn_0 已补（09-19 主线）——六段恒全 clip，say 兜底仅剩键缺失防御分支
    const ks = ['kitchen_cut', numClip(R.hitN), 'kr_combo', 'kr_dn_' + R.maxCombo, 'kitchen_cat', numClip(R.missN)];
    if (R.hitN >= 0 && R.missN >= 0 && R.maxCombo >= 0 &&
        R.hitN <= 30 && R.missN <= 30 && R.maxCombo <= 30 &&
        ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
    else KIDS.voice.say('你切了' + R.hitN + '个，连击' + R.maxCombo + '下，小猫收走了' + R.missN + '个');
  })();
}
function nextHint(flat) {
  const f = flat == null ? (G.R ? G.R.L.flat : 0) : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 家族 F：章末预告=下一章文案（ci<4）；生成关=实算下一关门槛档 GEN_HINTS[genLevel(f+1).dch-1]
     （genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际恒一致，禁取模右移） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
async function afterEnd(stars) {
  try {
    const f = G.slotF;
    if (f != null) {
      const ch = Math.floor(f / CH_LEN) + 1, lv = f % CH_LEN;
      const r = KIDS.level.pass(ch, lv, stars, CH_LVS);
      showHome();
      await KIDS.ui.celebrate(stars);
      if (r.chapterDone) {
        KIDS.ui.chapterEnd({ chapter: ch, stars: chapterStars(ch), nextHint: nextHint(f) });
        return;
      }
      const lim = unlockedCount(), keys = keysUpTo(lim);
      if (lim > 0 && KIDS.calendar.dayDone(keys)) {
        KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：winFlow 也实算 lim-1（双实算之一） */
      }
      return;
    }
  } catch (e) { /* 存档异常不阻断回家 */ }
  showHome();
}
function endSong() {
  G.playing = false;
  if (G.tutStage !== 'none') {                    /* 教学完成：tutSeen 持久化（家族 E 特例子键反写） */
    const sv = KIDS._save();
    if (sv) { sv.kitchen = sv.kitchen || {}; sv.kitchen.tutSeen = true; KIDS.store.persist(); }
  }
  const stars = engStars(G.R);
  G.lastStars = stars;
  updateCombo(0);
  showSongEnd(stars);
}

/* ================= 无操作看护（家族 B 双锚 / K 面板守卫 / I 让路） =================
   14s 方向级=kr_hint+判定圈 pulse（lastDir 独立节流锚，不重置 lastAct）；
   30s 答案级=下一未决音符幽灵手指随拍演示（不代打——视觉答案级）；教学"帮"由 tutFingerTick 管理。 */
function rescueTick() {
  if (VERIFY || POKE || !G.R || !G.playing || G.ended || G.scene !== 'play') return;
  if (G.tutStage !== 'none') return;          /* 教学期有自身脚手架（看-帮-独），救援静默 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel,.k-song-end')) return;
  /* 面板在场守卫（契约 K）：面板/结算层遮挡期救援静默 */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                          /* 答案级：下一音符幽灵手指演示（静音也能看见） */
    const f = $id('tut-finger');
    let target = null, bd = 1e9;
    const now = nowSec();
    for (const n of G.R.notes) {
      if (n.done) continue;
      const T = noteT(G.R, n);
      if (T < now) continue;
      if (T - now < bd) { bd = T - now; target = n; }
    }
    if (target && bd < approachSec() + 2) {
      f.classList.add('on');
      f.style.left = (judgeXOf(target.l) / W * 100) + '%';
      f.style.top = (laneYOf(target.l) / H * 100) + '%';
      setTimeout(() => { f.classList.remove('on'); }, 2400);
    }
    KIDS.voice.play(VOICE.hint.key, VOICE.hint.text);
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：hint 重播+圈 pulse（不动 lastAct） */
    KIDS.voice.play(VOICE.hint.key, VOICE.hint.text);
    G._pulseJudge = Date.now();                  /* 判定圈强调波纹（drawJudgeLane 消费） */
    lastDir = Date.now();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言） */

/* ================= 事件绑定 ================= */
function laneOfEvent(e) {
  if (!G.dual) return 0;
  const r = wrapEl().getBoundingClientRect();
  return (e.clientY - r.top) < r.height / 2 ? 0 : 1;
}
function bind() {
  window.addEventListener('resize', () => { if (G.scene === 'play') fitCanvas(); });
  const wrap = wrapEl();
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('#btn-back')) return;
    KIDS.audio.unlock();
    const lane = laneOfEvent(e);
    const b = lane === 1 ? $id('btn-cut-l1') : $id('btn-cut');
    b.classList.add('pressed');
    setTimeout(() => b.classList.remove('pressed'), 130);
    lastAct = Date.now();                        /* 主动操作重置救援钟（§0.7a） */
    tryCut(lane);
  });
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  $id('btn-back').addEventListener('pointerdown', e => {
    e.stopPropagation(); KIDS.audio.sfx('click');
    if (G._anchor) { document.removeEventListener('pointerdown', G._anchor); G._anchor = null; }
    G.playing = false; G.ended = true; G.R = null; showHome();
  });
  $id('btn-back2').addEventListener('pointerdown', () => { KIDS.audio.sfx('click'); showHome(); });
  $id('keys').addEventListener('pointerdown', e => {
    const k = e.target.closest('.kkey'); if (!k) return;
    k.classList.add('down');
    KIDS.audio.note(KEY_FREQ[+k.dataset.i], 0.7, 0, 0.9);
    setTimeout(() => k.classList.remove('down'), 180);
  });
}

/* ================= 静态构建与启动 ================= */
function buildStatic() {
  stage = $id('stage'); ctx = stage.getContext('2d');
  $id('btn-cut').innerHTML = ICONS.knife;
  $id('btn-cut-l1').innerHTML = ICONS.knife;
  $id('btn-back').innerHTML = ICONS.home;
  $id('btn-back2').innerHTML = ICONS.home;
  $id('tut-finger').innerHTML = ICONS.finger;
  bind();
}

/* ================= 验收钩子 ================= */
window.RHY = {
  start(flat) { startLevel(((flat % 200) + 200) % 200); },
  hit(lane) { return tryCut(lane || 0); },
  miss() {
    if (!G.R) return;
    let b = null, bd = 1e9; const now = nowSec();
    for (const n of G.R.notes) { if (n.done) continue; const d = Math.abs(noteT(G.R, n) - now); if (d < bd) { bd = d; b = n; } }
    if (b) forceMiss(b, now);
  },
  autoRun(flat) {
    return new Promise(resolve => {
      /* 时钟基重置后旧 t0 失效——必须重开当前曲重锚定（autoRun(flat) 指定关；缺省用当前关） */
      ST.verifySim = true; ST.simT0 = performance.now();
      startLevel(flat != null ? flat : (G.R ? G.R.L.flat : 0));
      const s = SONGS[G.R.L.song];
      ST.simRate = (60 / s.seg[0].bpm) / ST.simBeat;    // 1 模拟拍 = 0.1 实秒
      G.auto = true;
      const t0 = Date.now();
      const iv = setInterval(() => {
        const end = document.querySelector('.k-song-end');
        if (end) {
          clearInterval(iv);
          resolve({ ok: true, ms: Date.now() - t0, hit: G.R.hitN, miss: G.R.missN, perfect: G.R.perfectN, total: G.R.notes.length, stars: G.lastStars });
        } else if (Date.now() - t0 > 30000) {
          clearInterval(iv);
          resolve({ ok: false, reason: 'timeout', hit: G.R ? G.R.hitN : 0, miss: G.R ? G.R.missN : 0, total: G.R ? G.R.notes.length : 0 });
        }
      }, 60);
    });
  },
  get state() {
    const R = G.R;
    return {
      scene: G.scene, flat: R ? R.L.flat : -1, song: R ? R.L.song : -1,
      dual: G.dual, dch: R ? R.L.dch : 0, playing: G.playing, ended: G.ended, tut: G.tutStage,
      hit: G.R ? G.R.hitN : 0, miss: G.R ? G.R.missN : 0,
      perfect: G.R ? G.R.perfectN : 0, good: G.R ? G.R.goodN : 0,
      combo: G.R ? G.R.combo : 0, maxCombo: G.R ? G.R.maxCombo : 0,
      total: G.R ? G.R.notes.length : 0, stars: G.lastStars,
      gates: G.R ? gatesOf(G.R.L) : null, wrongChainUntil: wrongChainUntil
    };
  }
};

/* ================= 启动（verify/poke 分支由 game-verify.js 接管；迁移 IIFE 已先行） ================= */
buildStatic();
requestAnimationFrame(loop);                    // 渲染循环无条件启动（verify 页布局/截图需要）
if (!VERIFY && !POKE) {
  KIDS.init({ game: 'kitchen', title: '厨房节奏' });   // 存档键 kidsgame_kitchen（沿用，家族 C）
  const lim = unlockedCount(), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {        // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：启动处传 lim-1（双实算之二） */
    first = Math.max(0, lim - 1);                      /* 收尾后停留今日最后一关（b14 家族修复对齐） */
  }
  showHome();
  startLevel(first);
}
