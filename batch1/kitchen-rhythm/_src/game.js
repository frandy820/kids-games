/* ============================================================
 * 厨房节奏（kitchen-rhythm）— 游戏逻辑
 * 核心设计：玩家命中产生旋律（spec §7）
 *  - 食材从右向左滑向判定圈，到圈时刻点击 → 两半飞出 + 马林巴音符
 *  - 漏掉 → 食材被小猫叼走（零惩罚，该音符静音 + 低闷短音）
 *  - 主时钟 = audioContext.currentTime（verify 用加速模拟时钟）
 * 会话结构（spec §2）：每日 3 个曲目槽位（calendar），5 槽=1 章，
 *  过关 celebrate / 章末 chapterEnd / 日末 dayEnd / 家长面板均走 core。
 * ============================================================ */
(() => {
'use strict';
const byId = id => document.getElementById(id);
const lerp = (a, b, p) => a + (b - a) * p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const WIN_EARLY = 0.30;      // 提前按可命中（早到宽容）
const WIN_LATE = 0.30;       // 迟到窗口收紧：过圈即快 miss（修复"快掉下去了还能切"）
const CUT_CD_HIT = 0.25, CUT_CD_MISS = 0.30; // 命中/空挥冷却：防无脑连点；空挥 0.45→0.30（教玩观察 P2：0.45 会连锁吞掉慢半拍孩子的下一次准点）
const TAU = Math.PI * 2;

/* ---------- 图标 SVG（零文字依赖，圆润+2.5px 暖棕描边风） ---------- */
const SW = 'stroke="#4A3B2E" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  logo: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="46" cy="56" r="30" fill="#FFF9EE" ' + SW + '/>' +
    '<path d="M70 46 Q86 34 82 54 Q78 68 66 60" fill="#E8975A" ' + SW + '/>' +
    '<path d="M24 30 q4 -12 14 -10 M30 18 q8 -6 14 0" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 20 v-10 M40 14 l12 -4" stroke="#F0B429" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M40 54 q6 8 12 0" ' + SW.replace('3.5', '3') + ' fill="none"/></svg>',
  star: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 8 L61 35 L90 38 L68 58 L74 88 L50 73 L26 88 L32 58 L10 38 L39 35 Z" fill="#F5C445" ' + SW + '/>' +
    '<circle cx="43" cy="46" r="2.8" fill="#4A3B2E"/><circle cx="57" cy="46" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M44 53 q6 6 12 0" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  tiger: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="28" r="12" fill="#EFA05C" ' + SW + '/><circle cx="76" cy="28" r="12" fill="#EFA05C" ' + SW + '/>' +
    '<circle cx="50" cy="56" r="36" fill="#EFA05C" ' + SW + '/>' +
    '<path d="M50 24 v9 M37 27 v8 M63 27 v8" stroke="#B26B3F" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="38" cy="54" r="3.2" fill="#4A3B2E"/><circle cx="62" cy="54" r="3.2" fill="#4A3B2E"/>' +
    '<path d="M46 62 l4 4 l4 -4" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="64" rx="5.5" ry="3.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="70" cy="64" rx="5.5" ry="3.6" fill="#F2B8C6" opacity=".8"/></svg>',
  note: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="50" cy="50" r="40" fill="#8FBF7F" ' + SW + '/>' +
    '<g fill="#FFF9EE"><ellipse cx="39" cy="63" rx="9" ry="7" transform="rotate(-18 39 63)"/>' +
    '<ellipse cx="65" cy="57" rx="9" ry="7" transform="rotate(-18 65 57)"/>' +
    '<path d="M46 61 V36 L72 30 V57 h-5 V38 L51 42 V61 Z"/></g></svg>',
  keys: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="12" y="20" width="18" height="62" rx="9" fill="#E8975A" ' + SW + '/>' +
    '<rect x="33" y="14" width="18" height="68" rx="9" fill="#F5C445" ' + SW + '/>' +
    '<rect x="54" y="20" width="18" height="62" rx="9" fill="#8FBF7F" ' + SW + '/>' +
    '<rect x="75" y="14" width="14" height="68" rx="7" fill="#F2B8C6" ' + SW + '/></svg>',
  knife: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 30 Q14 20 24 20 L62 20 Q80 20 84 40 Q86 52 74 58 L30 74 Q20 76 17 66 Q14 55 14 42 Z" fill="#E9E2D2" ' + SW + '/>' +
    '<rect x="62" y="14" width="26" height="22" rx="11" fill="#B98A5A" transform="rotate(28 75 25)" ' + SW + '/></svg>',
  cat: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M70 62 q20 -6 16 -26" stroke="#EFA666" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="66" rx="32" ry="24" fill="#EFA666" ' + SW + '/>' +
    '<circle cx="44" cy="36" r="24" fill="#EFA666" ' + SW + '/>' +
    '<path d="M27 22 q-2 -12 9 -10 M61 22 q2 -12 -9 -10" fill="#EFA666" ' + SW + '/>' +
    '<circle cx="36" cy="34" r="2.8" fill="#4A3B2E"/><circle cx="52" cy="34" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M42 41 l3 3 l3 -3" stroke="#4A3B2E" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  speaker: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 40 h14 L56 20 v60 L34 60 H20 Z" fill="#FFF9EE" ' + SW + '/>' +
    '<path d="M66 38 q9 12 0 24 M76 30 q15 20 0 40" stroke="#FFF9EE" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 14 L88 46 H78 V82 H22 V46 H12 Z" fill="#FFF9EE" ' + SW + '/>' +
    '<rect x="42" y="56" width="16" height="26" rx="6" fill="#E8975A"/></svg>',
  play: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 22 L78 50 L32 78 Z" fill="#fff"/></svg>',
  plate: '<svg viewBox="0 0 232 148" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="116" cy="74" rx="108" ry="60" fill="#FFFDF7" stroke="#E0D2BC" stroke-width="5"/>' +
    '<ellipse cx="116" cy="74" rx="76" ry="38" fill="#FBF3E4" stroke="#EFE3CD" stroke-width="4"/>' +
    '<path d="M40 46 q-12 26 4 48" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/></svg>',
  finger: '<svg viewBox="0 0 58 78" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M29 6 c9 0 13 6 13 15 v20 c7 2 9 9 6 16 l-7 13 h-26 l-7 -18 c-2 -7 2 -11 8 -10 v-21 c0 -9 5 -15 13 -15 z" ' +
    'fill="rgba(255,255,255,.9)" stroke="rgba(74,59,46,.55)" stroke-width="3" stroke-linejoin="round"/></svg>'
};
const iconFood = k => ({
  carrot: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><g transform="translate(4 14) rotate(-14 28 18)">' +
    '<path d="M-2 18 Q6 4 28 6 Q46 8 46 18 Q46 28 28 30 Q6 32 -2 18 Z" fill="#EC8B4D" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M40 4 q6 -8 10 -6 M44 8 q8 -4 10 0" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>',
  tomato: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="32" cy="36" r="20" fill="#DE6256" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M32 16 v-6 M24 18 l-4 -6 M40 18 l4 -6" stroke="#8FBF7F" stroke-width="4" stroke-linecap="round"/></svg>',
  egg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="32" cy="34" rx="18" ry="23" fill="#FFF7E9" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M24 20 q-3 6 -1 12" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>'
}[k]);

/* ---------- 曲目数据（时间为拍数；melody[i] 与 notes[i] 一一对齐） ----------
 * 三曲均 C 大调；密度 = notes/beats ≤ 0.8；相邻 t 差 ≥ 0.5 拍（verify 校验） */
const SONGS = [
  { title: '小星星', icon: 'star', bpm: 88, beats: 36, kinds: 'rotate',
    notes: [
      { t: 0, k: 'carrot' }, { t: 1, k: 'tomato' }, { t: 2, k: 'egg' }, { t: 3, k: 'carrot' },
      { t: 4, k: 'tomato' }, { t: 5, k: 'egg' }, { t: 6, k: 'carrot' },
      { t: 8, k: 'tomato' }, { t: 9, k: 'egg' }, { t: 10, k: 'carrot' }, { t: 11, k: 'tomato' },
      { t: 12, k: 'egg' }, { t: 13, k: 'carrot' }, { t: 14, k: 'tomato' },
      { t: 16, k: 'egg' }, { t: 17, k: 'carrot' }, { t: 18, k: 'tomato' }, { t: 19, k: 'egg' },
      { t: 20, k: 'carrot' }, { t: 21, k: 'tomato' }, { t: 22, k: 'egg' },
      { t: 24, k: 'carrot' }, { t: 25, k: 'tomato' }, { t: 26, k: 'egg' }, { t: 27, k: 'carrot' },
      { t: 28, k: 'tomato' }, { t: 29, k: 'egg' }, { t: 30, k: 'carrot' }
    ],
    melody: [
      523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
      698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25,
      523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
      698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25
    ] },
  { title: '两只老虎', icon: 'tiger', bpm: 92, beats: 20,
    notes: [
      { t: 0, k: 'carrot' }, { t: 1, k: 'tomato' }, { t: 2, k: 'egg' }, { t: 3, k: 'carrot' },
      { t: 4, k: 'tomato' }, { t: 5, k: 'egg' }, { t: 6, k: 'carrot' }, { t: 7, k: 'tomato' },
      { t: 8, k: 'egg' }, { t: 9, k: 'carrot' }, { t: 10, k: 'tomato' },
      { t: 12, k: 'egg' }, { t: 13, k: 'carrot' }, { t: 14, k: 'tomato' }
    ],
    melody: [
      523.25, 587.33, 659.25, 523.25,
      523.25, 587.33, 659.25, 523.25,
      659.25, 698.46, 783.99,
      659.25, 698.46, 783.99
    ] },
  { title: '欢乐颂', icon: 'note', bpm: 84, beats: 18,
    notes: [
      { t: 0, k: 'egg' }, { t: 1, k: 'carrot' }, { t: 2, k: 'tomato' }, { t: 3, k: 'egg' },
      { t: 4, k: 'carrot' }, { t: 5, k: 'tomato' }, { t: 6, k: 'egg' }, { t: 7, k: 'carrot' },
      { t: 8, k: 'tomato' }, { t: 9, k: 'egg' }, { t: 10, k: 'carrot' }, { t: 11, k: 'tomato' }
    ],
    melody: [
      659.25, 659.25, 698.46, 783.99,
      783.99, 698.46, 659.25, 587.33,
      523.25, 523.25, 587.33, 659.25
    ] }
];

/* ---------- 自由琴键 8 键（C5..C6 大调） ---------- */
const KEY_FREQ = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.5];
const KEY_COLORS = ['#E8975A', '#EDAA6C', '#F0BC80', '#F3C99A', '#C9C17E', '#A9C587', '#93BF84', '#8FBF7F'];

