/* ================= hidden 主逻辑（场景渲染 / 命中与跳出动画 / 教学 / 救援 / 推进）
   玩法：场景一幅（四主题轮换），N 只目标动物藏在遮挡物后（部分可见 30-60%）。
   点中目标=跳出动画+sfx+计数；点非目标（场景元素/已找到/干扰动物）=「？」气泡轻反馈，
   不计数不记错（无错误路径，miss 恒 0，星级恒 3★）。
   r20 难度加深（SPEC-R20-HIDDEN）：型2/3 找全后计数作答条（数字 2-6 报总数，chips 不显
   总数；答错=再数一数轻反馈不记 miss）；型4 开场闪现 2.4s（flash 期点击=吞输入轻反馈）。
   救援：14s 重念题面+遮挡物沙沙晃（方向级）/30s 未找到新目标=目标轮廓 breathe（答案级）。
   验收钩子：window.HD = { get currentLevel, get quiz, tapScene(x,y), start(flat),
                          answer(num), async autoSolve(), get tutorial, get flashOn } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* M-1 配套：verify 页语音序列记录器——真实音频链在 verify 页被 stub（审查指出的门禁盲区根源），
   调度层照常执行并按序记 {k, t}，播放时序由此可断言（verify_one M1 单元消费，挂 HD._says） */
const SAYLOG = VERIFY ? [] : null;
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => {
  if (!cur) return;
  if (SAYLOG) { SAYLOG.push({ k: key, t: performance.now() }); return; }
  KIDS.voice.play(key, text);
};
/* T46 阶段2 段链播放器：全段在册走 queue 拼播，缺段整句 TTS 兜底
   （shop-math playChain 先例；段恒在册=防御性死分支）；verify 页记序列不出声（M-1） */
const playChain = (keys, fallback) => {
  if (SAYLOG) { SAYLOG.push({ k: keys.join('+'), t: performance.now() }); return; }
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};

const fieldEl = $id('field'), spotsEl = $id('spots'), fxEl = $id('fx'),
      counterEl = $id('counter'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', flash: false };
let lastAct = Date.now();                       /* 任意场内点击重置（搜索中持续探索不算挂机） */
let lastProg = Date.now();                      /* 仅找到目标重置（答案级救援钟：30s 无新找到） */
let haloEl = null;                              /* 答案级救援轮廓（同屏至多一枚，找到即撤） */
let helpRedemo = false;
let flashTimer = null;                          /* r20 型4 闪现定时句柄（切关即清） */
let quizSayTimer = null;                        /* mi1：闪现题读题二级定时（mem_watch 播完后发，切关即清） */
const MEM_WATCH_MS = 3500;                      /* mi1 实测：hid_mem_watch clip=3.36s（2026-09-20 页内 duration，2026-09-23 复测仍 3.36s）→3500=实长+~140ms 余量——重合成时须复测同步 */
const TUT_WATCH_MS = 3400;                      /* mi5 实测：hid_tut_watch clip=3.264s（2026-09-23 页内 duration）→3400=实长+~140ms 余量——重合成时须复测同步（同 MEM_WATCH_MS 形态） */

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 场景适配：#field 恒保持 1000:620（按钮按 % 定位与 SVG 一一对齐，
   无 letterbox；布局量测一律 offsetWidth/offsetHeight） ================= */
function fitField() {
  const wrap = $id('fieldwrap');
  const aw = wrap.clientWidth - 4, ah = wrap.clientHeight - 4;
  if (aw <= 0 || ah <= 0) return;
  let w = Math.min(aw, 1180), h = w * SCENE_H / SCENE_W;
  if (h > ah) { h = ah; w = h * SCENE_W / SCENE_H; }
  /* #field 有 3px 边框 ×2：内盒（svgbox/spots/fx）须恰为 1000:620 → 外框补 6px */
  fieldEl.style.width = Math.floor(w + 6) + 'px';
  fieldEl.style.height = Math.floor(h + 6) + 'px';
}
window.addEventListener('resize', fitField);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  $id('eye').innerHTML = '<svg viewBox="0 0 54 44" width="54" height="44" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 24 C14 8 40 8 50 24 C40 40 14 40 4 24 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="27" cy="24" r="9" fill="#4A3B2E"/><circle cx="30" cy="21" r="3" fill="#FFF"/>' +
    '<path d="M10 15 q6 -7 15 -8 M44 15 q-6 -7 -15 -8" fill="none" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/></svg>';
}
/* 音效（Web Audio 合成）：找到=清脆双音 / 「？」=低柔下滑 / 找全=轻铃上扬 */
const popSfx = () => { if (!VERIFY) { KIDS.audio.note(988, 0.1, 0, 0.55); KIDS.audio.note(1319, 0.12, 0.05, 0.4); } };
const wooSfx = () => { if (!VERIFY) { KIDS.audio.note(233, 0.2, 0, 0.4); KIDS.audio.note(175, 0.24, 0.1, 0.35); } };
const chimeFull = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.24, 0, 0.5); KIDS.audio.note(783.99, 0.3, 0.09, 0.5); } };

