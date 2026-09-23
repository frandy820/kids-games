# -*- coding: utf-8 -*-
"""spellen r16 语音专项验收（verify_voice.py spellen 段的 r16 等效独立版）
背景：共享 batch1/verify_voice.py 的 EXPECT['spellen'] 仍是 r1 旧键集（24 词+9 句），
r16 键集已换血（8 句+60 英文词+60 释义+core 3=131）；共享脚本按并行纪律不改，
本脚本按同口径验收（missing/bad/api/n），rc=0=PASS。
用法: python batch16/spellen/_src/sp_verify_voice.py
"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(BASE, '..', 'index.html')

# r16 键集（与 game-data.js VOICE/WORDLIST/MEANS 同源手抄——分源原则：禁 import 游戏源）
# T46 拆段（2026-09-19）：字母名跟读族 sp_l_<word> 60 条——sayLetters 走预合成 clip
SP_SENTS = ['sp_tut_watch', 'sp_tut_turn', 'sp_hint', 'sp_right', 'sp_wrong', 'sp_first',
            'sp_missing', 'sp_mean']
SP_WORDS = ['cat', 'dog', 'sun', 'hat', 'map', 'bed', 'pig', 'bus',
            'cake', 'make', 'bike', 'kite', 'home', 'nose', 'rope',
            'lake', 'gate', 'name', 'game', 'five', 'nine', 'time', 'bone', 'rose', 'cute',
            'wave', 'ride', 'note', 'rice', 'safe',
            'fish', 'tree', 'star', 'frog', 'milk', 'grass', 'bread', 'black', 'green', 'snake',
            'brush', 'sleep', 'cloud', 'plant', 'small',
            'apple', 'tiger', 'water', 'happy', 'pencil', 'orange', 'yellow', 'rabbit', 'flower',
            'monkey', 'seven', 'paper', 'sister', 'robot', 'garden']
CORE = ['core_chapter_end', 'core_day_end', 'core_rest']
EXPECT = (CORE + SP_SENTS +
          ['sp_word_' + w for w in SP_WORDS] +
          ['sp_mean_' + w for w in SP_WORDS] +
          ['sp_l_' + w for w in SP_WORDS])
assert len(EXPECT) == 191, '键集手抄数 %d != 191（漏抄）' % len(EXPECT)

fails = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto('file:///' + PAGE.replace('\\', '/'))
    pg.wait_for_timeout(1800)
    r = pg.evaluate("""(expect) => {
      const out = {n: Object.keys(KIDS.voice.clips).length, missing: [], bad: [], api: {}};
      expect.forEach(k => { const v = KIDS.voice.clips[k];
        if (!v) out.missing.push(k);
        else if (!v.startsWith('data:audio/mpeg;base64,')) out.bad.push(k); });
      out.api.play = typeof KIDS.voice.play === 'function';
      out.api.queue = typeof KIDS.voice.queue === 'function';
      return out;
    }""", EXPECT)
    # 运行时全覆盖抽查：游戏侧 WORDLIST/MEANS 全词的 sp_word_/sp_mean_/sp_l_ 键全在场
    rt = pg.evaluate("""() => {
      const miss = [];
      (window.WORDLIST || []).forEach(w => {
        if (!KIDS.voice.clips['sp_word_' + w]) miss.push('sp_word_' + w);
        if (!KIDS.voice.clips['sp_mean_' + w]) miss.push('sp_mean_' + w);
        if (!KIDS.voice.clips['sp_l_' + w]) miss.push('sp_l_' + w); });
      return miss.length === 0 ? true : miss.slice(0, 5).join(',');
    }""")
    ok = (not r['missing']) and (not r['bad']) and r['api']['play'] and r['api']['queue'] \
         and r['n'] >= 191 and rt is True
    status = 'PASS' if ok else 'FAIL'
    fails += status == 'FAIL'
    print('[%s] spellen clips=%d missing=%s bad=%s api=%s rtCover=%s' %
          (status, r['n'], r['missing'][:5], r['bad'][:5], r['api'], rt))
    pg.close()
    b.close()
sys.exit(1 if fails else 0)
