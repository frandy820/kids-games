# -*- coding: utf-8 -*-
"""batch4 视觉/儿童适配审计（纯 DOM 断言：几何 + 计算样式对比度；不识图）
用法: python _v4_visual_audit.py
独立 p.chromium.launch() 无头；不 connect / 不杀任何浏览器进程。
产物: shots/v4_*.png + shots/v4_audit_data.json
"""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path('F:/claudecode/projects/active/kids-games/batch4')
SHOTS = BASE / 'shots'; SHOTS.mkdir(exist_ok=True)
DATA = {}

VPS = [('lp', 1280, 800), ('pt', 800, 1180)]

UTIL = r"""(() => {
  if (window.__v4) return; window.__v4 = true;
  const parse = c => {
    if (c == null) return null; c = String(c).trim();
    let m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0,2),16), parseInt(m[1].slice(2,4),16), parseInt(m[1].slice(4,6),16), 1];
    m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return [17*parseInt(m[1][0],16), 17*parseInt(m[1][1],16), 17*parseInt(m[1][2],16), 1];
    m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(',').map(s => parseFloat(s)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    if (c === 'transparent') return [0,0,0,0];
    return null;
  };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const blend = (fg, bg) => { const a = fg[3] == null ? 1 : fg[3];
    return [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1]; };
  window.__V = {
    parse, lum, blend,
    ratio(a, b) { const l1 = lum(a), l2 = lum(b); return Math.round((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)*100)/100; },
    effBg(el) { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c[3] > 0) return c; e = e.parentElement; } return parse('#FBF6EC'); },
    elC(sel) { const el = document.querySelector(sel); if (!el) return null;
      const cs = getComputedStyle(el); const fg = parse(cs.color), bg = this.effBg(el);
      return { fg: cs.color, bg: 'rgb(' + Math.round(bg[0]) + ',' + Math.round(bg[1]) + ',' + Math.round(bg[2]) + ')',
        ratio: this.ratio(fg, bg), fontPx: cs.fontSize, weight: cs.fontWeight }; },
    rects(sel) { const out = []; document.querySelectorAll(sel).forEach(e => {
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        if (getComputedStyle(e).display === 'none') return;
        out.push({ cls: String(e.className).slice(0, 44), x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height), rgt: Math.round(r.right), btm: Math.round(r.bottom) }); });
      return out; },
    occl(sel) { const bad = [];
      document.querySelectorAll(sel).forEach(e => {
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        if (cx < 1 || cy < 1 || cx > innerWidth - 1 || cy > innerHeight - 1) {
          bad.push({ cls: String(e.className).slice(0, 40), why: 'outside-viewport' }); return; }
        const t = document.elementFromPoint(cx, cy);
        if (t && t !== e && !e.contains(t) && !t.contains(e)) {
          const tc = t.className; const tn = t.tagName + '.' + String(tc.baseVal !== undefined ? tc.baseVal : tc);
          bad.push({ cls: String(e.className).slice(0, 40), by: tn.slice(0, 56) }); }
      });
      return bad; },
    gapRow(sel) { const es = [...document.querySelectorAll(sel)].map(e => e.getBoundingClientRect()).filter(r => r.width > 2)
        .sort((a, b) => a.left - b.left);
      let hg = null, vg = null;
      for (let i = 1; i < es.length; i++) { const a = es[i-1], b = es[i];
        if (Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom)) { const g = Math.round(b.left - a.right); hg = hg == null ? g : Math.min(hg, g); }
        else { const g = Math.round(b.top - a.bottom); vg = vg == null ? g : Math.min(vg, g); } }
      return { hgap: hg, vgap: vg }; },
    oX() { return document.documentElement.scrollWidth - document.documentElement.clientWidth; },
    zones(ids) { const z = {}; ids.forEach(id => { const e = document.getElementById(id); if (!e) return;
        const r = e.getBoundingClientRect(); z[id] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
      return z; },
    inter(a, b) { const ea = document.getElementById(a), eb = document.getElementById(b); if (!ea || !eb) return null;
      const r1 = ea.getBoundingClientRect(), r2 = eb.getBoundingClientRect();
      const ox = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
      const oy = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
      return { ox: Math.round(ox), oy: Math.round(oy) }; },
    svgPart(sel, attr) { const el = document.querySelector(sel); if (!el) return null;
      const cs = getComputedStyle(el); const v = attr === 'stroke' ? cs.stroke : cs.fill;
      const op = parseFloat(el.getAttribute('opacity') || '1');
      const c = parse(v); return { color: v, rgba: c, opacity: op }; }
  };
})()"""

