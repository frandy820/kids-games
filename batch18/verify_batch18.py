# -*- coding: utf-8 -*-
"""batch18 全量回归 driver：
①三款独立复验（verify_one_coder2 + verify_one_stack + verify_one_bounce）
②语音专项 verify_voice（coder2/stack/bounce）
③家长门+输入加关 E2E（core 级，stack 抽测；模板=batch15-17 实证版）
④两级入口（batch18/index.html 三卡+主入口含三卡）
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

run('verify:coder2', 'python verify_one_coder2.py', BASE, timeout=3000)
run('verify:stack', 'python verify_one_stack.py', BASE, timeout=3000)
run('verify:bounce', 'python verify_one_bounce.py', BASE, timeout=3000)
run('voice', 'python verify_voice.py coder2 stack bounce', os.path.join(BASE, '..', 'batch1'))

# ③ 家长门+加关 E2E（core 级，stack 抽测；算术题→input 填 5→确定→limit+5）
from playwright.sync_api import sync_playwright
def parent_gate():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        today = datetime.date.today().strftime('%Y-%m-%d')
        pg.add_init_script("localStorage.setItem('kidsgame_stack', JSON.stringify({v:'1.0',game:'stack',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));" % (today, today))
        pg.goto('file:///' + os.path.join(BASE, 'stack', 'index.html').replace('\\', '/'))
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
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        ok1 = ok2 = ok3 = False
        pg = b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file:///' + os.path.join(BASE, 'index.html').replace('\\', '/'))
        pg.wait_for_timeout(800)
        cards = pg.evaluate("() => Array.from(document.querySelectorAll('.card')).map(c => c.textContent.trim())")
        ok1 = sum(1 for c in cards if '循环指令' in c) >= 1 and sum(1 for c in cards if '搭高楼' in c) >= 1 and sum(1 for c in cards if '弹球' in c) >= 1
        pg2 = b.new_page()
        pg2.goto('file:///' + os.path.join(BASE, '..', 'index.html').replace('\\', '/'))
        pg2.wait_for_timeout(800)
        main_cards = pg2.evaluate("() => Array.from(document.querySelectorAll('.card')).map(c => c.textContent.trim())")
        ok2 = sum(1 for c in main_cards if '循环指令' in c) >= 1 and sum(1 for c in main_cards if '弹球' in c) >= 1 and len(main_cards) == 54
        # 三款产物页直开冒烟
        n = 0
        for g in ('coder2', 'stack', 'bounce'):
            pg3 = b.new_page()
            pg3.goto('file:///' + os.path.join(BASE, g, 'index.html').replace('\\', '/'))
            pg3.wait_for_timeout(1200)
            n += pg3.evaluate("() => !!document.querySelector('#stage') || !!document.body.textContent")
        ok3 = n == 3 and not errs
        b.close()
        assert ok1 and ok2 and ok3, '入口断言 batch18=%s main=%s smoke=%s' % (ok1, ok2, ok3)
    print('[PASS] entries 两级入口+三产物冒烟')

try:
    entries()
    results.append(('entries', True))
except Exception as e:
    print('[FAIL] entries', str(e)[:200])
    results.append(('entries', False))

print('')
n_ok = sum(1 for _, ok in results if ok)
print('BATCH18 TOTAL %d/%d' % (n_ok, len(results)))
sys.exit(0 if n_ok == len(results) else 1)
