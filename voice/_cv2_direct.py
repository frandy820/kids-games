# -*- coding: utf-8 -*-
"""绕过 cv2_server2 的 ASR 裁剪链（SenseVoice 坏）：直接调 v1_instruct 合成原始输出"""
import sys, types
sys.path.insert(0, '/data/tts_upgrade2')
import cv2_server2 as cv2s

LINES = [
    ('tut', '看！昆虫和蜘蛛'),
    ('right', '答对啦，小科学家'),
    ('sel', '玩具摔坏了，你也会更难过'),
    ('sci', '昆虫有六条腿，头胸腹三部分'),
    ('q', '蚂蚁呀，它是昆虫还是蜘蛛'),
]

# spk 解析：voices.json 女声二号 spk='中文女'——先看 _do_synth 是否接受名字
args = types.SimpleNamespace(
    mode='v1_instruct', voice='女声二号', spk='中文女',
    instruct='用撒娇甜美的语气说话', speed=1.0,
    prompt_text=None, prompt_wav=None,
)

def main():
    for k, text in LINES:
        try:
            audio, sr, e = cv2s._do_synth('v1_instruct', text, args)
            if audio is None:
                print('FAIL', k, 'empty generator'); continue
            out = '/tmp/voice_samples/cv2_instruct_%s.wav' % k
            cv2s._save_wav(audio, sr, out)
            print('ok', k, '%.2fs' % (len(audio) / sr))
        except Exception as ex:
            print('FAIL', k, repr(ex)[:200])

if __name__ == '__main__':
    main()
