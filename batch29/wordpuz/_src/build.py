# -*- coding: utf-8 -*-
"""wordpuz 单词拼图 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch29/wordpuz/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch29/wordpuz/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# ===== python 侧独立复算 1：词封闭 20（SPEC §0.72 硬编码——禁抄实现，双录对账） =====
SPEC_WORDS = ['cat', 'dog', 'sun', 'hat', 'bed', 'pen', 'ten', 'map', 'cup', 'car',
              'bus', 'box', 'fox', 'egg', 'ant', 'eye', 'arm', 'leg', 'hand', 'star']
mwords = re.search(r'const WORDS = \{(.*?)\};', data, re.S)
assert mwords, 'game-data 缺 WORDS 词表'
got_words = re.findall(r"(\w+):\s*'([^']+)'", mwords.group(1))
assert [w for w, _ in got_words] == SPEC_WORDS, \
    '词封闭集与 SPEC §0.72 不符：%s' % [w for w, _ in got_words]
assert len(got_words) == 20, '词数 %d != 20' % len(got_words)
# egg 含重复字母（多重集范式锚）；4 字母恰 hand/star 两个（ch2 池仅 2 词=关内允许重复、相邻互异）
assert sorted(w for w in SPEC_WORDS if len(w) == 4) == ['hand', 'star'], '4 字母词集异常'
assert sorted(set('egg')) == ['e', 'g'] and len('egg') == 3, 'egg 应含重复字母 g'

# ===== python 侧独立复算 2：zh 提示表全量在数据面（SPEC §0.72：cat=猫图+「猫」） =====
SPEC_ZH = {'cat': '猫', 'dog': '狗', 'sun': '太阳', 'hat': '帽子', 'bed': '小床',
           'pen': '钢笔', 'ten': '十', 'map': '地图', 'cup': '杯子', 'car': '汽车',
           'bus': '公交车', 'box': '盒子', 'fox': '狐狸', 'egg': '鸡蛋', 'ant': '蚂蚁',
           'eye': '眼睛', 'arm': '胳膊', 'leg': '腿', 'hand': '手', 'star': '星星'}
assert dict(got_words) == SPEC_ZH, 'zh 提示表与 SPEC 不符：%s' % dict(got_words)

# 语音 clips 注入（wpu_ 26 条 + core_* 3 条，manifest games 已含 wordpuz）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
WPU_KEYS = ['wpu_tut_watch', 'wpu_tut_turn', 'wpu_hint', 'wpu_right', 'wpu_wrong', 'wpu_q',
            'wpu_g_wrong', 'wpu_demo']   # T46 阶段2：错反馈引导句+demo 机制句 clip 化
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('wordpuz')        # wpu_ 26 + core_ 3 = 29 条（manifest games 含 wordpuz）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：wpu 6 通用 + 词音 20 + core 3 = 29 条（≥25 任务书下限）
for k in WPU_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for w in SPEC_WORDS:
    assert '"wpu_w_%s"' % w in clips, 'clips 缺少词音 wpu_w_%s' % w
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 31, 'clips 条数 %d != 31（wpu 28 + core 3）' % n_clips
assert n_clips >= 25, 'clips 条数 %d < 25（任务书下限）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'
assert "const VER = '1.0'" in core, "core.js VER 非 '1.0'（家族 C 存档版本）"

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'wordpuz'" in main, 'main 缺 KIDS.init wordpuz（存档键 kidsgame_wordpuz）'
assert 'window.WP =' in main, 'main 缺 WP 钩子'
assert '__wpDemoR' in main, 'main 缺教学演示实证 __wpDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b27/b28）
assert 'function rescueTick()' in main, 'rescueTick 必须为命名函数（b28 m4）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'rescueTick 缺面板守卫（家族 K）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 双锚重置 + 仅起播设窗
assert 'wrongChainUntil = Date.now() + 6900' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=6900'
assert 'if (Date.now() < wrongChainUntil) return;' in main, '救援 interval 缺链豁免守卫（家族 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
assert "sayW([VOICE.wrong.key, { key: 'wpu_g_wrong', text: GUIDE.wrong }])" in main, \
    'main 错反馈拼播链（wpu_wrong+引导句 clip）缺失'
# 家族契约 E：教学演示通道豁免门（demo 参数——吞真实输入但不吞演示）
assert 'uiTapLtr(i0, true)' in main and '(state.locked && !demo)' in main, '教学 demo 通道缺失（家族 E）'

# ===== 语音窗静态断言（家族 G/H/I + estMs 全字符口径 n×345+600）=====
est_ms = lambda n: n * 345 + 600
# 实长（SPEC-BATCH29 §4）：right 2496 / wrong 2256 / 词音 max 1608 / watch 3048 / turn 1824
D_RIGHT, D_WRONG, D_WMAX = 2496, 2256, 1608
D_WATCH, D_TURN = 3048, 1824
# ① 判对拼播链窗（契约 G/H）：queue([wpu_right, 词音]) 链=2496+150+max 词音 1608=4254
#    → 演出窗 1800+3000=4800 ≥ 链+300=4554
assert 'KIDS.voice.queue([VOICE.right.key, wordKey(q.word)])' in main, 'main 缺判对拼播链'
assert '1800 * SPEED' in main and '3000 * SPEED' in main, 'main 判对演出窗 4800（1800+3000）缺失'
assert 1800 + 3000 >= D_RIGHT + 150 + D_WMAX + 300, \
    '判对演出窗 4800 < 判对链 %d+150+%d+300=%d' % (D_RIGHT, D_WMAX, D_RIGHT + 150 + D_WMAX + 300)
# ② demo 机制句（T46 阶段2 clip 化 wpu_demo，实长 2832=ffprobe/SPEC_DUR 口径）：DEMO_SAY 抽取对账
mdemo = re.search(r"const DEMO_SAY = '([^']+)'", data)
assert mdemo, 'game-data 缺 DEMO_SAY'
assert "KIDS.voice.play('wpu_demo', DEMO_SAY)" in main, 'main 缺 demo 机制句分支'
assert 1800 + 3000 >= 2832, '判对演出窗 4800 < wpu_demo clip 2832'
# ③ 错反馈链豁免窗（家族 I）≥ 链总实长+300：2256+150+2976(wpu_g_wrong clip 实长)+300
mguide = re.search(r"const GUIDE = \{ wrong: '([^']+)' \};", data)
assert mguide, 'game-data 缺 GUIDE.wrong 引导句'
glen = len(mguide.group(1))
chain_min = D_WRONG + 150 + 2976 + 300
assert 6900 >= chain_min, '链豁免窗 6900 < wpu_wrong 2256+150+wpu_g_wrong 2976+300=%d' % chain_min
# ④ 教学演示窗：watch clip 3048 → 首 tap 延至 t=900+3100=4000 ≥ 3048+300
assert '900 * SPEED' in main and '3100 * SPEED' in main, 'main 缺教学演示延窗（t=900+3100=4000）'
assert 900 + 3100 >= D_WATCH + 300, '教学演示窗 4000 < wpu_tut_watch 3048+300=3348'
# ⑤ turn 后读题延 2200 ≥ 1824+300 防尾截
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（wpu_tut_turn 1824+300 防尾截）'
assert 2200 >= D_TURN + 300, 'turn 后读题延 2200 < 1824+300=2124'
# ⑥ winFlow celebrate 后补窗 400（celebrate 2620+400 收尾；判对链已由 4800 窗罩满）
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失'
# ⑦ 错点防重入窗 1000ms
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ⑧ 题面句拼播链（wpu_q+词音 ≤2136+150+1608=3894 fire-and-forget）< 方向级救援 14s
assert 'KIDS.voice.queue([VOICE.q.key, wordKey(q.word)])' in main, 'main 缺题面句拼播链'
assert 2136 + 150 + D_WMAX <= 14000 - 1000, '题面链 > 方向级救援间隔余量'
# ⑨ 教学链预算 ≤16s（任务书静态断言：SPEED 段+固定段分账 + moved 窗×2 + demo 判对窗 4800）
mtut = re.search(r'async function tutorialWatch\(\) \{.*?\n\}', main, re.S)
assert mtut, 'main 缺 tutorialWatch'
tut_speeds = [int(x) for x in re.findall(r'await wait\((\d+) \* SPEED\)', mtut.group(0))]
tut_fixed = [int(x) for x in re.findall(r'await wait\((\d+)\);', mtut.group(0))]
budget = sum(tut_speeds) + sum(tut_fixed) + 520 * 2 + (1800 + 3000)
assert budget <= 16000, '教学 watch 链预算 %dms > 16000（SPEED 段 %s + 固定段 %s + moved 1040 + demo 判对窗 5400）' % (
    budget, tut_speeds, tut_fixed)
# ⑩ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1800 + 3000' in verif, 'verify 缺 estMs 动态断言'
assert 'tw <= 16000' in verif, 'verify 缺教学链 ≤16s 实测断言'
# SPEC 独立硬编码表在场（双录对账前提）+ 实长表数值一致（§4）
for sym in ['SPEC_WORDS', 'SPEC_DUR', 'SPEC_SENT']:
    assert ('const ' + sym) in verif, 'verify 缺 SPEC 独立表 %s' % sym
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"'(wpu_\w+)':\s*(\d+)", mdur.group(1)))
assert dur_vals == {'wpu_tut_watch': '3048', 'wpu_tut_turn': '1824', 'wpu_hint': '1896',
                    'wpu_right': '2496', 'wpu_wrong': '2256', 'wpu_q': '2136',
                    'wpu_w_fox': '1608', 'wpu_w_eye': '1296',
                    'wpu_g_wrong': '2976', 'wpu_demo': '2832'}, \
    'SPEC_DUR 与 §4 实长表不符：%s' % dur_vals
# 帧内容断言在场（家族 M：槽位 DOM 序==slots + 卡 used 态==pool——逐卡驱动后必断言）
assert 'domSlots' in verif and 'domUsedOk' in verif, 'verify 缺帧内容断言器（家族 M）'
# 多重集独立复算器在场（verify ② 防同源）
assert 'specMultiset' in verif, 'verify 缺独立多重集复算器 specMultiset'
# 存档断言单元在场（家族 C）
assert "kidsgame_wordpuz" in verif, 'verify 缺存档键断言（家族 C）'

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
print('words: %d (3L=%d 4L=%d) clips=%d' % (
    len(got_words), sum(1 for w in got_words if len(w[0]) == 3), sum(1 for w in got_words if len(w[0]) == 4), n_clips))
print('estMs check: judge-chain %d+150+%d+300=%d <= right-win 4800; demo clip 2832 <= 4800' % (
    D_RIGHT, D_WMAX, D_RIGHT + 150 + D_WMAX + 300))
print('wrong-chain: 2256+150+wpu_g_wrong 2976+300=%d <= wrongChainUntil 6900' % chain_min)
print('tutorial budget: SPEED %s + fixed %s + moved 1040 + demo 4800 = %dms <= 16000' % (
    tut_speeds, tut_fixed, budget))