/* ================= 场景渲染（SVG 背景 + 目标动物 + 遮挡物 + 干扰动物 → 按钮热区）
   遮挡几何：动物可视宽 base，遮挡物盖住右侧/左侧 occlusion 比例——
   被盖带中心 = x + side*base*(1-occ)/2，遮挡物宽 = occ*base + 44（两侧略出沿） ================= */
function occPlace(t) {
  const base = ANIMALS[t.animal].v;
  const cx = t.x + t._side * base * (1 - t.occlusion) / 2;
  const cy = t.y + 8;
  const w = t.occlusion * base + 44;
  return '<g class="occ" data-i="' + t._idx + '"><g transform="translate(' + Math.round(cx) + ' ' + Math.round(cy) + ')">' +
    occSvg(t._ok, Math.round(w), t._side) + '</g></g>';
}
function sceneSvg(q) {
  const rnd = mulberry32(q.seed * 3 + 7);       /* 场景装饰 seeded 微随机（确定性） */
  let s = '<svg viewBox="0 0 ' + SCENE_W + ' ' + SCENE_H + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    sceneBg(q.theme, rnd);
  for (let i = 0; i < q.targets.length; i++) {
    const t = q.targets[i];
    t._idx = i;
    s += '<g class="tg" data-i="' + i + '">' + animalAt(t.animal, t.x, t.y) + occPlace(t) + '</g>';
  }
  if (q.distractor) {                            /* r20：型2 同系干扰半遮蔽（视觉判别负荷） */
    const d = q.distractor;
    s += '<g class="dg">' + animalAt(d.animal, d.x, d.y) +
      (d.occlusion != null
        ? '<g class="occ" data-i="d"><g transform="translate(' + Math.round(d.x + d._side * ANIMALS[d.animal].v * (1 - d.occlusion) / 2) + ' ' + Math.round(d.y + 8) + '">' +
          occSvg(d._ok, Math.round(d.occlusion * ANIMALS[d.animal].v + 44), d._side) + '</g></g>'
        : '') + '</g>';
  }
  return s + '</svg>';
}
function mkSpotEl(t, i) {
  const el = document.createElement('button');
  el.className = 'spot';
  el.dataset.i = i;
  el.setAttribute('aria-label', '找一找');
  el.style.left = (t.x / SCENE_W * 100) + '%';
  el.style.top = (t.y / SCENE_H * 100) + '%';
  return el;
}
function renderScene() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  $id('svgbox').innerHTML = sceneSvg(q);
  spotsEl.innerHTML = '';
  haloEl = null;
  for (let i = 0; i < q.targets.length; i++) spotsEl.appendChild(mkSpotEl(q.targets[i], i));
}
/* 题面计数条：每种目标一枚 chip=动物图标+进度点（零文字，点数即题面）
   r20：countAsk 题（型2/3/4）chips 不铺总数进度点（答案不外显，SPEC-R20 §R3）——
   「？」徽标替代；找到时 chip 仅 bounce 不点亮（chipFound 对空 cdots 天然兼容） */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const tray = $id('chips');
  tray.innerHTML = '';
  q.kinds.forEach(kd => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = '<span class="cicon"><svg viewBox="0 0 120 100">' + ANIMALS[kd.a].draw() + '</svg></span>' +
      (q.countAsk ? '<span class="cq">？</span>'
                  : '<span class="cdots">' + '<i></i>'.repeat(kd.count) + '</span>');
    tray.appendChild(chip);
  });
  renderStep();
  renderScene();
  hideAnsbar();                                  /* r20：新题重置作答条 */
  q._said = 0;                                   /* mi6：题面首发标志（二级 timer 与按钮读题互斥，防双发） */
  if (!state.demo) {                             /* M-1 修复：闪现题读题延迟至闪现结束——原 hid_mem_watch
                                                    与读题同 tick 发出，被 voice.queue 的 _stop 截断不可闻 */
    if (q.flash) startFlash(q);                  /* r20 型4：开场闪现（SPEC-R20 §R4），watch 提示先行独占声道 */
    else { q._said = 1; playChain(quizKeys(q), quizSpeech(q)); }   /* 读题：题面 clip/段链（T46 阶段2） */
  }
}

