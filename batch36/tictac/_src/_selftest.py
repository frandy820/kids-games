# -*- coding: utf-8 -*-
"""tictac r18 自测（_selftest.py）——真实页驱动链：
S0 verify=1（title=VERIFY PASS 20/20）
S1 残局错链三态（真时钟：错计 miss/窗内吞/窗后照计）+miss≥2 答案级
S1b 契约J sayW 三态行为级（kitchen :549-601 参照——链起播设窗/窗内同错吞 false/窗后 10s 节流内
    照计不重播不设窗/10s 后链重播；窗常量推导 WRONG_CHAIN=tk_wrong 实长+300 勿手写）
S2 救援双锚（14s 方向级 pulse/30s 答案级 breathe——lastAct/lastDir 独立节流锚）
S3 AI perfect 档全谱独立实证（evaluate 内独立 JS minimax 整树 DFS 无 X 胜）
S4 modeled 双钉（页 estMs/modeled vs 本文件独立重列 lambda/SPEC 精确值）
2a classic 真实点击链  2b fresh 教学链  2c 残局真实点击+写档（miss=2→2★→levels['5-0']）
2d v44 真实点击链  2e vroll 真实点击链（oldest 标记+FIFO 移子）
2f 双视口四型布局+竖屏通道等价（@media vs body.port 计算值相等）+截图非空白
MIG 迁移三例（A 旧基矛盾态重置[教学起播不入零声断言]/B 新基合法含 ch≥8 保留/C 脏键 '1-6' 重置）
纪律：独立 chromium.launch() headless+--mute-audio；INIT 三层静音（speechSynthesis stub
+AudioContext 假工厂+种子档 settings sound/tts false）；不 connect/不杀任何浏览器进程；
断言全 DOM/钩子（无 analyze_image）；不写 .last_artifact。"""
import asyncio, json, pathlib, sys, time
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
EST_MS = lambda n: n * 345 + 600          # 家族 T 四方同步之四：本文件独立重列
MODELED = {0: 99660, 24: 88020, 30: 166860, 36: 166860, 42: 99660}   # §-r18 §4 精确值
TK_WRONG_MS = 2448                        # tk_wrong 实测时长（§-r18 §7 表）
WRONG_CHAIN = TK_WRONG_MS + 300           # §-r18 §5 错链窗=实长+300（推导勿手写 2748）
J_THROTTLE_MS = 10000                     # 契约 J 语义句节流

INIT_SND = """
  window.__sndSpy = { synth: 0, ac: 0 };
  window.speechSynthesis = { speak(){ window.__sndSpy.synth++; }, cancel(){}, pause(){},
    resume(){}, pending:false, speaking:false, paused:false, getVoices(){ return []; },
    addEventListener(){}, removeEventListener(){} };
  function _fac() { window.__sndSpy.ac++; return { state:'running', sampleRate:48000,
    currentTime:0, destination:{}, resume(){ return Promise.resolve(); },
    close(){ return Promise.resolve(); },
    createOscillator(){ return { connect(){}, start(){}, stop(){},
      frequency:{ value:0, setValueAtTime(){} } }; },
    createGain(){ return { connect(){}, gain:{ value:0, setValueAtTime(){},
      exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} } }; },
    createBuffer(){ return { getChannelData(){ return new Float32Array(1); } }; },
    createBufferSource(){ return { connect(){}, start(){}, stop(){}, buffer:null }; } };
  }
  window.AudioContext = _fac; window.webkitAudioContext = _fac;
"""

# KIDS.voice stub 层（goto 后注入——kitchen :151-171 参照）：词法回退引用
# `window.KIDS || (typeof KIDS !== 'undefined' ? KIDS : null)`——core 的 KIDS 是顶层 const
# 词法绑定不上 window，`if (window.KIDS)` 旧模板会静默跳过整个 stub 块（r17 隐性坑）。
# 仅记录调用意图（__voiceLog），替换后不发声（纪律：测试音频不可闻）。
STUB_VOICE = """
(() => {
  const noop = () => {};
  window.__voiceLog = [];
  const K = window.KIDS || (typeof KIDS !== 'undefined' ? KIDS : null);
  if (K) {
    if (K.voice) {
      K.voice.play = (k, t) => { window.__voiceLog.push('play:' + k); };
      K.voice.say = t => { window.__voiceLog.push('say'); };
      K.voice.queue = parts => { window.__voiceLog.push(
        'queue:' + (parts || []).map(p => typeof p === 'string' ? p : ((p && p.key) || 'TTS')).join('|')); };
    }
    if (K.audio) { K.audio.sfx = noop; K.audio.note = noop; }
    if (K.speak) K.speak = noop;
  }
})();
"""

