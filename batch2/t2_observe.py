# -*- coding: utf-8 -*-
"""t2 儿童教学观察驱动：模拟 5 岁半女孩玩 memory/tangram/color（playwright，headless 独立实例）
纪律：每款独立 launch_persistent_context + 临时 user-data-dir；不 connect/不杀任何已有浏览器；
不修改游戏文件；判断只用 DOM/钩子（截图仅备查）。用法: python t2_observe.py memory|tangram|color
产物: shots/t2_<game>_obs.json + shots/t2_<game>_*.png
"""
import json, os, random, sys, tempfile, time, datetime

BASE = os.path.dirname(os.path.abspath(__file__)).replace('\\', '/')
SHOTS = os.path.join(BASE, 'shots')
os.makedirs(SHOTS, exist_ok=True)

INIT_JS = """
window.__t0 = Date.now(); window.__vlog = [];
try {
  if (window.speechSynthesis) {
    const sp = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = u => { try { window.__vlog.push({t: Date.now()-window.__t0, api:'tts', text: u && u.text}); } catch(e){} try { return sp(u); } catch(e){} };
  }
} catch(e){}
const __t2t = setInterval(() => {
  try {
    if (typeof KIDS !== 'undefined' && KIDS && KIDS.voice && !KIDS.__t2w) {
      KIDS.__t2w = 1;
      const vp = KIDS.voice.play.bind(KIDS.voice);
      KIDS.voice.play = function(k, x) { window.__vlog.push({t: Date.now()-window.__t0, api:'voice', key:k, text:x}); try { return vp(k, x); } catch(e){} };
      if (KIDS.audio && KIDS.audio.sfx) {
        const sf = KIDS.audio.sfx.bind(KIDS.audio);
        KIDS.audio.sfx = function(n) { window.__vlog.push({t: Date.now()-window.__t0, api:'sfx', key:n}); try { return sf(n); } catch(e){} };
      }
      clearInterval(__t2t);
    }
  } catch(e) {}
}, 20);
"""

EV = {'meta': {}, 'timeline': [], 'errors': []}

def note(msg, data=None):
    ent = {'t': round(time.time() - T0, 1), 'msg': msg}
    if data is not None:
        ent['data'] = data
    EV['timeline'].append(ent)
    print('[%6.1fs] %s %s' % (ent['t'], msg, json.dumps(data, ensure_ascii=False)[:220] if data is not None else ''))

def child_wait(lo=2.0, hi=5.0, tag=''):
    d = random.uniform(lo, hi)
    time.sleep(d)
    return round(d, 1)

def vlog(page, since=0):
    return page.evaluate("(s) => window.__vlog.filter(e => e.t >= s)", since)

def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name + '.png'))