def seed_js(game, upto):
    short = 'sud' if game == 'sudoku' else game  # 游戏实际读取的短键：sv.clock / sv.times / sv.sud
    return ("(() => { try { const game = '" + game + "', upto = " + str(upto) + """;
      const d = new Date(); const today = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const levels = {};
      for (let i = 0; i < upto; i++) levels[(Math.floor(i/5)+1) + '-' + (i%5)] = { stars: 3, plays: 1 };
      const save = { v: '1.0', game, firstDay: '2026-08-01', lastDay: today, levels, dailyMin: {},
        settings: { sound: true, tts: true, vol: 0.6 }, restTip: { day: '', shown: 0 }, bonus: {} };
      save.bonus[today] = 12;
      save['""" + short + """'] = { tutSeen: true, dialSeen: true };
      localStorage.setItem('kidsgame_' + game, JSON.stringify(save));
    } catch (e) {} })();""")

def base_m(main_sel, zone_ids, extra=''):
    return "(() => { " + UTIL + """; return JSON.stringify({
      overflowX: __V.oX(),
      main: __V.rects('@@MAIN@@'),
      dock: __V.rects('#dock button'),
      occl: __V.occl('@@MAIN@@, #dock button'),
      gapsMain: __V.gapRow('@@MAIN@@'),
      gapsDock: __V.gapRow('#dock button'),
      zones: __V.zones(@@ZONES@@),
      inputs: document.querySelectorAll('input,textarea').length @@EXTRA@@
    }); })()""".replace('@@MAIN@@', main_sel).replace('@@ZONES@@', json.dumps(zone_ids)).replace('@@EXTRA@@', extra)

def measure(pg, js):
    return json.loads(pg.evaluate(js))

def shoot(pg, name):
    pg.screenshot(path=str(SHOTS / (name + '.png')))

# ---------------- 每游戏每状态的采集器 ----------------

def clock_state(pg, vp_tag, state):
    main = '.opt' if state != 'ch3' else '.clock-card'
    zones = ['hud', 'stage', 'clock-zone', 'prompt', 'answers', 'dock']
    extra = (""",
      clockSize: (function(){ const s = document.querySelector('svg.clock'); return s ? (function(r){ return { w: Math.round(r.width), h: Math.round(r.height) }; })(s.getBoundingClientRect()) : null; })(),
      contrast: {
        opt: __V.elC('.opt'),
        cap: __V.elC('.clock-cap'),
        chip: __V.elC('#prompt-chip.show .big'),
        readout: document.getElementById('dial-readout').classList.contains('show') ? __V.elC('#dial-readout') : null,
        num: (function(){ const t = document.querySelector('svg.clock text'); if (!t) return null;
          const f = __V.parse(getComputedStyle(t).fill); const op = parseFloat(t.getAttribute('opacity') || '1');
          const face = __V.parse([].slice.call(document.querySelectorAll('svg.clock circle')).map(c => c.getAttribute('fill')).filter(v => v === '#FFF9EE')[0] || '#FFF9EE');
          const eff = __V.blend([f[0], f[1], f[2], op], face);
          return { opacity: op, ratio: __V.ratio(eff, face) }; })(),
        tickShort: (function(){ const l = [].slice.call(document.querySelectorAll('svg.clock line[opacity]'))[0]; if (!l) return null;
          const f = __V.parse(getComputedStyle(l).stroke); const op = parseFloat(l.getAttribute('opacity'));
          const face = __V.parse('#FFF9EE'); const eff = __V.blend([f[0], f[1], f[2], op], face);
          return { opacity: op, ratio: __V.ratio(eff, face) }; })(),
        hourHand: (function(){ const p = __V.svgPart('svg.clock .clk-h', 'stroke'); if (!p) return null;
          const face = __V.parse('#FFF9EE'); return { color: p.color, ratio: __V.ratio(p.rgba, face) }; })(),
        minHand: (function(){ const p = __V.svgPart('svg.clock .clk-m', 'stroke'); if (!p) return null;
          const face = __V.parse('#FFF9EE'); return { color: p.color, ratio: __V.ratio(p.rgba, face) }; })()
      }""")
    if state == 'ch3':
        extra += """,
      ring: (function(){ const p = __V.svgPart('svg.clock .dialring', 'stroke'); if (!p) return null;
        const bg = __V.parse('#FBF6EC'); return { color: p.color, ratio: __V.ratio(p.rgba, bg) }; })()"""
    js = base_m(main, zones, extra)
    d = measure(pg, js)
    d['vp'] = vp_tag; d['state'] = state
    return d

