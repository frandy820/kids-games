# -*- coding: utf-8 -*-
"""gen_clips32.py — zq_/core_ clips 重编码缓存层（v53 瘦身：48kbps→32kbps，省 ~4MB base64）

家族红线：voice/clips/ 与 manifest.json 是共享真值源禁改——本脚本只读源，写缓存
_src/data/clips32/<key>.mp3（进 git，保证任何环境 build 幂等免 ffmpeg）。

逐键验收：ffprobe 时长差 <0.35s 且体积 < 原始 90%，不达标退回用源（禁静默变差）。
用法: python gen_clips32.py            # 增量补缺（build 前 hook 自动调）
"""
import io, json, os, subprocess, sys

CLIPS = 'F:/claudecode/projects/active/kids-games/voice/clips'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'clips32')
FFPROBE = 'ffprobe'
FFMPEG = 'ffmpeg'


def dur(path):
    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'csv=p=0', path], capture_output=True, text=True, timeout=30)
    try:
        return float(r.stdout.strip())
    except Exception:
        return None


def main():
    mf = json.load(io.open(os.path.join(CLIPS, 'manifest.json'), encoding='utf-8'))
    keys = [k for k in mf if k.startswith('zq_') or k.startswith('core_')]
    os.makedirs(OUT, exist_ok=True)
    n_ok = n_skip = n_fallback = 0
    for k in keys:
        src = os.path.join(CLIPS, k + '.mp3')
        dst = os.path.join(OUT, k + '.mp3')
        if os.path.exists(dst) and os.path.getsize(dst) >= 800:
            n_skip += 1
            continue
        if not os.path.exists(src):
            continue
        tmp = dst + '.tmp.mp3'
        subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', src,
                        '-codec:a', 'libmp3lame', '-b:a', '32k', '-ar', '24000', '-ac', '1',
                        '-id3v2_version', '0', tmp], capture_output=True, timeout=60)
        d0, d1 = dur(src), dur(tmp)
        ok = (d0 is not None and d1 is not None and abs(d0 - d1) < 0.35
              and os.path.exists(tmp) and os.path.getsize(tmp) < os.path.getsize(src) * 0.9)
        if ok:
            os.replace(tmp, dst)
            n_ok += 1
        else:
            if os.path.exists(tmp):
                os.remove(tmp)
            n_fallback += 1
    print('clips32: ok=%d cached=%d fallback=%d / %d' % (n_ok, n_skip, n_fallback, len(keys)))
    if n_fallback:
        print('FALLBACK keys kept original (duration/size gate failed)')


if __name__ == '__main__':
    main()
