/* ================= timecalc 主逻辑（UI 层·r16 难度改造）
   点卡选择单选制：点答案卡即判定——对=celebrate+下一题；错=卡抖动零惩罚可重点
   （§1 单选制，无对位保留概念），错点防重入窗 1000ms（§0.26 b16 定案禁偏离）。
   教学（§0.5 看-帮-独，仅关 1-0 首次）：watch=演示读题→指钟/日历/作息表→选卡（返回值存
   window.__tcDemoR §0.27）→重发同关"你来算一算"交接→帮=指向正确卡；独=首次答对放手。
   救援（§0.21）：14s 静置=重读题面+方向级（题面关键词 pulse 恒给）+答案级（正确卡
   breathe，miss≥2 才出 §1）；作答不重置救援钟，唯答对推进/读题面/点日历/点表行重置（§0.7a）。
   语音分型（r16）：日历类（plus/minus/span）tc_hint/tc_wrong；时刻类（clock5/elapse/
   comp/compd/night/sched）tc_hint2/tc_wrong2（开场链/救援/读题面/纠错同源 hintOf/wrongOf）。
   T46 阶段2：题面句/值词/引导句拆段 clip 化（tc_s_/tc_t_/tc_w_/tc_num_/tc_d_/tc_hn_/
   tc_act_/tc_guide_/tc_k_ 217 键）——星期词/时间词原 TTS 豁免通道（SPEC §1）随全量预合成撤销；
   已知缺键（tc_s_eve「晚上」/tc_s_day「天」/tc_s_hour「小时」/tc_s_min「分钟」/
   tc_num_60-75 生成关 elapse dur 域）走 say 回退待阶段1补登，详见 askChain/sayVal 注释。
   验收钩子：window.TC = { get currentLevel, get quiz(){kind,stype,hour,minute,today,plus,
   from,to,back,days,dur,startH,endH,table[],askRow,ask,answer,opts[],step,miss},
   tapOpt(i), tapRow(r), start(flat), async autoSolve(), get tutorial, get rescues }
   （getter 返回拷贝非活引用 §0.9）。 */
