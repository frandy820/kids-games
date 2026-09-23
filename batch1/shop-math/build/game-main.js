/* ================= shop-math 主逻辑（r6：多件合成+预算找零） =================
   状态机：enter → asking → shopping → (checkout) → paying(付钱/找零) → 下一轮 asking …
                                          ├→ hint（数量不对：重报需求，篮子保留）
                                          ├→ notwant（非所要商品：方向锚不泄答案）
                                          ├→ need（budget 件数不对）/ cheap（买不起：总价>预算）
                                          └→ payerr（硬币少放/多放：方向锚）→ paying
   全轮完成 → leaving（付币+开心离开+进度果）
   验收钩子：window.SHOP / .shelf-cell[data-item] / #btn-checkout / #coin-dock button / #btn-done
   verify=1：同步遍历全部关卡×各分支（正确+各错误路径），不播声、不弹层、不写档 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => KIDS.audio.sfx(n);      /* verify 页由 game-verify.js stub 成记录器（__lastSayText 等） */
const say = t => KIDS.voice.say(t);
/* estMs 家族定版：SAPI ~345ms/字+600（b25 定版，全字符口径；禁 +300 变体——build.py 字面断言）。
   用途：keyless TTS 演出窗（组末报数窗 = estMs(text)+300，teach r5 先例）。 */
const estMs = s => s.length * 345 + 600;
const SAY_PAD = 300; /* 组末报数/引导句 keyless 演出窗 pad（estMs(text)+SAY_PAD） */

const custWrap = $id('cust-wrap'), bubble = $id('bubble'), door = $id('door'),
      shelfEl = $id('shelf'), basketEl = $id('basket'), ghostEl = $id('ghost'),
      hintcard = $id('hintcard'), okmark = $id('okmark'), shutter = $id('shutter'),
      groupBar = $id('group-bar'), budgetBar = $id('budget-bar'), payPanel = $id('pay-panel');

const S = {
  idx: 0, round: 0, state: 'idle', basket: {}, coins: [], payPhase: null, selTotal: 0,
  errors: 0, helped: false, strategy: 1, groupHintShown: false,
  demo: false, tut: { phase: 'solo', step: -1 }, dayEndShown: false,
  idleTimer: null, idleCount: 0
};
let cur = null;  // 当前关卡 { who, rounds[] }
let curR = null; // 当前轮（规范化 round）

/* ---------- 星级：无失败（0 错=3 星，1-2 错=2 星，≥3 错=1 星，永不 0） ---------- */
const starsFor = errors => errors === 0 ? 3 : (errors <= 2 ? 2 : 1);
const need = k => { const it = (curR ? curR.items : []).find(x => x.k === k); return it ? it.n : 0; };
const canShop = () => S.state === 'shopping' && !S.demo;
const canPay = () => S.state === 'paying' && !S.demo;
const basketCount = () => GOOD_KEYS.reduce((s, k) => s + (S.basket[k] || 0), 0);
const basketTotal = () => GOOD_KEYS.reduce((s, k) => s + (S.basket[k] || 0) * GOODS[k].price, 0);
const paidSum = () => S.coins.reduce((a, b) => a + b, 0);