# ---------- memory ----------
def run_memory(pw):
    from playwright.sync_api import sync_playwright
    d = tempfile.mkdtemp(prefix='t2_mem_')
    ctx = pw.chromium.launch_persistent_context(d, headless=True, viewport={'width': 800, 'height': 1180})
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.on('pageerror', lambda e: EV['errors'].append('pageerror: ' + str(e)))
    page.add_init_script(INIT_JS)
    page.goto('file:///' + BASE + '/memory/index.html')
    page.wait_for_function("() => window.MEM", timeout=15000)
    note('MEM 就绪')

    lv = page.evaluate("() => window.MEM.currentLevel")
    geo = page.evaluate("() => { const c = document.querySelector('.card'); const r = c.getBoundingClientRect(); return {cards: document.querySelectorAll('.card').length, cardW: Math.round(r.width), cardH: Math.round(r.height)}; }")
    note('关卡1-0开局', {'level': lv, 'geometry': geo})

    # --- 教学"看"：中途乱点是否被吞 ---
    cards0 = page.evaluate("() => window.MEM.cards")
    partner0 = next(c['id'] for c in cards0 if c['id'] != 0 and c['pattern'] == cards0[0]['pattern'])
    mid = next(c['id'] for c in cards0 if c['id'] not in (0, partner0))
    time.sleep(1.3)
    page.click('[data-i="%d"]' % mid)   # 女孩在演示中途点了一张不该点的牌
    time.sleep(0.4)
    after = page.evaluate("() => ({tut: window.MEM.tutorial, cards: window.MEM.cards.map(c=>[c.id,c.state])})")
    note('教学"看"中途点牌%d→是否被吞' % mid, {'after': after})
    shot(page, 't2_mem_01_tut_watch')

    # --- 等"帮" ---
    page.wait_for_function("() => window.MEM.tutorial === 'help'", timeout=12000)
    time.sleep(2.2)
    g = page.evaluate("""() => { const g = document.getElementById('ghost'); const r = g.getBoundingClientRect();
      const gc=[r.left+r.width/2, r.top+r.height/2]; let over=-1;
      document.querySelectorAll('.card').forEach(c=>{const b=c.getBoundingClientRect();
        if(gc[0]>=b.left&&gc[0]<=b.right&&gc[1]>=b.top&&gc[1]<=b.bottom) over=Number(c.dataset.i);});
      return {show:g.classList.contains('show'), over, pulse:Array.from(document.querySelectorAll('.card.pulse')).map(c=>Number(c.dataset.i))}; }""")
    note('教学"帮"幽灵手指', g)
    shot(page, 't2_mem_02_tut_help')
    child_wait()

    # 女孩照手指翻第一张（教学目标牌0）
    page.click('[data-i="0"]')
    time.sleep(1.5)
    g2 = page.evaluate("""() => { const g = document.getElementById('ghost'); const r = g.getBoundingClientRect();
      const gc=[r.left+r.width/2, r.top+r.height/2]; let over=-1;
      document.querySelectorAll('.card').forEach(c=>{const b=c.getBoundingClientRect();
        if(gc[0]>=b.left&&gc[0]<=b.right&&gc[1]>=b.top&&gc[1]<=b.bottom) over=Number(c.dataset.i);});
      return {show:g.classList.contains('show'), over, pulse:Array.from(document.querySelectorAll('.card.pulse')).map(c=>Number(c.dataset.i))}; }""")
    note('翻开牌0后手指应转向其配对%d' % partner0, g2)
    child_wait()
    page.click('[data-i="%d"]' % partner0)
    time.sleep(1.3)
    st = page.evaluate("() => ({tut: window.MEM.tutorial, cards: window.MEM.cards, misses: window.MEM.currentLevel.misses})")
    tray = page.evaluate("() => document.querySelectorAll('#pairs-tray .mini.on').length")
    note('教学首次配对完成→独', {'tut': st['tut'], 'misses': st['misses'], 'tray_on': tray,
         'states': [c['state'] for c in st['cards']]})
    child_wait()

    # --- 孩子模式玩完 1-0：一次失误 + 判定期间乱点 ---
    cards = page.evaluate("() => window.MEM.cards")
    downs = [c for c in cards if c['state'] == 'down']
    a = downs[0]['id']
    b = next(c['id'] for c in downs if c['pattern'] != downs[0]['pattern'])
    c3 = next(c['id'] for c in downs if c['id'] not in (a, b))
    page.click('[data-i="%d"]' % a); child_wait(2, 4)
    t_judge = page.evaluate("() => window.__vlog.length")
    page.click('[data-i="%d"]' % b)
    time.sleep(0.15)   # 900ms 盖回锁定期内继续乱点（孩子停不下来）
    page.click('[data-i="%d"]' % c3); time.sleep(0.1); page.click('[data-i="%d"]' % c3)
    time.sleep(0.3)
    locked_state = page.evaluate("() => window.MEM.cards.map(c=>[c.id,c.state])")
    note('失误判定锁定期乱点两张→应被吞', {'c3_state_after': dict(locked_state)[c3]})
    time.sleep(1.2)
    st = page.evaluate("() => ({misses: window.MEM.currentLevel.misses, cards: window.MEM.cards.map(c=>[c.id,c.state])})")
    note('失误盖回完成', {'misses': st['misses']})
    child_wait()
    partner_a = page.evaluate("(i) => { const cs = window.MEM.cards; const p = cs[i].pattern; return cs.find(c=>c.id!==i&&c.pattern===p).id; }", a)
    page.click('[data-i="%d"]' % a); time.sleep(1.2); page.click('[data-i="%d"]' % partner_a)
    time.sleep(1.4)
    rest = page.evaluate("() => window.MEM.cards.filter(c=>c.state==='down').map(c=>c.id)")
    page.click('[data-i="%d"]' % rest[0]); child_wait(2, 4); page.click('[data-i="%d"]' % rest[1])
    page.wait_for_selector('.k-celebrate', timeout=8000)
    stars = page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length")
    ctxt = page.evaluate("() => document.querySelector('.k-celebrate .k-big') && document.querySelector('.k-celebrate .k-big').textContent")
    # 过关演出期间乱点
    time.sleep(0.4)
    page.evaluate("() => { const r = document.getElementById('board').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(400, 500); page.mouse.click(200, 300); page.mouse.click(600, 900)
    still = page.evaluate("() => !!document.querySelector('.k-celebrate')")
    note('1-0过关+演出期间乱点', {'stars': stars, 'text': ctxt, 'celebrate_still_after_clicks': still})
    shot(page, 't2_mem_03_win_l0')

    # --- 1-1：三连失误→支架 ---
    page.wait_for_function("() => window.MEM.currentLevel && window.MEM.currentLevel.flat === 1", timeout=10000)
    note('进入1-1', page.evaluate("() => window.MEM.currentLevel"))
    child_wait(4, 8)  # 新界面先看4-8秒
    cards = page.evaluate("() => window.MEM.cards")
    pat = {}
    for c in cards:
        pat.setdefault(c['pattern'], []).append(c['id'])
    ps = list(pat.values())  # 3 对
    for k in range(3):      # 三次全错：每对都翻过又盖回
        page.click('[data-i="%d"]' % ps[k][0]); child_wait(2, 4)
        page.click('[data-i="%d"]' % ps[(k + 1) % 3][0])
        time.sleep(1.6)     # 等900ms盖回
    st = page.evaluate("() => ({misses: window.MEM.currentLevel.misses, cards: window.MEM.cards.map(c=>[c.id,c.state])})")
    g3 = page.evaluate("""() => { const g = document.getElementById('ghost'); const r = g.getBoundingClientRect();
      const gc=[r.left+r.width/2, r.top+r.height/2]; let over=-1;
      document.querySelectorAll('.card').forEach(c=>{const b=c.getBoundingClientRect();
        if(gc[0]>=b.left&&gc[0]<=b.right&&gc[1]>=b.top&&gc[1]<=b.bottom) over=Number(c.dataset.i);});
      return {show:g.classList.contains('show'), over, pulse:Array.from(document.querySelectorAll('.card.pulse')).map(c=>Number(c.dataset.i))}; }""")
    v = vlog(page, 0)
    note('1-1三连失误→支架是否触发', {'misses': st['misses'], 'ghost': g3,
         'voice_mem_hint': [e for e in v if e.get('key') == 'mem_hint'][-1:]})
    shot(page, 't2_mem_04_scaffold')
    child_wait()
    # 跟手指翻已知配对
    page.click('[data-i="%d"]' % g3['over']); time.sleep(1.4)
    partner = page.evaluate("(i) => { const cs = window.MEM.cards; const p = cs[i].pattern; return cs.find(c=>c.id!==i&&c.pattern===p).id; }", g3['over'])
    page.click('[data-i="%d"]' % partner)
    time.sleep(1.2)
    note('跟支架完成配对', {'misses': page.evaluate("() => window.MEM.currentLevel.misses"),
         'tray_on': page.evaluate("() => document.querySelectorAll('#pairs-tray .mini.on').length")})

    # --- 卡住20秒无操作→提示 ---
    vl0 = len(page.evaluate("() => window.__vlog"))
    note('开始20秒不动（孩子卡住）')
    time.sleep(21)
    vnew = page.evaluate("(s) => window.__vlog.slice(s)", vl0)
    note('卡住21秒后的帮扶', {'voice': [e for e in vnew if e['api'] in ('voice', 'tts')],
         'ghost_show': page.evaluate("() => document.getElementById('ghost').classList.contains('show')")})

    # 收尾 1-1（按配对点——她刚见过这些牌）
    for _ in range(3):
        downs = page.evaluate("() => window.MEM.cards.filter(c=>c.state==='down').map(c=>c.id)")
        if not downs:
            break
        pa = page.evaluate("(i) => { const cs = window.MEM.cards; const p = cs[i].pattern; return cs.find(c=>c.id!==i&&c.pattern===p).id; }", downs[0])
        page.click('[data-i="%d"]' % downs[0]); child_wait(2, 4); page.click('[data-i="%d"]' % pa)
        time.sleep(1.4)
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('1-1过关', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'misses': page.evaluate("() => window.MEM.currentLevel.misses")})
    shot(page, 't2_mem_05_win_l1')

    # --- 1-2 (2x4=4对)：高失误孩子模式（8失误→2星） ---
    page.wait_for_function("() => window.MEM.currentLevel && window.MEM.currentLevel.flat === 2", timeout=10000)
    note('进入1-2', page.evaluate("() => window.MEM.currentLevel"))
    child_wait(4, 8)
    cards = page.evaluate("() => window.MEM.cards")
    pat = {}
    for c in cards:
        pat.setdefault(c['pattern'], []).append(c['id'])
    ps = list(pat.values())
    for rep in range(2):        # 8 次全错（记不住 4 对）
        for k in range(4):
            page.click('[data-i="%d"]' % ps[k][0]); child_wait(2, 4)
            page.click('[data-i="%d"]' % ps[(k + 1) % 4][0])
            time.sleep(1.6)
        st = page.evaluate("() => window.MEM.currentLevel.misses")
        note('1-2两轮全错后', {'misses': st})
    for k in range(4):          # 全都见过了→按记忆配对
        page.click('[data-i="%d"]' % ps[k][0]); child_wait(2, 4)
        page.click('[data-i="%d"]' % ps[k][1])
        time.sleep(1.4)
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('1-2过关（高失误）', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'misses': page.evaluate("() => window.MEM.currentLevel.misses")})
    shot(page, 't2_mem_06_win_l2')
    time.sleep(2)
    save = page.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_memory')).levels")
    note('存档关卡记录', save)
    EV['vlog'] = page.evaluate("() => window.__vlog")
    ctx.close()

