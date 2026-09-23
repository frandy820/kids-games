# -*- coding: utf-8 -*-
"""conserve 数量守恒 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch28/conserve/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch28/conserve/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（cnv_ 6 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('conserve')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：T46 阶段2 后 cnv_ 36 条（6 固定+30 段键）+ core 3 条 = 39（SPEC-BATCH28 §3/§4）
# 前缀=cnv_ 非 con_——con_ 已被 batch5/connect 占用，撞前缀=覆盖 manifest 键+错音频
CNV_KEYS = ['cnv_tut_watch', 'cnv_tut_turn', 'cnv_hint', 'cnv_right', 'cnv_wrong', 'cnv_q']
CNV_T46 = ['cnv_pre', 'cnv_t_rows', 'cnv_t_pour', 'cnv_t_clay',
           'cnv_add_rows_l_add', 'cnv_add_rows_l_take', 'cnv_add_rows_r_add', 'cnv_add_rows_r_take',
           'cnv_add_pour', 'cnv_add_clay',
           'cnv_cf_same_rows_5', 'cnv_cf_same_rows_6', 'cnv_cf_same_rows_7',
           'cnv_cf_same_pour', 'cnv_cf_same_clay', 'cnv_cf_rows_l', 'cnv_cf_rows_r',
           'cnv_cf_pour', 'cnv_cf_clay',
           'cnv_g_same_rows_5', 'cnv_g_same_rows_6', 'cnv_g_same_rows_7',
           'cnv_g_same_pour', 'cnv_g_same_clay',
           'cnv_g_rows_l_add', 'cnv_g_rows_l_take', 'cnv_g_rows_r_add', 'cnv_g_rows_r_take',
           'cnv_g_pour', 'cnv_g_clay']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CNV_KEYS + CNV_T46 + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
assert '"con_' not in clips, 'clips 出现 con_ 前缀键（撞 batch5/connect）'
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 39, 'clips 条数 %d != 39（cnv 36 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'conserve'" in main, 'main 缺 KIDS.init conserve（存档键 kidsgame_conserve）'
assert 'window.CV =' in main, 'main 缺 CV 钩子'
assert '__cvDemoR' in main, 'main 缺教学演示实证 __cvDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3；m3 补 2026-09-10）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 10500' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=10500'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 面板在场守卫（b27 新立，逐字一致）
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'

# ===== 语音窗静态断言（T46 阶段2 后以 clip 实长为主口径；estMs 窗保留旁证——clip 恒 ≤ estMs 同句）=====
# estMs 口径（b25 定版）：SAPI ~345ms/字 + 600 落定余量（全字符 n×345+600）
est_ms = lambda n: n * 345 + 600
# mp3 实测表（与 verify SPEC_DUR 同源对账）
CLIP_MS = {'cnv_tut_watch': 2712, 'cnv_tut_turn': 1848, 'cnv_hint': 2232, 'cnv_right': 2496,
           'cnv_wrong': 2184, 'cnv_q': 1680, 'cnv_pre': 2424, 'cnv_t_rows': 3648,
           'cnv_t_pour': 3912, 'cnv_t_clay': 3432, 'cnv_add_rows_l_add': 2376,
           'cnv_add_rows_l_take': 2496, 'cnv_add_rows_r_add': 2376, 'cnv_add_rows_r_take': 2496,
           'cnv_add_pour': 2592, 'cnv_add_clay': 2568, 'cnv_cf_same_rows_5': 2952,
           'cnv_cf_same_rows_6': 3048, 'cnv_cf_same_rows_7': 3024, 'cnv_cf_same_pour': 3120,
           'cnv_cf_same_clay': 3192, 'cnv_cf_rows_l': 3192, 'cnv_cf_rows_r': 3192,
           'cnv_cf_pour': 2904, 'cnv_cf_clay': 2712, 'cnv_g_same_rows_5': 3216,
           'cnv_g_same_rows_6': 3240, 'cnv_g_same_rows_7': 3288, 'cnv_g_same_pour': 4080,
           'cnv_g_same_clay': 4944, 'cnv_g_rows_l_add': 4704, 'cnv_g_rows_l_take': 4920,
           'cnv_g_rows_r_add': 4704, 'cnv_g_rows_r_take': 4920, 'cnv_g_pour': 4128,
           'cnv_g_clay': 4416}
# ① 确认句 clip 化：判对演出窗 1800+3600=5400 ≥ 确认 clip 最长 3192+300
MAX_CF_MS = max(v for k, v in CLIP_MS.items() if k.startswith('cnv_cf_'))
assert 1800 + 3600 >= MAX_CF_MS + 300, '判对演出窗 5400 < 确认 clip 最长 %d+300' % MAX_CF_MS
assert 'KIDS.voice.play(confirmKeyOf(q), confirmOf(q))' in main, 'main 缺确认句 clip 键化（T46 阶段2）'
assert "KIDS.voice.play('cnv_pre', PRE_SAY)" in main, 'main 缺 pre 展示句 clip 键化'
assert "KIDS.voice.play('cnv_t_' + q.family, T_SAY[q.family])" in main, 'main 缺变换解说 clip 键化'
assert 'KIDS.voice.play(addKeyOf(q), addSayOf(q))' in main, 'main 缺追加句 clip 键化'
assert "KIDS.voice.play('cnv_t_rows', T_SAY.rows)" in main, 'main 缺教学演示解说 clip 键化'
assert "sayW([VOICE.wrong.key, { key: guideKeyOf(q), text: guideOf(q) }])" in main, \
    'main 错反馈链引导句未键化（T46 阶段2）'
assert 'addKeyOf' in data and 'confirmKeyOf' in data and 'guideKeyOf' in data, \
    'game-data 缺 T46 阶段2 键构造 addKeyOf/confirmKeyOf/guideKeyOf'
# ② 引导句（错反馈链第二段 clip 化）：链豁免窗 ≥ cnv_wrong+150+引导 clip 最长+300
#    最长引导句=clay same（21 字）→ clip 实测 4944（模板四段拼接下界钉死见 verify SPEC）
MAX_GUIDE_MS = max(v for k, v in CLIP_MS.items() if k.startswith('cnv_g_'))
assert MAX_GUIDE_MS == CLIP_MS['cnv_g_same_clay'], '最长引导 clip 应为 clay same 4944'
assert 10500 >= CLIP_MS['cnv_wrong'] + 150 + MAX_GUIDE_MS + 300, \
    '链豁免窗 10500 < cnv_wrong 2184+150+%d+300' % MAX_GUIDE_MS
# ③ 变换解说句在场 + 长度口径（教学链预算分账依据：rows 14 字）
assert "'右边的拉开了，可是数量没有变'" in data, 'game-data 缺 rows 变换解说句'
assert len('右边的拉开了，可是数量没有变') == 14, 'rows 变换解说句应 14 字符'
# ④ clip 实长窗（SPEC-BATCH28 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3012 * SPEED' in main, 'main 缺教学变换延窗 t=3012（cnv_tut_watch 2712+300）'
assert 3012 >= 2712 + 300, '教学变换延 3012 < cnv_tut_watch 2712+300'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（cnv_tut_turn 1848+300 防尾截）'
assert 2200 >= 1848 + 300, 'turn 后读题延 2200 < cnv_tut_turn 1848+300=2148'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（cnv_right ≥2796）'
assert 2620 + 400 >= 2496 + 300, 'celebrate 2620+400=3020 < cnv_right 2496+300=2796'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert main.count('1800 * SPEED') >= 1 and '3600 * SPEED' in main, \
    'main 判对演出窗 5400（1800+3600）不足'
# ⑤ 变换演出窗=estMs 对齐（SPEC：读题在变换动画后才播；解说在动画期间播）
assert 'estMs(PRE_SAY) * SPEED' in main, 'main 缺 pre 展示句 estMs 对齐窗'
assert 'estMs(T_SAY[q.family]) * SPEED' in main, 'main 缺变换解说 estMs 对齐窗'
assert 'estMs(addSayOf(q)) * SPEED' in main, 'main 缺 add 变更演出 estMs 对齐窗'
# T46 阶段2 旁证：演出句 clip 实长 ≤ estMs(同句) 窗（clip 在窗内自然收尾）
MAX_INTRO_MS = max(CLIP_MS['cnv_pre'], CLIP_MS['cnv_t_pour'], CLIP_MS['cnv_add_pour'])
assert est_ms(14) >= MAX_INTRO_MS + 300, '演出窗 estMs(14)=5430 < 最长演出 clip %d+300' % MAX_INTRO_MS
# ⑥ verify 页 clip 链动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1800 + 3600' in verif, 'verify 缺 estMs 动态断言'
assert 'maxGuideMs' in verif and 'maxCfMs' in verif, 'verify 缺 T46 clip 实长动态断言'
assert "'左边的多'" in verif and "'右边的多'" in verif, 'verify 缺 SPEC 候选表独立重列'
# verify SPEC_DUR 36 键与 CLIP_MS 同源对账
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"(?:'|^| )?(cnv_\w+)(?:'|\b):\s*(\d+)", mdur.group(1)))
assert len(dur_vals) == 36 and all(dur_vals.get(k) == str(v) for k, v in CLIP_MS.items()), \
    'SPEC_DUR 36 键与 CLIP_MS 实长表不符：%s' % dur_vals

# ===== 契约 L：NUMCN 数字映射表覆盖封闭集全量值（1-7；2=「两」）=====
for n, cn in [(1, '一'), (2, '两'), (3, '三'), (4, '四'), (5, '五'), (6, '六'), (7, '七')]:
    assert "%d: '%s'" % (n, cn) in data, 'game-data NUMCN 缺 %d: %s（契约 L：coin cnOf 缺 10/20 教训）' % (n, cn)
assert "2: '两'" in data, '契约 L：量词前 2 须用「两」'

# ===== 教学链 watch 预算分账（≤16s，动画 ≤2s 计入；名义值累加）=====
# tutorialWatch 名义分账：watch 延 3012 + 变换解说窗 estMs(14)=5430（动画 1.6s 含窗内）
# + ghost 700 + press 320 + demo 演出窗 1800+3600 + 收尾 300 = 15162 ≤ 16000
TUT_SUM = 3012 + est_ms(14) + 700 + 320 + 1800 + 3600 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3012 * SPEED', '700 * SPEED', '320 * SPEED', '300 * SPEED',
            '1800 * SPEED', '3600 * SPEED', 'estMs(T_SAY.rows) * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
assert '1.6s' in head or 'rs-morph-in 1.6s' in head, 'head 缺变换动画 1.6s（≤2s 口径）'

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
print('T46 clip check: right %d+300 <= 5400; wrong-chain 2184+150+%d+300 <= 10500; '
      'intro %d+300 <= estMs(14)=%d; tut-budget %dms <= 16000' %
      (MAX_CF_MS, MAX_GUIDE_MS, MAX_INTRO_MS, est_ms(14), TUT_SUM))
