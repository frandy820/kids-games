/* ================= compare 主逻辑（双侧物品 grid 渲染 / 点数角标 / 符号飞入 / 教学 / 推进）
   玩法：左右两组（实物阵列可逐个点亮数数，或数字卡），底部三个大嘴符号按钮 > < =
   点正确符号 → 两组被圈 + 符号飞入中间槽 + 语义语音（左边多/右边多/一样多，TTS 兜底）
   r29 三卡题（tri 三数比大小 / near 最接近 N，SPEC-R29）：三张数字卡并排点卡判定，
   答对=答案卡被圈弹跳+其余卡变暗+拼句语音；错=晃动灰掉零惩罚（机制同符号题）
   错误 = 符号晃动灰掉零惩罚，首错不 pulse 正确项（q._miss>=2 才高亮）
   验收钩子：window.CMP = { get currentLevel, get quiz, tapItem(side,i), recount(),
                            pick(s), pickPos(i), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（SPEC-BATCH6 §0.5）；开场任务语音也走 sayR */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* r29 拼句语音（三卡题面指令/答对反馈，SPEC-R29 §R10）：queue 段键（缺 clip 段静默，core T46 阶段3 无 TTS 兜底） */
const sayQ = parts => { if (cur) KIDS.voice.queue(parts); };
/* 纠错轻语音（6 岁试玩共性 P1）：flat<3 每错必播（对齐 words/subbug 既有行为）；
   flat≥3 走 10s 节流 sayR——不识字孩子安静试错只有视觉晃动 */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const duelEl = $id('duel'), flyerEl = $id('flyer'),
      symbolsEl = $id('symbols'), chipEl = $id('prompt-chip'), recountBtn = $id('btn-recount'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear');
/* r29：#duel 按题形态重建（符号题三栏 / 三卡题三组），组面板与中槽动态获取——常量引用会指向已分离节点 */
const gEl = side => $id(side === 'L' ? 'g-left' : 'g-right');
const slotNow = () => $id('slot');
const slotSemNow = () => $id('slot-sem');
const DUEL_SYM = '<div class="group" id="g-left" aria-label="左边一组"></div>' +
  '<div id="center-col"><div id="slot" aria-label="符号槽">?</div><div id="slot-sem"></div></div>' +
  '<div class="group" id="g-right" aria-label="右边一组"></div>';

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastSlotHint = 0;                           // 中槽轻提示 10s 节流（§0.16）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const symEl = s => symbolsEl.querySelector('.sym[data-s="' + s + '"]');
const itemEl = (side, i) => (gEl(side) || document.createElement('span')).querySelector('.item[data-i="' + i + '"]');
const triEl = i => duelEl.querySelector('.group.tri[data-pos="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  recountBtn.innerHTML = ICONS.recount + '<span>重新数</span>';
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  SYMS.forEach(s => {
    const b = document.createElement('button');
    b.className = 'sym';
    b.dataset.s = s;
    b.setAttribute('aria-label', s === '>' ? '大于号，左边多' : (s === '<' ? '小于号，右边多' : '等号，一样多'));
    b.innerHTML = symSvg(s) + '<span class="lbl">' + SYM_LABEL[s] + '</span>';
    symbolsEl.appendChild(b);
  });
}

/* ================= 渲染 ================= */
/* 实物侧：grid 排布（行优先，逐个可点数——顺序左→右、上→下符合数数习惯）
   物品尺寸按面板实测算（cols≈√(n·宽高比)，热区 ≥64），确定性纯布局 */
function renderItemsSide(panel, sd, badges, side) {
  panel.innerHTML = '';
  const W = panel.clientWidth, H = panel.clientHeight;
  const n = sd.items.length;
  const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * Math.max(0.6, W / Math.max(1, H))))));
  const rows = Math.ceil(n / cols);
  const pad = 18, gap = 7;
  const cell = Math.floor(Math.min((W - 2 * pad - (cols - 1) * gap) / cols,
                                   (H - 2 * pad - (rows - 1) * gap) / rows));
  const size = Math.max(64, Math.min(cell, 116));   /* 反方审查 m2：物品热区下限对齐 §0.9 的 64px 红线 */
  const wrap = document.createElement('div');
  wrap.className = 'g-items';
  sd.items.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'item';
    b.dataset.i = i;
    b.dataset.side = side;
    b.setAttribute('aria-label', (side === 'L' ? '左边' : '右边') + '第' + (i + 1) + '个' + sd.kind);
    b.style.width = Math.round(size * (p.s || 1)) + 'px';
    b.style.height = Math.round(size * (p.s || 1)) + 'px';
    b.innerHTML = ITEM_SVG[sd.kind](p) + '<span class="badge"></span>';
    wrap.appendChild(b);
  });
  panel.appendChild(wrap);
  restoreBadges(panel, badges);
}
/* 恢复本题已数角标（重渲染不丢进度） */
function restoreBadges(panel, badges) {
  (badges || []).forEach((v, i) => {
    if (!v) return;
    const b = panel.querySelector('.item[data-i="' + i + '"] .badge');
    if (b) { b.textContent = v; b.classList.add('on'); }
    const it = panel.querySelector('.item[data-i="' + i + '"]');
    if (it) it.classList.add('lit');
  });
}
function renderNumSide(panel, sd) {
  panel.innerHTML = '';
  const c = document.createElement('button');
  c.className = 'numcard';
  c.textContent = sd.n;
  c.setAttribute('aria-label', '数字' + sd.n);
  panel.appendChild(c);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.mode === 'tri' || q.mode === 'near') { renderTriQuiz(q); renderStep(); return; }
  /* 符号题：确保标准三栏结构（上一题若为三卡形态需重建，r29） */
  if (!$id('g-left')) duelEl.innerHTML = DUEL_SYM;
  /* 组面板答对演出态清残留（r29 家族修复 P2-1）：符号题相邻转换不重建 #duel——
     上一题答对的 .circled/.pop 绿圈与三卡 .dimmed 必须随新题/刷新清除（新题零残留） */
  document.querySelectorAll('#duel > .group').forEach(g => g.classList.remove('circled', 'pop', 'dimmed'));
  symbolsEl.classList.remove('off');
  chipEl.innerHTML = ICONS.scale + '<div><div class="big">哪一边多？</div></div>';
  /* 符号按钮复位（清对/错态）后按模型回填错态（r29 家族修复 m2）：resize/旋屏刷新后
     已错项灰态不丢——q.wrong 模型层保留（再点返 again），视觉层同步恢复防未灰误导 */
  symbolsEl.querySelectorAll('.sym').forEach(b => {
    b.classList.remove('right', 'wrong', 'pulse');
    const m = b.querySelector('.mark'); if (m) m.remove();
  });
  q.wrong.forEach(s => { const w = symEl(s); if (w) w.classList.add('wrong'); });
  const slot = slotNow(), slotSem = slotSemNow();
  slot.className = '';
  slot.textContent = '?';
  slotSem.textContent = '';
  if (q.mode === 'num') slotSem.textContent = '数字比一比';
  if (q.left.kind === 'num') renderNumSide(gEl('L'), q.left); else renderItemsSide(gEl('L'), q.left, q._bL, 'L');
  if (q.right.kind === 'num') renderNumSide(gEl('R'), q.right); else renderItemsSide(gEl('R'), q.right, q._bR, 'R');
  renderStep();
}
/* r29 三卡题渲染（tri/near）：三组数字卡并排 + 符号区置灰 + 题面指令语音（不识字孩子的规则说明通道，SPEC §R4） */
function renderTriQuiz(q) {
  duelEl.innerHTML = q.cards.map((c, i) =>
    '<div class="group tri" data-pos="' + i + '" aria-label="第' + (i + 1) + '张卡片"></div>').join('');
  q.cards.forEach((c, i) => renderNumSide(triEl(i), c));
  /* 错态回填（r29 家族修复 m2）：重建后按 q.wrong 恢复已错卡灰态（新题 wrong=[] 天然零残留；
     .circled/.pop/.dimmed 属答对演出态，innerHTML 重建即清——不回填防泄答案） */
  q.wrong.forEach(i => { const c = triEl(i); if (c) c.classList.add('wrong'); });
  symbolsEl.classList.add('off');
  symbolsEl.querySelectorAll('.sym').forEach(b => {
    b.classList.remove('right', 'wrong', 'pulse');
    const m = b.querySelector('.mark'); if (m) m.remove();
  });
  if (q.mode === 'tri') {
    chipEl.innerHTML = ICONS.scale + '<div><div class="big">' + CHIP_TRI[q.qtype] + '</div></div>';
    sayQ([TRI_ASK.key, TRI_KEY[q.qtype].key]);
  } else {
    chipEl.innerHTML = ICONS.scale + '<div><div class="big">哪个数最接近<b class="tgt">' + q.target + '</b>？</div></div>';
    sayQ([NEAR_ASK.key, 'cmp_n_' + q.target]);
  }
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
window.addEventListener('resize', () => {
  if (cur && cur.quizzes[cur.step]) renderQuiz();
});

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：第一只没数过的（先左后右）→ 两侧全数完指向正确符号 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const li = (q._bL || []).findIndex(v => !v);
  if (li >= 0 && q.left.kind !== 'num') { pointGhostAt(itemEl('L', li)); return; }
  const ridx = (q._bR || []).findIndex(v => !v);
  if (ridx >= 0 && q.right.kind !== 'num') { pointGhostAt(itemEl('R', ridx)); return; }
  pointGhostAt(symEl(q.answer));
}