# ---------- tangram ----------
def tcenter(page, sel):
    return page.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; }", sel)

def tdrag(page, fx, fy, tx, ty, wob=True):
    page.mouse.move(fx, fy); page.mouse.down()
    steps = 10
    for s in range(1, steps + 1):
        wx = (random.uniform(-6, 6) if wob and s > 2 and s < steps - 1 else 0)  # 孩子手抖
        wy = (random.uniform(-6, 6) if wob and s > 2 and s < steps - 1 else 0)
        page.mouse.move(fx + (tx - fx) * s / steps + wx, fy + (ty - fy) * s / steps + wy)
        time.sleep(0.045)
    page.mouse.up(); time.sleep(0.35)

def piece_snap(page):
    return page.evaluate("() => window.TAN.pieces.map(p => ({i:p.i, t:p.t, x:+p.x.toFixed(2), y:+p.y.toFixed(2), r:p.r, placed:p.placed, solX:p.solX, solY:p.solY, solR:p.solR, cts:p.clicksToSol}))")

def vis_point(page, gi):
    """在视口内找一个确实落在块 gi 上的点（孩子点她看得见的部分）"""
    return page.evaluate("""(gi) => {
      const w = window.innerWidth, h = window.innerHeight;
      for (let y = 40; y < h - 20; y += 24)
        for (let x = 20; x < w - 20; x += 24) {
          const el = document.elementFromPoint(x, y);
          const pc = el && el.closest ? el.closest('.piece') : null;
          if (pc && pc.getAttribute('data-piece') === String(gi)) return [x, y];
        }
      return null; }""", str(gi))

