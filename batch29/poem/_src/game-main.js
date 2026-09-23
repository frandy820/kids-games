/* ================= poem 主逻辑（题面渲染 / 读题拼播链 / 卡点选 / 教学 / 救援 / 推进）
   玩法（r42 四族）：题面=诗题卡（配画常驻+诗名+题面体：next 上行卡 / hear 听音图标 /
   fill 挖空句 / order 排序槽区），下方点选卡（行卡/字卡）。
   开场读题拼播链（家族 G，不锁输入——听清的孩子可直接作答）：
   next=[上行行音, poe_q_next]（窗 NEXT_WIN=6486）/ hear=[音频行行音, poe_q_hear]
   （HEAR_WIN=6822）/ fill=[整句行音, poe_q_fill]（FILL_WIN=7050——听完整句+看挖空句，
   挖空字音在链内）/ order=[poe_q_order, 全诗 4 行音]（全链窗 ORDER_WIN=18600
   >14000 方向级救援间隔 → orderChainUntil 链豁免窗【r40 readChainUntil 同构，
   家族 I 扩展】——链播完轮询即触发方向级，延迟不饿死）。
   点对 = 配画放大跳 + 小兔子滑入示范 + poe_right（判对演出窗 1800+1800=3600 ≥ 2472+300，
   家族 H）；order 逐句即判：点对当前句='step'（卡飞入槽+700ms 锁窗，r25 M2 单步：
   进度保留/错窗后恒可续点/不双计）；点错 = 卡摇头 + queue 链 [poe_wrong, 语义引导句 clip]
   （next/order=poe_g_next「再读读上一行，找找接下来那句」——order 每步=找接下来那句
   精确贴合 / hear/fill=poe_g_hear「再听一遍这一句」——fill 重听整句即听到挖空字音），
   1000ms 防重入窗后可重选（探索不罚）；对选可打断链；链豁免窗 WRONG_CHAIN_WIN=8400
   ≥ 2232+150+3720+300=6402（契约 I 仅链起播时设——sayW 返回 false 不设窗）。
   救援两级（§0.71/家族 B 定版）：14s 方向级=重播读题链+方向锚 pulse（next=上行卡/
   hear=听音图标/fill=挖空句/order=排序槽区，lastDir 独立节流锚不动 lastAct）；
   30s 答案级=正确卡 breathe+重播（order 正确卡=当前步句卡动态 correctIdx）。
   面板在场守卫（契约 K）静默。
   教学链（flat0 首次，§2【原款锚面零改动——flat0 恒 dch1 next】）：watch 2904 →
   t=3204 播上行音+题面句链（窗 NEXT_WIN）→ ghost 指第二行卡 press → demo 点对
   （判对窗 3600）→ 重发同关 turn 1776 → 2100 后读题（帮/独）；
   名义分账 3204+6486+700+320+3600+300=14610 ≤ 16s（r42：读题链窗随全库行 max
   2424→3900 上探，flat0 锚题/判定/演示行为零变化——SPEC-R42 §R7）。
   语音窗（SPEC §4 实长+r42 estMs 口径）：poe_tut_watch 2904/poe_tut_turn 1776/
   poe_hint 3096/poe_right 2472/poe_wrong 2232/poe_q_next 2136/poe_q_hear 2472/
   poe_g_next 3720/poe_g_hear 2112/行音 max 3900（新库 est 口径【注册后实测复核 TODO】）。
   验收钩子：window.PM = { get currentLevel, get quiz(){kind,poem,prevLine,audioLine,
   line,hole,prog,opts[]{line,idx|ch},answer,step,miss}, tapOpt(i), start(flat),
   async autoSolve(), get tutorial }
   tapOpt 返回：对='right' / 末题对='done' / order 中间步='step' / 错='wrong'
   （miss+1，step 不变，order 进度保留）/ locked·演出窗=false+pop+bump /
   越界·已答=null+pop+bump；教学演示结果 window.__pmDemoR */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
