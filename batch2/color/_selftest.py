# -*- coding: utf-8 -*-
"""涂色本（color r6）headless 自测：verify / 真实操作通关（free+match/mix/pat）/ 章·日收尾
/ 自由画布 / 双 viewport（含三新模式布局）。绝不 connect / 杀任何浏览器——chromium.launch() 全新实例。
r6（2026-09-13）：flats 0-4 free 保留 v1 流程；5-9 match / 10-14 mix / 15-19 pat 真实点击通关。
用法: python _selftest.py
"""
import json
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
URL = (ROOT / 'index.html').resolve().as_uri()
SHOTS = ROOT / '_shots'
SHOTS.mkdir(exist_ok=True)

RESULTS = []
HTTP_REQS = []                                    # r6 审查 m-4：离线监听（非 file:// 请求即 FAIL）


def check(name, ok, info=''):
    RESULTS.append((name, bool(ok), info))
    print('%s %-40s %s' % ('[' + ('PASS' if ok else 'FAIL') + ']', name, info))


def png_nonblank(path):
    size = pathlib.Path(path).stat().st_size
    if size < 20000:
        return False, 'size=%d' % size
    try:
        from PIL import Image
        img = Image.open(path).convert('L')
        small = img.resize((64, 64))
        px = list(small.getdata())
        spread = max(px) - min(px)
        return spread > 12, 'spread=%d' % spread
    except ImportError:
        return True, 'size=%d(no PIL, size-heuristic)' % size


INK_JS = """() => {
  const cv = document.getElementById('fcanvas');
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4)
    if (d[i+3] > 0 && (Math.abs(d[i]-255) > 24 || Math.abs(d[i+1]-253) > 24 || Math.abs(d[i+2]-247) > 24)) n++;
  return n;
}"""

SAVE_INIT = """localStorage.setItem('kidsgame_color', JSON.stringify({v:'1.0', game:'color', firstDay:'__T__', lastDay:'__T__',
  levels:{}, dailyMin:{}, settings:{sound:true,tts:true,vol:0.6}, restTip:{day:'',shown:0}, col:{tutSeen:1}}))"""


def save_init(today):
    return SAVE_INIT.replace('__T__', today)

DISPATCH_FILL = """(i) => document.querySelector('#art .rg[data-r="' + i + '"]')
  .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))"""


def drive_win(page, max_steps=24):
    """autoSolve 逐手循环至过关（新模式通用；free 由调用方走 done 路径）"""
    page.wait_for_function("COL.mode && COL.mode !== 'free' ? true : COL.regions.length > 0", timeout=5000)
    for _ in range(max_steps):
        if page.evaluate('COL.autoSolve().done'):
            break
        page.wait_for_timeout(60)
    page.wait_for_timeout(400)
    return page.evaluate("!!COL.currentLevel")


