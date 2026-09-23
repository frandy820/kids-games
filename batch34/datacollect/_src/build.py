# -*- coding: utf-8 -*-
"""datacollect 数据收集员 r14 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch34/datacollect/_src/build.py
r14 难度改造（2026-09-15，AUDIT-78 红款行）：4 script 块（verify 独立第 4 块——r13 定版）。"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch34/datacollect/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
CLIPS_DIR = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（dc_ 20 条（既有 13+r14 新 7）+ core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('datacollect')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'

# b33 坑③：core_* 注入必须幂等跳过——主线 manifest 已含本款 core_*（games 含 datacollect），
# 手工再注入=双注入。仅当 manifest 缺该键时才从 clips/ 目录补注（防主线 manifest 变更断链）。
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CORE_KEYS:
    if '"%s"' % k in clips:
        continue                                        # 幂等跳过（正常路径：manifest 已含）
    b = base64.b64encode((CLIPS_DIR / (k + '.mp3')).read_bytes()).decode('ascii')
    i = clips.rindex('};/*CLIPS-END*/')
    clips = clips[:i] + (',' if clips[i - 1] != '{' else '') + '%s:"data:audio/mpeg;base64,%s"' % (json.dumps(k), b) + clips[i:]
    print('core manual-inject:', k)

# clips 注入断言：dc_ 20 条（通用 6+题面 6（q_count/q_most 保底+q_sum/q_diff/change_up/dn/
# total_up/dn=7——q_most 随 most 下线保留不删）+scale 1+名音×6）+ core 3 条 = 23 条
# 前缀=dc_ 已核 manifest 无占用（b28 立规先查，2026-09-11/09-15 两轮实查）
DC_IDS = ['rabbit', 'bird', 'cat', 'chick', 'sheep', 'duck']   # 类目封闭 6
DC_KEYS = ['dc_tut_watch', 'dc_tut_turn', 'dc_hint', 'dc_right', 'dc_wrong',
           'dc_q_count', 'dc_q_most',                      # q_most 随 most 下线保留（grid r13 gri_hint 同例）
           'dc_q_sum', 'dc_q_diff',                        # r14 新 7 键
           'dc_q_change_up', 'dc_q_change_dn',
           'dc_q_total_up', 'dc_q_total_dn', 'dc_scale'] + ['dc_n_' + w for w in DC_IDS] + \
          ['dc_n_%d' % n for n in range(2, 61, 2)] + \
          ['dc_s_yg', 'dc_s_xc', 'dc_s_duo', 'dc_s_shao']  # T46 化：数词偶 2-60×30+骨架×4
for k in DC_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 57, 'clips 条数 %d != 57（dc 54 + core 3）' % n_clips
# 注入键前缀对账：只允许 dc_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('dc_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 dc_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('dc_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'datacollect'" in main, 'main 缺 KIDS.init datacollect（存档键 kidsgame_datacollect）'
assert 'window.DC =' in main, 'main 缺 DC 钩子'
assert '__dcDemoR' in main, 'main 缺教学演示实证 __dcDemoR'
assert '__dcDing' in main, 'main 缺点亮计数音取音口 __dcDing（stub 发声 vlog）'
assert 'DC.quiz.step' not in main, 'step 语义注释走钩子文档（b33 坑①已写入头注）'
assert 'tapCard' in main and 'dcStartNumeric' in main, 'main 缺 r14 数值卡钩子 tapCard/dcStartNumeric'
assert 'estMs = s =>' not in main, 'main 禁重复定义 estMs（r14 单源=game-data.js）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(chartEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.datacollect.tutSeen）
assert 'sv.datacollect && sv.datacollect.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main and '(ci+1)%4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3；r14 审查 m-5 补无空格变体）'
# 家族契约 I：错链豁免窗（静态 4146=SPEC §4 算式）+ 救援 interval 守卫 + startLevel 重置 + 错点/错卡吞 guard
assert 'wrongChainUntil = Date.now() + 4146' in main, 'main 缺错链豁免窗静态 4146（契约 I）'
assert 4146 >= 1800 + 150 + 1896 + 300, '错链豁免窗 4146 < SPEC §4 下界 4146'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'Date.now() < wrongChainUntil && exceed' in main, 'main 缺超点吞 guard（契约 I 补）'
assert 'Date.now() < wrongChainUntil && i !== q.answerIdx' in main, 'main 缺错卡吞 guard（契约 I 补·r14）'
# 家族契约 J：错反馈 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）——T46 化零 keyless 政策：
# 确认尾段=dc_n_<N> 数词+dc_s_* 骨架 clip 拼播（原 keyless TTS 尾退役），出现 keyless 即 fail
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 出现 keyless 段（T46 化零 keyless 政策）' % _src_name
assert '.concat(numSegs(q))' in main, 'main 确认尾段缺 numSegs 拼播（T46 化）'
assert 'const numClip = n =>' in data, 'game-data 缺数词键工厂 numClip（T46 化）'

# ===== r14 时长模型静态断言（SPEC-BATCH34 §3-r14；estMs 四方字面同步）=====
est_ms = lambda n: n * 345 + 600
# estMs 家族定版四处字面同步：①data 定义 ②data 注释 ③verify estN ④build 本处（b25 立规）
assert 'const estMs = s => s.length * 345 + 600;' in data, 'game-data 缺 estMs 定版定义（四方同步①）'
assert 's.length * 345 + 600' in data, 'game-data 缺 estMs 口径注释（四方同步②）'
assert 'estN = n => n * 345 + 600' in verif, 'verify 缺 estN 独立副本（四方同步③）'
assert est_ms(2) == 1290 and est_ms(9) == 3705, 'build estMs 口径（四方同步④）'
# DECIDE_MS 七-八岁决策窗定版字面（r14 门禁）
assert 'count: 4000, sum: 16000, diff: 14000, mostdiff: 15000,' in data, 'game-data 缺 DECIDE_MS 定版（r14）'
assert 'change: 13000, totalchange: 17000' in data, 'game-data DECIDE_MS 缺 change/totalchange（r14）'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'game-data 缺 LEVEL_MIN_MS 40000（r14 门禁）'
assert 'const CARD_ADV_MS = 880;' in data, 'game-data 缺 CARD_ADV_MS 880（wordprob r13 范式）'
# quizDurMs SPEC 化简口径字面锚（首步 ADV+其余 (n-1) 步+SETTLE——verify ⑬ 独立副本复算对账）
assert 'Math.max(stepVoiceMs(q, 0), DECIDE_MS.count) + TAP_ADV_MS +' in data, 'quizDurMs 缺化简口径首步项'
assert '(countSteps(q) - 1) * (Math.max(STAGE_MS, DECIDE_MS.count) + TAP_ADV_MS) + SETTLE_MS' in data, \
    'quizDurMs 缺化简口径其余步项'
# 确认链窗动态化（1600+tail；tail=max(4200, chain-1600)）字面锚
assert 'await wait(1600 * SPEED);' in main and 'confirmTailMs(q) * SPEED' in main, \
    'main 判对演出窗缺动态化 1600+confirmTailMs（家族 G/H r14）'
assert main.count('confirmTailMs(q) * SPEED') == 2, 'main 动态尾窗应恰 2 处（settle+tapCard），实得 %d' % \
    main.count('confirmTailMs(q) * SPEED')
assert 'const confirmTailMs = q => Math.max(4200, confirmChainMs(q) - CONFIRM_BASE);' in data, \
    'game-data 缺 confirmTailMs 动态尾窗定义（承 v1 形态 4200 下限）'
# verify ⑬ 最低值精确防回漂锚（MIN_EXACT>0——占位 0 必 FAIL，build 先拦）
m_ex = re.search(r'const MIN_EXACT = (\d+);', verif)
assert m_ex and int(m_ex.group(1)) > 0, 'verify MIN_EXACT 未回填实测值（0=占位必 FAIL，禁交付）'
# 40 关 modeled 全 ≥ LEVEL_MIN_MS 素材（verify ⑬ 独立副本逐关对账）
assert 'MIN_LEVEL_MS = 40000' in verif and 'quizDurInd' in verif, 'verify 缺时长模型独立副本素材（⑬）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH34 §4+r14 实长表）=====
DC_RIGHT, DC_QCOUNT, MAX_NAME = 2448, 1752, 1440     # SPEC §4：dc_right / dc_q_count / 名音 max（bird/chick）
DC_WRONG, DC_HINT = 1800, 1896
# ① 确认链动态窗恒 ≥ 链实长（数学恒等：1600+max(4200,chain-1600) ≥ chain）；T46 化最坏链
#    =change 4 段 clip：2448+150+1440+150+dc_s_shao 1344+150+dc_n max 1848+300=7830 ——verify ⑩ 复算
DC_S_SHAO, DC_NUM_MAX = 1344, 1848          # T46 尾段实长（voice/clips Audio 实测 09-19）
assert DC_RIGHT + 150 + MAX_NAME + 150 + DC_S_SHAO + 150 + DC_NUM_MAX + 300 == 7830, \
    'change 确认链最坏值应为 7830（T46 clip 口径）'
# ② 错链豁免窗（契约 I 静态）：wrong 1800+150+hint 1896+300=4146（main 字面已断言）
assert DC_WRONG + 150 + DC_HINT + 300 == 4146, 'SPEC §4 错链算式应为 4146'
# ③ count 题面链=名音 max 1440+150+q_count 1752=3342——读题异步不占 UI 窗；教学期题面
#    覆盖窗 800+1800+900+200=3700 ≥ 3342+300（教学 watch 分账内断言）
assert 800 + 1800 + 900 + 200 >= MAX_NAME + 150 + DC_QCOUNT + 300, \
    '教学题面覆盖窗 3700 < count 题面链 %d+150+%d+300=3642' % (MAX_NAME, DC_QCOUNT)
# ④ clip 实长窗（SPEC §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3600 * SPEED' in main, 'main 缺教学 watch 演示延窗 t=3600（dc_tut_watch 3264+300）'
assert 3600 >= 3264 + 300, '教学 watch 演示延 3600 < dc_tut_watch 3264+300=3564'
assert '2200 * SPEED' in main, 'main 缺教学题面链后窗常量 2200'
assert '}, 2200 * SPEED);' in main, 'main 教学 turn 后读题延 2200 缺失（dc_tut_turn 1896+300 防尾截）'
assert 2200 >= 1896 + 300, 'turn 后读题延 2200 < dc_tut_turn 1896+300=2196'
# r14 教学读题链=scale 2208+名音 1368+q_count 1752=5478（turn 段全 clip 链，异步不占 UI 窗）
assert 2208 + 150 + 1368 + 150 + 1752 + 300 == 5928, 'turn 段读题链窗下界 5928（scale 前置链）'
assert 'VOICE.scale.key, nameClip(' in main, 'main 缺教学 scale 前置读题链（r14 换算锚）'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（dc_right ≥2748）'
assert 2620 + 400 >= DC_RIGHT + 300, 'celebrate 2620+400=3020 < dc_right 2448+300=2748'
# ⑤ estMs 全字符口径在场（家族 T：len*345+600；main 禁重复定义已在 2b 断言）
assert 's.length * 345 + 600' in data, 'game-data 缺 estMs 全字符口径定义（家族 T）'
# ⑥ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert "'dc_n_' + " in verif, 'verify 缺名音键独立断言素材'
# ⑦ keylessLast 断言素材在场（契约 N：keyless 段恒链尾的运行时对账）
assert 'keylessLast' in verif, 'verify 缺 keylessLast 断言（契约 N/Mj-1）'
# ⑧ verify 静态窗对账素材（4146 字面 + 确认链构成）
assert '4146' in verif and 'SPEC_DUR' in verif, 'verify 缺错链静态值断言素材'

# ===== 契约 L：数字 TTS 映射表封闭全量（r14=偶 2-60 全 30 条；2=两）=====
_mnum = re.search(r'const NUMCN = \{[^}]*\};', data)
assert _mnum, 'game-data 缺 NUMCN 表'
_num_pairs = re.findall(r'(\d+):\s*' + "'([^']+)'", _mnum.group(0))
assert len(_num_pairs) == 30, 'NUMCN 应 30 条（偶 2-60 全量），实得 %d' % len(_num_pairs)
assert [int(v) for v, _ in _num_pairs] == list(range(2, 62, 2)), 'NUMCN 键序应为偶 2-60'
assert dict((int(v), w) for v, w in _num_pairs)[2] == '两', 'NUMCN[2] 应为 两'
assert 'NUMCN[' in main, 'main 判对数字尾段未走 NUMCN 表（契约 L）'
assert 'NUMCN' in verif, 'verify 缺契约 L 专项断言'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.cat', 'g[data-cat]', 'data-i', '.cell.lit', 'row.ask', '.band.old', '.ncard'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M/r14）' % lit
assert 'data-cat="' in main, 'main 场景/图表渲染缺 data-cat 锚（契约 M 渲染对账依据）'
assert 'data-i="' in main, 'main 图表格渲染缺 data-i 锚（契约 M）'
assert 'band.cur .cell' in main, 'main 缺 r14 条带域锚（band.cur——交互域）'
assert 'LEGEND_TEXT' in main and "'1格=2只'" in main, 'main 缺图例徽章句锚（r14 换算教学）'

# ===== 家族 F 坑①：CHAPTERS 表内容字面锚（hint=第 i+1 章预告，build 重列对账）=====
CHAPTERS_LIT = {
    1: ('两个两个数', '数完算一算，一共几只'),
    2: ('一共几只', '比一比谁多谁少，相差几只'),
    3: ('比比相差', '再调查一次，看看变化'),
    4: ('第二次调查', '新的调查开始啦，接着数'),
}
for i, (nm, hint) in CHAPTERS_LIT.items():
    assert ("name: '%s'" % nm) in data, 'CHAPTERS[%d].name 缺 %s（家族 F 字面锚）' % (i, nm)
    assert ("hint: '%s'" % hint) in data, 'CHAPTERS[%d].hint 缺 %s（家族 F 字面锚——预告下一章）' % (i, hint)
GEN_LIT = ['两个两个数，点亮表格', '数一数，算一算一共几只', '比一比，相差几只', '两次调查，比比变化']
for h in GEN_LIT:
    assert ("'%s'" % h) in data, 'GEN_HINTS 缺 %s（GEN_HINTS[k] ↔ dch=k+1）' % h
assert 'nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]' in verif or \
       'GEN_HINTS[genLevel(f + 1).dch - 1]' in verif, 'verify 缺家族 F 实算断言素材'

# ===== 教学链 watch 预算分账（≤16s，名义值累加；留 ≥400ms 折算抖动余量）=====
# tutorialWatch 名义分账（r14 flat0 锚 rabbit 8→4 格）：watch 延 3600（≥3264+300）
# + 场景 pulse 窗 800+1800（与题面链并行）+ ghost 移图表 900 + 题面收尾垫 200
# （覆盖 count 题面链 3342+300）+ 逐格演示 4×(160+120+200=480) + settle 900
# + 确认链演出窗 5800（1600+tail 4200 ≥ 兔链 5706——tail=confirmTailMs 下限在 data）= 15920 ≤ 16000
TUT_SUM = 3600 + 800 + 1800 + 900 + 200 + 4 * (160 + 120 + 200) + 900 + 5800
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3600 * SPEED', '800 * SPEED', '1800 * SPEED', '900 * SPEED', '200 * SPEED',
            '1600 * SPEED', 'countSteps(q); k++']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
assert 'Math.max(4200' in data, 'game-data 缺 confirmTailMs 4200 下限（教学窗 5800 分账依据）'

# ===== 硬性检查 2c：head 标题与存档名对齐 + 图例句在场 =====
assert '<title>数据收集员</title>' in head, 'head 缺标题 数据收集员'
assert '1格=2只' in head, 'head 缺图例徽章句（r14 换算锚）'

# ===== r14 竖屏双通道对账：@media(orientation:portrait) 段与 body.port 段逐条等值 =====
_m = re.search(r'@media \(orientation:portrait\)\{\n(.*?)\n\}\n', head, re.S)
_p = re.search(r'/\*PORT-CLS\*/\n(.*?)\n/\*PORT-CLS-END\*/', head, re.S)
assert _m and _p, 'head 缺竖屏双通道两段（@media + body.port）'
media_rules = re.findall(r'([^{}\s][^{}]*)\{([^{}]*)\}', _m.group(1))
port_rules = re.findall(r'(body\.port [^{}]*)\{([^{}]*)\}', _p.group(1))
assert len(media_rules) == len(port_rules) and len(media_rules) >= 13, \
    '竖屏双通道规则数不一致：@media %d vs body.port %d（应 ≥13 条）' % (len(media_rules), len(port_rules))
for (ms, md), (ps, pd) in zip(media_rules, port_rules):
    # 组合选择器（body.port .a,body.port .b）逐前缀剥离后与 @media 段等值对账
    ps_norm = ps.strip()
    while ps_norm.startswith('body.port '):
        ps_norm = ps_norm[len('body.port '):]
    ps_norm = ps_norm.replace('body.port ', '')
    assert ps_norm.strip() == ms.strip() and pd == md, \
        '竖屏双通道规则不等值：@media %s{%s} vs %s{%s}' % (ms, md, ps, pd)
assert 'applyPort' in main, 'main 缺竖屏双通道 JS（body.port 类通道）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（r13 定版）
        '</body>\n</html>\n')
n_blocks = html.count('<script>')
assert n_blocks == 4, '应恰 4 个 script 块（core/clips/game/verify），实得 %d' % n_blocks

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('r14 gate: clips %d (dc 54+core 3) / script blocks %d / portrait rules %d eq-value'
      % (n_clips, n_blocks, len(media_rules)))
print('estMs check: change-worst confirm chain %d+150+%d+150+%d+150+%d+300=%d (T46 clip) <= dyn-win;'
      ' wrong-chain %d+150+%d+300=4146; tut-budget %dms <= 16000'
      % (DC_RIGHT, MAX_NAME, DC_S_SHAO, DC_NUM_MAX,
         DC_RIGHT + 150 + MAX_NAME + 150 + DC_S_SHAO + 150 + DC_NUM_MAX + 300,
         DC_WRONG, DC_HINT, TUT_SUM))
