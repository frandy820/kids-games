/* ================= cir 主逻辑 r4（双答制：预判 → 钉住 → 选元件 → 拓扑揭示 → 关末全板通电）
   开题演出（presentQuiz）：渲染电路板（每题一块板）→ 题面句 clip 播报（voice.play
   cir_obs_ 章档键——T46 阶段2 clip 化）→ 判定缺口 .focus 呼吸高亮 → 开放阶段1 预判行。演出锁=真时钟
   state.showUntil（tapPred/tapPart 演出期返 null——测试驱动须轮询等可交互）。
   阶段1 预判（uiTapPred）：亮/不亮（ch1-3）或 更亮/一样亮/更暗（ch4）——答对
   =预判钉 chip 钉在判定缺口（.pindir）+短锁 PRED_OK_MS 500+140 → 元件库亮起
   （picks.dim 解除）；ch2 答对续合开关亮真相（REVEAL_MS 1800——开关 .sw.closed
   +灯按 litAns 显真值，即时验证）；答错=按钮 rej+专向错链 [cir_pred_wrong|
   cir_bright_wrong, cir_hint]+miss≥2 正确预判按钮 breathe（不泄答案）。
   阶段2 放元件（uiTapPart）：顺序守卫（阶段1 未答吞 null）；放对=导线落位弹入
   （判定槽 .closed+wirepiece）/拆线卡剪掉跨接线（.jumper.gone）→ 拓扑揭示演出：
   twogap-A 兔子 700ms 补第二缺口后才亮（两缺口都接对才亮——延迟验证）；twogap-B
   立亮+兔子补死支路（风扇转，灯不变）；fault-F1 立亮+兔子补死支路；fault-F2
   风扇转（主灯已亮）；fault-F3 剪线 1000ms 后亮；switch-SW1 合支路开关→灯暗
   （短路真相）→SW_AUTO_MS 后支路开关自动弹开（禁合教学）→亮；switch-SW2/SW3
   合开关立亮；bright-SR 两灯 .on.dim 弱光齐亮 / bright-PR .on 全亮（亮度演示）。
   → 确认链 [cir_right]（单 clip 1968——演出窗 LIT_MS 1400+FLOW_MS 1600=3000 ≥
   1968+300=2268 家族 G/H；F3 窗 CUT_MS 1000+FLOW_MS 1600=2600 ≥ 2268）。
   放错=候选抖动 rej+错链 [cir_wrong,cir_hint]+方向级反馈 litGapEnds（高亮缺口
   两端触点——不亮正确件本体）/miss≥2 判定缺口 breathe。
   错链三型（豁免窗真时钟，契约 I）：元件 4266=1848+150+1968+300 / 预判 5490=
   3072+150+1968+300 / 亮度 4962=2544+150+1968+300；三首错锁（b37 R3+b38 R1 总
   窗口径：锁=clip+150 顶格禁叠尾窗）1998/3222/2694；二错起防重入锁 1000。
   救援：14s 方向级=重播题面句+（phase1 主路走线 .trace 流光一遍 / phase2 缺口
   触点高亮——lastDir 独立节流锚不重置 lastAct，契约 B）/30s 答案级=phase 感知
   （phase1=正确预判按钮 / phase2=正确元件 breathe）；错链豁免窗让路（契约 I）。
   关末=全板通电泛光 fullglow → celebrate → persistWin。
   验收钩子：window.CIR = { get currentLevel, get quiz{kind,phase,slots,blank,blankAt,
   need,picks,answer,deadIdx,second,branch,short,litAns,brightAns,step,miss,say},
   tapPred(d), tapPart(i), start(flat), autoSolve(), reread(), get tutorial }——真实页
   同暴露（b29 坑⑥）。tapPred 返回：真值→'ok' / 干扰→'wrong' / 豁免窗内错答吞
   false / 演出期·阶段2·已答·非法 null；tapPart 返回：对非末题 'lit' / 对末题
   'done' / 干扰 'wrong' / 阶段1 未答 null / 豁免窗内错点吞 false / 演出期·越界·
   已答 null。 */
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

