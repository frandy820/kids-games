# -*- coding: utf-8 -*-
"""
教学观察员：模拟 5 岁半女孩玩三款游戏（教学者视角），DOM 断言取证。
纪律：每款游戏独立 chromium 全新实例 + 临时 user-data-dir + headless；
     不修改游戏文件；不杀任何进程；禁止图像理解工具（截图只存盘）。
用法：python observe_5yo.py pipe|shop|kitchen
"""
import sys, json, time, random, tempfile, os
from playwright.sync_api import sync_playwright

BASE = 'F:/claudecode/projects/active/kids-games/batch1'
SHOTS = os.path.join(BASE, 'shots')
os.makedirs(SHOTS, exist_ok=True)
RNG = random.Random(20260905)   # 固定种子，可复现

EV = []  # evidence log
def ev(game, phase, claim, detail=''):
    EV.append({'game': game, 'phase': phase, 'claim': claim, 'detail': detail})
    print('[EV][%s][%s] %s %s' % (game, phase, claim, ('| ' + str(detail)) if detail else ''))

def child_pause(lo=2.0, hi=4.5):
    """5岁孩子每步操作 2-5 秒延迟"""
    time.sleep(RNG.uniform(lo, hi))

def shot(page, name):
    p = os.path.join(SHOTS, name)
    page.screenshot(path=p)
    return os.path.basename(p)

def launch_game(pw, rel, init_script=None):
    """独立全新实例 + 临时 user-data-dir，绝不复用/杀掉其它浏览器"""
    ud = tempfile.mkdtemp(prefix='kids5yo_')
    ctx = pw.chromium.launch_persistent_context(
        user_data_dir=ud, headless=True,
        args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
        viewport={'width': 1024, 'height': 768})
    if init_script:
        ctx.add_init_script(init_script)
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto('file:///' + BASE.replace('\\', '/') + '/' + rel)
    page.wait_for_timeout(1200)
    return ctx, page

# ---------- 通用页面内探针 ----------
PROBE = """
() => {
  window.__tap = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'NO-EL';
    el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true}));
    return 'OK';
  };
  window.__tapCell = (x, y) => {
    const el = document.querySelector('#board .cell[data-x="' + x + '"][data-y="' + y + '"]');
    if (!el) return 'NO-EL';
    el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true}));
    return 'OK';
  };
  window.__wrongN = () => window.GAME.cells.filter(
    c => c.t === 'I' ? (c.rot % 2) !== (c.solRot % 2) : c.rot !== c.solRot).length;
  return true;
}
"""

def j(page, expr):
    return page.evaluate(expr)