def preset_save(extra_levels=None, tut=True):
    """种子档（INIT 第三层：settings sound/tts false=零发声）"""
    sv = { 'v': '1.0', 'game': 'tictac', 'firstDay': TODAY, 'lastDay': TODAY,
           'levels': extra_levels or {}, 'dailyMin': {},
           'settings': { 'sound': False, 'tts': False, 'vol': 0.6 },
           'restTip': { 'day': '', 'shown': 0 } }
    if tut:
        sv['tictac'] = { 'tutSeen': True }
    return json.dumps(sv, ensure_ascii=False)

RESULTS = []
def report(name, ok, detail=''):
    RESULTS.append((name, bool(ok), str(detail)[:200]))
    print('%-28s %s %s' % (name, 'PASS' if ok else 'FAIL', str(detail)[:160]), flush=True)

async def new_page(browser, w=1280, h=800, seed_json=None, errs=None):
    page = await browser.new_page(viewport={'width': w, 'height': h})
    if errs is not None:
        page.on('pageerror', lambda e: errs.append(str(e)))
    await page.add_init_script(INIT_SND)                       # 静音层 1+2
    if seed_json is not None:
        await page.add_init_script("localStorage.setItem('kidsgame_tictac', %s);" % json.dumps(seed_json))
    await page.goto(URL)
    return page

BATTLE_READY = ('!!(cur && !cur.done && !state.rabbit && !state.roundEnd && !state.review && '
                'cur.rounds && cur.rounds[cur.roundIdx] && !cur.rounds[cur.roundIdx].over)')
ROUND_OVER = ('!!(cur && cur.rounds && cur.rounds[cur.roundIdx] && cur.rounds[cur.roundIdx].over)')
PUZ_READY = ('!!(cur && cur.kind === "puzzle" && !cur.done && !state.roundEnd && !state.review && '
             'cur.puzzles && cur.puzzles[cur.step] && !cur.puzzles[cur.step].solved)')

def pick_move_py(board):
    """python 侧走子启发（独立于页面引擎：中→角→边→首空）"""
    if board[4] == '': return 4
    for c in (0, 2, 6, 8, 1, 3, 5, 7):
        if board[c] == '': return c
    return board.index('')

async def wait_js(page, expr, timeout=30000):
    t0 = time.time()
    while time.time() - t0 < timeout / 1000:
        if await page.evaluate('Boolean(%s)' % expr):
            return True
        await asyncio.sleep(0.1)
    return False

async def drive_round_clicks(page, n_cells):
    """真实点击走完当前一局；返回 {final, bad}——final=终局快照或 None，bad=失败说明
    （负局复盘窗阻塞在 tap 链内：终局后须等 results 落账再返回——cur.results 才推进）"""
    res0 = await page.evaluate('window.TK.currentLevel.results.length')
    for t in range(40):
        if not await wait_js(page, '(%s) || (%s)' % (BATTLE_READY, ROUND_OVER), 20000):
            return {'final': None, 'bad': 'not-ready'}
        if await page.evaluate(ROUND_OVER):
            fin = await page.evaluate('window.TK.final')
            await wait_js(page, '(cur && (cur.results.length > %d || cur.done))' % res0, 15000)
            return {'final': fin, 'bad': None}
        q = await page.evaluate('window.TK.quiz')
        if not q:
            return {'final': None, 'bad': 'no-quiz'}
        mv = pick_move_py(q['board'])
        if mv is None or q['board'][mv] != '':
            return {'final': None, 'bad': 'no-move'}
        before = q['board']
        await page.click('.cell[data-i="%d"]' % mv)
        if not await wait_js(page, '(%s) || (%s)' % (BATTLE_READY, ROUND_OVER), 10000):
            return {'final': None, 'bad': 'stuck'}
        if await page.evaluate(ROUND_OVER):
            fin = await page.evaluate('window.TK.final')
            await wait_js(page, '(cur && (cur.results.length > %d || cur.done))' % res0, 15000)
            return {'final': fin, 'bad': None}
        q2 = await page.evaluate('window.TK.quiz')
        if q2 and q2.get('round') == q['round']:
            diff = [k for k in range(n_cells) if before[k] != q2['board'][k]]
            if len(diff) != 2 or q2['board'][mv] != 'X':
                return {'final': None, 'bad': 'diff %s' % diff}
    return {'final': None, 'bad': 'exhausted'}

