# -*- coding: utf-8 -*-
"""t4_probe.py — 补充探针：clock 教学帮阶段手指持久性 / times 看阶段手指真实落点"""
import json, time
from playwright.sync_api import sync_playwright

URI = {
    'clock': 'file:///F:/claudecode/projects/active/kids-games/batch4/clock/index.html',
    'times': 'file:///F:/claudecode/projects/active/kids-games/batch4/times/index.html',
}
out = {}

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ---- clock: 教学帮阶段手指 10s 持久性 + 乱点空白处 ----
    pg = b.new_context(viewport={'width': 1280, 'height': 800}).new_page()
    pg.goto(URI['clock'], wait_until='load')
    seq = []
    t0 = time.time()
    while time.time() - t0 < 16:
        pg.wait_for_timeout(1000)
        r = pg.evaluate("""() => {
          const g = document.getElementById('ghost');
          return {tut: CLK.tutorial, ghostShow: g.classList.contains('show'),
                  gx: Math.round(parseFloat(g.style.left)||0), gy: Math.round(parseFloat(g.style.top)||0),
                  step: CLK.currentLevel.step, quiz: CLK.quiz ? CLK.quiz.items : null};
        }""")
        seq.append({'sec': round(time.time() - t0, 1), **r})
        # 第 8 秒在空白处（钟面上）乱点一下，看手指是否还在
        if abs(round(time.time() - t0) - 8) < 0.6:
            box = pg.evaluate("""() => { const r = document.querySelector('#clock-zone .clock-card').getBoundingClientRect();
                return [r.left + r.width/2, r.top + r.height*0.15]; }""")
            pg.mouse.click(*box)
    out['clock_help_persist'] = seq
    ctx = pg.context

    # ---- times: 看阶段（aid 开着）手指落点 vs aid-ans / fish 几何 ----
    pg2 = ctx.new_page()
    pg2.goto(URI['times'], wait_until='load')
    geo = []
    t0 = time.time()
    while time.time() - t0 < 6.5:
        pg2.wait_for_timeout(700)
        r = pg2.evaluate("""() => {
          const g = document.getElementById('ghost');
          const rect = e => { const r = e.getBoundingClientRect(); return {l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom)}; };
          const inR = (p, r) => p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b;
          const p = {x: parseFloat(g.style.left)||0, y: parseFloat(g.style.top)||0};
          const aidAns = Array.from(document.querySelectorAll('#aid .aid-ans'));
          const fish = Array.from(document.querySelectorAll('#fish-grid .fish-btn'));
          const groupsBtn = document.getElementById('btn-groups');
          const aidOpen = document.getElementById('aid').classList.contains('open');
          return {tut: TIM.tutorial, ghostShow: g.classList.contains('show'), pos: p, aidOpen,
                  onAidAns: aidAns.filter(e => inR(p, rect(e))).map(e => e.dataset.i),
                  onFish: fish.filter(e => inR(p, rect(e))).map(e => e.dataset.i),
                  onGroups: inR(p, rect(groupsBtn)),
                  aidAnsRects: aidAns.map(e => ({i: e.dataset.i, v: e.textContent, ...rect(e)})),
                  fishRects: fish.map(e => ({i: e.dataset.i, ...rect(e)}))};
        }""")
        geo.append({'sec': round(time.time() - t0, 1), **r})
    out['times_watch_ghost_geo'] = geo
    b.close()

import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
io.open(r'F:/claudecode/projects/active/kids-games/batch4/shots/t4_probe_obs.json', 'w', encoding='utf-8').write(
    json.dumps(out, ensure_ascii=False, indent=1))
for row in out['clock_help_persist']:
    print('clock', row['sec'], 'tut=', row['tut'], 'ghost=', row['ghostShow'], 'pos=', (row['gx'], row['gy']), 'step=', row['step'])
print()
for row in out['times_watch_ghost_geo']:
    print('times', row['sec'], 'tut=', row['tut'], 'ghost=', row['ghostShow'], 'pos=', row['pos'],
          'onAidAns=', row['onAidAns'], 'onFish=', row['onFish'], 'onGroups=', row['onGroups'], 'aidOpen=', row['aidOpen'])
