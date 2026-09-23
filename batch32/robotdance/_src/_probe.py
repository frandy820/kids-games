# -*- coding: utf-8 -*-
"""robotdance 任务探针（自验 3）：
①真实页 typeof RD；②start(0) 教学到 build；③start(10) ch3 形态+tapBlock 返回值族；
④驱动 3 关各 2 题（含 1 错+已填槽不回退验证）无 pageerror。
用法: python -u batch32/robotdance/_src/_probe.py"""
import asyncio, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
URL_R = 'file:///' + (BASE / 'index.html').as_posix()

def log(*a):
    print(*a, flush=True)

SILENCE = ("(() => { try { Object.defineProperty(Audio.prototype, 'play', "
           "{ value: function () { return Promise.resolve(); } }); } catch (e) {} "
           "try { window.speechSynthesis = { speak: function () {}, cancel: function () {} }; } catch (e) {} })();")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])   # 全程静音（用户可闻外放，R8 同口径）
        ctx = await b.new_context()
        await ctx.add_init_script(SILENCE)                    # 进页前拦 Audio.play/TTS
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: (errs.append(str(e)), log('PAGEERROR:', str(e)[:300])))
        await pg.goto(URL_R)
        await pg.wait_for_timeout(1200)
        # ① 真实页 typeof RD
        log('probe1 typeof RD =', await pg.evaluate('typeof RD'))
        # ② start(0) 教学到 build（真实页复走：stub 存档后手动接管教学）
        await pg.evaluate('KIDS._save = function () { return { levels: {} }; }; KIDS.store.persist = function () {};')
        await pg.evaluate('RD.start(0)')
        await pg.wait_for_timeout(300)
        await pg.evaluate('tutorialWatch()')          # 教学接管（同 verify 单元路径）
        for _ in range(80):
            r = await pg.evaluate('({tut: RD.tutorial, demoR: window.__rdDemoR || null})')
            if r['tut'] == 'help':
                break
            await pg.wait_for_timeout(500)
        phase = None
        for _ in range(60):                            # 交接后首题演示 → build
            phase = await pg.evaluate('RD.quiz ? RD.quiz.phase : null')
            if phase == 'build':
                break
            await pg.wait_for_timeout(500)
        lv = await pg.evaluate('RD.currentLevel')
        log('probe2 start(0): tut=%s demoR=%s phase=%s flat=%s dch=%s' %
            (r['tut'], r['demoR'], phase, lv['flat'], lv['dch']))
        # ③ start(10) ch3 形态 + tapBlock 返回值族
        shape = await pg.evaluate('''(async () => {
          RD.start(10);
          let q = null, g = 0;
          while (g++ < 200) {                     // 等 watch 演示完进 build
            q = RD.quiz;
            if (q && q.phase === 'build') break;
            await new Promise(w => setTimeout(w, 100));
          }
          const steps = q.steps.slice();
          const dis = q.blocks.filter(b => steps.indexOf(b.anim) < 0).length;
          const out = { steps: steps, nBlocks: q.blocks.length, distractors: dis,
                        phase: q.phase, dch: RD.currentLevel.dch, rets: [] };
          // 越界
          out.rets.push(['bad', await RD.tapBlock(99)]);
          // 错块（顺序错位块：序列内动作但非当前步）
          const wIdx = q.blocks.findIndex(b => b.anim !== steps[0]);
          out.rets.push(['wrong', await RD.tapBlock(wIdx)]);
          out.missAfterWrong = RD.quiz.miss;
          out.filledAfterWrong = RD.quiz.filled.slice();
          // 正确逐块：fill/done
          for (let s = 0; s < steps.length; s++) {
            const cq = RD.quiz;
            const idx = cq.blocks.findIndex(b => b.anim === steps[s]);
            out.rets.push(['tap' + s, await RD.tapBlock(idx)]);
          }
          out.danceQueue = window.__lastQueue;
          return out;
        })()''')
        log('probe3 start(10): dch=%s steps=%s(%d) blocks=%d distractors=%d phase=%s' %
            (shape['dch'], shape['steps'], len(shape['steps']), shape['nBlocks'],
             shape['distractors'], shape['phase']))
        log('  rets=%s missAfterWrong=%s filledAfterWrong=%s' %
            (shape['rets'], shape['missAfterWrong'], shape['filledAfterWrong']))
        log('  danceQueue(real page 无 verify stub，不记录；verify 页已断言=%s)' % (shape['danceQueue'],))
        # ④ 驱动 3 关各 2 题（含 1 错+已填槽不回退验证）
        #    flat0 需先补 tutSeen=true 防 stub 存档重触发教学（教学期吞输入是设计行为）
        await pg.evaluate('KIDS._save = function () { return { levels: {}, robotdance: { tutSeen: true } }; };')
        drv = await pg.evaluate('''(async () => {
          const waitBuild = async () => {
            for (let g = 0; g < 400; g++) {
              const q = RD.quiz;
              if (!cur) return null;
              if (cur.done) return 'done';
              if (q && q.phase === 'build') return q;
              await new Promise(w => setTimeout(w, 50));
            }
            return null;
          };
          const report = [];
          for (const f of [0, 5, 10]) {
            RD.start(f);
            for (let qi = 0; qi < 2; qi++) {
              const q = await waitBuild();
              if (!q || q === 'done') { report.push({f: f, qi: qi, fail: 'no-build'}); return report; }
              // 填 1 步（记基线）
              const s0 = q.steps[0];
              const i0 = q.blocks.findIndex(b => b.anim === s0);
              const r0 = await RD.tapBlock(i0);
              const base = RD.quiz.filled.slice();
              // 错块（非当前步动作，且在场未消耗——已消耗块按契约返回 null）
              const cq = RD.quiz;
              let wI = -1;
              for (let i = 0; i < cq.blocks.length; i++) {
                if (cq.blocks[i].anim !== cq.steps[cq.step] && blockEl(i)) { wI = i; break; }
              }
              const rw = await RD.tapBlock(wI);
              const after = RD.quiz.filled.slice();
              const kept = JSON.stringify(base) === JSON.stringify(after) && after[0] === s0;
              // 补完本题
              for (let s = RD.quiz.step; s < q.steps.length; s++) {
                const c2 = RD.quiz;
                const idx = c2.blocks.findIndex(b => b.anim === c2.steps[c2.step]);
                await RD.tapBlock(idx);
              }
              report.push({f: f, qi: qi, r0: r0, wrong: rw, filledKept: kept,
                           miss: RD.currentLevel.miss});
            }
          }
          return report;
        })()''')
        for row in drv:
            log('probe4 flat%-2s q%s fill=%s wrong=%s 已填槽不回退=%s 关miss=%s' %
                (row['f'], row['qi'], row['r0'], row['wrong'], row['filledKept'], row['miss']))
        await ctx.close()
        await b.close()
        log('pageerrors total:', errs)

asyncio.run(main())