const sceneEl = $id('scene'), boardEl = $id('board'), picksEl = $id('picks'),
      answerbarEl = $id('answerbar'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', showUntil: 0 };   /* r4 审查 m-3：死状态 quiet 只写不读，删（b39 §5.1 backlog） */
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重听中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const slotAt = k => boardEl.querySelector('.slotg[data-k="' + k + '"]');
const pickAt = i => picksEl.querySelector('.pick[data-i="' + i + '"]');
const predBtnAt = d => answerbarEl.querySelector('.guess-btn[data-guess="' + d + '"]');
/* 板型路由（SPEC §3 r4）：bright-PR=twin 并联板 / bright-SR=sr2 串联板 / 他=sgl 单灯板 */
const boardOf = q => q.kind === 'bright' ? (q.branch ? BOARD.twin : BOARD.sr2) : BOARD.sgl;
/* 槽位几何：主环槽 k<layout.length 取板槽；死支路槽=branchSeg.gap（追加末槽） */
function slotGeo(q, k) {
  const G = boardOf(q);
  return k < q.layout.length ? G.slots[k] : (G.branchSeg ? { d: G.branchSeg.d, gap: G.branchSeg.gap } : G.slots[0]);
}
const isDecoyQ = q => !!(q.second && q.second.at === 'dead');
const isCutQ = q => q.kind === 'fault' && q.need === null;
const isSwShortQ = q => q.kind === 'switch' && !!(q.branch && q.branch.bridge === 'lamp' && q.branch.sw);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：预判钉住/通电亮灯=双音上行 / 放错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 缺口几何：跨距线段两端点（gap 锚点+方向 → SPAN[档] 定长）
   落位导线 piece=跨距线段上粗铜线（与候选导线同形——几何匹配具象） ---------- */
function gapEnds(g, size) {
  const half = SPAN[size] / 2;
  return g.vert
    ? [{ x: g.x, y: g.y - half }, { x: g.x, y: g.y + half }]
    : [{ x: g.x - half, y: g.y }, { x: g.x + half, y: g.y }];
}
function pieceSvg(e1, e2) {
  return '<g class="wirepiece" data-anim="wire">' +
    '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y +
    '" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>' +
    '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y +
    '" stroke="' + COPPER + '" stroke-width="7" stroke-linecap="round"/></g>';
}

/* ================= 渲染（每题一块电路板——开题整建；契约 M 渲染即引擎） ================= */
function renderBoard(q) {
  const G = boardOf(q);
  let s = '<svg viewBox="' + G.vb + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  /* 电流粒子环流层（板底——g[data-anim="flow"] 契约 M 锚；闭合后 .flowing） */
  s += '<g data-anim="flow">' +
    G.flows.map(f => '<path class="flowpath" d="' + f + '"/>').join('') + '</g>';
  /* 固定右干路（tw 并联板铬件——非槽） */
  if (G.trunk) s += '<path class="wmain" d="' + G.trunk + '"/><path class="wcopper" d="' + G.trunk + '"/>';
  /* 死支路层（sgl 板：跨线段下穿 / 跨灯上拱；支路开关合上=演出 .sw.closed） */
  if (q.branch && G.branchSeg) {
    const BR = q.branch.bridge === 'lamp' ? G.branchLamp : G.branchSeg;
    s += '<g class="branchg" data-bridge="' + q.branch.bridge + '">';
    s += '<path class="wmain" d="' + BR.d + '"/><path class="wcopper" d="' + BR.d + '"/>';
    if (q.branch.sw) s += swSvg(BR.swAt.x1, BR.swAt.y1, BR.swAt.x2, BR.swAt.y2);
    s += '<g class="pindir"></g></g>';
    if (q.branch.bridge === 'seg') {
      for (const j of G.junctions) s += '<circle class="junction jbranch" cx="' + j.x + '" cy="' + j.y + '" r="6"/>';
    }
  }
  /* 跨接线短路层（fault-F3：跨灯两端红纹——断/短可视分型锚；拆线卡 .gone） */
  if (q.short && G.branchLamp) {
    s += jumperSvg(G.branchLamp.a, G.branchLamp.b);
  }
  /* 主路开关（fault/SW3：swLead 引线上的闸刀 .swmaing——阶段1 答对合上） */
  if (q.sw && G.swLead) {
    s += '<g class="swmaing">' +
      '<path class="wmain" d="M ' + G.swLead.x1 + ' ' + G.swLead.y + ' L ' + G.swLead.x2 + ' ' + G.swLead.y + '"/>' +
      swSvg(G.swLead.x1, G.swLead.y, G.swLead.x2, G.swLead.y) + '</g>';
  }
  /* 导线槽序列（骨架字符串——data-k/data-type 渲染后经 dataset API 盖章=渲染即引擎，契约 M） */
  for (const sl of q.slots) {
    const geo = slotGeo(q, sl.k);
    s += '<g class="slotg">';
    if (sl.type === 'fix') {
      s += '<path class="wmain" d="' + geo.d + '"/><path class="wcopper" d="' + geo.d + '"/>';   // 已连固定槽：实线即成
    } else {
      const size = sl.type === 'blank' ? q.need : q.second.size;   // 缺口跨距=判定真值 / 兔子槽=补齐档
      const e = gapEnds(geo.gap, size);
      s += '<path class="solid" d="' + geo.d + '"/><path class="solidc" d="' + geo.d + '"/>';   // 落位后实线（CSS 显隐）
      s += '<path class="routefaint" d="' + geo.d + '"/>';           // 浅虚线路由（走线提示）
      s += '<line class="gapline" x1="' + e[0].x + '" y1="' + e[0].y + '" x2="' + e[1].x + '" y2="' + e[1].y + '"/>';
      s += '<circle class="pad" cx="' + e[0].x + '" cy="' + e[0].y + '" r="6"/>' +
           '<circle class="pad" cx="' + e[1].x + '" cy="' + e[1].y + '" r="6"/>';
      s += '<line class="ghostwire" x1="' + e[0].x + '" y1="' + e[0].y + '" x2="' + e[1].x + '" y2="' + e[1].y + '"/>';   // 悬停预览虚影（非判定）
      if (sl.type === 'bunny') s += '<text class="qmark" x="' + geo.gap.x + '" y="' + (geo.gap.y - 12) +
        '" text-anchor="middle">?</text>';
      if (q.kind === 'fault') s += '<path class="fraymark" d="' + frayPath(geo.gap, size) + '"/>';   // 断口毛边（断路可视分型）
    }
    s += '<g class="pindir"></g></g>';
  }
  /* 死支路小风扇（seg 支路含缺口时——支路修好后 .spin；主灯不受其影响） */
  if (G.branchSeg && G.branchSeg.fanAt && qHasDeadGap(q)) {
    s += fanSvg(G.branchSeg.fanAt.x, G.branchSeg.fanAt.y);
  }
  /* 结点+灯泡+电池（板面铬件；结点=seg 支路分叉点（支路块内已画）/tw 并联板分叉点） */
  if (G === BOARD.twin) {
    for (const j of G.junctions) s += '<circle class="junction" cx="' + j.x + '" cy="' + j.y + '" r="6"/>';
  }
  for (const l of G.lamps) s += lampSvg(l);
  s += battSvg(G.batt);
  s += '</svg>';
  boardEl.innerHTML = s;
  /* 渲染即引擎盖章（契约 M）：槽位号+类型经 dataset API 写真值（verify 扁平对账依据） */
  const slotEls = boardEl.querySelectorAll('.slotg');
  q.slots.forEach((sl, idx) => {
    const g = slotEls[idx];
    if (!g) return;
    g.dataset.k = String(sl.k);
    g.dataset.type = sl.type;
    if (q.kind === 'fault' && sl.type !== 'fix') g.dataset.frayed = '1';   // 断口毛边章标记
  });
  boardEl.dataset.n = String(q.slots.length);     // 帧内容锚（verify 断言渲染即引擎）
}
const qHasDeadGap = q => !!(q.second && q.second.at === 'dead') || q.blankAt === 'dead';
/* 断口毛边小径（缺口两端锯齿毛刺——断路 vs 短路可视分型：断路=毛边断口 / 短路=红纹跨接） */
function frayPath(g, size) {
  const e = gapEnds(g, size);
  const jag = (p, dir) => {
    let d = '';
    for (let i = 0; i < 3; i++)
      d += 'M ' + (p.x + dir * (2 + i * 4)) + ' ' + (p.y - 6 + i * 2) + ' L ' + (p.x + dir * (8 + i * 4)) + ' ' + (p.y + 6 - i * 2) + ' ';
    return d;
  };
  const dirx = e[1].x !== e[0].x ? (e[1].x > e[0].x ? 1 : -1) : 0;
  return jag(e[0], dirx || -1) + jag(e[1], -dirx || 1);
}
function renderPicks(q) {                        // 元件库候选 3 枚（触摸目标 ≥96 容器；含拆线卡/死支路干扰）
  picksEl.innerHTML = '';
  q.picks.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'pick' + (p.dead ? ' pick-dead' : '') + (p.t === 'cut' ? ' pick-cut' : '');
    b.dataset.i = String(i);
    if (p.t === 'wire') {
      b.dataset.size = p.size;                   // 悬停预览档源（非判定层）
      b.setAttribute('aria-label', (p.dead ? '支路' : '') +
        (p.size === 'S' ? '短' : p.size === 'M' ? '中' : '长') + '导线');
      b.innerHTML = wireSvg(p.size, 96, 44, !!p.dead);
    } else {
      b.setAttribute('aria-label', '拆线卡，剪掉跨接线');
      b.innerHTML = cutSvg(96, 44);
    }
    picksEl.appendChild(b);
  });
}
function renderAnswerbar(q) {                    // 先猜一猜预判行（r4 判定层阶段1——按 kind 渲染按钮组）
  answerbarEl.querySelector('.a-label').textContent = q.kind === 'bright' ? '先猜亮度' : '先猜一猜';
  const box = answerbarEl.querySelector('.a-btns');
  box.innerHTML = '';
  PRED_KINDS[q.kind].forEach(d => {
    const b = document.createElement('button');
    b.className = 'guess-btn';
    b.dataset.guess = d;
    b.setAttribute('aria-label', PRED_LABELS[d]);
    b.innerHTML = predIconSvg(d, 34) + '<span>' + PRED_LABELS[d] + '</span>';
    box.appendChild(b);
  });
  renderPhase(q);
}
function renderPhase(q) {                        // 阶段视觉态：answerbar done+预判钉 chip+元件库 dim 解除
  const done = !!q._predOk;
  answerbarEl.classList.toggle('done', done);
  answerbarEl.classList.add('show');
  answerbarEl.querySelectorAll('.guess-btn').forEach(b => b.classList.remove('picked'));
  if (done) {
    const ok = predBtnAt(q.predAns);
    if (ok) ok.classList.add('picked');
  }
  picksEl.classList.toggle('dim', !done);        // 阶段1 元件库降透明（顺序引导）
  /* 预判钉 chip：钉在判定缺口上方（F3 无缺口=钉在灯下方跨接线近旁） */
  boardEl.querySelectorAll('.pindir').forEach(p => { p.classList.remove('show'); p.innerHTML = ''; });
  if (done) {
    let pin = null, tx = 0, ty = 0;
    if (q.blank >= 0) {
      const gs = slotAt(q.blank);
      const pg = gs && gs.querySelector('.pindir');
      if (pg) {
        const geo = slotGeo(q, q.blank);
        pin = pg; tx = geo.gap.x; ty = geo.gap.y - 42;
      }
    } else {
      const jp = boardEl.querySelector('.jumper');
      const pg = jp && jp.querySelector('.pindir');
      if (pg) { pin = pg; tx = 280; ty = 112; }
    }
    if (pin) {
      pin.setAttribute('transform', 'translate(' + tx + ',' + ty + ')');
      pin.innerHTML = predIconSvg(q.predAns, 40) +
        '<text class="pintxt" x="20" y="52" text-anchor="middle">' + PRED_LABELS[q.predAns] + '</text>';
      pin.classList.add('show');
    }
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
  renderBoard(q); renderPicks(q); renderAnswerbar(q); renderStep();
}

/* ================= 方向级反馈：高亮缺口两端触点（「看看哪里断了」——只亮触点+缺口
   脉动，不亮正确件本体——不泄答案；错反馈/救援共用；F3 无缺口=跨接线轻点） ================= */
function litGapEnds(q) {
  const gs = q.blank >= 0 ? slotAt(q.blank) : null;
  if (!gs) {                                      // F3：短路故障方向=跨接线 nudge
    const jp = boardEl.querySelector('.jumper');
    if (jp) replayAnim(jp.closest('g') || jp, 'nudge');
    return;
  }
  gs.classList.remove('lit'); void gs.offsetWidth;
  gs.classList.add('lit');
  setTimeout(() => { if (gs) gs.classList.remove('lit'); }, (NIGH_MS + 1100) * SPEED);
}
/* 阶段1 方向级反馈：主路走线流光一遍（.trace——拓扑追路径视觉锚，不泄答案） */
function traceMain() {
  const paths = boardEl.querySelectorAll('.slotg[data-type="fix"] .wmain, .slotg[data-type="blank"] .routefaint, .slotg[data-type="bunny"] .routefaint');
  paths.forEach(p => { p.classList.remove('trace'); void p.getBoundingClientRect(); p.classList.add('trace'); });
  setTimeout(() => paths.forEach(p => p.classList.remove('trace')), 2200 * SPEED);
}

/* ================= 「先猜后试」悬停预览虚影（演出层不判定：hover 只显形，
   不改 miss/answer/step；放上即亮=孩子自己比对验证） ================= */
function setPreview(q, size) {
  if (q.blank < 0) return;                        // F3 无缺口不预览
  const gs = slotAt(q.blank);
  if (!gs) return;
  if (!size) { gs.removeAttribute('data-pv'); return; }
  const geo = slotGeo(q, q.blank);
  const e = gapEnds(geo.gap, size);                    // 虚影线长=悬停导线跨距（预览匹配）
  const gw = gs.querySelector('.ghostwire');
  if (gw) {
    gw.setAttribute('x1', String(e[0].x)); gw.setAttribute('y1', String(e[0].y));
    gw.setAttribute('x2', String(e[1].x)); gw.setAttribute('y2', String(e[1].y));
  }
  gs.setAttribute('data-pv', size);
}

/* ================= 开题呈现：新电路板 → 题面句 keyless TTS → 缺口呼吸高亮 → 开放阶段1
   演出锁=真时钟 showUntil（tapPred/tapPart 演出期返 null——测试驱动须轮询等可交互） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderBoard(q); renderPicks(q); renderAnswerbar(q); renderStep();
  const run = cur, token = ++showRun;
  state.locked = true;
  state.showUntil = Date.now() + q.obsWin * SPEED;   // 真时钟演出锁（题面句窗——总窗口径无尾窗叠加）
  if (cur) KIDS.voice.play(q.obsKey, q.obs);      /* 题面句 clip 化（T46 阶段2：cir_obs_ 章档键，
                                                     落空自动回退 TTS——B 类键） */
  const bs = q.blank >= 0 ? slotAt(q.blank) : null;
  if (bs) replayAnim(bs, 'focus');                // 判定缺口呼吸高亮（当前任务锚）
  await wait(q.obsWin * SPEED);                   /* 4350=estMs(10)+300 / 4005=estMs(9)+300 / 4695=estMs(11)+300（家族 T/H） */
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                           /* 题面句完成开放作答（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* ================= 重听：重播题面句+缺口高亮（user=true 走 3s 节流；
   救援路径 false 不重置 lastAct——契约 B；轻提示不锁输入） ================= */
function reReadObs(user) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (cur.flat < 0) return false;                 /* 教学迷你关禁重听（重发=破坏教学时序） */
  if (user) {
    if (Date.now() - lastReplayAt < 3000) return false;   // 3s 节流
    lastReplayAt = Date.now();
  }
  const bs = q.blank >= 0 ? slotAt(q.blank) : null;
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
/* 教学"帮"阶段指向：按 phase 分流（阶段1=正确预判按钮 / 阶段2=正确元件——教学期
   泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 1) pointGhostAt(predBtnAt(q.predAns));
  else pointGhostAt(pickAt(correctPick(q)));
}

/* ================= 落位+通电（放对主演出——拓扑揭示）
   placeWire=判定槽导线弹入（.closed+wirepiece 跨距线段）；powerOn=灯亮（.lamp.on
   ——串联板 +.dim 弱光）+电流粒子环流（.flowing 全环）；引擎真值源 q.slots[*].on
   （engTapPart 终点落位）——契约 M ================= */
function placeWire(q, k, size) {
  const gs = slotAt(k);
  if (!gs) return;
  const geo = slotGeo(q, k);
  const e = gapEnds(geo.gap, size);
  const old = gs.querySelector('.wirepiece');
  if (old) old.remove();
  gs.insertAdjacentHTML('beforeend', pieceSvg(e[0], e[1]));
  gs.removeAttribute('data-pv');                  // 撤悬停虚影
  void gs.offsetWidth;
  gs.classList.remove('focus', 'breathe');
  gs.classList.add('closed', 'pop');
  gs.dataset.part = size;                         // 渲染即引擎：落位导线档
  if (qHasDeadGap(q)) spinFan();                  // 死支路缺口闭合=小风扇转（支路负载指示）
}
function spinFan() {
  const f = boardEl.querySelector('.fan');
  if (f) f.classList.add('spin');
}
function powerOn(q) {
  const dim = q.kind === 'bright' && !q.branch;   // 串联两灯=弱光（亮度判断演示锚）
  boardEl.querySelectorAll('.lamp').forEach(l => {
    l.classList.add('on');
    if (dim) l.classList.add('dim');
  });
  boardEl.querySelectorAll('.flowpath').forEach(f => f.classList.add('flowing'));   // 电流粒子环流
}
function closeMainSwitch() {
  boardEl.querySelectorAll('.swmaing .sw').forEach(s => s.classList.add('closed'));
}
function closeBranchSwitch() {
  const b = boardEl.querySelector('.branchg .sw');
  if (b) b.classList.add('closed');
}
function openBranchSwitch() {                     // SW1 短路禁合教学：支路开关自动弹开
  const b = boardEl.querySelector('.branchg .sw');
  if (b) { b.classList.remove('closed'); replayAnim(b.closest('g') || b, 'nudge'); }
}
function removeJumper() {                         // F3 拆线：跨接线剪断淡出
  const j = boardEl.querySelector('.jumper');
  if (j) j.classList.add('gone');
}

/* ================= 阶段1 预判答主路径（真实点击 / CIR.tapPred / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（answerbar 容器 bump / 按钮 rej——家族 D）；演出锁真时钟；
   豁免窗 guard（I 补：错答吞/对答放行）========== */
async function uiTapPred(d, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                   /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(boardEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (PRED_KINDS[q.kind].indexOf(d) < 0) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 非法选项
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错答吞——pop+bump 不计 miss；对答放行 */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && d !== q.predAns) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur, token = showRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPred(cur, d);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  const btn = predBtnAt(d);

  if (r === 'wrong') {                            /* 预判答错：专向反馈 miss（不泄答案）+错链+视觉梯度 */
    const isBright = q.kind === 'bright';
    const chainWin = isBright ? BRIGHT_CHAIN_WIN : PRED_CHAIN_WIN;
    const lock1 = isBright ? BRIGHT_LOCK_1 : PRED_LOCK_1;
    const lock = q._miss === 1 ? lock1 : WRONG_LOCK_2;
    state.locked = true;
    state.showUntil = Date.now() + lock * SPEED;  /* 首错锁=clip+150 顶格（b37 R3 收窄——不叠尾窗） */
    dodgeLo();
    if (btn) replayAnim(btn, 'rej');
    traceMain();                                  /* 方向级：主路走线流光一遍（拓扑追路径视觉锚） */
    const vk = isBright ? VOICE.brightWrong : VOICE.predWrong;
    if (sayW([vk.key, VOICE.hint.key]))           /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + chainWin;    /* 链豁免：pred 5490 / bright 4962 真时钟（契约 I） */
    if (q._miss >= 2) {                           /* miss≥2=正确预判按钮 breathe（答案级梯度） */
      const okBtn = predBtnAt(q.predAns);
      if (okBtn) replayAnim(okBtn, 'breathe');
    }
    await wait(lock * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- ok（预判答对：钉 chip+短锁→进阶段2；ch2 续合开关亮真相 REVEAL_MS） ---- */
  lastAct = Date.now();                           /* 正确答重置救援钟（§0.7a） */
  state.locked = true;
  state.showUntil = Date.now() + PRED_OK_MS * SPEED + 140;
  renderPhase(q);                                 /* answerbar done+预判钉 chip+元件库亮起 */
  chimeGoal();
  await wait(PRED_OK_MS * SPEED);
  if (cur !== run || token !== showRun) return r;
  if (state.tut === 'help') pointHelpNext();      /* 教学"帮"两步：答对预判→指向正确元件 */
  if (q.kind === 'fault') {                       /* ch2 即时验证：合开关亮真相（REVEAL_MS 锁窗） */
    state.showUntil = Date.now() + REVEAL_MS * SPEED;
    closeMainSwitch();
    if (q.litAns) setTimeout(() => {
      if (cur && cur.quizzes[cur.step] === q) powerOn(q);   /* F2 主环完好=合上即亮 */
    }, 300 * SPEED);
    await wait(REVEAL_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }
  state.locked = false;
  return r;
}

/* ================= 阶段2 放元件主路径（真实点击 / CIR.tapPart / autoSolve / 教学演示共用）
   双答制顺序守卫：阶段1 未答对=吞+轻叮 null；演出锁真时钟；豁免窗 guard ========== */
async function uiTapPart(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                   /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(boardEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur, token = showRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPart(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  const pickBtn = pickAt(i);

  if (r === 'wrong') {                            /* 放错：干扰跨距/死支路元件/拆线卡题选线——抖动+错链+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + (q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED;   /* 首错锁 1998=1848+150 顶格（b37 R3+b38 R1 总窗口径：锁=常量×SPEED 禁叠尾窗常数） */
    dodgeLo();
    if (pickBtn) replayAnim(pickBtn, 'rej');
    litGapEnds(q);                                /* 方向级：高亮缺口两端触点（F3=跨接线轻点；不亮正确件本体） */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))  /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免：1848+150+1968+300=4266 真时钟（契约 I） */
    if (q._miss >= 2) {                           /* miss≥2=判定缺口 breathe（答案级梯度；F3=拆线卡 breathe） */
      if (q.blank >= 0) {
        const bs = slotAt(q.blank);
        if (bs) replayAnim(bs, 'breathe');
      } else if (pickBtn) {
        replayAnim(pickAt(q.answer), 'breathe');
      }
    }
    await wait((q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- lit / done（放对：拓扑揭示演出——四题型分镜；确认链单 clip） ---- */
  lastAct = Date.now();                           /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                     /* 教学"独"：首次放对 → 放手 */
    state.tut = 'solo';
    window.__cirTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  const isCut = isCutQ(q);
  state.showUntil = Date.now() + (isCut ? CUT_MS + FLOW_MS : LIT_MS + FLOW_MS) * SPEED;
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);            /* 确认链：小灯泡亮啦（单 clip 1968——契约 N） */
  const guardQ = () => !cur || !cur.quizzes || cur.quizzes[cur.step - 1] !== q;   // 身份守卫（换题/换关中止在途）
  if (isCut) {                                    /* F3 拆线：剪断跨接线→灯亮 */
    removeJumper();
    setTimeout(() => { if (!guardQ()) powerOn(q); }, 700 * SPEED);
    await wait(CUT_MS * SPEED);
    if (cur !== run) return r;
    await wait(FLOW_MS * SPEED);
    if (cur !== run) return r;
  } else if (q.kind === 'switch') {               /* 开关因果：修好→合开关→亮/不亮真相 */
    placeWire(q, q.blank, q.need);
    setTimeout(() => {
      if (guardQ()) return;
      if (q.sw) closeMainSwitch(); else closeBranchSwitch();   /* SW3 主路开关 / SW1-2 支路开关 */
    }, 400 * SPEED);
    setTimeout(() => {
      if (guardQ()) return;
      if (q.litAns) powerOn(q);                   /* SW2/SW3：合上即亮 */
    }, 700 * SPEED);
    if (isSwShortQ(q)) {                          /* SW1：合上短路灯暗（真相揭示）→支路开关自动弹开→亮 */
      setTimeout(() => { if (!guardQ()) openBranchSwitch(); }, (700 + REVEAL_MS) * SPEED);
      setTimeout(() => { if (!guardQ()) powerOn(q); }, (700 + REVEAL_MS + 200) * SPEED);
    }
    await wait(LIT_MS * SPEED);
    if (cur !== run) return r;
    await wait(FLOW_MS * SPEED);
    if (cur !== run) return r;
  } else {                                        /* twogap/fault/bright：落位→按分镜亮 */
    placeWire(q, q.blank, q.need);
    const delayLit = (q.kind === 'twogap' && q.litAns === false) ? BUNNY_MS + 250 : 200;
    setTimeout(() => { if (!guardQ()) powerOn(q); }, delayLit * SPEED);   /* A 变体=兔子补齐后才亮 */
    if (q.second) {                               /* 兔子补齐槽延迟实心化（演出层） */
      setTimeout(() => {
        if (guardQ()) return;
        placeWire(q, q.second.i, q.second.size);
      }, BUNNY_MS * SPEED);
    }
    await wait(LIT_MS * SPEED);
    if (cur !== run) return r;
    await wait(FLOW_MS * SPEED);
    if (cur !== run) return r;
  }
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                           /* 教学迷你关完成：帮→独后进正式关（watch 期由
                                                     tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                  /* 新电路板开题（SPEC §3 每题一块板） */
  return r;
}

/* ================= 过关推进（全板通电泛光 → celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_cir） ================= */
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
/* 关末全板通电泛光（纯演出层——判定每步即判；FULL_WIN 2400 ≥
   cir_right 1968+300=2268 罩 winFlow 重播；双灯板=双灯全亮+双路环流） */
async function fullShow() {
  if (cur && cur.retries === 0) {
    boardEl.querySelectorAll('.lamp').forEach(l => replayAnim(l, 'breathe'));   // 零错加成：灯泡泛光
  }
  sceneEl.classList.add('panorama');
  boardEl.classList.add('fullglow');
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
  sayR(VOICE.right.key, VOICE.right.text);        /* cir_right：小灯泡亮啦（1968ms） */
  if (VERIFY) { persistWin(stars); return; }      // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  fullShow().then(() => KIDS.ui.celebrate(stars)).then(async () => {
    await wait(400);                              /* 家族 H：celebrate 2620+400=3020 ≥ 1968+300=2268 */
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
  state = { locked: true, won: false, demo: false, tut: 'none', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                           /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.cir && sv.cir.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §3 r4：watch=双答演示（先猜再连）/
   turn=单灯板单题双答）
   watch=播 cir_tut_watch「看！电路连起来」→ 开题（题面句 4350+缺口高亮）→ 幽灵手指①
   指预判按钮（不亮）→ 'ok'（钉 chip+PRED_OK_MS 500+140）→ 手指②指正确导线 → 落位
   演出+环流（__cirDemoR='lit'——题 0 非末题）；
   turn=重立单题迷你关「你来连一连」，帮（phase1 指预判按钮/phase2 指候选）→首对独
   （solo）→进正式关。
   时序（家族 G/H/T）：watch clip 2856 → 延 3156（≥2856+300）→ 开题题面句 4350
   → ghost① 移入 800+press 320 → 预判 'ok' 窗 500+140 → ghost② 移入 800+press 320
   → demo 演出窗 1400+1600=3000（罩确认链 1968+300=2268）
   —— watch 段分账 3156+4350+800+320+640+800+320+3000=13386 ≤ 16000（单步演示款 ≤16s）----------
   turn clip 1824 → 延 2124（≥1824+300）→ presentQuiz → 帮指 ---------- */
function tutWatchLevel() {                        // 双题迷你关：题 0=演示题（demo 双答→'lit'）
  const rnd = mulberry32(20260914);               // 教学固定流（不与关卡流耦合）
  return { flat: -1, ch: 0, dch: 1, lv: 0, step: 0, retries: 0, done: false,
           rows: [0, 4],
           quizzes: [buildQuiz(0, rnd), buildQuiz(4, rnd)] };   // ①A 变体 blank1 M 演示 / 备用
}
function tutTurnLevel() {                         // 单题迷你关（末题=双答完成返回 'done'→帮转独）
  const rnd = mulberry32(20260915);
  return { flat: -1, ch: 0, dch: 1, lv: 0, step: 0, retries: 0, done: false,
           rows: [0], quizzes: [buildQuiz(0, rnd)] };           // ①blank1 放 M
}
async function tutorialWatch() {
  const t0w = Date.now();                         // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);        /* cir_tut_watch：看！电路连起来（2856ms） */
  await wait(3156 * SPEED);                       /* ≥2856+300=3156：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                            /* 题面句+缺口高亮 → 开放（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  pointGhostAt(predBtnAt(q.predAns));             /* 幽灵手指①：指向预判行正确按钮（先猜） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoPredR = await uiTapPred(q.predAns, true);   /* demo 通道豁免演出锁 → 'ok'（钉 chip+640 窗） */
  window.__cirDemoPredR = demoPredR;              /* 预判步演示实证（'ok'） */
  pointGhostAt(pickAt(correctPick(q)));           /* 幽灵手指②：指向导线库正确候选（再连） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPart(correctPick(q), true);   /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__cirDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'lit'——终值语义） */
  window.__cirWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.cir = sv.cir || {};
  sv.cir.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立单题迷你关「你来连一连」（帮→独），首次放对放手进正式关 */
  ghost.hide();
  showRun++;                                      /* 显式中止在途（演示 lit 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);          /* cir_tut_turn：你来连一连（1824ms） */
  await wait(2124 * SPEED);                       /* ≥1824+300=2124 防尾截（turn 后开题演出延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);          /* 戳兔子=方向提示：看看哪里断了 */
  const q = cur.quizzes[cur.step];
  if (q) litGapEnds(q);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期重听门 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  reReadObs(true);                                /* 重读题面句+缺口高亮（3s 节流在内） */
});
picksEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick');
  if (!p) return;                                 // 库间空白走 stage 空白路径
  e.preventDefault();
  uiTapPart(Number(p.dataset.i));                 /* 点候选下标 i 的元件（tapPart 语义） */
});
/* 先猜一猜预判行（r4 判定层阶段1——uiTapPred 判定路径） */
answerbarEl.addEventListener('pointerdown', e => {
  const b = e.target.closest('.guess-btn');
  if (!b) return;
  e.preventDefault();
  uiTapPred(b.dataset.guess);                     /* 点预判选项（tapPred 语义） */
});
/* 「先猜后试」悬停预览虚影（演出层不判定：hover 仅缺口显 ghostwire，
   不改 miss/answer/step；放上即亮=孩子自己比对验证——指针进出即时增删 data-pv） */
picksEl.addEventListener('pointerover', e => {
  const p = e.target.closest('.pick');
  if (!p || !cur || state.won) return;
  const q = cur.quizzes[cur.step];
  if (!q || q._answered || !p.dataset.size) return;
  setPreview(q, p.dataset.size);                  // 虚影线长=悬停导线跨距（纯演出层）
});
picksEl.addEventListener('pointerout', e => {
  const p = e.target.closest('.pick');
  if (!p || !cur) return;
  const q = cur.quizzes[cur.step];
  if (q) setPreview(q, null);
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick') || e.target.closest('.guess-btn')) return;   // 已由元件库/预判行处理
  /* 空白/探索点击（含电路板非交互区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);        /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播题面句+（phase1 主路流光/phase2 缺口
   触点高亮），lastDir 独立节流锚，不重置 lastAct——30s 答案级不被饿死）/
   30s 答案级（phase 感知：phase1=正确预判按钮 / phase2=正确元件 breathe）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  const q = cur && cur.quizzes[cur.step];
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索（phase 感知） */
    if (q) {
      if (q.phase === 1) {
        const ok = predBtnAt(q.predAns);
        if (ok) replayAnim(ok, 'breathe');
      } else {
        const i = correctPick(q);
        if (i >= 0) { const ok = pickAt(i); if (ok) replayAnim(ok, 'breathe'); }
      }
      reReadObs(false);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播题面句+拓扑/缺口锚（不动 lastAct） */
    reReadObs(false);
    if (q) {
      if (q.phase === 1) traceMain();
      else litGapEnds(q);
    }
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
  KIDS.init({ game: 'cir', title: '电路小灯泡' });   // 存档键 kidsgame_cir（core VER 1.0，家族 C）
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
   真实页同暴露 window.CIR——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（SPEC §3 r4 钩子契约）：
   kind='twogap'|'fault'|'switch'|'bright' / phase 双答阶段（1 预判|2 选元件）/
   slots[]{i,fixed,part,on,type} 槽位序列（死支路缺口=追加末槽）/ blank 判定槽位号
   （F3=-1）/ blankAt='main'|'dead' / need 跨距档（F3=null）/ picks[] 候选 3 枚
   {t:'wire'|'cut',size} / answer 正确下标 / deadIdx 同尺寸死支路干扰下标（-1=无）/
   second{at,i,size}|null / branch{bridge,sw}|null / short 跨接线 / predAns 阶段1
   真值选项 / litAns 亮真值（ch4=null）/ brightAns 亮度真值（'down'|'same'，他章=null）/
   step 全关题号 0-4
   （b33 坑①）/ miss / say 题面句。
   tapPred 返回：真值→'ok' / 干扰→'wrong' / 豁免窗内错答吞 false / 演出期·阶段2·
   已答 null；tapPart 返回：对且非末题 'lit' / 对且末题 'done' / 干扰候选 'wrong' /
   阶段1 未答 null / 豁免窗内错点吞 false / 开题演出期·越界·已答 null；
   reread()=重读题面句（3s 节流内 false）================= */
window.CIR = {
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
    return { kind: q.kind,                            /* 题型（四型） */
             slots: q.slots.map(s => ({ i: s.k,         /* 槽位序列（拷贝）：位置号 */
                                        fixed: !!s.part, /* 该位已有导线（固定/已落位） */
                                        part: s.part,    /* 已放导线档 'S'|'M'|'L'|null */
                                        on: !!s.on,      /* 通电布尔（终点口径——本题完成后全 true） */
                                        type: s.type })), /* 'fix'|'blank'|'bunny' */
             blank: q.blank,                            /* 判定缺口槽位号（F3 拆线卡题=-1） */
             blankAt: q.blankAt,                        /* 判定位在主环|死支路 */
             need: q.need,                              /* 缺口跨距档（F3=null） */
             picks: q.picks.map(p => ({ t: p.t, size: p.size, dead: !!p.dead })),   /* 候选（拷贝） */
             answer: q.answer,                          /* 正确候选下标（verify 独立推导） */
             deadIdx: q.deadIdx,                        /* 同尺寸死支路干扰下标（-1=无） */
             second: q.second ? { at: q.second.at, i: q.second.i, size: q.second.size } : null,
             branch: q.branch ? { bridge: q.branch.bridge, sw: !!q.branch.sw, lamp: !!q.branch.lamp } : null,
             short: !!q.short,                          /* 跨接线在场（F3 拆后=false） */
             predAns: q.predAns,                        /* 阶段1 真值选项（lit|dark|same|down——r4 判定锚） */
             litAns: q.litAns,                          /* 阶段1 真值：闭合开关灯亮吗（ch4=null） */
             brightAns: q.brightAns,                    /* 阶段1 真值：'down'|'same'（他章=null） */
             phase: q.phase,                            /* 双答阶段（1 预判答|2 选元件） */
             step: cur.step,                            /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0,
             say: q.obs, sayKey: q.obsKey };            /* 题面句+clip 键（T46 阶段2） */
  },
  tapPred(d) { return uiTapPred(d); },
  tapPart(i) { return uiTapPart(i); },
  reread() { return reReadObs(true); },
  async autoSolve() {                    // UI 路径自动点完当前关（每题两段：先答预判再放元件；
    let taps = 0, guard = 0;             // 演出锁/开题演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 300) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase === 1) {
        const r = await uiTapPred(q.predAns);
        if (r === 'ok') taps++;
      } else {
        const r = await uiTapPart(correctPick(q));
        if (r === 'lit' || r === 'done') taps++;
      }
      if (guard >= 298) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
