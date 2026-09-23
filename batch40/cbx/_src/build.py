# -*- coding: utf-8 -*-
"""cbx 冷静工具箱 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch40/cbx/_src/build.py"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch40/cbx/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
DURJSON = pathlib.Path(r'F:/claudecode/projects/active/kids-games/batch40/_clipdur40.json')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（cbx_ 16 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('cbx') 全量返回（manifest games 已含 cbx 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('cbx')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：cbx_ 36 条（16 基础+cbx_sc_ 20 情境句）+ core 3 条 = 39 条（r50-fix m-4 勘正）
# （SPEC-BATCH40 §2/§4；前缀=cb_ 已核 manifest 无占用——cal_ 被 b26 calendar 占用已弃用改 cbx_）
CBX_KEYS = ['cbx_tut_watch', 'cbx_tut_turn', 'cbx_hint', 'cbx_right', 'cbx_wrong',
            'cbx_g_breath', 'cbx_g_countten', 'cbx_g_hugbunny', 'cbx_g_sayout', 'cbx_g_drinkwater',
            'cbx_b_throw', 'cbx_b_shout', 'cbx_b_hit', 'cbx_b_tear',
            'cbx_n_cryonly', 'cbx_n_hide'] + ['cbx_sc_%d' % i for i in range(1, 21)]   # T46 阶段2 情境句 +20
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CBX_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 39, 'clips 条数 %d != 39（cbx 36 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 cbx_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('cbx_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 cbx_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('cbx_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'cbx'" in main, 'main 缺 KIDS.init cbx（存档键 kidsgame_cbx）'
assert 'window.CBX =' in main, 'main 缺 CBX 钩子'
assert '__cbxDemoR' in main, 'main 缺教学演示实证 __cbxDemoR'
assert '__cbxTutSolo' in main, 'main 缺教学帮→独实证 __cbxTutSolo'
assert 'setKidMood' in main, 'main 缺主角情绪态函数 setKidMood（契约 M DOM 类层）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH40 §0：seeded mulberry32(flat*7919+897)——本款常量 897）
assert 'flat * 7919 + 897' in engine, 'engine 缺本款常量 seed 897（SPEC §0）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(cardsEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.cbx.tutSeen）
assert 'sv.cbx && sv.cbx.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=6834）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 6834' in data, 'data 缺错链豁免窗常量 6834（SPEC §2 窗按 max）'
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
# 家族契约 N：本款题面情境句走 voice.play 情境键（T46 阶段2 clip 化——SPEC §2）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.play，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §2 演出时序常量：出场 400/首错锁 1100（≤wrong+150=2310 N2 总窗口径）/确认下界窗/教学延窗
for frag in ('const ENTER_MS = 400', 'const SHAKE_MS = 1100', 'const CELE_WIN = CLIP_DUR.right + 300',
             'const TUT_WATCH_WAIT = 3300', 'const TUT_TURN_WAIT = 2172'):
    assert frag in data, 'data 缺 SPEC §2 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapPick 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapPick 演出期 null）'
# 题面=voice.play 情境键 clip 化（T46 阶段2）
assert "KIDS.voice.play(q.sayKey, q.say)" in main, 'main 缺题面情境句 play（T46 阶段2 cbx_sc_N clip）'
# 确认链=right+好卡句两段全 clip（SPEC §2：好卡答对=确认句 right+好卡句 cbx_g_*）
assert "KIDS.voice.queue([VOICE.right.key, 'cbx_g_' + goodId])" in main, 'main 缺确认链 right+好卡句两段（SPEC §2）'
# 错链=三分流（r50）：坏/中性=[wrong, 按卡取后果句]；fair=[hint, 情境句重播]
assert "sayW(wrongChainOf(q, pickedId))" in main, 'main 缺三分流错链 wrongChainOf（r50 SPEC §R2）'
assert "const conseqKeyOf = id => POOL[id].kind === 'bad' ? 'cbx_b_' + id : 'cbx_n_' + id" in main, \
    'main 缺后果句取键函数 conseqKeyOf（SEL 按卡分流）'
assert "const wrongChainOf = (q, id) =>" in main and "[VOICE.hint.key, q.sayKey]" in main, \
    'main 缺 fair 辨析链构造（r50：[cbx_hint, cbx_sc_N] 零新键）'

# ===== r50 难度改造结构锚（SPEC-R50-CBX）：全程三选灰阶 =====
assert data.count("fair: '") == 20, 'SCENES fair 列必须 20 行全带（r50 三选灰阶）'
assert 'const GOOD_CLASS = { breath:' in data, 'data 缺好卡功能类表 GOOD_CLASS（fair 类互异锚）'
assert "const isFair = POOL[pickedId].kind === 'good';" in main and "isFair ? 'fair' : 'bad'" in main, \
    'main 缺 fair/bad 演出分流（r50 轻摆非摇头）'
assert "classList.remove('bad', 'fair')" in main, 'main 缺 fair/bad 演出类回收（探索不罚）'
assert '.pick.fair{animation:cd-fair' in head, 'head 缺 fair 卡轻摆动画（r50 非否定演出）'
assert '好工具' not in main, 'aria-label 统一「工具」（r50 好池双卡按 kind 标注泄答案）'
assert "'两种工具，选让心里舒服的'" not in data and "'三种工具，选让心里舒服的'" in data and \
       "'三张都像好办法，选最帮自己的'" in data, \
    'GEN_HINTS 残留两选档文案（r50 档位联动未改全）'
assert '害怕时三张都像好办法，挑最帮你的' in data, 'CHAPTERS[2].hint 缺 r50 灰阶新文案'

# ===== 语音窗静态断言（N2 总窗口径 + SPEC-BATCH40 §2 实长表 _clipdur40.json 硬对账）=====
est_ms = lambda n: n * 345 + 600
# CLIP_DUR 表逐键对账 _clipdur40.json（实长真值源——窗公式禁凭记忆抄错）
DUR = json.loads(DURJSON.read_text(encoding='utf-8'))
SHORT = {'tut_watch': 'cbx_tut_watch', 'tut_turn': 'cbx_tut_turn', 'hint': 'cbx_hint',
         'right': 'cbx_right', 'wrong': 'cbx_wrong'}
for short, full in SHORT.items():
    assert '%s: %d' % (short, DUR[full]) in data.replace("'", '').replace('const ', ''), \
        'data CLIP_DUR.%s != _clipdur40.json（%s=%d）' % (short, full, DUR[full])
for gid in ['breath', 'countten', 'hugbunny', 'sayout', 'drinkwater']:
    assert '%s: %d' % (gid, DUR['cbx_g_' + gid]) in data, \
        'data CLIP_DUR.g.%s != _clipdur40.json（cbx_g_%s=%d）' % (gid, gid, DUR['cbx_g_' + gid])
for bid in ['throw', 'shout', 'hit', 'tear']:
    assert '%s: %d' % (bid, DUR['cbx_b_' + bid]) in data, \
        'data CLIP_DUR.b.%s != _clipdur40.json（cbx_b_%s=%d）' % (bid, bid, DUR['cbx_b_' + bid])
for nid in ['cryonly', 'hide']:
    assert '%s: %d' % (nid, DUR['cbx_n_' + nid]) in data, \
        'data CLIP_DUR.n.%s != _clipdur40.json（cbx_n_%s=%d）' % (nid, nid, DUR['cbx_n_' + nid])
R, W, GMAX = DUR['cbx_right'], DUR['cbx_wrong'], DUR['cbx_g_breath']   # 2592/2160/4224
BN_MAX = max(DUR['cbx_b_hit'], DUR['cbx_n_cryonly'])                   # 实播后果句 max=3648
# ① 错链豁免窗（契约 I）：窗按 max=6834=wrong+150+4224+300（任务书口径）；恒 ≥ 实播链 6258
assert 6834 == W + 150 + GMAX + 300, '链豁免窗 6834 != wrong+150+max+300'
assert 6834 >= W + 150 + BN_MAX + 300, '链豁免窗 6834 < 实播错链下界 %d' % (W + 150 + BN_MAX + 300)
# ①-r50 fair 辨析链窗恒 ≥ 断言（N2 总窗口径）：hint 2208+150+sc max 3600+300=6258 ≤ 6834；
# 首错锁 1100×1+140=1240 ≤ fair 链首段 hint+150=2358。
# sc 实长不在 _clipdur40.json（T46 浏览器口径）——3600=cbx_sc_4（verify SPEC_DUR 表 max，
# 段二 sc clip 若重合成变长须 SPEC_DUR+此处+§R7 三处联动复核）
_SC_MAX = 3600
assert DUR['cbx_hint'] + 150 + _SC_MAX + 300 <= 6834, \
    'fair 辨析链 %d > 豁免窗 6834（SPEC-R50 §R7）' % (DUR['cbx_hint'] + 150 + _SC_MAX + 300)
assert 1100 * 1 + 140 <= DUR['cbx_hint'] + 150, '首错锁 1240 > fair 链首段 hint+150（N2）'
# ② 确认链锁窗动态全链（celeWinOf）：right+150+好卡句+300；CELE_WIN=2892=right+300 下界恒被包含
assert 2892 == R + 300, '确认窗下界 2892 != right %d+300' % R
for gid in ['breath', 'countten', 'hugbunny', 'sayout', 'drinkwater']:
    assert R + 150 + DUR['cbx_g_' + gid] + 300 >= 2892, '好卡 %s 动态锁窗 < SPEC 下界 2892' % gid
assert 'const celeWinOf = goodId => CLIP_DUR.right + 150 + CLIP_DUR.g[goodId] + 300' in data, \
    'data 缺动态锁窗公式 celeWinOf（N2 总窗口径全链）'
# ③ 首错锁（N2 总窗口径）：SHAKE_MS 1100×1+140=1240 ≤ wrong+150=2310（审查 m-1 修——原只断常量漏 140 尾窗）
assert 1100 * 1 + 140 <= W + 150, '首错锁总窗 1240 > wrong+150=%d（N2 总窗口径）' % (W + 150)
# ④ 题面 say 窗（家族 T 动态）：estMs(13 字最长句)=5085+300+出场 400=5785（estMs 全字符口径在场）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(13) == 5085 and est_ms(8) == 3360, 'estMs 静态验算失败'
# ⑤ 教学延窗（watch 3300≥3000+300 / turn 2172≥1872+300 防尾截）
assert 3300 >= DUR['cbx_tut_watch'] + 300 and 2172 >= DUR['cbx_tut_turn'] + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 2592+300=2892（家族 H）
assert 2620 + 400 >= R + 300, 'celebrate 3020 < %d+300' % R
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（cbx_right 2592）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_SCENES' in verif and 'SPEC_POOL' in verif, 'verify 缺题库/池独立硬编码表（单元⑥）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', 'dataset.emo', 'emo-\' + q.emo', 'classList.contains(\'calm\')',
            "classList.contains('good')", '__lastSayText', 'dataset.i', '.pick[data-i='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.pick[data-i=" in main, 'main 缺卡下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加）=====
# tutorialWatch watch 段名义分账：watch 延 3300（≥3000+300）+ 开题演出
# （出场 400+estMs(scene2 句 12 字)=4740+300=5440）+ ghost 移入 800+press 320
# + demo 演出窗 5370（=right 2592+150+g_sayout 2328+300 动态全链）= 15230 ≤ 16000
TUT_SUM = 3300 + (400 + est_ms(12) + 300) + 800 + 320 + (R + 150 + DUR['cbx_g_sayout'] + 300)
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'await wait(win * SPEED)']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学题句长受控（scene2=12 字 sayout 题——预算锚与实现绑定；scene0=13 字 turn 题）
assert '排队时有人插队，气鼓鼓的' in data and len('排队时有人插队，气鼓鼓的') == 12
assert '弟弟推倒你的积木，你好生气' in data and len('弟弟推倒你的积木，你好生气') == 13

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>冷静工具箱</title>' in head, 'head 缺标题 冷静工具箱'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 2d：verify 独立第 4 script 块（b36 M1：verify 断言与 main 真源可分离核对）
assert html.count('<script>') == 4, 'script 块数 %d != 4（core/clips/游戏/verify 各一）' % html.count('<script>')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: wrong-chain 6834 == 2160+150+4224+300 (max, >=live 6258); '
      'cele-win dyn %d-%d >= 2892 == 2592+300; shake 1100 <= 2310; '
      'say-win estMs(13)+300+400=%d; tut-budget %dms <= 16000' % (
          R + 150 + DUR['cbx_g_sayout'] + 300, R + 150 + GMAX + 300, est_ms(13) + 700, TUT_SUM))
