# -*- coding: utf-8 -*-
"""ruler 测量小尺 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch27/ruler/_src/build.py
语音 clips 注入（rul_ 40 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：2de040edf4d3de2951803ea8324df5a2）。
本款拼接口径=3 script 块（verify 并入第 3 块）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。
差异说明：原断言全部先于拼接执行，零顺序差异；estMs 尾 print 随断言表前移
（print 不影响产物），成功路径对拍逐字节一致。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：rul_ 6 条 + core 3 条 = 9 条（SPEC-BATCH27 §1/§4）
    RUL_KEYS = ['rul_tut_watch', 'rul_tut_turn', 'rul_hint', 'rul_right', 'rul_wrong', 'rul_q']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in RUL_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 43, 'clips 条数 %d != 43（rul 40 + core 3）' % n_clips

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
    assert "KIDS.init({ game: 'ruler'" in main, 'main 缺 KIDS.init ruler（存档键 kidsgame_ruler）'
    assert 'window.RU =' in main, 'main 缺 RU 钩子'
    assert '__ruDemoR' in main, 'main 缺教学演示实证 __ruDemoR'
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

    # ===== 语音窗静态断言（家族 G/H/I + b25 定版：窗 ≥ estMs(最长句)）=====
    # estMs 口径（b25 定版）：SAPI ~345ms/汉字 + 600 落定余量
    est_ms = lambda n: n * 345 + 600
    # ① 确认句（判对 TTS 拼句）：最长情形 cmp+book|clip「故事书更长，有六根回形针长」=12 汉字
    #    判对演出窗 1800+3600=5400 ≥ estMs(12)=4740（verify ⑭ 按封闭表独立拼句动态对账）
    assert '1800 * SPEED' in main and '3600 * SPEED' in main, 'main 判对演出窗 5400（1800+3600）缺失'
    assert 1800 + 3600 >= est_ms(12), '判对演出窗 5400 < estMs(最长确认句 12 汉字=%dms)' % est_ms(12)
    # ② 引导句（错反馈链第二段 TTS）：GUIDE 5 族各 1 句；链豁免窗（家族 I）≥ 链总实长+300
    gblock = re.search(r"const GUIDE = \{([^}]+)\};", data)
    assert gblock, 'game-data 缺 GUIDE 引导句表'
    gtexts = re.findall(r"'([^']+)'", gblock.group(1))
    assert len(gtexts) == 5, 'GUIDE 应 5 族各 1 句，实得 %d' % len(gtexts)
    han = lambda t: len(re.findall(r'[\u4e00-\u9fff]', t))
    max_g = max(han(t) for t in gtexts)
    assert max_g == 13, 'GUIDE 最长句应为 13 汉字（回形针短，数得多也不一定长哦），实得 %d' % max_g
    assert "wrongChainUntil = Date.now() + 8800" in main, 'main 缺错反馈链豁免窗 wrongChainUntil=8800'
    # 链 = rul_wrong 2880 + 150 间隔 + estMs(最长引导句 14 字符=5430，m1 全字符口径 n×345+600) + 300 = 8760 ≤ 8800
    assert 8800 >= 2880 + 150 + est_ms(14) + 300, '链豁免窗 8800 < 链总实长+300（全字符口径 m1）'
    assert "if (Date.now() < wrongChainUntil) return;" in main, '救援 interval 缺链豁免守卫（家族 I）'
    assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
    assert "sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideText(q, i) }])" in main, \
        'main 错反馈拼播链（rul_wrong+引导句）缺失'
    # ③ clip 实长窗（SPEC-BATCH27 §4 量化）：窗值 ≥ clip 实测 + 300 余量
    #    教学演示窗 t=900+4×500(逐根点)+1000=3900 ≥ rul_tut_watch 3360+300（禁与收束 TTS 撞头）
    assert '900 * SPEED' in main and '250 * SPEED' in main and '1000 * SPEED' in main, \
        'main 缺教学演示窗（900+4×250×2+1000=3900）'
    assert 900 + 4 * 500 + 1000 >= 3360 + 300, '教学演示窗 3900 < rul_tut_watch 3360+300'
    assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（rul_tut_turn 1896+300 防尾截）'
    assert 2200 >= 1896 + 300, 'turn 后读题延 2200 < rul_tut_turn 1896+300'
    assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（rul_right ≥2496）'
    assert 2620 + 400 >= 2496 + 300, 'celebrate 2620+400=3020 < rul_right 2496+300=2796'
    assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
    # ④ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
    assert 'estMs' in verif and '1800 + 3600' in verif, 'verify 缺 estMs 动态断言'

    # ===== SPEC 封闭表 build 侧保险（verify ② 的静态前置）：
    #   合法组合 12 独立表 + 陷阱对 4 独立表必须在 verify 内在场（禁实现函数复算期望——b26 M1） =====
    mcombos = re.search(r'const SPEC_COMBOS12 = \[(.*?)\];', verif, re.S)
    assert mcombos, 'verify 缺 SPEC_COMBOS12 独立硬编码表'
    n_combos = len(re.findall(r"\['[a-z]+', '[a-z]+'\]", mcombos.group(1)))
    assert n_combos == 12, 'SPEC_COMBOS12 应 12 条，实得 %d' % n_combos
    mtraps = re.search(r'const SPEC_TRAPS = \[(.*?)\n  const SPEC_TRAP_SET', verif, re.S)
    assert mtraps, 'verify 缺 SPEC_TRAPS 独立硬编码表'
    n_traps = len(re.findall(r"\[\['[a-z]+', '[a-z]+', \d+\]", mtraps.group(1)))
    assert n_traps == 4, 'SPEC_TRAPS 应 4 对，实得 %d' % n_traps

    print('estMs check: max confirm 12 chars -> %dms <= 5400 right-win; '
          'max guide 14 chars -> chain %dms <= 8800 wrongChainUntil'
          % (est_ms(12), 2880 + 150 + est_ms(14) + 300))


build_lib.build(ROOT, game='ruler', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