async def main():
    total_errs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--mute-audio', '--no-sandbox'])

        # ---------- S0 verify=1 ----------
        try:
            vp = await browser.new_page(viewport={'width': 1280, 'height': 800})
            await vp.add_init_script(INIT_SND)
            verrs = []
            vp.on('pageerror', lambda e: verrs.append(str(e)))
            await vp.goto(URL + '?verify=1')
            t0 = time.time(); title = ''
            while time.time() - t0 < 300:
                title = await vp.title()
                if title.startswith('VERIFY'): break
                await asyncio.sleep(1)
            vlog = await vp.evaluate('window.__tkVlog ? { p: window.__tkVlog.pass, t: window.__tkVlog.total } : null')
            report('S0 verify 20/20', title == 'VERIFY PASS 20/20' and vlog and vlog['p'] == 20,
                   '%s errs=%d (%.0fs)' % (title, len(verrs), time.time() - t0))
            await vp.close()
        except Exception as e:
            report('S0 verify 20/20', False, repr(e)[:150])

        # ---------- 主场景页（种子档 tutSeen+静音）——2a/S1/S2/S4/2d/2e/S3 ----------
        errs = []
        page = await new_page(browser, seed_json=preset_save(), errs=errs)
        await wait_js(page, 'window.TK && cur', 8000)

        # 2a classic 真实点击链（一局走完：演化合法/终局快照/计分）
        try:
            await page.evaluate('window.TK.start(0)')
            r = await drive_round_clicks(page, 9)
            lv = await page.evaluate('window.TK.currentLevel')
            ok2a = r['bad'] is None and isinstance(r['final'], dict) and \
                r['final'].get('result') in ('win', 'draw', 'lose') and \
                lv['results'][0] == r['final']['result'] and lv['miss'] == 0 and lv['kind'] == 'battle'
            report('2a classic real-click', ok2a, 'final=%s results=%s bad=%s' % (
                (r['final'] or {}).get('result') if isinstance(r['final'], dict) else r['final'],
                lv['results'], r['bad']))
        except Exception as e:
            report('2a classic real-click', False, repr(e)[:150])

        # S1 残局错链三态+答案级（真时钟）
        try:
            await page.evaluate('window.TK.start(24)')
            await wait_js(page, PUZ_READY)
            q = await page.evaluate('window.TK.quiz')
            wrongs = [i for i in range(9) if q['board'][i] == '' and i != q['answer']][:3]
            await page.click('.cell[data-i="%d"]' % wrongs[0])      # 错 1：miss=1+窗设+错链
            m1 = await page.evaluate('window.TK.quiz.miss')
            await page.click('.cell[data-i="%d"]' % wrongs[1])      # 窗内错点：吞（miss 不增）
            m2 = await page.evaluate('window.TK.quiz.miss')
            await asyncio.sleep(3.0)                                # 过窗（2748 真时钟；J 10s 节流内）
            await page.click('.cell[data-i="%d"]' % wrongs[2])      # 窗后二错：miss 照计=2
            m3 = await page.evaluate('window.TK.quiz.miss')
            breathe = await page.evaluate('Boolean(document.querySelector(".cell.breathe"))')
            await wait_js(page, PUZ_READY, 8000)
            await page.click('.cell[data-i="%d"]' % q['answer'])    # 判对放行→下一题
            await wait_js(page, '(cur.step === 1) || Boolean(cur && cur.done)', 8000)
            round2 = await page.evaluate('window.TK.currentLevel.round')
            ok1 = m1 == 1 and m2 == 1 and m3 == 2 and breathe and round2 == 2
            report('S1 puzzle wrong-chain', ok1, 'miss=%s/%s/%s breathe=%s round=%s' % (m1, m2, m3, breathe, round2))
        except Exception as e:
            report('S1 puzzle wrong-chain', False, repr(e)[:150])

        # S1b 契约 J sayW 三态行为级（独立页——主页面错链史会残留 lastWrongVoice 节流锚）：
        # ①链起播+设窗 ②窗内同错吞 false ③窗过期但 10s 节流内=miss 照计·链不重播·窗不重设
        # ④10s 节流过=链重播+窗重设（窗常量 WRONG_CHAIN/J_THROTTLE_MS 推导，勿手写）
        try:
            errs_b = []
            pb = await new_page(browser, seed_json=preset_save(), errs=errs_b)
            await wait_js(pb, 'window.TK && cur', 8000)
            await pb.evaluate(STUB_VOICE)          # goto 后 stub（词法回退——勿 if(window.KIDS)）
            CHAIN_N = 'window.__voiceLog ? window.__voiceLog.filter(v => v === "queue:tk_wrong").length : -1'
            await pb.evaluate('window.TK.start(24)')
            await wait_js(pb, PUZ_READY)
            qb = await pb.evaluate('window.TK.quiz')
            wc = next(i for i in range(9) if qb['board'][i] == '' and i != qb['answer'])
            t0 = time.time()
            r1 = await pb.evaluate('window.TK.tapCell(%d)' % wc)      # ① 起播+设窗
            m1 = await pb.evaluate('window.TK.quiz.miss')
            w1v = await pb.evaluate('wrongChainUntil')
            c1 = await pb.evaluate(CHAIN_N)
            r2 = await pb.evaluate('window.TK.tapCell(%d)' % wc)      # ② 窗内同错→吞 false
            m2 = await pb.evaluate('window.TK.quiz.miss')
            c2 = await pb.evaluate(CHAIN_N)
            # ③ 过窗（WRONG_CHAIN 真时钟）但仍在 10s 节流内
            await asyncio.sleep(max(0.0, WRONG_CHAIN / 1000.0 + 0.8 - (time.time() - t0)))
            r3 = await pb.evaluate('window.TK.tapCell(%d)' % wc)      # ③ 照计·不重播·不设窗
            m3 = await pb.evaluate('window.TK.quiz.miss')
            w3v = await pb.evaluate('wrongChainUntil')
            c3 = await pb.evaluate(CHAIN_N)
            # ④ 距链起播 ≥10s（节流锚=①时刻）→链重播
            await asyncio.sleep(max(0.0, (J_THROTTLE_MS + 1000) / 1000.0 - (time.time() - t0)))
            r4 = await pb.evaluate('window.TK.tapCell(%d)' % wc)      # ④ 重播+窗重设
            m4 = await pb.evaluate('window.TK.quiz.miss')
            w4v = await pb.evaluate('wrongChainUntil')
            c4 = await pb.evaluate(CHAIN_N)
            okb = (r1 == 'wrong' and m1 == 1 and c1 == 1 and w1v > 0 and
                   r2 is False and m2 == 1 and c2 == 1 and
                   r3 == 'wrong' and m3 == 2 and c3 == 1 and w3v == w1v and
                   r4 == 'wrong' and m4 == 3 and c4 == 2 and w4v > w1v + 5000)
            report('S1b 契约J sayW 三态', okb,
                   'r=%s/%s/%s/%s miss=%s/%s/%s/%s chain=%s/%s/%s/%s win=%s→%s' % (
                       r1, r2, r3, r4, m1, m2, m3, m4, c1, c2, c3, c4, w1v, w4v))
            report('pageerror (sayW)', len(errs_b) == 0, '; '.join(errs_b[:2]))
            total_errs += errs_b
            await pb.close()
        except Exception as e:
            report('S1b 契约J sayW 三态', False, repr(e)[:150])

        # S2 救援双锚（双锚 -20s→14s 方向级 pulse；再 -31s→30s 答案级 breathe）
        try:
            await page.evaluate('window.TK.start(0)')
            await wait_js(page, BATTLE_READY)
            await page.evaluate('lastAct = Date.now() - 20000; lastDir = Date.now() - 20000;')
            got_pulse = False
            for _ in range(60):
                got_pulse = await page.evaluate('Boolean(document.querySelector(".cell.pulse"))')
                if got_pulse: break
                await asyncio.sleep(0.3)
            await page.evaluate('lastAct = Date.now() - 31000; lastDir = Date.now() - 31000;')
            got_breathe = False
            for _ in range(60):
                got_breathe = await page.evaluate('Boolean(document.querySelector(".cell.breathe"))')
                if got_breathe: break
                await asyncio.sleep(0.3)
            report('S2 rescue dual anchors', bool(got_pulse and got_breathe),
                   'pulse=%s breathe=%s' % (bool(got_pulse), bool(got_breathe)))
        except Exception as e:
            report('S2 rescue dual anchors', False, repr(e)[:150])

        # S4 modeled 双钉
        try:
            got = await page.evaluate('({ e5: estMs("abcde"), m: [0,24,30,36,42].map(f => modeled(f)) })')
            exp = [MODELED[f] for f in (0, 24, 30, 36, 42)]
            report('S4 modeled double-pin', got['e5'] == EST_MS(5) and got['m'] == exp,
                   'e5=%d/%d m=%s/%s' % (got['e5'], EST_MS(5), got['m'], exp))
        except Exception as e:
            report('S4 modeled double-pin', False, repr(e)[:150])

        # 2d v44 真实点击链（16 格+b16/w16 类+一局走完）
        try:
            await page.evaluate('window.TK.start(30)')
            await wait_js(page, BATTLE_READY)
            probe = await page.evaluate(
                '({ n: document.querySelectorAll(".cell").length, '
                'b16: document.getElementById("board").classList.contains("b16") && '
                '     document.getElementById("board-wrap").classList.contains("w16") })')
            r4 = await drive_round_clicks(page, 16)
            lv4 = await page.evaluate('window.TK.currentLevel')
            ok4d = probe['n'] == 16 and probe['b16'] and r4['bad'] is None and \
                isinstance(r4['final'], dict) and r4['final'].get('result') in ('win', 'draw', 'lose') and \
                lv4['kind'] == 'v44' and lv4['results'][0] == r4['final']['result']
            report('2d v44 real-click', ok4d, 'n=%d b16=%s final=%s bad=%s' % (
                probe['n'], probe['b16'],
                (r4['final'] or {}).get('result') if isinstance(r4['final'], dict) else r4['final'], r4['bad']))
        except Exception as e:
            report('2d v44 real-click', False, repr(e)[:150])

        # 2e vroll 真实点击链（oldest 标记+FIFO 移子；X 取子=页面引擎镜像堵杀——
        # heuristic 3 手即被兔杀到不了第 4 子，选子脚手架用引擎不算断言同源）
        try:
            await page.evaluate('window.TK.start(36)')
            await wait_js(page, BATTLE_READY)
            oldest_seen = False; removal_ok = False
            for t in range(24):
                if not await wait_js(page, '(%s) || (%s)' % (BATTLE_READY, ROUND_OVER), 20000):
                    break
                over = await page.evaluate(ROUND_OVER)
                q = await page.evaluate('window.TK.quiz')
                if not q or q.get('xq') is None or q.get('round') is None:
                    break
                if len(q['xq']) >= 3 and not oldest_seen:
                    # markOldest 在兔应手后跑（终局残留也在 DOM）——xq≥3 即查
                    # oldestDOM=[xq[0]]（FIFO 最旧子恰一枚带 .oldest）
                    dom_old = await page.evaluate(
                        'Array.from(document.querySelectorAll(".cell.oldest")).map(c => Number(c.dataset.i))')
                    oldest_seen = dom_old == [q['xq'][0]]
                if len(q['xq']) >= 3 and not over and not removal_ok:
                    old0 = q['xq'][0]
                    mv = await page.evaluate(
                        'engRollPick({ board: window.TK.quiz.board, xq: window.TK.quiz.xq, oq: window.TK.quiz.oq }, "X")')
                    if mv is None or q['board'][mv] != '':
                        break
                    await page.click('.cell[data-i="%d"]' % mv)    # 第 4 子=移出最旧
                    await wait_js(page, '(%s) || (%s)' % (BATTLE_READY, ROUND_OVER), 10000)
                    q2 = await page.evaluate('window.TK.quiz')
                    if q2 and q2.get('xq') is not None:
                        removal_ok = (old0 not in q2['xq']) and len(q2['xq']) in (0, 3)
                elif not over and len(q['xq']) < 3:
                    mv = await page.evaluate(
                        'engRollPick({ board: window.TK.quiz.board, xq: window.TK.quiz.xq, oq: window.TK.quiz.oq }, "X")')
                    if mv is None or q['board'][mv] != '':
                        break
                    await page.click('.cell[data-i="%d"]' % mv)
                    await wait_js(page, '(%s) || (%s)' % (BATTLE_READY, ROUND_OVER), 10000)
                elif over:
                    # 本局终了（兔/己杀先至）→ 等下一局起（results 落账）
                    res0 = await page.evaluate('window.TK.currentLevel.results.length')
                    await wait_js(page, '(cur && (cur.results.length > %d || cur.done))' % res0, 15000)
                    if await page.evaluate('Boolean(cur && cur.done)'):
                        break
                if oldest_seen and removal_ok:
                    break
            qz = await page.evaluate('window.TK.quiz')
            ok5 = oldest_seen and removal_ok and qz and qz.get('kind') == 'vroll' and \
                isinstance(qz.get('xq'), list) and isinstance(qz.get('oq'), list) and \
                isinstance(qz.get('moves'), int)
            report('2e vroll real-click', ok5, 'oldest=%s removal=%s' % (oldest_seen, removal_ok))
        except Exception as e:
            report('2e vroll real-click', False, repr(e)[:150])

        # S3 AI perfect 全谱独立实证（evaluate 内独立 JS minimax——SPEC 文字重列）
        try:
            sp = await page.evaluate("""(() => {
              const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
              const scan = b => { for (const x of L) if (b[x[0]] && b[x[0]]===b[x[1]] && b[x[1]]===b[x[2]]) return b[x[0]]; return null; };
              const emp = b => { const e=[]; for (let i=0;i<9;i++) if (!b[i]) e.push(i); return e; };
              const mm = (b, turn, d) => {
                const w = scan(b); if (w) return w==='O' ? 10-d : d-10;
                const e = emp(b); if (!e.length) return 0;
                let best = turn==='O' ? -99 : 99;
                for (const i of e) { b[i]=turn; const s=mm(b, turn==='O'?'X':'O', d+1); b[i]='';
                  if (turn==='O' ? s>best : s<best) best=s; }
                return best; };
              const perfect = b => { let best=-99, pick=-1;
                for (const i of emp(b)) { b[i]='O'; const s=mm(b,'X',1); b[i]='';
                  if (s>best) { best=s; pick=i; } } return pick; };
              let xwin = false, oNodes = 0;
              const dfs = (b, turn) => {
                const w = scan(b); if (w) { if (w==='X') xwin = true; return; }
                const e = emp(b); if (!e.length) return;
                if (turn==='X') { for (const i of e) { b[i]='X'; dfs(b,'O'); b[i]=''; } }
                else { oNodes++; const i = perfect(b.slice()); b[i]='O'; dfs(b,'X'); b[i]=''; } };
              dfs(['','','','','','','','',''], 'X');
              return { xwin: xwin, oNodes: oNodes };
            })()""")
            report('S3 perfect full-spectrum', (not sp['xwin']) and sp['oNodes'] >= 500,
                   'xwin=%s oNodes=%d' % (sp['xwin'], sp['oNodes']))
        except Exception as e:
            report('S3 perfect full-spectrum', False, repr(e)[:150])

        spy = await page.evaluate('window.__sndSpy')
        report('zero-sound (seeded tts=false)', spy['synth'] == 0, 'synth=%d ac=%d' % (spy['synth'], spy['ac']))
        report('pageerror (main page)', len(errs) == 0, '; '.join(errs[:2]))
        total_errs += errs
        await page.close()

        # ---------- 2b fresh 教学链（空档→freshTut 真跑；空档合法播语音不入零声断言） ----------
        try:
            errs_b = []
            pb = await new_page(browser, seed_json=None, errs=errs_b)
            await wait_js(pb, 'window.TK && cur && state.tut === "watch"', 10000)
            demo_null = await pb.evaluate('window.TK.tapCell(4).then(r => r === null)')  # 演示期 null
            got_done = False
            for _ in range(120):
                got_done = await pb.evaluate('window.__tkDemoR === "done"')
                if got_done: break
                await asyncio.sleep(0.3)
            tut_help = await pb.evaluate('window.TK.tutorial')          # 'help'
            await wait_js(pb, 'window.TK.quiz && !state.demo && !state.rabbit && !state.roundEnd', 8000)
            qb = await pb.evaluate('window.TK.quiz')
            await pb.click('.cell[data-i="%d"]' % pick_move_py(qb['board']))   # 首合法子→帮→独
            solo = await pb.evaluate('window.__tkTutSolo === true')
            for t in range(40):                                          # 走完迷你局→自动 startLevel(0)
                if await pb.evaluate('Boolean(cur && cur.flat >= 0)'): break
                if not await wait_js(pb, 'window.TK.quiz && !state.demo && !state.rabbit && !state.roundEnd', 8000):
                    break
                qq = await pb.evaluate('window.TK.quiz')
                if qq is None: break
                await pb.click('.cell[data-i="%d"]' % pick_move_py(qq['board']))
            advanced = await pb.evaluate('Boolean(cur && cur.flat === 0 && cur.kind === "battle")')
            okb = demo_null and got_done and tut_help == 'help' and solo and advanced
            report('2b fresh tutorial', okb, 'demoNull=%s done=%s tut=%s solo=%s adv=%s' % (
                demo_null, got_done, tut_help, solo, advanced))
            report('pageerror (tutorial)', len(errs_b) == 0, '; '.join(errs_b[:2]))
            total_errs += errs_b
            await pb.close()
        except Exception as e:
            report('2b fresh tutorial', False, repr(e)[:150])

        # ---------- 2c 残局真实点击+写档（miss=2→2★→levels['5-0']） ----------
        try:
            errs_c = []
            pc = await new_page(browser, seed_json=preset_save(), errs=errs_c)
            await wait_js(pc, 'window.TK && cur', 8000)
            await pc.evaluate('window.TK.start(24)')
            await wait_js(pc, PUZ_READY)
            q = await pc.evaluate('window.TK.quiz')
            wrongs = [i for i in range(9) if q['board'][i] == '' and i != q['answer']][:2]
            await pc.click('.cell[data-i="%d"]' % wrongs[0])       # 错 1（miss=1+窗设）
            await pc.click('.cell[data-i="%d"]' % wrongs[1])       # 窗内吞（miss 留 1）
            await asyncio.sleep(3.0)                               # 过窗
            qw = await pc.evaluate('window.TK.quiz')               # 窗后挑仍空的错格→miss=2
            w3 = next((i for i in (wrongs[0], wrongs[1]) if qw['board'][i] == ''), None)
            if w3 is not None:
                await pc.click('.cell[data-i="%d"]' % w3)
            for k in range(8):                                     # 解剩余 5 题（含当前）
                if await pc.evaluate('Boolean(cur && cur.done)'): break
                if not await wait_js(pc, '(%s) || Boolean(cur && cur.done)' % PUZ_READY, 10000):
                    break
                qq = await pc.evaluate('window.TK.quiz')
                if qq is None: break
                await pc.click('.cell[data-i="%d"]' % qq['answer'])
                await asyncio.sleep(0.6)
            lvc = await pc.evaluate('window.TK.currentLevel')
            await asyncio.sleep(4.5)                               # celebrate(2620)+400 后写档
            raw = await pc.evaluate("localStorage.getItem('kidsgame_tictac')")
            jc = json.loads(raw) if raw else {}
            saved = (jc.get('levels') or {}).get('5-0')
            okc = lvc['done'] and lvc['miss'] == 2 and lvc['stars'] == 2 and \
                saved and saved.get('stars') == 2
            report('2c puzzle save 5-0', okc, 'lv(miss=%s stars=%s done=%s) saved=%s' % (
                lvc['miss'], lvc['stars'], lvc['done'], saved))
            report('pageerror (puzzle)', len(errs_c) == 0, '; '.join(errs_c[:2]))
            total_errs += errs_c
            await pc.close()
        except Exception as e:
            report('2c puzzle save 5-0', False, repr(e)[:150])

        # ---------- 2f 双视口四型布局+竖屏通道等价+截图非空白 ----------
        try:
            sizes = {}
            shots = []
            port_cls = {}
            media_m = {}
            for (w, h) in ((1280, 800), (800, 1180)):
                errs_f = []
                pf = await new_page(browser, w=w, h=h, seed_json=preset_save(), errs=errs_f)
                await wait_js(pf, 'window.TK && cur', 8000)
                ok_sizes = True
                for flat, expn in ((0, 9), (24, 9), (30, 16), (36, 9)):
                    await pf.evaluate('(async () => { window.TK.start(%d); '
                                      'await new Promise(r => setTimeout(r, 450)); })()' % flat)
                    s = await pf.evaluate(
                        '({ n: document.querySelectorAll(".cell").length, '
                        'min: Math.min(...Array.from(document.querySelectorAll(".cell"))'
                        '  .map(c => Math.min(c.offsetWidth, c.offsetHeight))), '
                        'ox: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0) })')
                    sizes['%d@%dx%d' % (flat, w, h)] = s
                    ok_sizes = ok_sizes and s['n'] == expn and s['min'] >= 96 and s['ox'] == 0
                sizes['ok_%dx%d' % (w, h)] = ok_sizes
                shot = HERE / ('_probe_shot_%dx%d.png' % (w, h))
                await pf.screenshot(path=str(shot))
                shots.append((shot, shot.stat().st_size))
                if (w, h) == (1280, 800):
                    await pf.evaluate('(async () => { window.TK.start(0); '
                                      'await new Promise(r => setTimeout(r, 250)); '
                                      'document.body.classList.add("port"); '
                                      'await new Promise(r => setTimeout(r, 250)); })()')
                    port_cls['w'] = await pf.evaluate('document.getElementById("board-wrap").offsetWidth')
                    await pf.evaluate('(async () => { window.TK.start(30); '
                                      'await new Promise(r => setTimeout(r, 250)); })()')
                    port_cls['w16'] = await pf.evaluate('document.getElementById("board-wrap").offsetWidth')
                else:
                    await pf.evaluate('(async () => { window.TK.start(0); '
                                      'await new Promise(r => setTimeout(r, 250)); })()')
                    media_m['w'] = await pf.evaluate('document.getElementById("board-wrap").offsetWidth')
                    await pf.evaluate('(async () => { window.TK.start(30); '
                                      'await new Promise(r => setTimeout(r, 250)); })()')
                    media_m['w16'] = await pf.evaluate('document.getElementById("board-wrap").offsetWidth')
                total_errs += errs_f
                await pf.close()
            eq = port_cls == media_m
            nonblank = all(sz > 15000 and data[:8] == b'\x89PNG\r\n\x1a\n'
                           for data, sz in [(s.read_bytes(), s.stat().st_size) for s, _ in shots])
            okf = sizes['ok_1280x800'] and sizes['ok_800x1180'] and eq and nonblank
            report('2f dual viewport+port-eq', okf,
                   'land=%s port=%s eq=%s cls=%s media=%s shots=%s' % (
                       sizes['ok_1280x800'], sizes['ok_800x1180'], eq, port_cls, media_m,
                       [sz for _, sz in shots]))
            for s, _ in shots:
                s.unlink(missing_ok=True)                                # 临时截图即删
        except Exception as e:
            report('2f dual viewport+port-eq', False, repr(e)[:150])

        # ---------- MIG 迁移三例 ----------
        try:
            # 例 A：旧基矛盾态（'2-0' 在而 '1-5' 缺）→重置→教学起播（合法语音不入零声断言）
            old_levels = {'1-0': {'stars': 3}, '1-1': {'stars': 3}, '1-2': {'stars': 2},
                          '1-3': {'stars': 2}, '1-4': {'stars': 1}, '2-0': {'stars': 3}}
            pa = await new_page(browser, seed_json=preset_save(extra_levels=old_levels), errs=[])
            await wait_js(pa, 'window.TK && cur', 10000)
            rawA = await pa.evaluate("localStorage.getItem('kidsgame_tictac')")
            jA = json.loads(rawA) if rawA else {}
            keptA = not ((jA.get('levels') or {}).get('2-0'))
            tutA = await pa.evaluate('window.TK.tutorial') in ('watch', 'help', 'solo')
            await pa.close()
            # 例 B：新基合法（全 42 关+ch8 生成关 '8-0'）→保留
            full = {}
            for c in range(1, 8):
                for l in range(6):
                    full['%d-%d' % (c, l)] = {'stars': 3}
            full['8-0'] = {'stars': 3}
            pb2 = await new_page(browser, seed_json=preset_save(extra_levels=full), errs=[])
            await wait_js(pb2, 'window.TK && cur', 10000)
            rawB = await pb2.evaluate("localStorage.getItem('kidsgame_tictac')")
            jB = json.loads(rawB) if rawB else {}
            keptB = (jB.get('levels') or {}).get('8-0') is not None and \
                len(jB.get('levels') or {}) == 43
            await pb2.close()
            # 例 C：脏键 '1-6'（关号 >CH_LEN-1=5）→重置
            pc3 = await new_page(browser, seed_json=preset_save(extra_levels={'1-6': {'stars': 2}}), errs=[])
            await wait_js(pc3, 'window.TK && cur', 10000)
            rawC = await pc3.evaluate("localStorage.getItem('kidsgame_tictac')")
            jC = json.loads(rawC) if rawC else {}
            keptC = not ((jC.get('levels') or {}).get('1-6'))
            await pc3.close()
            report('MIG A old-base reset', keptA and tutA, 'no2-0=%s tut=%s' % (keptA, tutA))
            report('MIG B new-base keep', keptB, 'levels=%d has8-0=%s' % (len(jB.get('levels') or {}), keptB))
            report('MIG C dirty 1-6 reset', keptC, 'no1-6=%s' % keptC)
        except Exception as e:
            report('MIG cases', False, repr(e)[:150])

        await browser.close()

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %d/%d  pageerrors=%d' % (n_ok, len(RESULTS), len(total_errs)))
    sys.exit(0 if n_ok == len(RESULTS) and not total_errs else 1)

asyncio.run(main())
