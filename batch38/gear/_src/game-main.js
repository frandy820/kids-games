/* ================= gear 主逻辑 v3（先答预判 → 选齿轮放槽 → 咬合联动 → 关末全速）
   双答制（SPEC-BATCH38 §3 v3——两答全对才 right）：
   开题（presentQuiz）：渲染机器墙（每题一台机器）→ 题面句 clip 播报（章档 obs——
   voice.play 章档键，T46 阶段2 clip 化）→ 判定空槽 .focus 呼吸高亮 → 开放阶段1（先答一答预判行）。
   阶段1（uiTapDir）：答预判——dir 题=cw/ccw 二选｜speed 题=小轮快/一样快/大轮快三选
   ｜conflict 题=cw/ccw/转不动三选。答对=选项钉在空槽上方（.pindir 持续可见）+短锁
   DIR_OK_MS 500 → 进阶段2（齿轮库亮起）；答错=按钮 rej+错链[dir_wrong|speed_wrong,
   hint]+miss+豁免窗（DIR_CHAIN_WIN 5538=2760+150+2328+300 / SPEED_CHAIN_WIN 5442=
   2664+150+2328+300 真时钟契约 I；首错锁 2910/2814=clip+150 b37 R3 收窄）。
   阶段2（uiTapGear）：选齿数（去恒等邻档候选）。放对=判定槽齿轮 pop 咬合+确认链
   [gr_right]（演出窗 MESH_MS+CHAIN_MS=2600 ≥ 2388 家族 G/H）+全链逐轮延迟起转
   （SPIN_STEP 180 波次——转向交替可视化=教学核心；转速周期=齿数×TOOTH_MS 70ms
   传动比可视化）；jam 题（双驱动奇偶冲突）=全链 .jammed 卡住微抖不转（先猜后试验证
   闭环）。放错=候选 rej+wrong+miss+错链[gr_wrong,gr_hint]（豁免窗 4962）+方向级
   相邻高亮 litNeighbors / miss≥2 判定槽 breathe。
   阶段1 未答时点齿轮=吞+轻叮（顺序引导，家族 D）；豁免窗 guard（I 补：错点吞/对选
   放行）；救援 14s 方向级/30s 答案级按 phase 分流（答案级=正确选项 breathe）。
   关末=全速 fullspeed（ch4 冲突关末：B 右手柄拆除 .unhands 后全链转——「拆手柄」
   修好叙事）+panorama → celebrate → persistWin。
   验收钩子：window.GR = { get currentLevel, get quiz{kind,layout,slots[],blank,bunny 弃,
   picks,answer,need,dteeth,dirAns,jam,phase,obs,step,miss}, tapDir(d), tapGear(i), start(flat),
   autoSolve(), reread(), get tutorial }——真实页同暴露（b29 坑⑥）。tapDir 返回：d=
   dirAns→'ok'；干扰→'wrong'；豁免窗内错答吞 false；演出期 null；阶段2/已答 null。
   tapGear 返回：对且非末题 'meshed' / 对且末题 'done' / 干扰 'wrong' / 阶段1 未答
   null（顺序守卫）/ 豁免窗内错点吞 false / 演出期 null（真时钟锁）/ 越界·已答 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3（含教学迷你关 -1）每错必播；flat≥3 走 10s 节流
   （契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), wallEl = $id('wall'), picksEl = $id('picks'),
      guessbarEl = $id('guessbar'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重听中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const slotAt = k => wallEl.querySelector('.slot[data-k="' + k + '"]');
const pickAt = i => picksEl.querySelector('.pick[data-i="' + i + '"]');
const dirBtnAt = d => guessbarEl.querySelector('.guess-btn[data-guess="' + d + '"]');
/* 阶段1 按钮标签（7-8 岁识字辅助——箭头图标为主，文字为辅） */
const DIR_LABELS = { cw: '', ccw: '', jam: '转不动', small: '小轮快', same: '一样快', big: '大轮快' };
const AB_LABELS = { dir: '这个空位往哪边转？', speed: '哪个齿轮转得快？',
                    conflict: '这个轮子转得动吗？' };
