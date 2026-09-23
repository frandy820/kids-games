# -*- coding: utf-8 -*-
"""batch11 复验 · shapeshome 形状分家 + sortsize 大小排序（首单元 shadow 已 18/18 过闸后放行）
shapeshome（r8 难度改造 2026-09-14，AUDIT-56 #14）：题型爬坡(ch1 tri 三维恰差一维/ch2 neg 否定恰违反
一条件/ch3 grid 九宫格恰对一规则/ch4 混排)+真实通关 flat10(章3 grid)+灰化链+sayW+时长硬断言(minMs≥40000)
+nextHint 契约(A/F)——断言从 SPEC-BATCH11 §2 r8 块推导
sortsize（r19 难度改造 2026-09-18，AUDIT-56 #15）：三题型 sort 6-7 物相近档/dual 双属性(3档×红蓝,对互异)
/ord 序数(rank∈[2,n-2])+真实通关 flat10(章3 双属性)+不灰化+sayW(契约 I 豁免窗+10s 节流)+
救援视觉双锚(14s 题面卡 pulse/30s 应点卡 breathe)——断言从 SPEC-BATCH11 §3-r19 块推导
共同：教学吞输入+轻叮/救援重读+错点不重置/双 viewport/离线/截图/语音注入对账
（09-19 sortsize 腿按 §-r19 契约适配；shapeshome 腿与共享助手默认值零改动）"""
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
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

# 音频静音纪律（09-19 用户实证本机 TTS 外放后立）：本驱动 HOOK 调用穿透真实 KIDS.voice.play，
# keyless 语句会走系统 speechSynthesis 外放——context 级先掐声（仅静音，HOOK/断言零改动零影响）
SILENCE = """(() => {
  const noop = () => {};
  window.__sndLog = [];
  try { window.speechSynthesis = { speak: u => window.__sndLog.push('tts'), cancel: noop, pause: noop, resume: noop, getVoices: () => [] }; } catch (e) {}
  try {
    const OA = window.Audio;
    window.Audio = function (src) {
      if (OA && typeof src === 'string' && src.indexOf('data:audio/') === 0) {
        const a = new OA(src);
        a.play = () => { window.__sndLog.push('clip');
          setTimeout(() => { try { a.dispatchEvent(new Event('ended')); } catch (e) {} }, 1500);  /* 拟真片段时长推进链（40ms 会把开场链加速到装钩前播完——P2 SP 实证） */  /* 掐声但补发 ended：core queue 靠 onended 链推进（09-19 P2 SP 链卡修复） */
          return Promise.resolve(); };
        a.pause = () => {};
        return a;
      }
      this.__src = src || ''; this.play = () => { window.__sndLog.push('audio'); return Promise.resolve(); };
      this.pause = noop; this.load = noop; this.addEventListener = noop; this.removeEventListener = noop;
      return this;
    };
  } catch (e) {}
  try {
    const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop }, type: '' });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; }
  } catch (e) {}
})();"""