# ============================================================
# PIPE 管道小兔子
# ============================================================
def run_pipe(pw):
    ctx, page = launch_game(pw, 'pipe-rabbit/index.html')
    try:
        page.evaluate(PROBE)
        page.wait_for_function('window.GAME && window.GAME.currentLevel')
        lv = j(page, 'window.GAME.currentLevel')
        ev('pipe', 'P1教学', '全新存档进入教学关 1-0', {'level': lv})

        # ---- P1 教学观察："看"演示期乱点被吞（load 后 1.0s 仍在 locked 演示）----
        cells0 = j(page, 'window.GAME.cells')
        pipe_cell = next(c for c in cells0 if c['t'] in ('I', 'L', 'T'))
        page.wait_for_timeout(1000)
        r1 = page.evaluate('__tapCell(%d,%d)' % (pipe_cell['x'], pipe_cell['y']))
        page.wait_for_timeout(400)
        after = {(c['x'], c['y']): c['rot'] for c in j(page, 'window.GAME.cells')}
        frozen = all(after[(c['x'], c['y'])] == c['rot'] for c in cells0)
        ev('pipe', 'P1教学', '"看"演示期点管件：无旋转无响应（干扰被安全吞掉）',
           {'frozen': frozen, 'tap': r1})
        shot(page, 'p1-01-teach-demo.png')

        # ---- P1 "帮"：等 startHandsOn（恰好1格功能错位；I管180°对称）----
        page.wait_for_function('window.__wrongN() === 1', timeout=20000)
        page.wait_for_timeout(900)  # ghostDemoTarget at +700ms
        st = j(page, """(() => {
          const wrong = window.GAME.cells.filter(c =>
            c.t === 'I' ? (c.rot % 2) !== (c.solRot % 2) : c.rot !== c.solRot);
          return { wrongCells: wrong.map(c => ({x:c.x,y:c.y,t:c.t,rot:c.rot,sol:c.solRot})),
                   ghostOn: document.getElementById('finger').classList.contains('go') };
        })()""")
        ev('pipe', 'P1教学', '教学关上手=全部摆好只留1格错位；幽灵手指出现', st)
        shot(page, 'p1-02-hands-on-ghost.png')

        wrong = st['wrongCells'][0]
        other = next((c for c in j(page, 'window.GAME.cells')
                      if c['t'] in ('I', 'L', 'T') and (c['x'], c['y']) != (wrong['x'], wrong['y'])), None)

        # 她第1步点错格（旁边的管，不是手指指的）
        page.evaluate('__tapCell(%d,%d)' % (other['x'], other['y']))
        page.wait_for_timeout(500)
        rots1 = {(c['x'], c['y']): c['rot'] for c in j(page, 'window.GAME.cells')}
        ev('pipe', 'P1教学', '她第一次点的是旁边的管（非手指目标）：旋转生效，现在两根都错',
           {'otherCell': [other['x'], other['y']], 'rotNow': rots1[(other['x'], other['y'])],
            'wrongN': j(page, 'window.__wrongN()')})
        page.wait_for_timeout(1200)
        ghost_gone = not j(page, "document.getElementById('finger').classList.contains('go')")
        ev('pipe', 'P1教学', '首次旋转后幽灵手指消失（点错格也算"第一步"，引导即停）',
           {'ghostGone': ghost_gone})

        # 她继续尝试：点手指原指的格（仍差1格）→ 再点回自己转错的格 → 通关
        child_pause()
        page.evaluate('__tapCell(%d,%d)' % (wrong['x'], wrong['y']))
        page.wait_for_timeout(800)
        won_mid = j(page, 'window.__wrongN()')   # 还剩1格错 → 未通
        child_pause(2.0, 3.0)
        page.evaluate('__tapCell(%d,%d)' % (other['x'], other['y']))
        won = False
        cel_seen = False
        pre = post = None
        for _ in range(60):
            page.wait_for_timeout(250)
            if j(page, "!!document.querySelector('.k-celebrate') || !!KIDS._save().levels['1-0']"):
                won = True
                if j(page, "!!document.querySelector('.k-celebrate')"):
                    cel_seen = True
                    pre = {(c['x'], c['y']): c['rot'] for c in j(page, 'window.GAME.cells')}
                    for _ in range(4):
                        page.evaluate('__tapCell(%d,%d)' % (wrong['x'], wrong['y']))
                        page.wait_for_timeout(200)
                    post = {(c['x'], c['y']): c['rot'] for c in j(page, 'window.GAME.cells')}
                break
        shot(page, 'p1-03-win-celebrate.png')
        sv1 = j(page, "KIDS._save().levels['1-0']")
        ev('pipe', 'P1教学', '3次点击后通关（第1次点错=多花2步）；庆祝层期间乱点4次全被吞',
           {'wrongNAfter2ndTap': won_mid, 'won': won, 'celebrateSeen': cel_seen,
            'swallowed': (pre is not None and pre == post), 'save_1_0': sv1})
        page.wait_for_timeout(3500)  # celebrate 收起 → proceed

        # ---- P2 中期试玩 1-1：先乱转无关格 + 点空格，再照教学纠正 ----
        page.wait_for_function('window.GAME.currentLevel === "1-1"', timeout=8000)
        ev('pipe', 'P2试玩', '通关后自动推进到 1-1')
        cells = j(page, 'window.GAME.cells')
        # 找一个当前已正确（rot==sol，I管按对称）的管格=“无关格”乱转 1 次
        def deficit(c):
            d = (c['solRot'] - c['rot']) % 4
            if c['t'] == 'I':
                d = min(d, (d + 2) % 4)
            return d
        ok_cell = next((c for c in cells if c['t'] in ('I', 'L', 'T') and deficit(c) == 0), None)
        if ok_cell:
            page.evaluate('__tapCell(%d,%d)' % (ok_cell['x'], ok_cell['y']))
            ev('pipe', 'P2试玩', '先乱转一个已正确的无关格（+1圈）', {'cell': [ok_cell['x'], ok_cell['y']]})
        # 点一个非管格（空格/石头/花盆）：安全无响应
        empt = j(page, """(() => {
          const els = [...document.querySelectorAll('#board .cell')];
          const e = els.find(el => !el.classList.contains('pipe') && !el.classList.contains('rock') && !el.classList.contains('goal') && !el.classList.contains('tap'));
          return e ? {x: e.dataset.x, y: e.dataset.y, cls: e.className} : null; })()""")
        if empt:
            r = page.evaluate('__tapCell(%s,%s)' % (empt['x'], empt['y']))
            page.wait_for_timeout(300)
            ev('pipe', 'P2试玩', '点空格无响应不崩溃（她不理解也乱点）', {'cell': empt, 'tapResult': r})
        shot(page, 'p2-04-level-1-1.png')

        # 照教学逐步纠正（自修正循环，模拟教学者口头指导）
        taps = 0
        for _ in range(30):
            if j(page, "!!KIDS._save().levels['1-1']"):
                break
            if j(page, 'window.__wrongN()') == 0:
                page.wait_for_timeout(600)
                continue  # 已摆对，等游戏自动判定/放水
            cs = j(page, 'window.GAME.cells')
            cand = next((c for c in cs if c['t'] in ('I', 'L', 'T') and deficit(c) > 0), None)
            if not cand:
                ev('pipe', 'P2试玩', '!! wrongN>0 但无 deficit 可点（需人工看）',
                   j(page, 'window.GAME.cells'))
                break
            page.evaluate('__tapCell(%d,%d)' % (cand['x'], cand['y']))
            taps += 1
            child_pause(1.8, 3.2)
        won11 = False
        for _ in range(40):
            page.wait_for_timeout(250)
            if j(page, "!!KIDS._save().levels['1-1']"):
                won11 = True; break
        sv11 = j(page, "KIDS._save().levels['1-1']")
        ev('pipe', 'P2试玩', '1-1 纠错式通关', {'won': won11, 'followTaps': taps, 'save_1_1': sv11})
        page.wait_for_timeout(3500)

        # ---- P3 1-2：卡住 16 秒（看她重复点/救援机制）----
        page.wait_for_function('window.GAME.currentLevel === "1-2"', timeout=8000)
        ev('pipe', 'P3试玩', '推进到 1-2，开始 16 秒发呆/无进展观察')
        t0 = time.time()
        stuck_events = []
        while time.time() - t0 < 16:
            page.wait_for_timeout(2000)
            finger = j(page, "document.getElementById('finger').classList.contains('go')")
            ov = j(page, "!!document.querySelector('.k-celebrate,.k-chapterend,.k-dayend,.k-resttip')")
            stuck_events.append({'ghost': finger, 'overlay': ov})
        any_rescue = any(e['ghost'] or e['overlay'] for e in stuck_events)
        ev('pipe', 'P3试玩', '卡住16秒：无幽灵手指/无弹层救援（仅语音重播，语音无DOM痕迹→推断）',
           {'anyDomRescue': any_rescue, 'samples': stuck_events[:3]})
        shot(page, 'p3-05-level-1-2-stuck.png')
        # 重复点同一处 3 次（孩子卡住行为），然后照做
        cs = j(page, 'window.GAME.cells')
        cand = next((c for c in cs if c['t'] in ('I', 'L', 'T') and deficit(c) > 0), None)
        if cand:
            for _ in range(3):
                page.evaluate('__tapCell(%d,%d)' % (cand['x'], cand['y']))
                page.wait_for_timeout(700)
        taps = 0
        for _ in range(30):
            if j(page, "!!KIDS._save().levels['1-2']"):
                break
            if j(page, 'window.__wrongN()') == 0:
                page.wait_for_timeout(600)
                continue
            cs = j(page, 'window.GAME.cells')
            cand = next((c for c in cs if c['t'] in ('I', 'L', 'T') and deficit(c) > 0), None)
            if not cand:
                break
            page.evaluate('__tapCell(%d,%d)' % (cand['x'], cand['y']))
            taps += 1
            child_pause(1.6, 2.8)
        won12 = False
        for _ in range(40):
            page.wait_for_timeout(250)
            if j(page, "!!KIDS._save().levels['1-2']"):
                won12 = True; break
        page.wait_for_timeout(1500)
        sv12 = j(page, "KIDS._save().levels['1-2']")
        nxt = j(page, 'window.GAME.currentLevel')
        ev('pipe', 'P3试玩', '1-2 通关+日历推进', {'won': won12, 'save_1_2': sv12, 'nextLevel': nxt})
        shot(page, 'p3-06-after-1-2.png')
    finally:
        try: ctx.close()
        except Exception: pass

