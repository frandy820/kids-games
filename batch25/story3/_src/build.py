# -*- coding: utf-8 -*-
"""story3 故事排序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch25/story3/_src/build.py
语音 clips 注入（sto_ 20 条 + core_* 3 条，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
【r34 过渡态注释】SPEC-R34 §R10 新增 23 键（sto_w_out/sto_why_w/sto_why_right/sto_why_<story>×12/
sto_recap4_×4/sto_recap5_×4）由主线 gen_clips 统一注册——注册前 manifest 无这些键，
注入数恒 23；注册后 23→46，本断言与 verify ⑬ 同步改（主线联动，agent 禁自注册）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：c34dbe6e2b7f0e64cb6d8785aa840c7b）。
本款拼接口径=3 script 块（verify 并入第 3 块）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==3 由
hard_checks_post(n_scripts=3) 同口径兜底。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：旧 23 + r34 新 23 = 46 条（主线注册后；旧已扩帧 8 键零调用保留注入=SPEC「本轮不收编」）
    STO_KEYS = ['sto_tut_watch', 'sto_tut_turn', 'sto_hint', 'sto_right', 'sto_w_first', 'sto_w_mid', 'sto_q']
    R34_KEYS = ['sto_w_out', 'sto_why_w', 'sto_why_right', 'sto_why_wake', 'sto_why_shadow',
                'sto_recap4_seed', 'sto_recap4_chick', 'sto_recap5_sunwalk', 'sto_recap5_shadow']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in STO_KEYS + R34_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 46, 'clips 条数 %d != 46（旧 23 + r34 新 23）' % n_clips

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
    assert "KIDS.init({ game: 'story3'" in main, 'main 缺 KIDS.init story3（存档键 kidsgame_story3）'
    assert 'window.ST =' in main, 'main 缺 ST 钩子'
    assert '__stDemoR' in main, 'main 缺教学演示实证 __stDemoR'
    # 家族契约 A：启动与 winFlow 两处 dayEnd 都传 lim-1
    assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须两处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')
    # 家族契约 B：救援双锚分离（lastDir 独立节流锚，不重置 lastAct）
    # lastDir = Date.now() 共 2 处=声明+方向级节流赋值（方向级自身节流独立锚）
    assert main.count('lastDir = Date.now()') == 2, 'rescue lastDir 锚异常'
    assert 'lastAct' in main and 'lastDir' in main, 'rescue 双锚缺失'
    assert 'speakQuiz(); lastAct = Date.now();' in main, 'main 缺主动读题 idle 锚重置（审查M4：长复述链后防救援连读两遍）'
    assert 'clearTimeout(timeHintTimer)' in main, 'main 缺时间词点名 timer 取消（审查m1）'
    # 硬性检查 4（r34 结构锚：扩帧/干扰帧/因果问句四层联动防拼错文件漏文件）
    assert 'pos === -1' in engine and 'engTapWhy' in engine, 'engine 缺 r34 干扰帧/why 引擎'
    assert 'WHY_QI' in engine and 'ownSeq' in engine, 'engine 缺 r34 生成律/乱序铁律锚'
    assert 'recapKeyOf' in data and 'RECAP_DUR3' in data and 'RECAP_KEYS' in data, 'data 缺 r34 扩帧复述键/实测窗锚'
    assert 'whyClipOf' in data and 'WHY_QI' in data and 'wOut' in data, 'data 缺 r34 why/干扰反馈配置'
    assert 'optcard' in main and 'tapWhy' in main and 'whyPending' in main, 'main 缺 r34 why 相位/选项卡'
    assert 'uiTapWhy' in main and 'correctWhyIdx' in main, 'main 缺 r34 why 主路径/驱动'
    assert 'sto_w_out' in verif and 'sto_why_right' in verif and 'FLAT0_ANCHOR' in verif, 'verify 缺 r34 断言锚'


build_lib.build(ROOT, game='story3', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
