# -*- coding: utf-8 -*-
"""comfort 安慰选择 · 5.5 岁分龄真实试玩（六步协议 b35 口径）
v3 驱动：急点循环+管道活性触（实证：turn 演出期 ≥2s 静默挂起 playwright 管道——
方法学备注见报告）。5.5 岁人设：不识字靠语音/图画；会点坏卡犯错；会连点抢点；
会乱点空白/戳兔子。"""
import asyncio, json, random, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _p36 import TODAY, Session, preset_save, calibrate_mulberry, CH_HINTS, LAUNCH_ARGS
from playwright.async_api import async_playwright

random.seed(361)

def log(m):
    print(f'[{time.strftime("%H:%M:%S")}] {m}', flush=True)

WIN = lambda say: (400 + len(say) * 345 + 600 + 300 + 600) / 1000  # ENTER+estMs+300+margin（ms→s）

async def quiz_now(s):
    return await s.js('CO.quiz ? JSON.parse(JSON.stringify(CO.quiz)) : null')

def harden(s, logf):
    """传输加固：全部 evaluate 走 wait_for+重试（实证卡死=CDP 响应丢失而非页面忙——
    renderer 13% CPU 正常动画中，evaluate 永不返回；探针式重试轮询已证可存活）"""
    async def js2(expr, arg=None):
        last_e = None
        for i in range(10):
            try:
                return await asyncio.wait_for(
                    s.page.evaluate(expr, arg) if arg is not None else s.page.evaluate(expr), 3.5)
            except Exception as e:
                last_e = e
                logf(f'js-retry#{i + 1} {type(e).__name__} {str(expr)[:50]}')
                await asyncio.sleep(0.3)
        raise TimeoutError(f'evaluate 持续无响应: {str(expr)[:60]} ({last_e})')

    async def poll2(expr, timeout=15.0, desc=''):
        t0 = time.time()
        while time.time() - t0 < timeout:
            try:
                if await asyncio.wait_for(s.page.evaluate(expr), 3.5):
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.1)
        return False

    s.js, s.poll = js2, poll2

async def idlep(s, seconds):
    """探针式等待（替代 s.idle）：0.3s 活性轮询，非游戏输入不重置救援锚"""
    t0, last = time.time(), 0.0
    while time.time() - t0 < seconds:
        await asyncio.sleep(0.3)
        try:
            await asyncio.wait_for(s.page.evaluate('CO.quiz ? CO.quiz.step : -1'), 1.5)
        except Exception:
            pass
        if time.time() - last > 6:
            last = time.time()
            log(f'idlep alive t+{time.time() - t0:.0f}s')
    return True

async def bad_tap_until(s, target, tries=6):
    """坏卡点击至 miss>=target（演出窗/错链窗会吞点击：自管理重试；先读 miss 防过冲）"""
    for _ in range(tries):
        q = await quiz_now(s)
        if not q:
            return False
        if (q.get('miss') or 0) >= target:
            return True
        bad_i = next((i for i, c in enumerate(q['cards']) if not c['good']), None)
        if bad_i is None:
            return False
        await s.tap(f'#cards .card-wrap[data-i="{bad_i}"]')
        await idlep(s, 1.5)
        if await s.poll(f'CO.quiz && CO.quiz.miss >= {target}', 3.5, f'miss{target}'):
            return True
    return False