const dirBtnAria = { cw: '顺时针', ccw: '逆时针', jam: '转不动', small: '小轮快',
                     same: '一样快', big: '大轮快' };

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：咬合=双音上行 / 放错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（每题一台机器——开题整建；契约 M 渲染即引擎） ================= */
const gearHtml = id => '<div class="rot">' + gearSvg(id, GEAR_DIM[id]) + '</div>';
function renderWall(q) {                        // 机器墙槽位链（SPEC §3 v3 布局真值）
  wallEl.innerHTML = '';
  wallEl.dataset.n = String(q.slots.length);     // 帧内容锚（verify 断言渲染即引擎；6 槽收窄 CSS 锚）
  for (const s of q.slots) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.k = String(s.k);                   // 位置号（渲染即引擎——契约 M）
    d.dataset.type = s.type;                     // D/W/B/fix/blank
    if (s.type === 'D') {
      d.innerHTML = '<div class="rot">' + driveSvg(q.dteeth, 0) + '</div>';   // 驱动轮 idle 恒 cw 转
    } else if (s.type === 'B') {
      d.innerHTML = '<div class="rot">' + driveSvg(DTEETH_DEFAULT, 1) + '</div>';   // 右手柄镜像恒 cw
    } else if (s.type === 'W') {
      d.innerHTML = '<div class="rot">' + windSvg(84) + '</div>';
    } else if (s.type === 'fix') {
      d.innerHTML = '<div class="rot">' + gearSvg(s.gear, GEAR_DIM[s.gear]) + '</div>';
    } else {
      /* 空槽开口虚框：直径=需求齿数直径+10（几何匹配具象——13.2px 档差须仔细比对） */
      const m = Math.round(GEAR_DIM[q.need] + 10);
      d.innerHTML = '<div class="mouth" style="width:' + m + 'px;height:' + m + 'px"></div>';
    }
    d.innerHTML += '<div class="dir-pop"></div><div class="pindir"></div>';
    if (s.dir) d.dataset.dir = s.dir;            // 固定轮转向真值（k%2 律——契约 M data-dir）
    wallEl.appendChild(d);
  }
}
function renderPicks(q) {                        // 齿轮库候选 3 枚（触摸目标 ≥96 容器）
  picksEl.innerHTML = '';
  q.picks.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.i = String(i);
    b.setAttribute('aria-label', String(TEETH[p]) + ' 个齿的齿轮');
    b.innerHTML = gearSvg(p, Math.min(GEAR_DIM[p], 92));
    picksEl.appendChild(b);
  });
}
function renderAnswerbar(q) {                    // 先答一答预判行（v3 判定层阶段1——按 kind 渲染按钮组）
  guessbarEl.querySelector('.g-label').textContent = AB_LABELS[q.kind];
  const box = guessbarEl.querySelector('.ab-btns');
  box.innerHTML = '';
  DIR_KINDS[q.kind].forEach(d => {
    const b = document.createElement('button');
    b.className = 'guess-btn';
    b.dataset.guess = d;
    b.setAttribute('aria-label', dirBtnAria[d]);
    b.innerHTML = choiceSvg(d, 34) + (DIR_LABELS[d] ? '<span>' + DIR_LABELS[d] + '</span>' : '');
    box.appendChild(b);
  });
  renderPhase(q);
}
function renderPhase(q) {                        // 阶段视觉态：answerbar done+pindir 钉住+齿轮库 dim 解除
  const done = !!q._dirOk;
  guessbarEl.classList.toggle('done', done);
  guessbarEl.classList.add('show');
  guessbarEl.querySelectorAll('.guess-btn').forEach(b => b.classList.remove('picked'));
  if (done) {
    const ok = dirBtnAt(q.dirAns);
    if (ok) ok.classList.add('picked');
  }
  picksEl.classList.toggle('dim', !done);        // 阶段1 齿轮库降透明（顺序引导）
  const bs = slotAt(q.blank);
  const pin = bs && bs.querySelector('.pindir');
  if (pin) {
    if (done) { pin.innerHTML = choiceSvg(q.dirAns, 44); pin.classList.add('show'); }
    else { pin.classList.remove('show'); pin.innerHTML = ''; }
  }
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderWall(q); renderPicks(q); renderAnswerbar(q); renderStep();
}

