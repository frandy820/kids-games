# -*- coding: utf-8 -*-
"""sudokunum 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch19/sudokunum/_src/build.py
语音 clip（sn_ 5 条 + core 共享 3 条 = manifest games 含 sudokunum 全集恰 9 条
=T46 阶段2 前 8+sn_dead）：注入失败必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：b047b9ed5a471a49abd57fdeab070ac8）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
绝对路径收编：manifest 对账路径改经 build_lib.REPO_ROOT 相对解析（原为盘符绝对路径）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import json as _json
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 关键 clip 在场断言（教学/提示/反馈/确认 + core 共享——恰 9 条，§4+T46 阶段2；数词走 TTS 兜底不建）
    MUST = ('sn_tut_watch', 'sn_tut_turn', 'sn_hint', 'sn_right', 'sn_wrong', 'sn_dead',
            'core_chapter_end', 'core_day_end', 'core_rest')
    for must in MUST:
        if ('"%s"' % must) not in clips:
            print('FATAL: sudokunum clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    if clips.count(':"data:audio/mpeg;base64,') != 9:
        print('FATAL: sudokunum clips 恰 9 条断言失败（实得 %d 条）' % clips.count(':"data:audio/mpeg;base64,'))
        sys.exit(3)
    # T46 阶段2（09-19）：sn_dead（死局明说句）keyless→clip 化——manifest 文本对账+main 双点键化断言
    _mani = _json.load(open(build_lib.REPO_ROOT / 'voice' / 'clips' / 'manifest.json',
                            encoding='utf-8'))
    assert _mani['sn_dead']['text'] == '有一个数字放错啦，换一换摇头的格子', 'manifest sn_dead 文本不一致'
    assert _mani['sn_dead'].get('games') == ['sudokunum'], 'manifest sn_dead games 异常'
    assert main.count("KIDS.voice.play('sn_dead', '有一个数字放错啦，换一换摇头的格子')") == 2, \
        'main sn_dead 键化调用应恰 2 处（错填死局+救援死局）'


build_lib.build(ROOT, game='sudokunum', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