let orderChainUntil = 0;                         /* order 全诗读题链豁免窗终点（r42：链 18.6s>14s 方向级间隔，家族 I 扩展） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 / order 每步=轻上音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const chimeStep = () => { if (!VERIFY) KIDS.audio.note(659.25, 0.14, 0, 0.45); };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 读题拼播链（家族 G：段间 150 由 queue 自理，窗=链总实长+300）
   next=[上行行音, poe_q_next] / hear=[音频行行音, poe_q_hear] /
   fill=[整句行音, poe_q_fill]（听完整句辨挖空字）/
   order=[poe_q_order, 全诗 4 行音]（题面句先+整诗听一遍——语序重建的听觉底座）；
   order 链最长（敕勒歌 est 18.4s）→ orderChainUntil 豁免窗 */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'next') KIDS.voice.queue([lineKey(q.poem, q.prevLine), VOICE.qNext.key]);
  else if (q.kind === 'hear') KIDS.voice.queue([lineKey(q.poem, q.audioLine), VOICE.qHear.key]);
  else if (q.kind === 'fill') KIDS.voice.queue([lineKey(q.poem, q.line), VOICE.qFill.key]);
  else {
    KIDS.voice.queue([VOICE.qOrder.key, lineKey(q.poem, 0), lineKey(q.poem, 1),
                      lineKey(q.poem, 2), lineKey(q.poem, 3)]);
    orderChainUntil = Date.now() + ORDER_WIN;   /* 全诗链豁免（18.6s>14s 方向级，r40 同构） */
  }
}

