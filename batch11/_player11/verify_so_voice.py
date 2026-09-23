# -*- coding: utf-8 -*-
"""补证：sortsize 题面/救援语音走 voice.queue 单段（记 'Q:'）——T: 过滤漏记的补测"""
import sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common11 import Kid

kid = Kid('sortsize', 'sortsize', 'SO', seed=41)
kid.open()
kid.seed(5); kid.reload(); time.sleep(1.0)
kid.log('题面语音通道补证 2-0')
q = kid.quiz()
kid.log('quiz=%s' % q)
# 开场链应已记 Q:（hint clip + 题面方向句）
v_open = kid.vlog()
kid.log('开场期 vlog=%r' % v_open[:8])
kid.ev('window.__vlog = []')
# 静置等救援
t0 = time.time(); seen = None
while time.time() - t0 < 22:
    v = kid.vlog()
    qq = [x for x in v if x.startswith('Q:')]
    pu = kid.ev("() => document.querySelectorAll('.card.pulse').length")
    if qq and seen is None:
        seen = round(time.time() - t0, 1)
        kid.log('★救援语音(queue通道) @%.1fs = %r pulse=%r' % (seen, qq[:3], bool(pu)))
        break
    time.sleep(0.3)
if seen is None:
    kid.log('!!救援语音未见 queue 记录 vlog=%r' % kid.vlog()[:12])
kid.close()
