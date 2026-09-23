# -*- coding: utf-8 -*-
"""cipher 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/cipher/_src/build.py
语音 clip 已全部合成在场（cipher 42 条=ci_ 39+core 共享 3，T46 阶段2 +34 段，
由主会话注入 manifest games:['cipher']）：
注入失败必须 sys.exit(3)，禁降级空串构建"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch19/cipher/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（cipher 42 条已合成在场；失败=构建失败退出码 3，不降级）
# T46 阶段2（2026-09-19）：+34 段（ci_v_d1-9/ci_v_<字>12/ci_sym_*10/ci_repr/ci_look1-2）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('cipher')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: cipher clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：5 条 ci_ 中文 + T46 段抽样 + core 共享 3（SPEC-BATCH19 §1 语音口径）
_MUST = ('ci_tut_watch', 'ci_tut_turn', 'ci_hint', 'ci_right', 'ci_wrong',
         'ci_repr', 'ci_look1', 'ci_look2', 'ci_sym_star', 'ci_sym_cloud', 'ci_v_d1', 'ci_v_d9',
         'ci_v_太阳', 'ci_v_木头',
         'core_chapter_end', 'core_day_end', 'core_rest')
for must in _MUST:   # 注入键经 json.dumps（非 ASCII 转义）——同口径比较
    if (json.dumps(must) + ':') not in clips:
        print('FATAL: cipher clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 42 条（ci_ 39=5 句+34 T46 段 + core 3）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 42:
    print('FATAL: cipher clips 条数 %d != 42' % n_audio)
    sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