/* ---------- 运行状态 ---------- */
const ST = { verify: false, auto: false, verifySim: false, simT0: 0, simRate: 1, simBeat: 0.1 };
const G = {
  scene: 'home', song: -1, slotF: null, beatDur: 60 / 88, beats: 36, approachBeat: 4, // 2026-09-05 用户反馈：4 拍 approach（原 2 拍，速度慢一半）
  cutCdUntil: 0,
  t0: 0, playing: false, ended: false, tutAuto: 0, tutHelp: 0, lastStars: 0,
  notes: [], hitN: 0, missN: 0, combo: 0, maxCombo: 0,
  pieces: [], ripAt: -9, swipeAt: -9, checkFx: [],
  cat: { state: 'idle', at: -9 }, auto: false
};
let stage, ctx, W = 800, H = 600, judgeX = 176, trackY = 200, groundY = 360;

/* ---------- 时钟：主时钟=audioContext.currentTime（spec §7）；verify 用加速模拟时钟 ---------- */
function nowSec() {
  if (ST.verifySim) return (performance.now() - ST.simT0) / 1000 * ST.simRate;
  const c = KIDS.audio.ctx;
  return c ? c.currentTime : performance.now() / 1000;
}
const noteTime = n => G.t0 + n.t * G.beatDur;
const approachSec = () => G.beatDur * G.approachBeat;

