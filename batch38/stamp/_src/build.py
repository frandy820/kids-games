# -*- coding: utf-8 -*-
"""stamp 规律画画 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch38/stamp/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力（b37 R4：三款 build 断言对称）。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch38/stamp/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（spm_ 5 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('stamp') 全量返回（manifest games 已含 stamp 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('stamp')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：spm_ 9 条（tut_watch/tut_turn/hint/right/wrong + v3 新增 4 条任务
# 框架/找错句占位）+ core 3 条 = 12 条（v3 升档 2026-09-13：spm_task_next/dual/fix
# 与 spm_fix_wrong 为 spm_*.mp3 复制占位，主线重合成覆盖）
SPM_KEYS = ['spm_tut_watch', 'spm_tut_turn', 'spm_hint', 'spm_right', 'spm_wrong',
            'spm_task_next', 'spm_task_dual', 'spm_task_fix', 'spm_fix_wrong']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SPM_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 12, 'clips 条数 %d != 12（spm 9 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 spm_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('spm_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 spm_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('spm_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'stamp'" in main, 'main 缺 KIDS.init stamp（存档键 kidsgame_stamp）'
assert 'window.ST =' in main, 'main 缺 ST 钩子'
assert '__stDemoR' in main, 'main 缺教学演示实证 __stDemoR'
assert '__stTutSolo' in main, 'main 缺教学帮→独实证 __stTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH38 §0.91：seeded mulberry32(flat*7919+827)——本款常量 827）
assert 'flat * 7919 + 827' in engine, 'engine 缺本款常量 seed 827（SPEC §0.91）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(trayEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.stamp.tutSeen）
assert 'sv.stamp && sv.stamp.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=6066，重合成实长回更）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 6066' in data, 'data 缺错链豁免窗常量 6066（SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3 恒定字面）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：本款题面规律句走 voice.say（非队列链——SPEC §1 明示 N 不适用）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.say，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.91 演出时序常量：出场 400/盖对窗 2316/找错标记窗/虚影锁 1100/教学延窗
# （v3：+FOUND_WIN 1200 找错标记+盘弹出窗；+FIX_WRONG_WIN 4452 ch4 点非错章链窗，实长回更）
for frag in ('const ENTER_MS = 400', 'const STAMP_WIN = 2316', 'const SHAKE_MS = 1100',
             'const TUT_WATCH_WAIT = 3550', 'const TUT_TURN_WAIT = 2100',
             'const FOUND_WIN = 1200', 'const FIX_WRONG_WIN = 4452'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapStamp/tapCell 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapStamp 演出期 null）'
# 题面任务框架句=voice.play（clip 优先/TTS 回退——v3 去语音泄题：不念规律）
assert 'KIDS.voice.play(q.sayKey, q.sayText)' in main, 'main 缺题面任务句 play（SPEC v3 去泄题）'
# 去泄题防回归：题面规律句连读机制（period 图案名拼接）不得回归
assert "MOTIF_NAME[c]).join('')" not in data, 'game-data 回归规律句连读（泄题机制禁用）'
# 题库 v3 schema 锚（kind/unit 双形态/period/colors+shapes/seeded badIdx）
for frag in ("kind: 'next'", "kind: 'fix'", 'colors:', 'shapes:', 'BAD_LO = 6, BAD_HI = 10'):
    assert frag in engine or frag in data, 'engine/data 缺 v3 题库 schema 锚 %s' % frag
# ch4 找错引擎在场（engTapCell+found/fixed 判定）
assert 'function engTapCell' in engine, 'engine 缺 ch4 找错引擎 engTapCell'
assert "'fixed'" in engine, 'engine 缺 ch4 修章返回值 fixed'
assert 'tapCell(j)' in main, 'main 缺 ST.tapCell 钩子（ch4 找错入口）'
# 确认链=spm_right 单 clip（SPEC §4）
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH38 §4 实长表 v3 占位口径）=====
est_ms = lambda n: n * 345 + 600
SPM_WATCH, SPM_TURN = 3192, 1752                  # spm_tut_watch / spm_tut_turn 实长
SPM_RIGHT, SPM_WRONG, SPM_HINT = 2016, 2016, 3600  # 实长（SPEC §4 实长表，spm_hint 重合成后 3600）
SPM_FIX_WRONG = 4152                               # spm_fix_wrong 重合成实长
SAY_MAX = 13                                      # 最长任务框架句全字符数（13 字任务句）
# ① 盖对窗（图案弹现+确认链）：STAMP_WIN 2316 == right 2016+300 精确（家族 H）
assert 2316 == SPM_RIGHT + 300, '盖对窗 2316 != right %d+300' % SPM_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=wrong 2016+150+hint 3600+300=6066（重合成实长回更）
assert 6066 == SPM_WRONG + 150 + SPM_HINT + 300, '链豁免窗 6066 != 错链 %d+150+%d+300' % (SPM_WRONG, SPM_HINT)
# ②b ch4 找错链窗：FIX_WRONG_WIN 4452 == spm_fix_wrong 4152+300
assert 4452 == SPM_FIX_WRONG + 300, '找错链窗 4452 != fix_wrong %d+300' % SPM_FIX_WRONG
# ③ 首错演出锁（b37 R3）：SHAKE_MS 1100 ≤ wrong 2016+150=2166（禁覆盖豁免窗——留对选放行活跃段）
assert 1100 <= SPM_WRONG + 150, '首错演出锁 1100 > %d（b37 R3）' % (SPM_WRONG + 150)
# ④ 题面任务框架句窗（家族 T 动态）：estMs(13)=5085+300+出场 400=5785（去泄题任务句口径）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(SAY_MAX) == 5085 and est_ms(12) == 4740, 'estMs 静态验算失败'
# ⑤ 教学延窗（watch 3550≥3192+300+58 防单帧 / turn 2100≥1752+300 防尾截——审查 m5）
assert 3550 >= SPM_WATCH + 300 and 2100 >= SPM_TURN + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 2016+300=2316（家族 H）
assert 2620 + 400 >= SPM_RIGHT + 300, 'celebrate 3020 < %d+300' % SPM_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（spm_right 2016）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 R4 对称）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_ROWS' in verif, 'verify 缺题库独立硬编码表 SPEC_ROWS（单元⑥）'
assert 'SHAKE_MS <= D.spm_wrong + 150' in verif, 'verify 缺首错锁 ≤wrong+150 断言（b37 R3）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层
#       含盖印留格 DOM 断言 svg[data-motif]——SPEC §4 任务书明示）=====
for lit in ('dataset.scene', "classList.contains('stamped')", "classList.contains('cur')",
            'svg[data-motif=', '__lastSayText', 'dataset.j', '.stamp-wrap[data-j='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-motif=' in data, 'game-data SVG 缺 data-motif 盖印留格锚（契约 M）'
assert "querySelector('.stamp-wrap[data-j=" in main, 'main 缺章下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加 v3）=====
# tutorialWatch watch 段名义分账：watch 延 3500（≥3192+300）+ 开题演出
# （出场 400+estMs(row0 任务句 12 字)=4740+300=5440）+ ghost 移入 800+press 320
# + demo 演出窗 2316（罩确认链 2016+300 精确）= 12376 ≤ 16000
TUT_SUM = 3550 + (400 + est_ms(12) + 300) + 800 + 320 + 2316
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED', 'STAMP_WIN * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学题句长受控（row0 任务句=12 字——预算锚与实现绑定；SAY_MAX 13 字=最长任务框架句）
# 题面=任务框架句（v3 去泄题——build 断言图案名映射在场+任务句长口径）
for kv in ("F: '红花'", "S: '黄星'", "H: '粉心'", "O: '蓝圆点'",
           "RT: '红三角'", "YC: '黄圆'", "BS: '蓝方'", "GH: '绿心'",
           "RC: '红圆'", "YS: '黄方'", "BT: '蓝三角'", "GC: '绿圆'"):
    assert kv in data, 'data 缺图案名映射 %s（印章 aria-label 构成真值）' % kv
assert len('看看花边的规律，盖下一个') == 12 and len('颜色和形状都有自己的规律哦') == 13 \
    and len('花边里有一枚盖错啦，找出来') == 13 and len('这枚是对的哦，再看看哪枚不合规律') == 16

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>规律画画</title>' in head, 'head 缺标题 规律画画'

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

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: wrong-chain 6066 (exact, resynth); fix-wrong-win 4452 == 4152+300; stamp-win 2316 == 2016+300 (exact); '
      'shake 1100 <= 2166 (b37 R3); say-win estMs(13)+300+400=%d; tut-budget %dms <= 16000' % (est_ms(13) + 700, TUT_SUM))
