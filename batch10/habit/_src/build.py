# -*- coding: utf-8 -*-
"""habit 好习惯排序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch10/habit/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch10/habit/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（hb_tut_watch/hb_tut_turn/hb_hint + hb_q_* 12 流程题面
# （xishou/qichuang/shuaya/chuanyi/guomal/shuijiao/baojiaozi/zhonghua/jixin/kaodangao/xizao/xiyi）
# + core_* 三条，manifest 对账）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('habit')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)  # 审查M1：注入失败禁静默降级
assert 'data:audio' in clips, 'clips 为空：注入被静默架空（审查M1）'
for k in ['hb_tut_watch', 'hb_tut_turn', 'hb_hint', 'hb_q_xishou', 'hb_q_qichuang',
          'hb_q_shuaya', 'hb_q_chuanyi', 'hb_q_guomal', 'hb_q_shuijiao',
          'hb_q_baojiaozi', 'hb_q_zhonghua', 'hb_q_jixin', 'hb_q_kaodangao',
          'hb_q_xizao', 'hb_q_xiyi',
          # T46 阶段2（2026-09-19）：题面尾段+三纠错锚 clip 化
          'hb_suffix', 'hb_w_start', 'hb_w_mid', 'hb_w_adj']:
    assert k in clips, f'clip 缺失: {k}（r5 12 序列题面/T46 尾段纠错锚）'
# r5 审查 m-9：clips 计数断言（19=hb_ 3+hb_q_ 12+T46 尾段1+纠错锚3）+ core 三键双注入防护（对齐 teach/trace）
import re as _re
_keys = set(_re.findall(r'"([a-z]+_[a-z0-9_]+)":\s*"', clips))
assert len([k for k in _keys if k.startswith('hb_')]) == 19, f'hb_ clip 计数漂移: {sorted(_keys)}'
for ck in ['core_chapter_end', 'core_day_end', 'core_rest']:
    assert ck in clips, f'core clip 缺失: {ck}'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r5 窗常量四处同步·字面 assert）：estMs 家族定版 n*345+600（r4 m-5 统一，
# 禁 +300 变体）+ 干扰规则 DECOY_RULE/MAX_CARDS 在 data 定义、verify 引用一致
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600）'
assert '+ 300' not in data.split('const estMs')[1].split(';')[0], 'estMs 出现 +300 变体（禁）'
assert 'const DECOY_RULE = { 1: 0, 2: 0, 3: 2, 4: -1 };' in data, 'DECOY_RULE 字面漂移'
assert 'const MAX_CARDS = 9;' in data, 'MAX_CARDS 字面漂移'
assert 'estMs(1) === 945' in verif and 'SPEC_DECOY = { 1: 0, 2: 0, 3: 2, full: [0, 2] }' in verif \
    and 'SPEC_MAX_CARDS = 9' in verif, 'verify 与 data 常量不同步'
assert '14 * 345 + 600' in verif, 'verify estMs 数值断言缺失'
# r5 审查 M-2/m-1（家族 A/F 静态护栏——python 读源文件无 verify 自匹配问题）：
# A：dayEnd 传 lim-1（nextHint(lim) 超前一章，b23/b24 定版）；F：生成关预告实算禁式字面
assert 'nextHint: nextHint(lim - 1)' in main, '家族 A 违例：dayEnd 须传 lim-1'
assert 'nextHint: nextHint(lim)' not in main, '家族 A 禁式在场：nextHint(lim)'
assert 'genLevel(f + 1).dch - 1' in main, '家族 F：生成关预告须实算 genLevel(f+1).dch'
assert '(ci + 1) % 4' not in main, '家族 F 禁式字面（habitat r4 M-1 同型）'

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
