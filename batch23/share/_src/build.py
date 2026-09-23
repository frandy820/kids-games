# -*- coding: utf-8 -*-
"""share 分糖果 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch23/share/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch23/share/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（sha_* 40 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('share')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r22 SPEC-R22-SHARE §R6，子集式防注册前后断言漂移——r20/r21 范式）：
# 必备键=已注册 43 条精确在册（sha_ 40：5 既有 + T46 阶段2 题面 22 sha_q_{n}_{k}(k∈2,3)
# + 数词 13 sha_n_；core 3）；总数 ≥43——主线注册 r22 新键 11 条
# （sha_q_{n}_4 ×6 / sha_cmp_who / sha_cmp_diff / sha_rev_q / sha_wrong / sha_ans_right，
# games=['share'] 恰一主，防 sha_ 前缀与 shadow 20 条同名前缀异主串款）后 54 亦过
SHA_KEYS = ['sha_tut_watch', 'sha_tut_turn', 'sha_hint', 'sha_right', 'sha_plate']
T46_KEYS = ['sha_q_%d_%d' % (n, k) for n in range(2, 13) for k in (2, 3)] + \
           ['sha_n_%d' % n for n in range(0, 13)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SHA_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 43, 'clips 条数 %d < 43（必备 sha 40 + core 3；r22 注册 11 新键后 54）' % n_clips

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
