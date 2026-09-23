# -*- coding: utf-8 -*-
"""area 单文件拼接（r14）：_src/head.html + core + clips + data/engine/main + verify(独立第 4 块)
→ ../index.html。用法: python batch17/area/_src/build.py
语音 clip 已全部合成在场（r14 既有 16 条：教学/提示/反馈 6 + 数数句 10；
T46 阶段2 2026-09-19 +80：题面 ar_ask_4+ar_calc_30 + 确认句 ar_cf_46；
+ core 共享 3 条=manifest games 含 area 全集 109 条（含 ar_cf_s_11..20），由主会话注入 manifest）：
注入失败必须 sys.exit(3)，禁降级空串构建。
静态断言族（r7-r13 固化坑，全插循环体外）：家族 F 实算/禁取模/CHAPTERS 表字面锚/
estMs 四处同步/LEVEL_MIN_MS/n_scripts==4（verify 并入 script[2]=页内源码断言自匹配恒真）。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch17/area/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（games 含 area 全集 19 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('area')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: area clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（教学/提示/反馈/数数句 1-10 + T46 题面/确认句族锚——数格子按钮与 confirmSpeak/speakQuiz 依赖）
MUST = ('ar_tut_watch', 'ar_tut_turn', 'ar_hint', 'ar_right', 'ar_wrong', 'ar_tip',
        'ar_count_1', 'ar_count_2', 'ar_count_3', 'ar_count_4', 'ar_count_5',
        'ar_count_6', 'ar_count_7', 'ar_count_8', 'ar_count_9', 'ar_count_10',
        'ar_ask_count', 'ar_ask_samearea', 'ar_ask_combo', 'ar_ask_unit2',
        'ar_calc_area_2_2', 'ar_calc_area_5_4', 'ar_calc_peri_2_2', 'ar_calc_peri_5_4',
        'ar_cf_p_8', 'ar_cf_p_20', 'ar_cf_c_2', 'ar_cf_c_20', 'ar_cf_u_2', 'ar_cf_u_20',
        'ar_cf_s_1', 'ar_cf_s_10',
        'core_chapter_end', 'core_day_end', 'core_rest')
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: area clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 审查 m2：条数恰 109（ar_ 106=16 既有+90 T46 含 ar_cf_s_11..20 零值域补齐 +core 3）——manifest 混入多余 clip 时拦截（对齐 pf/mm 做法）
import re as _re
_n = len(_re.findall(r'"(?:ar_|core_)[a-z0-9_]+":', clips))
if _n != 109:
    print('FATAL: area clips 条数 %d != 109' % _n)
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
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# ===== 静态断言族（r7-r13 固化坑；全在循环体外，构建即拦） =====
# 坑1 家族 F：nextHint 生成关必须实算 genLevel(f+1).dch（禁 (ci+1)%4 取模——第三犯禁令）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族 F：main 缺实算字面 GEN_HINTS[genLevel(f + 1).dch - 1]'
for name, s in [('main', main), ('data', data), ('engine', engine), ('verify', verif)]:
    assert '% 4]' not in s and '%4]' not in s, f'{name} 含 GEN_HINTS 取模字面 % 4]/%4]（家族 F 第三犯形态——r14 审查 m-5 补无空格变体）'
# 坑1 CHAPTERS 表内容字面锚（注释自称合规不可信——断言锚表内容字面）
for lit in ("hint: '比一比谁的格子多'", "hint: '几块砖拼成一大块'",
            "hint: '一格能住两只小蚂蚁'", "hint: '新的铺砖挑战要来啦'"):
    assert lit in data, 'CHAPTERS 表锚缺失: %s' % lit
for lit in ("'算一算面积挑战'", "'比一比面积挑战'", "'拼砖组合挑战'", "'一格代二挑战'"):
    assert lit in data, 'GEN_HINTS 锚缺失: %s' % lit
# 坑2 契约 K：救援 interval 面板守卫
assert ".k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel" in main, '契约 K：救援 interval 缺面板守卫'
# 坑3 estMs 家族定版四方同步（源常量+data 注释+verify estMsV+build 本断言）
for name, s in [('data', data), ('verify', verif)]:
    assert 's.length * 345 + 600' in s, 'estMs 四方同步断裂: %s 缺 s.length * 345 + 600' % name
assert 'LEVEL_MIN_MS = 40000' in data, 'data 缺 LEVEL_MIN_MS = 40000'
# 坑3 ⑭ modeled 最低值精确防回漂断言字面在场（值由 40 关推导定稿，verify ⑭ 硬断言）
assert 'AR_DMIN_MIN ===' in verif or 'dMin < AR_DMIN_MIN' in verif, 'verify 缺 ⑭ dMin 精确断言'
# 坑5 verify 独立第 4 script 块（n_scripts==4；verify 并入 script[2]=页内源码断言自匹配恒真）
_nscr = html.count('<script>')
assert _nscr == 4, 'script 块数 %d != 4（verify 必须独立第 4 块）' % _nscr

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
