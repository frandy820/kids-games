# -*- coding: utf-8 -*-
"""countchick 5.5 岁人设试玩：教学/真实通关(0,5,10,15)/犯错/静置救援/双 viewport"""
import asyncio, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import Obs, run, OVERFLOW_JS, png_stats

GAME = 'countchick'

CHICK_BOX = """(i) => { const el = document.querySelector('#field .animal[data-k="c"][data-i="'+i+'"]');
  if (!el) return null; const r = el.getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height }; }"""
OTHER_BOX = """(j) => { const el = document.querySelector('#field .animal[data-k="o"][data-i="'+j+'"]');
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; }"""
OPT_BOX = """(i) => { const el = document.querySelector('#answers .opt[data-i="'+i+'"]');
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height }; }"""
MEASURE = """(() => {
  const els = [...document.querySelectorAll('#field .animal')];
  const cs = els.map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.k, x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height }; });
  let minD = 1e9, pair = null;
  for (let a = 0; a < cs.length; a++) for (let b = a+1; b < cs.length; b++) {
    const d = Math.hypot(cs[a].x - cs[b].x, cs[a].y - cs[b].y);
    if (d < minD) { minD = d; pair = [a, b]; } }
  const f = document.getElementById('field').getBoundingClientRect();
  const badge = document.querySelector('.animal .badge');
  const bs = badge ? getComputedStyle(badge) : null;
  const opts = [...document.querySelectorAll('#answers .opt')].map(o => { const r = o.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  return { animals: cs.length, minD: Math.round(minD), field: [Math.round(f.width), Math.round(f.height)],
           animalSizes: cs.map(c => Math.round(c.w)), badge: bs ? { fs: bs.fontSize, box: bs.width + 'x' + bs.height } : null,
           optSizes: opts };
})()"""

async def real_tap_chick(o, i):
    b = await o.ev(CHICK_BOX, i)
    await o.page.mouse.click(b['x'], b['y'])
    return b

async def wait_dom_stable(o):
    """等 DOM 追上引擎 step（引擎先推进、UI 880ms 后重渲染的窗口期防串台）"""
    await o.page.wait_for_function(
        "([h]) => { const q = window[h].quiz; if (!q) return true;"
        " const n = document.querySelectorAll('#field .animal[data-k=\"c\"]').length;"
        " const opts = document.querySelectorAll('#answers .opt').length;"
        " return n === q.chicks && opts === q.items.length; }",
        arg=[o.hook], timeout=8000)

async def play_level_real(o, log, taps_pause=0.06, double_tap_probe=1):
    """真实点小鸡+真实点答案按钮打完当前关；double_tap_probe=第几题做双击探针"""
    steps = []
    while True:
        await wait_dom_stable(o)
        q = await o.quiz()
        if not q:
            break
        rec = {'n': q['n'], 'items': q['items'], 'others': q.get('others'), 'taps': []}
        for i in range(q['n']):
            await real_tap_chick(o, i)
            await asyncio.sleep(taps_pause)
        if q['n'] >= 1 and double_tap_probe and (q['step'] + 1) == double_tap_probe:
            await real_tap_chick(o, 0)   # 故意重点已数过的小鸡：角标不应增
            q2 = await o.quiz()
            rec['doubleTap'] = {'countedAfterDouble': q2['counted'], 'badges': q2['badges']}
        m = await o.ev(MEASURE)
        rec['measure'] = {'animals': m['animals'], 'minD': m['minD'], 'animalSizes': m['animalSizes']}
        if q.get('others'):
            await o.ev("""(j) => { const el = document.querySelector('#field .animal[data-k="o"][data-i="'+j+'"]'); el.classList.add('wig'); }""", 0)
            ob = await o.ev(OTHER_BOX, 0)
            if ob:
                await o.page.mouse.click(ob['x'], ob['y'])   # 真实点干扰动物
                q3 = await o.quiz()
                rec['tapOtherCounted'] = q3['counted']
        ab = await o.ev(OPT_BOX, q['answerIdx'])
        rec['optBox'] = [round(ab['w']), round(ab['h'])]
        await o.page.mouse.click(ab['x'], ab['y'])
        await o.page.wait_for_function(
            "([h, st]) => { const c = window[h].currentLevel; return !c || c.step > st || c.done; }",
            arg=[o.hook, q['step']], timeout=8000)
        steps.append(rec)
        c = await o.cur()
        if c and c['done']:
            break
    return steps

async def wait_level_saved(o, flat, timeout=45000):
    key = f"{flat // 5 + 1}-{flat % 5}"
    await o.page.wait_for_function(
        "([k]) => !!(KIDS._save().levels[k])", arg=[key], timeout=timeout)
    return await o.ev("([k]) => KIDS._save().levels[k]", key)

