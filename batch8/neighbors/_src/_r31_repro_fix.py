# -*- coding: utf-8 -*-
"""r31 修复行为验证（可复跑归档）——审查 M1/M3 修复的浏览器内行为实证（真实页 SPEED=1）
a) M1-dualA：flat15（dualA n17 s18 hidden[15]，s=18 亮牌房）miss2 触发 demoDualJump
   演示——演示窗内轮询采样+收尾断言：s 房 plate 恒显 '18' 不被写 '·'（修复前揭示段后
   无条件复盲写 '·'，采样尾点即红）+reveal 类曾加→去+aria 恒「18 号房子」；
   演示后答对（dualJump 答对演出）通关后 s 房同断言（关末不重建街）
b) M1-dualB：flat17（dualB n13 s15 hidden[15]，s=15 藏牌房）演示——s 房揭示 '15'→
   复盲 '·' 往返正确（现行为保留）
c) M3 判别力自证：守约腿（复刻 _selftest 2d2 前段+挂 queue hook+13s 静置——r31② 修：
   12s 计数点恰落在救援 tick (T0+14,T0+15] 窗界，~30% 轮询相位假红；13s 留 >600ms 余量）
   断言救援触发 n≥1；违约腿（演示收尾时刻 ~1890ms 注入一次 lastAct 刷新=dispatch 兔兔
   pointerdown 真实点击，等效 monkey-patch「演示收尾刷钟」）同 12s 窗断言救援不触发
   n==0——两腿一绿一红=窗口对「演示收尾刷钟」违约有判别力（原 16.5s 窗两假设皆绿）
MUTE/种档：与 _selftest.py 同源（定稿 MUTE_INIT+preset_save，r19 双保险）。
用法: python _r31_repro_fix.py   （先 build.py 重建 index.html）
"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _selftest import MUTE_INIT, preset_save, click_plate, quiz_of  # noqa: E402

URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def new_ctx(browser, flats):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE_INIT)
    ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(flats), bonus=30))
    return ctx


def reach_dual(pg):
    """推进到 qi4=dual 题（4 题真实点击答对），返回 dual quiz"""
    for _ in range(4):
        q = quiz_of(pg)
        if not q:
            return None
        click_plate(pg, q['options'].index(q['answer']))
        pg.wait_for_timeout(1400)
    return quiz_of(pg)


def wrong_twice(pg, qd):
    """dual 题连错 2 次（真实点击）触发 miss≥2 支架演示；返回 miss2 点击时刻的页面相对钟"""
    wrongs = [i for i, v in enumerate(qd['options']) if v != qd['answer']]
    click_plate(pg, wrongs[0]); pg.wait_for_timeout(600)
    click_plate(pg, wrongs[1])


def sample_s(pg, s_n, times=8, gap=120):
    """演示窗内轮询采样 s 房状态（先等 900ms 到 ref jump 段，采样覆盖 s 揭示窗 [1070,1890]ms）"""
    pg.wait_for_timeout(900)
    out = []
    for k in range(times):
        out.append(pg.evaluate('''(n) => {
            const h = document.querySelector('.house[data-n="' + n + '"]');
            return {p: h ? h.querySelector('.plate').textContent : 'gone',
                    r: h ? h.classList.contains('reveal') : false};
        }''', s_n))
        if k < times - 1:
            pg.wait_for_timeout(gap)
    return out


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        errors = []

        # ---- a) M1-dualA：flat15 演示全程+收尾+aria+通关后 ----
        ctx = new_ctx(browser, 15)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append('a: ' + str(e)))
        pg.goto(URL)
        pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
        qd = reach_dual(pg)
        check('a: reached dualA at flat15 qi4', qd and qd['mode'] == 'dualA' and qd['s'] == 18
              and qd['hidden'] == [15], str(qd)[:120])
        aria0 = pg.evaluate('''() => document.querySelector('.house[data-n="18"]').getAttribute('aria-label')''')
        wrong_twice(pg, qd)
        samples = sample_s(pg, qd['s'])
        plates = [s['p'] for s in samples]
        check('a: demo window — s(18) plate stays "18" all samples (never written to dot)',
              all(x == '18' for x in plates), str(plates))
        check('a: demo window — s(18) reveal class was added (highlight-only for lit house)',
              any(s['r'] for s in samples),
              'reveal hits=%d/%d' % (sum(1 for s in samples if s['r']), len(samples)))
        pg.wait_for_timeout(700)                     # 演示收尾后（~2600ms）
        tail = pg.evaluate('''() => {
            const h = document.querySelector('.house[data-n="18"]');
            return {p: h.querySelector('.plate').textContent, r: h.classList.contains('reveal'),
                    aria: h.getAttribute('aria-label')};
        }''')
        check('a: after demo — s(18) plate "18" + reveal removed + aria unchanged',
              tail['p'] == '18' and not tail['r'] and tail['aria'] == '18 号房子' == aria0, str(tail))
        click_plate(pg, qd['options'].index(qd['answer']))   # 演示后答对（dualJump 答对演出）
        pg.wait_for_timeout(2600)                    # 1790ms 演出窗+余量 → winFlow
        fin = pg.evaluate('''() => {
            const h = document.querySelector('.house[data-n="18"]');
            return {done: NEB.currentLevel.done, won: NEB.currentLevel.won,
                    p: h.querySelector('.plate').textContent, r: h.classList.contains('reveal'),
                    aria: h.getAttribute('aria-label')};
        }''')
        check('a: after win (dualJump) — level done + s(18) still lit "18" (street kept, no leak)',
              fin['done'] and fin['won'] and fin['p'] == '18' and not fin['r']
              and fin['aria'] == '18 号房子', str(fin))
        ctx.close()

        # ---- b) M1-dualB：flat17 演示揭示→复盲往返 ----
        ctx = new_ctx(browser, 17)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append('b: ' + str(e)))
        pg.goto(URL)
        pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
        qd = reach_dual(pg)
        check('b: reached dualB at flat17 qi4', qd and qd['mode'] == 'dualB' and qd['s'] == 15
              and qd['hidden'] == [15], str(qd)[:120])
        wrong_twice(pg, qd)
        samples = sample_s(pg, qd['s'])
        plates = [s['p'] for s in samples]
        check('b: demo window — s(15) hidden house revealed as "15" during window',
              any(x == '15' for x in plates), str(plates))
        check('b: demo window — s(15) reveal class present', any(s['r'] for s in samples))
        pg.wait_for_timeout(700)
        tail = pg.evaluate('''() => {
            const h = document.querySelector('.house[data-n="15"]');
            return {p: h.querySelector('.plate').textContent, r: h.classList.contains('reveal')};
        }''')
        check('b: after demo — s(15) re-blinded to dot (round-trip intact)',
              tail['p'] == chr(183) and not tail['r'], str(tail))
        ctx.close()

        # ---- c) M3 判别力自证：守约 13s 触发 vs 违约（注入刷钟）12s 不触发 ----
        def rescue_leg(tag, violate, watch=12000):
            ctx = new_ctx(browser, 15)
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(tag + ': ' + str(e)))
            pg.goto(URL)
            pg.wait_for_function('window.NEB && NEB.currentLevel', timeout=8000)
            qd = reach_dual(pg)
            wrong_twice(pg, qd)
            if violate:
                # 演示收尾时刻（miss2 后 650+420+820=1890ms）注入 lastAct 刷新：
                # 兔兔真实 pointerdown（合法用户动作路径刷 lastAct）=等效「演示收尾刷钟」违约态
                pg.wait_for_timeout(1900)
                pg.locator('#btn-rabbit').dispatch_event('pointerdown')
            pg.wait_for_timeout(500)                 # 对齐 selftest 2d2 挂 hook 位（演示收尾后）
            pg.evaluate('''() => {
                window.__vlog = [];
                const _q = KIDS.voice.queue.bind(KIDS.voice);
                KIDS.voice.queue = (a) => { window.__vlog.push('Q:' + a.join(',')); return _q(a); };
            }''')
            pg.wait_for_timeout(watch)               # 守约腿 13s（r31②：12s 计数点恰在救援 tick (T0+14,T0+15] 窗界 ~30% 相位假红，13s 留 >600ms 余量）；违约腿 12s 同 _selftest 2d2 判别窗
            rescue = pg.evaluate('''() => window.__vlog.filter(x => x.startsWith('Q:') &&
                x.split(',').some(pp => pp === 'neb_q1' || pp === 'neb_q2' || pp === 'neb_q4' ||
                    pp === 'neb_qp2' || pp === 'neb_qm2' || pp === 'neb_dual_a' || pp === 'neb_dual_b')).length''')
            ctx.close()
            return rescue

        good = rescue_leg('c-good', violate=False, watch=13000)
        check('c: compliant leg — rescue fired within 13s window (n>=1)',
              good >= 1, 'n=%d' % good)
        bad = rescue_leg('c-bad', violate=True)
        check('c: violating leg (lastAct refresh at demo end) — rescue NOT fired in 12s window (n==0)',
              bad == 0, 'n=%d' % bad)
        check('c: window discriminates (compliant 13s green / violating 12s red)',
              good >= 1 and bad == 0, 'good=%d bad=%d' % (good, bad))
        browser.close()

    check('zero pageerror across all legs', not errors, str(errors[:2]))
    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== REPRO-FIX %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
