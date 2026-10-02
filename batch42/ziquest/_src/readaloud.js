/* readaloud.js — v58 跟读评测（用户拍板：字卡后轻跟读可跳过+关尾集中跟读；识别不可用降级自评）。
   识别=浏览器 Web Speech API（webkitSpeechRecognition zh-CN；微信/飞书 XWeb 无此 API→自评模式，
   系统浏览器 Chrome/Safari 自动真识别）。判分=纯函数 _judge：识别候选文本逐字查 ZQ_CH_ENT 拼音，
   含目标音节即对——同音字算对（6 岁读音对即可，「添」当「天」判对，教研语义）。
   纪律：verify/无头=cap 走 self 分支可直驱；禁裸 Math.random；音频播放走 KIDS.voice 单 key。 */
'use strict';
(function () {
  let capCache = null;                       /* 'asr' | 'self'（一次性；真实可用性延迟到首用——
                                                not-allowed/service-not-allowed 永久降级 'self'） */
  function cap() {
    if (capCache) return capCache;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    capCache = SR ? 'asr' : 'self';
    return capCache;
  }
  function degrade() { capCache = 'self'; }  /* 首用失败（权限拒/服务不可用）→ 本会话起自评 */

  /* 拼音串：文本逐字查 ZQ_CH_ENT（表外字跳过——标点/未收录字不含信息） */
  function pyStr(text) {
    let s = '';
    for (const ch of String(text || '')) {
      const e = ZQ_CH_ENT[ch];
      if (e && e.pyKey) s += e.pyKey + ' ';
    }
    return s;
  }
  /* 判分纯函数（verify 直驱）：候选任一文本含目标音节即对 */
  function judge(cands, pyKey) {
    if (!pyKey) return false;
    const list = Array.isArray(cands) ? cands : [cands];
    for (let i = 0; i < list.length; i++) {
      if (pyStr(list[i]).indexOf(pyKey + ' ') >= 0) return true;
    }
    return false;
  }

  /* ---------- 单字跟读卡（挂 #zq-lv 题面层内，读完/跳过回调清场） ---------- */
  /* opt = {ch, pyKey, skippable, onDone(ok)}；askState 复读防重入 */
  let asking = false;
  function ask(opt) {
    if (asking || !opt || !opt.ch) { if (opt && opt.onDone) opt.onDone(false); return; }
    asking = true;
    const box = document.querySelector('#zq-qbox') || document.getElementById('zq-qbox');
    if (!box) { asking = false; if (opt.onDone) opt.onDone(false); return; }
    const mode = cap();
    const w = document.createElement('div');
    w.className = 'zq-ra';
    w.innerHTML =
      '<div class="zq-ra-tt">大声读出来吧</div>' +
      '<div class="zq-ra-ch">' + opt.ch + '</div>' +
      '<div class="zq-ra-btns">' +
      '<button class="zq-ra-mic" aria-label="开始读">' +
      '<svg viewBox="0 0 48 48"><rect x="19" y="6" width="10" height="22" rx="5" fill="#FFFDF6" stroke="#4A3B2E" stroke-width="2.8"/><path d="M12 24q0 12 12 12t12-12" fill="none" stroke="#4A3B2E" stroke-width="2.8" stroke-linecap="round"/><path d="M24 36v6M17 42h14" stroke="#4A3B2E" stroke-width="2.8" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<button class="zq-ra-ok" aria-label="我读对啦">我读对啦 ⭐</button>' +
      (opt.skippable ? '<button class="zq-ra-skip">先不读啦</button>' : '') +
      '</div>' +
      '<div class="zq-ra-tip"></div>';
    box.innerHTML = '';
    box.appendChild(w);
    const tip = w.querySelector('.zq-ra-tip');
    const mic = w.querySelector('.zq-ra-mic');
    const okBtn = w.querySelector('.zq-ra-ok');
    okBtn.style.display = mode === 'self' ? '' : 'none';   /* self 模式直接亮自评钮 */

    function finish(ok) {
      asking = false;
      if (w.parentNode) w.remove();
      if (!VERIFY) {
        if (ok) { KIDS.voice.play('zq_ra_good'); }
      }
      if (opt.onDone) opt.onDone(!!ok);
    }
    const skipBtn = w.querySelector('.zq-ra-skip');
    if (skipBtn) skipBtn.onclick = function () { finish(false); };

    if (mode === 'asr') {
      let fails = 0;
      mic.onclick = function () {
        if (mic.classList.contains('rec')) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'zh-CN';
        rec.interimResults = false;
        rec.maxAlternatives = 3;
        mic.classList.add('rec');
        tip.textContent = '兔子在听…大声读吧';
        let settled = false;
        const t = setTimeout(function () {                   /* 识别超时兜底（部分内核不回调） */
          try { rec.stop(); } catch (e) {}
          if (!settled) { settled = true; onNo(); }
        }, 8000);
        function onNo() {
          mic.classList.remove('rec');
          fails++;
          if (fails >= 2) { degrade(); okBtn.style.display = ''; tip.textContent = '这里听不太清，你自己点亮星星吧'; return; }
          tip.textContent = '再读一次试试';
          if (!VERIFY) KIDS.voice.play('zq_ra_retry');
        }
        rec.onresult = function (e) {
          if (settled) return;
          settled = true; clearTimeout(t); mic.classList.remove('rec');
          const cands = [];
          for (let i = 0; i < e.results[0].length && i < 3; i++) cands.push(e.results[0][i].transcript);
          if (judge(cands, opt.pyKey)) { tip.textContent = '读得真好！'; finish(true); }
          else onNo();
        };
        rec.onerror = function (e) {
          if (settled) return;
          settled = true; clearTimeout(t);
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { degrade(); okBtn.style.display = ''; mic.classList.remove('rec'); tip.textContent = '这里听不太清，你自己点亮星星吧'; return; }
          onNo();
        };
        rec.onend = function () { if (!settled) { settled = true; clearTimeout(t); onNo(); } };
        try { rec.start(); } catch (err) { settled = true; clearTimeout(t); onNo(); }
      };
      okBtn.onclick = function () { finish(true); };        /* asr 降级后/家长代评兜底 */
    } else {
      /* self 模式：按住读（3s 鼓励动画）→ 自评点亮 */
      mic.onclick = function () {
        if (mic.classList.contains('rec')) return;
        mic.classList.add('rec');
        tip.textContent = '读——';
        setTimeout(function () {
          mic.classList.remove('rec');
          tip.textContent = '读完就点亮星星吧！';
        }, 2600);
      };
      okBtn.onclick = function () { finish(true); };
    }
    if (!VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_ra_go');
  }

  /* ---------- 关尾集中跟读：本关字逐字（不可跳过，读完结算） ---------- */
  function round(chars, onAllDone) {
    const list = (chars || []).slice();
    if (!list.length) { if (onAllDone) onAllDone(); return; }
    const ch = list.shift();
    const ent = ZQ_CH_ENT[ch];
    ask({ ch: ch, pyKey: ent ? ent.pyKey : '', skippable: false,
      onDone: function () {
        if (list.length) round(list, onAllDone);
        else if (onAllDone) onAllDone();
      } });
  }

  window.ZQ.RA = { cap: cap, ask: ask, round: round, _judge: judge, _pyStr: pyStr };
})();
