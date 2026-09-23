# -*- coding: utf-8 -*-
"""r30 fix 三 major 修复复现脚本（2026-09-21 归档可复跑）
M1 演出互斥：盲飞 dual 题 miss2 解锁→650ms 后 demoDual 开演→演出中（约 1s 处）点对答案→
   断言 autoFly 恰两场（demo+verify）、场上飞来虫=flyIn（c，非 2c）、终态场上剩=answer
M2 dual 解锁后点虫不走引擎：miss2 解锁后 tapBug→断言返回 false、无放飞（wig 摆动、无 .fly
   无 badge、flyCount=0）、场上动物数不变（引擎放飞会把场上剩钉在中间态 s——引向错误答案）
M3 重入防护：c1 答对演出窗内真实点 replayBtn→断言重玩被拦（关卡未重建，step 推进正常）；
   c2 autoFly 进行中强制重建关（startLevel，模拟一切非 UI 重建入口）→断言身份守卫丢弃旧续体
   （新关 DOM 无幽灵 badge/gone/fly/infly）；c3 won 后 replay 放行（日末关闭后重玩既有通路保留）
用法: python _r30_repro_fix.py   （对象=../index.html 已构建产物）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []

# MUTE 静音双保险之一：页面级 init_script（r28 定稿 function 版，与 _selftest.py 同源）
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(done_flats=()):
    save = {'v': '1.0', 'game': 'subbug', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: 30},
            'settings': {'sound': False, 'tts': False, 'vol': 0},
            'restTip': {'day': '', 'shown': 0}, 'sub': {'tutSeen': True}}
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_subbug", ' + json.dumps(json.dumps(save)) + ')'


def open_flat15(browser, tag):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE_INIT)
    ctx.add_init_script(preset_save(range(15)))
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
    lv = pg.evaluate('SUB.currentLevel')
    assert lv and lv['flat'] == 15 and lv['dch'] == 4, 'flat15 开局失败: %s' % lv
    return ctx, pg, errs


def to_quiz1_dual(pg):
    """答掉 quiz0（一步题，含 autoFly 演出）推进到 quiz1=dual A"""
    q0 = pg.evaluate('SUB.quiz')
    pg.evaluate('SUB.pick(%d)' % q0['answerIdx'])       # evaluate 自动 await 演出全程
    q1 = pg.evaluate('SUB.quiz')
    assert q1 and q1['type'] == 'dual' and q1['form'] == 'A', 'quiz1 非 dual A: %s' % str(q1)[:80]
    return q1


def miss2_unlock(pg, q1):
    """dual 题连错两次（中间态 s + 另一错项）解锁救援支架"""
    sidx = q1['items'].index(q1['s'])
    d2idx = next(i for i, v in enumerate(q1['items']) if i != q1['answerIdx'] and i != sidx)
    pg.evaluate('SUB.pick(%d)' % sidx)
    pg.evaluate('SUB.pick(%d)' % d2idx)
    u = pg.evaluate('[SUB.quiz.assist, SUB.currentLevel.retries]')
    assert u == [True, 2], 'miss2 未解锁: %s' % u


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ================= a) M1 演出互斥：演出中点对，场上飞来虫=c 非 2c、终态剩=answer =================
            ctx, pg, errs = open_flat15(browser, 'M1')
            q1 = to_quiz1_dual(pg)
            af0 = pg.evaluate('window.__autoFlyN || 0')
            miss2_unlock(pg, q1)
            pg.wait_for_function('(window.__autoFlyN || 0) > %d' % af0, timeout=8000)   # 650ms 后 demo 开演
            pg.wait_for_timeout(1000)               # 演出中（约 1s 处，A 型正在逐只放飞 b）
            pg.evaluate('() => { SUB.pick(%d); }' % q1['answerIdx'])   # fire-and-forget：演出中点对 → M1 等 demoP 收尾再起 verify autoFly
            # 终态锚=verify autoFly 的飞来段开始（autoFlyN===af0+2 且 infly>0——demo 的 infly 已被
            # verify autoFly 入场清掉，此刻起场上 infly 全部来自 verify 自身）；A 型先放后飞来，
            # 命中后再等 650ms=飞来 4 只落齐（4×170ms）+进入尾停顿 520ms 窗，单次 evaluate 抓终态快照
            pg.wait_for_function("""() => (window.__autoFlyN || 0) === %d &&
                document.querySelectorAll('.animal.infly').length > 0""" % (af0 + 2), timeout=15000)
            pg.wait_for_timeout(650)
            snap = pg.evaluate("""() => ({
                infly: document.querySelectorAll('.animal.infly').length,
                visible: document.querySelectorAll('.animal[data-k="b"]:not(.gone)').length,
                breathe: document.querySelectorAll('.animal.breathe').length})""")
            af1 = pg.evaluate('window.__autoFlyN || 0')
            check('M1: autoFly exactly 2 shows (demo + verify, no overlap dup)',
                  af1 == af0 + 2, 'autoFly %d -> %d' % (af0, af1))
            check('M1: flown-in bugs = flyIn (%d), not 2x' % q1['flyIn'],
                  snap['infly'] == q1['flyIn'], 'infly=%s expect=%s' % (snap['infly'], q1['flyIn']))
            check('M1: field remainder == answer (%d) — verify-as-you-show intact' % q1['answer'],
                  snap['visible'] == q1['answer'],
                  'visible=%s expect=%s (n=%s b=%s c=%s)' % (snap['visible'], q1['answer'], q1['n'], q1['b'], q1['c']))
            pg.wait_for_function('SUB.quiz === null || SUB.quiz.step > 1', timeout=15000)   # pick 正常走完换题
            check('M1: right-pick completes and advances (step>1)', True)
            ctx.close()

            # ================= b) M2 dual 解锁后点虫=inert，不走引擎放飞 =================
            # （flat15 qi1=A 型 b=4/c=4：650ms 后 demo 自动演一遍故事，收尾时场上带 4 角标+4 gone+4 infly
            #  ——故 M2 断言取相对口径：tapBug 前后场上状态零变化；点的虫=第 b+1 只（前 b 只已被 demo 放飞））
            ctx, pg, errs = open_flat15(browser, 'M2')
            q1 = to_quiz1_dual(pg)
            miss2_unlock(pg, q1)
            pg.wait_for_timeout(3300)               # 650ms 延迟 + ~2300ms 演出 + 余量：demo 收尾
            i0 = q1['b']                            # 虫 0..b-1 已被 demo 放飞（gone），虫 b 未飞
            st0 = pg.evaluate("""() => ({
                animals: document.querySelectorAll('.animal').length,
                fly: document.querySelectorAll('.animal.fly').length,
                badge: document.querySelectorAll('.badge.on').length,
                fc: SUB.currentLevel.flyCount})""")
            r = pg.evaluate('SUB.tapBug(%d)' % i0)
            pg.wait_for_timeout(300)
            st = pg.evaluate("""() => ({
                animals: document.querySelectorAll('.animal').length,
                fly: document.querySelectorAll('.animal.fly').length,
                badge: document.querySelectorAll('.badge.on').length,
                fc: SUB.currentLevel.flyCount,
                wig: document.querySelector('.animal[data-k="b"][data-i="%d"]').classList.contains('wig')})""" % i0)
            check('M2: tapBug on unlocked dual returns false (no engine fly)',
                  r is False, 'tapBug=%s' % r)
            check('M2: field state unchanged by tap (no new fly/badge/count), bug wiggles',
                  st['animals'] == st0['animals'] and st['fly'] == st0['fly'] and
                  st['badge'] == st0['badge'] and st['fc'] == st0['fc'] and st['wig'],
                  'animals=%s->%s fly=%s->%s badge=%s->%s fc=%s->%s wig=%s' %
                  (st0['animals'], st['animals'], st0['fly'], st['fly'],
                   st0['badge'], st['badge'], st0['fc'], st['fc'], st['wig']))
            ctx.close()

            # ================= c) M3 重入防护 =================
            ctx, pg, errs = open_flat15(browser, 'M3')
            # c1: 答对演出窗内（right 880ms 窗）真实点 replayBtn → 重玩被拦（关卡未重建）
            q0 = pg.evaluate('SUB.quiz')
            pg.evaluate('() => { SUB.pick(%d); }' % q0['answerIdx'])   # fire-and-forget：不 await 演出
            pg.wait_for_timeout(300)                # 处于 right 停留窗（880ms 内）且 locked
            pg.click('#btn-replay')                 # 真实点击重玩
            pg.wait_for_timeout(1600)               # 过完 right 窗 + autoFly 前半
            st = pg.evaluate('[SUB.currentLevel.step, SUB.currentLevel.retries, SUB.currentLevel.flat]')
            check('M3c1: replay during right/autoFly window blocked (level not rebuilt)',
                  st == [1, 0, 15], 'step/retries/flat=%s (rebuilt would be [0,0,15])' % st)
            pg.wait_for_function('SUB.quiz === null || SUB.quiz.step > 0', timeout=15000)  # 收尾
            # c2: autoFly 进行中强制重建关（一切非 replay 门入口）→ 身份守卫丢弃旧续体，新关无幽灵态
            pg.evaluate('() => { SUB.pick(SUB.quiz.answerIdx); }')     # quiz1 演出起跑（fire-and-forget）
            pg.wait_for_timeout(1200)               # autoFly 放飞循环中段
            pg.evaluate('startLevel(15)')           # 强制重建（旧 cur 引用即刻失效）
            pg.wait_for_timeout(2500)               # 旧续体在后续 await 醒来 → cur!==run → return
            st = pg.evaluate("""() => ({step: SUB.currentLevel.step,
                badge: document.querySelectorAll('.badge.on').length,
                gone: document.querySelectorAll('.animal.gone').length,
                fly: document.querySelectorAll('.animal.fly').length,
                infly: document.querySelectorAll('.animal.infly').length})""")
            check('M3c2: stale autoFly coroutine dropped by run-guard (clean rebuilt field)',
                  st == {'step': 0, 'badge': 0, 'gone': 0, 'fly': 0, 'infly': 0}, str(st))
            # c3: won 后 replay 放行（日末关闭后停留已通关关卡的既有重玩通路，回归保护）
            pg.evaluate('SUB.autoSolve()')
            pg.wait_for_function('SUB.currentLevel.won === true', timeout=30000)
            pg.evaluate("""() => document.getElementById('btn-replay')
                .dispatchEvent(new Event('pointerdown'))""")          # won 态（弹层覆盖，JS 派发等价）
            pg.wait_for_timeout(200)
            st = pg.evaluate('[SUB.currentLevel.step, SUB.currentLevel.flat, SUB.currentLevel.won]')
            check('M3c3: replay after won still allowed (level rebuilt at same flat)',
                  st == [0, 15, False], 'step/flat/won=%s' % st)
            check('M3: zero pageerror across M3 paths', not errs, str(errs[:2]))
            ctx.close()
        finally:
            browser.close()

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== REPRO-FIX %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
