/* ================= subbug 主逻辑（叶子撒点渲染 / 点虫放飞 / 教学 / 推进）
   玩法（r30 支架渐撤三段式，SPEC-R30-SUBBUG §R1）：
   ch1 支架章：语音+题面"飞走了 M 只"→点绿虫放飞（角标 1..M+k/M 计数+飞满呼吸）→选剩余数。
   ch2-4 盲飞章：**先答后飞**——答前点虫=摆动提示（不走引擎不计数），必须先心算选出剩余数；
     答对后 autoFly 验证演出按题面把虫放飞（两步题先放后飞来/反序），场上剩=答案可视化。
     miss≥2 解锁支架救援（一步题恢复点虫放飞；两步题自动演示整个故事，"重新飞"=重演）；
     盲飞章正确项 pulse 延至 miss≥3（先给工具再泄答案）。
   验收钩子：window.SUB = { get currentLevel, get quiz, tapBug(i), tapLady(j), recount(), pick(i), async autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 20s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播（原 sayP 行为）；flat≥3 走 10s 节流 sayR（6 岁试玩共性 P1） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 盲飞章（dch>1）：答前/未解锁支架时引导语=calc"先算一算"；支架解锁后（可数剩）回 hint"数一数"
   ——兔兔/点空叶/20s 救援/盲飞纠错共用一个路由（r30） */
const hintVoice = () => {
  const q = cur && cur.quizzes[cur.step];
  return (cur && cur.dch > 1 && !(q && q._assist)) ? VOICE.calc : VOICE.hint;
};
/* 题面播报（T46 阶段2）：qKeys 段链全在册 → queue 拼播（零 keyless 段）；缺段整句 KIDS.speak 兜底
   （shop-math playChain 家族先例；本任务后段链恒在册，兜底=防御性死分支） */
const sayQ = q => {
  const ks = qKeys(q);
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.speak(qSpeech(q));
};

const fieldEl = $id('field'), answersEl = $id('answers'), chipEl = $id('prompt-chip'),
      reflyBtn = $id('btn-refly'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点叶子空白轻提示节流（§0.16，10s）
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');
const bugEl = i => fieldEl.querySelector('.animal[data-k="b"][data-i="' + i + '"]');
const ladyEl = j => fieldEl.querySelector('.animal[data-k="o"][data-i="' + j + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  reflyBtn.innerHTML = ICONS.refly + '<span>重新飞</span>';
  fieldEl.querySelector('.leaf').innerHTML = leafSvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 嗡嗡声（Web Audio 合成）：放飞=双音上扬 / 点到不放飞（已飞/飞满/瓢虫）=低柔单音 / 飞满 M=轻铃 */
const flapHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const flapLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const chimeM = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.3, 0, 0.5); KIDS.audio.note(783.99, 0.4, 0.12, 0.5); } };

/* ================= 渲染 ================= */
function optBtn(t, i) {
  const b = document.createElement('button');
  b.className = 'opt';
  b.dataset.i = i;
  b.textContent = t;
  b.setAttribute('aria-label', '选 ' + t);
  return b;
}
/* 题面 chip：绿虫头像 + 题面大字 + 章型子行 + 放飞进度 k/M（两步题不渲 k/M——飞走数非唯一操作数）
   r30 分型：支架章"数一数"；盲飞章"先算一算"；ch4 一步题"数绿虫再算"（n 不播报）；两步题双操作数 */
