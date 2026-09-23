# -*- coding: utf-8 -*-
"""libr 分类归档小图书 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch38/libr/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch38/libr/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（在册 lb_ 13 条+core_* 3 条，manifest 对账——R48 段二终态：
# lb_d2_* 4+lb_pick_* 4 已注册（manifest 5517），旧 lb_dim_* 4 键已退役清退
# （代码孤儿——维度句改版 lb_d2_* 后不再引用），12-4+8=16）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('libr') 全量返回（manifest games 已含 libr 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
# R48 两段制销账（2026-09-22 段二）：段一断言 n=12（含 lb_dim_* 4 滞留注入）；
# 注册+退役后 16=lb_ 13（5 通用+lb_d2 4+lb_pick 4）+core 3——SPEC-R48 §R7 已销账
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('libr')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：在册 16 条（lb_ 13+core 3）——R48 段二注册后口径（2026-09-22：
# lb_d2_*/lb_pick_* 8 键已注册注入；lb_dim_* 4 键已退役清退，manifest 实查 0 在册）
# 退役联动防呆：clips 内禁再出现 lb_dim_*（孤儿键回流=退役失败）
LB_KEYS = ['lb_tut_watch', 'lb_tut_turn', 'lb_hint', 'lb_right', 'lb_wrong',
           'lb_d2_farm', 'lb_d2_eat', 'lb_d2_pet', 'lb_d2_wear',
           'lb_pick_animal', 'lb_pick_food', 'lb_pick_clothes', 'lb_pick_vehicle']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in LB_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for k in ('lb_dim_farm', 'lb_dim_eat', 'lb_dim_pet', 'lb_dim_wear'):
    assert '"%s"' % k not in clips, '退役键 %s 仍在 clips 注入（lb_dim_* 已清退）' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 16, 'clips 条数 %d != 16（lb 13 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 lb_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('lb_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 lb_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('lb_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'libr'" in main, 'main 缺 KIDS.init libr（存档键 kidsgame_libr）'
assert 'window.LB =' in main, 'main 缺 LB 钩子'
assert '__lbDemoR' in main, 'main 缺教学演示实证 __lbDemoR'
assert '__lbTutSolo' in main, 'main 缺教学帮→独实证 __lbTutSolo'
assert 'addBookTo' in main, 'main 缺书立起函数 addBookTo（契约 M 演出层：格内卡堆叠可视化）'
assert 'get tutorial' in main, 'main 缺 LB.tutorial getter（gate G2 教学态轮询）'
# R48 双题型引擎锚：点卡入口/盘事件分流/答案体定位（SPEC-R48 §R5）
assert 'function engTapCard(L, i)' in engine, 'engine 缺点卡引擎 engTapCard（R48 pick 题）'
assert 'tapCard(i) { return uiTapCard(i); }' in main, 'main 缺 LB.tapCard 钩子（R48）'
assert "e.target.closest('.tray-card')" in main, 'main 缺挑书盘事件分流（R48）'
assert 'const answerElOf' in main, 'main 缺答案体定位 answerElOf（救援/梯度分流）'
assert 'uiTapCard(q.answer) : await uiTapShelf(q.answer)' in main, 'main autoSolve 缺双题型分流（R48）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH38 §0.92：seeded mulberry32(flat*7919+837)——本款常量 837）
assert 'flat * 7919 + 837' in engine, 'engine 缺本款常量 seed 837（SPEC §0.92）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(shelfEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.libr.tutSeen）
assert 'sv.libr && sv.libr.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=4170）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 4170' in data, 'data 缺错链豁免窗常量 4170（SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：本款题面提示句走 voice.play 章键（T46 阶段2 clip 化——SPEC §2）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.play，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.92 演出时序常量：出场 400/书立起 1000/确认窗 1836/卡弹回锁 1100/教学延窗
for frag in ('const ENTER_MS = 400', 'const SHELVE_MS = 1000', 'const CELE_WIN = 1836',
             'const BOUNCE_MS = 1100', 'const TUT_WATCH_WAIT = 3276', 'const TUT_TURN_WAIT = 2076'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapShelf 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapShelf 演出期 null）'
# 题面=voice.play 章键 clip 化（R48：lb_hint 在册/lb_d2_*·lb_pick_* 新键未注册静默）+
# 方向级反馈=错链播毕重读题面句（hintResayTimer）
assert 'KIDS.voice.play(q.sayKey, q.say)' in main, 'main 缺题面提示句 play（lb_hint/lb_d2_*/lb_pick_ clip）'
assert 'hintResayTimer' in main and 'WRONG_CHAIN_WIN + 60' in main, 'main 缺方向级反馈延时重读题面句（SPEC §2/R48）'
# 确认链=lb_right 单 clip（SPEC §4）
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'
# R48 维度句表（去泄漏版——只述分类标准不念主题名）+维度裁定定约+挑书句表
# （SPEC-R48 §R4；新键 lb_d2_*/lb_pick_* 段一只设计不注册——三源一致对账锚）
assert "farm: '它住在农场里'" in data and "eat:  '我们能吃它'" in data and \
       "pet:  '它是我们的好朋友'" in data and "wear: '天冷了要穿上它'" in data, 'data 缺 R48 维度句表（去泄漏版）'
assert "const DIM2_TARGET = { farm: 'animal', eat: 'food', pet: 'animal', wear: 'clothes' }" in data, \
    'data 缺维度裁定定约 DIM2_TARGET（SPEC-R48 §R4 两义性收口）'
assert "animal:  '帮动物格挑一本新书'" in data and "food:    '帮食物格挑一本新书'" in data and \
       "clothes: '帮衣物格挑一本新书'" in data and "vehicle: '帮交通格挑一本新书'" in data, 'data 缺挑书句表（R48 pick）'
assert "lb_d2_farm" in data and "lb_d2_eat" in data and "lb_d2_pet" in data and "lb_d2_wear" in data, \
    'data 缺维度句新键表 lb_d2_*（R48 §R7）'
assert "lb_pick_animal" in data and "lb_pick_food" in data and "lb_pick_clothes" in data and "lb_pick_vehicle" in data, \
    'data 缺挑书句新键表 lb_pick_*（R48 §R7）'
# R48 题库：冲突行 11/20>半（AUDIT-67「冲突卡升半数以上」）+pick 行 5 张（§R4 定约）
import re as _re
_hint_rows = _re.findall(r"hint: '(farm|eat|pet|wear)'", data)
_pick_rows = _re.findall(r"\{ pick: '(\w+)',\s*cards: \[", data)
assert len(_hint_rows) == 11, 'data 冲突行 %d != 11（SPEC-R48 §R4 冲突升半数以上）' % len(_hint_rows)
assert len(_pick_rows) == 5, 'data pick 行 %d != 5（SPEC-R48 §R4 ch4 跨维二级题）' % len(_pick_rows)
assert _pick_rows.count('food') == 2 and _pick_rows.count('clothes') == 1 and \
       _pick_rows.count('animal') == 1 and _pick_rows.count('vehicle') == 1, 'pick 目标分布与 SPEC-R48 §R4 不符'
assert "{ pick: 'food',    cards: ['apple', 'rabbit', 'train'] }" in data and \
       "{ pick: 'clothes', cards: ['scarf', 'dog', 'bus'] }" in data and \
       "{ pick: 'animal',  cards: ['elephant', 'bread', 'shoe'] }" in data and \
       "{ pick: 'vehicle', cards: ['plane', 'milk', 'hat'] }" in data and \
       "{ pick: 'food',    cards: ['carrot', 'bird', 'sweater'] }" in data, 'data pick 候选集与 SPEC-R48 §R4 不符'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH38 §4 实长表）=====
est_ms = lambda n: n * 345 + 600
LB_WATCH, LB_TURN = 2976, 1776                  # lb_tut_watch / lb_tut_turn 实长
LB_RIGHT, LB_WRONG, LB_HINT = 1536, 1728, 1992  # 实长（SPEC §4 实长表）
# ① 确认窗（书立起+确认链）：CELE_WIN 1836 == right 1536+300 精确（家族 H）
assert 1836 == LB_RIGHT + 300, '确认窗 1836 != right %d+300' % LB_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=wrong 1728+150+hint 1992+300=4170（SPEC §4 精确值）
assert 4170 == LB_WRONG + 150 + LB_HINT + 300, '链豁免窗 4170 != 错链 %d+150+%d+300' % (LB_WRONG, LB_HINT)
# ③ 首错演出锁 ≤ wrong+150=1878（b37 R3：锁禁覆盖豁免窗——留「对选放行」活跃段）
assert 1100 <= LB_WRONG + 150, '卡弹回锁 1100 > wrong+150=%d（b37 R3）' % (LB_WRONG + 150)
# ④ 题面提示句窗（家族 T 动态，R48 句长域）：普通句 6 字 estMs 2670 /
# 维度句 5-8 字 estMs 2325-3360 / pick 句 9 字 estMs 3705（estMs 全字符口径在场；
# 新键 est 上界口径——注册后主线实测复核 TODO）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(5) == 2325 and est_ms(6) == 2670 and est_ms(7) == 3015 and \
       est_ms(8) == 3360 and est_ms(9) == 3705, 'estMs 静态验算失败（R48 句长域）'
# ⑤ 教学延窗（watch 3276≥2976+300 / turn 2076≥1776+300 防尾截）
assert 3276 >= LB_WATCH + 300 and 2076 >= LB_TURN + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 1536+300=1836（家族 H）
assert 2620 + 400 >= LB_RIGHT + 300, 'celebrate 3020 < %d+300' % LB_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（lb_right 1536）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 审查 R4 补）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_QUESTIONS' in verif, 'verify 缺题库独立硬编码表 SPEC_QUESTIONS（单元⑥）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', "classList.contains('good')", "classList.contains('fly')",
            '__lastSayText', 'dataset.i', '.shelf-slot[data-i=', 'book-in', '.bk'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.shelf-slot[data-i=" in main, 'main 缺格下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加）=====
# tutorialWatch watch 段名义分账：watch 延 3276（≥2976+300）+ 开题演出
# （出场 400+estMs(普通句 6 字)=2670+300=3370）+ ghost 移入 800+press 320
# + demo 演出窗 2836（书立起 1000+确认链 1536+300 精确）= 10602 ≤ 16000
TUT_SUM = 3276 + (400 + est_ms(6) + 300) + 800 + 320 + (1000 + 1836)
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'CELE_WIN * SPEED', 'SHELVE_MS * SPEED', 'BOUNCE_MS * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学题句长受控（row0 小猫=普通句 6 字——预算锚与实现绑定；R48 pick 句=9 字）
assert len('它住哪一格呢') == 6 and "'它住哪一格呢'" in data.replace('const NORM_HINT = ', '')
assert '它住哪一格呢' in data and len('它住哪一格呢') == 6
# R48 句表字数全录（est 口径独立验算——5/6/7/8/9 字，r48-fix m5 勘正：pick 句 9 字原误写 10）
assert '它住在农场里' in data and len('它住在农场里') == 6
assert '我们能吃它' in data and len('我们能吃它') == 5
assert '它是我们的好朋友' in data and len('它是我们的好朋友') == 8
assert '天冷了要穿上它' in data and len('天冷了要穿上它') == 7
assert '帮动物格挑一本新书' in data and len('帮动物格挑一本新书') == 9

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>分类归档小图书</title>' in head, 'head 缺标题 分类归档小图书'

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
print('estMs check: wrong-chain 4170 (exact); cele-win 1836 == 1536+300 (exact); shelve 1000+1836=2836; '
      'bounce 1100 <= %d (b37 R3); say-win estMs(6)+300+400=%d; tut-budget %dms <= 16000' % (LB_WRONG + 150, est_ms(6) + 700, TUT_SUM))
