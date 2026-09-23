/* KIDS core v1.0 — 儿童离线游戏公共内核（内嵌于每款游戏，无外部依赖）
 * 提供：存档 / 内容日历 / 会话计时与休息提示 / Web Audio 合成音效 / TTS / 过关与章节仪式 / 家长面板 / 小兔子 SVG
 * 用法：内嵌本文件全文 → KIDS.init({game:'pipe', title:'管道小兔子'}) → 各 API
 */
const KIDS = (() => {
  'use strict';
  const VER = '1.0';
  let cfg = { game: 'game', title: '游戏' };
  let save = null;
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const dayDiff = (a, b) => Math.floor((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const $ = s => document.querySelector(s);

  /* ---------- 存档 ---------- */
  const store = {
    load() {
      let raw = null;
      try { raw = localStorage.getItem('kidsgame_' + cfg.game); } catch (e) {}
      try { save = raw ? JSON.parse(raw) : null; } catch (e) { save = null; } // 存档损坏=重置，不白屏
      if (!save || save.v !== VER) save = {
        v: VER, game: cfg.game, firstDay: todayStr(), lastDay: todayStr(),
        levels: {}, dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 }, restTip: { day: '', shown: 0 }
      };
      save.lastDay = todayStr();
      this.persist();
    },
    persist() { try { localStorage.setItem('kidsgame_' + cfg.game, JSON.stringify(save)); } catch (e) {} }
  };

  /* ---------- 音频（全合成，马林巴音色） ---------- */
  const audio = {
    ctx: null,
    unlock() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    _vol() { return save && save.settings ? (save.settings.sound ? save.settings.vol : 0) : 0.6; },
    note(freq, dur = 0.5, when = 0, vol = 1) { // 马林巴：基音+2.9倍泛音+指数衰减
      const c = this.ctx; if (!c || !freq || this._vol() <= 0) return;
      const t = c.currentTime + when, v = this._vol() * vol;
      [[1, 1], [2.9, 0.2]].forEach(([mul, amp]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = freq * mul;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5 * v * amp, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
      });
    },
    sfx(name) {
      const c = this.ctx; if (!c || this._vol() <= 0) return;
      if (name === 'ok') { this.note(523.25, 0.35, 0, 0.9); this.note(659.25, 0.45, 0.09, 0.9); }
      else if (name === 'win') { [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => this.note(f, 0.5, i * 0.09, 0.95)); }
      else if (name === 'fail') { this.note(196, 0.18, 0, 0.45); } // 柔和低音，不惊吓
      else if (name === 'click') { // 短噪声脉冲
        const t = c.currentTime, len = c.sampleRate * 0.04, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 1800;
        g.gain.value = 0.18 * this._vol();
        s.buffer = buf; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
      }
      else if (name === 'pop') { this.note(880, 0.15, 0, 0.6); }
      else if (name === 'coin') { this.note(987.77, 0.2, 0, 0.8); this.note(1318.5, 0.4, 0.08, 0.8); }
    }
  };

  /* ---------- 语音：预合成童声音频优先，系统 TTS 回退 ----------
   * clips = { key: dataURI }，由游戏侧注入（build 时内嵌 base64 mp3）。
   * play(key, text)：有 clip 播 clip（停止上一条），否则回退 speak(text)。
   * queue(parts)：拼接句顺序播报，parts = [key 或 {key,text}]，段间 0.15s 停顿（替代标点停顿）。 */
  const voice = {
    clips: {},
    _audio: null,
    _qtimer: null,
    _mk(uri, onfail) { // 单条播放器，音量跟随家长面板
      const a = new Audio(uri);
      a.volume = save && save.settings ? save.settings.vol : 0.6;
      if (onfail) a.play().catch(onfail); else a.play().catch(() => {});
      return a;
    },
    _stop() {
      if (this._audio) { this._audio.pause(); this._audio = null; }
      if (this._qtimer) { clearTimeout(this._qtimer); this._qtimer = null; }
    },
    play(key, text) {
      if (!save || !save.settings.tts) return;
      this._stop();
      const uri = this.clips[key];
      if (!uri) { if (text) speak(text); return; }
      try { this._audio = this._mk(uri, () => { if (text) speak(text); }); } // 自动播放被拦则回退 TTS
      catch (e) { if (text) speak(text); }
    },
    queue(parts) { // 拼接句：如 ['shop_recount','shop_want','shop_g_apple_3']
      if (!save || !save.settings.tts) return;
      this._stop();
      const list = parts.slice();
      const step = () => {
        if (!list.length) return;
        const p = list.shift(), key = typeof p === 'string' ? p : p.key;
        const text = typeof p === 'object' && p ? p.text : null;
        const uri = this.clips[key];
        if (!uri) { if (text) speak(text); return; } // 缺 clip 且无文本=放弃整句（比逐段 TTS 混搭更自然）
        try {
          this._audio = this._mk(uri);
          this._audio.onended = () => { this._qtimer = setTimeout(step, 150); };
        } catch (e) { return; }
      };
      step();
    },
    say(text) { this.play(null, text); } // 强制走 TTS（动态拼句且无 clip 时）
  };

  /* ---------- TTS（Task#46 阶段3 2026-09-20 通道删除）----------
   * 用户红线：彻底消灭 speechSynthesis 系统合成音（120 款 keyless 点位已全量 clip 化，
   * 二波 77/77 闭环）。残余 keyless 调用（say 裸文本/play 缺 clip 回退）到此为
   * 静默无声+控制台告警——不 fallback 系统音色跳变，也不可听见机械声。 */
  const speak = (text) => {
    try { console.warn('[KIDS.voice] clipless speech dropped:', text); } catch (e) {}
  };

  /* ---------- 内容日历：每日新关基数 6（首日）→ 12（第 2 天起封顶，2026-09-05 用户反馈 dayIndex 线性增长导致"永远玩不完"后封顶）
   * 家长可在面板手动输入今日多玩关数：save.bonus = { '2026-09-05': n }（0-30，设置语义替换旧值，当日生效）。
   * keysFlat = 游戏按顺序传入全部关卡 key（'ch-lv'）的扁平数组，用于判断今日新关是否全部完成 */
  const DAILY_NEW = 6, DAY_CAP = 2, BONUS_MAX = 30;
  const calendar = {
    dayIndex() { return dayDiff(save.firstDay, todayStr()) + 1; },
    bonusToday() { return (save.bonus && save.bonus[todayStr()]) || 0; },
    bonusSet(n) { // 家长设置今日多玩关数（替换旧值），返回是否成功
      n = Math.round(Number(n));
      if (!(n >= 0 && n <= BONUS_MAX)) return false;
      if (!save.bonus) save.bonus = {};
      save.bonus[todayStr()] = n;
      store.persist();
      return true;
    },
    limit(totalLevels) { return Math.min(totalLevels, Math.min(this.dayIndex(), DAY_CAP) * DAILY_NEW + this.bonusToday()); },
    isNew(flatIdx, totalLevels) { return flatIdx < this.limit(totalLevels); },
    dayDone(keysFlat) { // 今日新关全部有通关记录？
      const lim = this.limit(keysFlat.length);
      for (let i = 0; i < lim; i++) if (!save.levels[keysFlat[i]]) return false;
      return true;
    }
  };

  /* ---------- 关卡进度 ---------- */
  const level = {
    key(ch, lv) { return ch + '-' + lv; },
    stars(ch, lv) { return (save.levels[this.key(ch, lv)] || {}).stars || 0; },
    pass(ch, lv, stars, chapterLevels) { // chapterLevels = 本章全部 lv 数组（如 [0,1,2,3,4]）
      const k = this.key(ch, lv), prev = save.levels[k] || { stars: 0, plays: 0 };
      save.levels[k] = { stars: Math.max(prev.stars, stars), plays: prev.plays + 1 };
      store.persist();
      const chapterDone = chapterLevels.every(l => save.levels[this.key(ch, l)]);
      return { chapterDone };
    }
  };

  /* ---------- 会话计时与休息提示（只计前台时间，按分钟增量入账 dailyMin） ---------- */
  const session = {
    t0: null, timer: null, lastMin: 0, hiddenAt: null,
    settle() { // 把 lastMin 以来的前台分钟增量写入当日
      const min = Math.floor((Date.now() - this.t0) / 60000);
      if (min > this.lastMin) {
        const today = todayStr();
        save.dailyMin[today] = (save.dailyMin[today] || 0) + (min - this.lastMin);
        this.lastMin = min;
        store.persist();
      }
    },
    start() {
      this.t0 = Date.now(); this.lastMin = 0; this.hiddenAt = null;
      const tick = () => {
        if (document.hidden) return;
        this.settle();
        const today = todayStr();
        if (!save.restTip || save.restTip.day !== today) save.restTip = { day: today, shown: 0 }; // 按日清零
        const min = Math.floor((Date.now() - this.t0) / 60000);
        if ((min >= 13 && save.restTip.shown < 13) || (min >= 25 && save.restTip.shown < 25)) {
          save.restTip.shown = min >= 25 ? 25 : 13; store.persist();
          ui.restTip();
        }
      };
      clearInterval(this.timer);
      this.timer = setInterval(tick, 20000);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { this.settle(); this.hiddenAt = Date.now(); }   // 切走：入账并暂停
        else if (this.hiddenAt) { this.t0 += Date.now() - this.hiddenAt; this.hiddenAt = null; } // 回来：平移起点
      });
    }
  };

  /* ---------- 覆盖层 UI ---------- */
  const css = `
button{color:inherit}
.k-ov{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:rgba(251,243,228,.94);touch-action:none;-webkit-user-select:none;user-select:none;opacity:0;transition:opacity .3s}
.k-ov.show{opacity:1}
.k-ov .k-big{font-size:30px;font-weight:700;color:#4A3B2E;letter-spacing:.06em;text-align:center;padding:0 30px}
.k-ov .k-sub{font-size:20px;color:#8A7B6C;text-align:center;padding:0 30px;line-height:1.6}
.k-btn{min-width:72px;min-height:72px;padding:0 34px;border:none;border-radius:24px;background:#E8975A;color:#fff;font-size:22px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 4px 0 #C77A42;transition:transform .15s}
.k-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #C77A42}
.k-btn.ghost{background:#FFF9EE;color:#4A3B2E;box-shadow:0 4px 0 #D8C9B4}
.k-star{font-size:64px;line-height:1;color:#F5C445;text-shadow:0 3px 0 #D8862B;animation:k-pop .5s cubic-bezier(.2,1.6,.4,1) both}
.k-star:nth-child(2){animation-delay:.12s}.k-star:nth-child(3){animation-delay:.24s}
@keyframes k-pop{from{transform:scale(0) rotate(-20deg)}to{transform:scale(1) rotate(0)}}
.k-stamp{width:120px;height:120px;border-radius:50%;background:#8FBF7F;display:flex;align-items:center;justify-content:center;font-size:58px;animation:k-stamp .55s cubic-bezier(.2,1.8,.4,1) both}
@keyframes k-stamp{from{transform:scale(2.4);opacity:0}to{transform:scale(1);opacity:1}}
.k-parentbtn{position:fixed;top:10px;right:10px;z-index:10000;width:44px;height:44px;border-radius:14px;border:none;background:rgba(232,151,90,.25);color:#4A3B2E;font-size:20px;cursor:pointer}
.k-panel{position:fixed;inset:0;z-index:99999;background:rgba(74,59,46,.35);display:flex;align-items:center;justify-content:center}
.k-panel .box{background:#FFF9EE;border-radius:20px;padding:26px 30px;max-width:420px;width:88%;max-height:80vh;overflow:auto;font-size:15px;color:#4A3B2E;line-height:1.7}
.k-panel h3{margin:0 0 12px;font-size:18px}
.k-panel table{width:100%;border-collapse:collapse;margin:8px 0}
.k-panel td{padding:5px 0;border-bottom:1px solid #EFE3CD;font-size:14px}
.k-panel .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center}
.k-panel .mbtn{padding:10px 16px;border:none;border-radius:12px;background:#E8975A;color:#fff;font-size:14px;cursor:pointer;font-family:inherit}
.k-panel .mbtn.ghost{background:#EFE3CD;color:#4A3B2E}
.k-panel input[type=number]{width:100px;padding:10px;font-size:20px;border:2px solid #E8975A;border-radius:10px}
.k-numrow{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.k-numrow button{width:52px;height:52px;font-size:20px;border:none;border-radius:12px;background:#EFE3CD;color:#4A3B2E;cursor:pointer;font-family:inherit}
.k-close{position:absolute;top:10px;right:12px;border:none;background:none;font-size:22px;cursor:pointer;color:#8A7B6C}
`;
  const ui = {
    injectCss() { const s = el('style'); s.textContent = css; document.head.appendChild(s); },
    _ov(cls) {
      /* b14 试玩 P2①：同类型层幂等——层未关时再次触发（如日终后继续重玩又通关）
         会向 body 叠加第二层（实测累积 7 个"明天见"按钮）；先移除同 cls 旧层 */
      if (cls) document.querySelectorAll('.k-ov.' + cls).forEach(o => o.remove());
      const o = el('div', 'k-ov' + (cls ? ' ' + cls : '')); document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('show')); return o;
    },
    celebrate(stars = 3) { // 过关：金星+“真棒！”+2.3s 自动收起（视觉评估：仪式感弱/星星深棕非金黄/1.8s过短）；类名 k-celebrate 供验收断言
      return new Promise(res => {
        const o = this._ov('k-celebrate');
        const box = el('div'); box.style.cssText = 'display:flex;gap:8px';
        for (let i = 0; i < stars; i++) box.appendChild(el('div', 'k-star', '★'));
        o.appendChild(box);
        o.appendChild(el('div', 'k-big', stars >= 3 ? '真棒！' : '好棒！'));
        o.appendChild(el('div', '', '<div style="width:140px;height:140px">' + assets.rabbit('happy') + '</div>'));
        setTimeout(() => { o.classList.remove('show'); setTimeout(() => { o.remove(); res(); }, 320); }, 2300);
      });
    },
    chapterEnd(info) { // {chapter, stars, nextHint}
      const o = this._ov('k-chapterend');
      o.appendChild(el('div', 'k-stamp', '★'));
      o.appendChild(el('div', 'k-big', '第 ' + info.chapter + ' 章 完成！'));
      o.appendChild(el('div', 'k-sub', '本章星星 ' + info.stars + '<br>明天：' + (info.nextHint || '有新的关卡哦')));
      const b = el('button', 'k-btn', '明天见');
      b.onclick = () => { o.remove(); };
      o.appendChild(b);
      audio.sfx('win');
      voice.play('core_chapter_end', '这一章完成啦，明天还有新关卡哦');
    },
    dayEnd(info) { // {nextHint}
      const o = this._ov('k-dayend');
      o.appendChild(el('div', '', '<div style="width:150px;height:150px">' + assets.rabbit('wave') + '</div>'));
      o.appendChild(el('div', 'k-big', '今天的新关卡玩完啦'));
      o.appendChild(el('div', 'k-sub', '明天：' + (info.nextHint || '有新的关卡哦')));
      const again = el('button', 'k-btn ghost', '再玩玩旧关卡');
      again.onclick = () => { o.remove(); };
      const bye = el('button', 'k-btn', '明天见');
      bye.onclick = () => { o.remove(); };
      const row = el('div'); row.style.cssText = 'display:flex;gap:18px'; row.appendChild(again); row.appendChild(bye);
      o.appendChild(row);
      audio.sfx('win');
      voice.play('core_day_end', '今天的新关卡玩完啦，明天见');
    },
    restTip() {
      const o = this._ov('k-resttip');
      o.appendChild(el('div', '', '<div style="width:150px;height:150px">' + assets.rabbit('sleepy') + '</div>'));
      o.appendChild(el('div', 'k-big', '小兔子的眼睛要休息啦'));
      o.appendChild(el('div', 'k-sub', '去看看远处的大树，明天再一起玩'));
      const b = el('button', 'k-btn', '好的');
      b.onclick = () => { o.remove(); };
      o.appendChild(b);
      audio.sfx('pop');
      voice.play('core_rest', '我的眼睛要休息啦，我们去看看远处的大树吧，明天再一起玩');
    }
  };

  /* ---------- 家长面板（含家长门） ---------- */
  const parent = {
    init() {
      const b = el('button', 'k-parentbtn', '👪');
      b.title = '家长'; b.setAttribute('aria-label', '家长');
      b.onclick = () => this.gate();
      document.body.appendChild(b);
    },
    gate() {
      // 两位数加法：10 以内加法是幼儿园大班常规内容，不足以挡住目标年龄段儿童（Apple Kids 家长门要求"儿童难完成"）
      const a = 11 + Math.floor(Math.random() * 40), b = 11 + Math.floor(Math.random() * 40);
      const p = el('div', 'k-panel');
      const box = el('div', 'box');
      box.style.position = 'relative';
      box.innerHTML = '<h3>家长验证</h3><div style="font-size:17px">' + a + ' + ' + b + ' = ?</div>';
      const input = el('input'); input.type = 'number'; input.min = 0; input.max = 200;
      const nums = el('div', 'k-numrow');
      for (let i = 0; i <= 9; i++) {
        const nb = el('button', '', String(i));
        nb.onclick = () => { input.value = (input.value || '') + i; };
        nums.appendChild(nb);
      }
      const del = el('button', '', '⌫'); del.onclick = () => { input.value = String(input.value || '').slice(0, -1); };
      del.style.width = '52px'; del.style.height = '52px'; del.style.cssText += ';border:none;border-radius:12px;background:#EFE3CD;cursor:pointer;font-size:18px';
      nums.appendChild(del);
      const ok = el('button', 'mbtn', '确定');
      ok.onclick = () => {
        if (parseInt(input.value, 10) === a + b) { p.remove(); this.panel(); }
        else { input.value = ''; input.placeholder = '再试一次'; }
      };
      const row = el('div', 'row'); row.appendChild(ok);
      const cancel = el('button', 'mbtn ghost', '取消'); cancel.onclick = () => p.remove(); row.appendChild(cancel);
      box.appendChild(input); box.appendChild(nums); box.appendChild(row);
      p.appendChild(box); document.body.appendChild(p);
    },
    panel() {
      const p = el('div', 'k-panel');
      const box = el('div', 'box'); box.style.position = 'relative';
      const days = Object.keys(save.dailyMin);
      const totalStars = Object.values(save.levels).reduce((s, l) => s + (l.stars || 0), 0);
      const done = Object.keys(save.levels).length;
      box.innerHTML = '<span class="k-close" title="关闭">✕</span><h3>家长面板 · ' + cfg.title + '</h3>' +
        '<table>' +
        '<tr><td>首次游玩</td><td>' + save.firstDay + '</td></tr>' +
        '<tr><td>最近游玩</td><td>' + save.lastDay + '</td></tr>' +
        '<tr><td>已完成关卡</td><td>' + done + ' 关</td></tr>' +
        '<tr><td>累计星星</td><td>' + totalStars + '</td></tr>' +
        '<tr><td>今日游玩</td><td>' + (save.dailyMin[todayStr()] || 0) + ' 分钟</td></tr>' +
        '</table>' +
        '<div style="font-size:13px;color:#8A7B6C">近期每日游玩（分钟）</div>' +
        '<div style="font-size:13px">' + days.slice(-7).map(d => d.slice(5) + '：' + save.dailyMin[d]).join('　') + '</div>';
      const row = el('div', 'row');
      const sndBtn = el('button', 'mbtn ghost', save.settings.sound ? '声音：开' : '声音：关');
      sndBtn.onclick = () => { save.settings.sound = !save.settings.sound; store.persist(); sndBtn.textContent = save.settings.sound ? '声音：开' : '声音：关'; };
      const ttsBtn = el('button', 'mbtn ghost', save.settings.tts ? '语音：开' : '语音：关');
      ttsBtn.onclick = () => { save.settings.tts = !save.settings.tts; store.persist(); ttsBtn.textContent = save.settings.tts ? '语音：开' : '语音：关'; };
      const volIn = el('input'); volIn.type = 'range'; volIn.min = 0; volIn.max = 100; volIn.value = save.settings.vol * 100; volIn.style.width = '110px';
      volIn.oninput = () => { save.settings.vol = volIn.value / 100; store.persist(); };
      row.appendChild(sndBtn); row.appendChild(ttsBtn); row.appendChild(volIn);
      const row2 = el('div', 'row');
      /* 今日多玩：家长手动输入今日多玩关数（0-30，替换旧值）——家长在场时灵活放宽，不必等明天 */
      const bonusRow = el('div', 'row');
      bonusRow.appendChild(el('span', '', '今日多玩关数：'));
      const bIn = el('input'); bIn.type = 'number'; bIn.min = 0; bIn.max = 30; bIn.value = calendar.bonusToday();
      bIn.style.width = '80px';
      const bOk = el('button', 'mbtn', '确定');
      const bTip = el('span', '', '');
      const refreshTip = () => { bTip.innerHTML = '<span style="font-size:12px;color:#8A7B6C">今日已在基数上加 ' + calendar.bonusToday() + ' 关（上限 30）</span>'; };
      refreshTip();
      bOk.onclick = () => { calendar.bonusSet(parseInt(bIn.value, 10)); bIn.value = calendar.bonusToday(); refreshTip(); };
      bonusRow.appendChild(bIn); bonusRow.appendChild(bOk); bonusRow.appendChild(bTip);
      const exp = el('button', 'mbtn', '导出存档');
      exp.onclick = () => {
        const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
        const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'kidsgame-' + cfg.game + '-' + todayStr() + '.json'; a.click();
      };
      const imp = el('button', 'mbtn ghost', '导入存档');
      imp.onclick = () => {
        const inp = el('input'); inp.type = 'file'; inp.accept = '.json';
        inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader();
          r.onload = () => { try { const j = JSON.parse(r.result); if (j && j.v === VER && j.game === cfg.game) { save = j; store.persist(); location.reload(); } else alert('存档格式不匹配'); } catch (e) { alert('存档解析失败'); } };
          r.readAsText(f); };
        inp.click();
      };
      const reset = el('button', 'mbtn ghost', '重置进度');
      reset.onclick = () => { if (confirm('确定清空该游戏的全部进度吗？')) { try { localStorage.removeItem('kidsgame_' + cfg.game); } catch (e) {} location.reload(); } };
      row2.appendChild(exp); row2.appendChild(imp); row2.appendChild(reset);
      box.appendChild(row); box.appendChild(bonusRow); box.appendChild(row2);
      box.querySelector('.k-close').onclick = () => p.remove();
      p.appendChild(box); document.body.appendChild(p);
    }
  };

  /* ---------- 小兔子 SVG ---------- */
  const assets = {
    rabbit(pose = 'normal', size = 120) {
      const eyes = pose === 'happy'
        ? '<path d="M44 62 q5 -7 10 0" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M66 62 q5 -7 10 0" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        : pose === 'sleepy'
        ? '<path d="M42 63 h12 M64 63 h12" stroke="#4A3B2E" stroke-width="3.5" stroke-linecap="round"/><text x="88" y="30" font-size="16" fill="#8A7B6C">z z</text>'
        : '<circle cx="48" cy="62" r="4.5" fill="#4A3B2E"/><circle cx="72" cy="62" r="4.5" fill="#4A3B2E"/>';
      const mouth = pose === 'happy'
        ? '<path d="M55 74 q5 6 10 0" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : pose === 'sleepy'
        ? '<ellipse cx="60" cy="75" rx="3" ry="2" fill="#D98A8A"/>'
        : '<path d="M56 73 q2 3 4 0 q2 3 4 0" stroke="#4A3B2E" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
      const paw = pose === 'wave'
        ? '<circle cx="18" cy="55" r="9" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="2.5"/>'
        : '';
      return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<ellipse cx="60" cy="96" rx="26" ry="12" fill="#EFE3CD"/>' +
        '<ellipse cx="45" cy="28" rx="10" ry="26" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="2.5" transform="rotate(-10 45 28)"/>' +
        '<ellipse cx="45" cy="30" rx="4.5" ry="17" fill="#F2B8C6" transform="rotate(-10 45 30)"/>' +
        '<ellipse cx="76" cy="26" rx="10" ry="27" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="2.5" transform="rotate(14 76 26)"/>' +
        '<ellipse cx="76" cy="28" rx="4.5" ry="18" fill="#F2B8C6" transform="rotate(14 76 28)"/>' +
        '<circle cx="60" cy="68" r="38" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="2.5"/>' +
        '<ellipse cx="54" cy="56" rx="3" ry="2.2" fill="#D98A8A"/><ellipse cx="66" cy="56" rx="3" ry="2.2" fill="#D98A8A"/>' +
        '<ellipse cx="37" cy="74" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/><ellipse cx="83" cy="74" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>' +
        eyes + mouth + paw + '</svg>';
    }
  };

  /* ---------- init ---------- */
  function init(config) {
    cfg = Object.assign({ game: 'game', title: '游戏' }, config);
    store.load();
    ui.injectCss();
    document.addEventListener('pointerdown', () => audio.unlock(), { once: false });
    parent.init();
    session.start();
    return KIDS;
  }

  return { init, VER, store, audio, speak, voice, calendar, level, session, ui, parent, assets, _save: () => save };
})();
