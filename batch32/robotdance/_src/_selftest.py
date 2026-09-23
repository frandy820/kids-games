# -*- coding: utf-8 -*-
"""robotdance 分步探针（无缓冲打点）：①verify 自检（r43 分段 seg0-3 串行+全量聚合腿，
每段独立 context+asyncio 硬超时+段耗时报告——SPEC-R43 §R9；段模式逐题断言全覆盖，
全量腿跑 ②b 聚合分布）②真实页冒烟（种档 sound:false 静音双保险+教学链+taps 21）
③flat0-19 全驱动（taps 谱 21/30/35/40 对账）。verify 不全 PASS 则停（防坏态长跑）。
用法: python -u batch32/robotdance/_src/_selftest.py [step]"""
import asyncio, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()
STEP = sys.argv[1] if len(sys.argv) > 1 else 'all'

def log(*a):
    print(*a, flush=True)

SILENCE = ("(() => { try { Object.defineProperty(Audio.prototype, 'play', "
           "{ value: function () { return Promise.resolve(); } }); } catch (e) {} "
           "try { window.speechSynthesis = { speak: function () {}, cancel: function () {} }; } catch (e) {} })();")
# 静音双保险第二层：种档 settings.sound=false（core._vol 读 settings.sound；v 必须 '1.0' 字符串
# ——core store.load 严格 !== '1.0' 即整档重置默认（sound:true）；结构须带全默认键（dailyMin 缺失
# → core 读 dailyMin[今日] pageerror）；levels 留空 → freshTut 教学照跑）
SEED_SAVE = ("(() => { try { localStorage.setItem('kidsgame_robotdance', "
             "JSON.stringify({ v: '1.0', game: 'robotdance', levels: {}, dailyMin: {}, "
             "settings: { sound: false, tts: true, vol: 0.6 }, "
             "restTip: { day: '', shown: 0 } })); } catch (e) {} })();")
SEG_TIMEOUT = 300      # 每段硬超时（秒）——超时杀 context 报段名（防整段挂死拖全局）
FULL_TIMEOUT = 420     # 全量聚合腿硬超时（40 关审计+聚合+固定单元）

