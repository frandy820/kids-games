/* dex.js — M4 图鉴（v57）：字卡册·区域分册·三态·点卡听音看图。
   数据真值源：ZQ_CHARS（data 块）/ z.dex（存档）/ ZQ_PICS（OpenMoji 换源后 66 张，无图走降级）。
   只读模块（收集页禁写档）；音键=zq_ch_<pyKey>（与 t2 同款）。 */
'use strict';
(function () {
  let curRegion = 1;

  /* 三态：未学 lock / 已学 st=1 seen / 掌握 st=2 master（core v1.0 语义） */
  function stateOf(z, ch) {
    const d = z.dex[ch];
    return d ? (d.st >= 2 ? 'master' : 'seen') : 'lock';
  }

  function closeBig() { const b = $id('zq-dexbig'); if (b) b.remove(); }

  /* 大字卡：图（有则）+ 大字 + 拼音 + 前两词 + 听一听；点卡即读一遍。
     图走 createElement+运行时赋 src 属性（家族外链门禁：产物 HTML 字符串禁裸 src 属性字面，同 t2 photo 模式） */
  function bigCard(c, st) {
    closeBig();
    const w = document.createElement('div');
    w.className = 'zq-bigwrap';
    w.id = 'zq-dexbig';
    const wds = (c.words || []).slice(0, 2).map(x => x[0]).join(' · ');
    w.innerHTML = '<div class="zq-big">' +
      '<div class="ch">' + c.ch + '</div>' +
      '<div class="py">' + (c.py || '') + (st === 'master' ? ' · 已掌握' : st === 'seen' ? ' · 学过啦' : '') + '</div>' +
      '<div class="wds">' + wds + '</div>' +
      '<button class="listen">🔊 听一听</button>' +
      '<button class="zq-big-x">关上</button></div>';
    const box = w.querySelector('.zq-big');
    if (typeof ZQ_PICS !== 'undefined' && ZQ_PICS[c.ch]) {
      const im = document.createElement('img');
      im.className = 'pic';
      im.alt = '';
      im.src = ZQ_PICS[c.ch];
      box.insertBefore(im, box.firstChild);
    }
    w.querySelector('.listen').onclick = () => {
      if (!VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_ch_' + c.pyKey);
    };
    w.querySelector('.zq-big-x').onclick = closeBig;
    w.addEventListener('click', e => { if (e.target === w) closeBig(); });
    document.body.appendChild(w);
    if (!VERIFY && st !== 'lock' && typeof KIDS !== 'undefined') KIDS.voice.play('zq_ch_' + c.pyKey);
  }

  function render() {
    const z = zSave().zq;
    const regions = Object.keys(ZQ_CHARS).map(Number).sort((a, b) => a - b);
    if (!regions.includes(curRegion)) curRegion = regions[0];
    /* 进度头（全区合计） */
    let total = 0, seen = 0, master = 0;
    regions.forEach(r => ZQ_CHARS[String(r)].chars.forEach(c => {
      total++;
      const s = stateOf(z, c.ch);
      if (s !== 'lock') seen++;
      if (s === 'master') master++;
    }));
    const sub = $id('zq-dex-sub');
    if (sub) sub.textContent = '认识 ' + seen + ' · 掌握 ' + master + ' / 共 ' + total + ' 字';
    /* 区域 chip 条 */
    const tabs = $id('zq-dex-tabs');
    if (tabs) {
      tabs.innerHTML = '';
      regions.forEach(r => {
        const b = document.createElement('button');
        b.className = 'zq-tab' + (r === curRegion ? ' on' : '');
        b.style.setProperty('--acc', zqAccent(r));
        b.textContent = ZQ_CHARS[String(r)].meta.name;
        b.onclick = () => { curRegion = r; render(); };
        tabs.appendChild(b);
      });
    }
    /* 字卡网格（未学=灰字+小锁角标——保留字形激发「想学」，不整卡遮死） */
    const grid = $id('zq-dex-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ZQ_CHARS[String(curRegion)].chars.forEach(c => {
      const s = stateOf(z, c.ch);
      const d = document.createElement('button');
      d.className = 'zq-gc ' + s;
      d.innerHTML = c.ch + (s === 'lock' ? '<i>🔒</i>' : '');
      d.onclick = () => bigCard(c, s);
      grid.appendChild(d);
    });
  }

  function open() {
    close();
    const s = document.createElement('div');
    s.className = 'zq-sheet';
    s.id = 'zq-dexov';
    s.innerHTML =
      '<div class="zq-sheet-h"><button class="back" aria-label="返回冒险地图">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button><div class="tt">汉字图鉴</div><div class="sub" id="zq-dex-sub"></div></div>' +
      '<div class="zq-tabs" id="zq-dex-tabs"></div>' +
      '<div class="zq-body"><div class="zq-grid" id="zq-dex-grid"></div></div>';
    s.querySelector('.back').onclick = close;
    document.body.appendChild(s);
    render();
    if (!VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_map_open');
  }
  function close() { const s = $id('zq-dexov'); if (s) s.remove(); closeBig(); }

  window.ZQ.Dex = { open: open, close: close, _render: render, _stateOf: stateOf };
})();