function renderChip(q) {
  let big, sub;
  if (q.type === 'dual') {
    big = (q.form === 'A' ? '飞走 <b>' + q.b + '</b> 只·又飞来 <b>' + q.c + '</b> 只'
                          : '飞来 <b>' + q.b + '</b> 只·又飞走 <b>' + q.c + '</b> 只');
    sub = '算一算，现在还剩几只？';
  } else {
    big = '飞走了 <b>' + q.m + '</b> 只';
    sub = cur.dch === 4 ? '先数绿色的小虫，再算一算'
       : cur.dch === 1 ? '数一数，还剩几只？'
       : '先算一算，再选出答案';
  }
  chipEl.innerHTML = ICONS.bugmini + '<div><div class="big">' + big + '</div>' +
    '<div class="sub">' + sub + '</div></div>' +
    (q.type === 'dual' ? '' :
      '<div id="flycount" aria-label="已飞走 0 只">' + ICONS.wing + '<b>0</b>/' + q.m + '</div>');
}
function renderFlycount(q) {
  const fc = chipEl.querySelector('#flycount');
  if (!fc) return;
  const k = q._fly || 0;
  fc.innerHTML = ICONS.wing + '<b>' + k + '</b>/' + q.m;
  fc.setAttribute('aria-label', '已飞走 ' + k + ' 只');
}
/* 叶子撒点：绿虫 + 干扰瓢虫同一拒绝采样流（中心距 ≥ 章 D），确定性纯函数（同 seed 同尺寸同布局） */
function placeAnimals() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  fieldEl.querySelectorAll('.animal').forEach(el => el.remove());
  const C = CHAPTERS[cur.dch];
  const W = fieldEl.clientWidth, H = fieldEl.clientHeight;
  const total = q.bugs.length + q.ladybugs.length;
  const pts = scatterPts(mulberry32(q.seed), W, H, total, C.D, C.size / 2 + 8);
  const mk = (cls, svg, i, size, s) => {
    const b = document.createElement('button');
    b.className = 'animal ' + cls;
    b.dataset.i = i;
    b.setAttribute('aria-label', cls === 'bug' ? '小虫' + (i + 1) : '瓢虫');
    b.style.width = Math.round(size) + 'px';
    b.style.height = Math.round(size) + 'px';
    const p0 = pts[cls === 'bug' ? i : q.bugs.length + i] || { x: W / 2, y: H / 2 };
    b.style.left = Math.round(p0.x - size / 2) + 'px';
    b.style.top = Math.round(p0.y - size / 2) + 'px';
    b.innerHTML = svg + '<span class="badge"></span>';
    if (cls === 'bug') b.dataset.k = 'b'; else b.dataset.k = 'o';
    b.style.setProperty('--s', s);
    return b;
  };
  q.bugs.forEach((c, i) => fieldEl.appendChild(mk('bug', ANIMAL_SVG.bug(c), i, C.size * c.s, c.s)));
  q.ladybugs.forEach((o, j) => fieldEl.appendChild(mk('ladybug', ANIMAL_SVG.ladybug(o), j, C.size * 0.92, 1)));
  /* 恢复本题已放飞状态（重渲染/窗口变化不丢进度：已飞虫立即隐藏+角标，飞满则剩余呼吸） */
  restoreFlyState(q);
}
/* 依引擎状态还原 UI：角标序号 / gone / 呼吸高亮（_ord 记录每只虫的放飞序号） */
function restoreFlyState(q) {
  q._flown = q._flown || [];
  q._ord = q._ord || [];
  let vis = 0;
  q.bugs.forEach((c, i) => {
    const el = bugEl(i);
    if (!el) return;
    if (q._flown[i]) {
      el.classList.add('gone');
      const bd = el.querySelector('.badge');
      bd.textContent = q._ord[i] || 0;
      bd.classList.add('on');
    } else {
      vis++;
      el.classList.remove('gone', 'fly');
      if ((q._fly || 0) >= q.m) el.classList.add('breathe'); else el.classList.remove('breathe');
    }
  });
  renderFlycount(q);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  answersEl.innerHTML = '';
  renderChip(q);
  q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
  renderStep();
  placeAnimals();
  if (!VERIFY && !state.demo) sayQ(q);           /* 题面朗读：clip 段链 queue 拼播（T46 阶段2，缺段整句兜底） */
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
window.addEventListener('resize', () => { if (cur && cur.quizzes[cur.step]) placeAnimals(); });

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：下一只没飞的绿虫；飞满 m → 指向正确答案（手口一致引导） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  q._flown = q._flown || [];
  const i = q._flown.findIndex(v => !v);
  if (i >= 0 && (q._fly || 0) < q.m) pointGhostAt(bugEl(i), 'tut');
  else pointGhostAt(optEl(q.answerIdx), 'tut');
}

/* ================= 盲飞章验证演出（r30）：答对后按题面自动放飞/飞来——场上剩=答案可视化
   window.__autoFlyN 计数供 verify 断言（演出即验算，非空心演出） ================= */