def clock_feedback(pg, vp_tag):
    out = {'vp': vp_tag}
    q = pg.evaluate("() => CLK.quiz")
    wrong = next(i for i in range(len(q['items'])) if i != q['answer'])
    pg.evaluate("() => CLK.pick(%d)" % wrong)
    pg.wait_for_timeout(300)
    out['wrong'] = pg.evaluate("(() => {" + UTIL + """; const el = document.querySelector('.opt.wrong'); if (!el) return null;
      const cs = getComputedStyle(el); const fg = __V.parse(cs.color), bg = __V.parse(cs.backgroundColor);
      return { fg: cs.color, bg: cs.backgroundColor, ratio: __V.ratio(fg, bg) }; })()""")
    shoot(pg, 'v4_clock_wrong_' + vp_tag)
    pg.wait_for_timeout(700)
    # fire-and-forget：不等 pick 内部 880ms（否则 re-render 已清掉 .right）
    q2 = pg.evaluate("() => CLK.quiz")
    pg.evaluate("() => { CLK.pick(%d); return 1; }" % q2['answer'])
    pg.wait_for_timeout(320)
    out['right'] = pg.evaluate("(() => {" + UTIL + """; const el = document.querySelector('.opt.right'); if (!el) return null;
      const cs = getComputedStyle(el); const fg = __V.parse(cs.color), bg = __V.parse(cs.backgroundColor);
      const mk = el.querySelector('.mark'); const mr = mk ? mk.getBoundingClientRect() : null;
      return { fg: cs.color, bg: cs.backgroundColor, ratio: __V.ratio(fg, bg),
        mark: mr ? { w: Math.round(mr.width), h: Math.round(mr.height) } : null }; })()""")
    shoot(pg, 'v4_clock_right_' + vp_tag)
    pg.wait_for_timeout(900)
    return out

def times_state(pg, vp_tag, state):
    main = '.fish-btn'
    zones = ['hud', 'pond-wrap', 'fish-grid', 'quiz-card', 'dock']
    extra = """,
      quiz: __V.elC('#quiz-text'),
      qm: (function(){ const el = document.getElementById('qm'); if (!el) return null;
        const cs = getComputedStyle(el); const fg = __V.parse(cs.color), bg = __V.parse('#FBF6EC');
        return { fg: cs.color, ratio: __V.ratio(fg, bg), fontPx: cs.fontSize }; })(),
      bubble: __V.elC('.fish-btn .bubble'),
      bubbleW: (function(){ const b = document.querySelector('.fish-btn .bubble'); const r = b.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      fishSvgVsPond: (function(){ const pond = __V.parse(getComputedStyle(document.getElementById('pond')).backgroundColor);
        const out = [];
        [].slice.call(document.querySelectorAll('.fish-btn svg ellipse')).slice(0, 4).forEach(function(e, i) {
          const c = __V.parse(e.getAttribute('fill'));
          out.push({ fish: i, body: e.getAttribute('fill'), vsPond: __V.ratio(c, pond), vsWater: __V.ratio(c, __V.parse('#B9D5C8')) });
        }); return out; })(),
      groupsBtn: (function(){ const b = document.getElementById('btn-groups'); if (!b) return null;
        const cs = getComputedStyle(b); const fg = __V.parse(cs.color), bg = __V.parse(cs.backgroundColor);
        const r = b.getBoundingClientRect(); return { display: cs.display, fg: cs.color, ratio: __V.ratio(fg, bg), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      quizTextR: (function(){ const r = document.getElementById('quiz-text').getBoundingClientRect();
        return { w: Math.round(r.width), fontPx: getComputedStyle(document.getElementById('quiz-text')).fontSize }; })()"""
    if state == 'aid':
        extra += """,
      aid: { rect: __V.zones(['aid']).aid,
        title: __V.elC('#aid .aid-title'), cap: __V.elC('#aid .aid-cap'),
        plus: __V.elC('.a-plus'),
        ansSize: __V.rects('.aid-ans'), ansOccl: __V.occl('.aid-ans, #dock button'),
        groups: __V.rects('.a-group'),
        aidVsQuiz: __V.inter('aid', 'quiz-card'), aidVsDock: __V.inter('aid', 'dock'),
        aidAnsGap: __V.gapRow('.aid-ans') }"""
    js = base_m(main, zones, extra)
    d = measure(pg, js)
    d['vp'] = vp_tag; d['state'] = state
    return d

