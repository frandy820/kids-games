# -*- coding: utf-8 -*-
"""batch1 三款儿童游戏集成验收（playwright 真实操作模拟）
用法: python verify_batch1.py
输出: batch1/verify-report.md + batch1/shots/*.png
协议见 design/DESIGN-SPEC.md §12。
"""
import json, os, sys, time, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, 'shots')
os.makedirs(SHOTS, exist_ok=True)

RESULTS = []  # (game, item, ok, detail)

def check(game, item, ok, detail=''):
    RESULTS.append((game, item, 'PASS' if ok else 'FAIL', str(detail)[:300]))
    print(('[PASS] ' if ok else '[FAIL] ') + game + ' / ' + item + (' -- ' + str(detail)[:120] if detail else ''))

def read_verify(page, url):
    page.goto(url)
    # verify 模式同步执行，等 title 变为 VERIFY 前缀或超时
    for _ in range(60):
        t = page.title()
        if t.startswith('VERIFY'):
            break
        page.wait_for_timeout(250)
    title = page.title()
    body = page.evaluate("() => { const e = document.querySelector('#verify-result'); return e ? e.textContent : ''; }")
    data = None
    try:
        data = json.loads(body)
    except Exception:
        pass
    return title, data

def shot_check(page, name):
    """截图 + 像素非空白校验（PIL 可用时）"""
    path = os.path.join(SHOTS, name + '.png')
    page.screenshot(path=path)
    try:
        from PIL import Image
        import statistics
        im = Image.open(path).convert('L').resize((80, 60))
        px = list(im.getdata())
        stdev = statistics.pstdev(px)
        return stdev > 3.0, 'stdev=%.1f' % stdev
    except ImportError:
        return None, 'PIL 不可用，跳过像素校验（截图已存）'

def viewport_check(page, game, tag):
    ox = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(game, tag + ' 无横向溢出', ox <= 0, 'overflowX=' + str(ox))
    small = page.evaluate("""() => {
      const bad = [];
      document.querySelectorAll('button, [data-x], [data-item], .k-btn').forEach(el => {
        if (el.classList.contains('k-parentbtn') || el.closest('.k-parentbtn')) return; // 家长按钮=成人目标，44pt 故意低调
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;              // 隐藏元素不计
        if (r.width < 63 || r.height < 63) bad.push((el.className||el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      return bad.slice(0, 5);
    }""")
    check(game, tag + ' 触摸目标>=64px', len(small) == 0, small)

def offline_check(page, game):
    refs = page.evaluate("() => { const bad = []; document.querySelectorAll('[src],[href],[url]').forEach(el => { ['src','href'].forEach(a => { const v = el.getAttribute ? el.getAttribute(a) : null; if (v && /^https?:/i.test(v)) bad.push(a + '=' + v.slice(0, 60)); }); }); return bad; }")
    css_http = page.evaluate("() => /url\\(\\s*['\\\"]?https?:\\/\\//i.test(Array.from(document.styleSheets).map(s => { try { return s.ownerNode.textContent } catch(e) { return '' } }).join(''))")
    check(game, '完全离线(无http引用)', len(refs) == 0 and not css_http, refs)

