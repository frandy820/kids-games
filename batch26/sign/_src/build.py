# -*- coding: utf-8 -*-
"""sign 交通标志 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch26/sign/_src/build.py
语音 clips 注入（sgn_ 38 条[r36 注册 15 键后] + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：f572e482253ef09942173af38ee2c30f）。
本款拼接口径=3 script 块（verify 并入第 3 块）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。
差异说明：原「拼接后执行」的 r36 结构锚与 M4 链豁免断言（纯源码断言、无产物依赖）
前移至断言表尾，完全离线由 hard_checks_post 同口径兜底；estMs 尾 print 随之前移，
成功路径对拍逐字节一致。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：r36 注册后 41 条（sgn 38 + core 3；审查 M2 注释勘正）
    SGN_KEYS = ['sgn_tut_watch', 'sgn_tut_turn', 'sgn_hint', 'sgn_right', 'sgn_wrong', 'sgn_q']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in SGN_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 41, 'clips 条数 %d != 41（sgn 38 + core 3；主线注册 15 键后，SPEC-R36 §R10）' % n_clips

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
    assert "KIDS.init({ game: 'sign'" in main, 'main 缺 KIDS.init sign（存档键 kidsgame_sign）'
    assert 'window.SG =' in main, 'main 缺 SG 钩子'
    assert '__sgDemoR' in main, 'main 缺教学演示实证 __sgDemoR'
    # 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
    assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
    assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
    # 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
    assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
    # 家族契约 D：吞输入轻叮必配容器 bump
    assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'

    # ===== 语音窗静态断言（家族 G/H + b25 定版：TTS 拼句窗 ≥ estMs(最长句)）=====
    # estMs 口径（b25 定版）：SAPI ~345ms/字 + 600 落定余量
    est_ms = lambda n: n * 345 + 600
    # ① 含义句（判对 TTS 拼句）：判对演出窗 1800+3600=5400 ≥ estMs(最长 sent)
    confirms = re.findall(r"sent:\s*'([^']+)'", data)
    assert len(confirms) == 24, 'SIGNS.sent 应 24 条（r36 库 24），实得 %d' % len(confirms)
    max_conf = max(confirms, key=len)
    assert len(max_conf) <= 10, '最长含义句 %d 字超窗界 10（5400 窗 estMs 界）' % len(max_conf)
    assert 1800 + 3600 >= est_ms(len(max_conf)), \
        '判对演出窗 5400 < estMs(最长含义句 %d 字=%dms)' % (len(max_conf), est_ms(len(max_conf)))
    # ② 引导句（错反馈链第二段）：链窗 1000ms 防重入（batch21 §0 L9）；对选可打断=主动交互优先；
    #    救援掐链由 wrongChainUntil 守卫（审查 M4）；链结构（clip+引导句键）必须在场
    gblock = re.search(r"const GUIDE = \{([^}]+)\};", data)
    assert gblock, 'game-data 缺 GUIDE 引导句表'
    gtexts = re.findall(r"'([^']+)'", gblock.group(1))
    assert len(gtexts) == 7, 'GUIDE 应 7 族各 1 句（r36 新 redtri/bluec），实得 %d' % len(gtexts)
    assert max(len(t) for t in gtexts) <= 9, '最长引导句超 9 字（wrongChainUntil=7000 界）'
    assert "sayW([VOICE.wrong.key, { key: 'sgn_guide_' + SIGNS[q.sign].fam, text: GUIDE[SIGNS[q.sign].fam] }])" in main, \
        'main 错反馈拼播链（sgn_wrong+sgn_guide_ 引导句，T46 阶段2 键化）缺失'
    # ②b act 行为短语表（r36 §R1 维度三）：24 条互异 ≤6 字、与 m 短语零碰撞
    ablock = re.search(r"const ACT = \{([^}]+)\};", data)
    assert ablock, 'game-data 缺 ACT 行为短语表'
    atexts = re.findall(r"'([^']+)'", ablock.group(1))
    mtexts = re.findall(r"m:\s*'([^']+)'", data)
    assert len(atexts) == 24 and len(set(atexts)) == 24, 'ACT 应 24 条互异，实得 %d/%d' % (len(atexts), len(set(atexts)))
    assert max(len(t) for t in atexts) <= 6, 'ACT 短语超 6 字（卡标签长文界）'
    assert not set(atexts) & set(mtexts), 'ACT 与 m 短语碰撞: %s' % (set(atexts) & set(mtexts))
    assert "const ACT_Q = { key: 'sgn_q_act', text: '看到这个标志，怎么做' }" in data, 'ACT_Q 题面句常量缺失（10 字 estMs=4050 界）'
    assert "ACT_Q.key, ACT_Q.text" in main, 'main act 题面句分流缺失'
    # ②c 图标表完备：SIGN_ELS/MEAN_ELS/ACT_ELS 各 24 键（封闭库 1:1）
    for tbl, n in (('SIGN_ELS', 24), ('MEAN_ELS', 24), ('ACT_ELS', 24)):
        m = re.search(r'const %s = \{(.+?)\n\};' % tbl, data, re.S)
        assert m, 'game-data 缺 %s 表' % tbl
        ids = re.findall(r'^\s{2}(\w+):', m.group(1), re.M)
        assert len(ids) == n and len(set(ids)) == n, '%s 应 %d 键，实得 %d' % (tbl, n, len(ids))
    # ③ clip 实长窗（SPEC-BATCH26 §4 量化）：窗值 ≥ clip 实测 + 300 余量
    assert '900 * SPEED' in main and '3000 * SPEED' in main, 'main 缺教学演示延窗（t=900+3000=3900）'
    assert 900 + 3000 >= 3456 + 300, '教学演示窗 3900 < sgn_tut_watch 3456+300'
    assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（sgn_tut_turn 1872+300 防尾截）'
    assert 2200 >= 1872 + 300, 'turn 后读题延 2200 < sgn_tut_turn 1872+300'
    assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（sgn_right ≥2748）'
    assert 2620 + 400 >= 2448 + 300, 'celebrate 2620+400=3020 < sgn_right 2448+300'
    assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
    assert main.count('1800 * SPEED') >= 1 and '3600 * SPEED' in main, \
        'main 判对演出窗 5400（1800+3600）不足'
    # ④ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
    assert 'estMs' in verif and '1800 + 3600' in verif, 'verify 缺 estMs 动态断言'

    # ---------- r36 结构锚（flash/act/关级构成） ----------
    assert 'const FLASH_MS = 1800;' in data, 'game-data 缺 FLASH_MS=1800（闪现观察题）'
    assert 'flash-cover' in (ROOT / 'head.html').read_text(encoding='utf-8'), 'head.html 缺 flash-cover 遮面样式'
    assert 'reflashCover' in main and 'REVEAL_MS = 1200' in main, 'main 缺救援重闪 reflashCover/REVEAL_MS'
    assert 'levelWhy' in engine and 'levelWhy' in verif, 'engine/verify 缺关级构成校验 levelWhy'
    assert "q.kind === 'act'" in main and "actSvg(c.meaning)" in main, 'main 缺 act 卡渲染分支'
    assert "q.kind === 'act'" in verif and "'sgn_q_act'" in verif, 'verify 缺 act 断言锚'
    assert 'flashOk' in verif and 'reflashCover()' in verif, 'verify 缺 flash 断言锚'

    # ---------- 审查 M4 链豁免静态断言：wrongChainUntil ≥ 链总实长(estMs 口径)+300 ----------
    assert "wrongChainUntil = Date.now() + 7000" in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7000'
    # 链 = sgn_wrong 2808 + 150 间隔 + estMs(引导句最长 9 汉字「红倒三角说，让一让」=345*9+600) + 300 = 6963 ≤ 7000
    assert 7000 >= 2808 + 150 + (345 * 9 + 600) + 300, '链豁免窗 7000 < 链总实长+300'

    print('estMs check: max sent %r (%d chars) -> %dms <= 5400 right-win' %
          (max_conf, len(max_conf), est_ms(len(max_conf))))


build_lib.build(ROOT, game='sign', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