/* ---------- 场景切换 ---------- */
function showScene(name) {
  G.scene = name;
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('on'));
  byId('scene-' + name).classList.add('on');
  if (name === 'play') { fitCanvas(); }
}

/* ---------- 槽位（关卡）模型：每天解锁 3 个曲目槽位，5 槽=1 章；旧槽无限重玩 ----------
 * 槽 f 的曲目 = f % 3；点曲子卡 c 时绑定最小未完成的槽 f ≡ c (mod 3) */
const TOTAL_SLOTS = 999;
const slotKey = f => (Math.floor(f / 5) + 1) + '-' + (f % 5);
const unlockedCount = () => KIDS.calendar.limit(TOTAL_SLOTS);
function nextSlotFor(c) {
  const lim = unlockedCount(), sv = KIDS._save();
  for (let f = c; f < lim; f += 3) if (!sv.levels[slotKey(f)]) return f;
  for (let f = c; f < lim; f += 3) if (sv.levels[slotKey(f)]) return f; // 今日新槽尽 → 重玩
  return null;
}
function chapterStars(ch) {
  const sv = KIDS._save(); let s = 0;
  for (let lv = 0; lv < 5; lv++) s += (sv.levels[ch + '-' + lv] || {}).stars || 0;
  return s;
}

/* ---------- 首页（零文字：图标卡 + 前 4 音试听 + 今日 3 点） ---------- */
function cardStars(c) {
  const sv = KIDS._save(), lim = unlockedCount(); let s = 0;
  for (let f = c; f < lim; f += 3) s = Math.max(s, (sv.levels[slotKey(f)] || {}).stars || 0);
  return s;
}
function buildHome() {
  byId('logo-row').innerHTML = ICONS.logo;
  const grid = byId('song-grid');
  grid.innerHTML = '';
  SONGS.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    const st = cardStars(i);
    card.innerHTML =
      '<div class="art">' + ICONS[s.icon] + '</div>' +
      '<div class="stars">' + [1, 2, 3].map(n => '<span class="' + (st >= n ? 'on' : '') + '">★</span>').join('') + '</div>' +
      '<button class="listen-btn" aria-label="试听">' + ICONS.speaker + '</button>';
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('.listen-btn')) return;
      KIDS.audio.unlock(); KIDS.audio.sfx('click');
      startSong(i, {});
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
  const lim = unlockedCount(), sv = KIDS._save(), box = byId('today-dots');
  box.innerHTML = '';
  for (let i = Math.max(0, lim - 3); i < lim; i++) {
    const d = document.createElement('div');
    d.className = 'tdot' + (sv.levels[slotKey(i)] ? ' done' : '');
    box.appendChild(d);
  }
}
function showHome() { buildHome(); renderDots(); showScene('home'); }

/* 曲目卡试听：前 4 音（等 ctx resume 后播） */
function preview(i) {
  KIDS.audio.unlock();
  setTimeout(() => SONGS[i].melody.slice(0, 4).forEach((f, j) => { if (f) KIDS.audio.note(f, 0.32, j * 0.3, 0.8); }), 130);
}
function previewFree() {
  KIDS.audio.unlock();
  setTimeout(() => [0, 2, 4, 7].forEach((k, j) => KIDS.audio.note(KEY_FREQ[k], 0.3, j * 0.22, 0.8)), 130);
}

/* ---------- 自由琴键 ---------- */
function showFree() {
  const box = byId('keys');
  box.innerHTML = '';
  KEY_FREQ.forEach((f, i) => {
    const k = document.createElement('div');
    k.className = 'kkey'; k.dataset.i = i;
    k.style.background = KEY_COLORS[i];
    k.textContent = String(i + 1); // 点数编号（图标数字，非指令文字）
    box.appendChild(k);
  });
  showScene('free');
}

