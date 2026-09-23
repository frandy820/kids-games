# -*- coding: utf-8 -*-
"""thanks 感谢的话 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch37/thanks/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch37/thanks/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r12：th_ 5 条 + tha_ 4 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('thanks') 全量返回（manifest games 已含 thanks 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('thanks')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：th_ 5（一字不改）+ tha_ 4（r12 新增）+ core 3 = 12 条
# （SPEC-BATCH37 §4/§7；前缀=th_/tha_ 已核 manifest 无占用 2026-09-12/09-15 实查）
TH_KEYS = ['th_tut_watch', 'th_tut_turn', 'th_hint', 'th_right', 'th_wrong']
TH_SC_KEYS = ['th_sc_%d' % i for i in range(1, 21)]              # T46：题面情景句 20 键
THA_KEYS = ['tha_fit', 'tha_not', 'tha_gray', 'tha_ok']   # r12：择优锚/反向锚/灰反馈/反向错反馈
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in TH_KEYS + THA_KEYS + TH_SC_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 32, 'clips 条数 %d != 32（th 5 + tha 4 + th_sc 20 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 th_*/tha_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('th') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 th_/tha_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('th') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'thanks'" in main, 'main 缺 KIDS.init thanks（存档键 kidsgame_thanks）'
assert 'window.TH =' in main, 'main 缺 TH 钩子'
assert '__thDemoR' in main, 'main 缺教学演示实证 __thDemoR'
assert '__thTutSolo' in main, 'main 缺教学帮→独实证 __thTutSolo'
assert 'setFriendMood' in main, 'main 缺朋友表情态函数 setFriendMood（契约 M DOM 类层）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH37 §0.88：seeded mulberry32(flat*7919+727)——本款常量 727）
assert 'flat * 7919 + 727' in engine, 'engine 缺本款常量 seed 727（SPEC §0.88）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(cardsEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.thanks.tutSeen）
assert 'sv.thanks && sv.thanks.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=4434）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
# r12 增灰链/反向错反馈豁免窗（GRAY_WIN/ANTI_OK_WIN——grayChainUntil 与坏链窗分离）
assert 'const WRONG_CHAIN_WIN = 4434' in data, 'data 缺错链豁免窗常量 4434（SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil || Date.now() < grayChainUntil) return;' in main, \
    'main 救援 interval 缺双链豁免守卫（契约 I r12：坏链+灰链）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0; grayChainUntil = 0;' in main, \
    'main startLevel 缺链豁免/节流锚重置（契约 I/J r12 双窗）'
assert 'grayChainUntil = Date.now() + gWin' in main, 'main 缺灰链豁免窗赋值（契约 I r12）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil' in main and \
       'grayChainUntil && Date.now() < grayChainUntil' in main, \
    'main 缺豁免窗 guard（I 补 r12：双窗错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：本款题面情景句走 voice.say（非队列链——SPEC §1 明示 N 不适用）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面 T46 化全 clip，N 防误用）' % _src_name
    assert 'key: null' not in _s and 'key:null' not in _s, 'game-%s 含 key 空缺带 text 的 TTS 段字面（零 keyless 政策）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.88/§7 演出时序常量：出场 400/朋友开心窗 2124/坏卡锁 1100/教学延窗
# + r12 四窗（择优锚 3108/反向锚 3060/灰链 3180/反向错反馈 3492）
for frag in ('const ENTER_MS = 400', 'const CELE_WIN = 2124', 'const SHAKE_MS = 1100',
             'const TUT_WATCH_WAIT = 3210', 'const TUT_TURN_WAIT = 2124',
             'const PICK_WIN = 3108', 'const NOT_WIN = 3060',
             'const GRAY_WIN = 3180', 'const ANTI_OK_WIN = 3492'):
    assert frag in data, 'data 缺 SPEC §4/§7 演出常量 %s' % frag
# r12 时长模型常量（SPEC §7；与 verify 独立副本三方同步）
for frag in ("const DECIDE_MS = { fit: 10000, size: 10000, anti: 11500 }",
             'const ADV_MS = CELE_WIN', 'const LEVEL_MIN_MS = 40000',
             'const quizDurMs', 'const levelDurMs'):
    assert frag in data, 'data 缺 r12 时长模型素材 %s（SPEC §7）' % frag
# r12 卡模型与题型分流素材（tier/kind/answerTierOf/单章池）
assert "tier: c.tier" in engine and 'answerTierOf' in engine, 'engine 缺 tier 模型/答案档分流（r12）'
assert 'poolOfDch' in engine and 'TIERS_OF' in engine, 'engine 缺单章池/tier 分布先验表（r12）'
assert 'kind: row.kind' in engine, 'engine 缺 kind 字段透传（r12）'
# r12 反馈分流素材（meh 半好态/框架锚分流/题型提示分流）
assert "setFriendMood('meh')" in main, 'main 缺半好态 meh 分流（r12 delta①②反馈）'
assert 'anchorOf(q.kind)' in main and 'anchorWinOf' in main, 'main 缺框架锚按题型分流（r12）'
assert 'function dirVoice()' in main, 'main 缺提示按题型分流 dirVoice（r12）'
assert "classList.add('gray')" in main, 'main 缺灰卡轻降饱和类（r12）'
# r12 aria 统一（tier 不进 DOM 可读层——不泄答案）
assert "'做法 ' + c.label" in main, 'main 缺 aria 统一前缀（r12 不泄 tier）'
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCard 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCard 演出期 null）'
# T46 化（2026-09-19）：题面情景句全量 play 化（comfort 同范式）——开题+重播两处
assert main.count('KIDS.voice.play(sayClipOf(q), q.say);') == 2,     'main 题面情景句 play 应 2 处（开题+重播），实得 %d' % main.count('KIDS.voice.play(sayClipOf(q), q.say);')
assert 'KIDS.voice.say(q.say)' not in main, 'main 题面情景句仍残留 keyless say'
assert "const sayClipOf = q => SAY_CLIP[q.say]" in data, 'data 缺 sayClipOf 键函数（T46 th_sc）'
# 确认链=th_right 单 clip（SPEC §4）
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH37 §4/§7 实长表）=====
est_ms = lambda n: n * 345 + 600
import re as _re
TH_SAYS = {i + 1: t for i, t in enumerate(_re.findall(r"say: '([^']+)'", data))}   # 20 句行序（gen 注册序同）
assert len(TH_SAYS) == 20, 'SCENES say 行数 %d != 20' % len(TH_SAYS)
TH_WATCH, TH_TURN = 2904, 1824                  # th_tut_watch / th_tut_turn 实长
TH_RIGHT, TH_WRONG, TH_HINT = 1824, 2040, 1944  # 实长（SPEC §4 实长表）
THA_FIT, THA_NOT = 2808, 2760                   # r12 实长（2026-09-15 浏览器 Audio 实测）
THA_GRAY, THA_OK = 2880, 3192
# T46 化：20 键实长 python 双录（verify SPEC_TH_SC 同值——防漂）；逐句 estMs ≥ clip（窗不动充分性）
TH_SC_DUR = { 1: 2856, 2: 2880, 3: 2784, 4: 2832, 5: 3120, 6: 2544, 7: 2544, 8: 2784,
              9: 2376, 10: 2664, 11: 2784, 12: 2616, 13: 2808, 14: 2376, 15: 2736,
              16: 2688, 17: 2856, 18: 2832, 19: 2400, 20: 2328 }
SAY_MAX = 10                                    # 最长情景句全字符数（'下雨小鹿老师给你撑伞'/'小松鼠抢走了你的玩具'）
SAY_TUT = 9                                     # 教学演示题句长（scene1 '小鹿老师帮你修小车'）
# ① 确认窗（朋友开心演出）：CELE_WIN 2124 == right 1824+300 精确（家族 H）
assert 2124 == TH_RIGHT + 300, '确认窗 2124 != right %d+300' % TH_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=wrong 2040+150+hint 1944+300=4434（SPEC §4 精确值）
assert 4434 == TH_WRONG + 150 + TH_HINT + 300, '链豁免窗 4434 != 错链 %d+150+%d+300' % (TH_WRONG, TH_HINT)
# ②b r12 四窗精确式（SPEC §7：全部=实长+300）
assert 3108 == THA_FIT + 300, '择优锚窗 3108 != tha_fit %d+300' % THA_FIT
assert 3060 == THA_NOT + 300, '反向锚窗 3060 != tha_not %d+300' % THA_NOT
assert 3180 == THA_GRAY + 300, '灰链窗 3180 != tha_gray %d+300' % THA_GRAY
assert 3492 == THA_OK + 300, '反向错反馈窗 3492 != tha_ok %d+300' % THA_OK
# ③ 题面 say 窗（家族 T 动态）：estMs(10)=4050（estMs 全字符口径在场；estMs 四方同步之一）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(SAY_MAX) == 4050 and est_ms(SAY_TUT) == 3705, 'estMs 静态验算失败'
# ③-T46 20 句逐句上界：estMs(句长)+300 ≥ clip 实长（窗不动零 pacing 回归的充分性证明）
assert all(est_ms(len(_t)) + 300 >= TH_SC_DUR[_i] for _i, _t in TH_SAYS.items()),     'th_sc 存在 clip 超过 estMs+300 的句子（窗须重估）'
# ③b r12 时长模型语音窗不撑时长（最长句 10 字恒 ≤ DECIDE：fit/size 7858<10000/anti 7810<11500）
VOICE_WIN_MAX = 400 + est_ms(SAY_MAX) + 300 + 3108
assert VOICE_WIN_MAX <= 10000, 'r12 模型前提破坏：最长语音窗 %d > DECIDE fit/size 10000' % VOICE_WIN_MAX
assert 400 + est_ms(SAY_MAX) + 300 + 3060 <= 11500, 'r12 模型前提破坏：anti 最长语音窗 > 11500'
# ④ 教学延窗（watch 3210≥2904+300 / turn 2124≥1824+300 防尾截）
assert 3210 >= TH_WATCH + 300 and 2124 >= TH_TURN + 300
# ⑤ winFlow celebrate 2620+400=3020 ≥ right 1824+300=2124（家族 H）
assert 2620 + 400 >= TH_RIGHT + 300, 'celebrate 3020 < %d+300' % TH_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（th_right 1824）'
# ⑥ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 审查 R4 补）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_TH_SC' in verif and 'specKeyOf' in verif, 'verify 缺 SPEC_TH_SC/specKeyOf 素材（T46）'
assert 'SPEC_SCENES' in verif, 'verify 缺题库独立硬编码表 SPEC_SCENES（单元⑨）'
# r12 verify 增量素材：翻转表/独立时长副本/kind 锚/竖屏类通道/anti 反查
for lit in ('FLIP', 'V_DECIDE', 'dataset.kind', "classList.toggle('port'", 'waitGrayOver',
            'deriveAnswerV(q.cards, q.kind)', 'tha_not'):
    assert lit in verif, 'verify 缺 r12 断言素材 %s（SPEC §7）' % lit

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', 'classList.contains(\'sad\')', 'classList.contains(\'happy\')',
            "classList.contains('good')", '__lastSayText', 'dataset.i', '.card-wrap[data-i='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.card-wrap[data-i=" in main, 'main 缺卡下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加）=====
# r12 分账：watch 延 3210（≥2904+300）+ 开题演出（出场 400+estMs(scene1 句 9 字)
# =3705+300=4405 + 框架锚窗 PICK_WIN 3108 串播）+ ghost 移入 800+press 320
# + demo 演出窗 2124（罩确认链 1824+300 精确）= 13967 ≤ 16000
TUT_SUM = 3210 + (400 + est_ms(SAY_TUT) + 300) + 3108 + 800 + 320 + 2124
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED', 'CELE_WIN * SPEED',
            'ancWin * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学题句长受控（scene1=9 字——预算锚与实现绑定；SAY_MAX 10 字=正式关最长句）
assert '小鹿老师帮你修小车' in data and len('小鹿老师帮你修小车') == SAY_TUT
assert '下雨小鹿老师给你撑伞' in data and len('下雨小鹿老师给你撑伞') == SAY_MAX
assert '小松鼠抢走了你的玩具' in data and len('小松鼠抢走了你的玩具') == SAY_MAX

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>感谢的话</title>' in head, 'head 缺标题 感谢的话'

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
print('r12 windows: wrong-chain 4434 / cele 2124 / pick 3108 / not 3060 / gray 3180 / anti-ok 3492 (all exact); '
      'say-win estMs(10)+300+400=%d; tut-budget %dms <= 16000' % (est_ms(SAY_MAX) + 700, TUT_SUM))