SEED_BODY = """const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv[sub] = sv[sub] || {}; sv[sub].tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

async def newpage(browser, game, n, vp={'width': 1280, 'height': 800}, verify=False, delay=900):
    ctx = await browser.new_context(viewport=vp)
    await ctx.add_init_script(SILENCE)   # 09-19：所有页面先掐声（TTS/Audio/AudioContext 工厂接管）
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / game / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => { const sub = "%s"; %s }' % ('shp' if game == 'shapeshome' else 'sortsize', SEED_BODY), n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def vtitle(b, game, rounds=18):
    ctx, pg, errs = await newpage(b, game, None, verify=True)
    title = ''
    for _ in range(rounds):
        title = await pg.title()
        if 'VERIFY' in title: break
        await pg.wait_for_timeout(1000)
    rec('%s verify title' % game[:2].upper(), 'VERIFY PASS' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
    await ctx.close()

async def rescue_case(b, game, expect_prefixes, qwrong, vis_sel='.card.breathe, .card.pulse', rounds=20):
    """开场接力落完清 vlog→静置轮询 breathe/pulse→断言题面重读；错点→二次救援（不重置）
    （r19 sortsize：救援视觉=题面卡 pulse@14s+应点卡 breathe@30s——vis_sel/rounds 由调用方传，默认保 v1 口径）"""
    ctx, pg, errs = await newpage(b, game, 5, delay=3200)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    vis = False
    for _ in range(rounds):
        vis = await pg.evaluate("!!document.querySelector('%s')" % vis_sel)
        if vis: break
        await pg.wait_for_timeout(1000)
    v = await pg.evaluate('window.__vlog')
    res = [x for x in v if any(x.startswith(p) for p in expect_prefixes)]
    rec('%s 救援(重读题面+视觉线索)' % game[:2].upper(), bool(res) and vis and not errs,
        'rescue=%s vis=%s' % ([x[:12] for x in res[:1]], vis))
    await pg.evaluate('window.__vlog = []')
    w0 = await pg.evaluate(qwrong)
    if w0 is not None:
        await pg.locator('.card[data-i="%d"]' % w0).click()
    res2 = []
    for _ in range(18):
        await pg.wait_for_timeout(1000)
        v2 = await pg.evaluate('window.__vlog')
        res2 = [x for x in v2 if any(x.startswith(p) for p in expect_prefixes)]
        if res2: break
    rec('%s 错点不重置救援(二次触发)' % game[:2].upper(), bool(res2), 'post=%s' % [x[:12] for x in res2[:1]])
    await ctx.close()

async def tut_case(b, game, hook_get):
    ctx, pg, errs = await newpage(b, game, None)
    await pg.evaluate(HOOK)
    tut = await pg.evaluate(hook_get % 'tutorial')
    st0 = await pg.evaluate(hook_get % 'currentLevel && %s.currentLevel.step' % ('SP' if game == 'shapeshome' else 'SO'))
    bb = await pg.locator('.card').first.bounding_box()
    pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
    await pg.wait_for_timeout(500)
    pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
    st1 = await pg.evaluate(hook_get % 'currentLevel && %s.currentLevel.step' % ('SP' if game == 'shapeshome' else 'SO'))
    rec('%s 教学期点击被吞+轻叮' % game[:2].upper(), tut == 'watch' and st1 == st0 and pops1 > pops0,
        'tut=%s step %s->%s pops+%d' % (tut, st0, st1, pops1 - pops0))
    await pg.locator('#btn-replay').dispatch_event('pointerdown')
    seen = False
    for _ in range(16):
        await pg.wait_for_timeout(1000)
        seen = await pg.evaluate("!!(KIDS._save().%s && KIDS._save().%s.tutSeen)" % (('shp',) * 2 if game == 'shapeshome' else ('sortsize',) * 2))
        if seen: break
    rec('%s 教学窗重玩门' % game[:2].upper(), seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
    await ctx.close()

async def vp_case(b, game, n):
    for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
        ctx, pg, errs = await newpage(b, game, n, vp=vp)
        ox = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        small = await pg.evaluate("""[...document.querySelectorAll('button, .card')].filter(e => !e.closest('.k-panel') && !e.classList.contains('k-parentbtn'))
          .map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)).filter(v => v < 64).length""")
        rec('%s viewport %dx%d' % (game[:2].upper(), vp['width'], vp['height']), ox == 0 and small == 0 and not errs, 'ox=%s small=%s' % (ox, small))
        await ctx.close()

async def offline_shot_case(b, game):
    ctx, pg, errs = await newpage(b, game, 5)
    src = await pg.evaluate("document.documentElement.outerHTML")
    rec('%s 离线断言' % game[:2].upper(), 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
    shot = await pg.screenshot()
    import io as _io, statistics as _st
    from PIL import Image
    img = Image.open(_io.BytesIO(shot)).convert('L')
    sd = _st.pstdev(list(img.resize((160, 100)).getdata()))
    rec('%s 截图非空白' % game[:2].upper(), sd > 5, 'stdev=%.1f' % sd)
    await ctx.close()
    n = (BASE / game / 'index.html').read_text(encoding='utf-8').count('data:audio')
    rec('%s 语音注入对账' % game[:2].upper(), n >= 6, 'audio=%d' % n)

async def shapeshome(b):
    await vtitle(b, 'shapeshome')
    # r8 时长硬断言+nextHint 契约：verify JSON 独立复核（minMs≥40000 为 SPEC r8 口径 python 字面）
    ctx, pg, errs = await newpage(b, 'shapeshome', None, verify=True)
    vj = None
    for _ in range(18):
        await pg.wait_for_timeout(1000)
        raw = await pg.evaluate("document.getElementById('verify-result').textContent")
        if raw:
            import json as _json
            vj = _json.loads(raw); break
    dur = (vj or {}).get('units', {}).get('duration', {})
    hnt = (vj or {}).get('units', {}).get('hints', {})
    rec('SH r8 时长硬断言(modeled min>=40000)', bool(dur.get('ok')) and dur.get('minMs', 0) >= 40000,
        'minMs=%s floor=%s' % (dur.get('minMs'), dur.get('floorMs')))
    rec('SH r8 nextHint 契约(M1静态/F实算)', bool(hnt.get('ok')), str(hnt))
    await ctx.close()
    # 题型爬坡（SPEC r8：ch1 tri 首题热身干扰差≥2维 / ch2 neg 唯一满足+热身 / ch3 grid 行列互异+热身 / ch4 混排）
    ctx, pg, errs = await newpage(b, 'shapeshome', 0)
    q = await pg.evaluate("SP.quiz")
    dims = [sum(1 for k in ('c', 's', 'z') if q['options'][i][k] != {'c': q['tc'], 's': q['ts'], 'z': q['tz']}[k])
            for i in range(3) if i != q['answerIdx']]
    tri_ok = (q['kind'] == 'tri' and q['tz'] in ('big', 'small') and
              q['options'][q['answerIdx']]['c'] == q['tc'] and q['options'][q['answerIdx']]['s'] == q['ts'] and
              q['options'][q['answerIdx']]['z'] == q['tz'] and all(d >= 2 for d in dims))
    rec('SH ch1 三维(色+形+大小)+首题热身(干扰差>=2维)', tri_ok, 'kind=%s tz=%s dims=%s' % (q.get('kind'), q.get('tz'), dims))
    await ctx.close()
    ctx, pg, errs = await newpage(b, 'shapeshome', 5)
    q = await pg.evaluate("SP.quiz")
    sat = [i for i in range(3) if q['options'][i]['c'] != q['nc'] and q['options'][i]['s'] != q['ns']]
    vboth = [i for i in range(3) if i != q['answerIdx'] and q['options'][i]['c'] == q['nc'] and q['options'][i]['s'] == q['ns']]
    vone = [i for i in range(3) if i != q['answerIdx'] and (q['options'][i]['c'] == q['nc']) != (q['options'][i]['s'] == q['ns'])]
    neg_ok = (q['kind'] == 'neg' and sat == [q['answerIdx']] and len(vboth) == 1 and len(vone) == 1)
    rec('SH ch2 否定(唯一满足=答案)+热身(一全违反+一单违反)', neg_ok,
        'kind=%s sat=%s both=%s one=%s' % (q.get('kind'), sat, vboth, vone))
    await ctx.close()
    ctx, pg, errs = await newpage(b, 'shapeshome', 10)
    q = await pg.evaluate("SP.quiz")
    W = [i for i in range(3) if i != q['answerIdx']]
    grid_ok = (q['kind'] == 'grid' and len(set(q['rows'])) == 3 and len(set(q['cols'])) == 3 and
               0 <= q['miss']['r'] <= 2 and 0 <= q['miss']['c'] <= 2 and
               q['options'][q['answerIdx']]['c'] == q['cols'][q['miss']['c']] and
               q['options'][q['answerIdx']]['s'] == q['rows'][q['miss']['r']] and
               all(q['options'][i]['c'] != q['cols'][q['miss']['c']] and q['options'][i]['s'] != q['rows'][q['miss']['r']] for i in W))
    rec('SH ch3 九宫格(行恒形列恒色互异+缺格+热身双违反)', grid_ok,
        'kind=%s rows=%s cols=%s miss=%s' % (q.get('kind'), q.get('rows'), q.get('cols'), q.get('miss')))
    await ctx.close()
    ctx, pg, errs = await newpage(b, 'shapeshome', 15)
    d = await pg.evaluate("(() => ({ dch: SP.currentLevel.dch, kind: SP.quiz && SP.quiz.kind }))()")
    rec('SH ch4 混排(首题=tri 已学形态热身)', d['dch'] == 4 and d['kind'] == 'tri', str(d))
    await ctx.close()
    # 钩子 + 真实通关 flat10（章3 grid）
    ctx, pg, errs = await newpage(b, 'shapeshome', 10)
    hk = await pg.evaluate("(() => ({ has: !!window.SP, quiz: typeof SP.quiz, tap: typeof SP.tapCard, auto: typeof SP.autoSolve }))()")
    rec('SH 钩子 SP 齐', hk['has'] and hk['quiz'] == 'object' and hk['tap'] == 'function', str(hk))
    clicks = 0
    for _ in range(40):
        q = await pg.evaluate("SP.quiz")
        if not q: break
        await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
        clicks += 1
        await pg.wait_for_timeout(650)
    await pg.wait_for_timeout(5200)
    stars = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
    rec('SH 真实点击通关 flat10(章3九宫格)', stars >= 1 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
    await ctx.close()
    # 灰化链 + sayW（flat5=章2 neg）
    ctx, pg, errs = await newpage(b, 'shapeshome', 5)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    await pg.wait_for_timeout(2200)
    await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate("SP.quiz")
    ws = [i for i in range(len(q['options'])) if i != q['answerIdx']]
    await pg.locator('.card[data-i="%d"]' % ws[0]).click()
    await pg.wait_for_timeout(700)
    st1 = await pg.evaluate("(() => { const x = SP.quiz; return { miss: x.missCount, dead: x.dead.filter(Boolean).length, br: !!document.querySelector('.card.pulse') }; })()")
    v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:shp_wrong')).length")
    await pg.locator('.card[data-i="%d"]' % ws[1]).click()
    await pg.wait_for_timeout(700)
    st2 = await pg.evaluate("(() => { const x = SP.quiz; return { miss: x.missCount, dead: x.dead.filter(Boolean).length, br: !!document.querySelector('.card.pulse') }; })()")
    v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:shp_wrong')).length")
    rec('SH 灰化链(错1灰不pulse/错2正确卡pulse)', st1['miss'] == 1 and st1['dead'] == 1 and not st1['br'] and st2['miss'] == 2 and st2['br'], 'st1=%s st2=%s' % (st1, st2))
    rec('SH sayW 错1播+错2豁免force', v1 == 1 and v2 == 2, 'v1=%d v2=%d' % (v1, v2))
    await ctx.close()
    await rescue_case(b, 'shapeshome', ['T:找一找', 'P:shp_hint', 'P:shp_q', 'P:shp_nq'],  # r8 题面=shp_q3_*/shp_nq_* clip（P:shp_q 前缀覆盖 q3）
                      "(() => { const x = SP.quiz; return x.options.map((o, i) => i).filter(i => i !== x.answerIdx)[0]; })()")
    await tut_case(b, 'shapeshome', 'SP.%s')
    await vp_case(b, 'shapeshome', 5)
    await offline_shot_case(b, 'shapeshome')

async def sortsize(b):
    # r19 verify 墙钟 ~30s（契约 I 真时钟等待 4450×2+演出）——轮询窗 60s
    await vtitle(b, 'sortsize', rounds=60)
    # r19 数量/互异规格（§3-r19：6 物；dual=对互异——items 每档恰 2 是唯一解先验，sort/ord 仍两两互异）
    for n, cnt, kind in ((0, 6, 'sort'), (5, 6, 'sort'), (10, 6, 'dual'), (15, 6, 'ord')):
        ctx, pg, errs = await newpage(b, 'sortsize', n)
        q = await pg.evaluate("SO.quiz")
        uniq = len(set(q['items'])) == len(q['items'])
        ok = len(q['items']) == cnt and q['kind'] == kind and (uniq if kind != 'dual' else sorted(
            q['items'].count(v) for v in set(q['items'])) == [2, 2, 2])
        rec('SO r19 数量 ch%d=%d物 %s+互异' % (n // 5 + 1, cnt, kind), ok,
            'n=%d kind=%s uniq=%s' % (len(q['items']), q.get('kind'), uniq))
        await ctx.close()
    ctx, pg, errs = await newpage(b, 'sortsize', 0)
    q0 = await pg.evaluate("SO.quiz")
    items = q0['items']
    expect = max(range(len(items)), key=lambda i: items[i]) if q0['order'] == 'big' else min(range(len(items)), key=lambda i: items[i])
    ok0 = q0['answerIdx'] == expect
    await pg.locator('.card[data-i="%d"]' % q0['answerIdx']).click()
    await pg.wait_for_timeout(700)
    q1 = await pg.evaluate("SO.quiz")
    left_items = [items[i] for i in q1['left']]
    expect1 = None
    if q1['left']:
        m = max(left_items) if q1['order'] == 'big' else min(left_items)
        expect1 = q1['left'][left_items.index(m)]
    rec('SO answerIdx 动态(点对后=剩余最%s)' % q0['order'], ok0 and q1['pos'] == 1 and expect1 == q1['answerIdx'],
        'a0=%s(expect %s) a1=%s(expect %s) pos=%s' % (q0['answerIdx'], expect, q1['answerIdx'], expect1, q1['pos']))
    await ctx.close()
    # 钩子 + 真实通关 flat10（章3 双属性：answerIdx 逐点重读=平局翻转承载）
    ctx, pg, errs = await newpage(b, 'sortsize', 10)
    hk = await pg.evaluate("(() => ({ has: !!window.SO, quiz: typeof SO.quiz, tap: typeof SO.tapCard, auto: typeof SO.autoSolve }))()")
    rec('SO 钩子 SO 齐', hk['has'] and hk['quiz'] == 'object' and hk['tap'] == 'function', str(hk))
    clicks = 0
    for _ in range(60):
        q = await pg.evaluate("SO.quiz")
        if not q: break
        await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
        clicks += 1
        await pg.wait_for_timeout(650)
    await pg.wait_for_timeout(5200)
    stars = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
    rec('SO 真实点击通关 flat10(章3 双属性)', stars >= 1 and not errs, 'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
    await ctx.close()
    # r19 不灰化 + sayW（契约 I/J：错#1 播+设窗 4350→窗内二错吞→窗过 miss2 force 播再设窗→节流内第三错静默）
    ctx, pg, errs = await newpage(b, 'sortsize', 5)
    await pg.evaluate(HOOK); await pg.evaluate('window.__vlog = []')
    await pg.wait_for_timeout(2200)
    await pg.evaluate('window.__vlog = []')
    q = await pg.evaluate("SO.quiz")
    wrongs = [i for i in range(len(q['items'])) if i != q['answerIdx']]
    await pg.locator('.card[data-i="%d"]' % wrongs[0]).click()
    await pg.wait_for_timeout(700)
    st1 = await pg.evaluate("(() => { const x = SO.quiz; return { miss: x.miss, gone: document.querySelectorAll('.card.gone, .card.dim').length }; })()")
    v1 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:sor_wrong')).length")
    sw = await pg.evaluate('SO.tapCard(%d)' % wrongs[1])     # 窗内二错：吞（miss 不动）
    await pg.wait_for_timeout(4400)                          # 等窗#1 过期（锚=错#1+4350）
    await pg.locator('.card[data-i="%d"]' % wrongs[1]).click()   # miss=2 → force 播+设窗#2
    await pg.wait_for_timeout(700)
    st2 = await pg.evaluate("(() => { const x = SO.quiz; return { miss: x.miss, gone: document.querySelectorAll('.card.gone, .card.dim').length }; })()")
    v2 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:sor_wrong')).length")
    await pg.wait_for_timeout(4400)                          # 窗#2 过期；节流锚=force 播（10s 内）
    q3 = await pg.evaluate("SO.quiz")
    cand = [i for i in q3['left'] if i != q3['answerIdx']]
    v3 = None
    st3 = None
    if cand:
        await pg.locator('.card[data-i="%d"]' % cand[0]).click()   # miss=3 无 force：节流静默、不设窗不被吞
        await pg.wait_for_timeout(700)
        v3 = await pg.evaluate("window.__vlog.filter(x => x.startsWith('P:sor_wrong')).length")
        st3 = await pg.evaluate("(() => SO.quiz.miss)()")
    rec('SO 不灰化(错卡可重点无灰类)', st1['miss'] == 1 and st1['gone'] == 0 and sw is False, 'st1=%s swallow=%s' % (st1, sw))
    rec('SO r19 sayW 错1播+窗吞+错2豁免force+第三错节流静默',
        v1 == 1 and st2['miss'] == 2 and st2['gone'] == 0 and v2 == 2 and (v3 is None or (v3 == 2 and st3 == 3)),
        'v1=%d v2=%s v3=%s miss2=%s miss3=%s' % (v1, v2, v3, st2['miss'], st3))
    await ctx.close()
    # r19 救援视觉双锚（家族 B：14s 方向级=#prompt-chip.pulse 1.2s 一次 / 30s 答案级=.card.breathe 无限呼吸）
    ctx, pg, errs = await newpage(b, 'sortsize', 5, delay=3200)
    await pg.evaluate(HOOK)
    await pg.evaluate("window.__t0 = 0; new MutationObserver(rs => { for (const r of rs) if ([...r.target.classList].includes('pulse') && r.target.id === 'prompt-chip') window.__t0 = performance.now(); })"
                      ".observe(document.getElementById('prompt-chip'), { attributes: true, attributeFilter: ['class'] })")
    t0 = 0
    for _ in range(120):
        if await pg.evaluate("window.__t0") > 0: break
        await pg.wait_for_timeout(150)
    t0 = await pg.evaluate("window.__t0")
    await pg.wait_for_timeout(400)                           # chip-pulse 1.2s 内：动画仍 running
    chip_anims = await pg.evaluate("(() => { const el = document.getElementById('prompt-chip'); return el.classList.contains('pulse') ? el.getAnimations().map(a => a.playState) : []; })()")
    breath = False
    for _ in range(120):                                     # 答案级 ~30s idle：应点卡 breathe（无限动画）
        breath = await pg.evaluate("!!document.querySelector('.card.breathe')")
        if breath: break
        await pg.wait_for_timeout(250)
    br_anims = await pg.evaluate("(() => { const el = document.querySelector('.card.breathe'); return el ? el.getAnimations().map(a => a.playState) : []; })()")
    rec('SO r19 救援双锚(14s题面卡pulse running+30s应点卡breathe running)',
        bool(t0) and 'running' in chip_anims and breath and 'running' in br_anims,
        't0=%s chip=%s breath=%s br=%s' % (bool(t0), chip_anims, breath, br_anims))
    await ctx.close()
    await rescue_case(b, 'sortsize', ['T:从最', 'Q:', 'P:sor_hint'],  # {key:null} 经 join 变空串，vlog 记 'Q:'（batch11 实证）
                      "(() => { const x = SO.quiz; return x.left.filter(i => i !== x.answerIdx)[0] || null; })()",
                      vis_sel='#prompt-chip.pulse, .card.breathe', rounds=38)   # r19：方向级 14s 即见（chip pulse）
    await tut_case(b, 'sortsize', 'SO.%s')
    await vp_case(b, 'sortsize', 5)
    await offline_shot_case(b, 'sortsize')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await shapeshome(b)
        await sortsize(b)
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
