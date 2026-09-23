# -*- coding: utf-8 -*-
"""chartread r17 复跑自检（独立 headless chromium.launch，禁 connect/禁杀浏览器进程）
音频纪律三层：context 级 INIT_SND（接管 Audio/speechSynthesis/AudioContext 工厂）+
goto 后 STUB_SND（stub KIDS.voice.play/say/queue + KIDS.audio.sfx/note，带 log 层）+
种档 settings:{sound:false,tts:false}——测试音频禁外放（不依赖 --mute-audio）。
覆盖：verify 双视口（1280x800+800x1180）+ modeled 双钉 + 真实页教学三态/真实点击通关/
首错零惩罚/救援钟/生成关种档触达/存档迁移三例/真竖屏轮/完全离线 0 pageerror。
用法: python batch31/chartread/_src/_selftest.py"""
import asyncio, io, json, os, sys, time, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL = 'file:///' + (BASE / 'index.html').as_posix()
MODELED_MIN = 99854      # T46 阶段3 重钉：listen 全 clip 口径（与 game-verify.js 双钉——防回漂）
est_ms = lambda n: n * 345 + 600   # estMs 四方一致（b25 定版全字符口径）
SAVE_KEY = 'kidsgame_chartread'
# 错反馈链计数（T46 阶段2 起错链=chr_again_* 键段单段链；判对确认链/读题链 [0]
# 恒 right/题面 clip 字符串段不污染；阶段3 题面尾段全 clip 化后 keyless 全款清零）
WRONG_Q = "(window.__qLog||[]).filter(e => Array.isArray(e) && e.length === 1 && e[0] && typeof e[0] === 'object' && typeof e[0].key === 'string' && e[0].key.indexOf('chr_again_') === 0).length"

# context 级静音（页面任何脚本运行前接管发声工厂）
INIT_SND = """
(() => {
  try {
    const OA = window.Audio;
    window.Audio = function (src) {
      const a = src === undefined ? new OA() : new OA(src);
      a.pause(); a.volume = 0;
      a.play = function () { a.pause(); return Promise.resolve(); };
      return a;
    };
    window.Audio.prototype = OA.prototype;
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = function () {};
      window.speechSynthesis.cancel = function () {};
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const Silent = function () {
        const c = new AC();
        try { const g = c.createGain(); g.gain.value = 0; g.connect(c.destination); } catch (e) {}
        return c;
      };
      Silent.prototype = AC.prototype;
      window.AudioContext = Silent;
      if (window.webkitAudioContext) window.webkitAudioContext = Silent;
    }
    window.__initSnd = true;
  } catch (e) {}
})();
"""
# goto 后 stub（KIDS 侧发声 API 全接管 + log 层计数——断言口径按实际调用通道）
STUB_SND = """
(() => {
  const L = (arr, v) => { (window[arr] = window[arr] || []).push(v); };
  KIDS.voice.play = (k, t) => L('__vLog', { k: k, t: t });
  KIDS.voice.say = (t) => L('__vLog', { k: null, t: t });
  KIDS.voice.queue = (parts) => L('__qLog', parts);
  KIDS.audio.sfx = (n) => L('__sLog', n);
  KIDS.audio.note = (f) => L('__nLog', f);
  KIDS.speak = (t) => L('__vLog', { k: null, t: t });
  window.__sndStubbed = true;
})();
"""

def mk_save(levels, bonus=0, tut=True):
    today = datetime.date.today().isoformat()
    sv = {'v': '1.0', 'game': 'chartread', 'firstDay': today, 'lastDay': today,
          'levels': levels, 'dailyMin': {}, 'bonus': {today: bonus},
          'settings': {'sound': False, 'tts': False, 'vol': 0},
          'restTip': {'day': '', 'shown': 0}}
    if tut:
        sv['chartread'] = {'tutSeen': True}
    return sv

def all_static_done():
    return {'%d-%d' % (c, l): {'stars': 3, 'plays': 1}
            for c in range(1, 5) for l in range(8)}

async def wait_title(pg, want='VERIFY', polls=360):
    t = ''
    for _ in range(polls):
        t = await pg.evaluate('document.title')
        if want in t:
            break
        await pg.wait_for_timeout(500)
    return t

