/* ================= countchick 主逻辑（草地撒点渲染 / 点数角标 / 十加几锚 / 两群比较 / 限时快数 / 教学 / 推进）
   玩法（r19）：count 章 11-20 只小鸡逐格点数（满 10 出「10+余数」chip=十加几结构化锚；章 2 混小鸭小兔只数小鸡）
   compare 章小鸡+小鸭两群各自清点（tally 并排）→ 问「多几只/少几只」选差值（域 1-5）
   flash 章小鸡短时呈现（flashMs=1200+n*100）→ 草丛遮盖 → 估计作答（选项间距 3，禁逐格数）
   验收钩子：window.CHK = { get currentLevel, get quiz, tapChick(i), tapDuck(j), tapOther(j), recount(),
     pick(i), start(f), modeled(f), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/题面语音不受 flat 门限制（7 岁半玩家评估 P1 + 5.5 岁试玩 P2：不识字孩子 flat≥3 全静默零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

const fieldEl = $id('field'), answersEl = $id('answers'), chipEl = $id('prompt-chip'),
      tenEl = $id('ten-chip'), recountBtn = $id('btn-recount'), reseeBtn = $id('btn-resee'),
      ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', flashing: false };
let lastAct = Date.now();
let lastDir = 0;                                // 家族 B 救援双锚：方向级节流锚（与 lastAct 分离）
let lastRescueAns = 0;                          // 答案级节流锚
let lastWrongVoice = 0;                         // 家族 J：错反馈语义句 10s 节流锚
let wrongChainUntil = 0;                        // 家族 I：错链豁免窗（窗内错点吞/对选放行）
let helpRedemo = false;
let flashToken = 0;                             // flash 呈现协程防重入令牌
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');
const chickEl = i => fieldEl.querySelector('.animal[data-k="c"][data-i="' + i + '"]');
const duckEl = j => fieldEl.querySelector('.animal[data-k="d"][data-i="' + j + '"]');
const otherEl = j => fieldEl.querySelector('.animal[data-k="o"][data-i="' + j + '"]');

/* ================= 存档脏键守卫 IIFE（键基 c-[0..4] 未变；先于 KIDS.init 读档执行）
   r18 坑③同族防线：非法键（如 lv>CH_LEN-1 的 '1-9'）=存档污染 → levels 清空重上教学，防生成关软锁 */
(function () {
  try {
    const raw = localStorage.getItem('kidsgame_countchick');
    if (!raw) return;
    const sv = JSON.parse(raw);
    if (!sv || !sv.levels) return;
    let bad = false;
    Object.keys(sv.levels).forEach(k => {
      const m = /^(\d+)-(\d+)$/.exec(k);
      if (!m || +m[1] < 1 || +m[2] > CH_LEN - 1) bad = true;
    });
    if (bad) { sv.levels = {}; localStorage.setItem('kidsgame_countchick', JSON.stringify(sv)); }
  } catch (e) {}
})();

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  recountBtn.innerHTML = ICONS.recount + '<span>重新数</span>';
  reseeBtn.innerHTML = ICONS.resee + '<span>再看一眼</span>';
  fieldEl.querySelector('.grass').innerHTML = grassSvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 咯咯声（Web Audio 合成）：新数到=双音上扬 / 已数过=低柔单音 / 干扰动物=更低哑声 */
const cluckHi = () => { if (!VERIFY) { KIDS.audio.note(988, 0.09, 0, 0.5); KIDS.audio.note(784, 0.1, 0.07, 0.4); } };
const cluckLo = () => { if (!VERIFY) KIDS.audio.note(660, 0.08, 0, 0.3); };
const quack = () => { if (!VERIFY) { KIDS.audio.note(392, 0.12, 0, 0.4); KIDS.audio.note(330, 0.12, 0.09, 0.35); } };
/* 吞输入容器动画（家族 D：吞点/吞选必配 bump，禁无声拒绝） */
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 900);
}

