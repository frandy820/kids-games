# -*- coding: utf-8 -*-
"""tictac 井字棋小冠军 · 7.5 岁分龄真实试玩（六步协议；语音链 Audio 层捕获）
7.5 岁人设：会赢会堵但不完美；兔子回合会抢点；点已占格；连败观察文案温和度。
守卫：restTip 自然触发（13 分钟真钟）时收口续打。"""
import asyncio, json, random, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _p36 import TODAY, Session, preset_save, calibrate_mulberry, CH_HINTS, LAUNCH_ARGS
from playwright.async_api import async_playwright

random.seed(363)
LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

def log(m):
    print(f'[{time.strftime("%H:%M:%S")}] {m}', flush=True)

def find_complete(board, me):
    for ln in LINES:
        vals = [board[i] for i in ln]
        if vals.count(me) == 2 and vals.count('') == 1:
            return ln[vals.index('')]
    return None

def child_pick(board, block_p=0.75):
    """7.5 岁启发：先赢→大概率堵→中心>角>边"""
    w = find_complete(board, 'X')
    if w is not None:
        return w
    b = find_complete(board, 'O')
    if b is not None and random.random() < block_p:
        return b
    empt = [i for i, v in enumerate(board) if v == '']
    if 4 in empt and random.random() < 0.8:
        return 4
    corners = [i for i in (0, 2, 6, 8) if board[i] == '']
    if corners and random.random() < 0.7:
        return random.choice(corners)
    return random.choice(empt) if empt else None

async def lv_now(s):
    return await s.js('TK.currentLevel ? JSON.parse(JSON.stringify(TK.currentLevel)) : null')

async def board_now(s):
    q = await s.js('TK.quiz ? TK.quiz.board : null')
    return list(q) if q else None

async def guard_click(s, sel):
    """force 点击带覆盖层守卫：restTip 出现则收口重试（force 跳过 not-stable——pulse/breathe 无限动画）"""
    for attempt in range(3):
        try:
            await asyncio.wait_for(s.page.click(sel, force=True), 7)
            return True
        except Exception:
            if await s.js("document.querySelector('.k-resttip') ? 1 : 0"):
                try:
                    await s.page.click('.k-resttip .k-btn', timeout=3000)
                except Exception:
                    pass
                await asyncio.sleep(0.4)
                continue
            if await s.js("document.querySelector('.k-celebrate') ? 1 : 0"):
                await s.nap(1.5)
                continue
    return False

async def play_round(s, block_p=0.75, rush_probe=False, occupied_probe=False,
                     random_mode=False, observe_block=False):
    """真实下完一局；返回 (result, line, threats, blocks, last_clip)。
    局终检测走 qText 终局文案（endRound 同步设置、局末窗内恒在）。"""
    result, line, blocks_seen, threats, last_clip = None, None, 0, 0, None
    step0 = (await lv_now(s))['step']
    occupied_done, rush_done, line_checked = False, False, False
    END_KEYS = ('赢啦', '平局')
    while True:
        bd = await board_now(s)
        lv = await lv_now(s)
        if bd is None or lv is None or lv['step'] != step0 or lv.get('done'):
            break
        x, o = bd.count('X'), bd.count('O')
        empt = [i for i, v in enumerate(bd) if v == '']
        if x == o and empt:
            mv = random.choice(empt) if random_mode else child_pick(bd, block_p)
            await guard_click(s, f'#board .cell[data-i="{mv}"]')
            if occupied_probe and not occupied_done and x >= 1:
                myx = bd.index('X')
                probe = await s.js(f'TK.tapCell({myx})')
                wig = await s.js(f"document.querySelector('#board .cell[data-i=\"{myx}\"]').className")
                s.rec(probe is False and 'wig' in (wig or ''), '已占格=拒绝 false+bump（不响 wrong）',
                      f'返回={probe!r} cls={wig}')
                occupied_done = True
            if rush_probe and not rush_done:
                rem = [i for i in empt if i != mv]
                if rem:
                    pr = await s.js(f'TK.tapCell({rem[0]})')
                    s.rec(pr is False, '兔子回合抢点=轻吞 false（不误判不落子）', f'返回={pr!r}')
                    rush_done = True
            ended = False
            for _ in range(80):
                await asyncio.sleep(0.2)
                qt = await s.js("(document.querySelector('#qbar .q-text')||{textContent:''}).textContent || ''")
                if any(k in qt for k in END_KEYS):
                    ended = True
                    break
                lvx = await lv_now(s)
                if lvx['step'] != step0 or lvx.get('done'):
                    break
            if ended and not line_checked:
                line_checked = True
                fin = await s.js('TK.final')
                keys = await s.clip_keys()
                last_clip = keys[-1] if keys else None
                if fin and fin.get('line'):
                    cls = await s.js(f"document.querySelector('#board .cell[data-i=\"{fin['line'][0]}\"]').className")
                    s.rec('wincell' in (cls or ''), '胜线三格高亮(wincell)',
                          f"cls={cls} line={fin.get('line')}")
            if observe_block:
                nb = await board_now(s)
                if nb:
                    after = list(bd); after[mv] = 'X'
                    thr = find_complete(after, 'X')
                    if thr is not None:
                        threats += 1
                        if nb[thr] == 'O':
                            blocks_seen += 1
            for _ in range(40):
                lvx = await lv_now(s)
                if lvx['step'] != step0 or lvx.get('done'):
                    break
                await asyncio.sleep(0.2)
        else:
            await asyncio.sleep(0.15)
    fin = await s.js('TK.final')
    if fin:
        result, line = fin.get('result'), fin.get('line')
    return result, line, threats, blocks_seen, last_clip

