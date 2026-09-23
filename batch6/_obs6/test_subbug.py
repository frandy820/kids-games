# -*- coding: utf-8 -*-
"""subbug 减法捕虫 · 6 岁女孩人设真实试玩（batch6/_obs6 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 / flat10 章3 跨十 / flat15 章4 瓢虫干扰（种档进关）
人设：20 内减法不稳（跨十题先点典型错答案）、watch 抢点被吞、放飞满后多点剩余虫、
点瓢虫、乱点叶子空白、静置 25s 救援、连错 2 次支架 pulse。钩子 SUB。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel, shot, save_result, fmt_v, SEED_SAVE
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'subbug', 'index.html').replace('\\', '/')
GAME = 'sub'

async def quiz_of(pg):
    return await pg.evaluate('SUB.quiz')

async def lv_of(pg):
    return await pg.evaluate('SUB.currentLevel')

async def fly_all(pg, log, events=None):
    """放飞至 m 只（真实点未飞绿虫）"""
    while True:
        q = await quiz_of(pg)
        if not q:
            return
        if q['flyCount'] >= q['m']:
            return
        idx = next((i for i, f in enumerate(q['flown']) if not f), None)
        if idx is None:
            await pg.wait_for_timeout(250)
            continue
        ok = await click_sel(pg, '.animal[data-k="b"][data-i="%d"]' % idx)
        if ok:
            log['clicks'] += 1
        await pg.wait_for_timeout(320)

async def wrong_opt(q, tried):
    for i, v in enumerate(q['items']):
        if i != q['answerIdx'] and i not in tried:
            return i
    return None

async def play_level(pg, personas, log):
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
            quiz_data[s] = {'n': q['n'], 'm': q['m'], 'answer': q['answer'], 'items': q['items'],
                            'cross': q['cross'], 'ladybugs': len(q['ladybugs'])}
        # 章 4 人设：先点瓢虫 2 下（不计数零惩罚）
        if q['ladybugs'] and not any(e.get('ev') == 'tap_ladybug' for e in events):
            f0 = (await lv_of(pg))['flyCount']
            for k in range(2):
                await click_sel(pg, '.animal[data-k="o"]')
                log['clicks'] += 1
                await pg.wait_for_timeout(450)
            f1 = (await lv_of(pg))['flyCount']
            events.append({'ev': 'tap_ladybug', 'fly_before': f0, 'fly_after': f1, 'not_counted': f1 == f0})
        await fly_all(pg, log, events)
        # 放飞满后多点剩余虫（6 岁常见行为：多戳几下）
        if s == 0 and not any(e.get('ev') == 'tap_after_full' for e in events):
            q2 = await quiz_of(pg)
            rem = next((i for i, f in enumerate(q2['flown']) if not f), None)
            if rem is not None:
                f0 = q2['flyCount']
                await click_sel(pg, '.animal[data-k="b"][data-i="%d"]' % rem)
                log['clicks'] += 1
                await pg.wait_for_timeout(450)
                q3 = await quiz_of(pg)
                events.append({'ev': 'tap_after_full', 'fly': [f0, q3['flyCount']], 'still_visible': True})
        # 人设错误（每题至多一轮）
        if s not in did and personas.get(s):
            did.add(s)
            mode = personas[s]
            q = await quiz_of(pg)
            if mode == 'wrong1':           # 跨十不稳：先点一个干扰答案（首错不 pulse）
                w = await wrong_opt(q, [])
                p0 = await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
                await click_sel(pg, '.opt[data-i="%d"]' % w)
                log['clicks'] += 1
                await pg.wait_for_timeout(900)
                p1 = await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
                events.append({'ev': 'wrong1', 'n': q['n'], 'm': q['m'], 'ans': q['answer'],
                               'picked': q['items'][w], 'cross': q['cross'], 'pulse': [p0, p1],
                               'retries': (await lv_of(pg))['retries']})
            elif mode == 'wrong2':         # 连错 2 次 → pulse 支架应亮
                tried = []
                for k in range(2):
                    q = await quiz_of(pg)
                    w = await wrong_opt(q, tried)
                    if w is None:
                        break
                    tried.append(w)
                    await click_sel(pg, '.opt[data-i="%d"]' % w)
                    log['clicks'] += 1
                    await pg.wait_for_timeout(900)
                    pulse = await pg.evaluate("document.querySelectorAll('.opt.pulse').length")
                    events.append({'ev': 'wrong_%d' % (k + 1), 'picked': q['items'][w], 'pulse_after': pulse,
                                   'retries': (await lv_of(pg))['retries']})
        q = await quiz_of(pg)
        await click_sel(pg, '.opt[data-i="%d"]' % q['answerIdx'])
        log['clicks'] += 1
        await pg.wait_for_timeout(1500)
    lv = await lv_of(pg)
    key = '%d-%d' % (lv['ch'], lv['lv']) if lv else '0-0'
    stars = None
    for _ in range(14):
        stars = await pg.evaluate("(KIDS._save().levels['%s']||{}).stars" % key)
        if stars:
            break
        await pg.wait_for_timeout(500)
    return {'flat': lv['flat'] if lv else -1, 'ch': lv['ch'], 'dch': lv['dch'], 'lv': lv['lv'],
            'quizzes': quiz_data, 'clicks': log['clicks'], 'retries': lv['retries'] if lv else -1,
            'stars': stars, 'events': events}

async def rescue_test(pg, label):
    v0 = await vlog(pg)
    await pg.wait_for_timeout(25500)
    v1 = await vlog(pg)
    return {'label': label, 'new_entries': fmt_v(v1[len(v0):])}

async def main():
    result = {'game': 'subbug', 'pageerrors': [], 'levels': []}
    log = {'clicks': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SCRIPT)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: result['pageerrors'].append(str(e)))

        # ============ flat0 教学关（干净档） ============
        await pg.goto(URL)
        await pg.wait_for_timeout(700)
        await install_logger(pg)
        tut = {}
        seen_watch = False
        for _ in range(60):
            t = await pg.evaluate('SUB && SUB.tutorial')
            if t == 'watch':
                seen_watch = True
                break
            if t in ('help', 'solo'):
                break
            await pg.wait_for_timeout(300)
        if seen_watch:
            f0 = (await lv_of(pg))['flyCount']
            pos = await pg.evaluate("""() => {
              const el = document.querySelector('.animal[data-k="b"]');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""")
            if pos:
                await pg.mouse.click(pos[0], pos[1])
                await pg.wait_for_timeout(600)
                f1 = (await lv_of(pg))['flyCount']
                tut['watch_swallow'] = f1 == f0
            await shot(pg, 's_flat0_watch.png')
        for _ in range(100):
            t = await pg.evaluate('SUB && SUB.tutorial')
            if t == 'help':
                break
            await pg.wait_for_timeout(400)
        tut['help_enter'] = t
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['rescue_teach'] = await rescue_test(pg, 'flat0_help_25s')
        # 首题完整做（放飞+答对）→ solo 放手
        q = await quiz_of(pg)
        await fly_all(pg, log)
        await click_sel(pg, '.opt[data-i="%d"]' % q['answerIdx'])
        log['clicks'] += 1
        await pg.wait_for_timeout(1600)
        tut['after_first_right'] = await pg.evaluate('SUB && SUB.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 's_flat0_solo.png')
        r0 = await play_level(pg, {}, log)
        r0['tut'] = tut
        result['levels'].append(r0)
        await shot(pg, 's_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue=%s' %
              (r0['clicks'], r0['retries'], r0['stars'], tut.get('watch_swallow'), tut.get('after_first_right'),
               tut['rescue_teach']['new_entries'][:3]))

        # ============ flat5 / flat10 / flat15 ============
        for n_done, personas, tag in (
                (5,  {0: 'wrong1'}, 'flat5'),
                (10, {0: 'wrong2'}, 'flat10'),
                (15, {0: 'wrong1'}, 'flat15')):
            log['clicks'] = 0
            await pg.evaluate(SEED_SAVE, {'n': n_done, 'g': GAME})
            await pg.reload()
            await pg.wait_for_timeout(900)
            await install_logger(pg)
            await pg.wait_for_timeout(1600)
            v_open = await vlog(pg)
            lv = await lv_of(pg)
            misc = {'flat': lv['flat'] if lv else -1, 'opening_voice': fmt_v(v_open) + list(await opening_evidence(pg))}
            if tag == 'flat5':
                n0 = len(v_open)
                pos = await pg.evaluate("""() => {   // 叶子空白处（避开虫）
                  const f = document.getElementById('field');
                  const r = f.getBoundingClientRect();
                  return [r.left + 24, r.top + 20];
                }""")
                await pg.mouse.click(pos[0], pos[1])
                await pg.wait_for_timeout(450)
                await pg.mouse.click(pos[0], pos[1])
                await pg.wait_for_timeout(500)
                vm = await vlog(pg)
                misc['misclick_blank_leaf'] = fmt_v(vm[n0:])
            await shot(pg, 's_%s_open.png' % tag)
            resc = await rescue_test(pg, tag + '_25s')
            misc['rescue'] = resc
            r = await play_level(pg, personas, log)
            r['misc'] = misc
            result['levels'].append(r)
            await shot(pg, 's_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s retries=%s stars=%s rescue=%s' %
                  (tag, r['flat'], r['dch'], r['clicks'], r['retries'], r['stars'],
                   resc['new_entries'][:3]))
        await ctx.close()
        await browser.close()
    save_result('subbug', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
