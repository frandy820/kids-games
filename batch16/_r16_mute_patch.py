# -*- coding: utf-8 -*-
"""r16 主线收口：verify_one_spellen.py / verify_one_read.py 挂 INIT_SND 静音（声音纪律①底层接管，
对断言透明——idiom 静默副本 12/12+13/14 实证）；spellen S8 测试侧等待 5000→6500（断言语义不动：
r1 读数距救援钟起点 13.6s<14s 裕度 0.4s 不足，放等待不放阈值）。"""
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

for name in ('verify_one_spellen.py', 'verify_one_read.py'):
    p = BASE / name
    s = p.read_text(encoding='utf-8')
    assert 'INIT_SND' not in s, name + ' 已打过补丁，拒绝重复'
    # 1) 常量插到 BASE 行后
    m = re.search(r"^BASE = .*$", s, re.M)
    assert m, name + ' 无 BASE 行'
    inject = ("\n# 声音纪律①（r16 收口）：底层通道接管（context 级 add_init_script，新文档/reload 自动生效；\n"
              "# 对断言透明——idiom 静默副本 read 12/12 / spellen 13/14 实证同模式）\n"
              "INIT_SND = '''" + INIT_SND_BODY + "'''\n")
    s = s[:m.end()] + inject + s[m.end():]
    # 2) 每个 ctx = await b.new_context(...) 行后插 add_init_script（行级，断言命中数）
    pat = re.compile(r"^( *)ctx = await b\.new_context\((.*)\)$", re.M)
    hits = pat.findall(s)
    assert len(hits) >= 8, name + ' new_context 命中 %d <8' % len(hits)
    s, n1 = pat.subn(lambda mm: mm.group(0) + "\n" + mm.group(1) + "await ctx.add_init_script(INIT_SND)", s)
    assert n1 == len(hits)
    # 3) spellen S8：等待放宽 5000→6500（唯一锚：r1 读 SP.rescues 前的 5000 等待）
    if name == 'verify_one_spellen.py':
        old = "await pg.wait_for_timeout(5000)\n        r1 = await pg.evaluate('SP.rescues')"
        assert s.count(old) == 1, 'S8 锚命中 %d !=1' % s.count(old)
        s = s.replace(old, "await pg.wait_for_timeout(6500)\n        r1 = await pg.evaluate('SP.rescues')")
    p.write_text(s, encoding='utf-8')
    print('[OK] %s init_script×%d' % (name, n1))

# 语法自检
import py_compile
for name in ('verify_one_spellen.py', 'verify_one_read.py'):
    py_compile.compile(str(BASE / name), doraise=True)
print('py_compile 2/2 OK')