function flyBug(q, i, k) {                       // 单只放飞（DOM+引擎态；autoFly/两步演示共用）
  q._flown = q._flown || []; q._ord = q._ord || [];
  q._flown[i] = 1; q._ord[i] = k; q._fly = k;
  const el = bugEl(i);
  if (el) {
    const bd = el.querySelector('.badge');
    bd.textContent = k;
    bd.classList.remove('on'); void bd.offsetWidth; bd.classList.add('on');
    el.classList.remove('fly'); void el.offsetWidth; el.classList.add('fly');
    setTimeout(() => { if (el.classList.contains('fly')) el.classList.add('gone'); }, 780 * SPEED);
  }
  renderFlycount(q);
}
/* 飞来落点：与场上现有动物（含已飞走占位）拒绝采样，种子 q.seed+31 独立流（确定性） */
function flyInPts(q, count) {
  const C = CHAPTERS[cur.dch];
  const W = fieldEl.clientWidth, H = fieldEl.clientHeight;
  const fR = fieldEl.getBoundingClientRect();
  const occ = [];
  fieldEl.querySelectorAll('.animal').forEach(el => {
    const r = el.getBoundingClientRect();
    occ.push({ x: r.left + r.width / 2 - fR.left, y: r.top + r.height / 2 - fR.top });
  });
  const rnd = mulberry32(q.seed + 31), margin = C.size / 2 + 8, pts = [];
  for (let i = 0; i < count; i++) {
    let placed = false, d = C.D, guard = 0;
    while (!placed && guard++ < 24) {
      for (let t = 0; t < 160 && !placed; t++) {
        const x = margin + rnd() * Math.max(1, W - 2 * margin);
        const y = margin + rnd() * Math.max(1, H - 2 * margin);
        let ok = true;
        for (let k = 0; k < occ.length + pts.length && ok; k++) {
          const p = k < occ.length ? occ[k] : pts[k - occ.length];
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy < d * d) ok = false;
        }
        if (ok) { pts.push({ x: Math.round(x), y: Math.round(y) }); placed = true; }
      }
      if (!placed) d *= 0.92;
    }
    if (!placed) pts.push({ x: Math.round(W / 2), y: Math.round(H / 2) });
  }
  return pts;
}
async function flyInBugs(q, count, run) {         // 飞来 count 只新绿虫（俯冲落位，装饰字段引擎预生成）
  const C = CHAPTERS[cur.dch];
  const pts = flyInPts(q, count);
  for (let i = 0; i < count; i++) {
    if (run && cur !== run) return;               // r30fix M3：身份守卫——重玩/重建关后丢弃旧续体（防旧流飞来虫污染新关 DOM）
    const c = q.inBugs[i];
    const b = document.createElement('button');
    b.className = 'animal bug infly';
    b.dataset.i = q.bugs.length + i; b.dataset.k = 'b';
    b.setAttribute('aria-label', '飞来的小虫' + (i + 1));
    b.style.width = Math.round(C.size * c.s) + 'px';
    b.style.height = Math.round(C.size * c.s) + 'px';
    b.style.left = Math.round(pts[i].x - C.size * c.s / 2) + 'px';
    b.style.top = Math.round(pts[i].y - C.size * c.s / 2) + 'px';
    b.style.setProperty('--s', c.s);
    b.innerHTML = ANIMAL_SVG.bug(c);
    fieldEl.appendChild(b);
    sfx('pop');
    flapHi();
    await wait(170 * SPEED);
  }
}
async function autoFly(q, run) {                 // 答对验证演出：一步题放 m 只；A 先放 b 再飞来 c；B 反序
  run = run || cur;                              // r30fix M3：身份守卫锚——run 变更（重玩/重建关）后逐 await 丢弃旧续体
  window.__autoFlyN = (window.__autoFlyN || 0) + 1;
  fieldEl.querySelectorAll('.animal.infly').forEach(el => el.remove());   // 清上次飞来虫（演示→验证不叠虫）
  const outN = q.m, inN = q.flyIn || 0;
  if (q.type === 'dual' && q.form === 'B') {
    await flyInBugs(q, inN, run);
    if (cur !== run) return;
    await wait(420 * SPEED);
    if (cur !== run) return;
    for (let k = 1; k <= outN; k++) { flyBug(q, k - 1, k); flapHi(); await wait(170 * SPEED); if (cur !== run) return; }
  } else {
    for (let k = 1; k <= outN; k++) { flyBug(q, k - 1, k); flapHi(); await wait(170 * SPEED); if (cur !== run) return; }
    if (q.type === 'dual') { await wait(420 * SPEED); if (cur !== run) return; await flyInBugs(q, inN, run); }
  }
  if (cur !== run) return;
  if (outN) chimeM();
  q.bugs.forEach((c, k) => {                     // 剩余绿虫呼吸=答案可视化（全飞走题为空集自然跳过）
    if (q._flown[k]) return;
    const e2 = bugEl(k);
    if (e2) { e2.classList.remove('breathe'); void e2.offsetWidth; e2.classList.add('breathe'); }
  });
  await wait(520 * SPEED);
}