/* ================= 渲染 ================= */
function optBtn(t, i) {
  const b = document.createElement('button');
  b.className = 'opt';
  b.dataset.i = i;
  b.textContent = t;
  b.setAttribute('aria-label', '选 ' + t);
  return b;
}
/* 草地撒点：count(chicks+others)/compare(chicks+ducks) 同一拒绝采样流（中心距 ≥ 章 D），
   确定性纯函数（同 seed 同尺寸同布局）；排列随机化=防「数格子」捷径 */
function placeAnimals() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  fieldEl.querySelectorAll('.animal').forEach(el => el.remove());
  const C = CHAPTERS[cur.dch];
  const W = fieldEl.clientWidth, H = fieldEl.clientHeight;
  const ducks = q.type === 'compare' ? q.ducks : [];
  const total = q.chicks.length + q.others.length + ducks.length;
  const pts = scatterPts(mulberry32(q.seed), W, H, total, C.D, C.size / 2 + 8);
  const mk = (cls, svg, grp, i, p, size) => {
    const b = document.createElement('button');
    b.className = 'animal ' + cls;
    b.dataset.i = i;
    b.dataset.k = grp;
    b.setAttribute('aria-label', grp === 'c' ? '小鸡' + (i + 1) : grp === 'd' ? '小鸭' + (i + 1) : '其他动物');
    b.style.width = Math.round(size) + 'px';
    b.style.height = Math.round(size) + 'px';
    const base = grp === 'c' ? 0 : grp === 'd' ? q.chicks.length : q.chicks.length + ducks.length;
    const p0 = pts[base + i] || { x: W / 2, y: H / 2 };
    b.style.left = Math.round(p0.x - size / 2) + 'px';
    b.style.top = Math.round(p0.y - size / 2) + 'px';
    b.innerHTML = svg + '<span class="badge"></span>';
    b.style.setProperty('--s', grp === 'o' ? 1 : p.s);
    return b;
  };
  q.chicks.forEach((c, i) => fieldEl.appendChild(mk('chick', ANIMAL_SVG.chick(c), 'c', i, c, C.size * c.s)));
  ducks.forEach((d, j) => fieldEl.appendChild(mk('duck', ANIMAL_SVG.duck(d), 'd', j, d, C.size * d.s)));
  q.others.forEach((o, j) => fieldEl.appendChild(mk('other ' + o.kind, ANIMAL_SVG[o.kind](o), 'o', j, o, C.size * 0.92)));
  /* 恢复本题已数的角标（重渲染不丢进度） */
  q._badges = q._badges || [];
  q.chicks.forEach((c, i) => {
    if (q._badges[i]) {
      const b = chickEl(i).querySelector('.badge');
      b.textContent = q._badges[i];
      b.classList.add('on');
    }
  });
  q._badgesD = q._badgesD || [];
  ducks.forEach((d, j) => {
    if (q._badgesD[j]) {
      const b = duckEl(j).querySelector('.badge');
      b.textContent = q._badgesD[j];
      b.classList.add('on');
    }
  });
}
/* 十加几锚渲染：count 章数到 ≥10 显示（==0「满 10 啦」/>0「10 + k」），compare/flash 不出 */
function renderTen() {
  const q = cur && cur.quizzes[cur.step];
  const on = !!(q && q.type === 'count' && (q._cnt || 0) >= 10);
  tenEl.classList.toggle('on', on);
  if (on) {
    const k = (q._cnt || 0) - 10;
    tenEl.textContent = k === 0 ? '满 10 啦' : '10 + ' + k;
  }
}
/* 两群 tally 渲染（compare 章：双群清点进度并排呈现） */
function renderTally() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.type !== 'compare') return;
  const tc = $id('tally-c'), td = $id('tally-d');
  if (tc) tc.textContent = String(q._cnt || 0);
  if (td) td.textContent = String(q._cntD || 0);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  answersEl.innerHTML = '';
  reseeBtn.classList.remove('on');
  recountBtn.classList.toggle('hidden', q.type === 'flash');
  tenEl.classList.remove('on');
  if (q.type === 'compare') {
    const line = q.dir === 'more' ? VOICE.cmpMore : VOICE.cmpLess;
    chipEl.className = 'cmp';
    chipEl.innerHTML = ICONS.chickmini + '<div><div class="big">' + line.text + '？</div>' +
      '<div class="tally"><span class="t">' + ICONS.chickmini + '<span id="tally-c">0</span></span>' +
      '<span class="t">' + ICONS.duckmini + '<span id="tally-d">0</span></span></div></div>';
    q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
    renderStep();
    placeAnimals();
    renderTally();
    sayR(line.key, line.text);                  /* 题面问句无 flat 门（不识字孩子靠它做题，P2 教训） */
    return;
  }
  if (q.type === 'flash') {
    chipEl.className = 'flash';
    chipEl.innerHTML = ICONS.chickmini + '<div><div class="big">看一眼，有几只小鸡？</div>' +
      '<div class="sub">马上猜一猜，不用一个一个数</div></div>';
    chipEl.classList.add('mix');                /* 复用 .sub 显示通道 */
    q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
    renderStep();
    fieldEl.classList.add('hid');               // 起始遮盖：呈现窗=唯一暴露期
    placeAnimals();
    runFlash(false);
    return;
  }
  const mix = q.others.length > 0;
  chipEl.className = mix ? 'mix' : '';
  chipEl.innerHTML = ICONS.chickmini + '<div><div class="big">草地上有几只小鸡？</div>' +
    (mix ? '<div class="sub">只数黄色的小鸡哦</div>' : '') + '</div>';
  q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
  renderStep();
  placeAnimals();
  renderTen();
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