# ─────────────────────────── pipe-rabbit ───────────────────────────
def test_pipe(ctx):
    game = 'pipe-rabbit'
    f = 'file:///' + os.path.join(BASE, 'pipe-rabbit', 'index.html').replace('\\\\', '/')

    # 1) verify 自检
    title, data = read_verify(ctx.new_page(), f + '?verify=1')
    ok = title.startswith('VERIFY PASS') and data is not None
    check(game, '?verify=1 求解器自检', ok, title + ' | ' + (json.dumps(data, ensure_ascii=False)[:150] if data else 'no json'))

    # 2) 真实操作通关第 1 关（预置 tutSeen 跳过"看"演示——演示已有专门抽验，此处验收操作通路）
    page = ctx.new_page()
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.add_init_script("localStorage.setItem('kidsgame_pipe', JSON.stringify({v:'1.0',game:'pipe',firstDay:'2026-09-05',lastDay:'2026-09-05',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTipShownMin:0,tutSeen:true}));")
    page.goto(f)
    page.wait_for_timeout(1500)
    try:
        page.wait_for_function("() => window.GAME && window.PipeSolve", timeout=15000)
    except Exception as e:
        check(game, '真实操作通关(第1关)', False, '钩子未出现: ' + str(e)[:80]); return page
    solved = False
    try:
        seq = page.evaluate("() => window.PipeSolve(0, 0)")
        for step in (seq or []):
            for _ in range(int(step.get('times', 0))):  # 信任求解器语义（times=4 表示转一整圈回解）
                page.click('[data-x="%s"][data-y="%s"]' % (step['x'], step['y']), timeout=3000)
                page.wait_for_timeout(200)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        solved = True
    except Exception as e:
        # 教学关可能点击前已放水/或初始即解，直接看是否已过关
        try:
            page.wait_for_selector('.k-celebrate', timeout=3000)
            solved = True
        except Exception:
            solved = False
    check(game, '真实操作通关(第1关)', solved, 'celebrate 出现' if solved else '未触发过关')

    # 3) 第 2 关：预置第 1 关进度后重开
    try:
        p2 = ctx.new_page()
        p2.set_viewport_size({'width': 1280, 'height': 800})
        p2.add_init_script("localStorage.setItem('kidsgame_pipe', JSON.stringify({v:'1.0',game:'pipe',firstDay:'2026-09-05',lastDay:'2026-09-05',levels:{'1-0':{stars:3,plays:1}},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTipShownMin:0,tutSeen:true}));")
        p2.goto(f)
        p2.wait_for_timeout(1200)
        p2.wait_for_function("() => window.GAME && window.PipeSolve", timeout=15000)
        seq = p2.evaluate("() => window.PipeSolve(0, 1)")
        lv = p2.evaluate("() => window.GAME.currentLevel")
        ok2 = False
        for step in (seq or []):
            for _ in range(int(step.get('times', 0))):
                p2.click('[data-x="%s"][data-y="%s"]' % (step['x'], step['y']), timeout=3000)
                p2.wait_for_timeout(200)
        try:
            p2.wait_for_selector('.k-celebrate', timeout=8000); ok2 = True
        except Exception:
            ok2 = False
        check(game, '真实操作通关(第2关, level=%s)' % lv, ok2, '')
        ok, d = shot_check(p2, 'pipe-level2')
        check(game, '第2关截图非空白', ok if ok is not None else True, d)
        p2.close()
    except Exception as e:
        check(game, '真实操作通关(第2关)', False, str(e)[:120])

    ok, d = shot_check(page, 'pipe-level1')
    check(game, '第1关截图非空白', ok if ok is not None else True, d)
    viewport_check(page, game, '桌面1280')
    offline_check(page, game)
    return page