/* ================= r20 计数作答条（SPEC-R20 §R3）：找全后弹数字钮报总数 ================= */
function openAnsbar() {
  counterEl.classList.add('ask');
  const bar = $id('ansbar');
  bar.innerHTML = '';
  ANSWER_DOMAIN.forEach(num => {
    const b = document.createElement('button');
    b.className = 'anum';
    b.dataset.n = num;
    b.setAttribute('aria-label', num + ' 只');
    b.innerHTML = '<span class="an-v">' + num + '</span><span class="an-p">' + '<i></i>'.repeat(num) + '</span>';
    b.addEventListener('pointerdown', e => { e.preventDefault(); uiAnswer(num); });
    bar.appendChild(b);
  });
  bounceFound();                                 /* 已找到动物次第 bounce（逐一计数支架） */
  sayR('hid_cnt_q', '数一数，一共找到了几只呀');   /* r20 新键（上报主线注册；注册前 keyless 静默） */
  if (!cur._askPeeked) {                         /* 每关首次弹条：数字钮次第高亮（可点预告，不指示答案） */
    cur._askPeeked = 1;
    peekNums();
  }
}
function peekNums() {
  const bs = $id('ansbar').querySelectorAll('.anum');
  for (let i = 0; i < bs.length; i++) {
    setTimeout(() => {
      bs[i].classList.add('peek');
      setTimeout(() => bs[i].classList.remove('peek'), 420 * SPEED + 80);
    }, i * 170 * SPEED);
  }
}
function hideAnsbar() { counterEl.classList.remove('ask'); $id('ansbar').innerHTML = ''; }
/* 已找到动物次第小跳（作答支架/答错重数提示） */
function bounceFound() {
  const tgs = $id('svgbox').querySelectorAll('.tg.found .an');
  for (let i = 0; i < tgs.length; i++) {
    setTimeout(() => { tgs[i].classList.remove('reb'); void tgs[i].offsetWidth; tgs[i].classList.add('reb'); },
      i * 150 * SPEED);
  }
}

