# -*- coding: utf-8 -*-
"""batch16 全量回归 driver：
①三款独立复验（verify_one_read + verify_one_spellen + verify_one_idiom）
②语音专项 verify_voice（read/spellen/idiom）
③家长门+输入加关 E2E（core 级，read 抽测；模板=batch15 实证版）
完成判据=各段全 PASS（rc 汇总，永不吞错）。"""
import subprocess, sys, os
import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
results = []

def run(name, cmd, cwd, timeout=1800):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', shell=True, timeout=timeout)
    out = (r.stdout or '') + (r.stderr or '')
    ok = r.returncode == 0
    results.append((name, ok))
    print('[%s] %s rc=%d' % ('PASS' if ok else 'FAIL', name, r.returncode))
    for ln in (out.strip().splitlines()[-3:] if out.strip() else []):
        print('   ', ln[:170])
    return ok

run('verify:idiom', 'python verify_one_idiom.py', BASE)
# r16 断点复跑实证：read→spellen 双进程串联共享 HDD IO 拥塞窗，spellen 通关写档（celebrate 演出）
# 被拖过轮询窗=stars=0 假阴性稳定复现（单独跑 14/14 两次）；拆两条独立 run 消除串联环境
run('verify:read', 'python verify_one_read.py', BASE, timeout=1800)
run('verify:spellen', 'python verify_one_spellen.py', BASE, timeout=2400)
run('voice', 'python verify_voice.py read spellen idiom', os.path.join(BASE, '..', 'batch1'))

# ③ 家长门+加关 E2E（core 级，read 抽测；batch15 实证版：算术题→input 填 5→确定→limit+5）
from playwright.sync_api import sync_playwright
def parent_gate():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        today = datetime.date.today().strftime('%Y-%m-%d')
        pg.add_init_script("localStorage.setItem('kidsgame_read', JSON.stringify({v:'1.0',game:'read',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));" % (today, today))
        pg.goto('file:///' + os.path.join(BASE, 'read', 'index.html').replace('\\', '/'))
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

print('')
n_ok = sum(1 for _, ok in results if ok)
print('BATCH16 TOTAL %d/%d' % (n_ok, len(results)))
sys.exit(0 if n_ok == len(results) else 1)
