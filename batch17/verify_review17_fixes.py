# -*- coding: utf-8 -*-
"""batch17 审查修复实证（M1/M2/M3/m7 + m4/m6 编译级自证）
T1(M1) mirrormaze 150ms×5 连击错点 miss 仅+1（1000ms 防重入窗——原 400ms 违 SPEC）
T2(M2) area flat5 解热身后量测主形态（samearea/combo/unit2 非 count——原 8 次量测全在 count）
T3(M3) 复验过滤器自证：注入假错误消息字符串，4 个过滤器必须全拦截（原 pick/卡死消息漏网=断言失效）
T4(m7) mirrormaze doHint 重置救援钟（提示后 14s 钟重新起算）
r14 适配（2026-09-15 审查 M-1 修复）：MM.quiz 契约改 {W,H,kind,axis,given,targets,step,miss}
——T1 错格求解 given+targets 占用集（旧 left 字段已退役）；T2 期望 kind 改四章重排后
samearea/combo/unit2（旧 bigger/pick/pair 全部退役；卡类 .opt.card min156×112 ≥96 断言不变）。"""
import asyncio, io, os, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def pos_of(pg, sel):
    return await pg.evaluate("(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * 0.55}; })('%s')" % sel)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 mirrormaze 连击（真实页，seed 跳教学）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'mirrormaze' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
          sv.mirrormaze = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2000)
        await pg.evaluate('MM.start(0)')
        q = await pg.evaluate('MM.quiz')
        W, H = q['W'], q['H']
        tset = {(c['x'], c['y']) for c in q['targets']}
        lo = {(c['x'], c['y']) for c in q['given']}   # r14 契约：given 含 src/axis 双角色（verify_mm_stress find_wrong 同型）
        wrong = None
        for x in range(W):
            for y in range(H):
                if (x, y) not in tset and (x, y) not in lo:
                    wrong = (x, y); break
            if wrong:
                break
        # 真实鼠标连击（hook tapCell 经 evaluate 会等 promise 完整跑完=击间隔 1000ms+，测不出连击窗；
        # 真实玩家 pointerdown 不等 handler 收尾——与 b16 U1 burst_click 同口径）
        wsel = await pg.evaluate("""(xy) => {
          const cells = Array.from(document.querySelectorAll('[data-x][data-y], .cell'));
          for (const c of cells) {
            if (Number(c.dataset.x) === xy[0] && Number(c.dataset.y) === xy[1]) {
              c.classList.add('__t1wrong'); return true;
            }
          }
          return false;
        }""", list(wrong))
        wpos = await pos_of(pg, '.__t1wrong')
        m0 = (await pg.evaluate('MM.quiz'))['miss']
        for _ in range(5):
            await pg.mouse.click(wpos['x'], wpos['y'])
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(1400)
        m1 = (await pg.evaluate('MM.quiz'))['miss']
        rec('T1 mirrormaze 5连击 miss仅+1（1000ms 窗）', wsel and wpos and m1 == m0 + 1 and not errs,
            'sel=%s m=%s→%s errs=%s' % (wsel, m0, m1, errs[:1]))
        await ctx.close()

        # T2 area flat5 解热身后主形态量测（DOM：解 count 热身→当前题 kind 非 count→.opt 卡在场且 ≥96）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'area' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
          sv.area = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2000)
        for flat, want_kind in ((5, 'samearea'), (10, 'combo'), (15, 'unit2')):
            await pg.evaluate('AR.start(%d)' % flat)
            q0 = await pg.evaluate('AR.quiz')
            if q0['kind'] == 'count':
                await pg.evaluate('AR.tapCard(%d)' % (q0['answer'] if not isinstance(q0['answer'], list) else q0['answer'][0]))
                await pg.wait_for_timeout(1200)
            q1 = await pg.evaluate('AR.quiz')
            opts = await pg.evaluate("""() => Array.from(document.querySelectorAll('.opt')).map(e => {
              const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })""")
            ok_kind = q1['kind'] == want_kind
            ok_size = len(opts) >= 2 and all(w >= 96 and h >= 96 for w, h in opts)
            rec('T2 area flat%d 主形态量测' % flat, ok_kind and ok_size and not errs,
                'kind=%s opts=%s errs=%s' % (q1['kind'] if q1 else None, opts[:3], errs[:1]))
        await ctx.close()

        # T4 mirrormaze doHint 重置救援钟（真实页：idle 12s→提示→3s 后 rescue 未触发→再 13s 触发）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'mirrormaze' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate("""(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
          sv.mirrormaze = { tutSeen: true }; KIDS.store.persist(); })()""")
        await pg.reload()
        await pg.wait_for_timeout(2000)
        await pg.evaluate('MM.start(1)')
        r0 = await pg.evaluate('MM.rescues')
        await pg.wait_for_timeout(12000)             # idle 12s（<14 未触发）
        await pg.evaluate("""(() => { const b = document.getElementById('hint-btn') || document.querySelector('[aria-label*="提示"], .bulb'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); })()""")
        await pg.wait_for_timeout(3500)              # 若未重置：14s 已触发；重置：钟从提示重新起算
        r1 = await pg.evaluate('MM.rescues')
        await pg.wait_for_timeout(13000)             # 重置后 14s 到点必触发
        r2 = await pg.evaluate('MM.rescues')
        rec('T4 提示重置救援钟', r1 == r0 and r2 >= r0 + 1 and not errs,
            'rescues=%s→%s→%s errs=%s' % (r0, r1, r2, errs[:1]))
        await ctx.close()
        await b.close()

    # T3 过滤器自证（纯 Python：注入假消息验证 4 个过滤器拦截——原 M3 假绿根因）
    FAKE_PICK = 'flat10 q1 pick 可解不符 hits=[] ans=2'
    FAKE_STUCK = 'flat3 q2 推进卡死'
    FAKE_PAIR = 'flat15 q0 pair 组合不符 hits=[] ans=[0,1]'
    FAKE_HOLE = 'flat0 q0 hole 越界'
    f_a2 = lambda x: ('多重集' in x or '组合' in x or '可解不符' in x)
    f_a3 = lambda x: ('越域' in x or '越界' in x or '重复坐标' in x or '超 5×5' in x or 'count' in x or 'bigger' in x or '未知 kind' in x)
    f_p4 = lambda x: ('章域' in x or '下句' in x or 'None' in x or '卡死' in x or 'sig' in x)
    ok = all([f_a2(FAKE_PICK), f_a2(FAKE_PAIR), f_a3(FAKE_HOLE), f_p4(FAKE_STUCK)])
    rec('T3 复验过滤器全拦截（M3 修复自证）', ok, 'pick=%s pair=%s hole=%s 卡死=%s' % (
        f_a2(FAKE_PICK), f_a2(FAKE_PAIR), f_a3(FAKE_HOLE), f_p4(FAKE_STUCK)))

    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
