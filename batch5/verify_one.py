# -*- coding: utf-8 -*-
"""batch5 首单元门禁+复验（独立跑，不信用开发 agent 自报）。
用法：python verify_one.py <countchick|spotdiff|connect>
十项：①verify=1 title ②无头真实操作通关 ③双 viewport ④离线断言 ⑤截图像素非空白
⑥钩子齐全 ⑦0 pageerror ⑧教学吞输入 ⑨语音 clips 注入对账 ⑩答错零惩罚+首错不 pulse。"""
import asyncio, io, sys, json, statistics
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.async_api import async_playwright

DIR_BASE = 'F:/claudecode/projects/active/kids-games/batch5'
GAME = sys.argv[1] if len(sys.argv) > 1 else 'countchick'
URL = 'file:///' + DIR_BASE + '/' + GAME + '/index.html'
HOOK = {'countchick': 'CHK', 'spotdiff': 'SPD', 'connect': 'CON'}[GAME]
VP = [{'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}]
results = []

def rec(name, ok, detail=''):
    results.append((name, ok))
    print(('PASS' if ok else 'FAIL'), name, detail)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ① verify=1 title（双 viewport 各一次）
        titles = []
        for vp in VP:
            ctx = await browser.new_context(viewport=vp)
            page = await ctx.new_page()
            # 2026-09-19 用户外放事故：禁系统 TTS 外放（keyless 段兜底链会走 speechSynthesis 机械音）
            await page.add_init_script("try{const s=window.speechSynthesis;if(s){s.speak=function(){};s.cancel=function(){};}}catch(e){}")
            await page.goto(URL + '?verify=1')
            try:
                await page.wait_for_function("document.title.startsWith('VERIFY')", timeout=30000)
            except Exception:
                pass
            titles.append(await page.title())
            await ctx.close()
        rec('① verify title', titles[0].startswith('VERIFY PASS') and titles[1] == titles[0], ' / '.join(titles))

        # ②-⑩ 真实操作（800 宽竖屏，5-6 岁主用平板）
        ctx = await browser.new_context(viewport=VP[1])
        page = await ctx.new_page()
        await page.add_init_script("try{const s=window.speechSynthesis;if(s){s.speak=function(){};s.cancel=function(){};}}catch(e){}")
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(900)

        if GAME == 'countchick':
            # ⑧ 教学看阶段吞输入
            await page.evaluate('() => CHK.pick(CHK.quiz ? CHK.quiz.answerIdx : 0)')
            await page.wait_for_timeout(300)
            s = await page.evaluate('() => CHK.currentLevel')
            rec('⑧ 教学看阶段吞输入', s['step'] == 0, 'step=%d' % s['step'])
            # ② 教学走完后真实点小鸡角标+答案通关
            await page.wait_for_timeout(15000)
            won, picks, tagged = False, 0, 0
            for _ in range(14):
                q = await page.evaluate('() => CHK.quiz')
                if not q: break
                n = await page.evaluate('() => document.querySelectorAll(\'.animal[data-k="c"]\').length')
                for i in range(min(3, n or 0)):
                    await page.evaluate('(i) => { const el = document.querySelector(\'.animal[data-k="c"][data-i="\' + i + \'"]\'); if (el) el.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); }', i)
                    await page.wait_for_timeout(60)
                tagged = await page.evaluate("""() => Array.from(document.querySelectorAll('.animal[data-k="c"] .badge')).filter(b => b.textContent).length""")
                await page.evaluate('(i) => { const el = document.querySelector(\'.opt[data-i="\' + i + \'"]\'); if (el) el.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); }', q['answerIdx'])
                await page.wait_for_timeout(1100)
                picks += 1
                c = await page.evaluate('() => CHK.currentLevel')
                if c['done'] or c['won']: won = True; break
            rec('② 真实点击通关', won, 'picks=%d tagged=%d' % (picks, tagged))

            # ⑨ 语音 clips 对账
            clips = await page.evaluate('() => KIDS.voice.clips ? Object.keys(KIDS.voice.clips).length : 0')
            rec('⑨ 语音注入', clips >= 6, 'clips=%d' % clips)

            # ⑩ 答错零惩罚+首错不 pulse（种档跳教学）
            await page.evaluate("""() => {
                const sv = KIDS._save();
                sv.levels['1-0'] = {stars:3};
                sv.chk = sv.chk || {}; sv.chk.tutSeen = true;
                KIDS.store.persist();
            }""")
            await page.reload(); await page.wait_for_timeout(700)
            q = await page.evaluate('() => CHK.quiz')
            wrongs = [i for i in range(len(q['items'])) if i != q['answerIdx']]
            await page.evaluate('(i) => CHK.pick(i)', wrongs[0])
            await page.wait_for_timeout(700)
            s1 = await page.evaluate('() => ({ pulses: document.querySelectorAll(".pulse").length, step: CHK.currentLevel.step })')
            await page.evaluate('(i) => CHK.pick(i)', wrongs[1] if len(wrongs) > 1 else wrongs[0])
            await page.wait_for_timeout(700)
            s2 = await page.evaluate('() => ({ pulses: document.querySelectorAll(".pulse").length })')
            rec('⑩ 零惩罚+首错不pulse', s1['step'] == 0 and s1['pulses'] == 0 and s2['pulses'] >= 1,
                json.dumps({'一错': s1, '二错': s2}))

        if GAME == 'spotdiff':
            # ⑧ 教学看阶段吞输入
            f0 = await page.evaluate('() => { const q = SPD.quiz; return q ? q.found.slice() : null; }')
            q = await page.evaluate('() => SPD.quiz')
            if q:
                await page.evaluate('(d) => SPD.tapAt(d.diffs[0].x, d.diffs[0].y)', q)
                await page.wait_for_timeout(300)
                f1 = await page.evaluate('() => SPD.quiz.found.filter(Boolean).length')
                rec('⑧ 教学看阶段吞输入', f1 == 0, 'found0=%d' % f1)
            else:
                rec('⑧ 教学看阶段吞输入', False, 'quiz=null')
            # ② 教学走完后真实 page.mouse.click 点差异通关（vb→页面坐标 getScreenCTM 正变换）
            await page.wait_for_timeout(15000)
            won, clicks = False, 0
            for _ in range(10):
                q = await page.evaluate('() => SPD.quiz')
                if not q: break
                for d in q['diffs']:
                    pt = await page.evaluate("""(d) => {
                        const svg = document.querySelector('#pic-bottom svg');
                        const pt = svg.createSVGPoint(); pt.x = d.x; pt.y = d.y;
                        const p = pt.matrixTransform(svg.getScreenCTM());
                        return [p.x, p.y];
                    }""", d)
                    await page.mouse.click(pt[0], pt[1])
                    clicks += 1
                    await page.wait_for_timeout(650)
                c = await page.evaluate('() => SPD.currentLevel')
                if c['done'] or c['won']: won = True; break
            rec('② 真实点击通关', won, 'clicks=%d' % clicks)
            clips = await page.evaluate('() => KIDS.voice.clips ? Object.keys(KIDS.voice.clips).length : 0')
            rec('⑨ 语音注入', clips >= 6, 'clips=%d' % clips)
            # ⑩ 点空白零惩罚+首错不圈：种档 flat1（跳教学）
            await page.evaluate("""() => {
                const sv = KIDS._save();
                sv.levels['1-0'] = {stars:3};
                sv.spotdiff = sv.spotdiff || {}; sv.spotdiff.tutSeen = true;
                KIDS.store.persist();
            }""")
            await page.reload(); await page.wait_for_timeout(700)
            blank = await page.evaluate("""() => {
                const svg = document.querySelector('#pic-bottom svg');
                const q = SPD.quiz;
                // 距全部差异 >=220vb 的远点
                for (let y = 30; y < 440; y += 16) for (let x = 20; x < 780; x += 16) {
                    if (q.diffs.every(d => Math.hypot(d.x-x, d.y-y) > 150)) {
                        const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
                        const p = pt.matrixTransform(svg.getScreenCTM());
                        return [p.x, p.y];
                    }
                }
                return null;
            }""")
            m1 = None
            if blank:
                await page.mouse.click(blank[0], blank[1])
                await page.wait_for_timeout(400)
                m1 = await page.evaluate('() => ({ misses: SPD.currentLevel.misses, found: SPD.quiz.found.filter(Boolean).length })')
            rec('⑩ 点空白零惩罚', m1 is not None and m1['misses'] == 1 and m1['found'] == 0, json.dumps(m1))

        if GAME == 'connect':
            # ⑧ 教学看阶段吞输入（r6：教学期题不推进）
            sw = await page.evaluate('() => { const c = CON.currentLevel; return {qIdx: c.qIdx, done: c.done}; }')
            await page.evaluate('() => CON.dragTo(CON.quiz.left, CON.quiz.need[0])')
            await page.wait_for_timeout(400)
            sw2 = await page.evaluate('() => ({qIdx: CON.currentLevel.qIdx, busy: CON.busy})')
            rec('⑧ 教学看阶段吞输入', sw['qIdx'] == 0 and sw2['qIdx'] == 0, json.dumps(sw2))
            # ② 教学走完后真实 PointerEvent 拖线通关（r6 逐题制：按 quiz.need 连；set 题 part 后推进）
            await page.wait_for_timeout(15000)
            won, links = False, 0
            for _ in range(12):
                q = await page.evaluate('() => CON.quiz')
                if not q: break
                target = q['qIdx']
                for f in q['need']:
                    if f in q['linked']: continue
                    ok = await page.evaluate("""([a, b]) => {
                        const ca = document.querySelector('.acard[data-lib="' + a + '"]');
                        const cf = document.querySelector('.fcard[data-lib="' + b + '"]');
                        if (!ca || !cf) return false;
                        const ra = ca.getBoundingClientRect(), rf = cf.getBoundingClientRect();
                        const ax = ra.left + ra.width/2, ay = ra.top + ra.height/2;
                        const fx = rf.left + rf.width/2, fy = rf.top + rf.height/2;
                        const ev = (t, x, y) => new PointerEvent(t, {bubbles:true, composed:true, pointerId:7, isPrimary:true, clientX:x, clientY:y});
                        const stage = document.getElementById('stage');
                        ca.dispatchEvent(ev('pointerdown', ax, ay));
                        stage.dispatchEvent(ev('pointermove', (ax+fx)/2, (ay+fy)/2));
                        stage.dispatchEvent(ev('pointermove', fx, fy));
                        stage.dispatchEvent(ev('pointerup', fx, fy));
                        return true;
                    }""", [q['left'], f])
                    if ok:
                        links += 1
                        await page.wait_for_timeout(800)   # part 锁窗 560ms
                await page.wait_for_function(
                    "() => { const c = CON.currentLevel; return c.done || c.qIdx > %d; }" % target, timeout=12000)
                c = await page.evaluate('() => CON.currentLevel')
                if c['done'] or c['won']: won = True; break
            rec('② 真实拖线通关', won, 'links=%d' % links)
            clips = await page.evaluate('() => KIDS.voice.clips ? Object.keys(KIDS.voice.clips).length : 0')
            rec('⑨ 语音注入', clips >= 19, 'clips=%d' % clips)
            # ⑩ 零惩罚+首错不pulse（r6 审查 M-2 补——原缺项被双 viewport rec 巧合凑满 10/10 掩盖；
            #    flat5 set 题错连干扰两次：首错 qIdx 不推进+pulse=0，二错 pulse>=1）
            await page.evaluate('CON.start(5)')
            await page.wait_for_timeout(400)
            q10 = await page.evaluate('() => CON.quiz')
            if q10:
                wrong_f = next((f for f in range(14) if f not in q10['need']), None)
                await page.evaluate('(f) => CON.dragTo(CON.quiz.left, f)', wrong_f)
                await page.wait_for_timeout(700)
                s1 = await page.evaluate('() => ({ pulses: document.querySelectorAll(".pulse").length, qIdx: CON.currentLevel.qIdx, misses: CON.currentLevel.misses })')
                await page.evaluate('(f) => CON.dragTo(CON.quiz.left, f)', wrong_f)
                await page.wait_for_timeout(700)
                s2 = await page.evaluate('() => ({ pulses: document.querySelectorAll(".pulse").length })')
                rec('⑩ 零惩罚+首错不pulse',
                    s1['qIdx'] == 0 and s1['misses'] == 1 and s1['pulses'] == 0 and s2['pulses'] >= 1,
                    json.dumps({'一错': s1, '二错': s2}, ensure_ascii=False))
            else:
                rec('⑩ 零惩罚+首错不pulse', False, 'quiz=null')

        # ③④ 双 viewport / 离线
        for vp in VP:
            await page.set_viewport_size(vp)
            await page.wait_for_timeout(400)
            m = await page.evaluate("""() => {
                const de = document.documentElement;
                const http = (de.outerHTML.match(/src=["']https?:|href=["']https?:/g) || []).length;
                return { overflowX: de.scrollWidth - de.clientWidth, http: http };
            }""")
            rec('③ overflowX=%s(%dx%d)' % (m['overflowX'], vp['width'], vp['height']), m['overflowX'] <= 0)
            rec('④ 离线断言', m['http'] == 0, 'httpRef=%d' % m['http'])
        hook_ok = await page.evaluate('(h) => { const o = window[h]; return !!(o && "currentLevel" in o && "quiz" in o && "autoSolve" in o); }', HOOK)
        rec('⑥ 钩子齐全', hook_ok, HOOK)
        rec('⑦ 0 pageerror', len(errs) == 0, str(errs[:2]))

        # ⑤ 截图像素非空白
        await page.set_viewport_size(VP[0])
        await page.wait_for_timeout(400)
        shot = DIR_BASE + '/shots/_vo1_' + GAME + '.png'
        await page.screenshot(path=shot)
        from PIL import Image
        im = Image.open(shot).convert('L')
        sd = statistics.pstdev(list(im.getdata())[::37])
        rec('⑤ 截图非空白', sd > 8, 'stdev=%.1f' % sd)

        await ctx.close()
        await browser.close()

    n = sum(1 for _, ok in results if ok)
    print('RESULT %s %d/%d' % (GAME, n, len(results)))
    sys.exit(0 if n == len(results) else 1)

asyncio.run(main())
