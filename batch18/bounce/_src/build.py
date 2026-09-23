# -*- coding: utf-8 -*-
"""bounce 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch18/bounce/_src/build.py
语音 clip 已全部合成在场（bounce 10 条=bc_ 中文 7(T46 阶段2+bc_hole)+core 共享 3，
由主会话注入 manifest games:['bounce']）：
注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch18/bounce/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（bounce 10 条已合成在场（T46 阶段2+bc_hole）；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('bounce')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: bounce clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：7 条 bc 中文（全量 10 条由条数断言+?verify=1 clipOk 复核）
for must in ('bc_tut_watch', 'bc_tut_turn', 'bc_hint', 'bc_right', 'bc_wrong', 'bc_boing', 'bc_hole'):
    if ('"%s"' % must) not in clips:
        print('FATAL: bounce clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# T46 阶段2（09-19）：bc_hole（进错洞语义句）keyless→clip 化——manifest 文本对账+main 键化断言
import json as _json
_mani = _json.load(open(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
assert _mani['bc_hole']['text'] == '进错洞啦，换个方向再试试', 'manifest bc_hole 文本不一致'
assert _mani['bc_hole'].get('games') == ['bounce'], 'manifest bc_hole games 异常'
assert main.count("KIDS.voice.play('bc_hole', '进错洞啦，换个方向再试试')") == 1, \
    'main bc_hole 键化调用应恰 1 处（进错洞分支）'
# 条数断言：恰 10 条（core 3+bc 中文 7（T46 阶段2+bc_hole）——SPEC-BATCH18 §3 口径，无额外词 clip）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 10:
    print('FATAL: bounce clips 条数 %d != 10（bc 7 + core 3，T46 阶段2+bc_hole）' % n_audio)
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
