# -*- coding: utf-8 -*-
"""fruitsplit 水果切切 · 5.5 岁女孩人设真实试玩（batch7/_obs75 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 切分+辨识 / flat10 章3 拼合 / flat15 章4 混合三模式
人设锚点：「一半」有分饼干生活经验但无拼合经验——辨识题先点"切开拼回"卡（以为切开的就是一半）、
拼合题点别的水果半块；切分题先戳水果本体（非主交互轻反馈）再点刀；下滑手势切一刀；
点已灰卡（again 零惩罚）、点案板空白、静置救援。钩子 FRU。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'fruitsplit', 'index.html').replace('\\', '/')
GAME = 'fru'

async def quiz_of(pg): return await pg.evaluate('FRU.quiz')
async def lv_of(pg): return await pg.evaluate('FRU.currentLevel')

async def opt_sel(pg, q, i):
    sel = '.card[data-i="%d"]' % i if q['mode'] == 'pick' else '.mopt[data-i="%d"]' % i
    return await click_sel(pg, sel)

async def pulse_count(pg):
    return await pg.evaluate("document.querySelectorAll('.card.pulse,.mopt.pulse').length")

async def wrong_opt(q, tried=()):
    for i in range(len(q['options'])):
        if i != q['answerIdx'] and i not in tried:
            return i
    return None

async def wrong_state_opt(q, state):
    for i, o in enumerate(q['options']):
        if i != q['answerIdx'] and o.get('state') == state:
            return i
    return None

BLANK_PT = """() => {
  const cont = document.getElementById('board-wrap') || document.getElementById('board');
  const r = cont.getBoundingClientRect();
  const els = [...document.querySelectorAll('#board .card, #board .mopt, #btn-knife, #fruit-wrap, #match-top')]
    .map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
  for (const dy of [10, 30, 60, 110, 170, 240]) for (const dx of [14, 60, 130, 220, 340, 480]) {
    const x = r.left + dx, y = r.top + dy;
    if (x < r.right - 10 && y < r.bottom - 10 &&
        !els.some(b => x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8))
      return [x, y];
  }
  return [r.left + 6, r.top + 6];
}"""

async def solve_level(pg, log, on_step=None, timeout=240):
    """从当前题起真实点选/切刀玩到通关；on_step(q) 每道新题回调一次（含本函数代答）"""
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
            await pg.wait_for_timeout(1300)          # 答对 880ms 锁 + renderQuiz 换题
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {'mode': q['mode'], 'kind': q['kind'], 'answerIdx': q['answerIdx'],
                              'options': q['options'], 'given': q.get('given')}
            if on_step:
                n0 = len(await vlog(pg))
                await on_step(pg, q, log, events)
                events.append({'ev': 'step_%d_voice' % s, 'v': fmt_v((await vlog(pg))[n0:])})
                continue          # on_step 可能已代切/代答推进本题 → 回循环走新题分支
        if q['mode'] == 'cut':
            await click_sel(pg, '#btn-knife')
            log['clicks'] += 1
            await pg.wait_for_timeout(2600)          # 切分整段演出 ~2.3s
        else:
            await opt_sel(pg, q, q['answerIdx'])
            log['clicks'] += 1
            await pg.wait_for_timeout(1300)
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
    result = {'game': 'fruitsplit', 'url': URL, 'pageerrors': [], 'levels': []}
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
            t = await pg.evaluate('FRU && FRU.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(200)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            q0 = await quiz_of(pg)
            st0 = (await lv_of(pg))['step']
            # 人设抢点：看演示时点大卡 → 应被吞（locked）
            sw = False
            w = await wrong_state_opt(q0, 'whole') or 0
            n0 = len(await vlog(pg))
            await opt_sel(pg, q0, w); log['clicks'] += 1
            await pg.wait_for_timeout(500)
            q1 = await quiz_of(pg)
            sw = bool(q1) and q1['step'] == st0 and not q1['wrongs']
            tut['watch_swallow'] = sw
            await shot(pg, 'fru_flat0_watch.png')
        for _ in range(100):
            t = await pg.evaluate('FRU && FRU.tutorial')
            if t == 'help': break
            await pg.wait_for_timeout(250)
        tut['help_enter'] = await pg.evaluate('FRU && FRU.tutorial')
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['rescue_in_help'] = await rescue_test(pg, 'flat0_help_idle')

        async def flat0_on_step(pg, q, log, events):
            s = q['step']
            if s == 1 and q['mode'] == 'pick' and q['options']:
                # 人设：无拼合经验 → 3 选 1 先点"切开拼回"卡（以为切开的就是一半）；2 选 1 点"整个"
                w = await wrong_state_opt(q, 'cut')
                if w is None: w = await wrong_opt(q)
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                q2 = await quiz_of(pg)
                events.append({'ev': 'wrong_cut_state', 'picked_state': 'cut',
                               'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)],
                               'wrongs': q2['wrongs'], 'retries': (await lv_of(pg))['retries']})
                # 再点"整个" → 连错 2 次 pulse 亮正确卡
                w2 = await wrong_state_opt(q, 'whole')
                if w2 is not None:
                    p0 = await pulse_count(pg)
                    n0 = len(await vlog(pg))
                    await opt_sel(pg, q, w2); log['clicks'] += 1
                    await pg.wait_for_timeout(1000)
                    events.append({'ev': 'wrong_whole_state',
                                   'voice': fmt_v((await vlog(pg))[n0:]),
                                   'pulse': [p0, await pulse_count(pg)],
                                   'wrongs': (await quiz_of(pg))['wrongs']})
            if s == 3:
                pt = await pg.evaluate(BLANK_PT)
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'blank_board_click', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 4:
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})

        # "独"：help 下首次答对 → solo
        q = await quiz_of(pg)
        if q:
            await opt_sel(pg, q, q['answerIdx']) if q['mode'] != 'cut' else await click_sel(pg, '#btn-knife')
            log['clicks'] += 1
            await pg.wait_for_timeout(1500)
        tut['after_first_right'] = await pg.evaluate('FRU && FRU.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'fru_flat0_solo.png')
        lv0, quizzes0, events0 = await solve_level(pg, log, flat0_on_step)
        vlog0 = fmt_v(await vlog(pg))
        stars0 = await stars_of(pg, lv0) if lv0 else None
        result['levels'].append({'tag': 'flat0', 'flat': lv0['flat'] if lv0 else -1,
                                 'ch': lv0['ch'] if lv0 else -1, 'dch': lv0['dch'] if lv0 else -1,
                                 'clicks': log['clicks'], 'retries': lv0['retries'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut, 'events': events0, 'vlog': vlog0})
        await shot(pg, 'fru_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue=%s' %
              (log['clicks'], lv0['retries'], stars0, tut.get('watch_swallow'),
               tut.get('after_first_right'), tut['rescue_in_help']['entries'][:2]))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events):
            s = q['step']
            if s == 0 and q['mode'] == 'cut':
                # 人设：先戳水果本体（非主交互）→ 轻提示指向刀；再点刀
                n0 = len(await vlog(pg))
                await click_sel(pg, '#fruit-whole'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'poke_fruit_body', 'voice': fmt_v((await vlog(pg))[n0:])})
                await click_sel(pg, '#btn-knife'); log['clicks'] += 1
                await pg.wait_for_timeout(1600)   # 娃娃演出在 650-2250ms 窗口内取证
                events.append({'ev': 'cut_done_q0',
                               'doll_result': await pg.evaluate("!!document.querySelector('#cut-result.on')")})
                await pg.wait_for_timeout(1200)   # 等切分演出收尾+换题
            elif s == 1 and q['mode'] == 'pick':
                # sayW 三连证据：wrong1 播 / wrong2 10s 内静默+pulse / >10s 后再错播
                w = await wrong_state_opt(q, 'whole') or await wrong_opt(q)
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                events.append({'ev': 'wrong1_plays', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})
                # 已灰卡重点（again 零惩罚）
                r0 = (await lv_of(pg))['retries']
                wr0 = (await quiz_of(pg))['wrongs']
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                q2 = await quiz_of(pg)
                events.append({'ev': 'gray_retap_again', 'retries': [r0, (await lv_of(pg))['retries']],
                               'wrongs': [wr0, q2['wrongs']],
                               'voice': fmt_v((await vlog(pg))[n0:])})
                w2 = await wrong_opt(q, (await quiz_of(pg))['wrongs'])
                if w2 is not None:
                    p0 = await pulse_count(pg)
                    n0 = len(await vlog(pg))
                    await opt_sel(pg, q, w2); log['clicks'] += 1
                    await pg.wait_for_timeout(1000)
                    events.append({'ev': 'wrong2_throttled_pulse', 'voice': fmt_v((await vlog(pg))[n0:]),
                                   'pulse': [p0, await pulse_count(pg)]})
            elif s == 2 and q['mode'] == 'cut':
                # 下滑手势切（SPEC：从上往下滑等价点刀）
                n0 = len(await vlog(pg))
                pos = await pg.evaluate("""() => {
                  const el = document.getElementById('fruit-whole');
                  const r = el.getBoundingClientRect();
                  return [r.left + r.width/2, r.top + r.height/2];
                }""")
                await pg.mouse.move(pos[0], pos[1])
                await pg.mouse.down()
                for k in range(1, 5):
                    await pg.mouse.move(pos[0], pos[1] + k * 25)
                    await pg.wait_for_timeout(80)
                await pg.mouse.up()
                log['clicks'] += 1
                await pg.wait_for_timeout(2600)
                q2 = await quiz_of(pg)
                events.append({'ev': 'swipe_cut', 'advanced': (q2 is None or q2['step'] != 2),
                               'voice': fmt_v((await vlog(pg))[n0:])})
            elif s == 3 and q['mode'] == 'pick':
                await pg.wait_for_timeout(10600)     # 过节流窗
                w = await wrong_state_opt(q, 'whole') or await wrong_opt(q)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                events.append({'ev': 'wrong_after10s_plays', 'voice': fmt_v((await vlog(pg))[n0:])})

        async def flat10_on_step(pg, q, log, events):
            if q['step'] == 0 and q['mode'] == 'match':
                events.append({'ev': 'match_layout', 'given': q.get('given'),
                               'options': q['options'], 'answerIdx': q['answerIdx']})
                w = await wrong_opt(q)
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                events.append({'ev': 'match_wrong1', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})
                w2 = await wrong_opt(q, (await quiz_of(pg))['wrongs'])
                p0 = await pulse_count(pg)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w2); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                events.append({'ev': 'match_wrong2_pulse', 'voice': fmt_v((await vlog(pg))[n0:]),
                               'pulse': [p0, await pulse_count(pg)]})
                # 已灰半块重点（again）
                r0 = (await lv_of(pg))['retries']
                await opt_sel(pg, q, w2); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'gray_retap_again', 'retries': [r0, (await lv_of(pg))['retries']]})
            if q['step'] == 1:
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})

        async def flat15_on_step(pg, q, log, events):
            if q['step'] == 0:
                events.append({'ev': 'mixed_first', 'mode': q['mode'], 'kind': q['kind']})
            if q['step'] == 2 and q['mode'] in ('pick', 'match'):
                # 人设：新形状（三角西瓜/草莓）上错一次
                w = await wrong_opt(q)
                n0 = len(await vlog(pg))
                await opt_sel(pg, q, w); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                events.append({'ev': 'wrong_new_shape', 'kind': q['kind'],
                               'voice': fmt_v((await vlog(pg))[n0:])})
            if q['step'] == 3:
                pt = await pg.evaluate(BLANK_PT)
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(700)
                events.append({'ev': 'blank_board_click', 'voice': fmt_v((await vlog(pg))[n0:])})

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
            await shot(pg, 'fru_%s_open.png' % tag)
            if do_rescue:
                misc['rescue'] = await rescue_test(pg, tag + '_idle')
            lv, quizzes, events = await solve_level(pg, log, on_step)
            lvl_vlog = fmt_v(await vlog(pg))
            stars = await stars_of(pg, lv) if lv else None
            result['levels'].append({'tag': tag, 'flat': lv['flat'] if lv else -1,
                                     'ch': lv['ch'] if lv else -1, 'dch': lv['dch'] if lv else -1,
                                     'clicks': log['clicks'], 'retries': lv['retries'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes, 'events': events, 'misc': misc, 'vlog': lvl_vlog})
            await shot(pg, 'fru_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s retries=%s stars=%s rescue=%s' %
                  (tag, lv['flat'], lv['dch'], log['clicks'], lv['retries'], stars,
                   misc.get('rescue', {}).get('entries', [])[:2]))
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('fruitsplit', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