def times_convert(pg, vp_tag):
    q = pg.evaluate("() => TIM.quiz")
    out = {'vp': vp_tag, 'qtype': q['type']}
    if q['type'] == 'sum':
        pg.evaluate("() => { TIM.pick(%d); return 1; }" % q['answerIdx'])  # fire-and-forget
        pg.wait_for_timeout(1250)  # 780ms 锁定后 convert 弹出，仍在 1650ms 窗口内
        out['convert'] = pg.evaluate("(() => {" + UTIL + """; const c = document.getElementById('convert'); const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect(); const pond = document.getElementById('pond').getBoundingClientRect();
      const sum = c.querySelector('.cv-sum'), mul = c.querySelector('.cv-mul');
      return { shown: c.classList.contains('show'), w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.left), y: Math.round(r.top), fontPx: cs.fontSize,
        overPondL: Math.round(pond.left - r.left), overPondR: Math.round(r.right - pond.right),
        sum: sum ? { fg: getComputedStyle(sum).color, ratio: __V.ratio(__V.parse(getComputedStyle(sum).color), __V.parse('#FFF9EE')) } : null,
        mul: mul ? { fg: getComputedStyle(mul).color, ratio: __V.ratio(__V.parse(getComputedStyle(mul).color), __V.parse('#FFF9EE')) } : null }; })()""")
        shoot(pg, 'v4_times_convert_' + vp_tag)
        pg.wait_for_timeout(1400)
    return out

