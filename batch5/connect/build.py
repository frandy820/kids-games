# -*- coding: utf-8 -*-
"""connect 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → index.html
用法: cd batch5/connect && python build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / '_src'
OUT = ROOT / 'index.html'
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (SRC / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (SRC / 'game-data.js').read_text(encoding='utf-8')
engine = (SRC / 'game-core.js').read_text(encoding='utf-8')
main = (SRC / 'game-main.js').read_text(encoding='utf-8')
verif = (SRC / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（管线未就绪时降级为空串，主会话补管线后重建即可）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('connect')
except Exception:
    clips = ''

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3（r6）：estMs 窗公式=家族 b25 定版 n*345+600（禁 +300 变体）——与 game-verify 运行时复核同源
assert 'n * 345 + 600' in data, 'estMs 公式缺失或非 +600 口径（家族禁 +300 变体）'
assert 'n * 345 + 300' not in data and 'n*345+300' not in data, '发现 estMs +300 变体（b25 已废口径）'

# 硬性检查 4（r6）：语音 clips 注入齐全（既有 11 + r6 新 5 = con_ 16 条全量）
for k in ['con_tut_watch', 'con_tut_turn', 'con_hint', 'con_rev',
          'con_w_food', 'con_w_share', 'con_w_chain', 'con_hint_anti', 'con_less']:
    assert ('"%s":' % k) in clips, 'clips 注入缺 %s（先跑 gen_clips.py 再重建）' % k
for k in ['con_pair_panda', 'con_pair_chick', 'con_pair_squirrel', 'con_pair_bear',
          'con_pair_frog', 'con_pair_bird', 'con_pair_mouse']:
    assert ('"%s":' % k) in clips, 'clips 注入缺 %s' % k
# T46 阶段2（2026-09-19）题面/确认句族 66 锚（con_st_ 40+con_cf_ 26=66；anti 无 5=专属食物规则，
# up 去重 2 句，dn/chain 按 CHAINS 3 链）——缺注入=落 TTS 红线
for k in ['con_st_pair_0', 'con_st_pair_5', 'con_st_set_11', 'con_st_anti_0', 'con_st_anti_11',
          'con_st_up_5_6', 'con_st_up_9_6', 'con_st_dn_6_5', 'con_st_dn_6_9', 'con_st_dn_6_10',
          'con_cf_0', 'con_cf_5', 'con_cf_11', 'con_cf_anti_0', 'con_cf_anti_11',
          'con_cf_chain_5', 'con_cf_chain_9', 'con_cf_chain_10']:
    assert ('"%s":' % k) in clips, 'T46 clip 缺注入: %s' % k

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 5：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
