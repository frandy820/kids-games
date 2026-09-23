# -*- coding: utf-8 -*-
"""compare 比较大小 · 6 岁女孩人设真实试玩（batch6/_obs6 · 2026-09-07）
4 关：flat0 教学关（干净档）/ flat5 章2 / flat10 章3 数字卡 / flat15 章4 大数（种档进关）
人设：> < 方向常混（首错点反向符号）、watch 抢点被吞、点数两侧全部角标、点数字卡读数、
乱点中槽、静置 25s 救援、连错 2 次支架 pulse。钩子 CMP。"""
import asyncio, os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from obs_common import INIT_SCRIPT, install_logger, vlog, opening_evidence, click_sel, shot, save_result, fmt_v, SEED_SAVE
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + os.path.join(BASE, 'compare', 'index.html').replace('\\', '/')
GAME = 'cmp'

async def quiz_of(pg):
    return await pg.evaluate('CMP.quiz')

async def lv_of(pg):
    return await pg.evaluate('CMP.currentLevel')

async def count_items(pg, log):
    """6 岁主策略：把两侧实物逐个点出角标（num 侧无 item 跳过）"""
    while True:
        pos = await pg.evaluate("""() => {
          for (const side of ['left', 'right']) {
            for (const el of document.querySelectorAll('#g-' + side + ' .item')) {
              if (el.dataset.counted !== '1' && !el.querySelector('.badge.on')) {
                const r = el.getBoundingClientRect();
                return [r.left + r.width/2, r.top + r.height/2];
              }
            }
          }
          return null;
        }""")
        if not pos:
            return
        await pg.mouse.click(pos[0], pos[1])
        log['clicks'] += 1
        await pg.wait_for_timeout(140)

async def wrong_sym(q):
    """人设首错：开口方向反（'>'↔'<'；'=' 时点 '>'）"""
    if q['answer'] == '>':
        return '<'
    if q['answer'] == '<':
        return '>'
    return '>'

