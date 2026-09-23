# -*- coding: utf-8 -*-
"""maketen 凑十小铺 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch35/maketen/_src/build.py"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch35/maketen/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
CLIPS_DIR = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（mt_ 6 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('maketen') 全量返回（manifest games 已含 maketen 的
# core_* 3 条自动带上）——下方补注入循环带 `if '"%s"' % k in clips: continue`
# 幂等跳过（任务书定版写法），并以计数断言防双注入
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('maketen')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# 补注入（幂等守卫）：core 3 条若 clips_js 未带回则从 clips 目录手工补；
# 已在场键 `if '"%s"' % k in clips: continue` 幂等跳过——禁双注入（b33 坑③）
MT_KEYS = ['mt_tut_watch', 'mt_tut_turn', 'mt_hint', 'mt_right', 'mt_wrong_more', 'mt_wrong_less',
           'mt_s_add', 'mt_s_eq'] + ['mt_n_%d' % n for n in range(1, 21)]   # T46 化：段键 2+数词 20
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
_extra = []
for k in MT_KEYS + CORE_KEYS:
    if '"%s"' % k in clips: continue          # 幂等：跳过已在场键（禁双注入）
    _extra.append('%s:"data:audio/mpeg;base64,%s"' % (json.dumps(k),
                 base64.b64encode((CLIPS_DIR / (k + '.mp3')).read_bytes()).decode('ascii')))
if _extra:
    clips = clips.replace('/*CLIPS-END*/', ','.join(_extra) + '/*CLIPS-END*/')
    print('supplement inject:', _extra and len(_extra), 'keys')
# clips 注入断言：mt_ 28 条（既有 6+T46 段 2+数词 20）+ core 3 条 = 31 条
# 前缀=mt_ 已核 manifest 无占用（b28 立规先查，2026-09-12 实查；T46 键 09-19 复核）
for k in MT_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 31, 'clips 条数 %d != 31（mt 28 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 mt_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('mt_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 mt_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('mt_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'maketen'" in main, 'main 缺 KIDS.init maketen（存档键 kidsgame_maketen）'
assert 'window.MT =' in main, 'main 缺 MT 钩子'
assert '__mtDemoR' in main, 'main 缺教学演示实证 __mtDemoR'
assert '__mtTutSolo' in main, 'main 缺教学帮→独实证 __mtTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非卡进度）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH35 §0.86：seeded mulberry32(flat*7919+523)——本款常量 523）
assert 'flat * 7919 + 523' in engine, 'engine 缺本款常量 seed 523（SPEC §0.86）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(poolEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.maketen.tutSeen）
assert 'sv.maketen && sv.maketen.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=6018 两链取 max）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 6018' in data, 'data 缺错链豁免窗常量 6018（SPEC §4 两链 max）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.86 演出时序常量：错防重入 1000ms/教学延窗 3564/2076/收银窗 1600+8500/演示窗 1600+8100
# （T46 化 09-19：确认链 clip 化后按实长全域推导扩窗——estMs 口径退役）
for frag in ('const WRONG_MS = 1000', 'const TUT_WATCH_WIN = 3564', 'const TUT_TURN_WIN = 2076',
             'const CELE_MAIN = 1600', 'const CELE_TAIL = 8500', 'const TUT_CELE_TAIL = 8100'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCard 收银演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCard 演出期 null）'
# b34 坑①：miss 在 core 判定层（engTapCard）+UI 防重入 guard 在判定前拦+同构预判
assert 'q._miss++' in engine and 'L.retries++' in engine, 'engine 缺 core 判定层 miss 计数（b34 坑①）'
assert '严格同构' in main, 'main 缺防重入 guard 同构预判注释锚（b34 坑①）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）——T46 化零 keyless 政策：
# 确认尾段=mt_n_*/mt_s_* clip 拼播（原 keyless TTS 全式尾退役），出现 keyless 即 fail
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 出现 keyless 段（T46 化零 keyless 政策）' % _src_name
assert '.concat(formulaParts(q))' in main, 'main 确认链缺 formulaParts 拼播（T46 化）'
assert 'const formulaParts = q =>' in data, 'game-data 缺 formulaParts（T46 化）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH35 §4 实长表；T46 clip 口径 09-19）=====
MT_WATCH, MT_TURN = 3264, 1776                  # mt_tut_watch / mt_tut_turn 实长
MT_RIGHT, MT_HINT = 2472, 2496                  # mt_right / mt_hint 实长
MT_MORE, MT_LESS = 3024, 3072                   # mt_wrong_more / mt_wrong_less 实长
MT_S_ADD, MT_S_EQ = 1152, 1320                  # T46 段键实长（voice/clips Audio 实测 09-19）
MT_N = {1: 1128, 2: 1128, 3: 1224, 4: 1224, 5: 1128, 6: 1152, 7: 1176,        # T46 数词段实长 20 键
        8: 1152, 9: 1128, 10: 1248, 11: 1416, 12: 1368, 13: 1416, 14: 1440,
        15: 1440, 16: 1464, 17: 1440, 18: 1392, 19: 1464, 20: 1416}
SPEC_A = {10: (1, 9), 15: (6, 9), 20: (11, 18)}   # a 域按 target（SPEC §0.86；ch1 2-8 为子集）
def _chain_ms(a, x, t):                          # 6 段链=right+5×150+n[a]+add+n[x]+eq+n[t]+300
    return MT_RIGHT + 5 * 150 + MT_N[a] + MT_S_ADD + MT_N[x] + MT_S_EQ + MT_N[t] + 300
_worst = max(_chain_ms(a, t - a, t) for t in (10, 15, 20)
             for a in range(SPEC_A[t][0], SPEC_A[t][1] + 1))
_demo = _chain_ms(3, 7, 10)                      # 教学演示题 3+7=10（tutWatchLevel 定版锚）
# ① 确认链（T46 化：mt_right+算式 5 段 clip）→ 演出窗 1600+8500=10100 ≥ 全域最坏 10098
assert 'await wait(CELE_MAIN * SPEED)' in main and 'tailWin * SPEED' in main, \
    'main 缺判对演出窗 1600+尾窗（家族 G/H）'
assert _worst == 10098, '全域最坏链应为 10098（t20/a16），实得 %d' % _worst
assert 1600 + 8500 >= _worst, '判对演出窗 10100 < 确认链最坏 %d' % _worst
# ② 错反馈链豁免窗（契约 I）：两链取 max——more 3024+150+2496+300=5970 /
#    less 3072+150+2496+300=6018 → 6018（SPEC §4 精确值）
assert 6018 == max(MT_MORE + 150 + MT_HINT + 300, MT_LESS + 150 + MT_HINT + 300), \
    '链豁免窗 6018 != 两链 max(%d, %d)' % (MT_MORE + 150 + MT_HINT + 300, MT_LESS + 150 + MT_HINT + 300)
# ③ 教学演示演出窗（demo 通道 1600+8100=9700 ≥ demo 链 9642=2472+750+1224+1152+1176+1320+1248+300）
assert 'demo ? TUT_CELE_TAIL : CELE_TAIL' in main, 'main 缺教学演示尾窗 8100（demo 通道）'
assert _demo == 9642, 'demo 链应为 9642（3+7=10），实得 %d' % _demo
assert 1600 + 8100 >= _demo, '教学演示窗 9700 < demo 链 %d' % _demo
# ④ 教学延窗（watch 3264+300=3564 / turn 1776+300=2076 防尾截）
assert 'await wait(TUT_WATCH_WIN * SPEED)' in main, 'main 缺教学 watch 延（mt_tut_watch 3264+300）'
assert 'await wait(TUT_TURN_WIN * SPEED)' in main, 'main 缺教学 turn 延（mt_tut_turn 1776+300）'
assert 3564 >= MT_WATCH + 300 and 2076 >= MT_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（mt_right 2472）'
assert 2620 + 400 >= MT_RIGHT + 300, 'celebrate 2620+400=3020 < mt_right 2472+300=2772'
# ⑤ estMs 口径退役（T46 化：确认链全 clip，估长无消费者——禁死代码回潮；注释提及不禁）
assert 'const estMs' not in main and 's.length * 345 + 600' not in main, \
    'main estMs 定义已退役（T46 化），发现残留死代码'
# ⑥ verify 页 clip 链/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'SPEC_MT_N' in verif and 'keylessLast' in verif and 'chainMs' in verif, \
    'verify 缺 SPEC_MT_N/chainMs/keylessLast 动态断言素材（T46 化）'
assert 'deriveAnswerV' in verif and 'tapRetry' in verif, 'verify 缺 answer 独立复算/300ms 轮询重试素材'
# ⑦ 契约 L：NUMCN 1-20 全量 20 值（2=两/20=二十）双定义在场（运行时全量对账在 verify 单元①）
assert "2: '两'" in data and "20: '二十'" in data and "11: '十一'" in data, 'data NUMCN 缺契约 L 全量锚'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/帧内容/收银相位三层）=====
for lit in ('dataset.n', '.cv', 'gone', 'target-num', 'buddy-num'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-role="buddy"' in head, 'head 伙伴卡缺契约 M 锚 data-role="buddy"'
assert 'data-anim="partner"' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.card[data-i=" in main, 'main 缺卡池相位标签选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加；T46 clip 口径 09-19）=====
# tutorialWatch watch 段名义分账：watch 延 3564（≥3264+300）+ ghost 移入 800 + press 320
# + demo 演出窗 1600+8100=9700（罩 demo 确认链 9642=2472+750+1224+1152+1176+1320+1248+300）
# = 14384 ≤ 16000
TUT_SUM = 3564 + 800 + 320 + 1600 + 8100
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['800 * SPEED', '320 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>凑十小铺</title>' in head, 'head 缺标题 凑十小铺'

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
print('T46 clip check: worst chain %d <= 10100 right-win; demo chain %d <= 9700 demo-win; '
      'wrong-chain 6018 = max(%d, %d) (exact); tut-budget %dms <= 16000' %
      (_worst, _demo,
       MT_MORE + 150 + MT_HINT + 300, MT_LESS + 150 + MT_HINT + 300, TUT_SUM))