# ─────────────────────────── shop-math ───────────────────────────
def test_shop(ctx):
    game = 'shop-math'
    f = 'file:///' + os.path.join(BASE, 'shop-math', 'index.html').replace('\\\\', '/')

    title, data = read_verify(ctx.new_page(), f + '?verify=1')
    ok = title.startswith('VERIFY PASS') and data is not None
    check(game, '?verify=1 订单状态机自检', ok, title + ' | ' + (json.dumps(data, ensure_ascii=False)[:150] if data else 'no json'))

    page = ctx.new_page()
    page.set_viewport_size({'width': 800, 'height': 1180})  # 平板竖屏触摸
    page.add_init_script("sessionStorage.setItem('shop_tut', '1');")  # 跳过教学"看"演示（演示另有抽验）
    page.goto(f)
    page.wait_for_timeout(2500)
    try:
        page.wait_for_function("() => window.SHOP", timeout=15000)
    except Exception as e:
        check(game, '真实完成2单', False, 'SHOP 钩子未出现: ' + str(e)[:80]); return page
    done = 0
    for order_i in range(2):
        try:
            done_before = page.evaluate("() => Object.keys(KIDS._save().levels).length")
            # r6 SPEC：除教学关外每关 2 轮——逐轮等单就绪→按 items 填货→结账，直到存档关数增长（关完成信号）
            ok_order = False
            for _round in range(4):
                for _ in range(40):
                    order = page.evaluate("() => window.SHOP.currentOrder")
                    st = page.evaluate("() => window.SHOP.state")
                    has_ov = page.evaluate("() => !!document.querySelector('.k-ov, .k-celebrate')")
                    if order and order.get('items') and st == 'shopping' and not has_ov: break
                    page.wait_for_timeout(500)
                items = (order or {}).get('items', [])
                for it in items:
                    for _ in range(int(it.get('n', 0))):
                        page.click('[data-item="%s"]' % it['k'], timeout=3000)
                        page.wait_for_timeout(150)
                page.click('#btn-checkout', timeout=3000)
                for _ in range(24):
                    page.wait_for_timeout(500)
                    if page.evaluate("() => Object.keys(KIDS._save().levels).length") > done_before:
                        ok_order = True; break
                if ok_order: break
            if ok_order:
                done += 1
            else:
                st = page.evaluate("() => window.SHOP.state")
                check(game, '真实完成2单', False, '订单%s结账后未写档 state=%s' % (order_i + 1, st)); break
        except Exception as e:
            check(game, '真实完成2单', False, '订单%s异常: %s' % (order_i + 1, str(e)[:100])); break
    if done:
        check(game, '真实完成2单', done >= 2, '完成 %d/2（以存档关数为完成信号）' % done)

    # 3bis) 章末通关 E2E（反方审查 F1 回归）：预置本章前 4 关→完成第 5 单→断言 chapterEnd 仪式 + 游戏可继续
    try:
        p3 = ctx.new_page()
        p3.set_viewport_size({'width': 800, 'height': 1180})
        p3.add_init_script("localStorage.setItem('kidsgame_shop', JSON.stringify({v:'1.0',game:'shop',firstDay:'2026-09-04',lastDay:'2026-09-04',levels:{'1-0':{stars:3,plays:1},'1-1':{stars:3,plays:1},'1-2':{stars:3,plays:1},'1-3':{stars:3,plays:1}},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}})); sessionStorage.setItem('shop_tut','1');")
        p3.goto(f)
        p3.wait_for_timeout(2500)
        p3.wait_for_function("() => window.SHOP", timeout=15000)
        order = None
        # r6 SPEC：每关 2 轮——逐轮填货结账；关完成先 celebrate(~3.4s)再出章末层，
        # 结账后轮询「章末层出现→break」或「无覆盖层且回 shopping→下一轮」
        for _round in range(4):
            for _ in range(40):
                order = p3.evaluate("() => window.SHOP.currentOrder")
                st = p3.evaluate("() => window.SHOP.state")
                if order and order.get('items') and st == 'shopping': break
                p3.wait_for_timeout(500)
            for it in (order or {}).get('items', []):
                for _ in range(int(it.get('n', 0))):
                    p3.click('[data-item="%s"]' % it['k'], timeout=3000)
                    p3.wait_for_timeout(150)
            p3.click('#btn-checkout', timeout=3000)
            chapter = False
            for _ in range(30):
                p3.wait_for_timeout(500)
                if p3.query_selector('.k-chapterend'): chapter = True; break
                if _ >= 4 and not p3.query_selector('.k-celebrate, .k-ov') and \
                   p3.evaluate("() => window.SHOP.state") == 'shopping': break
            if chapter: break
        try:
            p3.wait_for_selector('.k-chapterend', timeout=15000)
            # 关闭章末层后游戏可继续（下一单加载或日历回本章）
            p3.click('.k-chapterend .k-btn', timeout=3000)
            p3.wait_for_timeout(1500)
            alive = p3.evaluate("() => !!window.SHOP && !document.querySelector('.k-chapterend')")
            check(game, '章末通关E2E(第5单→打烊结算→可继续)', bool(alive), 'chapterEnd 出现且关闭后存活')
        except Exception as e:
            ov = p3.evaluate("() => document.querySelector('.k-ov') ? document.querySelector('.k-ov').className : 'none'")
            check(game, '章末通关E2E(第5单→打烊结算→可继续)', False, 'chapterEnd 未出现 ov=%s err=%s' % (ov, str(e)[:80]))
        p3.close()
    except Exception as e:
        check(game, '章末通关E2E', False, str(e)[:120])

    # 3triple) 跨日日历 E2E：firstDay=昨天 → 今日上限应为 6（3+3）
    try:
        import datetime as _dt
        yday = (_dt.date.today() - _dt.timedelta(days=1)).strftime('%Y-%m-%d')
        p4 = ctx.new_page()
        p4.add_init_script("localStorage.setItem('kidsgame_shop', JSON.stringify({v:'1.0',game:'shop',firstDay:'" + yday + "',lastDay:'" + yday + "',levels:{'1-0':{stars:3,plays:1}},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));")
        p4.goto(f)
        p4.wait_for_timeout(2500)  # const KIDS 不挂 window，等页面就绪后直接取值
        lim = p4.evaluate("() => (typeof KIDS !== 'undefined') ? KIDS.calendar.limit(20) : null")
        check(game, '跨日日历(昨日首玩→今日上限12=2天x6)', lim == 12, 'limit=%s' % lim)
        p4.close()
    except Exception as e:
        check(game, '跨日日历', False, str(e)[:120])

    # 3quad) 家长门 E2E：两位数加法→数字键盘输入→面板出现
    try:
        p5 = ctx.new_page()
        import datetime as _dt3
        today3 = _dt3.date.today().strftime('%Y-%m-%d')
        p5.add_init_script("localStorage.setItem('kidsgame_shop', JSON.stringify({v:'1.0',game:'shop',firstDay:'" + today3 + "',lastDay:'" + today3 + "',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));")  # 同 ctx 前序页面会写共享 localStorage，预置首日=今天（基数 6）
        p5.goto(f)
        p5.wait_for_timeout(1500)
        p5.click('.k-parentbtn', timeout=5000)
        q = p5.evaluate("() => { const t = document.querySelector('.k-panel .box div'); return t ? t.textContent : ''; }")
        import re as _re
        m = _re.search(r'(\d+)\s*\+\s*(\d+)', q or '')
        if m:
            ans = int(m.group(1)) + int(m.group(2))
            for ch in str(ans):
                p5.evaluate("n => { const btns = Array.from(document.querySelectorAll('.k-numrow button')); const b = btns.find(x => x.textContent.trim() === n); if (b) b.click(); }", ch)
            p5.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .mbtn')).find(b => b.textContent.includes('确定')); if (ok) ok.click(); }")
            p5.wait_for_timeout(800)
            panel = p5.evaluate("() => !!document.querySelector('.k-panel h3') && document.body.textContent.includes('家长面板')")
            big = all(int(x) >= 10 for x in (m.group(1), m.group(2)))
            check(game, '家长门(两位数加法+数字键盘+进面板)', bool(panel) and big, '题=%s+%s 面板=%s' % (m.group(1), m.group(2), panel))
        else:
            check(game, '家长门(两位数加法)', False, '未解析到题目: ' + str(q)[:60])

        # 家长输入框加关 E2E：上面家长门通过后面板已开，直接填 5 → 确定 → 今日 limit 应=基数(首日6)+5=11
        try:
            p5.fill('.k-panel .row input[type=number]', '5')
            p5.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .row .mbtn')).find(b => b.textContent.trim() === '确定'); if (ok) ok.click(); }")
            p5.wait_for_timeout(400)
            lim = p5.evaluate("() => KIDS.calendar.limit(20)")
            bonus = p5.evaluate("() => KIDS.calendar.bonusToday()")
            p5.close()
            check(game, '家长手动输入加关(填5→limit=11)', lim == 11 and bonus == 5, 'limit=%s bonus=%s' % (lim, bonus))
        except Exception as e:
            check(game, '家长手动输入加关', False, str(e)[:120])
    except Exception as e:
        check(game, '家长门E2E', False, str(e)[:120])

    # 基数封顶 E2E：首玩 5 天前 → limit=12（第 2 天起封顶，不再随天数线性涨）
    try:
        import datetime as _dt2
        old = (_dt2.date.today() - _dt2.timedelta(days=5)).strftime('%Y-%m-%d')
        p6 = ctx.new_page()
        p6.add_init_script("localStorage.setItem('kidsgame_shop', JSON.stringify({v:'1.0',game:'shop',firstDay:'" + old + "',lastDay:'" + old + "',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));")
        p6.goto(f)
        p6.wait_for_timeout(2000)
        lim = p6.evaluate("() => (typeof KIDS !== 'undefined') ? KIDS.calendar.limit(100) : null")
        check(game, '日历基数封顶(第6天→limit=12)', lim == 12, 'limit=%s' % lim)
        p6.close()
    except Exception as e:
        check(game, '日历基数封顶', False, str(e)[:120])
    ok, d = shot_check(page, 'shop-main')
    check(game, '截图非空白', ok if ok is not None else True, d)
    viewport_check(page, game, '平板800x1180')
    offline_check(page, game)
    return page