/* ---------- 开曲 ----------
 * opts.tut: 首 "看-帮-独" 教学（前 4 音自动命中演示 + 第 5-8 音幽灵手指提示）
 * opts.lead: 出发前缓冲（sim 秒）；skipTut: 测试入口跳过教学 */
function startSong(idx, opts = {}) {
  const s = SONGS[idx];
  G.song = idx; G.beatDur = 60 / s.bpm; G.beats = s.beats;
  G.notes = s.notes.map((n, i) => ({ i, t: n.t, k: n.k, f: s.melody[i] || 0, done: false, hit: false, missAt: 0, missX: 0 }));
  G.hitN = 0; G.missN = 0; G.combo = 0; G.maxCombo = 0;
  G.pieces = []; G.checkFx = []; G.ripAt = -9; G.swipeAt = -9;
  G.cat = { state: 'idle', at: -9 }; G.ended = false; G.playing = false;
  G.tutAuto = opts.tut ? 4 : 0;   // "看"：前 4 音自动命中
  G.tutHelp = opts.tut ? 8 : 0;   // "帮"：第 5-8 音手指提示（>4 且 ≤8）
  G.slotF = nextSlotFor(idx);
  showScene('play');
  const finger = byId('tut-finger'); finger.classList.remove('on');
  const beginT0 = () => { G.t0 = nowSec() + (opts.lead != null ? opts.lead : 1.6); };
  if (ST.verifySim || KIDS.audio.ctx) beginT0(); // verify 模拟时钟路径无手势，直接锚定
  else {
    /* M5 修复：音频时钟未解锁（尚无手势）时若用 performance 基开跑，首次点按切换到
     * audioContext.currentTime 会整体回跳（曲目倒带 + 前段静默空窗）。
     * 对策：t0 暂置 Infinity（渲染/判定/曲终路径对该值全部安全短路），等首次
     * pointerdown 解锁音频后再锚定真实 t0；期间显示引导手指提示"点一下开始"。 */
    G.t0 = Infinity;
    finger.classList.add('on');
    const anchor = () => {
      KIDS.audio.unlock();
      finger.classList.remove('on');
      beginT0();
    };
    document.addEventListener('pointerdown', anchor, { once: true });
  }
  if (opts.tut) {
    KIDS.voice.play('kitchen_tut', '先看小刀切四个，然后你来试一试');
    setTimeout(() => { G.playing = true; }, 400);
  } else {
    G.playing = true;
  }
}

/* ---------- 曲终 → 装盘结算（.k-song-end）→ celebrate → 章/日仪式 ---------- */
function starsOf() { const r = G.hitN / Math.max(1, G.notes.length); return r >= 0.9 ? 3 : r >= 0.75 ? 2 : 1; }
function showSongEnd(stars) {
  const ov = document.createElement('div');
  ov.className = 'k-song-end';
  const foods = [];
  for (let i = 0; i < Math.min(G.hitN, 6); i++) foods.push(iconFood(G.notes[(i * 4) % G.notes.length].k));
  if (G.hitN > 6) foods.push('<span class="more">×' + G.hitN + '</span>');
  ov.innerHTML =
    '<div class="se-plate">' + ICONS.plate + '</div>' +
    '<div class="se-foods">' + (foods.join('') || '<span class="more"></span>') + '</div>' +
    '<div class="se-stats">' +
      '<div class="se-row">' + ICONS.knife + '<b>' + G.hitN + '</b></div>' +
      '<div class="se-row">' + ICONS.cat + '<b>' + G.missN + '</b></div>' +
    '</div>' +
    '<div class="se-stars">' + [1, 2, 3].map(n => '<span class="' + (stars >= n ? 'on' : '') + '">★</span>').join('') + '</div>' +
    '<button class="k-btn se-go">' + ICONS.play + '</button>';
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  ov.querySelector('.se-go').addEventListener('pointerdown', e => {
    e.stopPropagation(); ov.remove(); afterEnd(stars);
  });
  (() => { // 结算播报：clip 数字词拼接，缺 clip（如 0 个）整句 TTS 兜底
      const ks = ['kitchen_cut', 'kitchen_n_' + G.hitN, 'kitchen_cat', 'kitchen_n_' + G.missN];
      if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
      else KIDS.voice.say('你切了' + G.hitN + '个，小猫收走了' + G.missN + '个');
    })();
}
async function afterEnd(stars) {
  try {
    const f = G.slotF;
    if (f != null) {
      const ch = Math.floor(f / 5) + 1, lv = f % 5;
      const r = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
      showHome(); // 先回首页，仪式层覆盖其上，关闭后即首页
      await KIDS.ui.celebrate(stars);
      if (r.chapterDone) {
        KIDS.ui.chapterEnd({ chapter: ch, stars: chapterStars(ch), nextHint: '明天有新的曲子哦' });
        return;
      }
      const lim = unlockedCount(), keys = [];
      for (let i = 0; i < lim; i++) keys.push(slotKey(i));
      if (lim > 0 && KIDS.calendar.dayDone(keys)) {
        KIDS.ui.dayEnd({ nextHint: '明天还有好听的曲子哦' });
      }
      return;
    }
  } catch (e) { /* 存档异常不阻断回家 */ }
  showHome();
}
function endSong() {
  G.playing = false;
  const stars = starsOf(); G.lastStars = stars;
  updateCombo(0);
  showSongEnd(stars);
}

