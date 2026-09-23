# -*- coding: utf-8 -*-
"""words 识字积木 · 6 岁女孩人设真实试玩（batch6/_obs6 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 / flat10 章3 / flat15 章4（种档进关）
人设模拟：watch 抢点被吞、干扰块试错、2 部件顺序反、乱点题面大字/空槽、静置 25s 救援。
钩子 WRD；语音证据=monkey-patch 调用记录。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel, shot, save_result, fmt_v, SEED_SAVE
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'words', 'index.html').replace('\\', '/')
GAME = 'words'

async def quiz_of(pg):
    return await pg.evaluate('WRD.quiz')

async def lv_of(pg):
    return await pg.evaluate('WRD.currentLevel')

async def tap_tile(pg, i, log):
    ok = await click_sel(pg, '.tile[data-i="%d"]' % i)
    if ok:
        log['clicks'] += 1
    return ok

async def solve_word(pg, log, events):
    """按槽序真实点正确块拼完当前一个字（含槽满亮字等待）"""
    stale = 0
    while True:
        q = await quiz_of(pg)
        if not q:
            return 'level_done'
        j = next((k for k, v in enumerate(q['slots']) if v is None), None)
        if j is None:                      # 槽满判定中
            await pg.wait_for_timeout(2200)
            continue
        need = q['parts'][j]
        used = q['slotTileIdx']
        cand = next((i for i, ch in enumerate(q['tiles']) if ch == need and i not in used), None)
        if cand is None:
            await pg.wait_for_timeout(300)
            continue
        before = q['slotTileIdx'][:]
        await tap_tile(pg, cand, log)
        await pg.wait_for_timeout(420)
        q2 = await quiz_of(pg)
        if q2 and q2['slotTileIdx'] == before and None in q2['slots']:
            stale += 1                     # 点击未生效（演出窗/动画中）
            if stale == 8:
                dbg = await pg.evaluate("""() => ({
                  tut: WRD.tutorial, locked: !!document.querySelector('.k-ov'),
                  tiles: WRD.quiz ? WRD.quiz.tiles : null,
                  domTiles: [...document.querySelectorAll('.tile')].map(e => e.textContent),
                  domI: [...document.querySelectorAll('.tile')].map(e => e.dataset.i)})""")
                events.append({'ev': 'STALE_CLICKS', 'dbg': dbg})
            await pg.wait_for_timeout(700)
            continue
        stale = 0
        if q2 and all(s is not None for s in q2['slots']):
            await pg.wait_for_timeout(2300)  # 亮字+读音组词演出
            return 'word_done'

async def persona_error(pg, kind, log, events):
    """人设典型错误（每题至多一次）：distractor=点干扰块试试 / reverse=2 部件顺序反"""
    q = await quiz_of(pg)
    if not q:
        return
    if kind in ('distractor', 'distractor2'):
        n_tap = 2 if kind == 'distractor2' else 1
        for k in range(n_tap):
            d = next((i for i, t in enumerate(q['tileTypes']) if t == 'd'), None)
            if d is None:
                break
            slots0 = q['slots'][:]
            await tap_tile(pg, d, log)
            await pg.wait_for_timeout(650)
            q = await quiz_of(pg)
            wig = await pg.evaluate("document.querySelectorAll('.tile.wig').length")
            pulse = await pg.evaluate("document.querySelectorAll('.tile.pulse').length")
            events.append({'ev': 'tap_distractor', 'k': k + 1, 'bounced_no_fill': bool(q and q['slots'] == slots0),
                           'wig': wig, 'pulse_after': pulse,
                           'miss': await pg.evaluate('WRD.currentLevel.misses')})
    elif kind == 'reverse' and len(q['parts']) == 2:
        # 先点 parts[1] 再点 parts[0] → 槽满 fail 弹回
        used = q['slotTileIdx']
        c1 = next((i for i, ch in enumerate(q['tiles']) if ch == q['parts'][1] and i not in used), None)
        c0 = next((i for i, ch in enumerate(q['tiles']) if ch == q['parts'][0] and i not in used), None)
        if c1 is not None and c0 is not None and c1 != c0:
            await tap_tile(pg, c1, log)
            await pg.wait_for_timeout(400)
            await tap_tile(pg, c0, log)
            await pg.wait_for_timeout(900)      # fail 弹回 520ms
            q2 = await quiz_of(pg)
            events.append({'ev': 'reverse_order_fail', 'slots_after': q2['slots'] if q2 else None,
                           'miss': await pg.evaluate('WRD.currentLevel.misses')})

async def play_level(pg, personas, log):
    """通关当前关：per-题 persona 错误 + 正常拼字"""
    events = []
    quiz_data = []
    did = set()
    t0 = time.time()
    while True:
        lv = await lv_of(pg)
        if lv and lv.get('done'):
            break
        if time.time() - t0 > 300:
            events.append({'ev': 'TIMEOUT'})
            break
        q = await quiz_of(pg)
        if not q:
            await pg.wait_for_timeout(350)
            continue
        s = q['step']
        while len(quiz_data) <= s:
            quiz_data.append(None)
        if quiz_data[s] is None:
            quiz_data[s] = {'target': q['target'], 'py': q['py'], 'parts': q['parts'],
                            'distractors': q['distractors'], 'tiles': q['tiles']}
        if s not in did and personas.get(s):
            did.add(s)
            await persona_error(pg, personas[s], log, events)
        await solve_word(pg, log, events)
        await pg.wait_for_timeout(250)
    lv = await lv_of(pg)
    key = '%d-%d' % (lv['ch'], lv['lv']) if lv else '0-0'
    stars = None
    for _ in range(14):                          # celebrate→写档轮询（最多 7s）
        stars = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if stars:
            break
        await pg.wait_for_timeout(500)
    return {'flat': lv['flat'] if lv else -1, 'ch': lv['ch'], 'dch': lv['dch'], 'lv': lv['lv'],
            'quizzes': quiz_data, 'clicks': log['clicks'], 'misses': lv['misses'] if lv else -1,
            'stars': stars, 'events': events}

async def rescue_test(pg, label):
    """静置 25.5s → 新增语音=救援证据"""
    v0 = await vlog(pg)
    await pg.wait_for_timeout(25500)
    v1 = await vlog(pg)
    return {'label': label, 'new_entries': fmt_v(v1[len(v0):])}

async def main():
    result = {'game': GAME, 'pageerrors': [], 'levels': []}
    log = {'clicks': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: result['pageerrors'].append(str(e)))

        # ============ flat0：干净档教学关 ============
        await pg.goto(URL)
        await pg.wait_for_timeout(700)
        await install_logger(pg)
        tut = {}
        # -- watch 抢点（人设：教学期孩子会抢点，应被吞）--
        seen_watch = False
        for _ in range(60):
            t = await pg.evaluate('WRD && WRD.tutorial')
            if t == 'watch':
                seen_watch = True
                break
            if t in ('help', 'solo'):
                break
            await pg.wait_for_timeout(300)
        if seen_watch:
            q0 = await quiz_of(pg)
            s0 = q0['slots'][:] if q0 else None
            await click_sel(pg, '.tile')
            await pg.wait_for_timeout(500)
            q1 = await quiz_of(pg)
            tut['watch_swallow'] = bool(q1 and q1['slots'] == s0)
            await shot(pg, 'w_flat0_watch.png')
        # -- 等 help（幽灵手指）--
        for _ in range(80):
            t = await pg.evaluate('WRD && WRD.tutorial')
            if t == 'help':
                break
            await pg.wait_for_timeout(400)
        tut['help_enter'] = t
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        # -- 教学期静置 25s：救援（重读当前字音）--
        tut['rescue_teach'] = await rescue_test(pg, 'flat0_help_25s')
        # -- 第一字拼对 → solo 放手 --
        await solve_word(pg, log, [])
        tut['after_first_word'] = await pg.evaluate('WRD && WRD.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'w_flat0_solo.png')
        # -- 题 2-5 正常拼完 --
        r0 = await play_level(pg, {}, log)
        r0['tut'] = tut
        result['levels'].append(r0)
        await shot(pg, 'w_flat0_done.png')
        print('[flat0] done clicks=%s misses=%s stars=%s tut.swallow=%s solo=%s rescue=%s ev=%s' %
              (r0['clicks'], r0['misses'], r0['stars'], tut.get('watch_swallow'), tut.get('after_first_word'),
               tut['rescue_teach']['new_entries'][:3], json.dumps(r0['events'], ensure_ascii=False)[:400]))

        # ============ flat5 / flat10 / flat15 种档关 ============
        for n_done, personas, tag in (
                (5,  {0: 'distractor', 1: 'reverse'}, 'flat5'),
                (10, {0: 'reverse'}, 'flat10'),
                (15, {0: 'distractor2', 1: 'reverse'}, 'flat15')):
            log['clicks'] = 0
            await pg.evaluate(SEED_SAVE, {'n': n_done, 'g': GAME})
            await pg.reload()
            await pg.wait_for_timeout(900)
            await install_logger(pg)
            await pg.wait_for_timeout(1800)          # 开场语音队列（sayR 不受 flat 门）
            v_open = await vlog(pg)
            lv = await lv_of(pg)
            misc = {'flat': lv['flat'] if lv else -1, 'opening_voice': fmt_v(v_open) + list(await opening_evidence(pg))}
            # 乱点非主交互区（每款一次；words=题面大字+空槽）
            if tag == 'flat5':
                n0 = len(v_open)
                await click_sel(pg, '#target-card')   # 题面大字：10s 节流读音
                await pg.wait_for_timeout(400)
                await click_sel(pg, '.slot[data-i="0"]')  # 空槽：10s 节流 hint
                await pg.wait_for_timeout(300)
                await click_sel(pg, '.slot[data-i="0"]')  # 节流内再点：不应再播
                await pg.wait_for_timeout(500)
                vm = await vlog(pg)
                misc['misclick'] = fmt_v(vm[n0:])
            await shot(pg, 'w_%s_open.png' % tag)
            # 静置 25s 救援（flat≥3 关键：sayR 不受 flat 门）
            resc = await rescue_test(pg, tag + '_25s')
            misc['rescue'] = resc
            # 人设通关
            r = await play_level(pg, personas, log)
            r['misc'] = misc
            result['levels'].append(r)
            await shot(pg, 'w_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s misses=%s stars=%s rescue=%s' %
                  (tag, r['flat'], r['dch'], r['clicks'], r['misses'], r['stars'],
                   resc['new_entries'][:3]))
            # 连错 2 次支架（pulse）在 events 里体现（miss>=2 后 pulse）
        await ctx.close()
        await browser.close()
    save_result(GAME, result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
