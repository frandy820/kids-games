# -*- coding: utf-8 -*-
"""worden 英语单词 · 6 岁女孩人设真实试玩（batch8/_obs8 · 2026-09-07）
4 关：flat0 教学关（干净档·ch1 pic2word 2 选）/ flat5（ch2 sound2pic 2 选）/
flat10（ch3 pic2word 3 选+形近干扰）/ flat15（ch4 word2pic 认读+三模式混合 3 选）
人设锚点：英语零起点（cat/dog 刚接触，发音靠模仿）——图→词纯猜（~50% 错）、听音题听不懂
靠复述+点喇叭卡重播、形近词卡（cat/cap）长得像必点错、word2pic 认读关纯难度峰。
钩子 WEN；真实 mouse.click；en 发音证据=play('wen_w_'+word)。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        center, shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'worden', 'index.html').replace('\\', '/')
GAME = 'wen'

async def quiz_of(pg): return await pg.evaluate('WEN.quiz')
async def lv_of(pg): return await pg.evaluate('WEN.currentLevel')
async def opt_click(pg, i): return await click_sel(pg, '.opt[data-i="%d"]' % i)
async def pulse_n(pg): return await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
async def wrong_n(pg): return await pg.evaluate("document.querySelectorAll('.opt.wrong').length")

def has_wrong_voice(entries):
    return any(e['f'] in ('play', 'queue') and any(
        isinstance(a, str) and '不对哦' in a for a in e.get('a', [])) for e in entries)

async def wrong_tap(pg, q, log, events, label, settle=700, idx=None):
    """人设错点：idx 显式（形近干扰/纯猜）或退化首个非答案下标"""
    i = idx if idx is not None else next(
        (k for k in range(len(q['options'])) if q['options'][k] != q['target']), None)
    if i is None:
        events.append({'ev': label + '_skip'})
        return
    p0, w0 = await pulse_n(pg), await wrong_n(pg)
    n0 = len(await vlog(pg))
    await opt_click(pg, i); log['clicks'] += 1
    await pg.wait_for_timeout(settle)
    q2 = await quiz_of(pg)
    lv2 = await lv_of(pg)
    new = (await vlog(pg))[n0:]
    events.append({'ev': label, 'picked': q['options'][i], 'target': q['target'],
                   'mode': q['mode'], 'miss': q2['miss'] if q2 else None,
                   'retries': lv2['retries'] if lv2 else None,
                   'pulse': [p0, await pulse_n(pg)], 'wrong_cls': [w0, await wrong_n(pg)],
                   'voice': fmt_v(new), 'wrong_voice': has_wrong_voice(new)})

def confuse_idx(pg_q):
    """形近干扰卡下标（cat→cap 等，不在词库的干扰词）"""
    WORD_KEYS = ['cat', 'dog', 'fish', 'bird', 'rabbit', 'apple', 'banana', 'orange', 'grape',
                 'egg', 'milk', 'cake', 'sun', 'moon', 'star', 'rain', 'book', 'ball',
                 'car', 'tree', 'hand', 'eye', 'ear', 'nose']
    for k, w in enumerate(pg_q['options']):
        if k != pg_q['options'].index(pg_q['target']) and w not in WORD_KEYS:
            return k
    return None

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
            await pg.wait_for_timeout(1250)          # 答对演出 950ms + 缓冲
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {k: q.get(k) for k in ('mode', 'target', 'options')}
            if on_step:
                await on_step(pg, q, log, events, quizzes)
                q = await quiz_of(pg)
                if not q: continue
                if q['step'] != s:
                    continue          # on_step 内已推进本题：回循环走新题分支（防默认路径抢答）
        i = q['options'].index(q['target'])
        await opt_click(pg, i); log['clicks'] += 1
        await pg.wait_for_timeout(1200)
    lv = await lv_of(pg)
    return lv, quizzes, events

async def stars_of(pg, ch, lvl):
    key = '%d-%d' % (ch, lvl)
    for _ in range(18):
        st = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if st: return st
        await pg.wait_for_timeout(500)
    return None

async def main():
    result = {'game': 'worden', 'url': URL, 'pageerrors': [], 'levels': []}
    log = {'clicks': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: result['pageerrors'].append(str(e)))

        # ============ flat0 教学关（干净档 · pic2word 2 选） ============
        await pg.goto(URL)
        await pg.wait_for_timeout(600)
        await pg.evaluate('localStorage.clear()')
        await pg.reload()
        await pg.wait_for_timeout(700)
        await install_logger(pg)
        tut, seen_watch = {}, False
        for _ in range(30):
            t = await pg.evaluate('WEN && WEN.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(120)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            q0 = await quiz_of(pg)
            step0 = q0['step'] if q0 else -1
            n0 = len(await vlog(pg))
            await opt_click(pg, 0); log['clicks'] += 1     # 人设抢点：演示时乱点
            await pg.wait_for_timeout(350)
            q1 = await quiz_of(pg)
            tut['watch_swallow'] = bool(q1) and q1['step'] == step0 and \
                await pg.evaluate('WEN.tutorial') == 'watch'
            tut['watch_voice'] = fmt_v((await vlog(pg))[n0:])
            await shot(pg, 'wen_flat0_watch.png')
        for _ in range(60):
            if await pg.evaluate('WEN && WEN.tutorial') == 'help': break
            await pg.wait_for_timeout(200)
        tut['help_enter'] = await pg.evaluate('WEN.tutorial')
        await pg.wait_for_timeout(1000)
        tut['ghost_show_in_help'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['opening_evidence'] = fmt_v(await vlog(pg)) + list(await opening_evidence(pg))

        async def flat0_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if s == 1:   # 人设零起点纯猜（2 选 50%）：先点一张（若恰好猜对则记 guess_hit）
                import random
                wrongs = [k for k in range(len(q['options'])) if q['options'][k] != q['target']]
                await wrong_tap(pg, q, log, events, 'persona_guess_wrong', settle=800,
                                idx=wrongs[0] if wrongs else None)
            if s == 2:   # 听按钮：重听 zh 指令（pic2word 题面=图卡）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:   # 点题面图卡：重播 zh 指令（3s 节流外首次）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#q-card'); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                events.append({'ev': 'q_card_tap', 'voice': fmt_v((await vlog(pg))[n0:])})

        q = await quiz_of(pg)
        if q:
            await opt_click(pg, q['options'].index(q['target'])); log['clicks'] += 1
            await pg.wait_for_timeout(1400)
        tut['after_first_correct'] = await pg.evaluate('WEN.tutorial')
        tut['solo_reached'] = tut['after_first_correct'] == 'solo'
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'wen_flat0_help.png')
        lv0, quizzes0, events0 = await solve(pg, log, flat0_on_step)
        stars0 = await stars_of(pg, 1, 0)
        result['levels'].append({'tag': 'flat0', 'flat': 0, 'ch': 1, 'dch': 1,
                                 'clicks': log['clicks'],
                                 'retries': lv0['retries'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut,
                                 'events': events0, 'vlog': fmt_v(await vlog(pg))})
        await shot(pg, 'wen_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s' %
              (log['clicks'], lv0['retries'] if lv0 else -1, stars0,
               tut.get('watch_swallow'), tut.get('solo_reached')))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if s == 0:
                # 听音题开题自动播（queue=en 单词 clip+zh 指令）已在 quizzes/renderQuiz 链；
                # 人设复述行为：点喇叭卡重播 → 3s 内再点 → 节流回退 hint
                n0 = len(await vlog(pg))
                await click_sel(pg, '#q-card'); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                ev1 = fmt_v((await vlog(pg))[n0:])
                n1 = len(await vlog(pg))
                await click_sel(pg, '#q-card'); log['clicks'] += 1
                await pg.wait_for_timeout(1000)
                ev2 = fmt_v((await vlog(pg))[n1:])
                events.append({'ev': 'speaker_card_replay_and_throttle',
                               'first': ev1, 'second_within_3s': ev2,
                               'note': '第一次应 queue(en+q2)；3s 内第二次应回退 wen_hint'})
                # 人设：听不懂 en → 纯猜错一次 → sound2pic 专属纠错文案
                await wrong_tap(pg, q, log, events, 'persona_cant_listen_guess_wrong', settle=800)
            if s == 2:
                # 救援 7a：静置 11.5s → 错点 → 救援（sound2pic 救援=重播 en+zh）应 ≤3s
                n_pre = len(await vlog(pg))
                await pg.wait_for_timeout(11500)
                i = next((k for k in range(len(q['options']))
                          if q['options'][k] != q['target']), None)
                if i is not None:
                    n0 = len(await vlog(pg))
                    t_click = time.time()
                    await opt_click(pg, i); log['clicks'] += 1
                    await pg.wait_for_timeout(8500)
                    new = (await vlog(pg))[n0:]
                    fires = [{'f': e['f'], 'a': [str(x)[:44] for x in e.get('a', [])],
                              'after_click_s': round((e['t'] - int(t_click * 1000)) / 1000.0, 2)}
                             for e in new]
                    rescue = [f for f in fires if f['f'] == 'queue' or
                              (f['f'] == 'play' and 'wen_q' in str(f['a']))]
                    events.append({'ev': 'rescue_7a_sound2pic', 'fires': fires[:10],
                                   'voice_during_idle': fmt_v((await vlog(pg))[n_pre:n0])[:6],
                                   'rescue_early': any(f['after_click_s'] <= 3.0 for f in rescue)})

        async def flat10_on_step(pg, q, log, events, quizzes):
            s = q['step']
            ci = confuse_idx(q)
            if s == 0:
                # sayW 三连同题（3 选两干扰）：错1 点形近卡（播+首错不 pulse）
                await wrong_tap(pg, q, log, events, 'w1_confuse_card_voice', settle=800, idx=ci)
                # 错2 点另一干扰（10s 内静默 + miss=2 → pulse 正确卡）
                other = next((k for k in range(3) if k not in (ci, q['options'].index(q['target']))), None)
                await wrong_tap(pg, q, log, events, 'w2_throttled_pulse', settle=800, idx=other)
                # 点对（验证只播 target 的 en，形近干扰词永无 clip）
                n0 = len(await vlog(pg))
                await opt_click(pg, q['options'].index(q['target'])); log['clicks'] += 1
                await pg.wait_for_timeout(1400)
                events.append({'ev': 'correct_voice_no_confuse_clip',
                               'voice': fmt_v((await vlog(pg))[n0:]),
                               'target': q['target']})
                await pg.wait_for_timeout(10500)   # 推进节流窗
            if s == 1:
                # >10s 后错（形近卡）→ sayW 再播
                await wrong_tap(pg, q, log, events, 'w3_after10s_voice_again', settle=800, idx=ci)
            if s == 3:
                # 人设继续点形近卡一次（真实 6 岁会被 cap 迷惑两次）
                await wrong_tap(pg, q, log, events, 'persona_confuse_again', settle=800, idx=ci)

        async def flat15_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if q['mode'] == 'word2pic' and s == 0:
                # 人设：认读关零起点——点喇叭卡重播（word2pic 重播只播 zh q4，不播 en=认读设计）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#q-card'); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                events.append({'ev': 'word2pic_speaker_replay_zh_only',
                               'voice': fmt_v((await vlog(pg))[n0:]),
                               'note': 'word2pic 重播=zh 指令 q4，不播 en（认读不靠听）'})
                # 不认识词 → 猜错一次
                await wrong_tap(pg, q, log, events, 'persona_word2pic_guess_wrong', settle=800)
            if s == 2:
                n0 = len(await vlog(pg))
                h0 = await pg.evaluate("document.querySelectorAll('#btn-rabbit.hop').length")
                await click_sel(pg, '#btn-rabbit'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'rabbit_tap', 'hop': [h0, await pg.evaluate(
                    "document.querySelectorAll('#btn-rabbit.hop').length")],
                    'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:
                # sound2pic 题若出现：验证开题自动播 en（换题后 renderQuiz 的 qSpeak）
                n0 = len(await vlog(pg))
                await pg.wait_for_timeout(400)
                qz = await quiz_of(pg)
                events.append({'ev': 'step3_mode_check', 'mode': qz['mode'] if qz else None,
                               'voice_around': fmt_v((await vlog(pg))[max(0, n0 - 3):n0])})

        for n_done, on_step, tag in ((5, flat5_on_step, 'flat5'),
                                     (10, flat10_on_step, 'flat10'),
                                     (15, flat15_on_step, 'flat15')):
            log['clicks'] = 0
            lim = await pg.evaluate(SEED_SAVE, {'n': n_done, 'g': GAME})
            await pg.reload()
            await pg.wait_for_timeout(900)
            await install_logger(pg)
            await pg.wait_for_timeout(1600)
            struct = await pg.evaluate("""(f) => genLevel(f).quizzes.map(q =>
                ({mode:q.mode, target:q.target, options:q.options.slice()}))""", n_done)
            misc = {'seed_lim': lim, 'struct': struct,
                    'opening_voice': fmt_v(await vlog(pg)) + list(await opening_evidence(pg))}
            await shot(pg, 'wen_%s_open.png' % tag)
            lv, quizzes, events = await solve(pg, log, on_step)
            stars = await stars_of(pg, lv['ch'], lv['lv']) if lv else None
            result['levels'].append({'tag': tag, 'flat': n_done,
                                     'ch': lv['ch'] if lv else -1,
                                     'dch': {5: 2, 10: 3, 15: 4}[n_done],
                                     'clicks': log['clicks'],
                                     'retries': lv['retries'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes,
                                     'events': events, 'misc': misc,
                                     'vlog': fmt_v(await vlog(pg))})
            await shot(pg, 'wen_%s_done.png' % tag)
            print('[%s] retries=%s stars=%s' % (tag, lv['retries'] if lv else -1, stars))
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('worden', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
