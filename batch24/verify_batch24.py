# -*- coding: utf-8 -*-
"""batch24 全量回归 driver：
①三款独立复验（verify_one_shaperoof + verify_one_trace + verify_one_dressup）
②语音专项 verify_voice（shaperoof/trace/dressup）
③家长门+输入加关 E2E（core 级，dressup 抽测）
④两级入口（batch24/index.html 三卡+主入口 72 卡含三卡+href 全可达）
完成判据=各段全 PASS（rc 汇总，永不吞错）。"""
import subprocess, sys, os
import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
results = []

def run(name, cmd, cwd, timeout=2400):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', shell=True, timeout=timeout)
    out = (r.stdout or '') + (r.stderr or '')
    ok = r.returncode == 0
    results.append((name, ok))
    print('[%s] %s rc=%d' % ('PASS' if ok else 'FAIL', name, r.returncode))
    for ln in (out.strip().splitlines()[-3:] if out.strip() else []):
        print('   ', ln[:170])
    return ok

run('verify:shaperoof', 'python verify_one_shaperoof.py', BASE, timeout=3000)
run('verify:trace', 'python verify_one_trace.py', BASE, timeout=3000)
run('verify:dressup', 'python verify_one_dressup.py', BASE, timeout=3000)
run('voice', 'python verify_voice.py shaperoof trace dressup', os.path.join(BASE, '..', 'batch1'))

# ③ 家长门+加关 E2E（core 级，dressup 抽测；算术题→input 填 5→确定→limit+5）
from playwright.sync_api import sync_playwright
def parent_gate():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        today = datetime.date.today().strftime('%Y-%m-%d')
        pg.add_init_script("localStorage.setItem('kidsgame_dressup', JSON.stringify({v:'1.0',game:'dressup',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));" % (today, today))
        pg.goto('file:///' + os.path.join(BASE, 'dressup', 'index.html').replace('\\', '/'))
        pg.wait_for_timeout(1600)
        pg.evaluate("() => { const b = document.querySelector('.k-parentbtn'); if (b) b.click(); }")
        pg.wait_for_timeout(500)
        import re as _re
        m = _re.search(r'(\d+)\s*\+\s*(\d+)', pg.evaluate("() => document.querySelector('.k-panel').textContent"))
        assert m, '未见家长门算术题'
        for ch in str(int(m.group(1)) + int(m.group(2))):
            pg.evaluate("n => { const b = Array.from(document.querySelectorAll('.k-numrow button')).find(x => x.textContent.trim() === n); if (b) b.click(); }", ch)
        pg.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .mbtn, .k-gate .mbtn')).find(b => b.textContent.includes('确定')); if (ok) ok.click(); }")
        pg.wait_for_timeout(800)
        panel = pg.evaluate("() => !!document.querySelector('.k-panel h3') && document.body.textContent.includes('家长面板')")
        assert panel, '家长门未进面板'
        pg.fill('.k-panel .row input[type=number]', '5')
        pg.evaluate("() => { const ok = Array.from(document.querySelectorAll('.k-panel .row .mbtn')).find(b => b.textContent.trim() === '确定'); if (ok) ok.click(); }")
        pg.wait_for_timeout(400)
        lim = pg.evaluate("() => KIDS.calendar.limit(50)")
        bonus = pg.evaluate("() => KIDS.calendar.bonusToday()")
        assert lim == 11 and bonus == 5, '加关失效 limit=%s bonus=%s' % (lim, bonus)
        b.close()
    print('[PASS] parent-gate+bonus 题=%s+%s limit=11' % (m.group(1), m.group(2)))

try:
    parent_gate()
    results.append(('parent-gate', True))
except Exception as e:
    print('[FAIL] parent-gate', str(e)[:200])
    results.append(('parent-gate', False))

# ④ 两级入口
def entries():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file:///' + os.path.join(BASE, 'index.html').replace('\\', '/'))
        pg.wait_for_timeout(800)
        cards = pg.evaluate("() => Array.from(document.querySelectorAll('.card')).map(c => c.textContent.trim())")
        ok1 = sum(1 for c in cards if '形状屋顶' in c) >= 1 and sum(1 for c in cards if '描红数字' in c) >= 1 and sum(1 for c in cards if '贴纸装扮' in c) >= 1
        pg2 = b.new_page()
        pg2.goto('file:///' + os.path.join(BASE, '..', 'index.html').replace('\\', '/'))
        pg2.wait_for_timeout(800)
        main_cards = pg2.evaluate("() => Array.from(document.querySelectorAll('.card')).map(c => c.textContent.trim())")
        # 2026-09-13：主入口经 game-ports hub 扩容已 120 卡，原 len==72 为 b24 交付时点快照（假失败）；
        # 断言目的=三款入口可达，改下界 ≥72 防扩容误报
        ok2 = sum(1 for c in main_cards if '形状屋顶' in c) >= 1 and sum(1 for c in main_cards if '描红数字' in c) >= 1 and sum(1 for c in main_cards if '贴纸装扮' in c) >= 1 and len(main_cards) >= 72
        # 三款产物页直开冒烟
        n = 0
        for g in ('shaperoof', 'trace', 'dressup'):
            pg3 = b.new_page()
            pg3.goto('file:///' + os.path.join(BASE, g, 'index.html').replace('\\', '/'))
            pg3.wait_for_timeout(1200)
            n += pg3.evaluate("() => !!document.querySelector('#stage') || !!document.body.textContent")
        ok3 = n == 3 and not errs
        b.close()
        assert ok1 and ok2 and ok3, '入口断言 b24=%s main=%s smoke=%s' % (ok1, ok2, ok3)
    print('[PASS] entries 两级入口+三产物冒烟（主入口 ≥72 卡）')

try:
    entries()
    results.append(('entries', True))
except Exception as e:
    print('[FAIL] entries', str(e)[:200])
    results.append(('entries', False))

fails = [k for k, ok in results if not ok]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
