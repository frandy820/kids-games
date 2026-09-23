# -*- coding: utf-8 -*-
"""chartread 图表小读者（r17 难度改造版）单文件拼接：
_src/head.html + core.js(全文原样) + clips + 游戏 JS(data+engine+main) + verify（独立第 4 块）
用法: python batch31/chartread/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch31/chartread/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')
# 语音 clips 注入（chr_ 55 条 = r17 17 + T46 again 8 + 预置 30 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('chartread')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：chr_ 109 条 = r17 原生 25（17+q_second/q_total+名音 6）
# + T46 阶段2 语义句 8 + 数字键 chr_n_1..74（阶段3 判对数字段引用 21..74 本波新补）
# + 碎片/标签 s_* 8（含暂未引用的 dduo）+ lab_* 2 + core 3 条 = 112 条
# 前缀=chr_ 已核 manifest 无占用（b28 立规先查；r17 新键 q_second/q_total 实查无撞）
# 前缀=chr_ 已核 manifest 无占用（b28 立规先查；r17 新键 q_second/q_total 实查无撞）
CHR_IDS = ['rabbit', 'cat', 'dog', 'bird', 'fish', 'chick']   # 类目封闭 6
CHR_KEYS = ['chr_tut_watch', 'chr_tut_turn', 'chr_hint', 'chr_right', 'chr_wrong',
            'chr_q_most', 'chr_q_least', 'chr_q_second', 'chr_q_total',
            'chr_q_howmany', 'chr_q_compare',
            'chr_again_most', 'chr_again_second', 'chr_again_howmany', 'chr_again_total',
            'chr_again_compare', 'chr_again_unit2', 'chr_again_constraint',
            'chr_again_twocompare'] + \
           ['chr_n_' + w for w in CHR_IDS] + \
           ['chr_n_' + str(n) for n in range(1, 75)] + \
           ['chr_s_bi', 'chr_s_dyou', 'chr_s_shd', 'chr_s_de', 'chr_s_duo',
            'chr_s_yg', 'chr_s_do', 'chr_s_dduo', 'chr_lab_pm', 'chr_lab_am']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CHR_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 112, 'clips 条数 %d != 112（chr 109=25+8+74数字+碎片标签+core 3）' % n_clips
# 注入键前缀对账：只允许 chr_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('chr_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 chr_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('chr_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'chartread'" in main, 'main 缺 KIDS.init chartread（存档键 kidsgame_chartread）'
assert 'window.CH =' in main, 'main 缺 CH 钩子'
assert '__chDemoR' in main, 'main 缺教学演示实证 __chDemoR'
# ===== r17 键基定版（CH_LEN 5→8 / STATIC 32 / 迁移 IIFE）=====
assert "const CH_LEN = 8" in data, 'game-data 缺 CH_LEN=8（r17 定版）'
assert "const STATIC_LEVELS = 32" in data, 'game-data 缺 STATIC_LEVELS=32'
assert 'const CH_LVS' in main, 'main 缺 CH_LVS（level.pass/dots 全章关号）'
# 存档迁移 IIFE（矛盾态一次性重置 + 脏键守卫仅格式/关号域、章号上界放开）
assert "localStorage.getItem('kidsgame_chartread')" in main, 'main 缺存档迁移 IIFE 读档'
assert "lv[(c - 1) + '-5']" in main, 'main 缺旧键基矛盾态检测（5 基残留章界）'
assert "+m[2] > 7" in main, 'main 缺脏键守卫关号域（新键基 0-7；禁旧 0-4 硬界误清生成关档）'
# 家族契约 A（r17 升级双 lim-1 形态）：winFlow dayEnd 与启动 dayEnd 两处实算 +
# 日末停留 Math.max(0, lim-1)；旧 null 实参与 0 基回跳字面一律禁再现（含注释）
assert main.count('nextHint(lim - 1)') == 2, 'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（r17 双 lim-1 定版；注释亦禁该字面）'
assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim - 1)'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.chartread.tutSeen）
assert 'sv.chartread && sv.chartread.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（T46 动态 clip 实长口径）+ 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + (AGAIN_DUR[ak] + 300)' in main, 'main 缺错反馈链动态豁免窗（契约 I，T46 实长口径）'
assert 'function againKeyOf(q)' in main, 'main 缺 againKeyOf 键分派（T46 阶段2，与 againOf 同判据）'
assert "const AGAIN_KEYS = {" in data, 'game-data 缺 AGAIN_KEYS 键分派表（T46 阶段2）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat>=3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== estMs 四方字面一致（data 文档 / main+verify 定义 / build+selftest lambda）=====
est_ms = lambda n: n * 345 + 600
assert 'estMs=len*345+600' in data, 'game-data 缺 estMs 口径文档（四方一致）'
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
assert 'n * 345 + 600' in verif, 'verify 缺 estMs 定义（四方一致）'
assert 'n * 345 + 600' in selftest, '_selftest 缺 estMs 定义（四方一致）'
# 错反馈语义句逐字钉死（契约 I 下界依据；长度=estMs 入参）
AGAIN_PINS = [('再看看哪一行最长', 8), ('先找最多的，再找第二多', 11), ('再数一数这一行', 7),
              ('把每一行都数一数再加起来', 12), ('一行一行数一数再比一比', 11),
              ('一格代表两只，数数格子', 11), ('两个条件都要比一比哦', 10), ('两张图都看一看再比一比', 11)]
for frag, n in AGAIN_PINS:
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（数字词只在判对确认数字尾段，走 NUMCN 表）'
# T46 阶段2（2026-09-19）：错链豁免窗下界从 estMs 字数口径改按 clip 实长（AGAIN_DUR）推导
# （ffprobe=SPEC_DUR 口径，禁从实现归纳——estMs 下界断言随错链 clip 化退役）
assert 'const AGAIN_DUR = {' in data, 'game-data 缺 AGAIN_DUR 实长表（T46 豁免窗依据）'
AGAIN_DUR_PY = dict(re.findall(r"(chr_again_\w+):\s*(\d+)", data))
assert AGAIN_DUR_PY == {'chr_again_most': '2688', 'chr_again_second': '3264', 'chr_again_howmany': '2184',
                        'chr_again_total': '3120', 'chr_again_compare': '3216', 'chr_again_unit2': '3384',
                        'chr_again_constraint': '2640', 'chr_again_twocompare': '3168'}, \
    'AGAIN_DUR 与 T46 实长表不符：%s' % AGAIN_DUR_PY
assert max(int(v) for v in AGAIN_DUR_PY.values()) + 300 == 3684, \
    '错链豁免窗最长下界应为 3684（chr_again_unit2 3384+300，T46 实长口径）'
# verify 八键段断言素材在场（错链键化后 ④-⑩ 单元逐键断言）
for _k46 in ('chr_again_most', 'chr_again_second', 'chr_again_howmany', 'chr_again_total',
             'chr_again_compare', 'chr_again_unit2', 'chr_again_constraint', 'chr_again_twocompare'):
    assert "'%s'" % _k46 in verif, 'verify 缺语义句键段断言 %s（T46 阶段2）' % _k46
# T46 阶段3 题面/判对碎片键钉死（keyless 清零；文本与 manifest 逐字一致）
T46_SEGS = [("chr_q_howmany", "有几只呀"), ("chr_s_bi", "比"), ("chr_s_dyou", "多又比"),
            ("chr_s_shd", "少的是谁呀？"), ("chr_s_de", "的"), ("chr_s_duo", "多几只呀"),
            ("chr_s_yg", "一共"), ("chr_s_do", "多"), ("chr_lab_pm", "下午"), ("chr_lab_am", "上午")]
for _k, _t in T46_SEGS:
    assert ("key: '" + _k + "'") in data and ("text: '" + _t + "'") in data, 'game-data VOICE 缺碎片键/文本 %s=%s' % (_k, _t)
# keyless 清零断言（阶段3 终态：main/verify 均无 keyless 段）
assert not re.search(r'[{] key: null', main), 'main 仍含 keyless 段（T46 阶段3 应清零）'
assert not re.search(r'[{] key: null', verif), 'verify 仍含 keyless 段（T46 阶段3 应清零）'
CHR_RIGHT, MAX_NAME = 2448, 1440     # SPEC §4：chr_right / 名音 max（chr_n_bird/chick 1440）
S_YG, S_DO = 1320, 1104              # T46 阶段3 碎片实长（chr_s_yg 一共 / chr_s_do 多）
NUM_MAX_10_20, NUM_MAX_33_74, NUM_MAX_1_10 = 1680, 1848, 1464   # chr_n 域 max（ffprobe 实测）
# ① 确认链（类目族拼名音 max 1440；数值族全 clip：howmany=right+150+chr_n_值（域 10-20）
#    / total=right+150+s_yg+150+chr_n_和（域 33-74）/ compare·twocompare=right+150+s_do+150+chr_n_差（域 1-10））
#    → 演出窗 1600+4700=6300 >= max(4338, 4578, 6216, 5616)——阶段3 数字段 clip 化后 4100→4700
assert '1600 * SPEED' in main and '4700 * SPEED' in main, 'main 缺判对演出窗 1600+4700（家族 G/H·阶段3 上调）'
assert 1600 + 4700 >= CHR_RIGHT + 150 + MAX_NAME + 300, \
    '判对演出窗 6300 < 类目族确认链 %d+150+%d+300' % (CHR_RIGHT, MAX_NAME)
assert 1600 + 4700 >= CHR_RIGHT + 150 + NUM_MAX_10_20 + 300, \
    '判对演出窗 6300 < howmany 确认链 %d+150+%d+300' % (CHR_RIGHT, NUM_MAX_10_20)
assert 1600 + 4700 >= CHR_RIGHT + 150 + S_YG + 150 + NUM_MAX_33_74 + 300, \
    '判对演出窗 6300 < total 确认链 %d+150+%d+150+%d+300' % (CHR_RIGHT, S_YG, NUM_MAX_33_74)
assert 1600 + 4700 >= CHR_RIGHT + 150 + S_DO + 150 + NUM_MAX_1_10 + 300, \
    '判对演出窗 6300 < compare 确认链 %d+150+%d+150+%d+300' % (CHR_RIGHT, S_DO, NUM_MAX_1_10)
assert CHR_RIGHT + 150 + S_YG + 150 + NUM_MAX_33_74 + 300 == 6216, 'total 确认链最长应 6216（窗 6300 依据）'
# ② 错反馈链豁免窗（契约 I，T46 动态实长口径）：语义句 clip 单段链 AGAIN_DUR[键]+300；最长 unit2 3384+300=3684
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ clip 实长窗（SPEC §4 r17 增补段）：窗值 >= clip 实测 + 300 余量
assert '3300 * SPEED' in main, 'main 缺教学 watch 演示延窗 t=3300（chr_tut_watch 2976+300）'
assert 3300 >= 2976 + 300, '教学 watch 演示延 3300 < chr_tut_watch 2976+300=3276'
assert '2200 * SPEED' in main, 'main 缺教学题面句窗 2200（chr_q_most 1824+300=2124）'
assert 2200 >= 1824 + 300, '教学题面句窗 2200 < chr_q_most 1824+300=2124'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（chr_tut_turn 1872+300 防尾截）'
assert 2200 >= 1872 + 300, 'turn 后读题延 2200 < chr_tut_turn 1872+300=2172'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（chr_right >=2748）'
assert 2620 + 400 >= CHR_RIGHT + 300, 'celebrate 2620+400=3020 < chr_right 2448+300=2748'

# ===== 教学链 watch 预算分账（<=16000，名义值累加）=====
TUT_SUM = 3300 + 2200 + 900 + 320 + 1600 + 4700 + 300   # 阶段3 判对窗 4100→4700（=13320）
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3300 * SPEED', '2200 * SPEED', '900 * SPEED', '320 * SPEED', '1600 * SPEED',
            '4700 * SPEED', '300 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# ===== 契约 L：数字 TTS 映射表封闭全量（1-74；独立位 2=两；复合位 22=二十二）=====
assert "const NUMCN = { 1: '一', 2: '两'" in data, 'game-data 缺 NUMCN 封闭表起始（契约 L）'
assert "74: '七十四' }" in data, 'game-data 缺 NUMCN 封闭表收口 74（契约 L）'
assert "22: '二十二'" in data, 'game-data NUMCN 复合位缺二口径（22=二十二）'
assert 'NUMCN' in main, 'main 缺 NUMCN 引用（阶段3 数字段改 chr_n_ 数字 clip 后仅注释口径引用）'  # T46 阶段3：判对数字尾段 clip 化（chr_n_1..74 与 NUMCN 同口径），NUMCN[ 直接引用退役
assert 'NUMCN' in verif, 'verify 缺契约 L 专项断言'

# ===== r17 modeled 难度地板双钉（verify+selftest 同一精确数字，禁约数——防回漂）=====
assert 'MODELED_MIN = 99854' in verif, 'verify 缺 MODELED_MIN=99854 精确钉（T46 阶段3 listen 全 clip 口径重钉，四章最低=flat7 ch1）'
assert '99854' in selftest, '_selftest 缺 MODELED_MIN=99854 精确钉（与 verify 双钉）'
assert 'const DECIDE_MS = {' in data and 'const CONV_MS = 4000' in data and 'const TAP_MS = 1200' in data, \
    'game-data 缺 DECIDE_MS/CONV_MS/TAP_MS 模型常量（SPEC §4 r17）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.cat', 'dataset.num', 'g[data-cat]', 'q-text', 'axis-tag', 'sub-chart'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-cat="' in main, 'main 图表渲染缺 data-cat 锚（契约 M 渲染对账依据）'
assert 'data-v="' in main, 'main 图表渲染缺 data-v 锚（契约 M）'
assert 'dataset.anim' in main or 'data-anim="' in main, 'main 图卡渲染缺 data-anim 锚（契约 M）'

# ===== 竖屏双通道（@media 与 body.port 逐行等值两段同步——build 逐行全等断言）=====
_m = re.search(r'@media \(orientation:portrait\)\{\n(.*?)\n\}', head, re.S)
_p = re.search(r'/\*PORT-CLS\*/\n(.*?)\n/\*PORT-CLS-END\*/', head, re.S)
assert _m and _p, 'head 缺竖屏双通道两段（@media + body.port）'
media_rules = re.findall(r'([^{}\s][^{}]*)\{([^{}]*)\}', _m.group(1))
port_rules = re.findall(r'(body\.port [^{}]*)\{([^{}]*)\}', _p.group(1))
assert len(media_rules) == len(port_rules) and len(media_rules) >= 17, \
    '竖屏双通道规则数不一致：@media %d vs body.port %d（应 >=17 条）' % (len(media_rules), len(port_rules))
for (ms, md), (ps, pd) in zip(media_rules, port_rules):
    ps_norm = ps.strip()
    while ps_norm.startswith('body.port '):
        ps_norm = ps_norm[len('body.port '):]
    ps_norm = ps_norm.replace('body.port ', '')
    assert ps_norm.strip() == ms.strip() and pd == md, \
        '竖屏双通道规则不等值：@media %s{%s} vs %s{%s}' % (ms, md, ps, pd)
assert 'applyPort' in main, 'main 缺竖屏双通道 JS（body.port 类通道 applyPort）'

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>图表小读者</title>' in head, 'head 缺标题 图表小读者'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（禁并入 game 块自匹配）
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8', newline='\n')
print('OK written:', OUT, len(html), 'chars')
print('T46-3 confirm chain max(cat %d+150+%d=4338, howmany 4578, total 6216, compare 5616)'
      ' <= 6300 right-win; wrong-chain(T46 clip) max chr_again_unit2+300=%d; tut-budget %dms <= 16000' %
      (CHR_RIGHT, MAX_NAME, 3384 + 300, TUT_SUM))
