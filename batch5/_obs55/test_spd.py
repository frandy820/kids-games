# -*- coding: utf-8 -*-
"""spotdiff 5.5 岁人设试玩：教学/真实通关(0,5,10,15)/犯错(空点+点上图)/静置救援/双 viewport"""
import asyncio, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import Obs, run, OVERFLOW_JS, png_stats

GAME = 'spotdiff'

VB2PAGE = """(xy) => { const svg = document.querySelector('#pic-bottom svg');
  const m = svg.getScreenCTM(); const pt = svg.createSVGPoint();
  pt.x = xy[0]; pt.y = xy[1]; const p = pt.matrixTransform(m);
  return [p.x, p.y]; }"""
TOP_VB2PAGE = """(xy) => { const svg = document.querySelector('#pic-top svg');
  const m = svg.getScreenCTM(); const pt = svg.createSVGPoint();
  pt.x = xy[0]; pt.y = xy[1]; const p = pt.matrixTransform(m);
  return [p.x, p.y]; }"""

# 两图元素清单（g 的 translate/scale + 主 fill），供差异可辨性数值化
SCENE_SNAPSHOT = """(() => {
  const grab = sel => { const svg = document.querySelector(sel);
    return [...svg.querySelectorAll('g[transform]')].map(g => {
      const t = g.getAttribute('transform');
      const m = t.match(/translate\\(([-\\d.]+),([-.\\d]+)\\) scale\\(([-\\d.]+)\\)/);
      const bb = g.getBBox();
      const f = g.querySelector('[fill]');
      return { t: m ? [+m[1], +m[2]] : null, s: m ? +m[3] : 1,
               bb: [Math.round(bb.width), Math.round(bb.height)],
               fill: f ? f.getAttribute('fill') : null };
    }); };
  return { top: grab('#pic-top svg'), bottom: grab('#pic-bottom svg') };
})()"""

MEASURE = """(() => {
  const svg = document.querySelector('#pic-bottom svg');
  const r = svg.getBoundingClientRect();
  const scale = r.width / 800;
  const hz = [...svg.querySelectorAll('.hotzone')].map(c => +c.getAttribute('r'));
  const wrap = document.getElementById('pic-bottom').getBoundingClientRect();
  return { svgRect: [Math.round(r.width), Math.round(r.height)], scale: +scale.toFixed(3),
           hotzoneRVb: hz, hotzonePx: hz.map(v => Math.round(v * scale)),
           wrap: [Math.round(wrap.width), Math.round(wrap.height)] };
})()"""

DIFF_SIG = """([diffs]) => {
  const near = (list, x, y) => { let b = null, bd = 1e9;
    list.forEach(e => { const d = Math.hypot(e.t[0] - x, e.t[1] - y); if (d < bd) { bd = d; b = e; } });
    return b; };
  const snap = window.__snap || { top: [], bottom: [] };
  return diffs.map(d => {
    const bt = near(snap.top, d.x, d.y), bb = near(snap.bottom, d.x, d.y);
    return { type: d.type, at: [Math.round(d.x), Math.round(d.y)],
      topEl: bt ? { at: bt.t.map(Math.round), s: +bt.s.toFixed(2), bb: bt.bb, fill: bt.fill } : null,
      botEl: bb ? { at: bb.t.map(Math.round), s: +bb.s.toFixed(2), bb: bb.bb, fill: bb.fill } : null };
  });
}"""

BEST_EMPTY = """([diffs, Rvb]) => {
  let best = null, bd = -1;
  for (let x = 80; x <= 720; x += 20) for (let y = 70; y <= 420; y += 15) {
    let md = 1e9;
    diffs.forEach(d => { const dd = Math.hypot(d.x - x, d.y - y); if (dd < md) md = dd; });
    if (md > bd) { bd = md; best = [x, y]; }
  }
  return { pt: best, minDist: Math.round(bd), Rvb: Math.round(Rvb) };
}"""

RING_STATE = """(() => ({
  ringsBottom: document.querySelectorAll('#pic-bottom .ring').length,
  ringsTop: document.querySelectorAll('#pic-top .ring').length,
  hintRing: document.querySelectorAll('#pic-bottom .hintring').length
}))()"""

