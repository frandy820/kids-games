# -*- coding: utf-8 -*-
"""batch12 反方审查修复定向实证（M1+m1~m8 共 9 项，读实际产物）
T1 M1 fraction cut 题面全 clip 拼接（无 key:null TTS 段） T2 m1 cmp 错1豁免>=1
T3 m2 read 卡 aria-label 分母在前 T4 m3 column 空档教学零 TypeError
T5 m4 column 演出期黑板/空白 pop T6 m6 lim%5==0 dayEnd 预告不跳章
T7 m7 divide flat≥3 换题自动读题 T8 m8 ch4 余数题黑板定格 ……r
T9 m5 wrong 句 clip 化（div/fra 错点非系统 TTS）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : ('NULL:' + p.key)).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 5)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

async def newpage(b, game, n=None, vp={'width': 1280, 'height': 800}, delay=900, hook_after=False,
                  ch_len=5, bonus=0):
    # r15 契约适配：fraction CH_LEN 5→8（存档 keyOf /8）；日限 bonus 按目标扁号给足——
    # 其余姊妹款仍 /5（本脚本是跨款回归，SEED 按 game 自适应，老断言意图不动）
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / game / 'index.html').as_posix())
    await pg.wait_for_timeout(delay)
    if hook_after:
        await pg.evaluate(HOOK)
    if n is not None:
        await pg.evaluate("""(args) => { const [n, chLen, bonus] = args;
          const sv = KIDS._save() || { levels: {} };
          for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/chLen)+1)+'-'+(i%chLen)] = { stars: 3 };
          sv.GAME = { tutSeen: true };
          if (bonus) KIDS.calendar.bonusSet(bonus);
          KIDS.store.persist(); }""".replace('GAME', game), [n, ch_len, bonus])
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 M1：fraction flat8（r15 扁号：ch2 cut n=3）读题=全 clip 拼接、无 TTS 段
        ctx, pg, errs = await newpage(b, 'fraction', 8, delay=2600, hook_after=False, ch_len=8, bonus=10)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        # 重听题面（hearBtn）或等开场接力
        qcut = False
        for _ in range(24):
            v = await pg.evaluate('window.__vlog')
            if any(x.startswith('Q:fra_q_cut,fra_num_') and x.endswith(',fra_q_cut2') for x in v):
                qcut = True; break
            await pg.wait_for_timeout(1000)
        v = await pg.evaluate('window.__vlog')
        tts_seg = [x for x in v if 'NULL:' in x or x.startswith('T:')]
        rec('T1 M1 cut 题面全 clip 拼接(无TTS段)', qcut and not tts_seg, 'q=%s tts=%s' % (qcut, tts_seg[:2]))
        await ctx.close()

        # T2 m1：cmp 题错 1 次=豁免播 1 次（fra_wrong）+ miss 封顶 1（r15 扁号：ch4=flat24）
        ctx, pg, errs = await newpage(b, 'fraction', 24, delay=2600, ch_len=8, bonus=30)  # ch4 cmp
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(1500)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('FR.quiz')
        if q and q['kind'] != 'cmp':
            for _ in range(8):
                await pg.locator('.card[data-i="%d"]' % q['answerIdx']).first.click(force=True)
                await pg.wait_for_timeout(800)
                q = await pg.evaluate('FR.quiz')
                if not q or q['kind'] == 'cmp': break
        w = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        await pg.locator('.card[data-i="%d"]' % w[0]).first.click(force=True)
        await pg.wait_for_timeout(900)
        st = await pg.evaluate("(() => { const x = FR.quiz; return { miss: x.miss, dead: x.dead.length }; })()")
        wrongPlay = await pg.evaluate("window.__vlog.filter(x => x === 'P:fra_wrong').length")
        rec('T2 m1 cmp 错1豁免>=1', st['miss'] == 1 and st['dead'] == 1 and wrongPlay == 1, 'st=%s wrong=%d' % (st, wrongPlay))
        await ctx.close()

        # T3 m2：read 卡 aria-label 分母在前（2/4 卡=分数 4 分之 2；r15 扁号：ch3=flat16，qi0 即 read 热身）
        ctx, pg, errs = await newpage(b, 'fraction', 16, delay=2600, ch_len=8, bonus=30)
        aria = ''
        for _ in range(10):
            q = await pg.evaluate('FR.quiz')
            if q and q['kind'] == 'read':
                aria = await pg.evaluate("document.querySelector('.card .frac') ? document.querySelectorAll('.card')[0].getAttribute('aria-label') : ''")
                arias = await pg.evaluate("[...document.querySelectorAll('.card')].map(c => c.getAttribute('aria-label') || '')")
                okA = any(a.startswith('分数 ') and len(a.split(' ')) == 4 and int(a.split(' ')[1]) > int(a.split(' ')[3]) for a in arias)
                rec('T3 m2 aria 分母在前', okA, str([a for a in arias if '分数' in a][:2]))
                break
            await pg.locator('.card[data-i="%d"]' % q['answerIdx']).first.click(force=True)
            await pg.wait_for_timeout(900)
        else:
            rec('T3 m2 aria 分母在前', False, '未遇 read 题')
        await ctx.close()

        # T4 m3：column 空档进教学零 TypeError
        ctx, pg, errs = await newpage(b, 'column', None, delay=1200)
        await pg.evaluate('localStorage.clear()')
        await pg.reload()
        await pg.wait_for_timeout(3000)
        tut = await pg.evaluate('CL.tutorial')
        rec('T4 m3 column 空档教学零TypeError', tut == 'watch' and not errs, 'tut=%s errs=%s' % (tut, errs[:1]))
        await ctx.close()

        # T5 m4：column 教学期(demo)点黑板给 pop（吞输入期轻反馈）
        ctx, pg, errs = await newpage(b, 'column', None, delay=1500)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(800)
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        bb = await pg.locator('#bb').first.bounding_box()
        if bb:
            await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + 10)
        await pg.wait_for_timeout(500)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        tut = await pg.evaluate('CL.tutorial')
        rec('T5 m4 教学期黑板点击 pop', tut == 'watch' and pops1 > pops0, 'tut=%s pops %d->%d' % (tut, pops0, pops1))
        await ctx.close()

        # T6 m6：种 flat0-9 全通+bonusSet(4)（lim=10，lim%5==0）→ reload 启动点 dayEnd 弹层预告=ch3（余数）非 ch4（算式）
        ctx, pg, errs = await newpage(b, 'divide', 10, delay=2000)
        await pg.evaluate("() => { KIDS.calendar.bonusSet(4); KIDS.store.persist(); }")
        await pg.reload()
        txt = ''
        for _ in range(12):
            await pg.wait_for_timeout(1000)
            txt = await pg.evaluate("[...document.querySelectorAll('.k-overlay, .k-dayend, .k-chapter, [class*=chapter], [class*=day], [class*=end]')].map(e => e.textContent).join('|')")
            if '明天' in txt: break
        has3 = '余数' in txt
        has4 = '除法算式小黑板' in txt
        rec('T6 m6 dayEnd 预告不跳章(lim=10)', has3 and not has4, 'ov=%r' % txt[:60])
        await ctx.close()

        # T7 m7：divide flat5 换题自动读题（无 flat 门）
        ctx, pg, errs = await newpage(b, 'divide', 5, delay=2600)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(1500)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('DV.quiz')
        # 推进一整题（分糖+答对）
        for _ in range(30):
            qq = await pg.evaluate('DV.quiz')
            if not qq: break
            if qq['step'] != q['step']: break
            if qq['phase'] == 'deal':
                try:
                    await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=2500, force=True)
                except Exception:
                    break
            else:
                for _a in range(3):
                    try:
                        await pg.locator('.opt[data-i="%d"]' % qq['answerIdx']).first.click(timeout=3000, force=True)
                        break
                    except Exception:
                        await pg.wait_for_timeout(600)
            await pg.wait_for_timeout(700)
        await pg.wait_for_timeout(2000)
        v = await pg.evaluate('window.__vlog')
        newQ = [x for x in v if x.startswith('Q:div_n_') or x.startswith('Q:div_q')]
        rec('T7 m7 flat5 换题自动读题', len(newQ) >= 1, 'reads=%s' % [x[:16] for x in newQ[:1]])
        await ctx.close()

        # T8 m8：divide ch4 余数题答对后黑板定格含 ……（divide 仍 /5；n=15 需 bonus 10 保日限）
        ctx, pg, errs = await newpage(b, 'divide', 15, delay=2600, ch_len=5, bonus=10)
        formula = ''
        for _ in range(160):
            q = await pg.evaluate('DV.quiz')
            if not q: break
            if q['phase'] == 'deal':
                try:
                    await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=2500, force=True)
                except Exception:
                    break
            else:
                if q.get('rem'):
                    await pg.wait_for_timeout(300)
                    for _a in range(3):
                        try:
                            await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(timeout=3000, force=True)
                            break
                        except Exception:
                            await pg.wait_for_timeout(600)
                    await pg.wait_for_timeout(1100)
                    formula = await pg.evaluate("(() => { const f = document.querySelector('#formula'); return f ? f.textContent : ''; })()")
                    if '……' in formula: break
                    continue
                for _a in range(3):
                    try:
                        await pg.locator('.opt[data-i="%d"]' % q['answerIdx']).first.click(timeout=3000, force=True)
                        break
                    except Exception:
                        await pg.wait_for_timeout(600)
            await pg.wait_for_timeout(700)
        rec('T8 m8 余数题黑板定格 ……r', '……' in formula, 'formula=%r' % formula[:24])
        await ctx.close()

        # T9 m5：wrong 句 clip 化（divide ask 期错点= P:div_wrong 非 T:）
        ctx, pg, errs = await newpage(b, 'divide', 5, delay=2600)
        await pg.evaluate(HOOK)
        for _ in range(30):
            q = await pg.evaluate('DV.quiz')
            if not q or q['phase'] != 'deal': break
            try:
                await pg.locator('.candy[data-i]:not(.gone)').first.click(timeout=2500, force=True)
            except Exception:
                break
            await pg.wait_for_timeout(700)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('DV.quiz')
        w = [i for i in range(len(q['options'])) if i != q['answerIdx']]
        for _a in range(4):
            try:
                await pg.locator('.opt[data-i="%d"]' % w[0]).first.click(timeout=3000, force=True)
                break
            except Exception:
                await pg.wait_for_timeout(600)
        await pg.wait_for_timeout(900)
        v = await pg.evaluate('window.__vlog')
        pw = [x for x in v if x == 'P:div_wrong']
        tWrong = [x for x in v if x.startswith('T:')]
        rec('T9 m5 div wrong clip 化', len(pw) == 1 and not tWrong, 'P=%d TTS=%s' % (len(pw), tWrong[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