async def another_wrong(q, tried):
    for s in ('>', '<', '='):
        if s != q['answer'] and s not in tried:
            return s
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
            quiz_data[s] = {'mode': q['mode'], 'left': q['left'], 'right': q['right'],
                            'answer': q['answer'],
                            'diff': (q['left']['n'] - q['right']['n'])}
        # 人设错误（每题至多一轮）
        if s not in did and personas.get(s):
            did.add(s)
            mode = personas[s]
            if mode == 'mirror':            # 先点数，再点反向符号 1 次（首错不 pulse）
                await count_items(pg, log)
                w = await wrong_sym(q)
                p0 = await pg.evaluate("document.querySelectorAll('.sym.pulse').length")
                await click_sel(pg, '.sym[data-s="%s"]' % w)
                log['clicks'] += 1
                await pg.wait_for_timeout(900)
                p1 = await pg.evaluate("document.querySelectorAll('.sym.pulse').length")
                events.append({'ev': 'mirror_first_wrong', 'ans': q['answer'], 'picked': w,
                               'pulse': [p0, p1], 'retries': (await lv_of(pg))['retries']})
            elif mode == 'double':          # 连错 2 次（两个错误符号）→ 第 2 错后 pulse 应亮
                await count_items(pg, log)
                tried = []
                for k in range(2):
                    w = await another_wrong(q, tried)
                    if w is None:
                        break
                    tried.append(w)
                    await click_sel(pg, '.sym[data-s="%s"]' % w)
                    log['clicks'] += 1
                    await pg.wait_for_timeout(900)
                    pulse = await pg.evaluate("document.querySelectorAll('.sym.pulse').length")
                    events.append({'ev': 'wrong_%d' % (k + 1), 'picked': w, 'pulse_after': pulse,
                                   'retries': (await lv_of(pg))['retries']})
        else:
            await count_items(pg, log)
            # num 侧人设：点数字卡听读数
            for side_sel in ('#g-left .numcard', '#g-right .numcard'):
                if await click_sel(pg, side_sel):
                    log['clicks'] += 1
                    await pg.wait_for_timeout(350)
        # 点正确符号
        await click_sel(pg, '.sym[data-s="%s"]' % q['answer'])
        log['clicks'] += 1
        await pg.wait_for_timeout(1900)     # 飞入+圈选+语义语音演出
        await pg.wait_for_timeout(150)
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
    result = {'game': 'compare', 'pageerrors': [], 'levels': []}
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
            t = await pg.evaluate('CMP && CMP.tutorial')
            if t == 'watch':
                seen_watch = True
                break
            if t in ('help', 'solo'):
                break
            await pg.wait_for_timeout(300)
        if seen_watch:
            c0 = (await lv_of(pg))
            tot0 = c0['countedL'] + c0['countedR']
            pos = await pg.evaluate("""() => {
              const el = document.querySelector('.item');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return [r.left + r.width/2, r.top + r.height/2];
            }""")
            if pos:
                await pg.mouse.click(pos[0], pos[1])
                await pg.wait_for_timeout(600)
                c1 = await lv_of(pg)
                tut['watch_swallow'] = (c1['countedL'] + c1['countedR']) == tot0
            await shot(pg, 'c_flat0_watch.png')
        for _ in range(100):
            t = await pg.evaluate('CMP && CMP.tutorial')
            if t == 'help':
                break
            await pg.wait_for_timeout(400)
        tut['help_enter'] = t
        tut['ghost_show'] = await pg.evaluate("!!document.querySelector('#ghost.show')")
        tut['rescue_teach'] = await rescue_test(pg, 'flat0_help_25s')
        # 首题答对 → solo 放手
        q = await quiz_of(pg)
        await count_items(pg, log)
        await click_sel(pg, '.sym[data-s="%s"]' % q['answer'])
        log['clicks'] += 1
        await pg.wait_for_timeout(2000)
        tut['after_first_right'] = await pg.evaluate('CMP && CMP.tutorial')
        tut['ghost_hidden_after_solo'] = not await pg.evaluate("!!document.querySelector('#ghost.show')")
        await shot(pg, 'c_flat0_solo.png')
        r0 = await play_level(pg, {}, log)
        r0['tut'] = tut
        result['levels'].append(r0)
        await shot(pg, 'c_flat0_done.png')
        print('[flat0] clicks=%s retries=%s stars=%s swallow=%s solo=%s rescue=%s' %
              (r0['clicks'], r0['retries'], r0['stars'], tut.get('watch_swallow'), tut.get('after_first_right'),
               tut['rescue_teach']['new_entries'][:3]))

        # ============ flat5 / flat10 / flat15 ============
        for n_done, personas, tag in (
                (5,  {0: 'mirror'}, 'flat5'),
                (10, {0: 'double'}, 'flat10'),
                (15, {0: 'mirror', 1: 'double'}, 'flat15')):
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
                await click_sel(pg, '#slot')           # 乱点中槽：wig + 10s 节流 hint
                await pg.wait_for_timeout(400)
                await click_sel(pg, '#slot')           # 节流内再点不播
                await pg.wait_for_timeout(500)
                vm = await vlog(pg)
                misc['misclick_midslot'] = fmt_v(vm[n0:])
            await shot(pg, 'c_%s_open.png' % tag)
            resc = await rescue_test(pg, tag + '_25s')
            misc['rescue'] = resc
            r = await play_level(pg, personas, log)
            r['misc'] = misc
            result['levels'].append(r)
            await shot(pg, 'c_%s_done.png' % tag)
            print('[%s] flat=%s dch=%s clicks=%s retries=%s stars=%s rescue=%s' %
                  (tag, r['flat'], r['dch'], r['clicks'], r['retries'], r['stars'],
                   resc['new_entries'][:3]))
        await ctx.close()
        await browser.close()
    save_result('compare', result)
    print('pageerrors:', result['pageerrors'][:3])

asyncio.run(main())
