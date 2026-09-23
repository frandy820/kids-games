# -*- coding: utf-8 -*-
"""connect _selftest r6 — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 双 viewport → title=VERIFY PASS 13/13 + JSON pass==total + layoutOk
2a. 预置存档(跳过教学) flat0：首题先错连一次(线弹回+misses=1+题不推进)再连对 → 真实拖线通关
    → .k-celebrate 星级 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(演示拖线)→帮(幽灵手指)→独 真实链路 → tutSeen 持久化 + 通关写档
2c. 章2 set 关(flat5)：真实拖线集合题（part 中间态=线固定+对勾+不 miss 不推进）通关
2d. 章3 anti 关(flat10)：真实拖线反向排除题通关
2e. 章4 混出关(flat15)：真实拖线链题（up 连动物 / down 连食物）通关
3. 双 viewport(1280x800/800x1180)：overflowX==0、卡 ≥88、按钮 ≥64（家长按钮豁免）、拖线中 near 高亮
4. 全页截图非空白（PIL 像素 stdev>10，无 PIL 按体积判定）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
"""
import asyncio, json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)

SND = """(() => {
  const noop = () => {};
  try { const ss = window.speechSynthesis;   // 方法级 patch（整体对象替换在本 chromium 无效=假静音）
    if (ss) { ss.speak = function () {}; ss.cancel = noop; ss.pause = noop; ss.resume = noop; } } catch (e) {}
  try { const proto = window.Audio.prototype;
    proto.play = function () { const s = this;
      setTimeout(function () { try { s.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve(); };
    proto.pause = noop; } catch (e) {}
  try { const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
      this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop,
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop }, type: '' });
      this.createBuffer = () => ({ getChannelData: () => new Float32Array(0) });
      this.createBufferSource = () => ({ buffer: null, connect: noop, start: noop, stop: noop });
      this.createBiquadFilter = () => ({ connect: noop, start: noop, stop: noop, type: '',
        frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop,
        linearRampToValueAtTime: noop } });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop,
        exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; } } catch (e) {}
})();"""
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'connect', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'connect': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_connect", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=10.0):
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


async def drag(page, a_lib, f_lib, before_up=None):
    """真实 PointerEvent 拖线：左卡中心按下 → 半途 → 右列卡中心松手（playwright mouse 产生 pointer 事件）"""
    ba = await page.locator('.acard[data-lib="%d"]' % a_lib).bounding_box()
    bf = await page.locator('.fcard[data-lib="%d"]' % f_lib).bounding_box()
    ax, ay = ba['x'] + ba['width'] / 2, ba['y'] + ba['height'] / 2
    fx, fy = bf['x'] + bf['width'] / 2, bf['y'] + bf['height'] / 2
    await page.mouse.move(ax, ay)
    await page.mouse.down()
    await page.mouse.move(ax + (fx - ax) * 0.5, ay + (fy - ay) * 0.5 + 8)   # 半途
    await page.wait_for_timeout(30)
    for s in range(1, 7):                                                    # 分步扫向目标
        await page.mouse.move(ax + (fx - ax) * s / 6, ay + (fy - ay) * s / 6)
        await page.wait_for_timeout(15)
    await page.mouse.move(fx, fy)                                            # 目标卡中心
    await page.wait_for_timeout(70)                                          # 等 near 高亮判定
    if before_up:
        await before_up()
    await page.mouse.up()


async def wait_q(page, q_idx, timeout=9000):
    """等推进到第 q_idx 题（0 基）或通关：right 演出窗=确认句 estMs+300（≤5.1s 实速）"""
    await page.wait_for_function(
        "() => { const c = CON.currentLevel; return c.done || c.qIdx >= %d; }" % q_idx,
        timeout=timeout)


async def play_level(page, first_wrong=False):
    """真实拖线连完当前关全部 5 题；first_wrong=首题先错连一次（验证零惩罚路径）"""
    done_wrong = not first_wrong
    while True:
        q = await page.evaluate('CON.quiz')
        if q is None:
            break
        if not done_wrong:
            wb = next(p for p in q['picks'] if p not in q['need'])
            await drag(page, q['left'], wb)
            await page.wait_for_function(
                'document.querySelectorAll("#lines .dragline").length === 0 && '
                'document.querySelectorAll(".fcard.near").length === 0', timeout=4000)
            st = await page.evaluate('CON.currentLevel')
            check('wrong link: line retracts, no progress (zero penalty)',
                  st['misses'] == 1 and st['qIdx'] == 0, str(st))
            done_wrong = True
            q = await page.evaluate('CON.quiz')
        target = q['qIdx']
        # set 题 need≥2：前 |need|-1 条=part（不推进不 miss，锁窗 560ms），末条才 right 推进
        for f in q['need']:
            if f in q['linked']:
                continue
            await drag(page, q['left'], f)
            await page.wait_for_timeout(800)
        try:
            await wait_q(page, target + 1)
        except Exception:
            print('DEBUG timeout: qIdx=%s need=%s linked=%s left=%s' % (
                target, q['need'], q['linked'], q['left']))
            print(' state:', await page.evaluate('CON.currentLevel'))
            print(' quiz:', await page.evaluate('CON.quiz'))
            print(' dragline:', await page.evaluate('document.querySelectorAll("#lines .dragline").length'))
            print(' busy:', await page.evaluate('CON.busy'))
            raise
    await page.wait_for_selector('.k-celebrate', timeout=12000)


