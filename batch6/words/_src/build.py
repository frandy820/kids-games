# -*- coding: utf-8 -*-
"""words 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch6/words/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：0efacc338a42903ff51e08c028d320bb）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 63 条 clip 已合成就位、manifest 含 words，成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import re as _re
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（现已有 5 条 UI 键（wrd_tut_watch/wrd_tut_turn/wrd_hint/wrd_wrong/wrd_fam）
    # +55 字键（审查m3 r28 注释更新）；wrd_ch_* 字音 clip 由主会话 gen_clips 从 CHARS 表二次合成
    # 后重建即得——clip 缺失游戏内自动整句 TTS 兜底）

    # 硬性检查 4（r28 结构锚）：字库 55 字 / 拼音 key 全唯一全 ASCII / 部件全落 CJK 基本区 /
    #   家族优先干扰律与有效干扰数公式在场（引擎）/ famOk 单元在场（verify）
    entries = _re.findall(r"\{\s*c:\s*'([^']+)',\s*py:\s*'([^']+)',\s*parts:\s*\[([^\]]*)\],\s*w:\s*'([^']+)'", data)
    assert len(entries) == 55, f'CHARS 字数异常: {len(entries)} != 55（r28 定稿）'
    pys = [py for _, py, _, _ in entries]
    assert len(set(pys)) == 55, f'py 冲突（clip key 不唯一）: {sorted(p for p in pys if pys.count(p) > 1)}'
    assert all(py.isascii() for py in pys), 'py 含非 ASCII 字符'
    parts = set()
    for _, _, ps, _ in entries:
        parts.update(p.strip().strip("'") for p in ps.split(','))
    bad_cp = [p for p in parts if not (len(p) == 1 and 0x4E00 <= ord(p) <= 0x9FFF)]
    assert not bad_cp, f'部件不在 CJK 基本区(U+4E00-U+9FFF): {bad_cp}'
    assert "py: 'qing2'" in data and "py: 'hong'" in data and "py: 'ma2'" in data, 'r28 声旁家族新字缺失'
    assert 'function nDisEff' in engine and 'function familyParts' in engine, 'r28 引擎函数缺失'
    assert 'famOk' in verif and 'vFamily' in verif, 'r28 verify famOk 单元缺失'


build_lib.build(ROOT, game='words', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
