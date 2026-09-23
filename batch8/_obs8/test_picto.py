# -*- coding: utf-8 -*-
"""picto 象形字 · 6 岁女孩人设真实试玩（batch8/_obs8 · 2026-09-07）
4 关：flat0 教学关（干净档·ch1 toChar 2 选）/ flat5（ch2 toPic 2 选）/ flat10（ch3 形近辨析）/
flat15（ch4 混合+库全量轮换）
人设锚点：识字 ~100（日月山水火木人口田门石鸟马鱼认识；目/禾/舟不认识）；形近对（日/目、
口/田、木/禾）会混淆——形近题先错再对；零识字题靠象形图自解释。钩子 PIC；真实 mouse.click。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import (INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel,
                        center, shot, save_result, fmt_v, SEED_SAVE)
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'picto', 'index.html').replace('\\', '/')
GAME = 'pic'

UNKNOWN = {'目', '禾', '舟'}        # 人设不认识的字（识字量 ~100 常见字外）
NEAR_CONFUSE = {'日', '目', '口', '田', '木', '禾'}   # 人设会混淆的形近字

async def quiz_of(pg): return await pg.evaluate('PIC.quiz')
async def lv_of(pg): return await pg.evaluate('PIC.currentLevel')
async def opt_click(pg, i): return await click_sel(pg, '.opt[data-i="%d"]' % i)
async def breathe_n(pg): return await pg.evaluate("document.querySelectorAll('.opt.breathe').length")
async def dim_n(pg): return await pg.evaluate("document.querySelectorAll('.opt.dim').length")

def has_wrong_voice(entries):
    return any(e['f'] in ('play', 'queue') and any(
        isinstance(a, str) and '再找一找' in a for a in e.get('a', [])) for e in entries)

async def wrong_tap(pg, q, log, events, label, settle=700, idx=None):
    """人设错点：idx 显式指定（形近干扰项）或退化取首个非答案下标"""
    i = idx if idx is not None else next(
        (k for k in range(len(q['options'])) if k != q['answerIdx']), None)
    if i is None:
        events.append({'ev': label + '_skip'})
        return
    p0, d0 = await breathe_n(pg), await dim_n(pg)
    n0 = len(await vlog(pg))
    await opt_click(pg, i); log['clicks'] += 1
    await pg.wait_for_timeout(settle)
    q2 = await quiz_of(pg)
    lv2 = await lv_of(pg)
    new = (await vlog(pg))[n0:]
    events.append({'ev': label, 'picked_char': q['chars'][i] if q.get('chars') else q['options'][i],
                   'target': q['char'], 'mode': q['mode'],
                   'miss': q2['miss'] if q2 else None,
                   'misses': lv2['misses'] if lv2 else None,
                   'breathe': [p0, await breathe_n(pg)], 'dim': [d0, await dim_n(pg)],
                   'voice': fmt_v(new), 'wrong_voice': has_wrong_voice(new)})

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
            await pg.wait_for_timeout(2100)          # 答对演出 1900ms（组词播段）+ 缓冲
            q = await quiz_of(pg)
            if not q: continue
            if s not in quizzes:
                quizzes[s] = {k: q.get(k) for k in ('mode', 'target', 'char', 'options',
                                                    'chars', 'answerIdx', 'near', 'nOpt')}
            if on_step:
                await on_step(pg, q, log, events, quizzes)
                q = await quiz_of(pg)
                if not q: continue
        await opt_click(pg, q['answerIdx']); log['clicks'] += 1
        await pg.wait_for_timeout(2100)
    lv = await lv_of(pg)
    return lv, quizzes, events

async def stars_of(pg, ch, lvl):
    key = '%d-%d' % (ch, lvl)
    for _ in range(18):
        st = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if st: return st
        await pg.wait_for_timeout(500)
    return None

async def rescue_after_wrong(pg, q, log, label):
    """7a：静置 8.5s（picto 换题演出 2.1s + 循环开销，错点时 idle≈10.5s < 14s 阈值）→
    错点 → 钟不被错点重置则救援在错点后 ~3-4s（≤5s 判定）；重置则 ~14s（窗外=FAIL 信号）"""
    n_pre = len(await vlog(pg))
    await pg.wait_for_timeout(8500)
    i = next((k for k in range(len(q['options'])) if k != q['answerIdx']), None)
    if i is None:
        return {'label': label, 'skip': True}
    n0 = len(await vlog(pg))
    t_click = time.time()
    await opt_click(pg, i); log['clicks'] += 1
    await pg.wait_for_timeout(9500)
    new = (await vlog(pg))[n0:]
    fires = [{'f': e['f'], 'a': [str(x)[:44] for x in e.get('a', [])],
              'after_click_s': round((e['t'] - int(t_click * 1000)) / 1000.0, 2)} for e in new]
    rescue = [f for f in fires if (f['f'] == 'play' and 'pic_q' in str(f['a']))]
    early = [f for f in rescue if f['after_click_s'] <= 5.0]
    return {'label': label, 'fires': fires[:10],
            'voice_during_idle': fmt_v((await vlog(pg))[n_pre:n0])[:6],
            'rescue_early_after_wrong': bool(early)}

async def main():
    result = {'game': 'picto', 'url': URL, 'pageerrors': [], 'levels': []}
    log = {'clicks': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: result['pageerrors'].append(str(e)))

        # ============ flat0 教学关（干净档 · toChar 2 选） ============
        await pg.goto(URL)
        await pg.wait_for_timeout(600)
        await pg.evaluate('localStorage.clear()')
        await pg.reload()
        await pg.wait_for_timeout(700)
        await install_logger(pg)
        tut, seen_watch = {}, False
        for _ in range(40):
            t = await pg.evaluate('PIC && PIC.tutorial')
            if t == 'watch': seen_watch = True; break
            if t in ('help', 'solo'): break
            await pg.wait_for_timeout(150)
        tut['watch_seen'] = seen_watch
        if seen_watch:
            q0 = await quiz_of(pg)
            step0 = q0['step'] if q0 else -1
            n0 = len(await vlog(pg))
            await opt_click(pg, 0); log['clicks'] += 1     # 人设抢点：演示时乱点
            await pg.wait_for_timeout(500)
            q1 = await quiz_of(pg)
            tut['watch_swallow'] = bool(q1) and q1['step'] == step0 and \
                await pg.evaluate('PIC.tutorial') == 'watch'
            await shot(pg, 'pic_flat0_watch.png')
        for _ in range(80):
            if await pg.evaluate('PIC && PIC.tutorial') == 'help': break
            await pg.wait_for_timeout(250)
        tut['help_enter'] = await pg.evaluate('PIC.tutorial')
        await pg.wait_for_timeout(1200)                    # help 600ms 后 ghost 指向
        tut['ghost_show_in_help'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['opening_evidence'] = fmt_v(await vlog(pg)) + list(await opening_evidence(pg))

        async def flat0_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if s == 1:   # 人设错点（2 选另一张）→ flat0<3 每错必播 + 首错不 pulse；再点灰卡=落穿
                await wrong_tap(pg, q, log, events, 'persona_wrong_flat0', settle=800)
                m0 = (await lv_of(pg))['misses']
                d0 = await dim_n(pg)
                n0 = len(await vlog(pg))
                pos = await center(pg, '.opt.dim')
                if pos:
                    await pg.mouse.click(pos[0], pos[1]); log['clicks'] += 1
                    await pg.wait_for_timeout(800)
                    events.append({'ev': 'tap_dim_fallthrough', 'dim': [d0, await dim_n(pg)],
                                   'misses_same': m0 == (await lv_of(pg))['misses'],
                                   'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 2:   # 听按钮重听题面指令
                n0 = len(await vlog(pg))
                await click_sel(pg, '#btn-hear'); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                events.append({'ev': 'hear_btn', 'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:   # 点题面卡：bounce + 10s 节流重听（首次必播）
                n0 = len(await vlog(pg))
                await click_sel(pg, '#prompt-card'); log['clicks'] += 1
                await pg.wait_for_timeout(900)
                events.append({'ev': 'prompt_card_tap', 'voice': fmt_v((await vlog(pg))[n0:])})

        q = await quiz_of(pg)
        if q:
            await opt_click(pg, q['answerIdx']); log['clicks'] += 1
            await pg.wait_for_timeout(2300)
        tut['after_first_correct'] = await pg.evaluate('PIC.tutorial')
        tut['solo_reached'] = tut['after_first_correct'] == 'solo'
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'pic_flat0_help.png')
        lv0, quizzes0, events0 = await solve(pg, log, flat0_on_step)
        stars0 = await stars_of(pg, 1, 0)
        result['levels'].append({'tag': 'flat0', 'flat': 0, 'ch': 1, 'dch': 1,
                                 'clicks': log['clicks'],
                                 'misses': lv0['misses'] if lv0 else -1,
                                 'stars': stars0, 'quizzes': quizzes0, 'tut': tut,
                                 'events': events0, 'vlog': fmt_v(await vlog(pg))})
        await shot(pg, 'pic_flat0_done.png')
        print('[flat0] clicks=%s misses=%s stars=%s swallow=%s solo=%s ghost=%s' %
              (log['clicks'], lv0['misses'] if lv0 else -1, stars0,
               tut.get('watch_swallow'), tut.get('solo_reached'), tut.get('ghost_show_in_help')))

        # ============ flat5 / flat10 / flat15 ============
        async def flat5_on_step(pg, q, log, events, quizzes):
            s = q['step']
            # sayW 跨题三连：step0 错1 播（t≈2.5）→ step1 即刻错（<10s 静默）→
            # step2 错（自然间隔 >10s → 节流窗过 → 再播）
            if s == 0:
                await wrong_tap(pg, q, log, events, 'w1_voice', settle=800)
            if s == 1:
                await wrong_tap(pg, q, log, events, 'w2_throttled_expect_silent', settle=800)
            if s == 2:
                await wrong_tap(pg, q, log, events, 'w3_after10s_voice_again', settle=800)
            if s == 4:
                events.append({'ev': 'rescue_7a', **await rescue_after_wrong(
                    pg, q, log, 'flat5_step4_wrong_then_rescue')})
                q4 = await quiz_of(pg)
                if q4:
                    await opt_click(pg, q4['answerIdx']); log['clicks'] += 1
                    await pg.wait_for_timeout(2100)

        async def flat10_on_step(pg, q, log, events, quizzes):
            s = q['step']
            near_distr = next((i for i, k in enumerate(q['options'])
                               if i != q['answerIdx'] and q.get('near')), None)
            persona_slow = q['char'] in NEAR_CONFUSE or q['char'] in UNKNOWN
            if persona_slow:
                await pg.wait_for_timeout(2500)    # 人设：形近字放慢看
            if q['char'] == '目' or (q['char'] in UNKNOWN and q['mode'] == 'toChar'):
                # 人设：看眼睛图不认识'目'——先点形近的'日'再学'目'
                wrong_idx = next((i for i, c in enumerate(q['chars'])
                                  if i != q['answerIdx'] and c == '日'), None)
                await wrong_tap(pg, q, log, events,
                                'persona_confuse_%s' % q['char'], settle=800, idx=wrong_idx)
            elif near_distr is not None and s in (1, 3):
                await wrong_tap(pg, q, log, events, 'persona_near_distract', settle=800,
                                idx=near_distr)

        async def flat15_on_step(pg, q, log, events, quizzes):
            s = q['step']
            if q['mode'] == 'toPic' and q['char'] in UNKNOWN:
                # 人设：字→图模式不认识字（禾/舟/目）——只能看图猜/靠语音，先错一次
                await pg.wait_for_timeout(2000)
                await wrong_tap(pg, q, log, events, 'persona_unknown_char_topic', settle=800)
            if s == 2:
                n0 = len(await vlog(pg))
                h0 = await pg.evaluate("document.querySelectorAll('#btn-rabbit.hop').length")
                await click_sel(pg, '#btn-rabbit'); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'rabbit_tap', 'hop': [h0, await pg.evaluate(
                    "document.querySelectorAll('#btn-rabbit.hop').length")],
                    'voice': fmt_v((await vlog(pg))[n0:])})
            if s == 3:
                # 点选项区空白：10s 节流轻提示
                pt = await pg.evaluate("""() => {
                  const o = document.getElementById('opts').getBoundingClientRect();
                  return [o.left + o.width / 2, Math.max(o.top - 16, 8)];
                }""")
                n0 = len(await vlog(pg))
                await pg.mouse.click(pt[0], pt[1]); log['clicks'] += 1
                await pg.wait_for_timeout(800)
                events.append({'ev': 'blank_click', 'voice': fmt_v((await vlog(pg))[n0:])})

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
                ({mode:q.mode, target:q.target, options:q.options.slice(),
                  near:q.near, distractors:q.distractors.slice(), nOpt:q.nOpt}))""", n_done)
            misc = {'seed_lim': lim, 'struct': struct,
                    'opening_voice': fmt_v(await vlog(pg)) + list(await opening_evidence(pg))}
            await shot(pg, 'pic_%s_open.png' % tag)
            lv, quizzes, events = await solve(pg, log, on_step)
            stars = await stars_of(pg, lv['ch'], lv['lv']) if lv else None
            result['levels'].append({'tag': tag, 'flat': n_done,
                                     'ch': lv['ch'] if lv else -1,
                                     'dch': {5: 2, 10: 3, 15: 4}[n_done],
                                     'clicks': log['clicks'],
                                     'misses': lv['misses'] if lv else -1,
                                     'stars': stars, 'quizzes': quizzes,
                                     'events': events, 'misc': misc,
                                     'vlog': fmt_v(await vlog(pg))})
            await shot(pg, 'pic_%s_done.png' % tag)
            print('[%s] misses=%s stars=%s' % (tag, lv['misses'] if lv else -1, stars))
        result['vlog_tail'] = fmt_v((await vlog(pg))[-40:])
        await ctx.close()
        await browser.close()
    save_result('picto', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
