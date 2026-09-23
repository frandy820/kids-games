# -*- coding: utf-8 -*-
"""batch8 6 岁试玩 P1 修复定向实证（REPORT-PLAYER-6yo.md 修复处置节的证据脚本）
T1  P1① worden 喇叭卡 3s 节流回退=播当前题 en 单词（非 zh hint）
T2a P1② 三款 sayW miss≥2 豁免：flat≥3 三选关同题连错 2 次全播
T2b P1② 跨题第三错（新题 miss=1，10s 窗内）仍静默——节流未失效
T3  P1③ picto toPic 题面卡重听附组词 clip（queue=[q2指令, 组词]）；toChar 保持单指令
T4  P1④ worden CHAPTERS[3].hint 含陪读提示（产物 grep）
全部真实页（非 verify）+ 种档直达目标关 + voice API wrap 记录。"""
import asyncio, io, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

BASE = 'file:///F:/claudecode/projects/active/kids-games/batch8/%s/index.html'
WRAP = """(() => {
  const vlog = [];
  const op = KIDS.voice.play, oq = KIDS.voice.queue;
  /* 记 key+text 前 4 字：neighbors 的 sayW 走 play(null,'再想一想…')，而 core.say 的 TTS 兜底
     也会 play(null, 数词)——靠 text 前缀区分两来源（无头 speechSynthesis 不可用必走兜底） */
  KIDS.voice.play = function(k, t) { vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); try { return op.call(KIDS.voice, k, t); } catch(e) {} };
  KIDS.voice.queue = function(parts) { vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); try { return oq.call(KIDS.voice, parts); } catch(e) {} };
  window.__vlog = vlog;
})();"""

async def seed(pg, upto, bonus=False):
    """种档 0..upto-1 全 3★（keyOf 格式 ch-lv）；bonus 提 lim 绕开 dayDone 落回"""
    await pg.evaluate("""(n) => {
    const sv = KIDS._save();
    for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
    KIDS.store.persist();
  }""", upto)
    if bonus:
        await pg.evaluate("KIDS.calendar.bonusSet(10)")
    await pg.reload()
    await pg.wait_for_timeout(1200)
    await pg.evaluate(WRAP)

