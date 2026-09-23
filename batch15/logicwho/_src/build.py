# -*- coding: utf-8 -*-
"""logicwho 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch15/logicwho/_src/build.py
语音 clip 已全部合成在场（lgw_* 30 条：4 教学/提示/纠错 + 6 问句 + 9 拼接单元 + 3 色 +
3 物品 + 3 动物名 + 3 问句冗余…… 实为 manifest games 含 logicwho 全集）：
注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch15/logicwho/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（lgw_* 30 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('logicwho')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: logicwho clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（题面问句/线索拼接全单元/动物名/色词——题面 queue 拼接依赖）
MUST = ('lgw_tut_watch', 'lgw_tut_turn', 'lgw_hint', 'lgw_wrong',
        'lgw_q_red', 'lgw_q_yellow', 'lgw_q_blue', 'lgw_q_ball', 'lgw_q_book', 'lgw_q_umbrella',
        'lgw_c_a', 'lgw_c_b', 'lgw_c_nb', 'lgw_c_l', 'lgw_c_left', 'lgw_c_ll', 'lgw_c_rr',
        'lgw_c_h', 'lgw_c_i',
        'lgw_red', 'lgw_yellow', 'lgw_blue', 'lgw_ball', 'lgw_book', 'lgw_umbrella',
        'lgw_n_tu', 'lgw_n_mao', 'lgw_n_xiong')
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: logicwho clips 注入不完整（缺 %s）' % must)
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