def anchor_px(page, gi):
    return page.evaluate("""(gi) => { const svg = document.getElementById('board');
      const p = window.TAN.pieces[Number(gi)];
      const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y;
      const s = pt.matrixTransform(svg.getScreenCTM()); return [s.x, s.y]; }""", str(gi))

def unit_px(page, x, y):
    return page.evaluate("""(u) => { const svg = document.getElementById('board');
      const pt = svg.createSVGPoint(); pt.x = u[0]; pt.y = u[1];
      const s = pt.matrixTransform(svg.getScreenCTM()); return [s.x, s.y]; }""", [x, y])

def anchor_drag(page, gi, tx, ty, wob=True):
    """抓块上可见点，把锚点拖到单位坐标 (tx,ty)（=孩子把形状对到轮廓上）"""
    g = vis_point(page, gi)
    if g is None:
        return None
    a = anchor_px(page, gi)
    t = unit_px(page, tx, ty)
    dx, dy = g[0] - a[0], g[1] - a[1]
    tdrag(page, g[0], g[1], t[0] + dx, t[1] + dy, wob)
    return True

def tap_piece(page, gi):
    g = vis_point(page, gi)
    if g is None:
        return False
    page.mouse.click(g[0], g[1])
    return True

def bbox_of(page, gi):
    return page.evaluate("""(gi) => { const e = document.querySelector('[data-piece="' + gi + '"]'); const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }""", str(gi))

def rot_and_place(page, gi, offx=0, offy=0):
    cts = page.evaluate("(i) => window.TAN.pieces[i].clicksToSol", gi)
    swings = []
    for k in range(cts):
        b0 = bbox_of(page, gi)
        tap_piece(page, gi)
        time.sleep(0.55)
        swings.append({'before': b0, 'after': bbox_of(page, gi)})
    st = page.evaluate("(i) => window.TAN.pieces[i]", gi)
    t = unit_px(page, st['solX'], st['solY'])
    a = anchor_px(page, gi)
    vp = vis_point(page, gi)
    if vp is None:
        return {'placed': None, 'swings': swings, 'note': '无可抓点'}
    dx, dy = vp[0] - a[0], vp[1] - a[1]
    tdrag(page, vp[0], vp[1], t[0] + dx + offx, t[1] + dy + offy)
    return {'placed': page.evaluate("(i) => window.TAN.pieces[i].placed", gi), 'swings': swings,
            'moves': page.evaluate("() => window.TAN.currentLevel.moves")}