async def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--mute-audio'])

        # 静音纪律（2026-09-19 用户三诉外放后全线强制）：任何 goto 前先挂 ctx 级静音——
        # speechSynthesis.speak no-op + Audio.play/pause no-op（5ms 补发 ended 防 queue 链卡，
        # onloadedmetadata 元数据加载不受影响=verify ⑦ 实长断言不动）+ AudioContext 工厂接管。
        # 模板同 test/t46_speak0_gate.py INIT_SND。
        async def sctx(viewport=None):
            c = await browser.new_context(**(viewport and {'viewport': viewport} or {}))
            await c.add_init_script(SND)
            return c

        try:
            # ---- 1. verify=1（双 viewport） ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = await sctx({'width': vp[0], 'height': vp[1]})
                pg = await ctx.new_page(); watch(pg, 'verify%d' % vp[0])
                await pg.goto(URL + '?verify=1')
                await pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=30000)
                title = await pg.title()
                vj = json.loads(await pg.locator('#verify-result').text_content())
                check('verify vp%dx%d title+JSON' % vp,
                      title.startswith('VERIFY PASS') and vj['pass'] == vj['total'] and vj['layoutOk'],
                      '%s pass=%s/%s' % (title, vj['pass'], vj['total']))
                await ctx.close()

            # ---- 2a. 预置存档 flat0（pair 题）：错连零惩罚 + 真实拖线通关 ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = await ctx.new_page(); watch(pg, '2a')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            lv = await pg.evaluate('CON.currentLevel')
            check('start at 1-0 (ch1 pair, 5 questions)', lv and lv['ch'] == 1 and lv['dch'] == 1 and lv['nQ'] == 5, str(lv))
            check('tutorial skipped (preset)', await pg.evaluate('CON.tutorial') == 'none')
            q = await pg.evaluate('CON.quiz')
            check('flat0 q0 anchored rabbit->carrot (pair)',
                  q['kind'] == 'pair' and q['animal'] == 0 and q['need'] == [0], str(q)[:120])

            async def assert_near():
                near = await pg.evaluate('!!document.querySelector(".fcard.near")')
                line = await pg.evaluate('document.querySelectorAll("#lines .dragline").length')
                check('dragging: live line + target card highlighted (.near)', near and line == 1,
                      'near=%s line=%d' % (near, line))

            await drag(pg, q['left'], q['need'][0], before_up=assert_near)   # 首题带拖线中断言
            await wait_q(pg, 1)
            await play_level(pg)                                             # 其余题真实拖线连完
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('real-drag win -> .k-celebrate 3 stars (0 miss)', stars == 3, 'stars=%d' % stars)
            await pg.wait_for_timeout(3400)
            lv2 = await pg.evaluate('CON.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_connect")'))
            check('save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            await ctx.close()

            # ---- 2a+. 错连零惩罚专测（独立档，首题错连→重连成功通关 2 星） ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, done_flats=(0,), bonus=30))
            pg = await ctx.new_page(); watch(pg, '2a+')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            await play_level(pg, first_wrong=True)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('wrong-then-relink win -> 2 stars (1 miss, zero penalty)', stars == 2, 'stars=%d' % stars)
            await ctx.close()

            # ---- 2b. 全新存档：教学 看→帮→独 真实链路 ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = await ctx.new_page(); watch(pg, '2b')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            check('tutorial watch phase (demo locked)', await pg.evaluate('CON.tutorial') == 'watch')
            await pg.wait_for_function("CON.tutorial === 'help'", timeout=20000)   # 等"看"演示拖线放完
            st = await pg.evaluate('CON.currentLevel')
            check('watch demo solved 1 food, then reset for help',
                  st['qIdx'] == 0 and st['nQ'] == 5, str(st))
            try:
                await pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> left card', ghost_shown)
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_connect")'))
            check('connect.tutSeen persisted after watch', (saved.get('connect') or {}).get('tutSeen') is True,
                  str(saved.get('connect')))
            await play_level(pg)                       # "帮"首次连对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate', True)
            await pg.wait_for_timeout(3400)
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_connect")'))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            await ctx.close()

            # ---- 2c. 章2 set 关（flat5）：part 中间态 + 真实拖线通关 ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = await ctx.new_page(); watch(pg, '2c')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            lv = await pg.evaluate('CON.currentLevel')
            check('ch2 start at flat=5 (set questions)', lv and lv['flat'] == 5 and lv['dch'] == 2, str(lv))
            q = await pg.evaluate('CON.quiz')
            check('set question: kind/need>=2/stem', q['kind'] == 'set' and len(q['need']) >= 2 and
                  q['stem'].startswith('把'), str(q)[:140])
            await drag(pg, q['left'], q['need'][0])                 # 集合内第一条=part
            await pg.wait_for_timeout(800)
            mid = await pg.evaluate('''() => ({ q: CON.currentLevel,
                okg: document.querySelectorAll("#lines .okg").length,
                linked: document.querySelectorAll(".fcard.linked").length })''')
            check('set partial link = part: line fixed + tick, no miss, no advance',
                  mid['q']['misses'] == 0 and mid['q']['qIdx'] == 0 and mid['okg'] >= 1 and
                  mid['linked'] >= 1, str(mid))
            await play_level(pg)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('ch2 set real-drag win -> 3 stars', stars == 3, 'stars=%d' % stars)
            await ctx.close()

            # ---- 2d. 章3 anti 关（flat10）：真实拖线反向排除通关 ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
            pg = await ctx.new_page(); watch(pg, '2d')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            lv = await pg.evaluate('CON.currentLevel')
            check('ch3 start at flat=10 (anti questions)', lv and lv['flat'] == 10 and lv['dch'] == 3, str(lv))
            qa = await pg.evaluate('CON.quiz')
            check('anti question stem 只有...吃的是哪一个',
                  qa['kind'] == 'anti' and qa['stem'].startswith('只有'), str(qa)[:140])
            shared = next(x for x in qa['picks'] if x not in qa['need'])
            await drag(pg, qa['left'], shared)                      # 错连共享食物=miss
            await pg.wait_for_timeout(900)
            st = await pg.evaluate('CON.currentLevel')
            check('anti wrong shared link = miss (zero penalty, retryable)',
                  st['misses'] == 1 and st['qIdx'] == 0, str(st))
            await play_level(pg)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('ch3 anti real-drag win -> 2 stars (1 miss)', stars == 2, 'stars=%d' % stars)
            await ctx.close()

            # ---- 2e. 章4 混出关（flat15）：链题 up（连动物）/down（连食物）真实拖线 ----
            ctx = await sctx({'width': 1280, 'height': 800})
            await ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = await ctx.new_page(); watch(pg, '2e')
            await pg.goto(URL)
            await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
            lv = await pg.evaluate('CON.currentLevel')
            check('ch4 start at flat=15 (mixed)', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            qc = await pg.evaluate('CON.quiz')
            check('ch4 q0 = chain up (drag to animal)',
                  qc['kind'] == 'chain' and qc['dir'] == 'up' and qc['pickType'] == 'animal', str(qc)[:150])
            chaindom = await pg.evaluate('''() => ({
                cells: document.querySelectorAll(".chaincard .ch-cell").length,
                arrows: document.querySelectorAll(".chaincard .ch-arrow").length,
                q: !!document.querySelector(".chaincard .ch-q") })''')
            check('chain card renders 2 cells + 2 arrows + ?',
                  chaindom['cells'] == 2 and chaindom['arrows'] == 2 and chaindom['q'], str(chaindom))
            await play_level(pg)
            stars = await pg.locator('.k-celebrate .k-star').count()
            check('ch4 mixed real-drag win -> 3 stars', stars == 3, 'stars=%d' % stars)
            await pg.wait_for_timeout(3400)
            lv2 = await pg.evaluate('CON.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            saved = json.loads(await pg.evaluate('localStorage.getItem("kidsgame_connect")'))
            check('save 4-0 recorded', '4-0' in saved['levels'], str(saved['levels']))
            await ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、卡 ≥88、按钮 ≥64、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = await sctx({'width': vp[0], 'height': vp[1]})
                pg = await ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                await pg.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
                await pg.goto(URL)
                await pg.wait_for_function('window.CON && CON.currentLevel', timeout=8000)
                await pg.wait_for_timeout(900)
                m = await pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, .card').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const cards = [...document.querySelectorAll('#board .card')].map(c => c.getBoundingClientRect());
                  return { ox: de.scrollWidth - de.clientWidth, bad: bad,
                           minCardW: Math.round(Math.min(...cards.map(r => r.width))),
                           minCardH: Math.round(Math.min(...cards.map(r => r.height))) };
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64 (buttons) / cards >=88' % vp,
                      not m['bad'] and m['minCardW'] >= 88 and m['minCardH'] >= 88,
                      'min=%dx%d bad=%s' % (m['minCardW'], m['minCardH'], m['bad'][:4]))
                shot = SHOTS / ('connect-vp%dx%d.png' % vp)
                await pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
                await ctx.close()
        finally:
            await browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    asyncio.run(main())
