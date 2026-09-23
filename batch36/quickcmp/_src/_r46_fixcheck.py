# -*- coding: utf-8 -*-
"""r46 修复轮验证（09-22 晚）：
P_A 竖屏 800x1180 verify 页（双视口第二腿）
P_B 真实页静置复测 M1（修复前 idle 上限 ~18s/breathe 死代码；修复后期望首 breathe ~30-32s）
口径：静音双保险（init_script 劫持 Audio+种档 settings 关）——r19 纪律 words r28 定稿 function 版
"""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(r'F:\claudecode\projects\active\kids-games\batch36\quickcmp\index.html')
URL = GAME.as_uri()

MUTE = """
Object.defineProperty(HTMLMediaElement.prototype, 'muted', { set: function(v){ this._m = v; }, get: function(){ return true; } });
const _A = window.Audio;
window.Audio = function(src){
  const a = new _A(src);
  a.muted = true; a.volume = 0;
  a.addEventListener('ended', function(){ a.__ended = true; });
  const _p = a.play.bind(a);
  a.play = function(){ setTimeout(function(){ try{ a.dispatchEvent(new Event('ended')); }catch(e){} }, 1500); return _p(); };
  return a;
};
"""

SAVE = {
    "v": 1.0, "game": "quickcmp", "firstDay": 20260922, "lastDay": 20260922,
    "levels": {"1-0": {"stars": 3, "plays": 1}, "1-1": {"stars": 3, "plays": 1},
               "1-2": {"stars": 3, "plays": 1}, "1-3": {"stars": 3, "plays": 1},
               "1-4": {"stars": 3, "plays": 1}, "2-0": {"stars": 3, "plays": 1},
               "2-1": {"stars": 3, "plays": 1}, "2-2": {"stars": 3, "plays": 1},
               "2-3": {"stars": 3, "plays": 1}, "2-4": {"stars": 3, "plays": 1},
               "3-0": {"stars": 3, "plays": 1}, "3-1": {"stars": 3, "plays": 1},
               "3-2": {"stars": 3, "plays": 1}},
    "dailyMin": 600, "bonus": {"d": 20260922, "n": 20},
    "settings": {"sound": False, "tts": False, "vol": 0},
    "restTip": {}, "quickcmp": {"tutSeen": True},
}

def main():
    out = {}
    with sync_playwright() as p:
        br = p.chromium.launch()
        # ---- P_A 竖屏 verify ----
        ctx = br.new_context(viewport={'width': 800, 'height': 1180})
        pg = ctx.new_page()
        pg.add_init_script(MUTE)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL + '?verify=1')
        try:
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=120000)
        except Exception:
            pass
        out['P_A_title'] = pg.title()
        out['P_A_errs'] = len(errs)
        ctx.close()
        # ---- P_B 真实页静置（cmp 关 flat12，65s 采样 500ms）----
        ctx2 = br.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx2.new_page()
        pg2.add_init_script(MUTE)
        pg2.on('pageerror', lambda e: errs.append('B:' + str(e)))
        pg2.goto(URL)
        pg2.evaluate("s => localStorage.setItem('kidsgame_quickcmp', JSON.stringify(s))", SAVE)
        pg2.reload()
        pg2.wait_for_function("window.QC && QC.quiz", timeout=30000)
        pg2.evaluate("QC.start(12)")
        pg2.wait_for_timeout(2500)          # 开题闪现完成
        t0 = time.time()
        flashes, breathes = [], []
        while time.time() - t0 < 65:
            r = pg2.evaluate("""() => ({
                n: window.__qcFlashN || 0,
                b: document.querySelectorAll('.panel.breathe, .side-btn.breathe').length })""")
            if r['n'] > len(flashes) + (flashes[-1]['n'] if flashes else 0) or (not flashes and r['n'] > 0):
                pass
            if not flashes or r['n'] != flashes[-1]['n']:
                flashes.append({'t': round(time.time() - t0, 1), 'n': r['n']})
            if r['b'] > 0:
                breathes.append(round(time.time() - t0, 1))
            pg2.wait_for_timeout(500)
        # breathe 累计去重窗（breathe 出现后持续在场，取首现时刻即可）
        out['P_B_flashes'] = flashes
        out['P_B_breathe_first'] = breathes[0] if breathes else None
        out['P_B_breathe_events'] = len(breathes)
        out['P_B_errs'] = len([e for e in errs if e.startswith('B:')])
        ctx2.close()
        br.close()
    ok_a = out['P_A_title'] == 'VERIFY PASS 13/13' and out['P_A_errs'] == 0
    fb = out['P_B_breathe_first']
    ok_b = fb is not None and 28.0 <= fb <= 45.0 and out['P_B_errs'] == 0
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print('P_A %s | P_B %s (M1 breathe_first=%s 期望 28-45s)' % ('PASS' if ok_a else 'FAIL', 'PASS' if ok_b else 'FAIL', fb))
    raise SystemExit(0 if (ok_a and ok_b) else 1)

main()