async def click_vb(o, xy, which='bottom'):
    js = VB2PAGE if which == 'bottom' else TOP_VB2PAGE
    p = await o.ev(js, xy[0], xy[1])
    await o.page.mouse.click(p[0], p[1])
    return p

async def solve_level_real(o, rec_steps):
    """真实点完全部差异；返回每步记录"""
    while True:
        q = await o.quiz()
        if not q:
            break
        await o.ev("() => { window.__snap = null; }")
        snap = await o.ev(SCENE_SNAPSHOT)
        await o.page.evaluate("([s]) => { window.__snap = s; }", arg=[snap])
        diffs = q['diffs']
        sig = await o.ev(DIFF_SIG, diffs)
        for d in diffs:
            await click_vb(o, (d['x'], d['y']))
            await asyncio.sleep(0.35)
        rings = await o.ev(RING_STATE)
        cur = await o.cur()
        rec_steps.append({'k': q['k'], 'sig': sig, 'rings': rings,
                          'found': cur['foundCount'], 'misses': cur['misses'], 'done': cur['done']})
        if cur['done']:
            return rec_steps
        await asyncio.sleep(1.2)   # winFlow 推进窗口

async def wait_level_saved(o, flat, timeout=30000):
    key = f"{flat // 5 + 1}-{flat % 5}"
    await o.page.wait_for_function("([k]) => !!(KIDS._save().levels[k])", arg=[key], timeout=timeout)
    return await o.ev("([k]) => KIDS._save().levels[k]", key)

