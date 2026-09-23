# -*- coding: utf-8 -*-
"""shop-math r6 selftest — headless playwright 自测（独立 chromium.launch(--mute-audio)，不连/不杀任何浏览器进程）
r6（README SPEC r6）：计数域 6-20 按群 + 多件合成总价 + 预算找零 + 干扰方向锚。
--probe：?verify=1 → 打印 r6 全量 clip 浏览器实测时长（回填 game-verify.js SPEC_DUR 用），不做其余段
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + 各单元 audit/budgetConstruct/sm*/group/coin/chains/
   specDur/timing/estMsFamily/layout 全绿
2a. ch1 真实点击（1-1 双轮：banana×6 → apple×7）+ 非所要商品方向锚（hintcard+篮子保留+state 恢复）
2b. ch2 合成总价（2-0：a+b=5元 → 空付 less 锚 → 5 元硬币 ok；p+o=12元 → 5+5+2 → celebrate+写档）
2c. ch3 预算找零（3-0：(2,8) pear+orange=12>8 → cheap 锚+篮保留 → 换 apple+pear=7 → 找零 1 元 ok；
    (2,10) banana+orange=10 整 → 找零 0 直接 ok）
2d. 按群（1-2：r1 pear×8 逐个；r2 apple×10 → 策略条在场+切 5+两次组击+组末报数 play shop_cn 键（T46）+分组点亮）
3. 双 viewport(1280x800/800x1180)：按钮 ≥63、overflowX==0、截图非空白（_shots/）
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(done_keys):
    save = {'v': '1.0', 'game': 'shop', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': {k: {'stars': 3, 'plays': 1} for k in done_keys},
            'dailyMin': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0.3},
            'restTip': {'day': '', 'shown': 0}}
    return ("localStorage.setItem('kidsgame_shop', " + json.dumps(json.dumps(save)) + ");"
            " sessionStorage.setItem('shop_tut','1');")


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        sd = statistics.pstdev(list(im.getdata()))
        return sd > floor, 'PIL stdev=%.1f' % sd
    except ImportError:
        return path.stat().st_size >= 40000, 'PNG %d bytes (PIL unavailable)' % path.stat().st_size


def wait_shopping(page, timeout=15000):
    """等当前轮就绪：state=shopping 且有订单且无覆盖层；返回 (order, state)"""
    deadline = time.time() + timeout / 1000
    while time.time() < deadline:
        r = page.evaluate("""() => { const o = window.SHOP.currentOrder;
          return {m: o && o.m, items: o && o.items, st: SHOP.state, round: SHOP.round,
                  want: o && o.want, B: o && o.B,
                  ov: !!document.querySelector('.k-ov,.k-celebrate')}; }""")
        if r['st'] == 'shopping' and r['m'] and not r['ov']:
            return r
        page.wait_for_timeout(250)
    raise AssertionError('wait_shopping 超时: %s' % r)


def fill_count(page, k, n, gap=90):
    for _ in range(n):
        page.click('.shelf-cell[data-item="%s"]' % k, timeout=3000)
        page.wait_for_timeout(gap)


def main():
    probe = '--probe' in sys.argv
    offline_bad, page_errors = [], []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        # ---- 1. verify=1（probe 模式打印 durs 后退出）----
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=30000)
            title = pg.title()
            vj = json.loads(pg.locator('#verify-result').text_content())
            if probe:
                print('PROBE_DUR=' + json.dumps(vj['durs'], ensure_ascii=False))
                print('units:', json.dumps({k: v['ok'] for k, v in vj['units'].items()}))
                browser.close(); return 0
            check('verify title', title.startswith('VERIFY PASS'), title)
            check('verify JSON pass==total', vj['pass'] == vj['total'], 'pass=%s/%s' % (vj['pass'], vj['total']))
            bad = [k for k, v in vj['units'].items() if not v['ok']]
            check('verify units all ok', not bad, str(bad))
            badlv = ([k for k, v in vj['audit']['levels'].items() if not v['ok']] +
                     [k for k, v in vj['audit']['gen'].items() if not v['ok']])
            check('verify 30-level audit all ok', not badlv, str(badlv[:5]))
            ctx.close()
        finally:
            browser.close()

        # ---- 2a. ch1 真实点击：1-1 双轮 + 非所要方向锚 ----
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
            ctx.add_init_script(preset_save(['1-0']))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.SHOP && SHOP.currentOrder', timeout=10000)
            pg.wait_for_timeout(1200)
            r = wait_shopping(pg)
            check('[2a] start at 1-1 round0 banana*6', r['items'] == [{'k': 'banana', 'n': 6}], str(r['items']))
            # 非所要商品：放 1 个苹果 → 结账 → notwant 方向锚（卡出现+篮保留+不惩罚）
            pg.click('.shelf-cell[data-item="apple"]', timeout=3000)
            pg.wait_for_timeout(300)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(500)
            st = pg.evaluate("""() => ({st: SHOP.state, err: SHOP.errors, kept: SHOP.basket.apple,
                                       card: document.getElementById('hintcard').classList.contains('show')})""")
            check('[2a] wrong good -> notwant anchor + basket kept', st['st'] in ('notwant', 'shopping') and st['err'] == 1 and st['kept'] == 1 and st['card'], str(st))
            pg.wait_for_timeout(1600)  # 锚反馈收起
            pg.click('.slot[data-item="apple"]', timeout=3000)  # 放回非所要商品（真实路径）
            pg.wait_for_timeout(300)
            fill_count(pg, 'banana', 6)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(900)
            r2 = wait_shopping(pg)
            check('[2a] round1 -> round2 apple*7', r2['round'] == 1 and r2['items'] == [{'k': 'apple', 'n': 7}], str(r2['items']))
            fill_count(pg, 'apple', 7)
            pg.click('#btn-checkout', timeout=3000)
            try:
                pg.wait_for_selector('.k-celebrate', timeout=12000)
                ok_lvl = True
            except Exception:
                ok_lvl = False
            check('[2a] two-round level win -> .k-celebrate', ok_lvl)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate("localStorage.getItem('kidsgame_shop')"))
            check('[2a] save 1-1 recorded', '1-1' in saved['levels'], str(list(saved['levels'])))
            pg.screenshot(path=str(SHOTS / 'shop-2a-ch1.png'))
            ok, d = png_nonblank(SHOTS / 'shop-2a-ch1.png')
            check('[2a] screenshot non-blank', ok, d)
            ctx.close()
        finally:
            browser.close()

        # ---- 2b. ch2 合成总价 + 硬币支付 ----
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
            ctx.add_init_script(preset_save(['1-%d' % l for l in range(5)]))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.SHOP && SHOP.currentOrder', timeout=10000)
            pg.wait_for_timeout(1200)
            r = wait_shopping(pg)
            check('[2b] start 2-0 round0 sum(a,b)=5', r['m'] == 'sum' and [i['k'] for i in r['items']] == ['apple', 'banana'], str(r['items']))
            check('[2b] price tags visible in sum round',
                  pg.evaluate("getComputedStyle(document.querySelector('.shelf-cell .price-tag')).display") == 'flex')
            for k in ('apple', 'banana'):
                pg.click('.shelf-cell[data-item="%s"]' % k, timeout=3000)
                pg.wait_for_timeout(250)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(600)
            st = pg.evaluate("() => ({st: SHOP.state, phase: SHOP.state==='paying', panel: document.getElementById('pay-panel').classList.contains('show'), coHidden: getComputedStyle(document.getElementById('btn-checkout')).display==='none'})")
            check('[2b] fill 2 items -> checkout -> paying panel + checkout hidden',
                  st['st'] == 'paying' and st['panel'] and st['coHidden'], str(st))
            # 空付 → less 方向锚
            pg.click('#btn-done', timeout=3000)
            pg.wait_for_timeout(500)
            less = pg.evaluate("() => ({st: SHOP.state, paid: SHOP.paidSum()})")
            check('[2b] empty pay -> payerr(less)', less['st'] == 'payerr' and less['paid'] == 0, str(less))
            pg.wait_for_timeout(1600)  # 锚反馈回落 paying
            pg.click('#coin-dock button[data-v="5"]', timeout=3000)  # 5 元正好
            pg.wait_for_timeout(250)
            paid = pg.evaluate('SHOP.paidSum()')
            check('[2b] coin 5 -> paidSum 5', paid == 5, str(paid))
            pg.click('#btn-done', timeout=3000)
            pg.wait_for_timeout(600)
            r2 = wait_shopping(pg)
            check('[2b] round1 sum(p,o)=12', r2['round'] == 1 and [i['k'] for i in r2['items']] == ['pear', 'orange'], str(r2['items']))
            for k in ('pear', 'orange'):
                pg.click('.shelf-cell[data-item="%s"]' % k, timeout=3000)
                pg.wait_for_timeout(250)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(600)
            for v in (5, 5, 2):
                pg.click('#coin-dock button[data-v="%d"]' % v, timeout=3000)
                pg.wait_for_timeout(200)
            check('[2b] coins 5+5+2 -> paidSum 12', pg.evaluate('SHOP.paidSum()') == 12)
            pg.click('#btn-done', timeout=3000)
            try:
                pg.wait_for_selector('.k-celebrate', timeout=12000)
                ok_lvl = True
            except Exception:
                ok_lvl = False
            check('[2b] sum level win -> .k-celebrate', ok_lvl)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate("localStorage.getItem('kidsgame_shop')"))
            check('[2b] save 2-0 recorded', '2-0' in saved['levels'], str(list(saved['levels'])))
            ctx.close()
        finally:
            browser.close()

        # ---- 2c. ch3 预算找零：cheap 锚 + 找零 ok + 整付 0 找零 ----
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
            ctx.add_init_script(preset_save(['1-%d' % l for l in range(5)] + ['2-%d' % l for l in range(5)]))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.SHOP && SHOP.currentOrder', timeout=10000)
            pg.wait_for_timeout(1200)
            r = wait_shopping(pg)
            check('[2c] start 3-0 round0 budget(2,8)', r['m'] == 'budget' and r.get('want') == 2 and r.get('B') == 8, str(r['m']))
            check('[2c] budget bar shown', pg.evaluate("document.getElementById('budget-bar').classList.contains('show')"))
            # 买不起组合：pear(5)+orange(7)=12 > 8 → cheap 方向锚
            for k in ('pear', 'orange'):
                pg.click('.shelf-cell[data-item="%s"]' % k, timeout=3000)
                pg.wait_for_timeout(250)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(500)
            st = pg.evaluate("""() => ({st: SHOP.state, kept: [SHOP.basket.pear, SHOP.basket.orange],
                                       card: document.getElementById('hintcard').classList.contains('show')})""")
            check('[2c] overspend pair -> cheap anchor + basket kept',
                  st['st'] in ('cheap', 'shopping') and st['kept'] == [1, 1] and st['card'], str(st))
            pg.wait_for_timeout(1600)
            # 换成 apple+pear = 7 ≤ 8 → 找零 1 元
            pg.click('.slot[data-item="orange"]', timeout=3000)  # 放回橙子（篮内槽点按=放回一个）
            pg.wait_for_timeout(300)
            pg.click('.shelf-cell[data-item="apple"]', timeout=3000)
            pg.wait_for_timeout(300)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(600)
            st2 = pg.evaluate("() => ({st: SHOP.state, phase: SHOP.state==='paying', paid: !!document.querySelector('#pay-panel .pp-paid')})")
            check('[2c] valid pair -> change phase with paid badge', st2['st'] == 'paying' and st2['paid'], str(st2))
            pg.click('#coin-dock button[data-v="1"]', timeout=3000)  # 找零 1 元
            pg.wait_for_timeout(250)
            pg.click('#btn-done', timeout=3000)
            pg.wait_for_timeout(600)
            r2 = wait_shopping(pg)
            check('[2c] round1 budget(2,10)', r2['round'] == 1, str(r2['round']))
            # 整付组合：banana(3)+orange(7)=10=B → 找零 0 → 直接完成
            for k in ('banana', 'orange'):
                pg.click('.shelf-cell[data-item="%s"]' % k, timeout=3000)
                pg.wait_for_timeout(250)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(600)
            pg.click('#btn-done', timeout=3000)  # 0 枚直接确认
            try:
                pg.wait_for_selector('.k-celebrate', timeout=12000)
                ok_lvl = True
            except Exception:
                ok_lvl = False
            check('[2c] budget level win (含 0 找零路径) -> .k-celebrate', ok_lvl)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate("localStorage.getItem('kidsgame_shop')"))
            check('[2c] save 3-0 recorded', '3-0' in saved['levels'], str(list(saved['levels'])))
            ctx.close()
        finally:
            browser.close()

        # ---- 2d. 按群：1-2 r2 apple×10（r1 pear×8 逐个）----
        browser = p.chromium.launch(args=['--mute-audio'])
        try:
            ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
            ctx.add_init_script(preset_save(['1-0', '1-1']))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.SHOP && SHOP.currentOrder', timeout=10000)
            pg.wait_for_timeout(1200)
            r = wait_shopping(pg)
            check('[2d] start 1-2 round0 pear*8 (no group bar)',
                  r['items'] == [{'k': 'pear', 'n': 8}] and
                  not pg.evaluate("document.getElementById('group-bar').classList.contains('show')"), str(r['items']))
            fill_count(pg, 'pear', 8)
            pg.click('#btn-checkout', timeout=3000)
            pg.wait_for_timeout(900)
            r2 = wait_shopping(pg)
            check('[2d] round1 apple*10 -> group bar shown',
                  r2['items'] == [{'k': 'apple', 'n': 10}] and
                  pg.evaluate("document.getElementById('group-bar').classList.contains('show')"), str(r2['items']))
            pg.evaluate("""() => { KIDS.voice.play = k => { window.__lastPlayKey = k; }; }""")
            pg.click('#group-bar button[data-g="5"]', timeout=3000)  # 切五个五个
            pg.wait_for_timeout(300)
            grp = pg.evaluate("""() => ({g: SHOP.strategy, groups: document.querySelectorAll('#bubble .b-grp').length,
                                        lit: document.querySelectorAll('#bubble .b-grp.lit').length})""")
            check('[2d] strategy 5 -> bubble 2 groups 0 lit', grp['g'] == 5 and grp['groups'] == 2 and grp['lit'] == 0, str(grp))
            pg.click('.shelf-cell[data-item="apple"]', timeout=3000)  # 组击 1：+5 + 组末报数（T46 clip shop_cn_5）
            pg.wait_for_timeout(600)
            st1 = pg.evaluate("""() => ({n: SHOP.basket.apple, pk: window.__lastPlayKey,
                                        lit: document.querySelectorAll('#bubble .b-grp.lit').length})""")
            check('[2d] group tap +5 + play shop_cn_5 + 1 group lit', st1['n'] == 5 and st1['pk'] == 'shop_cn_5' and st1['lit'] == 1, str(st1))
            pg.click('.shelf-cell[data-item="apple"]', timeout=3000)  # 组击 2：+5 → 10
            pg.wait_for_timeout(600)
            st2 = pg.evaluate("""() => ({n: SHOP.basket.apple, pk: window.__lastPlayKey,
                                        lit: document.querySelectorAll('#bubble .b-grp.lit').length})""")
            check('[2d] group tap +5 -> 10 + play shop_cn_10 + 2 groups lit', st2['n'] == 10 and st2['pk'] == 'shop_cn_10' and st2['lit'] == 2, str(st2))
            pg.click('#btn-checkout', timeout=3000)
            try:
                pg.wait_for_selector('.k-celebrate', timeout=12000)
                ok_lvl = True
            except Exception:
                ok_lvl = False
            check('[2d] grouped level win -> .k-celebrate', ok_lvl)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate("localStorage.getItem('kidsgame_shop')"))
            check('[2d] save 1-2 recorded', '1-2' in saved['levels'], str(list(saved['levels'])))
            pg.screenshot(path=str(SHOTS / 'shop-2d-group.png'))
            ok, d = png_nonblank(SHOTS / 'shop-2d-group.png')
            check('[2d] screenshot non-blank', ok, d)
            ctx.close()
        finally:
            browser.close()

        # ---- 3. 双 viewport 布局 + 截图 ----
        for vp in [(1280, 800), (800, 1180)]:
            browser = p.chromium.launch(args=['--mute-audio'])
            try:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(preset_save(['1-0']))
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.SHOP && SHOP.currentOrder', timeout=10000)
                pg.wait_for_timeout(1200)
                m = pg.evaluate("""() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.closest('#pay-panel')) return;               /* paying 面板此态不在场 */
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 63 || r.height < 63))
                      bad.push((e.id || e.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                          shelf: document.querySelectorAll('.shelf-cell').length};
                }""")
                check('vp %dx%d overflowX==0 + buttons>=63 + shelf=4' % vp,
                      m['ox'] == 0 and not m['bad'] and m['shelf'] == 4,
                      'ox=%s bad=%s' % (m['ox'], m['bad'][:3]))
                shot = SHOTS / ('shop-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, d = png_nonblank(shot)
                check('vp %dx%d screenshot non-blank' % vp, ok, d)
                ctx.close()
            finally:
                browser.close()

    # ---- 4. 离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
