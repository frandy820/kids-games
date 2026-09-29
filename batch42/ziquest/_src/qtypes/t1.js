/* ================= ziquest 题型层 t1：听音找字（+ 题型层公共底座 ZQ._qt） =================
   加载契约（brief-m2）：qtypes 拼在 game-main 之前（此时 window.ZQ 未定义）→ 本文件开头自建
   window.ZQ 并放注册表；game-main 尾部 `window.ZQ = {...}` 整体赋值会冲掉注册表 → t1 头部装
   defineProperty 覆盖守卫（赋值即合并 QT/registerQ/_qt，对 M2a 透明）。
   公共底座 ZQ._qt（本文件承载，t2..t6 fail-fast 依赖，build 按文件名序 t1 先拼）：
   确定性乱序（mulberry32+seedIdx，禁 Math.random）/ 选项点选循环（错误阶梯 错1 鼓励 / 错2
   replay+正确卡 breathe / 错3 hint(1)+摘 1 干扰 dimmed）/ 救援双锚 14s 方向级 30s 答案级
   （keepIdle：救援不刷 lastAct；QT_.now 可测试注入）/ 幂等 CSS 注入 / 文字气泡兜底。
   防泄露（SPEC-ZILEARN §2）：题面 .zq-stem 与选项 .zq-opts 物理分离；视觉题题面不含答案字。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ = window.ZQ || {});
ZQ.QT = ZQ.QT || {};
if (!ZQ.registerQ) ZQ.registerQ = function (type, def) { ZQ.QT[type] = def; };

/* ---------- 覆盖守卫：main/M2a 整体赋值 window.ZQ 时合并题型注册表（幂等，一次装配） ---------- */
if (!window.__zqQtGuard) {
  window.__zqQtGuard = true;
  (function () {
    var cur = window.ZQ;
    try {
      Object.defineProperty(window, 'ZQ', {
        configurable: true,
        get: function () { return cur; },
        set: function (v) {
          if (v && typeof v === 'object' && v !== cur) {
            if (!v.QT) v.QT = {};
            if (cur && cur.QT) {
              Object.keys(cur.QT).forEach(function (k) { if (!v.QT[k]) v.QT[k] = cur.QT[k]; });
            }
            if (!v.registerQ) v.registerQ = cur && cur.registerQ;
            if (!v._qt && cur) v._qt = cur._qt;
          }
          if (v) cur = v;
        }
      });
    } catch (e) { /* 极老内核兜底：不拦截（注册表以 main 后重建为准） */ }
  })();
}

/* ================= 题型层公共底座 ZQ._qt ================= */
var QT_ = ZQ._qt = ZQ._qt || {};
QT_.now = QT_.now || Date.now;              /* 时钟单点（playwright idle 救援测试注入用） */