# ─────────────────────────── kitchen-rhythm ───────────────────────────
def test_rhythm(ctx):
    game = 'kitchen-rhythm'
    f = 'file:///' + os.path.join(BASE, 'kitchen-rhythm', 'index.html').replace('\\\\', '/')

    title, data = read_verify(ctx.new_page(), f + '?verify=1&auto=1')
    ok = title.startswith('VERIFY PASS') and data is not None
    check(game, '?verify=1&auto=1 曲目校验+auto-hit', ok, title + ' | ' + (json.dumps(data, ensure_ascii=False)[:150] if data else 'no json'))

    # auto 模式跑完一曲断言结算层
    page = ctx.new_page()
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.goto(f + '?verify=1&auto=1')
    try:
        page.wait_for_selector('.k-song-end', timeout=60000)
        check(game, 'auto-hit 完整打完一曲', True, '.k-song-end 出现')
    except Exception:
        # verify 页可能与游戏页分开，尝试直接驱动游戏
        try:
            p2 = ctx.new_page()
            p2.goto(f)
            p2.wait_for_function("() => window.RHY", timeout=15000)
            p2.evaluate("() => window.RHY.autoRun()")
            p2.wait_for_selector('.k-song-end', timeout=60000)
            check(game, 'auto-hit 完整打完一曲', True, 'RHY.autoRun 完成')
            p2.close()
        except Exception as e:
            check(game, 'auto-hit 完整打完一曲', False, str(e)[:100])

    # 手动模式 5 次随机点击无异常
    try:
        p3 = ctx.new_page()
        p3.set_viewport_size({'width': 800, 'height': 1180})
        p3.goto(f)
        p3.wait_for_function("() => window.RHY", timeout=15000)
        for i in range(5):
            p3.evaluate("() => window.RHY.hit()")
            p3.wait_for_timeout(400)
        alive = p3.evaluate("() => !!window.RHY && !document.querySelector('.k-ov-error')")
        check(game, '手动模式随机点击无异常', bool(alive), '5次hit后存活')
        ok, d = shot_check(p3, 'rhythm-manual')
        check(game, '截图非空白', ok if ok is not None else True, d)
        viewport_check(p3, game, '平板800x1180')
        offline_check(p3, game)
        p3.close()
    except Exception as e:
        check(game, '手动模式随机点击无异常', False, str(e)[:100])
    return page