/* ---------- 判定（核心算法） ----------
 * tryCut: pointer 时刻在 ±WIN 内找最近未处理音符 → 命中；否则空挥（无惩罚）
 * checkMiss: 音符过窗未击 → 漏（小猫叼走，零扣分） */
function nearestPendingHit(now) {
  let best = null, bd = 1e9;
  for (const n of G.notes) {
    if (n.done) continue;
    const t = noteTime(n);
    if (t - now > WIN_EARLY) continue;    // 还没到窗口（早于窗口的留给 miss 检查）
    const d = Math.abs(t - now);
    if (d < bd) { bd = d; best = n; }
  }
  if (!best) return null;
  // 不对称判定：早按 [-EARLY, 0] 可命中；迟到 (0, +LATE] 才算——过圈超过 LATE 即不可切
  const dt = noteTime(best) - now;         // >0=提前按，<0=已过圈
  return (dt <= WIN_EARLY && -dt <= WIN_LATE) ? best : null;
}
function tryCut() {
  if (G.scene !== 'play' || !G.playing || G.ended) return;
  const now = nowSec();
  if (now < G.cutCdUntil) return;        // 冷却中：连点无效（防无脑连点全切）
  const n = nearestPendingHit(now);
  if (n) { doHit(n, now); G.cutCdUntil = now + CUT_CD_HIT; }
  else { G.swipeAt = now; G.cutCdUntil = now + CUT_CD_MISS; KIDS.audio.sfx('click'); } // 空挥：咔哒+更长冷却，无其他惩罚
}
function doHit(n, now) {
  n.done = true; n.hit = true;
  G.hitN++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
  // 命中即旋律：该音符马林巴想起（时长≈音符拍长）
  const next = G.notes[n.i + 1];
  const gapBeats = next ? Math.max(0.5, next.t - n.t) : 1.5;
  KIDS.audio.note(n.f || 523.25, clamp(gapBeats * G.beatDur * 0.9, 0.3, 1.1), 0, 1);
  // 形状冗余反馈：两半飞出 + 勾形光效 + 圈波纹（全部渐变，无频闪）
  const x = foodX(n, now), y = trackY;
  spawnHalves(n.k, x, y, now);
  G.checkFx.push({ at: now });
  G.ripAt = now;
  updateCombo(G.combo);
}
function forceMiss(n, now) {
  if (n.done) return;
  n.done = true; n.missAt = now; n.missX = foodX(n, now);
  G.missN++; G.combo = 0; updateCombo(0);
  KIDS.audio.note(146.83, 0.12, 0, 0.2); // 低闷短音（柔和正弦，禁 buzz）
  if (G.cat.state === 'idle') { G.cat = { state: 'catch', at: now }; }
}
function checkMiss(now) {
  for (const n of G.notes) {
    if (n.done) continue;
    if (now > noteTime(n) + WIN_LATE) forceMiss(n, now);
  }
}
function updateCombo(c) {
  const b = byId('combo-bunny'), num = byId('combo-n');
  if (c >= 5) {
    if (!b.classList.contains('show')) { b.innerHTML = KIDS.assets.rabbit('happy', 108); b.classList.add('show'); KIDS.audio.sfx('pop'); }
    num.textContent = '×' + c;
    if (!num.classList.contains('show')) num.classList.add('show');
  } else {
    b.classList.remove('show'); num.classList.remove('show');
  }
}

/* ---------- 食材位置（漏掉后：减速滑出 + 抛物线落向小猫） ---------- */
const foodVX = () => (W + 60 - judgeX) / approachSec(); // px/s，向左
function foodX(n, now) {
  const nt = noteTime(n);
  if (!n.missAt) return lerp(W + 60, judgeX, 1 - (nt - now) / approachSec());
  return n.missX - foodVX() * (now - n.missAt) * 0.6;
}
function foodY(n, now) {
  if (!n.missAt) return trackY;
  const t = now - n.missAt, k = clamp(t / 0.5, 0, 1);
  return trackY + (groundY - 34 - trackY) * k * k; // 落向猫嘴高度
}

