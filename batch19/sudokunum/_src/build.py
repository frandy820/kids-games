# -*- coding: utf-8 -*-
"""sudokunum 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/sudokunum/_src/build.py
语音 clip 已全部合成在场（sn_ 5 条 + core 共享 3 条 = manifest games 含 sudokunum 全集
恰 9 条=T46 阶段2 前 8+sn_dead，由主会话注入 manifest）：注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch19/sudokunum/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（games 含 sudokunum 全集恰 9 条已合成在场（T46 阶段2+sn_dead）；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('sudokunum')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: sudokunum clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（教学/提示/反馈/确认 + core 共享——恰 9 条，§4+T46 阶段2；数词走 TTS 兜底不建）
MUST = ('sn_tut_watch', 'sn_tut_turn', 'sn_hint', 'sn_right', 'sn_wrong', 'sn_dead',
        'core_chapter_end', 'core_day_end', 'core_rest')
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: sudokunum clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
if clips.count(':"data:audio/mpeg;base64,') != 9:
    print('FATAL: sudokunum clips 恰 9 条断言失败（实得 %d 条）' % clips.count(':"data:audio/mpeg;base64,'))
    sys.exit(3)
# T46 阶段2（09-19）：sn_dead（死局明说句）keyless→clip 化——manifest 文本对账+main 双点键化断言
import json as _json
_mani = _json.load(open(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
assert _mani['sn_dead']['text'] == '有一个数字放错啦，换一换摇头的格子', 'manifest sn_dead 文本不一致'
assert _mani['sn_dead'].get('games') == ['sudokunum'], 'manifest sn_dead games 异常'
assert main.count("KIDS.voice.play('sn_dead', '有一个数字放错啦，换一换摇头的格子')") == 2, \
    'main sn_dead 键化调用应恰 2 处（错填死局+救援死局）'

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