const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (v, q) => { if (cur && cur.flat < 3) KIDS.voice.play(v.key, v.text); };
/* 救援/开场任务语音/教学/反馈不受 flat 门限制（§0.5）；v=VOICE 条目（r16 分型对象） */
const sayR = v => { if (v) KIDS.voice.play(v.key, v.text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次（miss===2） */
let lastWrongVoice = 0;
const sayW = (v, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    KIDS.voice.play(v.key, v.text);
  }
};
/* 值词 clip 化（T46 阶段2）：星期词 tc_w_ 族/时刻词 tc_t_ 族/时刻组合（下午 h:mm=tc_s_pm+tc_t_
   星期X 12:mm=tc_w_+tc_t_12_）/活动名 tc_act_*——段链 queue 拼播；天/小时/分钟单位选项与
   生成关 elapse dur 60-75=阶段1补登前缺键（tc_s_day/tc_s_hour/tc_s_min/tc_num_60-75）→
   say 整值回退（防御活分支，补登后 every 在册自动转全 clip——shop playChain 先例） */
const VAL_T5 = /^(1[0-2]|[1-9]):([0-5][05])$/;
const VAL_AF = /^下午(1[0-2]|[1-9]):([0-5][05])$/;
const VAL_CP = /^(星期[日一二三四五六]) 12:([0-5][05])$/;
const valKeys = v => {
  const wi = WEEK.indexOf(v);
  if (wi >= 0) return ['tc_w_' + wi];
  let m = VAL_T5.exec(v);
  if (m) return ['tc_t_' + (+m[1]) + '_' + (+m[2])];
  m = VAL_AF.exec(v);
  if (m) return ['tc_s_pm', 'tc_t_' + (+m[1]) + '_' + (+m[2])];
  m = VAL_CP.exec(v);
  if (m) return ['tc_w_' + WEEK.indexOf(m[1]), 'tc_t_12_' + (+m[2])];
  m = /^([1-9]|[1-4][0-9]|50) 分钟$/.exec(v);
  if (m) return ['tc_num_' + (+m[1]), 'tc_s_min'];
  m = /^([1-6]) 天$/.exec(v);
  if (m) return ['tc_d_' + (+m[1]), 'tc_s_day'];
  m = /^(1[0-2]|[1-9]) 小时$/.exec(v);
  if (m) return ['tc_hn_' + (+m[1]), 'tc_s_hour'];
  const ai = ACTS.indexOf(v);
  if (ai >= 0) return ['tc_act_' + ai];
  return null;
};
const sayVal = v => {
  const ks = valKeys(v);
  if (ks && ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.voice.say(v);
};

const stageEl = $id('stage'), clockBoxEl = $id('clock-box'), weekBoxEl = $id('week-box'),
      nightBoxEl = $id('night-box'), schedBoxEl = $id('sched-box'),
      cardPoolEl = $id('card-pool'), tipEl = $id('tip'), tipTextEl = $id('tip-text'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

/* r16 存档启动 IIFE（审查 T-F1/T-M1 修复，SPEC §1-r16 定版）：
   ①v1 键基迁移——v1 keyOf 分母=CH_LEN=5（cipher/memduel/quiz 同构铁证），旧档 '2-0'=旧
     flat5 直映新基（分母 10）跳关且章语义错乱：矛盾态 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺
    （c=2..4）=v1 基档一次性重置（spellen/idiom r16 同款）；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >9）；章号上界放开：生成关章号 ≥5 合法无界
    （keyOf 分母 LEVELS_PER_CH=10，flat≥40 写 '5-0'+——禁整档 removeItem 吞掉生成关进度）。 */
try {
  const raw = localStorage.getItem('kidsgame_timecalc');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let reset = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > 9) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_timecalc');
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastAskAt = 0;                              // 重听题面 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（TC.rescues）

const keyOf = i => (Math.floor(i / LEVELS_PER_CH) + 1) + '-' + (i % LEVELS_PER_CH);   // 每章 10 关（r16 分母 10；v1 分母=CH_LEN=5→启动 IIFE 矛盾态迁移，勿称「恒定」）
const CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];                // 本章全部关号（level.pass 用）
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardPoolEl.querySelector('.card[data-i="' + i + '"]');
const wdayEl = d => weekBoxEl.querySelector('.wday[data-d="' + d + '"]');
const srowEl = r => schedBoxEl.querySelector('.srow[data-r="' + r + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speakerSmall;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：点卡=双音上扬 / 日历块·表行=低柔单音（轻反馈不惩罚） */
const cardHi = () => { if (!VERIFY) { KIDS.audio.note(760, 0.09, 0, 0.5); KIDS.audio.note(950, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(520, 0.09, 0, 0.3); };

/* ================= 题面与展示渲染 ================= */
/* 题面句（文字口径=§0.43：span=B−A 不含今天；数字显示阿拉伯；compd 带「半夜12点」
   跨日脚手架锚——7-8 岁刚学跨日，方向知识常显）
   .kw=方向级救援关键词（§1） */
function tipHTML(q) {
  if (q.kind === 'clock5')
    return '现在是<span class="kw">几点几分</span>？';
  if (q.kind === 'elapse')
    return '现在是<span class="kw">' + fmtTime(q.hour, q.minute) + '</span>，<span class="kw">再过 ' + q.dur +
      ' 分钟</span>，是几点几分？';
  if (q.kind === 'plus')
    return '今天是<span class="kw">' + WEEK[q.today] + '</span>，<span class="kw">再过 ' + q.plus + ' 天</span>是星期几？';
  if (q.kind === 'minus')
    return '今天是<span class="kw">' + WEEK[q.today] + '</span>，<span class="kw">' + q.back + ' 天前</span>是星期几？';
  if (q.kind === 'span')
    return '从<span class="kw">' + WEEK[q.from] + '</span>到<span class="kw">' + WEEK[q.to] +
      '</span>，<span class="kw">不算出发那天</span>，要经过几天？';
  if (q.kind === 'comp')
    return '星期' + WEEK_SHORT[q.today] + ' <span class="kw">下午' + fmtTime(q.hour, q.minute) +
      '</span> 开始，<span class="kw">过 ' + q.dur + ' 分钟</span>，是几点几分？';
  if (q.kind === 'compd')
    return '星期' + WEEK_SHORT[q.today] + ' <span class="kw">晚上' + fmtTime(11, q.minute) + '</span> 开始，<span class="kw">过 ' +
      q.dur + ' 分钟</span>，<span class="kw">过了半夜 12 点</span>，是星期几的几点几分？';
  if (q.kind === 'night')
    return '<span class="kw">晚上 ' + q.startH + ' 时</span>睡觉，<span class="kw">早上 ' + q.endH +
      ' 时</span>起床，睡了<span class="kw">几个小时</span>？';
  if (q.stype === 'dur')
    return '作息表里，<span class="kw">' + q.table[q.askRow].name + '</span>用了<span class="kw">多长时间</span>？';
  if (q.stype === 'find')
    return '作息表里，<span class="kw">' + fmtTime(q.table[q.askRow].sh, q.table[q.askRow].sm) +
      '</span> 开始的活动是<span class="kw">什么</span>？';
  return '作息表里，哪个活动用的<span class="kw">时间最长</span>？';
}
/* 题面朗读句（与文字同口径；T46 阶段2=askChain 拆段 clip 化的对账基准——段序拼合与本句
   逐字等价（minus「星期X，」逗号段剔除）；本函数保留为时长模型 voiceWin 输入+缺段回退文本） */
function askText(q) {
  if (q.kind === 'clock5') return '看看钟，现在是几点几分？';
  if (q.kind === 'elapse') return '现在是' + cnTime(q.hour, q.minute) + '，再过' + cnNum(q.dur) + '分钟，是几点几分？';
  if (q.kind === 'plus') return '今天是' + WEEK[q.today] + '，再过' + cnOf(q.plus) + '天，是星期几？';
  if (q.kind === 'minus') return '今天是' + WEEK[q.today] + '，' + cnOf(q.back) + '天前，是星期几？';
  if (q.kind === 'span') return '从' + WEEK[q.from] + '到' + WEEK[q.to] + '，不算出发的那天，要经过几天？';
  if (q.kind === 'comp') return '星期' + WEEK[q.today].slice(2) + '下午' + cnTime(q.hour, q.minute) +
    '开始，过' + cnNum(q.dur) + '分钟，是几点几分？';
  if (q.kind === 'compd') return '星期' + WEEK[q.today].slice(2) + '晚上' + cnTime(11, q.minute) +
    '开始，过' + cnNum(q.dur) + '分钟，过了半夜十二点，是星期几的几点几分？';
  if (q.kind === 'night') return '晚上' + cnHour(q.startH) + '时睡觉，早上' + cnHour(q.endH) + '时起床，睡了几个小时？';
  const r = q.table[q.askRow];
  if (q.stype === 'dur') return '作息表里，' + r.name + '用了多长时间？';
  if (q.stype === 'find') return '作息表里，' + cnTime(r.sh, r.sm) + '开始的活动是什么？';
  return '作息表里，哪个活动用的时间最长？';
}
/* SVG 时钟盘（§0.43 角度真值：时针 hour%12*30+min*0.5 / 分针 min*6，transform rotate）
   12 刻度+数字，5 分钟刻度下分针指任意 5 刻位（r16 全域 M5）；时针短粗深棕、分针细长橙 */
function clockSVG(h, m) {
  const ah = (h % 12) * 30 + m * 0.5, am = m * 6;
  let s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="47" fill="#FFFAF0" stroke="#4A3B2E" stroke-width="3"/>';
  for (let k = 0; k < 12; k++) {                                    // 刻度（12 大刻）
    const a = k * 30 * Math.PI / 180;
    const r1 = k % 3 === 0 ? 38.5 : 40.5, r2 = 43.5;
    s += '<line x1="' + (50 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (50 - r1 * Math.cos(a)).toFixed(2) +
      '" x2="' + (50 + r2 * Math.sin(a)).toFixed(2) + '" y2="' + (50 - r2 * Math.cos(a)).toFixed(2) +
      '" stroke="#4A3B2E" stroke-width="' + (k % 3 === 0 ? 2.6 : 1.4) + '" stroke-linecap="round"/>';
  }
  for (let k = 0; k < 12; k++) {                                    // 外圈 5 分钟小刻（r16：12 格）
    const a = (k * 30 + 15) * Math.PI / 180;
    s += '<line x1="' + (50 + 42 * Math.sin(a)).toFixed(2) + '" y1="' + (50 - 42 * Math.cos(a)).toFixed(2) +
      '" x2="' + (50 + 43.5 * Math.sin(a)).toFixed(2) + '" y2="' + (50 - 43.5 * Math.cos(a)).toFixed(2) +
      '" stroke="#C9A87C" stroke-width="1" stroke-linecap="round"/>';
  }
  for (let k = 1; k <= 12; k++) {                                   // 数字 1-12
    const a = k * 30 * Math.PI / 180;
    s += '<text x="' + (50 + 32 * Math.sin(a)).toFixed(2) + '" y="' + (50 - 32 * Math.cos(a) + 3.4).toFixed(2) +
      '" font-size="9.5" font-weight="800" fill="#6E5F4E" text-anchor="middle">' + k + '</text>';
  }
  s += '<line class="hand hand-h" x1="50" y1="50" x2="50" y2="28" transform="rotate(' + ah + ' 50 50)"' +
    ' stroke="#4A3B2E" stroke-width="5.5" stroke-linecap="round"/>' +
    '<line class="hand hand-m" x1="50" y1="50" x2="50" y2="16" transform="rotate(' + am + ' 50 50)"' +
    ' stroke="#E8975A" stroke-width="3.6" stroke-linecap="round"/>' +
    '<circle cx="50" cy="50" r="4" fill="#4A3B2E"/></svg>';
  return s;
}
/* 展示区四选一：钟面题=时钟盘（clock5/elapse 起点/comp 起点下午钟）；星期题=七天日历条
   （plus/minus today / span from-to 高亮）；night=晚睡早起双牌；sched=作息表
   切换时全清四个盒的 className+innerHTML（残留隐藏节点仍可 querySelector 寻址=脏态） */
function hideAllShow() {
  [clockBoxEl, weekBoxEl, nightBoxEl, schedBoxEl].forEach(el => {
    el.className = '';
    el.innerHTML = '';
    el.removeAttribute('aria-label');
  });
}
function renderShow(q) {
  hideAllShow();
  if (q.kind === 'clock5' || q.kind === 'elapse' || q.kind === 'comp') {
    clockBoxEl.className = 'show';
    clockBoxEl.innerHTML = clockSVG(q.hour, q.minute);
    clockBoxEl.setAttribute('aria-label', q.kind === 'clock5' ? '时钟盘，读一读时刻' : '时钟盘，开始时刻');
    return;
  }
  if (q.kind === 'night') {
    nightBoxEl.className = 'show';
    nightBoxEl.innerHTML =
      '<div class="ncard">' + ICONS.moon + '<span class="n-big">晚上 ' + q.startH + ' 时</span><span class="n-sub">睡觉</span></div>' +
      '<div class="n-arrow">→<span class="n-mid">睡到第二天</span>→</div>' +
      '<div class="ncard">' + ICONS.sun + '<span class="n-big">早上 ' + q.endH + ' 时</span><span class="n-sub">起床</span></div>';
    nightBoxEl.setAttribute('aria-label', '晚睡早起时间牌');
    return;
  }
  if (q.kind === 'sched') {
    schedBoxEl.className = 'show';
    let s = '<table><thead><tr><th>活动</th><th>开始</th><th>结束</th></tr></thead><tbody>';
    q.table.forEach((r, i) => {
      s += '<tr class="srow" data-r="' + i + '" role="button"><td>' + r.name + '</td>' +
        '<td class="c">' + fmtTime(r.sh, r.sm) + '</td><td class="c">' + fmtTime(r.eh, r.em) + '</td></tr>';
    });
    schedBoxEl.innerHTML = s + '</tbody></table>';
    schedBoxEl.setAttribute('aria-label', '作息表，点一行读一行');
    return;
  }
  /* 星期族（plus/minus/span）：日历条 */
  weekBoxEl.className = 'show';
  for (let d = 0; d < 7; d++) {
    const b = document.createElement('button');
    let cls = 'wday', tag = '', tagTx = '';
    if (q.kind === 'span' && d === q.from) { cls += ' from'; tag = '不算'; }
    else if (q.kind === 'span' && d === q.to) { cls += ' to'; tag = ((q.to - q.from) % 7 + 7) % 7 > 0 && q.to < q.from ? '到·下周' : '到'; }
    else if (q.kind !== 'span' && d === q.today) { cls += ' today'; tag = '今天'; }
    b.className = cls;
    b.dataset.d = d;
    tagTx = tag ? '<span class="wd-tag">' + tag + '</span>' : '';
    b.setAttribute('aria-label', WEEK[d] + (tag ? '，' + tag : ''));
    b.innerHTML = tagTx + '<span class="wd-top">星期</span><span class="wd-n">' + WEEK_SHORT[d] + '</span>';
    weekBoxEl.appendChild(b);
  }
}
function renderTip(q) { tipTextEl.innerHTML = tipHTML(q); }
/* 候选卡池：时刻/星期名/天数/小时/分钟/活动名大字卡 */
function renderPool(q) {
  cardPoolEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', '答案卡 ' + o.v);
    b.innerHTML = '<span class="cv">' + o.v + '</span>';
    cardPoolEl.appendChild(b);
  });
}
function renderStep() {                          // HUD 本关 8 题进度点
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
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = CH_LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn）单段 queue 单通道（r16 按题型分键） */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : hintOf(cur.quizzes[0]).key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearRescueVisual();
  renderTip(q);
  renderShow(q);
  renderPool(q);
  renderStep();
}

/* ================= 视觉反馈小件 ================= */
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigCard = i => replayAnim(cardEl(i), 'wig');
const okCard = i => { replayAnim(cardEl(i), 'ok'); };
function clearRescueVisual() {
  cardPoolEl.querySelectorAll('.breathe,.pulse,.ok,.wig').forEach(k =>
    k.classList.remove('breathe', 'pulse', 'ok', 'wig'));
  tipTextEl.querySelectorAll('.kw.pulse').forEach(k => k.classList.remove('pulse'));
  clockBoxEl.classList.remove('pulse');
  weekBoxEl.querySelectorAll('.wday.pulse').forEach(k => k.classList.remove('pulse'));
  schedBoxEl.querySelectorAll('.srow.pulse').forEach(k => k.classList.remove('pulse'));
  nightBoxEl.querySelectorAll('.ncard').forEach(k => k.classList.remove('pulse'));
}
/* 方向级线索（§1 恒给 / 梯度脚手架 错1次）：题面关键词 pulse 三连；
   钟面题=钟盘 pulse（方向=看钟）；sched=表行 pulse；night=双牌 pulse */
function applyDirVisual(q) {
  const kws = tipTextEl.querySelectorAll('.kw');
  if (kws.length) kws.forEach(k => replayAnim(k, 'pulse'));
  if (q.kind === 'clock5' || q.kind === 'elapse' || q.kind === 'comp') replayAnim(clockBoxEl, 'pulse');
  else if (q.kind === 'sched') schedBoxEl.querySelectorAll('.srow').forEach(r => replayAnim(r, 'pulse'));
  else if (q.kind === 'night') nightBoxEl.querySelectorAll('.ncard').forEach(c => replayAnim(c, 'pulse'));
}
/* 答案级视觉（§1：miss≥2 / 14s 救援才出）：正确卡 breathe（§0.7 首错不提示正确项）
   span 题加数格演示：from 右侧第 1 格到 to 沿环回序逐格 pulse（审查 M1：跨周到块在
   起块左侧，顺数格子的孩子数不下去） */
function applyAnswerVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  const el = cardEl(t.i);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
  if (q.kind === 'span') {
    let d = (q.from + 1) % 7, hops = 0;
    const cells = weekBoxEl.querySelectorAll('.wday');
    while (d !== q.to % 7 && hops < 7) {                       /* from 右侧第 1 格 → to（环回序） */
      const c = cells[d];
      if (c) setTimeout(() => replayAnim(c, 'pulse'), hops * 260 * SPEED);
      d = (d + 1) % 7; hops++;
    }
  }
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
  clearRescueVisual();                           /* 指新目标前清旧视觉（numberdet P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源）：正确答案卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (t) pointGhostAt(cardEl(t.i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点卡主路径（真实点击 / TC 钩子 / autoSolve / 教学演示共用）
   uiTapOpt(i, demo)：点答案卡 i → 朗读卡值（TTS 豁免）→ 单选即判——
   对=tc_right+推进（答对重置救援钟 §0.7a）；错=卡抖动+sayW（r16 分型 wrongOf）+
   梯度脚手架（miss=1 方向级关键词 pulse / miss≥2 答案级正确卡 breathe）+
   1000ms 防重入窗（§0.26 b16 定案）；身份守卫 const run=cur ================= */
async function uiTapOpt(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');                       /* §0.22 吞输入轻叮 */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return false;
  const res = engCommit(cur, i);
  if (res === null) {                            /* 非法（已结束等） */
    sfx('pop');
    return false;
  }
  cardHi();
  sayVal(q.opts[i].v);                           // 星期词/时间词=TTS 豁免通道（§1）
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  if (res === 'right' || res === 'done') {       // 答对：反馈+推进（重置救援钟 §0.7a）
    lastAct = Date.now();
    if (state.tut === 'help') {                  // 教学"独"：首次答对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    clearRescueVisual();
    okCard(i);
    sfx('ok');
    sayR(VOICE.right);
    state.locked = true;
    await wait(2100 * SPEED);                     /* 等 tc_right（≈1.5s）主体播完 */
    if (cur !== run) return res;
    state.locked = false;
    if (res === 'done') winFlow();
    else renderQuiz();
    return res;
  }
  /* 错：卡抖动+sayW+梯度脚手架；1000ms 防重入窗（§0.26）；窗内点卡=pop 拒绝 */
  sfx('fail');
  sayW(wrongOf(q), q.miss === 2);
  wigCard(i);
  if (q.miss === 1) applyDirVisual(q);           /* 错 1 次闪方向级线索（§1 梯度定案） */
  else applyAnswerVisual(q);                     /* miss≥2 才出答案级（不提前） */
  if (state.tut === 'help') scheduleHelpGhost(400);
  state.locked = true;
  await wait(1000 * SPEED);                      /* 错点防重入窗 1000ms（b16 定案） */
  if (cur !== run) return res;
  state.locked = false;                          /* 单选制：窗后直接可重点（零惩罚） */
  return res;
}

/* ================= 点日历块=朗读该日全名（主动学习，§0.7a 重置救援钟） ================= */
function uiTapDay(d) {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof d !== 'number' || Math.floor(d) !== d || d < 0 || d > 6) return false;
  if (!wdayEl(d)) return false;                  // 非日历题未渲染=拒绝
  if (state.locked || state.demo || state.won) { sfx('pop'); replayAnim(wdayEl(d), 'pulse'); return false; }
  lastAct = Date.now();
  takeLo();
  replayAnim(wdayEl(d), 'pulse');
  sayVal(WEEK[d]);
  return true;
}
/* ================= 点作息表行=朗读该行（主动学习，§0.7a 重置救援钟；r16） ================= */
function uiTapRow(r) {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved || q.kind !== 'sched') return false;
  if (typeof r !== 'number' || Math.floor(r) !== r || r < 0 || r >= q.table.length) return false;
  if (!srowEl(r)) return false;                  // 非作息表题未渲染=拒绝
  if (state.locked || state.demo || state.won) { sfx('pop'); replayAnim(srowEl(r), 'pulse'); return false; }
  lastAct = Date.now();
  takeLo();
  replayAnim(srowEl(r), 'pulse');
  const w = q.table[r];
  /* 行朗读拆段（T46 阶段2）：[活动名, 起时刻, 到, 止时刻]——活动名后逗号段剔除（tc_s_comma
     先例，段间停顿替代）；缺段 say 整行回退 */
  const rks = ['tc_act_' + ACTS.indexOf(w.name), 'tc_t_' + w.sh + '_' + w.sm,
               'tc_s_to', 'tc_t_' + w.eh + '_' + w.em];
  if (rks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(rks);
  else KIDS.voice.say(w.name + '，' + fmtTime(w.sh, w.sm) + '到' + fmtTime(w.eh, w.em));
  return true;
}

/* ================= 题面句段链（T46 阶段2 拆段 clip 化；与 askText 逐字等价——除
   minus 句「星期X，」后逗号段：tc_s_comma 纯标点已从注册剔除（963→962），段间 150ms
   停顿替代标点停顿）；compd/night 句首「晚上」=tc_s_eve 补登前缺键 → askSpeak 整链
   回退原 keyless 尾形态（Mj-1）；生成关 elapse dur 60-75=tc_num_60-75 同缺键回退 ======== */
function askChain(q) {
  if (q.kind === 'clock5') return ['tc_k_clock5'];
  if (q.kind === 'elapse') return ['tc_s_now', 'tc_t_' + q.hour + '_' + q.minute, 'tc_s_pass',
                                   'tc_num_' + q.dur, 'tc_s_minend'];
  if (q.kind === 'plus') return ['tc_s_today', 'tc_w_' + q.today, 'tc_s_pass',
                                 'tc_d_' + q.plus, 'tc_s_dq'];
  if (q.kind === 'minus') return ['tc_s_today', 'tc_w_' + q.today, 'tc_d_' + q.back, 'tc_s_dq2'];
  if (q.kind === 'span') return ['tc_s_from', 'tc_w_' + q.from, 'tc_s_to', 'tc_w_' + q.to, 'tc_s_span'];
  if (q.kind === 'comp') return ['tc_w_' + q.today, 'tc_s_pm', 'tc_t_' + q.hour + '_' + q.minute,
                                 'tc_s_start', 'tc_num_' + q.dur, 'tc_s_minend'];
  if (q.kind === 'compd') return ['tc_w_' + q.today, 'tc_s_eve', 'tc_t_11_' + q.minute,
                                  'tc_s_start', 'tc_num_' + q.dur, 'tc_s_mid'];
  if (q.kind === 'night') return ['tc_s_eve', 'tc_hn_' + q.startH, 'tc_s_sleep',
                                  'tc_hn_' + q.endH, 'tc_s_wake'];
  const r = q.table[q.askRow];
  if (q.stype === 'dur') return ['tc_s_sched', 'tc_act_' + ACTS.indexOf(r.name), 'tc_s_durl'];
  if (q.stype === 'find') return ['tc_s_sched', 'tc_t_' + r.sh + '_' + r.sm, 'tc_s_find'];
  return ['tc_k_long'];
}
/* 读题/救援共用（hint 前缀单通道拼播——T-M2 修复形态保持；缺段回退原 keyless 尾链） */
const askSpeak = q => {
  const ks = [hintOf(q).key].concat(askChain(q));
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.voice.queue([hintOf(q).key, { key: null, text: askText(q) }]);
};
/* ================= 读题面（主动学习重置救援钟；r16 分型 hintOf） ================= */
function readAsk() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  askSpeak(q);
  return true;
}
function uiHear() {
  if (!cur) return false;
  const now = Date.now();
  if (now - lastAskAt < 3000) return false;
  lastAskAt = now;
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  return readAsk();
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / LEVELS_PER_CH);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关预告实算下一关难度章（家族 F——禁取模推进形态） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = CH_LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.timecalc && sv.timecalc.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.timecalc.tutSeen）
   看=演示读题（题面 flash）→指钟/日历/表/牌（按题型 pulse）→手指指正确卡
   →按压选卡判对（demo 通道，返回值存 window.__tcDemoR §0.27）→立即重发同关
   （确定性关卡，题面一致），"你来算一算"交接 →帮=指向正确答案卡；独=首次答对放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch);                             /* 教学开场 sayR 不受 flat 门（§0.6） */
  /* 审查 T-M3 修复：段间 wait 按语音实长（estMs=345n+600 全字符口径）实算——原 700/1300 硬编码
     短于 watch clip（~3015）与题面句（~4740），下一段 say 的 _stop 掐掉上段尾部=孩子听碎片 */
  await wait(estMs(VOICE.watch.text) * SPEED + 300);
  replayAnim(tipEl, 'flash');                    /* 读题（T46 阶段2：题面段链 clip 化，缺段 say 回退） */
  const aks = askChain(cur.quizzes[0]);
  if (aks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(aks);
  else KIDS.voice.say(askText(cur.quizzes[0]));
  await wait(estMs(askText(cur.quizzes[0])) * SPEED + 300);
  const q = cur.quizzes[0];
  let guide = '先看一看日历', guideKey = 'tc_guide_cal';   /* 指日历：today 块（span=from 块）pulse（默认） */
  if (q.kind === 'clock5' || q.kind === 'elapse' || q.kind === 'comp') {   /* 指钟：钟盘 pulse */
    replayAnim(clockBoxEl, 'pulse'); guide = '先看一看钟'; guideKey = 'tc_guide_clock';
  } else if (q.kind === 'sched') {               /* 指作息表：表行 pulse */
    schedBoxEl.querySelectorAll('.srow').forEach(r => replayAnim(r, 'pulse')); guide = '先看一看作息表';
    guideKey = 'tc_guide_sched';
  } else if (q.kind === 'night') {               /* 指双牌 */
    nightBoxEl.querySelectorAll('.ncard').forEach(c => replayAnim(c, 'pulse')); guide = '先看一看睡觉起床的时间';
    guideKey = 'tc_guide_night';
  } else {
    const d = q.kind === 'span' ? q.from : q.today;
    replayAnim(wdayEl(d), 'pulse');
  }
  KIDS.voice.play(guideKey, guide);              /* 引导句 clip 化（play 自带 say 文本兜底） */
  await wait(estMs(guide) * SPEED + 300);        /* T-M3：按引导句实长 */
  const i = q.answer;
  pointGhostAt(cardEl(i));                       /* 手指指正确卡 */
  await wait(720 * SPEED);
  ghost.press();
  await wait(260 * SPEED);
  const demoR = await uiTapOpt(i, true);         /* demo 通道选卡判对 */
  window.__tcDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.timecalc = sv.timecalc || {};
    sv.timecalc.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  openingSpeak(true);                            // 交接顺序链：tc_tut_turn（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈（§0.16） */
    sfx('pop');
    return;
  }
  sayP(hintOf(cur.quizzes[cur.step]));
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  uiHear();                                      /* 读题面（主动学习重置救援钟） */
});
tipEl.addEventListener('pointerdown', e => {     // 点题面条=重听题句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  const now = Date.now();
  if (now - lastAskAt < 3000) return;
  lastAskAt = now;
  readAsk();
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.card');
  if (c) {                                       // 答案卡：单选主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapOpt(Number(c.dataset.i));
    return;
  }
  const w = e.target.closest('.wday');
  if (w) {                                       // 日历块：朗读该日（主动学习）
    e.preventDefault();
    uiTapDay(Number(w.dataset.d));
    return;
  }
  const s = e.target.closest('.srow');
  if (s) {                                       // 作息表行：朗读该行（主动学习，r16）
    e.preventDefault();
    uiTapRow(Number(s.dataset.r));
    return;
  }
  if (e.target.closest('button, #tip')) return;  /* §0.16：底栏按钮/题面条显式排除（b16 S5 教训） */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(hintOf(cur.quizzes[cur.step]));
  }
});

