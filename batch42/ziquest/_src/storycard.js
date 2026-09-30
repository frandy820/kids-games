/* ---------- storycard.js — story 节点最小剧情卡（首试版；M4 升级全功能播放器） ----------
 * 运行时依赖：ZQ_STORY/ZQ_CHARS/ZQ_MAP（game-data 块）、finishNode/toast（game-main）。
 * 形态：全屏夜空卡（区域强调色微光）→ 场景描述小字 + 台词逐句点按推进 → 末句「出发」完成。
 * story 完成即过：finishNode(key, 1)。无语音阶段（M5 注入后由 M4 播放器接管）。 */
(function () {
  'use strict';
  var IDX = null;                       /* key -> scene 对象 */
  var ST = { key: null, scene: null, i: 0, cool: 0, box: null };

  function buildIndex() {
    IDX = {};
    var regions = (typeof ZQ_MAP !== 'undefined' && ZQ_MAP.regions) || [];
    var scenes = {};
    ((typeof ZQ_STORY !== 'undefined' && ZQ_STORY.scenes) || []).forEach(function (s) { scenes[s.id] = s; });
    regions.forEach(function (r) {
      var sts = r.nodes.filter(function (n) { return n.type === 'story'; });
      sts.forEach(function (n, i) {
        var sid;
        if (r.id === 0) sid = i === 0 ? 'prologue_a' : 'prologue_b';
        else if (i === 0) sid = 'r' + r.id + '_open';
        else sid = (r.id === 7) ? 'r7_gala' : 'r' + r.id + '_gate';
        var sc = scenes[sid] || null;
        if (sc) sc._sid = sid;                    /* 场 id 挂载（语音键 zq_story_<sid>_<i+1>） */
        IDX[n.key] = sc;
      });
    });
  }

  function accent(rid) {
    var m = (typeof ZQ_CHARS !== 'undefined') && ZQ_CHARS[String(rid)];
    return (m && m.meta && m.meta.accent) || '#E8975A';
  }

  function el(tag, css, txt) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function closeBox() {
    if (ST.box && ST.box.parentNode) ST.box.parentNode.removeChild(ST.box);
    ST.box = null;
  }

  function done() {
    closeBox();
    if (ST.key) finishNode(ST.key, 1);   /* story 完成即过：1 星写档+解锁刷新+回图 */
    ST.key = null; ST.scene = null; ST.i = 0;
  }

  function renderLine() {
    var sc = ST.scene, lines = sc.lines, box = ST.box;
    box.querySelector('.zq-st-line').textContent = lines[ST.i].t;
    /* 长句缩字号：≤14 字 42px；每多 4 字 -4px，下限 26px */
    var L = lines[ST.i].t.length;
    var fs = Math.max(26, 42 - Math.max(0, L - 14) * 1.2);
    box.querySelector('.zq-st-line').style.fontSize = fs.toFixed(0) + 'px';
    var dots = box.querySelector('.zq-st-dots');
    dots.innerHTML = '';
    lines.forEach(function (_, k) {
      dots.appendChild(el('i', 'display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 5px;' +
        (k <= ST.i ? 'background:' + accent(sc.region) + ';' : 'background:rgba(255,255,255,.25);') +
        'transform:scale(' + (k === ST.i ? '1.35' : '1') + ');transition:transform .25s,background .25s;'));
    });
    var go = box.querySelector('.zq-st-go');
    go.style.opacity = ST.i === lines.length - 1 ? '1' : '0';
    go.style.pointerEvents = ST.i === lines.length - 1 ? 'auto' : 'none';
    box.querySelector('.zq-st-tap').style.opacity = ST.i === lines.length - 1 ? '0' : '.8';
    ST.cool = Date.now() + 350;          /* 防双击连跳 */
    /* 语音主通道化（2026-09-30）：逐句播 zq_story_<sid>_<i+1>（台词=6 岁理解主通道；M5 前移） */
    if (sc._sid && typeof KIDS !== 'undefined' && KIDS.voice && KIDS.voice.play) {
      try { KIDS.voice.play('zq_story_' + sc._sid + '_' + (ST.i + 1)); } catch (e) {}
    }
  }

  function start(key) {
    if (!IDX) buildIndex();
    var sc = IDX[key];
    if (!sc) return false;               /* 无场：回落 toast 占位 */
    ST.key = key; ST.scene = sc; ST.i = 0;
    var ac = accent(sc.region);
    var box = el('div', 'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;padding:36px 28px;box-sizing:border-box;cursor:pointer;' +
      'background:linear-gradient(175deg,#232946 0%,#2c3352 55%,' + ac + '22 100%);' +
      'font-family:inherit;');
    /* 场景条 */
    box.appendChild(el('div', 'position:absolute;top:22px;left:26px;right:120px;font-size:15px;line-height:1.5;' +
      'color:rgba(255,255,255,.62);text-align:left;', sc.scene));
    /* 跳过（命中区 96px） */
    var skip = el('div', 'position:absolute;top:12px;right:12px;width:96px;height:96px;display:flex;align-items:center;' +
      'justify-content:center;font-size:15px;color:rgba(255,255,255,.55);', '跳过');
    skip.onclick = function (ev) { ev.stopPropagation(); done(); };
    box.appendChild(skip);
    /* 派蒙星点（twinkle：transform/opacity only；z-index 9000 层内装饰） */
    var starD = 'M12 2l2.7 6.2 6.7.6-5.1 4.5 1.5 6.6L12 16.6 6.2 19.9l1.5-6.6-5.1-4.5 6.7-.6z';
    [[86, 120, 30, 0], [706, 168, 22, -2], [150, 214, 16, -4], [640, 96, 18, 1]].forEach(function (sp) {
      var st = el('div', 'position:absolute;left:' + sp[0] + 'px;top:' + sp[1] + 'px;width:' + sp[2] + 'px;height:' + sp[2] +
        'px;pointer-events:none;animation:zq-st-tw 2.6s ease-in-out ' + (sp[3] < 0 ? (-sp[3]) : sp[3]) + 's infinite;');
      st.innerHTML = '<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="' + starD +
        '" fill="#F5C445" opacity=".85"/></svg>';
      box.appendChild(st);
    });
    if (!document.getElementById('zq-st-tw')) {     /* 幂等：多场复用同一 keyframes */
      var stCss = document.createElement('style');
      stCss.id = 'zq-st-tw';
      stCss.textContent = '@keyframes zq-st-tw{0%,100%{transform:scale(.8);opacity:.35}50%{transform:scale(1.15);opacity:.9}}';
      document.head.appendChild(stCss);
    }
    /* 台词 */
    var line = el('div', 'zq-st-line;max-width:620px;text-align:center;color:#FBF6EC;font-weight:700;' +
      'line-height:1.65;letter-spacing:2px;min-height:130px;display:flex;align-items:center;justify-content:center;');
    line.className = 'zq-st-line';
    line.style.cssText = 'max-width:620px;text-align:center;color:#FBF6EC;font-weight:700;line-height:1.65;' +
      'letter-spacing:2px;min-height:130px;display:flex;align-items:center;justify-content:center;';
    box.appendChild(line);
    /* 进度点 */
    var dots = el('div', 'zq-st-dots;margin-top:30px;');
    dots.className = 'zq-st-dots';
    dots.style.cssText = 'margin-top:30px;';
    box.appendChild(dots);
    /* 提示/出发按钮 */
    var tap = el('div', '', '点一点，看下一句');
    tap.className = 'zq-st-tap';
    tap.style.cssText = 'margin-top:26px;font-size:14px;color:rgba(255,255,255,.8);transition:opacity .2s;';
    box.appendChild(tap);
    var go = el('div', 'zq-st-go;margin-top:24px;padding:18px 58px;border-radius:44px;font-size:26px;font-weight:700;' +
      'color:#232946;background:linear-gradient(180deg,' + zqLighten(ac, .35) + ',' + ac + ');box-shadow:inset 0 3px 0 rgba(255,255,255,.55),0 6px 0 rgba(0,0,0,.28);transition:opacity .3s;opacity:0;', '出发！');
    go.className = 'zq-st-go';
    go.style.cssText = 'margin-top:24px;padding:18px 58px;border-radius:44px;font-size:26px;font-weight:700;' +
      'color:#232946;background:linear-gradient(180deg,' + zqLighten(ac, .35) + ',' + ac + ');box-shadow:inset 0 3px 0 rgba(255,255,255,.55),0 6px 0 rgba(0,0,0,.28);transition:opacity .3s;opacity:0;';
    box.appendChild(go);
    box.onclick = function () {
      if (Date.now() < ST.cool) return;
      if (ST.i >= ST.scene.lines.length - 1) return;   /* 末句只按「出发」 */
      ST.i++; renderLine();
    };
    go.onclick = function (ev) { ev.stopPropagation(); done(); };
    document.body.appendChild(box);
    ST.box = box;
    renderLine();
    return true;
  }

  window.ZQ = window.ZQ || {};
  window.ZQ.Story = { start: start };
})();
