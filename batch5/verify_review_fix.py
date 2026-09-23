# -*- coding: utf-8 -*-
"""batch5 反方审查修复定向实证：
M1 countchick 教学"看"阶段演示点数角标真实出现（修前被 locked 门整段吞掉=零演示）
M2 connect 双指两动物卡不残留孤儿拖线（修前 A 线永久残留）
m2 countchick 章 4 干扰动物 2-4 区间（修前恒 4）
m8 spotdiff move 类差异圈画上图原位（修前圈空地）
独立 chromium.launch 无头。"""
import asyncio, io, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.async_api import async_playwright

BASE = 'file:///F:/claudecode/projects/active/kids-games/batch5'
results = []

def rec(name, ok, detail=''):
    results.append((name, ok))
    print(('PASS' if ok else 'FAIL'), name, detail)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # M1：教学看阶段角标采样
        ctx = await browser.new_context(viewport={'width': 800, 'height': 1180})
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(BASE + '/countchick/index.html')
        max_badges = 0
        for _ in range(20):                      # 教学"看"演示约 5-9s，500ms 轮询采样角标峰值
            n = await page.evaluate("() => document.querySelectorAll('.badge.on').length")
            max_badges = max(max_badges, n)
            tut = await page.evaluate('() => CHK.tutorial')
            if tut != 'watch': break
            await page.wait_for_timeout(500)
        rec('M1 教学看阶段演示角标出现', max_badges >= 1, '峰值角标=%d errs=%d' % (max_badges, len(errs)))

        # m2：count 混干扰动物 2-4 区间（r19 后干扰随 mix 章移至 dch2=flat5-9，多种档多关统计）
        await page.evaluate("""() => {
            const sv = KIDS._save();
            for (let f = 0; f < 15; f++) sv.levels[(Math.floor(f/5)+1)+'-'+(f%5)] = {stars:3};
            sv.chk = sv.chk || {}; sv.chk.tutSeen = true;
            KIDS.store.persist();
        }""")
        await page.reload(); await page.wait_for_timeout(600)
        dist = await page.evaluate("""() => {
            const cnt = {};
            for (let f = 5; f < 10; f++) { const L = genLevel(f); cnt[L.quizzes[0].others.length] = (cnt[L.quizzes[0].others.length]||0)+1; }
            return cnt;
        }""")
        vals = [int(k) for k in dist]
        rec('m2 章2干扰动物区间2-4', all(2 <= v <= 4 for v in vals) and len(vals) >= 1, json.dumps(dist))
        await ctx.close()

        # M2：connect 双指残留
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await ctx.new_page()
        errs2 = []
        page.on('pageerror', lambda e: errs2.append(str(e)))
        await page.goto(BASE + '/connect/index.html')
        await page.evaluate("""() => {
            const sv = KIDS._save();
            sv.levels['1-0'] = {stars:3};
            sv.connect = sv.connect || {}; sv.connect.tutSeen = true;
            KIDS.store.persist();
        }""")
        await page.reload(); await page.wait_for_timeout(700)
        r = await page.evaluate("""() => {
            const cards = document.querySelectorAll('.acard');
            const stage = document.getElementById('stage');
            const rc = el => { const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; };
            const [ax, ay] = rc(cards[0]), [bx, by] = rc(cards[1]);
            const [fx, fy] = rc(document.querySelectorAll('.fcard')[0]);
            const ev = (t, x, y, id) => new PointerEvent(t, {bubbles:true, composed:true, pointerId:id, isPrimary:true, clientX:x, clientY:y});
            cards[0].dispatchEvent(ev('pointerdown', ax, ay, 11));       // 手指1 按 A
            cards[1].dispatchEvent(ev('pointerdown', bx, by, 22));       // 手指2 按 B（覆盖 drag 引用）
            stage.dispatchEvent(ev('pointerup', fx, fy, 22));            // B 判定（对错无所谓，线被处理）
            stage.dispatchEvent(ev('pointerup', fx, fy, 11));            // A 抬起：drag 已 null
            return 'dispatched';
        }""")
        await page.wait_for_timeout(1200)         # 弹回动画 ~180ms 后量
        lines = await page.evaluate("() => document.querySelectorAll('.dragline').length")
        dots = await page.evaluate("() => document.querySelectorAll('.dragdot').length")
        rec('M2 双指不残留孤儿拖线', lines == 0 and dots == 0 and not errs2, 'dragline=%d dragdot=%d errs=%d' % (lines, dots, len(errs2)))
        await ctx.close()

        # m8：spotdiff move 类差异圈画上图原位——找一关含 move 差异，圈后上图 ring 位置==els 原位
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await ctx.new_page()
        await page.goto(BASE + '/spotdiff/index.html')
        await page.wait_for_timeout(500)
        r = await page.evaluate("""() => {
            for (let f = 0; f < 40; f++) {
                const L = genLevel(f);
                const mv = L.diffs.find(d => d.type === 'move');
                if (mv) {
                    const el = L.els[mv.ei];
                    return { flat: f, mv: {x: mv.x, y: mv.y}, orig: {x: el.x, y: el.y}, moved: Math.abs(mv.x - el.x) >= 50 };
                }
            }
            return null;
        }""")
        if r and r['moved']:
            await page.evaluate("""(f) => {
                const sv = KIDS._save();
                for (let i = 0; i < f; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = {stars:3};
                sv.spotdiff = sv.spotdiff || {}; sv.spotdiff.tutSeen = true;
                KIDS.store.persist();
            }""", r['flat'])
            await page.reload(); await page.wait_for_timeout(700)
            rings = await page.evaluate("""() => {
                const q = SPD.quiz;
                const mvIdx = q.diffs.findIndex(d => d.type === 'move');
                SPD.tapDiff(mvIdx);
                const top = document.querySelector('#pic-top svg .rings').children[0];
                const bot = document.querySelector('#pic-bottom svg .rings').children[0];
                return { top: [top.getAttribute('cx'), top.getAttribute('cy')], bot: [bot.getAttribute('cx'), bot.getAttribute('cy')] };
            }""")
            # 上图圈=原位（与下图新位不同），下图圈=新位
            ok = rings['top'] != rings['bot'] and abs(float(rings['top'][0]) - r['orig']['x']) < 1 and \
                 abs(float(rings['top'][1]) - r['orig']['y']) < 1 and \
                 abs(float(rings['bot'][0]) - r['mv']['x']) < 1
            rec('m8 move类上图圈原位', ok, json.dumps({'orig': r['orig'], 'top圈': rings['top'], 'bot圈': rings['bot']}))
        else:
            rec('m8 move类上图圈原位', False, '未找到 move 关或位移不足: %s' % json.dumps(r))
        await ctx.close()
        await browser.close()

    n = sum(1 for _, ok in results if ok)
    print('\nRESULT: %d/%d' % (n, len(results)))
    sys.exit(0 if n == len(results) else 1)

asyncio.run(main())
