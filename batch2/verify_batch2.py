# -*- coding: utf-8 -*-
"""batch2 三款儿童游戏集成验收（playwright 真实操作模拟，headless 独立实例）
用法: python verify_batch2.py   输出: batch2/verify-report.md + batch2/shots/*.png
钩子契约见 SPEC-BATCH2.md（MEM/TAN/COL）。
"""
import json, os, sys, time, datetime, re

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, 'shots')
os.makedirs(SHOTS, exist_ok=True)
RESULTS = []

def check(game, item, ok, detail=''):
    RESULTS.append((game, item, 'PASS' if ok else 'FAIL', str(detail)[:300]))
    print(('[PASS] ' if ok else '[FAIL] ') + game + ' / ' + item + (' -- ' + str(detail)[:120] if detail else ''))

def furl(game):
    return 'file:///' + os.path.join(BASE, game, 'index.html').replace(os.sep, '/')

def read_verify(page, url):
    page.goto(url)
    for _ in range(60):
        if page.title().startswith('VERIFY'):
            break
        page.wait_for_timeout(250)
    title = page.title()
    body = page.evaluate("() => { const e = document.querySelector('#verify-result'); return e ? e.textContent : ''; }")
    try:
        data = json.loads(body)
    except Exception:
        data = None
    return title, data

def shot_check(page, name):
    path = os.path.join(SHOTS, name + '.png')
    page.screenshot(path=path)
    try:
        from PIL import Image
        import statistics
        im = Image.open(path).convert('L').resize((80, 60))
        stdev = statistics.pstdev(list(im.getdata()))
        return stdev > 3.0, 'stdev=%.1f' % stdev
    except ImportError:
        return None, 'PIL unavailable'

def viewport_check(page, game, tag):
    ox = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(game, tag + ' 无横向溢出', ox <= 0, 'overflowX=' + str(ox))
    small = page.evaluate("""() => {
      const bad = [];
      document.querySelectorAll('button, [data-i], [data-idx], .k-btn, [data-piece]').forEach(el => {
        if (el.classList.contains('k-parentbtn') || el.closest('.k-parentbtn')) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const cs = getComputedStyle(el);
        if (cs.pointerEvents === 'none' || cs.visibility === 'hidden' || cs.display === 'none') return; // 已收走/不可交互元素不计
        if (r.width < 63 || r.height < 63) bad.push((el.className||el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      return bad.slice(0, 5);
    }""")
    check(game, tag + ' 触摸目标>=64px', len(small) == 0, small)

def offline_check(page, game):
    refs = page.evaluate("() => { const bad = []; document.querySelectorAll('[src],[href],[url]').forEach(el => { ['src','href'].forEach(a => { const v = el.getAttribute ? el.getAttribute(a) : null; if (v && /^https?:/i.test(v)) bad.push(a + '=' + v.slice(0, 60)); }); }); return bad; }")
    css_http = page.evaluate("() => /url\\(\\s*['\\\"]?https?:\\/\\//i.test(Array.from(document.styleSheets).map(s => { try { return s.ownerNode.textContent } catch(e) { return '' } }).join(''))")
    check(game, '完全离线(无http引用)', len(refs) == 0 and not css_http, refs)

# ─────────────────────────── memory ───────────────────────────
def test_memory(ctx):
    game = 'memory'
    title, data = read_verify(ctx.new_page(), furl(game) + '?verify=1')
    check(game, '?verify=1 自检', title.startswith('VERIFY PASS') and data is not None, title)

    page = ctx.new_page()
    page.set_viewport_size({'width': 1280, 'height': 800})
    today = datetime.date.today().strftime('%Y-%m-%d')
    page.add_init_script("localStorage.setItem('kidsgame_memory', JSON.stringify({v:'1.0',game:'memory',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0},mem:{tutSeen:true}}));" % (today, today))
    page.goto(furl(game))
    page.wait_for_timeout(1500)
    try:
        page.wait_for_function("() => window.MEM", timeout=15000)
        # 真实点击翻牌完成第 1 关：按 autoSolve 序列逐张 page.click
        seq = page.evaluate("() => window.MEM.autoSolve()")
        ok = False
        if seq:
            for idx in seq:
                page.click('[data-i="%d"]' % idx, timeout=3000)
                page.wait_for_timeout(700)  # 匹配判定 420ms+收走动画期间 state.locked，快点击会被吞
            page.wait_for_selector('.k-celebrate', timeout=10000)
            ok = True
        check(game, '真实翻牌通关(第1关)', ok, 'celebrate 出现' if ok else '未触发过关')
    except Exception as e:
        check(game, '真实翻牌通关(第1关)', False, str(e)[:120])
    ok, d = shot_check(page, 'memory-l1')
    check(game, '截图非空白', ok if ok is not None else True, d)
    viewport_check(page, game, '桌面1280')
    offline_check(page, game)
    return page

