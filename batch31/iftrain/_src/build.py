# -*- coding: utf-8 -*-
"""iftrain 如果下雨 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch31/iftrain/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch31/iftrain/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（rai_ 25 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('iftrain')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：rai_ 27 条（v1 通用 7+名音×12 + r3 新增 6 + T46 语义句 2）+ core 3 条 = 30 条
# （SPEC-BATCH31 §4 + §0.77 v2/r3 增补 + T46 阶段2；前缀=rai_ 已核无占用——b28 撞前缀双事故立规）
RAI_IDS = ['rain', 'sun', 'snow', 'cold', 'hot', 'wind',
           'umbrella', 'sunhat', 'scarf', 'coat', 'fan', 'kite']   # 条件封闭 12（情境 6+装备 6）
RAI_KEYS = ['rai_tut_watch', 'rai_tut_turn', 'rai_hint', 'rai_right', 'rai_wrong',
            'rai_q1', 'rai_q2', 'rai_q_two', 'rai_multi_hint', 'rai_best_hint',
            'rai_conflict_hint', 'rai_less', 'rai_more',
            'rai_again_apply', 'rai_again_back'] + ['rai_n_' + w for w in RAI_IDS]   # T46 语义句 2
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in RAI_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 30, 'clips 条数 %d != 30（rai 27 + core 3）' % n_clips
# 注入键前缀对账：只允许 rai_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('rai_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 rai_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('rai_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'iftrain'" in main, 'main 缺 KIDS.init iftrain（存档键 kidsgame_iftrain）'
assert 'window.IF =' in main, 'main 缺 IF 钩子'
assert '__ifDemoR' in main, 'main 缺教学演示实证 __ifDemoR'
# 家族契约 A（r3 统一，weather M2 先例）：两处 dayEnd（启动+winFlow）均实算 nextHint(lim-1)
assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须恰 2 处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 nextHint(null)（r3 统一 lim-1——weather M2）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.iftrain.tutSeen）
assert 'sv.iftrain && sv.iftrain.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 8000' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=8000'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（core 兜底之外仍须显式）
assert 'button{color:#4A3B2E' in head, 'head 缺自建 button 显式 color（契约 O）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长；r3 v2 口径）=====
# estMs 口径（b25 定版，家族 T 全字符）：SAPI ~345ms/字 + 600 落定余量（n×345+600）
est_ms = lambda n: n * 345 + 600
# 语义句模板逐字钉死（契约 I 下界依据；正向 10 字 / ruleback 9 字）
for frag, n in (('再看看外面是什么天气', 10), ('再想想什么时候用它', 9)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（契约 L 豁免前提：本款无数字词）'
# r3 新增语音句逐字钉死（提交制反馈+题型 hint——与 manifest 严格一致；§0.77 v2）
for frag in ('要带两样呀', '两个天气都要想到哦', '要带两样才够哦',
             '先想一定要带的哦', '还差一样，再找一找哦', '多带了一样，重新挑一挑哦'):
    assert "'%s'" % frag in data or '"%s"' % frag in data, 'game-data 缺 r3 语音句 %s' % frag
    assert not re.search(r'\d', frag), 'r3 语音句 %s 含数字（契约 L）' % frag
# clip 实长（SPEC-BATCH31 §4 v1+r3 实长表）：装备名音 max（rai_n_fan）/情境名音 max（rai_n_hot）
MAX_NAME, RAI_WRONG, RAI_RIGHT, MAX_SIT = 1632, 1656, 2544, 1584
SUNHAT_DUR = 1536                                        # rai_n_sunhat（两件确认链次长件）
APPLY_N, BACK_N = 10, 9                                 # 语义句字数
# ① 确认链（判对拼播 rai_right+need 名音逐件）：两件最长（multi sh / best hot）=
#    rai_right+150+rai_n_fan 1632+150+rai_n_sunhat 1536+300=6312 → 演出窗 1600+4800=6400 ≥ 6312
assert '1600 * SPEED' in main and '4800 * SPEED' in main, 'main 缺判对演出窗 1600+4800（家族 G/H，r3）'
assert 1600 + 4800 >= RAI_RIGHT + 150 + MAX_NAME + 150 + SUNHAT_DUR + 300, \
    '判对演出窗 6400 < 两件确认链 %d+150+%d+150+%d+300' % (RAI_RIGHT, MAX_NAME, SUNHAT_DUR)
# ② 错反馈链豁免窗（契约 I，T46 实长口径——语义句 clip 化 rai_again_apply 2904/back 2856）：
#    ruleapply 链=1656+150+1584+150+2904+300=6744；ruleback 链=1656+150+1632+150+2856+300=6744
AGN_APPLY, AGN_BACK = 2904, 2856
assert 8000 >= RAI_WRONG + 150 + MAX_SIT + 150 + AGN_APPLY + 300, \
    '链豁免窗 8000 < ruleapply 链 %d+150+%d+150+%d+300' % (RAI_WRONG, MAX_SIT, AGN_APPLY)
assert 8000 >= RAI_WRONG + 150 + MAX_NAME + 150 + AGN_BACK + 300, \
    '链豁免窗 8000 < ruleback 链 %d+150+%d+150+%d+300' % (RAI_WRONG, MAX_NAME, AGN_BACK)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ clip 实长窗（SPEC-BATCH31 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3700 * SPEED' in main, 'main 缺教学 watch 演示延窗 t=3700（rai_tut_watch 3360+300）'
assert 3700 >= 3360 + 300, '教学 watch 演示延 3700 < rai_tut_watch 3360+300=3660'
assert 3700 >= 1416 + 150 + 1824 + 300, '教学开题链演示窗 3700 < 1416+150+1824+300=3690'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（rai_tut_turn 1872+300 防尾截）'
assert 2200 >= 1872 + 300, 'turn 后读题延 2200 < rai_tut_turn 1872+300=2172'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（rai_right ≥2844）'
assert 2620 + 400 >= RAI_RIGHT + 300, 'celebrate 2620+400=3020 < rai_right 2544+300=2844'
# ④ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑤ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 4800' in verif, 'verify 缺 estMs 动态断言（r3 两件确认链窗）'
assert "'rai_n_umbrella'" in verif or "'rai_n_' + " in verif or 'rai_n_umbrella' in verif, 'verify 缺名音键独立断言素材'
# ⑥ T46 阶段2 键段断言素材在场（语义句 clip 化后替代 keylessLast——契约 N 全 clip 化）
for _k46 in ('rai_again_apply', 'rai_again_back'):
    assert "'%s'" % _k46 in verif, 'verify 缺语义句键段断言 %s（T46 阶段2 替代 keylessLast）' % _k46
assert 'keylessLast' not in verif, 'verify keylessLast 断言应随 T46 clip 化退役'

# ===== 契约 L 豁免证据：全款 TTS 句无数字词（本款无数字词——SPEC §0 任务书豁免款）=====
for s in ('再看看外面是什么天气', '再想想什么时候用它'):
    assert not re.search(r'\d', s)

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.ask', 'g[data-anim]', 'q-text', 'c-name', 'ask-name'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data or 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加；r3：demo 走 finishWait 1600+4800）=====
# tutorialWatch 名义分账：watch 延 3700（≥3360+300）+ 开题链+ghost 移入窗 3700
# （≥1416+150+1824+300=3690）+ press 320 + demo 演出窗 1600+4800（罩单件确认链
# 2544+150+1368+300=4362——flat0 锚题恒 single 单件名音）+ 收尾 300 = 14420 ≤ 16000
TUT_SUM = 3700 + 3700 + 320 + 1600 + 4800 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3700 * SPEED', '320 * SPEED', '300 * SPEED', '4800 * SPEED', '1600 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# ===== v2 提交制结构断言（r3：multi/best 勾选+「带好啦」——weather v2 先例）=====
assert 'async function uiSubmit' in main, 'main 缺 uiSubmit 提交主路径（r3）'
assert 'engSubmit(cur)' in main, 'main 缺 engSubmit 引擎接线（r3）'
assert 'updateGoBtn' in main and 'syncHeld' in main, 'main 缺提交钮/勾选态同步（r3）'
assert "goBtn.classList.toggle('ready'" in main, 'main 缺提交钮 ready 呼吸（计数驱动）'
assert 'VOICE.less' in main and 'VOICE.more' in main, 'main 提交反馈须走 VOICE.less/more clip（r3）'
assert '#btn-go' in head and '.card .check' in head and '.card.held' in head, \
    'head 缺提交钮/勾选徽章样式（r3）'
assert 'isSubmitKind' in main and 'isSubmitKind' in verif, 'main/verify 缺提交题型分流（r3）'
assert 'wrong_more' in main and 'wrong_less' in main, 'main 缺提交判定分支（r3）'
assert 'rai_q_two' in data, 'game-data 缺 rai_q_two 两样题面句（r3）'

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>如果下雨</title>' in head, 'head 缺标题 如果下雨'

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
print('estMs check(r3): two-gear confirm chain %d+150+%d+150+%d+300=%d <= 6400 right-win; '
      'wrong-chain(apply/conflict) %d+150+%d+150+%d(+300)=%d <= 8000; '
      'wrong-chain(back) %d+150+%d+150+%d(+300)=%d <= 8000; tut-budget %dms <= 16000' %
      (RAI_RIGHT, MAX_NAME, SUNHAT_DUR, RAI_RIGHT + 150 + MAX_NAME + 150 + SUNHAT_DUR + 300,
       RAI_WRONG, MAX_SIT, AGN_APPLY, RAI_WRONG + 150 + MAX_SIT + 150 + AGN_APPLY + 300,
       RAI_WRONG, MAX_NAME, AGN_BACK, RAI_WRONG + 150 + MAX_NAME + 150 + AGN_BACK + 300,
       TUT_SUM))
