# -*- coding: utf-8 -*-
"""tictac B 段续跑：v6 在 flat2 中段遭遇传输楔死（增量落盘已保 1-39 条）。
B 段预置 v6 实挣存档（flats 0/1/15/16，非编造）续跑 flat2-3 + 防沉迷 + dayEnd + 观察段。"""
import asyncio, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _p36 import TODAY, Session, preset_save, CH_HINTS, LAUNCH_ARGS
from playwright.async_api import async_playwright
from play_tictac import play_level, play_round, lv_now, log

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        s = Session(browser, 'tictac', log)
        await s.setup()
        s.harden(log)
        # 载入 A 段(v6)实挣存档，合并其已落盘结果
        sv_a = preset_save('tictac', [0, 1, 15, 16], stars_default=3, bonus=5)
        sv_a['levels']['4-0'] = {'stars': 1, 'plays': 1}   # v6 连败局实得 1★
        try:
            prior = json.loads(Path('tictac_result.json').read_text(encoding='utf-8'))
            s.results = list(prior.get('results', []))
            log(f'A 段结果载入 {len(s.results)} 条')
        except Exception:
            log('A 段结果缺失，仅计 B 段')
        try:
            await s.write_save(sv_a)
            await s.page.reload(wait_until='domcontentloaded')
            await s.nap(1.0)
            await s.poll('TK.currentLevel', 8, 'boot')
            # ---------- B1: flat2/flat3 真实对局（补 v6 楔死缺口） ----------
            for f in (2, 3):
                await s.js(f'TK.start({f})')
                await asyncio.sleep(0.4)
                res, clips_, _ = await play_level(s, block_p=0.85)
                s.rec(len(res) == 3, f'flat{f} 3 局打完', f'results={res}')
                await s.poll(f'TK.currentLevel && TK.currentLevel.flat === {f + 1}', 15, f'f{f+1}')
            await s.nap(1.0)
            sv = await s.save()
            s.rec(all(sv['levels'].get(k) for k in ('1-1', '1-2', '1-3')),
                  '多玩 flat1-3 写档', f"keys={sorted(sv['levels'])}")

            # ---------- B2: 防沉迷三件 ----------
            await s.js('window.__addTime(14 * 60 * 1000)')
            got_rest = await s.poll("document.querySelector('.k-resttip')", 26, 'restTip')
            rest_txt = await s.js("(document.querySelector('.k-resttip')||{}).innerText || ''")
            s.rec(got_rest and '眼睛要休息' in rest_txt, 'restTip 13 分钟档触发',
                  f'text={rest_txt!r}')
            await s.shot('resttip')
            await s.page.click('.k-resttip .k-btn')
            await asyncio.sleep(0.6)
            sv = await s.save()
            s.rec(sv.get('restTip', {}).get('shown') == 13, 'restTip.shown=13 写档',
                  f"{sv.get('restTip')}")
            s.rec(sv.get('dailyMin', {}).get(TODAY, 0) >= 13, 'dailyMin ≥13 入账',
                  f"dailyMin={sv.get('dailyMin')}")

            # ---------- B3: dayEnd ----------
            await s.write_save(preset_save('tictac', list(range(11)), stars_default=2, bonus=5))
            await s.page.reload(wait_until='domcontentloaded')
            await s.nap(1.0)
            got_de = await s.poll("document.querySelector('.k-dayend')", 10, 'dayEnd')
            de_txt = await s.js("(document.querySelector('.k-dayend')||{}).innerText || ''")
            exp = CH_HINTS['tictac'][3]
            s.rec(got_de and '今天的新关卡玩完啦' in de_txt and ('明天：' + exp) in de_txt,
                  'dayEnd=今日玩完+明日预告', f'text={de_txt!r} 期望明天：{exp}')
            await s.shot('dayend')
            await s.page.locator('.k-dayend button', has_text='明天见').click()
            await asyncio.sleep(0.6)
            s.rec(await s.js("!document.querySelector('.k-dayend')"), 'dayEnd 可关', '')

            # ---------- B4: ch2 block-only 观测（dayEnd 后新页面；两局即止） ----------
            await s.js('TK.start(5)')
            await asyncio.sleep(0.4)
            res5, obs5 = [], {'threats': 0, 'blocks': 0}
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
        except Exception as e:
            import traceback
            log('EXCEPTION: ' + traceback.format_exc())
            s.rec(False, 'B 段异常中断', str(e)[:300])
        out = await s.finish('tictac')
        await browser.close()
        return 0 if all(r['ok'] for r in out['results']) else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