async def main():
    net_reqs, page_errs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()

        def watch(pg, tag):
            pg.on('pageerror', lambda e: (page_errs.append(tag + ':' + str(e))))
            pg.on('request', lambda r: net_reqs.append(tag + ':' + r.url)
                  if r.url.startswith('http') else None)

        # ---------- A/B verify 双视口（1280x800 + 800x1180 真 viewport） ----------
        vlog = None
        for w, h, tag in [(1280, 800, 'V1'), (800, 1180, 'V2')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            pg = await ctx.new_page()
            watch(pg, tag)
            await pg.goto(URL + '?verify=1')
            title = await wait_title(pg)
            res = await pg.evaluate('document.getElementById("verify-result").textContent')
            j = json.loads(res)
            print('VERIFY[%dx%d] title=%s pass=%s/%s layoutOk=%s' %
                  (w, h, title, j['pass'], j['total'], j['layoutOk']))
            if tag == 'V1':
                vlog = j
                for k in ('audit', 'tapMost', 'tapHowmany2', 'tapTotal', 'tapSecond',
                          'tapCompare', 'tapConstraint', 'tapTwocompare', 'frame',
                          'tutorial', 'swallow', 'clips', 'numcn', 'stars', 'contract',
                          'hints', 'estWin', 'modeled', 'speed'):
                    u = j.get('units', {}).get(k)
                    if u is not None:
                        print(' unit %-14s ok=%s %s' % (k, u.get('ok'),
                              {x: u[x] for x in u if x not in ('ok',) and not isinstance(u[x], (dict, list))}))
                bad = [k for k, v in list(j.get('levels', {}).items()) + list(j.get('gen', {}).items())
                       if not v.get('ok')]
                print(' bad levels:', bad[:10])
                # modeled 双钉（精确数字，禁约数）
                md = j.get('modeled', {})
                assert md.get('min') == MODELED_MIN, 'modeled min %s != %s（双钉回漂）' % (md.get('min'), MODELED_MIN)
                assert md.get('min') >= MODELED_MIN and j['units']['modeled']['ok']
                print(' modeled min=%s @flat%s byDch=%s (pin=%d 双钉过)' %
                      (md.get('min'), md.get('minFlat'), md.get('byDch'), MODELED_MIN))
                assert title == 'VERIFY PASS %d/%d' % (j['pass'], j['total']), 'verify title 非 PASS: %s' % title
                assert not bad and j['layoutOk'] and j['pass'] == j['total']
            else:
                assert title == 'VERIFY PASS %d/%d' % (j['pass'], j['total']), '竖视口 verify 非 PASS: %s' % title
            await ctx.close()
        print('GATE-A/B verify 双视口 PASS')

        # ---------- C 真实页：教学三态 + 真实点击通关 + 首错零惩罚 + sayW 三态 ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)          # 三层静音之一（context 级）
        pg = await ctx.new_page()
        watch(pg, 'C')
        await pg.goto(URL)                            # 空档 → 首次教学
        await pg.evaluate(STUB_SND)                   # 三层静音之二（stub + log）
        tut_states = []
        demo = None
        for _ in range(80):                           # 教学期轮询三态（watch→help）
            st = await pg.evaluate('(window.CH && CH.tutorial) || null')
            d = await pg.evaluate('window.__chDemoR || null')
            if d is not None:
                demo = d
            if st and st not in tut_states:
                tut_states.append(st)
            if st in ('help', 'solo'):
                break
            await pg.wait_for_timeout(500)
        assert demo == 'right', '教学演示 __chDemoR=%s' % demo
        assert tut_states[:2] == ['watch', 'help'], '教学三态序列异常: %s' % tut_states
        # 真实 DOM 点击：首错零惩罚（错卡不锁，可再选）+ 首个真点击通关题
        q0 = await pg.evaluate('CH.quiz')
        widx = next(i for i in range(len(q0['opts'])) if i != q0['answer'])
        await pg.click('.card[data-i="%d"]' % widx, force=True)   # 真实点击错卡
        await pg.wait_for_timeout(1300)               # 错点防重入窗 1000ms（真实时钟）
        m1 = await pg.evaluate('CH.currentLevel.miss')
        ridx = await pg.evaluate('CH.quiz.answer')
        await pg.click('.card[data-i="%d"]' % ridx, force=True)   # 错后同题可再选对（探索不罚）
        for _ in range(40):                           # 等演出窗推进
            st = await pg.evaluate('(CH.quiz && CH.quiz.step) || 1')
            if st >= 1:
                break
            await pg.wait_for_timeout(400)
        tut_after = await pg.evaluate('CH.tutorial')
        assert m1 == 1 and tut_after == 'solo', '首错零惩罚/独态失败 m1=%s tut=%s' % (m1, tut_after)
        r = await pg.evaluate('CH.autoSolve()')       # 通关当前关（真实判定链；已真点对 1 题 → 余 7）
        stars = None
        for _ in range(40):                           # 写档在 winFlow celebrate 链异步落
            stars = await pg.evaluate(
                "(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg.wait_for_timeout(700)
        assert r['done'] and r['taps'] == 7, 'autoSolve=%s' % r
        assert stars == 2, '1-0 星级=%s（1 错=2★）' % stars
        # sayW 三态：flat0<3 每错必播 / flat>=3 首错播+10s 内二错节流（qLog 不增）
        n0 = await pg.evaluate(WRONG_Q)
        q1 = await pg.evaluate('CH.quiz')
        w1 = next(i for i in range(len(q1['opts'])) if i != q1['answer'])
        await pg.click('.card[data-i="%d"]' % w1, force=True)
        await pg.wait_for_timeout(1300)
        n1 = await pg.evaluate(WRONG_Q)
        q2 = await pg.evaluate('CH.quiz')
        a2 = q2['answer']
        await pg.click('.card[data-i="%d"]' % a2, force=True)     # 推进
        await pg.wait_for_timeout(6500)
        await pg.evaluate('CH.start(4)')              # flat4>=3：节流域
        q3 = await pg.evaluate('CH.quiz')
        w3 = next(i for i in range(len(q3['opts'])) if i != q3['answer'])
        t0 = time.time()
        await pg.click('.card[data-i="%d"]' % w3, force=True)     # 首错必播
        await pg.wait_for_timeout(1300)
        n3 = await pg.evaluate(WRONG_Q)
        # 豁免窗=AGAIN_DUR[键]+300（T46 阶段2 clip 实长口径，最长 unit2 3384+300=3684；
        # est_ms 等待对 howmany·unit=2 边距仅 31ms——统一抬高下限 3684+400 保守覆盖）
        again_len = {'most': 8, 'least': 8, 'second': 11, 'howmany': 7, 'total': 12,
                     'compare': 11, 'constraint': 10, 'twocompare': 11}[q3['kind']]
        await pg.wait_for_timeout(max(est_ms(again_len) + 300 + 400, 3684 + 400))
        q4 = await pg.evaluate('CH.quiz')
        w4 = next(i for i in range(len(q4['opts'])) if i != q4['answer'] and i != w3)
        await pg.click('.card[data-i="%d"]' % w4, force=True)     # 二错（豁免窗外、10s 节流内 → 不播但计 miss）
        await pg.wait_for_timeout(1300)
        elapsed = time.time() - t0
        n4 = await pg.evaluate(WRONG_Q)
        m4 = await pg.current_level_miss() if hasattr(pg, 'current_level_miss') else await pg.evaluate('CH.currentLevel.miss')
        assert elapsed < 10.0, '计时预算超 10s 节流窗（%.1fs）——测试无效需重排' % elapsed
        assert n1 == n0 + 1 and n3 == n1 + 1 and n4 == n3, 'sayW 三态异常 n0=%s n1=%s n3=%s n4=%s' % (n0, n1, n3, n4)
        assert m4 == 2, '节流内二错仍计 miss=%s（应 2）' % m4
        print('GATE-C 教学三态+真实点击+首错零惩罚+sayW 三态 PASS (states=%s)' % tut_states)
        await ctx.close()

        # ---------- D 救援钟（真实页 14s 方向级：idle 重读题面——qLog 口径） ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)
        await ctx.add_init_script(
            "localStorage.setItem('%s', JSON.stringify(%s));" % (SAVE_KEY, json.dumps(mk_save({'1-0': {'stars': 3, 'plays': 1}}, tut=True))))
        pg = await ctx.new_page()
        watch(pg, 'D')
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)
        await pg.evaluate('CH.start(1)')
        await pg.evaluate('(window.__qLog||[]).length && window.__qLog.splice(0) ; 0')
        fires = 0
        for _ in range(36):                          # 15.5s 轮询（>14s 方向级窗）
            n = await pg.evaluate('(window.__qLog||[]).length')
            if n and n > 0:
                fires = n
                break
            await pg.wait_for_timeout(500)
        assert fires > 0, '14s 方向级救援未触发（qLog=0）'
        chain = await pg.evaluate('window.__qLog[0]')
        ok_chain = (isinstance(chain, list) and (
            (isinstance(chain[0], str) and chain[0].startswith('chr_')) or
            (isinstance(chain[0], dict) and chain[0].get('key') is None)))
        assert ok_chain, '救援链形态异常: %s' % chain
        print('GATE-D 救援钟 PASS (%d chains after idle>14s)' % fires)
        await ctx.close()

        # ---------- E 生成关种档触达（32 静态全通+bonus30 → flat32 真实点击通关） ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)
        await ctx.add_init_script(
            "localStorage.setItem('%s', JSON.stringify(%s));" % (SAVE_KEY, json.dumps(mk_save(all_static_done(), bonus=30))))
        pg = await ctx.new_page()
        watch(pg, 'E')
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)
        await pg.wait_for_timeout(1200)
        lv = await pg.evaluate('CH.currentLevel')
        exp_dch = await pg.evaluate('genLevel(32).dch')
        assert lv and lv['flat'] == 32 and lv['ch'] == 5, '生成关触达失败 lv=%s' % lv
        assert lv['dch'] == exp_dch and lv['n'] == 8, '生成关参数异常 lv=%s' % lv
        qe = await pg.evaluate('CH.quiz')            # 生成关首个真实点击
        ae = qe['answer']
        await pg.click('.card[data-i="%d"]' % ae, force=True)
        for _ in range(40):
            st = await pg.evaluate('(CH.quiz && CH.quiz.step) || 1')
            if st >= 1:
                break
            await pg.wait_for_timeout(400)
        re_ = await pg.evaluate('CH.autoSolve()')
        assert re_['done'] and re_['taps'] == 7, '生成关通关失败=%s' % re_
        print('GATE-E 生成关种档触达 PASS (flat32 dch=%s n=%s)' % (lv['dch'], lv['n']))
        await ctx.close()

        # ---------- F 末章关（flat31 ch4）真实点击通关 ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(INIT_SND)
        await ctx.add_init_script(
            "localStorage.setItem('%s', JSON.stringify(%s));" % (SAVE_KEY, json.dumps(mk_save({}, tut=True))))
        pg = await ctx.new_page()
        watch(pg, 'F')
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)
        await pg.evaluate('CH.start(31)')
        qf = await pg.evaluate('CH.quiz')
        af = qf['answer']
        await pg.click('.card[data-i="%d"]' % af, force=True)
        for _ in range(40):
            st = await pg.evaluate('(CH.quiz && CH.quiz.step) || 1')
            if st >= 1:
                break
            await pg.wait_for_timeout(400)
        rf = await pg.evaluate('CH.autoSolve()')
        assert rf['done'] and rf['taps'] == 7, '末章关通关失败=%s' % rf
        print('GATE-F 末章关 flat31 真实点击通关 PASS')
        await ctx.close()

        # ---------- G 存档迁移三例（旧基矛盾态重置 / 新基合法保留 / 脏键重置） ----------
        old_base = {'1-%d' % l: {'stars': 3, 'plays': 2} for l in range(5)}
        old_base.update({'2-%d' % l: {'stars': 3, 'plays': 1} for l in range(5)})
        good_new = {'1-%d' % l: {'stars': 3, 'plays': 1} for l in range(8)}
        good_new['2-0'] = {'stars': 2, 'plays': 1}
        dirty = {'1-9': {'stars': 3, 'plays': 1}}
        for tag, seed, want_kept in [('旧基矛盾', old_base, False),
                                     ('新基合法', good_new, True),
                                     ('脏键1-9', dirty, False)]:
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(INIT_SND)
            await ctx.add_init_script(
                "localStorage.setItem('%s', JSON.stringify(%s));" % (SAVE_KEY, json.dumps(mk_save(seed, tut=True))))
            pg = await ctx.new_page()
            watch(pg, 'G-' + tag)
            await pg.goto(URL)
            await pg.wait_for_timeout(900)
            kept = await pg.evaluate(
                "(function(){const s=JSON.parse(localStorage.getItem('%s')||'{}');return s && s.levels ? Object.keys(s.levels).length : -1;})()" % SAVE_KEY)
            if want_kept:
                assert kept == len(seed), '迁移误重置：%s kept=%s want=%d' % (tag, kept, len(seed))
            else:
                assert kept == 0, '迁移未重置：%s kept=%s' % (tag, kept)
            print(' GATE-G 迁移[%s] %s (levels=%s)' % (tag, '保留' if want_kept else '重置', kept))
            await ctx.close()
        print('GATE-G 存档迁移三例 PASS')

        # ---------- H P1b 真竖屏轮（真 viewport 800x1180 + body.port 类通道实测） ----------
        ctx = await b.new_context(viewport={'width': 800, 'height': 1180})
        await ctx.add_init_script(INIT_SND)
        await ctx.add_init_script(
            "localStorage.setItem('%s', JSON.stringify(%s));" % (SAVE_KEY, json.dumps(mk_save({}, tut=True))))
        pg = await ctx.new_page()
        watch(pg, 'H')
        await pg.goto(URL)
        await pg.evaluate(STUB_SND)
        has_port = await pg.evaluate('document.body.classList.contains("port")')
        assert has_port, '真竖屏 body.port 类通道未挂（applyPort 失效）'
        await pg.evaluate('CH.start(8)')             # ch2 一格代表 2（成对格+角标）
        await pg.wait_for_timeout(300)
        probe = await pg.evaluate("""(() => {
          const cards = Array.from(document.querySelectorAll('.card')).map(c => ({w: c.offsetWidth, h: c.offsetHeight}));
          const rows = Array.from(document.querySelectorAll('#chart .row')).map(r => r.offsetHeight);
          const unit = document.querySelector('#chart .unit');
          const axis = document.querySelector('.axis-tag');
          const g = document.getElementById('game');
          return { cards: cards.length, cardMin: cards.length ? Math.min(...cards.map(c => Math.min(c.w, c.h))) : 0,
                   rows: rows.length, rowMin: rows.length ? Math.min(...rows) : 0,
                   unitH: unit ? unit.getBoundingClientRect().height : 0,
                   axis: axis ? axis.textContent : null,
                   ox: Math.max(g.scrollWidth - g.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth) };
        })()""")
        assert probe['cards'] >= 3 and probe['cardMin'] >= 96, '竖屏卡尺寸=%s' % probe
        assert probe['rows'] == 3 and probe['rowMin'] >= 48, '竖屏行高=%s' % probe
        assert probe['unitH'] >= 22 and probe['axis'] == '一格=2', '竖屏格/角标=%s' % probe
        assert probe['ox'] <= 0, '竖屏横向溢出=%s' % probe
        print('GATE-H 真竖屏轮 PASS (%s)' % json.dumps(probe, ensure_ascii=False))
        await ctx.close()

        await b.close()

    # ---------- 全局：完全离线（0 外部请求）+ 0 pageerror ----------
    assert not net_reqs, '发现外部网络请求: %s' % net_reqs[:5]
    assert not page_errs, 'pageerror: %s' % page_errs[:5]
    print('GATE-I 完全离线(0 http req)+0 pageerror PASS')
    print('SELFTEST ALL PASS (modeled pin=%d estMs(6)=%d)' % (MODELED_MIN, est_ms(6)))

asyncio.run(main())