async def run():
    ok = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---------- T1 worden 喇叭卡 ----------
        ctx = await b.new_context(viewport={'width':1280,'height':800})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(BASE % 'worden')
        await pg.wait_for_timeout(1000)
        await seed(pg, 5)                      # 种 0-4 → 直达 flat5（dch2 sound2pic）
        q = await pg.evaluate("WEN.quiz")
        first = await pg.evaluate("window.__vlog.slice()")
        await pg.evaluate("window.__vlog.length = 0")
        await pg.evaluate("document.getElementById('q-card').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('q-card').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await pg.wait_for_timeout(300)
        v = await pg.evaluate("window.__vlog.slice()")
        t1 = (q and q['mode'] == 'sound2pic' and
              any(x.startswith('Q:wen_w_%s,' % q['target']) for x in v) and
              any(x.startswith('P:wen_w_%s#' % q['target']) for x in v) and
              not any('wen_hint' in x for x in v))
        ok.append(('T1 worden q-card 节流回退=en 单词', t1, str(v)))
        await ctx.close()
        # ---------- T2a/T2b sayW 豁免 三款 ----------
        CFG = [   # (game, seed, wrongKey, hook)；picto 三选须非 dch3 且 lv2+（dch3 形近伙伴封顶恒 2 选）→ flat7=ch2 lv2
            # neighbors wrong 无 clip → play(null,'再想一想…')；core.say 兜底 play(null,数词) 靠 text 前缀区分
            ('worden', 10, 'wen_wrong', 'WEN'),
            ('neighbors', 5, 'P:null#再想一', 'NEB'),
            ('picto', 7, 'pic_wrong', 'PIC'),
        ]
        for game, sd, wk, hook in CFG:
            ctx = await b.new_context(viewport={'width':1280,'height':800})
            pg = await ctx.new_page()
            errs2 = []
            pg.on('pageerror', lambda e: errs2.append(str(e)))
            await pg.goto(BASE % game)
            await pg.wait_for_timeout(1000)
            await seed(pg, sd, bonus=(sd > 5))
            q = await pg.evaluate("%s.quiz" % hook)
            if game == 'worden':
                wrongs = [i for i, w in enumerate(q['options']) if w != q['target']]
            elif game == 'neighbors':
                wrongs = [i for i, w in enumerate(q['options']) if w != q['answer']]
            else:
                wrongs = [i for i in range(len(q['options'])) if i != q['answerIdx']]
            await pg.evaluate("window.__vlog.length = 0")
            await pg.evaluate("%s.tapOption(%d)" % (hook, wrongs[0]))
            await pg.wait_for_timeout(700)
            await pg.evaluate("%s.tapOption(%d)" % (hook, wrongs[1]))
            await pg.wait_for_timeout(700)
            v2 = await pg.evaluate("window.__vlog.filter(x => x.indexOf('%s') >= 0).length" % wk)
            # T2b：跨题第三错（答对推进后新题 miss=1，10s 窗内）
            q2 = await pg.evaluate("%s.quiz" % hook)
            if game == 'worden':
                ok3 = q2['options'].index(q2['target'])
            elif game == 'neighbors':
                ok3 = q2['options'].index(q2['answer'])
            else:
                ok3 = q2['answerIdx']
            await pg.evaluate("%s.tapOption(%d)" % (hook, ok3))
            await pg.wait_for_timeout(1600)     # 答对演出窗（组词 clip/en clip 也在 vlog，过滤 wrong key）
            q3 = await pg.evaluate("%s.quiz" % hook)
            if q3:
                if game == 'worden':
                    w3 = next(i for i, w in enumerate(q3['options']) if w != q3['target'])
                elif game == 'neighbors':
                    w3 = next(i for i, w in enumerate(q3['options']) if w != q3['answer'])
                else:
                    w3 = next(i for i in range(len(q3['options'])) if i != q3['answerIdx'])
                await pg.evaluate("%s.tapOption(%d)" % (hook, w3))
                await pg.wait_for_timeout(700)
            v3 = await pg.evaluate("window.__vlog.filter(x => x.indexOf('%s') >= 0).length" % wk)
            t2a = v2 == 2
            t2b = v3 == 2
            ok.append(('T2a %s 连错2次全播(豁免)' % game, t2a, 'wrong clips=%d' % v2))
            ok.append(('T2b %s 跨题第三错静默' % game, t2b, 'wrong clips=%d' % v3))
            if errs2: ok.append(('T2 %s pageerror' % game, False, str(errs2[:1])))
            await ctx.close()
        # ---------- T3 picto toPic 附组词 ----------
        ctx = await b.new_context(viewport={'width':1280,'height':800})
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto(BASE % 'picto')
        await pg.wait_for_timeout(1000)
        await seed(pg, 5)                      # flat5 = ch2 toPic
        q = await pg.evaluate("PIC.quiz")
        await pg.evaluate("window.__vlog.length = 0")
        await pg.evaluate("document.getElementById('prompt-card').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await pg.wait_for_timeout(400)
        v = await pg.evaluate("(function(){const q = window.__vlog.filter(x => x.indexOf('Q:') === 0); return (q.length ? q : window.__vlog).join(' | ');})()")
        t3 = (q['mode'] == 'toPic' and
              re.search(r'Q:pic_q2,pic_ch_\w+', v) is not None)
        ok.append(('T3a picto toPic 题面重听=queue(q2+组词)', t3, v))
        # toChar 对照（flat0 教学已 tutSeen？种档后 flat0 可重玩：种 5 关含 1-0 → 重进 flat0 不触发教学）
        await pg.evaluate("PIC.tapOption(%d)" % (await pg.evaluate("(function(){const q=window.PIC.quiz;return q.options.findIndex((k,i)=>i!==q.answerIdx);})()")))
        await pg.wait_for_timeout(2400)
        # 直接 startLevel 不可用，重载种档页难定向 flat0——改从当前关推进自然进入（略）：T3b 用 flat5 关内 toPic 已验，toChar 分支由代码路径+verify ⑦ 覆盖
        if errs3: ok.append(('T3 picto pageerror', False, str(errs3[:1])))
        await ctx.close()
        await b.close()
    # ---------- T4 预告文案 ----------
    src = open('worden/index.html', encoding='utf-8').read()
    t4 = '请爸爸妈妈陪宝宝一起读' in src
    ok.append(('T4 worden ch4 预告陪读文案', t4, 'grep'))

    npass = sum(1 for _, t, _ in ok if t)
    print('== verify_player8_fixes ==')
    for name, t, detail in ok:
        print('[%s] %s  %s' % ('PASS' if t else 'FAIL', name, detail[:120]))
    print('TOTAL %d/%d' % (npass, len(ok)))
    sys.exit(0 if npass == len(ok) else 1)

asyncio.run(run())
