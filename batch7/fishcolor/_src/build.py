# -*- coding: utf-8 -*-
"""fishcolor 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch7/fishcolor/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：5a0233714606097c0cddd598e690ea2c）。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
行为差异说明：旧版 clips 注入失败降级空串继续构建；build_lib 口径=exit(3) 暴露
（本款 fis_* 六条+core_* 三条已合成就位、manifest 含 fishcolor，成功路径产物逐字节一致，对拍实证）。
绝对路径收编：检查 7 的 manifest 路径改经 build_lib.REPO_ROOT 相对解析（原为盘符绝对路径）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    import json as _json, re as _re
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # 语音 clips 注入（fishcolor 六条 fis_* + 三条 core_* 已合成，构建自包含）

    # r7 硬性检查 3：estMs 家族定版字面（源常量；四处同步=源+注释+verify 断言+此处字面 assert）
    assert 'const estMs = n => n * 345 + 600;' in data, 'data 缺 estMs 定版字面（家族 T）'
    assert 'estMs(9) === 9 * 345 + 600' in verif, 'verify 缺 estMs 字面验算断言'

    # r7 硬性检查 4：家族契约 A（dayEnd 传 nextHint(lim - 1)）与 F（生成关预告实算，禁 (ci+1)%4 字面）
    assert 'nextHint(lim - 1)' in main, 'main 启动 dayEnd 须传 nextHint(lim - 1)（家族 A）'
    assert 'nextHint(lim)' not in main, 'main 残留 nextHint(lim) 裸调用（家族 A）'
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 生成关预告须实算（家族 F）'
    assert '(ci + 1) % 4' not in main and '% 4]' not in main, 'main 禁 (ci+1)%4 字面（家族 F）'

    # r7 硬性检查 5：去自动重播（救援 20s 每题一次）+ 分步不重播（stepSpeech 退役）
    assert 'idle > 20000' in main and '_rescued' in main, 'main 缺 20s 每题一次救援'
    assert 'stepSpeech' not in data and 'stepSpeech' not in main, 'stepSpeech 须退役（分步不重播）'

    # r7 硬性检查 6：游散机制在场（SCHOOL 配置+school 状态机+fis_wait 提示）
    assert 'const SCHOOL' in data and 'schoolScatter' in main and 'schoolBack' in main, '游散机制缺件'
    assert "key: 'fis_wait'" in data, 'data 缺 fis_wait 游散提示'

    # r7 硬性检查 7：新语音键文案与 manifest 严格一致（manifest 真值源=gen_clips.py）
    _mani = _json.load(open(build_lib.REPO_ROOT / 'voice' / 'clips' / 'manifest.json',
                            encoding='utf-8'))
    for _key in ('fis_wrong', 'fis_wrong_seq', 'fis_wait'):
        _m = _re.search(r"key: '" + _key + r"',\s*text: '([^']+)'", data)
        assert _m, f'data 缺新语音键 {_key}'
        assert _mani.get(_key, {}).get('text') == _m.group(1), f'{_key} 文案与 manifest 不一致'


build_lib.build(ROOT, game='fishcolor', head_name='head.html',
                verify_block='merged', pre_assemble=_asserts)
