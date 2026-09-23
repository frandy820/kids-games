# -*- coding: utf-8 -*-
"""etm 表情温度计 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch39/etm/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch39/etm/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（etm_ 45 条=5 系统+etm_sc 40 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('etm') 全量返回（manifest games 已含 etm 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
# r49 两段制已收口（SPEC-R49 §R6 段二销账）：主线已注册 22 新情境句键
# （manifest 5459→5517，etm_sc 40 全注入）并清退 2 孤儿键（paintspill/longwait
# ——场景 r49 退役，manifest 覆写自然掉出+mp3 已删）。在册口径 28→48
# （etm 5 系统+etm_sc 40+core 3）；段一「新键零注册」反向断言已随注册删除。
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('etm')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：etm_ 在册 45 条（5 系统+etm_sc 40=静态 20+扩展池 20——r49 段二
# 22 新键已注册+2 孤儿键 paintspill/longwait 已清退）+ core 3 = 48 条
ETM_KEYS = ['etm_tut_watch', 'etm_tut_turn', 'etm_hint', 'etm_right', 'etm_wrong',
            ] + ['etm_sc_' + s for s in ('flower', 'blocksdown', 'balloonfly', 'thunder', 'singsong', 'fishfloat', 'dooropen', 'coinbank', 'sacktower', 'artshow', 'crayondrop', 'snatchtoy', 'swinggrab', 'castlekick', 'ruinlaugh', 'bookrip', 'funfair', 'friendmove', 'bullyshout', 'stageshow', 'painting', 'shoutloud', 'towertop', 'grabtoy', 'lostmom', 'rainpicnic', 'darkhole', 'grandma', 'nightnoise', 'kitewin', 'stepfoot', 'queuejump', 'interrupt', 'modelcrush', 'tearbook', 'puzzlelost', 'gradfare', 'bigkidpush', 'legobroke', 'racefirst')]
N_CLIPS = 48
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in ETM_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == N_CLIPS, 'clips 条数 %d != %d（etm 在册 %d + core 3）' % (n_clips, N_CLIPS, N_CLIPS - 3)
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 etm_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('etm_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 etm_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('etm_') or k in CORE_KEYS)))
# r49 孤儿键防复活（段二清退后反向断言：paintspill/longwait 场景已退役，禁再注入）
for _gone in ('etm_sc_paintspill', 'etm_sc_longwait'):
    assert '"%s"' % _gone not in clips, 'r49 孤儿键 %s 复活（场景退役应保持清退）' % _gone

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'etm'" in main, 'main 缺 KIDS.init etm（存档键 kidsgame_etm）'
assert 'window.ETM =' in main, 'main 缺 ETM 钩子'
assert '__etmDemoR' in main, 'main 缺教学演示实证 __etmDemoR'
assert '__etmTutSolo' in main, 'main 缺教学帮→独实证 __etmTutSolo'
assert 'get tutorial' in main, 'main 缺 ETM.tutorial getter（gate G2 教学态轮询）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH39 §0.95：seeded mulberry32(flat*7919+867)——本款常量 867）
assert 'flat * 7919 + 867' in engine, 'engine 缺本款常量 seed 867（SPEC §0.95）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(picksEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.etm.tutSeen）
assert 'sv.etm && sv.etm.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=4626）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 4626' in data, 'data 缺错链豁免窗常量 4626（SPEC §4）'
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
# 家族契约 N：本款题面情境句走 voice.play 情境键（T46 阶段2 clip 化——SPEC §2）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.play，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.95/§4 演出时序常量：出场 400/选中演出 1000/确认窗 1932/错反馈锁 1100/教学延窗
for frag in ('const ENTER_MS = 400', 'const PICK_MS = 1000', 'const CELE_WIN = 1932',
             'const BOUNCE_MS = 1100', 'const TUT_WATCH_WAIT = 3540', 'const TUT_TURN_WAIT = 2148'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapPick 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapPick 演出期 null）'
# 题面=voice.play 情境键 clip 化（T46 阶段2）+ 方向级反馈=错链播毕重播情境句（hintResayTimer）
assert "KIDS.voice.play(q.sayKey, q.say)" in main, 'main 缺题面情境句 play（T46 阶段2 etm_sc_ clip）'
assert 'hintResayTimer' in main and 'WRONG_CHAIN_WIN + 60' in main, 'main 缺方向级反馈延时重播情境句（SPEC §2）'
# 确认链=etm_right 单 clip（SPEC §4）
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'
# 温度计升位演出（level 族核心隐喻——DOM 锚 data-lv 素材在场）
assert 'tube.dataset.lv' in main and 'lvNumberOf' in main, 'main 缺水银柱升位演出（SPEC §2 强度隐喻）'
# 教学迷你关关卡模型完整性（b39 自坑防呆：漏 step/retries/done 字段=cur.step undefined
# →quiz 取不到→presentQuiz 提前 return→locked 恒真全链卡死——两迷你关逐一断言）
for _fn in ('tutWatchLevel', 'tutTurnLevel'):
    _seg = main[main.index('function ' + _fn):main.index('function ', main.index('function ' + _fn) + 10)]
    assert 'step: 0, retries: 0, done: false' in _seg, '%s 关卡模型缺 step/retries/done 字段（b39 卡死坑）' % _fn
# SPEC-R49 §R3 题库 40 题情境句全文逐字在场（抽样锚=各族首末句+最长句+新族）
for lit in ("'朋友送你一朵小花'", "'迷路找不到妈妈'", "'有人不小心碰掉了你的蜡笔'",
            "'有人撕了你的故事书还做鬼脸'", "'打雷轰隆隆响'",
            # r49 新句抽样：ch2 间接/ch4 mix/扩展池各族首末+最长 17 字
            "'你的小金鱼不动了，浮在水面上'", "'你的画被选去展览，大家都停下来看'",
            "'绘本被撕坏了，你又气又难过'", "'要上台表演啦，你开心又怕忘动作'",
            "'期待好久的野餐，早上下起了大雨'", "'风筝掉下来好多次，终于飞上了天'",
            "'有人插队，一下站到了你的前面'", "'有人故意踩坏了你拼好的飞机'",
            "'拼图被弄丢了，你又气又想哭'", "'明天要比赛了，你开心又怕输'",
            "'好朋友要搬走了，你为他开心又舍不得'"):
    assert lit in data, 'data 题库缺情境句 %s（SPEC-R49 §R3 全表逐字）' % lit
# r49 题库行数=40（scene 唯一）+ 退役句不在库（paintspill/longwait 场景退役）
_n_rows = len(re.findall(r"\{ scene: '[a-z]+',\s*kind: '(?:face|level|mix)'", data))
assert _n_rows == 40, 'QUESTIONS 行数 %d != 40（r49 库 20→40）' % _n_rows
for _gone in ('paintspill', 'longwait'):
    assert "scene: '%s'" % _gone not in data, '退役场景 %s 仍在题库（r49 五档重排后无题引用）' % _gone
    assert not re.search(r'^\s*%s:' % _gone, data, re.M), '退役场景 %s 的 SCENE_EL 应删除' % _gone
# 封闭集锚（r49：face 4 脸/level 5 档/mix 4 组合）
for lit in ("{ id: 'happy',  name: '开心' }", "{ id: 'scared', name: '害怕' }",
            "{ id: 'l1', name: '有点生气' }", "{ id: 'l2', name: '生气' }",
            "{ id: 'l3', name: '很生气' }", "{ id: 'l4', name: '非常生气' }",
            "{ id: 'l5', name: '要爆发了' }",
            "{ id: 'happy+scared', name: '又开心又害怕', a: 'happy',  b: 'scared' }",
            "{ id: 'angry+sad',    name: '又生气又难过', a: 'angry',  b: 'sad'    }"):
    assert lit in data, 'data 缺封闭集锚 %s（SPEC-R49 §R3 情绪/五档/组合）' % lit
# r49 生成关 dch 分池+族映射（engine 硬性锚——与 verify SPEC_POOL_RANGES/SPEC_CH 对账）
for lit in ('1: [0, 1, 2, 3, 4, 20, 21, 22, 23, 24]', '2: [5, 6, 7, 8, 9, 25, 26, 27, 28, 29]',
            '3: [10, 11, 12, 13, 14, 30, 31, 32, 33, 34]', '4: [15, 16, 17, 18, 19, 35, 36, 37, 38, 39]',
            "const KIND_OF_DCH = { 1: 'face', 2: 'face', 3: 'level', 4: 'mix' };"):
    assert lit in engine, 'engine 缺 r49 分池/族映射锚 %s（SPEC-R49 §R3）' % lit
# r49 mix 双拼脸构造在场（MIX_HALF 半特征+MIX_EL 组装）
assert 'MIX_HALF' in data and 'MIX_EL' in data and 'function mixSvg' in data, 'data 缺 mix 双拼脸构造（r49）'
# r49 五档温度计 CSS（head：data-lv 4/5 高度+5 刻度+竖屏 5 项 2 列；停位 14/34/54/74/93
# ——相邻 Δ=20/20/20/19%，竖版最差 16.5px ≥ 可辨阈值 15px）
for lit in ('#thermo .t-tube[data-lv="1"] .t-mercury{height:14%}',
            '#thermo .t-tube[data-lv="2"] .t-mercury{height:34%}',
            '#thermo .t-tube[data-lv="3"] .t-mercury{height:54%}',
            '#thermo .t-tube[data-lv="4"] .t-mercury{height:74%}',
            '#thermo .t-tube[data-lv="5"] .t-mercury{height:93%}',
            '#thermo .t-tick.tk1{bottom:14%}', '#thermo .t-tick.tk2{bottom:34%}',
            '#thermo .t-tick.tk3{bottom:54%}', '#thermo .t-tick.tk4{bottom:74%}',
            '#thermo .t-tick.tk5{bottom:93%}',
            '#picks[data-n="5"]{display:grid;grid-template-columns:1fr 1fr;gap:8px}'):
    assert lit in head, 'head 缺 r49 五档/5 项布局 CSS %s' % lit   # r49-fix m5：lv2/lv3+tk2/tk3 补全 11 锚（原 7 锚对 <5% 档位漂移不红）

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH39 §4 实长表；b38 R1 总窗口径）=====
est_ms = lambda n: n * 345 + 600
ETM_WATCH, ETM_TURN = 3240, 1848                  # etm_tut_watch / etm_tut_turn 实长
ETM_RIGHT, ETM_WRONG, ETM_HINT = 1632, 2088, 2088  # 实长（SPEC §4 实长表）
# ① 确认窗（选中演出+确认链）：CELE_WIN 1932 == right 1632+300 精确（家族 H）
assert 1932 == ETM_RIGHT + 300, '确认窗 1932 != right %d+300' % ETM_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=wrong 2088+150+hint 2088+300=4626（SPEC §4 精确值）
assert 4626 == ETM_WRONG + 150 + ETM_HINT + 300, '链豁免窗 4626 != 错链 %d+150+%d+300' % (ETM_WRONG, ETM_HINT)
# ③ 首错演出锁 ≤ wrong+150=2238（b37 R3：锁禁覆盖豁免窗——留「对选放行」活跃段；
#    b38 R1 定版总窗口径：BOUNCE_MS*SPEED+尾窗 140 全算——1100+140=1240 ≤ 2238，基准不再 +300）
assert 1100 <= ETM_WRONG + 150, '错反馈锁 1100 > wrong+150=%d（b37 R3）' % (ETM_WRONG + 150)
assert 1100 + 140 <= ETM_WRONG + 150, '首错锁总窗（1100+尾窗140）> wrong+150=%d（b38 R1 总窗口径）' % (ETM_WRONG + 150)
# ④ 题面情境句窗（家族 T 动态）：r49 题表句 6-17 字 estMs 2670-6465（全字符口径在场）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(6) == 2670 and est_ms(8) == 3360 and est_ms(12) == 4740 and est_ms(13) == 5085, 'estMs 静态验算失败（承基线锚）'
assert est_ms(17) == 6465, 'estMs 17 字新最长句验算失败（r49 库 longest=好朋友要搬走了，你为他开心又舍不得）'
assert len('好朋友要搬走了，你为他开心又舍不得') == 17, 'r49 最长句字数锚（含标点 17）'
# ⑤ 教学延窗（watch 3540≥3240+300 / turn 2148≥1848+300 防尾截）
assert 3540 >= ETM_WATCH + 300 and 2148 >= ETM_TURN + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 1632+300=1932（家族 H）
assert 2620 + 400 >= ETM_RIGHT + 300, 'celebrate 3020 < %d+300' % ETM_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（etm_right 1632）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 审查 R4 补）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_QUESTIONS' in verif, 'verify 缺题库独立硬编码表 SPEC_QUESTIONS（单元⑥）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', "classList.contains('good')", "classList.contains('miss')",
            '__lastSayText', 'dataset.i', '.pick[data-i=', '.t-mercury', 'dataset.lv',
            "classList.contains('show')"):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.pick[data-i=" in main, 'main 缺项下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加）=====
# tutorialWatch watch 段名义分账：watch 延 3540（≥3240+300）+ 开题演出
# （出场 400+estMs(row0 花句 8 字)=3360+300=4060）+ ghost 移入 800+press 320
# + demo 演出窗 2932（选中 1000+确认链 1632+300 精确）= 11652 ≤ 16000
TUT_SUM = 3540 + (400 + est_ms(8) + 300) + 800 + 320 + (1000 + 1932)
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'PICK_MS * SPEED', 'CELE_WIN * SPEED', 'BOUNCE_MS * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学演示题句长受控（row0 花=8 字短句——预算锚与实现绑定；题表最长句 17 字=friendmove——r49-fix m3 勘正）
assert len('朋友送你一朵小花') == 8 and "'朋友送你一朵小花'" in data
assert '朋友送你一朵小花' in data and len('朋友送你一朵小花') == 8
assert '有人不小心碰掉了你的蜡笔' in data and len('有人不小心碰掉了你的蜡笔') == 12
assert '有人撕了你的故事书还做鬼脸' in data and len('有人撕了你的故事书还做鬼脸') == 13

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>表情温度计</title>' in head, 'head 缺标题 表情温度计'

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
print('r49: 40 题/5 档/mix 族/clips 在册 %d（etm 45+core 3——段二注册收口）；estMs check: wrong-chain 4626 (exact); '
      'cele-win 1932 == 1632+300 (exact); pick+cele 2932; bounce 1100 <= %d (b37 R3); '
      'say-win estMs(6-17)+300=2970-6765; tut-budget %dms <= 16000' % (N_CLIPS, ETM_WRONG + 150, TUT_SUM))