async def wait_verify_title(pg, timeout_ms, tag):
    for i in range(timeout_ms // 500):
        t = await pg.evaluate('document.title')
        if 'VERIFY' in t:
            return t
        if i % 24 == 23:
            log('...waiting %s %ds title=%s' % (tag, (i + 1) // 2, t))
        await pg.wait_for_timeout(500)
    return await pg.evaluate('document.title')

async def dump_verify(pg, tag):
    res = await pg.evaluate('document.getElementById("verify-result").textContent')
    try:
        import json
        j = json.loads(res)
        log('[%s] pass/total: %s / %s layoutOk: %s' % (tag, j['pass'], j['total'], j['layoutOk']))
        if j.get('failList'):
            log('[%s] failList: %s' % (tag, j.get('failList', [])[:12]))
        for k, u in j.get('units', {}).items():
            if isinstance(u, dict):
                brief = {x: u[x] for x in u if x not in ('ok',) and not isinstance(u[x], (dict, list))}
                log(' unit %-10s ok=%s %s' % (k, u.get('ok'), brief))
        for k, s in j.get('smokes', {}).items():
            if k == 'layout':
                for one in s.get('sims', []):
                    log(' layout %s flat%-3s blocks=%s robH=%s hit=%s rob=%s ox=%s pass=%s' %
                        (one['vp'], one['flat'], one['blocks'], one['robH'], one['hitOk'],
                         one['robOk'], one['ox'], one['pass']))
            else:
                log(' smoke %-6s ok=%s %s' % (k, s.get('ok'), {x: s[x] for x in s if x not in ('ok',)}))
        bad = [k for k, v in list(j.get('levels', {}).items()) + list(j.get('gen', {}).items()) if not v.get('ok')]
        if bad:
            log(' bad levels:', bad[:10])
        return j
    except Exception as e:
        log('[%s] parse fail: %s %s' % (tag, e, res[:400]))
        return None

async def run_seg(b, seg):
    """单段跑：独立 context+硬超时；seg<0=全量聚合腿。返回 (pass_ok, secs)。"""
    tag = 'seg%d' % seg if seg >= 0 else 'full'
    url = URL_V if seg < 0 else URL_V + '&seg=%d' % seg
    ctx = await b.new_context()
    await ctx.add_init_script(SILENCE)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: (errs.append(str(e)), log('[%s] PAGEERROR:' % tag, str(e)[:300])))
    t0 = time.time()
    try:
        await pg.goto(url)
        timeout = FULL_TIMEOUT if seg < 0 else SEG_TIMEOUT
        title = await asyncio.wait_for(wait_verify_title(pg, timeout * 1000, tag), timeout=timeout + 30)
        secs = time.time() - t0
        log('[%s] title=%s %.1fs pageerrors=%s' % (tag, title, secs, errs[:3]))
        j = await dump_verify(pg, tag)
        ok = ('PASS' in title) and not errs and j is not None
        return ok, secs
    except asyncio.TimeoutError:
        log('[%s] TIMEOUT after %ds — segment hung' % (tag, time.time() - t0))
        return False, time.time() - t0
    finally:
        await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])   # 全程静音（用户可闻外放，R8 同口径）
        if STEP in ('all', 'verify'):
            all_ok = True
            seg_secs = []
            for seg in (0, 1, 2, 3, -1):                      # seg0-3 逐题腿 + 全量聚合腿（②b）
                ok, secs = await run_seg(b, seg)
                seg_secs.append(('seg%d' % seg if seg >= 0 else 'full', round(secs, 1)))
                all_ok = all_ok and ok
            log('VERIFY segments: %s → %s (total %.1fs, slowest %s)' %
                (seg_secs, 'ALL PASS' if all_ok else 'FAIL',
                 sum(s for _, s in seg_secs), max(seg_secs, key=lambda x: x[1])))
            if not all_ok:
                log('VERIFY NOT PASS — stop here (no real-page/drive)')
                await b.close()
                return
        if STEP in ('all', 'real'):
            ctx2 = await b.new_context()
            await ctx2.add_init_script(SILENCE)
            await ctx2.add_init_script(SEED_SAVE)             # 种档 sound:false（静音双保险第二层）
            pg2 = await ctx2.new_page()
            errs2 = []
            pg2.on('pageerror', lambda e: (errs2.append(str(e)), log('REAL PAGEERROR:', str(e)[:300])))
            await pg2.goto(URL_R)
            log('[real] loaded, waiting tutorial...')
            demo = None
            for _ in range(90):
                demo = await pg2.evaluate('window.__rdDemoR || null')
                if demo:
                    break
                await pg2.wait_for_timeout(500)
            tut = 'watch'
            for _ in range(60):
                tut = await pg2.evaluate('window.RD && RD.tutorial')
                if tut != 'watch':
                    break
                await pg2.wait_for_timeout(500)
            typeof = await pg2.evaluate('typeof RD')
            q = await pg2.evaluate('RD.quiz ? {n: RD.quiz.steps.length, phase: RD.quiz.phase} : null')
            log('[real] typeof RD=%s demo=%s tut=%s quiz=%s errs=%s' % (typeof, demo, tut, q, errs2[:3]))
            t0 = time.time()
            r = await pg2.evaluate('RD.autoSolve()')
            lv = await pg2.evaluate('RD.currentLevel')
            log('[real] autoSolve=%s lv=%s %.1fs errs=%s' % (r, lv and (lv['flat'], lv['done'], lv['miss']),
                 time.time() - t0, errs2[:3]))
            stars = None
            for _ in range(40):
                stars = await pg2.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
                if stars is not None:
                    break
                await pg2.wait_for_timeout(500)
            sv = await pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_robotdance") || "{}")')
            log('[real] stars=%s saveKeys=%s v=%s levels=%s sound=%s' %
                (stars, sorted(sv.keys()), sv.get('v'), len(sv.get('levels', {})),
                 (sv.get('settings') or {}).get('sound')))
            await ctx2.close()
        if STEP in ('all', 'drive'):
            ctx3 = await b.new_context()
            await ctx3.add_init_script(SILENCE)
            pg3 = await ctx3.new_page()
            errs3 = []
            pg3.on('pageerror', lambda e: (errs3.append(str(e)), log('DRIVE PAGEERROR:', str(e)[:300])))
            await pg3.goto(URL_V)
            for _ in range(360):
                t3 = await pg3.evaluate('document.title')
                if 'VERIFY' in t3:
                    break
                await pg3.wait_for_timeout(500)
            results = await pg3.evaluate('''(async () => {
              const out = [];
              for (let f = 0; f < 20; f++) {
                RD.start(f);
                const r = await RD.autoSolve();
                out.push({ f: f, done: r.done, taps: r.taps,
                           dch: (RD.currentLevel && RD.currentLevel.dch) || null });
              }
              return out;
            })()''')
            bad = [x for x in results if not x['done']]
            # taps 谱（SPEC-R43 §R3）：dch1=21（3+4+4+5+5）/dch2=30/dch3=35/dch4=33（4×8 常规+fix 单点 1）
            expect = [21] * 5 + [30] * 5 + [35] * 5 + [33] * 5
            taps_ok = [x['taps'] for x in results] == expect
            log('FLAT0-19 autoSolve: %d/20 done, bad=%s taps-spectrum=%s errs=%s dchSeq=%s' %
                (sum(1 for x in results if x['done']), bad[:5], 'OK' if taps_ok else
                [(x['f'], x['taps']) for x in results if x['taps'] != expect[x['f']]],
                errs3[:3], [x['dch'] for x in results]))
            await ctx3.close()
        await b.close()

asyncio.run(main())
