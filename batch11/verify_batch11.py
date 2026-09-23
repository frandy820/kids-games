# -*- coding: utf-8 -*-
"""batch11 全量回归 driver：
①三款复验（verify_one_shadow + verify_one_shp_so[shapeshome+sortsize]）
②语音专项 verify_voice（shadow/shapeshome/sortsize）
③家长门+输入加关 E2E（core 级，sortsize 抽测）
完成判据=各段全 PASS（rc 汇总，永不吞错）。"""
import subprocess, sys, os
import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
results = []

def run(name, cmd, cwd):
    # encoding=utf-8（2026-09-14 r8 修）：子进程 stdout 自包 UTF-8（verify_one 系 io.TextIOWrapper），
    # text=True 默认 GBK 解码在 reader 线程炸 UnicodeDecodeError（已知坑）；errors=replace 防残余杂字节
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True, timeout=1200,
                       encoding='utf-8', errors='replace')
    out = (r.stdout or '') + (r.stderr or '')
    ok = r.returncode == 0
    results.append((name, ok))
    print('[%s] %s rc=%d' % ('PASS' if ok else 'FAIL', name, r.returncode))
    for ln in (out.strip().splitlines()[-3:] if out.strip() else []):
        print('   ', ln[:170])
    return ok

run('verify:shadow', 'python verify_one_shadow.py', BASE)
run('verify:shp+so', 'python verify_one_shp_so.py', BASE)
run('voice', 'python verify_voice.py shadow shapeshome sortsize', os.path.join(BASE, '..', 'batch1'))

# ③ 家长门+加关 E2E（core 级，sortsize 抽测）
from playwright.sync_api import sync_playwright
def parent_gate():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        today = datetime.date.today().strftime('%Y-%m-%d')
        pg.add_init_script("localStorage.setItem('kidsgame_sortsize', JSON.stringify({v:'1.0',game:'sortsize',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}}));" % (today, today))
        pg.goto('file:///' + os.path.join(BASE, 'sortsize', 'index.html').replace('\\', '/'))
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
        big = all(int(x) >= 10 for x in (m.group(1), m.group(2)))
        assert panel and big, '家长门未进面板: panel=%s 题=%s' % (panel, m.group(0))
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
    print('[FAIL] parent-gate', repr(e)[:150])
    results.append(('parent-gate', False))

fails = [n for n, ok in results if not ok]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