def run_tangram(pw):
    d = tempfile.mkdtemp(prefix='t2_tan_')
    ctx = pw.chromium.launch_persistent_context(d, headless=True, viewport={'width': 800, 'height': 1180})
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.on('pageerror', lambda e: EV['errors'].append('pageerror: ' + str(e)))
    page.add_init_script(INIT_JS)
    page.goto('file:///' + BASE + '/tangram/index.html')
    page.wait_for_function("() => window.TAN", timeout=15000)
    note('TAN 就绪', page.evaluate("() => window.TAN.currentLevel"))
    ps0 = piece_snap(page)
    note('1-0初始块', ps0)

    # --- 教学"看"：中途点块是否被吞 ---
    time.sleep(1.1)
    pc1 = tcenter(page, '[data-piece="1"]')
    page.mouse.click(pc1[0], pc1[1])
    time.sleep(0.4)
    ps1 = piece_snap(page)
    same = ps1[1]['r'] == ps0[1]['r'] and abs(ps1[1]['x'] - ps0[1]['x']) < 0.01 and abs(ps1[1]['y'] - ps0[1]['y']) < 0.01
    note('教学"看"中途点块1→是否被吞', {'unchanged': same, 'tut': page.evaluate("() => window.TAN.tutorial")})

    page.wait_for_function("() => window.TAN.tutorial === 'help'", timeout=12000)
    time.sleep(2.2)
    g = page.evaluate("""() => { const g = document.getElementById('ghost'); const r = g.getBoundingClientRect();
      const gc=[r.left+r.width/2, r.top+r.height/2]; let over=null;
      document.querySelectorAll('.piece').forEach(c=>{const b=c.getBoundingClientRect();
        if(gc[0]>=b.left&&gc[0]<=b.right&&gc[1]>=b.top&&gc[1]<=b.bottom) over=Number(c.getAttribute('data-piece'));});
      return {show:g.classList.contains('show'), over,
        pulse_cls: Array.from(document.querySelectorAll('.piece')).map(x=>x.getAttribute('class'))}; }""")
    note('教学"帮"幽灵手指+高亮', g)
    shot(page, 't2_tan_01_tut_help')
    child_wait(2, 4)

    # --- 放偏：拖到槽外 90px 松手（不吸附不锁死，留在原地） ---
    s0 = tcenter(page, '[data-slot="0"]')
    f0 = tcenter(page, '[data-piece="0"]')
    tdrag(page, f0[0], f0[1], s0[0] + 90, s0[1] + 70)
    ps = piece_snap(page)
    wf = page.evaluate("() => document.querySelector('[data-piece=\\'0\\']').classList.contains('wrongflash')")
    note('放偏90px松手→块停留原地', {'piece0': ps[0], 'wrongflash': wf, 'moves': page.evaluate("() => window.TAN.currentLevel.moves")})
    shot(page, 't2_tan_02_wrongflash_stay')
    g2 = page.evaluate("""() => { const g = document.getElementById('ghost'); const r = g.getBoundingClientRect();
      const gc=[r.left+r.width/2, r.top+r.height/2]; let over=null;
      document.querySelectorAll('.piece').forEach(c=>{const b=c.getBoundingClientRect();
        if(gc[0]>=b.left&&gc[0]<=b.right&&gc[1]>=b.top&&gc[1]<=b.bottom) over=Number(c.getAttribute('data-piece'));});
      return {show:g.classList.contains('show'), over_piece: over}; }""")
    note('放偏后幽灵手指（是否还指旧托盘点）', g2)
    child_wait(2, 4)

    # --- 硬放：孩子把形状中心对准轮廓（抓中心拖）但角度不对 ---
    s0c = tcenter(page, '[data-slot="0"]')
    f1 = tcenter(page, '[data-piece="0"]')
    tdrag(page, f1[0], f1[1], s0c[0], s0c[1])
    ps = piece_snap(page)
    wf = page.evaluate("() => document.querySelector('[data-piece=\\'0\\']').classList.contains('wrongflash')")
    note('硬放（形状对上但没转角）', {'placed': ps[0]['placed'], 'r': ps[0]['r'], 'solR': ps[0]['solR'],
         'cts': ps[0]['cts'], 'wrongflash': wf, 'anchor': [ps[0]['x'], ps[0]['y']], 'bbox': bbox_of(page, 0),
         'moves': page.evaluate("() => window.TAN.currentLevel.moves")})

    # --- 卡住：点她看得见的部分连点转角（记录每下后块的位置/是否甩出屏） ---
    seq = []
    for k in range(8):
        vp = vis_point(page, 0)
        if vp is None:
            seq.append({'tap': k + 1, 'visible_point': None, 'note': '块在视口内无可见部分'})
            break
        page.mouse.click(vp[0], vp[1])
        time.sleep(0.7)
        st = page.evaluate("() => window.TAN.pieces[0]")
        seq.append({'tap': k + 1, 'clicked': [vp[0], vp[1]], 'r': st['r'], 'placed': st['placed'],
                    'bbox': bbox_of(page, 0), 'moves': page.evaluate("() => window.TAN.currentLevel.moves")})
        if st['placed']:
            break
    note('硬放后连点转角（绕锚点甩动）', {'taps': seq, 'placed': page.evaluate("() => window.TAN.pieces[0].placed")})
    shot(page, 't2_tan_03_tap_swing')

    # --- 教师救援：拉回中央空地 → 点转到位（记录每下甩动） → 对位吸附 ---
    got = anchor_drag(page, 0, 6, 1.2)
    note('教师把块拉回中央', {'dragged': got, 'bbox': bbox_of(page, 0)})
    r1 = rot_and_place(page, 0, 0, 0)
    note('中央点转到位后对位吸附', {'placed': r1['placed'], 'swings': r1['swings'],
         'tut': page.evaluate("() => window.TAN.tutorial"), 'moves': r1.get('moves')})
    shot(page, 't2_tan_04_first_snap')

    # --- 第二块：转好后偏 30px 松手（宽容度） ---
    r2 = rot_and_place(page, 1, 30, -25)
    note('第二块偏30px松手', {'placed': r2['placed'], 'moves': r2.get('moves')})
    page.wait_for_selector('.k-celebrate', timeout=8000)
    time.sleep(0.4); page.mouse.click(400, 400); page.mouse.click(300, 900)
    note('1-0过关+演出期间乱点', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'moves': page.evaluate("() => window.TAN.currentLevel.moves"),
         'celebrate_kept': page.evaluate("() => !!document.querySelector('.k-celebrate')")})
    shot(page, 't2_tan_05_win_l0')
    time.sleep(2.5)

    # --- 1-1（tree：2 块） ---
    page.wait_for_function("() => window.TAN.currentLevel && window.TAN.currentLevel.flat === 1", timeout=10000)
    n_pc = page.evaluate("() => window.TAN.currentLevel.pieces")
    note('进入1-1', page.evaluate("() => window.TAN.currentLevel"))
    child_wait(4, 7)
    # 块0 拖到别的形状的槽上（错槽）
    wrong = tcenter(page, '[data-slot="%d"]' % (n_pc - 1))
    vp = vis_point(page, 0)
    tdrag(page, vp[0], vp[1], wrong[0], wrong[1])
    ps = piece_snap(page)
    note('块0拖到块%d的槽(错槽)' % (n_pc - 1), {'placed0': ps[0]['placed'], 'anchor': [ps[0]['x'], ps[0]['y']],
         'moves': page.evaluate("() => window.TAN.currentLevel.moves")})
    # 拖到中间空地松手
    mid = page.evaluate("() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height*0.42]; }")
    vp = vis_point(page, 0)
    tdrag(page, vp[0], vp[1], mid[0], mid[1])
    ps = piece_snap(page)
    note('块0拖到中间空地松手（不回弹不锁死）', {'placed0': ps[0]['placed'], 'anchor': [ps[0]['x'], ps[0]['y']], 'bbox': bbox_of(page, 0)})
    child_wait(2, 4)
    r3 = rot_and_place(page, 0, 0, 0)
    note('块0转角+对位放正', {'placed0': r3['placed']})
    # 误抓已就位块0拖走 → 进度回退
    prog0 = page.evaluate("() => document.querySelectorAll('#prog .mini.on').length")
    vp = vis_point(page, 0)
    tdrag(page, vp[0], vp[1], vp[0] + 60, vp[1] + 40)
    ps = piece_snap(page)
    prog1 = page.evaluate("() => document.querySelectorAll('#prog .mini.on').length")
    note('误抓已就位块0拖走→进度回退', {'placed0': ps[0]['placed'], 'prog_before': prog0, 'prog_after': prog1})
    r4 = rot_and_place(page, 0, 0, 0)
    note('块0放回', {'placed0': r4['placed']})

    # --- 最后一块卡住 26 秒 → 轮廓高亮？ ---
    note('最后一块留着不动，观察26秒闲置帮扶')
    vl0 = len(page.evaluate("() => window.__vlog"))
    time.sleep(26)
    hint = page.evaluate("() => ({hintpulse: Array.from(document.querySelectorAll('.slot.hintpulse')).map(s=>s.getAttribute('data-slot'))})")
    vnew = page.evaluate("(s) => window.__vlog.slice(s)", vl0)
    note('26秒后帮扶', {'slot_hint': hint, 'voice': [e for e in vnew if e['api'] in ('voice', 'tts')]})
    shot(page, 't2_tan_06_hintpulse')
    r5 = rot_and_place(page, n_pc - 1, 45, 20)
    note('最后一块偏45px松手', {'placed': r5['placed']})
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('1-1过关', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'moves': page.evaluate("() => window.TAN.currentLevel.moves")})
    shot(page, 't2_tan_07_win_l1')
    time.sleep(2.5)

    # --- 1-2（flag：3 块）：卡住狂点同一块6下 ---
    page.wait_for_function("() => window.TAN.currentLevel && window.TAN.currentLevel.flat === 2", timeout=10000)
    note('进入1-2', page.evaluate("() => window.TAN.currentLevel"))
    child_wait(4, 7)
    seq = []
    for k in range(6):
        vp = vis_point(page, 0)
        if vp is None:
            seq.append({'tap': k + 1, 'visible': False}); break
        page.mouse.click(vp[0], vp[1]); time.sleep(0.55)
        st = page.evaluate("() => window.TAN.pieces[0]")
        seq.append({'tap': k + 1, 'r': st['r'], 'bbox': bbox_of(page, 0), 'placed': st['placed']})
        if st['placed']:
            break
    note('狂点6下块0（转角甩动序列）', {'seq': seq, 'cts': page.evaluate("() => window.TAN.pieces[0].clicksToSol")})
    shot(page, 't2_tan_08_spin')
    last = None
    for pi in range(page.evaluate("() => window.TAN.currentLevel.pieces")):
        last = rot_and_place(page, pi, 0, 0)
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('1-2过关', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'moves': page.evaluate("() => window.TAN.currentLevel.moves")})
    save = page.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_tangram')).levels")
    note('存档', save)
    EV['vlog'] = page.evaluate("() => window.__vlog")
    ctx.close()

