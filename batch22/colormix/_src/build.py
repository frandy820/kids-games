# -*- coding: utf-8 -*-
"""colormix 颜色魔法 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch22/colormix/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch22/colormix/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（col_* 5 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('colormix')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r21 SPEC-R21-COLORMIX §R6，子集式防注册前后断言漂移——r20 范式）：
# 必备键=已注册 23 条精确在册（col_ 20：5 既有 + T46 阶段2 题面 10 col_q_ + 颜料名 4
# col_paint_ + col_green；core 3）；总数 ≥23——主线注册 r21 新键 4 条
# （col_q_lightorange / col_q_lightgreen / col_q_lightpurple / col_rev_q）后 27 亦过
COL_KEYS = ['col_tut_watch', 'col_tut_turn', 'col_hint', 'col_right', 'col_wrong', 'col_green']
T46_KEYS = ['col_q_' + c for c in ('red', 'yellow', 'blue', 'orange', 'green', 'purple',
                                   'brown', 'lightred', 'lightyellow', 'lightblue')] + \
           ['col_paint_' + c for c in ('red', 'yellow', 'blue', 'white')]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in COL_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 23, 'clips 条数 %d < 23（必备 col 20 + core 3；r21 注册 4 新键后 27）' % n_clips

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
