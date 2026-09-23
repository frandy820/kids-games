# -*- coding: utf-8 -*-
"""column 单文件拼接（r15）：_src/head.html + core + clips + data/engine/main + verify(独立第 4 块)
→ ../index.html。用法: python batch12/column/_src/build.py
语音 clip（r15 全集 14 条 = clm_ 11：既有 5 一字不改 + 新 6 进退位/两步；core 共享 3）：
注入失败必须 sys.exit(3)，禁降级空串构建。
静态断言族（r7-r14 固化坑，全插循环体外）：家族 F 实算/禁取模双形态/CHAPTERS 表字面锚/
estMs 四处同步/LEVEL_MIN_MS/DMIN 精确防回漂/n_scripts==4（verify 并入 script[2]=自匹配恒真）。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch12/column/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（games 含 column 全集 14 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('column')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: column clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（既有 5 键一字不改 + r15 新 6 键 + core 共享 3）
MUST = ('clm_tut_watch', 'clm_tut_turn', 'clm_hint', 'clm_q_add', 'clm_q_sub',
        'clm_q_two', 'clm_q_step2', 'clm_carry_go', 'clm_borrow_go',
        'clm_no_carry', 'clm_no_borrow',
        'core_chapter_end', 'core_day_end', 'core_rest')
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: column clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数恰 14（clm_ 11 + core 3）——manifest 混入多余 clip 时拦截（对齐 ar/pf/mm 做法）
import re as _re
_n = len(_re.findall(r'"(?:clm_|core_)[a-z0-9_]+":', clips))
if _n != 14:
    print('FATAL: column clips 条数 %d != 14' % _n)
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

# ===== 静态断言族（r7-r14 固化坑；全在循环体外，构建即拦） =====
# 坑1 家族 F：nextHint 生成关必须实算 genLevel(f+1).dch（禁 (ci+1)%4 取模——第三犯禁令，含无空格变体）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族 F：main 缺实算字面 GEN_HINTS[genLevel(f + 1).dch - 1]'
for name, s in [('main', main), ('data', data), ('engine', engine), ('verify', verif)]:
    assert '% 4]' not in s and '%4]' not in s, f'{name} 含 GEN_HINTS 取模字面 % 4]/%4]（家族 F 第三犯形态）'
# 坑1 CHAPTERS 表内容字面锚（注释自称合规不可信——断言锚表内容字面）
for lit in ("hint: '接下来：换成减法竖式，算一算'", "hint: '接下来：三位数大竖式来啦'",
            "hint: '接下来：两步竖式，连着算'", "hint: '新一轮竖式小黑板挑战'"):
    assert lit in data, 'CHAPTERS 表锚缺失: %s' % lit
for lit in ("'新的竖式加一加'", "'新的竖式减一减'", "'三位数竖式挑战'", "'两步竖式挑战'"):
    assert lit in data, 'GEN_HINTS 锚缺失: %s' % lit
# 坑2 契约 K：救援 interval 面板守卫
assert ".k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel" in main, '契约 K：救援 interval 缺面板守卫'
# 坑3 estMs 家族定版四方同步（源常量+data 注释+verify estMsV+build 本断言）
for name, s in [('data', data), ('verify', verif)]:
    assert 's.length * 345 + 600' in s, 'estMs 四方同步断裂: %s 缺 s.length * 345 + 600' % name
assert 'LEVEL_MIN_MS = 40000' in data, 'data 缺 LEVEL_MIN_MS = 40000'
# 坑3 ⑫ modeled 最低值精确防回漂断言字面在场（CLM_DMIN=117600 由 40 关推导定稿，verify ⑫ 硬断言）
assert 'CLM_DMIN ===' in verif, 'verify 缺 ⑫ CLM_DMIN 精确断言'
# 坑5 verify 独立第 4 script 块（n_scripts==4；verify 并入 script[2]=页内源码断言自匹配恒真）
_nscr = html.count('<script>')
assert _nscr == 4, 'script 块数 %d != 4（verify 必须独立第 4 块）' % _nscr
# r15 结构锚：8 题关/32 静态关（CH_LEN 连锁：keyOf/写档/LV_RANGE 全 8 基）
assert 'const CH_LEN = 8;' in data, 'data 缺 CH_LEN = 8（r15 5→8）'
assert 'const STATIC_LEVELS = 32;' in data, 'data 缺 STATIC_LEVELS = 32（r15 20→32）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