/* ================= r20 型4 闪现（SPEC-R20 §R4）：开场 2.4s 遮挡物半透明，期外点击=吞输入 ================= */
function startFlash(q) {
  state.flash = true;
  fieldEl.classList.add('flashing');
  sayR('hid_mem_watch', '看清楚哦，记住它们藏在哪里');   /* r20 新键（上报）；M-1：闪现期独占声道 */
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashTimer = null;
    state.flash = false;
    fieldEl.classList.remove('flashing');
    lastAct = Date.now();                        /* 闪现结束才起算救援钟 */
    if (q && !state.demo) {                      /* M-1 修复：读题在闪现结束后发（verify 页入 SAYLOG）；
                                                    mi1：mem_watch 实测 3.36s>FLASH_MS 2.4s，再等 clip 播完免截尾 */
      if (quizSayTimer) clearTimeout(quizSayTimer);
      quizSayTimer = setTimeout(() => {
        quizSayTimer = null;
        if (!q._said) { q._said = 1; playChain(quizKeys(q), quizSpeech(q)); }   /* mi6：按钮已首发则不再发 */
      }, Math.max(0, MEM_WATCH_MS - FLASH_MS) * SPEED);
    }
  }, FLASH_MS * SPEED);
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 找到一只：chip 对应点变绿 + 跳一下 */
function chipFound(q) {
  const chips = counterEl.querySelectorAll('.chip');
  q.kinds.forEach((kd, ci) => {
    const got = q.targets.filter(t => t.animal === kd.a && t.found).length;
    const chip = chips[ci];
    if (!chip) return;
    const dots = chip.querySelectorAll('.cdots i');
    for (let k = 0; k < got && k < dots.length; k++) dots[k].className = 'on';
    chip.classList.remove('hit'); void chip.offsetWidth; chip.classList.add('hit');
  });
}
/* 场内特效：找到=金星扩散圈；「？」=轻气泡（不计数不记错） */
function burstAt(x, y) {
  const d = document.createElement('div');
  d.className = 'burst';
  d.style.left = (x / SCENE_W * 100) + '%';
  d.style.top = (y / SCENE_H * 100) + '%';
  fxEl.appendChild(d);
  setTimeout(() => d.remove(), 340 * SPEED + 80);
}
function qmarkAt(x, y) {
  const d = document.createElement('div');
  d.className = 'qmark';
  d.style.left = (x / SCENE_W * 100) + '%';
  d.style.top = (y / SCENE_H * 100) + '%';
  d.textContent = '？';
  fxEl.appendChild(d);
  setTimeout(() => d.remove(), 800 * SPEED + 60);
}
/* 吞输入可见回应：场容器 bump 微动效（b21 沉淀③——轻叮必配看得见的回应） */
function bump() {
  fieldEl.classList.remove('bump'); void fieldEl.offsetWidth; fieldEl.classList.add('bump');
}

/* ================= 幽灵手指（教学"帮"/演示共用；指向目标热区中心） ================= */
const ghost = {
  trackI: null,
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { this.trackI = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(i) {
  if (VERIFY || i == null) return;
  ghost.trackI = i;
  const btn = spotsEl.children[i];
  if (!btn) return;
  const r = btn.getBoundingClientRect();        /* fixed 手指换算屏幕坐标（运行时定位，非布局断言） */
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height / 2) + 'px';
  ghost.show();
  setTimeout(() => { if (ghost.trackI === i) ghost.press(); }, 800 * SPEED);
}
function helpNextIdx(q) {                       /* 教学"帮"：指向第一只未找到的目标 */
  for (let i = 0; i < q.targets.length; i++) if (!q.targets[i].found) return i;
  return null;
}
function pointHelpNext() {
  if (!cur || cur.done) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const i = helpNextIdx(q);
  if (i != null) pointGhostAt(i);
}

/* ================= 点按主路径（真实点击 / HD 钩子 / autoSolve / 教学演示共用）
   找全判定 120ms 防重入窗（承 bubble：窗内紧邻点按=拒绝不计数）
   r20：flash 期（型4 闪现）点击=吞输入轻反馈；找全 countAsk 题返回 'full' 弹作答条 ================= */
async function uiTapTarget(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo) || (state.flash && !demo)) { sfx('pop'); bump(); return false; }   // 吞输入轻叮+bump
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (i < 0 || i >= q.targets.length) { sfx('pop'); bump(); return false; }
  const tp = q.targets[i];
  if (tp.found) {                               /* 点已找到的目标=「？」轻反馈（探索≠错误） */
    lastAct = Date.now();                        /* 审查 m1：孩子有互动，重置 14s 方向级救援钟 */
    wooSfx(); qmarkAt(tp.x, tp.y);
    return '?';
  }
  const r = engFoundTarget(cur, i);
  if (r === '?') return '?';
  /* 找到：遮挡物淡出+动物跳出+金星+计数 */
  lastAct = Date.now(); lastProg = Date.now();
  if (haloEl) { haloEl.remove(); haloEl = null; }
  const tg = $id('svgbox').querySelector('.tg[data-i="' + i + '"]');
  if (tg) tg.classList.add('found');
  ghost.hide();
  popSfx();
  burstAt(tp.x, tp.y);
  chipFound(q);
  if (state.tut === 'help') {                   /* 教学"独"：首次自己找到 → 放手 */
    state.tut = 'solo';
    hopRabbit();
  }
  if (r === 'full') {                           /* r20：找全待答 → 弹计数作答条（不推进） */
    openAnsbar();
    return r;
  }
  if (r === 'right' || r === 'done') {          /* 找全：120ms 防重入窗 → 推进/通关 */
    state.locked = true;                        /* 同步置位：窗内紧邻点按=拒绝不计数 */
    if (r === 'right') chimeFull();
    await wait(120 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else {
      renderQuiz();
      if (state.tut === 'help') pointHelpNext();
    }
  }
  return r;
}
/* r20 计数作答入口（数字钮点击 / HD.answer / autoSolve 共用；SPEC-R20 §R3）
   答对=原 right/done 推进链；答错=「再数一数」轻反馈+动物再 bounce，不记 miss 不扣星 */