def sudoku_state(pg, vp_tag, state):
    main = '.cell, .abtn'
    zones = ['hud', 'stage', 'board', 'animals', 'dock']
    extra = """,
      n: (document.querySelectorAll('.cell').length > 0 ? Math.round(Math.sqrt(document.querySelectorAll('.cell').length)) : null),
      cells: __V.rects('.cell'),
      abtns: __V.rects('.abtn'),
      gapCells: __V.gapRow('.cell'),
      gapAbtn: __V.gapRow('.abtn'),
      board: __V.zones(['board']).board,
      contrast: {
        cellBorderVsSelf: (function(){ const e = document.querySelector('.cell:not(.bx1):not(.given)'); if (!e) return null;
          const cs = getComputedStyle(e); return { border: cs.borderTopColor, bg: cs.backgroundColor,
            ratio: __V.ratio(__V.parse(cs.borderTopColor), __V.parse(cs.backgroundColor)) }; })(),
        bx1VsNormal: (function(){ const a = document.querySelector('.cell:not(.bx1):not(.given)'), b = document.querySelector('.cell.bx1:not(.given)');
          if (!a || !b) return null; return { normal: getComputedStyle(a).backgroundColor, bx1: getComputedStyle(b).backgroundColor,
            ratio: __V.ratio(__V.parse(getComputedStyle(b).backgroundColor), __V.parse(getComputedStyle(a).backgroundColor)) }; })(),
        givenVsNormal: (function(){ const a = document.querySelector('.cell:not(.given)'), b = document.querySelector('.cell.given:not(.bx1)');
          if (!a || !b) return null; return { ratio: __V.ratio(__V.parse(getComputedStyle(b).backgroundColor), __V.parse(getComputedStyle(a).backgroundColor)),
            givenBorder: getComputedStyle(b).borderTopColor,
            borderRatio: __V.ratio(__V.parse(getComputedStyle(b).borderTopColor), __V.parse(getComputedStyle(b).backgroundColor)) }; })(),
        givenOnBx1VsBx1: (function(){ const b = document.querySelector('.cell.bx1.given'), o = document.querySelector('.cell.bx1:not(.given)');
          if (!b || !o) return null; return __V.ratio(__V.parse(getComputedStyle(b).backgroundColor), __V.parse(getComputedStyle(o).backgroundColor)); })(),
        animals: (function(){ const out = [];
          [].slice.call(document.querySelectorAll('.abtn svg')).forEach(function(svg, idx) {
            const stroked = [].slice.call(svg.querySelectorAll('[stroke="#4A3B2E"]')).filter(function(s){ return s.getAttribute('fill') && s.getAttribute('fill') !== 'none'; });
            if (!stroked.length) return;
            const body = stroked[stroked.length - 1].getAttribute('fill');
            const c = __V.parse(body);
            out.push({ idx: idx, body: body,
              vsPaper: __V.ratio(c, __V.parse('#FFF9EE')), vsBx1: __V.ratio(c, __V.parse('#F0E5C9')), vsGiven: __V.ratio(c, __V.parse('#EBDDBE')) });
          }); return out; })(),
        paw: (function(){ const p = document.querySelector('.cell .ph'); if (!p) return null;
          const c = __V.parse('#4A3B2E'); const bg = __V.parse('#FFF9EE');
          return { ratio: __V.ratio(__V.blend([c[0], c[1], c[2], 0.16], bg), bg) }; })(),
        lampLit: (function(){ const l = document.querySelector('#hint-lamps i:not(.off)'); if (!l) return null;
          const cs = getComputedStyle(l); const body = __V.parse('#FBF6EC'); return { bg: cs.backgroundColor, vsBody: __V.ratio(__V.parse(cs.backgroundColor), body) }; })(),
        lampOff: (function(){ const l = document.querySelector('#hint-lamps i.off'); if (!l) return null;
          const cs = getComputedStyle(l); return { bg: cs.backgroundColor }; })(),
        lampLitVsOff: (function(){ const a = document.querySelector('#hint-lamps i:not(.off)'), b = document.querySelector('#hint-lamps i.off');
          if (!a || !b) return null; return __V.ratio(__V.parse(getComputedStyle(a).backgroundColor), __V.parse(getComputedStyle(b).backgroundColor)); })()
      }"""
    js = base_m(main, zones, extra)
    d = measure(pg, js)
    d['vp'] = vp_tag; d['state'] = state
    return d

def sudoku_conflict(pg, vp_tag):
    out = pg.evaluate("(() => {" + UTIL + """
      const b = window.SUD.board, sol = window.SUD.solution, n = b.n;
      const boxR = n === 4 ? 2 : 2, boxC = n === 4 ? 2 : 3;
      let target = -1, wv = -1;
      for (let i = 0; i < b.cells.length && target < 0; i++) {
        if (b.given[i] || b.cells[i] >= 0) continue;
        for (let v = 0; v < n; v++) {
          if (v === sol[i]) continue;
          let conf = false;
          for (let j = 0; j < b.cells.length; j++) {
            if (j === i || b.cells[j] !== v) continue;
            const r1 = (i/n)|0, c1 = i%n, r2 = (j/n)|0, c2 = j%n;
            if (r1 === r2 || c1 === c2 || (((r1/boxR)|0) === ((r2/boxR)|0) && ((c1/boxC)|0) === ((c2/boxC)|0))) { conf = true; break; }
          }
          if (conf) { target = i; wv = v; break; }
        }
      }
      if (target < 0) return { ok: false };
      const filled = window.SUD.fill(target, wv);
      const el = document.querySelectorAll('.cell')[target];
      const cs = getComputedStyle(el);
      const res = { ok: filled, border: cs.borderTopColor, bg: cs.backgroundColor,
        borderVsBg: __V.ratio(__V.parse(cs.borderTopColor), __V.parse(cs.backgroundColor)),
        borderVsPaper: __V.ratio(__V.parse(cs.borderTopColor), __V.parse('#FFF9EE')),
        conflictedCount: document.querySelectorAll('.cell.conflict').length };
      window.SUD.clear(target);
      return res; })()""")
    out['vp'] = vp_tag
    return out