/* ================= 点数主路径（真实点击 / CMP.tapItem / autoSolve 共用） ================= */
function uiTapItem(side, i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTap(cur, side, i);
  if (r === null) return false;
  lastAct = Date.now();
  const el = itemEl(side, i);
  if (el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  if (r > 0) {                                  // 新数到：角标递增 + 点亮 + 上扬双音
    if (el) {
      el.classList.add('lit');
      const b = el.querySelector('.badge');
      b.textContent = r;
      b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    }
    sfx('pop');
    if (!VERIFY) KIDS.audio.note(988, 0.09, 0, 0.5);
    if (!VERIFY) KIDS.audio.note(784, 0.1, 0.07, 0.4);
  } else {                                      // 已数过的：只跳一下不增号
    if (!VERIFY) KIDS.audio.note(660, 0.08, 0, 0.3);
  }
  if (state.tut === 'help') pointHelpNext();    // "帮"：跟着孩子的点数节奏指向下一只
  return r;
}
/* 重新数：清零本题两侧全部角标（防漏数重数核心操作） */
function uiRecount() {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const had = engRecount(cur);
  document.querySelectorAll('#duel .item').forEach(it => {
    it.classList.remove('lit');
    const b = it.querySelector('.badge');
    if (b) { b.classList.remove('on'); b.textContent = ''; }
  });
  if (had) {
    sfx('click');
    recountBtn.classList.remove('bounce'); void recountBtn.offsetWidth; recountBtn.classList.add('bounce');
    KIDS.voice.play(VOICE.rec.key, VOICE.rec.text);   /* 按钮反馈语音（不识字孩子靠它理解功能，无 flat 门） */
  }
  lastAct = Date.now();
  return true;
}

/* ================= 符号飞入 + 两组被圈（答对演出） ================= */
function flySymbol(s) {
  return new Promise(res => {
    const fromEl = symEl(s);
    const f = fromEl ? fromEl.getBoundingClientRect() : null;
    const t = slotNow().getBoundingClientRect();
    flyerEl.innerHTML = symSvg(s);
    flyerEl.style.transition = 'none';
    if (f) {
      flyerEl.style.left = (f.left + f.width * 0.2) + 'px';
      flyerEl.style.top = (f.top + f.height * 0.1) + 'px';
      flyerEl.style.width = (f.width * 0.6) + 'px';
      flyerEl.style.height = (f.height * 0.55) + 'px';
    }
    flyerEl.style.opacity = '1';
    void flyerEl.offsetWidth;                   // 强制回流后开过渡（CSS transition 坑规避）
    flyerEl.style.transition = 'left .45s cubic-bezier(.3,1.2,.4,1),top .45s cubic-bezier(.3,1.2,.4,1),' +
      'width .45s ease,height .45s ease,opacity .45s ease';
    flyerEl.style.left = t.left + 'px';
    flyerEl.style.top = t.top + 'px';
    flyerEl.style.width = t.width + 'px';
    flyerEl.style.height = t.height + 'px';
    setTimeout(() => {
      flyerEl.style.opacity = '0';
      const slot = slotNow(), slotSem = slotSemNow();
      if (slot) { slot.className = 'filled'; slot.innerHTML = symSvg(s); }
      if (slotSem) slotSem.textContent = SEM_TEXT[s];
      res();
    }, Math.round(470 * SPEED));
  });
}

/* ================= 答题主路径（真实点击 / CMP.pick / autoSolve 共用） ================= */
async function uiPickSym(s, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const run = cur;                                /* 反方审查 M3：演出窗口内点重玩会重建 cur——身份守卫防旧续体在新 cur 上 winFlow 白拿星 */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engPickSym(cur, s);
  if (r === null || r === 'again') return r;
  lastAct = Date.now();
  const el = symEl(s);
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
    await flySymbol(s);                         // 符号飞入中间槽
    document.querySelectorAll('#duel > .group').forEach(g => { g.classList.remove('circled', 'pop'); void g.offsetWidth; g.classList.add('circled', 'pop'); });
    KIDS.voice.play(SEM_KEY[q.answer], SEM_TEXT[q.answer]);   /* 语义语音：cmp_sem_* clip（T46 阶段2），text=TTS 兜底 */
    await wait(980 * SPEED);
    if (cur !== run) return r;                   /* 反方审查 M3：末题演出窗内重玩已重建关卡，丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉（零惩罚，可重点其它）；首错不 pulse 正确项，连错 2 次才高亮
    q._miss = (q._miss || 0) + 1;
    if (el) el.classList.add('wrong');
    const ok = symEl(q.answer);
    if (ok && q._miss >= 2) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text);   /* 6 岁试玩共性 P1：flat≥3 也给一次纠错语音（10s 节流） */
    await wait(520 * SPEED);
  }
  return r;
}

