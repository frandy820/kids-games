/* home.js — M4 家园（v57）：金币商店 + 穿戴 + 地图兔上身效果。
   存档：z.dress={owned:[], worn:{slot:id}, home:{slot:id}}（core v1.0 既有字段，零迁移）。
   经济：z.coins + ZQ_CATALOG.meta.economy；解锁=unlock.region ≤ 迷雾已开区 / giftAt ≤ 累计学字数。
   装扮=手绘简笔 SVG（viewBox 120 与家族兔同坐标）；地图侧经 #zq-dress-slot 叠加
   （translate(-36,-76) scale(.6)——兔 svg 72px 即 120×0.6，与 game-main L5 一致）。 */
'use strict';
(function () {
  const WEAR_SLOTS = ['hat', 'dress', 'shoes', 'scarf', 'glass', 'bag'];
  const HOME_SLOTS = ['furn', 'plant', 'wall'];
  const SLOT_CN = { hat: '帽子', dress: '裙子', shoes: '鞋子', scarf: '围巾', glass: '眼镜', bag: '小包',
    furn: '家具', plant: '花草', wall: '墙饰' };
  const PAL = ['#F2A96B', '#8FBF7F', '#7FB3E0', '#F2B8C6', '#F5C445', '#B39DDB'];
  const pal = id => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return PAL[h % PAL.length];
  };
  const INK = '#4A3B2E';
  const item = id => ZQ_CATALOG.items.filter(x => x.id === id)[0] || null;

  /* ---------- 装扮简笔（viewBox 120；锚位与家族兔对齐：头顶 y≈30 / 眼 y62 / 身 y96） ---------- */
  function svgFor(it) {
    const col = pal(it.id);
    switch (it.slot) {
      case 'hat': return '<g><path d="M42 31q18 -27 36 0z" fill="' + col + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<path d="M38 31h44q3 0 3 3.5t-3 3.5h-44q-3 0-3-3.5t3-3.5z" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/></g>';
      case 'dress': return '<g><path d="M46 82l-9 26h46l-9-26q-14 6-28 0z" fill="' + col + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<path d="M48 82h24" stroke="' + INK + '" stroke-width="2" opacity=".4"/></g>';
      case 'shoes': return '<g><ellipse cx="48" cy="106" rx="10" ry="6" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<ellipse cx="72" cy="106" rx="10" ry="6" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/></g>';
      case 'scarf': return '<g><path d="M41 75q19 11 38 0l4 9q-23 12-46 0z" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M76 82l7 15" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></g>';
      case 'glass': return '<g><circle cx="48" cy="62" r="9.5" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
        '<circle cx="72" cy="62" r="9.5" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
        '<path d="M57.5 62h5M38.5 59l-7-3M81.5 59l7-3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="51" cy="58.5" r="2.2" fill="#FFF" opacity=".85"/></g>';
      case 'bag': return '<g><rect x="82" y="76" width="18" height="16" rx="4.5" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M86 76q4 -11 10 0" fill="none" stroke="' + INK + '" stroke-width="2.2"/></g>';
      case 'furn': return '<g><rect x="42" y="58" width="36" height="9" rx="3.5" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M47 67v24M73 67v24" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M60 67v10" stroke="' + INK + '" stroke-width="2" opacity=".4"/></g>';
      case 'plant': return '<g><path d="M50 76h20l-3 15h-14z" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M60 76v-17" stroke="#6B8F5A" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M60 62q-11 -2 -13 -13q11 0 13 13zM60 62q11 -2 13 -13q-11 0 -13 13z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></g>';
      case 'wall': return '<g><rect x="43" y="48" width="34" height="28" rx="3.5" fill="' + col + '" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M43 62h34M60 48v28" stroke="' + INK + '" stroke-width="2"/></g>';
    }
    return '';
  }
  const svgById = id => { const it = item(id); return it ? svgFor(it) : ''; };

  /* 当前穿戴层（worn 各 slot 拼一段，viewBox 120 内） */
  function wearLayers(z) {
    return WEAR_SLOTS.map(s => (z.dress.worn[s] ? svgById(z.dress.worn[s]) : '')).join('');
  }
  /* 试穿预览（家园页）：兔 base + 装扮层同框叠放 */
  function bunnyHtml(z) {
    return '<div class="zq-bunny"><div class="base">' + KIDS.assets.rabbit('happy', 140) + '</div>' +
      '<svg class="layer" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' + wearLayers(z) + '</svg></div>';
  }

  /* ---------- 地图兔上身（#zq-dress-slot——game-main L5 已建锚点） ---------- */
  function syncMapDress() {
    const slot = $id('zq-dress-slot');
    if (!slot) return;
    const l = wearLayers(zSave().zq);
    slot.innerHTML = l ? '<g transform="translate(-36,-76) scale(0.6)">' + l + '</g>' : '';
  }

  /* ---------- 商店逻辑 ---------- */
  /* 上架区判定=engine 纯函数 zqRegionOpen（与节点解锁同一真值源；禁读 fog DOM——
     其 gone class 是渲染态，与解锁判定存在时序差，v57 首版在此误判全店 locked） */
  function maxRegion() {
    const sv = zSave();
    let m = 0;
    for (let r = 1; r <= 7; r++) { if (zqRegionOpen(sv, r)) m = r; }
    return m;
  }
  function persist() { if (SAVE && !VERIFY && SAVE === KIDS._save()) KIDS.store.persist(); }

  /* 商品状态机：owned / worn（穿了）/ claim（礼物可领）/ buy（可购）/ poor（钱不够）/ far（礼物未到）/ locked（区未开） */
  function stateOf(z, it) {
    const placed = it.cat === 'home' ? z.dress.home[it.slot] === it.id : z.dress.worn[it.slot] === it.id;
    if (placed) return 'worn';
    if (z.dress.owned.indexOf(it.id) >= 0) return 'owned';
    if (it.giftAt) return Object.keys(z.dex).length >= it.giftAt ? 'claim' : 'far';
    if (it.unlock.region > maxRegion()) return 'locked';
    return z.coins >= it.price ? 'buy' : 'poor';
  }

  function tap(it) {
    if (!SAVE) { toast('这一页在验收模式，只看不买哦'); return; }        /* VERIFY 空档禁写 */
    const z = SAVE.zq;
    const st = stateOf(z, it);
    const isHome = it.cat === 'home';
    const box = isHome ? z.dress.home : z.dress.worn;
    if (st === 'worn') { delete box[it.slot]; toast('已脱下 ' + it.name); }
    else if (st === 'owned') { box[it.slot] = it.id; toast((isHome ? '摆好了 ' : '穿上了 ') + it.name); }
    else if (st === 'claim') { z.dress.owned.push(it.id); box[it.slot] = it.id; toast('礼物 ' + it.name + ' 领到啦！'); }
    else if (st === 'buy') {
      z.coins -= it.price;
      z.dress.owned.push(it.id);
      box[it.slot] = it.id;
      toast('买到了 ' + it.name + '！');
    } else if (st === 'poor') { toast('金币还差 ' + (it.price - z.coins) + '，去闯关攒攒吧'); return; }
    else if (st === 'far') { toast('再学 ' + (it.giftAt - Object.keys(z.dex).length) + ' 个字就能领 ' + it.name); return; }
    else if (st === 'locked') { toast('往前冒险，走到更远的地方就上架啦'); return; }
    persist();
    refreshHud();
    syncMapDress();
    render();
  }

  let tab = 'wear';
  function render() {
    const z = zSave().zq;
    const head = $id('zq-home-sub');
    if (head) head.textContent = '金币 ' + z.coins;
    const scene = $id('zq-scene');
    if (scene) {
      const hs = HOME_SLOTS.map(s => (z.dress.home[s] ? '<svg viewBox="0 0 120 120">' + svgById(z.dress.home[s]) + '</svg>' : '')).join('');
      scene.innerHTML = hs || '<span class="hint">买些家具花草，装扮小兔子的家</span>';
    }
    const bunny = $id('zq-bunny-box');
    if (bunny) bunny.innerHTML = bunnyHtml(z);
    const grid = $id('zq-home-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ZQ_CATALOG.items.filter(i => (tab === 'wear' ? i.cat === 'wear' : i.cat === 'home')).forEach(it => {
      const st = stateOf(z, it);
      const d = document.createElement('button');
      d.className = 'zq-item' + (st === 'worn' ? ' worn' : st === 'owned' ? ' owned' : st === 'claim' ? ' claim' : (st === 'poor' || st === 'far' || st === 'locked') ? ' cant' : '');
      const tag = st === 'worn' ? (it.cat === 'home' ? '摆着呢' : '穿着呢') :
        st === 'owned' ? '点我' + (it.cat === 'home' ? '摆上' : '穿上') :
        st === 'claim' ? '🎁 领取' :
        st === 'buy' || st === 'poor' ? '💰 ' + it.price :
        st === 'far' ? '再学 ' + (it.giftAt - Object.keys(z.dex).length) + ' 字' : '冒险解锁';
      d.innerHTML = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">' + svgFor(it) + '</svg>' +
        '<div class="nm">' + it.name + '</div><div class="tag">' + SLOT_CN[it.slot] + ' · ' + tag + '</div>';
      d.onclick = () => tap(it);
      grid.appendChild(d);
    });
  }

  function open() {
    close();
    const s = document.createElement('div');
    s.className = 'zq-sheet';
    s.id = 'zq-homeov';
    s.innerHTML =
      '<div class="zq-sheet-h"><button class="back" aria-label="返回冒险地图">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button><div class="tt">兔子家园</div><div class="sub" id="zq-home-sub"></div></div>' +
      '<div class="zq-body">' +
      '<div class="zq-home-top"><div id="zq-bunny-box"></div><div class="zq-homescene" id="zq-scene"></div></div>' +
      '<div class="zq-tabs" id="zq-home-tabs"></div>' +
      '<div class="zq-grid" id="zq-home-grid"></div></div>';
    s.querySelector('.back').onclick = close;
    const tabs = s.querySelector('#zq-home-tabs');
    [['wear', '穿搭'], ['home', '家居']].forEach(p => {
      const b = document.createElement('button');
      b.className = 'zq-tab' + (tab === p[0] ? ' on' : '');
      b.style.setProperty('--acc', p[0] === 'wear' ? '#F2A96B' : '#8FBF7F');
      b.textContent = p[1];
      b.onclick = () => { tab = p[0]; render(); };
      tabs.appendChild(b);
    });
    document.body.appendChild(s);
    render();
    if (!VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_map_open');
  }
  function close() { const s = $id('zq-homeov'); if (s) s.remove(); }

  window.ZQ.Home = { open: open, close: close, _render: render, _stateOf: stateOf };
  window.ZQ.Dress = { sync: syncMapDress, _svg: svgFor, _bunnyHtml: bunnyHtml };
  try { syncMapDress(); } catch (e) {}          /* 文件装载即上身（rabbitG 已由 buildMap 建好） */
})();
