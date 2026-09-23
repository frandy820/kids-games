# -*- coding: utf-8 -*-
"""turntake 轮流浇花 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch35/turntake/_src/build.py"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch35/turntake/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
VOICE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice')
CLIPS_DIR = VOICE / 'clips'

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（tt_ 6 条 + core_* 3 条，manifest 对账——SPEC-BATCH35 §4）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, str(VOICE))
    from inject_clips import clips_js
    clips = clips_js('turntake')          # tt_ 6 条（manifest games 含 turntake）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# core 3 条自适应注入（幂等：manifest 已含则跳过防重复注入——任务书定版口径）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
_extra = []
for _k in CORE_KEYS:
    if '"%s"' % _k in clips: continue          # manifest 已登记 turntake，跳过防重复注入
    _p = CLIPS_DIR / (_k + '.mp3')
    assert _p.exists() and _p.stat().st_size >= 800, 'core clip 缺失或过小: %s' % _k
    _b = base64.b64encode(_p.read_bytes()).decode('ascii')
    assert '</script' not in _b
    _extra.append('%s:"data:audio/mpeg;base64,%s"' % (json.dumps(_k), _b))
if _extra:
    assert clips.count('};/*CLIPS-END*/') == 1, 'CLIPS-END 标记异常'
    clips = clips.replace('};/*CLIPS-END*/', ', ' + ','.join(_extra) + '};/*CLIPS-END*/')
# clips 注入断言：tt_ 9 条 + core 3 条 = 12 条（2026-09-13 改造 +tt_order_hint/tt_order_wrong/
# tt_rabbit_wrong 三条——占位 clip 已放 voice/clips/，主线重合成覆盖；gate G3 注入数 12）
# 前缀=tt_ 已核 manifest 无占用（b28 撞前缀双事故立规：新批前缀先查）
TT_KEYS = ['tt_tut_watch', 'tt_tut_turn', 'tt_hint', 'tt_right', 'tt_wrong', 'tt_wait',
           'tt_order_hint', 'tt_order_wrong', 'tt_rabbit_wrong']
for k in TT_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 12, 'clips 条数 %d != 12（tt 9 + core 3）' % n_clips
# 注入键前缀对账：只允许 tt_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('tt_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 tt_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('tt_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'turntake'" in main, 'main 缺 KIDS.init turntake（存档键 kidsgame_turntake）'
assert 'window.TT =' in main, 'main 缺 TT 钩子（b29 坑⑥：真实页同暴露）'
assert '__ttDemoR' in main, 'main 缺教学演示实证 __ttDemoR'
assert 'get tutorial()' in main, 'main 缺 TT.tutorial getter（gate G2 依赖）'
# 本款常量锚（SPEC-BATCH35 §0.85：seeded mulberry32(flat*7919+419)——本款常量 turntake=419）
assert 'flat * 7919 + 419' in engine, 'engine 缺本款常量 seed 419（SPEC §0.85）'
# 回合序列定版串（§0.85 括注枚举：ch1-2 严格交替 [K,R]*4+[K]；存储侧小写 k/r=钩子契约口径）
assert "['k', 'r', 'k', 'r', 'k', 'r', 'k', 'r', 'k']" in engine, 'engine 缺 ch1-2 严格交替定版串'
assert "'K'" not in engine and "'R'" not in engine, 'engine 回合方禁大写存储（主逻辑按小写 k/r 判定）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处'
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(sceneEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.turntake.tutSeen）
assert 'sv.turntake && sv.turntake.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（2026-09-13 改造新算式 1752+150+estMs(7字3015)+300=5217——
# 新句 tt_hint/tt_order_wrong 均 7 字，两链同长取一窗；estMs 口径待主线实测回填）+ 救援守卫 + 重置
assert 'wrongChainUntil = Date.now() + 5217' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=5217'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31 定版）：豁免窗错点吞/对选放行/窗后二错照计 miss
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== engTarget(cur)' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族梯度：miss≥2=应点花 breathe（答案级）；首错方向级=应点花 pulse 一轮
assert 'q._miss >= 2' in main, 'main 缺 miss≥2 应点花 breathe（答案级梯度）'
assert "replayAnim(th, 'pulse')" in main, 'main 缺首错方向级应点花 pulse（定版）'
# 2026-09-13 改造锚：渴度比较+排序判定层在源在场
assert 'engTarget' in engine and 'thirstsOf' in engine, 'engine 缺渴度引擎（thirstsOf/engTarget）'
assert "need = (L.dch >= 3 && q.turn === 'k') ? 3 : 1" in engine, 'engine 缺排序 3 步/单步题判定'
assert 'rabbitWrong = ri(rnd, 1, 3) === 1' in engine, 'engine 缺兔子 seeded 约 1/3 浇错'
# 契约 N：本款全 clip 无 keyless 段（数字/花名零 TTS——SPEC §1 定版）
for _s_name in ('main', 'verif'):
    _s = main if _s_name == 'main' else verif
    assert 'key: null' not in _s, 'game-%s 出现 keyless 段（本款 SPEC §1 全 clip 无 keyless）' % _s_name

# ===== 语音窗静态断言（家族 G/H/I/T + 实长表——2026-09-13 改造口径）=====
# tt_tut_watch/tt_hint 文案已改（9 字/7 字），旧实长仅参考；新句窗按 estMs 口径（len*345+600），
# 主线重合成后回填实测值复核：tut_watch estMs(9)=3705 → 延窗 4100；hint/order_wrong estMs(7)=3015
est_ms = lambda n: n * 345 + 600
TT_TURN, TT_RIGHT, TT_WRONG, TT_WAIT = 1776, 2472, 1752, 2976
TT_WATCH_OLD = 3000          # 旧文案实测（新句 9 字 estMs 3705，延窗按 estMs 取）
TT_HINT_OLD = 2232           # 旧文案实测（新句 7 字 estMs 3015）
TT_HINT_EST = est_ms(7)      # 新句 tt_hint/tt_order_wrong 均 7 字 → 3015
TT_WATCH_EST = est_ms(9)     # 新句 tt_tut_watch 9 字 → 3705
TT_RW_EST = est_ms(10)       # 新句 tt_rabbit_wrong 10 字（含全角逗号）→ 4050（单发不设窗）
# ① 确认链=right 单 clip 2772 → 浇水演出窗 1500+1400=2900 ≥ 2772（家族 G/H；排序中间步短窗 1400 无 clip 不受链约束）
assert '1500 * SPEED' in main and '1400 * SPEED' in main, 'main 缺浇水演出窗 1500+1400（家族 G/H）'
assert 1500 + 1400 >= TT_RIGHT + 300, '浇水演出窗 2900 < 确认链窗 %d+300' % TT_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=1752+150+3015+300=5217（新句 estMs 口径，两链同长）
assert 5217 >= TT_WRONG + 150 + TT_HINT_EST + 300, '链豁免窗 5217 < 错链 %d+150+%d+300' % (TT_WRONG, TT_HINT_EST)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ 抢点链=tt_wait 单发不拼播不设豁免窗（窗 2976+300=3276 仅为 clip 自然窗）；
#    兔子浇错=tt_rabbit_wrong 单发（estMs 4050，纠错回合开放即点不设窗）
assert "KIDS.voice.play(VOICE.wait.key" in main, 'main 缺抢点 tt_wait 单发（不拼播）'
assert "KIDS.voice.play(VOICE.rabbitWrong.key" in main, 'main 缺兔子浇错 tt_rabbit_wrong 单发'
# ④ 兔子回合演出 1.2s（2026-09-13 改造：走位 500+浇水 700——缩短无效等待）
assert '500 * SPEED' in main and '700 * SPEED' in main, 'main 缺兔子演出窗 500+700（1.2s）'
assert 500 + 700 == 1200
# ⑤ clip 实长窗：教学链（watch 新句 9 字 estMs 3705 → 延 4100 ≥ 3705+300）
assert '4100 * SPEED' in main, 'main 缺教学 watch 延窗 4100（tt_tut_watch 新句 estMs 3705+300）'
assert 4100 >= TT_WATCH_EST + 300, '教学 watch 延 4100 < %d+300=4005' % TT_WATCH_EST
assert '}, 2100);' in main, 'main 教学 turn 后读题延 2100 缺失（tt_tut_turn 1776+300 防尾截）'
assert 2100 >= TT_TURN + 300, 'turn 后读题延 2100 < 1776+300=2076'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（tt_right 2472）'
assert 2620 + 400 >= TT_RIGHT + 300, 'celebrate 2620+400=3020 < 2472+300=2772'
# ⑥ estMs 全字符口径在场（家族 T：len*345+600——本款全 clip，estMs 为窗对账口径）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑦ verify 页窗动态断言素材在场
assert 'estMs' in verif and '1500 + 1400' in verif, 'verify 缺窗动态断言'
assert '5217' in verif and 'VERIFY PASS' in verif, 'verify 缺豁免窗静态值/title 协议'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 4100（≥新句 estMs 3705+300）+ ghost 移入 800 + press 320
# + demo 浇水演出窗 2900（罩确认链 2772）+ 兔子演出 1200 = 9320 ≤ 16000
TUT_SUM = 4100 + 800 + 320 + 2900 + 1200
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
# 分账构成常量在场（2900=浇水 1500+1400、1200=兔子 500+700——上面已各自断言）
for lit in ['4100 * SPEED', '800 * SPEED', '320 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚——渴度三档类对账）=====
for lit in ('dataset.i', 'data-anim="head"', 'data-scene="garden"', '.flower.t1', '.flower.t2',
            '.flower.t3', '.drop', '.soil'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="head"' in data, 'game-data 花 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-scene="garden"' in data, 'game-data 花园 SVG 缺 data-scene 锚（契约 M 渲染对账依据）'
assert 'class="soil"' in data and 'class="cracks"' in data, 'game-data 花盆 SVG 缺土色/裂纹锚（渴度土色通道）'

# ===== 轮到指示静态断言（§0.85：双头像亮灯恒在；大箭头 ch1-2 指向，ch3+ 隐藏）=====
assert '#turn-bar.no-arrow #turn-arrow{display:none}' in head, 'head 缺 ch3+ 箭头隐藏规则'
assert '.who.active .avatar' in head, 'head 缺头像亮灯样式（轮到指示恒在）'
assert head.count('data-side="k"') >= 1 and head.count('data-side="r"') >= 1, 'head 缺双头像 data-side 锚'

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>轮流浇花</title>' in head, 'head 缺标题 轮流浇花'

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
print('estMs check: watering win 2900 >= right-chain %d+300=%d; wrong-chain %d+150+%d(+300) <= 5217 (estMs口径待主线回填); '
      'tut-budget %dms <= 16000' % (TT_RIGHT, TT_RIGHT + 300, TT_WRONG, TT_HINT_EST, TUT_SUM))
