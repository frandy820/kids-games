# -*- coding: utf-8 -*-
"""neighbors 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch8/neighbors/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：bd18784c8021c4d49512dd6fa6b88fb2）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入为裸调用（失败=traceback 退出码 1）；build_lib 口径=exit(3)
暴露（成功路径产物逐字节一致，对拍实证）。
绝对路径收编：manifest 对账路径改经 build_lib.REPO_ROOT 相对解析（原为盘符绝对路径）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import json as _json
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（T46 阶段2 2026-09-19：neb_ 45=教学反馈 6+题面段链 38+neb_wrong 纠错
    # ——neb_mid_1-18「n和n+2」整段/neb_n_1-20 数词；+core_* 三条=48，manifest 对账）
    # r31（SPEC-R31 §R10）：新 5 键 neb_qp2/neb_qm2/neb_and/neb_dual_a/neb_dual_b 待主线
    # gen_clips 统一注册——注册后 manifest 48→53，此处 48 与 game-verify nClips===48
    # 由主线联动改 53（本 agent 禁自注册，注册前过渡态=新 5 型题面语音静默）
    _mani = _json.load(open(build_lib.REPO_ROOT / 'voice' / 'clips' / 'manifest.json',
                            encoding='utf-8'))
    _must = sorted(k for k, v in _mani.items() if 'neighbors' in v['games'])
    assert len(_must) == 53, 'manifest neighbors 键数漂移: %d' % len(_must)
    for _k in _must:
        assert (_json.dumps(_k) + ':') in clips, 'clips 注入缺键: %s' % _k

    # 硬性检查 4（r31 结构锚，SPEC-R31-NEIGHBORS §R8）：新 5 型/藏牌律/dual 演出防回归
    assert "'plus2'" in engine and "'minus2'" in engine and "'mid4'" in engine, 'engine 缺 r31 新题型'
    assert 'dualA' in engine and 'dualB' in engine and 'hiddenNums' in engine, 'engine 缺 dual/藏牌律'
    assert 'hiddenNums(q, dch)' in verif or 'hiddenNums(q, 3)' in verif, 'verify 缺藏牌复算断言'
    assert 'neb_qp2' in data and 'neb_dual_b' in data, 'data 缺 r31 新 5 键'
    assert 'dualJump' in main and '__dualJumpN' in main and 'demoDualJump' in main, 'main 缺 dual 演出'
    assert "house.blind" in head or '.house.blind' in head, 'head 缺盲牌样式'


build_lib.build(ROOT, game='neighbors', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