/* ================= 无操作看护：14s 救援（§0.21/§1：题句重读+题面关键词 pulse=
   方向级恒给+正确卡 breathe=答案级 miss≥2 才出）/ 教学"帮"5s 重演示一次。
   救援钟只被答对推进/读题面/点日历/点表行等主动学习重置（§0.7a：作答/错答/空白/兔子不重置） */
function rescueAct(q) {
  rescueCount++;
  /* 同 readAsk：askSpeak 单通道拼播（hint 分型 clip→题面段链；缺段回退 keyless 尾形态） */
  askSpeak(q);
  clearRescueVisual();
  applyDirVisual(q);                             /* 题面关键词 pulse（§1 救援口径·方向级恒给） */
  if (q.miss >= 2) applyAnswerVisual(q);         /* 正确卡 breathe=答案级：miss≥2 才出（b18 梯度定案） */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K（r13 试玩 P2-4/5）：面板/演出层在场不救援——层下语音视觉穿透层打扰家长操作；wordprob/thanks 同款 */
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct(q);
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
  KIDS.init({ game: 'timecalc', title: '时间计算' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.TC = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                       /* SPEC §1 钩子契约 + 测试辅助字段（全拷贝） */
      stype: q.stype,
      hour: q.hour, minute: q.minute,
      today: q.today, plus: q.plus,
      from: q.from, to: q.to,
      back: q.back, days: q.days,                /* minus 天数 / span 差值（辅助） */
      dur: q.dur,                                /* elapse/comp/compd 经过分钟数（辅助） */
      startH: q.startH, endH: q.endH,            /* night 晚睡/早起时（辅助） */
      table: q.table ? q.table.map(r => ({ name: r.name, sh: r.sh, sm: r.sm, eh: r.eh, em: r.em })) : null,
      askRow: q.askRow,
      ask: askText(q),                           /* 题面朗读句（时长模型 Python 第三源复算用） */
      answer: q.answer,
      opts: q.opts.map(o => ({ v: o.v, img: o.img })),
      step: cur.step, miss: q.miss };
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapRow(r) { return uiTapRow(r); },             /* 作息表行朗读钩子（r16） */
  start(flat) {                                  /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                            /* UI 路径自动通关：按 answer 逐题选卡 */
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    let n = 0, quizzes = 0, ok = true;
    let r = null;
    while (cur && cur === run && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      r = await uiTapOpt(q.answer);
      if (r === false || r === 'wrong') { ok = false; break; }
      quizzes++;
      if (r !== 'right' && r !== 'done') { ok = false; break; }
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