/* ---------- 播报：clip 链优先，缺任一 clip 整句 TTS 兜底 ---------- */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);   /* verify 页 queue 已 stub */
  else say(fallback);
};
const sayOrder = (round, withRecount) => {
  const keys = roundChain(round, !S.groupHintShown);
  if (round.grouped && !S.groupHintShown) S.groupHintShown = true;
  playChain(withRecount ? ['shop_recount'].concat(keys) : keys,
            (withRecount ? '再数一数呀，' : '') + roundSpeech(round));
};
const sayPayAsk = () => {
  if (curR.m === 'sum') playChain(['shop_ask_total'], '一共几元呀，点点硬币付钱吧');
  else playChain(changeAskChain(curR),
    '付了' + numCn(curR.B) + '元，买了' + (curR.want === 2 ? '两' : '三') + '样，找他几元呀');
};

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('sign').innerHTML = ICONS.shopSign;
  $id('btn-checkout').innerHTML = ICONS.cart;
  $id('btn-done').innerHTML = ICONS.check;
  $id('btn-help').innerHTML = KIDS.assets.rabbit('normal', 52);
  okmark.innerHTML = ICONS.check;
  hintcard.innerHTML = '<div class="rabbit-tilt">' + KIDS.assets.rabbit('normal', 84) + '</div>' +
                       '<div class="retry-ic">' + ICONS.retry + '</div>';
  shutter.querySelector('.sign2').innerHTML = ICONS.check;
  basketEl.querySelector('.empty-hint').innerHTML = ICONS.basketEmpty;
  /* 货架 4 格（触摸目标 ≥96×96）+ 价签（sum/budget 轮显示） */
  GOOD_KEYS.forEach(k => {
    const c = document.createElement('button');
    c.className = 'shelf-cell'; c.dataset.item = k; c.setAttribute('aria-label', GOODS[k].name);
    c.innerHTML = GOODS[k].svg + '<span class="price-tag">' + coinSvg(GOODS[k].price, 20) + '<b>' + GOODS[k].price + '</b></span>';
    c.addEventListener('pointerdown', e => { e.preventDefault(); onShelfTap(k, c); });
    shelfEl.appendChild(c);
  });
  /* 篮内商品槽（点按=放回一个） */
  GOOD_KEYS.forEach(k => {
    const s = document.createElement('button');
    s.className = 'slot'; s.dataset.item = k; s.setAttribute('aria-label', '放回' + GOODS[k].name);
    s.innerHTML = GOODS[k].svg + '<span class="qty"></span>';
    s.addEventListener('pointerdown', e => { e.preventDefault(); removeItem(k); });
    basketEl.appendChild(s);
  });
  /* r6 硬币区（1/2/5 元 ≥72px）+ 完成按钮 */
  COIN_DENOMS.forEach(v => {
    const b = document.createElement('button');
    b.className = 'coin-btn'; b.dataset.v = v; b.setAttribute('aria-label', v + '元');
    b.innerHTML = coinSvg(v, 56);
    b.addEventListener('pointerdown', e => { e.preventDefault(); addCoin(v); });
    $id('coin-dock').appendChild(b);
  });
  /* r6 按群策略条（1/2/5） */
  STRATEGIES.forEach(g => {
    const b = document.createElement('button');
    b.dataset.g = g; b.setAttribute('aria-label', ['一个一个数', '两个两个数', '五个五个数'][STRATEGIES.indexOf(g)]);
    b.innerHTML = '<b>' + g + '</b><span class="g-dots">' + '<i></i>'.repeat(Math.min(g, 5)) + '</span>';
    b.addEventListener('pointerdown', e => { e.preventDefault(); setStrategy(g); });
    groupBar.appendChild(b);
  });
  $id('btn-checkout').addEventListener('pointerdown', e => { e.preventDefault(); onCheckoutTap(); });
  $id('btn-done').addEventListener('pointerdown', e => { e.preventDefault(); onConfirmPayTap(); });
  $id('btn-help').addEventListener('pointerdown', e => { e.preventDefault(); onHelpTap(); });
}

