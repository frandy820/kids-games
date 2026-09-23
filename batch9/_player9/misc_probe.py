# -*- coding: utf-8 -*-
"""补充探针（6 岁视角定性观察的 DOM 证据）
1) 三款主界面可见文字收集（识字负担评估）
2) celebrate 过关层内容断言（星星/文本/兔子/有无语音表扬）
3) memgrid 亮格前空窗（LEAD 1200ms）点击无响应测试——点了没反应会不会着急
4) 三款底栏按钮 aria 与触摸尺寸
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kidplay import Kid, SEED_JS, BASE

OUT = {}

def collect_text(kid):
    return kid.js("""(() => {
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.children.length === 0) {
          const t = (el.textContent || '').trim();
          if (t && el.getBoundingClientRect().height > 0) out.push(t.slice(0, 30));
        }
      });
      const tip = document.getElementById('tip-text');
      return { texts: [...new Set(out)], tip: tip ? tip.textContent : null };
    })()""")

def probe_text(browser):
    OUT['界面文字'] = {}
    for gk, name in [('wis', '方位排排队'), ('mir', '对称画'), ('memg', '记忆亮亮格')]:
        kid = Kid(browser, gk)
        kid.goto()
        kid.js(SEED_JS.replace('__KEY__', {'wis':'wis','mir':'mir','memg':'memg'}[gk]), {'n': 1})
        kid.pg.reload(); kid.pg.wait_for_timeout(900)
        t = collect_text(kid)
        OUT['界面文字'][name] = t
        kid.ev('text_collect', game=name, n_texts=len(t['texts']), texts=t['texts'])
        # 底栏按钮尺寸
        sizes = kid.js("""(() => {
          const out = [];
          ['btn-rabbit','btn-hear','btn-replay'].forEach(id => {
            const b = document.getElementById(id); if (!b) return;
            const r = b.getBoundingClientRect();
            out.push({id: id, w: Math.round(r.width), h: Math.round(r.height), aria: b.getAttribute('aria-label')});
          });
          return out;
        })()""")
        kid.ev('dock_buttons', game=name, sizes=sizes)
        kid.close()

def probe_celebrate(browser):
    """wis 用 autoSolve 快速触发通关，在 2.3s 窗口内抓 celebrate 层内容"""
    kid = Kid(browser, 'wis')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'wis'), {'n': 5, 'firstDay': '2026-09-06'})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    kid.ev('celebrate_probe_start', flat=kid.js('WIS.currentLevel.flat'))
    kid.pg.evaluate('WIS.autoSolve()')
    cel = None
    for _ in range(40):
        time.sleep(0.15)
        cel = kid.js("""(() => {
          const o = document.querySelector('.k-celebrate');
          if (!o) return null;
          const stars = o.querySelectorAll('.k-star').length;
          const big = o.querySelector('.k-big');
          const rabbit = o.querySelectorAll('svg').length;
          return { stars: stars, text: big ? big.textContent : '', svgs: rabbit, shown: o.className.includes('show') };
        })()""")
        if cel: break
    kid.ev('celebrate_content', **(cel or {}))
    v = kid.vlog()
    OUT['celebrate'] = {'内容': cel, '通关窗口语音': v,
        '说明': 'celebrate 层 DOM：金星(★ 64px 金色)+文字+happy兔SVG；语音栏空=无语音表扬(仅音效)'}
    kid.close()

def probe_memgrid_deadzone(browser):
    """memgrid：换题后 mg_q 语音响 → LEAD 1200ms 空窗 → 亮格 2500ms；空窗+亮格期点格均无 on/bad 反馈"""
    kid = Kid(browser, 'memg')
    kid.goto()
    kid.js(SEED_JS.replace('__KEY__', 'memg'), {'n': 1})
    kid.pg.reload(); kid.pg.wait_for_timeout(800)
    kid.hook_voice()
    # 答完第 1 题进入第 2 题的 show 序列，前 1.2s 为空窗
    q = kid.js("(() => { const q = MEMG.quiz; return { phase: q.phase, cells: q.cells }; })()")
    for c in q['cells']:
        kid.tap('.cell[data-i="%d"]' % c, wait=0.7)
    time.sleep(1.0)  # 等换题 renderQuiz + mg_q 播报
    t0 = time.time()
    kid.tap('.cell[data-i="0"]', wait=0.1, note='换题空窗期点格')
    lead_wait = time.time() - t0
    st = kid.js("(() => ({ phase: MEMG.quiz.phase, picked: MEMG.quiz.picked }))()")
    kid.ev('deadzone_tap', elapsed_ms=round(lead_wait*1000), **st)
    # 亮格期内点击（格子正亮着，点了没反馈但视觉上有格子亮）
    time.sleep(0.8)
    lit = kid.js("(() => { const cs=[...document.querySelectorAll('.cell')]; return cs.filter(c=>c.className.includes('lit')).length; })()")
    kid.tap('.cell[data-i="1"]', wait=0.3, note='亮格期点格')
    st2 = kid.js("(() => ({ phase: MEMG.quiz.phase, picked: MEMG.quiz.picked }))()")
    kid.ev('lit_tap', lit_cells=lit, **st2)
    OUT['memgrid空窗'] = {'换题空窗点格': st, '亮格期lit格数': lit, '亮格期点格': st2,
        '结论': '两阶段点击均被吞（设计=防误触），但无任何点按反馈动画'}
    kid.close()

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        probe_text(browser)
        probe_celebrate(browser)
        probe_memgrid_deadzone(browser)
        browser.close()
    with open(os.path.join(BASE, 'results', 'misc_result.json'), 'w', encoding='utf-8') as f:
        json.dump(OUT, f, ensure_ascii=False, indent=1)
    print('\nDONE misc')

if __name__ == '__main__':
    main()