async function uiAnswer(num) {
  if (!cur || state.won) return false;
  const q = cur.quizzes[cur.step];
  if (!q || !q.ansOpen) return false;
  const run = cur;
  const r = engAnswer(cur, num);                 /* 单一判定源：引擎先记 ansMiss/推进再放 UI 反馈 */
  if (r === 'retry') {
    lastAct = Date.now();
    sayR('hid_cnt_retry', '再数一数吧');           /* r20 新键（M1 直调点收编 sayR 入 SAYLOG） */
    counterEl.classList.remove('rescue'); void counterEl.offsetWidth; counterEl.classList.add('rescue');
    bounceFound();
    return 'retry';
  }
  if (r !== 'right' && r !== 'done') return r;
  lastAct = Date.now(); lastProg = Date.now();
  hideAnsbar();
  state.locked = true;                          /* 120ms 防重入窗（与找全推进同规格） */
  chimeFull();
  await wait(120 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else {
    renderQuiz();
    if (state.tut === 'help') pointHelpNext();
  }
  return r;
}
/* tapScene（场景单位 0-1000 × 0-620）：钩子命中检测入口（与按钮点击同一判定链） */
function uiTapScene(x, y) {
  if (!cur || state.won) return false;
  if (state.locked || state.demo || state.flash) { sfx('pop'); bump(); return false; }
  const i = engFoundIdx(cur, x, y);
  if (i < 0) {                                  /* 点非目标：轻反馈不计数不记错（miss 恒 0） */
    lastAct = Date.now();
    const q = cur.quizzes[cur.step];
    if (q && q.distractor && !q._dSaid && Math.hypot(x - q.distractor.x, y - q.distractor.y) <= HIT_R) {
      q._dSaid = 1;                             /* 试玩P3：干扰动物首次点名（排除法认知支点——「这不是小鸟呀」） */
      sayR(wrongKey(q.distractor.animal), '这不是' + ANIMALS[q.distractor.animal].n + '呀');   /* T46 clip；M1 直调点收编 sayR 入 SAYLOG */
    }
    wooSfx(); qmarkAt(x, y);
    return '?';
  }
  return uiTapTarget(i);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  hideAnsbar();                                  /* r20：通关收作答条 */
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);      /* hid_right：全找到啦，眼睛真亮 */
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(engStars(cur)).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, engStars(cur), [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }   /* r20：切关清闪现定时 */
  if (quizSayTimer) { clearTimeout(quizSayTimer); quizSayTimer = null; }   /* mi1：二级读题定时同清（防串音） */
  fieldEl.classList.remove('flashing');
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', flash: false };
  helpRedemo = false;
  lastAct = Date.now(); lastProg = Date.now();
  fitField();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.hidden && sv.hidden.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指指向藏起的目标+「看到耳朵尖了吗」→点出 1 只（演示生效 __hdDemoR='found'）
   →立即重发同关（确定性同场景），"你来找一找"在重发后的场景上说（watch ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);      /* hid_tut_watch：看！小动物藏起来啦 */
  /* mi5 修复：watch→ear 衔接延迟至 clip 实长（M-1 同根因存量——原固定 700ms 窗，
     hid_tut_watch 3.264s 被 ear 的 voice.play _stop 截断尾段 2.56s 不可闻）；
     教学总长复核：3.4+1.0+0.32+0.6+turn(1.78s)≈7.1s ≤16s 预算 */
  await wait(Math.max(700, TUT_WATCH_MS) * SPEED);
  const q = cur.quizzes[0];
  if (!q) { state.demo = false; state.locked = false; return; }
  sayR(VOICE.ear.key, VOICE.ear.text);              /* 演示引导语（T46 阶段2 clip 化；M1 直调点收编 sayR 入 SAYLOG） */
  const i = helpNextIdx(q);
  pointGhostAt(i);
  await wait(1000 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapTarget(i, true);     /* demo 通道豁免 locked 门（演示吞输入） */
  window.__hdDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'found'） */
  await wait(600 * SPEED);
  const sv = KIDS._save();
  sv.hidden = sv.hidden || {};
  sv.hidden.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来找一找"在重发后的场景上说 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now(); lastProg = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);        /* hid_tut_turn：你来找一找 */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 救援（无错误路径款：14s 方向级 / 30s 答案级） ================= */
function triggerDirHint() {                     /* 方向级：未找到目标的遮挡物沙沙晃 2s */
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  if (!q) return false;
  const i = helpNextIdx(q);
  if (i == null) return false;
  const occ = $id('svgbox').querySelector('.tg[data-i="' + i + '"] .occ');
  if (!occ) return false;
  occ.classList.remove('rustle'); void occ.offsetWidth; occ.classList.add('rustle');
  setTimeout(() => occ.classList.remove('rustle'), 1900);
  return true;
}
function triggerAnsHint() {                     /* 答案级：目标轮廓 breathe（同屏一枚） */
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  if (!q) return false;
  const i = helpNextIdx(q);
  if (i == null) return false;
  if (haloEl) haloEl.remove();
  haloEl = document.createElement('div');
  haloEl.className = 'halo';
  haloEl.dataset.i = i;
  const t = q.targets[i];
  haloEl.style.left = (t.x / SCENE_W * 100) + '%';
  haloEl.style.top = (t.y / SCENE_H * 100) + '%';
  fxEl.appendChild(haloEl);
  return true;
}

/* ================= 底栏与场景交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 教学/演出期点兔子不打断 */
  if (state.flash) { hopRabbit(); return; }                  /* 重审R2-1：闪现期吞输入（动画照跳），不重读题面截断 mem_watch */
  lastAct = Date.now();
  hopRabbit();
  const q = cur.quizzes[cur.step];
  if (q && !state.won) { q._said = 1; playChain(quizKeys(q), quizSpeech(q)); }   /* 戳兔子重读题面（T46 阶段2 clip/段链）；mi6：置首发标志防 timer 双发 */
  else sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 演出/通关期重玩门 */
  if (state.flash) return;                                   /* 重审R2-1：闪现期吞输入（重玩会清 flashTimer 双关） */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  if (state.flash) {                                         /* 重审R2-1：闪现期吞输入（轻反馈），再听一遍不截断 mem_watch */
    hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
    return;
  }
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) { q._said = 1; playChain(quizKeys(q), quizSpeech(q)); }   /* 再听一遍：重读题面（T46 阶段2）；mi6：置首发标志防 timer 双发 */
});
fieldEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  const el = e.target.closest('.spot');
  if (el) { uiTapTarget(Number(el.dataset.i)); return; }
  if (!cur || state.won || state.locked || state.demo) {   /* 演出/通关期吞点=轻叮+bump */
    if (cur) { sfx('pop'); bump(); }
    return;
  }
  /* 场景空白点按 → 场景单位坐标（按 svgbox 内盒换算，运行时定位非布局断言） */
  const r = $id('svgbox').getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * SCENE_W;
  const y = (e.clientY - r.top) / r.height * SCENE_H;
  uiTapScene(x, y);
});