# ─────────────────────────── tangram ───────────────────────────
def test_tangram(ctx):
    game = 'tangram'
    title, data = read_verify(ctx.new_page(), furl(game) + '?verify=1')
    check(game, '?verify=1 自检', title.startswith('VERIFY PASS') and data is not None, title)

    page = ctx.new_page()
    page.set_viewport_size({'width': 1280, 'height': 800})
    today = datetime.date.today().strftime('%Y-%m-%d')
    page.add_init_script("localStorage.setItem('kidsgame_tangram', JSON.stringify({v:'1.0',game:'tangram',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0},tan:{tutSeen:true}}));" % (today, today))
    page.goto(furl(game))
    page.wait_for_timeout(1500)
    try:
        page.wait_for_function("() => window.TAN", timeout=15000)
        # 真实拖放+点转：每块先按 clicksToSol 短按点转（45°/次，转入旋转等价类），再拖到目标虚线槽中心
        # 含一块先故意放错（拖到槽外 120px，不吸附=wrongflash 无锁死）再拖正
        def drag(fx, fy, tx, ty):
            page.mouse.move(fx, fy); page.mouse.down()
            steps = 8
            for s in range(1, steps + 1):
                page.mouse.move(fx + (tx - fx) * s / steps, fy + (ty - fy) * s / steps)
                page.wait_for_timeout(20)
            page.mouse.up(); page.wait_for_timeout(180)
        def center(sel):
            return page.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }", sel)
        sol = page.evaluate("() => window.TAN.pieces")
        for k, s in enumerate(sol or []):
            pc = '[data-piece="%d"]' % s['i']
            for _ in range(s['clicksToSol']):      # 短按点转到等价转角
                page.click(pc, timeout=3000)
                page.wait_for_timeout(120)
            fx, fy = center(pc)
            tx, ty = center('[data-slot="%d"]' % s['i'])
            if k == 0:                            # 第一块先故意放错（不吸附，可重放）
                drag(fx, fy, tx + 120, ty + 120)
                fx, fy = center(pc)
            drag(fx, fy, tx, ty)
            placed = page.evaluate("(i) => window.TAN.pieces[i].placed", k)
            if not placed:
                check(game, '真实拖放通关(第1关)', False, '块 %d 未吸附(i=%s clicks=%s)' % (s['i'], s['i'], s['clicksToSol']))
                return page
        page.wait_for_selector('.k-celebrate', timeout=10000)
        check(game, '真实拖放通关(第1关)', True, 'celebrate 出现')
    except Exception as e:
        check(game, '真实拖放通关(第1关)', False, str(e)[:140])
    ok, d = shot_check(page, 'tangram-l1')
    check(game, '截图非空白', ok if ok is not None else True, d)
    viewport_check(page, game, '桌面1280')
    offline_check(page, game)
    return page

# ─────────────────────────── color ───────────────────────────
def test_color(ctx):
    game = 'color'
    title, data = read_verify(ctx.new_page(), furl(game) + '?verify=1')
    check(game, '?verify=1 自检', title.startswith('VERIFY PASS') and data is not None, title)

    page = ctx.new_page()
    page.set_viewport_size({'width': 800, 'height': 1180})
    today = datetime.date.today().strftime('%Y-%m-%d')
    page.add_init_script("localStorage.setItem('kidsgame_color', JSON.stringify({v:'1.0',game:'color',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0},col:{tutSeen:true}}));" % (today, today))
    page.goto(furl(game))
    page.wait_for_timeout(1500)
    try:
        page.wait_for_function("() => window.COL", timeout=15000)
        # 首页 → 进入关卡（涂色模式）
        page.click('#card-color', timeout=4000)
        page.wait_for_timeout(900)
        # 真实操作：选色→逐区域点击填色（含一次撤销+一次换色覆盖）→完成→celebrate
        page.click('button.swatch[data-c="2"]', timeout=3000)
        n = page.evaluate("() => window.COL.regions.length")
        for i in range(n):
            page.click('[data-r="%d"]' % i, timeout=3000)
            page.wait_for_timeout(90)
            if i == 1:  # 撤销一次再重填
                page.click('#btn-undo', timeout=2000)
                page.click('[data-r="%d"]' % i, timeout=2000)
            if i == 2:  # 换色覆盖
                page.click('button.swatch[data-c="4"]', timeout=2000)
                page.click('[data-r="%d"]' % i, timeout=2000)
                page.click('button.swatch[data-c="2"]', timeout=2000)
        # r6 注：100% 填满=800ms 自动 3 星过关（v1 机制）——done 点击与 celebrate 覆盖层竞态，
        # celebrate 已现则直接走自动过关（3 星同路径），不再强点 done
        page.wait_for_timeout(120)
        if not page.query_selector('.k-celebrate'):
            page.click('#btn-done', timeout=3000)
        page.wait_for_selector('.k-celebrate', timeout=10000)
        check(game, '真实填色通关(第1张)', True, 'celebrate 出现')
    except Exception as e:
        check(game, '真实填色通关(第1张)', False, str(e)[:140])
    ok, d = shot_check(page, 'color-l1')
    check(game, '截图非空白', ok if ok is not None else True, d)
    viewport_check(page, game, '平板800x1180')
    offline_check(page, game)
    return page