# ============================================================
# SHOP 商店算术
# ============================================================
def run_shop(pw):
    ctx, page = launch_game(pw, 'shop-math/index.html')
    try:
        page.evaluate(PROBE)
        page.wait_for_function('window.SHOP && window.SHOP.currentOrder')
        ev('shop', 'S1教学', '全新存档首单=小猫买1个苹果（教学关）',
           j(page, 'window.SHOP.currentOrder'))

        # ---- S1 "看"阶段：自动演示中她点货架（应被拒；篮里只有演示那只苹果）----
        page.wait_for_timeout(3300)   # 演示已在 ~2.9s 完成程序自己的"点苹果入篮"
        q_before = page.evaluate('document.querySelector("#basket .slot[data-item=apple] .qty").textContent')
        r = page.evaluate('__tap(".shelf-cell[data-item=apple]")')
        page.wait_for_timeout(600)
        q_after = page.evaluate('document.querySelector("#basket .slot[data-item=apple] .qty").textContent')
        ev('shop', 'S1教学', '演示（看）阶段她点货架被拒绝：qty 保持演示的 1 个（她的点击未入篮）',
           {'tap': r, 'qtyBefore': q_before, 'qtyAfter': q_after})
        shot(page, 's1-01-tut-watch.png')

        # ---- S1 "帮"阶段：演示结束同一客人再来，幽灵手指指苹果货架 ----
        page.wait_for_function("sessionStorage.getItem('shop_tut') === '1'", timeout=25000)
        page.wait_for_selector('#ghost.show', timeout=15000)
        page.wait_for_timeout(800)
        g = j(page, """(() => {
          const gh = document.getElementById('ghost');
          const cell = document.querySelector('.shelf-cell[data-item=apple]');
          const a = gh.getBoundingClientRect(), b = cell.getBoundingClientRect();
          const dist = Math.hypot((a.left+a.width/2)-(b.left+b.width/2), (a.top+a.height/2)-(b.top+b.height/2));
          return { ghostShown: gh.classList.contains('show'),
                   distToAppleShelf: Math.round(dist), pointsAtApple: dist < 90,
                   state: window.SHOP.state };
        })()""")
        ev('shop', 'S1教学', '"帮"阶段幽灵手指重新出现并指向苹果货架（中心距<90px）', g)
        shot(page, 's1-02-help-ghost.png')

        # 孩子模仿点 1 次苹果（订单=1个）→ 手指转指结账
        page.wait_for_function("window.SHOP.state === 'shopping'", timeout=8000)
        child_pause(1.5, 2.5)
        page.evaluate('__tap(".shelf-cell[data-item=apple]")')
        page.wait_for_timeout(1500)   # +700ms 后手指移到结账
        g2 = j(page, """(() => {
          const gh = document.getElementById('ghost');
          const co = document.getElementById('btn-checkout');
          const a = gh.getBoundingClientRect(), b = co.getBoundingClientRect();
          const dist = Math.hypot((a.left+a.width/2)-(b.left+b.width/2), (a.top+a.height/2)-(b.top+b.height/2));
          return { qty: document.querySelector("#basket .slot[data-item=apple] .qty").textContent,
                   ghostAtCheckout: dist < 90 };
        })()""")
        ev('shop', 'S1教学', '她模仿点1次苹果入篮，手指随即转指结账按钮', g2)
        child_pause(2.0, 3.0)
        page.evaluate('__tap("#btn-checkout")')
        page.wait_for_timeout(900)
        ev('shop', 'S1教学', '她按结账 → 付款离开流程', {'state': j(page, 'window.SHOP.state')})
        page.wait_for_selector('.k-celebrate', timeout=10000)
        shot(page, 's1-03-win-3star.png')
        sv0 = j(page, "KIDS._save().levels['1-0']")
        ev('shop', 'S1教学', '教学关 0 错 3 星', {'save_1_0': sv0})
        page.wait_for_timeout(3200)

        # ---- S2 1-1：正确拿2香蕉+手滑多拿1苹果 → 温和提示 → 放回 → 过 ----
        page.wait_for_function("window.SHOP.currentOrder && window.SHOP.currentOrder.who === 'dog'", timeout=10000)
        ev('shop', 'S2试玩', '进入 1-1（小狗买2根香蕉）', j(page, 'window.SHOP.currentOrder'))
        page.wait_for_function("window.SHOP.state === 'shopping'", timeout=8000)
        child_pause(1.5, 2.5)
        page.evaluate('__tap(".shelf-cell[data-item=banana]")')
        child_pause(1.5, 2.5)
        page.evaluate('__tap(".shelf-cell[data-item=banana]")')
        child_pause(1.0, 2.0)
        page.evaluate('__tap(".shelf-cell[data-item=apple]")')  # 多拿无关商品
        page.wait_for_timeout(400)
        shot(page, 's2-04-overgrab.png')
        child_pause(1.5, 2.5)
        page.evaluate('__tap("#btn-checkout")')
        page.wait_for_timeout(900)
        hint = j(page, """(() => ({
          state: window.SHOP.state,
          hintcardShown: document.getElementById('hintcard').classList.contains('show'),
          bubbleFlash: document.getElementById('bubble').classList.contains('flash'),
          basketKept: document.querySelector("#basket .slot[data-item=banana] .qty").textContent,
        }))()""")
        ev('shop', 'S2试玩', '多拿1个苹果→结账：温和提示（灰蓝卡+气泡重闪），篮子保留',
           hint)
        page.wait_for_timeout(1800)  # hintcard 收起回 shopping
        # 她把苹果放回（点篮内苹果槽）
        page.evaluate('__tap("#basket .slot[data-item=apple]")')
        page.wait_for_timeout(400)
        q = j(page, 'document.querySelector("#basket .slot[data-item=apple]").classList.contains("show")')
        ev('shop', 'S2试玩', '点篮内苹果槽放回成功（槽隐藏=0个）', {'appleSlotHidden': q})
        child_pause(1.5, 2.5)
        page.evaluate('__tap("#btn-checkout")')
        page.wait_for_selector('.k-celebrate', timeout=10000)
        sv1 = j(page, "KIDS._save().levels['1-1']")
        ev('shop', 'S2试玩', '纠正后过关：1 错 = 2 星（永不0星）', {'save_1_1': sv1})
        shot(page, 's2-05-fixed-2star.png')
        page.wait_for_timeout(3200)

        # ---- S3 1-2：数不清拿5个梨，连错3次 → 支架自动清篮 ----
        page.wait_for_function("window.SHOP.currentOrder && window.SHOP.currentOrder.who === 'rabbit'", timeout=10000)
        ev('shop', 'S3试玩', '进入 1-2（小兔买3个梨）', j(page, 'window.SHOP.currentOrder'))
        page.wait_for_function("window.SHOP.state === 'shopping'", timeout=8000)
        for _ in range(5):   # 她点数到 5 就停不下来
            child_pause(0.8, 1.6)
            page.evaluate('__tap(".shelf-cell[data-item=pear]")')
        q5 = j(page, 'document.querySelector("#basket .slot[data-item=pear] .qty").textContent')
        ev('shop', 'S3试玩', '她拿了5个梨（超量2个）', {'qty': q5})
        for i in range(3):   # 冲动连按 3 次结账
            child_pause(1.2, 2.0)
            page.evaluate('__tap("#btn-checkout")')
            page.wait_for_timeout(1000)
        # 第3次错误后 1.6s → scaffold：清超量 + 高亮
        page.wait_for_timeout(1200)
        sc = j(page, """(() => ({
          qty: document.querySelector("#basket .slot[data-item=pear] .qty").textContent,
          pulseCell: !!document.querySelector('.shelf-cell.pulse'),
          state: window.SHOP.state,
        }))()""")
        ev('shop', 'S3试玩', '连错3次触发支架：超量梨 5→3 自动清掉、正确货架高亮pulse',
           sc)
        shot(page, 's3-06-scaffold-autoclear.png')
        child_pause(2.0, 3.0)
        page.evaluate('__tap("#btn-checkout")')
        page.wait_for_selector('.k-celebrate', timeout=10000)
        sv2 = j(page, "KIDS._save().levels['1-2']")
        nxt = j(page, 'window.SHOP.currentOrder.who')
        ev('shop', 'S3试玩', '支架后一键结账过关：3错=1星；推进到下一单',
           {'save_1_2': sv2, 'nextCustomer': nxt})
        shot(page, 's3-07-win-1star.png')
        page.wait_for_timeout(2500)
        bubble_now = j(page, 'window.SHOP.currentOrder')
        ev('shop', 'S3试玩', '第4单（大象买5个苹果）已进场', {'order': bubble_now})
    finally:
        try: ctx.close()
        except Exception: pass

