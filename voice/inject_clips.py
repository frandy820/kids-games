# -*- coding: utf-8 -*-
"""语音 clips 注入器：clips/*.mp3 → base64 → `KIDS.voice.clips={...};` 单行
- shop/kitchen：由各自 build.py 调 clips_js(game) 内嵌（构建自包含）
- pipe：无 build，本脚本直改 index.html（幂等：按 /*CLIPS*/ 标记整段替换）
用法: python inject_clips.py pipe   （pipe 直改模式）
"""
import base64, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, 'clips')

def clips_js(game):
    """返回该游戏的 `KIDS.voice.clips = {...};` 注入行（含标记注释，供幂等替换）"""
    m = json.load(open(os.path.join(CLIPS, 'manifest.json'), encoding='utf-8'))
    parts, total = [], 0
    for key, info in sorted(m.items()):
        if game not in info['games']: continue
        path = os.path.join(CLIPS, key + '.mp3')
        if not os.path.exists(path) or os.path.getsize(path) < 800:
            sys.exit('FATAL: clip 缺失或过小: %s' % key)
        b = base64.b64encode(open(path, 'rb').read()).decode('ascii')
        total += len(b)
        assert '</script' not in b  # base64 字母表不含 '<'，防御性断言
        parts.append('%s:"data:audio/mpeg;base64,%s"' % (json.dumps(key), b))
    print('clips[%s]: %d 条, base64 %d chars' % (game, len(parts), total))
    return '/*CLIPS:%s*/KIDS.voice.clips={%s};/*CLIPS-END*/' % (game, ','.join(parts))

def inject_pipe():
    p = os.path.join(HERE, '..', 'batch1', 'pipe-rabbit', 'index.html')
    s = open(p, encoding='utf-8').read()
    line = clips_js('pipe')
    tag = '/*CLIPS:pipe*/'
    if tag in s:  # 幂等：替换旧注入段
        i, j = s.index(tag), s.index('/*CLIPS-END*/', i) + len('/*CLIPS-END*/')
        s = s[:i] + line + s[j:]
    else:  # 首次：插在 core IIFE 结束（第一个 '})();'）之后
        i = s.index('})();') + len('})();')
        s = s[:i] + '\n' + line + s[i:]
    assert s.count(tag) == 1
    open(p, 'w', encoding='utf-8').write(s)
    print('pipe injected, size=%d' % len(s))

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'pipe':
        inject_pipe()
    else:
        print('clips_js only; run `inject_clips.py pipe` for direct injection')
