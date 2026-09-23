# -*- coding: utf-8 -*-
"""r16 主线收口：verify_review16_fixes.py / verify_player16_fixes.py 挂 INIT_SND 静音
（其 HOOK 只记 vlog 但真调播——声音纪律①底层接管，对断言透明）。"""
import io, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path

BASE = Path(__file__).parent

INIT_SND_BODY = """(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();"""

for name in ('verify_review16_fixes.py', 'verify_player16_fixes.py'):
    p = BASE / name
    s = p.read_text(encoding='utf-8')
    assert 'INIT_SND' not in s, name + ' 已打过补丁，拒绝重复'
    m = re.search(r"^BASE = .*$", s, re.M)
    assert m, name + ' 无 BASE 行'
    inject = ("\n# 声音纪律①（r16 收口）：底层通道接管（context 级 add_init_script，reload 自动生效；\n"
              "# 对 HOOK vlog 记录透明——KIDS.voice.play 照常走、底层不发声）\n"
              "INIT_SND = '''" + INIT_SND_BODY + "'''\n")
    s = s[:m.end()] + inject + s[m.end():]
    pat = re.compile(r"^( *)ctx = await b\.new_context\((.*)\)$", re.M)
    hits = pat.findall(s)
    assert len(hits) >= 3, name + ' new_context 命中 %d <3' % len(hits)
    s, n1 = pat.subn(lambda mm: mm.group(0) + "\n" + mm.group(1) + "await ctx.add_init_script(INIT_SND)", s)
    assert n1 == len(hits)
    p.write_text(s, encoding='utf-8')
    print('[OK] %s init_script×%d' % (name, n1))

import py_compile
for name in ('verify_review16_fixes.py', 'verify_player16_fixes.py'):
    py_compile.compile(str(BASE / name), doraise=True)
print('py_compile 2/2 OK')