# ============================================================
# KITCHEN 厨房节奏
# ============================================================
BD0 = 60 / 88.0   # 小星星
BD1 = 60 / 92.0   # 两只老虎
SONG0_T = [0,1,2,3,4,5,6,8,9,10,11,12,13,14,16,17,18,19,20,21,22,24,25,26,27,28,29,30]
SONG1_T = [0,1,2,3,4,5,6,7,8,9,10,12,13,14]

def kclock(page):
    return page.evaluate('window.__ck ? window.__ck() : performance.now()/1000')

def ktap(page):
    page.evaluate("""(() => {
      const w = document.getElementById('stage-wrap');
      w.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, clientX: 500, clientY: 380}));
    })()""")

KITCHEN_INIT = """
window.__ck = () => { try {
  return (KIDS && KIDS.audio && KIDS.audio.ctx) ? KIDS.audio.ctx.currentTime : performance.now()/1000;
} catch (e) { return performance.now()/1000; } };
window.__watch = { t1: null, fingerOn: false, fingerOffAt: null, anchor: null };
document.addEventListener('pointerdown', () => {
  if (window.__watch.anchor === null) window.__watch.anchor = window.__ck();
}, {capture: true, once: true});
setInterval(() => {
  try {
    if (window.RHY && window.__watch.t1 === null && window.RHY.state.hit > 0)
      window.__watch.t1 = window.__ck();
    const f = document.getElementById('tut-finger');
    if (f && f.classList.contains('on')) window.__watch.fingerOn = true;
    else if (window.__watch.fingerOn && window.__watch.fingerOffAt === null)
      window.__watch.fingerOffAt = window.__ck();
  } catch (e) {}
}, 40);
window.__schedTap = (atClk, noteIdx, tag, noteAt) => new Promise(res => {
  const wait = Math.max(0, (atClk - window.__ck()) * 1000 - 4);
  setTimeout(() => {
    const tSend = window.__ck();
    const st0 = window.RHY.state;
    document.getElementById('stage-wrap')
      .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true}));
    setTimeout(() => res({ tag: tag, note: noteIdx, tSend: tSend,
      noteAt: noteAt, hit0: st0.hit, miss0: st0.miss,
      hit1: window.RHY.state.hit, miss1: window.RHY.state.miss }), 130);
  }, wait);
});
"""