def sudoku_sel(pg, vp_tag):
    out = pg.evaluate("(() => {" + UTIL + """
      const b = window.SUD.board;
      let target = -1; for (let i = 0; i < b.cells.length; i++) if (!b.given[i] && b.cells[i] < 0) { target = i; break; }
      const el = document.querySelectorAll('.cell')[target];
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));
      const cs = getComputedStyle(el);
      const r = { selected: el.classList.contains('sel'), border: cs.borderTopColor, bg: cs.backgroundColor,
        borderVsBg: __V.ratio(__V.parse(cs.borderTopColor), __V.parse(cs.backgroundColor)),
        boxShadow: cs.boxShadow.slice(0, 60) };
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));
      return r; })()""")
    out['vp'] = vp_tag
    return out

def hint_state(pg, game, vp_tag, hook):
    out = {}
    if game == 'sudoku':
        out = pg.evaluate("(() => {" + UTIL + """; const h = window.SUD.hint(); if (!h) return { ok: false };
      const cell = document.querySelectorAll('.cell')[h.cell], ab = document.querySelectorAll('.abtn')[h.animal];
      const g = document.getElementById('ghost');
      return { ok: true, cellPulse: cell.className.includes('pulse'), abtnPulse: ab.className.includes('pulse'),
        ghostShow: g.className.includes('show'),
        ghostRect: (function(r){ return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })(g.getBoundingClientRect()),
        inViewport: (function(r){ return r.left > -80 && r.top > -80 && r.right < innerWidth + 80 && r.bottom < innerHeight + 80; })(g.getBoundingClientRect()) }; })()""")
        pg.wait_for_timeout(650)  # 等 ghost opacity 过渡(.4s)结束
        out['ghostOpacity'] = pg.evaluate("() => getComputedStyle(document.getElementById('ghost')).opacity")
        shoot(pg, 'v4_sudoku_hint_' + vp_tag)
    out['vp'] = vp_tag
    return out

def tutorial_run(browser, game, hook):
    url = 'file:///' + str(BASE / game / 'index.html').replace('\\', '/')
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(url)
    ghost = None; t0 = time.time()
    while time.time() - t0 < 14:
        v = pg.evaluate("""() => { const g = document.getElementById('ghost'); if (!g) return null;
          const cs = getComputedStyle(g); const r = g.getBoundingClientRect();
          return { show: g.classList.contains('show'), opacity: cs.opacity,
            x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }""")
        if v and v['show']:
            v['inViewport'] = -20 < v['x'] and v['x'] < 1280 and -20 < v['y'] and v['y'] < 800
            ghost = v; break
        pg.wait_for_timeout(300)
    shoot(pg, 'v4_' + game + '_tut_lp')
    tut_state = pg.evaluate("() => window.%s && window.%s.tutorial" % (hook.upper(), hook.upper()))
    pg.close()
    return {'ghost': ghost, 'tutorial': tut_state}

def EV(pg, js, tag):
    try:
        return pg.evaluate(js)
    except Exception as e:
        print('EVAL-FAIL@', tag, str(e)[:160])
        print('JS-HEAD:', js[:220].replace('\n', ' '))
        raise

