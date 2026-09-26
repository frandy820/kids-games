# -*- coding: utf-8 -*-
"""spotdiff 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch5/spotdiff/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/3 块拼接/幂等写出）已入 design/build_lib.py，
本款无款级断言表（原版仅 ImportError 降级空串守卫，无 MUST/条数断言），
双跑对拍 md5 等价验证过：5da2d357e00113d27ce6f6f095c34781。
本款拼接口径=3 script 块（verify 并入第 3 块，无独立第 4 块）。
坑：字面 </script>/core 契约版由 build_lib.hard_checks_pre 同口径兜底；
完全离线与 n_scripts==3 由 hard_checks_post(n_scripts=3) 同口径兜底。
clips 口径差异：旧版 ImportError 时降级空串构建；build_lib 口径=任何失败 exit(3)
暴露（成功路径产物逐字节一致，对拍实证）。"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/

build_lib.build(ROOT, game='spotdiff', head_name='head.html', verify_block='merged')