/* ================= 渲染 ================= */
function renderHud() {
  const tray = $id('fruit-tray'); tray.innerHTML = '';
  const ch = Math.floor(S.idx / CH_LEN) + 1, sv = KIDS._save();
  for (let l = 0; l < CH_LEN; l++) {
    const f = document.createElement('div');
    f.className = 'fruit' + ((sv.levels[ch + '-' + l] ? ' on' : ''));
    f.innerHTML = GOODS.apple.svg; tray.appendChild(f);
  }
  const dots = $id('chapter-dots'); dots.innerHTML = '';
  for (let c = 0; c < Math.min(N_CHAPTERS, ch + 1); c++) { // 无限生成章：点条只画到当前章（ch 1 基）
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[(c + 1) + '-' + l]);
    i.className = done ? 'done' : (c === ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderDoor() { // 门口排队：本章后续顾客预览
  door.innerHTML = '';
  const ch = Math.floor(S.idx / CH_LEN) + 1;
  for (let i = S.idx + 1; i < ch * CH_LEN && i - S.idx <= 3; i++) {
    const d = document.createElement('div');
    d.className = 'doorpet'; d.innerHTML = ANIMALS[getOrder(i).who]();
    door.appendChild(d);
  }
}
function renderBubble() {
  bubble.innerHTML = '';
  if (curR.m === 'count') {
    const row = document.createElement('div'); row.className = 'b-row';
    const cnt = document.createElement('div'); cnt.className = 'b-count';
    cnt.innerHTML = '<div class="b-num">' + curR.n + '</div>';
    if (curR.grouped) { /* 大数：分组圆点（组内紧组间疏），已数组点亮（分组点亮 r6） */
      const grps = document.createElement('div'); grps.className = 'b-grps';
      const g = S.strategy, nGroups = Math.ceil(curR.n / g), have = S.basket[curR.k] || 0;
      for (let gi = 0; gi < nGroups; gi++) {
        const size = Math.min(g, curR.n - gi * g);
        const gp = document.createElement('div');
        gp.className = 'b-grp' + (have >= (gi + 1) * g ? ' lit' : '');
        gp.innerHTML = '<i></i>'.repeat(size);
        grps.appendChild(gp);
      }
      cnt.appendChild(grps);
    } else {
      const icons = document.createElement('div'); icons.className = 'b-icons';
      for (let i = 0; i < curR.n; i++) icons.innerHTML += GOODS[curR.k].svg; // 图标×数量：可直接点数
      row.appendChild(icons);
      cnt.innerHTML += '<div class="b-dots">' + '<i></i>'.repeat(curR.n) + '</div>'; // 数字 + 点数圆点
    }
    row.appendChild(cnt);
    bubble.appendChild(row);
  } else if (curR.m === 'sum') {
    const row = document.createElement('div'); row.className = 'b-row';
    curR.ks.forEach(k => {
      const tag = document.createElement('div'); tag.className = 'b-tag';
      tag.innerHTML = coinSvg(GOODS[k].price, 26) + '<b>' + GOODS[k].price + '</b>' + GOODS[k].svg;
      row.appendChild(tag);
    });
    bubble.appendChild(row);
    const q = document.createElement('div'); q.className = 'b-row';
    q.innerHTML = '<div class="b-num">?</div><div class="b-q">元</div>';
    bubble.appendChild(q);
  } else { /* budget：整钱 + 要买几样（圆槽随放入点亮） */
    const row = document.createElement('div'); row.className = 'b-row';
    const paid = document.createElement('div'); paid.className = 'b-tag';
    paid.innerHTML = coinSvg(curR.B, 40) + '<b>' + curR.B + '</b>';
    const want = document.createElement('div'); want.className = 'b-want';
    let placed = 0;
    for (let i = 0; i < curR.want; i++) {
      const c = document.createElement('i');
      if (basketCount() > placed) { c.className = 'on'; placed++; }
      want.appendChild(c);
    }
    row.appendChild(paid); row.appendChild(want);
    bubble.appendChild(row);
    const q = document.createElement('div'); q.className = 'b-row';
    q.innerHTML = '<div class="b-num">?</div><div class="b-q">元</div>';
    bubble.appendChild(q);
  }
}
function renderBasket() {
  let any = false;
  GOOD_KEYS.forEach(k => {
    const q = S.basket[k] || 0, slot = basketEl.querySelector('.slot[data-item="' + k + '"]');
    if (q > 0) { slot.classList.add('show'); slot.querySelector('.qty').textContent = q; any = true; }
    else slot.classList.remove('show');
  });
  basketEl.querySelector('.empty-hint').style.display = any ? 'none' : 'flex';
}
function renderModeUI() { /* 轮切换：策略条/预算条/价签显隐 */
  const game = $id('game');
  groupBar.classList.toggle('show', !!(curR.grouped));
  groupBar.querySelectorAll('button').forEach(b => b.classList.toggle('cur', +b.dataset.g === S.strategy));
  budgetBar.classList.toggle('show', curR.m === 'budget');
  if (curR.m === 'budget') {
    budgetBar.innerHTML = '<div class="bb-coin">' + coinSvg(curR.B, 42) + '</div>' +
      '<div class="bb-want">' + '<i></i>'.repeat(curR.want) + '</div>';
  }
  game.classList.toggle('prices-on', curR.m !== 'count');
}
function renderTray() {
  const tray = payPanel.querySelector('.pp-tray');
  tray.innerHTML = S.coins.length ? '' : '<span class="tray-empty">点下面的硬币</span>';
  S.coins.forEach((v, i) => {
    const c = document.createElement('div');
    c.className = 'chip'; c.dataset.i = i; c.innerHTML = coinSvg(v, 40);
    c.addEventListener('pointerdown', e => { e.preventDefault(); removeCoin(i); });
    tray.appendChild(c);
  });
  payPanel.querySelector('.pp-sum-n').textContent = paidSum();
}
function renderPayPanel() { /* 付钱(sum)：商品价签清单；找零(change)：付的整钱+所选商品价签 */
  const items = payPanel.querySelector('.pp-items');
  items.innerHTML = '';
  if (S.payPhase === 'change') {
    const paid = document.createElement('div'); paid.className = 'pp-paid';
    paid.innerHTML = coinSvg(curR.B, 26) + '<b>' + curR.B + '</b>';
    items.appendChild(paid);
    GOOD_KEYS.forEach(k => {
      for (let i = 0; i < (S.basket[k] || 0); i++) {
        const pi = document.createElement('div'); pi.className = 'pi';
        pi.innerHTML = '<svg class="gi" viewBox="0 0 64 64">' + GOODS[k].svg.replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>' +
          coinSvg(GOODS[k].price, 24) + '<b>' + GOODS[k].price + '</b>';
        items.appendChild(pi);
      }
    });
  } else {
    curR.ks.forEach(k => {
      const pi = document.createElement('div'); pi.className = 'pi';
      pi.innerHTML = '<svg class="gi" viewBox="0 0 64 64">' + GOODS[k].svg.replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>' +
        coinSvg(GOODS[k].price, 24) + '<b>' + GOODS[k].price + '</b>';
      items.appendChild(pi);
    });
  }
  renderTray();
}

/* ================= 飞行动画（商品→篮 / 硬币→柜台） ================= */
function flyGood(k, fromEl) {
  if (VERIFY || !fromEl) return;
  const to = basketEl.querySelector('.slot[data-item="' + k + '"]').getBoundingClientRect();
  const fr = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly-item'; f.innerHTML = GOODS[k].svg;
  f.style.left = (fr.left + fr.width / 2 - 23) + 'px'; f.style.top = (fr.top + fr.height / 2 - 23) + 'px';
  document.body.appendChild(f);
  requestAnimationFrame(() => {
    f.style.left = (to.left + to.width / 2 - 23) + 'px';
    f.style.top = (to.top + to.height / 2 - 23) + 'px';
    f.style.transform = 'scale(.8)';
  });
  setTimeout(() => f.remove(), 420);
}
function coinFly() {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;z-index:50;width:44px;height:44px;pointer-events:none;opacity:0;transition:all .35s ease';
  c.innerHTML = ICONS.coin;
  const fr = custWrap.getBoundingClientRect(), to = $id('btn-checkout').getBoundingClientRect();
  c.style.left = (fr.left + fr.width / 2 - 22) + 'px'; c.style.top = (fr.top + 30) + 'px';
  document.body.appendChild(c);
  requestAnimationFrame(() => {
    c.style.opacity = '1';
    c.style.left = (to.left + to.width / 2 - 22) + 'px'; c.style.top = (to.top - 10) + 'px';
  });
  setTimeout(() => { c.style.opacity = '0'; setTimeout(() => c.remove(), 320); }, 380);
}

/* ================= 幽灵手指 ================= */
const ghost = {
  to(x, y) { ghostEl.style.left = x + 'px'; ghostEl.style.top = y + 'px'; },
  toEl(el) { const r = el.getBoundingClientRect(); this.to(r.left + r.width / 2, r.top + r.height / 2); },
  toCell(k) { this.toEl(shelfEl.querySelector('.shelf-cell[data-item="' + k + '"]')); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  show() { ghostEl.classList.add('show'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';

/* ================= 关卡/轮流程 ================= */
function startLevel(i) {
  S.idx = i; S.round = 0; S.errors = 0; S.helped = false; S.basket = {}; S.coins = [];
  S.payPhase = null; S.strategy = 1; S.groupHintShown = false; S.idleCount = 0;
  cur = getOrder(i);
  endPaying();
  renderHud(); renderDoor(); renderBasket();
  bubble.classList.remove('show', 'flash');
  custWrap.classList.remove('leaving', 'happy', 'entering');
  if (!VERIFY && i === 0 && !KIDS._save().levels['1-0'] && !sessionStorage.getItem('shop_tut')) {
    tutorialWatch(); return; // 教学"看"阶段（仅首次）
  }
  spawnCustomer();
}
function spawnCustomer(cb) {
  custWrap.innerHTML = ANIMALS[cur.who]();
  custWrap.classList.add('entering');
  S.state = 'enter'; sfx('pop');
  setTimeout(() => {
    custWrap.classList.remove('entering');
    askRound();
    if (cb) cb();
  }, 560);
}
function askRound() {
  curR = cur.rounds[S.round];
  S.state = 'asking';
  S.basket = {}; S.coins = []; S.payPhase = null; S.selTotal = 0;
  renderModeUI(); renderBasket(); renderBubble();
  bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
  sayOrder(curR);
  setTimeout(() => { S.state = 'shopping'; armIdle(); }, 380);
  if (S.tut.phase === 'help') tutorialHelpStep(); // 教学"帮"阶段：幽灵手指示范
}
function nextRound() { /* 本轮正确（count 无钱轮）：小停顿后进入下一轮 */
  S.state = 'paying'; sfx('coin'); coinFly();
  setTimeout(() => { S.round++; askRound(); }, 520);
}

/* ---------- 交互：货架（r6 按群=一次一组） ---------- */
function onShelfTap(k, cell) {
  if (!canShop()) return;
  const g = (curR.m === 'count' && curR.grouped) ? S.strategy : 1;
  addItem(k, cell, g);
  if (g > 1) { /* 组末报数（T46 clip 化）：shop_cn_N 预合成段（域 min(cnt,n)∈1..20 恒在册——
    g>1 仅 count+grouped（n≥10），cnt≥g≥2；缺 clip → play 文本参数 TTS 兜底；非阻塞演出窗口径不变） */
    const cnt = S.basket[k] || 0;
    const cn = Math.min(cnt, curR.n);
    KIDS.voice.play('shop_cn_' + cn, numCn(cn) + '个');
  }
  if (S.tut.phase === 'help' && S.tut.step === 0) { // 孩子完成第一步：强化反馈，示范下一步
    S.tut.step = 1; sfx('ok');
    setTimeout(() => { ghost.toEl($id('btn-checkout')); ghost.press(); }, 700);
  }
  armIdle();
}
function addItem(k, fromEl, g) {
  if (!VERIFY && !canShop() && !S.demo) return false; // demo=教学"看"自动演示允许程序放入
  g = g || 1;
  S.basket[k] = (S.basket[k] || 0) + g;
  renderBasket();
  if (curR && curR.grouped) renderBubble(); /* 分组点亮跟随进度 */
  if (curR && curR.m === 'budget') renderBubble(); /* 预算轮 want 圆槽点亮 */
  if (!VERIFY) {
    sfx('pop');
    flyGood(k, fromEl);
    if (g > 1 && fromEl) for (let i = 1; i < Math.min(g, 5); i++) setTimeout(() => flyGood(k, fromEl), i * 70);
  }
  return true;
}
function removeItem(k) {
  if (!canShop() || !(S.basket[k] > 0)) return;
  S.basket[k]--; renderBasket(); sfx('click');
  if (curR && (curR.grouped || curR.m === 'budget')) renderBubble();
  armIdle();
}
function setStrategy(g) {
  if (!curR || !curR.grouped) return;
  S.strategy = g;
  renderModeUI(); renderBubble();
  sfx('click'); armIdle();
}
function onCheckoutTap() {
  if (S.demo) return;
  if (S.tut.phase === 'help' && S.tut.step === 1) { S.tut.step = 2; ghost.hide(); S.tut.phase = 'solo'; }
  checkout(); armIdle();
}

/* ---------- 结账（验收钩子；verify 下同步判定） ----------
   返回：'ok' | 'notwant'（非所要商品）| 'hint'（数量不对）| 'need'（budget 件数）| 'cheap'（买不起） */
function checkOrder() {
  return GOOD_KEYS.every(k => (S.basket[k] || 0) === need(k));
}
function checkout() {
  if (S.state !== 'shopping') return false;
  if (S.demo) { // 教学"看"演示：只呈现正确流程（确定性，杜绝演示触发错误反馈）
    curR.items.forEach(it => { S.basket[it.k] = it.n; });
    renderBasket();
    payAndLeave();
    return 'ok';
  }
  const hasWrong = GOOD_KEYS.some(k => (S.basket[k] || 0) > 0 && need(k) === 0);
  let res;
  if (curR.m === 'budget') {
    const n = basketCount();
    if (n !== curR.want) res = 'need';
    else if (basketTotal() > curR.B) res = 'cheap';
    else res = 'ok';
  } else if (hasWrong) res = 'notwant';
  else if (!checkOrder()) res = 'hint';
  else res = 'ok';

  if (VERIFY) { /* verify：同步置状态供断言（错误计数与真实路径一致） */
    if (res !== 'ok') S.errors++;
    if (res === 'ok') {
      if (curR.m === 'sum') { S.state = 'paying'; S.payPhase = 'sum'; S.selTotal = curR.total; }
      else if (curR.m === 'budget') { S.state = 'paying'; S.payPhase = 'change'; S.selTotal = basketTotal(); }
      else if (S.round < cur.rounds.length - 1) { S.state = 'paying'; }
      else S.state = 'leaving';
    } else S.state = res;
    return res;
  }
  if (res === 'notwant') anchorFeedback('shop_notwant', '这个不是它想要的哦');
  else if (res === 'need') anchorFeedback(curR.want === 2 ? 'shop_need2' : 'shop_need3',
    '他想买' + (curR.want === 2 ? '两' : '三') + '样哦');
  else if (res === 'cheap') anchorFeedback('shop_cheap', '钱不够哦，换一样试试');
  else if (res === 'hint') wrongFeedback();
  else if (curR.m === 'sum') enterPaying('sum');
  else if (curR.m === 'budget') enterPaying('change');
  else if (S.round < cur.rounds.length - 1) nextRound();
  else payAndLeave();
  return res;
}

/* ---------- 方向锚反馈（r6：不泄答案；灰蓝卡+气泡重闪；篮子保留） ---------- */
function anchorFeedback(key, fallbackText) {
  S.errors++; S.state = key === 'shop_notwant' ? 'notwant' : (key === 'shop_cheap' ? 'cheap' : 'need');
  sfx('fail');
  bubble.classList.remove('flash'); void bubble.offsetWidth; bubble.classList.add('flash');
  hintcard.classList.add('show');
  setTimeout(() => { if (!VERIFY) playChain([key], fallbackText); }, 300);
  setTimeout(() => {
    hintcard.classList.remove('show');
    if (['notwant', 'cheap', 'need'].indexOf(S.state) >= 0) S.state = 'shopping';
    if (S.errors >= 2 && !S.helped) scaffold();
  }, 1600);
}
/* 错误：温和提示（灰蓝+循环箭头+兔子歪头；气泡重闪+TTS 重报；篮子保留） */
function wrongFeedback() {
  S.errors++; S.state = 'hint';
  sfx('fail');
  bubble.classList.remove('flash'); void bubble.offsetWidth; bubble.classList.add('flash');
  hintcard.classList.add('show');
  setTimeout(() => sayOrder(curR, true), 350);
  setTimeout(() => {
    hintcard.classList.remove('show');
    if (S.state === 'hint') S.state = 'shopping';
    if (S.errors >= 2 && !S.helped) scaffold('先拿一个' + GOODS[curR.items[0].k].name + '试试吧', 'shop_help_' + curR.items[0].k); // 防挫败支架
  }, 1600);
}

/* ---------- 支架：高亮正确货架 + 演示放入一个（错误 2 次自动触发 / 帮忙按钮手动触发） ---------- */
function scaffold(speech, key) {
  S.helped = true;
  if (canPay()) { scaffoldPay(); return; }
  if (curR.m === 'budget') { scaffoldBudget(); return; }
  /* 支架触发即顺手清掉超量商品（5岁玩家评估：让孩子逐件放回6根香蕉是最重挫败源；清完保留已放对的部分） */
  let cleared = false;
  curR.items.forEach(it => {
    while ((S.basket[it.k] || 0) > it.n) { S.basket[it.k]--; cleared = true; }
  });
  GOOD_KEYS.forEach(gk => { if (!curR.items.some(it => it.k === gk)) { if (S.basket[gk] > 0) cleared = true; S.basket[gk] = 0; } });
  if (cleared) { renderBasket(); sfx('pop'); }
  const k = curR.items.find(it => (S.basket[it.k] || 0) < it.n);
  if (!k) { // 区分"已齐"与"超量"两种情况，超量时正确动作是放回而非结账
    const over = curR.items.some(it => (S.basket[it.k] || 0) > it.n);
    if (!VERIFY) KIDS.voice.play(over ? 'shop_over' : 'shop_full', over ? '篮子里多啦，点一点篮子里的水果，放回去一个吧' : '篮子里已经齐啦，按结账吧');
    return;
  }
  const cell = shelfEl.querySelector('.shelf-cell[data-item="' + k.k + '"]');
  cell.classList.remove('pulse'); void cell.offsetWidth; cell.classList.add('pulse');
  if (speech) { if (key && KIDS.voice.clips[key] && !VERIFY) KIDS.voice.play(key, speech); else say(speech); }
  setTimeout(() => { if (canShop() || S.state === 'shopping') addItem(k.k, cell); }, 700);
}
function scaffoldBudget() { /* 预算支架：保留可行部分，换成最便宜可行组合的一件 */
  let cleared = false;
  GOOD_KEYS.forEach(gk => { if (S.basket[gk] > 0 && basketTotal() > curR.B) { S.basket[gk] = 0; cleared = true; } });
  if (cleared) { renderBasket(); renderBubble(); sfx('pop'); }
  if (basketCount() >= curR.want) return;
  const k = GOOD_KEYS.slice().sort((a, b) => GOODS[a].price - GOODS[b].price)
    .find(gk => basketTotal() + GOODS[gk].price <= curR.B);
  if (!k) return;
  const cell = shelfEl.querySelector('.shelf-cell[data-item="' + k + '"]');
  cell.classList.remove('pulse'); void cell.offsetWidth; cell.classList.add('pulse');
  if (!VERIFY) KIDS.voice.play('shop_help_' + k, '先拿一个' + GOODS[k].name + '试试吧');
  setTimeout(() => { if (canShop() || S.state === 'shopping') addItem(k, cell); }, 700);
}
function scaffoldPay() { /* 付钱/找零支架：演示放一枚最优硬币（剩余内最大面额） */
  const target = S.payPhase === 'sum' ? curR.total : curR.B - S.selTotal;
  const remain = target - paidSum();
  const v = COIN_DENOMS.slice().reverse().find(d => d <= remain);
  if (!v) return;
  const btn = $id('coin-dock').querySelector('button[data-v="' + v + '"]');
  btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
  if (!VERIFY) playChain(['shop_put', 'shop_n_' + v, 'shop_try'], '放一枚' + numCn(v) + '元的试试吧');   /* T46 拆段（v∈{1,2,5} 恒在册） */
  setTimeout(() => { if (canPay()) addCoin(v); }, 700);
}
function onHelpTap() {
  if (!canShop() && !canPay()) return;
  scaffold();
}

/* ---------- r6 收银台：付钱（sum）/找零（budget） ---------- */
function enterPaying(phase) {
  S.state = 'paying'; S.payPhase = phase; S.coins = [];
  S.selTotal = basketTotal();
  document.body.classList.add('paying');
  renderPayPanel();
  payPanel.classList.add('show');
  sfx('click');
  sayPayAsk();
  armIdle();
}
function endPaying() {
  S.payPhase = null; S.coins = [];
  document.body.classList.remove('paying');
  payPanel.classList.remove('show');
}
function addCoin(v) {
  if (!canPay()) return false;
  if (paidSum() + v > 30) return false; /* 防超量堆积 */
  S.coins.push(v);
  renderTray(); sfx('pop'); armIdle();
  return true;
}
function removeCoin(i) {
  if (!canPay() || i < 0 || i >= S.coins.length) return;
  S.coins.splice(i, 1);
  renderTray(); sfx('click'); armIdle();
}
/* 确认：返回 'ok' | 'less' | 'more'（方向锚不泄差额） */
function confirmPay() {
  if (S.state !== 'paying' || !S.payPhase) return false;
  const target = S.payPhase === 'sum' ? curR.total : curR.B - S.selTotal;
  const paid = paidSum();
  let res;
  if (paid < target) res = 'less';
  else if (paid > target) res = 'more';
  else res = 'ok';
  if (VERIFY) { if (res !== 'ok') S.errors++; S.state = res === 'ok' ? 'leaving' : 'payerr'; return res; }
  if (res === 'ok') {
    sfx('coin'); okmark.classList.add('show');
    setTimeout(() => okmark.classList.remove('show'), 700);
    if (S.payPhase === 'sum') playChain(['shop_total_all', 'shop_n_' + target], '一共' + numCn(target) + '元');
    else playChain(['shop_chg', 'shop_n_' + target], '找了' + numCn(target) + '元');   /* T46 拆段；target=0（整付 3+5=8 类）shop_n_0 已补（09-19 主线）→ 恒全 clip，零值不再落 TTS */
    coinFly();
    setTimeout(() => roundDone(), 900);
  } else {
    S.errors++; S.state = 'payerr';
    sfx('fail');
    const lessKey = S.payPhase === 'sum' ? 'shop_pay_less' : 'shop_chg_less';
    const moreKey = S.payPhase === 'sum' ? 'shop_pay_more' : 'shop_chg_more';
    playChain([res === 'less' ? lessKey : moreKey],
      res === 'less' ? '还差一点点，再放一枚' : (S.payPhase === 'sum' ? '付多了，拿回去一枚' : '多找了，拿回去一枚'));
    if (S.errors >= 2 && !S.helped) scaffoldPay();
    setTimeout(() => { if (S.state === 'payerr') S.state = 'paying'; }, 1400);
  }
  return res;
}
function onConfirmPayTap() { confirmPay(); armIdle(); }
function roundDone() {
  endPaying();
  if (S.round < cur.rounds.length - 1) { S.round++; askRound(); }
  else payAndLeave();
}

/* 正确：付币 + 开心离开（绿+勾图标+顾客开心表情三重编码） */
function payAndLeave() {
  S.state = 'paying'; sfx('coin');
  custWrap.innerHTML = ANIMALS[cur.who](true); // 顾客开心表情
  custWrap.classList.add('happy');
  coinFly();
  setTimeout(() => {
    S.state = 'leaving';
    custWrap.classList.remove('happy'); custWrap.classList.add('leaving');
    sfx('ok');
    okmark.classList.add('show');
    setTimeout(() => okmark.classList.remove('show'), 850);
    const ch = Math.floor(S.idx / CH_LEN) + 1, lv = S.idx % CH_LEN;
    setTimeout(() => {
      if (S.demo) { tutorialAfterWatch(); return; } // 教学"看"演示：不写档不庆祝
      const r = KIDS.level.pass(ch, lv, starsFor(S.errors), [0, 1, 2, 3, 4]);
      renderHud();
      KIDS.ui.celebrate(starsFor(S.errors)).then(() => afterPass(ch, r.chapterDone));
    }, 680);
  }, 400);
}

/* ---------- 过关推进（章节打烊 / 日历 / dayEnd） ---------- */
function afterPass(ch, chapterDone) {
  if (chapterDone) { // 章节收尾：打烊卷帘 → 结算
    const chStars = [0, 1, 2, 3, 4].reduce((s, l) => s + ((KIDS._save().levels[ch + '-' + l] || {}).stars || 0), 0); // 防御读
    shutter.classList.add('play'); sfx('click');
    setTimeout(() => {
      KIDS.ui.chapterEnd({ chapter: ch, stars: chStars, nextHint: nextChapterHint(S.idx) });
      setTimeout(() => { shutter.classList.remove('play'); afterDay(); }, 2800);
    }, 1400);
  } else afterDay();
}
function keyOf(i) { return (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN); }
function keysUpTo(lim) { return Array.from({ length: lim }, (_, i) => keyOf(i)); }
function afterDay() { // 今日新关全部完成 → 收尾画面（可关闭继续重玩，不锁死）
  const lim = KIDS.calendar.limit(Infinity); // 订单无限生成：日历不设内容上限（每日新关+家长加关照常控制）
  if (KIDS.calendar.dayDone(keysUpTo(lim)) && !S.dayEndShown) {
    S.dayEndShown = true;
    KIDS.ui.dayEnd({ nextHint: nextChapterHint(S.idx + 1) });
  }
  const next = S.idx + 1;
  startLevel(next < lim ? next : Math.floor(S.idx / CH_LEN) * CH_LEN); // 超日历则回本章重玩
}

/* ================= 教学："看-帮-独" 三步（仅首关首次，r6 不动框架） ================= */
function tutorialWatch() { // 看：自动完整演示一遍（约 5 秒）
  S.demo = true; S.tut = { phase: 'watch', step: -1 };
  spawnCustomer(async () => {
    await wait(1000);
    ghost.show(); ghost.toCell(curR.items[0].k);
    await wait(950); ghost.press();
    await wait(350); addItem(curR.items[0].k, shelfEl.querySelector('.shelf-cell'));
    await wait(950); ghost.toEl($id('btn-checkout'));
    await wait(950); ghost.press();
    await wait(350); if (S.state !== 'shopping') S.state = 'shopping'; // 演示时序加固
    checkout(); // demo 路径：付币+离开，不写档
  });
}
function tutorialAfterWatch() { // 演示完：同一位客人正式再来，进入"帮"
  ghost.hide();
  sessionStorage.setItem('shop_tut', '1');
  setTimeout(() => {
    S.demo = false; S.tut = { phase: 'help', step: 0 };
    startLevel(0);
  }, 800);
}
function tutorialHelpStep() { // 帮：幽灵手指示范点一次货架，等孩子模仿
  ghost.show(); ghost.toCell(curR.items[0].k);
  setTimeout(() => ghost.press(), 950);
  setTimeout(() => { // 5 秒无操作再示范一次（仅补一次）
    if (S.tut.phase === 'help' && S.tut.step === 0) { ghost.toCell(curR.items[0].k); setTimeout(() => ghost.press(), 950); }
  }, 6000);
}
/* 独立完成由 onShelfTap/onCheckoutTap 推进：step0→点货架、step1→点结账→solo */

/* ---------- 无操作 20s：轻声重报目标一次（每轮最多 2 次） ---------- */
function armIdle() {
  clearTimeout(S.idleTimer);
  if (VERIFY) return;
  S.idleTimer = setTimeout(() => {
    if (S.state === 'shopping' && S.idleCount < 2) { S.idleCount++; sayOrder(curR); armIdle(); }
    else if (S.state === 'paying' && S.idleCount < 2) { S.idleCount++; sayPayAsk(); armIdle(); }
  }, 20000);
}

/* ================= 启动 ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'shop', title: '数字小卖部' });
  const lim = KIDS.calendar.limit(Infinity);
  let first = 0;
  for (let i = 0; i < lim; i++) if (!KIDS._save().levels[keyOf(i)]) { first = i; break; }
  if (KIDS.calendar.dayDone(keysUpTo(lim))) { // 今日新关已玩完：先收尾画面（可关闭重玩）
    /* r6 审查 m-3：预告按刚打完的最后一关（lim-1）推下一章——first 在全完成态停在 0，
       会错预告 ch2 而非实际进度下一章（家族 A lim-1 同构） */
    KIDS.ui.dayEnd({ nextHint: nextChapterHint(lim - 1) });
    first = 0;
  }
  startLevel(first);
}

/* 验收钩子 */
window.SHOP = {
  get currentOrder() { return curR; },
  get level() { return cur; },
  get round() { return S.round; },
  get strategy() { return S.strategy; },
  setStrategy,
  addItem,
  checkout,
  addCoin,
  removeCoin,
  confirmPay,
  paidSum,
  get state() { return S.state; },
  get errors() { return S.errors; },
  get basket() { return S.basket; }
};