/* ================= 渲染 ================= */
/* 方向级视觉锚：next=上行卡 / hear=听音图标 / fill=挖空句 / order=排序槽区（方向锚共用） */
function pulseSceneDir() {
  const el = sceneEl.querySelector('.prev-line') || sceneEl.querySelector('.hear-ico') ||
             sceneEl.querySelector('.fill-line') || sceneEl.querySelector('.ord-slots');
  if (el) replayAnim(el, 'pulse');
}
/* 挖空句 HTML：行文本逐字，挖空位（汉位=跳标点 0 基）替换为空槽 span */
function fillLineHtml(line, hole) {
  let h = -1, out = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if ('，。！？、'.indexOf(c) >= 0) { out += '<span class="fp">' + c + '</span>'; continue; }
    h++;
    out += h === hole ? '<span class="hole">?</span>' : '<span class="fc">' + c + '</span>';
  }
  return out;
}
function renderScene(q) {                        // 题面：配画常驻 + 诗名条 + 题面体（四型）
  sceneEl.dataset.kind = q.kind;
  sceneEl.setAttribute('aria-label', POEMS[q.poem].title + '，点我再听一遍');
  let body;
  if (q.kind === 'next')
    body = '<div class="prev-line" data-prev="' + q.prevLine + '">' +
           '<span class="pl-tag">上一句</span>' +
           '<span class="pl-txt">' + POEMS[q.poem].lines[q.prevLine] + '</span>' +
           '<span class="pl-spk">' + ICONS.speakerSmall + '</span></div>';
  else if (q.kind === 'hear')
    body = '<div class="hear-ico" data-line="' + q.audioLine + '">' + ICONS.earBig + '</div>';
  else if (q.kind === 'fill')
    body = '<div class="fill-line" data-line="' + q.line + '" data-hole="' + q.hole + '">' +
           '<span class="fl-tag">缺个字</span><span class="fl-txt">' +
           fillLineHtml(POEMS[q.poem].lines[q.line], q.hole) + '</span></div>';
  else
    body = '<div class="ord-slots">' + [0, 1, 2, 3].map(k =>
             '<div class="oslot" data-k="' + k + '"><span class="os-n">' + (k + 1) + '</span>' +
             '<span class="os-t"></span></div>').join('') + '</div>';
  sceneEl.innerHTML =
    '<div class="scene-slot">' + POEM_ART[q.poem] + '</div>' +
    '<div class="q-text">' + POEMS[q.poem].title + '</div>' + body;
}
/* order 已排句同步到槽（step 推进后调用——进度视觉保留 r25 M2） */
function syncOrderSlots(q) {
  if (!q || q.kind !== 'order') return;
  const slots = sceneEl.querySelectorAll('.oslot');
  for (let k = 0; k < 4; k++) {
    const t = slots[k] && slots[k].querySelector('.os-t');
    if (!t) continue;
    if (k < q._prog) { t.textContent = POEMS[q.poem].lines[k]; slots[k].classList.add('filled'); }
    else { t.textContent = ''; slots[k].classList.remove('filled'); }
  }
}
function renderBoard(q) {                        // 卡排：行卡（next/hear/order）/ 字卡（fill）
  boardEl.innerHTML = '';
  boardEl.dataset.n = q.opts.length;
  boardEl.dataset.k = q.kind;
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    if (o.idx !== undefined) b.dataset.oid = o.idx;      // 行号（verify 对账：渲染即引擎）
    b.setAttribute('aria-label', (o.ch || o.line) + '卡');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="t-label">' + (o.ch || o.line) + '</span>';
    boardEl.appendChild(b);
  });
  if (q.kind === 'order') syncOrderSlots(q);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
}
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：配画放大跳 + 小兔子滑入示范（poe_right clip 由 uiTapOpt 播）
   verify 页跳飞行直接落定 ---------- */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.scene-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 58);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
  }
  hopRabbit();
}

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
  el.classList.remove('breathe'); void el.offsetWidth;
  el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡（order=当前步句卡动态） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / PM.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗/教学期共用 locked 门；错点 1000ms 防重入窗（b16 定案）；
   order 中间步 700ms 飞槽锁窗（r25 M2：单步原子判定+进度保留）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+poe_wrong+语义引导句（按题型） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const guide = (q.kind === 'next' || q.kind === 'order')
      ? { key: 'poe_g_next', text: GUIDE_NEXT }   /* 引导句 clip（order 每步=找接下来那句） */
      : { key: 'poe_g_hear', text: GUIDE_HEAR };  /* hear/fill=再听同一句（fill 即听挖空字音） */
    if (sayW([VOICE.wrong.key, guide]))   /* 拼播链：clip+引导句 clip（仅链起播时设窗） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免：2232+150+3720(poe_g_next 实长)+300=6402（契约 I） */
    pulseSceneDir();                             /* 方向级：next=上行卡 / hear=听音图标 / fill=挖空句 / order=槽区 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  if (r === 'step') {                            /* order 中间步：句卡飞入槽+700ms 锁窗（进度保留） */
    lastAct = Date.now();                        /* 有效行动刷 idle 锚（§0.7a，r39 melody 同构） */
    state.locked = true;
    if (el) { el.classList.add('lit', 'gone'); }
    chimeStep();
    sfx('coin');
    syncOrderSlots(q);
    await wait(700 * SPEED);                     /* 飞槽/填充演出窗 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：配画放大跳+兔子示范+poe_right） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); if (q.kind === 'order') el.classList.add('gone'); }
  if (q.kind === 'order') syncOrderSlots(q);
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 配画放大跳 + 小兔子滑入示范 */
  KIDS.voice.play(VOICE.right.key, VOICE.right.text);   /* poe_right：找对啦，真厉害（2472ms） */
  await wait(1800 * SPEED);                      /* 配画跳+卡亮+right clip 主窗 */
  if (cur !== run) return r;
  await wait(1800 * SPEED);                      /* right clip 收尾窗：总 3600 ≥ 2472+300=2772（家族 H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（题面/行卡全换）+ 读题链 */
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN_HINTS[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* poe_right：找对啦，真厉害（2472ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2472+300（判对后窗 ≥2772） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; orderChainUntil = 0;   /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 关卡加载重置 idle 锚 */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.poem && sv.poem.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题拼播链（不锁输入；order 链自设豁免窗） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=咏鹅首行卡「鹅，鹅，鹅」+行音 →「下一句是哪一句」→ 幽灵手指点第二行卡「曲项向天歌」
   →帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s，分账 14610）
   时序（家族 G/H）：watch 2904 → t=3204（≥2904+300，禁与读题链撞头）；读题链窗
   NEXT_WIN=6486（r42 全库行 max 口径）；演出窗 3600 罩 poe_right 2472+300 再收束 turn
   【原款教学锚面零改动：flat0 恒 dch1 next，题面/演示/判定链原样】 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* poe_tut_watch：看！听一句古诗（2904ms） */
  const run = cur;
  await wait(WATCH_T * SPEED);                   /* t=3204 ≥ 2904+300：clip 播完再读题链 */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 next/prevLine0（咏鹅首行→第二行）
  KIDS.voice.queue([lineKey(q.poem, q.prevLine), VOICE.qNext.key]);   /* 上行音+「下一句是哪一句」 */
  await wait(NEXT_WIN * SPEED);                  /* 链窗 6486（家族 G：链总实长+300） */
  if (cur !== run) return;
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向第二行卡（正确卡） */
  await wait(700 * SPEED);                       /* ghost 移入停顿 */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__pmDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(300 * SPEED);                       /* 收尾（poe_right 仍在播，由判对演出窗 3600 罩满） */
  const sv = KIDS._save() || {};
  sv.poem = sv.poem || {};
  sv.poem.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来找一找"在重发后的题面上说（照 batch5-28） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* poe_tut_turn：你来找一找（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, TURN_DELAY);                                /* ≥1776+300=2076 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：读读上一行，想想下一句 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚 */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：读题链重播（order 链重设豁免窗） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听读题链（儿童高发探索动作；
                                                     next 上行卡/小喇叭在 scene 内，冒泡同路径） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚 */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播读题链+方向锚 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示
   豁免窗双守卫：错反馈链（契约 I）+ order 全诗读题链（r42 扩展，18.6s>14s 让路） */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil || Date.now() < orderChainUntil) return;   /* 链豁免窗（契约 I+r42） */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（b27 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);                   /* order=当前步句卡动态（r39 melody 同构） */
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播读题链+方向锚 pulse（不动 lastAct） */
    speakQuiz();
    pulseSceneDir();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（b28 m4）：供 verify 源码级断言（契约 K 配套） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'poem', title: '古诗跟读' });   // 存档键 kidsgame_poem（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.PM = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, poem: cur.pid,
             n: cur.quizzes.length, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                             /* SPEC §2 钩子契约：next|hear|fill|order */
             poem: q.poem,                             /* 诗 id（POEM_IDS 12） */
             prevLine: q.kind === 'next' ? q.prevLine : null,     /* next 上行 idx 0-2 */
             audioLine: q.kind === 'hear' ? q.audioLine : null,   /* hear 音频行 idx 0-3 */
             line: q.kind === 'fill' ? q.line : null,             /* fill 挖空行 idx 0-3 */
             hole: q.kind === 'fill' ? q.hole : null,             /* fill 挖空汉位 */
             prog: q.kind === 'order' ? q._prog : null,           /* order 已排句数 0-4 */
             opts: q.opts.map(o => o.idx !== undefined ? { line: o.line, idx: o.idx } : { ch: o.ch }),   /* 行卡 {line,idx} / 字卡 {ch} */
             answer: correctIdx(q),                    /* 正确卡下标（order=当前步句卡动态） */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 锁窗内 tap=false → 等窗结束重试，非 break；
    while (cur && !cur.done && guard++ < 160) {   // order 题每题 4 点+锁窗 → 上限 160
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 600) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOpt(correctIdx(q));    /* order=当前步句卡动态（直点到底） */
      if (r === 'right' || r === 'done' || r === 'step') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 correctIdx） */ }
      else if (guard >= 158) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
