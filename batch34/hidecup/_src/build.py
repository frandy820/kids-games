# -*- coding: utf-8 -*-
"""hidecup 藏猫猫摄像头 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch34/hidecup/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch34/hidecup/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（hc_ 11 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('hidecup') 全量返回（manifest games 已含 hidecup 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('hidecup')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：hc_ 11 条（通用 6+名音×5）+ core 3 条 = 14 条（SPEC-BATCH34 §4）
# 前缀=hc_ 已核 manifest 无占用（b28 立规先查，2026-09-11 实查）
# r25 子集式（SPEC-R25 §R6，r20-r24 范式）：14 必备键精确在册+总数 ≥14——
# r25 零新语音键（三维度全复用既有），子集式防未来加键断言漂移
HC_KEYS = ['hc_tut_watch', 'hc_tut_turn', 'hc_hint', 'hc_right', 'hc_wrong', 'hc_show'] + \
          ['hc_n_' + a for a in ('rabbit', 'cat', 'bear', 'dog', 'duck')]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in HC_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 14, 'clips 条数 %d < 14（hc 11 + core 3 必备下限）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 hc_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('hc_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 hc_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('hc_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'hidecup'" in main, 'main 缺 KIDS.init hidecup（存档键 kidsgame_hidecup）'
assert 'window.HC =' in main, 'main 缺 HC 钩子'
assert '__hcDemoR' in main, 'main 缺教学演示实证 __hcDemoR'
assert '__hcTutSolo' in main, 'main 缺教学帮→独实证 __hcTutSolo'
assert '__hcPerm' in main, 'main 缺换位排列锚 __hcPerm（契约 M）'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非杯进度）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH34 §0.82：seeded mulberry32(flat*7919+311)——本款常量 311）
assert 'flat * 7919 + 311' in engine, 'engine 缺本款常量 seed 311（SPEC §0.82）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(cupsEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.hidecup.tutSeen）
assert 'sv.hidecup && sv.hidecup.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=5154）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 5154' in data, 'data 缺错链豁免窗常量 5154（SPEC §4）'
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
# SPEC §0.82 演出时序常量：亮相 1.5s/静止 800ms/教学换位 1600ms
#（换位常量 r51 四档 SWAP_MS_D1-D4 在 SPEC-R51 锚块断言；旧 SWAP_MS=1100 退役）
for frag in ('const PEEK_MS = 1500', 'const SWAP_MS_TUT = 1600',
             'const STILL_MS = 800', 'const RESET_MS = 500'):
    assert frag in data, 'data 缺 SPEC §0.82 演出常量 %s' % frag
assert 'lastReplayAt < 3000' in main, 'main 缺重演 3s 节流（SPEC §0.82）'

# ===== SPEC-R51 难度曲线上移结构锚（§R2/§R3/§R4/§R8 四层联动——build 层）=====
# ① 四档提速常量+档位单点（900/800/700/600，教学 1600 基线不动；SWAP_MS=1100 退役）
#（r51 窗推导断言在下方「语音窗静态断言」块——HC_* 实长常量定义于此块之后）
for frag in ('const SWAP_MS_D1 = 900', 'const SWAP_MS_D2 = 800', 'const SWAP_MS_D3 = 700',
             'const SWAP_MS_D4 = 600', 'const swapMsOf',
             'const SHOW_WIN_DUAL = 5400', 'const HALF_WIN = 5800',
             'const SHOW_WIN_TRIPLE = 7000'):
    assert frag in data, 'data 缺 r51 时序常量 %s（SPEC-R51 §R4/§R9）' % frag
assert 'const SWAP_MS =' not in data, 'data 残留退役常量 SWAP_MS=1100（r51 四档表全换）'
# ② 章型谱（CH_CFG 形态+KINDS3/KINDS4 固定谱——r51 全换）
for frag in ('c: 3, s: 2', 'c: 4, s: 3', 'dc: 4, ds: 4', 'dc: 4, ds: 5', 'tc: 4, ts: 4'):
    assert frag in data, 'data CH_CFG 缺 r51 形态 %s' % frag
assert 'KINDS3' in data and 'KINDS4' in data, 'data 缺 r51 固定谱 KINDS3/KINDS4（SPEC-R51 §R3）'
assert 'DUAL_KINDS' not in data, 'data 残留 r25 谱名 DUAL_KINDS（r51 已全换 KINDS3/KINDS4）'
assert "KINDS4 = ['hide', 'hidedual', 'hidetriple', 'hidedual', 'hide']" in data, \
    'data KINDS4 谱形不符（SPEC-R51 §R2）'
assert "KINDS3 = ['hide', 'hidedual', 'hide', 'hidedual', 'hide']" in data, \
    'data KINDS3 谱形不符（SPEC-R51 §R2）'
# ③ 引擎锚：hidedual/hidetriple kind+half 相位推进×2+anim2 dch>=3/anim3 dch4 取数时机
assert "'hidedual'" in engine and "'hidetriple'" in engine, 'engine 缺 r51 双/三动物题型'
assert 'q.answer = q.answerB' in engine, 'engine 缺 half 相位推进锚 B（answer=当前步真值）'
assert 'q.answer = q.answerC' in engine, 'engine 缺 triple 第二 half 相位推进锚 C（SPEC-R51 §R4）'
assert 'if (dch >= 3)' in engine and 'anim2' in engine, \
    'engine 缺 anim2 dch>=3 取数锚（r51：ch3/ch4 谱含 dual）'
assert 'if (dch === 4)' in engine and 'anim3' in engine, \
    'engine 缺 anim3 仅 dch4 取数锚（r51：KINDS4 含 triple）'
# ④ 主逻辑锚：档位接入+half 分支+M1 防回归+浮点整串+q-text 动态+triple 两形态链
assert 'swapMsOf(cur.dch)' in main, 'main 缺 swapMsOf 档位接入（presentQuiz/doReplay 同速）'
assert "r === 'half'" in main and "nameClip(q.animA), nameClip(q.animB)" in main, \
    'main 缺 half 分支/三段确认链第一形态 [right,nA,nB]（SPEC-R51 §R4）'
assert "nameClip(q.animB), nameClip(q.animC)" in main, \
    'main 缺 triple 第二步确认链 [right,nB,nC]（SPEC-R51 §R4）'
assert 'if (user) lastAct = Date.now();' in main, \
    'main 缺救援重演不动 lastAct 锚（r24 审查 M1 防回归——方向级不得饿死答案级）'
assert '审查M2 r25：half 亦是正确作答' in main, \
    'main 缺 half 解锁重置救援钟锚（r25 审查M2 防回归——删此行则慢思考后下一问被即刻泄题且无门禁抓）'
assert 'nameClip(ansAnimOf(q))' in main, \
    'main 缺末步名音按 kind 分流锚（r51 triple=C——q.anim 兼容字段恒=A，错用则链尾播 A 名）'
assert 'Math.round(durMs * SPEED)' in main, 'main doSwapAnim 缺 Math.round（600×0.12=72 浮点整串）'
assert '藏在哪里呀' in main and 'setQText' in main, 'main 缺 q-text 动态（dual/triple 按步切名）'
# ⑤ 布局锚：3 杯+4 杯 CSS 档位适配（触摸面 ≥96×96/不溢出）
assert '#cups[data-cups="3"]' in head, 'head 缺 3 杯 CSS 档位适配（r51 ch1 起步 c=3）'
assert '#cups[data-cups="4"]' in head, 'head 缺 4 杯 CSS 档位适配'
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCup 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCup 演出期 null）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）——T46 化零 keyless 政策：
# 亮相链尾段改走 hc_show clip（manifest 既有键改引用，零新增），main/verif 不得再出现 keyless 段
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 出现 keyless 段（T46 化零 keyless 政策）' % _src_name
assert 'KIDS.voice.queue([nameClip(q.anim), VOICE.show.key])' in main, 'main 缺亮相链 clip 引用（hc_show）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH34 §4 实长表）=====
est_ms = lambda n: n * 345 + 600
HC_WATCH, HC_TURN = 3264, 1824                  # hc_tut_watch / hc_tut_turn 实长
HC_RIGHT, HC_WRONG, HC_HINT, HC_SHOW = 2232, 1656, 3048, 1848  # 实长
HC_NAME_MAX = 1440                               # 名音 max（hc_n_bear）
HC_NAME_RABBIT = 1368                            # 教学演示名音（hc_n_rabbit）
SHOW_TEXT_LEN = 5                                # '要躲猫猫啦' 全字符（标点计入）
# ① 确认链（判对拼播：hc_right+150+名音 max 1440）→ 演出窗 1600+3000=4600 ≥ 4122（SPEC §4）
assert '1600 * SPEED' in main and '3000) * SPEED' in main, 'main 缺判对演出窗 1600+3000（家族 G/H）'
assert 1600 + 3000 >= HC_RIGHT + 150 + HC_NAME_MAX + 300, \
    '判对演出窗 4600 < 确认链 %d+150+%d+300' % (HC_RIGHT, HC_NAME_MAX)
# ② 错反馈链豁免窗（契约 I）：错链=wrong 1656+150+hint 3048+300=5154（SPEC §4 精确值）
assert 5154 == HC_WRONG + 150 + HC_HINT + 300, '链豁免窗 5154 != 错链 %d+150+%d+300' % (HC_WRONG, HC_HINT)
# ③ 亮相链窗（SHOW_WIN=4300，T46 化全 clip 链口径）：名音 max 1440+150+hc_show 1848+300=3738
assert 'const SHOW_WIN = 4300' in data, 'data 缺亮相链窗常量 SHOW_WIN=4300'
assert 4300 >= HC_NAME_MAX + 150 + HC_SHOW + 300, '亮相链窗 4300 < clip 口径 %d' % (HC_NAME_MAX + 150 + HC_SHOW + 300)
# ③b 教学亮相窗（SHOW_WIN_TUT=4200 ≥ rabbit 名音 1368+150+hc_show 1848+300=3666 clip 链）
assert 'const SHOW_WIN_TUT = 4200' in data, 'data 缺教学亮相窗常量 SHOW_WIN_TUT=4200'
assert 4200 >= HC_NAME_RABBIT + 150 + HC_SHOW + 300
# ③c 教学演示演出窗（demo 通道 1600+2450=4050 ≥ 确认链 2232+150+1368+300=4050 精确）
assert 'await wait((demo ? 2450 : 3000) * SPEED)' in main, 'main 缺教学演示尾窗 2450（demo 通道）'
assert 1600 + 2450 >= HC_RIGHT + 150 + HC_NAME_RABBIT + 300, \
    '教学演示窗 4050 < %d+150+%d+300' % (HC_RIGHT, HC_NAME_RABBIT)
# ③d r25 两窗推导（SPEC-R25 §R9）：双动物亮相链窗+half 过渡窗（名音 max 口径）
assert 5400 >= HC_NAME_MAX * 2 + 150 * 2 + HC_SHOW + 300, \
    '双动物亮相链窗 5400 < 名音1440×2+150×2+show1848+300=5328'
assert 5800 >= HC_RIGHT + 150 + HC_NAME_MAX + 150 + HC_NAME_MAX + 300, \
    'half 过渡窗 5800 < right2232+150+名音1440+150+名音1440+300=5712'
# ③e r51 三动物亮相链窗推导（SPEC-R51 §R9，名音 max 口径；任务书 6958 系笔误勘误）
assert 7000 >= HC_NAME_MAX * 3 + 150 * 3 + HC_SHOW + 300, \
    '三动物亮相链窗 7000 < 名音1440×3+150×3+show1848+300=6918'
# ④ 教学演示延窗（watch 3264+300=3564 / turn 1824+300=2124 防尾截）
assert 'await wait(3564 * SPEED)' in main, 'main 缺教学 watch 延 3564（hc_tut_watch 3264+300）'
assert 'await wait(2124 * SPEED)' in main, 'main 缺教学 turn 延 2124（hc_tut_turn 1824+300）'
assert 3564 >= HC_WATCH + 300 and 2124 >= HC_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（hc_right 2232）'
assert 2620 + 400 >= HC_RIGHT + 300, 'celebrate 2620+400=3020 < hc_right 2232+300=2532'
# ⑤ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑥ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and 'keylessLast' in verif, 'verify 缺 estMs/keylessLast 动态断言'
assert "'hc_n_' + q10.anim" in verif or "'hc_n_' + " in verif, 'verify 缺名音键独立断言素材'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/相位/帧内容三层）=====
for lit in ('__hcPerm', 'dataset.pos', 'data-cup', 'getBoundingClientRect', 'dataset.cups'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.cup-wrap[data-pos=" in main, 'main 缺相位标签选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch watch 段名义分账：watch 延 3564（≥3264+300）+ 开题演出（教学亮相窗 4200
# + 慢速换位 1×1600 + 静止 800）+ ghost 移入 800 + press 320 + demo 演出窗 1600+2450
# （罩确认链 2232+150+1368+300=4050）= 15334 ≤ 16000
TUT_SUM = 3564 + 4200 + 1600 + 800 + 800 + 320 + 1600 + 2450
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3564 * SPEED', '800 * SPEED', '320 * SPEED', '1600 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>藏猫猫摄像头</title>' in head, 'head 缺标题 藏猫猫摄像头'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')
# b36 M1 修复（r51 收口，任务书坑 2）：verify 独立第 4 script 块——原并入
# script[2] 时 verify ⑨ 源码锚读自身所在块=自匹配恒真（家族缺陷多次重犯）；
# 四块独立后 script[2]=纯游戏源码（data+engine+main），锚串不在 verify 块内=
# 真判别力。块数==4 硬断言防回并。
assert html.count('<script>') == 4 and html.count('</script>') == 4, \
    'script 块数 != 4（core/clips/game/verify 四块独立——b36 M1）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: confirm chain %d+150+%d+300=%d <= 4600 right-win; '
      'wrong-chain 5154 (exact); show-win 4300 >= max(%d, %d); tut-budget %dms <= 16000' %
      (HC_RIGHT, HC_NAME_MAX, HC_RIGHT + 150 + HC_NAME_MAX + 300,
       HC_NAME_MAX + 150 + HC_SHOW + 300,
       HC_NAME_MAX + 150 + est_ms(SHOW_TEXT_LEN) + 300, TUT_SUM))