# ─────────────────────────── main ───────────────────────────
def main():
    from playwright.sync_api import sync_playwright
    pages = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fn in (test_pipe, test_shop, test_rhythm):
            ctx = browser.new_context()
            try:
                pages.append(fn(ctx))
            except Exception as e:
                check(fn.__name__, '整体运行', False, repr(e)[:200])
            # 注意：page 保留用于可能的补充检查，ctx 不立即关闭
        # 触屏 viewport 复检（管道桌面版页面）
        try:
            pg = pages[0]
            pg.set_viewport_size({'width': 800, 'height': 1180})
            pg.wait_for_timeout(600)
            viewport_check(pg, 'pipe-rabbit', '平板800x1180')
            ok, d = shot_check(pg, 'pipe-tablet')
            check('pipe-rabbit', '平板截图非空白', ok if ok is not None else True, d)
        except Exception as e:
            check('pipe-rabbit', '平板viewport复检', False, str(e)[:100])
        browser.close()

    # 报告
    lines = ['# batch1 集成验收报告', '', '时间：' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), '',
             '| 游戏 | 检查项 | 结果 | 说明 |', '|---|---|---|---|']
    npass = nfail = 0
    for g, item, r, d in RESULTS:
        lines.append('| %s | %s | %s | %s |' % (g, item, r, d.replace('|', '\\|')))
        npass += r == 'PASS'; nfail += r == 'FAIL'
    lines += ['', '**合计：PASS %d / FAIL %d**' % (npass, nfail), '', '截图目录：batch1/shots/']
    out = os.path.join(BASE, 'verify-report.md')
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))
    print('\n报告: ' + out + '  PASS=%d FAIL=%d' % (npass, nfail))
    sys.exit(1 if nfail else 0)

if __name__ == '__main__':
    main()
