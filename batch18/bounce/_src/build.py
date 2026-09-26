# -*- coding: utf-8 -*-
"""bounce 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch18/bounce/_src/build.py
语音 clip（bounce 10 条=bc_ 中文 7(T46 阶段2+bc_hole)+core 共享 3）：
注入失败必须 sys.exit(3)，禁降级空串构建。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：11a6ed50e60d8268aba43c3acc637187）。
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

    # 关键 clip 在场断言：7 条 bc 中文（全量 10 条由条数断言+?verify=1 clipOk 复核）
    for must in ('bc_tut_watch', 'bc_tut_turn', 'bc_hint', 'bc_right', 'bc_wrong', 'bc_boing', 'bc_hole'):
        if ('"%s"' % must) not in clips:
            print('FATAL: bounce clips 注入不完整（缺 %s）' % must)
            sys.exit(3)
    # T46 阶段2（09-19）：bc_hole（进错洞语义句）keyless→clip 化——manifest 文本对账+main 键化断言
    _mani = _json.load(open(build_lib.REPO_ROOT / 'voice' / 'clips' / 'manifest.json',
                            encoding='utf-8'))
    assert _mani['bc_hole']['text'] == '进错洞啦，换个方向再试试', 'manifest bc_hole 文本不一致'
    assert _mani['bc_hole'].get('games') == ['bounce'], 'manifest bc_hole games 异常'
    assert main.count("KIDS.voice.play('bc_hole', '进错洞啦，换个方向再试试')") == 1, \
        'main bc_hole 键化调用应恰 1 处（进错洞分支）'
    # 条数断言：恰 10 条（core 3+bc 中文 7（T46 阶段2+bc_hole）——SPEC-BATCH18 §3 口径，无额外词 clip）
    n_audio = clips.count('data:audio/mpeg')
    if n_audio != 10:
        print('FATAL: bounce clips 条数 %d != 10（bc 7 + core 3，T46 阶段2+bc_hole）' % n_audio)
        sys.exit(3)


build_lib.build(ROOT, game='bounce', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