async def main(browser):
    R = {'game': GAME, 'scenarios': {}}

    # ---- S1 教学（新档 flat0）----
    async with Obs(browser, GAME, tag='tut') as o:
        t0 = asyncio.get_event_loop().time()
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'watch'", arg=[o.hook], timeout=8000)
        q0 = await o.quiz()
        # 演示吞输入探针：真实点差异处 + 空点各一次
        await click_vb(o, (q0['diffs'][0]['x'], q0['diffs'][0]['y']))
        await click_vb(o, (60, 430))
        qmid = await o.quiz()
        cMid = await o.cur()
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'help'", arg=[o.hook], timeout=30000)
        t_help = asyncio.get_event_loop().time()
        tut = {'watchSec': round(t_help - t0, 1), 'k': q0['k'],
               'swallow': {'foundAfterTaps': qmid['found'].count(True), 'missesAfterTaps': cMid['misses']},
               'voiceDuring': [v['k'] for v in await o.voice()]}
        await o.shot('help')
        # "帮"第一步：真实 pointer 点第 1 处差异 → solo
        q = await o.quiz()
        await click_vb(o, (q['diffs'][0]['x'], q['diffs'][0]['y']))
        await o.page.wait_for_function("([h]) => window[h].tutorial === 'solo'", arg=[o.hook], timeout=8000)
        tut['soloHandoff'] = True
        steps = []
        # 打完本关剩余差异（真实）
        while True:
            q = await o.quiz()
            if not q:
                break
            for d in q['diffs']:
                if not q['found'][q['diffs'].index(d)]:
                    await click_vb(o, (d['x'], d['y']))
                    await asyncio.sleep(0.35)
            c = await o.cur()
            if c['done']:
                break
            await asyncio.sleep(1.0)
        await wait_level_saved(o, 0)
        tut['levelStars'] = await o.ev("([k]) => KIDS._save().levels[k]", '1-0')
        R['scenarios']['tutorial'] = tut

    # ---- S2 真实通关 flat5 / flat10 / flat15 ----
    for flat in (5, 10, 15):
        async with Obs(browser, GAME, tag=f'f{flat}') as o:
            await o.seed(flat)
            lv = await o.cur()
            m0 = await o.ev(MEASURE)
            # 差异两两间距（vb）
            q = await o.quiz()
            ds = q['diffs']
            pair = [round(((ds[a]['x'] - ds[b]['x']) ** 2 + (ds[a]['y'] - ds[b]['y']) ** 2) ** 0.5)
                    for a in range(len(ds)) for b in range(a + 1, len(ds))]
            steps = await solve_level_real(o, [])
            await o.shot('done')
            saved = await wait_level_saved(o, flat)
            R['scenarios'][f'real_flat{flat}'] = {
                'startLevel': {k: lv[k] for k in ('flat', 'ch', 'dch', 'k')},
                'measure0': m0, 'diffPairDistVb': pair, 'steps': steps, 'stars': saved,
                'pageerrors': o.pageerrors, 'netreq': o.netreq[:3]}

    # ---- S3 犯错路径 flat10：2 次空点 → 高亮救援；点上图无响应 ----
    async with Obs(browser, GAME, tag='err') as o:
        await o.seed(10)
        q = await o.quiz()
        ds = q['diffs']
        scale = (await o.ev(MEASURE))['scale']
        be = await o.ev(BEST_EMPTY, ds, 64 / scale)
        ev = []
        # 点上图差异处（孩子常见行为：点了上面那幅）
        d0 = ds[0]
        before = await o.quiz()
        await click_vb(o, (d0['x'], d0['y']), which='top')
        await asyncio.sleep(0.5)
        after = await o.quiz()
        ev.append({'step': 'tapTop', 'foundChanged': before['found'] != after['found'],
                   'missesChanged': (await o.cur())['misses'] != 0})
        # 空点 1：无提示圈
        await click_vb(o, be['pt'])
        await asyncio.sleep(0.8)
        st1 = await o.ev(RING_STATE); c1 = await o.cur()
        ev.append({'step': 'miss1', 'hintRing': st1['hintRing'], 'misses': c1['misses']})
        # 空点 2：misses>=2 → 提示圈出现
        await click_vb(o, be['pt'])
        await asyncio.sleep(0.8)
        st2 = await o.ev(RING_STATE); c2 = await o.cur()
        ev.append({'step': 'miss2', 'hintRing': st2['hintRing'], 'misses': c2['misses']})
        # 提示圈是否指向真实差异（距离校验）
        hintAt = await o.ev("""(() => { const c = document.querySelector('#pic-bottom .hintring');
          return c ? [+c.getAttribute('cx'), +c.getAttribute('cy')] : null; })()""")
        if hintAt:
            nearD = min(round(((d['x'] - hintAt[0]) ** 2 + (d['y'] - hintAt[1]) ** 2) ** 0.5) for d in ds if not q['found'][ds.index(d)])
            ev.append({'step': 'hintTargets', 'nearestUnfoundDist': nearD})
        # 点在提示圈中心（孩子跟随提示）→ 应命中
        if hintAt:
            await click_vb(o, (hintAt[0], hintAt[1]))
            await asyncio.sleep(0.5)
            ev.append({'step': 'followHint', 'found': (await o.cur())['foundCount']})
        # 剩余真实点完 → 零惩罚通关
        while True:
            q = await o.quiz()
            if not q:
                break
            for i, d in enumerate(q['diffs']):
                if not q['found'][i]:
                    await click_vb(o, (d['x'], d['y']))
                    await asyncio.sleep(0.35)
            if (await o.cur())['done']:
                break
            await asyncio.sleep(1.0)
        await wait_level_saved(o, 10)
        R['scenarios']['error_path'] = {'events': ev,
            'finalStars': await o.ev("([k]) => KIDS._save().levels[k]", '3-0'),
            'emptyProbe': be}

    # ---- S4 静置 25s 救援（flat10）----
    async with Obs(browser, GAME, tag='idle') as o:
        await o.seed(10)
        v0 = len(await o.voice())
        await asyncio.sleep(26)
        v = await o.voice()
        r1 = v[v0:]
        await asyncio.sleep(22)
        v2 = await o.voice()
        R['scenarios']['idle_rescue'] = {'first26s': [x['k'] for x in r1],
                                         'next22s': [x['k'] for x in v2[len(v):]],
                                         'pageerrors': o.pageerrors}

    # ---- S5 双 viewport ----
    vp = {}
    for size in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        async with Obs(browser, GAME, viewport=size, tag=f"vp{size['width']}") as o:
            await o.seed(15)
            await asyncio.sleep(0.4)
            ov = await o.ev(OVERFLOW_JS)
            m = await o.ev(MEASURE)
            from common import SHOTS
            nm = f"{GAME}-vp{size['width']}-view.png"
            await o.page.screenshot(path=str(SHOTS / nm))
            vp[f"{size['width']}x{size['height']}"] = {'overflow': ov, 'measure': m,
                'shot': png_stats(SHOTS / nm), 'pageerrors': o.pageerrors}
    R['scenarios']['viewports'] = vp
    return R

if __name__ == '__main__':
    asyncio.run(run(main, 'spd.json'))