/* ---------- 碎片/粒子（两半 + 勾 + 星屑，全部按出生时间解析绘制） ---------- */
function spawnHalves(k, x, y, now) {
  G.pieces.push({ k, side: -1, x, y, vx: -150, vy: -210, rot: 0, vr: -4.2, born: now, life: 0.6 });
  G.pieces.push({ k, side: 1, x, y, vx: 150, vy: -170, rot: 0, vr: 3.6, born: now, life: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.7;
    G.pieces.push({ spark: true, x, y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, born: now, life: 0.5 });
  }
}

/* ---------- 渲染（Canvas，DPR=min(devicePixelRatio,2)） ---------- */
function fitCanvas() {
  const wrap = byId('stage-wrap'), r = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stage.width = Math.max(1, Math.round(r.width * dpr));
  stage.height = Math.max(1, Math.round(r.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = r.width; H = r.height;
  judgeX = W * 0.22; trackY = H * 0.34; groundY = H * 0.60;
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
  const cx = Math.max(90, W * 0.115), cy = groundY;
  let dy = 0, sy = 1, mouth = false, squint = false, lean = 0;
  if (G.cat.state === 'catch') {
    const k = clamp((now - G.cat.at) / 0.55, 0, 1);
    dy = -46 * Math.sin(k * Math.PI); mouth = true; lean = -0.14 * Math.sin(k * Math.PI);
  } else if (G.cat.state === 'chew') {
    const t = now - G.cat.at;
    if (t > 0.9) G.cat.state = 'idle';
    else { squint = true; sy = 1 - 0.07 * Math.abs(Math.sin(t * 9)); }
  }
  ctx.save(); ctx.translate(cx, cy + dy); ctx.rotate(lean); ctx.scale(1.2, 1.2 * sy); // 角色占屏 ≥15%（spec §8）
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
    ctx.beginPath(); ctx.arc(-10, -64, 2.8, 0, TAU); ctx.stroke();
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
function drawJudge(now) {
  const breathe = Math.sin(now * 2.2) * 2;
  const swipe = Math.max(0, 1 - (now - G.swipeAt) / 0.25);
  ctx.save(); ctx.translate(judgeX, trackY);
  ctx.scale(1 + swipe * 0.05, 1 + swipe * 0.05);
  ctx.beginPath(); ctx.arc(0, 0, 44 + breathe, 0, TAU);
  ctx.setLineDash([10, 8]); ctx.strokeStyle = '#E8975A'; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fillStyle = 'rgba(255,249,238,.92)'; ctx.fill();
  ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.quadraticCurveTo(0, 4, 14, -5);
  ctx.strokeStyle = '#E4D5BC'; ctx.lineWidth = 3; ctx.stroke();
  const rip = G.ripAt > 0 ? Math.max(0, 1 - (now - G.ripAt) / 0.42) : 0;
  if (rip > 0) {
    ctx.beginPath(); ctx.arc(0, 0, 44 + (1 - rip) * 28, 0, TAU);
    ctx.strokeStyle = 'rgba(143,191,127,' + (rip * 0.9).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.restore();
}
function drawBg(now) {
  ctx.fillStyle = '#F8EFD9'; ctx.fillRect(0, 0, W, trackY - 56);
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(W * 0.5, H * 0.155, Math.min(38, W * 0.05), 0, TAU);
  ctx.fillStyle = '#DCEBE4'; ctx.fill(); ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.155 - 38); ctx.lineTo(W * 0.5, H * 0.155 + 38);
  ctx.moveTo(W * 0.5 - 38, H * 0.155); ctx.lineTo(W * 0.5 + 38, H * 0.155);
  ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)';
  const c1 = (now * 12) % (W + 200) - 100;
  ctx.beginPath(); ctx.arc(c1, H * 0.09, 16, 0, TAU); ctx.arc(c1 + 18, H * 0.09, 11, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawTrack(now) {
  ctx.fillStyle = '#F6E9CF'; ctx.fillRect(0, trackY + 56, W, H - trackY - 56);
  rrect(-14, trackY - 56, W + 28, 112, 26); ctx.fillStyle = '#FBF0DC'; ctx.fill();
  ctx.strokeStyle = '#E0D2BC'; ctx.lineWidth = 3; ctx.stroke();
  const sp = foodVX(), span = W + 120;
  ctx.fillStyle = 'rgba(232,151,90,.28)';
  for (let i = 0; i < span / 90 + 1; i++) {
    const x = W - ((now * sp + i * 90) % span);
    ctx.beginPath(); ctx.arc(x, trackY, 4.5, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#F2E3C8';
  rrect(W * 0.015, groundY - 8, Math.max(120, W * 0.26), 62, 18); ctx.fill();
}
function drawDots(now) {
  const n = G.notes.length; if (!n) return;
  const x0 = W * 0.07, x1 = W * 0.93, y = 24;
  G.notes.forEach(d => {
    const x = lerp(x0, x1, n === 1 ? 0.5 : d.i / (n - 1));
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU);
    ctx.fillStyle = d.hit ? '#8FBF7F' : d.done ? '#AEBDCC' : '#E4D5BC';
    ctx.fill();
  });
}
function drawFoods(now) {
  for (const n of G.notes) {
    if (n.hit) continue;
    const nt = noteTime(n);
    const p = 1 - (nt - now) / approachSec();
    if (p < -0.6 || p > 1.2) continue;
    let alpha = 1;
    if (p < 0) alpha = clamp(1 + p * 3.3, 0, 1);            // 右侧渐显
    if (n.missAt) {
      const t = now - n.missAt;
      alpha = t < 0.5 ? 1 : clamp(1 - (t - 0.5) * 2.2, 0, 1); // 被叼走渐隐
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
  for (const c of G.checkFx) { // 勾形光效（形状冗余：命中=勾，漏=猫叼）
    const t = (now - c.at) / 0.55, a = t < 0.25 ? t / 0.25 : clamp(1 - (t - 0.25) / 0.75, 0, 1);
    ctx.save(); ctx.translate(judgeX, trackY - 66 - t * 24); ctx.globalAlpha = a;
    ctx.strokeStyle = '#8FBF7F'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-3, 11); ctx.lineTo(15, -12); ctx.stroke();
    ctx.restore();
  }
}
function render(now) {
  ctx.clearRect(0, 0, W, H);
  drawBg(now); drawTrack(now); drawCat(now); drawJudge(now);
  drawFoods(now); drawPieces(now); drawDots(now);
}

/* ---------- "帮"阶段幽灵手指：第 5-8 音接近时随节拍按下（渐变缩放，无频闪） ---------- */
function tutFingerTick(now) {
  const f = byId('tut-finger');
  if (G.t0 === Infinity) {  // 教玩观察 P1：等首次点按启动期间手指须常显（原 target 恒空走 else 把它移除，0.4s 即消失）
    f.classList.add('on');
    if (!G._waitAt || now - G._waitAt > 1.6) {   // 每 1.6s 重按一次吸引注意
      G._waitAt = now;
      f.classList.add('press');
      setTimeout(() => f.classList.remove('press'), 320);
    }
    return;
  }
  if (!G.tutHelp || !G.playing) { f.classList.remove('on'); return; }
  let target = null, bd = 1e9;
  for (const n of G.notes) {
    if (n.done || n.i >= G.tutHelp) continue;
    const d = Math.abs(noteTime(n) - now);
    if (d < bd) { bd = d; target = n; }
  }
  if (target && bd < approachSec()) {
    f.classList.add('on');
    if (bd < 0.28 && !f.classList.contains('press')) {
      f.classList.add('press');
      setTimeout(() => f.classList.remove('press'), 320);
    }
  } else {
    f.classList.remove('on');
  }
}

/* ---------- 主循环：逻辑 tick（rAF + interval 双驱动，幂等）+ rAF 渲染 ----------
 * 音符时刻全部由音频/模拟时钟解析（spec：禁 setInterval 驱动音符时刻）；
 * interval 仅兜底推进逻辑（headless 无 rAF 环境），done 标记保证幂等。 */
function tick(now) {
  if (G.playing && !G.ended) {
    // "看"阶段：前 4 音自动命中演示；auto 模式：全曲自动命中。
    // 先于 checkMiss：帧粒度晚到也按命中计（auto 语义=程序在判定时刻命中）
    for (const n of G.notes) {
      if (n.done) continue;
      const auto = G.auto || (G.tutAuto && n.i < G.tutAuto);
      if (auto && now >= noteTime(n) - 0.02) doHit(n, now);
    }
    checkMiss(now);
    tutFingerTick(now);
    if (now > G.t0 + G.beats * G.beatDur + 0.9) { G.ended = true; endSong(); }
  }
  if (G.cat.state === 'catch' && now - G.cat.at > 0.55) G.cat = { state: 'chew', at: now };
}
function loop() {
  requestAnimationFrame(loop);
  if (G.scene !== 'play') return;
  const now = nowSec();
  tick(now);
  render(now);
}
setInterval(() => { if (G.scene === 'play') tick(nowSec()); }, 50);

/* ---------- 事件绑定 ---------- */
function bind() {
  window.addEventListener('resize', () => { if (G.scene === 'play') fitCanvas(); });
  const wrap = byId('stage-wrap');
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('#btn-back')) return;
    KIDS.audio.unlock();
    const b = byId('btn-cut');
    b.classList.add('pressed');
    setTimeout(() => b.classList.remove('pressed'), 130);
    tryCut();
  });
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  byId('btn-back').addEventListener('pointerdown', e => {
    e.stopPropagation(); KIDS.audio.sfx('click');
    G.playing = false; G.ended = true; showHome();
  });
  byId('btn-back2').addEventListener('pointerdown', () => { KIDS.audio.sfx('click'); showHome(); });
  const keys = byId('keys');
  keys.addEventListener('pointerdown', e => {
    const k = e.target.closest('.kkey'); if (!k) return;
    k.classList.add('down');
    KIDS.audio.note(KEY_FREQ[+k.dataset.i], 0.7, 0, 0.9);
    setTimeout(() => k.classList.remove('down'), 180);
  });
}

/* ---------- verify：曲目数据校验 + auto-hit 跑完第 1 曲（spec §7） ---------- */
function validateSongs() {
  const res = [];
  SONGS.forEach((s, i) => {
    const errs = [];
    if (!(s.bpm >= 80 && s.bpm <= 95)) errs.push('bpm=' + s.bpm);
    if (!s.notes.length) errs.push('no-notes');
    for (let j = 1; j < s.notes.length; j++) {
      const d = s.notes[j].t - s.notes[j - 1].t;
      if (!(d > 0)) errs.push('t-not-increasing@' + j);
      else if (d < 0.5 - 1e-9) errs.push('gap<0.5@' + j + '(' + d + ')');
    }
    if (s.melody.length < s.notes.length) errs.push('melody<notes');
    const density = s.notes.length / s.beats;
    if (density > 0.8 + 1e-9) errs.push('density=' + density.toFixed(3));
    s.notes.forEach(n => { if (['carrot', 'tomato', 'egg'].indexOf(n.k) < 0) errs.push('kind@' + n.t); });
    s.melody.forEach((f, j) => { if (!(f > 0)) errs.push('freq@' + j); });
    res.push({ song: i, title: s.title, notes: s.notes.length, beats: s.beats,
      density: +density.toFixed(3), ok: !errs.length, errs });
  });
  return res;
}
function autoRun() {
  return new Promise(resolve => {
    ST.verifySim = true; ST.simT0 = performance.now();
    ST.simRate = (60 / SONGS[0].bpm) / ST.simBeat; // 1 模拟拍 = ST.simBeat 实秒
    G.auto = true;
    startSong(0, { skipTut: true, lead: 0.3 });
    const t0 = Date.now();
    const iv = setInterval(() => {
      const end = document.querySelector('.k-song-end');
      if (end) {
        clearInterval(iv);
        resolve({ ok: true, ms: Date.now() - t0, hit: G.hitN, miss: G.missN, total: G.notes.length });
      } else if (Date.now() - t0 > 30000) {
        clearInterval(iv);
        resolve({ ok: false, reason: 'timeout', hit: G.hitN, miss: G.missN, total: G.notes.length });
      }
    }, 60);
  });
}
async function runVerify(auto) {
  const out = { game: 'kitchen-rhythm', checks: validateSongs(), auto: null, pass: false };
  const dataOk = out.checks.every(c => c.ok);
  // verify 态：静音 + 不写测试存档
  KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; KIDS.speak = () => {}; KIDS.voice.play = () => {}; KIDS.voice.queue = () => {};
  KIDS.level.pass = () => ({ chapterDone: false });
  if (auto && dataOk) out.auto = await autoRun();
  // 布局检查：横向溢出 + 触摸目标尺寸（home 场景抽样）
  const de = document.documentElement;
  out.layout = { vw: innerWidth, vh: innerHeight,
    overflowX: de.scrollWidth - de.clientWidth,
    targets: Array.from(document.querySelectorAll('.listen-btn, .song-card')).map(el => {
      const r = el.getBoundingClientRect();
      return { cls: el.className, w: Math.round(r.width), h: Math.round(r.height) };
    }) };
  out.pass = dataOk && (!auto || (out.auto && out.auto.ok)) && out.layout.overflowX === 0;
  const okN = out.checks.filter(c => c.ok).length;
  document.title = out.pass ? 'VERIFY PASS ' + okN + '/' + out.checks.length +
    (auto && out.auto ? ' AUTO ' + out.auto.hit + '/' + out.auto.total : '') : 'VERIFY FAIL';
  byId('verify-result').textContent = JSON.stringify(out);
  return out;
}

/* ---------- poke：手动模式随机 5 击无异常（playwright 验收协议 §7） ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function runPoke() {
  KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; KIDS.speak = () => {}; KIDS.voice.play = () => {}; KIDS.voice.queue = () => {};
  KIDS.level.pass = () => ({ chapterDone: false });
  ST.verifySim = true; ST.simT0 = performance.now(); ST.simRate = 1; // 模拟真实速度（无手势环境）
  const out = { poke: true, ok: false };
  try {
    window.RHY.song(1);
    await sleep(1200);
    const t0p = performance.now();
    const times = [1900, 3100, 4300, 5600, 7200]; // 随机时刻（固定序列保证可复现）
    for (const t of times) {
      await sleep(Math.max(50, t - (performance.now() - t0p)));
      window.RHY.hit();
      window.RHY.miss(); // 同拍强制漏一次，验证状态机双路径
    }
    await sleep(600);
    const s = window.RHY.state;
    const cut = byId('btn-cut').getBoundingClientRect();
    out.state = s;
    out.cutBtn = { w: Math.round(cut.width), h: Math.round(cut.height) };
    out.ok = s.scene === 'play' && !isNaN(s.hit) && !isNaN(s.miss) && s.hit + s.miss <= s.total + 5;
  } catch (e) { out.err = String(e); }
  document.title = out.ok ? 'POKE OK' : 'POKE FAIL';
  byId('verify-result').textContent = JSON.stringify(out);
  return out;
}

/* ---------- 验收钩子 ---------- */
window.RHY = {
  song: i => startSong(((i % SONGS.length) + SONGS.length) % SONGS.length, { skipTut: true }),
  hit: () => tryCut(),
  miss: () => {
    let b = null, bd = 1e9; const now = nowSec();
    for (const n of G.notes) { if (n.done) continue; const d = Math.abs(noteTime(n) - now); if (d < bd) { bd = d; b = n; } }
    if (b) forceMiss(b, now);
  },
  autoRun,
  get state() {
    return { scene: G.scene, song: G.song, playing: G.playing, ended: G.ended,
      hit: G.hitN, miss: G.missN, combo: G.combo, total: G.notes.length, stars: G.lastStars };
  }
};

/* ---------- 启动 ---------- */
function boot() {
  KIDS.init({ game: 'kitchen', title: '厨房节奏' });
  stage = byId('stage'); ctx = stage.getContext('2d');
  byId('btn-cut').innerHTML = ICONS.knife;
  byId('btn-back').innerHTML = ICONS.home;
  byId('btn-back2').innerHTML = ICONS.home;
  byId('tut-finger').innerHTML = ICONS.finger;
  bind();
  const q = new URLSearchParams(location.search);
  ST.verify = q.get('verify') === '1'; ST.auto = q.get('auto') === '1';
  if (ST.verify || q.get('poke') === '1') {
    document.body.classList.add('verify');
    showHome();                 // 背景非空白（截图校验）
    if (ST.verify) runVerify(ST.auto); else runPoke();
    requestAnimationFrame(loop);
    return;
  }
  const sv = KIDS._save();
  const first = !Object.keys(sv.levels).length && !sv.k_tut;
  if (first) { sv.k_tut = 1; KIDS.store.persist(); }
  if (first) startSong(0, { tut: true });   // 首进直接教学关（spec §2.6）
  else showHome();
  requestAnimationFrame(loop);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
