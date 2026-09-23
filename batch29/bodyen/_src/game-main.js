/* ================= bodyen 主逻辑（题面渲染 / 四卡点选 / 教学 / 救援 / 推进）
   玩法：hear 题=题面句 bod_q1+英语词音拼播 → 4 部位图卡（小兔高亮该部位迷你图）；
   see 题=小兔大图高亮目标部位+题面句 bod_q2 → 4 英语单词文字卡；
   do 题（r41）=题面句 bod_q3+英语指令音拼播（touch your nose / clap your hands 等）
   → 4 动作卡（touch 族=小兔摸部位图卡/动作族=动作图标卡+中文短语）。
   点对 = 场景放大跳 + 小兔子滑入示范 + 确认句拼播（bod_right+bod_w_<en> 词音尾段；
   do-action=仅 bod_right——动词短语 clip 未注册实测，窗 4500 不扩）；
   点错 = 卡摇头 + queue 链 [bod_wrong, 语义句 TTS（, hear 题再拼词音重播）]，
   1000ms 防重入窗后可重选（探索不罚）；see 题另发部位图 pulse（方向级回锚）。
   救援两级（§0.70/家族 B 定版）：14s 方向级=重读题面+（see 题部位 pulse/hear·do 题
   题面 pulse）（lastDir 独立节流锚，不重置 lastAct）；30s 答案级=正确卡 breathe+重读；
   面板在场守卫（契约 K）静默。
   语音窗（家族 G/H/I/T，clip 实长 SPEC-BATCH29 §4 量化）：
   bod_tut_watch 3168 → 教学词音演示延至 t=3468（≥3168+300，禁与词音撞头）；
   bod_tut_turn 1824 → turn 后读题延 2150（≥1824+300=2124 防尾截）；
   bod_right 2256 + 词音 max 1656（r41 终态=bod_w_shoulder，24 词全域；修复轮 m-2 勘误原 1536
     =bod_w_nose 旧 8 词口径）→ 判对确认链 2256+150+1656=4062，演出窗
     1600+2900=4500 ≥ 4062+300=4362；winFlow celebrate(2620)+wait(400)=3020 ≥ 2556；
   bod_wrong 1656 + hear 题词音 max 1656 + 语义句 clip bod_again_hear 2352（T46 阶段2 clip 化）→ 拼播链
     1656+150+1656+150+2352=5964，错点防重入窗 1000ms；对选可打断链；
     救援读题掐链由 wrongChainUntil=7200 守卫（契约 I：≥5964+300=6264）；
     r41 do 错链=[wrong, again_do] 1656+150+estMs(8)=3360+300=5466 ≤7200（注册后实长复核）；
     全段 clip 无 keyless（T46 后 Mj-1 链尾约束自然解除，键段 text=TTS 兜底）；
   bod_q1 2952 + 词音 max 1656 → hear 开题链 4758（读题不锁，可即答即切）；
   r41 do 开题链 [q3, v_touch, 词音]（est 4050+150+~2s+150+1656——无窗，读题不锁）。
   验收钩子：window.BE = { get currentLevel, get quiz(){kind, verb, ask, opts[](图卡{part}|
   词卡{text}|动作卡{part}|{verb}), answer, step, miss}, tapOpt(i), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝）
   tapOpt 返回：对='right' / 末题对='done' / 错='wrong'（miss+1，step 不变）/
   locked·演出窗=false+pop+bump / 越界·已答=null+pop+bump；
   教学演示结果 window.__beDemoR */
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
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（恒题面句 clip；hear 题英语词音紧随其后拼播——家族 G 链
   2952+150+1656=4758；see 题只读题面句：目标已高亮可见，不播词音防泄底；
   do 题（r41）=题面句 bod_q3+英语指令音拼播：touch 族三段 [q3, v_touch, 词音]（开题链
   无窗——读题不锁可即答即切，est 口径 SPEC-R41 §R9）；动作族两段 [q3, v_<verb>]） ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'hear') KIDS.voice.queue([VOICE.q1.key, wordClip(q.ask)]);
  else if (q.kind === 'do') {
    if (q.verb === 'touch') KIDS.voice.queue([VOICE.q3.key, verbClip('touch'), wordClip(q.ask)]);
    else KIDS.voice.queue([VOICE.q3.key, verbClip(q.ask)]);
  }
  else KIDS.voice.play(VOICE.q2.key, VOICE.q2.text);
}
/* 重听路径（hear 题同句=错反馈语义句「再听一遍这个单词」，SPEC §1「重听按钮同句」：
   词音前置+语义句尾段 bod_again_hear（T46 阶段2 clip 化，text=TTS 兜底），
   与 poem 重听 [行音, 读题句] 同构；see 题=重读题面句+部位图再 pulse 高亮；
   do 题（r41）=指令音前置+语义句尾段 bod_again_do——touch 族 [v_touch, 词音, again_do]
   三段/动作族 [v_<verb>, again_do] 两段，与 hear 重听同构） */
