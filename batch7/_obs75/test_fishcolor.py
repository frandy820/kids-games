# -*- coding: utf-8 -*-
"""fishcolor 钓鱼颜色 · 5.5 岁女孩人设真实试玩（batch7/_obs75 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 近似色 / flat10 章3 双色指令 / flat15 章4 高密度近似对
人设锚点：红橙/蓝紫混淆（近似色对故意错 2-3 次看 pulse 与 sayW 10s 节流）、watch 抢点被吞、
好奇点黑白色鱼、点已钓起的鱼、点水面空白、兔子/听按钮、静置救援（20s 设计 vs 5.5 岁 15s 极限）。
钩子 FIS（currentLevel/quiz/tapFish/tutorial）。独立 chromium.launch()，绝不碰已有浏览器。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'fishcolor', 'index.html').replace('\\', '/')
GAME = 'fis'
NEAR = {'red': ['orange'], 'orange': ['red', 'yellow'], 'yellow': ['orange'],
        'blue': ['purple'], 'purple': ['blue']}

async def quiz_of(pg): return await pg.evaluate('FIS.quiz')
async def lv_of(pg): return await pg.evaluate('FIS.currentLevel')

async def fish_click(pg, i):
    return await click_sel(pg, '.animal[data-i="%d"]' % i)

async def pulse_count(pg):
    return await pg.evaluate("document.querySelectorAll('#pond .animal.breathe').length")

async def live_target_idx(pg):
    q = await quiz_of(pg)
    if not q: return q, None
    act = q['act']
    if act < 0: return q, None
    for i, (f, g) in enumerate(zip(q['fishes'], q['gone'])):
        if f['c'] == q['targets'][act] and not g:
            return q, i
    return q, None

async def wrong_fish_idx(pg, kinds=None):
    """非目标干扰鱼：优先 kinds（探索）/ 近似色对（人设混淆）/ 任意"""
    q = await quiz_of(pg)
    if not q: return None
    act = q['act']
    t = q['targets'][act]
    nears = NEAR.get(t, [])
    best = anyd = kf = None
    for i, (f, g) in enumerate(zip(q['fishes'], q['gone'])):
        if g or f['c'] in q['targets']: continue
        if kinds and f['c'] in kinds and kf is None: kf = i
        if f['c'] in nears and best is None: best = i
        if anyd is None: anyd = i
    return kf if kf is not None else (best if best is not None else anyd)

BLANK_PT = """() => {
  const cont = document.getElementById('pond');
  const r = cont.getBoundingClientRect();
  const els = [...document.querySelectorAll('#pond .animal')].map(e => e.getBoundingClientRect());
  for (const dx of [16, 40, 80, 130, 190, 260]) for (const dy of [14, 50, 100, 170, 250]) {
    const x = r.left + dx, y = r.top + dy;
    if (x < r.right && y < r.bottom &&
        !els.some(b => x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8))
      return [x, y];
  }
  return [r.left + 8, r.top + 8];
}"""

async def solve_level(pg, log, on_step=None, timeout=240):
    """从当前题起真实点鱼玩到通关；on_step(q) 在每道新题开始（演出窗口后）回调一次"""
    events, quizzes, last_step = [], {}, -1
    t0 = time.time()
    while True:
        lv = await lv_of(pg)
        if lv and lv.get('done'): break
        if time.time() - t0 > timeout:
            events.append({'ev': 'TIMEOUT'}); break
        q = await quiz_of(pg)
        if not q:
            await pg.wait_for_timeout(400); continue
        s = q['step']
        if s != last_step:
            last_step = s
            await pg.wait_for_timeout(1200)          # 题成推进演出窗口 + renderQuiz 换题
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {'targets': q['targets'], 'need': q['need'], 'act0': q['act'],
                              'fishes': [f['c'] for f in q['fishes']], 'miss': q['miss']}
            if on_step:
                n0 = len(await vlog(pg))
                await on_step(pg, q, log, events)
                events.append({'ev': 'step_%d_voice' % s, 'v': fmt_v((await vlog(pg))[n0:])})
        q, i = await live_target_idx(pg)
        if i is None:
            await pg.wait_for_timeout(350); continue
        await fish_click(pg, i)
        log['clicks'] += 1
        await pg.wait_for_timeout(620)
    lv = await lv_of(pg)
    return lv, quizzes, events

async def stars_of(pg, lv):
    key = '%d-%d' % (lv['ch'], lv['lv'])
    for _ in range(16):
        st = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if st: return st
        await pg.wait_for_timeout(500)
    return None

async def rescue_test(pg, label):
    n0 = len(await vlog(pg))
    t0 = time.time()
    await pg.wait_for_timeout(25500)
    new = (await vlog(pg))[n0:]
    d = [(e['t'] - int(t0 * 1000)) / 1000.0 for e in new]
    return {'label': label, 'waited_s': 25.5, 'entries': fmt_v(new), 'fire_after_s': d}

async def main():
    result = {'game': 'fishcolor', 'url': URL, 'pageerrors': [], 'levels': []}
    log = {'clicks': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: result['pageerrors'].append(str(e)))

        # ============ flat0 教学关（干净档） ============
        await pg.goto(URL)
        await pg.wait_for_timeout(600)
        await pg.evaluate('localStorage.clear()')
        await pg.reload()
        await pg.wait_for_timeout(900)
        await install_logger(pg)
        tut, seen_watch = {}, False
        for _ in range(60):
            t = await pg.evaluate('FIS && FIS.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(250)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            f0 = (await lv_of(pg))['caught']
            q0 = await quiz_of(pg)
            # 人设抢点：看演示时忍不住点目标鱼 → 应被吞（locked）
            _, i = await live_target_idx(pg)
            sw = False
            if i is not None:
                n0 = len(await vlog(pg))
                await fish_click(pg, i); log['clicks'] += 1
                await pg.wait_for_timeout(500)
                f1 = (await lv_of(pg))['caught']
                sw = (f1 == f0)
            tut['watch_swallow'] = sw
            await shot(pg, 'fis_flat0_watch.png')
        for _ in range(100):
            t = await pg.evaluate('FIS && FIS.tutorial')
            if t == 'help': break
            await pg.wait_for_timeout(300)
        tut['help_enter'] = await pg.evaluate('FIS && FIS.tutorial')
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['rescue_in_help'] = await rescue_test(pg, 'flat0_help_idle')

        async def flat0_on_step(pg, q, log, events):
            s = q['step']
            if s == 1:  # 人设：故意点别的鱼看反应（ch1 基础色，无近似对）→ 首错不 pulse
                w = await wrong_fish_idx(pg)
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await fish_click(pg, w); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                q2 = await quiz_of(pg)
                events.append({'ev': 'wrong1_distractor', 'miss': q2['miss'],
                               'retries': (await lv_of(pg))['retries'],
                               'pulse': [p0, await pulse_count(pg)],
                               'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 2:  # 先钓一条再点同一条已钓起的鱼（again 早退零惩罚）
                qq, i = await live_target_idx(pg)
                if i is not None:
                    await fish_click(pg, i); log['clicks'] += 1
                    await pg.wait_for_timeout(950)
                    q1 = await quiz_of(pg)
                    m0 = q1['miss']; r0 = (await lv_of(pg))['retries']
                    n0 = len(await vlog(pg))
                    await fish_click(pg, i); log['clicks'] += 1
                    await pg.wait_for_timeout(800)
                    q2 = await quiz_of(pg)
                    events.append({'ev': 'tap_gone_again', 'miss': [m0, q2['miss']],
                                   'retries': [r0, (await lv_of(pg))['retries']],
                                   'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:  # 点水面空白（10s 节流轻提示）
                pt = await pg.evaluate(BLANK_PT)
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'blank_pond_click', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 4:  # 兔子按钮（flat<3 → sayP 播）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-rabbit'); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'rabbit_btn', 'voice': fmt_v((await vlog(pg))[n0:])})

        # "独"：help 下首次钓对 → solo 放手
        qq, i = await live_target_idx(pg)
        if i is not None:
            await fish_click(pg, i); log['clicks'] += 1
            await pg.wait_for_timeout(900)
        tut['after_first_catch'] = await pg.evaluate('FIS && FIS.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'fis_flat0_solo.png')
        lv0, quizzes0, events0 = await solve_level(pg, log, flat0_on_step)
        vlog0 = fmt_v(await vlog(pg))
        stars0 = await stars_of(pg, lv0) if lv0 else None
        result['levels'].append({'tag': 'flat0', 'flat': lv0['flat'] if lv0 else -1,
                                 'ch': lv0['ch'] if lv0 else -1, 'dch': lv0['dch'] if lv0 else -1,
                                 'clicks': log['clicks'], 'retries': lv0['retries'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut, 'events': events0, 'vlog': vlog0})
        await shot(pg, 'fis_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue=%s' %
              (log['clicks'], lv0['retries'], stars0, tut.get('watch_swallow'),
               tut.get('after_first_catch'), tut['rescue_in_help']['entries'][:2]))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events):
            if q['step'] != 0: return
            w = await wrong_fish_idx(pg)      # 近似色对优先（人设：红橙/蓝紫分不清）
            n0 = len(await vlog(pg)); p0 = await pulse_count(pg)
            await fish_click(pg, w); log['clicks'] += 1
            await pg.wait_for_timeout(950)
            events.append({'ev': 'near_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                           'pulse': [p0, await pulse_count(pg)],
                           'miss': (await quiz_of(pg))['miss']})
            n0 = len(await vlog(pg)); p0 = await pulse_count(pg)
            await fish_click(pg, w); log['clicks'] += 1
            await pg.wait_for_timeout(950)
            events.append({'ev': 'near_wrong2_in10s_throttled', 'voice': fmt_v((await vlog(pg))[n0:]),
                           'pulse': [p0, await pulse_count(pg)],
                           'miss': (await quiz_of(pg))['miss']})
            await pg.wait_for_timeout(10600)   # 过节流窗再错一次
            n0 = len(await vlog(pg))
            await fish_click(pg, w); log['clicks'] += 1
            await pg.wait_for_timeout(950)
            events.append({'ev': 'near_wrong3_after10s', 'voice': fmt_v((await vlog(pg))[n0:]),
                           'miss': (await quiz_of(pg))['miss']})

        async def flat10_on_step(pg, q, log, events):
            if q['step'] == 0:
                events.append({'ev': 'dual_chip_cards',
                               'n': await pg.evaluate("document.querySelectorAll('#prompt-chip .card').length"),
                               'targets': q['targets'], 'need': q['need']})
                w = await wrong_fish_idx(pg, kinds=('black', 'white'))  # 人设：好奇点黑/白鱼
                if w is not None:
                    n0 = len(await vlog(pg))
                    await fish_click(pg, w); log['clicks'] += 1
                    await pg.wait_for_timeout(950)
                    events.append({'ev': 'explore_bw_fish', 'voice': fmt_v((await vlog(pg))[n0:]),
                                   'miss': (await quiz_of(pg))['miss']})
            if q['step'] == 2:  # 双色第二步换卡/读指令证据：记录 chip 状态
                events.append({'ev': 'dual_step2_chip',
                               'n': await pg.evaluate("document.querySelectorAll('#prompt-chip .card').length")})

        async def flat15_on_step(pg, q, log, events):
            if q['step'] == 0:
                t = q['targets'][q['act']]; nears = NEAR.get(t, [])
                events.append({'ev': 'density', 'fishes': len(q['fishes']), 'target': t,
                               'near_distract': sum(1 for f in q['fishes'] if f['c'] in nears)})
                w = await wrong_fish_idx(pg)
                n0 = len(await vlog(pg)); p0 = await pulse_count(pg)
                await fish_click(pg, w); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'near_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})
                n0 = len(await vlog(pg)); p0 = await pulse_count(pg)
                await fish_click(pg, w); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'near_wrong2_pulse', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})

        for n_done, on_step, tag, do_rescue in (
                (5,  flat5_on_step,  'flat5',  True),
                (10, flat10_on_step, 'flat10', False),
                (15, flat15_on_step, 'flat15', False)):
            log['clicks'] = 0
            lim = await pg.evaluate(SEED_SAVE, {'n': n_done, 'g': GAME})
            await pg.reload()
            await pg.wait_for_timeout(900)
            await install_logger(pg)
            await pg.wait_for_timeout(1600)
            misc = {'seed_lim': lim, 'opening_voice': fmt_v(await vlog(pg)) + list(await opening_evidence(pg))}
            await shot(pg, 'fis_%s_open.png' % tag)
            if do_rescue:
                misc['rescue'] = await rescue_test(pg, tag + '_idle')
            lv, quizzes, events = await solve_level(pg, log, on_step)
            lvl_vlog = fmt_v(await vlog(pg))
            stars = await stars_of(pg, lv) if lv else None
            result['levels'].append({'tag': tag, 'flat': lv['flat'] if lv else -1,
                                     'ch': lv['ch'] if lv else -1, 'dch': lv['dch'] if lv else -1,
                                     'clicks': log['clicks'], 'retries': lv['retries'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes, 'events': events, 'misc': misc, 'vlog': lvl_vlog})
            await shot(pg, 'fis_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s retries=%s stars=%s rescue=%s' %
                  (tag, lv['flat'], lv['dch'], log['clicks'], lv['retries'], stars,
                   misc.get('rescue', {}).get('entries', [])[:2]))
        # 全程 vlog 末态快照（含双色第二步 say 证据）
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('fishcolor', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