def main():
    today = time.strftime('%Y-%m-%d')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ---------- a. verify=1（双 viewport 双绿） ----------
        for vw, vh in [(1280, 800), (800, 1180)]:
            ctx = browser.new_context(viewport={'width': vw, 'height': vh})
            page = ctx.new_page()
            errs = []
            page.on('request', lambda r: HTTP_REQS.append(r.url) if r.url.startswith('http') else None)
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(URL + '?verify=1')
            page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
            title = page.title()
            check('verify %dx%d title' % (vw, vh), title.startswith('VERIFY PASS'), title)
            data = json.loads(page.locator('#verify-result').text_content())
            ok_n = sum(1 for c in data['checks'] if c['ok'])
            check('verify %dx%d checks' % (vw, vh), data['pass'] and ok_n == len(data['checks']),
                  '%d/%d pass' % (ok_n, len(data['checks'])))
            bad = [c['name'] for c in data['checks'] if not c['ok']]
            if bad:
                check('verify %dx%d detail' % (vw, vh), False, 'failed: %s' % bad)
            check('verify %dx%d no pageerror' % (vw, vh), not errs, str(errs[:3]))
            ctx.close()

        # ---------- b. 真实操作通关（free flat0：教学 + 撤销 + 覆盖 + 完成） ----------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL)
        page.wait_for_selector('#scene-play.on', timeout=10000)
        check('boot -> tutorial level', page.evaluate('COL.currentLevel') == '1-0',
              page.evaluate('COL.currentLevel'))
        page.wait_for_function("COL.regions.some(r => r.color != null)", timeout=8000)
        demo = page.evaluate('COL.regions.filter(r => r.color != null).length')
        check('tutorial watch-demo fill', demo == 1, 'filled=%d' % demo)
        page.wait_for_selector('#finger.go', timeout=6000)
        check('tutorial help finger', True)
        page.locator('#palette .swatch[data-c="3"]').click()
        page.locator('#art .rg[data-r="5"]').click()
        c5 = page.evaluate('COL.regions[5].color')
        check('real click fill', c5 == 3, 'r5=%s' % c5)
        page.locator('#palette .swatch[data-c="7"]').click()
        page.locator('#art .rg[data-r="5"]').click()
        c5b = page.evaluate('COL.regions[5].color')
        check('overwrite fill', c5b == 7, 'r5=%s' % c5b)
        page.locator('#btn-undo').click()
        c5c = page.evaluate('COL.regions[5].color')
        check('undo', c5c == 3, 'r5=%s' % c5c)
        page.wait_for_function("document.querySelectorAll('.pdot.on').length >= 2", timeout=5000)
        check('tutorial independent (2 child fills)', True)
        page.screenshot(path=str(SHOTS / 'play-filled-partial.png'))
        page.evaluate("""() => {
          COL.regions.filter(r => r.color == null)
            .forEach(r => document.querySelector('#art .rg[data-r="' + r.i + '"]')
              .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})));
        }""")
        left = page.evaluate('COL.regions.filter(r => r.color == null).length')
        check('fill all regions', left == 0, 'left=%d' % left)
        page.wait_for_timeout(120)
        # 100% 填满=800ms 自动 3 星过关（v1 机制）——与真点 done 竞态：celebrate 已现走自动，否则真点
        if not page.query_selector('.k-celebrate'):
            page.locator('#btn-done').click()
        page.wait_for_selector('.k-celebrate', timeout=6000)
        check('celebrate appears', True)
        page.screenshot(path=str(SHOTS / 'play-celebrate.png'))
        page.wait_for_selector('.k-celebrate', state='detached', timeout=8000)
        page.wait_for_function("document.querySelector('#scene-home.on')", timeout=8000)
        sv = page.evaluate("JSON.parse(localStorage.getItem('kidsgame_color') || '{}')")
        rec = (sv.get('levels') or {}).get('1-0')
        check('save 1-0 3stars', rec and rec.get('stars') == 3, json.dumps(rec))
        tut = (sv.get('col') or {}).get('tutSeen')
        check('save col.tutSeen', tut == 1, 'tutSeen=%s' % tut)
        ok1, info1 = png_nonblank(SHOTS / 'play-filled-partial.png')
        check('shot play nonblank', ok1, info1)
        ok2, info2 = png_nonblank(SHOTS / 'play-celebrate.png')
        check('shot celebrate nonblank', ok2, info2)
        check('play no pageerror', not errs, str(errs[:3]))
        ctx.close()

        # ---------- b2. 章/日收尾 E2E（flats 0-4 free → 章末；flat 5 match → 日完） ----------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.add_init_script(save_init(today))
        page.goto(URL + '?nocache=%d' % int(time.time()))
        page.wait_for_selector('#scene-home.on', timeout=10000)
        for flat in range(6):
            page.evaluate('COL.level(%d)' % flat)
            if flat < 5:                                   # ch1 free：填满+完成（v1 路径）
                page.wait_for_function('COL.regions.length > 0', timeout=5000)
                page.evaluate("""() => { const n = COL.regions.length; for (let i = 0; i < n; i++) COL.fill(i, i % 12); }""")
                ret = page.evaluate('COL.done()')
                if flat < 4:
                    check('flat %d -> 3 stars' % flat, ret.get('win') and ret.get('stars') == 3, json.dumps(ret))
                    page.wait_for_selector('#scene-home.on', timeout=8000)
                else:
                    page.wait_for_selector('.k-chapterend', timeout=8000)
                    check('chapter 1 end ritual', True, page.locator('.k-chapterend .k-big').text_content())
                    page.screenshot(path=str(SHOTS / 'chapter-end.png'))
                    page.locator('.k-chapterend .k-btn').click()
                    page.wait_for_selector('.k-chapterend', state='detached', timeout=5000)
            else:                                          # flat 5 = ch2 match（r6 新模式入章流）
                page.wait_for_function("COL.mode === 'match'", timeout=5000)
                drive_win(page)
                page.wait_for_selector('.k-dayend', timeout=8000)
                check('day end ritual (flat5 match)', True, page.locator('.k-dayend .k-big').text_content())
                page.screenshot(path=str(SHOTS / 'day-end.png'))
                page.locator('.k-dayend .k-btn').last.click()
        sv = page.evaluate("JSON.parse(localStorage.getItem('kidsgame_color') || '{}')")
        lv = sv.get('levels', {})
        check('save ch1 5 levels', all(lv.get('1-%d' % i, {}).get('stars') == 3 for i in range(5)),
              'stars=%s' % [lv.get('1-%d' % i, {}).get('stars') for i in range(5)])
        check('save flat5 match (2-0)', lv.get('2-0', {}).get('stars') == 3,
              json.dumps(lv.get('2-0')))
        check('rituals no pageerror', not errs, str(errs[:3]))
        ctx.close()

        # ---------- b3. r6 三新模式真实点击通关（真实 palette/画布/调色台点击 + 故意错路径） ----------
        for flat, mode, key in [(5, 'match', '2-0'), (10, 'mix', '3-0'), (15, 'pat', '4-0')]:
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.add_init_script(save_init(today))
            page.goto(URL + '?nocache=%d' % int(time.time()))
            page.wait_for_selector('#scene-home.on', timeout=10000)
            page.evaluate('COL.level(%d)' % flat)
            page.wait_for_function("COL.mode === '%s'" % mode, timeout=5000)
            check('%s mode dispatch' % mode, page.evaluate('COL.mode') == mode, 'flat %d' % flat)
            check('%s banner intro' % mode,
                  page.evaluate("document.getElementById('mode-banner').classList.contains('show')"), '')
            if mode == 'match':
                check('match ref visible before try',
                      not page.evaluate('COL.refHidden'), '')
                nxt = page.evaluate('COL.next()')
                wrong = (nxt['color'] + 1) % 12
                page.locator('#palette .swatch[data-c="%d"]' % wrong).click()
                page.evaluate(DISPATCH_FILL, nxt['i'])
                st = page.evaluate('() => ({miss: COL.miss, hidden: COL.refHidden, cell: COL.regions[%d].color, toast: document.getElementById("toast-text").textContent})' % nxt['i'])
                check('match wrong reject+ref hidden',
                      st['miss'] == 1 and st['hidden'] and st['cell'] is None and st['toast'] == '这一格的颜色不一样哦',
                      json.dumps(st, ensure_ascii=False))
            elif mode == 'mix':
                page.locator('#mixbar .mprim[data-c="0"]').click()
                page.locator('#mixbar .mprim[data-c="0"]').click()
                st = page.evaluate('({miss: COL.miss, cur: COL.mixState.cur})')
                check('mix same-color reject', st['miss'] == 1 and st['cur'] == 0, json.dumps(st))
            else:
                want3 = page.evaluate('COL.patState.cells[3].want')
                wrong = page.evaluate('(w) => w === COL.patState.period[0] ? COL.patState.period[1] : COL.patState.period[0]', want3)
                page.locator('#palette .swatch[data-c="%d"]' % wrong).click()
                page.locator('.pcell[data-k="3"]').click()
                st = page.evaluate('({miss: COL.miss, got: COL.patState.cells[3].got, toast: document.getElementById("toast-text").textContent})')
                check('pat wrong reject', st['miss'] == 1 and st['got'] is None and st['toast'] == '看看前面几格的顺序',
                      json.dumps(st, ensure_ascii=False))
            # 真实点击正确路径循环
            for _ in range(24):
                nxt = page.evaluate('COL.next()')
                if not nxt:
                    break
                if nxt['act'] == 'mix':
                    page.locator('#mixbar .mprim[data-c="%d"]' % nxt['a']).click()
                    page.locator('#mixbar .mprim[data-c="%d"]' % nxt['b']).click()
                else:
                    page.locator('#palette .swatch[data-c="%d"]' % nxt['color']).click()
                    if mode == 'pat':
                        page.locator('.pcell[data-k="%d"]' % nxt['i']).click()
                    else:
                        page.evaluate(DISPATCH_FILL, nxt['i'])
                page.wait_for_timeout(80)
            page.wait_for_selector('.k-celebrate', timeout=10000)
            stars = 2                                    # 各 flat 均带 1 次 miss → 2 星（r6 审查 m-4 冗余三元清理）
            page.wait_for_selector('.k-celebrate', state='detached', timeout=8000)
            page.wait_for_function("document.querySelector('#scene-home.on')", timeout=8000)
            sv = page.evaluate("JSON.parse(localStorage.getItem('kidsgame_color') || '{}')")
            got = ((sv.get('levels') or {}).get(key) or {}).get('stars')
            check('%s real-click win %d stars' % (mode, stars), got == stars, 'save=%s' % got)
            page.evaluate('COL.level(%d)' % flat)
            page.wait_for_timeout(700)
            page.screenshot(path=str(SHOTS / ('play-%s.png' % mode)))
            okf, infof = png_nonblank(SHOTS / ('play-%s.png' % mode))
            check('shot %s nonblank' % mode, okf, infof)
            check('%s no pageerror' % mode, not errs, str(errs[:3]))
            ctx.close()

        # ---------- c. 自由画布：3 笔 + 长按清空（v1 流程） ----------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL + '?nocache=%d' % int(time.time()))
        page.locator('#btn-home').click()
        page.wait_for_selector('#scene-home.on')
        page.locator('#card-free').click()
        page.wait_for_selector('#scene-free.on')
        w, h = page.evaluate("[document.getElementById('fcanvas').clientWidth, document.getElementById('fcanvas').clientHeight]")
        check('free canvas size', w > 300 and h > 200, '%dx%d' % (w, h))
        box = page.locator('#fcanvas').bounding_box()
        page.mouse.move(box['x'] + 60, box['y'] + 60)
        page.mouse.down()
        for k in range(1, 11):
            page.mouse.move(box['x'] + 60 + k * 24, box['y'] + 60 + k * 12)
        page.mouse.up()
        page.evaluate('COL.freeDraw(%d, %d, %d, %d, 2)' % (30, 30, int(w * 0.8), int(h * 0.7)))
        page.evaluate('COL.freeDraw(%d, %d, %d, %d, 6)' % (int(w * 0.2), int(h * 0.8), int(w * 0.9), int(h * 0.2)))
        page.evaluate('COL.freeDraw(%d, %d, %d, %d, 9)' % (int(w * 0.5), 20, int(w * 0.5), int(h * 0.9)))
        ink = page.evaluate(INK_JS)
        check('free 3+1 strokes inked', ink > 2000, 'inkPx=%d' % ink)
        page.screenshot(path=str(SHOTS / 'free-drawing.png'))
        okf, infof = png_nonblank(SHOTS / 'free-drawing.png')
        check('shot free nonblank', okf, infof)
        page.locator('#btn-undo2').click()
        page.locator('#btn-undo2').click()
        ink2 = page.evaluate(INK_JS)
        check('free undo x2', 0 < ink2 < ink, 'ink %d -> %d' % (ink, ink2))
        cb = page.locator('#btn-clear').bounding_box()
        page.mouse.move(cb['x'] + cb['width'] / 2, cb['y'] + cb['height'] / 2)
        page.mouse.down()
        page.wait_for_timeout(300)
        page.mouse.up()
        ink3 = page.evaluate(INK_JS)
        check('short press no clear', ink3 == ink2, 'ink=%d' % ink3)
        page.mouse.down()
        page.wait_for_timeout(1400)
        page.mouse.up()
        ink4 = page.evaluate(INK_JS)
        check('long press clears', ink4 == 0, 'ink=%d' % ink4)
        page.locator('#btn-undo2').click()
        ink5 = page.evaluate(INK_JS)
        check('clear undoable', ink5 == ink2, 'ink=%d' % ink5)
        check('free no pageerror', not errs, str(errs[:3]))
        ctx.close()

        # ---------- d. 双 viewport：三新模式布局（overflowX + 触摸目标 ≥64 + 参考图/调色台 bbox） ----------
        for vw, vh in [(1280, 800), (800, 1180)]:
            ctx = browser.new_context(viewport={'width': vw, 'height': vh})
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(URL + '?nocache=%d' % int(time.time()))
            page.wait_for_selector('#scene-play.on', timeout=10000)
            res = page.evaluate("""() => {
              const out = {overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, bad: []};
              const sample = sel => {
                document.querySelectorAll(sel).forEach(el => {
                  const r = el.getBoundingClientRect();
                  if (r.width > 0 && (r.width < 64 || r.height < 64))
                    out.bad.push(sel + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                });
              };
              ['#btn-home','#btn-map','#btn-undo','#btn-done','#palette .swatch'].forEach(sample);
              return out;
            }""")
            page.locator('#btn-home').click()
            page.wait_for_selector('#scene-home.on')
            res2 = page.evaluate("""() => {
              const bad = [];
              ['#card-color','#card-free'].forEach(sel => document.querySelectorAll(sel).forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width < 64 || r.height < 64) bad.push(sel);
              }));
              return {bad};
            }""")
            check('viewport %dx%d play targets' % (vw, vh),
                  res['overflowX'] <= 0 and not res['bad'],
                  'overflowX=%d bad=%s' % (res['overflowX'], res['bad']))
            check('viewport %dx%d home cards' % (vw, vh), not res2['bad'], str(res2['bad']))
            # r6 三模式布局
            lay = page.evaluate("""() => {
              const out = {};
              COL.level(5);                                       // match
              const rb = document.getElementById('ref-box').getBoundingClientRect();
              out.match = {refW: Math.round(rb.width), refH: Math.round(rb.height),
                           hiddenMini: getComputedStyle(document.getElementById('mini-preview')).display === 'none'};
              COL.level(10);                                      // mix
              out.mix = {mprims: document.querySelectorAll('#mixbar .mprim').length,
                         smallPrim: Array.from(document.querySelectorAll('#mixbar .mprim')).filter(b => {
                           const r = b.getBoundingClientRect(); return r.width < 64 || r.height < 64; }).length,
                         palHidden: getComputedStyle(document.getElementById('palette')).display === 'none'};
              COL.level(15);                                      // pat
              out.pat = {cells: document.querySelectorAll('.pcell').length,
                         smallCell: Array.from(document.querySelectorAll('.pcell')).filter(b => {
                           const r = b.getBoundingClientRect(); return r.width < 64 || r.height < 64; }).length,
                         swatches: document.querySelectorAll('#palette .swatch').length};
              out.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
              return out;
            }""")
            check('viewport %dx%d r6 layout' % (vw, vh),
                  lay['match']['refW'] >= 120 and lay['match']['refH'] >= 120 and lay['match']['hiddenMini'] and
                  lay['mix']['mprims'] == 3 and lay['mix']['smallPrim'] == 0 and lay['mix']['palHidden'] and
                  lay['pat']['cells'] == 10 and lay['pat']['smallCell'] == 0 and lay['pat']['swatches'] == 2 and
                  lay['overflowX'] <= 0, json.dumps(lay))
            page.screenshot(path=str(SHOTS / ('layout-%dx%d.png' % (vw, vh))))
            check('viewport %dx%d no pageerror' % (vw, vh), not errs, str(errs[:3]))
            ctx.close()

        browser.close()

    check('fully offline (no http requests)', not HTTP_REQS, str(HTTP_REQS[:3]))
    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        print('FAILED:', [f[0] for f in fails])
        sys.exit(1)


if __name__ == '__main__':
    main()