/* mulberry32（家族确定性 rnd；seed=题序派生，同 seed 同序——verify/selftest 可深对账） */
QT_.rnd = function (seed) {
  var a = (seed | 0) + 0x6D2B79F5;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
QT_.shuf = function (arr, seed) {           /* Fisher-Yates 确定性洗牌（返回新数组） */
  var a = arr.slice(), r = QT_.rnd(seed);
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
QT_.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
QT_.cssOnce = function (id, css) {          /* 幂等样式注入（题型层不碰 game-head.html） */
  if (document.getElementById(id)) return;
  var st = document.createElement('style');
  st.id = id; st.textContent = css;
  document.head.appendChild(st);
};
QT_.sfx = function (name) {                 /* 音效防御调用（缺 KIDS 环境=静默，_dev 可跑） */
  try { if (typeof KIDS !== 'undefined' && KIDS.audio && KIDS.audio.sfx) KIDS.audio.sfx(name); } catch (e) {}
};
QT_.voice = function (api, key) {           /* 语音单 key 防御调用（clip 缺失=静默，禁 TTS 文本参） */
  try { if (api && typeof api.voice === 'function') api.voice(key); } catch (e) {}
};

/* ---------- 公共 CSS（暖米底家族基调 #FBF6EC/#FFF9EE/#4A3B2E，2.5px 描边绘本风；动画全 transform/opacity） ---------- */
QT_.cssOnce('zq-css-qt',
  '.zq-qt{position:absolute;inset:0;display:flex;flex-direction:column;padding:10px 14px 12px;min-height:0}' +
  '.zq-stem{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0 2px}' +
  '.zq-opts{flex:1 1 auto;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:center;' +
    'justify-items:stretch;min-height:0;padding-top:6px}' +
  '.zq-opt{min-width:96px;min-height:96px;border-radius:22px;background:#FFF9EE;border:2.5px solid #4A3B2E;' +
    'box-shadow:0 5px 0 #D8C9B4;display:flex;align-items:center;justify-content:center;gap:2px;' +
    'font-size:54px;font-weight:800;color:#4A3B2E;line-height:1;transition:transform .15s;' +
    'width:100%;max-width:236px;margin:0 auto}' +
  '.zq-opt:active{transform:translateY(3px)}' +
  '.zq-opt.dimmed{opacity:.18;pointer-events:none}' +
  '.zq-opt.good{background:#E9F2DF;border-color:#5B8A4E;box-shadow:0 5px 0 #BFD4AC}' +
  '.zq-opt.wig{animation:zq-wig .5s ease}' +
  '@keyframes zq-wig{0%,100%{transform:translateX(0)}25%{transform:translateX(-9px)}' +
    '55%{transform:translateX(8px)}80%{transform:translateX(-4px)}}' +
  '.zq-opts.shake{animation:zq-oshake .5s ease}' +
  '@keyframes zq-oshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}' +
    '45%{transform:translateX(9px)}70%{transform:translateX(-5px)}}' +
  '.zq-opt.breathe,.zq-qt .breathe{animation:zq-breathe 1.6s ease-in-out infinite}' +
  '@keyframes zq-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}' +
  '.zq-prompt{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:800;color:#8A7B6C}' +
  '.zq-prompt svg{width:30px;height:30px;flex:0 0 30px}' +
  '.zq-bub{position:absolute;left:50%;bottom:16px;transform:translate(-50%,90px);z-index:30;background:#FFF9EE;' +
    'border:2.5px solid #4A3B2E;border-radius:18px;box-shadow:0 4px 0 #D8C9B4;padding:9px 18px;' +
    'font-size:16px;font-weight:700;transition:transform .3s ease;pointer-events:none;white-space:nowrap}' +
  '.zq-bub.show{transform:translate(-50%,0)}' +
  '.zq-fly{animation:zq-fly .45s cubic-bezier(.3,.9,.35,1)}' +     /* 答案字飞入题面（transform-only） */
  '@keyframes zq-fly{0%{transform:translateY(0) scale(1)}60%{transform:translateY(-10px) scale(1.15)}' +
    '100%{transform:translateY(0) scale(1)}}');

/* ---------- 题面/选项骨架（物理分离=防泄露纪律的 DOM 面） ---------- */
QT_.frame = function (box) {
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  var root = document.createElement('div');
  root.className = 'zq-qt';
  var stem = document.createElement('div');
  stem.className = 'zq-stem';
  var opts = document.createElement('div');
  opts.className = 'zq-opts';
  root.appendChild(stem); root.appendChild(opts);
  box.appendChild(root);
  return { root: root, stem: stem, opts: opts };
};
QT_.bub = function (box, text, ms) {        /* 文字气泡（语音缺失兜底+鼓励文案；同框复用一个） */
  var b = box.querySelector('.zq-bub');
  if (!b) { b = document.createElement('div'); b.className = 'zq-bub'; box.appendChild(b); }
  b.textContent = text;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('show'); }, ms || 1500);
};
QT_.ansIdxOf = function (q) {               /* answer 兼容索引/字面两种给法 */
  if (typeof q.answer === 'number') return q.answer;
  return q.options ? q.options.indexOf(q.answer) : -1;
};
QT_.teardown = function (box) {             /* 新题 render 前收上一题（idle 计时器/死亡标记） */
  var st = box.__zqQ;
  if (st) { st.dead = true; if (st.timer) clearInterval(st.timer); delete box.__zqQ; }
  box.innerHTML = '';
};