def run_kitchen(pw):
    ctx, page = launch_game(pw, 'kitchen-rhythm/index.html', init_script=KITCHEN_INIT)
    try:
        page.evaluate(PROBE)
        page.wait_for_function('window.RHY')
        page.wait_for_function("window.RHY.state.scene === 'play'", timeout=10000)
        ev('kitchen', 'K1教学', '全新存档直接进教学曲（小星星）play 场景',
           j(page, 'window.RHY.state'))

        # 判定启动模式：ctx 预创建→曲子自动开跑；否则手指门控等首次点按
        mode = None; w = None
        for _ in range(150):
            page.wait_for_timeout(40)
            w = j(page, 'window.__watch')
            if w['t1'] is not None: mode = 'autostart'; break
            if w['fingerOn']: mode = 'finger-gate'; break
        if mode == 'finger-gate':
            fw = j(page, 'window.__watch')
            ev('kitchen', 'K1教学',
               '引导手指出现后约0.4s即消失（t0=Infinity 等待期再无可见提示，'
               '直到孩子碰巧点击才开始）——疑似P1：被动等待的孩子可能永远等不到开始',
               {'fingerShownThenOff': True, 'fingerOffAtGameClock': fw['fingerOffAt']})
            shot(page, 'k1-01-tut-finger-wait.png')
            page.wait_for_timeout(4500)   # 她观察新界面 4.5 秒才动
            ktap(page)                    # 她第一次点屏幕（解锁+锚定）
            page.wait_for_function('window.__watch.t1 !== null', timeout=8000)
            w = j(page, 'window.__watch')
            t0 = w['t1']   # 游戏时钟域：第1音自动命中时刻 ≈ t0
            ev('kitchen', 'K1教学', '首次点按锚定后"看"段第1音自动命中；t0 取该时刻（游戏时钟域）',
               {'anchorClockGameDomain': w['anchor'], 't0': round(t0, 3)})
        else:
            # ctx 预创建环境：教学曲加载即自动开跑（真实iPad为手指门控，源码 816-830 行）
            page.wait_for_function('window.__watch.t1 !== null', timeout=8000)
            w = j(page, 'window.__watch')
            t0 = w['t1']
            ev('kitchen', 'K1教学', '本环境教学曲自动开跑；t0 由第1音自动命中时刻校准（游戏时钟域）',
               {'mode': mode, 't0': round(t0, 3), 'fingerSeen': w['fingerOn']})

        # "看"→"帮"交界处干扰：note3(2.05s)与note4(2.73s)之间点 1 次 → 空挥无惩罚
        target = t0 + 2.35
        while kclock(page) < target - 0.03:
            time.sleep(0.03)
        h_before = j(page, 'window.RHY.state.hit')
        ktap(page)
        page.wait_for_timeout(250)
        h_after = j(page, 'window.RHY.state.hit')
        ev('kitchen', 'K1教学', '演示中她中途乱点1次=空挥无惩罚（hit不变、无扣分、不破坏教学）',
           {'hitBefore': h_before, 'hitAfter': h_after})

        # "帮"阶段：第5-8音(i=4..7) 幽灵手指逐拍提示，她偏晚 ~250ms 模仿点击
        help_log = []
        for i in range(4, 8):
            note_at = t0 + SONG0_T[i] * BD0
            r = page.evaluate('window.__schedTap(%f, %d, "help", %f)'
                              % (note_at + 0.25, i, note_at))
            help_log.append(r)
        ev('kitchen', 'K1教学', '"帮"阶段4音手指提示模仿点击（计划偏晚250ms，实测见achievedOff）',
           {'perNote': [{'note': r['note'], 'achievedOff': round(r['tSend'] - r['noteAt'], 3),
                         'hitD': r['hit1'] - r['hit0'], 'missD': r['miss1'] - r['miss0']}
                        for r in help_log],
            'allHit': all((r['hit1'] - r['hit0']) >= 1 for r in help_log)})
        shot(page, 'k1-02-help-phase.png')

        # "独"阶段：i=8..27 70%准点 ±80ms / 30%偏晚 200-400ms
        solo = []
        for i in range(8, len(SONG0_T)):
            if RNG.random() < 0.7:
                off = RNG.uniform(-0.08, 0.08)
            else:
                off = RNG.uniform(0.20, 0.40)
            note_at = t0 + SONG0_T[i] * BD0
            r = page.evaluate('window.__schedTap(%f, %d, "solo", %f)'
                              % (note_at + off, i, note_at))
            r['plannedOff'] = round(off, 3)
            r['achievedOff'] = round(r['tSend'] - r['noteAt'], 3)
            solo.append(r)
        s0 = j(page, 'window.RHY.state')
        combo_bunny = j(page, "document.getElementById('combo-bunny').classList.contains('show')")
        late_hits = [x for x in solo if 0.15 <= x['achievedOff'] <= 0.30 and (x['hit1'] - x['hit0']) >= 1]
        late_miss = [x for x in solo if x['achievedOff'] > 0.30 and (x['miss1'] - x['miss0']) >= 1]
        noeff = [x for x in solo if (x['hit1'] - x['hit0']) == 0 and (x['miss1'] - x['miss0']) == 0]
        ev('kitchen', 'K1教学', '独奏段完成：迟到窗实测（实测偏晚150-300ms=hit / >300ms=miss）+ 空挥冷却',
           {'finalHit': s0['hit'], 'finalMiss': s0['miss'], 'total': s0['total'],
            'lateWindowHits': [{'n': x['note'], 'off': x['achievedOff']} for x in late_hits],
            'lateWindowMiss': [{'n': x['note'], 'off': x['achievedOff']} for x in late_miss],
            'tapsNoEffect': [{'n': x['note'], 'off': x['achievedOff'], 'planned': x['plannedOff']} for x in noeff],
            'comboBunnyShown': combo_bunny})

        # 曲终结算层 → 她看 3 秒 → 点继续
        page.wait_for_selector('.k-song-end', timeout=20000)
        se = j(page, """(() => { const o = document.querySelector('.k-song-end');
          return { shown: !!o, stats: o ? o.querySelector('.se-stats').textContent : null }; })()""")
        ev('kitchen', 'K1教学', '曲终装盘结算层出现（切中数/猫收走数 零文字图标）', se)
        shot(page, 'k1-03-song-end.png')
        page.wait_for_timeout(3000)
        page.evaluate('__tap(".k-song-end .se-go")')
        page.wait_for_selector('.k-celebrate', timeout=10000)
        stars0 = j(page, 'window.RHY.state.stars')
        sv0 = j(page, "KIDS._save().levels['1-0']")
        ev('kitchen', 'K1教学', '首曲结算星数与存档', {'stars': stars0, 'save_1_0': sv0})
        page.wait_for_timeout(2800)
        page.wait_for_function("window.RHY.state.scene === 'home'", timeout=10000)
        ev('kitchen', 'K1教学', '庆祝后回到首页（可继续选曲）')

        # ---- K2 第二曲：她自选"两只老虎"（无教学）----
        page.wait_for_timeout(2000)
        cards = j(page, "[...document.querySelectorAll('.song-card')].length")
        page.evaluate("""(() => {
          const cards = document.querySelectorAll('.song-card');
          cards[1].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true}));
        })()""")
        page.wait_for_timeout(200)
        c_now = kclock(page)
        t0b = c_now + 1.6
        ev('kitchen', 'K2试玩', '首页 4 张曲卡（3曲+自由琴键），她点了第2张"两只老虎"',
           {'cards': cards})
        page.wait_for_function("window.RHY.state.scene === 'play' && window.RHY.state.playing", timeout=5000)

        solo2 = []
        for i, t in enumerate(SONG1_T):
            if RNG.random() < 0.7:
                off = RNG.uniform(-0.08, 0.08)
            else:
                off = RNG.uniform(0.20, 0.40)
            note_at = t0b + t * BD1
            r = page.evaluate('window.__schedTap(%f, %d, "song2", %f)'
                              % (note_at + off, i, note_at))
            r['plannedOff'] = round(off, 3)
            r['achievedOff'] = round(r['tSend'] - r['noteAt'], 3)
            solo2.append(r)
        s1 = j(page, 'window.RHY.state')
        ev('kitchen', 'K2试玩', '第二曲（无教学）70/30 节奏完成',
           {'hit': s1['hit'], 'miss': s1['miss'], 'total': s1['total'],
            'lateHits': [{'n': x['note'], 'off': x['achievedOff']} for x in solo2
                         if 0.15 <= x['achievedOff'] <= 0.30 and (x['hit1'] - x['hit0']) >= 1],
            'lateMiss': [{'n': x['note'], 'off': x['achievedOff']} for x in solo2
                         if x['achievedOff'] > 0.30 and (x['miss1'] - x['miss0']) >= 1],
            'noEffect': [{'n': x['note'], 'off': x['achievedOff'], 'planned': x['plannedOff']} for x in solo2
                         if (x['hit1'] - x['hit0']) == 0 and (x['miss1'] - x['miss0']) == 0]})
        shot(page, 'k2-04-song2-mid.png')
        page.wait_for_selector('.k-song-end', timeout=20000)
        page.wait_for_timeout(2500)
        page.evaluate('__tap(".k-song-end .se-go")')
        page.wait_for_selector('.k-celebrate', timeout=10000)
        stars1 = j(page, 'window.RHY.state.stars')
        sv1 = j(page, "KIDS._save().levels['1-1']")
        page.wait_for_timeout(3000)
        home2 = j(page, 'window.RHY.state.scene')
        dots = j(page, "[...document.querySelectorAll('#today-dots .tdot')].map(d => d.className)")
        ev('kitchen', 'K2试玩', '第二曲结算+存档+回到首页（今日点数）',
           {'stars': stars1, 'save_1_1': sv1, 'scene': home2, 'todayDots': dots})
        shot(page, 'k2-05-song2-end.png')
    finally:
        try: ctx.close()
        except Exception: pass

# ============================================================
if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    with sync_playwright() as pw:
        if which in ('pipe', 'all'): run_pipe(pw)
        if which in ('shop', 'all'): run_shop(pw)
        if which in ('kitchen', 'all'): run_kitchen(pw)
    out = os.path.join(BASE, 'observe_5yo_results_%s.json' % which)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(EV, f, ensure_ascii=False, indent=1)
    print('=== %d evidence entries -> %s' % (len(EV), out))