/* ================= flash 快数呈现协程（tok 防重入；resee=重播同窗不播问句） ================= */
async function runFlash(resee) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.type !== 'flash') return;
  const tok = ++flashToken;
  state.flashing = true;                        // 呈现+问句期：答案吞（家族 D bump）
  reseeBtn.classList.remove('on');
  if (!resee) {
    sayR(VOICE.flashQ.key, VOICE.flashQ.text);
    await wait(QWIN_FLASH * SPEED);
  }
  fieldEl.classList.remove('hid');
  await wait(q.flashMs * SPEED);
  if (tok !== flashToken || !cur || cur.quizzes[cur.step] !== q) return;   // 已切题/重开：弃
  fieldEl.classList.add('hid');
  state.flashing = false;
  const big = chipEl.querySelector('.big');
  if (big) big.textContent = '刚才有几只小鸡？';
  reseeBtn.classList.add('on');
  if (resee) q._resees = (q._resees || 0) + 1;
  lastAct = Date.now();
}

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
/* 第一只没数过的动物（_badges 稀疏数组：未点数时长度 0，findIndex 恒 -1——按 chicks/ducks 全长扫） */
function firstUncounted(q, grp) {
  const b = (grp === 'd' ? q._badgesD : q._badges) || [];
  const pool = (grp === 'd' ? q.ducks : q.chicks) || [];
  for (let k = 0; k < pool.length; k++) if (!b[k]) return k;
  return -1;
}
/* 教学"帮"阶段指向：第一只没数过的小鸡（compare 无教学）；全数完 → 指向正确答案（手口一致引导） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = firstUncounted(q, 'c');
  if (i >= 0) pointGhostAt(chickEl(i), 'tut');
  else pointGhostAt(optEl(q.answer), 'tut');
}

/* ================= 点数主路径（真实点击 / CHK 钩子 / autoSolve 共用） ================= */
function uiTapChick(i, demo) {
  /* 反方审查 M1：locked 门原样拦掉教学"看"演示的点数调用（demo 只豁免 demo 子句）——角标机制零演示。
     demo 通道仅 tutorialWatch 内部传 true（钩子/事件不传），locked 豁免随 demo 通道走，无绕锁面 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo) || state.flashing) {
    if (!demo && cur && !state.won) replayAnim(fieldEl, 'bump');   /* 吞输入轻叮容器（家族 D——试玩 P2-2：教学/锁定期真实点击不再静默） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.type === 'flash') return false;
  const r = engTap(cur, i, 'c');
  if (r === null) return false;
  lastAct = Date.now();
  const el = chickEl(i);
  if (el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  if (r > 0) {                                  // 新数到：角标递增 + 双音咯咯
    if (el) {
      const b = el.querySelector('.badge');
      b.textContent = r;
      b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    }
    sfx('pop');
    cluckHi();
    if (q.type === 'count' && r === 10 && !q._tenSaid) {   // 十加几锚：数满 10 播一次（不锁输入）
      q._tenSaid = true;
      sayR(VOICE.ten.key, VOICE.ten.text);
    }
    if (q.type === 'count') renderTen();
    if (q.type === 'compare') renderTally();
  } else {                                      // 已数过的：只跳一下不增号
    cluckLo();
  }
  if (state.tut === 'help') pointHelpNext();    // "帮"：跟着孩子的点数节奏指向下一只
  return r;
}
/* compare 章小鸭群清点（与小鸡各自独立角标/tally） */
function uiTapDuck(j) {
  if (!cur || state.locked || state.won || state.demo || state.flashing) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.type !== 'compare') return false;
  const r = engTap(cur, j, 'd');
  if (r === null) return false;
  lastAct = Date.now();
  const el = duckEl(j);
  if (el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  if (r > 0) {
    if (el) {
      const b = el.querySelector('.badge');
      b.textContent = r;
      b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    }
    sfx('pop');
    quack();
    renderTally();
  } else {
    cluckLo();
  }
  return r;
}
/* 干扰动物（章 2 小鸭/小兔）：摆动+哑声，不计数零惩罚 */
function uiTapOther(j) {
  if (!cur || state.locked || state.won || state.demo || state.flashing) return false;
  lastAct = Date.now();
  const el = otherEl(j);
  if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
  quack();
  return true;
}
/* 重新数：清零本题全部角标（两群一起清；防漏数重数核心操作） */
function uiRecount() {
  if (!cur || state.locked || state.won || state.demo || state.flashing) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.type === 'flash') return false;
  const had = engRecount(cur);
  fieldEl.querySelectorAll('.animal .badge.on').forEach(b => { b.classList.remove('on'); b.textContent = ''; });
  tenEl.classList.remove('on');
  renderTally();
  if (had) {
    sfx('click');
    recountBtn.classList.remove('bounce'); void recountBtn.offsetWidth; recountBtn.classList.add('bounce');
    KIDS.voice.play('chk_rec', VOICE.rec.text);   /* 按钮反馈语音（不识字孩子靠它理解功能，无 flat 门） */
  }
  lastAct = Date.now();
  return true;
}