/* ================= 方向级反馈：高亮相邻已固定齿轮（转向视觉重读——箭头浮现；
   只亮相邻轮不亮判定槽本体——不泄答案；错反馈/救援共用） ================= */
const isFixedSlot = (q, k) => k >= 0 && k < q.slots.length && !!q.slots[k].gear;
function litNeighbors(q) {
  const ks = [];
  for (let k = q.blank - 1; k >= 0; k--) if (isFixedSlot(q, k)) { ks.push(k); break; }   // 左邻最近固定轮
  for (let k = q.blank + 1; k < q.slots.length; k++) if (isFixedSlot(q, k)) { ks.push(k); break; }   // 右邻
  ks.forEach((k, i) => setTimeout(() => {
    if (!cur || cur.quizzes[cur.step] !== q) return;   // 身份守卫（换题/换关中止在途）
    const el = slotAt(k), s = q.slots[k];
    if (!el) return;
    replayAnim(el, 'lit');
    el.querySelector('.dir-pop').innerHTML = dirArrowSvg(s.dir === 'cw', 40);
    setTimeout(() => { if (el) el.classList.remove('lit'); }, (NIGH_MS + 1100) * SPEED);
  }, (i === 0 ? 0 : NIGH_MS) * SPEED));
}

/* ================= 开题呈现：新机器 → 题面句 keyless TTS → 判定槽呼吸高亮 → 开放
   演出锁=真时钟 showUntil（tapDir/tapGear 演出期返 null——测试驱动须轮询等可交互） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderWall(q); renderPicks(q); renderAnswerbar(q); renderStep();
  const run = cur, token = ++showRun;
  state.locked = true;
  state.showUntil = Date.now() + q.obsWin * SPEED + 140;   // 真时钟演出锁（题面句窗）
  if (cur) KIDS.voice.play(q.obsKey, q.obs);      /* 题面句 clip 化（T46 阶段2：gr_obs_ 章档键，
                                                     同句 play 落空自动回退 TTS——B 类键） */
  const bs = slotAt(q.blank);
  if (bs) replayAnim(bs, 'focus');                // 判定空槽呼吸高亮（当前任务锚）
  await wait(q.obsWin * SPEED);                   /* 3660=estMs(8)+300 / 4350=estMs(10)+300 /
                                                     3315=estMs(7)+300（家族 T/H） */
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                           /* 题面句完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* ================= 重听：重播题面句+判定槽高亮（user=true 走 3s 节流；
   救援路径 false 不重置 lastAct——契约 B；轻提示不锁输入） ================= */
function reReadObs(user) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (cur.flat < 0) return false;                 /* 教学迷你关禁重听（重发=破坏教学时序） */
  if (user) {
    if (Date.now() - lastReplayAt < 3000) return false;   // 3s 节流
    lastReplayAt = Date.now();
  }
  const bs = slotAt(q.blank);
  if (bs) replayAnim(bs, 'focus');
  if (cur) KIDS.voice.play(q.obsKey, q.obs);      // 重读题面句（clip 化——T46 阶段2）
  if (user) lastAct = Date.now();                 /* 主动重听重置 idle（救援路径不动——契约 B） */
  return true;
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：按 phase 分流（阶段1=正确预判按钮 / 阶段2=正确候选——教学期
   泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 1) pointGhostAt(dirBtnAt(q.dirAns));
  else pointGhostAt(pickAt(correctPick(q)));
}

/* ================= 咬合落位（渲染层 .meshed 类+data-dir 转向真值+--dur 转速；
   引擎真值源 q.slots[k].dir=dirAt(k)——契约 M） ================= */
