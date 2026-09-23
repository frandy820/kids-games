# -*- coding: utf-8 -*-
"""spotdiff _selftest — headless playwright 自测（独立 asyncio + chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk
2a. 预置存档(跳过教学) → 先点空白(轻摆零惩罚+首错无高亮圈) → 真实鼠标点下图坐标通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看→帮→独 真实链路 → tutSeen 持久化
2c. 章 4 关（flat=15）：K=5 真实点击通关
3. 双 viewport(1280x800/800x1180)：overflowX==0、按钮触摸目标 ≥64、命中热区圆直径 ≥127、
    上下图各 ≥200 高且宽 ≤800、截图像素非空白
4. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
"""
import asyncio, json, math, sys
from datetime import date, timedelta
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = ''  # 运行时填充
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, bool(ok), detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    import time
    today = time.strftime('%Y-%m-%d')
    save = {
        'v': '1.0', 'game': 'spotdiff', 'firstDay': OLD, 'lastDay': today,
        'levels': {}, 'dailyMin': {}, 'bonus': {today: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'spotdiff': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_spotdiff", ' + json.dumps(json.dumps(save)) + ')'


async def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


async def vb_to_page(page, x, y):
    """下图 viewBox 坐标 → 页面像素坐标（与渲染同源：svg getBoundingClientRect）"""
    return await page.evaluate(
        '''([x, y]) => { const s = document.querySelector('#pic-bottom svg');
          const r = s.getBoundingClientRect();
          return [r.left + x / 800 * r.width, r.top + y / 460 * r.height]; }''', [x, y])


async def real_solve(page, blanks=0):
    """真实鼠标通关当前关：先点 blanks 个空白处，再用 SPD.quiz.diffs 坐标逐处点击"""
    for _ in range(blanks):
        far = await page.evaluate('''() => {
          const q = SPD.quiz; if (!q) return null;
          for (let gy = 90; gy <= 420; gy += 24) for (let gx = 80; gx <= 720; gx += 24) {
            if (q.diffs.every(d => Math.hypot(gx - d.x, gy - d.y) >= 170)) return [gx, gy];
          } return null; }''')
        if not far:
            check('blank point found', False, 'no far point')
            return
        px, py = await vb_to_page(page, far[0], far[1])
        await page.mouse.click(px, py)
        await page.wait_for_timeout(700)
    taps = 0
    while taps < 30:
        q = await page.evaluate('SPD.quiz')
        if q is None:
            break
        d = q['diffs'][q['found'].index(False)] if False in q['found'] else q['diffs'][0]
        px, py = await vb_to_page(page, d['x'], d['y'])
        # 真实点击前先 elementFromPoint 确认落点在下图内（换算正确性证据）
        hit = await page.evaluate('''([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return el ? !!(el.closest && el.closest('#pic-bottom')) : false; }''', [px, py])
        if not hit:
            check('elementFromPoint lands in bottom pic', False, '%.0f,%.0f' % (px, py))
            return
        await page.mouse.click(px, py)
        taps += 1
        await page.wait_for_timeout(250)
    await page.wait_for_selector('.k-celebrate', timeout=9000)
    return taps


async def main():
    offline_bad, page_errors = [], []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page(); watch(pg, 'verify')
            await pg.goto(URL + '?verify=1')
            await pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
            title = await pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(await pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s units=%s' % (vj['pass'], vj['total'], list(vj['units'].keys())))
            lv0 = vj['levels']['1-0']
            check('verify flat0 record ok', lv0['ok'], json.dumps(lv0)[:120])
            await ctx.close()

            # ---- 2a. 预置存档：空白点零惩罚 + 真实点击通关（2 星） ----
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = await ctx.new_page(); watch(pg, '2a')
            await pg.goto(URL)
            await pg.wait_for_function('window.SPD && SPD.currentLevel', timeout=8000)
            lv = await pg.evaluate('SPD.currentLevel')
            check('start at 1-0 (ch 1-based, k=2)', lv and lv['ch'] == 1 and lv['lv'] == 0 and lv['k'] == 2, str(lv))
            check('tutorial skipped (preset)', await pg.evaluate('SPD.tutorial') == 'none')
            # 点空白：轻摆 + miss 计数 + 首错无高亮圈 + 不锁
            far = await page_far(pg)
            px, py = await vb_to_page(pg, far[0], far[1])
            await pg.mouse.click(px, py)
            await pg.wait_for_timeout(700)
            st = await pg.evaluate('''() => ({ lv: SPD.currentLevel,
              wob: getComputedStyle(document.querySelector('#pic-bottom svg')).animationName,
              hint: document.querySelectorAll('#pic-bottom .hintring').length })''')
            check('blank tap: miss+1, found=0, not locked', st['lv']['misses'] == 1 and st['lv']['foundCount'] == 0, str(st['lv']))
            check('blank tap: wobble anim played', st['wob'] == 'picwob', st['wob'])
            check('first miss: no hint ring (no pulse)', st['hint'] == 0, str(st['hint']))
            taps = await real_solve(pg)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 blank)', stars == 2, 'stars=%d taps=%s' % (stars, taps))
            await pg.wait_for_timeout(3400)
            lv2 = await pg.evaluate('SPD.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_spotdiff")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2, str(saved['levels']))
            await ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = await ctx.new_page(); watch(pg, '2b')
            await pg.goto(URL)
            await pg.wait_for_function('window.SPD && SPD.currentLevel', timeout=8000)
            await pg.wait_for_function("SPD.tutorial === 'help'", timeout=20000)   # 等"看"演示完成
            q = await pg.evaluate('SPD.quiz')
            check('tutorial watch done -> level reset (k=2, none found)', q and q['k'] == 2 and not any(q['found']), str(q))
            try:
                await pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> first diff', ghost_shown)
            await real_solve(pg)                 # "帮"首次找到→"独"，继续通关
            await pg.wait_for_timeout(3400)
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_spotdiff")'))
            check('spotdiff.tutSeen persisted', (saved.get('spotdiff') or {}).get('tutSeen') is True, str(saved.get('spotdiff')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            await ctx.close()

            # ---- 2c. 章 4（flat=15, K=5）：真实点击通关 ----
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = await ctx.new_page(); watch(pg, '2c')
            await pg.goto(URL)
            await pg.wait_for_function('window.SPD && SPD.currentLevel', timeout=8000)
            lv = await pg.evaluate('SPD.currentLevel')
            check('ch4 level start at flat=15 (k=5)', lv and lv['flat'] == 15 and lv['dch'] == 4 and lv['k'] == 5, str(lv))
            taps = await real_solve(pg)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('ch4 real-click win 3 stars (0 blank)', stars == 3, 'stars=%d taps=%s' % (stars, taps))
            await pg.wait_for_timeout(3400)
            lv2 = await pg.evaluate('SPD.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            await ctx.close()

            # ---- 3. 双 viewport：布局 + 触摸目标 + 热区 + 截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = await browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                await ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                pg = await ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                await pg.goto(URL)
                await pg.wait_for_function('window.SPD && SPD.currentLevel', timeout=8000)
                await pg.wait_for_timeout(900)
                m = await pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const t = document.querySelector('#pic-top svg').getBoundingClientRect();
                  const b = document.querySelector('#pic-bottom svg').getBoundingClientRect();
                  const hz = [...document.querySelectorAll('#pic-bottom .hotzone')].map(h => h.getBoundingClientRect());
                  return { ox: de.scrollWidth - de.clientWidth, bad: bad,
                    topW: Math.round(t.width), topH: Math.round(t.height),
                    botW: Math.round(b.width), botH: Math.round(b.height),
                    hzN: hz.length, hzMin: hz.length ? Math.round(Math.min(...hz.map(r => Math.min(r.width, r.height)))) : 0 };
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d buttons >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d pics >=200h & <=800w' % vp,
                      m['topH'] >= 200 and m['botH'] >= 200 and m['topW'] <= 800 and m['botW'] <= 800,
                      'top=%dx%d bot=%dx%d' % (m['topW'], m['topH'], m['botW'], m['botH']))
                check('vp %dx%d hotzones >=127px (r>=64)' % vp,
                      m['hzN'] == 5 and m['hzMin'] >= 127, 'n=%s min=%s' % (m['hzN'], m['hzMin']))
                shot = SHOTS / ('spotdiff-vp%dx%d.png' % vp)
                await pg.screenshot(path=str(shot))
                ok, detail = await png_nonblank(shot)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
                if ok:
                    shot.unlink()
                await ctx.close()
        finally:
            await browser.close()

    # ---- 4. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


async def page_far(pg):
    return await pg.evaluate('''() => {
      const q = SPD.quiz;
      for (let gy = 90; gy <= 420; gy += 24) for (let gx = 80; gx <= 720; gx += 24) {
        if (q.diffs.every(d => Math.hypot(gx - d.x, gy - d.y) >= 170)) return [gx, gy];
      } return null; }''')


if __name__ == '__main__':
    asyncio.run(main())
