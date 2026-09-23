# -*- coding: utf-8 -*-
"""音色选型样本：游戏代表句 × Kokoro zf_002/zf_003 → _voice_samples/（与晓晓现状对比用）
代表句=教学开场/对反馈/SEL 后果句/科普句（短句+长句+情感句三型）"""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

KOKORO_DIR = 'F:/claudecode/output/books/youtube-to-xiaoxiao-audio'
PY_K = KOKORO_DIR + '/kokoro_env/Scripts/python.exe'
os.environ.setdefault('HF_HUB_OFFLINE', '1')
sys.path.insert(0, KOKORO_DIR)

OUT = 'F:/claudecode/projects/active/kids-games/voice/_voice_samples'
os.makedirs(OUT, exist_ok=True)

LINES = [
    ('tut',   '看！昆虫和蜘蛛'),
    ('right', '答对啦，小科学家'),
    ('sel',   '玩具摔坏了，你也会更难过'),
    ('sci',   '昆虫有六条腿，头胸腹三部分'),
    ('q',     '蚂蚁呀，它是昆虫还是蜘蛛'),
]

def main():
    import numpy as np, soundfile as sf
    from kokoro import KPipeline
    for vid in ('zf_002', 'zf_003'):
        pipe = KPipeline(lang_code='z', repo_id='hexgrad/Kokoro-82M-v1.1-zh')
        for tag, text in LINES:
            au = None
            for result in pipe(text, voice=vid, speed=1.0):
                if result.audio is not None:
                    x = result.audio.numpy() if hasattr(result.audio, 'numpy') else np.asarray(result.audio)
                    au = x if au is None else np.concatenate([au, x])
            if au is None:
                print('FAIL', vid, tag); continue
            # 轻去头尾静音
            th = 2e-3
            idx = np.where(np.abs(au) > th)[0]
            if len(idx):
                au = au[max(0, idx[0] - 800):idx[-1] + 800]
            p = os.path.join(OUT, 'kokoro_%s_%s.wav' % (vid, tag))
            sf.write(p, au, 24000)
            print('ok', p.split('/')[-1], '%.2fs' % (len(au) / 24000))

if __name__ == '__main__':
    main()