/* ================= 无操作看护：14s 方向级救援 / 30s 答案级 / 教学"帮"5s 重指一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo || state.flash) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {                           /* 方向级：重读题面+遮挡物沙沙（§0.49） */
    const q = cur.quizzes[cur.step];
    if (q && q.ansOpen) {                       /* m2 修复：作答态卡住=重提示报数（原重读「找一找」答非所问） */
      sayR('hid_cnt_q', '数一数，一共找到了几只呀');
      bounceFound();                            /* 已找到动物再 bounce（重数支架，与答错 retry 同构） */
    } else if (q) {
      playChain(quizKeys(q), quizSpeech(q));    /* 救援重读题面（T46 阶段2 clip/段链） */
      triggerDirHint();                         /* 方向提示仅搜索态（作答态已找全，无可指目标） */
    }
    counterEl.classList.remove('rescue'); void counterEl.offsetWidth; counterEl.classList.add('rescue');
    lastAct = Date.now();
    return;
  }
  if (Date.now() - lastProg > 30000) {          /* 答案级：30s 没找到新目标=轮廓 breathe */
    triggerAnsHint();
    lastProg = Date.now() - 15000;              /* 15s 后仍未找到可再提示（不连环刷屏） */
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && ghost.trackI == null) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
fitField();
if (!VERIFY) {
  KIDS.init({ game: 'hidden', title: '隐藏朋友' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用）
   r20 扩展：answer(num) 作答入口 / flashOn 闪现期标志 / quiz 增 countAsk·flash·ansOpen·ansMiss
   / distractor 增 occlusion（同系干扰遮蔽对账，SPEC-R20 §R5） ================= */
window.HD = {
  _says: SAYLOG,                                        /* M-1：verify 页播放序列（verify_one M1 单元消费；非 verify 页 null） */
  start(flat) { startLevel(flat); },                    /* 外部切关（verify 页/独立复验共用口径） */
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv,
             n: cur.quizzes.length, step: cur.step, done: cur.done, won: state.won,
             foundN: q ? q._found : 0, miss: 0, ansOpen: q ? !!q.ansOpen : false };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { theme: q.theme, pattern: q.pattern, n: q.n,
             kinds: q.kinds.map(k => ({ animal: k.a, count: k.count })),
             targets: q.targets.map(t => ({ animal: t.animal, x: t.x, y: t.y,
                                            occlusion: t.occlusion, found: t.found })),
             distractor: q.distractor ? { animal: q.distractor.animal, x: q.distractor.x, y: q.distractor.y,
                                          occlusion: q.distractor.occlusion == null ? null : q.distractor.occlusion } : null,
             foundN: q._found, step: cur.step, miss: 0,
             countAsk: !!q.countAsk, flash: !!q.flash, ansOpen: !!q.ansOpen, ansMiss: q.ansMiss || 0 };
  },
  tapScene(x, y) { return uiTapScene(x, y); },          /* 场景单位命中检测（0-1000 × 0-620） */
  answer(num) { return uiAnswer(num); },                /* r20：计数作答入口（UI 真实判定链） */
  get flashOn() { return state.flash === true; },       /* r20：闪现期标志（复验等待用） */
  async autoSolve() {                    // UI 路径自动找全当前关（逐目标点真实判定链+r20 作答步）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 600) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (state.flash) { await wait(150); continue; }   /* r20：闪现期等待（同步拒绝空转会耗尽 guard） */
      if (q.ansOpen) { await uiAnswer(q.n); taps++; continue; }   /* r20：找全待答 → 答对推进 */
      const i = helpNextIdx(q);
      if (i == null) { await wait(30); continue; }
      await uiTapTarget(i);
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  _rescue: { dir: triggerDirHint, ans: triggerAnsHint }  /* verify 直驱救援视觉（无钟等待） */
};
