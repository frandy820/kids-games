/* ================= pattern 主逻辑 =================
   玩法：图案序列（5-8 可见 + 1 问号卡，缺失在末尾或中间）→ 下方 3 选 1 大按钮
   答对 = 问号卡 3D 翻开 + 序列从头逐张弹跳回放（马林巴音阶随行，强化"规律感"）
   答错 = 按钮 3D 晃 + 灰掉 + 正确项高亮 1.2s（支架，零惩罚可重点）
   全关 3-5 题过关：全对 3 星 / 总重试≤3 2 星 / 否则 1 星
   验收钩子：window.PAT = { currentLevel, quiz(), pick(i), autoSolve() }
   verify=1：stub 发声 + 提速（同一代码路径） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const VD = VERIFY ? 0.22 : 1; // verify 模式动画整体提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const note = (f, d) => { if (!VERIFY) KIDS.audio.note(f, d, 0, 0.5); };
/* 游戏语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };

const seqEl = $id('seq'), stageEl = $id('stage'), choicesEl = $id('choices'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

let cur = null;                       // 当前关模型（makeLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let settleP = Promise.resolve();      // 最近一次 pick 的动画管道（autoSolve 顺序等待）
let tutRedemo = false, ghostOn = false;

const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 78);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderQuiz() {
  const q = cur && cur.quizzes[Math.min(cur.qi, cur.quizzes.length - 1)];
  if (!q) return;
  layoutSeq(q.len);
  seqEl.innerHTML = '';
  for (let i = 0; i < q.len; i++) {
    const d = document.createElement('div');
    d.className = 'seqcard';
    d.dataset.i = i;
    d.setAttribute('aria-label', '第' + (i + 1) + '张图案');
    if (i === q.missingIdx) {
      d.classList.add('q');
      d.innerHTML = '<div class="qinner"><div class="qface">' + QUESTION_SVG + '</div>' +
        '<div class="aface">' + iconSVG(q.answer) + '</div></div>';
    } else {
      d.innerHTML = iconSVG(q.seq[i]);
    }
    seqEl.appendChild(d);
  }
  choicesEl.innerHTML = '';
  q.items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.dataset.i = i;
    b.setAttribute('aria-label', '选项' + (i + 1));
    b.innerHTML = iconSVG(it);
    choicesEl.appendChild(b);
  });
  renderTray();
}
function choiceEl(i) { return choicesEl.querySelector('.choice[data-i="' + i + '"]'); }
/* 卡尺寸按 stage 实时算：序列卡下限 64、上限 132（问号卡与图案卡同尺寸） */
function layoutSeq(n) {
  const availW = stageEl.clientWidth - 24, availH = stageEl.clientHeight - 14, g = 16;
  const cap = window.matchMedia('(orientation:portrait)').matches ? 152 : 132; // 竖屏宽度充裕，序列卡放大（视觉评估 P1）
  const size = Math.max(64, Math.min(Math.floor((availW - (n - 1) * g) / n), Math.floor(availH * 0.88), cap));
  document.documentElement.style.setProperty('--card', size + 'px');
  document.documentElement.style.setProperty('--gap', g + 'px');
}
window.addEventListener('resize', () => {
  if (cur && cur.quizzes.length) layoutSeq(cur.quizzes[Math.min(cur.qi, cur.quizzes.length - 1)].len);
});
function renderTray() { // 本关题目进度点
  const t = $id('quiz-tray');
  t.innerHTML = '';
  if (!cur) return;
  for (let i = 0; i < cur.quizzes.length; i++) {
    const d = document.createElement('i');
    if (i < cur.qi) d.className = 'on';
    else if (i === cur.qi && !cur.won) d.className = 'cur';
    t.appendChild(d);
  }
}
function renderDots() { // 章节点（ch 1 基；无限生成章只画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  if (!cur) return;
  const ch = Math.floor(cur.flat / CH_LEN) + 1, sv = KIDS._save() || { levels: {} };
  for (let c = 0; c < ch; c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[(c + 1) + '-' + l]);
    i.className = done ? 'done' : (c === ch - 1 ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学"帮"） ================= */
const ghost = {
  toEl(el) {
    const r = el.getBoundingClientRect();
    ghostEl.style.left = (r.left + r.width / 2) + 'px';
    ghostEl.style.top = (r.top + r.height * 0.62) + 'px';
  },
  show() { ghostOn = true; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostOn = false; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAtChoice() {
  if (VERIFY || !cur) return;
  const q = cur.quizzes[Math.min(cur.qi, cur.quizzes.length - 1)];
  const el = q && choiceEl(q.correctIdx);
  if (!el) return;
  ghost.toEl(el); ghost.show();
  setTimeout(() => ghost.press(), 800);
}

/* ================= 点选主路径（真实点击 / PAT.pick / autoSolve 共用） ================= */
function pick(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.qi];
  if (!q || i < 0 || i >= q.items.length) return false;
  lastAct = Date.now();
  const r = engPick(cur, i);
  state.locked = true;
  settleP = r === 'correct' ? correctFlow(q, i) : wrongFlow(q, i);
  return r;
}
async function wrongFlow(q, i) { // 错=晃+灰掉；正确项高亮 1.2s；同题连错 2 次幽灵手指救援；停留本题零惩罚
  sfx('fail');
  const wb = choiceEl(i);
  if (wb) wb.classList.add('wrong');
  const rb = choiceEl(q.correctIdx);
  if (rb) {
    rb.classList.add('reveal');
    setTimeout(() => rb.classList.remove('reveal'), 1200 * VD + 60);
  }
  q._miss = (q._miss || 0) + 1;                 // 同题连错救援（6 岁玩家评估：无人救援直接放弃；教玩观察 P1：3.6s 会错过 → 常驻至答对，correctFlow 收指）
  if (q._miss >= 2 && rb) {
    ghost.toEl(rb); ghost.show();
    setTimeout(() => ghost.press(), 400);
  }
  await wait(1280 * VD);
  state.locked = false;
}
async function correctFlow(q, i) { // 问号翻开 → 序列逐张弹跳回放 → 下一题/过关（救援手指随之收起）
  ghost.hide();
  const btn = choiceEl(i);
  if (btn) btn.classList.add('right');
  sfx('coin');
  const qc = seqEl.querySelector('.seqcard[data-i="' + q.missingIdx + '"]');
  if (qc) qc.classList.add('rev');
  await wait(600 * VD);
  const cards = seqEl.children;
  for (let k = 0; k < cards.length; k++) {
    const c = cards[k], kk = k;
    setTimeout(() => {
      if (!seqEl.contains(c)) return;
      c.classList.remove('bounce'); void c.offsetWidth; c.classList.add('bounce');
      note(523.25 * Math.pow(2, (kk % 5) * 0.2), 0.16); // 五声音阶随行
    }, k * 150 * VD);
  }
  await wait((cards.length * 150 + 600) * VD);
  if (state.tut === 'help') { // 教学"独"：首次答对 → 强化反馈，放手独立完成
    state.tut = 'solo';
    ghost.hide();
    sfx('ok');
    hopRabbit();
  }
  if (engWon(cur)) { winFlow(); return; }
  state.locked = false;
  if (!state.demo) renderQuiz(); // 教学演示态不推进（由 tutorialWatch 重发同一关）
}

/* ================= 教学：看-帮-独（仅关 1-0 首次，save.pat.tutSeen 记住演示已放过） ================= */
function helpPulse() { // "帮"：高亮序列前段（规律起点，第一个周期）
  const q = cur.quizzes[Math.min(cur.qi, cur.quizzes.length - 1)];
  if (!q) return;
  const p = rulePeriod(q.rule);
  for (let i = 0; i < Math.min(p + 1, q.len); i++) {
    if (i === q.missingIdx) continue;
    const c = seqEl.querySelector('.seqcard[data-i="' + i + '"]');
    if (c) c.classList.add('lead');
  }
}
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('pat_tut_watch', '看！找一找图案的秘密');
  await wait(800 * VD);
  const q = cur.quizzes[0];
  const rb = choiceEl(q.correctIdx);          // 看：先亮出正确项
  if (rb) rb.classList.add('reveal');
  await wait(900 * VD);
  if (rb) rb.classList.remove('reveal');
  engPick(cur, q.correctIdx);                 // 引擎走真路径
  await correctFlow(q, q.correctIdx);         // 翻开 + 回放（demo 态不推进渲染）
  const sv = KIDS._save();
  sv.pat = sv.pat || {};
  sv.pat.tutSeen = true;
  KIDS.store.persist();
  sayP('pat_tut_turn', '你来接着摆');
  await wait(500 * VD);
  /* 重新发同一关（确定性布局一致），进入"帮" */
  cur = makeLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  tutRedemo = false;
  lastAct = Date.now();
  renderQuiz();
  helpPulse();
  setTimeout(() => { if (state.tut === 'help' && !ghostOn) pointGhostAtChoice(); }, 900);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
const HINTS = { 1: '图案排队的秘密规律哦', 2: '中间藏起来的图案哦', 3: '颜色和形状的新规律', 4: '数量和形状一起变哦' };
const GEN_HINTS = ['更长的图案队伍哦', '中间缺失的侦探挑战哦', '双维度的秘密排列哦', '数量和形状一起变哦'];
function nextHint(ci) {
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN);
  if (ci >= 4) return '明天有' + GEN_HINTS[ci % GEN_HINTS.length];
  return HINTS[ci] || '有新的关卡哦';
}
function winFlow() {
  state.won = true; state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return; // verify：不弹层不写档（KIDS 未 init；引擎态已到 won）
  KIDS.ui.celebrate(stars).then(() => {
    const ci = Math.floor(cur.flat / CH_LEN), ch = ci + 1, lv = cur.flat % CH_LEN;
    const pr = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity); // 关卡无限：日历不设内容上限
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: ch, stars: stars5, nextHint: nextHint(ci + 1) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() { // 进入今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur.flat); // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  tutRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.pat && sv.pat.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('pat_hint', '看看前面的图案');
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
function bounceVisible() { // "再看一看"：重放当前可见序列（不改变状态）
  const cards = seqEl.children;
  for (let k = 0; k < cards.length; k++) {
    const c = cards[k], kk = k;
    setTimeout(() => {
      if (!seqEl.contains(c)) return;
      c.classList.remove('bounce'); void c.offsetWidth; c.classList.add('bounce');
      note(523.25 * Math.pow(2, (kk % 5) * 0.2), 0.14);
    }, k * 130);
  }
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP('pat_hint', '看看前面的图案');
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  lastAct = Date.now();
  bounceVisible();
});
choicesEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.choice');
  if (!el) return;
  e.preventDefault();
  if (el.classList.contains('wrong')) return;
  pick(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示目标 / 教学 5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayP('pat_hint', '看看前面的图案');
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !tutRedemo && !ghostOn) {
    tutRedemo = true;
    pointGhostAtChoice();
  }
}, 1000);

/* ================= ?verify=1 自检 =================
   ① 静态 20 + 生成 20 关（flat 20-39）：确定性 / 规律正确性（按 ruleAt 复推；
     双维度关形状轴/颜色轴分别校验；r27 复合关三轴分别校验+每题几何与模板表对账）/
     干扰项 ≠answer 且三项互异且规律外
   ② autoSolve 引擎直驱 40 关全通关（每题点正确项，0 重试）
   ③ 单元：星级映射（含永不 0 星）/ 错选零惩罚（计重试停留本题，重点后推进）
   ④ r27 单元：谱对账（SPEC 独立字面副本 vs 引擎谱/模板/保留基线六关）+
     新形态性质（dualP 合成周期 6 互异 / compound 半对干扰轴性质 / 正式谱零低段
     模板 / 中间缺失非末位 / 最长序列=8）
   ⑤ UI 路径 autoSolve 通关关 0（真实 pick+动画管线，提速）
   ⑥ 布局抽查：最长序列实建 DOM，卡 ≥64、选项 ≥80、无横向溢出 */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {};
  let npass = 0, total = 0;
  const strip = L => ({ ch: L.ch, quizzes: L.quizzes.map(q => ({ len: q.len, miss: q.missingIdx, seq: q.seq, items: q.items, correctIdx: q.correctIdx })) });
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = makeLevel(flat), L2 = makeLevel(flat), tmp = makeLevel(flat);
    const det = JSON.stringify(strip(L1)) === JSON.stringify(strip(L2));
    let ruleOk = true, uniqOk = true, distinctOk = true, outOk = true;
    L1.quizzes.forEach(q => {
      for (let i = 0; i < q.len; i++) { // ① 规律正确性：程序按 ruleAt 推断
        const exp = ruleAt(q.rule, i);
        if (i === q.missingIdx) { if (!sameItem(exp, q.answer)) ruleOk = false; }
        else if (!sameItem(exp, q.seq[i])) ruleOk = false;
      }
      if (q.rule.kind === 'dual' || q.rule.kind === 'dualP') { // 双维度：两轴分别校验（含 answer 位；dualP 两轴周期不同长）
        const sp = q.rule.shapes.length, cp = q.rule.colors.length;
        for (let i = 0; i < q.len; i++) {
          const at = i === q.missingIdx ? q.answer : q.seq[i];
          if (at.shape !== q.rule.shapes[i % sp] || at.color !== q.rule.colors[i % cp]) ruleOk = false;
        }
      }
      if (q.rule.kind === 'compound') { // 复合：形状轴交替 + 数量轴等差 + 固定颜色，三轴分别校验
        for (let i = 0; i < q.len; i++) {
          const at = i === q.missingIdx ? q.answer : q.seq[i];
          if (at.shape !== q.rule.shapes[i % 2] || at.color !== q.rule.color ||
              at.count !== q.rule.start + q.rule.step * i) ruleOk = false;
        }
      }
      // r27 谱对账：每题几何（len/miss/kind）与模板表逐题一致（防模板表与谱漂移）
      if (!q.tk || !QUIZ_T[q.tk] || q.len !== QUIZ_T[q.tk].total ||
          q.missingIdx !== QUIZ_T[q.tk].miss || q.rule.kind !== QUIZ_T[q.tk].kind) ruleOk = false;
      // ② 唯一性：answer 在 items 中恰一次且 correctIdx 指向它；三项互异
      if (q.correctIdx < 0 || !sameItem(q.items[q.correctIdx], q.answer)) uniqOk = false;
      if (q.items.filter(it => sameItem(it, q.answer)).length !== 1) uniqOk = false;
      if (new Set(q.items.map(itemKey)).size !== 3) distinctOk = false;
      // ③ 干扰项取自同池且规律外（≠ruleAt 任何输出）
      const outs = ruleOutputs(q.rule, q.len).map(itemKey);
      q.items.forEach((it, i) => { if (i !== q.correctIdx && outs.indexOf(itemKey(it)) >= 0) outOk = false; });
    });
    // ④ autoSolve 引擎直驱通关
    let solveOk = true;
    while (!engWon(tmp)) {
      const q = tmp.quizzes[tmp.qi];
      if (engPick(tmp, q.correctIdx) !== 'correct') { solveOk = false; break; }
    }
    if (tmp.misses !== 0) solveOk = false;
    const ok = det && ruleOk && uniqOk && distinctOk && outOk && solveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, quizzes: L1.quizzes.length, det, ruleOk, uniqOk, distinctOk, outOk, solveOk, ok };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = Object.assign({ key: keyOf(flat) }, rec);
  }
  /* 单元 1：星级映射（全对 3 / ≤3 重试 2 / 否则 1，永不 0） */
  total++;
  const s = m => engStars({ misses: m });
  const starsOk = s(0) === 3 && s(3) === 2 && s(4) === 1 && s(99) === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, map: { 0: s(0), 3: s(3), 4: s(4), 99: s(99) } };
  /* 单元 2：错选零惩罚（计一次重试、停留本题），重点正确后推进 */
  total++;
  const L = makeLevel(2);
  const w1 = engPick(L, (L.quizzes[0].correctIdx + 1) % 3);
  const stayed = w1 === 'wrong' && L.misses === 1 && L.qi === 0;
  const w2 = engPick(L, L.quizzes[0].correctIdx);
  const advanced = w2 === 'correct' && L.qi === 1;
  const wrongOk = stayed && advanced;
  if (wrongOk) npass++;
  units.wrongPick = { ok: wrongOk, stayed, advanced };
  /* 单元 3（r27）：谱对账——SPEC 独立字面副本 vs 引擎（谱/模板/保留基线被改而本表未同步即红） */
  total++;
  const specOk = (function () {
    const TPL = { // 模板几何+kind 独立副本（含 cycle 的 pat）
      AB_END: { kind: 'cycle', pat: [0, 1], total: 5, miss: 4 },
      ABB_END: { kind: 'cycle', pat: [0, 1, 1], total: 6, miss: 5 },
      ABC_END: { kind: 'cycle', pat: [0, 1, 2], total: 6, miss: 5 },
      ABCD_END: { kind: 'cycle', pat: [0, 1, 2, 3], total: 8, miss: 7 },
      ABC_MID: { kind: 'cycle', pat: [0, 1, 2], total: 7, miss: 4 },
      ABCD_MID: { kind: 'cycle', pat: [0, 1, 2, 3], total: 7, miss: 4 },
      ABBC_END: { kind: 'cycle', pat: [0, 1, 1, 2], total: 8, miss: 7 },
      ABBC_MID: { kind: 'cycle', pat: [0, 1, 1, 2], total: 8, miss: 5 },
      DUAL_END: { kind: 'dual', total: 5, miss: 4 },
      DUAL_MID: { kind: 'dual', total: 5, miss: 2 },
      DUALP_END: { kind: 'dualP', total: 6, miss: 5 },
      DUALP_MID: { kind: 'dualP', total: 6, miss: 3 },
      CNT_UP1: { kind: 'count', total: 5, miss: 4 },
      CNT_DN1: { kind: 'count', total: 5, miss: 4 },
      CNT_UP2: { kind: 'count', total: 5, miss: 4 },
      CNT_UP1M: { kind: 'count', total: 5, miss: 2 },
      CMP_END: { kind: 'compound', total: 5, miss: 4 },
      CMP_MID: { kind: 'compound', total: 5, miss: 2 },
      CMP2_END: { kind: 'compound', total: 5, miss: 4 }
    };
    const SPEC_T27_STATIC = [ // r27 静态 20 关谱独立副本
      ['AB_END', 'ABB_END', 'ABC_END'],
      ['ABC_END', 'ABC_MID', 'ABC_END'],
      ['ABC_END', 'DUAL_END', 'ABBC_END'],
      ['ABCD_END', 'ABC_END', 'DUAL_END'],
      ['ABCD_END', 'ABBC_END', 'DUAL_MID'],
      ['ABC_MID', 'ABBC_END', 'ABC_MID', 'ABBC_END'],
      ['ABCD_MID', 'ABC_MID', 'DUAL_MID', 'ABBC_END'],
      ['ABCD_MID', 'ABBC_END', 'DUAL_END', 'ABBC_MID'],
      ['ABBC_MID', 'ABCD_MID', 'ABC_MID', 'DUAL_MID'],
      ['ABCD_MID', 'ABBC_MID', 'DUAL_MID', 'ABC_END'],
      ['DUAL_END', 'DUAL_END', 'DUAL_MID', 'DUAL_END'],
      ['DUAL_END', 'DUAL_MID', 'DUAL_END', 'DUAL_MID'],
      ['DUAL_MID', 'DUAL_END', 'DUAL_END', 'DUAL_MID'],
      ['DUAL_END', 'DUAL_MID', 'DUAL_MID', 'DUAL_END'],
      ['DUAL_END', 'DUALP_END', 'DUAL_MID', 'DUALP_END'],
      ['CNT_UP1', 'CNT_UP1', 'CNT_DN1', 'CNT_UP1', 'CNT_UP1'],
      ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1', 'CNT_DN1'],
      ['CMP_END', 'CNT_UP2', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
      ['CNT_UP2', 'CMP2_END', 'CNT_DN1', 'CMP_MID', 'CMP_END'],
      ['CMP2_END', 'CNT_UP1M', 'CMP_MID', 'CNT_UP2', 'CMP_END']
    ];
    const SPEC_T27_GEN = [ // r27 生成关主题池独立副本（审查M1 r27：theme0 池 ABB_END→DUAL_END
      // ——原池回混低段模板与 §R1「ABB 仅 flat0 坡度」声明矛盾，合审计原判全退役）
      ['ABC_END', 'ABBC_END', 'ABCD_END', 'ABC_MID', 'DUAL_END'],
      ['ABCD_MID', 'ABBC_MID', 'DUAL_END', 'ABC_MID', 'DUAL_MID'],
      ['DUAL_END', 'DUAL_MID', 'DUALP_END', 'DUALP_MID'],
      ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1M', 'CMP_END', 'CMP_MID', 'CMP2_END']
    ];
    // 图标预算对账：cycle=实借数 max(pat)+1（=pat 去重数——pat 是池位索引连续从 0 起，
    // [0,1,1] 去重 {0,1} 恰 max+1=2；试玩P3-4 r27 勘误：审查M2 首判与主线首轮修复均误算
    // max([0,1,1])=2，实为 1→实借 2，COST 曾误改 3 已回精确口径 2）、dual/dualP=2、count=1、
    // compound=2——每关前缀和恒 ≤12（材料袋 12 枚整级借出，超限=take 返短崩溃）；生成池按
    // CH_QUIZN 窗口全旋转枚举同检（谱动预算不动=红，防未来改谱复发本崩类）
    const COST = { AB_END: 2, ABB_END: 2, ABC_END: 3, ABC_MID: 3, ABCD_END: 4, ABCD_MID: 4,
      ABBC_END: 3, ABBC_MID: 3, DUAL_END: 2, DUAL_MID: 2, DUALP_END: 2, DUALP_MID: 2,
      CNT_UP1: 1, CNT_DN1: 1, CNT_UP2: 1, CNT_UP1M: 1, CMP_END: 2, CMP_MID: 2, CMP2_END: 2 };
    const prefixOk = tks => tks.every((_, i) => tks.slice(0, i + 1).reduce((s, t) => s + COST[t], 0) <= 12);
    if (!STATIC_SPECS.every(prefixOk)) return false;
    let genBudgetOk = true;
    SPEC_T27_GEN.forEach(function (pool, ti) {
      const n = [3, 4, 4, 5][ti];
      for (let s = 0; s < pool.length; s++) {
        const win = [];
        for (let i = 0; i < n; i++) win.push(pool[(s + i) % pool.length]);
        if (!prefixOk(win)) genBudgetOk = false;
      }
    });
    if (!genBudgetOk) return false;
    if (JSON.stringify(Object.keys(QUIZ_T).sort()) !== JSON.stringify(Object.keys(TPL).sort())) return false;
    for (const k in TPL) {
      if (QUIZ_T[k].kind !== TPL[k].kind || QUIZ_T[k].total !== TPL[k].total || QUIZ_T[k].miss !== TPL[k].miss) return false;
      if (TPL[k].pat && JSON.stringify(QUIZ_T[k].pat) !== JSON.stringify(TPL[k].pat)) return false;
    }
    if (JSON.stringify(STATIC_SPECS) !== JSON.stringify(SPEC_T27_STATIC)) return false;
    if (JSON.stringify(CH_TPL) !== JSON.stringify(SPEC_T27_GEN) || JSON.stringify(CH_QUIZN) !== JSON.stringify([3, 4, 4, 5])) return false;
    const BASE = { // 保留基线谱字面副本（r27 前原谱——六关必须原样，改一字即红）
      10: ['DUAL_END', 'DUAL_END', 'DUAL_MID', 'DUAL_END'],
      11: ['DUAL_END', 'DUAL_MID', 'DUAL_END', 'DUAL_MID'],
      12: ['DUAL_MID', 'DUAL_END', 'DUAL_END', 'DUAL_MID'],
      13: ['DUAL_END', 'DUAL_MID', 'DUAL_MID', 'DUAL_END'],
      15: ['CNT_UP1', 'CNT_UP1', 'CNT_DN1', 'CNT_UP1', 'CNT_UP1'],
      16: ['CNT_UP1', 'CNT_DN1', 'CNT_UP2', 'CNT_UP1', 'CNT_DN1']
    };
    for (const f in BASE) if (JSON.stringify(STATIC_SPECS[f]) !== JSON.stringify(BASE[f])) return false;
    return STATIC_SPECS[0][0] === 'AB_END'; // 教学链首题锚
  })();
  if (specOk) npass++;
  units.spec27 = { ok: specOk };
  /* 单元 4（r27）：新形态性质——dualP 独立双轴 / compound 半对干扰 / 谱上探锚 / 序列长度 */
  total++;
  let nk = true, longest = 0;
  const flatKinds = {}, flatTks = {};
  for (let f = 0; f < 40; f++) {
    const L = makeLevel(f);
    flatKinds[f] = L.quizzes.map(q => q.rule.kind);
    flatTks[f] = L.quizzes.map(q => q.tk);
  }
  if (flatTks[14].indexOf('DUALP_END') < 0) nk = false;                                // ch3 章末 dualP
  [17, 18, 19].forEach(f => { if (flatKinds[f].indexOf('compound') < 0) nk = false; });   // 静态复合关
  [30, 31, 32, 33, 34].forEach(f => { if (flatKinds[f].indexOf('dualP') < 0) nk = false; }); // 生成关 theme2
  [35, 36, 37, 38, 39].forEach(f => { if (flatKinds[f].indexOf('compound') < 0) nk = false; }); // 生成关 theme3
  for (let f = 1; f < 40; f++) { // 零低段模板全域断言（审查M1 r27 扩生成关：AB/ABB 限 flat0
    // 坡度、AABB/AB_MID 全退役——原 flat1-9 范围漏生成关，theme0 池曾回混 ABB 无断言拦截）
    flatTks[f].forEach(tk => { if (tk === 'AB_END' || tk === 'ABB_END' || tk === 'AABB_END' || tk === 'AB_MID') nk = false; });
  }
  for (let f = 0; f < 40; f++) makeLevel(f).quizzes.forEach(q => {
    longest = Math.max(longest, q.len);
    if (/_MID$/.test(q.tk) && !(q.missingIdx >= 2 && q.missingIdx < q.len - 1)) nk = false; // 中间缺失=非末位
    if (q.rule.kind === 'dualP') { // 合成周期 6 且 6 项互异（颜色轴若退化回 2 → 仅 2 项 → 红）
      if (rulePeriod(q.rule) !== 6 || new Set(ruleOutputs(q.rule, 6).map(itemKey)).size !== 6) nk = false;
    }
    if (q.rule.kind === 'compound') { // 复合：数量轴全程 1-9 + 半对干扰轴性质（d1 形错数对 / d2 形对数错且规律外）
      const outs = ruleOutputs(q.rule, q.len);
      const usedC = outs.map(o => o.count);
      if (outs.some(o => o.count < 1 || o.count > 9)) nk = false;
      if (rulePeriod(q.rule) !== 2) nk = false;
      const wrongs = q.items.filter((it, i) => i !== q.correctIdx);
      if (!wrongs.some(w => w.count === q.answer.count && w.shape !== q.answer.shape)) nk = false;
      if (!wrongs.some(w => w.shape === q.answer.shape && w.count !== q.answer.count && usedC.indexOf(w.count) < 0)) nk = false;
      if (wrongs.some(w => w.color !== q.rule.color)) nk = false;
    }
  });
  if (longest !== 8) nk = false; // 序列长度上探锚（ABCD/ABBC=8 卡）
  if (nk) npass++;
  units.newKinds = { ok: nk, longest: longest };
  /* 单元 5：UI 路径 autoSolve 通关关 0（真实 pick/翻开/回放管线） */
  total++;
  startLevel(0);
  await autoSolveAsync();
  const uiOk = !!(cur && cur.won && engStars(cur) === 3 && cur.misses === 0);
  if (uiOk) npass++;
  units.autoSolveUI = { ok: uiOk, misses: cur.misses, stars: engStars(cur) };
  /* 布局抽查：40 关里最长序列实建 DOM 量尺寸 */
  let big = null;
  for (let f = 0; f < 40; f++) {
    makeLevel(f).quizzes.forEach(q => { if (!big || q.len > big.len) big = q; });
  }
  cur = { flat: 0, ch: 1, quizzes: [big], qi: 0, misses: 0, won: false };
  state = { locked: false, won: false, demo: false, tut: 'none' };
  renderQuiz();
  const de = document.documentElement;
  const card0 = seqEl.querySelector('.seqcard').getBoundingClientRect();
  const ch0 = choicesEl.querySelector('.choice').getBoundingClientRect();
  const layout = {
    overflowX: de.scrollWidth - window.innerWidth,
    cardW: Math.round(card0.width), cardH: Math.round(card0.height),
    choiceW: Math.round(ch0.width), choiceH: Math.round(ch0.height), cards: big.len
  };
  const layoutOk = layout.overflowX <= 0 && layout.cardW >= 64 && layout.cardH >= 64 &&
    layout.choiceW >= 80 && layout.choiceH >= 80;
  const out = { game: 'pattern', total, pass: npass, layoutOk, layout, levels, gen, units };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ================= autoSolve：经 pick 真实管线通关当前关 ================= */
async function autoSolveAsync() {
  let guard = 0;
  while (cur && !cur.won && guard++ < 80) {
    const q = cur.quizzes[cur.qi];
    if (!q) break;
    pick(q.correctIdx);
    await settleP;
    await wait(30);
  }
  return !!(cur && cur.won);
}

/* ================= 启动 ================= */
buildStatic();
if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
} else {
  KIDS.init({ game: 'pattern', title: '规律侦探' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：先收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(null) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子 ================= */
window.PAT = {
  get currentLevel() {
    return cur ? {
      flat: cur.flat,
      ch: Math.floor(cur.flat / CH_LEN) + 1,   // 章号 1 基
      lv: cur.flat % CH_LEN,
      qi: cur.qi, quizCount: cur.quizzes.length,
      misses: cur.misses, won: cur.won
    } : null;
  },
  quiz() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.qi, cur.quizzes.length - 1)];
    if (!q) return null;
    return {
      seq: q.seq.map((it, i) => (i === q.missingIdx ? null : it)), // 缺失位为 null
      items: q.items.map(cloneItem),
      answer: cloneItem(q.answer),
      missingIdx: q.missingIdx,
      answerIdx: q.correctIdx,
      kind: q.rule.kind,   // r27：规律族（cycle/dual/dualP/count/compound）——新形态测试锚
      tk: q.tk,            // r27：题型模板名——谱回归锚
      len: q.len
    };
  },
  pick(i) { return pick(i); },
  autoSolve() { return autoSolveAsync(); },
  start(f) { startLevel(f); },
  get tutorial() { return state.tut; }
};
