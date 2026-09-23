# -*- coding: utf-8 -*-
"""grid 坐标寻宝 单文件拼接（r13：8×8 相对导航版）
四 script 块：[0]=core / [1]=clips / [2]=game-data+game-core+game-main / [3]=game-verify（独立——
verify ⑫ 源码断言按块序取 script[2]；b37 R4 对称：script[2] 纯游戏逻辑禁 runVerify）。
静态门禁：estMs 家族四处同步（源常量+实长注释+verify 副本+本文件 assert）/DECIDE_MS/句长 cap
→voiceWin≤DECIDE 静态验算/GRID_N=8/OPEN_RELAY≥hint 实长+300/480*SPEED 锁窗三处/家族 F 实算。
用法: python batch13/grid/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch13/grid/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（r13：gri_ 既有 17 + 新 9 = 26 条 + core 共用 3 = 29；manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('grid')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
GRI_KEYS = ('gri_tut_watch', 'gri_tut_turn', 'gri_hint', 'gri_wrong',
            'gri_q1', 'gri_q2', 'gri_q3', 'gri_go',
            'gri_n_1', 'gri_n_2', 'gri_n_3', 'gri_n_4', 'gri_n_5',
            'gri_d_up', 'gri_d_down', 'gri_d_left', 'gri_d_right',
            'gri_i_fwd', 'gri_i_ge', 'gri_i_left', 'gri_i_right', 'gri_i_take',
            'gri_i_order', 'gri_i_next', 'gri_i_box', 'gri_i_hint')
CORE_KEYS = ('core_chapter_end', 'core_day_end', 'core_rest')
for key in GRI_KEYS + CORE_KEYS:
    assert ('"%s"' % key) in clips, '缺 clip: %s' % key
n_gri = sum(1 for k in GRI_KEYS if ('"%s":' % k) in clips)
assert n_gri == 26, 'gri_ 注入数应 26 实 %s' % n_gri

# ---- r13 静态门禁（坑3 estMs 家族四处同步：源常量+实长注释+verify 副本+本文件） ----
EST_LIT = 'const estMs = s => s.length * 345 + 600'
EST_LIT_V = 'const estMsV = s => s.length * 345 + 600'
assert data.count(EST_LIT) == 1, 'game-data estMs 源常量应恰 1 处'
assert verif.count(EST_LIT_V) == 1, 'game-verify estMsV 副本应恰 1 处'
assert 'gri_i_hint 2640' in data, 'game-data 实长注释应含 gri_i_hint 2640（OPEN_RELAY 验算依据）'

DECIDE_LIT = 'const DECIDE_MS = { exec1: 7000, exec2: 8500, plan: 9000, maze: 10000 }'
DECIDE_LIT_V = 'const V_DECIDE = { exec1: 7000, exec2: 8500, plan: 9000, maze: 10000 }'
for lit, where in ((DECIDE_LIT, 'data'), (DECIDE_LIT_V, 'verify')):
    src = data if where == 'data' else verif
    assert src.count(lit) == 1, '%s 缺 DECIDE 字面: %s' % (where, lit)
assert data.count('const LEVEL_MIN_MS = 40000') == 1
assert verif.count('const V_ADV = 600, V_MIN = 40000, V_CHEST = 950, V_ENTER = 400, V_STAGE = 400') == 1
assert data.count('const GRID_N = 8') == 1 and engine.count('GRID_N') >= 3
assert data.count('const OPEN_RELAY_MS = 3000') == 1
assert data.count('const CAP_EXEC1 = 14, CAP_EXEC2 = 20') == 1
# 句长 cap → voiceWin ≤ DECIDE 结构性托底（静态验算；verify ⑪ 逐步再核）
EST, ENTER_TAIL = 345, 400 + 300
CAPS = {'exec1': 14, 'exec2': 20}
DECIDE_PY = {'exec1': 7000, 'exec2': 8500}
for k, cap in CAPS.items():
    vw = ENTER_TAIL + cap * EST + 600
    assert vw <= DECIDE_PY[k], 'cap 破托底: %s voiceWin=%d' % (k, vw)
# OPEN_RELAY 3000 ≥ gri_i_hint 实长 2640+300（防尾截；实长 ffprobe 2026-09-15）
assert 3000 >= 2640 + 300, 'OPEN_RELAY 窗不足'
# 首错/错序/撞墙锁窗 480*SPEED 三处（b39 总窗口径禁只断常量）
assert main.count('wait(480 * SPEED)') == 3, '480*SPEED 锁窗应 3 处（wrong/order/bump）'
# 家族 F：nextHint 生成关实算下一关难度章（禁章序取模推进——取模用法才是病理形态；
# (ci+1) 本身合法用于箱号徽章/章预告，禁一刀切）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main
assert 'CHAPTERS[(ci + 1) % 4]' not in main and 'CHAPTERS[(ci+1)%4]' not in main
assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main
# 教学链预算：watch→演示→重发→turn 2000ms 接力（§0.6 顺序链字面）
assert 'sayR(VOICE.watch.key' in main and 'sayR(VOICE.turn.key' in main
assert main.count('}, 2000);') >= 1, '教学交接 2000ms 接力窗缺失'
# r13 朝向状态机与错序反馈字面
assert 'const TURN_L = { N: ' in data and 'queue([\'gri_i_next\', numKey(q._col + 1), \'gri_i_box\'])' in main
# script[2] 纯游戏逻辑（b37 R4 对称：verify 只在 script[3]）
game_js = data + engine + main
assert 'runVerify' not in game_js, 'script[2] 禁含 runVerify'

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

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

# 硬性检查 4：四 script 块布局（verify ⑫ 的 script[2] 断言依赖块序）
assert html.count('<script>') == 4, '应恰 4 个 script 块（core/clips/game/verify）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