with sync_playwright() as p:
    browser = p.chromium.launch()
    print('== tut clock ==', flush=True)
    DATA['clock'] = {'states': {}, 'feedback': {}, 'tutorial': tutorial_run(browser, 'clock', 'clk')}
    for tag, w, h in VPS:
        for flat, state in [(0, 'ch1'), (10, 'ch3'), (15, 'ch4')]:
            print('== clock', state, tag, flush=True)
            url = 'file:///' + str(BASE / 'clock' / 'index.html').replace('\\', '/')
            pg = browser.new_page(viewport={'width': w, 'height': h})
            pg.add_init_script(seed_js('clock', flat))
            pg.goto(url); pg.wait_for_timeout(1300)
            DATA['clock']['states'][state + '_' + tag] = clock_state(pg, tag, state)
            shoot(pg, 'v4_clock_' + state + '_' + tag)
            if state == 'ch1':
                DATA['clock']['feedback'][tag] = clock_feedback(pg, tag)
            pg.close()

    print('== tut times ==', flush=True)
    DATA['times'] = {'states': {}, 'convert': {}, 'tutorial': tutorial_run(browser, 'times', 'tim')}
    for tag, w, h in VPS:
        for flat, state in [(0, 'ch1'), (15, 'ch4')]:
            print('== times', state, tag, flush=True)
            url = 'file:///' + str(BASE / 'times' / 'index.html').replace('\\', '/')
            pg = browser.new_page(viewport={'width': w, 'height': h})
            pg.add_init_script(seed_js('times', flat))
            pg.goto(url); pg.wait_for_timeout(1300)
            d = times_state(pg, tag, state)
            if state == 'ch1':
                q = pg.evaluate("() => TIM.quiz")
                wrong = next(i for i in range(len(q['items'])) if i != q['answerIdx'])
                pg.evaluate("() => TIM.pick(%d)" % wrong)
                pg.wait_for_timeout(350)
                d['wrongFish'] = pg.evaluate("(() => {" + UTIL + """; const el = document.querySelector('.fish-btn.wrong .bubble'); if (!el) return null;
                  const cs = getComputedStyle(el); return { fg: cs.color, bg: cs.backgroundColor, ratio: __V.ratio(__V.parse(cs.color), __V.parse(cs.backgroundColor)) }; })()""")
                d['aidOpen'] = pg.evaluate("() => document.getElementById('aid').className")
                shoot(pg, 'v4_times_wrong-aid_' + tag)
                d2 = times_state(pg, tag, 'aid')
                DATA['times']['states']['aid_' + tag] = d2
            DATA['times']['states'][state + '_' + tag] = d
            shoot(pg, 'v4_times_' + state + '_' + tag)
            if state == 'ch1':
                DATA['times']['convert'][tag] = times_convert(pg, tag)
                # 答对态（fire-and-forget，在 780ms 锁定期内量）
                q2 = pg.evaluate("() => TIM.quiz")
                if q2:
                    pg.evaluate("() => { TIM.pick(%d); return 1; }" % q2['answerIdx'])
                    pg.wait_for_timeout(320)
                    DATA['times']['right_' + tag] = pg.evaluate("(() => {" + UTIL + """; const el = document.querySelector('.fish-btn.right .bubble'); const qm = document.getElementById('qm');
                      const out = {};
                      if (el) { const cs = getComputedStyle(el); out.bubble = { fg: cs.color, bg: cs.backgroundColor, ratio: __V.ratio(__V.parse(cs.color), __V.parse(cs.backgroundColor)) }; }
                      if (qm) { const cs2 = getComputedStyle(qm); out.qmOk = { cls: qm.className, fg: cs2.color, ratio: __V.ratio(__V.parse(cs2.color), __V.parse('#FBF6EC')) }; }
                      return out; })()""")
                    shoot(pg, 'v4_times_right_' + tag)
                    pg.wait_for_timeout(2400)
            pg.close()

    print('== tut sudoku ==', flush=True)
    DATA['sudoku'] = {'states': {}, 'conflict': {}, 'sel': {}, 'hint': {}, 'tutorial': tutorial_run(browser, 'sudoku', 'sud')}
    for tag, w, h in VPS:
        for flat, state in [(0, 'p4'), (10, 'p6')]:
            print('== sudoku', state, tag, flush=True)
            url = 'file:///' + str(BASE / 'sudoku' / 'index.html').replace('\\', '/')
            pg = browser.new_page(viewport={'width': w, 'height': h})
            pg.add_init_script(seed_js('sudoku', flat))
            pg.goto(url); pg.wait_for_timeout(1300)
            DATA['sudoku']['states'][state + '_' + tag] = sudoku_state(pg, tag, state)
            shoot(pg, 'v4_sudoku_' + state + '_' + tag)
            if True:
                DATA['sudoku']['conflict'][state + '_' + tag] = sudoku_conflict(pg, tag)
                if state == 'p4':
                    DATA['sudoku']['sel'][tag] = sudoku_sel(pg, tag)
                    shoot(pg, 'v4_sudoku_sel_' + tag)
            if tag == 'lp':
                DATA['sudoku']['hint'][tag] = hint_state(pg, 'sudoku', tag, 'sud')
            pg.close()
    browser.close()

(SHOTS / 'v4_audit_data.json').write_text(json.dumps(DATA, ensure_ascii=False, indent=1), encoding='utf-8')
print('DONE ->', SHOTS / 'v4_audit_data.json')