function replayQuiz(withPulse) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'hear') KIDS.voice.queue([wordClip(q.ask), { key: 'bod_again_hear', text: HEAR_AGAIN }]);
  else if (q.kind === 'do') {
    KIDS.voice.queue(q.verb === 'touch'
      ? [verbClip('touch'), wordClip(q.ask), { key: 'bod_again_do', text: DO_AGAIN }]
      : [verbClip(q.ask), { key: 'bod_again_do', text: DO_AGAIN }]);
    if (withPulse) replayAnim(sceneEl, 'pulse');   /* do 题方向级：题面区整体呼吸（同 hear） */
  }
  else {
    KIDS.voice.play(VOICE.q2.key, VOICE.q2.text);
    if (withPulse) pulseAsk();
  }
}
/* 方向级回锚：目标部位图再 pulse 高亮（see 题专用——错反馈/重听/救援共用） */
function pulseAsk() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.kind !== 'see') return;
  const el = sceneEl.querySelector('.pt.hl');
  if (el) replayAnim(el, 'pt-pulse');
}

/* ================= 渲染 ================= */
const Q_TEXT = { hear: VOICE.q1.text, see: VOICE.q2.text, do: VOICE.q3.text };
function renderScene(q) {                        // 题面：小兔身体大图（see 高亮目标/hear·do 中性）+题面句
  sceneEl.dataset.kind = q.kind;
  sceneEl.dataset.ask = q.kind === 'see' ? q.ask : '';   // 帧内容锚（契约 M：verify 断言；do 题防泄不标）
  sceneEl.setAttribute('aria-label', q.kind === 'see'
    ? PART_ZH[q.ask] + '高亮，点我再听一遍'
    : '听一听，点我再听一遍');
  sceneEl.innerHTML = '<div class="scene-slot">' + bodySvg(q.kind === 'see' ? q.ask : null) + '</div>' +
    '<div class="q-text">' + Q_TEXT[q.kind] + '？</div>' +
    (q.kind !== 'see' ? '<div class="snd-chip" aria-hidden="true">' + ICONS.hear + '<span>' + (q.kind === 'do' ? '做' : '听') + '</span></div>' : '');
}
/* see 词卡字号档（r41 长词 shoulder 8/eyebrow 7 字母——卡宽 140/竖屏 130 内闭合） */
const wSizeCls = w => w.length >= 8 ? 'xs' : w.length === 7 ? 'sm' : w.length === 6 ? 'md' : '';
function renderBoard(q) {                        // 卡排：hear=4 部位图卡 / see=4 英语词文字卡 / do=4 动作卡
  boardEl.innerHTML = '';
  boardEl.dataset.kind = q.kind;
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop ' + (q.kind === 'hear' ? 'pcard' : q.kind === 'do' ? (o.part ? 'pcard dcard' : 'acard') : 'wcard');
    b.dataset.i = i;
    b.dataset.oid = o.id;                        // verify 对账（渲染即引擎：p:/w:/t:/a:）
    if (q.kind === 'hear') {
      b.setAttribute('aria-label', PART_ZH[o.part] + '图片卡');
      b.innerHTML = bodySvg(o.part);             // 迷你小兔高亮该部位（不出现文字——纯听辨）
    } else if (q.kind === 'do') {
      if (o.part) {                              // do-touch 卡：迷你小兔高亮+爪标摸该部位
        b.setAttribute('aria-label', '摸' + PART_ZH[o.part] + '图片卡');
        b.innerHTML = bodySvg(o.part, 'touch');
      } else {                                   // do-action 卡：动作图标+中文短语（听英语→懂意思→选动作）
        b.setAttribute('aria-label', ACT_ZH[o.verb] + '动作卡');
        b.innerHTML = ACT_SVG[o.verb] + '<span class="a-label">' + ACT_ZH[o.verb] + '</span>';
      }
    } else {
      b.setAttribute('aria-label', '单词 ' + o.text);
      const cls = wSizeCls(o.text);
      b.innerHTML = '<span class="w-label' + (cls ? ' ' + cls : '') + '">' + o.text + '</span>';   // 小写词形认读（§0.19）
    }
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
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

/* ================= 答对演出：场景放大跳 + 小兔子滑入示范（确认句拼播由 uiTapOpt 播）
   verify 页跳飞行直接落定 ---------- */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.scene-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 54);   /* 小兔子开心示范 */
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / BE.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
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

  if (r === 'wrong') {                           /* 答错：摇头+bod_wrong+语义句（hear=再听词/see=再看部位/do=再听指令） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const parts = q.kind === 'hear'
      ? [VOICE.wrong.key, wordClip(q.ask), { key: 'bod_again_hear', text: HEAR_AGAIN }]   /* 听力回锚：词音重播+语义句 clip（T46 阶段2；text=TTS 兜底） */
      : q.kind === 'do'
      ? [VOICE.wrong.key, { key: 'bod_again_do', text: DO_AGAIN }]                        /* 指令回锚：语义句 clip（不自动重播指令——错链 1656+150+3360est+300 ≤7200 闭合；重播走再听/救援） */
      : [VOICE.wrong.key, { key: 'bod_again_see', text: SEE_AGAIN }];                     /* 视觉回锚：语义句 clip+部位 pulse */
    if (sayW(parts))
      wrongChainUntil = Date.now() + 7200;      /* 链豁免：1656+150+1656+150+2352+300=6264（clip 实长，契约 I；m-2 勘误原 6144） */
    if (q.kind === 'see') pulseAsk();           /* see 题方向级：目标部位图再 pulse 高亮 */
    else if (q.kind === 'do') replayAnim(sceneEl, 'pulse');   /* do 题方向级：题面区整体呼吸（同 hear） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：场景放大跳+兔子示范+确认句拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 场景放大跳 + 小兔子滑入示范 */
  /* 确认句拼播：hear/see/do-touch=点对啦真棒+词音尾段（≤2256+150+1656+300=4362 ≤4500 窗）；
     do-action=点对啦真棒+动词短语（r41 修复轮 §R10 挂账转增强 2026-09-22：v_* 实测
     max=bod_v_stomp 1608——2256+150+1608+300=4314≤4500 窗收；原单段右段=过渡态 est ~2500
     超窗缓挂，注册后实长落定） */
  if (q.kind === 'do' && q.verb !== 'touch') KIDS.voice.queue([VOICE.right.key, verbClip(q.ask)]);
  else KIDS.voice.queue([VOICE.right.key, wordClip(q.ask)]);
  await wait(1600 * SPEED);                      /* 场景跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(2900 * SPEED);                      /* 确认链收尾窗：总 4500 ≥ 2256+150+1656+300=4362（家族 G/H；m-2 勘误原 4242） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（题面/卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* bod_right：点对啦，真棒（2256ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2256+300=2556 */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.bodyen && sv.bodyen.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 bod_tut_watch「看！听英语点身体」→ 播 eye 词音（听英语）→ 幽灵手指点 eye 图卡
   →点中（确认句拼播）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s，分账 10188）
   时序（家族 G/H）：watch clip 3168ms → 词音演示延至 t=3468（≥3168+300，禁与词音撞头）；
   词音 eye 1296 + ghost 移入窗 1600 ≥ 1296+300；演示演出窗 4500 罩确认链 2256+150+1296+300 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* bod_tut_watch：看！听英语点身体（3168ms） */
  const run = cur;
  await wait(3468 * SPEED);                      /* t=3468 ≥ 3168+300：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 hear/eye（教学演示锚）
  KIDS.voice.play(wordClip(q.ask), q.ask);       /* 播 eye 词音：听英语（1296ms） */
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向 eye 图卡 */
  await wait(1600 * SPEED);                      /* ≥1296+300：词音播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__beDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.bodyen = sv.bodyen || {};
  sv.bodyen.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5-28） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* bod_tut_turn：你来点一点（1824ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2150);                                      /* ≥1824+300=2124 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再听一遍想一想 */
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
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuiz(false);                             /* 再听一遍：hear=语义句+词音 / see=重读题面句 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  replayQuiz(true);                              /* see 题附部位图再 pulse（方向级回锚） */
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

/* ================= 无操作看护：14s 方向级（重读题面+题面/部位 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+方向 pulse（不动 lastAct） */
    speakQuiz();
    const q = cur.quizzes[cur.step];
    if (q && q.kind === 'see') pulseAsk();       /* see 题：目标部位图再 pulse */
    else replayAnim(sceneEl, 'pulse');           /* hear/do 题：题面区整体呼吸（do 同 hear 口径） */
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
  KIDS.init({ game: 'bodyen', title: '身体英语' });   // 存档键 kidsgame_bodyen（core VER 1.0，家族 C）
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
window.BE = {
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
    return { kind: q.kind,                             /* SPEC §1 钩子契约：hear|see|do（r41 扩） */
             ask: q.ask,                               /* hear/see=部位 id（封闭 24 词）；do-touch=部位 id/do-action=动词 id */
             verb: q.verb || null,                     /* do 题动词（touch/clap/shake/stomp/wave；非 do=null） */
             opts: q.opts.map(o => q.kind === 'hear'
               ? { part: o.part }                      /* hear=图卡 {part} */
               : q.kind === 'do'
               ? (o.part ? { part: o.part } : { verb: o.verb })   /* do-touch=摸部位卡 {part}/do-action=动作卡 {verb} */
               : { text: o.text }),                    /* see=词卡 {text} */
             answer: q.answer,                         /* 正确卡下标 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 120) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 600) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOpt(q.answer);
      if (r === 'right' || r === 'done') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
      else if (guard >= 118) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
