# -*- coding: utf-8 -*-
"""r29 家族修复（m2+P2-1）真实页行为实证：错态→真实 resize 刷新→.wrong 保留 + .circled 清除；
新题切换→三态（.wrong/.dimmed/.circled）全空；答对演出窗内 .circled 仍在场（修复不伤演出）。
真实页（非 verify=1，SPEED=1 真实时序）+ 真实鼠标点击 + 真实 viewport resize。
独立 chromium 无头，绝不杀任何浏览器进程。"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

MUTE = "(() => { const P = Audio.prototype.play; Audio.prototype.play = function(){ setTimeout(()=>{ try{ this.dispatchEvent(new Event('ended')); }catch(e){} }, 1500); return P.call(this); }; Audio.prototype.pause = function(){}; })()"
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')

def seed(done_flats=()):
    save = {'v': '1.0', 'game': 'compare', 'firstDay': OLD, 'lastDay': TODAY,
            'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: 30},
            'settings': {'sound': False, 'tts': False, 'vol': 0},
            'restTip': {'day': '', 'shown': 0}, 'cmp': {'tutSeen': True}}
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_compare", ' + json.dumps(json.dumps(save)) + ')'

R = []
def check(name, ok, detail=''):
    R.append((name, ok))
    print('[%s] %s | %s' % ('PASS' if ok else 'FAIL', name, detail))

# DOM 状态查询（真实 DOM，零实现复用）
ST_GROUP = """() => {
  const gs = [...document.querySelectorAll('#duel .group')];
  return { wrong: gs.filter(g => g.classList.contains('wrong')).length,
           circled: gs.filter(g => g.classList.contains('circled')).length,
           pop: gs.filter(g => g.classList.contains('pop')).length,
           dimmed: gs.filter(g => g.classList.contains('dimmed')).length,
           nGroups: gs.length };
}"""
ST_SYM = """() => [...document.querySelectorAll('#symbols .sym')].map(b => ({
  s: b.dataset.s, wrong: b.classList.contains('wrong'),
  right: b.classList.contains('right'), pulse: b.classList.contains('pulse') }))"""
TRI_WRONG = """(pos) => !!document.querySelector('.group.tri[data-pos="' + pos + '"].wrong')"""

with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= 面 1：符号题（flat0 dch1 全符号题=相邻转换面）=================
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE)
    ctx.add_init_script(seed())
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)

    q0 = pg.evaluate('CMP.quiz')
    wsym = '<' if q0['answer'] != '<' else '>'
    pg.click('.sym[data-s="%s"]' % wsym)          # 真实点击：首错（晃+灰）
    pg.wait_for_timeout(900)
    st = pg.evaluate(ST_SYM)
    check('B1 符号首错灰态在场', any(x['s'] == wsym and x['wrong'] for x in st) and
          sum(1 for x in st if x['wrong']) == 1, str(st))

    pg.set_viewport_size({'width': 1000, 'height': 680})   # 真实 resize → renderQuiz 刷新
    pg.wait_for_timeout(600)
    st = pg.evaluate(ST_SYM)
    g = pg.evaluate(ST_GROUP)
    cl = pg.evaluate('CMP.currentLevel')
    check('B2 resize 刷新后 .wrong 保留 + .circled 不在场',
          any(x['s'] == wsym and x['wrong'] for x in st) and g['circled'] == 0 and
          cl['retries'] == 1 and cl['step'] == 0,
          'sym=%s group=%s' % (st, g))
    again = pg.evaluate('(s) => CMP.pick(s)', wsym)
    check('B3 模型对齐：已错符号重点=again', again == 'again', 'pick=%r' % again)

    pg.click('.sym[data-s="%s"]' % q0['answer'])  # 真实点击答对 → 下一题（相邻符号转换=P2-1 面）
    pg.wait_for_timeout(800)                      # 演出窗中段：飞入 470ms 已过、980ms 停留未完
    gmid = pg.evaluate(ST_GROUP)
    check('B4a 答对演出窗内 .circled 在场（修复不伤演出）', gmid['circled'] == 2, str(gmid))
    pg.wait_for_timeout(2400)                     # 470+980+渲染余量
    g = pg.evaluate(ST_GROUP)
    st = pg.evaluate(ST_SYM)
    cl = pg.evaluate('CMP.currentLevel')
    slot = pg.evaluate('(document.getElementById("slot") || {textContent: null}).textContent')
    check('B4b 新题上屏三态全空（.wrong/.dimmed/.circled 零残留）',
          cl['step'] == 1 and g['circled'] == 0 and g['pop'] == 0 and g['dimmed'] == 0 and
          g['wrong'] == 0 and all(not x['wrong'] and not x['right'] and not x['pulse'] for x in st) and
          slot == '?', 'step=%s group=%s slot=%r' % (cl['step'], g, slot))
    check('B5 符号面 0 pageerror', not errs, str(errs[:2]))
    ctx.close()

    # ================= 面 2：三卡题（flat10 dch3 tri=renderTriQuiz 重建面）=================
    errs2 = []
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE)
    ctx.add_init_script(seed(done_flats=range(10)))
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs2.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function('window.CMP && CMP.currentLevel', timeout=8000)
    tri_q = None
    for _ in range(5):                            # 真实点击推进到首个 tri
        q = pg.evaluate('CMP.quiz')
        if q and q['mode'] == 'tri':
            tri_q = q
            break
        if q['mode'] in ('tri', 'near'):
            pg.click('.group.tri[data-pos="%d"]' % q['answer'])
        else:
            pg.click('.sym[data-s="%s"]' % q['answer'])
        pg.wait_for_timeout(2400)
    check('T0 到达 tri 题（flat10）', tri_q is not None, 'mode=%s' % (tri_q and tri_q['mode']))
    if tri_q:
        wp = next(i for i in range(3) if i != tri_q['answer'])
        pg.click('.group.tri[data-pos="%d"]' % wp)   # 真实点击：错选卡（晃+灰零惩罚）
        pg.wait_for_timeout(900)
        check('T1 tri 错卡灰态在场', pg.evaluate(TRI_WRONG, wp), 'wp=%d' % wp)
        pg.set_viewport_size({'width': 1000, 'height': 680})   # 真实 resize → renderTriQuiz 重建
        pg.wait_for_timeout(600)
        g = pg.evaluate(ST_GROUP)
        cl = pg.evaluate('CMP.currentLevel')
        check('T2 resize 重建后 .wrong 保留 + 演出态不在场',
              pg.evaluate(TRI_WRONG, wp) and g['circled'] == 0 and g['dimmed'] == 0 and
              g['wrong'] == 1 and cl['step'] == tri_q['step'] and cl['retries'] == 1,
              'group=%s step=%s/%s' % (g, cl['step'], tri_q['step']))
        again = pg.evaluate('(i) => CMP.pickPos(i)', wp)
        check('T3 模型对齐：已错卡重点=again', again == 'again', 'pickPos=%r' % again)
        pg.click('.group.tri[data-pos="%d"]' % tri_q['answer'])   # 真实点击答对 → 推进
        pg.wait_for_timeout(2200)
        g = pg.evaluate(ST_GROUP)
        cl = pg.evaluate('CMP.currentLevel')
        check('T4 答对推进后重建零残留（三态全空）',
              cl['step'] == tri_q['step'] + 1 and g['circled'] == 0 and g['dimmed'] == 0 and
              g['wrong'] == 0, 'group=%s step=%s→%s' % (g, tri_q['step'], cl['step']))
    check('T5 三卡面 0 pageerror', not errs2, str(errs2[:2]))
    ctx.close()
    b.close()

npass = sum(1 for _, ok in R if ok)
print('\nBEHAVIOR %d/%d %s' % (npass, len(R), 'ALL PASS' if npass == len(R) else 'HAS FAIL'))
sys.exit(0 if npass == len(R) else 1)
