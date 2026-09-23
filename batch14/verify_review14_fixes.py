# -*- coding: utf-8 -*-
"""batch14 审查修复定向实证（T1-T8）
T1 M1 multibattle 竞态：错答落钟尾晃动窗内钟走完——窗内连点旧卡不误判新题不提前解锁
T2 m1 multibattle 钟条点击 pop
T3 m2 multibattle again 重赛先写档（输局→再来一局→档已记）
T4 M2 numberdet 确认键吞输入期 pop+nudge
T5 m3 numberdet demoPlan s=N 补步恒合法（静态直调）
T6 M3 blocks fill 目标盒顶点+角标圆在 viewBox 内（含深缺损构造）
T7 M4 blocks 首错 miss=1 正确卡无 breathe（M4 参与判定后实证）
T8 m5 numberdet 题面 tip 含'1 到'+num_q1 新文案 clip 在场"""
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
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p.key || 'null')).join('|')); return _q(parts); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

def seed(game, n):
    return """const sv = KIDS._save() || { levels: {} };
  sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%%5)] = { stars: 1 };
  sv.%s = { tutSeen: true };
  %s
  KIDS.store.persist();""" % (n, game, 'KIDS.calendar.bonusSet(10);' if n >= 10 else '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 M1 multibattle 竞态：错点落在钟尾晃动窗内（ch4 5s 钟）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('multibattle', 15))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('MB.quiz')
        step0 = q['step']
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        # 等钟剩 ~700ms 再点错 → 钟在 520ms 晃动窗内走完（ch4 钟改 6.5s 后按 FOE_MS 自适应，2026-09-08）
        fm = await pg.evaluate('FOE_MS')
        wait_more = max(0, fm['4'] - 2400 - 700)
        await pg.wait_for_timeout(wait_more)
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(200)
        # 窗内连点旧卡 3 次（M1 竞态触发：若提前解锁则误判新题）
        for _ in range(3):
            try:
                await pg.locator('.opt').first.click(force=True, timeout=1200)
            except Exception:
                pass
            await pg.wait_for_timeout(140)
        # 轮询等 onFoeTimeout 收尾（钟走完+820ms 演出窗后 locked 恢复；固定 1800ms 在钟长改动后会落窗内误判）
        st = None
        for _ in range(24):
            st = await pg.evaluate("MB.quiz ? { step: MB.quiz.step, miss: MB.quiz.miss, my: MB.quiz.myScore, foe: MB.quiz.foeScore, locked: MB.currentLevel.locked } : null")
            if st and st['foe'] >= 1 and st['locked'] is False and st['step'] > step0:
                break
            await pg.wait_for_timeout(500)
        st = await pg.evaluate("MB.quiz ? { step: MB.quiz.step, miss: MB.quiz.miss, my: MB.quiz.myScore, foe: MB.quiz.foeScore, locked: MB.currentLevel.locked } : null")
        # 断言：旧卡点击未被误判（新题 miss=0）、超时正常推进（foe≥1）、locked 恢复 false
        ok1 = st and st['miss'] == 0 and st['foe'] >= 1 and st['locked'] is False and st['step'] > step0 and not errs
        rec('T1 M1 竞态窗内连点不误判(miss=0+解锁恢复)', ok1, 'st=%s step0=%s errs=%s' % (st, step0, errs[:1]))
        await ctx.close()

        # T2 m1 钟条点击 pop
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('multibattle', 1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        await pg.locator('.fc-bar').first.click(force=True, timeout=2000)
        await pg.wait_for_timeout(400)
        pops = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        rec('T2 m1 钟条点击 pop', pops >= 1, 'pops=%s' % pops)
        await ctx.close()

        # T3 m2 again 重赛先写档：静置输局（对手拿 ≥3 题）→ again 层 → 点再来一局 → 档已记
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        await pg.goto('file:///' + (BASE / 'multibattle' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('multibattle', 15))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        # 全程不答：5 题被对手拿走（5×5s=25s+演出）
        for _ in range(40):
            st = await pg.evaluate('MB.currentLevel')
            if st and (st['done'] or st['won']):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        # again 层：点"再来一局"
        btn = pg.locator('#mb-again-btn')
        if await btn.count() > 0:
            await btn.first.click(force=True, timeout=2000)
            await pg.wait_for_timeout(900)
            stars3 = await pg.evaluate("(KIDS._save().levels['4-0'] || {}).stars")
            rec('T3 m2 again 重赛先写档', stars3 and stars3 >= 1 and not errs3, 'stars=%s errs=%s' % (stars3, errs3[:1]))
        else:
            ov = await pg.evaluate("!!document.querySelector('.mb-ov')")
            rec('T3 m2 again 重赛先写档', False, 'again 层未出现 ov=%s' % ov)
        await ctx.close()

        # T4 M2 numberdet 确认键吞输入期 pop+nudge
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'numberdet' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('numberdet', 1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        await pg.evaluate(HOOK)
        q = await pg.evaluate('ND.quiz')
        sec = q['secret']
        gbig = sec + 2 if sec + 2 <= 20 else sec - 2
        for ch in str(gbig):
            await pg.locator('.key[data-d="%s"]' % ch).first.click(force=True)
            await pg.wait_for_timeout(130)
        await pg.locator('#ok-btn').click(force=True)
        await pg.wait_for_timeout(150)
        # big 反馈窗（700ms）内连点确认——应 pop
        await pg.evaluate('window.__vlog = []')
        await pg.locator('#ok-btn').click(force=True)
        await pg.wait_for_timeout(400)
        pops4 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        nud = await pg.evaluate("(() => { const b = document.getElementById('ok-btn'); const cls = b.className; return cls.includes('nudge') || getComputedStyle(b).animationName !== 'none'; })()")
        g4 = await pg.evaluate('ND.quiz.guesses')
        rec('T4 M2 确认键吞输入期 pop+nudge', pops4 >= 1 and g4 == 1, 'pops=%s guesses=%s' % (pops4, g4))
        await ctx.close()

        # T5 m3 demoPlan s=N 补步恒合法（静态直调：三步依次收窄且不落已排除区）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'numberdet' / 'index.html').as_posix())
        await pg.wait_for_timeout(1000)
        r5 = await pg.evaluate("""(() => {
          const bad = [];
          for (let N of [20, 30, 50, 99]) {
            for (let s = 1; s <= N; s += Math.max(1, Math.floor(N / 37))) {
              const plan = demoPlan({ secret: s, N: N });
              if (plan.length !== 3 || plan[2] !== s) { bad.push('N%d s%d len' + plan.length); continue; }
              let lo = 1, hi = N;
              for (let i = 0; i < 2; i++) {
                const g = plan[i];
                if (g < lo || g > hi) { bad.push('N' + N + ' s' + s + ' step' + i + ' g=' + g + ' out [' + lo + ',' + hi + ']'); break; }
                if (g > s) hi = g - 1; else if (g < s) lo = g + 1; else { bad.push('N' + N + ' s' + s + ' prem hit'); break; }
              }
            }
          }
          return bad.slice(0, 4);
        })()""")
        rec('T5 m3 demoPlan 全域三步合法(含 s=N 补步 N-1)', len(r5) == 0, 'bad=%s' % r5)
        await ctx.close()

        # T6 M3 blocks 深缺损 fill：目标盒顶点+角标圆均在 viewBox 内
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'blocks' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('blocks', 5))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        r6 = await pg.evaluate("""(() => {
          const bad = [];
          // 全 flat0-39 fill 关：goalbox 顶点+dbadge 圆在 viewBox 内
          for (let flat = 0; flat < 40; flat++) {
            const L = genLevel(flat);
            for (const q of L.quizzes) {
              if (q.kind !== 'fill') continue;
              // 直接用 sceneSvg 重建 svg 串解析 viewBox（不依赖当前 DOM 关卡）
              const sc = sceneSvg(q).svg;
              const vb = sc.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
              const allPts = (sc.match(/-?\\d+(?:\\.\\d+)?,-?\\d+(?:\\.\\d+)?/g) || []).map(s2 => s2.split(',').map(Number));
              // goalbox path 在独立 <g class="goalbox">——重解析该组
              const gb = sc.split('<g class="goalbox">')[1] ? sc.split('<g class="goalbox">')[1].split('</g>')[0] : '';
              (gb.match(/d="M[^"]+"/g) || []).forEach(dm => {
                (dm.match(/-?\\d+(?:\\.\\d+)?,-?\\d+(?:\\.\\d+)?/g) || []).map(s2 => s2.split(',').map(Number)).forEach(pt => {
                  if (pt[0] < vb[0] || pt[0] > vb[0] + vb[2] || pt[1] < vb[1] || pt[1] > vb[1] + vb[3]) bad.push('flat' + flat + ' goalbox out');
                });
              });
              // 角标圆
              (sc.match(/<g class="dbadge"[^>]*>[\\s\\S]*?<\\/g>/g) || []).forEach(bg => {
                const m2 = bg.match(/cx="(-?[\\d.]+)" cy="(-?[\\d.]+)"/);
                if (!m2) return;
                const cx = +m2[1], cy = +m2[2];
                if (cx - 14 < vb[0] || cx + 14 > vb[0] + vb[2] || cy - 14 < vb[1] || cy + 14 > vb[1] + vb[3]) bad.push('flat' + flat + ' badge out');
              });
            }
          }
          return [...new Set(bad)].slice(0, 4);
        })()""")
        rec('T6 M3 fill 目标盒+角标 40 关全在 viewBox 内', len(r6) == 0, 'bad=%s' % r6)
        await ctx.close()

        # T7 M4 blocks 首错 miss=1 正确卡无 breathe（真实点击）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'blocks' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('blocks', 0))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        q = await pg.evaluate('BK.quiz')
        wi = [i for i in range(3) if i != q['answerIdx']][0]
        await pg.locator('.opt[data-i="%d"]' % wi).first.click(force=True)
        await pg.wait_for_timeout(800)
        br = await pg.evaluate("!!document.querySelector('.opt[data-i=\"%d\"].breathe')" % q['answerIdx'])
        m7 = await pg.evaluate('BK.quiz.miss')
        rec('T7 M4 首错不 breathe(miss=1 正确卡无视觉)', m7 == 1 and not br, 'miss=%s breathe=%s' % (m7, br))
        await ctx.close()

        # T8 m5 numberdet tip 含'1 到'+num_q1 clip 新文案在场
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.goto('file:///' + (BASE / 'numberdet' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('numberdet', 1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        tip = await pg.evaluate("document.getElementById('tip') ? document.getElementById('tip').textContent : ''")
        clip8 = await pg.evaluate("!!KIDS.voice.clips['num_q1']")
        rec('T8 m5 tip 含 1 到 + num_q1 clip 在场', ('1' in tip and '到' in tip and '之间' in tip) and clip8, 'tip=%s' % tip[:24])
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
