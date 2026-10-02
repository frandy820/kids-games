/* comp.js — M4 伙伴（v57）：收集页 + 出战跟班 + friend 节点授予。
   存档：z.comp={cid:1,...,active:cid}（core v1.0 既有字段）；数据=ZQ_CATALOG.companions（7 只，一区一只）。
   跟班=地图兔后侧小圆脸（外 g attribute transform 定位 / 内 g CSS bob——两层防动画覆盖，同 L6 粒子池模式）。
   grant() VERIFY 空档只读返回（禁写档），真档首授自动出战——第一只伙伴马上看得见。 */
'use strict';
(function () {
  const INK = '#4A3B2E';
  const comp = id => ZQ_CATALOG.companions.filter(x => x.id === id)[0] || null;
  function persist() { if (SAVE && !VERIFY && SAVE === KIDS._save()) KIDS.store.persist(); }

  /* 伙伴头像简笔（viewBox 120 圆脸兔形，色=c.color——v1 统一形，名字/技能区分，v2 分物种） */
  function avaInner(c) {
    return '<ellipse cx="45" cy="26" rx="8" ry="18" fill="' + c.color + '" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-10 45 26)"/>' +
      '<ellipse cx="75" cy="26" rx="8" ry="18" fill="' + c.color + '" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 75 26)"/>' +
      '<circle cx="60" cy="62" r="30" fill="' + c.color + '" stroke="' + INK + '" stroke-width="2.8"/>' +
      '<circle cx="49" cy="58" r="3.6" fill="' + INK + '"/><circle cx="71" cy="58" r="3.6" fill="' + INK + '"/>' +
      '<path d="M53 70q7 6 14 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="40" cy="68" r="4.5" fill="#F2B8C6" opacity=".75"/><circle cx="80" cy="68" r="4.5" fill="#F2B8C6" opacity=".75"/>';
  }
  function avaSvg(c, size) {
    return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" fill="none">' + avaInner(c) + '</svg>';
  }

  /* ---------- 授予（friend 节点入口调；返回 {comp, already} 供仪式弹层） ---------- */
  function grant(cid) {
    const c = comp(cid);
    if (!c) return null;
    if (!SAVE) return { comp: c, already: !!zSave().zq.comp[cid] };     /* VERIFY 空档只读 */
    const z = SAVE.zq;
    const already = !!z.comp[cid];
    if (!already) {
      z.comp[cid] = 1;
      if (!z.comp.active) z.comp.active = cid;
      persist();
      syncMapPet();
    }
    return { comp: c, already: already };
  }

  /* ---------- 地图跟班 ---------- */
  function syncMapPet() {
    const old = $id('zq-pet-wrap');
    if (old) old.remove();
    const z = zSave().zq;
    const cid = z.comp.active;
    const c = cid && z.comp[cid] ? comp(cid) : null;
    if (!c || typeof rabbitG === 'undefined' || !rabbitG) return;
    const g = svgEl('g', { id: 'zq-pet-wrap', transform: 'translate(-56,-4) scale(0.4)' }, rabbitG);
    const inner = svgEl('g', { id: 'zq-pet' }, g);
    inner.innerHTML = avaInner(c);
  }

  /* ---------- 详情层（点伙伴卡：大头+台词+技能+出战/休息） ---------- */
  function detail(c) {
    closeDetail();
    const z = zSave().zq;
    const on = z.comp.active === c.id;
    const w = document.createElement('div');
    w.className = 'zq-bigwrap';
    w.id = 'zq-compbig';
    w.innerHTML = '<div class="zq-big">' +
      '<div class="comp-ava">' + avaSvg(c, 130) + '</div>' +
      '<div class="ch" style="font-size:26px">' + c.name + '</div>' +
      '<div class="desc">「' + c.lines[0] + '」</div>' +
      '<div class="desc"><b>' + c.skillName + '</b>：' + c.skillDesc + '</div>' +
      '<button class="listen">' + (on ? '让 TA 休息' : '让 TA 跟上') + '</button>' +
      '<button class="zq-big-x">关上</button></div>';
    w.querySelector('.listen').onclick = () => {
      if (!SAVE) { toast('验收模式里 TA 先歇着'); return; }
      const zz = SAVE.zq;
      zz.comp.active = zz.comp.active === c.id ? null : c.id;
      persist();
      syncMapPet();
      closeDetail();
      render();
      toast(zz.comp.active === c.id ? c.name + ' 跟上啦！' : c.name + ' 回去休息啦');
    };
    w.querySelector('.zq-big-x').onclick = closeDetail;
    w.addEventListener('click', e => { if (e.target === w) closeDetail(); });
    document.body.appendChild(w);
  }
  function closeDetail() { const b = $id('zq-compbig'); if (b) b.remove(); }

  function render() {
    const z = zSave().zq;
    const grid = $id('zq-comp-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ZQ_CATALOG.companions.forEach(c => {
      const own = !!z.comp[c.id];
      const on = z.comp.active === c.id;
      const d = document.createElement('button');
      d.className = 'zq-cc' + (own ? '' : ' lock') + (on ? ' on' : '');
      const rname = (ZQ_CHARS[String(c.region)] && ZQ_CHARS[String(c.region)].meta.name) || ('第' + c.region + '区');
      d.innerHTML = '<div class="ava">' + avaSvg(c, 66) + '</div>' +
        '<div class="nm">' + (own ? c.name : '？？？') + '</div>' +
        '<div class="sk">' + (own ? c.skillName : '在' + rname + '等你') + '</div>' +
        (on ? '<div class="go">★ 出战中</div>' : '');
      if (own) d.onclick = () => detail(c);
      grid.appendChild(d);
    });
    const sub = $id('zq-comp-sub');
    if (sub) {
      const n = ZQ_CATALOG.companions.filter(c => z.comp[c.id]).length;
      sub.textContent = '已收集 ' + n + ' / ' + ZQ_CATALOG.companions.length + ' 位小伙伴';
    }
  }

  function open() {
    close();
    const s = document.createElement('div');
    s.className = 'zq-sheet';
    s.id = 'zq-compov';
    s.innerHTML =
      '<div class="zq-sheet-h"><div class="tt">伙伴小屋</div><div class="sub" id="zq-comp-sub"></div>' +
      '<button class="x" aria-label="关上伙伴">✕</button></div>' +
      '<div class="zq-body"><div class="zq-grid" id="zq-comp-grid"></div></div>';
    s.querySelector('.x').onclick = close;
    document.body.appendChild(s);
    render();
    if (!VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_map_open');
  }
  function close() { const s = $id('zq-compov'); if (s) s.remove(); closeDetail(); }

  window.ZQ.Comp = { open: open, close: close, grant: grant, _render: render, _ava: avaSvg };
  try { syncMapPet(); } catch (e) {}
})();