# ---------- color ----------
def point_on_region(page, i):
    """找视口内一个确实属于区域 i 的点（孩子瞄准她看到的空白区域内部）"""
    return page.evaluate("""(i) => {
      const w = window.innerWidth, h = window.innerHeight;
      for (let y = 40; y < h - 20; y += 16)
        for (let x = 20; x < w - 20; x += 16) {
          const el = document.elementFromPoint(x, y);
          const rg = el && el.closest ? el.closest('.rg') : null;
          if (rg && rg.dataset.r === String(i)) return [x, y];
        }
      return null; }""", str(i))

def fill_region(page, i, wait=(2, 4)):
    p = point_on_region(page, i)
    if p is None:
        return None
    page.mouse.click(p[0], p[1])
    child_wait(*wait)
    return page.evaluate("(i) => window.COL.regions[i].color", i)

def run_color(pw):
    d = tempfile.mkdtemp(prefix='t2_col_')
    ctx = pw.chromium.launch_persistent_context(d, headless=True, viewport={'width': 800, 'height': 1180})
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.on('pageerror', lambda e: EV['errors'].append('pageerror: ' + str(e)))
    page.add_init_script(INIT_JS)
    page.goto('file:///' + BASE + '/color/index.html')
    page.wait_for_selector('#scene-play.on', timeout=15000)
    page.wait_for_function("() => window.COL", timeout=15000)
    n = page.evaluate("() => window.COL.regions.length")
    note('首进直接教学关', {'level': page.evaluate("() => window.COL.currentLevel"), 'regions': n})
    time.sleep(0.9)

    # --- 教学"看"阶段乱点：点区域会不会打断 ---
    got = fill_region(page, 0, (0.3, 0.4))
    note('教学"看"中途点区域0→立即被填色?', {'region0_color': got})
    got = fill_region(page, 1, (0.3, 0.4))
    note('教学"看"又点区域1', {'region1_color': got})
    time.sleep(2.6)
    tut = page.evaluate("""() => ({finger_go: document.getElementById('finger').classList.contains('go'),
       swatch_pulse: !!document.querySelector('.swatch.pulse'),
       demo_filled_last: window.COL.regions[window.COL.regions.length-1].color,
       n_filled: window.COL.regions.filter(r=>r.color!=null).length}) """)
    note('演示链走完后的教学状态（帮是否接管）', tut)
    shot(page, 't2_col_01_tut_help')

    # --- 调色盘几何（含换行） ---
    sw = page.evaluate("""() => { const es = Array.from(document.querySelectorAll('#palette .swatch')).map(b => { const r=b.getBoundingClientRect();
        return {c: b.dataset.c, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; });
      const rows = {}; es.forEach(s => { rows[s.y] = (rows[s.y]||0)+1; });
      return {swatches: es, rows: rows}; }""")
    note('调色盘几何', {'rows': sw['rows'], 'min_w': min(s['w'] for s in sw['swatches']), 'min_h': min(s['h'] for s in sw['swatches'])})
    p7 = page.evaluate("() => { const b = document.querySelector('#palette .swatch[data-c=\\'7\\']'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(p7[0], p7[1])
    time.sleep(0.4)
    sel = page.evaluate("() => document.querySelector('#palette .swatch.sel') && document.querySelector('#palette .swatch.sel').dataset.c")
    note('误点邻近色7(紫,本想8粉)', {'selected': sel})

    # 填2块→教学应收手
    fill_region(page, 2); fill_region(page, 3)
    tut2 = page.evaluate("""() => ({finger_go: document.getElementById('finger').classList.contains('go'),
       pulse_on: (document.querySelector('.swatch.pulse')||{}).dataset ? document.querySelector('.swatch.pulse').dataset.c : null})""")
    note('孩子填满2区域后教学是否收手', tut2)

    # --- 孩子涂到只剩最后一块 ---
    for i in range(n - 1):
        c = page.evaluate("(i) => window.COL.regions[i].color", i)
        if c is None:
            fill_region(page, i, (2, 4))
    nf = page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length")
    note('只剩最后一块', {'filled': nf, 'total': n})
    # 已填区域换色重填（零惩罚，趁没触发自动过关）
    p8 = page.evaluate("() => { const b = document.querySelectorAll('#palette .swatch')[8]; const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }"); time.sleep(0.3)
    page.mouse.click(p8[0], p8[1]); time.sleep(0.3)
    sel8 = page.evaluate("() => document.querySelector('#palette .swatch.sel') && document.querySelector('#palette .swatch.sel').dataset.c")
    before = page.evaluate("(i) => window.COL.regions[0].color", 0)
    fill_region(page, 0, (0.3, 0.4))
    after = page.evaluate("(i) => window.COL.regions[0].color", 0)
    note('已填区域换色重填', {'sel': sel8, 'before': before, 'after': after})
    # 填最后一块 → 800ms 后自动过关
    fill_region(page, n - 1, (0.3, 0.5))
    page.wait_for_selector('.k-celebrate', timeout=6000)
    time.sleep(0.4)
    swb = page.evaluate("() => document.querySelector('#palette .swatch.sel') && document.querySelector('#palette .swatch.sel').dataset.c")
    pp = page.evaluate("() => { const b = document.querySelectorAll('#palette .swatch')[3]; const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(pp[0], pp[1])
    swa = page.evaluate("() => document.querySelector('#palette .swatch.sel') && document.querySelector('#palette .swatch.sel').dataset.c")
    note('填满自动过关+演出期间乱点', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'sel_before': swb, 'sel_after_clicks': swa})
    shot(page, 't2_col_02_win_l0')
    time.sleep(3)

    # --- 1-1：提前点完成 + 卡住提示 ---
    page.wait_for_selector('#scene-home.on', timeout=8000)
    cc = page.evaluate("() => { const b = document.querySelector('#card-color'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(cc[0], cc[1])
    page.wait_for_selector('#scene-play.on', timeout=8000)
    n1 = page.evaluate("() => window.COL.regions.length")
    note('进入1-1', {'level': page.evaluate("() => window.COL.currentLevel"), 'regions': n1,
         'tutorial_absent': page.evaluate("() => !document.querySelector('.swatch.pulse') && !document.getElementById('finger').classList.contains('go')")})
    child_wait(4, 7)
    fill_n = max(1, int(n1 * 0.3))
    for i in range(fill_n):
        fill_region(page, i)
    bd = page.evaluate("() => { const b = document.getElementById('btn-done'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(bd[0], bd[1])
    time.sleep(0.4)
    toast = page.evaluate("() => ({show: document.getElementById('toast').classList.contains('show'), text: document.getElementById('toast').textContent.trim()})")
    v = vlog(page, 0)
    note('30%点完成→温和提示', {'toast': toast, 'still_play': page.evaluate("() => !!document.querySelector('#scene-play.on')"),
         'voice_col_hint': [e for e in v if e.get('key') == 'col_hint'][-1:]})
    shot(page, 't2_col_03_toast')
    time.sleep(2.2)
    note('提示自动消失', {'show': page.evaluate("() => document.getElementById('toast').classList.contains('show')")})

    # 卡住 20 秒
    vl0 = len(page.evaluate("() => window.__vlog"))
    time.sleep(21)
    vnew = page.evaluate("(s) => window.__vlog.slice(s)", vl0)
    note('卡住21秒的帮扶', {'voice': [e for e in vnew if e['api'] in ('voice', 'tts')]})

    # 填到 50% 再点完成（40-60% 第一次仍提示）
    for i in range(fill_n, int(n1 * 0.5)):
        c = page.evaluate("(i) => window.COL.regions[i].color", i)
        if c is None:
            fill_region(page, i)
    page.mouse.click(bd[0], bd[1]); time.sleep(0.4)
    toast2 = page.evaluate("() => ({show: document.getElementById('toast').classList.contains('show')})")
    note('50%再点完成', {'toast': toast2, 'filled': page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length"), 'n': n1})

    # 填到 60%+ → 完成 = 2 星
    for i in range(n1):
        c = page.evaluate("(i) => window.COL.regions[i].color", i)
        if c is None:
            fill_region(page, i)
    page.mouse.click(bd[0], bd[1])
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('60%+点完成过关', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length"),
         'filled_ratio': page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length / window.COL.regions.length")})
    shot(page, 't2_col_04_win_l1')
    time.sleep(3)

    # --- 1-2：误点主页丢进度 + 小区域命中 + 撤销 ---
    page.wait_for_selector('#scene-home.on', timeout=8000)
    cc = page.evaluate("() => { const b = document.querySelector('#card-color'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(cc[0], cc[1])
    page.wait_for_selector('#scene-play.on', timeout=8000)
    note('进入1-2', {'level': page.evaluate("() => window.COL.currentLevel"),
         'regions': page.evaluate("() => window.COL.regions.length")})
    child_wait()
    fill_region(page, 0, (0.3, 0.4)); fill_region(page, 1, (0.3, 0.4))
    filled_before = page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length")
    bh = page.evaluate("() => { const b = document.getElementById('btn-home'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(bh[0], bh[1])
    page.wait_for_selector('#scene-home.on', timeout=8000)
    cc = page.evaluate("() => { const b = document.querySelector('#card-color'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    page.mouse.click(cc[0], cc[1])
    page.wait_for_selector('#scene-play.on', timeout=8000)
    filled_after = page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length")
    note('误点主页再进→进度是否丢失', {'level': page.evaluate("() => window.COL.currentLevel"),
         'filled_before_home': filled_before, 'filled_after_reenter': filled_after})

    aids = page.evaluate("""() => { const a = Array.from(document.querySelectorAll('.rg.hitaid')).map(e => ({r: e.dataset.r, cx: e.getAttribute('cx'), cy: e.getAttribute('cy')}));
        return {count: a.length, list: a}; }""")
    note('小区域命中外扩(hitaid)', {'count': aids['count']})
    if aids['count'] > 0:
        aid = aids['list'][0]['r']
        pos = page.evaluate("""(a) => { const e = document.querySelector('.rg.hitaid[data-r=\"'+a+'\"]'); const b = e.getBoundingClientRect(); return [b.x+b.width/2, b.y+b.height/2]; }""", aid)
        page.mouse.click(pos[0], pos[1]); time.sleep(0.4)
        got = page.evaluate("(i) => window.COL.regions[i].color", aid)
        note('点击外扩命中圈', {'target_region': aid, 'filled': got is not None})

    bu = page.evaluate("() => { const b = document.getElementById('btn-undo'); const r=b.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; }")
    nf0 = page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length")
    page.mouse.click(bu[0], bu[1]); time.sleep(0.4)
    nf1 = page.evaluate("() => window.COL.regions.filter(r=>r.color!=null).length")
    note('撤销', {'filled_before': nf0, 'filled_after': nf1})

    for i in range(page.evaluate("() => window.COL.regions.length")):
        c = page.evaluate("(i) => window.COL.regions[i].color", i)
        if c is None:
            fill_region(page, i, (1.5, 3))
    page.wait_for_selector('.k-celebrate', timeout=8000)
    note('1-2涂满自动过关', {'stars': page.evaluate("() => document.querySelectorAll('.k-celebrate .k-star').length")})
    time.sleep(3)
    save = page.evaluate("() => JSON.parse(localStorage.getItem('kidsgame_color')).levels")
    note('存档', save)
    EV['vlog'] = page.evaluate("() => window.__vlog")
    ctx.close()

# ---------- main ----------
T0 = time.time()
game = sys.argv[1] if len(sys.argv) > 1 else ''
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    EV['meta'] = {'game': game, 'started': datetime.datetime.now().isoformat(), 'viewport': '800x1180 headless'}
    {'memory': run_memory, 'tangram': run_tangram, 'color': run_color}[game](pw)
EV['meta']['finished'] = datetime.datetime.now().isoformat()
EV['meta']['duration_s'] = round(time.time() - T0, 1)
out = os.path.join(SHOTS, 't2_%s_obs.json' % game)
with open(out, 'w', encoding='utf-8') as f:
    json.dump(EV, f, ensure_ascii=False, indent=1)
print('OBS DONE %s  errors=%d  -> %s' % (game, len(EV['errors']), out))
