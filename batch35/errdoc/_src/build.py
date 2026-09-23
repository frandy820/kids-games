# -*- coding: utf-8 -*-
"""errdoc 错题小医生 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch35/errdoc/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch35/errdoc/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（ed_ 9 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('errdoc') 全量返回（manifest games 已含 errdoc 的
# core_* 3 条自动带上）；下方补注入循环按 `if '"%s"' % k in clips: continue`
# 幂等跳过（任务书定版模式）——已注入键绝不二次写入，并以计数断言防双注入
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('errdoc')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：ed_ 9 条（SPEC §3/§4：tut_watch/tut_turn/hint/right/wrong/spot/
# rx_careful/rx_calc/rx_slow）+ core 3 条 = 12 条（SPEC-BATCH35 §4；gate G3 errdoc=12）
# 前缀=ed_ 已核 manifest 无占用（b28 立规先查，2026-09-12 实查）
ED_KEYS = ['ed_tut_watch', 'ed_tut_turn', 'ed_hint', 'ed_right', 'ed_wrong', 'ed_spot',
           'ed_rx_careful', 'ed_rx_calc', 'ed_rx_slow']
ED_N_KEYS = ['ed_n_%d' % i for i in range(0, 21)]                 # T46：数段 21（0-20 全量）
ED_OP_KEYS = ['ed_op_add', 'ed_op_sub', 'ed_op_mul']              # T46：运算符段 3
ED_S_KEYS = ['ed_s_here', 'ed_s_eq']                              # T46：骨架段 2
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
# 幂等补注入循环（任务书定版：`if '"%s"' % k in clips: continue`——本例全量已注入全跳过）
_ALL_KEYS = ED_KEYS + ED_N_KEYS + ED_OP_KEYS + ED_S_KEYS + CORE_KEYS
for k in _ALL_KEYS:
    if '"%s"' % k in clips:
        continue
    # 不可达分支：clips_js('errdoc') 必含全部 38 键（下方计数断言兜底）
    raise AssertionError('clips 缺少 %s（clips_js 应全量返回）' % k)
for k in _ALL_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 38, 'clips 条数 %d != 38（ed 9 + ed_n 21 + ed_op 3 + ed_s 2 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 ed_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('ed_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 ed_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('ed_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'errdoc'" in main, 'main 缺 KIDS.init errdoc（存档键 kidsgame_errdoc）'
assert 'window.ED =' in main, 'main 缺 ED 钩子'
assert '__edDemoR' in main, 'main 缺教学演示实证 __edDemoR'
assert '__edTutSolo' in main, 'main 缺教学帮→独实证 __edTutSolo'
assert '__edWatchMs' in main, 'main 缺 watch 段计时锚 __edWatchMs'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非步相位）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 复验定版（2026-09-12）：ED 钩子含 pills getter（fix 阶段显示序数值数组；spot/why null）
assert 'get pills()' in main, 'main ED 钩子缺 pills getter（复验定版）'
assert 'ED.pills' in verif, 'verify 缺 ED.pills getter 断言素材（复验定版）'
# 本批常量锚（SPEC-BATCH35 §0.87：seeded mulberry32(flat*7919+631)——本款常量 631）
assert 'flat * 7919 + 631' in engine, 'engine 缺本款常量 seed 631（SPEC §0.87）'
# 静态题库 15 题锚（SPEC §4 全表照录——抽 3 行核对防表被改）
for frag in ("{ t: 'ans', a: 13, op: '-', b: 5, r: 9,  fix: 8 }",
             "{ t: 'ans', a: 3, op: '×', b: 4, r: 14, fix: 12 }",
             "{ t: 'num', a: 31, op: '-', b: 5, r: 26, fix: 8,  origA: 13 }",
             "{ t: 'num', a: 31, op: '-', b: 9, r: 22, fix: 4,  origA: 13 }"):
    assert frag in engine, 'engine 缺 SPEC §4 静态表行：%s' % frag
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配可见回应（诊所场景 bump）
assert "replayAnim(sceneEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.errdoc.tutSeen）
assert 'sv.errdoc && sv.errdoc.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I+I补：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=5274，SPEC §4 精确值）
# + 救援 interval 守卫 + startLevel 重置 + 两步 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 5274' in data, 'data 缺错链豁免窗常量 5274（SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== lesionOf(q)' in main, \
    'main 缺步1 豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && q.pills[i] !== q.fix' in main, \
    'main 缺步2 豁免窗 guard（I 补：错药吞，对药放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# 家族契约 L：NUMCN 0-20 全量 21 值（含 0 零——errdoc 契约 L 定版）
assert '0: \'零\'' in data and '20: \'二十\'' in data, 'data 缺 NUMCN 0/20 端点（契约 L 21 值）'
assert len(re.findall(r"\d+: '", data[data.index('const NUMCN'):data.index('};', data.index('const NUMCN'))])) == 21, \
    'NUMCN 键数 != 21（契约 L 全量）'
# 真时钟演出窗常量（SPEC §4 实长表；窗=链总实长+300 家族 G/H/T）
for frag in ('const CONFIRM_WIN = 10200', 'const SPOT_WIN_HINT = 6450', 'const SPOT_WIN_ANS = 2900',
             'const RX_WIN = 3050', 'const PRESENT_MS = 800', 'const WROLL_MS = 900',
             'const TUT_WATCH_WAIT = 3516', 'const TUT_TURN_WAIT = 1980'):
    assert frag in data, 'data 缺演出窗常量 %s（SPEC §4）' % frag
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tap 演出期 null）'
# Mj-1 防回归+零 keyless 政策（T46 化 2026-09-19：全链段键化——确认链/提示链全 clip，
# 禁任何 key 空缺带 text 的 TTS 段字面（含注释措辞））
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 含 key 空缺带 text 的 TTS 段字面（零 keyless 政策）' % _src_name

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH35 §4 实长表 + T46 段键实长）=====
# T46 化（2026-09-19）：estMs 整句口径退役——链按段 clip 实长推导（python 双录，
# verify SPEC_ED_N/SPEC_ED_OP/SPEC_ED_SEG 同值）
ED_N_DUR = {0: 1128, 1: 1128, 2: 1176, 3: 1224, 4: 1224, 5: 1128, 6: 1152, 7: 1176,
            8: 1152, 9: 1128, 10: 1248, 11: 1416, 12: 1368, 13: 1416, 14: 1440, 15: 1440,
            16: 1464, 17: 1440, 18: 1392, 19: 1464, 20: 1416}
ED_N_WORST = max(ED_N_DUR.values())             # 1464（16/19——dur json 实测）
ED_OP_DUR, ED_S_DUR = 1152, {'here': 1872, 'eq': 1320}
ED_WATCH, ED_TURN = 3216, 1680                  # ed_tut_watch / ed_tut_turn 实长
ED_RIGHT, ED_WRONG, ED_HINT, ED_SPOT = 2232, 1656, 3168, 2496  # 实长
ED_RX_MAX = 2664                                # rx 三条 max（ed_rx_careful / ed_rx_slow）
assert ED_N_WORST == 1464, 'ed_n worst %d != 1464（表漂移）' % ED_N_WORST
# ① 确认链（T46 6 段：right+5×150+[ed_n,ed_op,ed_n,ed_s_eq,ed_n] worst）→ 窗 10200
#    ≥ 2232+750+3×1464+1152+1320+300=10146（estMs 8 字口径 6042 退役——段链实长为准）
CONFIRM_WORST = ED_RIGHT + 5 * 150 + 3 * ED_N_WORST + ED_OP_DUR + ED_S_DUR['eq'] + 300
assert 10200 >= CONFIRM_WORST, '确认链窗 10200 < 6 段 worst %d（T46 clip）' % CONFIRM_WORST
# ② spot 提示链（T46 3 段：spot+150+here+150+worst ed_n/ed_op）→ 窗 6450 ≥ 6432
SPOT_HINT_WORST = ED_SPOT + 150 + ED_S_DUR['here'] + 150 + max(ED_N_WORST, ED_OP_DUR) + 300
assert 6450 >= SPOT_HINT_WORST, 'spot 链窗 6450 < 3 段 worst %d（T46 clip）' % SPOT_HINT_WORST
assert 2900 >= ED_SPOT + 300, 'spot 单 clip 窗 2900 < %d（ans 型）' % (ED_SPOT + 300)
# ③ rx 药方单发窗（2664+300=2964 ≤ 3050，SPEC §4）
assert 3050 >= ED_RX_MAX + 300
# ④ 错链豁免窗（契约 I）：wrong 1656+150+hint 3168+300=5274（SPEC §4 精确值，spot/fix 同链同窗）
assert 5274 == ED_WRONG + 150 + ED_HINT + 300, '链豁免窗 5274 != 错链 %d+150+%d+300' % (ED_WRONG, ED_HINT)
# ⑤ 教学延窗（watch 3216+300=3516 / turn 1680+300=1980 防尾截）+ celebrate 后窗（家族 H）
assert 3516 >= ED_WATCH + 300 and 1980 >= ED_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（ed_right 2232）'
assert 2620 + 400 >= ED_RIGHT + 300, 'celebrate 2620+400=3020 < ed_right 2232+300=2532'
# ⑥ T46：estMs 退役（无消费者禁死代码）+ 段键函数/链拼播在场
core_src = open('game-core.js', encoding='utf-8').read()
assert 'const estMs' not in main and 'const estMs' not in data, 'estMs 定义残留（T46 退役）'
assert 'const eqParts = q =>' in core_src, 'core 缺 eqParts 段键函数（T46）'
assert 'const hintParts = q =>' in core_src, 'core 缺 hintParts 段键函数（T46）'
assert 'function eqTTS' not in core_src and 'function hintTTS' not in core_src, '整句 TTS 构造残留（T46 退役）'
assert '[VOICE.spot.key].concat(hintParts(q))' in main, 'main 缺 spot 提示链段键拼播（T46）'
assert '[VOICE.right.key].concat(eqParts(q))' in main, 'main 缺确认链段键拼播（T46）'
# ⑦ verify 页 T46 窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'SPEC_ED_N' in verif and 'edConfirmWorst' in verif and 'specDurOf' in verif,     'verify 缺 SPEC_ED_N/edConfirmWorst/specDurOf 动态断言素材（T46）'
assert 'keylessLast' in verif, 'verify 缺 keylessLast 动态断言'
assert 'deriveFixV' in verif, 'verify 缺 fix 独立推导器 deriveFixV（禁读 quiz.fix 当期望源）'
assert 'origLS' in verif, 'verify 缺 origLS 写档测试模式（b34 坑②）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：病灶高亮/药卡选中/相位）=====
for lit in ('dataset.part', 'data-pill', "'#eq .part.lesion'",
            'dataset.pill', 'phaseReady', 'offsetWidth'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert "querySelector('#eq .part[data-part=" in verif, 'verify 缺部位选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤22000，名义值累加；三步诊演示天然长于单步款）=====
# tutorialWatch watch 段名义分账（T46 化 2026-09-19 帽重定 22000→24000：CONFIRM_WIN
# 6100→10200 系确认链 clip 实长重定——音频完整性优先，quickcmp 帽重定先例）：
# watch 延 3516（≥3216+300）+ 卡入场 800 + ghost×3（移 800+press 320）
# + 三步窗（spot ans 2900 + confirm 10200 + rx 3050）= 23826 ≤ 24000
TUT_SUM = 3516 + 800 + (800 + 320) * 3 + 2900 + 10200 + 3050
assert TUT_SUM <= 24000, '教学 watch 分账 %dms > 24000（T46 帽）' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>错题小医生</title>' in head, 'head 缺标题 错题小医生'

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
print('window check (T46 clip): confirm 6-seg %d <= win 10200; '
      'spot-hint 3-seg %d <= 6450; spot-ans %d+300 <= 2900; '
      'rx %d+300 <= 3050; wrong-chain 5274 (exact); tut-budget %dms <= 24000' %
      (CONFIRM_WORST, SPOT_HINT_WORST,
       ED_SPOT, ED_RX_MAX, TUT_SUM))