function meshInto(q) {
  const bs = slotAt(q.blank);
  if (bs) {
    bs.classList.remove('focus', 'breathe');
    bs.innerHTML = gearHtml(q.need) + '<div class="dir-pop"></div><div class="pindir"></div>';
    void bs.offsetWidth;
    bs.classList.add('meshed', 'pop');
    bs.dataset.dir = q.slots[q.blank].dir;        // 转向真值（k%2 律；jam='jam'）
    bs.style.setProperty('--dur', TEETH[q.need] * TOOTH_MS + 'ms');   // 转速周期=齿数×70
  }
}
/* ================= 全链联动预演：逐轮延迟起转（SPIN_STEP 180 波次——转向交替可视化，
   SPEC §3 教学核心；--dur=齿数×TOOTH_MS 传动比可视化；jam 题=全链卡住微抖） ================= */
function chainSpin(q) {
  for (const s of q.slots) {
    const el = slotAt(s.k);
    if (!el) continue;
    if (q.jam) {                                  // 双驱动奇偶冲突：锁死演出（不转——先猜后试验证）
      setTimeout(() => { if (el) el.classList.add('jammed'); }, s.k * SPIN_STEP * SPEED);
      continue;
    }
    if (s.dir && s.dir !== 'jam') {
      el.dataset.dir = s.dir;
      el.style.setProperty('--dur', Math.round((s.teeth || 12) * TOOTH_MS) + 'ms');
      setTimeout(() => { if (el) el.classList.add('spin'); }, s.k * SPIN_STEP * SPEED);
    }
  }
}

/* ================= 阶段1 预判答主路径（真实点击 / GR.tapDir / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（answerbar 容器 bump / 按钮 rej——家族 D）；演出锁真时钟；
   豁免窗 guard（I 补：错答吞/对答放行）========== */
