# -*- coding: utf-8 -*-
"""quickcmp 快速比大小 · 6.5 岁分龄真实试玩（六步协议；语音链 Audio/TTS 层捕获）
v3 驱动：急点循环+管道活性触。6.5 岁人设：闪现后慢想；会点错侧；等数题随手点左；
闪现窗内会抢点。"""
import asyncio, json, random, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _p36 import TODAY, Session, preset_save, calibrate_mulberry, CH_HINTS, NUMCN, LAUNCH_ARGS
from playwright.async_api import async_playwright

random.seed(362)

def log(m):
    print(f'[{time.strftime("%H:%M:%S")}] {m}', flush=True)

async def quiz_now(s):
    return await s.js('QC.quiz ? JSON.parse(JSON.stringify(QC.quiz)) : null')

def correct_side(q):
    return 'S' if q['same'] else ('L' if q['nL'] > q['nR'] else 'R')

async def answer_q(s, side=None, max_s=50):
    """急点作答：闪现窗/问句期点击被吞（null/false 无惩罚），闪毕即落"""
    q = await quiz_now(s)
    if not q:
        return False
    st = q['step']
    pick = side or correct_side(q)
    t0 = time.time()
    while time.time() - t0 < max_s:
        await s.tap(f'#choices .side-btn[data-side="{pick}"]')
        await asyncio.sleep(random.uniform(0.7, 1.4))
        cur = await quiz_now(s)
        if not cur or cur['step'] != st:
            return True
        if await s.js('QC.currentLevel && QC.currentLevel.done'):
            return True
    return False

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        s = Session(browser, 'quickcmp', log)
        await s.setup()
        s.harden(log)
        try:
            cal, cdetail = await calibrate_mulberry(s.page, [87996, 887, 5])
            s.rec(cal, 'mulberry32 Python 复刻位级对齐', cdetail)

            # ---------- 1. 教学链 ----------
            await s.idle(4.0)
            demo_probe = await s.js("QC.tapSide('R')")
            s.rec(demo_probe in (None, False), '教学 watch 期输入被拦（demo 锁）',
                  f'返回={demo_probe!r}（quickcmp 锁门=locked false；comfort/tictac 演示期=null——款型差异备注）')
            s.rec(await s.poll('window.__qcDemoR === "right"', 30, 'watch demo'),
                  '教学 watch 末步 __qcDemoR=right', '')
            wm = await s.js('window.__qcWatchMs')
            s.rec(0 < wm <= 16000, 'watch 实测 ≤16s', f'{wm}ms')
            keys = await s.clip_keys()
            s.rec('qc_tut_watch' in keys[:3], '教学 watch 语音 qc_tut_watch 在场（Audio 层）',
                  f'前3={keys[:3]}')
            # turn 迷你关（2v4）：急点循环
            t0 = time.time()
            while time.time() - t0 < 45:
                if await s.js('QC.currentLevel && QC.currentLevel.flat === 0'):
                    break
                q = await quiz_now(s)
                if q and q['step'] is not None:
                    await s.tap(f'#choices .side-btn[data-side="{correct_side(q)}"]')
                await asyncio.sleep(random.uniform(0.7, 1.3))
            s.rec(await s.poll('QC.currentLevel && QC.currentLevel.flat === 0', 8, 'flat0'),
                  '教学 turn 帮→独后进 flat0', '')
            keys = await s.clip_keys()
            s.rec('qc_tut_turn' in keys, '教学 turn 语音 qc_tut_turn', '')

            # ---------- 2. 正常通关（flat0 · ch1 两选禁等数 · 3★） ----------
            ch1_invariants = True
            numcn_ok = []
            for i in range(5):
                q = await quiz_now(s)
                if q and (q['same'] or q['options'] != 2):
                    ch1_invariants = False
                if i == 1:  # Q2：闪现窗圆点采样（契约 M：单往返原子读 quiz+dots 防竞态）
                    got, samples = False, []
                    for _ in range(60):
                        r = await s.js("""(() => {
                          const q = QC.quiz || {};
                          const g = p => [...document.querySelectorAll('#' + p + ' circle.dot')].map(c => c.getAttribute('r'));
                          const L = g('panelL'), R = g('panelR');
                          return { nL: q.nL, nR: q.nR, l: L.length, r: R.length,
                                   rs: [...new Set(L.concat(R))] };
                        })()""")
                        if r and r['l']:
                            samples.append(f"n={r['nL']}v{r['nR']} dom={r['l']}v{r['r']}")
                            if r['l'] == r['nL'] and r['r'] == r['nR'] and len(r['rs']) <= 1:
                                got = True
                                samples.append(f"半径集={r['rs'][:2]}")
                                break
                        await asyncio.sleep(0.1)
                    s.rec(got, '圆点 DOM 计数=题面+等大（无面积作弊）',
                          '; '.join(samples[:3]) or '闪现窗未捕到圆点')
                ok = await answer_q(s)
                if not ok:
                    s.rec(False, f'flat0 Q{i+1} 未推进', '')
                tts = await s.tts_texts()
                conf = [t for t in tts if t.startswith('左边') and '右边' in t]
                exp_t = f"左边{NUMCN[q['nL']]}个右边{NUMCN[q['nR']]}个"
                numcn_ok.append(bool(conf) and conf[-1] == exp_t)
                await asyncio.sleep(0.4)
            s.rec(ch1_invariants, 'ch1 全 5 题禁等数+两按钮（SPEC 先验实测）', '')
            s.rec(len(numcn_ok) >= 4 and all(numcn_ok),
                  'TTS 复述句=NUMCN 映射（2=两）逐题一致', f'{numcn_ok}')
            conf_all = [t for t in await s.tts_texts() if ('左边' in t and '右边' in t) or '一样多' in t]
            log(f'确认句样本: {conf_all[:8]}')
            got_cele = await s.poll("document.querySelector('.k-celebrate')", 12, 'celebrate')
            star_n = await s.js("document.querySelectorAll('.k-celebrate .k-star').length")
            s.rec(got_cele and star_n == 3, 'flat0 三星庆祝', f'stars={star_n}')
            await s.poll("!document.querySelector('.k-celebrate')", 8, 'gone')
            await s.idle(1.0)
            sv = await s.save()
            s.rec(sv['levels'].get('1-0', {}).get('stars') == 3, 'flat0 写档 3★',
                  f"{sv['levels'].get('1-0')}")

            # ---------- 3. 错路径（flat5=ch2 三按钮；等数题随手点左=6.5 岁典型） ----------
            await s.js('QC.start(5)')
            met_same, wrong_done = False, False
            for attempt in range(3):
                while True:
                    done = await s.js('QC.currentLevel && QC.currentLevel.done')
                    q = await quiz_now(s)
                    if done or not q:
                        break
                    if q['same'] and not met_same:
                        met_same = True
                        # 页内自锚定：L 重试至真计入 miss；S 探针锚定首错+4750ms（契约 I 尾片）
                        await s.js("""(() => {
                          window.__sliceR = null; window.__anchored = false;
                          (async () => {
                            let t0 = null;
                            for (let i = 0; i < 30; i++) {
                              await QC.tapSide('L');
                              const q = QC.quiz;
                              if (q && ((q.miss != null && q.miss >= 1) || (q._miss != null && q._miss >= 1))) { t0 = Date.now(); break; }
                              await new Promise(r => setTimeout(r, 300));
                            }
                            if (t0 === null) { window.__sliceR = 'L-never'; return; }
                            window.__anchored = true;
                            const wait = Math.max(0, 4750 - (Date.now() - t0));
                            setTimeout(async () => {
                              try { window.__sliceR = await QC.tapSide('S'); }
                              catch (e) { window.__sliceR = 'err:' + e; }
                            }, wait);
                          })();
                          return true; })()""")
                        ok_l = await s.poll('QC.quiz && QC.quiz.miss === 1', 14, 'L land')
                        pl = await s.js("document.getElementById('panelL').className + '|' + document.getElementById('panelR').className")
                        qm = await quiz_now(s)
                        gap = None
                        for _ in range(5):   # 链段间 150ms：hint 段可能尚未入 log，重试读
                            gap = await s.chain_gap('qc_wrong', 'qc_hint')
                            if gap is not None:
                                break
                            await asyncio.sleep(0.3)
                        s.rec(ok_l and bool(qm) and qm['miss'] == 1, '等数题点左 miss=1（页内重试落地）',
                              f'miss={qm and qm["miss"]}')
                        s.rec(gap is not None and 50 <= gap <= 900, '错链=qc_wrong→qc_hint',
                              f'gap={gap}ms')
                        s.rec('pulse' in pl, '等数题方向级=双侧 pulse', f'panels={pl}')
                        probe = await s.js("QC.tapSide('R')")
                        s.rec(probe is False, '豁免窗内二击=false 吞', f'返回={probe!r}')
                        qm = await quiz_now(s)
                        s.rec(bool(qm) and qm['miss'] == 1, '窗内二击不增 miss', f'miss={qm and qm["miss"]}')
                        ok_s = await s.poll('window.__sliceR !== null', 16, 'slice probe')
                        slice_r = await s.js('window.__sliceR')
                        s.rec(ok_s and slice_r == 'right', '豁免窗尾片对选(S)放行=right（页内自锚定 4750ms 探针）',
                              f'返回={slice_r!r}（locked 至 4638；4638~4938 尾片放行=契约 I）')
                        await asyncio.sleep(1.5)   # 对演链窗过（推进/未推进均由后续常规作答兜底）
                    elif (not q['same']) and met_same and not wrong_done:
                        wrong_done = True
                        cside = correct_side(q)
                        wside = 'L' if cside != 'L' else 'R'
                        await s.tap(f'#choices .side-btn[data-side="{wside}"]')   # 首错
                        got2, qm = False, None
                        for _ in range(24):   # 重演窗内点击被吞；窗末二错照计
                            await s.tap(f'#choices .side-btn[data-side="{wside}"]')
                            await asyncio.sleep(0.45)
                            qm = await quiz_now(s)
                            if qm and qm['miss'] == 2:
                                got2 = True
                                break
                        br = await s.js(f"document.getElementById('panel{cside}').className")
                        s.rec(got2 and 'breathe' in (br or ''),
                              '同题二错 miss=2 多的一侧 breathe（答案级·面板）',
                              f'miss={qm["miss"] if qm else None} panel{cside}={br}')
                        await answer_q(s)
                    else:
                        await answer_q(s)
                    await asyncio.sleep(0.3)
                if met_same and wrong_done:
                    break
                await s.js(f'QC.start({6 + attempt})')
            s.rec(met_same, '等数题真遇到并作答（60/40 混出）', '')
            s.rec(wrong_done, 'miss≥2 答案级 breathe 实测', '')
            await s.poll('QC.currentLevel && QC.currentLevel.flat === 1', 25, 'flat1')
            await s.poll("(JSON.parse(localStorage.getItem('kidsgame_quickcmp')||'{}').levels||{})['2-0'] ? 1 : 0",
                         15, 'save 2-0')
            sv = await s.save()
            s.rec(sv['levels'].get('2-0', {}).get('stars') == 1, 'flat5(2-0) ≥2miss=1★ 写档',
                  f"2-0={sv['levels'].get('2-0')} keys={sorted(sv['levels'])}")
            # ---------- 4. 闪现窗抢点/重看节流（flat1） ----------
            # 页内 120ms 探针序列（引擎 verify 同思路，零 CDP 延迟）：未见 null 自动下一题再探
            await s.js("""(() => {
              window.__probeSeq = [];
              (async () => {
                for (let round = 0; round < 3; round++) {
                  let sawNull = false;
                  for (let i = 0; i < 45; i++) {
                    const q = QC.quiz;
                    if (!q) { window.__probeSeq.push('noquiz'); return; }
                    const cs = q.same ? 'S' : (q.nL > q.nR ? 'L' : 'R');
                    const r = await QC.tapSide(cs);
                    window.__probeSeq.push(r);
                    if (r === null) sawNull = true;
                    const q2 = QC.quiz;
                    if (!q2 || q2.step !== q.step) break;
                    await new Promise(rs => setTimeout(rs, 120));
                  }
                  if (sawNull) return;
                  await new Promise(rs => setTimeout(rs, 1500));   // 本题窗已过，下一题再试
                }
              })();
              return true; })()""")
            seq = None
            for _ in range(40):
                await asyncio.sleep(0.5)
                seq = await s.js('window.__probeSeq')
                if seq and (None in seq or 'noquiz' in seq or len(seq) >= 135):
                    break
            qm2 = await quiz_now(s)
            no_punish = (qm2 is None) or (qm2['miss'] == 0)
            s.rec(bool(seq) and (None in seq) and no_punish and ('wrong' not in seq),
                  '闪现窗内点选=null 吞（页内 120ms 探针序列，无惩罚）',
                  f'seq={(seq[:8] if seq else None)} miss={qm2["miss"] if qm2 else "关末"}')
            # 重看节流：出窗后首击计（6s 节流自适应等待），再二击验证节流
            f0 = await s.js('window.__qcFlashN || 0')
            f1 = f0
            for _ in range(5):
                await s.tap('#btn-flash')
                await asyncio.sleep(0.7)
                f1 = await s.js('window.__qcFlashN || 0')
                if f1 > f0:
                    break
                await asyncio.sleep(1.4)
            await s.tap('#btn-flash')            # 6s 节流内二击
            await asyncio.sleep(0.7)
            f2 = await s.js('window.__qcFlashN || 0')
            s.rec(f1 >= f0 + 1 and f2 == f1, '重看通道 flashNow 6s 节流', f'{f0}->{f1}->{f2}')
            for j in range(8):
                q = await quiz_now(s)
                if not q or await s.js('QC.currentLevel && QC.currentLevel.done'):
                    break
                s.rec(await answer_q(s), f'flat1 Q{j+2} 推进', '')
            # ---------- 5. 家长门+多玩（flat1 已完成→flat2/3/4） ----------
            await s.poll('QC.currentLevel && QC.currentLevel.flat === 2', 15, 'flat2')
            await s.parent_gate(wrong_first=True)
            s.rec(await s.bonus_set(5), 'bonusSet(5) limit 6→11',
                  f'limit={await s.js("KIDS.calendar.limit(Infinity)")}')
            await s.close_panel()
            for lv in range(5):
                s.rec(await answer_q(s), f'flat2 Q{lv+1} 推进', '')
            await s.poll('QC.currentLevel && QC.currentLevel.flat === 3', 15, 'flat3')
            for lv in range(5):
                s.rec(await answer_q(s), f'flat3 Q{lv+1} 推进', '')
            await s.poll('QC.currentLevel && QC.currentLevel.flat === 4', 15, 'flat4')
            for lv in range(5):
                s.rec(await answer_q(s), f'flat4 Q{lv+1} 推进', '')
            got_ch = await s.poll("document.querySelector('.k-chapterend')", 12, 'chapterEnd')
            ch_txt = await s.js("(document.querySelector('.k-chapterend')||{}).innerText || ''")
            s.rec(got_ch and '第 1 章 完成！' in ch_txt and CH_HINTS['quickcmp'][1] in ch_txt,
                  '章末层=第1章完成+预告ch2', f'text={ch_txt!r}')
            shot2 = await s.shot('chapterend')
            if got_ch:
                await s.page.click('.k-chapterend .k-btn')
            await asyncio.sleep(0.6)
            sv = await s.save()
            s.rec(all(sv['levels'].get(k) for k in ('1-1', '1-2', '1-3', '1-4')),
                  '多玩 flat1-4 写档', f"keys={sorted(sv['levels'])}")

            # ---------- 6. 防沉迷三件 ----------
            await s.poll('QC.currentLevel && QC.currentLevel.flat === 5', 10, 'flat5')
            await s.js('window.__addTime(14 * 60 * 1000)')
            got_rest = await s.poll("document.querySelector('.k-resttip')", 26, 'restTip')
            rest_txt = await s.js("(document.querySelector('.k-resttip')||{}).innerText || ''")
            s.rec(got_rest and '眼睛要休息' in rest_txt, 'restTip 13 分钟档触发',
                  f'text={rest_txt!r}')
            shot3 = await s.shot('resttip')
            await s.page.click('.k-resttip .k-btn')
            await asyncio.sleep(0.6)
            sv = await s.save()
            s.rec(sv.get('restTip', {}).get('shown') == 13, 'restTip.shown=13 写档',
                  f"{sv.get('restTip')}")
            s.rec(sv.get('dailyMin', {}).get(TODAY, 0) >= 13, 'dailyMin ≥13 入账',
                  f"dailyMin={sv.get('dailyMin')}")

            # dayEnd：预置 flats0-10 全过+bonus5 → 重载
            await s.write_save(preset_save('quickcmp', list(range(11)), stars_default=2, bonus=5))
            await s.page.reload(wait_until='domcontentloaded')
            await s.idle(1.0)
            got_de = await s.poll("document.querySelector('.k-dayend')", 10, 'dayEnd')
            de_txt = await s.js("(document.querySelector('.k-dayend')||{}).innerText || ''")
            exp = CH_HINTS['quickcmp'][3]
            s.rec(got_de and '今天的新关卡玩完啦' in de_txt and ('明天：' + exp) in de_txt,
                  'dayEnd=今日玩完+明日预告', f'text={de_txt!r} 期望明天：{exp}')
            shot4 = await s.shot('dayend')
            await s.page.locator('.k-dayend button', has_text='明天见').click()
            await asyncio.sleep(0.6)
            s.rec(await s.js("!document.querySelector('.k-dayend')"), 'dayEnd 可关', '')

            metrics = await s.js("""(() => {
              const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
              return { side_btn: r(document.querySelector('.side-btn')),
                lbl_px: getComputedStyle(document.querySelector('.side-btn .lbl')).fontSize,
                panelL: r(document.getElementById('panelL')),
                vs: r(document.getElementById('vs')) };
            })()""")
            log(f'可读性度量: {json.dumps(metrics, ensure_ascii=False)}')
            log(f'shots: {shot2} {shot3} {shot4}')
        except Exception as e:
            import traceback
            log('EXCEPTION: ' + traceback.format_exc())
            s.rec(False, '脚本异常中断', str(e)[:300])
        out = await s.finish('quickcmp')
        await browser.close()
        return 0 if all(r['ok'] for r in out['results']) else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