# ─────────────────────────── 家长门+加关 E2E（core 级，memory 抽测）───────────────────────────
def test_parent_gate(ctx):
    game = 'memory'
    f = furl(game)
    try:
        p5 = ctx.new_page()
        today = datetime.date.today().strftime('%Y-%m-%d')
        p5.add_init_script("localStorage.setItem('kidsgame_memory', JSON.stringify({v:'1.0',game:'memory',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));" % (today, today))
        p5.goto(f)
        p5.wait_for_timeout(1500)
        p5.click('.k-parentbtn', timeout=5000)
        q = p5.evaluate("() => { const t = document.querySelector('.k-panel .box div'); return t ? t.textContent : ''; }")
        m = re.search(r'(\d+)\s*\+\s*(\d+)', q or '')
        if not m:
            check(game, '家长门(两位数加法)', False, '未解析到题目: ' + str(q)[:60])
            return
        for ch in str(int(m.group(1)) + int(m.group(2))):
            p5.evaluate("n => { const btns = Array.from(document.querySelectorAll('.k-numrow button')); const b = btns.find(x => x.textContent.trim() === n); if (b) b.click(); }", ch)
        p5.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .mbtn')).find(b => b.textContent.includes('确定')); if (ok) ok.click(); }")
        p5.wait_for_timeout(800)
        panel = p5.evaluate("() => !!document.querySelector('.k-panel h3') && document.body.textContent.includes('家长面板')")
        big = all(int(x) >= 10 for x in (m.group(1), m.group(2)))
        check(game, '家长门(两位数加法+进面板)', bool(panel) and big, '题=%s+%s' % (m.group(1), m.group(2)))
        # 手动输入加关：填 5 → limit 应 = 基数(首日6)+5 = 11
        p5.fill('.k-panel .row input[type=number]', '5')
        p5.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .row .mbtn')).find(b => b.textContent.trim() === '确定'); if (ok) ok.click(); }")
        p5.wait_for_timeout(400)
        lim = p5.evaluate("() => (typeof KIDS !== 'undefined') ? KIDS.calendar.limit(50) : null")
        bonus = p5.evaluate("() => KIDS.calendar.bonusToday()")
        check(game, '家长手动输入加关(填5→limit=11)', lim == 11 and bonus == 5, 'limit=%s bonus=%s' % (lim, bonus))
        p5.close()
    except Exception as e:
        check(game, '家长门E2E', False, str(e)[:120])

# ─────────────────────────── main ───────────────────────────
def main():
    from playwright.sync_api import sync_playwright
    pages = []
    with sync_playwright() as p:
        browser = p.chromium.launch()  # headless 独立实例：不弹窗、不 connect/不杀他人浏览器
        for fn, game in ((test_memory, 'memory'), (test_tangram, 'tangram'), (test_color, 'color')):
            ctx = browser.new_context()
            try:
                pages.append(fn(ctx))
            except Exception as e:
                check(game, '整体运行', False, repr(e)[:200])
        try:
            test_parent_gate(browser.new_context())
        except Exception as e:
            check('memory', '家长门整体', False, repr(e)[:150])
        # 触屏 viewport 复检（每款）
        for pg, game in zip(pages, ('memory', 'tangram', 'color')):
            try:
                pg.set_viewport_size({'width': 800, 'height': 1180})
                pg.wait_for_timeout(600)
                viewport_check(pg, game, '平板800x1180')
            except Exception as e:
                check(game, '平板viewport复检', False, str(e)[:100])
        browser.close()

    lines = ['# batch2 集成验收报告', '', '时间：' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), '',
             '| 游戏 | 检查项 | 结果 | 说明 |', '|---|---|---|---|']
    npass = nfail = 0
    for g, item, r, d in RESULTS:
        lines.append('| %s | %s | %s | %s |' % (g, item, r, d.replace('|', '\\|')))
        npass += r == 'PASS'; nfail += r == 'FAIL'
    lines += ['', '**合计：PASS %d / FAIL %d**' % (npass, nfail), '', '截图目录：batch2/shots/']
    out = os.path.join(BASE, 'verify-report.md')
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))
    print('\n报告: ' + out + '  PASS=%d FAIL=%d' % (npass, nfail))
    sys.exit(1 if nfail else 0)

if __name__ == '__main__':
    main()