/* ================= r29 三卡答题主路径（tri/near：真实点击 / CMP.pickPos / autoSolve 共用）
   一次判定无中间态（r25 M2 不适用，SPEC §R4）；lastAct 纪律与 uiPickSym 同构：
   right/done/wrong 全路径先刷、again（点已灰卡）早退不刷 */
async function uiPickPos(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const run = cur;                              /* 身份守卫（M3 同款：演出窗口内重玩防旧续体） */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engPickPos(cur, i);
  if (r === null || r === 'again') return r;
  lastAct = Date.now();
  const card = triEl(i);
  if (r === 'right' || r === 'done') {
    state.locked = true;
    /* 答案卡被圈弹跳 + 其余卡变暗（聚焦确认，演出同构符号题两组被圈） */
    document.querySelectorAll('#duel > .group').forEach(g => {
      if (Number(g.dataset.pos) === q.answer) {
        g.classList.remove('circled', 'pop'); void g.offsetWidth; g.classList.add('circled', 'pop');
      } else g.classList.add('dimmed');
    });
    sfx('coin');
    /* 语义拼句语音（SPEC §R10）：tri="X 最大/最小"；near="X 最接近 N"（段键 cmp_n_* 已注册） */
    const pickN = q.cards[q.answer].n;
    if (q.mode === 'tri') sayQ(['cmp_n_' + pickN, TRI_KEY[q.qtype].key]);
    else sayQ(['cmp_n_' + pickN, NEAR_OK.key, 'cmp_n_' + q.target]);
    await wait(980 * SPEED);
    if (cur !== run) return r;                  /* 身份守卫：末题演出窗内重玩已重建关卡 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉零惩罚；首错不 pulse 正确卡，连错 2 次才高亮（机制同符号题）
    q._miss = (q._miss || 0) + 1;
    if (card) card.classList.add('wrong');
    const ok = triEl(q.answer);
    if (ok && q._miss >= 2) {
      const nc = ok.querySelector('.numcard');
      if (nc) { nc.classList.remove('pulse'); void nc.offsetWidth; nc.classList.add('pulse'); }
    }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text);   /* 三卡错选同走纠错节流语音（SPEC §R4） */
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
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.cmp && sv.cmp.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  sayR(VOICE.hint.key, VOICE.hint.text);        /* 开场任务语音不设 flat 门（SPEC §0.5） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指先点数左组 1..n、再右组 1..n、最后演示点正确符号；帮=指向下一个没数的；
   独=首次答对放手。flat0 恒 dch1 双侧实物（数字卡侧无物品，0 次边界天然安全） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  for (const side of ['L', 'R']) {              // 演示逐个点数（dch1 两侧物品 ≥1 恒成立）
    const sd = side === 'L' ? q.left : q.right;
    for (let i = 0; i < sd.items.length; i++) {
      pointGhostAt(itemEl(side, i));
      await wait(860 * SPEED);
      ghost.press();
      await wait(320 * SPEED);
      uiTapItem(side, i, true);
      await wait(460 * SPEED);
    }
  }
  await wait(400 * SPEED);
  pointGhostAt(symEl(q.answer));
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await uiPickSym(q.answer, true);
  const sv = KIDS._save();
  sv.cmp = sv.cmp || {};
  sv.cmp.tutSeen = true;
  KIDS.store.persist();
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayP(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏 / 组内 / 中槽交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
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
  sayR(VOICE.hint.key, VOICE.hint.text);        /* 读题不受 flat 门（任务语音普惠） */
});
recountBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiRecount();
});
/* r29：#duel 按题形态重建 → 面板/中槽/三卡事件全部委托到 #duel（重建不丢监听） */
duelEl.addEventListener('pointerdown', e => {
  const it = e.target.closest('.item');
  if (it) { e.preventDefault(); uiTapItem(it.dataset.side, Number(it.dataset.i)); return; }
  const tri = e.target.closest('.group.tri');
  if (tri) { e.preventDefault(); uiPickPos(Number(tri.dataset.pos)); return; }   /* r29 三卡选择 */
  const nc = e.target.closest('.numcard');
  if (nc) {                                   // 数字卡：点数支架（6 岁试玩 P1-2：num 模式点数主策略失效断崖）——
    e.preventDefault();                       // 点第 k 次角标显 k（1..n 循环），与实物侧点数同构，把章3 抽象化补成坡道
    if (VERIFY || !cur) return;               // （r29 扩展到 ch2 全数字卡章；三卡题在上方 tri 分支已拦截不走读数）
    lastAct = Date.now();
    const q = cur.quizzes[cur.step];
    if (!q) return;
    const side = nc.closest('#g-left') ? 'L' : 'R';
    const sd = q[side === 'L' ? 'left' : 'right'];
    if (!sd || sd.kind !== 'num') return;
    const k = ((sd._tap || 0) % sd.n) + 1;
    sd._tap = k;
    let bd = nc.querySelector('.badge');
    if (!bd) { bd = document.createElement('span'); bd.className = 'badge'; nc.appendChild(bd); }
    bd.textContent = k;
    bd.classList.remove('on'); void bd.offsetWidth; bd.classList.add('on');
    nc.classList.remove('bounce'); void nc.offsetWidth; nc.classList.add('bounce');
    sfx('pop');
    KIDS.voice.play('cmp_n_' + k, String(k)); /* 数数跟读：cmp_n_1..20 全量 clip（T46 阶段2+主线补注册 09-20） */
    return;
  }
  const sl = e.target.closest('#slot');
  if (sl) {                                   /* §0.16 非主交互轻反馈：点中间符号槽给节流轻提示 */
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won) return;
    sl.classList.remove('wig'); void sl.offsetWidth; sl.classList.add('wig');
    const now = Date.now();
    if (now - lastSlotHint > 10000) {
      lastSlotHint = now;
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
  }
});
symbolsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.sym');
  if (!el) return;
  e.preventDefault();
  uiPickSym(el.dataset.s);
});

