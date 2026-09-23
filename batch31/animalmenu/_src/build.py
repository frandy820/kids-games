# -*- coding: utf-8 -*-
"""animalmenu 动物三餐菜单 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch31/animalmenu/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch31/animalmenu/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（anm_ 43 条 = v1+r11 39 + T46 语义句 4 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('animalmenu')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：anm_ 43 条（v1 通用 7+名音×16 + r11 句 7+名音×9 + T46 语义句 4）+ core 3 条 = 46 条
# （SPEC-BATCH31 §4 v1+r11 实长表 + T46 ffprobe）；前缀=anm_ 已核 manifest 无占用（b28 撞前缀双事故立规）
ANM_ANIMALS = ['rabbit', 'panda', 'monkey', 'cat', 'dog', 'mouse', 'bear', 'squirrel',
               'wolf', 'sheep']
ANM_FOODS = ['carrot', 'bamboo', 'banana', 'fish', 'bone', 'cheese', 'honey', 'pinecone',
             'apple', 'greens', 'berry', 'meat', 'grass', 'corn', 'acorn']
ANM_KEYS = ['anm_tut_watch', 'anm_tut_turn', 'anm_hint', 'anm_right', 'anm_wrong',
            'anm_q1', 'anm_q2',
            'anm_q_multi', 'anm_q_diet', 'anm_q_chain', 'anm_less', 'anm_more',
            'anm_h_diet', 'anm_h_chain',
            'anm_again_food', 'anm_again_who', 'anm_again_diet', 'anm_again_chain'] + \
           ['anm_n_' + w for w in ANM_ANIMALS + ANM_FOODS]   # T46 阶段2：四题型语义句 clip 化
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in ANM_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 46, 'clips 条数 %d != 46（anm 43 + core 3）' % n_clips
# 注入键前缀对账：只允许 anm_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('anm_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 anm_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('anm_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'animalmenu'" in main, 'main 缺 KIDS.init animalmenu（存档键 kidsgame_animalmenu）'
assert 'window.AN =' in main, 'main 缺 AN 钩子'
assert '__anDemoR' in main, 'main 缺教学演示实证 __anDemoR'
# 本批常量锚（SPEC-BATCH31 §0.76：seeded mulberry32(flat*7919+313)）
assert 'flat * 7919 + 313' in engine, 'engine 缺本批常量 seed 313（SPEC §0.76）'
# r11 提交制引擎契约（iftrain v2/weather v2 先例）
assert "const isSubmitKind = k => k === 'multifood'" in engine, 'engine 缺 isSubmitKind（r11 提交制）'
assert 'function engSubmit(' in engine, 'engine 缺 engSubmit（r11 提交判定）'
assert 'function nextNeededIdx(' in engine, 'engine 缺 nextNeededIdx（r11 救援/教学帮指）'
assert 'wrong_more' in engine and 'wrong_less' in engine, 'engine 缺提交分型 wrong_more/wrong_less'
assert 'DISTRACT_OK' in engine, 'engine 缺干扰公平表 DISTRACT_OK（r11）'
# r11 提交通路 UI 契约
assert "goBtn = $id('btn-go')" in main, 'main 缺 goBtn 绑定（r11 提交通路）'
assert 'async function uiSubmit(' in main, 'main 缺 uiSubmit（r11 提交通路）'
assert "function updateGoBtn(" in main and 'function syncHeld(' in main, 'main 缺勾选态同步（r11）'
assert '<button id="btn-go"' in head, 'head 缺 #btn-go 提交钮（r11）'
# 家族契约 A（r11 升级，weather M2/iftrain r3 同款）：两处 dayEnd 均实算 nextHint(lim-1)
assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须恰 2 处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'r11 禁 nextHint(null)（家族 A 已升级为双 lim-1）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.animalmenu.tutSeen）
assert 'sv.animalmenu && sv.animalmenu.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 7800' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7800'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长）— r11 口径 =====
# estMs 口径（b25 定版 r11 字面，家族 T 全字符）：SAPI ~345ms/字 + 600 落地余量（n×345+600）
est_ms = lambda n: n * 345 + 600
assert 'const estMs = n => n * 345 + 600;' in main, 'main 缺 estMs 定版字面（r11 n 形，源+注释+verify 三处同步）'
assert 'const estMs = n => n * 345 + 600;' in verif, 'verify 缺 estMs 定版字面（r11 n 形）'
# 语义句模板逐字钉死（契约 I 下界依据；r11 四式：food 8/who 8/diet 7/chain 8 含逗号）
for frag, n in (('再看看它爱吃什么', 8), ('再想想谁爱吃这个', 8),
                ('再想想它吃什么', 7), ('再想一想，谁吃谁', 8)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（契约 L 豁免前提：本款无数字词）'
# _clipdur31 实测（v1+r11）：全集名音 max 1680=berry / 动物名音 max 1632=sheep / ch1 域动物
# max 1464=squirrel、食物 max 1560=carrot；句 anm_hint 2016/anm_q2 1944/anm_right 2256；
# multifood 双名 max=honey 1368+berry 1680=3048
MAX_FOOD15, MAX_ANIMAL10, MAX_ANIMAL8, MAX_FOOD8 = 1680, 1632, 1464, 1560
ANM_HINT, ANM_Q2, ANM_RIGHT = 2016, 1944, 2256
FOOD_N, WHO_N, DIET_N, CHAIN_N = 8, 8, 7, 8
# ① 确认链（判对拼播）：单名（dietclass/chaindir 域动物 max 1632）→ 演出窗 1600+2800=4400
#   ≥ 2256+150+1632+300=4338；multifood 双名（bear honey+berry=3048）→ 提交窗 1600+4800=6400
#   ≥ 2256+150+3048+300=5754（全 clip 链无 keyless——契约 N）
assert '1600 * SPEED' in main and '2800 * SPEED' in main, 'main 缺判对演出窗 1600+2800（家族 G/H）'
assert '4800 * SPEED' in main, 'main 缺 multifood 提交演出窗 4800（r11 双名确认链）'
assert 1600 + 2800 >= ANM_RIGHT + 150 + MAX_ANIMAL10 + 300,     '判对演出窗 4400 < 单名确认链 %d+150+%d+300' % (ANM_RIGHT, MAX_ANIMAL10)
assert 1600 + 4800 >= ANM_RIGHT + 150 + 1368 + MAX_FOOD15 + 300,     '提交演出窗 6400 < 双名确认链 %d+150+1368+%d+300' % (ANM_RIGHT, MAX_FOOD15)
# ② 错反馈链豁免窗（契约 I，四式均 ≤7800；T46 阶段2 语义句 clip 化——下界从 estMs 字数
#   口径改按 clip 实长推导，ffprobe=SPEC_DUR 口径 food 2664/who 2496/diet 2232/chain 2688）：
#   findfood=2016+150+1464+150+2664+300=6744 / findwho=1944+150+1560+150+2496+300=6600 /
#   dietclass=2016+150+1632+150+2232+300=6480 / chaindir=1584+150+1632+150+2688+300=6504
AGN_FOOD, AGN_WHO, AGN_DIET, AGN_CHAIN = 2664, 2496, 2232, 2688
assert 7800 >= ANM_HINT + 150 + MAX_ANIMAL8 + 150 + AGN_FOOD + 300,     '链豁免窗 7800 < findfood 链 %d+150+%d+150+%d+300' % (ANM_HINT, MAX_ANIMAL8, AGN_FOOD)
assert 7800 >= ANM_Q2 + 150 + MAX_FOOD8 + 150 + AGN_WHO + 300,     '链豁免窗 7800 < findwho 链 %d+150+%d+150+%d+300' % (ANM_Q2, MAX_FOOD8, AGN_WHO)
assert 7800 >= ANM_HINT + 150 + MAX_ANIMAL10 + 150 + AGN_DIET + 300,     '链豁免窗 7800 < dietclass 链 %d+150+%d+150+%d+300' % (ANM_HINT, MAX_ANIMAL10, AGN_DIET)
assert 7800 >= 1584 + 150 + MAX_ANIMAL10 + 150 + AGN_CHAIN + 300,     '链豁免窗 7800 < chaindir 链 1584+150+%d+150+%d+300' % (MAX_ANIMAL10, AGN_CHAIN)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ r11 提交反馈视觉锁（语音 clip 异步 2832/3072，锁只防连点不罩播完）
assert 'wait(500 * SPEED)' in main, 'main 缺 wrong_less 反馈锁 500（r11）'
assert 'wait(600 * SPEED)' in main, 'main 缺 wrong_more 反馈锁 600（r11）'
# ④ clip 实长窗（SPEC-BATCH31 §4 v1+r11 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3500 * SPEED' in main, 'main 缺教学开题链演示延窗 t=3500（anm_tut_watch 3096+300）'
assert 3500 >= 3096 + 300, '教学开题链演示延 3500 < anm_tut_watch 3096+300=3396'
assert '3900 * SPEED' in main, 'main 缺教学开题链演示窗 3900（anm_n_rabbit+150+anm_q1+300=3786）'
assert 3900 >= 1368 + 150 + 1968 + 300, '教学开题链演示窗 3900 < 1368+150+1968+300=3786'
assert '}, 2150);' in main, 'main 教学 turn 后读题延 2150 缺失（anm_tut_turn 1824+300 防尾截）'
assert 2150 >= 1824 + 300, 'turn 后读题延 2150 < anm_tut_turn 1824+300=2124'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（anm_right 2256）'
assert 2620 + 400 >= ANM_RIGHT + 300, 'celebrate 2620+400=3020 < anm_right 2256+300=2556'
# ⑤ verify 页动态断言素材在场（运行时对账，build 只验结构存在）
assert '1600 + 2800' in verif and '1600 + 4800' in verif, 'verify 缺判对/提交窗动态断言'
assert "'anm_n_' + " in verif, 'verify 缺名音键独立断言素材'
# ⑥ T46 阶段2 键段断言素材在场（语义句 clip 化后替代 keylessLast——契约 N 全 clip 化）
for _k46 in ('anm_again_food', 'anm_again_who', 'anm_again_diet', 'anm_again_chain'):
    assert "'%s'" % _k46 in verif, 'verify 缺语义句键段断言 %s（T46 阶段2 替代 keylessLast）' % _k46
assert 'keylessLast' not in verif, 'verify keylessLast 断言应随 T46 clip 化退役'
# ⑦ r11 modeled 时长硬断言素材（认知步主体非演出窗 ≥40000/关）
assert 'M_LEVEL_MIN = 40000' in verif and 'modeledOf' in verif, 'verify 缺 modeled 时长断言（r11 难度门槛）'
assert 'listenMs' in verif and 'wallClock' in verif, 'verify 缺 listen 建模/wall-clock 实测（r11）'

# ===== 契约 L 豁免证据：全款 TTS 句无数字词（本款无数字词——SPEC §0 任务书豁免款）=====
for s in ('再看看它爱吃什么', '再想想谁爱吃这个', '再想想它吃什么', '再想一想，谁吃谁'):
    assert not re.search(r'\d', s)

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.ask', 'g[data-anim]', 'q-text'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data or 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3500（≥3096+300）+ 开题链+ghost 移入窗 3900
# （≥1368+150+1968+300=3786）+ press 320 + demo 演出窗 1600+2800（罩确认链
# 2256+150+1560+300=4266）+ 收尾 300 = 12420 ≤ 16000
TUT_SUM = 3500 + 3900 + 320 + 1600 + 2800 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3500 * SPEED', '3900 * SPEED', '320 * SPEED', '300 * SPEED', '2800 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>动物三餐菜单</title>' in head, 'head 缺标题 动物三餐菜单'

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
print('r11 windows: confirm1 %d+150+%d+300=%d <= 4400; confirm2 %d+150+1368+%d+300=%d <= 6400; '
      'wrong-chain food %d+150+%d+150+%d(+300) <= 7800 / who %d+150+%d+150+%d(+300) <= 7800 / '
      'diet %d+150+%d+150+%d(+300) <= 7800 / chain 1584+150+%d+150+%d(+300) <= 7800; tut-budget %dms <= 16000' %
      (ANM_RIGHT, MAX_ANIMAL10, ANM_RIGHT + 150 + MAX_ANIMAL10 + 300,
       ANM_RIGHT, MAX_FOOD15, ANM_RIGHT + 150 + 1368 + MAX_FOOD15 + 300,
       ANM_HINT, MAX_ANIMAL8, AGN_FOOD,
       ANM_Q2, MAX_FOOD8, AGN_WHO,
       ANM_HINT, MAX_ANIMAL10, AGN_DIET,
       MAX_ANIMAL10, AGN_CHAIN, TUT_SUM))
