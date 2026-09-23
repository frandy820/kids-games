# -*- coding: utf-8 -*-
"""quiz 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch20/quiz/_src/build.py
语音 clip 已全部合成在场（T46 阶段2 2026-09-19：quiz 333 条=题库 clip 化 qz_q_160+
qz_opts_160+qz_cat_4+qz_no+通用 5+core 共享 3，由主会话注入 manifest games:['quiz']）：
注入失败必须 sys.exit(3)，禁降级空串构建"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch20/quiz/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（T46 阶段2：333 条全量已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('quiz')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: quiz clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：T46 阶段2 全键族抽查（通用 5+qz_no+题库四角+类别 4）+ core 共享 3
for must in ('qz_tut_watch', 'qz_tut_turn', 'qz_hint', 'qz_right', 'qz_wrong', 'qz_no',
             'qz_q_1', 'qz_q_160', 'qz_opts_1', 'qz_opts_160',
             'qz_cat_1', 'qz_cat_2', 'qz_cat_3', 'qz_cat_4',
             'core_chapter_end', 'core_day_end', 'core_rest'):
    if ('"%s"' % must) not in clips:
        print('FATAL: quiz clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 333 条（T46 阶段2：qz_ 330=题库 320+类别 4+纠错 1+通用 5 + core 3）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 333:
    print('FATAL: quiz clips 条数 %d != 333（qz_ 330 + core 3）' % n_audio)
    sys.exit(3)
# T46 阶段2 题库全量对账（SPEC 真值源=QZ_BANK 字面量）：题面/选项串 320 键文本逐一
# 与 manifest 一致（键 1 基：qz_q_1=QZ_BANK[0]）；类别 4+qz_no 同对账；data 键化件锚定
import json as _json, re as _re
_mani = _json.load(open(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
_mb = _re.search(r'const QZ_BANK = (\[[\s\S]*?\]);', data)
assert _mb, 'game-data 缺 QZ_BANK 字面量'
_bank = _json.loads(_mb.group(1))
assert len(_bank) == 160, 'QZ_BANK 应 160 题: %d' % len(_bank)
for _i, _b in enumerate(_bank):
    _kq, _ko = 'qz_q_%d' % (_i + 1), 'qz_opts_%d' % (_i + 1)
    assert _mani.get(_kq, {}).get('text') == _b['q'], 'manifest %s 文本≠QZ_BANK[%d].q' % (_kq, _i)
    assert _mani.get(_ko, {}).get('text') == '选项有：' + '，'.join(_b['opts']), \
        'manifest %s 文本≠选项串（QZ_BANK[%d]）' % (_ko, _i)
for _c, _cn in {1: '动植物探秘', 2: '天气与自然', 3: '测量与单位', 4: '因果小侦探'}.items():
    assert _mani.get('qz_cat_%d' % _c, {}).get('text') == '这是%s的题目' % _cn, 'manifest qz_cat_%d 文本不一致' % _c
assert _mani.get('qz_no', {}).get('text') == '这个不对', 'manifest qz_no 文本不一致'
for _k in ('qz_q_1', 'qz_opts_1', 'qz_cat_1', 'qz_no'):
    assert _mani[_k].get('games') == ['quiz'], 'manifest %s games 异常' % _k
assert "const qKeyOf = q => 'qz_q_' + (q.qid + 1);" in data, 'data 缺 qKeyOf 键化件（qid 0 基→键 1 基）'
assert "const optsKeyOf = q => 'qz_opts_' + (q.qid + 1);" in data, 'data 缺 optsKeyOf 键化件'
assert "const catKeyOf = q => 'qz_cat_' + q.cat;" in data, 'data 缺 catKeyOf 键化件'
assert "qz_cat_' + q.cat" in main or 'catKeyOf' in main, 'main 未用类别键化件'
assert "KIDS.voice.queue(keys)" in main and "KIDS.voice.say(fallback)" in main, 'main 缺 sayQ 键链兜底对'

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