/* ================= 支架救援解锁（r30）：盲飞章 miss≥2 解锁；两步题自动演示整个故事
   （先放后飞来/反序），孩子数剩余得答案；"重新飞"=重演（uiReFly 分支） ================= */
function unlockAssist(q) {
  q._assist = true;
  reflyBtn.classList.remove('bounce'); void reflyBtn.offsetWidth; reflyBtn.classList.add('bounce');
  if (q.type === 'dual') {
    setTimeout(() => {
      if (cur && !state.locked && !state.won && cur.quizzes[cur.step] === q) demoDual(q);
    }, 650);
  }
}
function demoDual(q) {                           // 两步题支架=自动演示（复位放飞态→完整演一遍故事）
  if (q._demoBusy) return q._demoP;              // 演示中重按不叠演（返回在跑的演示 promise）
  q._demoBusy = true;
  q._demoP = (async () => {                      // r30fix M1：演示 promise 挂 q——uiPick right 分支演前等待收尾（演出互斥，promise 链接非 sleep 硬等）
    const run = cur;                             // r30fix M3：身份守卫锚（演示期间重玩/重建关→续体丢弃）
    try {
      fieldEl.querySelectorAll('.animal.infly').forEach(el => el.remove());   // 清上次演示的飞来虫
      fieldEl.querySelectorAll('.animal').forEach(el => {
        el.classList.remove('fly', 'gone', 'breathe', 'wig');
        const bd = el.querySelector('.badge');
        if (bd) { bd.classList.remove('on'); bd.textContent = ''; }
      });
      q._fly = 0; q._flown = []; q._ord = [];
      restoreFlyState(q);
      await autoFly(q, run);
      if (cur && cur.quizzes[cur.step] === q) sayR(VOICE.hint.key, VOICE.hint.text);   // 演示完引导数剩余
    } finally { q._demoBusy = false; }
  })();
  return q._demoP;
}