async def main(browser):
    R = {'game': GAME, 'scenarios': {}}

    # ---- S1 教学（新档 flat0）----
    async with Obs(browser, GAME, tag='tut') as o:
        t0 = asyncio.get_event_loop().time()
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'watch'", arg=[o.hook], timeout=8000)
        # 演示吞输入探针
        q0 = await o.quiz()
        b = await o.ev(CHICK_BOX, 0)
        await o.page.mouse.click(b['x'], b['y'])
        ab = await o.ev(OPT_BOX, 0)
        await o.page.mouse.click(ab['x'], ab['y'])
        q1 = await o.quiz()
        swallow = {'countedBefore': q0['counted'], 'countedAfterTaps': q1['counted']}
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'help'", arg=[o.hook], timeout=30000)
        t_help = asyncio.get_event_loop().time()
        tut = {'watchSec': round(t_help - t0, 1), 'swallow': swallow,
               'nChicksDemo': q0['n'], 'voiceDuring': [v['k'] for v in await o.voice()]}
        await o.shot('help')
        # "帮"阶段第一步：真实 pointer 点完小鸡并答对 → 应转 solo
        await wait_dom_stable(o)
        q = await o.quiz()
        for i in range(q['n']):
            await real_tap_chick(o, i)
            await asyncio.sleep(0.12)
        ab = await o.ev(OPT_BOX, q['answerIdx'])
        await o.page.mouse.click(ab['x'], ab['y'])
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'solo'", arg=[o.hook], timeout=8000)
        tut['soloHandoff'] = True
        tut['helpVoiceKeys'] = [v['k'] for v in await o.voice()]
        # 打完本关（真实）
        steps = await play_level_real(o, tut, double_tap_probe=2)
        saved = await wait_level_saved(o, 0)
        tut['levelStars'] = saved
        R['scenarios']['tutorial'] = tut

    # ---- S2 真实通关 flat5 / flat10 / flat15 ----
    for flat in (5, 10, 15):
        async with Obs(browser, GAME, tag=f'f{flat}') as o:
            await o.seed(flat)
            lv = await o.cur()
            m0 = await o.ev(MEASURE)
            steps = await play_level_real(o, {}, double_tap_probe=(1 if flat == 10 else 0))
            await o.shot('done')
            saved = await wait_level_saved(o, flat)
            R['scenarios'][f'real_flat{flat}'] = {
                'startLevel': {k: lv[k] for k in ('flat', 'ch', 'dch', 'n')},
                'measure0': m0, 'steps': steps, 'stars': saved,
                'pageerrors': o.pageerrors, 'netreq': o.netreq[:3]}

    # ---- S3 犯错路径 flat2 ----
    async with Obs(browser, GAME, tag='err') as o:
        await o.seed(2)
        q = await o.quiz()
        wrongIdx = next(i for i in range(3) if i != q['answerIdx'])
        ev = []
        # 首错
        ab = await o.ev(OPT_BOX, wrongIdx)
        await o.page.mouse.click(ab['x'], ab['y'])
        await asyncio.sleep(0.7)
        st = await o.ev("""() => ({ wrongCls: [...document.querySelectorAll('#answers .opt')].map(x => x.className),
                                     pulseOnCorrect: document.querySelector('#answers .opt.pulse') !== null })""")
        v1 = await o.voice()
        ev.append({'step': 'firstMiss', 'state': st, 'voiceN': len(v1)})
        # 同一错键再点（again，不计新罚）
        r = await o.ev(f"([h,i]) => window[h].pick(i)", o.hook, wrongIdx)
        # 第二个错键 → _miss>=2 应 pulse 正确项
        wrong2 = next(i for i in range(3) if i not in (q['answerIdx'], wrongIdx))
        ab2 = await o.ev(OPT_BOX, wrong2)
        await o.page.mouse.click(ab2['x'], ab2['y'])
        await asyncio.sleep(0.7)
        st2 = await o.ev("""() => ({ pulseOnCorrect: document.querySelector('#answers .opt.pulse') !== null,
                                     cur: window.CHK.currentLevel.retries })""")
        ev.append({'step': 'secondMiss', 'state': st2, 'pickAgain': r})
        # 补对 → 推进（等 880ms 演出锁释放后再走 autoSolve）
        ab3 = await o.ev(OPT_BOX, q['answerIdx'])
        await o.page.mouse.click(ab3['x'], ab3['y'])
        await asyncio.sleep(1.4)
        c3 = await o.cur()
        ev.append({'step': 'recover', 'step': c3['step'], 'ok': c3['step'] == 1})
        # 剩余题目全对（用钩子快速走完，验证零惩罚可通关）
        await o.ev("([h]) => window[h].autoSolve()", o.hook)
        try:
            await wait_level_saved(o, 2, timeout=20000)
        except Exception:
            print('S3 DBG', {'events': ev, 'cur': await o.cur(),
                             'levels': await o.ev("() => KIDS._save().levels"),
                             'errors': o.pageerrors})
            raise
        stars = await o.ev("([k]) => KIDS._save().levels[k]", '1-2')
        R['scenarios']['error_path'] = {'events': ev, 'finalStars': stars}

    # ---- S4 静置 25s 救援（flat10, flat>=3 无 sayP 门）----
    async with Obs(browser, GAME, tag='idle') as o:
        await o.seed(10)
        v0 = len(await o.voice())
        await asyncio.sleep(26)
        v = await o.voice()
        rescue = [x for x in v[v0:]]
        await asyncio.sleep(22)     # 再等一轮：救援应周期性再来
        v2 = await o.voice()
        R['scenarios']['idle_rescue'] = {
            'first26s': rescue, 'next22s': v2[len(v):],
            'pageerrors': o.pageerrors}

    # ---- S5 双 viewport ----
    vp = {}
    for size in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        async with Obs(browser, GAME, viewport=size, tag=f"vp{size['width']}") as o:
            await o.seed(10)
            await asyncio.sleep(0.4)
            ov = await o.ev(OVERFLOW_JS)
            m = await o.ev(MEASURE)
            nm = f"{GAME}-vp{size['width']}-view.png"
            await o.page.screenshot(path=str(pathlib.Path(__file__).parent / 'shots' / nm))
            from common import SHOTS
            st = png_stats(SHOTS / nm)
            vp[f"{size['width']}x{size['height']}"] = {'overflow': ov, 'measure': m, 'shot': st,
                                                        'pageerrors': o.pageerrors}
    R['scenarios']['viewports'] = vp
    return R

if __name__ == '__main__':
    asyncio.run(run(main, 'chk.json'))