async def play_level(s, **kw):
    results, clips = [], []
    obs = {'threats': 0, 'blocks': 0}
    for r in range(3):
        rr = await play_round(s, **kw)
        if rr[0]:
            results.append(rr[0])
        if rr[4]:
            clips.append(rr[4])
        obs['threats'] += rr[2]; obs['blocks'] += rr[3]
        await asyncio.sleep(0.8)
        lv = await lv_now(s)
        if lv.get('done'):
            break
    return results, clips, obs

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        s = Session(browser, 'tictac', log)
        await s.setup()
        s.harden(log)
        try:
            cal, cdetail = await calibrate_mulberry(s.page, [88020, 911, 77])
            s.rec(cal, 'mulberry32 Python 复刻位级对齐', cdetail)

            # ---------- 1. 教学链 ----------
            await s.nap(3.5)
            demo_probe = await s.js('TK.tapCell(0)')
            s.rec(demo_probe is None, '教学 watch 期演示吞输入 null', f'返回={demo_probe!r}')
            s.rec(await s.poll('window.__tkDemoR === "done"', 30, 'watch demo'),
                  '教学 watch 末步 __tkDemoR=done（整局走完）', '')
            wm = await s.js('window.__tkWatchMs')
            s.rec(0 < wm <= 16000, 'watch 实测 ≤16s', f'{wm}ms')
            keys = await s.clip_keys()
            s.rec('tk_tut_watch' in keys[:3], '教学 watch 语音 tk_tut_watch 在场（Audio 层）',
                  f'前3={keys[:3]}')
            for _ in range(10):
                if await s.js('TK.currentLevel && TK.currentLevel.flat === 0'):
                    break
                bd = await board_now(s)
                if bd:
                    empt = [i for i, v in enumerate(bd) if v == '']
                    if empt and bd.count('X') == bd.count('O'):
                        pick = 4 if 4 in empt else empt[0]
                        await guard_click(s, f'#board .cell[data-i="{pick}"]')
                await s.nap(2.2)
            s.rec(await s.poll('TK.currentLevel && TK.currentLevel.flat === 0', 8, 'flat0'),
                  '教学 turn 帮→独后进 flat0', '')
            keys = await s.clip_keys()
            s.rec('tk_tut_turn' in keys, '教学 turn 语音 tk_tut_turn', '')

            # ---------- 2. 正常通关（flat0 · ch1 随机兔 · 3 局） ----------
            lv0 = await lv_now(s)
            s.rec(lv0['ch'] == 1 and lv0['n'] == 3, 'flat0 关参数 ch1/3局', str(lv0)[:110])
            results0, clips0, _ = await play_level(s, block_p=0.75, rush_probe=True, occupied_probe=True)
            s.rec(len(results0) == 3, '3 局打完', f'results={results0}')
            s.rec('tk_right' in clips0, '胜局链=tk_right 单 clip', f'局末clip={clips0}')
            miss0 = (await lv_now(s))['miss']
            s.rec(miss0 == 0, 'miss 恒 0（策略款备案）', f'miss={miss0}')
            got_cele = await s.poll("document.querySelector('.k-celebrate')", 12, 'celebrate')
            star_n = await s.js("document.querySelectorAll('.k-celebrate .k-star').length")
            s.rec(got_cele and star_n >= 2, 'flat0 过关庆祝≥2★', f'stars={star_n} results={results0}')
            shot1 = await s.shot('win')
            await s.poll("!document.querySelector('.k-celebrate')", 8, 'gone')
            await s.nap(1.2)
            sv = await s.save()
            s.rec(sv['levels'].get('1-0', {}).get('stars', 0) >= 2, 'flat0 写档',
                  f"{sv['levels'].get('1-0')}")

            # ---------- 3. 连败全程（flat15=ch4 perfect · 乱下不防守=挫败路径） ----------
            await s.poll('TK.currentLevel && TK.currentLevel.flat === 1', 12, 'flat1 auto')
            await s.js('TK.start(15)')
            await asyncio.sleep(0.5)
            results15, clips15, _ = await play_level(s, block_p=0.0, random_mode=True)
            qt = await s.js("(document.querySelector('#qbar .q-text')||{textContent:''}).textContent || ''")
            fin = await s.js('TK.final')
            s.rec(len(results15) == 3 and 'lose' in results15, 'ch4 不防守=负局路径走完',
                  f'results={results15}')
            s.rec(fin and fin.get('result') == 'lose' and isinstance(fin.get('line'), list),
                  'final() 终局快照 {result:lose,line}', f'{fin}')
            s.rec('兔子赢啦' in qt and '再来一局' in qt, '负局文案温和（兔子赢啦，再来一局）',
                  f'text={qt!r}')
            s.rec(clips15 and clips15[-1] == 'tk_lose', '负局链=tk_lose 单 clip',
                  f'局末clip={clips15}')
            miss15 = (await lv_now(s))['miss']
            s.rec(miss15 == 0, '连败不增 miss', f'miss={miss15}')
            got_cele = await s.poll("document.querySelector('.k-celebrate')", 12, 'celebrate')
            star_n = await s.js("document.querySelectorAll('.k-celebrate .k-star').length")
            s.rec(got_cele and star_n == 1, '完成即星永不 0★（连败=1★兜底）', f'stars={star_n}')
            await s.poll("!document.querySelector('.k-celebrate')", 8, 'gone')
            await s.nap(1.2)
            sv = await s.save()
            s.rec(sv['levels'].get('4-0', {}).get('stars') == 1, 'flat15(4-0) 写档 1★',
                  f"{sv['levels'].get('4-0')}")
            shot2 = await s.shot('lose_1star')

            # ---------- 4. ch4 最优=平局可达（教育口径锚：autoSolve 全最优） ----------
            await s.poll('TK.currentLevel && TK.currentLevel.flat === 1', 12, 'auto flat1')
            await s.js('TK.start(16)')
            await asyncio.sleep(0.3)
            await s.js('TK.autoSolve()')
            ok = await s.poll('TK.currentLevel && TK.currentLevel.done', 90, 'autosolve')
            lv16 = await lv_now(s)
            keys = await s.clip_keys()
            s.rec(ok and abs(lv16.get('score', 0) - 1.5) < 1e-9, 'ch4 最优三局=3×平局(score1.5)',
                  f"score={lv16.get('score')} stars={lv16.get('stars')}")
            s.rec(keys.count('tk_draw') >= 3, '平局链=tk_draw 单 clip',
                  f'tk_draw×{keys.count("tk_draw")}')
            await s.poll("!document.querySelector('.k-celebrate')", 10, 'gone')
            await s.nap(1.0)

            # ---------- 5. 家长门+多玩（flat1/2/3 真实 + flat5 观察 block-only） ----------
            await s.poll('TK.currentLevel && TK.currentLevel.flat === 1', 12, 'flat1')
            await s.parent_gate(wrong_first=True)
            s.rec(await s.bonus_set(5), 'bonusSet(5) limit 6→11',
                  f'limit={await s.js("KIDS.calendar.limit(Infinity)")}')
            await s.close_panel()
            for f in (1, 2, 3):
                res, clips_, _ = await play_level(s, block_p=0.85)
                s.rec(len(res) == 3, f'flat{f} 3 局打完', f'results={res}')
                await s.poll(f'TK.currentLevel && TK.currentLevel.flat === {f + 1}', 15, f'f{f+1}')
            await s.nap(1.0)
            sv = await s.save()
            s.rec(all(sv['levels'].get(k) for k in ('1-1', '1-2', '1-3')),
                  '多玩 flat1-3 写档', f"keys={sorted(sv['levels'])}")
            # ---------- 6. 防沉迷三件 ----------
            await s.poll('TK.currentLevel && TK.currentLevel.flat', 12, 'some level')
            await s.js('window.__addTime(14 * 60 * 1000)')
            got_rest = await s.poll("document.querySelector('.k-resttip')", 26, 'restTip')
            rest_txt = await s.js("(document.querySelector('.k-resttip')||{}).innerText || ''")
            s.rec(got_rest and '眼睛要休息' in rest_txt, 'restTip 13 分钟档触发',
                  f'text={rest_txt!r}')
            shot3 = await s.shot('resttip')
            await s.page.click('.k-resttip .k-btn')
            await asyncio.sleep(0.6)
            sv = await s.save()
            s.rec(sv.get('restTip', {}).get('shown') == 13, 'restTip.shown=13 写档',
                  f"{sv.get('restTip')}")
            s.rec(sv.get('dailyMin', {}).get(TODAY, 0) >= 13, 'dailyMin ≥13 入账',
                  f"dailyMin={sv.get('dailyMin')}")

            # dayEnd：预置 flats0-10 全过+bonus5 → 重载
            await s.write_save(preset_save('tictac', list(range(11)), stars_default=2, bonus=5))
            await s.page.reload(wait_until='domcontentloaded')
            await s.nap(1.0)
            got_de = await s.poll("document.querySelector('.k-dayend')", 10, 'dayEnd')
            de_txt = await s.js("(document.querySelector('.k-dayend')||{}).innerText || ''")
            exp = CH_HINTS['tictac'][3]
            s.rec(got_de and '今天的新关卡玩完啦' in de_txt and ('明天：' + exp) in de_txt,
                  'dayEnd=今日玩完+明日预告', f'text={de_txt!r} 期望明天：{exp}')
            shot4 = await s.shot('dayend')
            await s.page.locator('.k-dayend button', has_text='明天见').click()
            await asyncio.sleep(0.6)
            s.rec(await s.js("!document.querySelector('.k-dayend')"), 'dayEnd 可关', '')

            # ch2 block-only 行为观测（dayEnd 后新页面执行——传输瞬断高发段兜底：两局即止）
            await s.js('TK.start(5)')
            await asyncio.sleep(0.4)
            res5, clips5, obs5 = [], [], {'threats': 0, 'blocks': 0}
            for rr in range(2):
                r5 = await play_round(s, block_p=0.85, observe_block=True)
                if r5[0]:
                    res5.append(r5[0])
                obs5['threats'] += r5[2]; obs5['blocks'] += r5[3]
                lvx = await lv_now(s)
                if not lvx or lvx.get('done') or lvx.get('round', 3) >= 3:
                    break
                await asyncio.sleep(0.8)
            s.rec(obs5['threats'] >= 1 and obs5['blocks'] >= obs5['threats'] - 1,
                  'ch2 block-only：威胁点兔子大概率落堵点（实测采样）',
                  f"threats={obs5['threats']} blocked={obs5['blocks']} results={res5}")

            metrics = await s.js("""(() => {
              const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
              return { cell: r(document.querySelector('#board .cell')),
                qtext_px: getComputedStyle(document.querySelector('#qbar .q-text')).fontSize,
                board: r(document.getElementById('board')) };
            })()""")
            log(f'可读性度量: {json.dumps(metrics, ensure_ascii=False)}')
            log(f'shots: {shot1} {shot2} {shot3} {shot4}')
        except Exception as e:
            import traceback
            log('EXCEPTION: ' + traceback.format_exc())
            s.rec(False, '脚本异常中断', str(e)[:300])
        out = await s.finish('tictac')
        await browser.close()
        return 0 if all(r['ok'] for r in out['results']) else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