/* ================= 答题主路径（真实点击 / CHK.pick / autoSolve 共用） ================= */
/* 错反馈语义句（家族 J）：flat<3 每错必播；flat≥3 10s 节流。返回是否起播（起播才设豁免窗） */
function sayW(q) {
  const line = q.type === 'compare' ? VOICE.cmpHint : q.type === 'flash' ? VOICE.flashHint : VOICE.hint;
  const now = Date.now();
  if (!cur || cur.flat < 3 || now - lastWrongVoice > 10000) {
    KIDS.voice.play(line.key, line.text);
    lastWrongVoice = now;
    return true;
  }
  return false;
}
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (state.flashing && !demo) {                // flash 呈现期吞选（家族 D bump）
    replayAnim(answersEl, 'bump');
    sfx('pop');
    return false;
  }
  if (i !== q.answer && wrongChainUntil && Date.now() < wrongChainUntil) {
    /* 契约 I：错链豁免窗内错点吞（不 shake 不计 retries；对选放行）。
       _miss 仍累计——连错 ≥2 的 pulse 提示通道保留（verify_one ⑩ 二错 pulse 口径） */
    q._miss = (q._miss || 0) + 1;
    if (q._miss >= 2) replayAnim(optEl(q.answer), 'pulse');
    replayAnim(answersEl, 'bump');
    sfx('pop');
    lastAct = Date.now();
    return false;
  }
  const r = engPick(cur, i);
  if (r === null || r === 'again') return r;
  lastAct = Date.now();
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
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉（零惩罚，可重点其它）；首错只轻提示，连错 2 次才高亮正确项
    q._miss = (q._miss || 0) + 1;
    if (el) el.classList.add('wrong');
    if (q._miss >= 2) replayAnim(optEl(q.answer), 'pulse');
    sfx('fail');
    if (sayW(q)) wrongChainUntil = Date.now() + WRONG_WIN[q.type];
    await wait(520 * SPEED);
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(f) {
  const ci = Math.floor((f == null ? cur.flat : f) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案实算（家族 F：禁 (ci+1)%4 章序推进） */
  if (ci < 4) return CHAPTERS[ci + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  state.flashing = false;
  flashToken++;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
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
  flashToken++;
  fieldEl.classList.remove('hid');
  reseeBtn.classList.remove('on');
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', flashing: false };
  helpRedemo = false;
  lastAct = Date.now();
  lastWrongVoice = 0; wrongChainUntil = 0;      // 契约 I/J：链窗/节流锚随关重置
  lastDir = 0; lastRescueAns = 0;
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.chk && sv.chk.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  sayR(VOICE.hint.key, VOICE.hint.text);        /* 开场任务语音不设 flat 门（5 岁半试玩共性 P2：不识字孩子 flat≥3 全静默） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点前 4 只小鸡（11-14 只全演示超耐心窗，SPEC §-r19 §5）→演示选答案；
   帮=指向下一只没数的小鸡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const demoN = Math.min(4, q.chicks.length);   // 演示头 4 只（点数机制已明；十加几锚留"帮"阶段真数）
  for (let i = 0; i < demoN; i++) {
    pointGhostAt(chickEl(i), 'tut');
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    uiTapChick(i, true);
    await wait(480 * SPEED);
  }
  await wait(400 * SPEED);
  pointGhostAt(optEl(q.answer), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await uiPick(q.answer, true);
  const sv = KIDS._save();
  sv.chk = sv.chk || {};
  sv.chk.tutSeen = true;
  KIDS.store.persist();
  /* 反方审查 m6：立即重发（闪现窗口缩到一帧），"你来数一数"在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', flashing: false };
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
function hintLine() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return VOICE.hint;
  if (q.type === 'compare') return VOICE.cmpHint;
  if (q.type === 'flash') return VOICE.flashHint;
  return VOICE.hint;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  const h = hintLine();
  sayP(h.key, h.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.type === 'compare') {
    const line = q.dir === 'more' ? VOICE.cmpMore : VOICE.cmpLess;
    sayR(line.key, line.text);
  } else if (q.type === 'flash') {
    sayR(VOICE.flashQ.key, VOICE.flashQ.text);
  } else {
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});
recountBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiRecount();
});
/* flash 重播（再看一眼）：零惩罚，每次重播同窗长（仍数不完=估计任务保真；SPEC §-r19 判分口径） */
function uiResee() {
  if (!cur || state.locked || state.won || state.flashing) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.type !== 'flash') return false;
  lastAct = Date.now();
  runFlash(true);
  return true;
}
reseeBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  uiResee();
});
fieldEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.animal');
  if (!el) return;
  e.preventDefault();
  const q = cur && cur.quizzes[cur.step];
  if (q && q.type === 'flash') {                // 估计任务禁逐格点数：吞+ bump（家族 D）
    replayAnim(fieldEl, 'bump');
    sfx('pop');
    lastAct = Date.now();
    return;
  }
  if (el.dataset.k === 'c') uiTapChick(Number(el.dataset.i));
  else if (el.dataset.k === 'd') uiTapDuck(Number(el.dataset.i));
  else uiTapOther(Number(el.dataset.i));
});
answersEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护（家族 B 双锚）：14s 方向级 / 30s 答案级；教学 5s 重演示一次 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo || state.flashing) return;
  if (Date.now() < wrongChainUntil) return;     // 契约 I：错链窗内让路（音频播完再救援）
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   // 契约 K：面板在场不救援
  const now = Date.now(), idle = now - lastAct, q = cur.quizzes[cur.step];
  if (!q) return;
  if (idle > RESCUE_ANS_MS && now - lastRescueAns > RESCUE_ANS_MS) {
    /* 答案级：30s 仍无动作 → 高亮正确项（此时已过两轮方向提示） */
    lastRescueAns = now;
    replayAnim(optEl(q.answer), 'pulse');
    const h = hintLine();
    sayR(h.key, h.text);
    return;
  }
  if (idle > RESCUE_DIR_MS && now - lastDir > RESCUE_DIR_MS) {
    /* 方向级：14s → 指向下一只没数的（compare 先小鸡后小鸭；flash 指再看一眼）——不泄答案 */
    lastDir = now;
    if (q.type === 'flash') {
      reseeBtn.classList.remove('bounce'); void reseeBtn.offsetWidth; reseeBtn.classList.add('bounce');
      sayR(VOICE.flashQ.key, VOICE.flashQ.text);
    } else {
      const i = firstUncounted(q, 'c');
      const j = firstUncounted(q, 'd');
      if (i >= 0) replayAnim(chickEl(i), 'pulse');
      else if (j >= 0) replayAnim(duckEl(j), 'pulse');
      const h = hintLine();
      sayR(h.key, h.text);
    }
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'countchick', title: '数数小鸡' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = Math.max(0, lim - 1);               // 家族 A：日末停留今日末关（禁 null 实参形态）
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.CHK = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      counted: ((cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)]) || { _cnt: 0 })._cnt || 0 } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const truth = q.type === 'compare' ? q.diff : q.n;
    return { type: q.type, n: q.n, m: q.m || 0, diff: q.diff || 0, dir: q.dir || null,
      items: q.items.slice(), answer: truth, answerIdx: q.answer,
      distractors: q.items.filter((v, i2) => i2 !== q.answer),   /* SPEC §1 钩子契约（反方审查 m4） */
      step: cur.step, chicks: q.chicks.length, ducks: q.ducks ? q.ducks.length : 0,
      others: q.others.map(o => ({ kind: o.kind })),
      counted: q._cnt || 0, countedD: q._cntD || 0,
      badges: (q._badges || []).slice(), badgesD: (q._badgesD || []).slice(),
      flashMs: q.flashMs || 0, flashing: !!state.flashing, resees: q._resees || 0,
      ten: q.type === 'count' && (q._cnt || 0) >= 10 ? '10 + ' + ((q._cnt || 0) - 10) : null };
  },
  tapChick(i) { return uiTapChick(i); },
  tapDuck(j) { return uiTapDuck(j); },
  tapOther(j) { return uiTapOther(j); },
  recount() { return uiRecount(); },
  resee() { return uiResee(); },
  pick(i) { return uiPick(i); },
  start(f) { startLevel(f); },
  modeled(f) { return modeledMs(f); },
  async autoSolve() {                           // UI 路径自动答完当前关（点满角标后选答案，走真实流程）
    let n = 0;
    while (cur && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      /* 呈现窗/答对演出锁窗都等出（外部真实点击推进 step 后立刻调 autoSolve 的竞速：
         锁窗内 40 次微任务自旋会被 locked 全拒——等锁释放再取态） */
      while (state.flashing || (state.locked && !state.won)) await wait(60);
      for (let i = 0; i < q.chicks.length; i++) uiTapChick(i);
      if (q.type === 'compare') for (let j = 0; j < q.ducks.length; j++) uiTapDuck(j);
      await uiPick(q.answer);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