/* ================= 无操作看护：20s 救援提示 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayR(VOICE.hint.key, VOICE.hint.text);      // 救援语音不受 flat 门（SPEC §0.5）
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
  KIDS.init({ game: 'compare', title: '比较大小' });
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
window.CMP = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, step: cur.step,
      retries: cur.retries, done: cur.done, won: state.won,
      countedL: q._cL || 0, countedR: q._cR || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    if (q.mode === 'tri' || q.mode === 'near') {     /* r29 三卡题：不暴露 d（距离为判定冗余字段） */
      return { mode: q.mode, answer: q.answer, step: cur.step,
        qtype: q.qtype || null, target: (q.target != null ? q.target : null),
        cards: q.cards.map(c => ({ n: c.n })),
        left: { n: q.cards[0].n, kind: 'num', type: 'num' },
        right: { n: q.cards[2].n, kind: 'num', type: 'num' },
        items: { left: [], right: [] },
        countedL: 0, countedR: 0,
        wrong: q.wrong.slice() };
    }
    return { mode: q.mode, answer: q.answer, step: cur.step,
      left: { n: q.left.n, kind: q.left.kind, type: q.left.kind === 'num' ? 'num' : 'items' },
      right: { n: q.right.n, kind: q.right.kind, type: q.right.kind === 'num' ? 'num' : 'items' },
      items: { left: q.left.items.map(p => ({ r: p.r, s: p.s })),
               right: q.right.items.map(p => ({ r: p.r, s: p.s })) },
      countedL: q._cL || 0, countedR: q._cR || 0,
      wrong: q.wrong.slice() };
  },
  tapItem(side, i) { return uiTapItem(side, i); },
  recount() { return uiRecount(); },
  pick(s) { return uiPickSym(s); },
  pickPos(i) { return uiPickPos(i); },               /* r29 三卡选择（真实路径同 pick） */
  async autoSolve() {                           // UI 路径自动答完当前关（点满两侧角标后选符号，走真实流程；r29 三卡分派）
    let n = 0;
    while (cur && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.mode === 'tri' || q.mode === 'near') { await uiPickPos(q.answer); continue; }
      for (const side of ['L', 'R']) {
        const sd = side === 'L' ? q.left : q.right;
        for (let i = 0; i < sd.items.length; i++) uiTapItem(side, i);
      }
      await uiPickSym(q.answer);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
