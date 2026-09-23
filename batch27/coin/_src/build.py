# -*- coding: utf-8 -*-
"""coin 硬币认钱 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch27/coin/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch27/coin/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（coi_ 30 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('coin')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：r38 终态 = coi 69 + core 3 = 72 条（2026-09-22 主线注册 39 键后；
# SPEC_DUR/⑨ filter 32 同步——game-verify ⑨）
COI_KEYS = ['coi_tut_watch', 'coi_tut_turn', 'coi_hint', 'coi_right', 'coi_wrong', 'coi_q',
            'coi_q2', 'coi_cf_sv_1', 'coi_cf_yuan1', 'coi_say_c_yj_j', 'coi_cf_c_c_yj_j', 'coi_g_silver']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in COI_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 72, 'clips 条数 %d != 72（r38 终态：coi 69 + core 3；主线注册 39 键后）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'coin'" in main, 'main 缺 KIDS.init coin（存档键 kidsgame_coin）'
assert 'window.CO =' in main, 'main 缺 CO 钩子'
assert '__coDemoR' in main, 'main 缺教学演示实证 __coDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'

# ===== 语音窗静态断言（家族 G/H/I + b25 定版 + r38 段级链上界）=====
# estMs 口径（b25 定版）：SAPI ~345ms/字 + 600 落定余量
est_ms = lambda n: n * 345 + 600
# ① 确认句：判对演出窗 1800+3600=5400 ≥ 最长确认链（r38 段级上界 [v_gt,v_y,v_j]）+300
#    与在册整句确认实长（coi_cf_sv_1 3408 实测）+300 双核（r35 M-1 口径）
#    r38 M2 注记：本闸=estMs 粗筛（est_ms(2)=1290 对 2 字段实测 1344 低估 ~54ms，粗筛值 4815），
#    实测真值闸在 game-verify estWin 单元（max 口径 4788+300=5088 ≤ 5400）——两闸基准差异为设计内
assert "'一元硬币和一元纸币一样多'" in data, 'data 缺同值确认句（同值教学锚句）'
assert 1800 + 3600 >= est_ms(3) + est_ms(2) + est_ms(2) + 2 * 150 + 300, \
    '判对演出窗 5400 < 开放确认链段级上界+300'
assert 1800 + 3600 >= 3408 + 300, '判对演出窗 5400 < 在册最长确认实长 3408+300'
# ② 引导句（错反馈链第二段）：链结构（coi_wrong+引导键段链）必须在场；
#    救援掐链由 wrongChainUntil 守卫（契约 I）；错点防重入窗 1000ms（batch21 §0 L9）
gblock = re.search(r"const GUIDE = \{([^}]+)\};", data)
assert gblock, 'game-data 缺 GUIDE 引导句表'
gtexts = re.findall(r"'([^']+)'", gblock.group(1))
assert len(gtexts) == 11, 'GUIDE 应 11 键各 1 句（r38 +kind/minHi/minLo），实得 %d' % len(gtexts)
assert "sayW([VOICE.wrong.key, { key: guideKeyFor(q, q.opts[i]), text: guideFor(q, q.opts[i]) }])" in main, \
    'main 错反馈拼播链（coi_wrong+引导句）缺失'
# ③ clip 实长窗（SPEC-BATCH27 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '900 * SPEED' in main and '3000 * SPEED' in main, 'main 缺教学演示延窗（t=900+3000=3900）'
assert 900 + 3000 >= 2976 + 300, '教学演示窗 3900 < coi_tut_watch 2976+300=3276'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（coi_tut_turn 1752+300 防尾截）'
assert 2200 >= 1752 + 300, 'turn 后读题延 2200 < coi_tut_turn 1752+300=2052'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（coi_right ≥2772）'
assert 2620 + 400 >= 2472 + 300, 'celebrate 2620+400=3020 < coi_right 2472+300=2772'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert main.count('1800 * SPEED') >= 1 and '3600 * SPEED' in main, \
    'main 判对演出窗 5400（1800+3600）不足'
# ④ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1800 + 3600' in verif, 'verify 缺 estMs 动态断言'
# ⑤ r38 键链构造在场（七题型读题/确认统一走 quizPartsOf/confirmPartsOf——r37 M1 直调面）
assert 'function quizPartsOf' in data and 'function confirmPartsOf' in data, 'data 缺键链构造纯函数'
assert 'const cf = confirmPartsOf(q);' in main, 'main 确认句未走 confirmPartsOf'
assert 'quizPartsOf(cur.quizzes[cur.step])' in main, 'main 读题未走 quizPartsOf'
# §R6 新键文案锚（锁定注册清单文本/键式，防漂移——逐条与 SPEC-R38 §R6 表一致）
for _t in ["'一枚一角'", "'一枚五角'", "'一枚一元'", "'一共是多少钱'", "'一共是'",
           "SUM_CN[y] + '元'", "SUM_CN[j] + '角'", "'哪个是' + MONEY[q.face].n", "'应该找回多少钱'",
           "'付了一元'", "'付了五元'", "'找回'", "'最少用几枚硬币'", "'要找圆圆的硬币哦'",
           "'硬币不用那么多哦'", "'还不够哦，再想一想'",
           "'coi_v_y' + y", "'coi_v_j' + j", "'coi_cf_min' + n", "'coi_it_' + q.item",
           "'coi_q_r1'", "'coi_q_r5'", "'coi_q_r10'"]:
    assert _t in data, 'data 缺 §R6 新键文案锚 %s' % _t
# r38 七题型引擎面在场（specSeqOf 分支 + buildQuiz 分支）
for _k in ["'rev'", "'chg'", "'min'"]:
    assert _k in engine, 'engine 缺 %s 题型分支' % _k
assert 'ITEM_SVG' in data and 'ITEMS' in data and 'R4C' in data, 'data 缺 r38 新表'

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
print('estMs check: open confirm chain bound %dms (estMs 段级粗筛, 2-3 字段低估~105ms; 段二实测 max 口径 4788+300=5088——r38 M1 勘正, 真值闸在 verify estWin 单元) <= 5400 right-win; clip max 3408 + 300' %
      (est_ms(3) + est_ms(2) + est_ms(2) + 300))

# ---------- 契约 I 链豁免静态断言：wrongChainUntil ≥ 链总实长(estMs 口径)+300 ----------
assert 'wrongChainUntil = Date.now() + 9200' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=9200'
# 链 = coi_wrong 2568 + 150 间隔 + estMs(引导句最长 16 字符=345*16+600，m1 全字符口径) + 300 = 9138 ≤ 9200
assert 9200 >= 2568 + 150 + (345 * 16 + 600) + 300, '链豁免窗 9200 < 链总实长+300'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
