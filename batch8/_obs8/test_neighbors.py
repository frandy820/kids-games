# -*- coding: utf-8 -*-
"""neighbors 数的邻居 · 6 岁女孩人设真实试玩（batch8/_obs8 · 2026-09-07）
4 关：flat0 教学关（干净档·ch1 plus 1-9）/ flat5（ch2 minus 2-10）/ flat10（ch3 大数字+跨十）/ flat15（ch4 mid 混合）
人设锚点：点数 1-20 稳；±1 数感有但 10 以上偏慢；plus 题点 n+2 型错项（多数一格）、
minus 题点 n-2 型、跨十题（19→20、10→9）卡壳放慢并先错一次（10→9 点 11 反向错）；
卡住时点灰牌/空白/兔子。钩子 NEB；真实 mouse.click 门牌中心。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        center, shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'neighbors', 'index.html').replace('\\', '/')
GAME = 'neb'

async def quiz_of(pg): return await pg.evaluate('NEB.quiz')
async def lv_of(pg): return await pg.evaluate('NEB.currentLevel')
async def plate_click(pg, i): return await click_sel(pg, '.platebtn[data-i="%d"]' % i)
async def breathe_n(pg): return await pg.evaluate("document.querySelectorAll('.platebtn.breathe').length")
async def dim_n(pg): return await pg.evaluate("document.querySelectorAll('.platebtn.dim').length")

def wrong_idx(q, prefer):
    """按人设挑错项下标。prefer 如 'n+2'/'n-2'/'n+1'/'n+3'；退化取首个非答案项"""
    n = q['n']
    want = {'n+2': n + 2, 'n-2': n - 2, 'n+1': n + 1, 'n-1': n - 1, 'n+3': n + 3}.get(prefer)
    if want is not None and want in q['options']:
        return q['options'].index(want)
    for i, v in enumerate(q['options']):
        if v != q['answer']:
            return i
    return None

def has_wrong_voice(entries):
    return any(e['f'] in ('play', 'queue') and any(
        isinstance(a, str) and ('再想一想' in a or '顺着数' in a) for a in e.get('a', []))
        for e in entries)

async def wrong_tap(pg, q, prefer, log, events, label, settle=700):
    """人设错点一次：真实点击错项中心，记录语音/pulse/dim/miss 证据"""
    i = wrong_idx(q, prefer)
    if i is None:
        events.append({'ev': label + '_skip', 'why': 'no_wrong_option'})
        return None
    p0, d0 = await breathe_n(pg), await dim_n(pg)
    n0 = len(await vlog(pg))
    t_click = time.time()
    await plate_click(pg, i); log['clicks'] += 1
    await pg.wait_for_timeout(settle)
    q2 = await quiz_of(pg)
    lv2 = await lv_of(pg)
    new = (await vlog(pg))[n0:]
    events.append({'ev': label, 'picked': q['options'][i], 'mode': q['mode'], 'n': q['n'],
                   'miss': q2['miss'] if q2 else None,
                   'retries': lv2['retries'] if lv2 else None,
                   'breathe': [p0, await breathe_n(pg)], 'dim': [d0, await dim_n(pg)],
                   'voice': fmt_v(new), 'wrong_voice': has_wrong_voice(new),
                   't_click': t_click})
    return q2

async def solve(pg, log, on_step=None, timeout=240):
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
            await pg.wait_for_timeout(1250)          # 换题过渡 950ms 演出 + 缓冲（防吞快点击）
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {k: q.get(k) for k in ('mode', 'n', 'answer', 'options')}
            if on_step:
                await on_step(pg, q, log, events, quizzes)
                q = await quiz_of(pg)
                if not q: continue
        i = q['options'].index(q['answer'])
        await plate_click(pg, i); log['clicks'] += 1
        await pg.wait_for_timeout(1150)
    lv = await lv_of(pg)
    return lv, quizzes, events

async def stars_of(pg, ch, lvl):
    key = '%d-%d' % (ch, lvl)
    for _ in range(18):
        st = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if st: return st
        await pg.wait_for_timeout(500)
    return None

async def rescue_after_wrong(pg, q, prefer, log, label):
    """7a 救援钟：静置 11.5s（含前置过渡 <14s 不触发）→ 错点一次 → 钟若未被错点重置，
    救援应在错点后 ≤3s 重读题面；若被重置则要等 ~14s（8.5s 观察窗内无救援=FAIL 信号）"""
    n_pre = len(await vlog(pg))
    await pg.wait_for_timeout(11500)
    i = wrong_idx(q, prefer)
    if i is None:
        return {'label': label, 'skip': True}
    n0 = len(await vlog(pg))
    t_click = time.time()
    await plate_click(pg, i); log['clicks'] += 1
    await pg.wait_for_timeout(8500)
    new = (await vlog(pg))[n0:]
    idle_window = fmt_v((await vlog(pg))[n_pre:n0])   # 静置窗内（错点前）不应有救援
    fires = [{'f': e['f'], 'a': [str(x)[:40] for x in e.get('a', [])],
              'after_click_s': round((e['t'] - int(t_click * 1000)) / 1000.0, 2)} for e in new]
    # 救援特征：say(中文数词) 紧跟 play(neb_q*)（sayW 的 wrong 文案不算救援）
    rescue = [f for f in fires if f['f'] == 'say' or (f['f'] == 'play' and 'neb_q' in str(f['a']))]
    early = [f for f in rescue if f['after_click_s'] <= 3.0]
    return {'label': label, 'picked': q['options'][i], 'fires': fires[:10],
            'voice_during_idle': idle_window[:6],
            'rescue_early_after_wrong': bool(early), 'all_voice': fmt_v(new)[:12]}

async def main():
    result = {'game': 'neighbors', 'url': URL, 'pageerrors': [], 'levels': []}
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
        await pg.wait_for_timeout(700)
        await install_logger(pg)
        tut, seen_watch = {}, False
        for _ in range(40):
            t = await pg.evaluate('NEB && NEB.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(150)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            q0 = await quiz_of(pg)
            step0 = q0['step'] if q0 else -1
            n0 = len(await vlog(pg))
            await plate_click(pg, 0); log['clicks'] += 1   # 人设抢点：演示时点第一张门牌
            await pg.wait_for_timeout(500)
            q1 = await quiz_of(pg)
            tut['watch_swallow'] = bool(q1) and q1['step'] == step0 and \
                await pg.evaluate('NEB.tutorial') == 'watch'
            tut['watch_voice'] = fmt_v((await vlog(pg))[n0:])
            await shot(pg, 'neb_flat0_watch.png')
        for _ in range(60):
            if await pg.evaluate('NEB && NEB.tutorial') == 'help': break
            await pg.wait_for_timeout(250)
        tut['help_enter'] = await pg.evaluate('NEB.tutorial')
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        # help 阶段静置 17s：5s 重演示 + 14s 救援（重读题面）
        n0 = len(await vlog(pg)); t0 = time.time()
        await pg.wait_for_timeout(17000)
        new = (await vlog(pg))[n0:]
        tut['help_idle_17s'] = {'entries': fmt_v(new)[:10],
                                'fire_s': [round((e['t'] - int(t0 * 1000)) / 1000.0, 1) for e in new]}
        tut['ghost_reshow_5s'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'neb_flat0_help.png')

        async def flat0_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if s == 1:   # 人设：多数一格（点 n+2 型）→ 首错必播 sayW + 首错不 pulse；再点同张灰牌=落穿空白
                await wrong_tap(pg, q, 'n+2', log, events, 'persona_wrong_n+2', settle=800)
                r0 = (await lv_of(pg))['retries']
                d0 = await dim_n(pg)
                n0 = len(await vlog(pg))
                # 点已灰牌中心：pointer-events:none → 物理落穿到 stage 空白 → 10s 节流轻提示（§0.16）
                pos = await center(pg, '.platebtn.dim')
                if pos:
                    await pg.mouse.click(pos[0], pos[1]); log['clicks'] += 1
                    await pg.wait_for_timeout(800)
                    events.append({'ev': 'tap_dim_plate_fallthrough', 'dim_before': d0,
                                   'dim_after': await dim_n(pg),
                                   'voice': fmt_v((await vlog(pg))[n0:]),
                                   'retries_same': r0 == (await lv_of(pg))['retries'],
                                   'retries_now': r0})
            if s == 2:   # 听按钮：重读题面（say 数词 + play neb_q1/q2 接力 850ms）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(1600)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:   # 点题面卡重听（儿童高发探索）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#prompt-chip'); log['clicks'] += 1
                await pg.wait_for_timeout(1600)
                events.append({'ev': 'chip_replay', 'voice': fmt_v((await vlog(pg))[n0:])})

        # 教学"独"：help 下首次答对 → solo
        q = await quiz_of(pg)
        if q:
            await plate_click(pg, q['options'].index(q['answer'])); log['clicks'] += 1
            await pg.wait_for_timeout(1300)
        tut['after_first_correct'] = await pg.evaluate('NEB.tutorial')
        tut['solo_reached'] = tut['after_first_correct'] == 'solo'
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['opening_evidence'] = fmt_v(await vlog(pg)) + list(await opening_evidence(pg))
        lv0, quizzes0, events0 = await solve(pg, log, flat0_on_step)
        vlog0 = fmt_v(await vlog(pg))
        stars0 = await stars_of(pg, 1, 0)
        result['levels'].append({'tag': 'flat0', 'flat': 0, 'ch': 1, 'dch': 1,
                                 'clicks': log['clicks'],
                                 'retries': lv0['retries'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut,
                                 'events': events0, 'vlog': vlog0})
        await shot(pg, 'neb_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue17s=%s' %
              (log['clicks'], lv0['retries'] if lv0 else -1, stars0,
               tut.get('watch_swallow'), tut.get('solo_reached'),
               tut['help_idle_17s']['entries'][:3]))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if s == 0:
                # sayW 三连：错1 播 / 10s 内错2 静默+miss2 pulse / 6s 后（>10s 节流窗）下一题错3 再播
                await wrong_tap(pg, q, 'n-2', log, events, 'w1_minus_n-2_voice', settle=800)
                await wrong_tap(pg, q, 'n+1', log, events, 'w2_throttled_expect_silent', settle=800)
            if s == 1:
                await pg.wait_for_timeout(6000)      # 距错1 >10s：节流窗过
                await wrong_tap(pg, q, 'n-2', log, events, 'w3_after10s_voice_again', settle=800)
            if s == 4:
                # 救援钟 7a：答对 step3 后 lastAct 已重置；静置 13.5s → 错点 → 救援应 ≤2.5s 内
                events.append({'ev': 'rescue_7a', **await rescue_after_wrong(
                    pg, q, 'n-2', log, 'flat5_step4_wrong_then_rescue')})
                q4 = await quiz_of(pg)
                if q4:
                    await plate_click(pg, q4['options'].index(q4['answer'])); log['clicks'] += 1
                    await pg.wait_for_timeout(1200)

        async def flat10_on_step(pg, q, log, events, quizzes):
            s = q['step']
            cross = (q['mode'], q['n']) in (('plus', 19), ('minus', 10))
            if cross:
                # 人设：跨十卡壳——放慢（3.5s 停顿）+ 先错（19→20 点 18/17；10→9 点 11 反向）
                await pg.wait_for_timeout(3500)
                prefer = 'n-1' if q['mode'] == 'plus' else 'n+1'
                await wrong_tap(pg, q, prefer, log, events,
                                'cross_ten_slow_wrong_%s%d' % (q['mode'], q['n']), settle=900)

        async def flat15_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if q['mode'] == 'mid':
                # 人设：中间空位要"数两个"——先点 n+3 型（数过头）
                await wrong_tap(pg, q, 'n+3', log, events, 'mid_wrong_n+3', settle=800)
            if s == 2:
                n0 = len(await vlog(pg))
                h0 = await pg.evaluate("document.querySelectorAll('#btn-rabbit.hop').length")
                await click_sel(pg, '#btn-rabbit'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'rabbit_tap', 'hop': [h0, await pg.evaluate(
                    "document.querySelectorAll('#btn-rabbit.hop').length")],
                    'voice': fmt_v((await vlog(pg))[n0:]),
                    'note': 'sayP flat15>=3 不播语音——探索无语音轰炸'})
            if s == 3:
                # 点街道空白区（房子间空隙）：10s 节流轻提示（首次必播）
                pt = await pg.evaluate("""() => {
                  const st = document.getElementById('street').getBoundingClientRect();
                  const y = st.top - 14;
                  return [st.left + 40, Math.max(y, 8)];
                }""")
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'blank_street_click', 'voice': fmt_v((await vlog(pg))[n0:])})

        for n_done, on_step, tag in ((5, flat5_on_step, 'flat5'),
                                     (10, flat10_on_step, 'flat10'),
                                     (15, flat15_on_step, 'flat15')):
            log['clicks'] = 0
            lim = await pg.evaluate(SEED_SAVE, {'n': n_done, 'g': GAME})
            await pg.reload()
            await pg.wait_for_timeout(900)
            await install_logger(pg)
            await pg.wait_for_timeout(1600)
            dch = {5: 2, 10: 3, 15: 4}[n_done]
            struct = await pg.evaluate("""(f) => genLevel(f).quizzes.map(q =>
                ({mode:q.mode, n:q.n, answer:q.answer, options:q.options.slice()}))""", n_done)
            houses = await pg.evaluate("document.querySelectorAll('.house').length")
            misc = {'seed_lim': lim, 'struct': struct, 'houses_in_street': houses,
                    'opening_voice': fmt_v(await vlog(pg)) + list(await opening_evidence(pg))}
            await shot(pg, 'neb_%s_open.png' % tag)
            lv, quizzes, events = await solve(pg, log, on_step)
            stars = await stars_of(pg, lv['ch'], lv['lv']) if lv else None
            result['levels'].append({'tag': tag, 'flat': n_done,
                                     'ch': lv['ch'] if lv else -1, 'dch': dch,
                                     'clicks': log['clicks'],
                                     'retries': lv['retries'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes,
                                     'events': events, 'misc': misc,
                                     'vlog': fmt_v(await vlog(pg))})
            await shot(pg, 'neb_%s_done.png' % tag)
            print('[%s] flat=%s retries=%s stars=%s houses=%s' %
                  (tag, n_done, lv['retries'] if lv else -1, stars, houses))
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('neighbors', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
