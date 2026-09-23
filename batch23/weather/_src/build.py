# -*- coding: utf-8 -*-
"""weather 天气穿衣 v2 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch23/weather/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch23/weather/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（wea_ 56 条[v2 16 + T46 40] + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('weather')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：wea_ 16 条 + core 3 条 = 19 条（SPEC-BATCH23 §1 v2）
WEA_KEYS = ['wea_tut_watch', 'wea_tut_turn', 'wea_hint', 'wea_right',
            'wea_w_sun', 'wea_w_rain', 'wea_w_snow', 'wea_w_wind',
            'wea_q_sun', 'wea_q_rain', 'wea_q_snow', 'wea_q_wind',
            'wea_multi_hint', 'wea_temp_hint', 'wea_who_hint', 'wea_anti_hint']
# T46：题面静态 17 句（wea_st_0..16，gen_clips 注册序=CH1_ROWS/COMBOS/ANTI_SCENES
# 源内 stem 出现序）+ 提交反馈 2（wea_sub_less/more）+ temp/who 封闭域 21 句
# （wea_tt_ 9 含 m5 + wea_tw_ 12——09-19 主线补键，tempCn 域=TEMPS/WHO_TEMPS 全枚举）
T46_KEYS = (['wea_st_%d' % i for i in range(17)] + ['wea_sub_less', 'wea_sub_more'] +
            ['wea_tt_m5', 'wea_tt_5', 'wea_tt_8', 'wea_tt_12', 'wea_tt_16',
             'wea_tt_18', 'wea_tt_24', 'wea_tt_25', 'wea_tt_32'] +
            ['wea_tw_%s_%d' % (pk, t) for pk in ('mom', 'bunny') for t in (5, 8, 12, 16, 18, 24)])
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in WEA_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 59, 'clips 条数 %d != 59（wea 16+17+2+21 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件；v2 提交制+条件推理）
assert "KIDS.init({ game: 'weather'" in main, 'main 缺 KIDS.init weather（存档键 kidsgame_weather）'
assert 'window.WE =' in main, 'main 缺 WE 钩子'
assert '__weDemoR' in main, 'main 缺教学演示实证 __weDemoR'
assert 'tapCloth(i)' in main, 'main 缺 v2 钩子 tapCloth'
assert 'tapSubmit()' in main, 'main 缺 v2 钩子 tapSubmit'
assert 'id="btn-wear"' in head, 'head 缺提交钮 #btn-wear'
assert 'id="conds"' in head, 'head 缺条件区 #conds'
# 家族契约 A：启动与 winFlow 两处 dayEnd 都传 lim-1（M2 修复后补——shaperoof 同款断言）
assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须两处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')

# 硬性检查 2c（r9）：estMs 家族定版字面（n*345+600，禁 +300 变体）+时长源模型在场
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面，data 定义）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
assert 'levelDurMs' in data and 'LEVEL_MIN_MS = 40000' in data, 'r9 时长模型源缺失（data）'
assert 'estMs 家族定版' in main, 'main 注释缺 estMs 家族定版提及（四处同步）'
# 契约 F（r9 修复）：生成关预告禁 (ci+1)%N 字面，须实算 genLevel(f+1).dch
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关须实算 genLevel(f+1).dch-1（契约 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 字面（契约 F，verify 哨兵字面只准在 game-verify.js）'
# r9 verify 新单元在场（时长汇总+nextHint 逐点）
assert 'units.duration' in verif and 'V_MIN = 40000' in verif, 'verify 缺 r9 时长独立副本单元'
assert 'nextHint(f)' in verif and 'GEN_HINTS[genLevel(f + 1).dch - 1]' in verif, 'verify 缺 nextHint 逐点断言'

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
