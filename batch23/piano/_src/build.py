# -*- coding: utf-8 -*-
"""piano 碰碰琴 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch23/piano/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch23/piano/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（manifest 对账——实况 piano 12 条 = pia 9 + core 3：9 必备 + r23 新增
# pia_rhy_q/pia_cho_q/pia_ans_wrong；下方断言=9 必备键精确在场+总数 ≥9 子集式）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('piano')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r23 子集式，SPEC-R23 §R6/§R8）：9 必备键（pia 6 + core 3）精确在场
# + 总数 ≥9——主线注册 3 新键（pia_rhy_q/pia_cho_q/pia_ans_wrong）后 12 亦过，
# 防注册前后断言漂移（r20/r21/r22 范式）
PIA_KEYS = ['pia_tut_watch', 'pia_tut_turn', 'pia_hint', 'pia_right', 'pia_wrong', 'pia_like']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in PIA_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 9, 'clips 条数 %d < 9（pia 6 + core 3 必备）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