/* ================= 放飞主路径（真实点击 / SUB.tapBug / autoSolve 共用） ================= */
function uiTapBug(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked，照 countchick M1 修复） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (cur.dch > 1 && !demo && (q.type === 'dual' || !q._assist)) {
    /* 盲飞章答前：点虫=摆动提示（不走引擎），引导先算。r30fix M2：dual 题解锁后同样 inert——
       走引擎放飞会放掉 m 只把场上剩钉在中间态 s（A 型）/选项外值（B 型），把孩子引向错误答案；
       两步题的故事重演入口=「重新飞」（uiReFly→demoDual），一步题解锁后走引擎放飞（剩=答案语义正确）则保留 */
    const el = (i >= 0 && i < q.bugs.length) ? bugEl(i) : null;
    if (el && !el.classList.contains('gone')) {
      el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
      flapLo();
      if (!q._calcSaid) { q._calcSaid = true; sayR(VOICE.calc.key, VOICE.calc.text); }   // 每题一次
    }
    lastAct = Date.now();
    return false;
  }
  const r = engTapBug(cur, i);
  if (r === null) return false;
  lastAct = Date.now();
  const el = bugEl(i);
  if (r > 0) {                                   // 放飞：角标 k 弹出 → 虫带角标飞走 → .gone 隐藏
    q._ord = q._ord || [];
    q._ord[i] = r;
    if (el) {
      const bd = el.querySelector('.badge');
      bd.textContent = r;
      bd.classList.remove('on'); void bd.offsetWidth; bd.classList.add('on');
      el.classList.remove('breathe');
      el.classList.remove('fly'); void el.offsetWidth; el.classList.add('fly');
      setTimeout(() => { if (el.classList.contains('fly')) el.classList.add('gone'); }, 780 * SPEED);
    }
    sfx('pop');
    flapHi();
    if (!q._half && q.m >= 12 && q._fly >= Math.ceil(q.m / 2)) {   // 大 m 题放飞过半：一次鼓励（6 岁试玩 P2 操作负荷）
      q._half = true;
      sayR(VOICE.cheer.key, VOICE.cheer.text);
    }
    if (q._fly >= q.m) {                         // 飞满 m：剩余虫呼吸高亮提示点数 + 提示语音
      chimeM();
      q.bugs.forEach((c, k) => {
        if (q._flown[k]) return;
        const e2 = bugEl(k);
        if (e2) { e2.classList.remove('breathe'); void e2.offsetWidth; e2.classList.add('breathe'); }
      });
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
    renderFlycount(q);
    if (state.tut === 'help') pointHelpNext();   // "帮"：跟着孩子的放飞节奏指向下一只
  } else {                                       // 已飞走 / 已飞满：摆一下不放飞（零惩罚）
    if (el && !el.classList.contains('gone')) {
      el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
    }
    flapLo();
  }
  return r;
}
/* 干扰瓢虫（章 4）：摆动+哑声，不计数零惩罚（照 countchick 干扰动物） */
function uiTapLady(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  lastAct = Date.now();
  const el = ladyEl(j);
  if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
  flapLo();
  if (!cur._ladySaid) {                          // 每关首次点瓢虫：语音解释"不算"（6 岁试玩 P2——不识字孩子读不了题面文字）
    cur._ladySaid = true;
    sayR(VOICE.lady.key, VOICE.lady.text);
  }
  return true;
}
/* 重新飞：清零本题全部放飞（角标/飞行状态还原，配语音反馈）
   r30 盲飞章两步题解锁后=重演故事（demoDual）；一步题解锁后=原清零语义；未解锁=无事发生 */
function uiReFly() {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (cur.dch > 1 && q.type === 'dual' && q._assist) {
    demoDual(q);
    sfx('click');
    lastAct = Date.now();
    return true;
  }
  const had = engRefly(cur);
  q._ord = [];
  fieldEl.querySelectorAll('.animal').forEach(el => {
    el.classList.remove('fly', 'gone', 'breathe', 'wig');
    const bd = el.querySelector('.badge');
    if (bd) { bd.classList.remove('on'); bd.textContent = ''; }
  });
  if (had) {
    sfx('click');
    reflyBtn.classList.remove('bounce'); void reflyBtn.offsetWidth; reflyBtn.classList.add('bounce');
    KIDS.voice.play(VOICE.refly.key, VOICE.refly.text);   /* 按钮反馈语音（sub_refly clip 已就位——T46 阶段2，无 flat 门） */
  }
  renderFlycount(q);
  lastAct = Date.now();
  return had;                                   // 返回是否真的清了（无放飞时按=无事发生）
}

/* ================= 答题主路径（真实点击 / SUB.pick / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 反方审查 M3：演出窗口内点重玩会重建 cur——身份守卫防旧续体在新 cur 上 winFlow 白拿星 */
  const r = engPick(cur, i);
  if (r === null || r === 'again') return r;
  lastAct = Date.now();
  const blind = cur.dch > 1;
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {                 // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (el) {
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   /* 反方审查 M3：末题演出窗内重玩已重建关卡，丢弃旧续体 */
    if (blind) {
      /* r30fix M1：演出互斥——若两步题救援演示（demoDual）仍在跑，等待其真实收尾（promise 链接，
         非 sleep 硬等总长——时序参数 SPEED 下硬等必错）再起验证演出；否则两 async 各自入口清 .infly
         后各自 append，场上飞来虫 2c 只、「场上剩=答案」失效 */
      /* r30④ minor-A：demo promise reject≈不可达，catch 兜底防 await 上抛致 locked 永锁（吞后照走身份守卫→autoFly→解锁） */
      if (q._demoBusy && q._demoP) { await q._demoP.catch(() => {}); if (cur !== run) return r; }
      await autoFly(q, run);                     /* 盲飞章：验证演出（场上剩=答案可视化，SPEC-R30 §R1） */
    }
    if (cur !== run) return r;                   /* autoFly 窗内重玩同样丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉（零惩罚，可重点其它）
    q._miss = (q._miss || 0) + 1;
    if (el) el.classList.add('wrong');
    if (blind && !q._assist && q._miss >= 2) unlockAssist(q);   /* r30：盲飞章 miss≥2 先给支架工具 */
    const ok = optEl(q.answerIdx);
    /* 支架章连错 2 次 pulse 正确项（原样）；盲飞章延至 3 次——先给支架再泄答案 */
    if (ok && q._miss >= (blind ? 3 : 2)) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    if (blind && !q._assist) sayW(VOICE.calc.key, VOICE.calc.text);   /* 盲飞未解锁：引导语 */
    else sayW(VOICE.wrong.key, VOICE.wrong.text);   /* 6 岁试玩共性 P1：flat≥3 也给纠错语音（10s 节流） */
    await wait(520 * SPEED);
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
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
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.sub && sv.sub.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐只放飞（角标 1..M 依次出现、剩余虫呼吸）→演示选答案；
   独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  for (let i = 0; i < q.m; i++) {               // 演示逐只放飞（0 次边界：m≥1 恒 ≥1 次）
    pointGhostAt(bugEl(i), 'tut');
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    uiTapBug(i, true);
    await wait(560 * SPEED);
  }
  await wait(600 * SPEED);                      // 剩余虫呼吸高亮时刻（飞满 m 触发）
  pointGhostAt(optEl(q.answerIdx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await uiPick(q.answerIdx, true);
  const sv = KIDS._save();
  sv.sub = sv.sub || {};
  sv.sub.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来算一算"在重发后的题面上说（照 countchick m6 修复） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayP(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与场地交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  const hv = hintVoice();
  sayP(hv.key, hv.text);                         /* r30：盲飞章答前=calc 先算一算；支架/解锁后=hint */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  /* r30fix M3：答对演出窗（right 880ms+autoFly）/教学演示窗内 locked——重玩会重建关卡，旧 autoFly 续体
     的 bugEl(i) 按 data-i 全局匹配命中新关虫（新关虫视觉消失/幽灵飞来虫）；won 后（日末关闭停在已通关）
     locked 恒 true 但重玩是既有通路，故仅拦 locked&&!won（对照 hearBtn 演出窗门） */
  if (VERIFY || !cur || (state.locked && !state.won)) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) sayQ(q);                               /* 读题：题面 clip 段链 queue 拼播（T46 阶段2，缺段整句兜底） */
});
reflyBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiReFly();
});
fieldEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.animal');
  if (!el) {                                    // 点叶子空白：10s 节流轻提示（§0.16 非主交互轻反馈）
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won || state.demo) return;
    lastAct = Date.now();
    if (Date.now() - lastBlankHint > 10000) {
      lastBlankHint = Date.now();
      const hv = hintVoice();
      sayR(hv.key, hv.text);
    }
    return;
  }
  e.preventDefault();
  if (el.dataset.k === 'b') uiTapBug(Number(el.dataset.i));
  else uiTapLady(Number(el.dataset.i));
});
answersEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 救援提示 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    const hv = hintVoice();                     // r30：盲飞章答前=calc；救援语音不受 flat 门（§0.5）
    sayR(hv.key, hv.text);
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'subbug', title: '减法捕虫' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SUB = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { _fly: 0 };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      flyCount: q._fly || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { type: q.type, mode: cur.dch > 1 ? 'blind' : 'scaffold', assist: !!q._assist,
      form: q.form, n: q.n, m: q.m, b: q.b, c: q.c, s: q.s, flyIn: q.flyIn || 0,
      answer: q.answer, items: q.items.slice(),
      answerIdx: q.answerIdx,
      distractors: q.items.filter((v, i2) => i2 !== q.answerIdx),   /* SPEC §3 钩子契约 */
      step: cur.step, cross: q.cross, bugs: q.bugs.length,
      ladybugs: q.ladybugs.map(() => ({ kind: 'ladybug' })),
      flyCount: q._fly || 0, flown: q.bugs.map((_, i) => !!(q._flown && q._flown[i])) };
  },
  tapBug(i) { return uiTapBug(i); },
  tapLady(j) { return uiTapLady(j); },
  recount() { return uiReFly(); },              /* SPEC §3 钩子名：重新飞（盲飞两步题解锁后=重演） */
  pick(i) { return uiPick(i); },
  async autoSolve() {                           // UI 路径自动答完当前关（走真实流程；r30 分型：
    let n = 0;                                  //   支架章=放飞 m 只再选；盲飞章=直接选，答对后 autoFly 演出）
    while (cur && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (cur.dch === 1) for (let i = 0; i < q.m; i++) uiTapBug(i);
      await uiPick(q.answerIdx);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
