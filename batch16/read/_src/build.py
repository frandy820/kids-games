# -*- coding: utf-8 -*-
"""read 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch16/read/_src/build.py
语音 clip 已全部合成在场（rd_ 38 条：6 教学/提示/反馈/听读 + 9 题句段 + 23 词
+ rd_s_ 正文句 174 条（T46 拆段，听读/点句跟读 clip 化）；
+ core 共享 3 条=manifest games 含 read 全集 215 条，由主会话注入 manifest）：
注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch16/read/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（games 含 read 全集 215 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('read')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: read clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（题面问句段/听读/教学/反馈/词表全部——题句 queue 拼接与选项播放依赖；
# + rd_s_ 正文句域抽查 4 键——全量 174 条由 ?verify=1 clipOk 双向封闭断言复核）
MUST = ('rd_tut_watch', 'rd_tut_turn', 'rd_hint', 'rd_wrong', 'rd_right', 'rd_listen',
        'rd_q1', 'rd_q1b', 'rd_q2', 'rd_q2b', 'rd_q3a', 'rd_q3b', 'rd_q3c', 'rd_q4a', 'rd_q4b',
        'rd_w_rabbit', 'rd_w_cat', 'rd_w_bear', 'rd_w_home', 'rd_w_park', 'rd_w_river',
        'rd_w_school', 'rd_w_shop', 'rd_w_yard', 'rd_w_carrot', 'rd_w_book', 'rd_w_boots',
        'rd_w_hat', 'rd_w_kite', 'rd_w_umbrella', 'rd_w_red', 'rd_w_blue', 'rd_w_green',
        'rd_w_yellow', 'rd_w_happy', 'rd_w_sad', 'rd_w_angry', 'rd_w_worried',
        'rd_s_c1s0_carrot_red', 'rd_s_c1s1_cat_book_blue', 'rd_s_c2c', 'rd_s_c4b4b',
        'core_chapter_end', 'core_day_end', 'core_rest')
# 条数断言：恰 215 条（core 3+rd 38+rd_s_ 174——T46 拆段口径）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 215:
    print('FATAL: read clips 条数 %d != 215' % n_audio)
    sys.exit(3)
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: read clips 注入不完整（缺 %s）' % must)
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
