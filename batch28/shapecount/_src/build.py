# -*- coding: utf-8 -*-
"""shapecount 图形计数 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r3 难度改造版（2026-09-13）：数量域 1-20 / 阵列计数 / 缺格减法 / 双维过滤 / ch4 漂移。
用法: python batch28/shapecount/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch28/shapecount/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（shc_ 8 条[r3 +hint_grid/hint_dual] + core_* 3 条，manifest 对账——家族标准通道）
# 前缀 shc_（2026-09-10 中央改名：sha_ 与 batch11/shadow、batch23/share 撞车）。
# r3 新增（2026-09-13）：shc_hint_grid/shc_hint_dual（hint 按题型选播）。
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('shapecount')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：T46 阶段2 后 shc_ 47 条（8 固定+39 段键）+ core 3 条 = 50（SPEC-BATCH28 §2/§4 r3 版本块）
SHC_KEYS = ['shc_tut_watch', 'shc_tut_turn', 'shc_hint', 'shc_right', 'shc_wrong', 'shc_q',
            'shc_hint_grid', 'shc_hint_dual']
SHC_T46 = (['shc_c_red', 'shc_c_blue', 'shc_c_yellow', 'shc_c_green'] +
           ['shc_s_circle', 'shc_s_square', 'shc_s_triangle', 'shc_s_star', 'shc_s_heart', 'shc_s_diamond',
            'shc_s_yj', 'shc_s_yg', 'shc_s_gyg'] +
           ['shc_n_%d' % n for n in range(1, 21)] +
           ['shc_q_grid', 'shc_q_gridmiss'] +
           ['shc_g_over', 'shc_g_under', 'shc_g_gridmiss', 'shc_g_dual'])
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SHC_KEYS + SHC_T46 + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 50, 'clips 条数 %d != 50（shc 47 + core 3）' % n_clips
for k in ['sha_tut_watch', 'sha_tut_turn', 'sha_hint', 'sha_right', 'sha_wrong', 'sha_q']:
    assert '"%s"' % k not in clips, 'clips 含已废 sha_ 旧键 %s（撞车前缀，禁注入）' % k

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'shapecount'" in main, 'main 缺 KIDS.init shapecount（存档键 kidsgame_shapecount）'
assert 'window.SC =' in main, 'main 缺 SC 钩子'
assert '__scDemoR' in main, 'main 缺教学演示实证 __scDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 顶部面板守卫选择器串（b27 新立）
assert main.count("document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')") >= 1, \
    'main rescueTick 缺面板在场守卫（家族 K）'

# ===== r3 机制静态断言：漂移渲染（drift-x）+ 阵列几何双模式 =====
assert 'drift-x' in head and '@keyframes drift-x' in head, 'head 缺漂移动画 drift-x keyframes（r3 ④）'
assert 'animation:drift-x ' in main, 'main 缺漂移动画内联声明（r3 ④ 渲染层）'
assert 'dataset.mode' in main and "'grid'" in main, 'main 缺阵列双模式 dataset.mode（r3 ②）'
assert 'data-fill' in main, 'main 缺双维颜色 data-fill 渲染（r3 ③）'
assert "GRID_TOP[q.rows] + p.row * GRID_DY[q.rows]).toFixed(3) + '% + 22px)'" in main, 'main 阵列行定位缺 GRID 几何常量换算（含 +22px 顶带）'
# 阵列几何常量四处同步（data 定义 ↔ verify 独立表）：逐字面比对
for lit in ['2: 33, 3: 25.5, 4: 19.5', '2: 33, 3: 24.5, 4: 21.5']:
    assert lit in data, 'game-data 缺 GRID 几何常量 %s（r3 ②）' % lit
    assert lit in verif, 'verify 缺 GRID 几何独立表 %s（四处同步——r3 ②）' % lit
assert 'height:364px' in head.replace(' ', ''), 'head 缺 grid 模式 364px 高（几何契约——m3 顶带让位）'

# ===== 语音窗静态断言（T46 阶段2 后以 clip 链实长为主口径：窗 ≥ Σ段+150×(n-1)+300）=====
# estMs 口径（b25 定版，全字符）：SAPI ~345ms/字符 + 600 落定余量（保留旁证）
est_ms = lambda n: n * 345 + 600
# T46 段键 mp3 实测表（判对窗动态补足依据；与 verify SPEC_DUR 同源）
CLIP_MS = {'c_red': 1416, 'c_blue': 1416, 'c_yellow': 1416, 'c_green': 1392,
           's_circle': 1416, 's_square': 1440, 's_triangle': 1656, 's_star': 1392,
           's_heart': 1464, 's_diamond': 1416, 's_yj': 1584, 's_yg': 1128, 's_gyg': 1920}
CLIP_MS.update({'n_%d' % n: v for n, v in zip(range(1, 21),
    [1344, 1368, 1392, 1416, 1320, 1368, 1368, 1320, 1344, 1464, 1560, 1536, 1632, 1632,
     1584, 1632, 1632, 1584, 1584, 1536])})
CLIP_MS.update({'g_over': 2736, 'g_under': 2664, 'g_gridmiss': 3168, 'g_dual': 2976})
chain_ms = lambda ks: sum(CLIP_MS[k] for k in ks) + 150 * (len(ks) - 1)
# ① 确认句 clip 链（判对 queue 段链）：最长 dual [色,形,，有,数词]
CONF_DUAL = chain_ms(['c_red', 's_triangle', 's_yg', 'n_20'])      # 6186
CONF_COUNT = chain_ms(['s_triangle', 's_yg', 'n_20'])              # 4620
CONF_GRID = chain_ms(['s_gyg', 'n_20'])                            # 3606
assert '1800 * SPEED' in main, 'main 判对演出窗首段 1800 缺失'
# T46 动态窗：1800 + max(3600, 链+PAD-1800) ≥ 链+300（dual 6186 超 estMs 窗 5400——calendar 先例）
assert "await wait(Math.max(3600, chainMs(cKeys) + CONFIRM_PAD - 1800) * SPEED)" in main, \
    'main 缺 T46 确认链动态收尾窗（Math.max(estMs 窗, 链实长+PAD)）'
assert 1800 + max(3600, CONF_DUAL + 300 - 1800) >= CONF_DUAL + 300, 'dual 确认链 6186+300 未被动态窗罩住'
assert 'KIDS.voice.queue(cKeys)' in main, 'main 缺确认句段链 queue（T46 阶段2）'
assert 'KIDS.voice.queue([VOICE.q].concat(quizKeys(q)))' in main, 'main 缺题面段链 queue（T46 阶段2）'
assert "KIDS.voice.play('shc_n_' + 2 * (g + 1)" in main, 'main 缺分组计数 clip 键化（T46 阶段2）'
assert 'quizKeys' in data and 'confirmKeys' in data and 'guideKeyOf' in data, \
    'game-data 缺 T46 阶段2 键构造 quizKeys/confirmKeys/guideKeyOf'
assert 'SHC_CLIP_MS' in data and 'CONFIRM_PAD = 300' in data, 'game-data 缺 SHC_CLIP_MS 实长表/CONFIRM_PAD'
# ② 引导句（错反馈链第二段 TTS）：r3 GUIDE 4 族各 1 句；链豁免窗（家族 I）≥ 链总实长+300
gblock = re.search(r'const GUIDE = \{([^}]+)\};', data)
assert gblock, 'game-data 缺 GUIDE 引导句表'
gtexts = re.findall(r"'([^']+)'", gblock.group(1))
assert len(gtexts) == 4, 'GUIDE 应 4 族各 1 句（over/under/gridmiss/dual——r3），实得 %d' % len(gtexts)
max_g = max(len(t) for t in gtexts)                 # 全字符口径（m1）
assert max_g == 10, 'GUIDE 最长句应为 10 全字符（先数满的行，再数空格——r3），实得 %d' % max_g
assert "wrongChainUntil = Date.now() + 7900" in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7900'
# 链 = shc_wrong 1968 + 150 间隔 + 引导 clip 最长 3168（gridmiss，实测）+ 300 = 5586 ≤ 7900（clip 口径）
assert 7900 >= 1968 + 150 + 3168 + 300, '链豁免窗 7900 < shc_wrong+150+shc_g_gridmiss 3168+300（clip 口径）'
assert "if (Date.now() < wrongChainUntil) return;" in main, '救援 interval 缺链豁免守卫（家族 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
assert "sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideText(q, i) }])" in main, \
    'main 错反馈拼播链（shc_wrong+引导句键化，T46 阶段2）缺失'
# ③ clip 实长窗（shc_ 浏览器实测：watch 3096/turn 1896/hint 2184/right 2304/wrong 1968/q 2136/
#    r3 新增 hint_grid 3168/hint_dual 2976——hint 系 fire-and-forget 无后续窗依赖）：
#    教学链分账（watch 段 ≤16s，r3 分组数）：900（亮相）+3100（手指就位等 watch 播完）+
#    3×1400（每组 250+250+900：两小步移动按停+组末计数 TTS）+5400（演示演出窗）+500（收尾）
#    =14100 ≤16000；t=4000 ≥ watch 3096+300
assert all(t in main for t in ['900 * SPEED', '3100 * SPEED', '250 * SPEED', '900 * SPEED']), \
    'main 缺教学演示窗（900+3100+3×(250+250+900) 分账——r3 分组数）'
assert 900 + 3100 >= 3096 + 300, '教学演示窗 4000 < shc_tut_watch 3096+300=3396'
assert 900 + 3100 + 3 * 1400 + 5400 + 500 <= 16000, '教学 watch 段分账 >16s 预算'
assert '}, 2400);' in main, 'main 教学 turn 后读题延 2400 缺失（shc_tut_turn 1896+300 防尾截）'
assert 2400 >= 1896 + 300, 'turn 后读题延 2400 < shc_tut_turn 1896+300=2196'
assert 'await wait(600)' in main, 'main winFlow celebrate 后补窗 600 缺失（shc_right ≥2304）'
assert 2620 + 600 >= 2304 + 300, 'celebrate 2620+600=3220 < shc_right 2304+300=2604'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ④ verify 页 T46 clip 链动态断言在场（运行时对账，build 只验结构存在）
assert 'maxConfChain' in verif and 'chainSpec' in verif, 'verify 缺 T46 clip 链动态断言'
assert '1800 + 3600' in verif, 'verify 缺判对窗基段'

# ===== SPEC 封闭表 build 侧保险（verify ② 的静态前置——b26 M1：禁实现函数复算期望） =====
mshapes = re.search(r'const SPEC_SHAPES = \{([^}]+)\};', verif)
assert mshapes, 'verify 缺 SPEC_SHAPES 独立硬编码表（图形封闭 6 名）'
n_shapes = len(re.findall(r"[a-z]+: '[^']+'", mshapes.group(1)))
assert n_shapes == 6, 'SPEC_SHAPES 应 6 名，实得 %d' % n_shapes
mnear = re.search(r'const SPEC_NEAR = \{([^}]+)\};', verif)
assert mnear, 'verify 缺 SPEC_NEAR 独立硬编码表（近形对封闭 2 对）'
assert len(re.findall(r"[a-z]+: '[a-z]+'", mnear.group(1))) == 4, 'SPEC_NEAR 应 4 键（2 对双向），实得 %d' \
    % len(re.findall(r"[a-z]+: '[a-z]+'", mnear.group(1)))
mnumset = re.search(r'const SPEC_NUMSET = \{([^}]+)\};', verif, re.S)
assert mnumset, 'verify 缺 SPEC_NUMSET 独立硬编码表（候选数字分布规则）'
n_sets = len(re.findall(r'\d+: \[', mnumset.group(1)))
assert n_sets == 20, 'SPEC_NUMSET 应 20 真值分支（t=1-20——r3 域升档），实得 %d' % n_sets
mcolors = re.search(r'const SPEC_COLORS = \{([^}]+)\};', verif)
assert mcolors, 'verify 缺 SPEC_COLORS 独立硬编码表（颜色封闭 4——r3 ③）'
n_colors = len(re.findall(r"[a-z]+: '[^']+'", mcolors.group(1)))
assert n_colors == 4, 'SPEC_COLORS 应 4 色名，实得 %d' % n_colors
# r3 双维干扰句源（verify ② d1Missing/d2Missing 独立判在场——防抄实现丢断言）
assert "d1Missing" in verif and "d2Missing" in verif, 'verify 缺 dual 双干扰在场独立断言（r3 ③）'
# r3 漂移断言在场（verify ⑲：animationName 声明级）
assert "'drift-x'" in verif, 'verify 缺漂移机制 animationName 断言（r3 ④）'

# ===== 家族契约 L：NUMCN 映射表 2='两'（量词口径）+ r3 域 1-20 全量 =====
mnumcn = re.search(r'const NUMCN = \{([^}]+)\};', data)
assert mnumcn, 'game-data 缺 NUMCN 数字汉字表（家族 L）'
assert "2: '两'" in mnumcn.group(1), "NUMCN 2 应为 '两'（量词前 2 用两——家族 L/b27 coin 教训）"
assert len(re.findall(r"\d+: '[^']+'", mnumcn.group(1))) == 20, 'NUMCN 应覆盖封闭集全量值 1-20（r3），实得 %d' \
    % len(re.findall(r"\d+: '[^']+'", mnumcn.group(1)))
assert "10: '十'" in mnumcn.group(1) and "12: '十二'" in mnumcn.group(1) and "20: '二十'" in mnumcn.group(1), \
    'NUMCN 大数汉字缺（10/12/20——r3 域升档）'

# r3 numSet 域规则静态断言（分段口径与 SPEC 一致：t≤2 正侧/3-6 中心/t≥7 下邻域）
mns = re.search(r'const numSet = t =>[^\n]*\n[^\n]*\n[^\n]*;', data)
assert mns, 'game-data 缺 numSet 三段规则'
assert 't <= 2' in mns.group(0) and 't <= 6' in mns.group(0) and '[t - 3, t - 2, t - 1, t]' in mns.group(0), \
    'numSet 分段规则与 SPEC 不一致（r3 域 1-20）'

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
print('T46 clip-chain check: dual-confirm %d+300 (dynamic win %d); count %d; grid %d; '
      'wrong-chain 1968+150+3168+300 <= 7900; tut budget %dms <= 16000'
      % (CONF_DUAL, 1800 + max(3600, CONF_DUAL + 300 - 1800), CONF_COUNT, CONF_GRID,
         900 + 3100 + 3 * 1400 + 5400 + 500))
