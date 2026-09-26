# -*- coding: utf-8 -*-
"""shadow 影子配对 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch11/shadow/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：c69de1702a2891afe52068a09a9ef950）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径：旧版即 exit(3) 禁静默降级（审查M1），与 build_lib.load_clips 同口径，无行为差异。
绝对路径收编：manifest 文本对账路径改经 build_lib.REPO_ROOT 相对解析（原为盘符绝对路径）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import json as _json
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（r8：sha_teach_watch/sha_teach_turn/sha_help/sha_q_pair + sha_q_* 15 + core_* 三条，
    # manifest 对账——旧 sha_tut_*/sha_hint 三键 2026-09-10 起归 batch23/share 同名覆盖，shadow 不再引用；
    # T46 阶段2（09-19）：wrong keyless→sha_w_same clip 化在册）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # T46 阶段2：sha_w_same 在场+manifest 文本对账+data 键引用（wrong 键化三方一致）
    assert '"sha_w_same"' in clips, 'clips 缺 sha_w_same（T46 阶段2 wrong clip 化）'
    _mani = _json.load(open(build_lib.REPO_ROOT / 'voice' / 'clips' / 'manifest.json',
                            encoding='utf-8'))
    assert _mani['sha_w_same']['text'] == '再找一找，一样的影子', 'manifest sha_w_same 文本不一致'
    assert _mani['sha_w_same'].get('games') == ['shadow'], 'manifest sha_w_same games 异常'
    assert "key: 'sha_w_same'" in data, 'game-data VOICE.wrong 未键化 sha_w_same'
    assert "p[0] === 'sha_w_same'" in verif, 'verify sayW 过滤器未键化（T46 联动）'

    # 硬性检查 4（r8）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言在本文件做
    # （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
    assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
    assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

    # 硬性检查 5（家族契约 A/F/M1）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
    # F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）；
    # M1=静态章末预告 CHAPTERS[floor(f/CH_LEN)+1]（禁 off-by-one 式，r7 审查同型坑）
    assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
    assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
    assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约 M1：静态章末预告式漂移'
    assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

    # 硬性检查 6（r8 玩法契约）：多物连解/重叠双选/遮蔽/时长模型关键字面在场（源码级，防误删）
    assert "q.mode === 'overlap'" in engine and "mode: 'multi'" in engine, 'r8 双模式引擎缺失'
    assert 'wantOf' in engine and engine.count('wantOf') >= 2, 'r8 wantOf 应点真值源缺失'
    assert 'LEVEL_MIN_MS = 40000' in data, 'r8 时长下限常量漂移（须 40000）'
    assert 'STEP_MS = { plain: 2600, rot: 3000, veil: 3200, ovl: 3600 }' in data, 'r8 时长步值漂移'
    assert 'V_MIN = 40000' in verif and 'V_STEP_MIN = 13' in verif, 'r8 verify 时长独立副本常量漂移'
    assert "'sha_q_pair'" in main and "'sha_teach_watch'" in data and "'sha_help'" in data, 'r8 新 clip 键引用缺失'


build_lib.build(ROOT, game='shadow', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
