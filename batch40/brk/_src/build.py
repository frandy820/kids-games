# -*- coding: utf-8 -*-
"""brk 问题拆解小博士 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch40/brk/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch40/brk/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（brk_ 13 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('brk') 全量返回（manifest games 已含 brk 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('brk')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：brk_ 13 条（tut_watch/tut_turn/hint/right/wrong+目标名 8）+
# core 3 条 = 16 条（SPEC-BATCH40 §3 语音 16=专属 13+core 3；前缀=brk_ 已核
# manifest 零占用 2026-09-12 实查）
BRK_KEYS = ['brk_tut_watch', 'brk_tut_turn', 'brk_hint', 'brk_right', 'brk_wrong',   # T46 阶段2 +brk_tmpl+40 步序卡
            'brk_t_birthday', 'brk_t_picnic', 'brk_t_cardmake', 'brk_t_planttree',
            'brk_t_bagpack', 'brk_t_washhand', 'brk_t_feedrabbit', 'brk_t_bedtime', 'brk_tmpl'] + ['brk_step_%s_%d' % (g, i) for g in ('birthday','picnic','cardmake','planttree','bagpack','washhand','feedrabbit','bedtime') for i in range(5)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in BRK_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 57, 'clips 条数 %d != 57（brk 54 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 brk_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('brk_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 brk_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('brk_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'brk'" in main, 'main 缺 KIDS.init brk（存档键 kidsgame_brk）'
assert 'window.BRK =' in main, 'main 缺 BRK 钩子'
assert '__brkDemoR' in main, 'main 缺教学演示实证 __brkDemoR'
assert '__brkTutSolo' in main, 'main 缺教学帮→独实证 __brkTutSolo'
assert 'get tutorial' in main, 'main 缺 BRK.tutorial getter（gate G2 教学态轮询）'
assert 'fillSlot' in main, 'main 缺槽填函数 fillSlot（契约 M 演出层：槽 .filled 文字入格）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH40 §0.3：seeded mulberry32(flat*7919+907)——本款常量 907）
assert 'flat * 7919 + 907' in engine, 'engine 缺本款常量 seed 907（SPEC §0.3）'
assert 'flat * 7919 + 907 + qi * 131' in engine, 'engine 缺题级独立流式（plant 式）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(poolEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.brk.tutSeen）
assert 'sv.brk && sv.brk.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=3330）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行——pick 族 isGood 逐卡）
assert 'const WRONG_CHAIN_WIN = 3330' in data, 'data 缺错链豁免窗常量 3330（SPEC §3）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && !isGood' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行——pick 逐卡 isGood）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：题面链=目标名 clip+模板 clip 全 clip 双段（T46 阶段2——零 keyless；
# 检索锚与 verify ⑨ 同源字面）
assert "KIDS.voice.queue(['brk_t_' + q.goal, 'brk_tmpl']);" in main, \
    'main 缺题面链字面（T46 阶段2 全 clip 双段链）'
assert "KIDS.voice.play('brk_step_' + qq.cards[ci].id," in main, \
    'main 缺帮阶段读卡 clip 化（T46 阶段2 brk_step_<gid>_<i>）'
# SPEC §3：order 族每步重读 quiz（连选驱动——uiTapCard isGood+autoSolve 在 main、
# correctIdx 在 engine，三处）
_n_reread = main.count('q.answerList[q.picked.length]') + engine.count('q.answerList[q.picked.length]')
assert _n_reread >= 3, \
    'main+engine 缺 order 每步重读锚 answerList[picked.length]（≥3 处，实得 %d）' % _n_reread
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCard 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCard 演出期 null）'
# 题面链+确认链（SPEC §3 语音行：步进只播换步音不重播题面）
assert 'chimeStep' in main, 'main 缺换步音 chimeStep（SPEC §3 order 连选步进）'
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §3）'
# SPEC §3 教学定表锚（main 手写教学池——verify SPEC_TUT 对账）
assert "'planttree_0', 'planttree_1', 'planttree_2'" in main, 'main 缺 watch 教学池 answerList（SPEC_TUT.watch）'
assert "'birthday_0', 'birthday_1', 'birthday_2'" in main, 'main 缺 turn 教学池 answerList（SPEC_TUT.turn）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'

# ===== SPEC §3 演出时序常量（实长表：wrong 2880/right 2736/hint 2160/
# tut_watch 3408/tut_turn 1776/目标名 max 2232）=====
for frag in ('const ENTER_MS = 400', 'const GOAL_CLIP_MAX = 2232', 'const SEG_GAP = 150',
             "const TMPL = '帮小兔子拆一拆'", 'const PRESENT_TTS = 5697',
             'const SHAKE_MS = 1200', 'const WRONG_CHAIN_WIN = 3330',
             'const FILL_MS = 1000', 'const CELE_WIN = 3036',
             'const TUT_WATCH_WAIT = 3708', 'const TUT_TURN_WAIT = 2076'):
    assert frag in data, 'data 缺 SPEC §3 演出常量 %s' % frag
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'

# ===== 语音窗静态验算（N2 总窗口径：常量×SPEED+尾窗常数全算，禁只断常量）=====
est_ms = lambda n: n * 345 + 600
WATCH, TURN, HINT, RIGHT, WRONG = 3408, 1776, 2160, 2736, 2880   # _clipdur40.json 实长
GOAL_MAX, TMPL_LEN = 2232, 7                                     # 目标名 max/模板 7 字
# ① 错链豁免窗（契约 I）：= wrong 2880+150+300=3330（单段链总式）
assert 3330 == WRONG + 150 + 300, '链豁免窗 3330 != 错链 %d+150+300' % WRONG
# ② 确认窗（题完成）：CELE_WIN 3036 == right 2736+300 精确（家族 H）
assert 3036 == RIGHT + 300, '确认窗 3036 != right %d+300' % RIGHT
# ③ 首错演出锁 ≤ wrong+150=3030（b37 R3：锁禁覆盖豁免窗——留「对选放行」活跃段）
assert 1200 * 1 + 140 <= WRONG + 150, '干扰卡晃锁总窗 1340 > wrong+150=%d（b37 R3 总窗口径，审查 m-1 修）' % (WRONG + 150)
# ④ 题面链窗（N2 总窗口径）：=目标名 max 2232+段间 150+estMs(模板 7 字)=3015+尾 300=5697
# presentQuiz 锁窗=ENTER 400+5697=6097（出场与链并行段+链全长）
assert 5697 == GOAL_MAX + 150 + est_ms(TMPL_LEN) + 300, '题面链窗 5697 总式验算失败'
assert 6097 == 400 + 5697, 'presentQuiz 锁窗 6097 != 出场 400+链窗 5697'
assert est_ms(7) == 3015, 'estMs 静态验算失败（模板 7 字「帮小兔子拆一拆」）'
# ⑤ 教学延窗（watch 3708≥3408+300 / turn 2076≥1776+300 防尾截）
assert 3708 >= WATCH + 300 and 2076 >= TURN + 300
# ⑥ winFlow celebrate 2620+补窗 500=3120 ≥ right 2736+300=3036（家族 H——brk right
# 长于家族先例，libr 的 400 补窗 3020<3036 不够，本款定 500）
assert 2620 + 500 >= RIGHT + 300, 'celebrate 3120 < %d+300' % RIGHT
assert 'await wait(500);' in main, 'main winFlow celebrate 后补窗 500 缺失（brk_right 2736）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 审查 R4 补）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_QUESTIONS' in verif and 'SPEC_GOALS' in verif, 'verify 缺题库/定表独立硬编码表（单元⑥）'
assert 'mulberry32V' in verif and 'pickQuizV' in verif, 'verify 缺独立 rng/构建复算（单元⑧）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', "classList.contains('gone')", "classList.contains('filled')",
            'dataset.i', 'slotAt', 'cardAt', 'dataset.kind'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert "querySelector('.slot[data-k=\"" in main, 'main 缺槽下标选择器（契约 M）'
assert "querySelector('.tcard[data-i=\"" in main, 'main 缺卡下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s；名义值累加——第 3 张 fire 不 await）=====
# tutorialWatch watch 段名义分账：watch 延 3708（≥3408+300）+ 开题演出
# （出场 400+planttree 目标 clip 1872 最短+段间 150+estMs(模板 7 字)=3015+300=5737）
# + 前两张（ghost 移入 800+press 320+fill 演出窗 1000）×2 + 第三张（ghost 1120，
# fire 不等演出）= 3708+5737+2*2120+1120 = 14805 ≤ 16000（教学末步=首题整题完成
# ——demoR='done' 异步实证，gate/verify 轮询断言）
TUT_SUM = 3708 + (400 + 1872 + 150 + est_ms(7) + 300) + 2 * (800 + 320 + 1000) + (800 + 320)
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'FILL_MS * SPEED', 'CELE_WIN * SPEED', 'SHAKE_MS * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>问题拆解小博士</title>' in head, 'head 缺标题 问题拆解小博士'

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
print('estMs check: wrong-chain 3330 (=%d+150+300 exact); cele-win 3036 == %d+300 (exact); '
      'shake 1200 <= %d (b37 R3); present-tts 5697 == %d+150+%d+300 (N2 total); '
      'tut-budget %dms <= 16000 (3rd-fire)' % (WRONG, RIGHT, WRONG + 150, GOAL_MAX, est_ms(7), TUT_SUM))