/* ---------- 选项点选循环：错误阶梯（zilearn §R13 F2 同款）+ 救援双锚（§R9 keepIdle） ----------
   cfg={box,q,api,optEls,ansIdx,rightMs,onRight(el),encText(i)}
   判定域统一=原始选项索引（dataset.v / ansIdx 都指 q.options 下标，与渲染乱序无关）。 */
QT_.wirePick = function (cfg) {
  var box = cfg.box, api = cfg.api, optEls = cfg.optEls, ansIdx = cfg.ansIdx;
  var st = { miss: 0, lock: false, dead: false, timer: null,
             lastAct: QT_.now(), lastDir: 0, lastAnsRescue: 0 };
  box.__zqQ = st;
  var ENC = ['没关系，再想一想', '听一听，它就在里面哦', '去掉一个啦，再选一选'];

  function elByV(v) {                       /* 原始索引 → 乱序后实际按钮 */
    for (var i = 0; i < optEls.length; i++) if (Number(optEls[i].dataset.v) === v) return optEls[i];
    return null;
  }
  function hideOne() {                      /* 阶梯3：摘 1 干扰（不删 DOM 保判定索引；alive>3 才摘） */
    var alive = optEls.filter(function (b) { return !b.classList.contains('dimmed'); });
    if (alive.length <= 3) return;
    for (var i = 0; i < alive.length; i++) {
      if (Number(alive[i].dataset.v) !== ansIdx) { alive[i].classList.add('dimmed'); return; }
    }
  }
  function pick(vi) {
    if (st.dead || st.lock) return;
    st.lastAct = QT_.now();
    var el = elByV(vi);
    if (vi === ansIdx) {                    /* 对：good 动画+确认音 → right()（延时给反馈窗，M2a 接管清场） */
      st.lock = true;
      if (el) { el.classList.add('good'); el.classList.remove('breathe'); }
      QT_.sfx('ok');
      QT_.voice(api, 'zq_right');
      if (cfg.onRight) cfg.onRight(el);
      setTimeout(function () { if (!st.dead) api.right(); }, cfg.rightMs || 420);
      return;
    }
    st.miss++;                              /* 错：阶梯反馈（鼓励→重播+breathe→摘干扰） */
    st.lock = true;
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    var wrap = el && el.parentNode;
    if (wrap) { wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); }
    QT_.sfx('fail');
    var m = st.miss;
    if (m === 1) {
      QT_.voice(api, 'zq_wrong');
      QT_.bub(box, cfg.encText ? cfg.encText(1) : ENC[0], 1400);
    } else if (m === 2) {
      QT_.voice(api, 'zq_wrong');
      if (typeof api.replay === 'function') api.replay();       /* 重播题面（M2a → onShow 题面音） */
      var ok = elByV(ansIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
      QT_.bub(box, cfg.encText ? cfg.encText(2) : ENC[1], 1600);
    } else {
      if (typeof api.hint === 'function') api.hint(1);
      QT_.voice(api, 'zq_hint');
      hideOne();
      QT_.bub(box, cfg.encText ? cfg.encText(3) : ENC[2], 1600);
    }
    api.wrong();                            /* 每错上报一次（level 计 miss/星判定） */
    setTimeout(function () { if (!st.dead) st.lock = false; }, 800);   /* 错后演出锁总窗（b39 口径） */
  }
  optEls.forEach(function (b) {
    b.addEventListener('click', function () { pick(Number(b.dataset.v)); });
  });
  /* 救援双锚（zilearn 同款：14s 方向级重播 / 30s 答案级 breathe+重播；救援不刷 lastAct=keepIdle） */
  st.timer = setInterval(function () {
    if (st.dead || st.lock) return;
    var idle = QT_.now() - st.lastAct, t = QT_.now();
    if (idle >= 30000 && t - st.lastAnsRescue >= 15000) {
      st.lastAnsRescue = t;
      var ok = elByV(ansIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
      QT_.voice(api, 'zq_hint');
      if (typeof api.replay === 'function') api.replay();
    } else if (idle >= 14000 && t - st.lastDir >= 14000 && idle < 30000) {
      st.lastDir = t;
      if (typeof api.replay === 'function') api.replay();
      QT_.bub(box, '想一想，再选一选', 1600);
    }
  }, 1500);
  return st;
};

/* ---------- 乱序选项装配：layout=确定性置换，optEls[i].dataset.v=原始索引（判定恒走原始索引） ---------- */
QT_.layout = function (n, q, salt) {
  var idx = [];
  for (var i = 0; i < n; i++) idx.push(i);
  return QT_.shuf(idx, ((q && q.seedIdx) || 0) * 7919 + 97 + (salt || 0));
};
QT_.mkOpts = function (optsEl, items, layout, cls) {
  var optEls = [];
  layout.forEach(function (orig) {
    var b = document.createElement('button');
    b.className = 'zq-opt' + (cls ? ' ' + cls : '');
    b.dataset.v = String(orig);
    b.innerHTML = items[orig];
    optsEl.appendChild(b);
    optEls.push(b);
  });
  return optEls;
};

/* ================= t1 听音找字：题面播读音（缺 clip=口型图标+拼音文字静默可玩），四选一大字卡 =================
   防泄露：stem 只出图标+拼音+提示语（听音题的题面音=目标字音本身是玩法——SPEC §2 豁免口径） */
QT_.ICON = {
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  mouth: '<svg viewBox="0 0 72 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="36" cy="28" rx="26" ry="20" fill="#F2B8C6" stroke="#4A3B2E" stroke-width="3"/>' +
    '<ellipse cx="36" cy="33" rx="15" ry="9" fill="#B3405A" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M14 20 q22 -14 44 0" fill="none" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/></svg>'
};

ZQ.registerQ('t1', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var f = QT_.frame(box);
    var stem = document.createElement('div');
    stem.className = 'zq-t1-main';
    stem.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px';
    var spk = document.createElement('button');
    spk.className = 'zq-t1-spk';
    spk.setAttribute('aria-label', '再听一次');
    spk.innerHTML = QT_.ICON.mouth +
      '<span class="zq-t1-py">' + QT_.esc(q.py) + '</span>' +
      '<span class="zq-t1-sub">点我再听一次</span>';
    spk.addEventListener('click', function () {
      if (box.__zqQ && box.__zqQ.lock) return;
      QT_.voice(api, 'zq_ch_' + q.pyKey);
    });
    stem.appendChild(spk);
    f.stem.insertAdjacentHTML('afterbegin',
      '<div class="zq-prompt">' + QT_.ICON.hear + '<span>听一听，找一找</span></div>');
    f.stem.appendChild(stem);
    var items = (q.options || []).map(function (o) {
      return '<span class="zi">' + QT_.esc(o) + '</span>';
    });
    var layout = QT_.layout(items.length, q, 1);
    var optEls = QT_.mkOpts(f.opts, items, layout);
    QT_.wirePick({
      box: box, q: q, api: api, optEls: optEls,
      ansIdx: QT_.ansIdxOf(q),           /* 判定域=原始索引（乱序无关） */
      encText: function (i) { return i === 1 ? '没关系，再听一听' : (i === 2 ? '听一听，它就在里面哦' : '去掉一个啦，再选一选'); }
    });
  },
  onShow: function (q, api) {               /* 题面音：listen 提示 + 目标字音（错2 replay 由 M2a 转回这里） */
    QT_.voice(api, 'zq_listen');
    QT_.voice(api, 'zq_ch_' + q.pyKey);
  }
});

QT_.cssOnce('zq-css-t1',
  '.zq-t1-spk{min-width:96px;min-height:96px;border-radius:24px;background:#FFF9EE;border:2.5px solid #4A3B2E;' +
    'box-shadow:0 5px 0 #D8C9B4;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'gap:2px;padding:10px 26px;transition:transform .15s}' +
  '.zq-t1-spk:active{transform:translateY(3px)}' +
  '.zq-t1-spk svg{width:74px;height:56px}' +
  '.zq-t1-py{font-size:30px;font-weight:800;color:#4A3B2E}' +
  '.zq-t1-sub{font-size:13px;font-weight:700;color:#8A7B6C}');

})();