async def answer_one(s, max_s=45):
    """急点作答：窗内点击被吞（抢点=5.5 岁自然形态），窗后即落。全程高触达无长静默"""
    q = await quiz_now(s)
    if not q:
        return False
    st, ans = q['step'], q['answer']
    t0 = time.time()
    while time.time() - t0 < max_s:
        await s.tap(f'#cards .card-wrap[data-i="{ans}"]')
        await asyncio.sleep(random.uniform(0.25, 0.7))
        cur = await quiz_now(s)
        if not cur or cur['step'] != st:
            return True
        if await s.js('CO.currentLevel && CO.currentLevel.done'):
            return True
    return False

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        s = Session(browser, 'comfort', log)
        await s.setup()
        harden(s, log)
        try:
            cal, cdetail = await calibrate_mulberry(s.page, [87866, 101, 7919])
            s.rec(cal, 'mulberry32 Python 复刻位级对齐', cdetail)

            # ---------- 1. 教学链 ----------
            await idlep(s, 3.0)
            demo_probe = await s.js('CO.tapCard(0)')
            s.rec(demo_probe is None, '教学 watch 期演示吞输入 null', f'返回={demo_probe!r}')
            s.rec(await s.poll('window.__coDemoR === "right"', 30, 'watch demo'),
                  '教学 watch 末步 __coDemoR=right', '')
            wm = await s.js('window.__coWatchMs')
            s.rec(0 < wm <= 16000, 'watch 实测 ≤16s', f'{wm}ms')
            keys = await s.clip_keys()
            s.rec('co_tut_watch' in keys[:3], '教学 watch 语音 co_tut_watch 在场（Audio 层）',
                  f'前3={keys[:3]}')
            # turn 帮→独：急点循环（freshTut 首点吞=已知节律）
            t0 = time.time()
            while time.time() - t0 < 40:
                if await s.js('window.__coTutSolo === true'):
                    break
                q = await quiz_now(s)
                if q:
                    await s.tap(f'#cards .card-wrap[data-i="{q["answer"]}"]')
                await asyncio.sleep(random.uniform(0.3, 0.8))
            s.rec(await s.js('window.__coTutSolo === true'), '教学 turn 帮→独（首对放手）', '')
            keys = await s.clip_keys()
            s.rec('co_tut_turn' in keys, '教学 turn 语音 co_tut_turn', '')
            s.rec(await s.poll('CO.currentLevel && CO.currentLevel.flat === 0', 8, 'flat0'),
                  '教学后进正式关 flat0', '')

            # ---------- 2. 正常通关（flat0 · 全对 3★） ----------
            lv0 = await s.js('JSON.parse(JSON.stringify(CO.currentLevel))')
            s.rec(lv0['ch'] == 1 and lv0['n'] == 5, 'flat0 关参数 ch1/n5', str(lv0)[:120])
            # Q1 答前戳兔子（5.5 岁探索）——先等演出窗过（idle 触不产生输入）
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) + 1.0)
            n_hint0 = (await s.clip_keys()).count('co_hint')
            await s.tap('#btn-rabbit')
            await asyncio.sleep(0.7)
            n_hint1 = (await s.clip_keys()).count('co_hint')
            s.rec(n_hint1 == n_hint0 + 1, '戳兔子=co_hint 提示', f'{n_hint0}->{n_hint1}')
            s.rec(await answer_one(s), 'Q1 作答推进', '')
            fr = await s.js("document.getElementById('friend').className")
            keys = await s.clip_keys()
            s.rec('happy' in (fr or ''), '选好卡=朋友破涕为笑(#friend.happy)', f'cls={fr}')
            s.rec(keys and keys[-1] == 'co_right', '确认链=co_right 单 clip',
                  f'末clip={keys[-1] if keys else None}')
            shot1 = await s.shot('happy')
            # Q2 答前点重听（演出窗/锁定会吞点击：重试至真播一次，再二击验 3s 节流）
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) + 0.6)
            say_cnt0 = (await s.tts_texts()).count(q['say'])
            say_cnt1, taps = say_cnt0, 0
            for _ in range(10):
                await s.tap('#btn-hear')
                taps += 1
                await asyncio.sleep(0.8)
                say_cnt1 = (await s.tts_texts()).count(q['say'])
                if say_cnt1 > say_cnt0:
                    break
            await s.tap('#btn-hear')   # 3s 节流内二击
            await asyncio.sleep(0.5)
            say_cnt2 = (await s.tts_texts()).count(q['say'])
            s.rec(say_cnt1 == say_cnt0 + 1 and say_cnt2 == say_cnt1, '重听=情景句重播+3s 节流',
                  f'{say_cnt0}->{say_cnt1}->{say_cnt2} taps={taps}')
            s.rec(await answer_one(s), 'Q2 作答推进', '')
            for i in (2, 3, 4):
                s.rec(await answer_one(s), f'Q{i+1} 作答推进', '')
            got_cele = await s.poll("document.querySelector('.k-celebrate')", 12, 'celebrate')
            star_n = await s.js("document.querySelectorAll('.k-celebrate .k-star').length")
            big = await s.js("(document.querySelector('.k-celebrate .k-big')||{}).textContent")
            s.rec(got_cele and star_n == 3, 'flat0 三星庆祝', f'stars={star_n} text={big}')
            await s.poll("!document.querySelector('.k-celebrate')", 8, 'celeb gone')
            await idlep(s, 1.2)
            sv = await s.save()
            s.rec(sv['levels'].get('1-0', {}).get('stars') == 3, 'flat0 写档 3★',
                  f"levels={sv['levels'].get('1-0')}")

            # ---------- 3. 错路径（flat1：点坏卡=5.5 岁典型犯错） ----------
            await s.poll('CO.currentLevel && CO.currentLevel.flat === 1', 8, 'flat1')
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) + 1.2)
            good_is = [i for i, c in enumerate(q['cards']) if c['good']]
            s.rec(len(good_is) == 1 and good_is[0] == q['answer'],
                  '好卡唯一&独立推导一致', f'good={good_is} answer={q["answer"]}')
            bad_i = next(i for i, c in enumerate(q['cards']) if not c['good'])
            await s.tap(f'#cards .card-wrap[data-i="{bad_i}"]')
            saw_bad = await s.poll(f"document.querySelector('#cards .card-wrap[data-i=\"{bad_i}\"]').classList.contains('bad')", 2, 'bad cls')
            await idlep(s, 1.2)
            fr = await s.js("document.getElementById('friend').className")
            qm = await quiz_now(s)
            gap = await s.chain_gap('co_wrong', 'co_hint')
            s.rec(saw_bad, '坏卡 bad 动画（瞬态类·快轮询捕获）', f'bad_i={bad_i}')
            s.rec('sadder' in (fr or ''), '朋友更难过演出(sadder)', f'cls={fr}')
            s.rec(gap is not None and 50 <= gap <= 900, '错链=co_wrong→(150ms)→co_hint',
                  f'gap={gap}ms')
            s.rec(qm['miss'] == 1, 'miss=1 计入', f'miss={qm["miss"]}')
            shot2 = await s.shot('wrong')
            # 豁免窗内：坏卡二击吞 false；随后窗内对选（真点好卡）放行
            bad2 = next((i for i, c in enumerate(qm['cards']) if not c['good']), bad_i)
            probe = await s.js(f'CO.tapCard({bad2})')
            s.rec(probe is False, '豁免窗内坏卡二击=false 吞', f'返回={probe!r}')
            qm = await quiz_now(s)
            s.rec(qm['miss'] == 1, '窗内二击不增 miss', f'miss={qm["miss"]}')
            await s.tap(f'#cards .card-wrap[data-i="{qm["answer"]}"]')  # 窗内对选放行
            ok_step = await s.poll('CO.quiz && CO.quiz.step === 1', 8, 'Q2')
            s.rec(ok_step, '豁免窗内对选放行（顺利进 Q2）', '')
            # Q2 同题二犯（miss 按题计）→ miss=2 答案级 breathe
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) + 0.8)
            got1 = await bad_tap_until(s, 1)
            got2 = await bad_tap_until(s, 2)
            qm = await quiz_now(s)
            ans = qm['answer'] if qm else None
            br = await s.js(f"document.querySelector('#cards .card-wrap[data-i=\"{ans}\"]').className") if ans is not None else ''
            s.rec(got1 and got2 and bool(qm) and qm['miss'] == 2 and 'breathe' in (br or ''),
                  'miss≥2 好卡 breathe（答案级）',
                  f'ok1={got1} ok2={got2} miss={qm["miss"] if qm else None} answer_cls={br}')
            s.rec(await answer_one(s), 'Q2 补对推进', '')
            # Q3 演出窗内真连点（抢点）→ 吞
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) * 0.45)
            await s.tap(f'#cards .card-wrap[data-i="{q["answer"]}"]'); await asyncio.sleep(0.25)
            await s.tap(f'#cards .card-wrap[data-i="{q["answer"]}"]'); await asyncio.sleep(0.8)
            qm = await quiz_now(s)
            probe = await s.js(f'CO.tapCard({qm["answer"]})')
            s.rec(probe is None and qm['step'] == 2, '演出窗内点卡=null（真时钟锁）',
                  f'返回={probe!r} step={qm["step"]} miss={qm["miss"]}')
            s.rec(await answer_one(s), 'Q3 窗后作答推进', '')
            s.rec(await answer_one(s), 'Q4 作答推进', '')
            s.rec(await answer_one(s), 'Q5 末题作答推进', '')
            await s.poll('CO.currentLevel && CO.currentLevel.flat === 2', 20, 'flat2')
            await idlep(s, 1.0)
            sv = await s.save()
            s.rec(sv['levels'].get('1-1', {}).get('stars') == 1, 'flat1 3miss=1★ 写档（梯度 0→3★/≤2→2★/≥3→1★，v8 2miss=2★ + v10 3miss=1★ 双证）',
                  f"levels={sv['levels'].get('1-1')}")
            # 乱点空白（5.5 岁探索）10s 节流
            q = await quiz_now(s)
            await idlep(s, WIN(q['say']) + 0.5)
            n0 = (await s.clip_keys()).count('co_hint')
            await s.page.click('#stage', position={'x': 60, 'y': 30}, force=True)
            await asyncio.sleep(0.7)
            n1 = (await s.clip_keys()).count('co_hint')
            await s.page.click('#stage', position={'x': 60, 'y': 30}, force=True)
            await asyncio.sleep(0.5)
            n2 = (await s.clip_keys()).count('co_hint')
            s.rec(n1 == n0 + 1 and n2 == n1, '空白探索=hint 轻提示+10s 节流', f'{n0}->{n1}->{n2}')
            s.rec(await answer_one(s), 'flat2 Q1 作答推进', '')

            # ---------- 4. 救援钟（30s 发呆；idle 触不产生游戏输入不重置救援锚） ----------
            say0 = len(await s.tts_texts())
            await idlep(s, 31.5)
            say1 = len(await s.tts_texts())
            s.rec(say1 >= say0 + 2, '发呆救援 14s 方向级+30s 答案级（情景句重播×2）',
                  f'{say0}->{say1}')
            for i in range(4):
                s.rec(await answer_one(s), f'flat2 Q{i+2} 作答推进', '')

            # ---------- 5. 家长门 + 多玩 ----------
            await s.poll('CO.currentLevel && CO.currentLevel.flat === 3', 15, 'flat3')
            await s.parent_gate(wrong_first=True)
            s.rec(await s.bonus_set(5), 'bonusSet(5) limit 6→11',
                  f'limit={await s.js("KIDS.calendar.limit(Infinity)")}')
            await s.close_panel()
            for i in range(5):
                s.rec(await answer_one(s), f'flat3 Q{i+1} 推进', '')
            await s.poll('CO.currentLevel && CO.currentLevel.flat === 4', 15, 'flat4')
            for i in range(5):
                s.rec(await answer_one(s), f'flat4 Q{i+1} 推进', '')
            got_ch = await s.poll("document.querySelector('.k-chapterend')", 12, 'chapterEnd')
            ch_txt = await s.js("(document.querySelector('.k-chapterend')||{}).innerText || ''")
            s.rec(got_ch and '第 1 章 完成！' in ch_txt and CH_HINTS['comfort'][1] in ch_txt,
                  '章末层=第1章完成+预告ch2', f'text={ch_txt!r}')
            shot3 = await s.shot('chapterend')
            await s.page.click('.k-chapterend .k-btn')
            await asyncio.sleep(0.6)
            sv = await s.save()
            s.rec(all(sv['levels'].get(f'1-{i}') for i in (2, 3, 4)), '多玩 flat2-4 写档',
                  f"keys={sorted(sv['levels'])}")

            # ---------- 6. 防沉迷三件 ----------
            await s.poll('CO.currentLevel && CO.currentLevel.flat === 5', 10, 'flat5')
            await s.js('window.__addTime(14 * 60 * 1000)')   # +14min 真链路
            got_rest = await s.poll("document.querySelector('.k-resttip')", 26, 'restTip')
            rest_txt = await s.js("(document.querySelector('.k-resttip')||{}).innerText || ''")
            s.rec(got_rest and '眼睛要休息' in rest_txt, 'restTip 13 分钟档触发',
                  f'text={rest_txt!r}')
            shot4 = await s.shot('resttip')
            await s.page.click('.k-resttip .k-btn')
            await asyncio.sleep(0.6)
            s.rec(await s.js("!document.querySelector('.k-resttip')"), 'restTip 可关', '')
            sv = await s.save()
            s.rec(sv.get('restTip', {}).get('shown') == 13, 'restTip.shown=13 写档',
                  f"{sv.get('restTip')}")
            s.rec(sv.get('dailyMin', {}).get(TODAY, 0) >= 13, 'dailyMin ≥13 入账',
                  f"dailyMin={sv.get('dailyMin')}")

            # dayEnd：预置 flats0-10 全过+bonus5 → 重载 → 启动日终
            await s.write_save(preset_save('comfort', list(range(11)), stars_default=2, bonus=5))
            await s.page.reload(wait_until='domcontentloaded')
            await idlep(s, 1.0)
            got_de = await s.poll("document.querySelector('.k-dayend')", 10, 'dayEnd')
            de_txt = await s.js("(document.querySelector('.k-dayend')||{}).innerText || ''")
            exp = CH_HINTS['comfort'][3]   # nextHint(10)：ci=2→CHAPTERS[3] 预告 ch3
            s.rec(got_de and '今天的新关卡玩完啦' in de_txt and ('明天：' + exp) in de_txt,
                  'dayEnd=今日玩完+明日预告', f'text={de_txt!r} 期望明天：{exp}')
            shot5 = await s.shot('dayend')
            await s.page.locator('.k-dayend button', has_text='明天见').click()
            await asyncio.sleep(0.6)
            s.rec(await s.js("!document.querySelector('.k-dayend')"), 'dayEnd 可关', '')
            s.rec(await s.poll('CO.currentLevel && CO.currentLevel.flat === 0', 8, 'replay'),
                  '关闭后回旧关重玩通道', '')

            # 可读性度量（儿童视角）
            metrics = await s.js("""(() => {
              const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
              return {
                card: r(document.querySelector('.card-wrap')),
                word_px: getComputedStyle(document.querySelector('.card-wrap .word')).fontSize,
                qtext_px: getComputedStyle(document.getElementById('q-text')).fontSize,
                friend: r(document.getElementById('friend')),
                dock_btn: r(document.querySelector('#dock button')),
              };
            })()""")
            log(f'可读性度量: {json.dumps(metrics, ensure_ascii=False)}')
            s.rec(metrics['card'][0] >= 100 and metrics['card'][1] >= 110, '卡片尺寸可点性',
                  str(metrics))
            log(f'shots: {shot1} {shot2} {shot3} {shot4} {shot5}')
        except Exception as e:
            import traceback
            log('EXCEPTION: ' + traceback.format_exc())
            s.rec(False, '脚本异常中断', str(e)[:300])
        out = await s.finish('comfort')
        await browser.close()
        return 0 if all(r['ok'] for r in out['results']) else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
