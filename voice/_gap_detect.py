# -*- coding: utf-8 -*-
"""cv2 instruct 样本引导词边界检测：能量 gap 法（-40dB，>=250ms 静音=候选边界）"""
import soundfile as sf, numpy as np, glob, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

D = 'F:/claudecode/projects/active/kids-games/voice/_voice_samples'
for p in sorted(glob.glob(os.path.join(D, 'cv2_instruct_*.wav'))):
    a, sr = sf.read(p)
    if a.ndim > 1: a = a[:, 0]
    dur = len(a) / sr
    win = max(1, int(sr * 0.03)); thr = 10 ** (-40 / 20)
    gaps = []; i = 0
    while i < len(a) - win + 1:
        if float(np.sqrt(np.mean(a[i:i + win] ** 2))) < thr:
            j = i
            while j < len(a) - win + 1 and float(np.sqrt(np.mean(a[j:j + win] ** 2))) < thr:
                j += win
            d = (j - i) / sr
            if d >= 0.25:
                gaps.append((round(i / sr, 2), round(d, 2)))
            i = max(j, i + win)
        else:
            i += win
    name = os.path.basename(p)
    print(name, 'dur=%.2fs' % dur, 'gaps=', gaps[:5])
