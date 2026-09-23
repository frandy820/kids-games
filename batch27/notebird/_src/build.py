# -*- coding: utf-8 -*-
"""notebird 音阶小鸟 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch27/notebird/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch27/notebird/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（not_ 6 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('notebird')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：not_ 36 条 + core_* 3 条 = 39 条（r39 九新键注册 2026-09-22；退役三键保留注入）
NB_KEYS = ['not_tut_watch', 'not_tut_turn', 'not_hint', 'not_right', 'not_wrong', 'not_q',
           'not_q2', 'not_main', 'not_g_higher', 'not_g_left', 'not_g_right',
           'not_cf_h_0', 'not_cf_h_1', 'not_cf_h_2', 'not_cf_h_3',
           'not_cf_h_4', 'not_cf_h_5', 'not_cf_h_6', 'not_cf_h_7',
           'not_cf_s_0', 'not_cf_s_1', 'not_cf_s_2', 'not_cf_s_3',
           'not_cf_s_4', 'not_cf_s_5', 'not_cf_s_6', 'not_cf_s_7']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in NB_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 39, 'clips 条数 %d != 39（not_ 36 + core 3，r39 九新键注册 2026-09-22；退役 not_g_right/left/higher 保留注入）' % n_clips
# T46 阶段2 段键结构断言：题面/确认/引导/主线键构造在场 + main 全键化（禁 keyless say 回退）
assert 'confirmKeyOf' in data and 'guideKeyOf' in data, 'game-data 缺 T46 阶段2 键构造 confirmKeyOf/guideKeyOf'
assert "KIDS.voice.play('not_q2', '谁的声音高？')" in main, 'main 缺 higher 题面句 clip 化（T46 阶段2）'
assert 'KIDS.voice.play(confirmKeyOf(q), confirmText(q))' in main, 'main 缺确认句 clip 化（T46 阶段2）'
assert "KIDS.voice.play('not_main', MAIN_LINE)" in main, 'main 缺主线句 clip 化（T46 阶段2）'
assert 'window.__nbMainV' in main, 'main 缺主线句 play 通道实证 __nbMainV'
assert 'KIDS.voice.say' not in main, 'main 残留 keyless voice.say（T46 阶段2 应全键化）'
# r39 四型键构造断言（SPEC-R39 §R10：新键注册前静默，键构造与文案先落——注册后主线联动 39）
assert "not_cf_mel" in data and "not_cf_iv" in data, 'game-data 缺 r39 melody/iv 确认键构造'
assert "not_g_hi2" in data and "not_g_lo2" in data and "not_g_h2" in data and "not_g_mel" in data and "not_g_iv" in data, \
    'game-data 缺 r39 四型引导键构造（find 音序/higher 时序/melody/iv）'
assert "not_q_mel" in main and "not_q_iv" in main, 'main 缺 r39 melody/iv 题面句键控'
assert 'guideTextOf' in data and 'GUIDE_FIND2' in data and 'GUIDE_H2' in data, 'game-data 缺 r39 引导句文本分流'
assert "IV_KEYS" in data and "IV_LABEL" in data and "ivClsOf" in data, 'game-data 缺 r39 interval 类目表/分类式'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'notebird'" in main, 'main 缺 KIDS.init notebird（存档键 kidsgame_notebird）'
assert 'window.NB =' in main, 'main 缺 NB 钩子'
assert '__nbDemoR' in main, 'main 缺教学演示实证 __nbDemoR'
assert '音阶小鸟' in head, 'head 缺标题音阶小鸟'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：ch1 教学特例（点错=free 不罚）在场
assert "if (L.dch === 1) return 'free'" in engine, 'engine 缺 ch1 free 教学特例（家族 E）'
# 家族契约 I：豁免窗守卫 + 换关重置
assert 'Date.now() < wrongChainUntil' in main, 'main 救援 interval 缺豁免窗早退守卫（家族 I）'

# ===== SPEC 频率表双录对账（§0.66 写死 data；build 侧独立再录一份） =====
SPEC_FREQ = {'do': '261.63', 're': '293.66', 'mi': '329.63', 'fa': '349.23',
             'sol': '392.00', 'la': '440.00', 'si': '493.88', 'dop': '523.25'}
for k, v in SPEC_FREQ.items():
    assert 'freq: ' + v in data, 'data 频率表缺 %s: %s' % (k, v)

# ===== 合成音时序常量（SPEC §0.66 + r39 §R9：700ms/300ms/higher 两音 1700/melody 三音 2700） =====
assert 'const SING_MS = 700' in data and 'SING_GAP = 300' in data, 'data 缺 SING_MS=700/SING_GAP=300'
assert 'const SING_PAIR_MS = 1700' in data, 'data 缺 SING_PAIR_MS=1700（higher/iv 两音窗）'
assert 'const SING_TRIO_MS = 2700' in data, 'data 缺 SING_TRIO_MS=2700（r39 melody 三音窗）'
assert 1700 == 700 + 300 + 700 and 2700 == 3 * 700 + 2 * 300, 'SING_PAIR/TRIO_MS 数字自检失败'
assert 'SING_PAIR_MS + 300' in main and 'SING_TRIO_MS + 300' in main, 'main 题面锁窗缺 SING_PAIR/TRIO_MS+300'
assert 'await wait(550);' in main, 'main 教学顺序唱缺 SING_STEP 固定窗'

# ===== 语音窗静态断言（家族 G/H/I；T46 阶段2 起判 TTS 拼句的窗按 clip 实测口径核） =====
# ① 确认句（T46 阶段2 clip 化）：not_cf_* 16 键 mp3 实测最长 not_cf_h_4=2952（2026-09-19 mutagen）
NOT_CF_MAX = 2952
assert 900 + 1800 + 3300 >= NOT_CF_MAX + 300,     '判对演出窗 6000 < not_cf 最长 clip 2952+300（T46 clip 口径）'
for w in ['900 * SPEED', '1800 * SPEED', '3300 * SPEED']:
    assert w in main, 'main 判对演出窗（900+1800+3300）缺 %s' % w
# ② 错反馈链豁免窗（家族 I；r39-bis 口径：链=not_wrong 2832+150+not_g_h2 estMs(9 字=3705)+300=6987≤7800）
NOT_G_H2_HAN = 9                            # r39-bis 引导句最长汉字数（再听一遍，谁的声音高；旧 10 字版已退役）
assert 2832 + 150 + (NOT_G_H2_HAN * 345 + 600) + 300 <= 7800, 'r39 链 estMs 界超 7800（注册后实长复核 ≤4518）'
assert "wrongChainUntil = Date.now() + 7800" in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7800'
assert "sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideTextOf(q, i) }])" in main, \
    'main 错反馈拼播链（not_wrong+四型引导句键）缺失（r39 分流）'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert "await wait(700 * SPEED)" in main, 'main 缺 melody step 窗 700ms（r39 §R9）'
# ③ 教学链窗（clip 实长 SPEC-BATCH27 §4）：watch 3096 → 顺序唱延 t=900+2700=3600 ≥3096+300（m2）
assert '900 * SPEED' in main and '2700 * SPEED' in main, 'main 缺教学顺序唱延窗（t=900+2700=3600）'
assert 900 + 2700 >= 3096 + 300, '教学顺序唱延窗 3600 < not_tut_watch 3096+300（m2 裕量 204）'
# 教学链总预算 ≤16s（审查 M1：watch 段到 __nbDemoR；SPEED 段+固定段）
assert (900 + 2700 + 4100 + 500 + 320 + 900) + (8 * 550 + 1300 + 700) <= 16000, '教学链总预算超 16s（M1）'
# 主线句窗（T46 clip 口径）：not_main mp3 实测 2904 → 4100 ≥ 2904+300（estMs 3705 口径退役）
mblock = re.search(r"const MAIN_LINE = '([^']+)';", data)
assert mblock, 'game-data 缺 MAIN_LINE 主线句'
NOT_MAIN_MS = 2904
assert '4100 * SPEED' in main, 'main 缺主线句窗 4100'
assert 4100 >= NOT_MAIN_MS + 300, '主线句窗 4100 < not_main 2904+300（T46 clip 口径）'

# winFlow celebrate 补窗：2620+400=3020 ≥ not_right 2664+300=2964
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（not_right ≥2964）'
assert 2620 + 400 >= 2664 + 300, 'celebrate 2620+400=3020 < not_right 2664+300'
# ④ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '900 + 1800 + 3300' in verif and 'SING_PAIR_MS === 700 + 300 + 700' in verif, \
    'verify 缺 estMs/合成音窗动态断言'
assert 'SING_TRIO_MS === 2700' in verif, 'verify 缺 r39 melody 三音窗断言'

# ===== r39 结构断言：乱序律/防泄露/iv 卡/melody 进度（SPEC-R39 §R1/§R4/§R8） =====
assert 'const noSort' in engine and "if (dch >= 2 && asc) return 'orderMix'" in engine, 'engine 缺 r39 乱序律 noSort/orderMix'
assert "if (dch === 1 && !asc) return 'orderCh1'" in engine, 'engine 缺 ch1 有序律 orderCh1'
assert "return 'step'" in engine and '_prog' in engine, 'engine 缺 melody 进度判定（step 返回）'
assert "q.kind !== 'higher') return" in main or "flashSang" in main, 'main 缺 flashSang 挂点'
assert "if (q.kind !== 'higher') return" in main, 'main flashSang 缺仅 higher 亮分支（r39 唱窗零指认）'
assert "ivCardInner" in main and "iv-card" in main and "IV_LABEL" in main, 'main 缺 r39 interval 文字卡渲染'
assert "flatPerch ? 30 : 30 + i * 16" in main, 'main 缺 r39 站台分流（ch1 递增/ch2+ 等高；30px 基数容 21px 唱名标签防截断）'
assert "picked" in main and 'picked' in head, 'main/head 缺 melody picked 进度高亮样式'
assert 'units.leak' in verif and 'units.melody' in verif and 'units.iv' in verif, 'verify 缺 r39 ⑰⑱⑲ 三单元'
assert "IV_KEYS" in verif and 'SPEC_IV_LABEL' in verif, 'verify 缺 r39 iv 独立双录表'

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
# r39-bis 终态双口径（coin 审查 M1/M2 教训：本闸 estMs 为粗筛，实测真值在 game-verify ⑯ durSpec）
# 实测口径：链=2832+150+not_g_h2 2928（mutagen 2026-09-22）+300=6210 ≤7800
print('r39 check: est-chain not_g_h2 %dms(estMs 粗筛) -> %d <= 7800 | 实测 2928 -> 6210 <= 7800; not_cf_max %d <= 6000-300; not_main %d <= 4100-300' %
      (NOT_G_H2_HAN * 345 + 600, 2832 + 150 + (NOT_G_H2_HAN * 345 + 600) + 300, NOT_CF_MAX, NOT_MAIN_MS))