async function uiTapDir(d, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(sceneEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                   /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(sceneEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (DIR_KINDS[q.kind].indexOf(d) < 0) { sfx('pop'); replayAnim(sceneEl, 'bump'); return null; }   // 非法选项
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错答吞——pop+bump 不计 miss；对答放行 */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && d !== q.dirAns) {
    sfx('pop'); replayAnim(sceneEl, 'bump'); return false;
  }
  const run = cur, token = showRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapDir(cur, d);
  if (r === null) { sfx('pop'); replayAnim(sceneEl, 'bump'); return null; }
  const btn = dirBtnAt(d);

  if (r === 'wrong') {                            /* 预判答错：专向反馈 miss（不泄答案）+错链+视觉梯度 */
    const isSpeed = q.kind === 'speed';
    const chainWin = isSpeed ? SPEED_CHAIN_WIN : DIR_CHAIN_WIN;
    const lock1 = isSpeed ? SPEED_LOCK_1 : DIR_LOCK_1;
    const lock = q._miss === 1 ? lock1 : WRONG_LOCK_2;
    state.locked = true;
    state.showUntil = Date.now() + lock * SPEED;  /* 首错锁=clip+150 顶格（b37 R3 收窄——不叠尾窗） */
    dodgeLo();
    if (btn) replayAnim(btn, 'rej');
    litNeighbors(q);                              /* 方向级：高亮相邻已固定齿轮+箭头（奇偶视觉锚） */
    const vk = isSpeed ? VOICE.speedWrong : VOICE.dirWrong;
    if (sayW([vk.key, VOICE.hint.key]))           /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + chainWin;    /* 链豁免：dir 5538 / speed 5442 真时钟（契约 I） */
    if (q._miss >= 2) {                           /* miss≥2=正确预判按钮 breathe（答案级梯度） */
      const okBtn = dirBtnAt(q.dirAns);
      if (okBtn) replayAnim(okBtn, 'breathe');
    }
    await wait(lock * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- ok（预判答对：选项钉在空槽+短锁→进阶段2） ---- */
  lastAct = Date.now();                           /* 正确答重置救援钟（§0.7a） */
  state.locked = true;
  state.showUntil = Date.now() + DIR_OK_MS * SPEED + 140;
  renderPhase(q);                                 /* answerbar done+pindir 钉住+齿轮库亮起 */
  chimeGoal();
  await wait(DIR_OK_MS * SPEED);
  if (cur !== run || token !== showRun) return r;
  state.locked = false;
  if (state.tut === 'help') pointHelpNext();      /* 教学"帮"两步：答对预判→指向正确候选 */
  return r;
}

/* ================= 阶段2 放齿轮主路径（真实点击 / GR.tapGear / autoSolve / 教学演示共用）
   双答制顺序守卫：阶段1 未答对=吞+轻叮 null；演出锁真时钟；豁免窗 guard ========== */
async function uiTapGear(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(wallEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                   /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(wallEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!q._dirOk) { sfx('pop'); replayAnim(wallEl, 'bump'); return null; }   // 先答预判（顺序引导）
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(wallEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(wallEl, 'bump'); return false;
  }
  const run = cur, token = showRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapGear(cur, i);
  if (r === null) { sfx('pop'); replayAnim(wallEl, 'bump'); return null; }
  const pickBtn = pickAt(i);

  if (r === 'wrong') {                            /* 放错：干扰齿数不合槽——空转抖动+错链+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + (q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED;   /* b37 R3+b38 R1：首错锁 2334=2184+150 顶格 */
    dodgeLo();
    if (pickBtn) replayAnim(pickBtn, 'rej');
    litNeighbors(q);                              /* 方向级：高亮相邻已固定齿轮+箭头（不亮判定槽本体） */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))  /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免：2184+150+2328+300=4962 真时钟（契约 I） */
    if (q._miss >= 2) {                           /* miss≥2=判定槽 breathe（答案级梯度） */
      const bs = slotAt(q.blank);
      if (bs) replayAnim(bs, 'breathe');
    }
    await wait((q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- meshed / done（放对：咬合 pop+全链联动预演+确认链单 clip） ---- */
  lastAct = Date.now();                           /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                     /* 教学"独"：首次放对 → 放手 */
    state.tut = 'solo';
    window.__grTutSolo = true;                    /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  state.showUntil = Date.now() + (MESH_MS + CHAIN_MS) * SPEED + 140;
  meshInto(q);                                    /* 判定槽咬合（--dur 转速齿数正比） */
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);            /* 确认链：风车转起来啦（单 clip 2088——契约 N） */
  await wait(MESH_MS * SPEED);                    /* 咬合落位主窗 1100 */
  if (cur !== run) return r;
  chainSpin(q);                                   /* 全链逐轮延迟起转（jam 题卡住演出） */
  await wait(CHAIN_MS * SPEED);                   /* 收尾窗：1100+1500=2600 ≥ 2088+300=2388（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                           /* 教学迷你关完成：帮→独后进正式关（watch 期由
                                                     tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                  /* 新机器开题（SPEC §3 每题一台机器） */
  return r;
}

/* ================= 过关推进（关末全速全景 → celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_gear） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关静态章档 GEN[dch-1]
     （家族 F：genLevel 纯函数确定性——预告与实际恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
/* 关末全速+全景（纯演出层——判定每步即判；FULL_WIN 2400 ≥ gr_right 2088+300=2388
   罩 winFlow 重播；ch4 冲突关末=拆右手柄 .unhands 后全链转——「拆手柄」修好叙事） */
async function fullShow() {
  if (cur && cur.retries === 0) {
    const w0 = wallEl.querySelector('.slot[data-type="W"], .slot[data-type="B"]');
    if (w0) replayAnim(w0, 'breathe');            // 零错加成：链尾槽泛光（纯演出层）
  }
  const bHand = wallEl.querySelector('.slot[data-type="B"]');
  if (bHand) bHand.classList.add('unhands');      // 冲突关末：右手柄拆除（视觉降隐）
  wallEl.querySelectorAll('.slot.jammed').forEach(s => s.classList.remove('jammed'));
  sceneEl.classList.add('panorama');
  wallEl.querySelectorAll('.slot').forEach(s => s.classList.add('fullspeed'));
  await wait(FULL_WIN * SPEED);
  sceneEl.classList.remove('panorama');
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                      /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);        /* gr_right：风车转起来啦（2088ms） */
  if (VERIFY) { persistWin(stars); return; }      // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  fullShow().then(() => KIDS.ui.celebrate(stars)).then(async () => {
    await wait(400);                              /* 家族 H：celebrate 2620+400=3020 ≥ 2088+300=2388 */
    const pr = persistWin(stars);
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
  showRun++;                                      /* 中止在途演出（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastReplayAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                           /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.gear && sv.gear.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §3 v3：双答演示=两步幽灵手指）
   watch=播 gr_tut_watch「看！齿轮咬齿轮」→ 开题（题面句 3660+判定槽高亮）→ 幽灵
   手指①点正确预判按钮（ccw——k%2 转向律题 0）→ 'ok'（钉住+DIR_OK_MS 500）→
   幽灵手指②点齿轮库正确候选 → 咬合+全链联动（__grDemoR='meshed'——题 0 非末题）；
   turn=重立单题迷你关「你来装一装」，帮（phase1 指按钮/phase2 指候选）→首对独（solo）
   →进正式关。
   时序（家族 G/H/T）：watch clip 3024 → 延 3324（≥3024+300）→ 开题题面句 3660
   → ghost① 移入 800+press 320 → dir 答 'ok' 窗 DIR_OK_MS 500 → ghost② 移入 800+
   press 320 → demo 演出窗 1100+1500=2600（罩确认链 2088+300=2388）
   —— watch 段分账 3324+3660+800+320+500+800+320+2600=12324 ≤ 16000（单步演示款 ≤16s）
   turn clip 1776 → 延 2076（≥1776+300）→ presentQuiz → 帮指（两步分流）---------- */
function tutWatchLevel() {                        // 双题迷你关：题 0=演示题（demo 放对返回 'meshed'）
  const rnd = mulberry32(20260912);               // 教学固定流（不与关卡流耦合）
  return { flat: -1, ch: 0, dch: 1, lv: 0, step: 0, retries: 0, done: false,
           rows: [0, 2],
           quizzes: [buildQuiz(0, rnd), buildQuiz(2, rnd)] };   // ①D_W 放 t10 / 备用
}
function tutTurnLevel() {                         // 单题迷你关（末题=放对返回 'done'→帮转独）
  const rnd = mulberry32(20260913);
  return { flat: -1, ch: 0, dch: 1, lv: 0, step: 0, retries: 0, done: false,
           rows: [0], quizzes: [buildQuiz(0, rnd)] };           // ①D_W（放 t10）
}
async function tutorialWatch() {
  const t0w = Date.now();                         // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);        /* gr_tut_watch：看！齿轮咬齿轮（3024ms） */
  await wait(3324 * SPEED);                       /* ≥3024+300=3324：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                            /* 题面句+判定槽高亮 → 开放（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  pointGhostAt(dirBtnAt(q.dirAns));               /* 幽灵手指①：指向正确预判按钮（先猜后试） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoDirR = await uiTapDir(q.dirAns, true);   /* demo 通道豁免演出锁 → 'ok'（含 500 短锁） */
  if (state.tut !== 'watch') return;
  pointGhostAt(pickAt(correctPick(q)));           /* 幽灵手指②：指向齿轮库正确候选 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapGear(correctPick(q), true);   /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__grDemoR = demoR;                       /* 演示生效证据（§0.27，gate 断言 'meshed'——终值语义） */
  window.__grWatchMs = Date.now() - t0w;          /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.gear = sv.gear || {};
  sv.gear.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立单题迷你关「你来装一装」（帮→独两步），首次放对放手进正式关 */
  ghost.hide();
  showRun++;                                      /* 显式中止在途（演示 meshed 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);          /* gr_tut_turn：你来装一装（1776ms） */
  await wait(2076 * SPEED);                       /* ≥1776+300=2076 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();          /* 题面句→开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
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
  sayR(VOICE.hint.key, VOICE.hint.text);          /* 戳兔子=方向提示：看看旁边的齿轮 */
  const q = cur.quizzes[cur.step];
  if (q) litNeighbors(q);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期重听门 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  reReadObs(true);                                /* 重读题面句+判定槽高亮（3s 节流在内） */
});
picksEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick');
  if (!p) return;                                 // 库间空白走 stage 空白路径
  e.preventDefault();
  uiTapGear(Number(p.dataset.i));                 /* 点候选下标 i 的齿轮（tapGear 语义；阶段1 未答吞） */
});
/* 先答一答预判行（v3 判定层阶段1——uiTapDir 判定路径） */
guessbarEl.addEventListener('pointerdown', e => {
  const b = e.target.closest('.guess-btn');
  if (!b) return;
  e.preventDefault();
  uiTapDir(b.dataset.guess);                      /* 点预判选项（tapDir 语义） */
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick') || e.target.closest('.guess-btn')) return;   // 已由各自处理
  /* 空白/探索点击（含机器墙垫非交互区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);        /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播题面句+相邻高亮，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（按 phase 分流：阶段1=正确预判
   按钮 breathe / 阶段2=正确候选 breathe）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索（按 phase 分流） */
    const q = cur.quizzes[cur.step];
    if (q) {
      if (q.phase === 1) {
        const okBtn = dirBtnAt(q.dirAns);
        if (okBtn) replayAnim(okBtn, 'breathe');
      } else {
        const i = correctPick(q);
        if (i >= 0) { const ok = pickAt(i); if (ok) replayAnim(ok, 'breathe'); }
      }
      reReadObs(false);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播题面句+相邻高亮（不动 lastAct） */
    reReadObs(false);
    const q = cur && cur.quizzes[cur.step];
    if (q) litNeighbors(q);
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'gear', title: '齿轮转起来' });   // 存档键 kidsgame_gear（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.GR——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（slots 逐槽浅拷贝——含 gear/teeth/dir 真值；verify 用独立
   转向律/冲突/传动比副本复算=对账锚）；step=全关题号 0-4（b33 坑①：题号语义）。
   tapDir 返回：d=dirAns→'ok' / 干扰→'wrong' / 豁免窗内错答吞 false / 演出期·阶段2·
   已答 null；tapGear 返回：对且非末题 'meshed' / 对且末题 'done' / 干扰 'wrong' /
   阶段1 未答（双答顺序守卫）· 豁免窗内错点吞 false / 开题演出期 null（真时钟锁）/
   越界·已答·无题 null；reread()=重读题面句（3s 节流内 false）================= */
window.GR = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                            /* 题型（dir/speed/conflict——按钮组与真值式分流） */
             layout: q.layout,                        /* SPEC §3 钩子契约：布局记法原串 */
             slots: q.slots.map(s => ({ i: s.k,         /* 槽位序列（拷贝）：位置号 */
                                        fixed: !!s.gear, /* 该位已有齿轮（固定轮/已咬合） */
                                        gear: s.gear,    /* 已放齿轮齿数档 id|'D'|'W'|'B'|null */
                                        teeth: s.teeth,  /* 齿数数字（数齿对账锚）|null */
                                        dir: s.dir,      /* 该位转向 'cw'|'ccw'|'jam'|null（k%2 律真值） */
                                        type: s.type, meshed: !!s.meshed })),
             blank: q.blank,                          /* 当前判定空槽位置号 */
             picks: q.picks.slice(),                  /* 候选齿轮齿数档 id 3 枚（去恒等邻档池） */
             answer: q.answer,                        /* 正确候选下标（verify 独立推导） */
             need: q.need,                            /* 判定槽需求齿数档（几何匹配真值） */
             dteeth: q.dteeth,                        /* 驱动轮齿数档（speed 章表定；他章 t12） */
             dirAns: q.dirAns,                        /* 阶段1 真值（cw/ccw/jam/small/same） */
             jam: q.jam,                              /* 双驱动奇偶冲突锁死（iff 链长偶） */
             phase: q.phase,                          /* 双答阶段（1 预判答|2 选齿数） */
             obs: q.obs, obsKey: q.obsKey,            /* 题面句+clip 键（T46 阶段2） */
             step: cur.step,                          /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapDir(d) { return uiTapDir(d); },
  tapGear(i) { return uiTapGear(i); },
  reread() { return reReadObs(true); },
  async autoSolve() {                    // UI 路径自动点完当前关（每题两段：先答预判再放齿轮；
    let taps = 0, guard = 0;             // 演出锁/开题演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 300) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase === 1) {
        const r = await uiTapDir(q.dirAns);
        if (r === 'ok') taps++;
      } else {
        const r = await uiTapGear(correctPick(q));
        if (r === 'meshed' || r === 'done') taps++;
      }
      if (guard >= 298) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
