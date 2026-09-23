# -*- coding: utf-8 -*-
"""poem verify 页复跑 + flat0-19 autoSolve 全量 + fill/order 真实驱动 + 真实页教学三段冒烟
（独立 headless chromium.launch，禁 connect/禁杀浏览器；单 page 串行；r19 静音双保险）
用法: python batch29/poem/_src/_selftest.py"""
import asyncio, io, json, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()

IDS = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']
# MUTE_INIT（r19 静音双保险①：init script stub 发声——volume 恒 0）
MUTE_INIT = ("Object.defineProperty(HTMLMediaElement.prototype, 'volume', "
             "{ set: function(){}, get: function(){ return 0; } });")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- verify 页：全量断言复跑 ----
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(MUTE_INIT)
        await pg.goto(URL_V)
        title = ''
        for _ in range(150):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        print('VERIFY title:', title, 'pageerrors:', errs[:3])
        res = await pg.evaluate('document.getElementById("verify-result").textContent')
        try:
            j = json.loads(res)
            print('pass/total:', j['pass'], '/', j['total'], 'layoutOk:', j['layoutOk'])
            for k in ('audit', 'map', 'tap', 'fill', 'order', 'qchain', 'frames', 'tutorial', 'swallow',
                      'clips', 'stars', 'contract', 'hints', 'estWin', 'dist', 'speed'):
                if k in j.get('units', {}):
                    u = j['units'][k]
                    print(' unit %-9s ok=%s %s' % (k, u.get('ok'),
                          {x: u[x] for x in u if x != 'ok' and not isinstance(u[x], (dict, list))}))
            for k, s in j.get('smokes', {}).items():
                if k == 'layout':
                    for one in s.get('sims', []):
                        print(' layout %s flat%-3s svgH=%s cards=%s hit=%s scene=%s slot=%s ox=%s pass=%s' %
                              (one['vp'], one['flat'], one['svgH'], one['cards'], one['hitOk'],
                               one['sceneOk'], one.get('slotOk'), one['ox'], one['pass']))
                else:
                    print(' smoke %-7s ok=%s %s' % (k, s.get('ok'),
                          {x: s[x] for x in s if x != 'ok'}))
            bad = [k for k, v in list(j.get('levels', {}).items()) + list(j.get('gen', {}).items()) if not v.get('ok')]
            print(' bad levels:', bad[:10])
        except Exception as e:
            print('parse fail:', e, res[:400])
            await pg.close(); await b.close(); return

        # ---- flat0-19 autoSolve 全量（verify 页内 SPEED=0.12 提速；关-诗映射随关断言） ----
        allok = True
        for flat in range(20):
            r = await pg.evaluate('PM.start(%d); PM.autoSolve()' % flat)
            lv = await pg.evaluate('PM.currentLevel')
            ep, ed = IDS[flat % 12], 1 + flat // 5
            ok = r.get('done') and lv.get('poem') == ep and lv.get('dch') == ed
            if not ok:
                allok = False
                print(' FLAT%-2d FAIL r=%s lv=%s want=%s/dch%d' % (flat, r, lv, ep, ed))
        print('flat0-19 autoSolve all pass:', allok,
              '(flat5=%s/dch2 flat10=%s/dch3 flat15=%s/dch4)' % (
              await pg.evaluate('PM.start(5); PM.currentLevel.poem + "/dch" + PM.currentLevel.dch'),
              await pg.evaluate('PM.start(10); PM.currentLevel.poem + "/dch" + PM.currentLevel.dch'),
              await pg.evaluate('PM.start(15); PM.currentLevel.poem + "/dch" + PM.currentLevel.dch')))

        # ---- fill/order 真实驱动（verify 页真实点击链：r42 新题型 UI 冒烟） ----
        # fill：flat5 驱动至首 fill 题→点错 1 次再点对（miss 口径）
        fseq = await pg.evaluate('''(async () => {
          PM.start(5);
          const wait = ms => new Promise(r => setTimeout(r, ms));
          for (let g = 0; g < 40 && PM.quiz; g++) {
            const q = PM.quiz;
            if (q.kind === 'fill') {
              const rw = await PM.tapOpt((q.answer + 1) % 4);   // 点错字卡
              await wait(900);                                   // 错点防重入窗（verify 0.12 提速后实测 ≤120ms，取稳）
              const miss = PM.quiz.miss;
              const rr = await PM.tapOpt(PM.quiz.answer);       // 点对
              return { found: true, wrong: rw, right: rr, hole: q.hole, line: q.line, miss: miss };
            }
            for (let p = 0; p < (q.kind === 'order' ? 4 : 1); p++) {   // 非 fill 先点掉（order 4 点）
              await PM.tapOpt(PM.quiz.answer);
              await wait(200);
            }
          }
          return { found: false };
        })()''')
        print('REAL fill drive:', fseq)
        # order：flat10 驱动至首 order 题→逐句 4 点（step×3+末步）+槽填充
        oseq = await pg.evaluate('''(async () => {
          PM.start(10);
          const wait = ms => new Promise(r => setTimeout(r, ms));
          for (let g = 0; g < 40 && PM.quiz; g++) {
            const q = PM.quiz;
            if (q.kind === 'order') {
              const seq = [], slotHist = [];
              for (let p = 0; p < 4; p++) {
                seq.push(await PM.tapOpt(PM.quiz.answer));
                await wait(250);
                slotHist.push(document.querySelectorAll('#scene .oslot.filled').length);   // 第4点后已切新题，末值不作数
              }
              return { found: true, seq: seq.join(','), slotHist: slotHist.join(','), slots3: slotHist[2] };
            }
            await PM.tapOpt(q.answer);   // 非 order 单点（hear）
            await wait(250);
          }
          return { found: false };
        })()''')
        print('REAL order drive:', oseq)
        await pg.close()

        # ---- 真实页：教学三段（watch→help→solo）+ 存档 v1.0（r19 静音双保险①+②） ----
        pg2 = await b.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.add_init_script(MUTE_INIT)                 # ① volume stub
        # ② 种档 settings 全关 + levels 空（触发教学链但不发声）
        sv = json.dumps({'v': '1.0', 'levels': {}, 'daily': {}, 'dailyMin': {},
                         'settings': {'sound': False, 'tts': False, 'vol': 0}}, ensure_ascii=False)
        await pg2.add_init_script('localStorage.setItem("kidsgame_poem", %s);' % sv)
        await pg2.goto(URL_R)
        await pg2.wait_for_timeout(1500)
        demo = None
        for _ in range(70):                      # 教学链 ≈14.6s（SPEED=1）
            demo = await pg2.evaluate('window.__pmDemoR || null')
            if demo:
                break
            await pg2.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):
            tut = await pg2.evaluate('window.PM && PM.tutorial')
            if tut != 'watch':
                break
            await pg2.wait_for_timeout(500)
        r = await pg2.evaluate('PM.autoSolve()')
        lv = await pg2.evaluate('PM.currentLevel')
        tut2 = await pg2.evaluate('PM.tutorial')
        await pg2.wait_for_timeout(3600)        # celebrate 2.3s + 写档链收尾后再读存档
        sv2 = await pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_poem") || "{}")')
        print('REAL demo=%s tut=%s->%s autoSolve=%s lv=%s errs=%s saveV=%s levels1=%s tutSeen=%s' %
              (demo, tut, tut2, r, lv, errs2[:3], sv2.get('v'), len(sv2.get('levels', {})),
               (sv2.get('poem') or {}).get('tutSeen')))
        await pg2.close()
        await b.close()

asyncio.run(main())
