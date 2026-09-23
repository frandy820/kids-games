# -*- coding: utf-8 -*-
"""connect 5.5 岁人设试玩：教学/真实拖线通关(0,5,10,15)/犯错/吸附宽容度/静置救援/双 viewport"""
import asyncio, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import Obs, run, OVERFLOW_JS, png_stats

GAME = 'connect'

CARD_BOX = """([lib, side]) => { const el = document.querySelector((side === 'a' ? '.acard' : '.fcard') + '[data-lib="' + lib + '"]');
  if (!el) return null; const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
           l: r.left, rt: r.right, t: r.top, b: r.bottom }; }"""
BOARD_INFO = """(() => {
  const gs = sel => [...document.querySelectorAll(sel)].map(e => {
    const r = e.getBoundingClientRect();
    return { lib: +e.dataset.lib, lab: e.querySelector('.lab') ? e.querySelector('.lab').textContent : '',
             x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
             w: Math.round(r.width), h: Math.round(r.height), cls: e.className };
  });
  return { a: gs('.acard'), f: gs('.fcard'), lines: document.querySelectorAll('#lines .okline').length };
})()"""
LINE_STATE = """(() => ({
  ok: document.querySelectorAll('#lines .okg').length,
  dragging: document.querySelectorAll('#lines .dragline').length,
  near: [...document.querySelectorAll('.fcard.near')].map(e => +e.dataset.lib),
  fed: [...document.querySelectorAll('.acard.fed')].map(e => +e.dataset.lib),
  eaten: [...document.querySelectorAll('.fcard.eaten')].map(e => +e.dataset.lib),
  pulse: [...document.querySelectorAll('.fcard.pulse')].map(e => +e.dataset.lib)
}))()"""
PAIR_NAME = "([i]) => PAIRS[i] ? PAIRS[i].a + '→' + PAIRS[i].f : '?'"

async def real_drag(o, aLib, fLib, dx=0.0, dy=0.0, steps=7, hold=0.05):
    """真实 PointerEvent 拖线：动物卡中心 → 食物卡中心(±偏移)；先等演出锁释放"""
    await o.page.wait_for_function("() => !CON.busy && !CON.currentLevel.won", timeout=8000)
    A = await o.ev(CARD_BOX, aLib, 'a')
    B = await o.ev(CARD_BOX, fLib, 'f')
    tx, ty = B['x'] + dx, B['y'] + dy
    await o.page.mouse.move(A['x'], A['y'])
    await o.page.mouse.down()
    for s in range(1, steps + 1):
        k = s / steps
        await o.page.mouse.move(A['x'] + (tx - A['x']) * k, A['y'] + (ty - A['y']) * k)
        await asyncio.sleep(hold)
        if s == 3:
            mid = await o.ev(LINE_STATE)   # 拖线中：预判高亮
    await asyncio.sleep(0.1)
    st = await o.ev(LINE_STATE)           # 松手前快照（near 高亮）
    await o.page.mouse.up()
    return {'mid': mid, 'beforeUp': st, 'target': fLib, 'offset': [dx, dy],
            'card': [round(B['w']), round(B['h'])]}

async def wait_level_saved(o, flat, timeout=40000):
    key = f"{flat // 5 + 1}-{flat % 5}"
    await o.page.wait_for_function("([k]) => !!(KIDS._save().levels[k])", arg=[key], timeout=timeout)
    return await o.ev("([k]) => KIDS._save().levels[k]", key)

async def solve_level_real(o, rec, pause=0.35):
    """按 leftOrder 顺序真实拖完当前关全部配对"""
    while True:
        q = await o.quiz()
        if not q:
            break
        for a in q['leftOrder']:
            if a in q['solved']:
                continue
            info = await real_drag(o, a, a)
            await asyncio.sleep(pause)
            rec.append({'pair': await o.ev(PAIR_NAME, a), 'drag': info,
                        'after': await o.ev(LINE_STATE)})
        c = await o.cur()
        if c['done']:
            return rec
        await asyncio.sleep(1.2)

