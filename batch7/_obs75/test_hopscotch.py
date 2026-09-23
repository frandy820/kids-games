# -*- coding: utf-8 -*-
"""hopscotch 跳格子数数 · 5.5 岁女孩人设真实试玩（batch7/_obs75 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 顺数 6-10 / flat10 章3 倒数 / flat15 章4 混合+藏数字
人设锚点：唱数 1-10 会但点数不稳（6-10 漏数/跳格）→ far 跳格错点；倒数章会先往前跳错方向
（相邻反向格是合法步零惩罚，兔子越走越远再折返）；藏数字格只看点数圆点；点当前格/水面空白/
听按钮/兔子按钮；静置救援。钩子 HOP。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'hopscotch', 'index.html').replace('\\', '/')
GAME = 'hop'

async def quiz_of(pg): return await pg.evaluate('HOP.quiz')
async def lv_of(pg): return await pg.evaluate('HOP.currentLevel')

async def cell_click(pg, n):
    return await click_sel(pg, '.cell[data-n="%d"]' % n)

async def pulse_count(pg):
    return await pg.evaluate("document.querySelectorAll('.cell.pulse').length")

def far_cell(q):
    n = q['cur'] + 2
    return n if n <= 10 else q['cur'] - 2

BLANK_PT = """() => {
  const cont = document.getElementById('field');
  const r = cont.getBoundingClientRect();
  const els = [...document.querySelectorAll('.cell')].map(e => e.getBoundingClientRect());
  for (const dy of [12, 40, 80, 140, 220, 320]) for (const dx of [12, 50, 110, 190, 280, 380]) {
    const x = r.left + dx, y = r.top + dy;
    if (x < r.right - 10 && y < r.bottom - 10 &&
        !els.some(b => x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8))
      return [x, y];
  }
  return [r.left + 6, r.top + 6];
}"""

async def solve_level(pg, log, on_step=None, after_click=None, timeout=240):
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
            await pg.wait_for_timeout(1300)          # 到旗 900ms 演出 + renderQuiz
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {'from': q['from'], 'to': q['to'], 'dir': q['dir'], 'len': q['len'],
                              'hidden': q['hidden']}
            if on_step:
                n0 = len(await vlog(pg))
                await on_step(pg, q, log, events)
                events.append({'ev': 'step_%d_voice' % s, 'v': fmt_v((await vlog(pg))[n0:])})
                continue          # on_step 内的代跳可能推进本题 → 回循环走新题分支
        n = q['cur'] + (1 if q['to'] > q['cur'] else -1)
        await cell_click(pg, n)
        log['clicks'] += 1
        await pg.wait_for_timeout(700)
        if after_click:
            await after_click(pg, q, n, events)
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
    return {'label': label, 'waited_s': 25.5, 'entries': fmt_v(new),
            'fire_after_s': [(e['t'] - int(t0 * 1000)) / 1000.0 for e in new]}

async def main():
    result = {'game': 'hopscotch', 'url': URL, 'pageerrors': [], 'levels': []}
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
            t = await pg.evaluate('HOP && HOP.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(200)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            q0 = await quiz_of(pg)
            cur0 = q0['cur']
            # 人设抢点：看演示时点下一格 → 应被吞（locked）
            await cell_click(pg, q0['from'] + 1); log['clicks'] += 1
            await pg.wait_for_timeout(500)
            q1 = await quiz_of(pg)
            tut['watch_swallow'] = bool(q1) and q1['cur'] == cur0
            await shot(pg, 'hop_flat0_watch.png')
        for _ in range(100):
            t = await pg.evaluate('HOP && HOP.tutorial')
            if t == 'help': break
            await pg.wait_for_timeout(250)
        tut['help_enter'] = await pg.evaluate('HOP && HOP.tutorial')
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['rescue_in_help'] = await rescue_test(pg, 'flat0_help_idle')

        async def flat0_on_step(pg, q, log, events):
            s = q['step']
            if s == 1:  # 人设：跳格漏数（点 from+2 跳过一格）→ far 零惩罚+sayW；再点当前格=self
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                q2 = await quiz_of(pg)
                events.append({'ev': 'far_skip', 'cur': q2['cur'], 'miss': q2['miss'],
                               'retries': (await lv_of(pg))['retries'],
                               'pulse': [p0, await pulse_count(pg)],
                               'voice': fmt_v((await vlog(pg))[n0:])})
                r0 = (await lv_of(pg))['retries']
                await cell_click(pg, q2['cur']); log['clicks'] += 1    # 点当前所站格
                await pg.wait_for_timeout(700)
                q3 = await quiz_of(pg)
                events.append({'ev': 'self_tap', 'retries': [r0, (await lv_of(pg))['retries']],
                               'miss': q3['miss']})
            if s == 2:
                pt = await pg.evaluate(BLANK_PT)
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'blank_river_click', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 4:
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-rabbit'); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'rabbit_btn', 'voice': fmt_v((await vlog(pg))[n0:])})

        # "独"：help 下首次跳对一格 → solo
        q = await quiz_of(pg)
        if q:
            n = q['cur'] + (1 if q['to'] > q['cur'] else -1)
            await cell_click(pg, n); log['clicks'] += 1
            await pg.wait_for_timeout(900)
        tut['after_first_hop'] = await pg.evaluate('HOP && HOP.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'hop_flat0_solo.png')
        lv0, quizzes0, events0 = await solve_level(pg, log, flat0_on_step)
        vlog0 = fmt_v(await vlog(pg))
        stars0 = await stars_of(pg, lv0) if lv0 else None
        result['levels'].append({'tag': 'flat0', 'flat': lv0['flat'] if lv0 else -1,
                                 'ch': lv0['ch'] if lv0 else -1, 'dch': lv0['dch'] if lv0 else -1,
                                 'clicks': log['clicks'], 'retries': lv0['retries'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut, 'events': events0, 'vlog': vlog0})
        await shot(pg, 'hop_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue=%s' %
              (log['clicks'], lv0['retries'], stars0, tut.get('watch_swallow'),
               tut.get('after_first_hop'), tut['rescue_in_help']['entries'][:2]))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events):
            s = q['step']
            if s == 0:
                # 人设：6-10 点数不稳 → 跳格 far 错点三连（播/静默+pulse/过节流再播）
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)],
                               'miss': (await quiz_of(pg))['miss']})
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong2_throttled', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)],
                               'miss': (await quiz_of(pg))['miss']})
                await pg.wait_for_timeout(10600)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong3_after10s', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'miss': (await quiz_of(pg))['miss']})
            if s == 1:
                # 反向探索：往回跳一格（相邻反向=合法步零惩罚，兔子真跳回去+报数）
                q2 = await quiz_of(pg)
                back = q2['cur'] - 1
                if back >= 1:
                    r0 = (await lv_of(pg))['retries']
                    n0 = len(await vlog(pg))
                    await cell_click(pg, back); log['clicks'] += 1
                    await pg.wait_for_timeout(800)
                    q3 = await quiz_of(pg)
                    events.append({'ev': 'backward_adjacent', 'cur': [q2['cur'], q3['cur']],
                                   'retries': [r0, (await lv_of(pg))['retries']],
                                   'voice': fmt_v((await vlog(pg))[n0:])})

        async def flat10_on_step(pg, q, log, events):
            s = q['step']
            if s == 0:
                # 人设：倒数不理解"往回" → 先点 cur+1（相邻反向=合法，兔子往前跳走远+报数）
                fwd = q['cur'] + 1
                if fwd <= 10:
                    r0 = (await lv_of(pg))['retries']
                    n0 = len(await vlog(pg))
                    await cell_click(pg, fwd); log['clicks'] += 1
                    await pg.wait_for_timeout(800)
                    q2 = await quiz_of(pg)
                    events.append({'ev': 'forward_away_legal', 'cur': [q['cur'], q2['cur']],
                                   'retries': [r0, (await lv_of(pg))['retries']],
                                   'voice': fmt_v((await vlog(pg))[n0:])})
                # 再 far 错点一次（sayW flat≥3 首次应播）
                q2 = await quiz_of(pg)
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q2)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)],
                               'miss': (await quiz_of(pg))['miss']})
            if s == 1:
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:
                pt = await pg.evaluate(BLANK_PT)
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'blank_river_click', 'voice': fmt_v((await vlog(pg))[n0:])})

        async def flat15_on_step(pg, q, log, events):
            s = q['step']
            if s == 0:
                events.append({'ev': 'hidden_cells', 'hidden': q['hidden'],
                               'masked_dom': await pg.evaluate("document.querySelectorAll('.cell.masked').length"),
                               'path': '%d→%d dir%+d' % (q['from'], q['to'], q['dir'])})
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await cell_click(pg, far_cell(q)); log['clicks'] += 1
                await pg.wait_for_timeout(950)
                events.append({'ev': 'far_wrong2_pulse', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})

        async def hop_after_click(pg, q_before, n, events):
            """藏数字格点亮证据（masked→reveal，shown 增长）"""
            if q_before['hidden']:
                rev = await pg.evaluate("document.querySelectorAll('.cell.reveal').length")
                if rev and not any(e.get('ev') == 'reveal_cnt' and e.get('n') == rev for e in events):
                    qn = await quiz_of(pg)
                    events.append({'ev': 'reveal_cnt', 'n': rev,
                                   'shown': qn['shown'] if qn else None})

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
            await shot(pg, 'hop_%s_open.png' % tag)
            if do_rescue:
                misc['rescue'] = await rescue_test(pg, tag + '_idle')
            lv, quizzes, events = await solve_level(pg, log, on_step, hop_after_click)
            lvl_vlog = fmt_v(await vlog(pg))
            stars = await stars_of(pg, lv) if lv else None
            result['levels'].append({'tag': tag, 'flat': lv['flat'] if lv else -1,
                                     'ch': lv['ch'] if lv else -1, 'dch': lv['dch'] if lv else -1,
                                     'clicks': log['clicks'], 'retries': lv['retries'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes, 'events': events, 'misc': misc, 'vlog': lvl_vlog})
            await shot(pg, 'hop_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s retries=%s stars=%s rescue=%s' %
                  (tag, lv['flat'], lv['dch'], log['clicks'], lv['retries'], stars,
                   misc.get('rescue', {}).get('entries', [])[:2]))
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('hopscotch', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
