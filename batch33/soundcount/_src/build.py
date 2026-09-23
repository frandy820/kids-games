# -*- coding: utf-8 -*-
"""soundcount 听音计数 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch33/soundcount/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch33/soundcount/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（sc_ 13 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('soundcount')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r24 子集式，r20-r23 范式）：16 必备键（sc 13+core 3）精确在册+总数 ≥16
# ——主线注册 r24 新 7 键（sc_ears/sc_q3/sc_n_6-10）后 23 亦过，防注册前后断言漂移
# 前缀=sc_ 已核 manifest 无占用（b28 立规先查，2026-09-11 实查）
SC_KEYS = ['sc_tut_watch', 'sc_tut_turn', 'sc_hint', 'sc_right', 'sc_wrong',
           'sc_q1', 'sc_q2', 'sc_replay'] + ['sc_n_' + str(n) for n in range(1, 6)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SC_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 16, 'clips 条数 %d < 16（必备 sc 13 + core 3）' % n_clips
# 注入键前缀对账：只允许 sc_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('sc_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 sc_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('sc_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'soundcount'" in main, 'main 缺 KIDS.init soundcount（存档键 kidsgame_soundcount）'
assert 'window.SC =' in main, 'main 缺 SC 钩子'
assert '__scDemoR' in main, 'main 缺教学演示实证 __scDemoR'
assert '__scTutSolo' in main, 'main 缺教学帮→独实证 __scTutSolo'
assert '__scBounceN' in main, 'main 缺击序视锚计数 __scBounceN（契约 M）'
# 本批常量锚（SPEC-BATCH33 §0.79：seeded mulberry32(flat*7919+733)——本款常量 733）
assert 'flat * 7919 + 733' in engine, 'engine 缺本款常量 seed 733（SPEC §0.79）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.soundcount.tutSeen）
assert 'sv.soundcount && sv.soundcount.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置（本款窗=3930，SPEC §4）
assert 'wrongChainUntil = Date.now() + 3930' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=3930'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31 定版）：豁免窗错点吞/对选放行/窗后二错照计 miss（guard 挂 uiTapOpt 取 q 后）
# r24：对选判定 phase 感知（countdual 第二步真值=铃卡，correctIdx 求值非静态 q.answer）
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== correctIdx(q)' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# ===== r24 难度改造结构锚（SPEC-R24-SOUNDCOUNT §R3/§R5）=====
assert 'const NUMS_HI' in data, 'data 缺大域带 NUMS_HI（r24 量域 6-10）'
assert "key: 'sc_q3'" in data, 'data 缺 r24 新语音键 sc_q3（countdual 第二步问句）'
assert "key: 'sc_ears'" in data, 'data 缺 r24 新语音键 sc_ears（纯听首次预告）'
assert "'countdual'" in engine, 'engine 缺 countdual 题型（r24 双音色双问）'
assert "if (mix === count) mix = (count === 3 ? 4 : count === 4 ? 3 : 2)" in engine, \
    'engine 缺 countdual 同掷值定值替换（r24 N≠M）'
assert 'pureOf' in main, 'main 缺纯听判定 pureOf（r24 撤视锚）'
assert "'half'" in main, 'main 缺 countdual 第一步 half 分支（r24）'
assert "q.kind === 'countdual' ? q.mix : q.count" in main, \
    'main 缺 countdual 末步名音=铃数三元（r24）'
assert 'doReplay(false, pureOf(cur))' in main, 'main 缺答案级带锚重播分层（r24）'
assert 'doReplay(false, false, true)' in main, 'main 缺方向级 keepIdle（审查M1 r24：不刷 idle 锚防答案级清零）'
assert 'maybeEarsIntro' in main, 'main 缺纯听首次预告 maybeEarsIntro（r24）'
assert 'listening' in head and 'listen-badge' in head, 'head 缺纯听耳徽标样式（r24）'
assert 'SPEC_HI' in verif, 'verify 缺大域带独立对账 SPEC_HI（r24）'
assert "'countdual'" in verif, 'verify 缺 countdual 断言（r24）'
assert 'rescueLvl' in verif, 'verify 缺救援两级单元 rescueLvl（r24 ㉑）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# 契约 L：数字/量词映射表覆盖封闭全集 1-10（TTS 回退文本；r24 扩 6-10——大域确认链名音）
for frag in ('一下', '两下', '三下', '四下', '五下', '六下', '七下', '八下', '九下', '十下'):
    assert "'%s'" % frag in data, 'game-data NUM_TEXT 缺数字名音回退 %s（契约 L）' % frag
# SPEC §0.79：段间 700ms 可数节奏 + 重播 3s 节流
assert 'const HIT_GAP = 700' in data, 'data 缺 HIT_GAP=700（SPEC §0.79 可数节奏）'
assert 'lastReplayAt < 3000' in main, 'main 缺重播 3s 节流（SPEC §0.79）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（本款全链 clip 段=天然安全，循环空过即证）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH33 §4 实长表）=====
est_ms = lambda n: n * 345 + 600
SC_WATCH, SC_TURN = 3144, 1896                  # sc_tut_watch / sc_tut_turn 实长
SC_RIGHT, SC_WRONG, SC_HINT = 2304, 1656, 1824  # sc_right / sc_wrong / sc_hint 实长
SC_Q1, SC_Q2 = 1752, 1848                       # sc_q1 / sc_q2 实长
SC_NAME_MAX = 1440                               # 名音 max（r24 注册后=sc_n_10 实长，_clipdur33）
# ① 确认链（判对拼播：sc_right+150+名音 max 1440）→ 演出窗 1600+3000=4600 ≥ 链+300=4194（SPEC §4）
assert '1600 * SPEED' in main and '3000 * SPEED' in main, 'main 缺判对演出窗 1600+3000（家族 G/H）'
assert 1600 + 3000 >= SC_RIGHT + 150 + SC_NAME_MAX + 300, \
    '判对演出窗 4600 < 确认链 %d+150+%d+300' % (SC_RIGHT, SC_NAME_MAX)
# ② 错反馈链豁免窗（契约 I）：错链=wrong 1656+150+hint 1824+300=3930（SPEC §4 精确值）
assert 3930 == SC_WRONG + 150 + SC_HINT + 300, '链豁免窗 3930 != 错链 %d+150+%d+300' % (SC_WRONG, SC_HINT)
assert 'await wait(3630 * SPEED)' in main, 'main 缺首错链后自动重播延窗 3630（wrong+150+hint）'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms（miss≥2 路径）'
# ③ clip 实长窗（SPEC-BATCH33 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3450 * SPEED' in main, 'main 缺教学演示延窗 3450（sc_tut_watch 3144+300）'
assert 3450 >= SC_WATCH + 300, '教学演示延 3450 < sc_tut_watch 3144+300=3444'
assert '2080 * SPEED' in main, 'main 缺教学问句演示窗 2080（sc_q1 1752+300）'
assert 2080 >= SC_Q1 + 300, '教学问句演示窗 2080 < sc_q1 1752+300=2052'
assert 2200 >= SC_TURN + 300, 'turn 后击段延 2200 < sc_tut_turn 1896+300=2196'
assert '2200 * SPEED' in main, 'main 教学 turn 后击段延 2200 缺失（sc_tut_turn 1896+300 防尾截）'
# 问句窗：基线 2148=max(q1,q2)+300（r24 起由 askWin(q) 求值，字面进 askWin 定义）
assert 2148 >= max(SC_Q1, SC_Q2) + 300, '问句窗 2148 < sc_q2 1848+300=2148'
# r24：问句窗 phase 感知（q3 第二步窗 2600 ≥ 6 字×家族最长字率 369.6+300=2518，SPEC-R24 §R8⑮）
assert '? 2600 : 2148' in main, 'main 缺 askWin 双窗（q3 2600/基线 2148，r24）'
assert 'const askWin' in main, 'main 缺 askWin 求值器（r24 问句窗）'
# r24 维护轮③（审查 m4）：sc_ears 纯听预告窗实长口径（3192+300=3492——原 estMs 4395 收紧，
# _clipdur33 实测回填；宁等勿叠余量 300 防语音压掉头几击）
assert '(3192 + 300) * SPEED' in main, 'main 缺 ears 预告窗 3192+300（r24 维护轮③实长口径）'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（sc_right 2304）'
assert 2620 + 400 >= SC_RIGHT + 300, 'celebrate 2620+400=3020 < sc_right 2304+300=2604'
# ④ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑤ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 3000' in verif, 'verify 缺 estMs 动态断言'
assert "'sc_n_' + " in verif or "'sc_n_3'" in verif, 'verify 缺名音键独立断言素材'
# ⑥ keylessLast 断言素材在场（契约 N：本款全 clip 无 keyless 的运行时对账）
assert 'keylessLast' in verif, 'verify 缺 keylessLast 断言（契约 N/Mj-1）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚+击序视锚）=====
for lit in ('dataset.num', 'dataset.kind', 'data-anim', 'q-text', '__scBounceN',
            'animationstart', '.dot'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'class="dot"' in data, 'game-data 数字卡缺 .dot 圆点锚（圆点数==num 对账依据）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3450（≥3144+300）+ 击段 3×700=2100 + 击后 300
# + 问句演示 2050（≥1752+300）+ ghost 移入 800 + press 320 + demo 演出窗 1600+3000
# （罩确认链 2304+150+1416+300=4170）= 13620 ≤ 16000
TUT_SUM = 3450 + 3 * 700 + 300 + 2080 + 800 + 320 + 1600 + 3000
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3450 * SPEED', '2080 * SPEED', '800 * SPEED', '320 * SPEED',
            '1600 * SPEED', '3000 * SPEED', '2200 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>听音计数</title>' in head, 'head 缺标题 听音计数'

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
print('estMs check: confirm chain %d+150+%d+300=%d <= 4600 right-win; '
      'wrong-chain %d+150+%d+300=3930 (exact); ask-win 2148 >= max(%d,%d)+300; tut-budget %dms <= 16000' %
      (SC_RIGHT, SC_NAME_MAX, SC_RIGHT + 150 + SC_NAME_MAX + 300,
       SC_WRONG, SC_HINT, SC_Q1, SC_Q2, TUT_SUM))