async def main(browser):
    R = {'game': GAME, 'scenarios': {}}

    # ---- S1 教学（新档 flat0）----
    async with Obs(browser, GAME, tag='tut') as o:
        t0 = asyncio.get_event_loop().time()
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'watch'", arg=[o.hook], timeout=8000)
        # 演示吞输入探针：真实 pointerdown 在动物卡上 → 不应产生拖线
        q0 = await o.quiz()
        A = await o.ev(CARD_BOX, q0['leftOrder'][0], 'a')
        await o.page.mouse.move(A['x'], A['y'])
        await o.page.mouse.down()
        await o.page.mouse.move(A['x'] + 60, A['y'] + 30)
        await o.page.mouse.up()
        st_mid = await o.ev(LINE_STATE)
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'help'", arg=[o.hook], timeout=30000)
        t_help = asyncio.get_event_loop().time()
        tut = {'watchSec': round(t_help - t0, 1), 'n': q0['n'],
               'swallow': {'dragLinesAfterTaps': st_mid['dragging'] + st_mid['ok']},
               'voiceDuring': [v['k'] for v in await o.voice()]}
        await o.shot('help')
        # "帮"第一步：真实拖第 1 对 → solo
        a0 = (await o.quiz())['leftOrder'][0]
        await real_drag(o, a0, a0)
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'solo'", arg=[o.hook], timeout=8000)
        tut['soloHandoff'] = True
        rec = []
        await solve_level_real(o, rec)
        await wait_level_saved(o, 0)
        tut['levelStars'] = await o.ev("([k]) => KIDS._save().levels[k]", '1-0')
        tut['pairs'] = [r['pair'] for r in rec]
        R['scenarios']['tutorial'] = tut

    # ---- S2 真实通关 flat5 / flat10 / flat15（flat15 加吸附宽容度探针）----
    for flat in (5, 10, 15):
        async with Obs(browser, GAME, tag=f'f{flat}') as o:
            await o.seed(flat)
            lv = await o.cur()
            bi = await o.ev(BOARD_INFO)
            rec = []
            if flat == 15:
                # 宽容度探针 1：偏移 -(半宽+20)（在卡左缘外 20px，仍在 w/2+32 内）→ 应连上
                q = await o.quiz()
                a1 = q['leftOrder'][0]
                B = await o.ev(CARD_BOX, a1, 'f')
                rec.append({'probe': 'snap_inside',
                            'info': await real_drag(o, a1, a1, dx=-(B['w'] / 2 + 20)),
                            'after': await o.ev(LINE_STATE)})
                await asyncio.sleep(1.3)
                # 宽容度探针 2：偏移 -(半宽+60)（超 w/2+32）→ 应取消弹回不计错
                q = await o.quiz()
                a2 = next(x for x in q['leftOrder'] if x not in q['solved'])
                B2 = await o.ev(CARD_BOX, a2, 'f')
                rec.append({'probe': 'cancel_outside',
                            'info': await real_drag(o, a2, a2, dx=-(B2['w'] / 2 + 60)),
                            'after': await o.ev(LINE_STATE)})
                await asyncio.sleep(0.8)
            await solve_level_real(o, rec)
            await o.shot('done')
            saved = await wait_level_saved(o, flat)
            R['scenarios'][f'real_flat{flat}'] = {
                'startLevel': {k: lv[k] for k in ('flat', 'ch', 'dch', 'n')},
                'board': bi, 'rec': rec, 'stars': saved,
                'pageerrors': o.pageerrors, 'netreq': o.netreq[:3]}

    # ---- S3 犯错路径 flat10：连错 2 次 → pulse 正确食物；错连零惩罚 ----
    async with Obs(browser, GAME, tag='err') as o:
        await o.seed(10)
        q = await o.quiz()
        a = q['leftOrder'][0]
        wrongFood = next(f for f in q['rightOrder'] if f != a)
        ev = []
        r1 = await real_drag(o, a, wrongFood)
        await asyncio.sleep(0.8)
        s1 = await o.ev(LINE_STATE); c1 = await o.cur()
        ev.append({'step': 'wrong1', 'pulse': s1['pulse'], 'misses': c1['misses'],
                   'okLines': s1['ok'], 'shake': True})
        r2 = await real_drag(o, a, wrongFood)
        await asyncio.sleep(0.8)
        s2 = await o.ev(LINE_STATE); c2 = await o.cur()
        ev.append({'step': 'wrong2', 'pulse': s2['pulse'], 'misses': c2['misses']})
        # 同一动物再连对 → 零惩罚可通关
        r3 = await real_drag(o, a, a)
        await asyncio.sleep(0.9)
        s3 = await o.ev(LINE_STATE)
        ev.append({'step': 'recover', 'ok': a in s3['fed']})
        while True:
            q = await o.quiz()
            if not q:
                break
            for x in q['leftOrder']:
                if x not in q['solved']:
                    await real_drag(o, x, x)
                    await asyncio.sleep(0.35)
            if (await o.cur())['done']:
                break
            await asyncio.sleep(1.2)
        await wait_level_saved(o, 10)
        R['scenarios']['error_path'] = {'events': ev,
            'finalStars': await o.ev("([k]) => KIDS._save().levels[k]", '3-0')}

    # ---- S4 静置 25s 救援（flat10）----
    async with Obs(browser, GAME, tag='idle') as o:
        await o.seed(10)
        v0 = len(await o.voice())
        await asyncio.sleep(26)
        v = await o.voice()
        r1 = [x['k'] for x in v[v0:]]
        await asyncio.sleep(22)
        v2 = await o.voice()
        R['scenarios']['idle_rescue'] = {'first26s': r1, 'next22s': [x['k'] for x in v2[len(v):]],
                                         'pageerrors': o.pageerrors}

    # ---- S5 双 viewport（flat15 n=6 卡尺寸）----
    vp = {}
    for size in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        async with Obs(browser, GAME, viewport=size, tag=f"vp{size['width']}") as o:
            await o.seed(15)
            await asyncio.sleep(0.4)
            ov = await o.ev(OVERFLOW_JS)
            bi = await o.ev(BOARD_INFO)
            from common import SHOTS
            nm = f"{GAME}-vp{size['width']}-view.png"
            await o.page.screenshot(path=str(SHOTS / nm))
            vp[f"{size['width']}x{size['height']}"] = {
                'overflow': ov,
                'cards': {'a': [(c['w'], c['h']) for c in bi['a']], 'f': [(c['w'], c['h']) for c in bi['f']]},
                'labels': [c['lab'] for c in bi['a']],
                'shot': png_stats(SHOTS / nm), 'pageerrors': o.pageerrors}
    R['scenarios']['viewports'] = vp
    return R

if __name__ == '__main__':
    asyncio.run(run(main, 'conn.json'))
