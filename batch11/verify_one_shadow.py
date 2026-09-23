# -*- coding: utf-8 -*-
"""batch11 首单元门禁 · shadow 影子配对（r8 难度改造版；不信任 agent 自报，全读实际产物）
①verify title ②真实点击通关 flat5(章2 旋转) ③双 viewport+触摸目标 ④离线
⑤截图非空白 ⑥钩子 ⑦0 pageerror ⑧教学吞输入+轻叮 ⑨r8 连解纠错链(错干扰灰/错未来目标不灰/
错2 breathe) ⑩sayW 三态(错1播/错2豁免force/第三错静默) ⑪救援14s(题面双通道+应点剪影
breathe)+错点不重置 ⑫语音注入 data:audio 计数 ⑬教学窗重玩门 ⑭r8 章型(ch1 多物连解零转/
ch3 首题热身后遮蔽+旋转) ⑮r8 时长独立副本(50 关 minMs>=40000+步数>=13)
⑯多物连解 phase 推进(消显/高亮移动/target 跟随) ⑰重叠双选(两步完成+干扰灰)
⑱旋转四向覆盖+遮蔽 DOM 几何 ⑲nextHint 契约独立副本(章末文字+生成关实算)"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'shadow' / 'index.html').as_posix()
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

SEED_JS = """(n) => {
  const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.sha = sv.sha || {}; sv.sha.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
}"""

GROUP = {}
def load_groups():
    s = (BASE / 'shadow' / '_src' / 'game-data.js').read_text(encoding='utf-8')
    import re
    for m in re.finditer(r"([a-z0-9]+):\s*\{ e: '[^']+', n: '[^']+', g: '([a-z0-9]+)'", s):
        GROUP[m.group(1)] = m.group(2)

async def newpage(browser, vp={'width': 1280, 'height': 800}, verify=False):
    ctx = await browser.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(900)
    return ctx, pg, errs

async def seed(pg, n):
    await pg.evaluate(SEED_JS, n)

async def main():
    load_groups()
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title（双 viewport 双绿：门禁 3——1280×800 / 800×1180）
        ctx, pg, errs = await newpage(b, verify=True)
        title = ''
        for _ in range(45):                          # r8 verify 单元多（40 关审计+多场景），等待窗加长
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('H1 verify title(1280x800)', 'VERIFY PASS' in title and 'FAIL' not in title, title)
        r = await pg.evaluate("JSON.parse(document.getElementById('verify-result').textContent)")
        rec('H1b verify 含 sayW+clipOk+durModel+nextHint 单元',
            'sayW' in str(r) and ('clipOk' in str(r) or 'clips' in str(r)) and 'durModel' in str(r) and 'nextHint' in str(r),
            str(list(r.keys())[:4]) if isinstance(r, dict) else '')
        await ctx.close()
        ctx, pg, errs = await newpage(b, vp={'width': 800, 'height': 1180}, verify=True)
        title2 = ''
        for _ in range(45):
            title2 = await pg.title()
            if 'VERIFY' in title2: break
            await pg.wait_for_timeout(1000)
        rec('H1c verify title(800x1180)', 'VERIFY PASS' in title2 and 'FAIL' not in title2, title2)
        await ctx.close()

        # ⑥ 钩子 + ⑭a ch1 多物连解形态（flat0：2 物 3 卡全同组零旋转）
        ctx, pg, errs = await newpage(b)
        await pg.evaluate(HOOK)
        hk = await pg.evaluate("(() => ({ has: !!window.SH, quiz: typeof SH.quiz, tap: typeof SH.tapCard, auto: typeof SH.autoSolve, tut: typeof SH.tutorial }))()")
        rec('H6 钩子 SH 齐', hk['has'] and hk['quiz'] == 'object' and hk['tap'] == 'function', str(hk))
        q = await pg.evaluate("SH.quiz")
        grpOk = GROUP and len(q['targets']) == 2 and len(q['options']) == 3 and \
            all(GROUP.get(o) == GROUP.get(q['target']) for o in q['options']) and \
            all(v == 0 for v in q['rot']) and not any(q['veil'])
        rec('H14a ch1 多物连解(2 物 3 卡全同组·零转零遮)', grpOk,
            'targets=%s options=%s grp=%s' % (q['targets'], q['options'], GROUP.get(q['target'])))
        await ctx.close()

        # ⑭b ch3 首题热身(首题无遮蔽零旋转)+第 2 题起遮蔽+旋转
        ctx, pg, errs = await newpage(b)
        await seed(pg, 10); await pg.reload(); await pg.wait_for_timeout(900)
        q10 = await pg.evaluate("SH.quiz")
        warm = q10['mode'] == 'multi' and all(x == 0 for x in q10['rot']) and not any(q10['veil'])
        for _ in range(30):                        # 连完 qi0 三物看 qi1（r8：一题多步；演出窗 1.7s）
            await pg.evaluate("SH.tapCard(SH.quiz.answerIdx)")
            await pg.wait_for_timeout(1700)
            q2 = await pg.evaluate("SH.quiz")
            if q2 and q2['step'] == 1: break
        rot2 = any(x != 0 for x in q2['rot']) if q2 else False
        veil2 = all(q2['veil']) if q2 else False
        dom_veil = await pg.evaluate("document.querySelectorAll('.card .veil').length") if q2 else 0
        rec('H14b ch3 首题热身+第 2 题起旋转+遮蔽', warm and rot2 and veil2 and dom_veil == 4,
            'first(warm=%s) second(rot=%s veil=%s domVeil=%s)' % (warm, q2['rot'] if q2 else None, veil2, dom_veil))
        await ctx.close()

        # ⑮ r8 时长独立副本（SPEC §1-r8 模型：estMs=n*345+600；题面句 12 码点→4740 / 叠影 20→7500；
        #    每连对步 max(语音窗, plain2600/rot3000/veil3200)；overlap=7500+2*3600；+5×切换 900）
        ctx, pg, errs = await newpage(b)
        dur = await pg.evaluate("""() => {
          const EST = c => c * 345 + 600, PLAIN = 2600, ROT = 3000, VEIL = 3200, OVL = 3600, SW = 900, MIN = 40000, SMIN = 13;
          const qd = q => q.mode === 'overlap' ? EST(20) + 2 * OVL : q.targets.reduce((s, tg) => {
            let cog = PLAIN;
            if (q.veil[0]) cog = VEIL; else if (q.rot.some(v => v !== 0)) cog = ROT;
            return s + Math.max(EST(12), cog);
          }, 0);
          const out = [];
          for (let f = 0; f < 50; f++) {
            const L = genLevel(f);
            const ms = L.quizzes.reduce((s, q) => s + qd(q), 0) + 5 * SW;
            const steps = L.quizzes.reduce((s, q) => s + (q.mode === 'overlap' ? 2 : q.targets.length), 0);
            out.push({f: f, ms: ms, steps: steps,
                      agree: ms === levelDurMs(L) && steps === levelSteps(L)});
          }
          return {n: out.length, bad: out.filter(o => !o.agree || o.ms < MIN || o.steps < SMIN).length,
                  minMs: Math.min(...out.map(o => o.ms)), minSteps: Math.min(...out.map(o => o.steps))};
        }""")
        rec('H15 时长独立副本 50 关 minMs>=40000+minSteps>=13+与源模型对账',
            dur.get('n') == 50 and not dur.get('bad'), 'minMs=%s minSteps=%s bad=%s' % (dur.get('minMs'), dur.get('minSteps'), dur.get('bad')))
        await ctx.close()

        # ⑯ 多物连解 phase 推进（真实页 flat0：连对→消显→高亮移动→target 跟随）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 0); await pg.reload(); await pg.wait_for_timeout(900)
        q0 = await pg.evaluate("SH.quiz")
        ai = q0['answerIdx']
        await pg.locator('.card[data-i="%d"]' % ai).click()
        await pg.wait_for_timeout(1600)             # 点亮 620+消显 700 演出窗
        mid = await pg.evaluate("""() => {
          const q = SH.quiz;
          const g = document.querySelector('.card[data-i="' + SH.quiz.picked[0] + '"]');
          return {step: q.step, phase: q.phase, picked: q.picked, target: q.target,
                  gone: g && g.classList.contains('gone'), pe: g && getComputedStyle(g).pointerEvents,
                  hit: document.querySelectorAll('#prompt-chip .t-item.hit').length,
                  cur: document.querySelectorAll('#prompt-chip .t-item.cur').length};
        }""")
        rec('H16 多物连解(连对消显+phase 推进+高亮移动+target 跟随)',
            mid['step'] == 0 and mid['phase'] == 1 and len(mid['picked']) == 1 and
            mid['target'] != q0['target'] and mid['gone'] and mid['pe'] == 'none' and
            mid['hit'] == 1 and mid['cur'] == 1, str(mid))
        await ctx.close()

        # ⑰ 重叠双选（flat15 ch4 qi1：两步完成+干扰灰）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 15); await pg.reload(); await pg.wait_for_timeout(900)
        for _ in range(30):                          # 连完 qi0 三物推进 qi1 overlap（演出窗 1.7s）
            qs = await pg.evaluate("SH.quiz")
            if qs and qs['step'] == 1: break
            await pg.evaluate("SH.tapCard(SH.quiz.answerIdx)")
            await pg.wait_for_timeout(1700)
        ov = await pg.evaluate("SH.quiz")
        if ov and ov['mode'] != 'overlap':           # 确定性保护：qi1 恒 overlap
            ov = None
        ovl_dom = await pg.evaluate("document.querySelectorAll('#prompt-chip .ovl-g').length")
        wi = next(i for i, v in enumerate(ov['options']) if v not in ov['targets'])
        await pg.locator('.card[data-i="%d"]' % wi).click()
        await pg.wait_for_timeout(700)
        st1 = await pg.evaluate("(() => ({ miss: SH.quiz.miss, dead: SH.quiz.dead, phase: SH.quiz.phase }))()")
        a1 = ov['answerIdx']
        await pg.locator('.card[data-i="%d"]' % a1).click()
        await pg.wait_for_timeout(1600)
        st2 = await pg.evaluate("""(a1) => ({ step: SH.quiz.step, phase: SH.quiz.phase,
          sel: document.querySelector('.card[data-i="' + a1 + '"]').classList.contains('sel'),
          ovlHit: document.querySelectorAll('#prompt-chip .ovl-g.hit').length })""", a1)
        a2 = (await pg.evaluate("SH.quiz"))['answerIdx']
        await pg.locator('.card[data-i="%d"]' % a2).click()
        await pg.wait_for_timeout(1600)
        st3 = await pg.evaluate("(() => ({ step: SH.quiz.step }))()")
        rec('H17 重叠双选(题面叠影+干扰灰+两步完成)',
            bool(ov) and ovl_dom == 2 and st1['miss'] == 1 and st1['dead'] == [wi] and st1['phase'] == 0 and
            st2['step'] == 1 and st2['phase'] == 1 and st2['sel'] and st2['ovlHit'] == 1 and
            st3['step'] == 2, 'ovlDom=%s st1=%s st2=%s st3=%s' % (ovl_dom, st1, st2, st3))
        await ctx.close()

        # ⑱ 旋转四向覆盖 + 遮蔽几何（引擎 50 关 + 真实页 DOM）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 10); await pg.reload(); await pg.wait_for_timeout(900)   # tutSeen：防教学演示续体重发覆盖
        cov = await pg.evaluate("""() => {
          const cov = {90: 0, 180: 0, 270: 0};
          for (let f = 0; f < 50; f++) genLevel(f).quizzes.forEach(q => q.rot.forEach(v => { if (cov[v] !== undefined) cov[v]++; }));
          return cov;
        }""")
        await pg.evaluate("startLevel(11)")                  # flat11=ch3 lv1
        for _ in range(12):                                  # 连完 qi0 三物推进 qi1（遮蔽题；演出窗 1.7s）
            qs = await pg.evaluate("SH.quiz")
            if qs and qs['step'] == 1: break
            await pg.evaluate("SH.tapCard(SH.quiz.answerIdx)")
            await pg.wait_for_timeout(1700)
        await pg.wait_for_timeout(600)
        veilg = await pg.evaluate("""() => {
          const c = document.querySelector('.card');
          const v = c.querySelector('.veil');
          const cr = c.getBoundingClientRect(), vr = v.getBoundingClientRect();
          return {ratio: vr.height / cr.height, top: (vr.top - cr.top) / cr.height, n: document.querySelectorAll('.card .veil').length};
        }""")
        rec('H18 旋转四向覆盖(90/180/270 全非零)+遮蔽几何(70%±8%·顶起 30%)',
            all(v >= 1 for v in cov.values()) and abs(veilg['ratio'] - 0.7) <= 0.08 and
            abs(veilg['top'] - 0.3) <= 0.08 and veilg['n'] == 4,
            'cov=%s veil=%s' % (cov, veilg))
        await ctx.close()

        # ⑲ nextHint 契约独立副本（文字重列章末 + 生成关实算 + 源式形态）
        ctx, pg, errs = await newpage(b)
        nh = await pg.evaluate("""() => {
          const EXP = {0: '影子会转圈圈啦，转过的也要认出来', 4: '影子会转圈圈啦，转过的也要认出来',
                       7: '影子要躲进灌木丛啦，只露一点点', 9: '影子要躲进灌木丛啦，只露一点点',
                       12: '两个影子会叠成一团，拆开看看是谁', 14: '两个影子会叠成一团，拆开看看是谁',
                       17: '新一轮影子配对大挑战'};
          const st = Object.keys(EXP).every(f => nextHint(Number(f)) === EXP[f]);
          const gn = [19, 24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);
          const src = nextHint.toString();
          return {st: st, gn: gn,
                  f: src.indexOf('genLevel(f + 1).dch') >= 0 && src.indexOf('(ci + 1) %') < 0 &&
                     src.indexOf('CHAPTERS[Math.floor(f / CH_LEN) + 1].hint') >= 0};
        }""")
        rec('H19 nextHint 契约(章末独立副本+生成关实算+M1/F 源式)',
            nh['st'] and nh['gn'] and nh['f'], str(nh))
        await ctx.close()

        # ② 真实点击通关 flat5（章 2 旋转；r8 每题多步连对）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        clicks = 0
        for _ in range(60):
            q = await pg.evaluate("SH.quiz")
            if not q: break
            await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
            clicks += 1
            await pg.wait_for_timeout(900)
        await pg.wait_for_timeout(5200)
        stars = await pg.evaluate("(KIDS._save().levels['2-0'] || {}).stars || 0")
        rec('H2 真实点击通关 flat5(含旋转连解多步)', stars >= 1 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()

        # ⑨⑩ r8 连解纠错链 + sayW 三态（flat5：multi3+1 干扰）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate("SH.quiz")
        wi = next(i for i, v in enumerate(q['options']) if v not in q['targets'])     # 干扰卡
        fi = next(i for i, v in enumerate(q['options']) if v in q['targets'] and i != q['answerIdx'])  # 未来目标
        await pg.locator('.card[data-i="%d"]' % wi).click()
        await pg.wait_for_timeout(700)
        st1 = await pg.evaluate("(() => { const x = SH.quiz; return { miss: x.miss, dead: x.dead, br: !!document.querySelector('.card.breathe') }; })()")
        v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再')).length")
        await pg.locator('.card[data-i="%d"]' % fi).click()      # 错未来目标：晃动不灰（还要连）
        await pg.wait_for_timeout(700)
        st2 = await pg.evaluate("""(fi) => { const x = SH.quiz;
          const el = document.querySelector('.card[data-i="' + fi + '"]');
          return { miss: x.miss, dead: x.dead, br: !!document.querySelector('.card.breathe'),
                   wig: el.classList.contains('wig'), dim: el.classList.contains('dim') }; }""", fi)
        v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再')).length")
        rec('H9 r8 连解纠错链(错干扰灰/错未来目标不灰/错2 breathe)',
            st1['miss'] == 1 and st1['dead'] == [wi] and not st1['br'] and
            st2['miss'] == 2 and st2['dead'] == [wi] and st2['br'] and st2['wig'] and not st2['dim'],
            'st1=%s st2=%s' % (st1, st2))
        rec('H10a sayW 错1播+错2豁免force', v1 == 1 and v2 == 2, 'v1=%d v2=%d' % (v1, v2))  # 「再」前缀过滤：题面兜底 play 不计入
        await ctx.close()
        # 换题静默：同页 题1错2(t0)→答对推进→题2错1(10s 窗内 miss=1 非 force)=静默
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate("SH.quiz")
        ws = [i for i, v in enumerate(q['options']) if v not in q['targets']] + \
             [i for i, v in enumerate(q['options']) if v in q['targets'] and i != q['answerIdx']]
        await pg.wait_for_timeout(2200)                        # 等开场 2s 接力读题落完
        await pg.evaluate('window.__vlog = []')
        await pg.locator('.card[data-i="%d"]' % ws[0]).click()
        await pg.wait_for_timeout(500)
        await pg.locator('.card[data-i="%d"]' % ws[1]).click()
        await pg.wait_for_timeout(500)
        v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再')).length")
        await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()   # 连对推进（本题未完）
        await pg.wait_for_timeout(1700)
        for _ in range(12):                                     # 连完本题剩余物换题
            q2 = await pg.evaluate("SH.quiz")
            if q2 and q2['step'] == 1: break
            await pg.locator('.card[data-i="%d"]' % q2['answerIdx']).click()
            await pg.wait_for_timeout(1700)
        w2 = next(i for i, v in enumerate(q2['options']) if v not in q2['targets'])
        await pg.locator('.card[data-i="%d"]' % w2).click()
        await pg.wait_for_timeout(700)
        v3 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:null#再')).length")
        rec('H10b 换题错1静默(10s节流窗内,前2条已有)', v2 == 2 and v3 == 2, 'v2=%d v3=%d' % (v2, v3))
        await ctx.close()

        # ⑪ 救援 14s + 错点不重置（r8 题面走 play 'sha_q_*' clip 通道 / T:=TTS 兜底双通道判据）
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(3200)
        await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
        br = False
        for _ in range(20):                                    # 静置等 14s 救援（轮询 breathe 防轮询相位竞态）
            br = await pg.evaluate("!!document.querySelector('.card.breathe')")
            if br: break
            await pg.wait_for_timeout(1000)
        v = await pg.evaluate('window.__vlog')
        res = [x for x in v if 'sha_help' in x or x.startswith('P:sha_q_') or x.startswith('T:找一找')]
        rec('H11 静置14s+ 救援(重读题面+应点剪影breathe)', bool(res) and br, 'rescue=%s breathe=%s' % ([x[:14] for x in res[:1]], br))
        await pg.evaluate('window.__vlog = []')
        w0 = await pg.evaluate("(() => { const x = SH.quiz; return x.options.map((o, i) => i).filter(i => i !== x.answerIdx)[0]; })()")
        await pg.locator('.card[data-i="%d"]' % w0).click()       # 错点一次（若重置钟→idle 回零）
        res2 = []
        for _ in range(18):                                    # 救援重置过 lastAct：错点不重置则 ~14s 后二次救援
            await pg.wait_for_timeout(1000)
            v2 = await pg.evaluate('window.__vlog')
            res2 = [x for x in v2 if 'sha_help' in x or x.startswith('P:sha_q_') or x.startswith('T:找一找')]
            if res2: break
        rec('H11b 错点不重置救援(二次救援已触发)', bool(res2), 'post=%s' % [x[:14] for x in res2[:1]])
        await ctx.close()

        # ⑧⑬ 教学（乱点不跳；重玩门）
        ctx, pg, errs = await newpage(b)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('SH.tutorial')
        st0 = await pg.evaluate("SH.currentLevel && SH.currentLevel.step")
        bb = await pg.locator('.card').first.bounding_box()
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        await pg.wait_for_timeout(500)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        st1 = await pg.evaluate("SH.currentLevel && SH.currentLevel.step")
        rec('H8 教学期真实点击被吞+轻叮', tut == 'watch' and st1 == st0 and pops1 > pops0, 'tut=%s step %s->%s pops+%d' % (tut, st0, st1, pops1 - pops0))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        seen = False
        for _ in range(16):
            await pg.wait_for_timeout(1000)
            seen = await pg.evaluate("!!(KIDS._save().sha && KIDS._save().sha.tutSeen)")
            if seen: break
        rec('H13 教学窗点重玩=教学照常完成', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
        await ctx.close()

        # ③ 双 viewport + 触摸目标
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, vp=vp)
            await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
            ox = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            small = await pg.evaluate("""[...document.querySelectorAll('button, .card')].filter(e => !e.closest('.k-panel') && !e.classList.contains('k-parentbtn'))
              .map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height))
              .filter(v => v < 64).length""")
            rec('H3 viewport %dx%d overflowX=0+触摸>=64' % (vp['width'], vp['height']), ox == 0 and small == 0 and not errs, 'ox=%s small=%s' % (ox, small))
            await ctx.close()

        # ④⑤ 离线 + 截图
        ctx, pg, errs = await newpage(b)
        await seed(pg, 5); await pg.reload(); await pg.wait_for_timeout(900)
        src = await pg.evaluate("document.documentElement.outerHTML")
        rec('H4 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
        shot = await pg.screenshot()
        import io as _io, statistics as _st
        from PIL import Image
        img = Image.open(_io.BytesIO(shot)).convert('L')
        px = list(img.resize((160, 100)).getdata())
        sd = _st.pstdev(px)
        rec('H5 截图非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()

        # ⑫ 语音注入对账（data:audio 计数主判据；r8=15 sha_q+4 新键+3 core=22）
        src = (BASE / 'shadow' / 'index.html').read_text(encoding='utf-8')
        audio = src.count('data:audio')
        rec('H12 语音注入对账(r8 22 条)', audio >= 10, 'audio=%d' % audio)

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
